import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { getEnPreparacion, finalizarDocumento, getLineasDocumento } from '../api/pedidosService';
import { usePermissions } from '../hooks/usePermissions';
import TerminalHeader from '../components/TerminalHeader';

export default function FinalizarPedido() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  
  const [documentos, setDocumentos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [successMsg, setSuccessMsg] = useState(null);
  
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docToConfirm, setDocToConfirm] = useState(null);

  // Estados de flujo de confirmación
  const [checkingLines, setCheckingLines] = useState(false);
  const [showBultosPrompt, setShowBultosPrompt] = useState(false);
  const [numBultos, setNumBultos] = useState('');
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [showDespreciarPrompt, setShowDespreciarPrompt] = useState(false);
  
  const prmDespreciar = hasPermission('PRM_DESPRECIARRESTOSDOCCLI');

  const fetchData = async () => {
    setLoadingList(true);
    setError(null);
    setSelectedDoc(null);
    setDocToConfirm(null);
    resetConfirmationFlow();
    setNumBultos('');
    
    try {
      const data = await getEnPreparacion();
      setDocumentos(data);
      if (data.length === 1) {
        setDocToConfirm(data[0]);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetConfirmationFlow = () => {
    setShowBultosPrompt(false);
    setShowIncompleteWarning(false);
    setShowDespreciarPrompt(false);
    setCheckingLines(false);
  };

  const iniciarFinalizacion = async (doc) => {
    if (!doc) return;
    
    setError(null);
    resetConfirmationFlow();
    setNumBultos('');
    
    if (doc.gestiona_bultos === 1) {
      setShowBultosPrompt(true);
    } else {
      await comprobarLineas(doc);
    }
  };

  const confirmarBultos = async (doc) => {
    if (!numBultos || isNaN(numBultos) || parseInt(numBultos, 10) < 0) {
      setError('Introduce un número válido de bultos.');
      return;
    }
    setShowBultosPrompt(false);
    await comprobarLineas(doc);
  };

  const comprobarLineas = async (doc) => {
    setCheckingLines(true);
    setLoading(true);
    
    try {
      // Descargamos las líneas para comprobar cantidades
      const lineas = await getLineasDocumento(doc.cod_documento);
      
      const incompleteLines = lineas.some(l => l.cant_solicitada > l.cant_preparada);
      
      setLoading(false);
      setCheckingLines(false);

      if (incompleteLines) {
        setShowIncompleteWarning(true);
      } else {
        // Todo preparado al 100%, vamos al siguiente paso (o finalizar)
        procederHaciaDespreciar(doc);
      }
      
    } catch (err) {
      setError(err);
      setLoading(false);
      setCheckingLines(false);
    }
  };

  const procederHaciaDespreciar = (doc) => {
    setShowIncompleteWarning(false);
    // Si tiene permiso para despreciar, mostramos la pregunta
    if (prmDespreciar) {
      setShowDespreciarPrompt(true);
    } else {
      // Si no tiene permiso, lo mandamos a finalizar con despreciarRestos = false
      ejecutarFinalizacion(doc, false);
    }
  };

  const ejecutarFinalizacion = async (doc, despreciarRestos) => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    setShowDespreciarPrompt(false);
    
    try {
      const bultosVal = (doc.gestiona_bultos === 1 && numBultos !== '') ? parseInt(numBultos, 10) : null;
      await finalizarDocumento(doc.cod_documento, despreciarRestos, bultosVal);
      setSuccessMsg(`Documento ${doc.cod_documento} finalizado con éxito.`);
      setTimeout(() => {
        navigate('/prepara');
      }, 1500);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  const docContext = docToConfirm || selectedDoc;

  return (
    <div className="flex flex-col h-full bg-sga-light relative">
      <TerminalHeader title="FINALIZAR PEDIDO" />
      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        {error && <div className="mb-4 text-red-600 font-bold bg-red-100 p-2 rounded shrink-0">{error}</div>}
        {successMsg && <div className="mb-4 text-green-700 font-bold bg-green-100 p-2 rounded shrink-0">{successMsg}</div>}
        
        <div className="flex justify-between items-center mb-2 shrink-0">
            <h2 className="font-bold text-gray-700">En Preparación</h2>
            <button onClick={fetchData} className="p-2 bg-gray-200 rounded text-gray-700 active:bg-gray-300">
                <RefreshCw size={20} className={loadingList ? 'animate-spin' : ''} />
            </button>
        </div>

        {/* --- LISTA O TARJETA ÚNICA (Si no estamos en medio de flujos de confirmación) --- */}
        {!showBultosPrompt && !showIncompleteWarning && !showDespreciarPrompt && (
        <div className="flex-1 overflow-y-auto bg-white rounded border border-gray-200 shadow-sm p-2 mb-4">
            {loadingList ? (
                <p className="text-gray-500 italic text-center mt-4">Cargando documentos...</p>
            ) : documentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-400 mt-10">
                    <CheckCircle size={48} className="mb-2" />
                    <p className="font-bold text-lg text-center">No tienes documentos<br/>en preparación</p>
                </div>
            ) : documentos.length === 1 ? (
                <div className="flex flex-col items-center justify-center mt-6">
                    <div className="border border-sga-success bg-green-50 rounded p-4 mb-4 w-full shadow-sm">
                        <div className="text-center mb-2">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Documento Activo</span>
                        </div>
                        <div className="flex justify-center items-center gap-2 mb-2">
                            <span className="font-black text-sga-success text-2xl">#{docToConfirm?.num_documento || docToConfirm?.cod_documento}</span>
                        </div>
                        <div className="text-center font-bold text-gray-800">
                            {docToConfirm?.nombre_comercial || docToConfirm?.razon_social || 'Cliente Desconocido'}
                        </div>
                        <div className="text-center text-sm text-gray-600 mt-1">
                            Líneas: {docToConfirm?.num_lineas !== undefined ? docToConfirm?.num_lineas : 0}
                        </div>
                    </div>
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {documentos.map((doc) => {
                        const isSelected = selectedDoc?.cod_documento === doc.cod_documento;
                        return (
                            <li 
                                key={doc.cod_documento} 
                                onClick={() => setSelectedDoc(isSelected ? null : doc)}
                                className={`border rounded p-3 flex flex-col gap-2 shadow-sm transition-colors ${
                                    isSelected 
                                    ? 'border-sga-success bg-green-50 ring-2 ring-sga-success ring-opacity-50' 
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-sga-success text-lg">#{doc.num_documento || doc.cod_documento}</span>
                                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Cod: {doc.cod_documento}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="text-sm font-bold text-gray-800 leading-tight">
                                        {doc.nombre_comercial || doc.razon_social || 'Cliente Desconocido'}
                                    </div>
                                    <div className="text-xs text-gray-600 font-medium bg-gray-200 self-start px-2 py-1 rounded">
                                        Líneas: {doc.num_lineas !== undefined ? doc.num_lineas : 0}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
        )}

        {/* --- FLUJO 1: BOTON DE INICIO (Aparece cuando hay 1 seleccionado o 1 automático y no estamos en warning) --- */}
        {!loadingList && docContext && !showBultosPrompt && !showIncompleteWarning && !showDespreciarPrompt && (
            <div className="flex gap-2 mb-4 shrink-0 bg-white p-3 rounded shadow border border-gray-200">
                <button
                    onClick={() => iniciarFinalizacion(docContext)}
                    disabled={loading || checkingLines}
                    className="flex-1 bg-sga-success hover:bg-green-700 text-white font-bold py-3 rounded flex justify-center items-center gap-2"
                >
                    <CheckCircle size={20} />
                    {checkingLines ? 'VERIFICANDO LÍNEAS...' : (documentos.length === 1 ? 'FINALIZAR ESTE DOCUMENTO' : 'FINALIZAR SELECCIONADO')}
                </button>
            </div>
        )}

        {/* --- FLUJO 1.5: PROMPT DE BULTOS --- */}
        {showBultosPrompt && docContext && (
            <div className="flex-1 flex flex-col items-center justify-center bg-white p-4 rounded shadow border border-brand-blue mb-4">
                <AlertCircle size={64} className="text-brand-blue mb-4" />
                <h3 className="text-xl font-black text-center text-gray-800 mb-2">Número de Bultos</h3>
                <label htmlFor="inputNumBultos" className="text-center text-gray-600 font-medium mb-4 block">
                    Este documento requiere gestionar el número de bultos. Introdúcelo a continuación:
                </label>
                <input 
                    id="inputNumBultos"
                    name="numBultos"
                    type="number" 
                    min="0"
                    value={numBultos} 
                    onChange={(e) => setNumBultos(e.target.value)}
                    className="w-full max-w-xs border-2 border-brand-blue rounded px-4 py-3 text-center text-2xl font-bold mb-6 focus:outline-none focus:ring-4 focus:ring-blue-200"
                    placeholder="0"
                />
                <div className="flex w-full gap-2 mt-auto">
                    <button
                        onClick={resetConfirmationFlow}
                        disabled={loading}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={() => confirmarBultos(docContext)}
                        disabled={loading || !numBultos}
                        className="flex-1 bg-sga-primary hover:bg-blue-800 text-white font-bold py-3 rounded"
                    >
                        CONTINUAR
                    </button>
                </div>
            </div>
        )}

        {/* --- FLUJO 2: WARNING LÍNEAS INCOMPLETAS --- */}
        {showIncompleteWarning && docContext && (
            <div className="flex-1 flex flex-col items-center justify-center bg-white p-4 rounded shadow border border-yellow-400 mb-4">
                <AlertTriangle size={64} className="text-yellow-500 mb-4" />
                <h3 className="text-xl font-black text-center text-gray-800 mb-2">Líneas Incompletas</h3>
                <p className="text-center text-gray-600 font-medium mb-6">
                    Hay líneas que no han sido preparadas por completo (Cantidad Solicitada &gt; Cantidad Preparada).<br/><br/>¿Deseas finalizar el pedido de todos modos?
                </p>
                <div className="flex w-full gap-2 mt-auto">
                    <button
                        onClick={resetConfirmationFlow}
                        disabled={loading}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={() => procederHaciaDespreciar(docContext)}
                        disabled={loading}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded"
                    >
                        SÍ, FINALIZAR
                    </button>
                </div>
            </div>
        )}

        {/* --- FLUJO 3: PROMPT DESPRECIAR RESTOS --- */}
        {showDespreciarPrompt && docContext && (
            <div className="flex-1 flex flex-col items-center justify-center bg-white p-4 rounded shadow border border-brand-blue mb-4">
                <AlertCircle size={64} className="text-brand-blue mb-4" />
                <h3 className="text-xl font-black text-center text-gray-800 mb-2">Despreciar Restos</h3>
                <p className="text-center text-gray-600 font-medium mb-6">
                    ¿Deseas despreciar los restos de este documento?
                </p>
                <div className="flex w-full gap-2 mt-auto">
                    <button
                        onClick={() => ejecutarFinalizacion(docContext, false)}
                        disabled={loading}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded"
                    >
                        NO
                    </button>
                    <button
                        onClick={() => ejecutarFinalizacion(docContext, true)}
                        disabled={loading}
                        className="flex-1 bg-sga-primary hover:bg-blue-800 text-white font-bold py-3 rounded"
                    >
                        SÍ
                    </button>
                </div>
            </div>
        )}

        {/* Botón Volver general, se oculta si estamos en un paso intermedio de warning */}
        {!showBultosPrompt && !showIncompleteWarning && !showDespreciarPrompt && (
            <button
                type="button"
                onClick={() => navigate('/prepara')}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded flex items-center justify-center shrink-0"
            >
                VOLVER
            </button>
        )}
      </div>
    </div>
  );
}
