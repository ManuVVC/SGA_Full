import React, { useState } from 'react';
import StockUbicacion from '../components/Inventario/StockUbicacion';
import MovimientosStock from '../components/Inventario/MovimientosStock';

export default function Inventario() {
  const [activoInventarioTab, setActivoInventarioTab] = useState('stock');

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <h3>Estado del Stock</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { key: 'stock', label: 'Stock por Ubicación' },
            { key: 'movimientos', label: 'Movimientos' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActivoInventarioTab(key)}
              style={{
                background: activoInventarioTab === key ? 'var(--primary)' : 'transparent',
                color: activoInventarioTab === key ? 'white' : 'var(--text-main)',
                border: '1px solid var(--border-color)',
                padding: '0.4rem 0.75rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: activoInventarioTab === key ? 'bold' : 'normal',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
        {activoInventarioTab === 'stock' && <StockUbicacion />}
        {activoInventarioTab === 'movimientos' && <MovimientosStock />}
      </div>
    </div>
  );
}
