import React, { useState, useRef } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Download } from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return dateStr ?? '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})( \d{2}:\d{2}:\d{2})?$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}${match[4] || ''}`;
  return dateStr;
};

const todayStr = () => new Date().toISOString().split('T')[0];

const columnDefs = [
  { headerName: 'Operador',           field: 'operador',           flex: 1.2, sortable: true, filter: true },
  { headerName: 'Lineas Preparadas',  field: 'lineas_preparadas',  flex: 0.9, sortable: true, filter: 'agNumberColumnFilter', type: 'numericColumn' },
  { headerName: 'Unidades Totales',   field: 'unidades_totales',   flex: 0.9, sortable: true, filter: 'agNumberColumnFilter', type: 'numericColumn', sort: 'desc' },
  { headerName: 'Primera Actividad',  field: 'primera_actividad',  flex: 1,   sortable: true, filter: 'agDateColumnFilter',   valueFormatter: (p) => formatDate(p.value) },
  { headerName: 'Ultima Actividad',   field: 'ultima_actividad',   flex: 1,   sortable: true, filter: 'agDateColumnFilter',   valueFormatter: (p) => formatDate(p.value) },
];

const labelStyle = { display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' };
const inputStyle = { padding: '0.35rem 0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontSize: '0.85rem' };

/**
 * ProductividadOperadores
 * Informe de productividad de operadores filtrado por rango de fechas.
 */
export default function ProductividadOperadores() {
  const gridRef = useRef();
  const [fechaDesde, setFechaDesde] = useState(todayStr());
  const [fechaHasta, setFechaHasta] = useState(todayStr());
  const [rowData, setRowData]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [searched, setSearched]     = useState(false);

  const fetchProductividad = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
      const res = await axios.get(`/admin/estadisticas/operadores?${params.toString()}`);
      setRowData(res.data?.data || []);
      setSearched(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al cargar los datos de productividad');
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = () => gridRef.current?.api?.exportDataAsCsv({ fileName: 'productividad_operadores.csv' });

  const totalLineas   = rowData.reduce((acc, r) => acc + (r.lineas_preparadas  ?? 0), 0);
  const totalUnidades = rowData.reduce((acc, r) => acc + (r.unidades_totales ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', padding: '0.75rem 1rem', background: 'var(--bg-card-hover)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <label style={labelStyle}>
          Fecha desde
          <input type="date" value={fechaDesde} max={fechaHasta} onChange={(e) => setFechaDesde(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Fecha hasta
          <input type="date" value={fechaHasta} min={fechaDesde} onChange={(e) => setFechaHasta(e.target.value)} style={inputStyle} />
        </label>
        <button onClick={fetchProductividad} disabled={loading}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.42rem 1rem', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 'bold', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Cargando...' : 'Buscar'}
        </button>
        {rowData.length > 0 && (
          <button onClick={handleExportar}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem' }}>
            <Download size={14} /> Exportar CSV
          </button>
        )}
      </div>

      {searched && !loading && rowData.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <StatCard label="Operadores" value={rowData.length} />
          <StatCard label="Total lineas preparadas" value={totalLineas.toLocaleString()} />
          <StatCard label="Total unidades" value={totalUnidades.toLocaleString()} />
        </div>
      )}

      {error && <div style={{ background: 'rgba(192,24,24,0.12)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '4px', fontSize: '0.85rem' }}>{error}</div>}

      {searched && (
        <div className="ag-theme-alpine-dark" style={{ flex: 1, width: '100%', minHeight: '300px' }}>
          <AgGridReact ref={gridRef} rowData={rowData} columnDefs={columnDefs} pagination={true} paginationPageSize={50} domLayout="normal" rowHeight={40} headerHeight={45} localeText={{ noRowsToShow: 'No hay datos para mostrar' }} />
        </div>
      )}

      {!searched && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Selecciona el rango de fechas y pulsa Buscar.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem 1rem', minWidth: '130px' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--primary)' }}>{value}</div>
    </div>
  );
}
