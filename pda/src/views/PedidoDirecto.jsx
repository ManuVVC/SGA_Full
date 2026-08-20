import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText, CheckCircle, AlertTriangle, Search, PlusCircle, Save, MapPin, XCircle, PackageCheck, ListOrdered, Archive, Layers } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';
import ArticleSearchInput from '../components/ArticleSearchInput';
import { useKeyboard } from '../contexts/KeyboardContext';
import { getClientes } from '../api/devolucionesService';
import { getPedidoDirectoEnCurso, crearCabeceraPedidoDirecto, grabarLineaPedidoDirecto, getLineasPedidoDirecto, getStockLotes } from '../api/preparacionService';
import { validarUbicacion } from '../api/reubicacionesService';
import { usePermissions } from '../hooks/usePermissions';
import { formatFechaES } from '../utils/dateUtils';

const parseShorthandDate = (input) => {
  if (!input) return '';
  if (input.includes('-') || input.includes('/')) return input;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

  const clean = input.replace(/\D/g, '');

  if (clean.length === 1 || clean.length === 2) {
    const dd = clean.padStart(2, '0');
    return `${currentYear}-${currentMonth}-${dd}`;
  } else if (clean.length === 4) {
    const dd = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    return `${currentYear}-${mm}-${dd}`;
  } else if (clean.length === 6) {
    const dd = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    const aa = clean.substring(4, 6);
    return `20${aa}-${mm}-${dd}`;
  }

  return input;
};

