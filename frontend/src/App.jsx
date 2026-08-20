import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, 
  Package, FileText, Settings, LogOut, Search, Filter, 
  Activity, Clock, Box, PlusCircle, Database, Download, RefreshCw, RotateCcw
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './index.css';
import DetalleDocumento from './components/Documentos/DetalleDocumento';
import StockUbicacion from './components/Inventario/StockUbicacion';
import MovimientosStock from './components/Inventario/MovimientosStock';
import ProductividadOperadores from './components/Estadisticas/ProductividadOperadores';

function App() {
  const gridRef = React.useRef();
  // --- STATE ---
  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [conexiones, setConexiones] = useState([]);
  const [selectedConexion, setSelectedConexion] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Navigation
  const [activeNav, setActiveNav] = useState('dashboard');

  // Data: Dashboard
  const [dashboardStats, setDashboardStats] = useState({
    entradas_pendientes: 0,
    entradas_curso: 0,
    salidas_pendientes: 0,
    salidas_curso: 0,
    palets_almacenes: [],
    roturas_stock: 0
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [activeDashboardView, setActiveDashboardView] = useState(null); // 'caducidades' | 'roturas' | null
  const [roturasList, setRoturasList] = useState([]);
  const [roturasLoading, setRoturasLoading] = useState(false);
  const [caducidadesList, setCaducidadesList] = useState([]);
  const [caducidadesMeses, setCaducidadesMeses] = useState(1);
  const [showCodFabricante, setShowCodFabricante] = useState(false);

  // Data: Entradas
  const [selectedTipoDoc, setSelectedTipoDoc] = useState('2');
  const [inboundList, setInboundList] = useState([]);
  const [inboundLoading, setInboundLoading] = useState(false);

  // Data: Salidas
  const [outboundEstados, setOutboundEstados] = useState([]);
  const [selectedOutboundEstado, setSelectedOutboundEstado] = useState('');
  const [outboundList, setOutboundList] = useState([]);
  const [outboundLoading, setOutboundLoading] = useState(false);

  // Data: Informes Libres
  const [informesList, setInformesList] = useState([]);
  const [activeInforme, setActiveInforme] = useState(null);
  const [informeFiltrosOpt, setInformeFiltrosOpt] = useState([]);
  const [selectedInformeFiltro, setSelectedInformeFiltro] = useState('');
  const [informeResults, setInformeResults] = useState(null);
  const [informeLoading, setInformeLoading] = useState(false);
  const [informeError, setInformeError] = useState('');
  
  // Custom Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [definicionFiltros, setDefinicionFiltros] = useState([]);
  const [customFiltros, setCustomFiltros] = useState({});

  // Documento seleccionado para el drawer de detalle
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Pestaña activa de inventario: 'stock' | 'movimientos'
  const [activoInventarioTab, setActivoInventarioTab] = useState('stock');

  // Pestaña activa de informes: 'sql' | 'productividad'
  const [activeInformesTab, setActiveInformesTab] = useState('sql');

  // --- HELPERS ---
  const formatDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return dateStr;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})( \d{2}:\d{2}:\d{2})?$/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}${match[4] || ''}`;
    }
    return dateStr;
  };

  // --- API CALLS ---
  const fetchConexiones = async () => {
    try {
      const res = await axios.get('/admin/conexiones');
      if (res.data?.status === 'success') {
        setConexiones(res.data.sesiones || []);
        if (res.data.sesiones && res.data.sesiones.length > 0) setSelectedConexion(res.data.sesiones[0].id);
      }
    } catch (e) {
      console.error('Error fetching conexiones:', e);
    }
  };

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

  const fetchInbound = async () => {
    setInboundLoading(true);
    try {
      let url = '/admin/inbound/documentos';
      if (selectedTipoDoc) {
        url += `?tipo=${selectedTipoDoc}`;
      }
      const res = await axios.get(url);
      setInboundList(res.data.data || []);
    } catch (error) {
      console.error("Error fetching inbound docs", error);
    } finally {
      setInboundLoading(false);
    }
  };

  const fetchOutboundEstados = async () => {
    try {
      const res = await axios.get('/admin/outbound/estados');
      if (res.data.status === 'success') {
        const estados = res.data.data || [];
        setOutboundEstados(estados);
        if (estados.length > 0 && !selectedOutboundEstado) {
          setSelectedOutboundEstado(estados[0].codestadodocumento.toString());
        }
      }
    } catch (error) {
      console.error("Error fetching outbound estados", error);
    }
  };

  const fetchOutboundDocs = async () => {
    if (!selectedOutboundEstado) return;
    setOutboundLoading(true);
    try {
      const res = await axios.get(`/admin/outbound/documentos?estado=${selectedOutboundEstado}`);
      if (res.data.status === 'success') {
        setOutboundList(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching outbound docs", error);
    } finally {
      setOutboundLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    setDashboardLoading(true);
    try {
      const res = await axios.get('/admin/dashboard/stats');
      if (res.data?.status === 'success') {
        setDashboardStats(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchCaducidades = async (meses = caducidadesMeses) => {
    try {
      const res = await axios.get(`/admin/dashboard/caducidades?meses=${meses}`);
      if (res.data.status === 'success') {
        setCaducidadesList(res.data.data || []);
        setShowCodFabricante(res.data.show_cod_fabricante || false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoturas = async () => {
    setRoturasLoading(true);
    try {
      const res = await axios.get('/admin/dashboard/roturas');
      if (res.data.status === 'success') {
        setRoturasList(res.data.data || []);
        setShowCodFabricante(res.data.show_cod_fabricante || false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRoturasLoading(false);
    }
  };

  const fetchInformesList = async () => {
    try {
      const res = await axios.get('/admin/informes');
      if (res.data?.status === 'success') {
        setInformesList(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFiltrosForInforme = async (coddef) => {
    if (!coddef) {
      setInformeFiltrosOpt([]);
      setDefinicionFiltros([]);
      return;
    }
    try {
      const res = await axios.get(`/admin/filtros?def=${coddef}`);
      if (res.data?.status === 'success') {
        setInformeFiltrosOpt(res.data.data.map(f => ({...f, codfiltro: f.CODFILTRO, descripcion: f.DESCRIPCION})));
      }
      const resDef = await axios.get(`/admin/filtros/definicion?def=${coddef}`);
      if (resDef.data?.status === 'success') {
        setDefinicionFiltros(resDef.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunInforme = async () => {
    if (!activeInforme?.sql) return;
    setInformeLoading(true);
    setInformeError('');
    setInformeResults(null);
    try {
      const payload = {
        sql: activeInforme.sql,
        coddeffiltro: activeInforme.coddeffiltro
      };
      
      if (selectedInformeFiltro === "custom") {
        payload.custom_filters = customFiltros;
      } else {
        payload.codfiltro = selectedInformeFiltro;
      }

      const res = await axios.post('/admin/informes/ejecutar', payload);
      if (res.data?.status === 'success') {
        setInformeResults({
          columns: res.data.columns,
          data: res.data.data,
          total: res.data.total
        });
      } else {
        setInformeError(res.data?.message || 'Error desconocido');
      }
    } catch (e) {
      setInformeError(e.response?.data?.message || e.message);
    } finally {
      setInformeLoading(false);
    }
  };

  const handleSaveInforme = async () => {
    if (!activeInforme?.nombre || !activeInforme?.sql) {
      alert("Nombre y SQL son obligatorios");
      return;
    }
    try {
      const res = await axios.post('/admin/informes', activeInforme);
      if (res.data?.status === 'success') {
        fetchInformesList();
        setActiveInforme(res.data.data);
        alert("Informe guardado con éxito");
      }
    } catch (e) {
      alert("Error al guardar: " + (e.response?.data?.message || e.message));
    }
  };

  const handleSaveCustomFiltro = async () => {
    const desc = prompt("Introduce un nombre para este nuevo filtro:");
    if (!desc) return;
    try {
      const res = await axios.post('/admin/filtros', {
        coddeffiltro: activeInforme.coddeffiltro,
        descripcion: desc,
        custom_values: customFiltros
      });
      if (res.data?.status === 'success') {
        alert("Filtro guardado con éxito. Se recargará la lista.");
        await fetchFiltrosForInforme(activeInforme.coddeffiltro);
        setSelectedInformeFiltro(res.data.codfiltro.toString());
      }
    } catch (e) {
      alert("Error guardando el filtro: " + (e.response?.data?.message || e.message));
    }
  };

  const handleExportExcel = () => {
    if (gridRef.current && gridRef.current.api) {
      const filename = (activeInforme?.nombre || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      gridRef.current.api.exportDataAsCsv({
        fileName: `informe_${filename}.csv`
      });
    }
  };

  useEffect(() => {
    fetchConexiones();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchInbound();
      fetchOutboundEstados();
      fetchInformesList();
      fetchDashboardStats();
      fetchCaducidades();
    }
  }, [isLoggedIn, selectedTipoDoc]);

  useEffect(() => {
    if (isLoggedIn && selectedOutboundEstado) {
      fetchOutboundDocs();
    }
  }, [selectedOutboundEstado]);

  useEffect(() => {
    if (isLoggedIn && activeNav === 'dashboard') {
        fetchCaducidades(caducidadesMeses);
    }
  }, [caducidadesMeses]);

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
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon"><Package size={20} /></div>
          <div className="logo-text"><h1>SGA Core</h1></div>
        </div>
        <nav className="sidebar-nav">
          <div className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveNav('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div className={`nav-item ${activeNav === 'entradas' ? 'active' : ''}`} onClick={() => setActiveNav('entradas')}>
            <ArrowDownToLine size={20} /> Entradas
          </div>
          <div className={`nav-item ${activeNav === 'salidas' ? 'active' : ''}`} onClick={() => setActiveNav('salidas')}>
            <ArrowUpFromLine size={20} /> Salidas
          </div>
          <div className={`nav-item ${activeNav === 'devoluciones' ? 'active' : ''}`} onClick={() => { setActiveNav('devoluciones'); setSelectedTipoDoc('7'); }}>
            <RotateCcw size={20} /> Devoluciones
          </div>
          <div className={`nav-item ${activeNav === 'inventario' ? 'active' : ''}`} onClick={() => setActiveNav('inventario')}>
            <Box size={20} /> Inventario
          </div>
          <div className={`nav-item ${activeNav === 'informes' ? 'active' : ''}`} onClick={() => setActiveNav('informes')}>
            <FileText size={20} /> Informes
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="nav-item" onClick={() => setIsLoggedIn(false)}>
            <LogOut size={20} /> Cerrar Sesión
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            {activeNav === 'dashboard' && 'Visión Global del Almacén'}
            {activeNav === 'entradas' && 'Gestión de Recepciones (Inbound)'}
            {activeNav === 'salidas' && 'Gestión de Expediciones (Outbound)'}
            {activeNav === 'devoluciones' && 'Gestión de Devoluciones'}
            {activeNav === 'inventario' && 'Estado del Stock'}
            {activeNav === 'informes' && 'Informes Manuales (SQL)'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="badge badge-info">{username}@{selectedConexion}</div>
            <Settings size={20} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
          </div>
        </header>

        <div className="content-area">
          
          {/* VIEW: DASHBOARD */}
          {activeNav === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-0.5rem' }}>
                <button 
                  onClick={() => { fetchDashboardStats(); fetchCaducidades(); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                >
                  <RefreshCw size={16} />
                  Refrescar Datos
                </button>
              </div>
              <div className="stats-grid">
                <div className="stat-box" onClick={() => setActiveNav('entradas')} style={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'scale(1.02)' } }}>
                  <div className="stat-label">Entradas</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pendientes</div>
                      <div className="stat-value text-info">{dashboardStats.entradas_pendientes}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>En Curso</div>
                      <div className="stat-value text-warning">{dashboardStats.entradas_curso}</div>
                    </div>
                  </div>
                </div>
                <div className="stat-box" onClick={() => setActiveNav('salidas')} style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div className="stat-label">Salidas</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pendientes</div>
                      <div className="stat-value text-info">{dashboardStats.salidas_pendientes}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>En Curso</div>
                      <div className="stat-value text-warning">{dashboardStats.salidas_curso}</div>
                    </div>
                  </div>
                </div>

                <div className="stat-box" onClick={() => { setActiveDashboardView(activeDashboardView === 'caducidades' ? null : 'caducidades'); if(activeDashboardView !== 'caducidades') fetchCaducidades(); }} style={{ cursor: 'pointer', border: activeDashboardView === 'caducidades' ? '1px solid var(--primary)' : '' }}>
                  <div className="stat-label">Artículos a Caducar</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div className="stat-value text-warning">{caducidadesList.length}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>En los próximos {caducidadesMeses} meses</div>
                  </div>
                </div>

                <div className="stat-box" onClick={() => { setActiveDashboardView(activeDashboardView === 'roturas' ? null : 'roturas'); if(activeDashboardView !== 'roturas') fetchRoturas(); }} style={{ cursor: 'pointer', border: activeDashboardView === 'roturas' ? '1px solid var(--danger)' : '' }}>
                  <div className="stat-label" style={{ color: 'var(--danger)' }}>Roturas de Stock</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div className="stat-value" style={{ color: 'var(--danger)' }}>{dashboardStats.roturas_stock}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Artículos a servir sin stock</div>
                  </div>
                </div>

                <div className="stat-box" style={{ gridColumn: 'span 4' }}>
                  <div className="stat-label" style={{ marginBottom: '0.5rem' }}>Stock Total (Palets) por Almacén</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', overflowY: 'auto', maxHeight: '80px' }}>
                    {dashboardStats.palets_almacenes.map(alm => (
                       <div key={alm.almacen} style={{ background: 'var(--bg-card-hover)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                         <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{alm.almacen}</div>
                         <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{alm.total}</div>
                       </div>
                    ))}
                    {dashboardStats.palets_almacenes.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin datos</div>}
                  </div>
                </div>
              </div>

              {activeDashboardView === 'caducidades' && (
                <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3><Activity size={20}/> Alertas de Caducidad</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Caduca en:</label>
                      <select value={caducidadesMeses} onChange={e => { setCaducidadesMeses(e.target.value); fetchCaducidades(e.target.value); }} style={{ padding: '0.4rem', background: 'var(--bg-card-hover)', border: 'none', color: 'white', borderRadius: 'var(--radius-sm)' }}>
                        <option value={1}>1 Mes</option>
                        <option value={3}>3 Meses</option>
                        <option value={6}>6 Meses</option>
                        <option value={12}>1 Año</option>
                      </select>
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => gridRef.current?.api?.exportDataAsCsv({fileName: 'caducidades.csv'})}>
                        <Download size={14} /> Exportar a Excel
                      </button>
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setActiveDashboardView(null)}>Cerrar</button>
                    </div>
                  </div>
                  <div style={{ flex: 1, width: '100%', minHeight: '300px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Cód. Artículo</th>
                          {showCodFabricante && <th>Cód. Fab.</th>}
                          <th>Artículo</th>
                          <th>Lote</th>
                          <th>Ubicación</th>
                          <th>Stock</th>
                          <th>Cajas</th>
                          <th>F. Caducidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caducidadesList.map((row, i) => {
                          const today = new Date().toISOString().split('T')[0];
                          const isExpired = row.FECHACADUCIDAD && row.FECHACADUCIDAD < today;
                          return (
                            <tr key={i} className={isExpired ? 'expired-row' : ''}>
                              <td className="mono" style={{ fontWeight: '500' }}>{row.CODIGO_APLICACION}</td>
                              {showCodFabricante && <td>{row.COD_FABRICANTE}</td>}
                              <td>{row.NOMBREARTICULO}</td>
                              <td>{row.LOTE}</td>
                              <td>{row.UBICACION}</td>
                              <td>{row.STOCK}</td>
                              <td>{row.CAJAS}</td>
                              <td style={{ color: isExpired ? 'var(--danger)' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>
                                {formatDate(row.FECHACADUCIDAD)}
                              </td>
                            </tr>
                          );
                        })}
                        {caducidadesList.length === 0 && (
                          <tr><td colSpan={showCodFabricante ? 8 : 7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay datos.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeDashboardView === 'roturas' && (
                <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: 'var(--danger)' }}><Activity size={20}/> Roturas de Stock</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => gridRef.current?.api?.exportDataAsCsv({fileName: 'roturas.csv'})}>
                        <Download size={14} /> Exportar a Excel
                      </button>
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setActiveDashboardView(null)}>Cerrar</button>
                    </div>
                  </div>
                  <div style={{ flex: 1, width: '100%', minHeight: '300px', overflowY: 'auto' }}>
                    {roturasLoading ? (
                       <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos de roturas...</div>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Cód. Artículo</th>
                            <th>Artículo</th>
                            <th style={{ textAlign: 'center' }}>Uds. a Servir</th>
                            <th style={{ textAlign: 'center' }}>Uds. a Recibir</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roturasList.map((doc, i) => (
                            <tr key={i}>
                              <td className="mono" style={{ fontWeight: '500' }}>{doc.codarticuloaplicacion}</td>
                              <td>{doc.nombrearticulo}</td>
                              <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold' }}>{doc.unidades_a_servir}</td>
                              <td style={{ textAlign: 'center' }}>{doc.unidades_a_recibir}</td>
                            </tr>
                          ))}
                          {roturasList.length === 0 && (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay datos.</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: ENTRADAS */}
          {activeNav === 'entradas' && (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h3>Documentos de Recepción</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    onClick={() => setSelectedTipoDoc('2')}
                    style={{ background: selectedTipoDoc === '2' ? 'var(--primary)' : 'transparent', color: selectedTipoDoc === '2' ? 'white' : 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: selectedTipoDoc === '2' ? 'bold' : 'normal' }}
                  >Pedidos a Proveedores</button>
                  <button 
                    onClick={() => setSelectedTipoDoc('3')}
                    style={{ background: selectedTipoDoc === '3' ? 'var(--primary)' : 'transparent', color: selectedTipoDoc === '3' ? 'white' : 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: selectedTipoDoc === '3' ? 'bold' : 'normal' }}
                  >Albaranes de Entrada</button>
                </div>
              </div>
              <div className="table-container" style={{ flex: 1 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Fecha</th>
                      <th>Entidad (Proveedor)</th>
                      <th>Líneas</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboundLoading ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Cargando documentos...</td></tr>
                    ) : inboundList.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay documentos pendientes.</td></tr>
                    ) : (
                      inboundList.map((doc, idx) => (
                        <tr key={idx} onClick={() => setSelectedDoc({...doc, _tipo: 'inbound'})} style={{ cursor: 'pointer' }}>
                          <td className="mono" style={{ fontWeight: 'bold' }}>{doc.numdocumento}</td>
                          <td>{formatDate(doc.fechadocumento)}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{doc.codentidad}</span>
                              <span style={{ fontWeight: '500' }}>{doc.nombrecomercial}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-info">{doc.numlineas || 0}</span>
                          </td>
                          <td><span className="badge badge-warning">{doc.estado}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: DEVOLUCIONES */}
          {activeNav === 'devoluciones' && (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h3>Gestión de Devoluciones</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    onClick={() => setSelectedTipoDoc('7')}
                    style={{ background: selectedTipoDoc === '7' ? 'var(--primary)' : 'transparent', color: selectedTipoDoc === '7' ? 'white' : 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: selectedTipoDoc === '7' ? 'bold' : 'normal' }}
                  >Devoluciones de Clientes</button>
                  <button 
                    onClick={() => setSelectedTipoDoc('5')}
                    style={{ background: selectedTipoDoc === '5' ? 'var(--primary)' : 'transparent', color: selectedTipoDoc === '5' ? 'white' : 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: selectedTipoDoc === '5' ? 'bold' : 'normal' }}
                  >Devoluciones a Proveedores</button>
                </div>
              </div>
              <div className="table-container" style={{ flex: 1 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Fecha</th>
                      <th>Entidad (Cliente/Proveedor)</th>
                      <th>Líneas</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboundLoading ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Cargando documentos...</td></tr>
                    ) : inboundList.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay documentos pendientes.</td></tr>
                    ) : (
                      inboundList.map((doc, idx) => (
                        <tr key={idx} onClick={() => setSelectedDoc({...doc, _tipo: 'inbound'})} style={{ cursor: 'pointer' }}>
                          <td className="mono" style={{ fontWeight: 'bold' }}>{doc.numdocumento}</td>
                          <td>{formatDate(doc.fechadocumento)}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{doc.codentidad}</span>
                              <span style={{ fontWeight: '500' }}>{doc.nombrecomercial}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-info">{doc.numlineas || 0}</span>
                          </td>
                          <td><span className="badge badge-warning">{doc.estado}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: SALIDAS */}
          {activeNav === 'salidas' && (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h3>Expediciones Pendientes</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {outboundEstados.map(est => (
                    <button 
                      key={est.codestadodocumento}
                      onClick={() => setSelectedOutboundEstado(est.codestadodocumento.toString())}
                      style={{ 
                        background: selectedOutboundEstado === est.codestadodocumento.toString() ? 'var(--primary)' : 'transparent', 
                        color: selectedOutboundEstado === est.codestadodocumento.toString() ? 'white' : 'var(--text-main)', 
                        border: '1px solid var(--border-color)', 
                        padding: '0.4rem 0.75rem', 
                        borderRadius: '4px', 
                        cursor: 'pointer', 
                        fontSize: '0.8rem', 
                        fontWeight: selectedOutboundEstado === est.codestadodocumento.toString() ? 'bold' : 'normal' 
                      }}
                    >
                      {est.descripcionpantalla}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-container" style={{ flex: 1 }}>
                {outboundLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Población</th>
                        <th>Líneas</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outboundList.map((doc, i) => (
                        <tr key={i} onClick={() => setSelectedDoc({...doc, _tipo: 'outbound'})} style={{ cursor: 'pointer' }}>
                          <td className="mono" style={{ fontWeight: '500' }}>{doc.numdocumento}</td>
                          <td>{formatDate(doc.fechadocumento)}</td>
                          <td>
                            <span style={{ fontWeight: '500' }}>{doc.nombrecomercial}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.codcliente}</div>
                          </td>
                          <td>{doc.poblacion}</td>
                          <td>{doc.numlineas}</td>
                          <td>
                            <span className="badge badge-info">
                              {doc.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {outboundList.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay datos.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* VIEW: INVENTARIO */}
          {activeNav === 'inventario' && (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h3>Estado del Stock</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { key: 'stock', label: 'Stock por Ubicación' },
                    { key: 'movimientos', label: 'Movimientos' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActivoInventarioTab(key)}
                      style={{
                        background: activoInventarioTab === key ? 'var(--primary)' : 'transparent',
                        color: activoInventarioTab === key ? 'white' : 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: activoInventarioTab === key ? 'bold' : 'normal',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                {activoInventarioTab === 'stock'       && <StockUbicacion />}
                {activoInventarioTab === 'movimientos' && <MovimientosStock />}
              </div>
            </div>
          )}

          {/* VIEW: INFORMES */}
          {activeNav === 'informes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
              {/* Pestañas de Informes */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { key: 'sql', label: 'Consultas SQL' },
                  { key: 'productividad', label: 'Productividad' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveInformesTab(key)}
                    style={{
                      background: activeInformesTab === key ? 'var(--primary)' : 'transparent',
                      color: activeInformesTab === key ? 'white' : 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: activeInformesTab === key ? 'bold' : 'normal',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Pestaña: Productividad */}
              {activeInformesTab === 'productividad' && (
                <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="card-header">
                    <h3>Productividad de Operadores</h3>
                  </div>
                  <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <ProductividadOperadores />
                  </div>
                </div>
              )}

              {/* Pestaña: SQL (contenido original) */}
              {activeInformesTab === 'sql' && (
                <div style={{ display: 'flex', gap: '1.5rem', flex: 1 }}>
                  <div className="card" style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header">
                      <h3>Mis Consultas</h3>
                      {isAdmin && (
                        <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => { setActiveInforme({ id: null, nombre: 'Nuevo', sql: '', coddeffiltro: '' }); setInformeResults(null); }}>
                          <PlusCircle size={16} />
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
                      {informesList.map(inf => (
                        <div 
                          key={inf.id} 
                          onClick={() => { 
                            setActiveInforme(inf); 
                            setInformeResults(null); 
                            setSearchTerm('');
                            setCustomFiltros({});
                            setSelectedInformeFiltro('');
                            if (inf.coddeffiltro) fetchFiltrosForInforme(inf.coddeffiltro); 
                          }}
                          style={{ 
                            padding: '0.75rem', 
                            background: activeInforme?.id === inf.id ? 'var(--bg-card-hover)' : 'transparent',
                            borderLeft: activeInforme?.id === inf.id ? '3px solid var(--primary)' : '3px solid transparent',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          <div style={{ fontWeight: '500' }}>{inf.nombre}</div>
                          {inf.coddeffiltro && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Def: {inf.coddeffiltro}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activeInforme ? (
                      <>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label>Nombre del Informe</label>
                            <input type="text" readOnly={!isAdmin} value={activeInforme.nombre} onChange={e => setActiveInforme({...activeInforme, nombre: e.target.value})} />
                          </div>
                          <div className="form-group" style={{ width: '120px' }}>
                            <label>CodDefFiltro</label>
                            <input type="text" readOnly={!isAdmin} value={activeInforme.coddeffiltro || ''} onChange={e => { setActiveInforme({...activeInforme, coddeffiltro: e.target.value}); fetchFiltrosForInforme(e.target.value); }} />
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label>SQL Query <span style={{ color: 'var(--text-muted)' }}>(Usa {'{FILTROS_DINAMICOS}'})</span></label>
                          <textarea 
                            rows="6"
                            className="mono"
                            readOnly={!isAdmin}
                            value={activeInforme.sql}
                            onChange={e => setActiveInforme({...activeInforme, sql: e.target.value})}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div className="form-group" style={{ flex: 1, marginRight: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                              <label>Inyectar Filtro:</label>
                              <select value={selectedInformeFiltro} onChange={e => setSelectedInformeFiltro(e.target.value)} style={{ width: 'auto' }}>
                                <option value="">-- Ninguno --</option>
                                {definicionFiltros.length > 0 && <option value="custom">-- Personalizado --</option>}
                                {informeFiltrosOpt.map(f => <option key={f.codfiltro} value={f.codfiltro}>{f.descripcion}</option>)}
                              </select>
                              {selectedInformeFiltro === "custom" && isAdmin && (
                                <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={handleSaveCustomFiltro}>
                                  Guardar como Nuevo Filtro
                                </button>
                              )}
                            </div>
                            
                            {/* Custom Filters UI */}
                            {selectedInformeFiltro === "custom" && definicionFiltros.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-card-hover)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                                {definicionFiltros.map(def => (
                                  <div key={def.CODDEFCAMPO} className="form-group" style={{ minWidth: '150px' }}>
                                    <label style={{ fontSize: '0.8rem' }}>{def.DESCRIPCIONCAMPO}</label>
                                    <input 
                                      type="text" 
                                      value={customFiltros[def.CODDEFCAMPO] || ''} 
                                      onChange={e => setCustomFiltros({...customFiltros, [def.CODDEFCAMPO]: e.target.value})}
                                      placeholder={def.DATAFIELD}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start' }}>
                            {isAdmin && <button className="btn-secondary" onClick={handleSaveInforme}>Guardar</button>}
                            <button className="btn-primary" onClick={handleRunInforme} disabled={informeLoading}>
                              <Database size={16} /> Ejecutar
                            </button>
                          </div>
                        </div>

                        {informeError && <div className="text-danger" style={{ background: 'rgba(220, 38, 38, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>{informeError}</div>}

                        {informeResults && (
                          <div className="table-container" style={{ flex: 1, marginTop: '1rem', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>{informeResults.total} resultados</h4>
                                <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={handleExportExcel}>
                                  <Download size={14} /> Exportar CSV
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card-hover)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}>
                                <Search size={16} color="var(--text-muted)" />
                                <input 
                                  type="text" 
                                  placeholder="Buscar en la tabla..." 
                                  value={searchTerm}
                                  onChange={e => setSearchTerm(e.target.value)}
                                  style={{ border: 'none', background: 'transparent', outline: 'none', color: 'white', minWidth: '200px' }}
                                />
                              </div>
                            </div>
                            <div className="ag-theme-alpine-dark" style={{ flex: 1, width: '100%', minHeight: '400px' }}>
                              <AgGridReact
                                ref={gridRef}
                                rowData={informeResults.data}
                                columnDefs={informeResults.columns.map(c => ({
                                  headerName: c,
                                  field: c,
                                  sortable: true,
                                  filter: true,
                                  resizable: true,
                                  flex: 1,
                                  minWidth: 150,
                                  valueFormatter: params => formatDate(params.value)
                                }))}
                                pagination={true}
                                paginationPageSize={50}
                                quickFilterText={searchTerm}
                                domLayout="normal"
                                localeText={{ noRowsToShow: 'No hay datos para mostrar' }}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ margin: 'auto', color: 'var(--text-muted)', textAlign: 'center' }}>
                        <FileText size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>Selecciona o crea un informe para comenzar</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Drawer: Detalle de documento (Entradas / Salidas) */}
          {selectedDoc && (
            <DetalleDocumento
              documento={selectedDoc}
              tipo={selectedDoc._tipo}
              showCodFabricante={showCodFabricante}
              onClose={() => setSelectedDoc(null)}
            />
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
