import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import apiService from './api/apiService';
import Login from './views/Login';
import MainMenu from './views/MainMenu';
import StockQuery from './views/StockQuery';
import StockResults from './views/StockResults';
import { 
  SubMenuPrepara, SubMenuReubicar, SubMenuEntrada, 
  SubMenuInventario, SubMenuDevoluciones, SubMenuUtilidades 
} from './views/SubMenus';
import ReubicacionLibre from './views/ReubicacionLibre';
import ReubicacionEntrada from './views/ReubicacionEntrada';
import EntradaMercancia from './views/EntradaMercancia';
import ListaFinalizarEntradas from './views/ListaFinalizarEntradas';
import FinalizarEntradaMercancia from './views/FinalizarEntradaMercancia';
import NuevoEan from './views/NuevoEan';
import InfoUbicacion from './views/InfoUbicacion';
import AjustesStock from './views/AjustesStock';
import DevolucionCliente from './views/DevolucionCliente';
import FinalizarDevolucionCliente from './views/FinalizarDevolucionCliente';
import FinalizarDevolucionProveedor from './views/FinalizarDevolucionProveedor';
import AparcarPedido from './views/AparcarPedido';
import RecuperarAparcado from './views/RecuperarAparcado';
import FinalizarPedido from './views/FinalizarPedido';
import PreparaPedido from './views/PreparaPedido';
import ErrorBoundary from './components/ErrorBoundary';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('sga_token');
  return token ? children : <Navigate to="/" replace />;
}

// Componente para escuchar el evento 401 global
function GlobalAuthListener({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = (e) => {
      const reason = e?.detail?.reason || '';
      navigate('/', { replace: true, state: { reason } });
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, [navigate]);

  return children;
}

// Componente para vigilar la inactividad física en el terminal PDA
function InactivityHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('sga_token');

  // Configuración de inactividad, con fallback a 30 minutos
  const timeoutMin = parseInt(localStorage.getItem('sga_session_timeout') || '30', 10);
  const timeoutMs = timeoutMin * 60 * 1000;

  useEffect(() => {
    // Solo activar si hay un token válido y no estamos en la página de Login (/)
    if (!token || location.pathname === '/') return;

    let timer;

    const logoutUser = () => {
      console.warn(`[SGA] Sesión cerrada localmente por inactividad (${timeoutMin} min).`);
      
      // Limpiar almacenamiento local
      localStorage.removeItem('sga_token');
      localStorage.removeItem('sga_permissions');
      localStorage.removeItem('sga_operador');
      localStorage.removeItem('sga_operador_nombre');

      // Notificar pasivamente al backend de que cerramos sesión
      apiService.post('/auth/logout').catch(() => {});

      // Redirigir a Login con la razón
      navigate('/', { replace: true, state: { reason: 'SESSION_EXPIRED' } });
    };

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(logoutUser, timeoutMs);
    };

    // Registrar detectores de interacción física en la PDA
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Iniciar temporizador inmediatamente al montar o cambiar de página
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [token, location.pathname, timeoutMs, timeoutMin, navigate]);

  return null;
}

function App() {
  return (
    <Router>
      <GlobalAuthListener>
        <InactivityHandler />
        <div className="fixed inset-0 flex flex-col bg-sga-light text-sga-dark overflow-hidden">
          {/* Contenido principal scrolleable (sin padding global para permitir fondos completos) */}
          <main className="flex-1 overflow-y-auto flex flex-col relative">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/menu" element={
                  <PrivateRoute><MainMenu /></PrivateRoute>
                } />
                
                {/* Submenús */}
                <Route path="/prepara" element={<PrivateRoute><SubMenuPrepara /></PrivateRoute>} />
                <Route path="/prepara/pedido" element={<PrivateRoute><PreparaPedido /></PrivateRoute>} />
                <Route path="/prepara/aparcar" element={<PrivateRoute><AparcarPedido /></PrivateRoute>} />
                <Route path="/prepara/recuperar" element={<PrivateRoute><RecuperarAparcado /></PrivateRoute>} />
                <Route path="/prepara/finalizar" element={<PrivateRoute><FinalizarPedido /></PrivateRoute>} />
                <Route path="/reubicar" element={<PrivateRoute><SubMenuReubicar /></PrivateRoute>} />
                <Route path="/reubicar/libre" element={<PrivateRoute><ReubicacionLibre /></PrivateRoute>} />
                <Route path="/reubicar/entrada" element={<PrivateRoute><ReubicacionEntrada /></PrivateRoute>} />
                <Route path="/entrada" element={<PrivateRoute><SubMenuEntrada /></PrivateRoute>} />
                <Route path="/entrada/recepcion" element={<PrivateRoute><EntradaMercancia /></PrivateRoute>} />
                <Route path="/entrada/finalizar-lista" element={<PrivateRoute><ListaFinalizarEntradas /></PrivateRoute>} />
                <Route path="/entradas/finalizar-detalle" element={<PrivateRoute><FinalizarEntradaMercancia /></PrivateRoute>} />
                <Route path="/inventario" element={<PrivateRoute><SubMenuInventario /></PrivateRoute>} />
                <Route path="/devoluciones" element={<PrivateRoute><SubMenuDevoluciones /></PrivateRoute>} />
                <Route path="/devoluciones/cliente" element={<PrivateRoute><DevolucionCliente /></PrivateRoute>} />
                <Route path="/devoluciones/finalizar-cliente" element={<PrivateRoute><FinalizarDevolucionCliente /></PrivateRoute>} />
                <Route path="/devoluciones/finalizar-proveedor" element={<PrivateRoute><FinalizarDevolucionProveedor /></PrivateRoute>} />
                <Route path="/utilidades" element={<PrivateRoute><SubMenuUtilidades /></PrivateRoute>} />
                <Route path="/utilidades/nuevo-ean" element={<PrivateRoute><NuevoEan /></PrivateRoute>} />
                <Route path="/utilidades/info-ubicacion" element={<PrivateRoute><InfoUbicacion /></PrivateRoute>} />
                <Route path="/stock/ajustes" element={<PrivateRoute><AjustesStock /></PrivateRoute>} />

                {/* Funcionalidades */}
                <Route path="/stock" element={
                  <PrivateRoute><StockQuery /></PrivateRoute>
                } />
                <Route path="/stock/results" element={
                  <PrivateRoute><StockResults /></PrivateRoute>
                } />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </GlobalAuthListener>
    </Router>
  );
}

export default App;
