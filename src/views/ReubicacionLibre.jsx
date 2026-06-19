import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { validarUbicacion, validarArticulo, validarCantidad, grabarReubicacion } from '../api/reubicacionesService';
import TerminalHeader from '../components/TerminalHeader';
import SearchTypeToggle from '../components/SearchTypeToggle';

export default function ReubicacionLibre() {
  const navigate = useNavigate();
  
  // Maquina de estados: 1 = Origen, 2 = Articulo, 3 = Cantidad, 4 = Destino
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Inputs controlados
  const [origenInput, setOrigenInput] = useState('');
  const [articuloInput, setArticuloInput] = useState('');
  const [articuloSearchType, setArticuloSearchType] = useState('codfacturacion');
  const [cantidadInput, setCantidadInput] = useState('');
  const [destinoInput, setDestinoInput] = useState('');

  // Datos consolidados devueltos por la API
  const [origenData, setOrigenData] = useState(null);
  const [articuloData, setArticuloData] = useState(null);
  const [destinoData, setDestinoData] = useState(null);

  // Modal para multiplicidad de posición
  const [showPosicionModal, setShowPosicionModal] = useState(false);
  const [posicionesDisponibles, setPosicionesDisponibles] = useState([]);
  const [ubicacionEnProceso, setUbicacionEnProceso] = useState(null);

  // Referencias para focus automático
  const origenRef = useRef(null);
  const articuloRef = useRef(null);
  const cantidadRef = useRef(null);
  const destinoRef = useRef(null);

  // Focus effect
  useEffect(() => {
    if (step === 1 && origenRef.current) origenRef.current.focus();
    if (step === 2 && articuloRef.current) articuloRef.current.focus();
    if (step === 3 && cantidadRef.current) cantidadRef.current.focus();
    if (step === 4 && destinoRef.current) destinoRef.current.focus();
  }, [step]);

  const resetProcess = () => {
    setStep(1);
    setOrigenInput('');
    setArticuloInput('');
    setCantidadInput('');
    setDestinoInput('');
    setOrigenData(null);
    setArticuloData(null);
    setDestinoData(null);
    setError(null);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
      setSuccess(null);
    } else {
      navigate(-1);
    }
  };

  // ----- STEP 1: ORIGEN -----
  const handleOrigenKeyDown = async (e) => {
    if (e.key === 'Enter' && origenInput.trim() !== '') {
      setError(null);
      setLoading(true);
      try {
        const res = await validarUbicacion(origenInput);
        if (res.status === 'success') {
          setOrigenData(res.ubicacion);
          setStep(2);
        } else if (res.status === 'necesita_posicion') {
          setPosicionesDisponibles(res.opciones);
          setUbicacionEnProceso('origen');
          setShowPosicionModal(true);
        } else {
          setError(res.message || 'Ubicación no encontrada');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al validar la ubicación.');
      } finally {
        setLoading(false);
      }
    }
  };

  // ----- STEP 2: ARTICULO -----
  const handleArticuloKeyDown = async (e) => {
    if (e.key === 'Enter' && articuloInput.trim() !== '') {
      setError(null);
      setLoading(true);
      try {
        const res = await validarArticulo(articuloInput, articuloSearchType);
        if (res.status === 'success') {
          setArticuloData(res.articulo);
          setStep(3);
        } else {
          setError(res.message || 'Artículo no encontrado');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al validar el artículo.');
      } finally {
        setLoading(false);
      }
    }
  };

  // ----- STEP 3: CANTIDAD -----
  const handleCantidadKeyDown = async (e) => {
    if (e.key === 'Enter' && cantidadInput.trim() !== '') {
      setError(null);
      setLoading(true);
      try {
        const res = await validarCantidad(
          origenData.CODUBICACION, 
          articuloData.CODARTICULO, 
          parseFloat(cantidadInput), 
          articuloData.UNIDADES
        );
        if (res.status === 'success') {
          setStep(4);
        } else {
          setError(res.message || 'Cantidad no válida');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al validar la cantidad.');
      } finally {
        setLoading(false);
      }
    }
  };

  // ----- STEP 4: DESTINO y GRABAR -----
  const handleDestinoKeyDown = async (e) => {
    if (e.key === 'Enter' && destinoInput.trim() !== '') {
      setError(null);
      setLoading(true);
      try {
        const res = await validarUbicacion(destinoInput);
        if (res.status === 'success') {
          setDestinoData(res.ubicacion);
          // Proceder a grabar
          await procesarGrabacion(res.ubicacion);
        } else if (res.status === 'necesita_posicion') {
          setPosicionesDisponibles(res.opciones);
          setUbicacionEnProceso('destino');
          setShowPosicionModal(true);
        } else {
          setError(res.message || 'Ubicación destino no encontrada');
          setLoading(false);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al validar ubicación destino.');
        setLoading(false);
      }
    }
  };

  const procesarGrabacion = async (destinoValidado) => {
    try {
      const resGrabar = await grabarReubicacion(
        origenData,
        destinoValidado,
        articuloData,
        parseFloat(cantidadInput) * articuloData.UNIDADES
      );
      if (resGrabar.status === 'success') {
        setSuccess('¡Reubicación grabada con éxito!');
        setTimeout(() => {
          setSuccess(null);
          resetProcess();
        }, 2500);
      } else {
        setError(resGrabar.message || 'Error al grabar.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al intentar grabar la reubicación.');
    } finally {
      setLoading(false);
    }
  };

  // ----- HANDLER DEL MODAL DE POSICION -----
  const handleSelectPosicion = async (posicion) => {
    setShowPosicionModal(false);
    setLoading(true);
    setError(null);
    try {
      // Re-validar pasando la posicion
      const currentInput = ubicacionEnProceso === 'origen' ? origenInput : destinoInput;
      const res = await validarUbicacion(currentInput, posicion);
      
      if (res.status === 'success') {
        if (ubicacionEnProceso === 'origen') {
          setOrigenData(res.ubicacion);
          setStep(2);
        } else {
          setDestinoData(res.ubicacion);
          await procesarGrabacion(res.ubicacion);
        }
      } else {
        setError(res.message || 'Error al confirmar la posición.');
      }
    } catch (err) {
      setError('Error validando la posición.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-brand-light">
      <TerminalHeader title="REUBICACIÓN LIBRE" />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {/* Botón volver */}
        <div className="flex items-center gap-2 mb-2">
           <button onClick={handleBack} className="p-2 bg-white shadow rounded border border-gray-300 text-sga-dark">
             <ArrowLeft className="w-6 h-6" />
           </button>
           <span className="font-bold text-sga-dark">Volver</span>
        </div>

        {/* Mensajes Globales */}
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded border border-red-200 flex items-center gap-2">
            <AlertTriangle className="shrink-0" size={20} />
            <span className="font-semibold text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-800 p-3 rounded border border-green-200 flex items-center gap-2">
            <CheckCircle className="shrink-0" size={20} />
            <span className="font-semibold text-sm">{success}</span>
          </div>
        )}
        {loading && (
          <div className="flex justify-center p-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sga-blue"></div>
          </div>
        )}

        {/* STEP 1: Origen */}
        <div className={`p-4 rounded shadow bg-white border-l-4 ${step === 1 ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
          <label className="block text-sm font-bold text-gray-700 mb-1">1. Ubicación Origen</label>
          {step === 1 ? (
            <input 
              ref={origenRef}
              type="text" 
              className="w-full border-2 border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none uppercase"
              placeholder="Escanee o escriba"
              value={origenInput}
              onChange={(e) => setOrigenInput(e.target.value.toUpperCase())}
              onKeyDown={handleOrigenKeyDown}
              disabled={loading}
            />
          ) : (
            <div className="text-lg font-bold text-sga-dark">{origenData?.UBICACION || origenInput}</div>
          )}
        </div>

        {/* STEP 2: Articulo */}
        {step >= 2 && (
          <div className={`p-4 rounded shadow bg-white border-l-4 ${step === 2 ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
            <label className="block text-sm font-bold text-gray-700 mb-1">2. Artículo (EAN / Código)</label>
            {step === 2 ? (
              <>
                <SearchTypeToggle value={articuloSearchType} onChange={setArticuloSearchType} />
                <input 
                  ref={articuloRef}
                type="text" 
                className="w-full border-2 border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none uppercase"
                placeholder="Escanee artículo"
                value={articuloInput}
                onChange={(e) => setArticuloInput(e.target.value.toUpperCase())}
                onKeyDown={handleArticuloKeyDown}
                disabled={loading}
              />
              </>
            ) : (
              <div>
                <div className="text-lg font-bold text-sga-dark">{articuloData?.CODARTICULO}</div>
                {articuloData?.DESCRIPCION && <div className="text-sm text-gray-600">{articuloData.DESCRIPCION}</div>}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Cantidad */}
        {step >= 3 && (
          <div className={`p-4 rounded shadow bg-white border-l-4 ${step === 3 ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
            <label className="block text-sm font-bold text-gray-700 mb-1">3. Cantidad</label>
            {step === 3 ? (
              <div>
                <input 
                  ref={cantidadRef}
                  type="number" 
                  className="w-full border-2 border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none"
                  placeholder="Introduzca cantidad"
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value)}
                  onKeyDown={handleCantidadKeyDown}
                  disabled={loading}
                />
                {articuloData?.UNIDADES > 1 && (
                  <p className="text-xs text-sga-blue mt-1 font-semibold">
                    * Multiplica por el factor: {articuloData.UNIDADES}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-lg font-bold text-sga-dark">
                {cantidadInput} {articuloData?.UNIDADES > 1 && <span className="text-sm text-gray-500">(x{articuloData.UNIDADES})</span>}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Destino */}
        {step >= 4 && (
          <div className={`p-4 rounded shadow bg-white border-l-4 ${step === 4 ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
            <label className="block text-sm font-bold text-gray-700 mb-1">4. Ubicación Destino</label>
            {step === 4 ? (
              <input 
                ref={destinoRef}
                type="text" 
                className="w-full border-2 border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none uppercase"
                placeholder="Escanee destino"
                value={destinoInput}
                onChange={(e) => setDestinoInput(e.target.value.toUpperCase())}
                onKeyDown={handleDestinoKeyDown}
                disabled={loading}
              />
            ) : (
              <div className="text-lg font-bold text-sga-dark">{destinoData?.UBICACION || destinoInput}</div>
            )}
          </div>
        )}

      </div>

      {/* MODAL PARA SELECCION DE POSICION */}
      {showPosicionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="bg-sga-blue text-white p-3 font-bold text-center">
              Múltiples posiciones encontradas
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-80">
              <p className="mb-3 text-sm text-gray-600 font-semibold text-center">
                Seleccione la posición correcta para la etiqueta escaneada:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {posicionesDisponibles.map((op, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSelectPosicion(op.POSICION)}
                    className="p-3 bg-gray-100 hover:bg-sga-blue hover:text-white border border-gray-300 rounded font-bold text-lg transition-colors"
                  >
                    Pos: {op.POSICION}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowPosicionModal(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
