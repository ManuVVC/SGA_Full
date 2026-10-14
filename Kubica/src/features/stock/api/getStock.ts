import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface StockItem {
  ubicacion: string;
  codarticulo: string;
  nombrearticulo: string;
  lote: string;
  stock: number;
  cajas: number;
  fechacaducidad: string | null;
  ultimomovimiento: string;
  bloqueosalida: number;
}

export interface StockResponse {
  status: string;
  data: StockItem[];
  pagina: number;
  tamano: number;
  total: number;
}

export const getStock = async (page: number, pageSize: number, query: string = '', almacen: string = '') => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('size', pageSize.toString());
  if (query) params.append('q', query);
  if (almacen) params.append('almacen', almacen);

  const { data } = await apiClient.get<StockResponse>('/admin/inventario/stock?' + params.toString());
  return data;
};

export const useStock = (page: number, pageSize: number, query: string = '', almacen: string = '') => {
  return useQuery({
    queryKey: ['stock', page, pageSize, query, almacen],
    queryFn: () => getStock(page, pageSize, query, almacen),
    refetchInterval: 30000,
  });
};

export interface Pasillo {
  pasillo: string;
  total: number;
  ocupadas: number;
  total_stock: number;
  total_cajas: number;
  porcentaje: number;
}

export const getPasillos = async (almacen: string) => {
  const { data } = await apiClient.get<{status: string, data: Pasillo[]}>('/admin/inventario/pasillos?almacen=' + almacen);
  return data.data;
};

export const usePasillos = (almacen: string) => {
  return useQuery({
    queryKey: ['pasillos', almacen],
    queryFn: () => getPasillos(almacen),
    staleTime: 5 * 60 * 1000, // 5 min
    enabled: !!almacen,
  });
};

export interface Almacen {
  codalmacen: number;
  descripcion: string;
}

export const getAlmacenes = async () => {
  const { data } = await apiClient.get<{status: string, data: Almacen[]}>('/admin/almacenes');
  return data.data;
};

export const useAlmacenes = () => {
  return useQuery({
    queryKey: ['almacenes'],
    queryFn: getAlmacenes,
    staleTime: 10 * 60 * 1000,
  });
};

export interface UbicacionArticulo {
  codigo: string;
  descripcion: string;
  stock: number;
  cajas: number;
}

export interface UbicacionDetalle {
  nombre: string;
  columna: number;
  altura: number;
  posicion: number;
  stock: number;
  cajas: number;
  skus: number;
  ocupada: boolean;
  articulos: UbicacionArticulo[];
}

export const getPasilloDetalle = async (almacen: string, pasillo: string) => {
  const params = new URLSearchParams({ almacen, pasillo });
  const response = await apiClient.get<{ status: string; data: UbicacionDetalle[] }>(
    `/admin/inventario/pasillo_detalle?${params.toString()}`
  );
  return response.data.data;
};

export const usePasilloDetalle = (almacen: string, pasillo: string) => {
  return useQuery({
    queryKey: ['pasilloDetalle', almacen, pasillo],
    queryFn: () => getPasilloDetalle(almacen, pasillo),
    enabled: !!almacen && !!pasillo,
  });
};

export const getExpiringStock = async (almacen: string, meses: number) => {
  const { data } = await apiClient.get<{ status: string; data: StockItem[] }>(
    `/admin/inventario/caducidades?almacen=${almacen}&meses=${meses}`
  );
  return data.data;
};

export const useExpiringStock = (almacen: string, meses: number) => {
  return useQuery({
    queryKey: ['expiringStock', almacen, meses],
    queryFn: () => getExpiringStock(almacen, meses),
    enabled: !!almacen,
  });
};
