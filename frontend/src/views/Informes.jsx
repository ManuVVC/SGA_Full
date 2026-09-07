import React, { useState, useEffect, useRef } from 'react';
import adminApi from '../api/adminApi';
import { FileText, PlusCircle, Database, Download, Search } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { formatDate } from '../utils/formatDate';
import ProductividadOperadores from '../components/Estadisticas/ProductividadOperadores';

export default function Informes({ isAdmin }) {
  const gridRef = useRef();

  // Pestaña activa de informes: 'sql' | 'productividad'
  const [activeInformesTab, setActiveInformesTab] = useState('sql');
  
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

  const fetchInformesList = async () => {
    try {
      const res = await adminApi.get('/informes');
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
      const res = await adminApi.get(`/filtros?def=${coddef}`);
      if (res.data?.status === 'success') {
        setInformeFiltrosOpt(res.data.data.map(f => ({...f, codfiltro: f.CODFILTRO, descripcion: f.DESCRIPCION})));
      }
      const resDef = await adminApi.get(`/filtros/definicion?def=${coddef}`);
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

      const res = await adminApi.post('/informes/ejecutar', payload);
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
      const res = await adminApi.post('/informes', activeInforme);
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
      const res = await adminApi.post('/filtros', {
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
    fetchInformesList();
  }, []);

  return (
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

      {/* Pestaña: SQL */}
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
  );
}
