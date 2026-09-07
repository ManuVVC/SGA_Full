import React, { useState, useEffect } from 'react';
import adminApi from '../api/adminApi';
import { formatDate } from '../utils/formatDate';
import DetalleDocumento from '../components/Documentos/DetalleDocumento';

export default function Entradas() {
  const [selectedTipoDoc, setSelectedTipoDoc] = useState('2');
  const [inboundList, setInboundList] = useState([]);
  const [inboundLoading, setInboundLoading] = useState(false);
  const [inboundError, setInboundError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fetchInbound = async () => {
    setInboundLoading(true);
    setInboundError('');
    try {
      let url = '/inbound/documentos';
      if (selectedTipoDoc) {
        url += `?tipo=${selectedTipoDoc}`;
      }
      const res = await adminApi.get(url);
      setInboundList(res.data.data || []);
    } catch (error) {
      console.error("Error fetching inbound docs", error);
      setInboundError('Error al cargar documentos de entrada');
    } finally {
      setInboundLoading(false);
    }
  };

  useEffect(() => {
    fetchInbound();
  }, [selectedTipoDoc]);

  return (
    <>
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <h3>Documentos de Recepción</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => setSelectedTipoDoc('2')}
              style={{ background: selectedTipoDoc === '2' ? 'var(--primary)' : 'transparent', color: selectedTipoDoc === '2' ? 'white' : 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: selectedTipoDoc === '2' ? 'bold' : 'normal' }}
            >Pedidos a Proveedores</button>
            <button 
              onClick={() => setSelectedTipoDoc('3')}
              style={{ background: selectedTipoDoc === '3' ? 'var(--primary)' : 'transparent', color: selectedTipoDoc === '3' ? 'white' : 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: selectedTipoDoc === '3' ? 'bold' : 'normal' }}
            >Albaranes de Entrada</button>
          </div>
        </div>
        <div className="table-container" style={{ flex: 1 }}>
          {inboundError && <div className="badge badge-warning" style={{ margin: '1rem' }}>{inboundError}</div>}
          <table className="data-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Fecha</th>
                <th>Entidad (Proveedor)</th>
                <th>Líneas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {inboundLoading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Cargando documentos...</td></tr>
              ) : inboundList.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay documentos pendientes.</td></tr>
              ) : (
                inboundList.map((doc, idx) => (
                  <tr key={idx} onClick={() => setSelectedDoc({...doc, _tipo: 'inbound'})} style={{ cursor: 'pointer' }}>
                    <td className="mono" style={{ fontWeight: 'bold' }}>{doc.numdocumento}</td>
                    <td>{formatDate(doc.fechadocumento)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{doc.codentidad}</span>
                        <span style={{ fontWeight: '500' }}>{doc.nombrecomercial}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-info">{doc.numlineas || 0}</span>
                    </td>
                    <td><span className="badge badge-warning">{doc.estado}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDoc && (
        <DetalleDocumento
          documento={selectedDoc}
          tipo={selectedDoc._tipo}
          showCodFabricante={false}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </>
  );
}
