import React, { useState, useEffect } from 'react';
import adminApi from '../api/adminApi';
import { formatDate } from '../utils/formatDate';
import DetalleDocumento from '../components/Documentos/DetalleDocumento';

export default function Salidas() {
  const [outboundEstados, setOutboundEstados] = useState([]);
  const [selectedOutboundEstado, setSelectedOutboundEstado] = useState('');
  const [outboundList, setOutboundList] = useState([]);
  const [outboundLoading, setOutboundLoading] = useState(false);
  const [outboundError, setOutboundError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fetchOutboundEstados = async () => {
    try {
      const res = await adminApi.get('/outbound/estados');
      if (res.data.status === 'success') {
        const estados = res.data.data || [];
        setOutboundEstados(estados);
        if (estados.length > 0 && !selectedOutboundEstado) {
          setSelectedOutboundEstado(estados[0].codestadodocumento.toString());
        }
      }
    } catch (error) {
      console.error("Error fetching outbound estados", error);
    }
  };

  const fetchOutboundDocs = async () => {
    if (!selectedOutboundEstado) return;
    setOutboundLoading(true);
    setOutboundError('');
    try {
      const res = await adminApi.get(`/outbound/documentos?estado=${selectedOutboundEstado}`);
      if (res.data.status === 'success') {
        setOutboundList(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching outbound docs", error);
      setOutboundError('Error al cargar documentos de salida');
    } finally {
      setOutboundLoading(false);
    }
  };

  useEffect(() => {
    fetchOutboundEstados();
  }, []);

  useEffect(() => {
    if (selectedOutboundEstado) {
      fetchOutboundDocs();
    }
  }, [selectedOutboundEstado]);

  return (
    <>
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <h3>Expediciones Pendientes</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {outboundEstados.map(est => (
              <button 
                key={est.codestadodocumento}
                onClick={() => setSelectedOutboundEstado(est.codestadodocumento.toString())}
                style={{ 
                  background: selectedOutboundEstado === est.codestadodocumento.toString() ? 'var(--primary)' : 'transparent', 
                  color: selectedOutboundEstado === est.codestadodocumento.toString() ? 'white' : 'var(--text-main)', 
                  border: '1px solid var(--border-color)', 
                  padding: '0.4rem 0.75rem', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '0.8rem', 
                  fontWeight: selectedOutboundEstado === est.codestadodocumento.toString() ? 'bold' : 'normal' 
                }}
              >
                {est.descripcionpantalla}
              </button>
            ))}
          </div>
        </div>
        <div className="table-container" style={{ flex: 1 }}>
          {outboundError && <div className="badge badge-warning" style={{ margin: '1rem' }}>{outboundError}</div>}
          {outboundLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Población</th>
                  <th>Líneas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {outboundList.map((doc, i) => (
                  <tr key={i} onClick={() => setSelectedDoc({...doc, _tipo: 'outbound'})} style={{ cursor: 'pointer' }}>
                    <td className="mono" style={{ fontWeight: '500' }}>{doc.numdocumento}</td>
                    <td>{formatDate(doc.fechadocumento)}</td>
                    <td>
                      <span style={{ fontWeight: '500' }}>{doc.nombrecomercial}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.codcliente}</div>
                    </td>
                    <td>{doc.poblacion}</td>
                    <td>{doc.numlineas}</td>
                    <td>
                      <span className="badge badge-info">
                        {doc.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {outboundList.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay datos.</td></tr>
                )}
              </tbody>
            </table>
          )}
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
