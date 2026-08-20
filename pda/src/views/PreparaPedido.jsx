import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackageCheck, AlertCircle, RefreshCw, ChevronRight, ChevronLeft,
  CheckCircle, Box, MapPin, Hash, AlertTriangle, X, List, ArrowRight,
  ScanLine, Scale, Info
} from 'lucide-react';
import {
  obtenerDocumento, getCabeceraPedido, getPrimeraLinea,
  siguienteLinea, cargarMercancia, getLineasPendientes,
  getNumLineasPendientes, getUnidsPreparadas,
  getPermisosPreparacion, validarUbicacion, getStockLotes
} from '../api/preparacionService';
import TerminalHeader from '../components/TerminalHeader';
import ArticleSearchInput from '../components/ArticleSearchInput';
import { formatFechaES } from '../utils/dateUtils';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import WizardBottomBar from '../components/WizardBottomBar';
import { useLongPress } from '../hooks/useLongPress';
import LineaUtilidadesModal from '../components/LineaUtilidadesModal';

const FASE = {
  CARGANDO: 'CARGANDO',
  SIN_DOCUMENTO: 'SIN_DOCUMENTO',
  CABECERA: 'CABECERA',
  CONFIRMAR_UBICACION: 'CONFIRMAR_UBICACION',
  CONFIRMAR_ARTICULO: 'CONFIRMAR_ARTICULO',
  SELECCIONAR_LOTE: 'SELECCIONAR_LOTE',
  INTRODUCIR_CANTIDAD: 'INTRODUCIR_CANTIDAD',
  CONFIRMAR_EXCESO: 'CONFIRMAR_EXCESO',
  CONFIRMAR_SUMA_SUSTITUCION: 'CONFIRMAR_SUMA_SUSTITUCION',
  VER_LINEAS: 'VER_LINEAS',
  SIN_LINEAS: 'SIN_LINEAS',
};

