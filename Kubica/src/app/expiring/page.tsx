'use client';

import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Chip 
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { useExpiringStock } from '@/features/stock/api/getStock';

export default function ExpiringPage() {
  const [months, setMonths] = useState<number>(1);
  const almacen = '10'; // Por defecto, se podría parametrizar luego

  const { data, isLoading, error } = useExpiringStock(almacen, months);

  return (
    <Box sx={{ p: 4, maxWidth: 1400, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WarningIcon color="error" sx={{ fontSize: 40 }} />
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            Control de Caducidades
          </Typography>
        </Box>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>Próximos a caducar en</InputLabel>
          <Select
            value={months}
            label="Próximos a caducar en"
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            <MenuItem value={1}>1 mes</MenuItem>
            <MenuItem value={3}>3 meses</MenuItem>
            <MenuItem value={6}>6 meses</MenuItem>
            <MenuItem value={12}>1 año</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">Error al cargar las caducidades.</Typography>
      ) : (
        <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Ubicación</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Artículo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Lote</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc', textAlign: 'right' }}>Stock</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc', textAlign: 'right' }}>Cajas</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Fecha Caducidad</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data && data.length > 0 ? (
                  data.map((row: any, idx: number) => {
                    const expiryDate = new Date(row.fechacaducidad);
                    const now = new Date();
                    const diffTime = Math.abs(expiryDate.getTime() - now.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let chipColor: "error" | "warning" | "success" | "default" = "default";
                    if (diffDays <= 30) chipColor = "error";
                    else if (diffDays <= 90) chipColor = "warning";
                    else chipColor = "success";

                    return (
                      <TableRow key={`${row.ubicacion}-${row.codarticulo}-${idx}`} hover>
                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{row.ubicacion}</TableCell>
                        <TableCell>{row.codarticulo}</TableCell>
                        <TableCell>{row.nombrearticulo}</TableCell>
                        <TableCell>{row.lote}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>{row.stock} u.</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>{row.cajas}</TableCell>
                        <TableCell>
                          <Chip 
                            label={new Date(row.fechacaducidad).toLocaleDateString('es-ES')} 
                            color={chipColor} 
                            size="small" 
                            variant={chipColor === 'error' ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
                      No hay artículos que caduquen en este periodo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
