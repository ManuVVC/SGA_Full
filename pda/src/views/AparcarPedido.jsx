import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, AlertCircle, RefreshCw } from 'lucide-react';
import { aparcarDocumento, getEnPreparacion } from '../api/pedidosService';
import TerminalHeader from '../components/TerminalHeader';

export default function AparcarPedido() {
  const navigate = useNavigate();
  const [documentos, setDocumentos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [successMsg, setSuccessMsg] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Estado para confirmación cuando solo hay 1 documento
  const [docToConfirm, setDocToConfirm] = useState(null);

  const fetchData = async () => {
    setLoadingList(true);
    setError(null);
    setSelectedDoc(null);
    setDocToConfirm(null);
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

  const handleAparcar = async (docId) => {
    if (!docId) return;
    
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    
    try {
      await aparcarDocumento(docId);
      setSuccessMsg(`Documento ${docId} aparcado con éxito.`);
      setTimeout(() => {
        navigate('/prepara');
      }, 1500);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarAparcado = () => {
    if (docToConfirm) {
        handleAparcar(docToConfirm.cod_documento);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sga-light relative">
      <TerminalHeader title="APARCAR PEDIDO" />
      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        {error && <div className="mb-4 text-red-600 font-bold bg-red-100 p-2 rounded shrink-0">{error}</div>}
        {successMsg && <div className="mb-4 text-green-700 font-bold bg-green-100 p-2 rounded shrink-0">{successMsg}</div>}
        
        <div className="flex justify-between items-center mb-2 shrink-0">
            <h2 className="font-bold text-gray-700">En Preparación</h2>
            <button onClick={fetchData} className="p-2 bg-gray-200 rounded text-gray-700 active:bg-gray-300">
                <RefreshCw size={20} className={loadingList ? 'animate-spin' : ''} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white rounded border border-gray-200 shadow-sm p-2 mb-4">
            {loadingList ? (
                <p className="text-gray-500 italic text-center mt-4">Cargando documentos...</p>
            ) : documentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-400 mt-10">
                    <AlertCircle size={48} className="mb-2" />
                    <p className="font-bold text-lg text-center">No tienes documentos<br/>en preparación</p>
                </div>
            ) : documentos.length === 1 ? (
                <div className="flex flex-col items-center justify-center mt-6">
                    <div className="border border-sga-primary bg-blue-50 rounded p-4 mb-4 w-full shadow-sm">
                        <div className="text-center mb-2">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Documento Activo</span>
                        </div>
                        <div className="flex justify-center items-center gap-2 mb-2">
                            <span className="font-black text-sga-primary text-2xl">#{docToConfirm?.num_documento || docToConfirm?.cod_documento}</span>
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
                                    ? 'border-sga-primary bg-blue-50 ring-2 ring-sga-primary ring-opacity-50' 
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-sga-primary text-lg">#{doc.num_documento || doc.cod_documento}</span>
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
        
        {/* Acciones para cuando hay un único documento */}
        {!loadingList && documentos.length === 1 && (
            <div className="flex flex-col gap-2 mb-4 shrink-0 bg-white p-3 rounded shadow border border-gray-200 text-center">
                <p className="text-gray-700 font-bold mb-2">¿Deseas aparcar este documento?</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/prepara')}
                        disabled={loading}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={handleConfirmarAparcado}
                        disabled={loading}
                        className="flex-1 bg-sga-primary hover:bg-blue-800 text-white font-bold py-3 rounded flex justify-center items-center gap-2"
                    >
                        <Archive size={20} />
                        {loading ? 'APARCANDO...' : 'ACEPTAR'}
                    </button>
                </div>
            </div>
        )}

        {/* Acciones para cuando hay varios documentos y se ha seleccionado uno */}
        {!loadingList && documentos.length > 1 && selectedDoc && (
            <div className="flex gap-2 mb-4 shrink-0 bg-white p-3 rounded shadow border border-gray-200">
                <button
                    onClick={() => handleAparcar(selectedDoc.cod_documento)}
                    disabled={loading}
                    className="flex-1 bg-sga-primary hover:bg-blue-800 text-white font-bold py-3 rounded flex justify-center items-center gap-2"
                >
                    <Archive size={20} />
                    {loading ? 'APARCANDO...' : 'APARCAR SELECCIONADO'}
                </button>
            </div>
        )}

        {/* Botón Volver general, se oculta si estamos mostrando el panel de un solo documento porque ya tiene CANCELAR */}
        {(loadingList || documentos.length !== 1) && (
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
