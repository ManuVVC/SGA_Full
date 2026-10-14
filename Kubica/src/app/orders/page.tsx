'use client';

import * as React from 'react';
import { Box, Typography, Paper, Chip, Button, TextField, MenuItem, Toolbar, Snackbar, Alert } from '@mui/material';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { usePedidos, useAssignPedidos } from '@/features/orders/api/getOrders';
import { useOperators } from '@/features/orders/api/getOperators';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';

const columns: GridColDef[] = [
  { field: 'cod_documento', headerName: 'Cód. Documento', width: 130 },
  { field: 'estado_str', headerName: 'Estado', width: 150, 
    renderCell: (params) => (
      <Chip 
        label={params.value || 'Desconocido'} 
        color={params.value === 'Aparcado' ? 'warning' : 'info'} 
      />
    )
  },
  { field: 'razon_social', headerName: 'Razón Social', width: 250 },
  { field: 'nombre_comercial', headerName: 'Nombre Comercial', width: 250 },
  { field: 'num_lineas', headerName: 'Líneas', width: 100, type: 'number' },
];

export default function OrdersPage() {
  const { data: pedidosData, isLoading: isLoadingPedidos } = usePedidos();
  const { data: operatorsData, isLoading: isLoadingOperators } = useOperators();

  const [selectionModel, setSelectionModel] = React.useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });
  const [selectedOperator, setSelectedOperator] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [toast, setToast] = React.useState({ open: false, message: '', severity: 'success' as 'success'|'error' });

  // Mapeamos los pedidos
  const rows = React.useMemo(() => {
    if (!pedidosData) return [];
    
    let allOrders = [
      ...pedidosData.aparcados.map(p => ({ ...p, id: p.cod_documento, estado_str: 'Aparcado' })),
      ...pedidosData.en_preparacion.map(p => ({ ...p, id: p.cod_documento, estado_str: 'En Preparación' }))
    ];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      allOrders = allOrders.filter(o => 
        (o.razon_social && o.razon_social.toLowerCase().includes(lower)) ||
        (o.nombre_comercial && o.nombre_comercial.toLowerCase().includes(lower)) ||
        (o.num_documento && o.num_documento.toLowerCase().includes(lower))
      );
    }
    
    return allOrders;
  }, [pedidosData, searchTerm]);

  const assignMutation = useAssignPedidos();

  const handleAssign = () => {
    if (!selectedOperator) {
      setToast({ open: true, message: 'Selecciona un operador primero', severity: 'error' });
      return;
    }
    if (!selectionModel?.ids || selectionModel.ids.size === 0) {
      setToast({ open: true, message: 'Selecciona al menos un pedido', severity: 'error' });
      return;
    }
    
    // Llamada al backend
    assignMutation.mutate({
      cod_operador: parseInt(selectedOperator),
      documentos: Array.from(selectionModel.ids) as number[]
    }, {
      onSuccess: () => {
        setToast({ open: true, message: `Asignados ${selectionModel.ids.size} pedidos correctamente.`, severity: 'success' });
        setSelectionModel({ type: 'include', ids: new Set() });
      },
      onError: (err: any) => {
        setToast({ open: true, message: `Error al asignar: ${err.message}`, severity: 'error' });
      }
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="primary.main" fontWeight="bold">
        Asignación de Pedidos
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Selecciona los pedidos aparcados y asígnalos a los operarios disponibles en la planta.
      </Typography>

      <Paper sx={{ mb: 3, p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField 
          label="Buscar pedido o cliente..." 
          variant="outlined" 
          size="small" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 300, flexGrow: 1 }}
        />
        <TextField
          select
          label="Operador Destino"
          size="small"
          value={selectedOperator}
          onChange={(e) => setSelectedOperator(e.target.value)}
          sx={{ minWidth: 250 }}
          disabled={isLoadingOperators}
        >
          <MenuItem value="">
            <em>-- Seleccionar --</em>
          </MenuItem>
          {operatorsData?.map((op) => (
            <MenuItem key={op.CODOPERADOR} value={op.CODOPERADOR}>
              {op.NOMBRE}
            </MenuItem>
          ))}
        </TextField>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AssignmentIndIcon />}
          onClick={handleAssign}
          disabled={!selectionModel?.ids || selectionModel.ids.size === 0 || assignMutation.isPending}
        >
          Asignar ({selectionModel?.ids?.size || 0})
        </Button>
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoadingPedidos}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 20 },
            },
          }}
          pageSizeOptions={[10, 20, 50]}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(newSelection) => {
            setSelectionModel(newSelection);
          }}
          rowSelectionModel={selectionModel}
        />
      </Paper>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(prev => ({...prev, open: false}))}>
        <Alert severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
