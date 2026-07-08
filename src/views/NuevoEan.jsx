import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TerminalHeader from '../components/TerminalHeader';
import ArticleSearchInput from '../components/ArticleSearchInput';
import apiService from '../api/apiService';
import { useKeyboard } from '../contexts/KeyboardContext';
import { RefreshCcw, Save, ArrowLeft } from 'lucide-react';

export default function NuevoEan() {
  const navigate = useNavigate();
  const { isKeyboardOpen } = useKeyboard();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Datos
  const [eanInput, setEanInput] = useState('');
  const [isUpdate, setIsUpdate] = useState(false);
  const [existingData, setExistingData] = useState(null);

  const [articuloSelected, setArticuloSelected] = useState(null);
  const [factorInput, setFactorInput] = useState('');

  const eanRef = useRef(null);
  const factorRef = useRef(null);

  useEffect(() => {
    if (step === 1 && eanRef.current) eanRef.current.focus();
    if (step === 3 && factorRef.current) factorRef.current.focus();
  }, [step]);

  const handleBack = () => {
    if (step > 1) {
      if (step === 4) setFactorInput('');
      if (step === 3) setArticuloSelected(null);
      if (step === 2) {
        // Al volver al paso 1, limpiamos todo y quitamos el modo update
        setEanInput('');
        setIsUpdate(false);
        setExistingData(null);
      }
      setStep(step - 1);
      setError(null);
      setSuccess(null);
    } else {
      navigate(-1);
    }
  };

  const handleEanKeyDown = async (e) => {
    if (e.key === 'Enter' && eanInput.trim() !== '') {
      setError(null);
      setLoading(true);
      try {
        const eanValue = eanInput.trim();
        const res = await apiService.get(`/utilidades/ean/${eanValue}`);
        
        if (res.data.exists) {
          setIsUpdate(true);
          setExistingData(res.data.data);
          // Pedir al usuario confirmación si desea actualizar
          setStep(1.5); 
        } else {
          setIsUpdate(false);
          setExistingData(null);
          setStep(2); // Pasar a pedir artículo
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al consultar EAN');
        setEanInput('');
      } finally {
        setLoading(false);
      }
    }
  };

  const confirmarActualizacion = (acepta) => {
    if (acepta) {
      setStep(2); // Pedir nuevo artículo a asociar
    } else {
      setEanInput('');
      setIsUpdate(false);
      setExistingData(null);
      setStep(1); // Volver al inicio
    }
  };

  const handleArticleSelected = (article) => {
    setArticuloSelected(article);
    setFactorInput(isUpdate && existingData ? existingData.FACTORCONVERSION.toString() : '1');
    setStep(3);
  };

  const handleFactorKeyDown = (e) => {
    if (e.key === 'Enter' && factorInput.trim() !== '') {
      const val = parseFloat(factorInput);
      if (isNaN(val) || val <= 0) {
        setError("El factor debe ser numérico y mayor que 0");
        return;
      }
      setError(null);
      setStep(4); // Confirmación
    }
  };

  const guardarEan = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ean: eanInput.trim(),
        codArticulo: articuloSelected.CODARTICULO,
        factor: parseFloat(factorInput)
      };

      if (isUpdate) {
        await apiService.put(`/utilidades/ean/${payload.ean}`, payload);
      } else {
        await apiService.post('/utilidades/ean', payload);
      }

      setSuccess(`EAN ${isUpdate ? 'actualizado' : 'creado'} correctamente.`);
      
      // Reiniciar después de un tiempo
      setTimeout(() => {
        setEanInput('');
        setArticuloSelected(null);
        setFactorInput('');
        setIsUpdate(false);
        setExistingData(null);
        setSuccess(null);
        setStep(1);
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el EAN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <TerminalHeader title="NUEVO C.BARRAS" />

      <div className="flex-1 p-4 overflow-y-auto pb-32">
        {/* Botón volver */}
        <div className="flex items-center gap-2 mb-4">
           <button onClick={handleBack} className="p-2 bg-white shadow rounded border border-gray-300 text-sga-dark">
             <ArrowLeft className="w-6 h-6" />
           </button>
           <span className="font-bold text-sga-dark">Volver</span>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-sm font-bold">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded shadow-sm font-bold">
            {success}
          </div>
        )}

        {/* STEP 1: EAN */}
        <div className={`p-4 rounded shadow mb-4 bg-white border-l-4 ${step === 1 ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
          <label className="block text-sm font-bold text-gray-700 mb-1">1. Código de Barras (EAN)</label>
          {step === 1 ? (
            <input 
              ref={eanRef}
              type="text" 
              inputMode={isKeyboardOpen ? "text" : "none"}
              className="w-full border-2 border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none uppercase"
              placeholder="Escanee o teclee EAN"
              value={eanInput}
              onChange={(e) => setEanInput(e.target.value.toUpperCase())}
              onKeyDown={handleEanKeyDown}
              disabled={loading}
            />
          ) : (
            <div className="text-lg font-bold text-sga-dark">{eanInput}</div>
          )}
        </div>

        {/* STEP 1.5: Confirmar Update */}
        {step === 1.5 && existingData && (
          <div className="p-4 rounded shadow mb-4 bg-yellow-50 border border-yellow-300">
            <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-2">
              <RefreshCcw size={20} /> EAN Existente
            </h3>
            <p className="text-sm mb-2 text-gray-700">Este EAN ya está asignado al artículo:</p>
            <div className="bg-white p-2 rounded border mb-4">
              <p className="font-bold text-sga-dark">{existingData.NOMBREARTICULO}</p>
              <p className="text-sm text-gray-500">Cód: {existingData.CODARTICULOAPLICACION} | Factor: {existingData.FACTORCONVERSION}</p>
            </div>
            <p className="font-bold mb-3 text-center">¿Desea actualizar su asociación?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => confirmarActualizacion(false)}
                className="flex-1 p-3 bg-gray-400 text-white rounded font-bold hover:bg-gray-500"
              >
                NO
              </button>
              <button 
                onClick={() => confirmarActualizacion(true)}
                className="flex-1 p-3 bg-sga-blue text-white rounded font-bold hover:bg-blue-800"
              >
                SÍ, ACTUALIZAR
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Artículo */}
        {step >= 2 && step !== 1.5 && (
          <div className={`p-4 rounded shadow mb-4 bg-white border-l-4 ${step === 2 ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
            <label className="block text-sm font-bold text-gray-700 mb-1">2. Artículo a Asociar</label>
            {step === 2 ? (
              <ArticleSearchInput 
                onArticleSelected={handleArticleSelected} 
                disabled={loading}
                autoFocus={true}
              />
            ) : (
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-lg font-bold text-sga-dark">{articuloSelected?.NOMBREARTICULO}</p>
                <p className="text-sm text-gray-500">Cód: {articuloSelected?.CODARTICULOAPLICACION}</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Factor */}
        {step >= 3 && (
          <div className={`p-4 rounded shadow mb-4 bg-white border-l-4 ${step === 3 ? 'border-sga-blue' : 'border-gray-300 opacity-60'}`}>
            <label className="block text-sm font-bold text-gray-700 mb-1">3. Factor de Conversión</label>
            {step === 3 ? (
              <input 
                ref={factorRef}
                type="number" 
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                step="any"
                className="w-full border-2 border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none"
                placeholder="Ej: 1 o 12"
                value={factorInput}
                onChange={(e) => setFactorInput(e.target.value)}
                onKeyDown={handleFactorKeyDown}
                disabled={loading}
              />
            ) : (
              <div className="text-lg font-bold text-sga-dark">{factorInput} unidades / bulto</div>
            )}
          </div>
        )}

        {/* STEP 4: Confirmación */}
        {step === 4 && (
          <div className="mt-4">
            <button 
              onClick={guardarEan}
              className="w-full p-4 bg-green-600 text-white rounded font-bold text-lg flex justify-center items-center gap-2 hover:bg-green-700 shadow-lg"
              disabled={loading}
            >
              <Save size={24} />
              {isUpdate ? 'Actualizar EAN' : 'Guardar Nuevo EAN'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
