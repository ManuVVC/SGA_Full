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
                      {!isEmpty && (
                        <>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            C\${columnaActual}
                          </Typography>
                          {isOcupada && (
                            <Typography variant="caption" color="primary" fontWeight="bold">
                              {stockAca} u.
                            </Typography>
                          )}
                        </>
                      )}
                    </Box>
                  )
                })}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Dialogo de Detalle de Celda */}
      <Dialog open={Boolean(selectedCell)} onClose={() => setSelectedCell(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Contenido - Columna {selectedCell?.columna} / Nivel {selectedCell?.altura}
          <IconButton onClick={() => setSelectedCell(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedCell?.ubis.map(u => (
            <Paper key={u.nombre} sx={{ p: 2, mb: 2, borderLeft: '4px solid #1976d2' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Posición: {u.posicion} (Palet)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Código Ubicación</Typography>
                  <Typography variant="body1">{u.nombre}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Estado</Typography>
                  <Typography variant="body1" color={u.ocupada ? 'success.main' : 'text.secondary'} fontWeight="bold">
                    {u.ocupada ? 'Ocupada' : 'Vacía'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="text.secondary">Stock</Typography>
                  <Typography variant="body1">{u.stock} u.</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="text.secondary">Cajas</Typography>
                  <Typography variant="body1">{u.cajas}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="text.secondary">SKUs Distintos</Typography>
                  <Typography variant="body1">{u.skus}</Typography>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </DialogContent>
      </Dialog>
    </Box>
  )
}`;

content = content.replace(/const PasilloVisualizer =.*?\}\n\nconst PasilloModal/s, newComponent + '\n\nconst PasilloModal');

fs.writeFileSync('src/app/locations/page.tsx', content, 'utf8');
