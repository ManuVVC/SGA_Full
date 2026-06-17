import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import apiService from '../api/apiService';

export default function SubMenuLayout({ title, items }) {
  const navigate = useNavigate();
  const [terminal, setTerminal] = useState('12');
  const [operador, setOperador] = useState(localStorage.getItem('sga_operador') || '');
  const [operadorNombre, setOperadorNombre] = useState(localStorage.getItem('sga_operador_nombre') || localStorage.getItem('sga_operador') || '');

  useEffect(() => {
    const fetchTerminal = async () => {
      try {
        const response = await apiService.get('/auth/terminal');
        if (response.status === 200 && response.data.terminal) {
          setTerminal(response.data.terminal.CODTERMINAL || '12');
        }
      } catch (err) {
        // Fallback to defaults
      }
    };
    fetchTerminal();
  }, []);

  return (
    <div className="flex flex-col flex-1 h-full bg-brand-light">
      {/* HEADER */}
      <div className="bg-brand-olive text-white flex justify-between items-center px-2 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* Logo Placeholder */}
          <div className="bg-white rounded px-1.5 py-0.5 flex items-center justify-center">
            <span className="text-brand-red font-bold text-sm tracking-tight leading-none">Alifoods</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-sm">{title}</span>
            <span className="text-xs text-gray-200">{operadorNombre}</span>
          </div>
        </div>
        <div className="flex flex-col items-end text-[10px] font-bold gap-0.5">
          <div className="bg-[#8b8e3a] px-1.5 py-0.5 rounded shadow-sm">
            TERM: {terminal}
          </div>
          <div className="bg-[#8b8e3a] px-1.5 py-0.5 rounded shadow-sm">
            Oper: {operador}
          </div>
        </div>
      </div>

      {/* MENU ITEMS */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {items.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => {
              if (item.path) {
                navigate(item.path);
              } else {
                console.log(`Función no implementada: ${item.label}`);
              }
            }}
            className="bg-white border border-gray-300 rounded-lg py-3 flex flex-col items-center justify-center shadow-sm active:bg-gray-100 transition-colors"
          >
            {item.icon && (
              <div className="bg-gray-200 rounded-lg p-1.5 mb-1.5">
                <item.icon className="w-6 h-6 text-[#5c4033]" strokeWidth={2.5} />
              </div>
            )}
            <span className="font-black text-sga-dark text-[15px] leading-none">{item.label}</span>
          </button>
        ))}
      </div>

      {/* FOOTER */}
      <div className="bg-brand-olive p-3 shrink-0">
        <button 
          onClick={() => navigate('/menu')}
          className="w-full bg-sga-secondary hover:bg-gray-600 text-white font-bold py-3 rounded shadow-md flex items-center justify-center gap-2 active:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[15px] tracking-wide">VOLVER</span>
        </button>
      </div>
    </div>
  );
}
