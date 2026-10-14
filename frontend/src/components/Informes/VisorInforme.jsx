import React, { useState, useEffect, useRef, useMemo } from 'react';
import adminApi from '../../api/adminApi';
import { FileText, Play, Download, Search } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { formatDate } from '../../utils/formatDate';
import FiltrosDinamicos from './FiltrosDinamicos';
import { exportGridToExcel } from '../../utils/exportExcel';

export default function VisorInforme({ isAdmin }) {
  const [informes, setInformes] = useState([]);
  const [activeInforme, setActiveInforme] = useState(null);
  
  const [customFiltros, setCustomFiltros] = useState({});
  const [selectedCodfiltro, setSelectedCodfiltro] = useState(null);
  
  const [informeResults, setInformeResults] = useState(null);
  const [informeLoading, setInformeLoading] = useState(false);
  const [informeError, setInformeError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const gridRef = useRef();

  useEffect(() => {
    fetchInformes();
  }, [isAdmin]);

  const fetchInformes = async () => {
    try {
      const url = isAdmin ? '/informes-config' : '/informes-config?solo_visibles=1';
      const res = await adminApi.get(url);
      if (res.data?.status === 'success') {
        setInformes(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunInforme = async () => {
    if (!activeInforme) return;
    setInformeLoading(true);
    setInformeError('');
    setInformeResults(null);
    try {
      const payload = { id_informe: activeInforme.ID };
      
      if (selectedCodfiltro) {
        payload.codfiltro = selectedCodfiltro;
      } else {
        payload.custom_filters = customFiltros;
      }

      const res = await adminApi.post('/informes-config/ejecutar', payload);
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

  const handleExportExcel = () => {
    if (gridRef.current && gridRef.current.api) {
      const filename = (activeInforme?.NOMBRE || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      exportGridToExcel(gridRef.current.api, `informe_${filename}`);
    }
  };

  const groupedInformes = useMemo(() => {
    return informes.reduce((acc, inf) => {
      const cat = inf.CATEGORIA || 'Otros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(inf);
      return acc;
    }, {});
  }, [informes]);

  const columnDefs = useMemo(() => {
    if (!informeResults) return [];
    
    if (activeInforme?.COLUMNAS_CONFIG && activeInforme.COLUMNAS_CONFIG.length > 0) {
      let conf = activeInforme.COLUMNAS_CONFIG;
      if (typeof conf === 'string') {
        try { conf = JSON.parse(conf); } catch (e) { conf = []; }
      }
      if (Array.isArray(conf) && conf.length > 0) {
        return conf.map(c => ({
          ...c,
          valueFormatter: c.valueFormatter === 'date' ? params => formatDate(params.value) : undefined
        }));
      }
    }

    return informeResults.columns.map(c => ({
      headerName: c,
      field: c,
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      minWidth: 150,
      valueFormatter: params => {
        if (c.toLowerCase().includes('fecha')) return formatDate(params.value);
        return params.value;
      }
    }));
  }, [informeResults, activeInforme]);

  return (
    <div style={{ display: 'flex', gap: '1.5rem', flex: 1, height: '100%' }}>
      <div className="card" style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <h3>Informes</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {Object.entries(groupedInformes).map(([categoria, items]) => (
            <div key={categoria}>
              <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-dark)', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {categoria.toUpperCase()}
              </div>
              {items.map(inf => (
                <div 
                  key={inf.ID} 
                  onClick={() => {
                    setActiveInforme(inf);
                    setInformeResults(null);
                    setCustomFiltros({});
                    setSelectedCodfiltro(null);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: activeInforme?.ID === inf.ID ? 'var(--bg-card-hover)' : 'transparent',
                    borderLeft: activeInforme?.ID === inf.ID ? '3px solid var(--primary)' : '3px solid transparent',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{inf.TITULO}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inf.DESCRIPCION}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'hidden' }}>
        {activeInforme ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>{activeInforme.TITULO}</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>{activeInforme.DESCRIPCION}</p>
            
            {activeInforme.CODDEFFILTRO && (
              <FiltrosDinamicos 
                coddeffiltro={activeInforme.CODDEFFILTRO}
                onFiltroChange={setCustomFiltros}
                onFiltroGuardadoSelect={setSelectedCodfiltro}
                isAdmin={isAdmin}
              />
            )}

            <div style={{ marginBottom: '1rem' }}>
              <button className="btn-primary" onClick={handleRunInforme} disabled={informeLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Play size={16} /> Ejecutar Informe
              </button>
            </div>

            {informeError && <div className="text-danger" style={{ background: 'rgba(220, 38, 38, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>{informeError}</div>}

            {informeResults && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{informeResults.total} resultados</span>
                    <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={handleExportExcel}>
                      <Download size={14} /> Exportar Excel
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
                <div className="ag-theme-alpine-dark" style={{ flex: 1, width: '100%' }}>
                  <AgGridReact
                    ref={gridRef}
                    rowData={informeResults.data}
                    columnDefs={columnDefs}
                    pagination={true}
                    paginationPageSize={50}
                    quickFilterText={searchTerm}
                    domLayout="normal"
                    localeText={{ noRowsToShow: 'No hay datos para mostrar' }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ margin: 'auto', color: 'var(--text-muted)', textAlign: 'center' }}>
            <FileText size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>Selecciona un informe para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
}
