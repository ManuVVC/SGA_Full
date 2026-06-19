import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';

export default function TerminalHeader({ title }) {
  const [terminal, setTerminal] = useState('12');
  const [operador] = useState(localStorage.getItem('sga_operador') || '');
  const [operadorNombre] = useState(localStorage.getItem('sga_operador_nombre') || localStorage.getItem('sga_operador') || '');

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
  );
}
