import re

with open('src/app/locations/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the entire PasilloVisualizer component
new_component = '''const PasilloVisualizer = ({ data }: { data: UbicacionDetalle[] }) => {
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
                  const uniqueSkus = new Set(ubis.map(u => u.skus)).size;
                  
                  return (
                    <Box 
                      key={columnaActual} 
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
                      title={!isEmpty ? `Columna ${columnaActual} - ${stockAca} uds / ${cajasAca} cajas` : ''}
                    >
                      {!isEmpty && (
                        <>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            M{columnaActual}
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
    </Box>
  )
}'''

# Extract out the old PasilloVisualizer
pattern = r'const PasilloVisualizer.*?\}\n\nconst PasilloModal'
content = re.sub(pattern, new_component + '\n\nconst PasilloModal', content, flags=re.DOTALL)

with open('src/app/locations/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
