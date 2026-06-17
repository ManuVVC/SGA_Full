import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeftRight, Download, Package, ClipboardList, Wrench, LogOut } from 'lucide-react';
import apiService from '../api/apiService';

export default function MainMenu() {
  const navigate = useNavigate();
  const [terminal, setTerminal] = useState('12');
  const [operador, setOperador] = useState(localStorage.getItem('sga_operador') || '');
  const [operadorNombre, setOperadorNombre] = useState(localStorage.getItem('sga_operador_nombre') || localStorage.getItem('sga_operador') || '');
  const [terminalPerms, setTerminalPerms] = useState({});

  useEffect(() => {
    const fetchTerminal = async () => {
      try {
        const response = await apiService.get('/auth/terminal');
        if (response.status === 200 && response.data.terminal) {
          // Si el backend devuelve CODTERMINAL numérico o string
          setTerminal(response.data.terminal.CODTERMINAL || '12');
          setTerminalPerms(response.data.terminal.permisos || {});
        }
      } catch (err) {
        // Fallback to defaults
      }
    };
    fetchTerminal();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('sga_token');
    localStorage.removeItem('sga_permissions');
    navigate('/');
  };

  const menuItems = [
    { id: 1, label: 'PREPARA PEDIDO', icon: ShoppingCart, path: '/prepara', show: terminalPerms.PRM_PREPARARPEDIDOCLIENTE },
    { id: 2, label: 'REUBICAR', icon: ArrowLeftRight, path: '/reubicar', show: terminalPerms.PRM_REUBICAR },
    { id: 3, label: 'ENTRADA MERC.', icon: Download, path: '/entrada', show: terminalPerms.PRM_ENTRADADEMERCANCIAS },
    { id: 4, label: 'INVENTARIO', icon: Package, path: '/inventario', show: true },
    { id: 5, label: 'DEVOLUCIONES', icon: ClipboardList, path: '/devoluciones', show: terminalPerms.PRM_DEVOLUCIONESCLIENTE },
    { id: 6, label: 'UTILIDADES', icon: Wrench, path: '/utilidades', show: true },
  ].filter(item => item.show === true || item.show === undefined);

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
            <span className="font-bold text-sm">MENÚ PRINCIPAL</span>
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
        {menuItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => navigate(item.path)}
            className="bg-white border border-gray-300 rounded-lg py-3 flex flex-col items-center justify-center shadow-sm active:bg-gray-100 transition-colors"
          >
            <div className="bg-gray-200 rounded-lg p-1.5 mb-1.5">
              <item.icon className="w-6 h-6 text-[#5c4033]" strokeWidth={2.5} />
            </div>
            <span className="font-black text-sga-dark text-[15px] leading-none">{item.label}</span>
          </button>
        ))}
      </div>

      {/* FOOTER */}
      <div className="bg-brand-olive p-3 shrink-0">
        <button 
          onClick={handleLogout}
          className="w-full bg-brand-red hover:bg-red-800 text-white font-bold py-3 rounded shadow-md flex items-center justify-center gap-2 active:bg-red-900 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[15px] tracking-wide">CERRAR SESIÓN</span>
        </button>
      </div>
    </div>
  );
}
