import React, { useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, X, Package, CalendarClock, Hash, Layers } from 'lucide-react';

// ─── Utilidades de color por % ocupación ──────────────────────────────────
function getOcupacionColor(pct) {
  if (pct >= 90) return { bg: 'rgba(220,38,38,0.85)', label: '#fca5a5' };
  if (pct >= 70) return { bg: 'rgba(234,88,12,0.85)', label: '#fdba74' };
  if (pct >= 50) return { bg: 'rgba(202,138,4,0.85)', label: '#fde047' };
  return { bg: 'rgba(22,163,74,0.85)', label: '#86efac' };
}

// ─── Tooltip flotante ──────────────────────────────────────────────────────
function Tooltip({ hueco }) {
  if (!hueco) return null;
  const POS_LABELS = { 1: 'Izquierda', 2: 'Centro', 3: 'Derecha' };
  return (
    <div style={{
      position: 'fixed', zIndex: 9999,
      background: '#0f172a', border: '1px solid #334155',
      borderRadius: '6px', padding: '0.6rem 0.8rem',
      fontSize: '0.78rem', color: '#f8fafc',
      pointerEvents: 'none',
      top: hueco._y + 12, left: hueco._x + 12,
      minWidth: '190px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
    }}>
      {/* Código completo de ubicación: Alm-Pas-Col-Alt-Pos */}
      <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', color: '#93c5fd', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
        {hueco.nombrecorto || hueco.codhueco}
      </div>
      {hueco.posicion !== undefined && (
        <div style={{ marginBottom: '0.2rem', color: '#94a3b8' }}>
          Posición <b style={{ color: '#e2e8f0' }}>{hueco.posicion}</b>
          {' — '}{POS_LABELS[hueco.posicion] || ''}
        </div>
      )}
      <div>Estado: <b style={{ color: hueco.ocupado ? '#60a5fa' : '#4ade80' }}>
        {hueco.ocupado ? 'Ocupado' : 'Libre'}
      </b></div>
      {hueco.ocupado && <>
        {hueco.articulo && (
          <div style={{ marginTop: '0.3rem', color: '#cbd5e1', fontSize: '0.73rem',
            borderTop: '1px solid #334155', paddingTop: '0.3rem',
            maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {hueco.articulo}
          </div>
        )}
        {hueco.codpalet > 0 && <div>Palet: <b>#{hueco.codpalet}</b></div>}
        {hueco.stock > 0 && <div>Stock: <b>{hueco.stock}</b></div>}
      </>}
    </div>
  );
}

// ─── Panel inferior de detalle de una posición ────────────────────────────
function DetalleUbicacion({ codubicacion, titulo, onClose }) {
  const [mercancia, setMercancia] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  React.useEffect(() => {
    if (!codubicacion) return;
    setLoading(true);
    setError('');
    axios.get(`/api/mapa/ubicacion/${codubicacion}`)
      .then(res => {
        if (res.data?.status === 'success') setMercancia(res.data.data);
        else setError('Sin datos');
      })
      .catch(() => setError('Error al cargar el detalle'))
      .finally(() => setLoading(false));
  }, [codubicacion]);

  const esProximaCaducidad = (fecha) => {
    if (!fecha) return false;
    const [d, m, a] = fecha.split('/');
    const diff = (new Date(a, m - 1, d) - new Date()) / 86400000;
    return diff >= 0 && diff <= 90;
  };
  const esCaducado = (fecha) => {
    if (!fecha) return false;
    const [d, m, a] = fecha.split('/');
    return new Date(a, m - 1, d) < new Date();
  };

  return (
    <div style={{
      borderTop: '1px solid #1e293b',
      background: '#0c1526',
      flexShrink: 0,
      animation: 'slideUpPanel 0.2s ease'
    }}>
      {/* Cabecera del panel inferior */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.6rem 1.25rem',
        borderBottom: '1px solid #1e293b',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            Ubicación
          </span>
          <span style={{ fontWeight: 'bold', color: '#93c5fd', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
            {titulo}
          </span>
          {!loading && mercancia && (
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {mercancia.length} {mercancia.length === 1 ? 'línea' : 'líneas'} de mercancía
            </span>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: '#64748b',
          cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem'
        }}>
          <X size={16} />
        </button>
      </div>

      {/* Tarjetas en fila horizontal con scroll lateral */}
      <div style={{ overflowX: 'auto', padding: '0.75rem 1.25rem', display: 'flex', gap: '0.75rem', minHeight: '110px', alignItems: 'flex-start' }}>
        {loading && (
          <div style={{ color: '#64748b', fontSize: '0.85rem', alignSelf: 'center', paddingLeft: '1rem' }}>
            Cargando…
          </div>
        )}
        {error && (
          <div style={{ color: '#f87171', fontSize: '0.85rem', alignSelf: 'center' }}>{error}</div>
        )}
        {!loading && mercancia && mercancia.length === 0 && (
          <div style={{ color: '#64748b', fontSize: '0.85rem', alignSelf: 'center' }}>
            No hay mercancía con stock en esta posición
          </div>
        )}

        {!loading && mercancia && mercancia.map((m, idx) => {
          const caducado = esCaducado(m.fechacaducidad);
          const proxCad  = !caducado && esProximaCaducidad(m.fechacaducidad);
          const colorCad = caducado ? '#f87171' : proxCad ? '#fbbf24' : '#4ade80';
          const borderColor = caducado ? '#7f1d1d' : proxCad ? '#713f12' : '#1e3a5f';

          return (
            <div key={idx} style={{
              background: '#1e293b',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '0.7rem 0.9rem',
              minWidth: '220px',
              maxWidth: '260px',
              flexShrink: 0,
              fontSize: '0.8rem',
            }}>
              {/* Cabecera artículo */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <Package size={13} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                    {m.codarticuloaplicacion}
                  </div>
                  <div style={{ fontWeight: '600', color: '#f1f5f9', lineHeight: 1.25, fontSize: '0.82rem' }}>
                    {m.nombrearticulo}
                  </div>
                  {m.nombrepropietario && (
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{m.nombrepropietario}</div>
                  )}
                </div>
              </div>

              {/* Datos en dos columnas compactas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem 0.8rem' }}>
                {m.numerolote && (
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Hash size={10} /> Lote
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: '#e2e8f0', fontSize: '0.75rem' }}>{m.numerolote}</div>
                  </div>
                )}
                {m.fechacaducidad && (
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CalendarClock size={10} /> Caducidad
                    </div>
                    <div style={{ fontWeight: '600', color: colorCad, fontSize: '0.75rem' }}>
                      {m.fechacaducidad}
                      {caducado && <span style={{ fontSize: '0.6rem', marginLeft: '3px' }}>⚠</span>}
                      {proxCad  && <span style={{ fontSize: '0.6rem', marginLeft: '3px' }}>⚠</span>}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Stock</div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.75rem' }}><b>{m.stock}</b> ud.</div>
                </div>
                {m.cajas > 0 && (
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Cajas</div>
                    <div style={{ color: '#e2e8f0', fontSize: '0.75rem' }}><b>{m.cajas}</b></div>
                  </div>
                )}
                {m.codpalet > 0 && (
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Palet</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: '#e2e8f0', fontSize: '0.72rem' }}>#{m.codpalet}</div>
                  </div>
                )}
                {m.sscc && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>SSCC</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8', fontSize: '0.68rem' }}>{m.sscc}</div>
                  </div>
                )}
                {m.ultimomovimiento && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Último mov.</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{m.ultimomovimiento}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista de Alzado — Cuadrícula Alturas × Columnas ───────────────────────
function AlzadoView({ pasillo, onClose }) {
  const [tooltip, setTooltip]       = useState(null);
  const [detalle, setDetalle]       = useState(null);
  const [mostrarOcupado, setMostrarOcupado] = useState(true);
  const [mostrarVacio,   setMostrarVacio]   = useState(true);

  // Obtener alturas únicas ordenadas de mayor a menor (para que Altura 5 esté arriba)
  const alturas = [...new Set(
    pasillo.columnas.flatMap(c => c.huecos.map(h => h.codaltura))
  )].sort((a, b) => b - a);

  // Tamaños adaptados a posiciones múltiples
  const POS_W = 22;    // ancho de cada sub-celda de posición
  const CELL_H = 38;   // alto de cada hueco
  const COL_LABEL_W = 60;
  const ROW_LABEL_W = 52;
  const POS_LABELS = { 1: 'I', 2: 'C', 3: 'D' };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: '8px',
      overflow: 'hidden',
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Cabecera */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border-light)',
        background: 'var(--bg-card-hover)'
      }}>
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          background: 'transparent', border: '1px solid var(--border-light)',
          color: 'var(--text-muted)', borderRadius: '4px',
          padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem'
        }}>
          <ChevronLeft size={14} /> Volver
        </button>
        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
          Pasillo: <span style={{ color: 'var(--primary)' }}>{pasillo.descripcion || pasillo.nombrecorto}</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {pasillo.huecos_ocupados}/{pasillo.total_huecos} posiciones ocupadas ({pasillo.pct_ocupacion}%)
        </div>
      </div>

      {/* Cuadrícula de alzado con scroll */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'inline-flex' }}>

          {/* Eje Y — Alturas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: COL_LABEL_W + 'px', flexShrink: 0 }}>
            {alturas.map(alt => (
              <div key={alt} style={{
                width: ROW_LABEL_W, height: CELL_H,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: '10px', fontSize: '0.72rem', color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)'
              }}>
                Alt {alt}
              </div>
            ))}
          </div>

          {/* Columnas */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {pasillo.columnas.map(columna => {
              // Calcular ancho dinámico según max posiciones de sus huecos
              const maxPos = Math.max(...columna.huecos.map(h => h.posiciones?.length || 1), 1);
              const colW = maxPos * POS_W + (maxPos - 1) * 1 + 4; // gap interno + padding

              return (
                <div key={columna.codcolumna} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {/* Etiqueta columna */}
                  <div style={{
                    height: COL_LABEL_W, width: colW,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    paddingBottom: '6px', fontSize: '0.65rem',
                    color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                    flexShrink: 0, writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)'
                  }}>
                    {columna.nombrecorto || columna.codcolumna}
                  </div>

                  {/* Celdas de este pasillo por altura */}
                  {alturas.map(alt => {
                    const hueco = columna.huecos.find(h => h.codaltura === alt);

                    if (!hueco) {
                      return (
                        <div key={alt} style={{
                          width: colW, height: CELL_H,
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '3px', border: '1px dashed rgba(255,255,255,0.05)'
                        }} />
                      );
                    }

                    const posiciones = hueco.posiciones || [{ posicion: 1, ocupado: false }];

                    return (
                      <div key={alt} style={{
                        display: 'flex', gap: '1px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '3px',
                        padding: '2px',
                        height: CELL_H,
                        alignItems: 'stretch'
                      }}>
                        {posiciones.map(pos => (
                          <div
                            key={pos.posicion}
                            onMouseEnter={e => setTooltip({
                              codhueco:    hueco.nombrecorto,
                              nombrecorto: pos.nombrecorto,
                              posicion:    pos.posicion,
                              ocupado:     pos.ocupado,
                              codpalet:    pos.codpalet,
                              stock:       pos.stock,
                              articulo:    pos.articulo,
                              _x: e.clientX, _y: e.clientY
                            })}
                            onMouseMove={e => setTooltip(t => t ? { ...t, _x: e.clientX, _y: e.clientY } : null)}
                            onMouseLeave={() => setTooltip(null)}
                            onClick={() => {
                              if (pos.ocupado) {
                                setTooltip(null);
                                setDetalle({ codubicacion: pos.codubicacion, titulo: pos.nombrecorto });
                              }
                            }}
                            style={{
                              width: POS_W,
                              borderRadius: '2px',
                              cursor: pos.ocupado ? 'pointer' : 'default',
                              transition: 'filter 0.1s, opacity 0.2s',
                              // Filtro de visibilidad: transparente si se ha desactivado ese tipo
                              opacity: (pos.ocupado ? mostrarOcupado : mostrarVacio) ? 1 : 0.08,
                              pointerEvents: (pos.ocupado ? mostrarOcupado : mostrarVacio) ? 'auto' : 'none',
                              background: pos.ocupado
                                ? 'rgba(37,99,235,0.85)'
                                : 'rgba(22,163,74,0.55)',
                              border: `1px solid ${pos.ocupado ? 'rgba(96,165,250,0.5)' : 'rgba(74,222,128,0.4)'}`,
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center', gap: '1px'
                            }}
                          >
                            {/* Etiqueta I/C/D */}
                            <span style={{
                              fontSize: '0.55rem', fontWeight: 'bold',
                              fontFamily: 'var(--font-mono)',
                              color: pos.ocupado ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                              userSelect: 'none', lineHeight: 1
                            }}>
                              {POS_LABELS[pos.posicion] || pos.posicion}
                            </span>
                            {/* Icono palet si ocupado */}
                            {pos.ocupado && (
                              <span style={{ fontSize: '0.6rem', lineHeight: 1, userSelect: 'none' }}>▪</span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leyenda interactiva — clic para filtrar */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Botón Ocupado */}
          <button
            onClick={() => setMostrarOcupado(v => !v)}
            title={mostrarOcupado ? 'Ocultar ocupados' : 'Mostrar ocupados'}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.82rem', cursor: 'pointer',
              background: mostrarOcupado ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${mostrarOcupado ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px', padding: '0.35rem 0.75rem',
              color: mostrarOcupado ? '#93c5fd' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: '2px',
              background: mostrarOcupado ? 'rgba(37,99,235,0.85)' : 'rgba(255,255,255,0.15)',
              transition: 'background 0.15s',
              flexShrink: 0
            }} />
            Ocupado
            {!mostrarOcupado && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>— oculto</span>}
          </button>

          {/* Botón Vacío */}
          <button
            onClick={() => setMostrarVacio(v => !v)}
            title={mostrarVacio ? 'Ocultar vacíos' : 'Mostrar vacíos'}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.82rem', cursor: 'pointer',
              background: mostrarVacio ? 'rgba(22,163,74,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${mostrarVacio ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px', padding: '0.35rem 0.75rem',
              color: mostrarVacio ? '#86efac' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: '2px',
              background: mostrarVacio ? 'rgba(22,163,74,0.55)' : 'rgba(255,255,255,0.15)',
              transition: 'background 0.15s',
              flexShrink: 0
            }} />
            Vacío
            {!mostrarVacio && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>— oculto</span>}
          </button>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            <b style={{ fontFamily: 'var(--font-mono)' }}>I / C / D</b> = Izquierda / Centro / Derecha
          </div>
        </div>
      </div>

      {tooltip && <Tooltip hueco={tooltip} />}
      </div>

      {/* Panel inferior de detalle de mercancía integrado en el layout */}
      {detalle && (
        <DetalleUbicacion
          codubicacion={detalle.codubicacion}
          titulo={detalle.titulo}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}

// ─── Vista de Planta — Listado de Pasillos con barra de ocupación ──────────
function PlantaView({ topologia, onSelectPasillo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '1rem' }}>
      {topologia.map(pasillo => {
        const { bg, label } = getOcupacionColor(pasillo.pct_ocupacion);
        return (
          <div
            key={pasillo.codpasillo}
            onClick={() => onSelectPasillo(pasillo)}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0.6rem 1rem',
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-light)',
              borderRadius: '6px', cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
          >
            {/* Nombre pasillo */}
            <div style={{ width: '120px', flexShrink: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                {pasillo.descripcion}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {pasillo.columnas.length} columnas · {pasillo.total_huecos} huecos
              </div>
            </div>

            {/* Barra de ocupación */}
            <div style={{ flex: 1, height: '20px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%', width: `${pasillo.pct_ocupacion}%`,
                background: bg, borderRadius: '4px',
                transition: 'width 0.6s ease'
              }} />
            </div>

            {/* % y contadores */}
            <div style={{ width: '90px', textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: label }}>
                {pasillo.pct_ocupacion}%
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                {pasillo.huecos_ocupados} / {pasillo.total_huecos}
              </span>
            </div>

            <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente raíz exportado ─────────────────────────────────────────────
export default function AlmacenMap({ topologia }) {
  const [pasilloSeleccionado, setPasilloSeleccionado] = useState(null);

  if (pasilloSeleccionado) {
    return (
      <AlzadoView
        pasillo={pasilloSeleccionado}
        onClose={() => setPasilloSeleccionado(null)}
      />
    );
  }

  return (
    <PlantaView
      topologia={topologia}
      onSelectPasillo={setPasilloSeleccionado}
    />
  );
}
