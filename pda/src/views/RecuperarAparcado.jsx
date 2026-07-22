import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArchiveRestore, RefreshCw, AlertCircle, List, X } from 'lucide-react';
import { recuperarDocumento, getAparcados, getLineasDocumento } from '../api/pedidosService';
import TerminalHeader from '../components/TerminalHeader';

export default function RecuperarAparcado() {
  const navigate = useNavigate();
  const [aparcados, setAparcados] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Nuevo estado para la selección y el modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showLinesModal, setShowLinesModal] = useState(false);
  const [lines, setLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);

  const fetchAparcados = async () => {
    setLoadingList(true);
    setError(null);
    setSelectedDoc(null);
    try {
      const data = await getAparcados();
      setAparcados(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchAparcados();
  }, []);

  const handleRecuperar = async () => {
    if (!selectedDoc) return;
    
    setError(null);
    setSuccessMsg(null);

    const codTerminal = localStorage.getItem('sga_terminal') || '1';

    setLoading(true);
    try {
      await recuperarDocumento(selectedDoc.cod_documento, codTerminal);
      setSuccessMsg(`Documento ${selectedDoc.cod_documento} recuperado. Puedes continuar su preparación.`);
      setTimeout(() => {
        navigate('/prepara');
      }, 2000);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerLineas = async () => {
    if (!selectedDoc) return;
    setShowLinesModal(true);
    setLoadingLines(true);
    try {
      const data = await getLineasDocumento(selectedDoc.cod_documento);
      setLines(data);
    } catch (err) {
      // Si falla, mostramos el error en la lista de líneas o usamos el error global
      setError(err);
      setShowLinesModal(false);
    } finally {
      setLoadingLines(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sga-light relative">
      <TerminalHeader title="RECUPERAR APARCADO" />
      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        {error && <div className="mb-4 text-red-600 font-bold bg-red-100 p-2 rounded shrink-0">{error}</div>}
        {successMsg && <div className="mb-4 text-green-700 font-bold bg-green-100 p-2 rounded shrink-0">{successMsg}</div>}
        
        <div className="flex justify-between items-center mb-2 shrink-0">
            <h2 className="font-bold text-gray-700">Documentos Aparcados</h2>
            <button onClick={fetchAparcados} className="p-2 bg-gray-200 rounded text-gray-700 active:bg-gray-300">
                <RefreshCw size={20} className={loadingList ? 'animate-spin' : ''} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white rounded border border-gray-200 shadow-sm p-2 mb-4">
            {loadingList ? (
                <p className="text-gray-500 italic text-center mt-4">Cargando documentos...</p>
            ) : aparcados.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-400 mt-10">
                    <AlertCircle size={48} className="mb-2" />
                    <p className="font-bold text-lg">No hay documentos aparcados</p>
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {aparcados.map((doc) => {
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
        
        {/* Panel de acciones condicional al tener seleccionado un documento */}
        {selectedDoc && (
            <div className="flex gap-2 mb-4 shrink-0 bg-white p-3 rounded shadow border border-gray-200">
                <button
                    onClick={handleVerLineas}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded flex justify-center items-center gap-2"
                >
                    <List size={20} />
                    LÍNEAS
                </button>
                <button
                    onClick={handleRecuperar}
                    disabled={loading}
                    className="flex-[2] bg-sga-success hover:bg-green-700 text-white font-bold py-3 rounded flex justify-center items-center gap-2"
                >
                    <ArchiveRestore size={20} />
                    {loading ? 'RECUPERANDO...' : 'RECUPERAR'}
                </button>
            </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/prepara')}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded flex items-center justify-center shrink-0"
        >
          VOLVER
        </button>
      </div>

      {/* Modal de Líneas */}
      {showLinesModal && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex flex-col p-4">
              <div className="bg-white rounded-lg shadow-xl flex-1 flex flex-col overflow-hidden mt-8 mb-8">
                  <div className="bg-gray-100 p-3 border-b flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="font-bold text-gray-800">Líneas del Pedido</h3>
                          <p className="text-xs text-gray-500">Doc: {selectedDoc?.cod_documento}</p>
                      </div>
                      <button onClick={() => setShowLinesModal(false)} className="p-2 bg-gray-300 rounded text-gray-700">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
                      {loadingLines ? (
                          <p className="text-center italic text-gray-500 mt-4">Cargando líneas...</p>
                      ) : lines.length === 0 ? (
                          <p className="text-center font-bold text-gray-400 mt-4">Sin líneas</p>
                      ) : (
                          <ul className="flex flex-col gap-2">
                              {lines.map((linea, idx) => (
                                  <li key={idx} className="bg-white border border-gray-200 p-2 rounded shadow-sm text-sm flex flex-col">
                                      <div className="flex justify-between font-bold text-gray-700 mb-1">
                                          <span>{linea.cod_articulo}</span>
                                      </div>
                                      <div className="text-gray-600 text-xs mb-2 line-clamp-2">
                                          {linea.nombre}
                                      </div>
                                      <div className="flex justify-between bg-gray-100 p-1 rounded text-xs font-semibold">
                                          <span className="text-gray-500">Sol: <span className="text-gray-800">{linea.cant_solicitada}</span></span>
                                          <span className="text-gray-500">Prep: <span className="text-sga-success font-bold">{linea.cant_preparada}</span></span>
                                      </div>
                                  </li>
                              ))}
                          </ul>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
