import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import ErrorBoundary from './components/ErrorBoundary';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('sga_token');
  return token ? children : <Navigate to="/" replace />;
}

// Componente para escuchar el evento 401 global
function GlobalAuthListener({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      navigate('/', { replace: true });
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, [navigate]);

  return children;
}

function App() {
  return (
    <Router>
      <GlobalAuthListener>
        <div className="w-screen h-screen flex flex-col bg-sga-light text-sga-dark">
          {/* Contenido principal scrolleable (sin padding global para permitir fondos completos) */}
          <main className="flex-1 overflow-y-auto flex flex-col">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/menu" element={
                  <PrivateRoute><MainMenu /></PrivateRoute>
                } />
                
                {/* Submenús */}
                <Route path="/prepara" element={<PrivateRoute><SubMenuPrepara /></PrivateRoute>} />
                <Route path="/reubicar" element={<PrivateRoute><SubMenuReubicar /></PrivateRoute>} />
                <Route path="/reubicar/libre" element={<PrivateRoute><ReubicacionLibre /></PrivateRoute>} />
                <Route path="/reubicar/entrada" element={<PrivateRoute><ReubicacionEntrada /></PrivateRoute>} />
                <Route path="/entrada" element={<PrivateRoute><SubMenuEntrada /></PrivateRoute>} />
                <Route path="/entrada/recepcion" element={<PrivateRoute><EntradaMercancia /></PrivateRoute>} />
                <Route path="/inventario" element={<PrivateRoute><SubMenuInventario /></PrivateRoute>} />
                <Route path="/devoluciones" element={<PrivateRoute><SubMenuDevoluciones /></PrivateRoute>} />
                <Route path="/utilidades" element={<PrivateRoute><SubMenuUtilidades /></PrivateRoute>} />

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