const PreparaPedido = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [fase, setFase] = useState(FASE.CARGANDO);
  const [showPosicionModal, setShowPosicionModal] = useState(false);
  const [posicionesDisponibles, setPosicionesDisponibles] = useState([]);
  const [ubicacionPendienteModal, setUbicacionPendienteModal] = useState('');
  const [cabecera, setCabecera] = useState(null);
  const [lineaActual, setLineaActual] = useState(null);
  const [lineasPendientes, setLineasPendientes] = useState([]);
  const [permisos, setPermisos] = useState({ solicitar_ubicacion: 0, solicitar_articulo: 0, solicitar_cantidad: -1, puede_servir_mas: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Valores operario
  const [inputVal, setInputVal] = useState('');
  const [cantidad, setCantidad] = useState('');

  // Estado de preparación
  const [ubicacionConfirmada, setUbicacionConfirmada] = useState(null);
  const [lotesDisponibles, setLotesDisponibles] = useState([]);
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);
  const [cantidadPendiente, setCantidadPendiente] = useState(null);
  const [factorEanSeleccionado, setFactorEanSeleccionado] = useState(1);
  const [unidadesYaPreparadas, setUnidadesYaPreparadas] = useState(0);
  const [tipoCodigoIntroducido, setTipoCodigoIntroducido] = useState(0);
  const [codFacturacion, setCodFacturacion] = useState(null);

  // Estado modal utilidades (longpress en línea)
  const [lineaParaUtilidades, setLineaParaUtilidades] = useState(null);
  const [showUtilidadesModal, setShowUtilidadesModal] = useState(false);

  const handleLongPressLinea = useCallback((linea) => {
    if (!linea) return;
    setLineaParaUtilidades(linea);
    setShowUtilidadesModal(true);
  }, []);

  const getStepNumber = (f) => {
    switch (f) {
      case FASE.CONFIRMAR_UBICACION: return 1;
      case FASE.CONFIRMAR_ARTICULO: return 2;
      case FASE.SELECCIONAR_LOTE: return 3;
      case FASE.INTRODUCIR_CANTIDAD: return 4;
      case FASE.CONFIRMAR_EXCESO: return 5;
      default: return 0;
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [fase]);

  useEffect(() => { inicializar(); }, []);

  const inicializar = async () => {
    setFase(FASE.CARGANDO);
    setError(null);
    setCabecera(null);
    setLineaActual(null);
    try {
      const [docResult, perm] = await Promise.all([
        obtenerDocumento(),
        getPermisosPreparacion(),
      ]);
      setPermisos(perm);
      if (!docResult.hay_documento) { setFase(FASE.SIN_DOCUMENTO); return; }
      const cab = await getCabeceraPedido(docResult.cod_documento);
      setCabecera(cab);
      setFase(FASE.CABECERA);
    } catch (err) {
      setError(String(err));
      setFase(FASE.SIN_DOCUMENTO);
    }
  };

  const cargarLineasPendientes = async (codDoc) => {
    try {
      const lineas = await getLineasPendientes(codDoc);
      setLineasPendientes(lineas);
    } catch (e) {
      console.error("Error al cargar líneas pendientes", e);
    }
  };

  const aplicarLinea = async (linea) => {
    setLineaActual(linea);
    setInputVal('');
    setCantidad('');
    setUbicacionConfirmada(null);
    setLotesDisponibles([]);
    setLoteSeleccionado(null);
    setCantidadPendiente(null);
    setFactorEanSeleccionado(1);
    setTipoCodigoIntroducido(0);
    setCodFacturacion(linea.codarticuloaplicacion || null);

    // Actualizamos la cantidad de líneas pendientes
    await cargarLineasPendientes(cabecera.cod_documento);

    if (permisos.solicitar_ubicacion === -1) {
      setFase(FASE.CONFIRMAR_UBICACION);
    } else {
      const ubi = { codubicacion: linea.codubicacion, codhueco: linea.codhueco };
      setUbicacionConfirmada(ubi);
      avanzarDesdeUbicacion(ubi, linea);
    }
  };

  const comenzarPreparacion = useCallback(async () => {
    if (!cabecera) return;
    setLoading(true);
    setError(null);
    try {
      const { linea } = await getPrimeraLinea(cabecera.cod_documento);
      if (!linea) {
        const numLineas = await getNumLineasPendientes(cabecera.cod_documento);
        if (numLineas === 0) {
          setFase(FASE.SIN_LINEAS);
        } else {
          const lineasRestantes = await getLineasPendientes(cabecera.cod_documento);
          setLineasPendientes(lineasRestantes);
          setFase(FASE.VER_LINEAS);
          setError('No hay líneas preparables en ruta. Revisa la lista de pendientes.');
        }
        return;
      }
      await aplicarLinea(linea);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [cabecera, permisos]);

  const seleccionarLinea = useCallback(async (lineaPendiente) => {
    setLoading(true);
    setError(null);
    try {
      const { linea } = await siguienteLinea({
        cod_documento: cabecera.cod_documento,
        cod_ubicacion: 0,
        numero_orden: 0,
        tipo_avance: 0,
        cod_ubicacion_actual: 0,
        cod_articulo: lineaPendiente.codarticulo,
        cant_solicitada: lineaPendiente.cantsolicitada,
      });
      if (!linea) { setError('No se encontró ubicación disponible para esta línea'); return; }
      await aplicarLinea(linea);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [cabecera, permisos]);

  const navegarLinea = useCallback(async (tipoAvance) => {
    if (!lineaActual || !cabecera) return;
    setLoading(true);
    setError(null);
    try {
      const { linea } = await siguienteLinea({
        cod_documento: cabecera.cod_documento,
        cod_ubicacion: lineaActual.codubicacion || 0,
        numero_orden: lineaActual.numeroorden || 0,
        tipo_avance: tipoAvance,
        cod_ubicacion_actual: lineaActual.codubicacion || 0,
        cod_articulo: lineaActual.codarticulo || 0,
        cant_solicitada: lineaActual.cantsolicitada,
      });
      if (!linea) {
        // Comprobar si realmente quedan líneas en el pedido
        const numLineas = await getNumLineasPendientes(cabecera.cod_documento);

        if (numLineas === 0) {
          setFase(FASE.SIN_LINEAS);
        } else {
          const lineasRestantes = await getLineasPendientes(cabecera.cod_documento);
          setLineasPendientes(lineasRestantes);
          setError('No hay más líneas en esa dirección. Pulsa LÍNEAS para ver pendientes.');
        }
        return;
      }
      await aplicarLinea(linea);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [lineaActual, cabecera, permisos]);

  const handleConfirmarUbicacion = async (posicionOverride = null) => {
    const escaneado = posicionOverride ? ubicacionPendienteModal : inputVal.trim();
    if (!escaneado) { setError('Introduce la ubicación'); return; }

    setLoading(true);
    setError(null);
    try {
      const result = await validarUbicacion(escaneado, lineaActual?.codubicacion, posicionOverride);

      if (result.status === 'necesita_posicion') {
        setPosicionesDisponibles(result.opciones);
        setUbicacionPendienteModal(escaneado);
        setShowPosicionModal(true);
        setLoading(false);
        return;
      }

      if (!result.valida) {
        setError(result.message || `La ubicación ${escaneado} no es válida o no existe.`);
        if (!posicionOverride) setInputVal('');
        setShowPosicionModal(false);
        setLoading(false);
        return;
      }

      setShowPosicionModal(false);
      const ubi = { codubicacion: result.codubicacion, codhueco: result.codhueco, descripcion: result.descripcion };
      setUbicacionConfirmada(ubi);
      setInputVal('');
      avanzarDesdeUbicacion(ubi, lineaActual);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 100);
    }
  };

  const avanzarDesdeUbicacion = (ubi, linea) => {
    if (permisos.solicitar_articulo === -1) {
      setFase(FASE.CONFIRMAR_ARTICULO);
    } else {
      verificarStockYLotes(ubi.codubicacion, linea);
    }
  };

  const handleConfirmarArticulo = (article) => {
    const codArticulo = String(lineaActual.codarticulo || '').trim();
    const selCodArticulo = String(article.CODARTICULO || '').trim();

    if (selCodArticulo !== codArticulo) {
      setError(`Artículo no pedido.`);
      return;
    }

    setError(null);
    const factor = article.UNIDADES ? parseFloat(article.UNIDADES) : 1;
    setFactorEanSeleccionado(factor);
    if (article.searchType === 'codfacturacion') {
      setTipoCodigoIntroducido(1);
      setCodFacturacion(article.searchQuery || null);
    } else {
      setTipoCodigoIntroducido(0);
      setCodFacturacion(article.CODARTICULOAPLICACION || lineaActual.codarticuloaplicacion || null);
    }
    verificarStockYLotes(ubicacionConfirmada.codubicacion, lineaActual);
  };

  const verificarStockYLotes = async (cod_ubicacion, linea) => {
    setLoading(true);
    setError(null);
    try {
      const lotes = await getStockLotes(cod_ubicacion, linea.codarticulo);
      if (!lotes || lotes.length === 0) {
        setError('El artículo no tiene stock disponible en esta ubicación.');
        setFase(FASE.CONFIRMAR_UBICACION);
        return;
      }

      setLotesDisponibles(lotes);

      if (linea.prm_trazabilidad || linea.gestionar_caducidad) {
        if (lotes.length === 1) {
          setLoteSeleccionado(lotes[0]);
          setFase(FASE.INTRODUCIR_CANTIDAD);
        } else {
          setFase(FASE.SELECCIONAR_LOTE);
        }
      } else {
        setFase(FASE.INTRODUCIR_CANTIDAD);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarLote = (lote) => {
    setLoteSeleccionado(lote);
    setFase(FASE.INTRODUCIR_CANTIDAD);
  };

  const handleConfirmarCantidad = () => {
    let cant = parseFloat(cantidad);

    if (permisos.solicitar_cantidad !== -1) {
      cant = lineaActual.cantsolicitada;
    } else {
      if (isNaN(cant) || cant <= 0) {
        setError('Introduce una cantidad válida');
        return;
      }
      cant = cant * factorEanSeleccionado;
    }

    let stockMax = 0;
    if (loteSeleccionado) {
      stockMax = loteSeleccionado.stock;
    } else {
      stockMax = lotesDisponibles.reduce((sum, l) => sum + l.stock, 0);
    }

    if (cant > stockMax) {
      setError(`La cantidad (${cant}) supera el stock disponible en la ubicación/lote (${stockMax}).`);
      return;
    }

    if (cant > lineaActual.cantsolicitada) {
      if (permisos.puede_servir_mas === -1) {
        setCantidadPendiente(cant);
        setFase(FASE.CONFIRMAR_EXCESO);
        return;
      } else {
        setError(`No puedes preparar más de lo solicitado (${lineaActual.cantsolicitada}).`);
        return;
      }
    }

    ejecutarCarga(cant);
  };

  const ejecutarCarga = async (cantToLoad) => {
    setLoading(true);
    setError(null);
    try {
      const stockItem = loteSeleccionado || (lotesDisponibles.length > 0 ? lotesDisponibles[0] : null);

      // ── Comprobar si ya hay unidades preparadas en el terminal para esta línea ──
      const unidsPrev = await getUnidsPreparadas({
        cod_documento:   cabecera.cod_documento,
        num_linea:       lineaActual.numlinea,
        cod_ubicacion:   ubicacionConfirmada.codubicacion,
        cod_articulo:    lineaActual.codarticulo,
        fecha_caducidad: loteSeleccionado?.fechacaducidad || null,
        numero_lote:     loteSeleccionado?.numerolote || loteSeleccionado?.codnumerolote || null,
      });

      const yaPreparadas = unidsPrev.unidades_preparadas || 0;

      if (yaPreparadas > 0) {
        // Hay unidades previas → preguntar al operario
        setUnidadesYaPreparadas(yaPreparadas);
        setCantidadPendiente(cantToLoad);
        setFase(FASE.CONFIRMAR_SUMA_SUSTITUCION);
        return;
      }

      await _realizarCarga(cantToLoad, stockItem);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  // Ejecuta la carga real tras resolver SUMAR / SUSTITUIR
  const _realizarCarga = async (cantToLoad, stockItem) => {
    stockItem = stockItem || loteSeleccionado || (lotesDisponibles.length > 0 ? lotesDisponibles[0] : null);
    await cargarMercancia({
      cod_documento:        cabecera.cod_documento,
      cod_ubicacion:        ubicacionConfirmada.codubicacion,
      cod_articulo:         lineaActual.codarticulo,
      num_linea:            lineaActual.numlinea,
      unidades:             cantToLoad,
      fecha_caducidad:      loteSeleccionado?.fechacaducidad || null,
      numero_lote:          loteSeleccionado?.numerolote || loteSeleccionado?.codnumerolote || null,
      cod_tipo_dato_maestro: stockItem?.codtipodatomaestro || lineaActual.codtipodatomaestro || null,
      cod_dato_maestro:     stockItem?.coddatomaestro || lineaActual.coddatomaestro || null,
      tipo_codigo_introducido: tipoCodigoIntroducido,
      cod_facturacion:      codFacturacion,
    });
    await navegarLinea(0);
  };

  // Manejador de la decisión SUMAR / SUSTITUIR
  const handleSumaSustitucion = async (accion) => {
    setLoading(true);
    setError(null);
    try {
      const cantNueva = cantidadPendiente;
      // SUMAR: enviar la cantidad indicada (se sumará a la ya existente)
      // SUSTITUIR: enviar (cantNueva - yaPreparadas) para que el neto sea cantNueva
      const cantFinal = accion === 'sustituir'
        ? cantNueva - unidadesYaPreparadas
        : cantNueva;

      setFase(FASE.INTRODUCIR_CANTIDAD); // volver a pantalla intermedia mientras carga
      await _realizarCarga(cantFinal, null);
    } catch (err) {
      setError(String(err));
      setFase(FASE.CONFIRMAR_SUMA_SUSTITUCION);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col h-full bg-sga-light">
      <TerminalHeader title="PREPARA PEDIDO" />

      {/* Botón volver general */}
      {fase !== FASE.CARGANDO && fase !== FASE.CABECERA && fase !== FASE.SIN_DOCUMENTO && fase !== FASE.SIN_LINEAS && fase !== FASE.VER_LINEAS && (
        <div className="bg-white p-2 border-b flex justify-between items-center shadow-sm shrink-0">
          <button
            onClick={() => {
              const step = getStepNumber(fase);
              if (step === 5) {
                setFase(FASE.INTRODUCIR_CANTIDAD);
              } else if (step === 4) {
                if (lotesDisponibles && lotesDisponibles.length > 1) {
                  setFase(FASE.SELECCIONAR_LOTE);
                } else {
                  setFase(FASE.CONFIRMAR_ARTICULO);
                }
              } else if (step === 3) {
                setFase(FASE.CONFIRMAR_ARTICULO);
              } else if (step === 2) {
                if (permisos.solicitar_ubicacion === -1) {
                  setFase(FASE.CONFIRMAR_UBICACION);
                  setUbicacionConfirmada(null);
                } else {
                  setShowExitModal(true);
                }
              } else {
                setShowExitModal(true);
              }
            }}
            className="flex items-center gap-2 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sga-dark transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-sga-primary" />
            <span className="font-bold text-sga-dark">Volver</span>
          </button>
        </div>
      )}

      {/* ── PANEL DE INFO GLOBAL ── */}
      {getStepNumber(fase) >= 1 && (
        <div className="px-2 pt-2 shrink-0">
          <PanelInfoCard
            lineaActual={lineaActual}
            ubicacionConfirmada={ubicacionConfirmada}
            lineasPendientes={lineasPendientes}
            onLongPress={handleLongPressLinea}
          />
        </div>
      )}
      <div className="p-2 flex-1 flex flex-col overflow-y-auto overflow-x-hidden gap-3">
        {error && (
          <div className="shrink-0 bg-red-100 border border-red-400 text-red-700 p-2 rounded flex items-start gap-2 text-sm shadow-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="font-semibold flex-1">{error}</span>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}

        {/* ── CARGANDO ── */}
        {fase === FASE.CARGANDO && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500">
            <RefreshCw size={40} className="animate-spin text-sga-primary" />
            <p className="font-semibold">Cargando...</p>
          </div>
        )}

        {/* ── SIN DOCUMENTO ── */}
        {fase === FASE.SIN_DOCUMENTO && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
            <PackageCheck size={56} className="text-gray-300" />
            <p className="font-bold text-lg text-center text-gray-600">No hay documentos<br />pendientes de preparar</p>
            <button onClick={inicializar} className="bg-sga-primary text-white font-bold px-6 py-3 rounded flex items-center gap-2">
              <RefreshCw size={18} /> REINTENTAR
            </button>
            <button onClick={() => navigate('/prepara')} className="text-gray-500 underline text-sm">Volver</button>
          </div>
        )}

        {/* ── CABECERA ── */}
        {fase === FASE.CABECERA && cabecera && (
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
            <div className="bg-white rounded-lg border border-sga-primary shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-sga-primary uppercase tracking-wider">Pedido Asignado</span>
                <div className="flex gap-2">
                  <span className="bg-sga-primary text-white text-xs font-bold px-2 py-1 rounded">Doc: {cabecera.num_documento} - Part: {cabecera.particion}</span>

                </div>
              </div>
              <div className="text-lg font-black text-gray-800 leading-tight">
                {cabecera.cod_cliente} - {cabecera.nombre_comercial || cabecera.razon_social || 'Cliente Desconocido'}
              </div>
            </div>

            {cabecera.observaciones && (
              <div className="bg-orange-50 text-orange-800 text-sm px-3 py-2 rounded-lg border border-orange-200 flex gap-2 items-start mt-1">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-orange-500" />
                <span className="font-medium">{cabecera.observaciones}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-blue-50 border border-blue-100 rounded p-2 flex flex-col items-center justify-center">
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Líneas</span>
                <span className="text-xl font-black text-blue-700 leading-none mt-1">{cabecera.num_lineas || 0}</span>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded p-2 flex flex-col items-center justify-center">
                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">Cajas</span>
                <span className="text-xl font-black text-purple-700 leading-none mt-1">{cabecera.total_cajas || 0}</span>
              </div>
              <div className="bg-teal-50 border border-teal-100 rounded p-2 flex flex-col items-center justify-center">
                <span className="text-[10px] text-teal-500 font-bold uppercase tracking-wider">Volumen</span>
                <span className="text-xl font-black text-teal-700 leading-none mt-1">{cabecera.volumen || 0}</span>
              </div>
            </div>

            <div className="mt-auto shrink-0 flex flex-col gap-2">
              <button onClick={comenzarPreparacion} disabled={loading}
                className="w-full bg-sga-success hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg flex items-center justify-center gap-2 shadow">
                <PackageCheck size={22} /> COMENZAR
              </button>
              <button onClick={() => navigate('/prepara')} disabled={loading}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded-lg text-base flex items-center justify-center gap-2 shadow transition-colors">
                VOLVER
              </button>
            </div>
          </div>
        )}

        {/* ── STACKED STEPS ── */}
        {getStepNumber(fase) >= 1 && lineaActual && (
          <div className="flex flex-col gap-3 pb-4">

            {/* STEP 1: UBICACION */}
            {permisos.solicitar_ubicacion === -1 && (
              <div className={`p-4 rounded shadow bg-white border-l-4 ${fase === FASE.CONFIRMAR_UBICACION ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin size={16} /> 1. Ubicación
                </label>
                {fase === FASE.CONFIRMAR_UBICACION ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleConfirmarUbicacion(); }} className="flex flex-col gap-3">
                    <input
                      ref={inputRef}
                      id="inputUbi"
                      name="ubi"
                      type="text"
                      autoComplete="off"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      placeholder="Escanear ubicación..."
                      className="w-full p-4 border-2 border-sga-primary rounded text-center text-xl font-bold shadow-inner bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all tracking-widest text-gray-900"
                    />
                    <button type="submit" disabled={loading || !inputVal.trim()} className="w-full bg-sga-primary hover:bg-blue-800 text-white font-bold py-4 rounded shadow flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                      <ScanLine size={20} /> VALIDAR
                    </button>
                  </form>
                ) : (
                  <div className="text-lg font-bold text-sga-dark">{ubicacionConfirmada?.descripcion || ubicacionConfirmada?.codubicacion}</div>
                )}
              </div>
            )}

            {/* STEP 2: ARTICULO */}
            {getStepNumber(fase) >= 2 && (
              <div className={`p-4 rounded shadow bg-white border-l-4 ${fase === FASE.CONFIRMAR_ARTICULO ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <Box size={16} /> 2. Artículo
                </label>
                {fase === FASE.CONFIRMAR_ARTICULO ? (
                  <ArticleSearchInput
                    onArticleSelected={handleConfirmarArticulo}
                    disabled={loading}
                    autoFocus={true}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-sga-dark">{lineaActual.codarticuloaplicacion}</div>
                      <div className="text-sm text-gray-600">{lineaActual.nombrearticulo}</div>
                    </div>
                    <Box className="text-gray-300" size={24} />
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: LOTE */}
            {getStepNumber(fase) >= 3 && (lineaActual.prm_trazabilidad || lineaActual.gestionar_caducidad) && lotesDisponibles.length > 1 && (
              <div className={`p-4 rounded shadow bg-white border-l-4 ${fase === FASE.SELECCIONAR_LOTE ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <Hash size={16} /> 3. Lote
                </label>
                {fase === FASE.SELECCIONAR_LOTE ? (
                  <ul className="flex-1 overflow-y-auto flex flex-col gap-2 max-h-48">
                    {lotesDisponibles.map((lote, idx) => (
                      <li key={idx} onClick={() => handleSeleccionarLote(lote)}
                        className="border border-gray-200 rounded p-3 flex justify-between items-center active:bg-orange-50 cursor-pointer shadow-sm">
                        <div>
                          {(lote.numerolote || lote.codnumerolote) && <div className="font-bold text-gray-800">Lote: {lote.numerolote || lote.codnumerolote}</div>}
                          {lote.fechacaducidad && <div className="text-sm text-orange-600">Cad: {formatFechaES(lote.fechacaducidad)}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Stock</div>
                          <div className="font-black text-lg text-sga-primary">{lote.stock}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-lg font-bold text-sga-dark">
                    {loteSeleccionado ? `${loteSeleccionado.numerolote || loteSeleccionado.codnumerolote || ''}${loteSeleccionado.fechacaducidad ? ' (Cad: ' + formatFechaES(loteSeleccionado.fechacaducidad) + ')' : ''}` : ''}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: CANTIDAD */}
            {getStepNumber(fase) >= 4 && (
              <div className={`p-4 rounded shadow bg-white border-l-4 ${fase === FASE.INTRODUCIR_CANTIDAD ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <Scale size={16} /> {lotesDisponibles.length > 1 ? '4' : '3'}. Cantidad a preparar
                </label>
                {permisos.solicitar_cantidad === -1 ? (
                  <div>
                    {factorEanSeleccionado > 1 && (
                      <div className="mb-2 bg-blue-100 text-blue-800 p-2 rounded text-sm font-bold flex items-center justify-center gap-1 shadow-sm border border-blue-200">
                        <AlertCircle size={16} />
                        Se multiplicará la cantidad x {factorEanSeleccionado}
                      </div>
                    )}
                    <label className="text-xs font-bold text-gray-600 uppercase block mb-1">
                      Cantidad a preparar:
                    </label>
                    <input
                      ref={fase === FASE.INTRODUCIR_CANTIDAD ? inputRef : null}
                      id="inputCantidad" name="cantidad" type="number" min="0" step="1" autoComplete="off"
                      value={cantidad} onChange={(e) => setCantidad(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmarCantidad(); }}
                      className="w-full border-2 border-sga-primary rounded px-3 py-3 text-center text-4xl font-black text-sga-primary focus:outline-none"
                      placeholder="0"
                      disabled={fase !== FASE.INTRODUCIR_CANTIDAD}
                    />
                    {factorEanSeleccionado > 1 && cantidad && !isNaN(cantidad) && (
                      <div className="text-center mt-2 text-xl text-sga-primary font-black bg-blue-50 py-2 rounded border border-blue-100">
                        Total = {parseFloat(cantidad) * factorEanSeleccionado} uds.
                      </div>
                    )}
                    {fase === FASE.INTRODUCIR_CANTIDAD && (
                      <button onClick={handleConfirmarCantidad} disabled={loading || !cantidad} className="mt-4 w-full bg-sga-success text-white font-bold py-4 rounded flex items-center justify-center gap-2 shadow disabled:opacity-50">
                        <CheckCircle size={24} /> CONFIRMAR
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="bg-green-50 border border-green-300 rounded p-3 text-center">
                      <div className="text-xs text-green-700 font-bold uppercase mb-1">Se preparará</div>
                      <div className="text-4xl font-black text-sga-success">{lineaActual.cantsolicitada}</div>
                    </div>
                    {fase === FASE.INTRODUCIR_CANTIDAD && (
                      <button onClick={handleConfirmarCantidad} disabled={loading} className="w-full bg-sga-success text-white font-bold py-4 rounded flex items-center justify-center gap-2 shadow">
                        <CheckCircle size={24} /> CONFIRMAR
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRMAR EXCESO ── */}
        {fase === FASE.CONFIRMAR_EXCESO && (
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded border-2 border-orange-500 p-4 gap-4">
            <AlertTriangle size={56} className="text-orange-500" />
            <h3 className="text-xl font-black text-gray-800 text-center">Exceso de mercancía</h3>
            <div className="text-center text-gray-600 mb-4">
              Has introducido <strong>{cantidadPendiente}</strong>, pero lo solicitado era <strong>{lineaActual.cantsolicitada}</strong>.
            </div>
            <div className="flex w-full gap-2">
              <button onClick={() => setFase(FASE.INTRODUCIR_CANTIDAD)} className="flex-1 bg-gray-500 text-white font-bold py-4 rounded">CANCELAR</button>
              <button onClick={() => ejecutarCarga(cantidadPendiente)} className="flex-1 bg-orange-500 text-white font-bold py-4 rounded">CONFIRMAR</button>
            </div>
          </div>
        )}

        {/* ── CONFIRMAR SUMA O SUSTITUCION ── */}
        {fase === FASE.CONFIRMAR_SUMA_SUSTITUCION && (
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded border-2 border-blue-500 p-4 gap-4 shadow-lg">
            <AlertCircle size={56} className="text-blue-500" />
            <h3 className="text-xl font-black text-gray-800 text-center">Mercancía ya en carrito</h3>
            <div className="text-center text-gray-600 mb-2">
              Ya tienes preparadas <strong>{unidadesYaPreparadas}</strong> uds de este artículo en esta ubicación.
              <br /><br />
              ¿Quieres <strong>SUMAR</strong> las <strong>{cantidadPendiente}</strong> nuevas (Total: <strong>{unidadesYaPreparadas + parseFloat(cantidadPendiente || 0)}</strong> uds) o <strong>SUSTITUIR</strong> la cantidad anterior por <strong>{cantidadPendiente}</strong> uds?
            </div>
            <div className="flex flex-col w-full gap-2 mt-2">
              <button onClick={() => handleSumaSustitucion('sumar')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded text-lg shadow">
                SUMAR (+{cantidadPendiente})
              </button>
              <button onClick={() => handleSumaSustitucion('sustituir')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded text-lg shadow">
                SUSTITUIR (= {cantidadPendiente})
              </button>
              <button onClick={() => setFase(FASE.INTRODUCIR_CANTIDAD)} className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 rounded mt-2">
                CANCELAR
              </button>
            </div>
          </div>
        )}

        {/* ── VER LÍNEAS ── */}
        {fase === FASE.VER_LINEAS && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded p-2">
            <div className="flex justify-between mb-2">
              <h3 className="font-bold flex items-center gap-1"><List size={18} /> Pendientes</h3>
              <button onClick={() => setFase(lineaActual ? FASE.INTRODUCIR_CANTIDAD : FASE.CABECERA)} className="text-sga-primary underline text-sm">Volver</button>
            </div>
            <ul className="flex-1 overflow-y-auto flex flex-col gap-2">
              {lineasPendientes.map(lin => {
                const stock = lin.stocktotal || 0;
                const outOfStock = stock <= 0;
                return (
                  <LineaPendienteRow
                    key={lin.numlinea}
                    lin={lin}
                    outOfStock={outOfStock}
                    onSelect={seleccionarLinea}
                    onLongPress={handleLongPressLinea}
                  />
                );
              })}
            </ul>
          </div>
        )}

        {/* ── FIN ── */}
        {fase === FASE.SIN_LINEAS && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <CheckCircle size={64} className="text-sga-success" />
            <p className="text-xl font-black text-center px-4">Preparación completada<br /><span className="text-base text-gray-500 font-medium">No quedan líneas pendientes</span></p>
            <button onClick={() => navigate('/prepara')} className="bg-sga-success text-white font-bold py-4 px-12 rounded-lg text-lg shadow-md hover:bg-green-700 transition-colors">
              VOLVER A PEDIDOS
            </button>
          </div>
        )}
      </div>

      {/* ── BARRA INFERIOR DE NAVEGACIÓN ── */}
      {(fase === FASE.CONFIRMAR_UBICACION ||
        fase === FASE.CONFIRMAR_ARTICULO ||
        fase === FASE.SELECCIONAR_LOTE ||
        fase === FASE.INTRODUCIR_CANTIDAD) && (
          <WizardBottomBar
            items={[
              {
                label: 'ANT',
                icon: <ChevronLeft size={24} />,
                onClick: () => navegarLinea(1),
                disabled: loading,
                variant: 'default',
              },
              {
                label: 'Líneas',
                icon: <List size={24} />,
                onClick: () => setFase(FASE.VER_LINEAS),
                disabled: loading,
                variant: 'info',
              },
              {
                label: 'SIG',
                icon: <ChevronRight size={24} />,
                onClick: () => navegarLinea(0),
                disabled: loading,
                variant: 'default',
              },
            ]}
          />
        )}

      {/* Modal Múltiples Posiciones (Para Confirmar Ubicación) */}
      <Modal
        isOpen={showPosicionModal}
        onClose={() => setShowPosicionModal(false)}
        title="Selecciona Posición"
        icon={<MapPin />}
        headerClassName="bg-sga-primary text-white"
        showCloseButton={false}
        footer={(
          <button
            onClick={() => setShowPosicionModal(false)}
            className="w-full py-3 bg-gray-400 text-white rounded font-bold shadow hover:bg-gray-500 transition-colors"
          >
            CANCELAR
          </button>
        )}
      >
        <p className="text-sm text-gray-600 mb-2 text-center">
          Múltiples posiciones para esta etiqueta.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {posicionesDisponibles.map((posObj, idx) => (
            <button
              key={idx}
              onClick={() => handleConfirmarUbicacion(posObj.POSICION)}
              className="w-full py-4 px-4 bg-gray-50 border-2 border-gray-300 rounded text-center font-bold text-xl text-sga-dark hover:bg-sga-primary hover:text-white hover:border-sga-primary transition-colors"
            >
              Pos {posObj.POSICION}
            </button>
          ))}
        </div>
      </Modal>

      {/* Modal de Salida (Exit) */}
      <ConfirmDialog
        isOpen={showExitModal}
        onCancel={() => setShowExitModal(false)}
        onConfirm={() => navigate('/prepara')}
        title="Atención"
        icon={<AlertTriangle />}
        message="¿Seguro que quieres salir?"
        cancelText="CONTINUAR"
        confirmText="SALIR"
      >
        {lineasPendientes.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-md">
            <p className="font-bold mb-1 flex items-center justify-center gap-1">
              <List size={16} /> Faltan líneas
            </p>
            <p className="text-sm">
              Aún quedan <strong>{lineasPendientes.length}</strong> líneas pendientes de preparar en este pedido.
            </p>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Podrás retomar la preparación de este pedido más adelante.
        </p>
      </ConfirmDialog>

      {/* Modal de Utilidades de Línea (Longpress) */}
      <LineaUtilidadesModal
        isOpen={showUtilidadesModal}
        onClose={() => setShowUtilidadesModal(false)}
        linea={lineaParaUtilidades}
      />
    </div>
  );
};

// ─── COMPONENTES AUXILIARES CON SOPORTE LONGPRESS ───────────────────────────

function PanelInfoCard({ lineaActual, ubicacionConfirmada, lineasPendientes, onLongPress }) {
  const longPressProps = useLongPress(() => onLongPress(lineaActual), null, { delay: 500 });
  if (!lineaActual) return null;

  const pte = lineaActual.cantsolicitada - (lineaActual.cantpreparada || 0);
  const pr = lineaActual.cantpreparada || 0;

  // Cálculo de cajas
  let cajasTxt = "";
  const factor = lineaActual.factorconversiontipounidad;
  if (factor && factor > 1) {
    const numCajas = Math.floor(pte / factor);
    cajasTxt = numCajas > 0 ? `${numCajas} CAJ(${factor})` : "";
  }

  return (
    <div
      {...longPressProps}
      className="bg-white border-2 border-sga-primary border-opacity-20 rounded-lg p-3 shadow-sm flex flex-col gap-2 shrink-0 relative overflow-hidden select-none active:bg-blue-50/40 transition-colors cursor-pointer"
      title="💡 Mantén pulsada esta tarjeta para consultar utilidades de stock y ubicación"
    >
      {/* Borde izquierdo decorativo */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-sga-primary opacity-80 rounded-l-lg"></div>

      {/* ── Cabecera: Ubicación y Líneas Ptes ── */}
      <div className="flex items-center justify-between mb-1 pl-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <MapPin size={16} className="text-sga-primary shrink-0" />
          <span className="font-black text-sga-primary text-base truncate">
            {lineaActual.nombreubicacion || lineaActual.codhueco || lineaActual.descripcion || lineaActual.codubicacion}
          </span>
          {ubicacionConfirmada && (
            <CheckCircle size={14} className="text-sga-success shrink-0 ml-1" />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-200 shadow-sm">
            <List size={12} />
            <span>{lineasPendientes.length} lineas pdtes.</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLongPress(lineaActual);
            }}
            className="bg-gray-100 hover:bg-sga-primary text-gray-500 hover:text-white p-1 rounded-full transition-colors shadow-sm"
            title="Utilidades de la línea"
          >
            <Info size={14} />
          </button>
        </div>
      </div>

      {/* ── Artículo ── */}
      <div className="flex items-start gap-2 pl-2">
        <Box size={18} className="text-gray-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-800 text-sm leading-tight">
            {lineaActual.nombrearticulo}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 font-mono">
            Ref: {lineaActual.codarticuloaplicacion || lineaActual.codarticulo}
          </div>
        </div>
      </div>

      {/* ── Observaciones ── */}
      {lineaActual.observaciones && (
        <div className="ml-2 mt-1 bg-orange-50 text-orange-800 text-xs px-2 py-1.5 rounded border border-orange-200 flex gap-1.5 items-start">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-orange-500" />
          <span className="font-medium leading-tight">{lineaActual.observaciones}</span>
        </div>
      )}

      {/* ── Cantidades ── */}
      <div className="mt-1 flex items-center justify-between bg-gray-50 rounded-md p-2 border border-gray-200 pl-3 ml-1 mr-1">
        <div className="flex gap-5">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">SOLICITADO:</span>
            <span className="text-xl font-black text-sga-primary leading-none">{pte}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">PREPARADO: </span>
            <span className="text-xl font-black text-gray-400 leading-none">{pr}</span>
          </div>
        </div>

        <div className="flex flex-col items-end justify-center">
          {cajasTxt && (
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200 shadow-sm">
              {cajasTxt}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function LineaPendienteRow({ lin, outOfStock, onSelect, onLongPress }) {
  const longPressProps = useLongPress(() => onLongPress(lin), outOfStock ? null : () => onSelect(lin), { delay: 500 });
  const stock = lin.stocktotal || 0;
  return (
    <li
      {...longPressProps}
      className={`border rounded p-2.5 text-sm shadow-sm transition-colors select-none ${
        outOfStock ? 'bg-red-50 border-red-200' : 'active:bg-blue-50/60 hover:border-blue-300 cursor-pointer'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="font-bold truncate text-gray-800 flex-1">{lin.nombrearticulo}</div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLongPress(lin);
          }}
          className="text-gray-400 hover:text-sga-primary p-0.5 rounded transition-colors shrink-0"
          title="Ver utilidades"
        >
          <Info size={16} />
        </button>
      </div>
      <div className="flex justify-between items-center text-gray-500 text-xs mt-1 font-mono">
        <span>Ref: <strong className="text-gray-700">{lin.codarticuloaplicacion}</strong></span>
        <div className="flex gap-3">
          <span className={`font-bold ${outOfStock ? 'text-red-500' : 'text-blue-600'}`}>Stock Total: {stock}</span>
          <span className="font-bold text-sga-success">Pte: {lin.cantsolicitada - (lin.cantpreparada || 0)}</span>
        </div>
      </div>
    </li>
  );
}

export default PreparaPedido;
