import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, Box, Package } from 'lucide-react';
import { validarPalet, validarUbicacion, grabarReubicacionPalet } from '../api/reubicacionesService';
import TerminalHeader from '../components/TerminalHeader';
import { useKeyboard } from '../contexts/KeyboardContext';

export default function ReubicacionEntrada() {
  const navigate = useNavigate();
  const { isKeyboardOpen } = useKeyboard();
  
  // Maquina de estados: 1 = Matrícula (SSCC), 2 = Destino
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Inputs controlados
  const [ssccInput, setSsccInput] = useState('');
  const [destinoInput, setDestinoInput] = useState('');

  // Datos consolidados devueltos por la API
  const [paletData, setPaletData] = useState(null);
  const [destinoData, setDestinoData] = useState(null);

  // Modal para multiplicidad de posición (ubicación)
  const [showPosicionModal, setShowPosicionModal] = useState(false);
  const [posicionesDisponibles, setPosicionesDisponibles] = useState([]);

  const ssccRef = useRef(null);
  const destinoRef = useRef(null);

  // Focus effect
  useEffect(() => {
    if (step === 1 && ssccRef.current) ssccRef.current.focus();
    if (step === 2 && destinoRef.current) destinoRef.current.focus();
  }, [step]);

  const resetProcess = () => {
    setStep(1);
    setSsccInput('');
    setDestinoInput('');
    setPaletData(null);
    setDestinoData(null);
    setError(null);
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 3) setDestinoInput('');
      if (step === 2) setSsccInput('');
      
      setStep(step - 1);
      setError(null);
      setSuccess(null);
    } else {
      navigate(-1);
    }
  };

  // ----- STEP 1: MATRICULA (SSCC) -----
  const handleSsccKeyDown = async (e) => {
    if (e.key === 'Enter' && ssccInput.trim() !== '') {
      setError(null);
      setLoading(true);
      try {
        const res = await validarPalet(ssccInput);
        if (res.status === 'success') {
          setPaletData(res.palet);
          setStep(2);
        } else {
          setError(res.message || 'Palet no encontrado');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al validar la matrícula.');
      } finally {
        setLoading(false);
      }
    }
  };

  // ----- STEP 2: DESTINO y GRABAR -----
  const handleDestinoKeyDown = async (e) => {
    if (e.key === 'Enter' && destinoInput.trim() !== '') {
      setError(null);
      setLoading(true);
      try {
        const res = await validarUbicacion(destinoInput);
        if (res.status === 'success') {
          setDestinoData(res.ubicacion);
          setStep(3);
        } else if (res.status === 'necesita_posicion') {
          setPosicionesDisponibles(res.opciones);
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

  const procesarGrabacion = async () => {
    try {
      setLoading(true);
      const resGrabar = await grabarReubicacionPalet(
        paletData,
        destinoData
      );
      if (resGrabar.status === 'success') {
        setSuccess('¡Palet reubicado con éxito!');
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
      const res = await validarUbicacion(destinoInput, posicion);
      
      if (res.status === 'success') {
        setDestinoData(res.ubicacion);
        setStep(3);
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
      <TerminalHeader title="REUB. ENTRADA MERCANCÍA" />
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

        {/* STEP 1: Matrícula (SSCC) */}
        <div className={`p-4 rounded shadow bg-white border-l-4 ${step === 1 ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
          <label className="block text-sm font-bold text-gray-700 mb-1">1. Matrícula de Palet (SSCC)</label>
          {step === 1 ? (
            <input 
              ref={ssccRef}
              type="text" 
              inputMode={isKeyboardOpen ? "text" : "none"}
              className="w-full border-2 border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none uppercase"
              placeholder="Escanee SSCC"
              value={ssccInput}
              onChange={(e) => setSsccInput(e.target.value.toUpperCase())}
              onKeyDown={handleSsccKeyDown}
              disabled={loading}
            />
          ) : (
            <div>
              <div className="text-lg font-bold text-sga-dark flex items-center gap-2">
                <Package size={20} />
                {paletData?.SSCC || ssccInput}
              </div>
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="font-bold text-sga-blue">{paletData?.CODARTICULO}</div>
                <div className="text-sm text-gray-600 mb-2">{paletData?.DESCRIPCION}</div>
                
                <div className="flex gap-4 text-sm font-semibold">
                  <div>Cantidad: <span className="text-sga-dark">{paletData?.UNIDADES}</span></div>
                  {paletData?.NUMEROLOTE && (
                    <div className="flex items-center gap-1 text-blue-700">
                      <Box size={14} /> Lote: {paletData.NUMEROLOTE}
                    </div>
                  )}
                </div>
                {paletData?.FECHACADUCIDAD && (
                  <div className="text-xs text-red-600 font-bold mt-1">
                    Caducidad: {paletData.FECHACADUCIDAD}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: Destino */}
        {step >= 2 && (
          <div className={`p-4 rounded shadow bg-white border-l-4 ${step === 2 ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
            <label className="block text-sm font-bold text-gray-700 mb-1">2. Ubicación Destino</label>
            {step === 2 ? (
              <input 
                ref={destinoRef}
                type="text" 
                inputMode={isKeyboardOpen ? "text" : "none"}
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

        {/* STEP 3: Confirmar */}
        {step === 3 && (
          <div className="mt-4">
            <button 
              onClick={procesarGrabacion}
              className="w-full p-4 bg-green-600 text-white rounded font-bold text-lg flex justify-center items-center gap-2 hover:bg-green-700 shadow-lg"
              disabled={loading}
            >
              Confirmar Reubicación
            </button>
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
