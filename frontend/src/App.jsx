import React, { useState, useEffect } from 'react';
import axios from 'axios';
import adminApi from './api/adminApi';
import { Package } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import './index.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Entradas from './views/Entradas';
import Salidas from './views/Salidas';
import Devoluciones from './views/Devoluciones';
import Inventario from './views/Inventario';
import MapaAlmacen from './views/MapaAlmacen';
import Informes from './views/Informes';

function App() {
  // --- STATE ---
  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [conexiones, setConexiones] = useState([]);
  const [selectedConexion, setSelectedConexion] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const fetchConexiones = async () => {
    try {
      const res = await adminApi.get('/conexiones');
      if (res.data?.status === 'success') {
        setConexiones(res.data.sesiones || []);
        if (res.data.sesiones && res.data.sesiones.length > 0) setSelectedConexion(res.data.sesiones[0].id);
      }
    } catch (e) {
      console.error('Error fetching conexiones:', e);
    }
  };

  useEffect(() => {
    fetchConexiones();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await axios.post('/api/auth/login-web', {
        username,
        password
      });
      if (res.data?.status === 'success') {
        setIsLoggedIn(true);
      } else {
        setLoginError(res.data?.message || 'Error de autenticación');
      }
    } catch (e) {
      setLoginError(e.response?.data?.message || 'Error de conexión');
    } finally {
      setLoginLoading(false);
    }
  };

  const isAdmin = username.toLowerCase() === 'administrador';

  // --- RENDER LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-header">
            <div style={{ display: 'inline-block', padding: '1rem', background: 'var(--primary)', borderRadius: '12px', marginBottom: '1rem' }}>
              <Package size={40} color="white" />
            </div>
            <h2>Acceso a SGA</h2>
            <p>Sistema de Gestión de Almacén</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label>Usuario</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {loginError && <div className="text-danger" style={{ fontSize: '0.85rem' }}>{loginError}</div>}
            <button type="submit" className="btn-primary" disabled={loginLoading} style={{ marginTop: '0.5rem' }}>
              {loginLoading ? 'Conectando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APP ---
  return (
    <BrowserRouter>
      <Layout 
        setIsLoggedIn={setIsLoggedIn}
        username={username}
        selectedConexion={selectedConexion}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/entradas" element={<Entradas />} />
          <Route path="/salidas" element={<Salidas />} />
          <Route path="/devoluciones" element={<Devoluciones />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/mapa" element={<MapaAlmacen />} />
          <Route path="/informes" element={<Informes isAdmin={isAdmin} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
