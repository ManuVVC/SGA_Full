import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Box, AlertTriangle, CheckCircle, MapPin, Search, Info, Settings, Save } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';
import ActionMenu from '../components/ActionMenu';
import { useKeyboard } from '../contexts/KeyboardContext';
import { useLongPress } from '../hooks/useLongPress';
import { validarUbicacion } from '../api/reubicacionesService';
import apiService from '../api/apiService';

export default function InfoUbicacion() {
  const navigate = useNavigate();
  const locationState = useLocation();
  const initialUbicacion = locationState.state?.codUbicacion ? String(locationState.state.codUbicacion) : '';
  const { isKeyboardOpen } = useKeyboard();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Inputs y Refs
  const [ubicacionInput, setUbicacionInput] = useState(initialUbicacion);
  const ubicacionRef = useRef(null);

  // Datos
  const [ubicacionData, setUbicacionData] = useState(null);
  const [stockList, setStockList] = useState([]);

  // Modal para múltiples posiciones
  const [showPosicionModal, setShowPosicionModal] = useState(false);
  const [posicionesDisponibles, setPosicionesDisponibles] = useState([]);

  // Configuración
  const [configData, setConfigData] = useState({ bloqueoEntrada: 0, bloqueoSalida: 0, ubicarDocs: 0 });

  // Long press y Menú de acciones
  const [selectedArticleForMenu, setSelectedArticleForMenu] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
    if (step === 1 && ubicacionRef.current) {
      ubicacionRef.current.focus();
    }
  }, [step]);

  // Si nos pasan una ubicación por state (ej. desde Info Artículo), autovalidamos
  useEffect(() => {
    if (initialUbicacion && step === 1 && !loading) {
      handleValidar(null, initialUbicacion);
    }
  }, [initialUbicacion]);

  const handleBack = () => {
    if (step === 1) {
      navigate('/utilidades');
    } else if (step === 2 || step === 3) {
      setStep(1);
      setUbicacionInput('');
      setUbicacionData(null);
      setStockList([]);
      setError(null);
      setSuccess(null);
    } else if (step === 4) {
      setStep(2);
      setError(null);
      setSuccess(null);
    }
  };

  const handleValidar = async (e, ubiDirecta = null) => {
    if (e) e.preventDefault();
    const targetUbi = ubiDirecta || ubicacionInput;
    if (!targetUbi.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await validarUbicacion(targetUbi);
      if (res.status === 'success') {
        setUbicacionData(res.ubicacion);
        setStep(2);
      } else if (res.status === 'necesita_posicion') {
        setPosicionesDisponibles(res.opciones);
        setShowPosicionModal(true);
      } else {
        setError(res.message || 'Ubicación no encontrada.');
        setUbicacionInput('');
        if (ubicacionRef.current) ubicacionRef.current.focus();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al validar la ubicación.');
      setUbicacionInput('');
      if (ubicacionRef.current) ubicacionRef.current.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPosicion = async (posicion) => {
    setShowPosicionModal(false);
    setLoading(true);
    setError(null);
    try {
      const res = await validarUbicacion(ubicacionInput, posicion);
      if (res.status === 'success') {
        setUbicacionData(res.ubicacion);
        setStep(2);
      } else {
        setError(res.message || 'Error al confirmar la posición.');
      }
    } catch (err) {
      setError('Error validando la posición.');
    } finally {
      setLoading(false);
    }
  };

  const verContenido = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get(`/stock/ubicacion/${ubicacionData.CODUBICACION}`);
      if (response.data.status === 'success') {
        setStockList(response.data.data.articulos || []);
        setStep(3);
      } else {
        setError(response.data.message || 'Error al obtener el contenido.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error de conexión al obtener el stock.');
    } finally {
      setLoading(false);
    }
  };

  const irAConfigurar = () => {
    setConfigData({
      bloqueoEntrada: ubicacionData.BLOQUEOENTRADA || 0,
      bloqueoSalida: ubicacionData.BLOQUEOSALIDA || 0,
      ubicarDocs: ubicacionData.PRM_UBICARDOCS || 0
    });
    setStep(4);
  };

  const guardarConfiguracion = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        bloqueo_entrada: configData.bloqueoEntrada,
        bloqueo_salida: configData.bloqueoSalida,
        ubicar_docs: configData.ubicarDocs
      };
      await apiService.put(`/stock/ubicacion/${ubicacionData.CODUBICACION}/configuracion`, payload);
      // Actualizamos el estado local
      setUbicacionData({
        ...ubicacionData,
        BLOQUEOENTRADA: configData.bloqueoEntrada,
        BLOQUEOSALIDA: configData.bloqueoSalida,
        PRM_UBICARDOCS: configData.ubicarDocs
      });
      setSuccess("Configuración actualizada correctamente.");
      setTimeout(() => setSuccess(null), 3000);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar configuración.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToInfoArticulo = async () => {
    if (!selectedArticleForMenu) return;
    setLoading(true);
    try {
      const response = await apiService.get('/stock/search', {
        params: { type: 'codarticuloaplicacion', q: selectedArticleForMenu.cod_interno }
      });
      if (response.status === 200) {
        navigate('/stock/results', { state: { stockData: response.data } });
      }
    } catch (err) {
      setError('Error al consultar info del artículo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <TerminalHeader title="INFO UBICACIÓN" />

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

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded shadow-sm font-bold flex items-center gap-2">
            <CheckCircle className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* STEP 1: LEER UBICACIÓN */}
        {step === 1 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2 flex items-center gap-2">
              <Search className="text-sga-primary" />
              Escanear Ubicación
            </h2>
            <form onSubmit={handleValidar} className="flex flex-col gap-3">
              <input
                ref={ubicacionRef}
                type="text"
                value={ubicacionInput}
                onChange={(e) => setUbicacionInput(e.target.value)}
                placeholder="Escanear ubicación..."
                className="w-full p-4 border-2 border-sga-primary rounded text-center text-xl font-bold shadow-inner bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all"
                autoFocus
              />
              <button
                type="submit"
                disabled={!ubicacionInput.trim() || loading}
                className="w-full bg-sga-primary text-white py-3 rounded font-bold shadow disabled:opacity-50"
              >
                {loading ? 'Validando...' : 'BUSCAR'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: VER UBICACIÓN Y BOTÓN VER CONTENIDO */}
        {step === 2 && ubicacionData && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center">
            <MapPin className="w-16 h-16 text-sga-primary mb-2" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{ubicacionData.UBICACION}</h2>

            <div className="w-full flex gap-2 mb-6">
              <div className={`flex-1 p-2 rounded text-center text-xs font-bold ${ubicacionData.BLOQUEOENTRADA === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                BLOQ. ENT<br/>{ubicacionData.BLOQUEOENTRADA === 0 ? 'NO' : 'SÍ'}
              </div>
              <div className={`flex-1 p-2 rounded text-center text-xs font-bold ${ubicacionData.BLOQUEOSALIDA === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                BLOQ. SAL<br/>{ubicacionData.BLOQUEOSALIDA === 0 ? 'NO' : 'SÍ'}
              </div>
              <div className={`flex-1 p-2 rounded text-center text-xs font-bold ${ubicacionData.PRM_UBICARDOCS === 0 ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                UB. DOCS<br/>{ubicacionData.PRM_UBICARDOCS === 0 ? 'NO' : 'SÍ'}
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={verContenido}
                disabled={loading}
                className="w-full py-4 bg-sga-primary text-white rounded font-bold text-lg shadow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  'CARGANDO...'
                ) : (
                  <>
                    <Box className="w-6 h-6" />
                    VER CONTENIDO
                  </>
                )}
              </button>
              
              <button
                onClick={irAConfigurar}
                disabled={loading}
                className="w-full py-3 bg-gray-600 text-white rounded font-bold text-lg shadow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Settings className="w-6 h-6" />
                CONFIGURAR
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MOSTRAR LISTA DE STOCK */}
        {step === 3 && (
          <div>
            <div className="bg-blue-900 text-white p-3 rounded-t-lg shadow flex justify-between items-center">
              <span className="font-bold text-lg">UBIC: {ubicacionData.UBICACION}</span>
              <span className="bg-white text-blue-900 px-2 py-1 rounded text-sm font-bold">
                {stockList.length} Refs
              </span>
            </div>
            
            <div className="bg-white shadow rounded-b-lg border border-t-0 border-gray-200 overflow-hidden">
              {stockList.length === 0 ? (
                <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                  <Info className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="font-bold">Ubicación vacía</p>
                  <p className="text-sm">No hay artículos almacenados aquí.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stockList.map((item, idx) => (
                    <StockRow 
                      key={idx} 
                      item={item} 
                      onLongPress={(item) => {
                        setSelectedArticleForMenu(item);
                        setShowActionMenu(true);
                      }} 
                    />
                  ))}
                </div>

              )}
            </div>
          </div>
        )}
        {/* STEP 4: CONFIGURAR */}
        {step === 4 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
              <Settings className="text-gray-600" />
              Configurar Ubicación
            </h2>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                <span className="font-bold text-gray-700">Bloqueo Entrada</span>
                <button
                  onClick={() => setConfigData({...configData, bloqueoEntrada: configData.bloqueoEntrada === 0 ? -1 : 0})}
                  className={`px-6 py-2 rounded font-bold text-white shadow ${configData.bloqueoEntrada === 0 ? 'bg-green-500' : 'bg-red-500'}`}
                >
                  {configData.bloqueoEntrada === 0 ? 'NO' : 'SÍ'}
                </button>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                <span className="font-bold text-gray-700">Bloqueo Salida</span>
                <button
                  onClick={() => setConfigData({...configData, bloqueoSalida: configData.bloqueoSalida === 0 ? -1 : 0})}
                  className={`px-6 py-2 rounded font-bold text-white shadow ${configData.bloqueoSalida === 0 ? 'bg-green-500' : 'bg-red-500'}`}
                >
                  {configData.bloqueoSalida === 0 ? 'NO' : 'SÍ'}
                </button>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                <span className="font-bold text-gray-700">Ubicar Docs</span>
                <button
                  onClick={() => setConfigData({...configData, ubicarDocs: configData.ubicarDocs === 0 ? -1 : 0})}
                  className={`px-6 py-2 rounded font-bold text-white shadow ${configData.ubicarDocs === 0 ? 'bg-gray-400' : 'bg-blue-500'}`}
                >
                  {configData.ubicarDocs === 0 ? 'NO' : 'SÍ'}
                </button>
              </div>
            </div>

            <button
              onClick={guardarConfiguracion}
              disabled={loading}
              className="w-full py-4 bg-green-600 text-white rounded font-bold text-lg shadow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-6 h-6" />
              {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        )}
      </div>

      {/* Action Menu */}
      <ActionMenu 
        title={selectedArticleForMenu?.nombre}
        subtitle={`Cód: ${selectedArticleForMenu?.cod_interno}`}
        isOpen={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        onInfo={navigateToInfoArticulo}
        onAjustes={() => navigate('/stock/ajustes')}
        infoLabel="Info Artículo"
      />

      {/* Modal Múltiples Posiciones */}
      {showPosicionModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-sga-primary text-white p-4 font-bold text-lg flex items-center gap-2">
              <MapPin />
              Selecciona Posición
            </div>
            <div className="p-4 overflow-y-auto flex flex-col gap-2">
              <p className="text-sm text-gray-600 mb-2 text-center">
                Múltiples posiciones para esta etiqueta.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {posicionesDisponibles.map((posObj, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPosicion(posObj.POSICION)}
                    className="w-full py-4 px-4 bg-gray-50 border-2 border-gray-300 rounded text-center font-bold text-xl text-sga-dark hover:bg-sga-primary hover:text-white hover:border-sga-primary transition-colors"
                  >
                    Pos {posObj.POSICION}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowPosicionModal(false)}
                className="w-full py-3 bg-gray-400 text-white rounded font-bold shadow"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StockRow({ item, onLongPress }) {
  const longPressProps = useLongPress(() => onLongPress(item), null, { delay: 600 });
  
  return (
    <div 
      className="p-4 hover:bg-blue-50 transition-colors select-none"
      {...longPressProps}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-bold text-brand-dark leading-tight">{item.nombre}</p>
          <p className="text-xs text-gray-500 mt-0.5">Cód: {item.cod_interno}</p>
        </div>
        <div className="bg-brand-olive text-white px-2.5 py-1 rounded shadow-sm text-right min-w-[50px]">
          <p className="font-bold text-lg leading-none">{item.stock}</p>
          <p className="text-[10px] opacity-90 mt-0.5">Uds</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold mt-3">
        {item.lote && (
          <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-gray-700 border border-gray-200">
            <span className="text-gray-400">Lote:</span>
            <span className="text-brand-dark max-w-[150px] truncate" title={item.lote}>{item.lote}</span>
          </div>
        )}
        {item.fecha_caducidad && (
          <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-gray-700 border border-gray-200">
            <span className="text-gray-400">Caducidad:</span>
            <span className="text-brand-dark">{item.fecha_caducidad}</span>
          </div>
        )}
      </div>
    </div>
  );
}