export default function PedidoDirecto() {
  const navigate = useNavigate();
  const { isKeyboardOpen } = useKeyboard();
  const { hasPermission, loading: permsLoading } = usePermissions();

  // Control de acceso por permiso
  useEffect(() => {
    if (!permsLoading && !hasPermission('PRM_PREPARARPEDIDODIRECTO')) {
      navigate('/menu');
    }
  }, [permsLoading, hasPermission, navigate]);

  // Pasos: 1 = Buscar Cliente, 2 = Crear Cabecera, 3 = Registrar Líneas
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Datos del cliente
  const [filtroCliente, setFiltroCliente] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [fechaDocumento, setFechaDocumento] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');

  // Cabecera del pedido directo en BD
  const [documentoCreado, setDocumentoCreado] = useState(null); // { cod_documento, num_documento, serie }

  // Datos de línea activa en preparación
  const [ubicacionOrigen, setUbicacionOrigen] = useState('');
  const [ubicacionOrigenId, setUbicacionOrigenId] = useState(null);
  const [ubicacionNombre, setUbicacionNombre] = useState('');
  const [ubicacionConfirmada, setUbicacionConfirmada] = useState(false);

  const [articuloInfo, setArticuloInfo] = useState(null);
  const [unidades, setUnidades] = useState('');
  const [lote, setLote] = useState('');
  const [caducidad, setCaducidad] = useState('');
  const [lotesDisponibles, setLotesDisponibles] = useState([]);
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);
  const [maxStock, setMaxStock] = useState(0);

  // Historial de líneas preparadas en este pedido
  const [lineasGrabadas, setLineasGrabadas] = useState([]);
  const [showLineasGrabadas, setShowLineasGrabadas] = useState(false);

  // Modales de posiciones de ubicación (si ubicación tiene posiciones múltiples)
  const [posicionesDisponibles, setPosicionesDisponibles] = useState([]);
  const [showPosicionModal, setShowPosicionModal] = useState(false);

  // Refs para control de foco en terminal industrial
  const inputClienteRef = useRef(null);
  const obsRef = useRef(null);
  const ubicacionRef = useRef(null);
  const unidadesRef = useRef(null);
  const loteRef = useRef(null);
  const caducidadRef = useRef(null);

  // 1. Comprobar al cargar si hay un pedido directo en curso
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const enCursoRes = await getPedidoDirectoEnCurso();
        if (enCursoRes && enCursoRes.cod_documento) {
          const dev = enCursoRes;
          if (dev.cliente) {
            setSelectedCliente(dev.cliente);
          } else {
            setSelectedCliente({ RAZONSOCIAL: 'CLIENTE GENERAL / SIN ASIGNAR', CODCLIENTE: 0 });
          }
          setDocumentoCreado({
            cod_documento: dev.cod_documento,
            num_documento: dev.num_documento,
            serie: dev.serie
          });
          setObservaciones(dev.observaciones || '');

          // Cargar líneas ya preparadas
          const lineasRes = await getLineasPedidoDirecto(dev.cod_documento);
          if (Array.isArray(lineasRes)) {
            setLineasGrabadas(lineasRes);
          } else if (lineasRes && lineasRes.lineas) {
            setLineasGrabadas(lineasRes.lineas);
          }

          setStep(3);
        }
      } catch (err) {
        console.warn('No hay pedido directo en curso o error menor:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Control de foco automático según el paso actual
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 1 && inputClienteRef.current) inputClienteRef.current.focus();
      if (step === 2 && obsRef.current) obsRef.current.focus();
      if (step === 3) {
        if (!ubicacionConfirmada) {
          ubicacionRef.current?.focus();
        } else if (articuloInfo) {
          if (!unidades) unidadesRef.current?.focus();
          else if (articuloInfo.PRM_TRAZABILIDAD !== 0 && !lote) loteRef.current?.focus();
          else if (articuloInfo.GESTIONARCADUCIDAD !== 0 && !caducidad) caducidadRef.current?.focus();
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [step, ubicacionConfirmada, articuloInfo, isKeyboardOpen]);

  // Búsqueda de clientes
  const handleBuscarClientes = async (e) => {
    if (e) e.preventDefault();
    if (!filtroCliente.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await getClientes(filtroCliente.trim());
      if (res.status === 'success') {
        setClientesEncontrados(res.clientes || []);
        if (res.clientes.length === 0) {
          setError('No se encontraron clientes con ese criterio.');
        }
      }
    } catch (err) {
      setError('Error al buscar clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCliente = (cliente) => {
    setSelectedCliente(cliente);
    setStep(2);
    setError(null);
  };

  // Crear o confirmar cabecera
  const handleCrearCabecera = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        CODCLIENTE: selectedCliente?.CODCLIENTE || null,
        CIF: selectedCliente?.CIF || '',
        RAZONSOCIAL: selectedCliente?.RAZONSOCIAL || '',
        NOMBRECOMERCIAL: selectedCliente?.NOMBRECOMERCIAL || '',
        DIRECCION: selectedCliente?.DIRECCION || '',
        POBLACION: selectedCliente?.POBLACION || '',
        FECHADOCUMENTO: fechaDocumento,
        OBSERVACIONES: observaciones,
      };

      const res = await crearCabeceraPedidoDirecto(payload);
      if (res && res.cod_documento) {
        setDocumentoCreado(res);
        setStep(3);
        setSuccess(`Pedido Directo iniciado: #${res.num_documento}`);
      } else {
        throw new Error('No se recibió el código del documento al crear cabecera.');
      }
    } catch (err) {
      setError(err.message || 'Error al crear la cabecera del pedido directo.');
    } finally {
      setLoading(false);
    }
  };

  // Validar Ubicación Origen escaneada por operario
  const handleValidarUbicacion = async (e) => {
    if (e) e.preventDefault();
    if (!ubicacionOrigen.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await validarUbicacion(ubicacionOrigen.trim());
      if (res.status === 'success') {
        setUbicacionOrigenId(res.ubicacion.CODUBICACION);
        setUbicacionNombre(res.ubicacion.UBICACION);
        setUbicacionConfirmada(true);
      } else if (res.status === 'necesita_posicion') {
        setPosicionesDisponibles(res.opciones);
        setShowPosicionModal(true);
      } else {
        setError(res.message || 'Ubicación origen no válida o no encontrada.');
        setUbicacionOrigen('');
        setTimeout(() => ubicacionRef.current?.focus(), 100);
      }
    } catch (err) {
      setError(err.message || 'Error al validar ubicación origen.');
      setUbicacionOrigen('');
      setTimeout(() => ubicacionRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPosicion = async (posicion) => {
    setShowPosicionModal(false);
    setLoading(true);
    setError(null);
    try {
      const res = await validarUbicacion(ubicacionOrigen.trim(), posicion);
      if (res.status === 'success') {
        setUbicacionOrigenId(res.ubicacion.CODUBICACION);
        setUbicacionNombre(res.ubicacion.UBICACION);
        setUbicacionConfirmada(true);
      } else {
        setError(res.message || 'Error al seleccionar la posición.');
        setUbicacionOrigen('');
        setTimeout(() => ubicacionRef.current?.focus(), 100);
      }
    } catch (err) {
      setError(err.message || 'Error al validar posición.');
      setUbicacionOrigen('');
      setTimeout(() => ubicacionRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const resetDatosArticulo = () => {
    setArticuloInfo(null);
    setLotesDisponibles([]);
    setLoteSeleccionado(null);
    setMaxStock(0);
    setUnidades('');
    setLote('');
    setCaducidad('');
  };

  const handleSelectArticulo = async (art) => {
    setLoading(true);
    setError(null);
    try {
      const lotes = await getStockLotes(ubicacionOrigenId, art.CODARTICULO);
      if (!lotes || lotes.length === 0) {
        setError(`El artículo ${art.NOMBREARTICULO || ''} no tiene stock disponible en la ubicación seleccionada.`);
        setLoading(false);
        return;
      }
      setArticuloInfo(art);
      setLotesDisponibles(lotes);
      setUnidades('');
      setLote('');
      setCaducidad('');
      setLoteSeleccionado(null);

      // Calcular stock total disponible por defecto
      const stockTotal = lotes.reduce((acc, curr) => acc + (parseFloat(curr.stock) || 0), 0);
      setMaxStock(stockTotal);

      if (art.PRM_TRAZABILIDAD !== 0 || art.GESTIONARCADUCIDAD !== 0) {
        if (lotes.length === 1) {
          // Si solo hay un lote, cargarlo automáticamente
          const l = lotes[0];
          setLote(l.numerolote || l.codnumerolote || '');
          setCaducidad(l.fechacaducidad || '');
          setMaxStock(parseFloat(l.stock) || 0);
          setLoteSeleccionado(l);
          setTimeout(() => unidadesRef.current?.focus(), 100);
        } else {
          // Si hay varios lotes disponibles, el usuario deberá elegir uno
        }
      } else {
        setTimeout(() => unidadesRef.current?.focus(), 100);
      }
    } catch (err) {
      setError('Error al consultar stock del artículo: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Grabar línea y realizar salida de stock
  const handleGrabarLinea = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!ubicacionConfirmada || !ubicacionOrigenId) {
      setError('Debe seleccionar y confirmar la ubicación origen.');
      return;
    }
    if (!articuloInfo) {
      setError('Debe seleccionar un artículo.');
      return;
    }
    if (!unidades || parseFloat(unidades) <= 0) {
      setError('Introduzca una cantidad válida mayor a 0.');
      return;
    }
    if (maxStock > 0 && parseFloat(unidades) > maxStock) {
      setError(`No se puede preparar una cantidad (${unidades}) superior al stock disponible (${maxStock}).`);
      return;
    }
    if (articuloInfo.PRM_TRAZABILIDAD !== 0 && !lote.trim()) {
      setError('El número de lote es obligatorio para este artículo.');
      return;
    }
    if (articuloInfo.GESTIONARCADUCIDAD !== 0 && !caducidad.trim()) {
      setError('La fecha de caducidad es obligatoria para este artículo.');
      return;
    }

    const parsedCaducidad = caducidad ? parseShorthandDate(caducidad) : null;
    const totalUnits = parseFloat(unidades) * (articuloInfo.UNIDADES || 1);

    setLoading(true);
    try {
      let docId = documentoCreado?.cod_documento;
      if (!docId) {
        throw new Error('No hay documento activo. Vuelva a iniciar el pedido.');
      }

      let tipoCodigoIntroducido = null;
      let codigoIntroducido = null;
      if (articuloInfo.searchType === 'codarticuloaplicacion') {
        tipoCodigoIntroducido = 0;
        codigoIntroducido = articuloInfo.searchQuery;
      } else if (articuloInfo.searchType === 'codfacturacion') {
        tipoCodigoIntroducido = 1;
        codigoIntroducido = articuloInfo.searchQuery;
      }

      const payload = {
        CODDOCUMENTO: docId,
        CODARTICULO: articuloInfo.CODARTICULO,
        UNIDADES: totalUnits,
        NUMEROLOTE: lote.trim().toUpperCase() || null,
        FECHACADUCIDAD: parsedCaducidad || null,
        EAN: articuloInfo.CODARTICULOAPLICACION,
        CODUBICACION: ubicacionOrigenId,
        TIPOCODIGOINTRODUCIDO: tipoCodigoIntroducido,
        CODIGOINTRODUCIDO: codigoIntroducido
      };

      const res = await grabarLineaPedidoDirecto(payload);
      if (res && (res.status === 'success' || res.num_linea)) {
        setSuccess(`Preparado: ${articuloInfo.CODARTICULOAPLICACION} (${totalUnits} uds) desde ${ubicacionNombre}`);

        // Actualizar histórico visual de la sesión
        setLineasGrabadas(prev => [
          {
            cod_articulo_aplicacion: articuloInfo.CODARTICULOAPLICACION,
            nombre: articuloInfo.NOMBREARTICULO,
            unidades: totalUnits,
            lote: lote.trim().toUpperCase(),
            caducidad: parsedCaducidad || '',
            ubicacion: ubicacionNombre
          },
          ...prev
        ]);

        // Reiniciar datos del artículo y lotes para continuar escaneando
        resetDatosArticulo();
      } else {
        throw new Error(res.error || 'No se pudo registrar la mercancía.');
      }
    } catch (err) {
      setError(err.message || 'Error al grabar línea en el pedido directo.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerLineasGrabadas = async () => {
    if (!documentoCreado) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getLineasPedidoDirecto(documentoCreado.cod_documento);
      if (Array.isArray(res)) {
        setLineasGrabadas(res);
      } else if (res && res.lineas) {
        setLineasGrabadas(res.lineas);
      }
      setShowLineasGrabadas(true);
    } catch (err) {
      setError('Error al consultar el histórico de líneas preparadas.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 3 && documentoCreado) {
      if (window.confirm('¿Seguro que desea salir? El pedido directo en curso quedará guardado y podrá reanudarse más adelante.')) {
        navigate('/prepara');
      }
    } else {
      navigate('/prepara');
    }
  };

  return (
    <div className="flex flex-col h-full bg-sga-light">
      <TerminalHeader title="PEDIDO CLIENTE AL VUELO" />

      <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto">
        {/* Botón volver */}
        <div className="flex items-center gap-2">
          <button onClick={handleBack} className="p-2 bg-white shadow rounded border border-gray-300 text-sga-dark">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-bold text-sga-dark">Volver</span>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 text-xs font-bold rounded flex items-center gap-1 shadow">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-2 text-xs font-bold rounded flex items-center gap-1 shadow animate-fade-in">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* INDICADOR DE CABECERA ACTIVA */}
        {documentoCreado && (
          <div className="bg-blue-800 text-white p-2 rounded shadow flex justify-between items-center text-xs">
            <div>
              <span className="font-bold text-yellow-300">DOC: #{documentoCreado.num_documento}</span>
              <span className="ml-2 text-blue-200">({selectedCliente?.NOMBRECOMERCIAL || selectedCliente?.RAZONSOCIAL || 'CLIENTE'})</span>
            </div>
            <button
              onClick={handleVerLineasGrabadas}
              className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded font-bold flex items-center gap-1 border border-blue-400 text-[11px]"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              Ver Líneas ({lineasGrabadas.length})
            </button>
          </div>
        )}

        {/* PASO 1: SELECCIÓN DE CLIENTE */}
        {step === 1 && (
          <div className="flex-1 flex flex-col gap-2">
            <div className="bg-white p-3 rounded shadow border-l-4 border-blue-600 flex flex-col gap-2">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1">
                <User className="w-4 h-4 text-blue-600" /> Paso 1: Seleccionar Cliente Destino
              </h2>
              <form onSubmit={handleBuscarClientes} className="flex gap-2">
                <input
                  ref={inputClienteRef}
                  type="text"
                  placeholder="Nombre, CIF o Código..."
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded text-sm uppercase focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={loading || !filtroCliente.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-bold flex items-center gap-1 shadow disabled:opacity-50"
                >
                  <Search className="w-4 h-4" /> Buscar
                </button>
              </form>
            </div>

            {loading && <div className="p-4 text-center font-bold text-gray-500 animate-pulse">Buscando clientes...</div>}

            {clientesEncontrados.length > 0 && (
              <div className="bg-white p-2 rounded shadow flex-1 overflow-y-auto">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Resultados de búsqueda</h3>
                <div className="flex flex-col gap-2">
                  {clientesEncontrados.map((cli) => (
                    <div
                      key={cli.CODCLIENTE}
                      onClick={() => handleSelectCliente(cli)}
                      className="p-2 border border-gray-200 rounded hover:bg-blue-50 active:bg-blue-100 cursor-pointer flex justify-between items-center transition-colors shadow-sm"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-sm text-gray-800">{cli.NOMBRECOMERCIAL || cli.RAZONSOCIAL}</span>
                        {cli.RAZONSOCIAL && cli.NOMBRECOMERCIAL && cli.RAZONSOCIAL !== cli.NOMBRECOMERCIAL && (
                          <span className="text-xs text-blue-700 font-semibold">{cli.RAZONSOCIAL}</span>
                        )}
                        <span className="text-xs text-gray-500 font-mono">CIF: {cli.CIF || 'S/N'} | Cód: {cli.CODCLIENTEAPLICACION || cli.CODCLIENTE}</span>
                      </div>
                      <PlusCircle className="w-5 h-5 text-blue-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 2: CONFIRMAR DATOS CABECERA */}
        {step === 2 && selectedCliente && (
          <div className="bg-white p-3 rounded shadow border-l-4 border-yellow-500 flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1">
              <FileText className="w-4 h-4 text-yellow-600" /> Paso 2: Confirmar Inicio de Pedido Directo
            </h2>

            <div className="bg-gray-50 p-2 rounded border border-gray-200 text-xs flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Cliente:</span>
                <span className="font-bold text-gray-800 uppercase">{selectedCliente.NOMBRECOMERCIAL || selectedCliente.RAZONSOCIAL}</span>
              </div>
              {selectedCliente.NOMBRECOMERCIAL && selectedCliente.RAZONSOCIAL && selectedCliente.NOMBRECOMERCIAL !== selectedCliente.RAZONSOCIAL && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold">Razón Social:</span>
                  <span className="text-gray-700 font-semibold uppercase">{selectedCliente.RAZONSOCIAL}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">CIF:</span>
                <span className="font-mono text-gray-800">{selectedCliente.CIF || 'S/N'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Población:</span>
                <span className="text-gray-800 uppercase">{selectedCliente.POBLACION || '-'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700">Fecha del Documento:</label>
              <input
                type="date"
                value={fechaDocumento}
                onChange={(e) => setFechaDocumento(e.target.value)}
                className="p-2 border border-gray-300 rounded text-sm font-bold bg-white"
              />

              <label className="text-xs font-bold text-gray-700 mt-1">Observaciones / Notas:</label>
              <textarea
                ref={obsRef}
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Introduzca observaciones del pedido..."
                className="p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded font-bold text-sm shadow"
              >
                Cambiar Cliente
              </button>
              <button
                onClick={handleCrearCabecera}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold text-sm flex justify-center items-center gap-1 shadow disabled:opacity-50"
              >
                <PackageCheck className="w-4 h-4" /> Iniciar Preparación
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: BUCLE DE PREPARACIÓN DE LÍNEAS */}
        {step === 3 && (
          <div className="flex-1 flex flex-col gap-2">
            {/* PANEL 1: SELECCIÓN DE UBICACIÓN ORIGEN */}
            <div className={`p-2.5 rounded shadow border-l-4 transition-all ${ubicacionConfirmada ? 'bg-green-50 border-green-600' : 'bg-white border-blue-600'}`}>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase flex items-center gap-1 text-gray-700">
                  <MapPin className={`w-4 h-4 ${ubicacionConfirmada ? 'text-green-600' : 'text-blue-600'}`} />
                  1. Ubicación Origen de Mercancía
                </label>
                {ubicacionConfirmada && (
                  <button
                    onClick={() => {
                      setUbicacionConfirmada(false);
                      setUbicacionOrigenId(null);
                      setUbicacionNombre('');
                      setTimeout(() => ubicacionRef.current?.focus(), 100);
                    }}
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-blue-200 shadow-sm"
                  >
                    Cambiar
                  </button>
                )}
              </div>

              {!ubicacionConfirmada ? (
                <form onSubmit={handleValidarUbicacion} className="flex gap-2">
                  <input
                    ref={ubicacionRef}
                    type="text"
                    placeholder="Escanear o introducir hueco..."
                    value={ubicacionOrigen}
                    onChange={(e) => setUbicacionOrigen(e.target.value.toUpperCase())}
                    className="flex-1 p-2 border border-gray-300 rounded font-mono font-bold uppercase text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || !ubicacionOrigen.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-bold text-xs shadow"
                  >
                    Confirmar
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between font-mono font-bold text-sm text-green-900 bg-green-100/60 p-2 rounded border border-green-300">
                  <span>UBICACIÓN ORIGEN: {ubicacionNombre || ubicacionOrigen}</span>
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                </div>
              )}
            </div>

            {/* PANEL 2: SELECCIÓN DE ARTÍCULO Y DATOS */}
            {ubicacionConfirmada && (
              <div className="bg-white p-2.5 rounded shadow border-l-4 border-yellow-500 flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                  <Layers className="w-4 h-4 text-yellow-600" />
                  2. Artículo a Servir
                </label>

                {!articuloInfo ? (
                  <ArticleSearchInput
                    onArticleSelected={handleSelectArticulo}
                    autoFocus={true}
                    disabled={loading}
                  />
                ) : (
                  <form onSubmit={handleGrabarLinea} className="flex flex-col gap-2 mt-1 border-t pt-2 border-gray-100 animate-fade-in">
                    <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-xs flex justify-between items-center">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-gray-800 text-sm">{articuloInfo.NOMBREARTICULO}</span>
                        <span className="text-gray-500 font-mono">Cód: {articuloInfo.CODARTICULOAPLICACION}</span>
                      </div>
                      <button
                        type="button"
                        onClick={resetDatosArticulo}
                        className="text-xs text-yellow-800 font-bold underline px-2 py-1 hover:text-yellow-900"
                      >
                        Cambiar
                      </button>
                    </div>

                    {/* SELECCIÓN DE LOTE O LISTA DE LOTES */}
                    {(articuloInfo.PRM_TRAZABILIDAD !== 0 || articuloInfo.GESTIONARCADUCIDAD !== 0) && lotesDisponibles.length > 1 && !loteSeleccionado ? (
                      <div className="bg-orange-50 p-3 rounded border border-orange-300 my-1">
                        <label className="text-xs font-bold text-orange-800 uppercase block mb-2">Seleccione Lote / Caducidad Disponible:</label>
                        <ul className="max-h-48 overflow-y-auto flex flex-col gap-2">
                          {lotesDisponibles.map((l, idx) => (
                            <li
                              key={idx}
                              onClick={() => {
                                setLote(l.numerolote || l.codnumerolote || '');
                                setCaducidad(l.fechacaducidad || '');
                                setMaxStock(parseFloat(l.stock) || 0);
                                setLoteSeleccionado(l);
                                setTimeout(() => unidadesRef.current?.focus(), 100);
                              }}
                              className="border border-orange-200 bg-white rounded p-2.5 flex justify-between items-center active:bg-orange-100 cursor-pointer shadow-sm"
                            >
                              <div>
                                {(l.numerolote || l.codnumerolote) && <div className="font-bold text-gray-800 text-sm">Lote: {l.numerolote || l.codnumerolote}</div>}
                                {l.fechacaducidad && <div className="text-xs text-orange-600 font-semibold">Cad: {formatFechaES(l.fechacaducidad)}</div>}
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-gray-400 uppercase">Stock</div>
                                <div className="font-black text-base text-green-700">{l.stock}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <>
                        {/* INPUTS DE LOTE/CADUCIDAD SI REGULA TRAZABILIDAD */}
                        {(articuloInfo.PRM_TRAZABILIDAD !== 0 || articuloInfo.GESTIONARCADUCIDAD !== 0) && (
                          <div className="flex flex-col gap-2">
                            {lotesDisponibles.length > 1 && loteSeleccionado && (
                              <div className="flex justify-between items-center bg-orange-50 p-2 rounded border border-orange-200 text-xs text-orange-800 font-semibold">
                                <span>Lote seleccionado de la lista</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLoteSeleccionado(null);
                                    setLote('');
                                    setCaducidad('');
                                  }}
                                  className="text-orange-900 font-bold underline text-xs"
                                >
                                  Cambiar Lote
                                </button>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              {articuloInfo.PRM_TRAZABILIDAD !== 0 && (
                                <div>
                                  <label className="text-[11px] font-bold text-gray-700 block mb-0.5">Lote *</label>
                                  <input
                                    ref={loteRef}
                                    type="text"
                                    placeholder="Nº Lote"
                                    value={lote}
                                    onChange={(e) => setLote(e.target.value.toUpperCase())}
                                    className="w-full p-2 border border-gray-300 rounded font-mono text-sm font-bold uppercase focus:ring-2 focus:ring-yellow-500 bg-gray-50"
                                    required
                                    readOnly={loteSeleccionado !== null || lotesDisponibles.length === 1}
                                  />
                                </div>
                              )}

                              {articuloInfo.GESTIONARCADUCIDAD !== 0 && (
                                <div>
                                  <label className="text-[11px] font-bold text-gray-700 block mb-0.5">Caducidad *</label>
                                  <input
                                    ref={caducidadRef}
                                    type="text"
                                    placeholder="DDMM o DDMMYY"
                                    value={caducidad}
                                    onChange={(e) => setCaducidad(e.target.value)}
                                    onBlur={(e) => {
                                      const p = parseShorthandDate(e.target.value);
                                      if (p) setCaducidad(p);
                                    }}
                                    className="w-full p-2 border border-gray-300 rounded font-mono text-sm font-bold focus:ring-2 focus:ring-yellow-500 bg-gray-50"
                                    required
                                    readOnly={loteSeleccionado !== null || lotesDisponibles.length === 1}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-center mb-0.5">
                            <label className="text-[11px] font-bold text-gray-700">Cantidad a Preparar *</label>
                            {maxStock > 0 && (
                              <span className="text-[11px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                                Disp: {maxStock}
                              </span>
                            )}
                          </div>
                          <input
                            ref={unidadesRef}
                            type="number"
                            step="any"
                            placeholder="Unidades..."
                            value={unidades}
                            onChange={(e) => setUnidades(e.target.value)}
                            className="w-full p-2 border-2 border-blue-500 rounded font-mono text-lg font-bold text-center text-blue-900 focus:ring-4 focus:ring-blue-300 bg-blue-50/30"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-2.5 rounded font-bold text-sm flex justify-center items-center gap-1 shadow mt-1 transition-all disabled:opacity-50"
                        >
                          <Save className="w-5 h-5" /> Grabar Mercancía en Pedido
                        </button>
                      </>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE POSICIONES SI UBICACIÓN ES MÚLTIPLE */}
      {showPosicionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden flex flex-col">
            <div className="bg-blue-600 text-white p-3 font-bold flex justify-between items-center text-sm">
              <span>Seleccione Posición en Ubicación</span>
              <button onClick={() => setShowPosicionModal(false)} className="text-white hover:text-gray-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-60 flex flex-col gap-2">
              {posicionesDisponibles.map((pos, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPosicion(pos)}
                  className="w-full p-2 bg-gray-100 hover:bg-blue-50 font-mono font-bold text-sm text-gray-800 rounded border border-gray-300 text-left flex justify-between items-center"
                >
                  <span>Posición: {pos}</span>
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO DE LÍNEAS PREPARADAS */}
      {showLineasGrabadas && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-blue-800 text-white p-3 font-bold flex justify-between items-center text-sm">
              <span className="flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4" /> Líneas Preparadas ({lineasGrabadas.length})
              </span>
              <button onClick={() => setShowLineasGrabadas(false)} className="text-white hover:text-gray-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 overflow-y-auto flex-1 flex flex-col gap-2 bg-gray-50">
              {lineasGrabadas.length === 0 ? (
                <div className="p-6 text-center text-gray-500 font-bold text-sm">No hay líneas preparadas aún en este pedido.</div>
              ) : (
                lineasGrabadas.map((lin, idx) => (
                  <div key={idx} className="bg-white p-2 rounded shadow-sm border border-gray-200 text-xs flex flex-col gap-1">
                    <div className="flex justify-between font-bold text-gray-800 border-b pb-1">
                      <span>{lin.nombre || lin.cod_articulo_aplicacion}</span>
                      <span className="text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-mono">{lin.unidades} uds</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-600 font-mono">
                      <span>Cód: {lin.cod_articulo_aplicacion}</span>
                      <span>Ubic: {lin.ubicacion || '-'}</span>
                    </div>
                    {(lin.lote || lin.caducidad) && (
                      <div className="flex justify-between text-[10px] bg-gray-100 p-1 rounded font-mono text-gray-700">
                        <span>Lote: {lin.lote || 'N/A'}</span>
                        <span>Cad: {lin.caducidad || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-2 bg-white border-t flex justify-end">
              <button
                onClick={() => setShowLineasGrabadas(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-xs shadow"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
