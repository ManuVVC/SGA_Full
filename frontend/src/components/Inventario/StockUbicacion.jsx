import React, { useState } from 'react';
import axios from 'axios';
import { Download } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import DetalleStock from './DetalleStock';

const columnDefs = [
  { headerName: 'Ubicación',     field: 'ubicacion',      flex: 1, sortable: true, filter: true },
  { headerName: 'Cód. Artículo', field: 'codarticulo',    flex: 1, sortable: true, filter: true },
  { headerName: 'Artículo',      field: 'nombrearticulo', flex: 2, sortable: true, filter: true },
  { headerName: 'Lote',          field: 'lote',           flex: 1, sortable: true, filter: true },
  { headerName: 'Stock',         field: 'stock',          flex: 1, sortable: true, filter: 'agNumberColumnFilter' },
  { headerName: 'Cajas',         field: 'cajas',          flex: 1, sortable: true, filter: 'agNumberColumnFilter' },
  { headerName: 'F. Caducidad',  field: 'fechacaducidad', flex: 1, sortable: true, filter: 'agDateColumnFilter' },
];

const rowClassRules = {
  'expired-row': (params) => {
    if (!params.data?.fechacaducidad) return false;
    try {
      const parts = params.data.fechacaducidad.split('/');
      if (parts.length !== 3) return false;
      const rowDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      const today = new Date().toISOString().split('T')[0];
      return rowDate < today;
    } catch { return false; }
  }
};

const inputStyle = { padding: '0.4rem 0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontSize: '0.9rem' };

export default function StockUbicacion() {
  const gridRef = React.useRef();
  const [q, setQ]                   = useState('');
  const [almacen, setAlmacen]       = useState('');
  const [almacenes, setAlmacenes]   = useState([{ codigo: '', nombre: 'Todos los almacenes' }]);
  
  const [rowData, setRowData]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  
  // Paginación
  const [pagina, setPagina]         = useState(1);
  const [totalResultados, setTotal] = useState(0);
  const TAMANO_PAGINA = 50;
  
  const [searched, setSearched]     = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  React.useEffect(() => {
    axios.get('/admin/almacenes').then(res => {
      if (res.data?.status === 'success') {
        const loaded = res.data.data.map(a => ({
          codigo: String(a.codalmacen),
          nombre: a.descripcion
        }));
        setAlmacenes([{ codigo: '', nombre: 'Todos los almacenes' }, ...loaded]);
      }
    }).catch(console.error);
  }, []);

  const fetchStock = async (pag = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ pagina: pag, tamano: TAMANO_PAGINA });
      if (q) params.append('q', q);
      if (almacen) params.append('almacen', almacen);

      const res = await axios.get(`/admin/inventario/stock?${params.toString()}`);
      setRowData(res.data?.data || []);
      setTotal(res.data?.total || 0);
      setPagina(pag);
      setSearched(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al cargar el stock');
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = () => { gridRef.current?.api.exportDataAsCsv({ fileName: 'stock.csv' }); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, color: 'var(--text-muted)' }}>
          Búsqueda de Artículo
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código o nombre..." style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && fetchStock(1)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, color: 'var(--text-muted)' }}>
          Almacén
          <select value={almacen} onChange={(e) => setAlmacen(e.target.value)} style={inputStyle}>
            {almacenes.map((alm) => <option key={alm.codigo} value={alm.codigo}>{alm.nombre}</option>)}
          </select>
        </label>
        <button onClick={() => fetchStock(1)} disabled={loading}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && <div style={{ background: 'rgba(192,24,24,0.12)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '1rem', borderRadius: '4px' }}>{error}</div>}

      {searched && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Mostrando {rowData.length} de {totalResultados} resultados</span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {rowData.length > 0 && (
                <button onClick={handleExportar} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                  <Download size={16} /> Exportar CSV
                </button>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button disabled={pagina === 1 || loading} onClick={() => fetchStock(pagina - 1)} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', cursor: (pagina===1 || loading)?'not-allowed':'pointer' }}>Anterior</button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', color: 'var(--text-muted)' }}>Pág. {pagina}</span>
                <button disabled={rowData.length < TAMANO_PAGINA || loading} onClick={() => fetchStock(pagina + 1)} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', cursor: (rowData.length < TAMANO_PAGINA || loading)?'not-allowed':'pointer' }}>Siguiente</button>
              </div>
            </div>
          </div>
          <div className="ag-theme-alpine-dark" style={{ flex: 1, width: '100%', minHeight: '400px' }}>
            <AgGridReact 
              ref={gridRef} 
              rowData={rowData} 
              columnDefs={columnDefs} 
              rowClassRules={rowClassRules} 
              rowHeight={38} 
              headerHeight={44} 
              localeText={{ noRowsToShow: 'No hay stock' }}
              onRowClicked={(e) => setSelectedStock(e.data)}
            />
          </div>
        </>
      )}

      {!searched && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Usa los filtros para buscar stock.
        </div>
      )}
      
      <DetalleStock stock={selectedStock} onClose={() => setSelectedStock(null)} />
    </div>
  );
}

function paginBtn(disabled) {
  return { background: 'transparent', color: disabled ? 'var(--text-muted)' : 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.3rem 0.7rem', borderRadius: '4px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.82rem', opacity: disabled ? 0.5 : 1 };
}
