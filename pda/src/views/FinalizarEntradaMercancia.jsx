import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';
import apiService from '../api/apiService';
import { usePermissions } from '../hooks/usePermissions';

export default function FinalizarEntradaMercancia() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, loading: permsLoading } = usePermissions();

  const albaran = location.state?.albaran;

  const [loading, setLoading] = useState(true);
  const [lineas, setLineas] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Control de acceso y redirección si no hay albarán
  useEffect(() => {
    if (!permsLoading && !hasPermission('PRM_FINALIZARENTRADAMERCANCIA')) {
      navigate('/menu');
      return;
    }
    if (!albaran && !permsLoading) {
      navigate('/entrada/finalizar-lista');
    }
  }, [permsLoading, hasPermission, navigate, albaran]);

  useEffect(() => {
    if (albaran) {
      loadLineas();
    }
  }, [albaran]);

  const loadLineas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.get(`/entradas/lineas-grabadas/${albaran.CODDOCUMENTO}`);
      if (res.data && res.data.status === 'success') {
        setLineas(res.data.lineas || []);
      } else {
        setLineas([]);
      }
    } catch (err) {
      setError('Error al cargar las líneas del albarán.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizar = async () => {
    if (!albaran) return;
    if (window.confirm(`¿Seguro que desea finalizar el albarán nº ${albaran.NUMDOCUMENTO || albaran.CODDOCUMENTO}? Esta acción no se podrá deshacer.`)) {
      setLoading(true);
      setError(null);
      try {
        const res = await apiService.post('/entradas/finalizar', {
          CODDOCUMENTO: albaran.CODDOCUMENTO
        });
        if (res.data && res.data.status === 'success') {
          setSuccess(`Entrada nº ${albaran.NUMDOCUMENTO || albaran.CODDOCUMENTO} finalizada correctamente.`);
          setTimeout(() => {
            navigate('/menu'); // Volver al menú principal como pidió el flujo
          }, 2000);
        } else {
          setError(res.data?.message || 'Error al finalizar la entrada.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al finalizar la entrada.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!albaran) return null;

  return (
    <div className="flex flex-col flex-1 h-full bg-gray-100">
      <TerminalHeader title="FIN. ENTRADA MERC." />

      <div className="flex-1 p-4 overflow-y-auto pb-32">
        {/* Barra navegación y retroceso */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate('/entrada/finalizar-lista')} className="p-2 bg-white border border-gray-300 shadow rounded text-sga-dark">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-bold text-sga-dark">Volver a la lista</span>
        </div>

        {/* Mensajes informativos */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow flex items-center gap-2 font-bold animate-pulse">
            <AlertTriangle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded shadow flex items-center gap-2 font-bold">
            <CheckCircle className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {loading && !success ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <RefreshCcw className="w-10 h-10 text-sga-primary animate-spin" />
            <span className="text-gray-500 font-bold">Procesando...</span>
          </div>
        ) : !success && (
          <div className="space-y-4">

            {/* Acción finalizar */}
            <button
              onClick={handleFinalizar}
              className="w-full bg-sga-primary hover:bg-blue-900 text-white font-bold p-4 rounded-xl text-xl shadow flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <CheckSquare className="w-6 h-6" />
              CONFIRMAR FINALIZAR
            </button>

            {/* Detalles cabecera */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-start border-b pb-2 mb-3">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Albarán en curso</span>
                  <h3 className="text-xl font-bold text-sga-primary">Nº {albaran.NUMDOCUMENTO || albaran.CODDOCUMENTO}</h3>
                </div>
                <span className="bg-blue-100 text-sga-blue text-xs font-bold px-2 py-1 rounded">
                  Fecha: {albaran.FECHADOCUMENTO}
                </span>
              </div>

              <div className="space-y-1 text-sm">
                <p><span className="font-bold text-gray-500">Proveedor:</span> {albaran.RAZONSOCIAL || `Prov. ${albaran.CODPROVEEDOR}`}</p>
              </div>
            </div>

            {/* Listado de líneas */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h4 className="font-bold text-sga-dark mb-3 text-sm uppercase">Líneas ({lineas.length})</h4>
              {lineas.length === 0 ? (
                <p className="text-gray-500 text-sm text-center italic py-4">No se han registrado artículos en este albarán.</p>
              ) : (
                <div className="divide-y max-h-[40vh] overflow-y-auto pr-1">
                  {lineas.map((linea, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sga-blue text-sm">{linea.CODARTICULOAPLICACION}</span>
                        </div>
                        <p className="text-xs text-gray-700 truncate font-semibold mt-0.5">{linea.NOMBREARTICULO}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-gray-500 text-xs">Pte: {linea.CANTSOLICITADA - (linea.CANTSERVIDA || 0)}</span>
                        <br/>
                        <span className="font-bold text-sga-primary text-base">{linea.CANTSERVIDA || 0} ud.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
