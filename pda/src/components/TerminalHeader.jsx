import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';
import { useKeyboard } from '../contexts/KeyboardContext';
import { Keyboard, Smartphone, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useDeviceScreen } from '../hooks/useDeviceScreen';

export default function TerminalHeader({ title }) {
  const [terminal, setTerminal] = useState('12');
  const [operador] = useState(localStorage.getItem('sga_operador') || '');
  const [operadorNombre] = useState(localStorage.getItem('sga_operador_nombre') || localStorage.getItem('sga_operador') || '');
  const [showScreenInfo, setShowScreenInfo] = useState(false);
  const { isKeyboardOpen, toggleKeyboard } = useKeyboard();
  const isOnline = useOnlineStatus();
  const screen = useDeviceScreen();

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
      <div className={`bg-brand-olive text-white flex justify-between items-center shrink-0 ${
        screen.isLandscape ? 'px-2.5 py-1' : 'px-2 py-2'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          {/* Logo Placeholder */}
          <div className="bg-white rounded px-1.5 py-0.5 flex items-center justify-center shrink-0">
            <span className="text-brand-red font-bold text-xs sm:text-sm tracking-tight leading-none">Alifoods</span>
          </div>
          {screen.isLandscape ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-xs sm:text-sm truncate">{title}</span>
              {operadorNombre && (
                <span className="text-[11px] text-gray-200 truncate border-l border-white/30 pl-2">
                  {operadorNombre}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col leading-tight truncate">
              <span className="font-bold text-sm truncate">{title}</span>
              <span className="text-xs text-gray-200 truncate">{operadorNombre}</span>
            </div>
          )}
        </div>
        <div className={`flex items-center shrink-0 ${screen.isLandscape ? 'gap-1.5' : 'gap-3'}`}>
          <button 
            onClick={toggleKeyboard}
            className={`${screen.isLandscape ? 'p-1' : 'p-1.5'} rounded-full transition-colors ${isKeyboardOpen ? 'bg-sga-secondary text-white' : 'bg-[#8b8e3a] text-gray-300'}`}
            title="Alternar teclado virtual"
          >
            <Keyboard className={screen.isLandscape ? 'w-4 h-4' : 'w-5 h-5'} />
          </button>
          <div className={`flex ${screen.isLandscape ? 'flex-row items-center gap-1' : 'flex-col items-end gap-0.5'} text-[10px] font-bold`}>
            <button
              type="button"
              onClick={() => setShowScreenInfo(true)}
              title="Pulsar para ver resolución y datos de pantalla del dispositivo"
              className="bg-[#8b8e3a] hover:bg-[#7a7d32] px-1.5 py-0.5 rounded shadow-sm cursor-pointer transition-colors active:scale-95 text-white"
            >
              TERM: {terminal}
            </button>
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

      {/* MODAL INFORMATIVO DE RESOLUCIÓN Y DISPOSITIVO */}
      {showScreenInfo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xs overflow-hidden flex flex-col border border-gray-300">
            <div className="bg-brand-olive text-white p-3 font-bold flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>Datos del Dispositivo</span>
              </div>
              <button 
                onClick={() => setShowScreenInfo(false)}
                className="text-white hover:text-gray-200 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 text-xs text-gray-700 flex flex-col gap-2">
              <div className="bg-gray-50 border border-gray-200 rounded p-2 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-semibold">Espacio Visible (Viewport):</span>
                  <span className="font-black text-sga-blue text-sm">{screen.width} × {screen.height} px</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-semibold">Pantalla del Dispositivo:</span>
                  <span className="font-bold text-gray-800">{screen.screenWidth} × {screen.screenHeight} px</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-semibold">Densidad de Píxeles:</span>
                  <span className="font-bold text-gray-800">{screen.pixelRatio}x (DPR)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-semibold">Orientación:</span>
                  <span className="font-bold text-gray-800">{screen.isLandscape ? 'Horizontal' : 'Vertical'}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded p-2 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Diagnóstico de Altura:</span>
                  <span className={`font-black px-1.5 py-0.5 rounded text-[11px] ${
                    screen.isVeryShortScreen 
                      ? 'bg-red-200 text-red-900' 
                      : screen.isShortScreen 
                        ? 'bg-amber-200 text-amber-900' 
                        : 'bg-green-200 text-green-900'
                  }`}>
                    {screen.isVeryShortScreen 
                      ? 'Ultra-reducida (<450px)' 
                      : screen.isShortScreen 
                        ? 'Reducida (<550px)' 
                        : 'Estándar (>=550px)'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">
                  Las vistas con diseño adaptativo compactan automáticamente formularios y botones cuando la altura es menor a 550px o se abre el teclado.
                </p>
              </div>

              <div className="text-[10px] text-gray-500 truncate mt-1">
                <b>Terminal:</b> {terminal} | <b>Operador:</b> {operador}
              </div>
            </div>
            <div className="p-2.5 bg-gray-100 border-t flex justify-end">
              <button 
                onClick={() => setShowScreenInfo(false)}
                className="px-4 py-1.5 bg-sga-primary text-white font-bold rounded text-xs shadow-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
