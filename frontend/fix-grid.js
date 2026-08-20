const fs = require('fs');

const files = [
  'g:/Proyectos/SGA/frontend/src/components/Inventario/MovimientosStock.jsx',
  'g:/Proyectos/SGA/frontend/src/components/Inventario/StockUbicacion.jsx',
  'g:/Proyectos/SGA/frontend/src/components/Estadisticas/ProductividadOperadores.jsx',
  'g:/Proyectos/SGA/frontend/src/App.jsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;
    
    // Solo reemplazar si no tiene ya localeText
    content = content.replace(/domLayout="normal"(?![\s\S]*?localeText)/g, 'domLayout="normal" localeText={{ noRowsToShow: \\'No hay datos para mostrar\\' }}');
    
    if (content !== original) {
      fs.writeFileSync(f, content, 'utf8');
      console.log('Fixed ' + f);
    }
  }
});
