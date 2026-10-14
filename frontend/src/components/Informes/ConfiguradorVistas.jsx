import React, { useState, useEffect } from 'react';
import adminApi from '../../api/adminApi';
import { PlusCircle, Database, Trash2 } from 'lucide-react';

export default function ConfiguradorVistas({ onInformeUpdated }) {
  const [informes, setInformes] = useState([]);
  const [activeInforme, setActiveInforme] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [maestroFiltros, setMaestroFiltros] = useState([]);

  useEffect(() => {
    fetchInformes();
    fetchFiltrosMaestros();
  }, []);

  const fetchInformes = async () => {
    try {
      const res = await adminApi.get('/informes-config');
      if (res.data?.status === 'success') {
        setInformes(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFiltrosMaestros = async () => {
    try {
      const res = await adminApi.get('/filtros/maestros');
      if (res.data?.status === 'success') {
        setMaestroFiltros(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    try {
      let res;
      let payload = { ...activeInforme };
      if (typeof payload.COLUMNAS_CONFIG === 'string' && payload.COLUMNAS_CONFIG.trim() === '') {
        payload.COLUMNAS_CONFIG = null;
      } else if (typeof payload.COLUMNAS_CONFIG === 'string') {
        try {
          JSON.parse(payload.COLUMNAS_CONFIG);
        } catch(e) {
          console.error("El JSON de COLUMNAS_CONFIG es inválido");
        }
      }

      if (activeInforme.ID) {
        res = await adminApi.put(`/informes-config/${activeInforme.ID}`, payload);
      } else {
        res = await adminApi.post('/informes-config', payload);
      }
      
      if (res.data?.status === 'success') {
        fetchInformes();
        if (onInformeUpdated) onInformeUpdated();
        // Si era nuevo y se guardó, pasamos al informe guardado (idealmente con ID, pero recargamos)
        if (!activeInforme.ID && res.data.data) {
           setActiveInforme(res.data.data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    try {
      if (!activeInforme.ID) return;
      const res = await adminApi.delete(`/informes-config/${activeInforme.ID}`);
      if (res.data?.status === 'success') {
        setActiveInforme(null);
        setShowConfirmDelete(false);
        fetchInformes();
        if (onInformeUpdated) onInformeUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestExecute = () => {
    // Solo para previsualizar que la sintaxis no peta
    console.log("Función de prueba de ejecución clickeada");
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', flex: 1, height: '100%' }}>
      <div className="card" style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Informes</h3>
          <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => { setActiveInforme({ NOMBRE: '', TITULO: '', DESCRIPCION: '', CATEGORIA: 'Otros', SQL_QUERY: '', CODDEFFILTRO: '', COLUMNAS_CONFIG: '', ORDER_BY: '', VISIBLE_USUARIOS: 1 }); setShowConfirmDelete(false); }}>
            <PlusCircle size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', padding: '1rem' }}>
          {informes.map(inf => (
            <div 
              key={inf.ID} 
              onClick={() => { setActiveInforme(inf); setShowConfirmDelete(false); }}
              style={{ 
                padding: '0.75rem', 
                background: activeInforme?.ID === inf.ID ? 'var(--bg-card-hover)' : 'transparent',
                borderLeft: activeInforme?.ID === inf.ID ? '3px solid var(--primary)' : '3px solid transparent',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div style={{ fontWeight: '500' }}>{inf.TITULO}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inf.NOMBRE}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', overflowY: 'auto' }}>
        {activeInforme ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Nombre interno</label>
                <input type="text" value={activeInforme.NOMBRE || ''} onChange={e => setActiveInforme({...activeInforme, NOMBRE: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Título público</label>
                <input type="text" value={activeInforme.TITULO || ''} onChange={e => setActiveInforme({...activeInforme, TITULO: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Categoría</label>
                <select value={activeInforme.CATEGORIA || 'Otros'} onChange={e => setActiveInforme({...activeInforme, CATEGORIA: e.target.value})}>
                  <option value="Stock">Stock</option>
                  <option value="Movimientos">Movimientos</option>
                  <option value="Albaranes">Albaranes</option>
                  <option value="Pedidos">Pedidos</option>
                  <option value="Operadores">Operadores</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <input type="text" value={activeInforme.DESCRIPCION || ''} onChange={e => setActiveInforme({...activeInforme, DESCRIPCION: e.target.value})} />
            </div>

            <div className="form-group">
              <label>SQL Query</label>
              <textarea 
                rows="8"
                className="mono"
                value={activeInforme.SQL_QUERY || ''}
                onChange={e => setActiveInforme({...activeInforme, SQL_QUERY: e.target.value})}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Módulo de Filtros (Definición)</label>
                <select 
                  value={activeInforme.CODDEFFILTRO || ''} 
                  onChange={e => setActiveInforme({...activeInforme, CODDEFFILTRO: e.target.value ? parseInt(e.target.value) : null})}
                >
                  <option value="">Sin Filtro</option>
                  {maestroFiltros.map(f => (
                    <option key={f.CODDEFFILTRO} value={f.CODDEFFILTRO}>
                      {f.CODDEFFILTRO} - {f.DESCRIPCION}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Order By</label>
                <input type="text" value={activeInforme.ORDER_BY || ''} onChange={e => setActiveInforme({...activeInforme, ORDER_BY: e.target.value})} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <input type="checkbox" id="visible_usuarios" checked={activeInforme.VISIBLE_USUARIOS === 1} onChange={e => setActiveInforme({...activeInforme, VISIBLE_USUARIOS: e.target.checked ? 1 : 0})} style={{ width: 'auto' }} />
                <label htmlFor="visible_usuarios" style={{ margin: 0 }}>Visible para Usuarios</label>
              </div>
            </div>

            <div className="form-group">
              <label>Columnas Config (JSON)</label>
              <textarea 
                rows="4"
                className="mono"
                placeholder='[{"field": "CODARTICULO", "headerName": "Código Artículo", "flex": 1}]'
                value={typeof activeInforme.COLUMNAS_CONFIG === 'string' ? activeInforme.COLUMNAS_CONFIG : JSON.stringify(activeInforme.COLUMNAS_CONFIG || [])}
                onChange={e => setActiveInforme({...activeInforme, COLUMNAS_CONFIG: e.target.value})}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={handleSave}>Guardar</button>
              
              {activeInforme.ID && (
                <>
                  {!showConfirmDelete ? (
                    <button className="btn" style={{ background: 'var(--danger)', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => setShowConfirmDelete(true)}>
                      <Trash2 size={16} /> Eliminar
                    </button>
                  ) : (
                    <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid var(--danger)', padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>¿Seguro? Esta acción no se puede deshacer.</span>
                      <button className="btn" style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }} onClick={handleDelete}>Sí, eliminar</button>
                      <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setShowConfirmDelete(false)}>Cancelar</button>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        ) : (
          <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>
            Selecciona un informe de la lista para editarlo o crea uno nuevo.
          </div>
        )}
      </div>
    </div>
  );
}
