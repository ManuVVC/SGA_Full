import { useState, useCallback, useRef, useEffect } from 'react';
import {
  obtenerDocumento, getCabeceraPedido, getPrimeraLinea,
  siguienteLinea, cargarMercancia, getLineasPendientes,
  getNumLineasPendientes, getUnidsPreparadas,
  getPermisosPreparacion, validarUbicacion, getStockLotes,
  getRecorridoLinea, descargarLinea
} from '../api/preparacionService';
import {
  playScanSuccess,
  playLineCompleted,
  playWarningFeedback,
  playErrorFeedback
} from '../utils/feedbackUtils';

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
  const [isStepModalOpen, setIsStepModalOpen] = useState(true);
  const [mismaUbicacionMantenida, setMismaUbicacionMantenida] = useState(false);

  const [showPosicionModal, setShowPosicionModal] = useState(false);
  const [posicionesDisponibles, setPosicionesDisponibles] = useState([]);
  const [ubicacionPendienteModal, setUbicacionPendienteModal] = useState('');
  const [cabecera, setCabecera] = useState(null);
  const [lineaActual, setLineaActual] = useState(null);
  const [lineasPendientes, setLineasPendientes] = useState([]);
  const [permisos, setPermisos] = useState({
    solicitar_ubicacion: 0,
    solicitar_articulo: 0,
    solicitar_cantidad: -1,
    puede_servir_mas: 0
  });
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
  const [registrosAAnular, setRegistrosAAnular] = useState([]);

  // Abrir automáticamente el modal de paso cada vez que cambia a una fase operativa
  useEffect(() => {
    if (
      fase === FASE.CONFIRMAR_UBICACION ||
      fase === FASE.CONFIRMAR_ARTICULO ||
      fase === FASE.SELECCIONAR_LOTE ||
      fase === FASE.INTRODUCIR_CANTIDAD ||
      fase === FASE.CONFIRMAR_EXCESO ||
      fase === FASE.CONFIRMAR_SUMA_SUSTITUCION
    ) {
      setIsStepModalOpen(true);
    }
  }, [fase, lineaActual]);

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
      case FASE.CONFIRMAR_SUMA_SUSTITUCION: return 5;
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

  const aplicarLinea = async (linea, opciones = {}) => {
    const { ubicacionPrevia = null } = opciones;

    setLineaActual(linea);
    setInputVal('');
    setCantidad('');
    setShowPosicionModal(false);
    setPosicionesDisponibles([]);
    setLotesDisponibles([]);
    setLoteSeleccionado(null);
    setCantidadPendiente(null);
    setFactorEanSeleccionado(1);
    setTipoCodigoIntroducido(0);
    setCodFacturacion(linea.codarticuloaplicacion || null);
    setIsStepModalOpen(true);

    // Actualizamos las líneas pendientes en segundo plano (sin bloquear el inicio del escaneo)
    if (cabecera?.cod_documento) {
      cargarLineasPendientes(cabecera.cod_documento);
    }

    // Comprobar si venimos de confirmar una línea en exactamente la misma ubicación física
    const esMismoHueco =
      ubicacionPrevia &&
      ubicacionPrevia.codubicacion &&
      linea.codubicacion &&
      String(ubicacionPrevia.codubicacion) === String(linea.codubicacion);

    if (esMismoHueco) {
      setUbicacionConfirmada(ubicacionPrevia);
      setMismaUbicacionMantenida(true);
      avanzarDesdeUbicacion(ubicacionPrevia, linea, permisos);
      return;
    }

    setMismaUbicacionMantenida(false);
    setUbicacionConfirmada(null);

    if (permisos.solicitar_ubicacion === -1) {
      setFase(FASE.CONFIRMAR_UBICACION);
    } else {
      const ubi = {
        codubicacion: linea.codubicacion,
        codhueco: linea.codhueco,
        descripcion: linea.nombreubicacion || linea.descripcion || linea.codhueco
      };
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

  const navegarLinea = useCallback(async (tipoAvance, opciones = {}) => {
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
      await aplicarLinea(linea, opciones);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [lineaActual, cabecera, permisos]);

  const handleConfirmarUbicacion = async (posicionOverride = null) => {
    const escaneado = posicionOverride ? ubicacionPendienteModal : inputVal.trim();
    if (!escaneado) {
      playErrorFeedback();
      setError('Introduce o escanea la ubicación');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await validarUbicacion(escaneado, lineaActual?.codubicacion, posicionOverride);

      if (result.status === 'necesita_posicion') {
        playWarningFeedback();
        setPosicionesDisponibles(result.opciones);
        setUbicacionPendienteModal(escaneado);
        setShowPosicionModal(true);
        setLoading(false);
        return;
      }

      if (!result.valida) {
        playErrorFeedback();
        setError(result.message || `La ubicación ${escaneado} no es válida o no coincide con la solicitada.`);
        if (!posicionOverride) setInputVal('');
        setShowPosicionModal(false);
        setLoading(false);
        return;
      }

      playScanSuccess();
      setShowPosicionModal(false);
      const ubi = {
        codubicacion: result.codubicacion,
        codhueco: result.codhueco,
        descripcion: result.descripcion
      };
      setUbicacionConfirmada(ubi);
      setInputVal('');
      avanzarDesdeUbicacion(ubi, lineaActual, permisos);
    } catch (err) {
      playErrorFeedback();
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
      playErrorFeedback();
      setError(`Artículo incorrecto (${article.CODARTICULOAPLICACION || selCodArticulo}). Se esperaba ${lineaActual.codarticuloaplicacion}.`);
      return;
    }

    playScanSuccess();
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
    verificarStockYLotes(ubicacionConfirmada.codubicacion, lineaActual, article.gs1Data || null);
  };

  const verificarStockYLotes = async (cod_ubicacion, linea, gs1Data = null) => {
    setLoading(true);
    setError(null);
    try {
      const lotes = await getStockLotes(cod_ubicacion, linea.codarticulo);
      if (!lotes || lotes.length === 0) {
        playErrorFeedback();
        setError('El artículo no tiene stock disponible en esta ubicación.');
        setFase(FASE.CONFIRMAR_UBICACION);
        return;
      }

      setLotesDisponibles(lotes);

      // Si el código GS1-128 incluye cantidad válida, pre-rellenarla
      if (gs1Data?.cantidad && parseFloat(gs1Data.cantidad) > 0) {
        setCantidad(String(gs1Data.cantidad));
      }

      if (linea.prm_trazabilidad || linea.gestionar_caducidad) {
        if (lotes.length === 1) {
          setLoteSeleccionado(lotes[0]);
          setFase(FASE.INTRODUCIR_CANTIDAD);
        } else if (gs1Data?.lote) {
          // Buscar si el lote extraído del GS1-128 coincide con alguno disponible en la ubicación
          const gs1LoteNorm = String(gs1Data.lote).trim().toUpperCase();
          const loteCoincidente = lotes.find(
            l => String(l.numerolote || l.codnumerolote || '').trim().toUpperCase() === gs1LoteNorm
          );
          if (loteCoincidente) {
            setLoteSeleccionado(loteCoincidente);
            setFase(FASE.INTRODUCIR_CANTIDAD);
          } else {
            setFase(FASE.SELECCIONAR_LOTE);
          }
        } else {
          setFase(FASE.SELECCIONAR_LOTE);
        }
      } else {
        setFase(FASE.INTRODUCIR_CANTIDAD);
      }
    } catch (err) {
      playErrorFeedback();
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarLote = (lote) => {
    playScanSuccess();
    setError(null);
    setLoteSeleccionado(lote);
    setFase(FASE.INTRODUCIR_CANTIDAD);
  };

  // Cálculos reactivos de stock y cantidad sugerida para el modal de cantidad
  const stockDisponibleActual = loteSeleccionado
    ? (parseFloat(loteSeleccionado.stock) || 0)
    : lotesDisponibles.reduce((sum, l) => sum + (parseFloat(l.stock) || 0), 0);

  const cantidadPendienteLinea = lineaActual
    ? Math.max(0, (parseFloat(lineaActual.cantsolicitada) || 0) - (parseFloat(lineaActual.cantpreparada) || 0))
    : 0;

  const maxUnidadesPreparables = stockDisponibleActual > 0
    ? Math.min(cantidadPendienteLinea, stockDisponibleActual)
    : cantidadPendienteLinea;

  const cantidadSugeridaInput = factorEanSeleccionado > 1
    ? (maxUnidadesPreparables >= factorEanSeleccionado
        ? Math.floor((maxUnidadesPreparables / factorEanSeleccionado) * 1000) / 1000
        : 0)
    : maxUnidadesPreparables;

  const handleConfirmarCantidad = (cantidadOverride = null) => {
    // Si se invoca desde un evento de formulario o click sin valor numérico explícito, ignorar el objeto SyntheticEvent
    const valorBruto =
      cantidadOverride !== null && typeof cantidadOverride !== 'object'
        ? cantidadOverride
        : cantidad;

    let cant = parseFloat(String(valorBruto).replace(',', '.'));

    const cantidadFaltante = lineaActual.cantsolicitada - (lineaActual.cantpreparada || 0);

    if (permisos.solicitar_cantidad !== -1) {
      cant = cantidadFaltante > 0 ? cantidadFaltante : 0;
    } else {
      if (isNaN(cant) || cant <= 0) {
        playErrorFeedback();
        setError('Introduce una cantidad válida mayor que 0');
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
      playErrorFeedback();
      setError(`La cantidad (${cant}) supera el stock disponible en la ubicación/lote (${stockMax}).`);
      return;
    }

    const totalPreparadoFinal = (lineaActual.cantpreparada || 0) + cant;
    if (totalPreparadoFinal > lineaActual.cantsolicitada) {
      if (permisos.puede_servir_mas === -1) {
        playWarningFeedback();
        setCantidadPendiente(cant);
        setFase(FASE.CONFIRMAR_EXCESO);
        return;
      } else {
        playErrorFeedback();
        setError(`No puedes preparar más de lo solicitado. Solicitado: ${lineaActual.cantsolicitada}, Ya preparado: ${lineaActual.cantpreparada || 0}, Intentando añadir: ${cant}.`);
        return;
      }
    }

    ejecutarCarga(cant);
  };

  const isSubmitting = useRef(false);

  const ejecutarCarga = async (cantToLoad) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    setError(null);
    try {
      const stockItem = loteSeleccionado || (lotesDisponibles.length > 0 ? lotesDisponibles[0] : null);

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
        playWarningFeedback();
        setUnidadesYaPreparadas(yaPreparadas);
        setCantidadPendiente(cantToLoad);
        setFase(FASE.CONFIRMAR_SUMA_SUSTITUCION);
        return;
      }

      await _realizarCarga(cantToLoad, stockItem);
    } catch (err) {
      playErrorFeedback();
      setError(String(err));
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  const _realizarCarga = async (cantToLoad, stockItem) => {
    stockItem = stockItem || loteSeleccionado || (lotesDisponibles.length > 0 ? lotesDisponibles[0] : null);
    const ubicacionActualConfirmada = ubicacionConfirmada;

    await cargarMercancia({
      cod_documento:           cabecera.cod_documento,
      cod_ubicacion:           ubicacionConfirmada.codubicacion,
      cod_articulo:            lineaActual.codarticulo,
      num_linea:               lineaActual.numlinea,
      unidades:                cantToLoad,
      fecha_caducidad:         loteSeleccionado?.fechacaducidad || null,
      numero_lote:             loteSeleccionado?.numerolote || loteSeleccionado?.codnumerolote || null,
      cod_tipo_dato_maestro:   stockItem?.codtipodatomaestro || lineaActual.codtipodatomaestro || null,
      cod_dato_maestro:        stockItem?.coddatomaestro || lineaActual.coddatomaestro || null,
      tipo_codigo_introducido: tipoCodigoIntroducido,
      cod_facturacion:         codFacturacion,
    });

    playLineCompleted();
    await navegarLinea(0, { ubicacionPrevia: ubicacionActualConfirmada });
  };

  const handleSumaSustitucion = async (accion) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    setError(null);
    try {
      const cantNueva = cantidadPendiente;
      const cantFinal = accion === 'sustituir'
        ? cantNueva - unidadesYaPreparadas
        : cantNueva;

      setFase(FASE.INTRODUCIR_CANTIDAD);
      await _realizarCarga(cantFinal, null);
    } catch (err) {
      playErrorFeedback();
      setError(String(err));
      setFase(FASE.CONFIRMAR_SUMA_SUSTITUCION);
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  // Permite al operario tocar cualquier paso completado en la barra de chips para reabrir su modal
  const irAPaso = useCallback((targetFase) => {
    setError(null);
    if (targetFase === FASE.CONFIRMAR_UBICACION && permisos.solicitar_ubicacion === -1) {
      setShowPosicionModal(false);
      setFase(FASE.CONFIRMAR_UBICACION);
      setIsStepModalOpen(true);
    } else if (targetFase === FASE.CONFIRMAR_ARTICULO && ubicacionConfirmada) {
      setFase(FASE.CONFIRMAR_ARTICULO);
      setIsStepModalOpen(true);
    } else if (
      targetFase === FASE.SELECCIONAR_LOTE &&
      ubicacionConfirmada &&
      (lineaActual?.prm_trazabilidad || lineaActual?.gestionar_caducidad) &&
      lotesDisponibles.length > 0
    ) {
      setFase(FASE.SELECCIONAR_LOTE);
      setIsStepModalOpen(true);
    } else if (targetFase === FASE.INTRODUCIR_CANTIDAD && ubicacionConfirmada && lotesDisponibles.length > 0) {
      setFase(FASE.INTRODUCIR_CANTIDAD);
      setIsStepModalOpen(true);
    } else {
      setIsStepModalOpen(true);
    }
  }, [permisos, ubicacionConfirmada, lineaActual, lotesDisponibles]);

  return {
    fase, setFase,
    faseAnterior, setFaseAnterior,
    isStepModalOpen, setIsStepModalOpen,
    mismaUbicacionMantenida, setMismaUbicacionMantenida,
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
    stockDisponibleActual,
    cantidadPendienteLinea,
    cantidadSugeridaInput,
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
    handleSumaSustitucion,
    irAPaso
  };
};
