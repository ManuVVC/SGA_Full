
'use client';

import { Box, Typography, Card, CardContent, Button, Grid, CircularProgress } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';
import Link from 'next/link';
import { useExpiringStock } from '@/features/stock/api/getStock';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const { data: expiringData, isLoading: isExpiringLoading } = useExpiringStock('10', 1);
  const expiringCount = expiringData ? expiringData.length : 0;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom color="primary.main">
        Dashboard General - Almacén
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Bienvenido al panel de control (Kubica).
      </Typography>

      <Grid container spacing={3}>
        {/* KPI: Órdenes Pendientes */}
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card elevation={2}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'primary.light', p: 1.5, borderRadius: 2, display: 'flex' }}>
                <AssignmentIcon sx={{ color: 'primary.contrastText' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight="bold">24</Typography>
                <Typography variant="body2" color="text.secondary">Pedidos Pendientes</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* KPI: Stock Total */}
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card elevation={2}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'secondary.light', p: 1.5, borderRadius: 2, display: 'flex' }}>
                <InventoryIcon sx={{ color: 'secondary.contrastText' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight="bold">12,400</Typography>
                <Typography variant="body2" color="text.secondary">Artículos en Stock</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* KPI: Entradas Hoy */}
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card elevation={2}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'success.light', p: 1.5, borderRadius: 2, display: 'flex' }}>
                <LocalShippingIcon sx={{ color: 'success.contrastText' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight="bold">8</Typography>
                <Typography variant="body2" color="text.secondary">Entradas Hoy</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* KPI: Próximas Caducidades */}
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card 
            elevation={2} 
            sx={{ cursor: 'pointer', border: '1px solid', borderColor: expiringCount > 0 ? 'error.main' : 'transparent', '&:hover': { bgcolor: '#fef2f2' } }}
            onClick={() => router.push('/expiring')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: expiringCount > 0 ? 'error.main' : 'grey.400', p: 1.5, borderRadius: 2, display: 'flex' }}>
                <WarningIcon sx={{ color: 'white' }} />
              </Box>
              <Box>
                {isExpiringLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <>
                    <Typography variant="h5" fontWeight="bold" color={expiringCount > 0 ? 'error.main' : 'text.primary'}>
                      {expiringCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Caducan en 1 mes</Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
        <Link href="/orders" passHref style={{ textDecoration: 'none' }}>
          <Button variant="contained" color="primary" startIcon={<AssignmentIcon />}>
            Ir a Asignación
          </Button>
        </Link>
        <Link href="/locations" passHref style={{ textDecoration: 'none' }}>
          <Button variant="outlined" color="primary" startIcon={<InventoryIcon />}>
            Ver Ubicaciones
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
