import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';
import { getDevolucionEnCurso, getLineasDevolucion, finalizarDevolucion } from '../api/devolucionesService';
import { usePermissions } from '../hooks/usePermissions';

export default function FinalizarDevolucionCliente() {
  const navigate = useNavigate();
  const { hasOperatorPermission, loading: permsLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [devolucion, setDevolucion] = useState(null);
  const [lineas, setLineas] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Control de acceso por permisos de operador
  useEffect(() => {
    if (!permsLoading && !hasOperatorPermission('PRM_DEVOLUCIONESCLIENTE')) {
      navigate('/menu');
    }
  }, [permsLoading, hasOperatorPermission, navigate]);

  const loadDevolucion = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDevolucionEnCurso();
      if (res.status === 'success' && res.devolucion) {
        setDevolucion(res.devolucion);
        // Cargar las líneas
        const lineasRes = await getLineasDevolucion(res.devolucion.cod_documento);
        if (lineasRes.status === 'success') {
          setLineas(lineasRes.lineas || []);
        }
      } else {
        setDevolucion(null);
        setLineas([]);
      }
    } catch (err) {
      setError('Error al cargar la devolución en curso.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permsLoading && hasOperatorPermission('PRM_DEVOLUCIONESCLIENTE')) {
      loadDevolucion();
    }
  }, [permsLoading, hasOperatorPermission]);

  const handleFinalizar = async () => {
    if (!devolucion) return;
    if (window.confirm(`¿Seguro que desea finalizar la devolución nº ${devolucion.num_documento}? Esta acción consolidará el documento.`)) {
      setLoading(true);
      setError(null);
      try {
        const res = await finalizarDevolucion(devolucion.cod_documento);
        if (res.status === 'success') {
          setSuccess(`Devolución nº ${devolucion.num_documento} finalizada correctamente.`);
          setDevolucion(null);
          setLineas([]);
          setTimeout(() => {
            navigate('/devoluciones');
          }, 2000);
        } else {
          setError(res.message || 'Error al finalizar la devolución.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al finalizar la devolución.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-gray-100">
      <TerminalHeader title="FIN. DEV. CLIENTE" />

      <div className="flex-1 p-4 overflow-y-auto pb-32">
        {/* Barra navegación y retroceso */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate('/devoluciones')} className="p-2 bg-white border border-gray-300 shadow rounded text-sga-dark">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-bold text-sga-dark">Volver</span>
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <RefreshCcw className="w-10 h-10 text-sga-primary animate-spin" />
            <span className="text-gray-500 font-bold">Cargando devolución en curso...</span>
          </div>
        ) : devolucion ? (
          <div className="space-y-4">
            {/* Detalles cabecera */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-start border-b pb-2 mb-3">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Devolución en curso</span>
                  <h3 className="text-xl font-bold text-sga-primary">Nº {devolucion.num_documento}</h3>
                </div>
                <span className="bg-blue-100 text-sga-blue text-xs font-bold px-2 py-1 rounded">
                  Serie: {devolucion.serie}
                </span>
              </div>

              <div className="space-y-1 text-sm">
                <p><span className="font-bold text-gray-500">Cliente:</span> {devolucion.cliente?.RAZONSOCIAL}</p>
                <p><span className="font-bold text-gray-500">Cód. Cliente:</span> {devolucion.cliente?.CODCLIENTEAPLICACION} · <span className="font-bold text-gray-500">CIF:</span> {devolucion.cliente?.CIF}</p>
                {devolucion.observaciones && (
                  <p><span className="font-bold text-gray-500">Obs:</span> {devolucion.observaciones}</p>
                )}
              </div>
            </div>

            {/* Listado de líneas */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h4 className="font-bold text-sga-dark mb-3 text-sm uppercase">Líneas registradas ({lineas.length})</h4>
              {lineas.length === 0 ? (
                <p className="text-gray-500 text-sm text-center italic py-4">No se han registrado artículos en esta devolución todavía.</p>
              ) : (
                <div className="divide-y max-h-[40vh] overflow-y-auto pr-1">
                  {lineas.map((linea, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sga-blue text-sm">{linea.cod_articulo_aplicacion}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                            Lot: {linea.lote || 'S/L'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 truncate font-semibold mt-0.5">{linea.nombre}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-sga-primary text-base">{linea.unidades} ud.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acción finalizar */}
            <button
              onClick={handleFinalizar}
              className="w-full bg-sga-primary hover:bg-blue-900 text-white font-bold p-4 rounded-xl text-xl shadow flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <CheckSquare className="w-6 h-6" />
              FINALIZAR DEVOLUCIÓN
            </button>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <CheckSquare className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-sga-dark">Sin devolución en curso</h3>
              <p className="text-sm text-gray-500 mt-1">No tienes ninguna devolución de cliente activa para poder finalizar en este momento.</p>
            </div>
            <button
              onClick={() => navigate('/devoluciones')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded font-bold transition-colors"
            >
              Volver al Submenú
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
