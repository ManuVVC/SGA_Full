import React, { useState, useEffect } from 'react';
import axios from 'axios';

const drawerStyle = {
  position: 'fixed', bottom: 0, left: 0, width: '100vw', height: '50vh',
  background: 'var(--bg-dark)', borderTop: '2px solid var(--primary)',
  zIndex: 1000, display: 'flex', flexDirection: 'column', overflowY: 'auto',
  boxShadow: '0 -4px 20px rgba(0,0,0,0.5)'
};

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
  background: 'rgba(0,0,0,0.5)', zIndex: 999
};

const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return dateStr ?? '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})( \d{2}:\d{2}:\d{2})?$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}${match[4] || ''}`;
  return dateStr;
};

/**
 * DetalleDocumento
 * Panel lateral que muestra la cabecera y las lineas de un documento (inbound/outbound).
 *
 * @param {object}   documento - Datos de cabecera del documento
 * @param {string}   tipo      - 'inbound' | 'outbound'
 * @param {function} onClose   - Callback para cerrar el panel
 */
export default function DetalleDocumento({ documento, tipo, showCodFabricante, onClose }) {
  const [lineas, setLineas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!documento?.coddocumento && !documento?.numdocumento) return;
    const docId = documento.coddocumento || documento.numdocumento;
    const endpoint = tipo === 'inbound' ? 'inbound' : 'outbound';
    setLoading(true);
    setError('');
    axios
      .get(`/admin/${endpoint}/lineas?coddocumento=${docId}`)
      .then((res) => {
        setLineas(res.data?.data || []);
      })
      .catch((e) => {
        setError(e.response?.data?.message || 'Error al cargar las lineas');
      })
      .finally(() => setLoading(false));
  }, [documento?.coddocumento, documento?.numdocumento, tipo]);

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={drawerStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-dark)',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem 1.5rem', flex: 1, paddingRight: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1rem', paddingRight: '0.5rem', borderRight: '1px solid var(--border-color)' }}>
              {documento.numdocumento}
            </h3>
            <Field label="Fecha" value={formatDate(documento.fechadocumento)} />
            <Field label="Entidad" value={documento.nombrecomercial} />
            {documento.codentidad && <Field label="Cod. Entidad" value={documento.codentidad} />}
            {documento.codcliente && <Field label="Cod. Cliente" value={documento.codcliente} />}
            {documento.poblacion && <Field label="Poblacion" value={documento.poblacion} />}
            <Field label="Estado" value={documento.estado} highlight />
            {documento.numlineas !== undefined && <Field label="Líneas" value={documento.numlineas} />}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: '4px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            aria-label="Cerrar panel"
          >
            X
          </button>
        </div>

        <div style={{ padding: '1rem 1.25rem', flex: 1 }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Lineas del documento
          </h4>

          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Cargando lineas...
            </div>
          )}

          {error && (
            <div
              style={{
                background: 'rgba(192,24,24,0.12)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['#', 'Cod. Art.', 'Descripcion', 
                      ...(showCodFabricante ? ['Cod. Fab.'] : []),
                      'Uds. Pedidas',
                      tipo === 'inbound' ? 'Uds. Recibidas' : 'Uds. Preparadas',
                      'Pendientes'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: h.startsWith('Uds.') || h === 'Pendientes' ? 'center' : 'left',
                          padding: '0.4rem 0.5rem',
                          color: 'var(--text-muted)',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineas.length === 0 ? (
                    <tr>
                      <td colSpan={showCodFabricante ? 7 : 6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No hay lineas disponibles.
                      </td>
                    </tr>
                  ) : (
                    lineas.map((lin, i) => {
                      const pedidas = lin.unidadespedidas ?? lin.unidades_pedidas ?? lin.uds_pedidas ?? 0;
                      const recibidas = lin.unidadesrecibidas ?? lin.unidades_recibidas ?? lin.uds_recibidas ?? lin.unidadespreparadas ?? lin.unidades_preparadas ?? lin.uds_preparadas ?? 0;
                      const pendientes = lin.unidadespendientes ?? lin.unidades_pendientes ?? lin.uds_pendientes ?? (pedidas - recibidas);
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <td style={tdStyle}>{lin.numlinea ?? i + 1}</td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{lin.codarticuloaplicacion ?? lin.codarticulo ?? '-'}</td>
                          <td style={{ ...tdStyle, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lin.nombrearticulo ?? lin.descripcion ?? '-'}</td>
                          {showCodFabricante && <td style={tdStyle}>{lin.codrealfabricante ?? lin.codfabricante ?? '-'}</td>}
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{pedidas}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{recibidas}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: pendientes > 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: pendientes > 0 ? 'bold' : 'normal' }}>
                            {pendientes}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>{label}</div>
      <div style={{ fontSize: '0.88rem', fontWeight: highlight ? 'bold' : 'normal', color: highlight ? 'var(--primary)' : 'var(--text-main)' }}>
        {value ?? '-'}
      </div>
    </div>
  );
}

const tdStyle = { padding: '0.4rem 0.5rem', verticalAlign: 'middle' };
