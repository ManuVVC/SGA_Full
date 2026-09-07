import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';
import { useKeyboard } from '../contexts/KeyboardContext';
import { Keyboard } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function TerminalHeader({ title }) {
  const [terminal, setTerminal] = useState('12');
  const [operador] = useState(localStorage.getItem('sga_operador') || '');
  const [operadorNombre] = useState(localStorage.getItem('sga_operador_nombre') || localStorage.getItem('sga_operador') || '');
  const { isKeyboardOpen, toggleKeyboard } = useKeyboard();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const fetchTerminal = async () => {
      try {
        const cachedTerminalData = sessionStorage.getItem('sga_terminal_data');
        if (cachedTerminalData) {
          const parsedData = JSON.parse(cachedTerminalData);
          if (parsedData.terminal) {
            setTerminal(parsedData.terminal.CODTERMINAL || '12');
            return;
          }
        }

        const response = await apiService.get('/auth/terminal');
        if (response.status === 200 && response.data.terminal) {
          sessionStorage.setItem('sga_terminal_data', JSON.stringify(response.data));
          setTerminal(response.data.terminal.CODTERMINAL || '12');
        }
      } catch (err) {
        // Fallback to defaults
      }
    };
    fetchTerminal();
  }, []);

  return (
    <>
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
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleKeyboard}
            className={`p-1.5 rounded-full transition-colors ${isKeyboardOpen ? 'bg-sga-secondary text-white' : 'bg-[#8b8e3a] text-gray-300'}`}
            title="Alternar teclado virtual"
          >
            <Keyboard className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-end text-[10px] font-bold gap-0.5">
            <div className="bg-[#8b8e3a] px-1.5 py-0.5 rounded shadow-sm">
              TERM: {terminal}
            </div>
            <div className="bg-[#8b8e3a] px-1.5 py-0.5 rounded shadow-sm">
              Oper: {operador}
            </div>
          </div>
        </div>
      </div>
      {!isOnline && (
        <div className="bg-red-500 text-white text-center text-sm py-1 font-bold shrink-0">
          ⚠️ Sin conexión
        </div>
      )}
    </>
  );
}
