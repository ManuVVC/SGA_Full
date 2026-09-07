import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../api/adminApi';
import { Activity, Download, RefreshCw } from 'lucide-react';
import { formatDate } from '../utils/formatDate';

export default function Dashboard() {
  const navigate = useNavigate();
  const gridRef = useRef();
  
  const [dashboardStats, setDashboardStats] = useState({
    entradas_pendientes: 0,
    entradas_curso: 0,
    salidas_pendientes: 0,
    salidas_curso: 0,
    palets_almacenes: [],
    roturas_stock: 0
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [activeDashboardView, setActiveDashboardView] = useState(null); // 'caducidades' | 'roturas' | null
  const [roturasList, setRoturasList] = useState([]);
  const [roturasLoading, setRoturasLoading] = useState(false);
  const [caducidadesList, setCaducidadesList] = useState([]);
  const [caducidadesMeses, setCaducidadesMeses] = useState(1);
  const [showCodFabricante, setShowCodFabricante] = useState(false);

  const fetchDashboardStats = async () => {
    setDashboardLoading(true);
    setDashboardError('');
    try {
      const res = await adminApi.get('/dashboard/stats');
      if (res.data?.status === 'success') {
        setDashboardStats(res.data.data);
      }
    } catch (e) {
      console.error(e);
      setDashboardError('Error al cargar estadísticas del dashboard');
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchCaducidades = async (meses = caducidadesMeses) => {
    try {
      const res = await adminApi.get(`/dashboard/caducidades?meses=${meses}`);
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
      const res = await adminApi.get('/dashboard/roturas');
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

  useEffect(() => {
    fetchDashboardStats();
    fetchCaducidades();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchDashboardStats();
      fetchCaducidades(caducidadesMeses);
    }, 60000);
    return () => clearInterval(intervalId);
  }, [caducidadesMeses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {dashboardError && <div className="badge badge-warning" style={{ alignSelf: 'flex-start' }}>{dashboardError}</div>}
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
        <div className="stat-box" onClick={() => navigate('/entradas')} style={{ cursor: 'pointer' }}>
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
        <div className="stat-box" onClick={() => navigate('/salidas')} style={{ cursor: 'pointer' }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
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
                <Download size={14} /> Exportar CSV
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
                <Download size={14} /> Exportar CSV
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
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Cód. Artículo</th>
                    <th>Artículo</th>
                    <th style={{ textAlign: 'center' }}>Uds. a Servir</th>
                    <th style={{ textAlign: 'center' }}>Uds. a Recibir</th>
                  </tr>
                </thead>
                <tbody>
                  {roturasList.map((doc, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{doc.numdocumento}</td>
                      <td className="mono">{doc.codclienteaplicacion}</td>
                      <td className="mono" style={{ fontWeight: '500' }}>{doc.codarticuloaplicacion}</td>
                      <td>{doc.nombrearticulo}</td>
                      <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold' }}>{doc.unidades_a_servir}</td>
                      <td style={{ textAlign: 'center' }}>{doc.unidades_a_recibir}</td>
                    </tr>
                  ))}
                  {roturasList.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay datos.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
