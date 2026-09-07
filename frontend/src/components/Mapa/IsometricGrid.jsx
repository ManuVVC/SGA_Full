import React, { useState } from 'react';

export default function IsometricGrid({ topologia }) {
  // topologia is an array of pasillos
  
  // Controls
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    // Zoom limits
    setZoom(z => Math.min(Math.max(0.2, z - e.deltaY * 0.001), 3));
  };

  return (
    <div 
      className="iso-viewport"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ overflow: 'hidden', height: '100%', position: 'relative' }}
    >
      <div 
        className="iso-board"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotateX(60deg) rotateZ(-45deg)`,
          transformOrigin: 'center'
        }}
      >
        {topologia.map(pasillo => (
          <div key={pasillo.codpasillo} className="iso-pasillo">
            {/* The title of the aisle */}
            <div style={{ position: 'absolute', top: '-30px', left: 0, color: 'white', fontWeight: 'bold', transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
              {pasillo.descripcion}
            </div>
            
            {pasillo.columnas.map(columna => (
              <div key={columna.codcolumna} className="iso-columna">
                <div className="iso-columna-base" title={`Col ${columna.codcolumna}`} />
                <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '2px', position: 'absolute', bottom: '32px', left: 0 }}>
                  {columna.huecos.map((hueco) => {
                    return (
                      <div 
                        key={hueco.codhueco} 
                        className={`iso-slot ${hueco.ocupado ? 'occupied' : 'empty'}`}
                        style={{ position: 'relative' }}
                        title={`Hueco: ${hueco.codhueco}\nEstado: ${hueco.ocupado ? 'Ocupado' : 'Vacío'}\nStock: ${hueco.stock}`}
                      >
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', color: 'white', fontSize: '0.8rem' }}>
        Arrastra para mover | Scroll para Zoom
      </div>
    </div>
  );
}
