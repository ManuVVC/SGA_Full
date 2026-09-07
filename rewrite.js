const fs = require('fs');

let content = fs.readFileSync('G:/Proyectos/SGA/pda/src/views/PreparaPedido.jsx', 'utf-8');

// 1. Remove FASE
content = content.replace(/const FASE = \{[\s\S]*?\};\n/g, '');

// 2. Remove API imports
const importApiRegex = /import\s+\{[\s\S]*?descargarLinea\n\}\s+from\s+'\.\.\/api\/preparacionService';\n/g;
content = content.replace(importApiRegex, '');

const startStr = 'const inputRef = useRef(null);';
const endStr = '  return (';

const startIdx = content.indexOf(startStr) + startStr.length;
const endIdx = content.indexOf(endStr);

if (startIdx > -1 && endIdx > -1) {
    const hookUsage = `

  const {
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
  } = usePreparacionPedido(inputRef);

  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [fase]);

  useEffect(() => { inicializar(); }, []);

`;

    content = content.substring(0, startIdx) + hookUsage + content.substring(endIdx);

    const hookImport = "import { usePreparacionPedido, FASE } from '../hooks/usePreparacionPedido';\n";
    const lastImportIdx = content.lastIndexOf('import ');
    const endOfLastImport = content.indexOf('\n', lastImportIdx) + 1;
    content = content.substring(0, endOfLastImport) + hookImport + content.substring(endOfLastImport);

    fs.writeFileSync('G:/Proyectos/SGA/pda/src/views/PreparaPedido.jsx', content, 'utf-8');
    console.log('Rewrite successful');
} else {
    console.log('Markers not found');
}
