const fs = require('fs');

let content = fs.readFileSync('src/app/locations/page.tsx', 'utf8');

const newDialog = `      <Dialog open={Boolean(selectedCell)} onClose={() => setSelectedCell(null)} maxWidth="lg" fullWidth>
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
      </Dialog>`;

content = content.replace(/<Dialog open=\{Boolean\(selectedCell\)\}.*?<\/Dialog>/s, newDialog);

fs.writeFileSync('src/app/locations/page.tsx', content, 'utf8');
