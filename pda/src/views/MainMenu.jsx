import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeftRight, Download, Package, ClipboardList, Wrench, LogOut } from 'lucide-react';
import apiService from '../api/apiService';

import TerminalHeader from '../components/TerminalHeader';

export default function MainMenu() {
  const navigate = useNavigate();
  const [terminalPerms, setTerminalPerms] = useState({});

  useEffect(() => {
    const fetchTerminal = async () => {
      try {
        const response = await apiService.get('/auth/terminal');
        if (response.status === 200 && response.data.terminal) {
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
      <TerminalHeader title="MENÚ PRINCIPAL" />

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
