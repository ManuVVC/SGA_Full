import re

with open("G:/Proyectos/SGA/pda/src/views/PreparaPedido.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the state declarations and functions that were moved
# They start after `const inputRef = useRef(null);` and end before `return (`
start_marker = "const inputRef = useRef(null);"
end_marker = "return (\n    <div className=\"flex flex-col h-full bg-sga-light\">"

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker) + len(start_marker)
    end_idx = content.find(end_marker)

    # We also need to fix the imports
    # Remove the api imports
    content = re.sub(r"import \{\s+obtenerDocumento.*?descargarLinea\n\} from '\.\./api/preparacionService';\n", "", content, flags=re.DOTALL)
    
    # Add the hook import
    hook_import = "import { usePreparacionPedido, FASE } from '../hooks/usePreparacionPedido';\n"
    
    # Remove old FASE definition
    content = re.sub(r"const FASE = \{[\s\S]*?\};\n", "", content)

    # Reconstruct the file
    hook_usage = """
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

"""
    new_content = content[:start_idx] + hook_usage + content[end_idx:]
    
    # insert hook import after last import
    last_import_idx = new_content.rfind("import ")
    end_of_last_import = new_content.find("\n", last_import_idx) + 1
    new_content = new_content[:end_of_last_import] + hook_import + new_content[end_of_last_import:]

    # Now let's remove unused imports like useState, useCallback if they are unused, 
    # but they might still be used by LineaPendienteRow or PanelInfoCard.
    # We will leave React imports alone for safety.

    with open("G:/Proyectos/SGA/pda/src/views/PreparaPedido.jsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Done")
else:
    print("Markers not found")
