import React from 'react';
import { X, Package, ShieldAlert, Clock, MapPin } from 'lucide-react';

const drawerStyle = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '450px',
  height: '100vh',
  background: 'var(--bg-dark)',
  borderLeft: '2px solid var(--primary)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
  color: 'var(--text-main)'
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.6)',
  zIndex: 999,
  backdropFilter: 'blur(2px)'
};

export default function DetalleStock({ stock, onClose }) {
  if (!stock) return null;

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={drawerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} color="var(--primary)" /> Detalle de Ubicación
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--primary)' }}>{stock.codarticulo} - {stock.nombrearticulo}</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Ubicación:</span><br/><b>{stock.ubicacion}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Lote:</span><br/><b>{stock.lote || '-'}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Stock:</span><br/><b>{stock.stock}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Cajas:</span><br/><b>{stock.cajas || 0}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>F. Caducidad:</span><br/><b>{stock.fechacaducidad || '-'}</b></div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Package size={16} /> Contenedores
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>SSCC (Palet Completo):</span>
                <span>{stock.sscc || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cód. Palet interno:</span>
                <span>{stock.codpalet || '-'}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={16} /> Estados y Bloqueos
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bloqueo de Entrada:</span>
                <span style={{ color: stock.bloqueoentrada === 'T' ? 'var(--danger)' : 'var(--success)' }}>
                  {stock.bloqueoentrada === 'T' ? 'BLOQUEADO' : 'Permitido'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bloqueo de Salida:</span>
                <span style={{ color: stock.bloqueosalida === 'T' ? 'var(--danger)' : 'var(--success)' }}>
                  {stock.bloqueosalida === 'T' ? 'BLOQUEADO' : 'Permitido'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} /> Movimientos
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Último Movimiento:</span>
              <span>{stock.ultimomovimiento || '-'}</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
