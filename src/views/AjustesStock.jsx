import React from 'react';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TerminalHeader from '../components/TerminalHeader';

export default function AjustesStock() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-brand-light">
      <TerminalHeader title="AJUSTES STOCK" />
      <div className="flex-1 flex flex-col p-4 items-center justify-center">
        
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 flex flex-col items-center max-w-sm w-full text-center">
          <div className="bg-brand-olive/20 p-4 rounded-full mb-4">
            <Settings2 className="w-12 h-12 text-brand-olive" />
          </div>
          
          <h2 className="text-2xl font-black text-sga-dark mb-2">En Construcción</h2>
          <p className="text-gray-500 mb-8 font-semibold">
            Este módulo de Ajustes de Stock se implementará en la próxima fase.
          </p>

          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full py-4 bg-gray-600 text-white rounded font-bold text-lg shadow hover:bg-gray-700"
          >
            <ArrowLeft className="w-6 h-6" />
            VOLVER
          </button>
        </div>

      </div>
    </div>
  );
}
