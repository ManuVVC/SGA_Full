import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AlmacenMap from '../components/Mapa/AlmacenMap';
import { RefreshCw, Map as MapIcon } from 'lucide-react';

export default function MapaAlmacen() {
  const [almacenes, setAlmacenes] = useState([]);
  const [codAlmacen, setCodAlmacen] = useState('');
  const [topologia, setTopologia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAlmacenes();
  }, []);

  useEffect(() => {
    if (codAlmacen) {
      fetchTopologia(codAlmacen);
    } else {
      setTopologia([]);
    }
  }, [codAlmacen]);

  const fetchAlmacenes = async () => {
    try {
      const res = await axios.get('/api/mapa/almacenes');
      if (res.data?.status === 'success') {
        setAlmacenes(res.data.data || []);
        if (res.data.data.length > 0) {
          setCodAlmacen(res.data.data[0].CODALMACEN);
        }
      }
    } catch (e) {
      setError('Error al cargar la lista de almacenes');
    }
  };

  const fetchTopologia = async (cod) => {
    if (!cod) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/mapa/topologia/${cod}`);
      if (res.data?.status === 'success') {
        setTopologia(res.data.data || []);
      }
    } catch (e) {
      setError('Error al cargar la topología del almacén');
    } finally {
      setLoading(false);
    }
  };

  // ── Métricas globales: sumar los totales ya calculados por el backend ────
  // El backend calcula total_huecos y huecos_ocupados a nivel de posición
  // (no de hueco) y los devuelve por pasillo. Sólo hay que agregarlos.
  const huecosTotales   = topologia.reduce((acc, p) => acc + (p.total_huecos    || 0), 0);
  const huecosOcupados  = topologia.reduce((acc, p) => acc + (p.huecos_ocupados || 0), 0);
  const huecosVacios    = huecosTotales - huecosOcupados;
  const ocupacionPorcentaje = huecosTotales > 0
    ? Math.round((huecosOcupados / huecosTotales) * 100)
    : 0;

  return (
    <div className="map-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* ── Barra superior: selector + métricas globales ── */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <MapIcon size={24} className="text-primary" />
          <select
            value={codAlmacen}
            onChange={(e) => setCodAlmacen(e.target.value)}
            style={{ padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-light)', color: 'white', borderRadius: '4px' }}
          >
            {almacenes.map(alm => (
              <option key={alm.CODALMACEN} value={alm.CODALMACEN}>{alm.DESCRIPCION}</option>
            ))}
          </select>
          <button
            onClick={() => fetchTopologia(codAlmacen)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card-hover)', color: 'white', border: '1px solid var(--border-light)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> Refrescar
          </button>
        </div>

        {topologia.length > 0 && (
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Posiciones Totales</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{huecosTotales.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ocupadas</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{huecosOcupados.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Libres</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-success)' }}>{huecosVacios.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-light)', paddingLeft: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ocupación</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: ocupacionPorcentaje > 90 ? 'var(--accent-danger)' : 'white' }}>
                {ocupacionPorcentaje}%
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="badge badge-warning">{error}</div>}

      {/* ── Área principal: scroll habilitado, flex para que AlmacenMap ocupe todo ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', overflow: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
            Cargando topología del almacén...
          </div>
        ) : topologia.length > 0 ? (
          <AlmacenMap topologia={topologia} />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
            No hay datos para este almacén
          </div>
        )}
      </div>
      
      {/* Leyenda */}
      <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '4px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '16px', height: '16px', background: 'rgba(37, 99, 235, 0.85)', borderRadius: '2px' }}></div> Ocupado
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '16px', height: '16px', background: 'rgba(22, 163, 74, 0.85)', borderRadius: '2px' }}></div> Vacío
        </div>
      </div>
    </div>
  );
}
