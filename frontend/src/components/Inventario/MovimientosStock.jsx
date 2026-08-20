import React, { useState } from 'react';
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

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const todayStr = () => new Date().toISOString().split('T')[0];

const columnDefs = [
  { headerName: 'Fecha',          field: 'fechaejecutiva',  flex: 0.8, sortable: true, filter: 'agDateColumnFilter', valueFormatter: (p) => formatDate(p.value) },
  { headerName: 'Tipo',           field: 'tipo',            flex: 0.7, sortable: true, filter: true },
  { headerName: 'Concepto',       field: 'concepto',        flex: 1.5, sortable: true, filter: true },
  { headerName: 'Cod. Articulo',  field: 'codarticulo',     flex: 0.9, sortable: true, filter: true },
  { headerName: 'Articulo',       field: 'nombrearticulo',  flex: 1.5, sortable: true, filter: true },
  { headerName: 'Unidades',       field: 'unidades',        flex: 0.6, sortable: true, filter: 'agNumberColumnFilter' },
  { headerName: 'Almacen',        field: 'codalmacen',      flex: 0.8, sortable: true, filter: true },
  { headerName: 'Operador',       field: 'codoperador',     flex: 0.8, sortable: true, filter: true },
];

const rowClassRules = {
  'mov-entrada': (params) => { const t = (params.data?.tipo ?? '').toLowerCase(); return t === 'entrada' || t === 'e'; },
  'mov-salida':  (params) => { const t = (params.data?.tipo ?? '').toLowerCase(); return t === 'salida'  || t === 's'; },
};

const inputStyle = { padding: '0.35rem 0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontSize: '0.85rem' };

export default function MovimientosStock() {
  const gridRef = React.useRef();
  const [fechaDesde, setFechaDesde] = useState(daysAgo(7));
  const [fechaHasta, setFechaHasta] = useState(todayStr());
  const [almacen, setAlmacen]       = useState('');
  const [almacenes, setAlmacenes]   = useState([{ codigo: '', nombre: 'Todos los almacenes' }]);
  
  const [concepto, setConcepto]     = useState('');
  const [conceptos, setConceptos]   = useState([{ codigo: '', nombre: 'Todos los conceptos' }]);
  const [operador, setOperador]     = useState('');
  const [articulo, setArticulo]     = useState('');

  const [rowData, setRowData]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [searched, setSearched]     = useState(false);

  React.useEffect(() => {
    // Cargar almacenes
    axios.get('/admin/almacenes').then(res => {
      if (res.data?.status === 'success') {
        const loaded = res.data.data.map(a => ({
          codigo: String(a.codalmacen),
          nombre: a.descripcion
        }));
        setAlmacenes([{ codigo: '', nombre: 'Todos los almacenes' }, ...loaded]);
      }
    }).catch(console.error);
    
    // Cargar conceptos estadisticos
    axios.get('/admin/conceptos-estadisticos').then(res => {
      if (res.data?.status === 'success') {
        const loaded = res.data.data.map(c => ({
          codigo: String(c.codconceptoestadistico),
          nombre: c.descripcion
        }));
        setConceptos([{ codigo: '', nombre: 'Todos los conceptos' }, ...loaded]);
      }
    }).catch(console.error);
  }, []);

  const fetchMovimientos = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append('fecha_desde', fechaDesde);
      if (fechaHasta) params.append('fecha_hasta', fechaHasta);
      if (almacen)    params.append('almacen', almacen);
      if (concepto)   params.append('concepto', concepto);
      if (operador)   params.append('operador', operador);
      if (articulo)   params.append('articulo', articulo);

      const res = await axios.get(`/admin/inventario/movimientos?${params.toString()}`);
      setRowData(res.data?.data || []);
      setSearched(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = () => gridRef.current?.api?.exportDataAsCsv({ fileName: 'movimientos_stock.csv' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <style>{`
        .ag-theme-alpine-dark .mov-entrada { background-color: #14301a !important; color: #4ade80 !important; }
        .ag-theme-alpine-dark .mov-entrada:hover { background-color: #1b4023 !important; color: #4ade80 !important; }
        .ag-theme-alpine-dark .mov-salida  { background-color: #381515 !important; color: #f87171 !important; }
        .ag-theme-alpine-dark .mov-salida:hover  { background-color: #4a1c1c !important; color: #f87171 !important; }
      `}</style>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', padding: '0.75rem 1rem', background: 'var(--bg-card-hover)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Fecha desde
          <input type="date" value={fechaDesde} max={fechaHasta} onChange={(e) => setFechaDesde(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Fecha hasta
          <input type="date" value={fechaHasta} min={fechaDesde} onChange={(e) => setFechaHasta(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Artículo
          <input type="text" value={articulo} onChange={(e) => setArticulo(e.target.value)} placeholder="Código o nombre" style={{...inputStyle, width: '130px'}} onKeyDown={(e) => e.key === 'Enter' && fetchMovimientos()} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Almacén
          <select value={almacen} onChange={(e) => setAlmacen(e.target.value)} style={inputStyle}>
            {almacenes.map((alm) => <option key={alm.codigo} value={alm.codigo}>{alm.nombre}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Concepto
          <select value={concepto} onChange={(e) => setConcepto(e.target.value)} style={{...inputStyle, maxWidth: '250px'}}>
            {conceptos.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Operador
          <input type="text" value={operador} onChange={(e) => setOperador(e.target.value)} placeholder="Ej: 7" style={{...inputStyle, width: '80px'}} onKeyDown={(e) => e.key === 'Enter' && fetchMovimientos()} />
        </label>
        <button onClick={fetchMovimientos} disabled={loading}
          style={{ alignSelf: 'flex-end', background: 'var(--primary)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 'bold', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
        {rowData.length > 0 && (
          <button onClick={handleExportar}
            style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem' }}>
            <Download size={14} /> Exportar CSV
          </button>
        )}
        {searched && !loading && (
          <span style={{ alignSelf: 'flex-end', fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {rowData.length} movimiento{rowData.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>



      {error && <div style={{ background: 'rgba(192,24,24,0.12)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '4px', fontSize: '0.85rem' }}>{error}</div>}

      {searched && (
        <div className="ag-theme-alpine-dark" style={{ flex: 1, width: '100%', minHeight: '350px' }}>
          <AgGridReact ref={gridRef} rowData={rowData} columnDefs={columnDefs} rowClassRules={rowClassRules} pagination={true} paginationPageSize={50} domLayout="normal" rowHeight={38} headerHeight={44} localeText={{ noRowsToShow: 'No hay datos para mostrar' }} />
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
