import { useState, useCallback, useRef } from 'react';
import {
  obtenerDocumento, getCabeceraPedido, getPrimeraLinea,
  siguienteLinea, cargarMercancia, getLineasPendientes,
  getNumLineasPendientes, getUnidsPreparadas,
  getPermisosPreparacion, validarUbicacion, getStockLotes,
  getRecorridoLinea, descargarLinea
} from '../api/preparacionService';

export const FASE = {
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

export const usePreparacionPedido = (inputRef) => {
  const [fase, setFase] = useState(FASE.CARGANDO);
  const [faseAnterior, setFaseAnterior] = useState(null);
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

  // Estado modal descarga de línea preparada
  const [lineaParaDescargar, setLineaParaDescargar] = useState(null);
  const [recorridoDescarga, setRecorridoDescarga] = useState([]);
  const [loadingDescarga, setLoadingDescarga] = useState(false);
  const [registrosAAnular, setRegistrosAAnular] = useState([]); // array de { ...rec, cantidadAAnular: number, selected: boolean }

  const handleLongPressLinea = useCallback((linea) => {
    if (!linea) return;
    setLineaParaUtilidades(linea);
    setShowUtilidadesModal(true);
  }, []);

  const handleAbrirDescarga = useCallback(async (linea) => {
    setLineaParaDescargar(linea);
    setRecorridoDescarga([]);
    setRegistrosAAnular([]);
    setLoadingDescarga(true);
    try {
      const recorrido = await getRecorridoLinea(cabecera.cod_documento, linea.numlinea);
      setRecorridoDescarga(recorrido);
      // Inicializar los registros a anular (por defecto todos seleccionados con su cantidad máxima pendiente)
      setRegistrosAAnular(recorrido.map(rec => ({
        ...rec,
        cantidadAAnular: rec.cantpreparada - (rec.cantdevuelta || 0),
        selected: true
      })));
    } catch (e) {
      setError('Error al cargar el detalle de la línea preparada.');
    } finally {
      setLoadingDescarga(false);
    }
  }, [cabecera]);

  const handleConfirmarDescarga = useCallback(async () => {
    if (!lineaParaDescargar || !cabecera) return;
    setLoadingDescarga(true);
    try {
      // Filtrar solo los seleccionados y mapear al formato esperado por el backend
      const registros = registrosAAnular
        .map(r => ({
          ...r,
          parsedCant: parseFloat(String(r.cantidadAAnular).replace(',', '.')) || 0
        }))
        .filter(r => r.selected && r.parsedCant > 0)
        .map(r => ({
          codubicacion: r.codubicacion,
          fechacaducidad: r.fechacaducidad,
          numerolote: r.numerolote,
          cantidad: r.parsedCant
        }));

      // Si no hay ninguno seleccionado o todas las cantidades son 0, no hacer nada
      if (registros.length === 0) {
        setLoadingDescarga(false);
        return;
      }

      await descargarLinea({
        cod_documento: cabecera.cod_documento,
        num_linea:     lineaParaDescargar.numlinea,
        cod_articulo:  lineaParaDescargar.codarticulo,
        registros:     registros
      });
      setLineaParaDescargar(null);
      setRecorridoDescarga([]);
      setRegistrosAAnular([]);
      // Recargar el listado completo de líneas
      const lineas = await getLineasPendientes(cabecera.cod_documento);
      setLineasPendientes(lineas);
    } catch (e) {
      setError(`Error al anular la preparación: ${e}`);
    } finally {
      setLoadingDescarga(false);
    }
  }, [lineaParaDescargar, cabecera, registrosAAnular]);

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
      avanzarDesdeUbicacion(ubi, linea, permisos);
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
          setFaseAnterior(FASE.CABECERA);
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
      if (!lineaPendiente.codubicacion) {
        setError('Esta línea no tiene ubicación de origen asignada. Usa la navegación guiada.');
        return;
      }
      await aplicarLinea(lineaPendiente);
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
      avanzarDesdeUbicacion(ubi, lineaActual, permisos);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setTimeout(() => { if (inputRef && inputRef.current) inputRef.current.focus(); }, 100);
    }
  };

  const avanzarDesdeUbicacion = (ubi, linea, currentPermisos = permisos) => {
    if (currentPermisos.solicitar_articulo === -1) {
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
    let cant = parseFloat(String(cantidad).replace(',', '.'));

    const cantidadFaltante = lineaActual.cantsolicitada - (lineaActual.cantpreparada || 0);

    if (permisos.solicitar_cantidad !== -1) {
      cant = cantidadFaltante > 0 ? cantidadFaltante : 0;
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

    const totalPreparadoFinal = (lineaActual.cantpreparada || 0) + cant;
    if (totalPreparadoFinal > lineaActual.cantsolicitada) {
      if (permisos.puede_servir_mas === -1) {
        setCantidadPendiente(cant);
        setFase(FASE.CONFIRMAR_EXCESO);
        return;
      } else {
        setError(`No puedes preparar más de lo solicitado. Solicitado: ${lineaActual.cantsolicitada}, Ya preparado: ${lineaActual.cantpreparada || 0}, Intentando añadir: ${cant}.`);
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

  return {
    fase, setFase,
    faseAnterior, setFaseAnterior,
    showPosicionModal, setShowPosicionModal,
    posicionesDisponibles, setPosicionesDisponibles,
    ubicacionPendienteModal, setUbicacionPendienteModal,
    cabecera, setCabecera,
    lineaActual, setLineaActual,
    lineasPendientes, setLineasPendientes,
    permisos, setPermisos,
    error, setError,
    loading, setLoading,
    showExitModal, setShowExitModal,
    inputVal, setInputVal,
    cantidad, setCantidad,
    ubicacionConfirmada, setUbicacionConfirmada,
    lotesDisponibles, setLotesDisponibles,
    loteSeleccionado, setLoteSeleccionado,
    cantidadPendiente, setCantidadPendiente,
    factorEanSeleccionado, setFactorEanSeleccionado,
    unidadesYaPreparadas, setUnidadesYaPreparadas,
    tipoCodigoIntroducido, setTipoCodigoIntroducido,
    codFacturacion, setCodFacturacion,
    lineaParaUtilidades, setLineaParaUtilidades,
    showUtilidadesModal, setShowUtilidadesModal,
    lineaParaDescargar, setLineaParaDescargar,
    recorridoDescarga, setRecorridoDescarga,
    loadingDescarga, setLoadingDescarga,
    registrosAAnular, setRegistrosAAnular,
    handleLongPressLinea,
    handleAbrirDescarga,
    handleConfirmarDescarga,
    getStepNumber,
    inicializar,
    comenzarPreparacion,
    seleccionarLinea,
    navegarLinea,
    handleConfirmarUbicacion,
    handleConfirmarArticulo,
    handleSeleccionarLote,
    handleConfirmarCantidad,
    ejecutarCarga,
    handleSumaSustitucion
  };
};
