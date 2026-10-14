const fs = require('fs');

let content = fs.readFileSync('src/app/locations/page.tsx', 'utf8');

const newComponent = `const PasilloVisualizer = ({ data }: { data: UbicacionDetalle[] }) => {
  const [selectedCell, setSelectedCell] = React.useState<{ columna: number; altura: number; ubis: UbicacionDetalle[] } | null>(null);

  const maxColumna = Math.max(...data.map(d => d.columna), 1);
  const maxAltura = Math.max(...data.map(d => d.altura), 1);
  
  return (
    <Box sx={{ display: 'flex', overflowX: 'auto', pb: 2, width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 'max-content' }}>
          {Array.from({ length: maxAltura }).map((_, nIdx) => {
            const alturaActual = maxAltura - nIdx;
            return (
              <Box key={alturaActual} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ width: 60, textAlign: 'right', pr: 1, fontWeight: 'bold' }}>
                  Nivel {alturaActual}
                </Typography>
                {Array.from({ length: maxColumna }).map((_, mIdx) => {
                  const columnaActual = mIdx + 1;
                  const ubis = data.filter(u => u.columna === columnaActual && u.altura === alturaActual);
                  const isOcupada = ubis.some(u => u.ocupada);
                  const isEmpty = ubis.length === 0;
                  const stockAca = ubis.reduce((acc, u) => acc + u.stock, 0);
                  const cajasAca = ubis.reduce((acc, u) => acc + u.cajas, 0);
                  
                  return (
                    <Box 
                      key={columnaActual} 
                      onClick={() => {
                        if (!isEmpty) setSelectedCell({ columna: columnaActual, altura: alturaActual, ubis });
                      }}
                      sx={{ 
                        width: 80, 
                        height: 60, 
                        border: '2px solid',
                        borderColor: isEmpty ? '#f1f5f9' : isOcupada ? '#1976d2' : '#cbd5e1',
                        bgcolor: isEmpty ? 'transparent' : isOcupada ? '#e3f2fd' : '#f8fafc',
                        borderRadius: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        transition: 'transform 0.2s',
                        '&:hover': !isEmpty ? {
                          transform: 'scale(1.05)',
                          cursor: 'pointer',
                          zIndex: 10,
                          boxShadow: 3
                        } : {}
                      }}
                      title={!isEmpty ? \`Columna \${columnaActual} - \${stockAca} uds / \${cajasAca} cajas\` : ''}
                    >
                      {!isEmpty && isOcupada && (
                        <Typography variant="caption" color="primary" fontWeight="bold">
                          {stockAca} u.
                        </Typography>
                      )}
                    </Box>
                  )
                })}
              </Box>
            );
          })}
          
          {/* Fila de etiquetas del Eje X (Columnas) */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
            <Box sx={{ width: 60, pr: 1 }} />
            {Array.from({ length: maxColumna }).map((_, mIdx) => (
              <Box key={\`col-label-\${mIdx}\`} sx={{ width: 80, display: 'flex', justifyContent: 'center' }}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                  C{mIdx + 1}
                </Typography>
              </Box>
            ))}
          </Box>

        </Box>
      </Box>

      {/* Dialogo de Detalle de Celda */}
      <Dialog open={Boolean(selectedCell)} onClose={() => setSelectedCell(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Contenido - Columna {selectedCell?.columna} / Nivel {selectedCell?.altura}
          <IconButton onClick={() => setSelectedCell(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3, bgcolor: '#f1f5f9' }}>
          <Box sx={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 3, pb: 1 }}>
            {[...(selectedCell?.ubis || [])].sort((a, b) => a.posicion - b.posicion).map(u => (
              <Paper key={u.nombre} sx={{ minWidth: 280, p: 2, borderTop: '4px solid', borderColor: u.ocupada ? '#1976d2' : '#cbd5e1' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Posición {u.posicion}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  {u.nombre} • {u.ocupada ? 'Ocupada' : 'Vacía'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, bgcolor: '#f8fafc', p: 1, borderRadius: 1 }}>
                  <Typography variant="body2"><b>{u.stock}</b> uds</Typography>
                  <Typography variant="body2"><b>{u.cajas}</b> cajas</Typography>
                </Box>
                
                {u.articulos && u.articulos.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {u.articulos.map(art => (
                      <Box key={art.codigo} sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1, bgcolor: '#fff' }}>
                        <Typography variant="body2" fontWeight="bold" color="primary.dark">{art.codigo}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          {art.descripcion}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', pt: 0.5 }}>
                          <Typography variant="caption" fontWeight="bold">{art.stock} u.</Typography>
                          <Typography variant="caption">{art.cajas} cj.</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                    Hueco vacío
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}`;

content = content.replace(/const PasilloVisualizer =.*?\}\n\nconst PasilloModal/s, newComponent + '\n\nconst PasilloModal');

fs.writeFileSync('src/app/locations/page.tsx', content, 'utf8');
