import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, 
  Package, FileText, Settings, LogOut, Box, RotateCcw,
  Menu, X, Map
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ 
  children, setIsLoggedIn, username, selectedConexion 
}) {
  const location = useLocation();
  const activeNav = location.pathname.split('/')[1] || 'dashboard';

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && !isSidebarOpen) {
        // En desktop mantenemos el estado actual que tenga
      } else if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebarOnMobile = () => { if (isMobile) setIsSidebarOpen(false); };

  return (
    <div className="app-container">
      {/* OVERLAY PARA MÓVIL */}
      {isMobile && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-icon"><Package size={20} /></div>
          <div className="logo-text"><h1>SGA Core</h1></div>
          {isMobile && (
            <button className="mobile-close-btn" onClick={toggleSidebar}>
              <X size={24} />
            </button>
          )}
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" onClick={closeSidebarOnMobile} className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`} style={{textDecoration: 'none', color: 'inherit'}}>
            <LayoutDashboard size={20} className="shrink-0" /> <span className="nav-text">Dashboard</span>
          </Link>
          <Link to="/entradas" onClick={closeSidebarOnMobile} className={`nav-item ${activeNav === 'entradas' ? 'active' : ''}`} style={{textDecoration: 'none', color: 'inherit'}}>
            <ArrowDownToLine size={20} className="shrink-0" /> <span className="nav-text">Entradas</span>
          </Link>
          <Link to="/salidas" onClick={closeSidebarOnMobile} className={`nav-item ${activeNav === 'salidas' ? 'active' : ''}`} style={{textDecoration: 'none', color: 'inherit'}}>
            <ArrowUpFromLine size={20} className="shrink-0" /> <span className="nav-text">Salidas</span>
          </Link>
          <Link to="/devoluciones" onClick={closeSidebarOnMobile} className={`nav-item ${activeNav === 'devoluciones' ? 'active' : ''}`} style={{textDecoration: 'none', color: 'inherit'}}>
            <RotateCcw size={20} className="shrink-0" /> <span className="nav-text">Devoluciones</span>
          </Link>
          <Link to="/inventario" onClick={closeSidebarOnMobile} className={`nav-item ${activeNav === 'inventario' ? 'active' : ''}`} style={{textDecoration: 'none', color: 'inherit'}}>
            <Box size={20} className="shrink-0" /> <span className="nav-text">Inventario</span>
          </Link>
          <Link to="/mapa" onClick={closeSidebarOnMobile} className={`nav-item ${activeNav === 'mapa' ? 'active' : ''}`} style={{textDecoration: 'none', color: 'inherit'}}>
            <Map size={20} className="shrink-0" /> <span className="nav-text">Mapa Almacén</span>
          </Link>
          <Link to="/informes" onClick={closeSidebarOnMobile} className={`nav-item ${activeNav === 'informes' ? 'active' : ''}`} style={{textDecoration: 'none', color: 'inherit'}}>
            <FileText size={20} className="shrink-0" /> <span className="nav-text">Informes</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <div className="nav-item" onClick={() => setIsLoggedIn(false)}>
            <LogOut size={20} className="shrink-0" /> <span className="nav-text">Cerrar Sesión</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="hamburger-btn" onClick={toggleSidebar}>
              <Menu size={24} />
            </button>
            <div className="topbar-title">
              {activeNav === 'dashboard' && 'Visión Global del Almacén'}
              {activeNav === 'entradas' && 'Gestión de Recepciones'}
              {activeNav === 'salidas' && 'Gestión de Expediciones'}
              {activeNav === 'devoluciones' && 'Gestión de Devoluciones'}
              {activeNav === 'inventario' && 'Estado del Stock'}
              {activeNav === 'informes' && 'Informes Manuales'}
            </div>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="badge badge-info hide-on-mobile">{username}@{selectedConexion}</div>
            <Settings size={20} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
}
