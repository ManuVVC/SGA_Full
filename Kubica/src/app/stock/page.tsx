'use client';

import * as React from 'react';
import { Box, Typography, Paper, TextField, Chip, MenuItem, Grid } from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useStock, useAlmacenes } from '@/features/stock/api/getStock';

const columns: GridColDef[] = [
  { field: 'ubicacion', headerName: 'Ubicacion', width: 140 },
  { field: 'codarticulo', headerName: 'Cod. Articulo', width: 130 },
  { field: 'nombrearticulo', headerName: 'Nombre Articulo', flex: 1, minWidth: 250 },
  { field: 'lote', headerName: 'Lote', width: 140 },
  { field: 'stock', headerName: 'Stock (Uds)', width: 110, type: 'number' },
  { field: 'cajas', headerName: 'Cajas', width: 90, type: 'number' },
  { field: 'fechacaducidad', headerName: 'Caducidad', width: 130 },
  { field: 'bloqueosalida', headerName: 'Estado', width: 130, 
    renderCell: (params) => {
      const isBloqueado = params.value === 1;
      return (
        <Chip 
          label={isBloqueado ? 'Bloqueado' : 'Disponible'} 
          color={isBloqueado ? 'error' : 'success'} 
          size="small" 
          variant={isBloqueado ? 'filled' : 'outlined'}
        />
      );
    }
  },
  { field: 'ultimomovimiento', headerName: 'Ult. Movimiento', width: 160 },
];

export default function StockPage() {
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const [searchTerm, setSearchTerm] = React.useState('');
  const [almacenId, setAlmacenId] = React.useState('10');
  
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPaginationModel(prev => ({ ...prev, page: 0 }));
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: almacenesData } = useAlmacenes();
  const { data, isLoading } = useStock(paginationModel.page + 1, paginationModel.pageSize, debouncedSearch, almacenId);

  const rows = React.useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((row, index) => ({
      ...row,
      id: row.ubicacion + '-' + row.codarticulo + '-' + row.lote + '-' + index
    }));
  }, [data]);

  const rowCount = data?.total || 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <Typography variant="h4" gutterBottom color="primary.main" fontWeight="bold">
        Control de Stock y Ubicaciones
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Vista en tiempo real del inventario del almacen. Permite buscar por nombre o codigo de articulo.
      </Typography>

      <Paper sx={{ mb: 2, p: 2, display: 'flex', gap: 2 }}>
        <TextField
          select
          label="Almacen"
          variant="outlined"
          size="small"
          value={almacenId}
          onChange={(e) => {
            setAlmacenId(e.target.value);
            setPaginationModel(prev => ({ ...prev, page: 0 }));
          }}
          sx={{ minWidth: 200 }}
        >
          {almacenesData ? almacenesData.map(a => (
            <MenuItem key={a.codalmacen} value={a.codalmacen.toString()}>
              {a.descripcion}
            </MenuItem>
          )) : (
            <MenuItem value={almacenId}>Cargando...</MenuItem>
          )}
        </TextField>
        <TextField
          fullWidth
          label="Buscar por articulo, codigo, ubicacion o lote..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Paper>

      <Paper sx={{ flexGrow: 1, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[20, 50, 100]}
          disableRowSelectionOnClick
        />
      </Paper>
    </Box>
  );
}
