import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Box } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';

export default function StockResults() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const stockData = location.state?.stockData;

  // Si se accede a esta ruta sin datos (ej. refrescar página), volver
  useEffect(() => {
    if (!stockData) {
      navigate('/stock', { replace: true });
    }
  }, [stockData, navigate]);

  if (!stockData) return null;

  return (
    <div className="flex flex-col flex-1 h-full bg-brand-light">
      <TerminalHeader title="RESULTADOS DE STOCK" />
      <div className="flex flex-col flex-1 relative p-4 pb-20">
      <div className="bg-white p-4 rounded-lg shadow border-b-4 border-sga-primary mb-4 shrink-0">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
          {stockData.articulo_comercial}
        </h2>
        <h3 className="text-xl font-black text-sga-dark leading-tight mt-1">
          {stockData.nombre}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <h4 className="text-lg font-bold mb-3 px-1 text-sga-dark">Ubicaciones Disponibles</h4>
        
        <div className="flex flex-col gap-3">
          {stockData.ubicaciones.map((ubi, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg shadow flex items-center justify-between border-l-8 border-sga-success">
              <div>
                <span className="block text-3xl font-black text-sga-dark">{ubi.etiqueta}</span>
                <span className="block text-sm text-gray-500 font-semibold mt-1">
                  Lote: {ubi.lote || '-'} | {ubi.cod_ubicacion}
                  {ubi.fecha_caducidad && <span> | Cad: {ubi.fecha_caducidad}</span>}
                </span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-4xl font-black text-sga-success">{ubi.cantidad}</span>
                <span className="text-xs uppercase font-bold text-gray-400">UDS</span>
              </div>
            </div>
          ))}

          {stockData.ubicaciones.length === 0 && (
            <div className="bg-white p-6 rounded-lg text-center shadow">
               <span className="text-xl font-bold text-sga-danger">Sin stock en almacén</span>
            </div>
          )}
        </div>
      </div>

      {/* Botón flotante grande para regresar rápidamente al escáner */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-sga-light">
        <button 
          onClick={() => navigate('/stock')}
          className="w-full bg-sga-primary hover:bg-blue-800 text-white font-bold p-5 rounded-lg text-2xl shadow-xl flex items-center justify-center gap-3 active:bg-blue-900 transition-colors"
        >
          <Box className="w-8 h-8" />
          Nueva Consulta
        </button>
      </div>
      </div>
    </div>
  );
}
