import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, FileText, Building2 } from 'lucide-react';
import apiService from '../api/apiService';
import TerminalHeader from '../components/TerminalHeader';

export default function ListaFinalizarEntradas() {
  const [albaranes, setAlbaranes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlbaranes();
  }, []);

  const fetchAlbaranes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/entradas/albaranes-para-finalizar');
      if (response.data && response.data.albaranes) {
        setAlbaranes(response.data.albaranes);
      } else {
        setAlbaranes([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar los albaranes pendientes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-gray-100">
      <TerminalHeader title="FIN. ENTRADAS" />

      <div className="flex-1 overflow-auto p-4 pb-32">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate('/menu')} className="p-2 bg-white border border-gray-300 shadow rounded text-sga-dark">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-bold text-sga-dark">Volver al menú</span>
        </div>
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 font-bold border border-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500 font-medium">Cargando albaranes...</div>
          ) : albaranes.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow border text-center">
              <CheckSquare className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-700 font-bold text-lg">No hay entradas pendientes de finalizar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {albaranes.map((albaran) => (
                <div 
                  key={albaran.CODDOCUMENTO}
                  onClick={() => navigate('/entradas/finalizar-detalle', { state: { albaran } })}
                  className="bg-white p-4 rounded-lg shadow border-l-4 border-sga-secondary active:bg-gray-100 cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-sga-dark font-bold text-lg">
                      <FileText className="w-5 h-5 text-sga-secondary" />
                      {albaran.NUMDOCUMENTO || `DOC-${albaran.CODDOCUMENTO}`}
                    </div>
                    <span className="text-sm font-semibold bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {albaran.FECHADOCUMENTO}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-600 mt-2">
                    <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium leading-tight">
                      {albaran.RAZONSOCIAL || `Prov. ${albaran.CODPROVEEDOR}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
