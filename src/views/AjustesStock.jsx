import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Box, AlertTriangle, CheckCircle, MapPin, Search, Calendar, Tag, FileText, Check, Settings2, Plus, ArrowRight } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';
import { useKeyboard } from '../contexts/KeyboardContext';
import { usePermissions } from '../hooks/usePermissions';
import apiService from '../api/apiService';
import { validarUbicacion, validarArticulo } from '../api/reubicacionesService';

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

export default function AjustesStock() {
  const navigate = useNavigate();
  const locationState = useLocation();
  const { isKeyboardOpen } = useKeyboard();
  const { hasPermission } = usePermissions();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Data states
  const [ubicacionData, setUbicacionData] = useState(null);
  const [articuloData, setArticuloData] = useState(null);
  const [factorConversion, setFactorConversion] = useState(1);
  const [lotesExisten, setLotesExisten] = useState([]);
  const [isStockNuevo, setIsStockNuevo] = useState(false);
  
  const [selectedLote, setSelectedLote] = useState('');
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isManualLote, setIsManualLote] = useState(false);

  const [conceptos, setConceptos] = useState([]);
  const [selectedConcepto, setSelectedConcepto] = useState(null);
  
  const [cantidadInput, setCantidadInput] = useState('');

  // Inputs
  const [ubicacionInput, setUbicacionInput] = useState(locationState.state?.codUbicacion ? String(locationState.state.codUbicacion) : '');
  const [articuloInput, setArticuloInput] = useState(locationState.state?.codArticulo || '');

  // Refs
  const ubicacionRef = useRef(null);
  const articuloRef = useRef(null);
  const cantidadRef = useRef(null);
  const loteRef = useRef(null);

  // Carga inicial
  useEffect(() => {
    // Si venimos con permisos, cargar conceptos
    const loadConceptos = async () => {
      try {
        const res = await apiService.get('/stock/ajustes/conceptos');
        if (res.status === 200) {
          setConceptos(res.data.conceptos || []);
        }
      } catch (e) {
        console.error("Error loading conceptos");
      }
    };
    loadConceptos();

    // Autofill initial data
    if (ubicacionInput) {
      handleValidarUbicacion(ubicacionInput);
    }
  }, []);

  const handleValidarUbicacion = async (val = ubicacionInput) => {
    if (!val.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await validarUbicacion(val.trim());
      if (res.status === 'success') {
        setUbicacionData(res.ubicacion);
        setUbicacionInput(res.ubicacion.UBICACION);
        setStep(2);
        
        // Si teníamos artículo pre-cargado, validarlo automáticamente
        if (articuloInput) {
          setTimeout(() => handleValidarArticulo(articuloInput), 300);
        } else {
          setTimeout(() => articuloRef.current?.focus(), 100);
        }
      } else {
        setError(res.message || 'Error validando ubicación');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleValidarArticulo = async (val = articuloInput) => {
    if (!val.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await validarArticulo(val.trim(), 'auto');
      if (res.status === 'success' && res.articulo) {
        setArticuloData(res.articulo);
        setFactorConversion(res.conversion || 1);
        
        // Ahora cargar lotes
        await loadLotes(ubicacionData.CODUBICACION, res.articulo.CODARTICULO, res.articulo);
      } else {
        setError(res.message || 'Artículo no encontrado');
      }
    } catch (e) {
      setError('Error al validar artículo');
    } finally {
      setLoading(false);
    }
  };

  const loadLotes = async (codUbicacion, codArticulo, articuloFull) => {
    try {
      const res = await apiService.get('/stock/ajustes/lotes', {
        params: { cod_ubicacion: codUbicacion, cod_articulo: codArticulo }
      });
      if (res.status === 200) {
        const lotesBack = res.data.lotes || [];
        setLotesExisten(lotesBack);
        
        // Determinar si gestiona lote o fecha
        const gestionaLote = articuloFull?.PRM_TRAZABILIDAD !== 0 || articuloFull?.GESTIONARCADUCIDAD !== 0;

        if (!gestionaLote) {
           setIsStockNuevo(lotesBack.length === 0);
           setSelectedLote('');
           setSelectedFecha('');
           setIsManualLote(false);
           setStep(4);
        } else {
           setStep(3);
        }
      }
    } catch (e) {
      setError('Error cargando lotes existentes');
    }
  };

  const selectLote = (lote, fecha) => {
    setSelectedLote(lote || '');
    setSelectedFecha(fecha || '');
    setIsManualLote(false);
    
    const existe = lotesExisten.some(l => (l.NUMEROLOTE || '') === (lote || '') && (l.FECHACADUCIDAD_STR || '') === (fecha || ''));
    setIsStockNuevo(!existe);

    setStep(4);
  };

  const confirmarLoteManual = (e) => {
    e.preventDefault();
    setIsManualLote(false);
    
    const existe = lotesExisten.some(l => (l.NUMEROLOTE || '') === (selectedLote || '') && (l.FECHACADUCIDAD_STR || '') === (selectedFecha || ''));
    setIsStockNuevo(!existe);

    setStep(4);
  };

  const selectConcepto = (concepto) => {
    setSelectedConcepto(concepto);
    setTimeout(() => cantidadRef.current?.focus(), 100);
  };

  const ejecutarAjuste = async (e) => {
    e.preventDefault();
    if (!selectedConcepto || !cantidadInput) return;
    
    setLoading(true);
    setError('');
    try {
      const payload = {
        codUbicacion: ubicacionData.CODUBICACION,
        codArticulo: articuloData.CODARTICULO,
        codConcepto: selectedConcepto.CODCONCEPTO,
        cantidad: Math.abs(parseFloat(cantidadInput)) * factorConversion, // Siempre positivo, total neto
        lote: selectedLote || null,
        fechaCaducidad: selectedFecha || null,
        cantSegundaUnidad: 0
      };

      const res = await apiService.post('/stock/ajustes/ejecutar', payload);
      if (res.status === 200) {
        setSuccess(true);
      } else {
        setError(res.data?.error || 'Error al ajustar stock');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (success) {
      navigate(-1);
    } else if (step === 1) {
      navigate(-1);
    } else if (step === 2) {
      setStep(1);
      setArticuloInput('');
    } else if (step === 3) {
      setStep(2);
      setSelectedLote('');
      setSelectedFecha('');
    } else if (step === 4) {
      const gestionaLote = articuloData?.PRM_TRAZABILIDAD !== 0 || articuloData?.GESTIONARCADUCIDAD !== 0;
      if (!gestionaLote) {
        setStep(2);
      } else {
        setStep(3);
      }
      setSelectedConcepto(null);
      setCantidadInput('');
    }
  };

  if (!hasPermission('PRM_AJUSTESDESTOCK')) {
    return (
      <div className="flex flex-col h-full bg-gray-100">
        <TerminalHeader title="AJUSTES DE STOCK" />
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center gap-4">
          <AlertTriangle className="w-16 h-16 text-red-500" />
          <h2 className="text-xl font-bold text-gray-800">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para realizar ajustes de stock.</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-sga-primary text-white font-bold rounded">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <TerminalHeader title="AJUSTES DE STOCK" />

      <div className="flex-1 p-4 overflow-y-auto pb-32">
        <div className="flex items-center gap-2 mb-4">
           <button onClick={handleBack} className="p-2 bg-white shadow rounded border border-gray-300 text-sga-dark">
             <ArrowLeft className="w-6 h-6" />
           </button>
           <span className="font-bold text-sga-dark">Volver</span>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-sm font-bold flex items-center gap-2">
            <AlertTriangle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center justify-center gap-4 text-center animate-scale-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-800">Ajuste Realizado</h2>
            <p className="text-gray-600 font-medium">El stock ha sido regularizado correctamente.</p>
            <div className="w-full bg-gray-50 p-4 rounded text-left flex flex-col gap-2 mt-4 text-sm font-bold border">
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Ubicación:</span>
                <span className="text-gray-800">{ubicacionData?.UBICACION}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Artículo:</span>
                <span className="text-gray-800">{articuloData?.CODARTICULOAPLICACION}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Concepto:</span>
                <span className="text-gray-800">{selectedConcepto?.NOMBRE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Neto:</span>
                <span className="text-brand-blue text-lg">{Math.abs(parseFloat(cantidadInput)) * factorConversion} uds</span>
              </div>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setStep(1);
                setUbicacionData(null);
                setArticuloData(null);
                setUbicacionInput('');
                setArticuloInput('');
                setCantidadInput('');
                setSelectedConcepto(null);
                setTimeout(() => ubicacionRef.current?.focus(), 100);
              }}
              className="mt-4 w-full py-3 bg-sga-primary text-white rounded font-bold shadow-md hover:bg-blue-800 active:bg-blue-900"
            >
              NUEVO AJUSTE
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            
            {/* Cabecera Resumen de Selección Actual */}
            {(ubicacionData || articuloData) && (
              <div className="bg-white p-3 rounded shadow-sm border border-gray-200 flex flex-col gap-2">
                {ubicacionData && (
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-gray-50 p-2 rounded">
                    <MapPin className="w-4 h-4 text-brand-dark" />
                    UBIC: <span className="text-brand-blue">{ubicacionData.UBICACION}</span>
                  </div>
                )}
                {articuloData && (
                  <div className="flex flex-col text-sm font-bold text-gray-700 bg-gray-50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-brand-dark" />
                      ART: <span className="text-brand-blue">{articuloData.CODARTICULOAPLICACION}</span>
                    </div>
                    <span className="text-xs text-gray-500 truncate mt-1">{articuloData.NOMBREARTICULO}</span>
                    {factorConversion > 1 && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mt-1 self-start">
                        Factor Conv: x{factorConversion}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: UBICACION */}
            {step === 1 && (
              <div className="bg-white p-4 rounded shadow-sm border border-brand-light">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-sga-dark">
                  <MapPin className="w-5 h-5 text-sga-primary" />
                  Escanear Ubicación
                </h3>
                <form onSubmit={(e) => { e.preventDefault(); handleValidarUbicacion(); }} className="flex flex-col gap-3">
                  <input
                    ref={ubicacionRef}
                    type="text"
                    value={ubicacionInput}
                    onChange={(e) => setUbicacionInput(e.target.value.toUpperCase())}
                    placeholder="Escanear ubicación..."
                    className="w-full p-4 text-lg border-2 border-gray-300 rounded font-bold uppercase focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!ubicacionInput.trim() || loading}
                    className="w-full py-4 bg-sga-primary text-white rounded font-bold text-lg shadow disabled:opacity-50"
                  >
                    {loading ? 'VALIDANDO...' : 'SIGUIENTE'}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 2: ARTICULO */}
            {step === 2 && (
              <div className="bg-white p-4 rounded shadow-sm border border-brand-light animate-fade-in">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-sga-dark">
                  <Search className="w-5 h-5 text-sga-primary" />
                  Escanear Artículo
                </h3>
                <form onSubmit={(e) => { e.preventDefault(); handleValidarArticulo(); }} className="flex flex-col gap-3">
                  <input
                    ref={articuloRef}
                    type="text"
                    value={articuloInput}
                    onChange={(e) => setArticuloInput(e.target.value.toUpperCase())}
                    placeholder="EAN o Código..."
                    className="w-full p-4 text-lg border-2 border-gray-300 rounded font-bold uppercase focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!articuloInput.trim() || loading}
                    className="w-full py-4 bg-sga-primary text-white rounded font-bold text-lg shadow disabled:opacity-50"
                  >
                    {loading ? 'VALIDANDO...' : 'SIGUIENTE'}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 3: LOTE/FECHA */}
            {step === 3 && (
              <div className="bg-white p-4 rounded shadow-sm border border-brand-light animate-fade-in">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-sga-dark">
                  <Tag className="w-5 h-5 text-sga-primary" />
                  Seleccionar Lote / Fecha
                </h3>
                
                {isManualLote ? (
                  <form onSubmit={confirmarLoteManual} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Lote (Opcional)</label>
                      <input
                        ref={loteRef}
                        type="text"
                        value={selectedLote}
                        onChange={(e) => setSelectedLote(e.target.value.toUpperCase())}
                        placeholder="Nº Lote..."
                        className="w-full p-3 border-2 border-gray-300 rounded font-bold uppercase outline-none focus:border-sga-primary"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Fecha Caducidad (Opcional)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={selectedFecha}
                        onChange={(e) => setSelectedFecha(e.target.value)}
                        onBlur={() => setSelectedFecha(parseShorthandDate(selectedFecha))}
                        placeholder="DD, DDMM o DDMMYY"
                        className="w-full p-3 border-2 border-gray-300 rounded font-bold outline-none focus:border-sga-primary"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => setIsManualLote(false)} className="flex-1 py-3 bg-gray-200 text-gray-800 rounded font-bold">CANCELAR</button>
                      <button type="submit" className="flex-1 py-3 bg-sga-primary text-white rounded font-bold">CONFIRMAR</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-gray-600 mb-2">Lotes existentes en {ubicacionData?.UBICACION}:</p>
                    
                    {lotesExisten.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto flex flex-col gap-2">
                        {lotesExisten.map((l, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectLote(l.NUMEROLOTE, l.FECHACADUCIDAD_STR)}
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded text-left hover:bg-blue-50 hover:border-blue-300 transition-colors flex justify-between items-center"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-brand-dark">Lote: {l.NUMEROLOTE || 'N/A'}</span>
                              <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {l.FECHACADUCIDAD_STR ? l.FECHACADUCIDAD_STR : 'Sin caducidad'}
                              </span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded text-sm text-center font-bold">
                        No hay lotes previos en esta ubicación.
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        setIsManualLote(true);
                        setSelectedLote('');
                        setSelectedFecha('');
                        setTimeout(() => loteRef.current?.focus(), 100);
                      }}
                      className="w-full mt-2 p-3 bg-white border-2 border-dashed border-gray-300 rounded flex items-center justify-center gap-2 font-bold text-brand-blue hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      NUEVO LOTE / FECHA
                    </button>
                    
                    <button
                      onClick={() => selectLote('', '')}
                      className="w-full mt-1 p-3 bg-gray-100 text-gray-600 rounded font-bold hover:bg-gray-200 transition-colors"
                    >
                      CONTINUAR SIN LOTE
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: CONCEPTO Y CANTIDAD */}
            {step === 4 && (
              <div className="flex flex-col gap-4 animate-fade-in">
                
                {!selectedConcepto ? (
                  <div className="bg-white p-4 rounded shadow-sm border border-brand-light">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-sga-dark border-b pb-2">
                      <FileText className="w-5 h-5 text-sga-primary" />
                      Concepto de Ajuste
                    </h3>
                    <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto">
                      {(isStockNuevo ? conceptos.filter(c => c.PRM_DESCONTARSTOCK === 0) : conceptos).map(c => (
                        <button
                          key={c.CODCONCEPTO}
                          onClick={() => selectConcepto(c)}
                          className="w-full p-4 bg-gray-50 border border-gray-300 rounded text-left hover:bg-brand-olive/10 hover:border-brand-olive transition-colors font-bold text-brand-dark flex justify-between items-center"
                        >
                          {c.NOMBRE}
                          <ArrowRight className="w-5 h-5 text-brand-olive" />
                        </button>
                      ))}
                      {(isStockNuevo ? conceptos.filter(c => c.PRM_DESCONTARSTOCK === 0) : conceptos).length === 0 && (
                        <p className="text-gray-500 text-sm text-center italic py-4">No hay conceptos disponibles</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded shadow-sm border border-brand-olive">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="font-bold text-lg text-sga-dark">Concepto:</h3>
                      <button onClick={() => setSelectedConcepto(null)} className="text-sm font-bold text-brand-blue underline">
                        Cambiar
                      </button>
                    </div>
                    <div className="p-3 bg-brand-olive/10 border border-brand-olive text-brand-dark rounded font-bold text-center mb-4">
                      {selectedConcepto.NOMBRE}
                    </div>

                    <form onSubmit={ejecutarAjuste} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Cantidad a ajustar (Positivo)
                        </label>
                        <input
                          ref={cantidadRef}
                          type="number"
                          min="0.001"
                          step="any"
                          value={cantidadInput}
                          onChange={(e) => setCantidadInput(e.target.value)}
                          placeholder="Ej: 5"
                          className="w-full p-4 text-3xl text-center border-2 border-gray-300 rounded font-black text-brand-blue outline-none focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
                          autoFocus
                          required
                        />
                        {factorConversion > 1 && cantidadInput && (
                          <div className="text-center text-sm font-bold text-gray-500 mt-2 bg-gray-50 p-2 rounded border">
                            Total Neto: <span className="text-brand-dark text-lg">{Math.abs(parseFloat(cantidadInput)) * factorConversion} uds</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        type="submit"
                        disabled={loading || !cantidadInput}
                        className="w-full mt-2 py-4 bg-green-600 text-white rounded font-bold text-xl shadow-md flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? 'PROCESANDO...' : 'CONFIRMAR AJUSTE'}
                        {!loading && <Check className="w-6 h-6" />}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Margen para teclado en móvil */}
      {isKeyboardOpen && <div className="h-48"></div>}
    </div>
  );
}
