import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';
import { usePermissions } from '../hooks/usePermissions';

export default function FinalizarDevolucionProveedor() {
  const navigate = useNavigate();
  const { hasOperatorPermission, loading: permsLoading } = usePermissions();

  // Control de acceso por permisos de operador
  useEffect(() => {
    if (!permsLoading && !hasOperatorPermission('PRM_DEVOLUCIONESPROVEEDOR')) {
      navigate('/menu');
    }
  }, [permsLoading, hasOperatorPermission, navigate]);

  return (
    <div className="flex flex-col flex-1 h-full bg-gray-100">
      <TerminalHeader title="FIN. DEV. PROVEEDOR" />

      <div className="flex-1 p-4 overflow-y-auto pb-32">
        {/* Barra navegación y retroceso */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate('/devoluciones')} className="p-2 bg-white border border-gray-300 shadow rounded text-sga-dark">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-bold text-sga-dark">Volver</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <CheckSquare className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-sga-dark">Sin devolución en curso</h3>
            <p className="text-sm text-gray-500 mt-1">No tienes ninguna devolución de proveedor activa para poder finalizar en este momento.</p>
          </div>
          <button
            onClick={() => navigate('/devoluciones')}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded font-bold transition-colors"
          >
            Volver al Submenú
          </button>
        </div>
      </div>
    </div>
  );
}
