'use client';

import * as React from 'react';
import { Box, Typography, Card, CardContent, Grid, LinearProgress, TextField, MenuItem, Paper, ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import MapIcon from '@mui/icons-material/Map';
import CloseIcon from '@mui/icons-material/Close';
import { usePasillos, useAlmacenes, usePasilloDetalle, UbicacionDetalle } from '@/features/stock/api/getStock';

const PasilloVisualizer = ({ data }: { data: UbicacionDetalle[] }) => {
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
                      title={!isEmpty ? `Columna ${columnaActual} - ${stockAca} uds / ${cajasAca} cajas` : ''}
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
              <Box key={`col-label-${mIdx}`} sx={{ width: 80, display: 'flex', justifyContent: 'center' }}>
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
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
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
}

const PasilloModal = ({ open, onClose, almacenId, pasillo }: { open: boolean, onClose: () => void, almacenId: string, pasillo: string | null }) => {
  const { data, isLoading } = usePasilloDetalle(almacenId, pasillo || '');
  
  if (!pasillo) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
        Vista Interior - Pasillo {pasillo}
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: '#fff', p: 4 }}>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        {data && data.length > 0 ? (
           <PasilloVisualizer data={data} />
        ) : (
          !isLoading && <Typography>No hay ubicaciones definidas o vÃ¡lidas en este pasillo.</Typography>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function LocationsPage() {
  const [almacenId, setAlmacenId] = React.useState('10');
  const [viewMode, setViewMode] = React.useState<'map' | 'cards'>('map');
  const [selectedPasillo, setSelectedPasillo] = React.useState<string | null>(null);
  
  const { data: almacenesData } = useAlmacenes();
  const { data: pasillosData, isLoading: isLoadingPasillos } = usePasillos(almacenId);

  const pasillosProcesados = React.useMemo(() => {
    if (!pasillosData) return [];
    return [...pasillosData].sort((a, b) => a.pasillo.localeCompare(b.pasillo)).map(p => ({
      pasillo: p.pasillo,
      totalUbicaciones: p.total,
      ocupadas: p.ocupadas,
      porcentaje: p.porcentaje,
      totalStock: p.total_stock,
      totalCajas: p.total_cajas
    }));
  }, [pasillosData]);

  return (
    <Box sx={{ pb: 6 }}>
      <Typography variant="h4" gutterBottom color="primary.main" fontWeight="bold">
        Mapa de Ubicaciones
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Vista de pasillos y ocupaciÃ³n en tiempo real. Haz clic en un pasillo para ver su interior.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <TextField
            select
            label="AlmacÃ©n"
            variant="outlined"
            size="small"
            value={almacenId}
            onChange={(e) => setAlmacenId(e.target.value)}
            sx={{ minWidth: 250 }}
          >
            {almacenesData ? almacenesData.map(a => (
              <MenuItem key={a.codalmacen} value={a.codalmacen.toString()}>
                {a.descripcion}
              </MenuItem>
            )) : (
              <MenuItem value={almacenId}>Cargando almacenes...</MenuItem>
            )}
          </TextField>
        </Paper>

        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
          >
            <ToggleButton value="map">
              <MapIcon sx={{ mr: 1 }} /> Plano Visual
            </ToggleButton>
            <ToggleButton value="cards">
              <ViewModuleIcon sx={{ mr: 1 }} /> Tarjetas
            </ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      </Box>

      {isLoadingPasillos ? (
        <Typography>Cargando mapa del almacÃ©n...</Typography>
      ) : pasillosProcesados.length === 0 ? (
        <Typography sx={{ p: 3 }} color="text.secondary">
          No hay ubicaciones registradas para este almacÃ©n.
        </Typography>
      ) : viewMode === 'map' ? (
        <Paper 
          sx={{ 
            p: 4, 
            bgcolor: '#f8fafc', 
            border: '2px solid #e2e8f0',
            borderRadius: 3,
            overflowX: 'auto'
          }}
        >
          <Box sx={{ display: 'flex', gap: 4, minWidth: 'min-content' }}>
            {pasillosProcesados.map(p => (
              <Box key={p.pasillo} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="caption" fontWeight="bold" sx={{ mb: 1 }}>
                  P-{p.pasillo}
                </Typography>
                
                {/* Contenedor del pasillo visual (barra vertical) */}
                <Box 
                  onClick={() => setSelectedPasillo(p.pasillo)}
                  sx={{ 
                    width: 60, 
                    height: 300, 
                    bgcolor: '#e2e8f0', 
                    borderRadius: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)'
                    }
                  }}
                >
                  {/* Nivel de llenado */}
                  <Box 
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${p.porcentaje}%`,
                      bgcolor: p.porcentaje > 90 ? 'error.main' : p.porcentaje > 70 ? 'warning.main' : 'primary.main',
                      transition: 'height 0.5s ease-in-out',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                  </Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      position: 'absolute', 
                      bottom: 10, 
                      width: '100%', 
                      textAlign: 'center',
                      color: p.porcentaje > 20 ? '#fff' : '#64748b',
                      fontWeight: 'bold',
                      zIndex: 1
                    }}
                  >
                    {Math.round(p.porcentaje)}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Typography variant="caption" display="block" sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>
            Plano Cenital Simplificado del AlmacÃ©n (OcupaciÃ³n de Huecos por Pasillo). Haz clic para abrir.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {pasillosProcesados.map((p) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.pasillo}>
              <Card 
                onClick={() => setSelectedPasillo(p.pasillo)}
                sx={{ 
                  height: '100%', 
                  borderLeft: '4px solid #1976d2', 
                  opacity: p.ocupadas === 0 ? 0.6 : 1,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Pasillo {p.pasillo}
                  </Typography>
                  
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        OcupaciÃ³n: {p.ocupadas} / {p.totalUbicaciones || '?'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight="bold">
                        {p.porcentaje.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={p.porcentaje} 
                      color={p.porcentaje > 90 ? 'error' : p.porcentaje > 70 ? 'warning' : 'primary'}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    Unidades: {p.totalStock}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cajas: {p.totalCajas}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modal Interior del Pasillo */}
      <PasilloModal 
        open={Boolean(selectedPasillo)} 
        onClose={() => setSelectedPasillo(null)} 
        almacenId={almacenId} 
        pasillo={selectedPasillo} 
      />
    </Box>
  );
}

