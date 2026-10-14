import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Pedido {
  cod_documento: number;
  referencia?: string;
  estado?: string;
  fecha?: string;
  operador_asignado?: string;
  [key: string]: any;
}

export interface PedidosResponse {
  status: string;
  aparcados: Pedido[];
  en_preparacion: Pedido[];
}

export const getPedidos = async (): Promise<PedidosResponse> => {
  const { data } = await apiClient.get<PedidosResponse>('/admin/pedidos');
  return data;
};

export const usePedidos = () => {
  return useQuery({
    queryKey: ['pedidos'],
    queryFn: getPedidos,
    refetchInterval: 10000, // Refrescar cada 10 segundos para ver cambios en tiempo real
  });
};
export const assignPedidos = async (params: { cod_operador: number, documentos: number[] }) => {
  const { data } = await apiClient.post('/admin/pedidos/asignar', params);
  return data;
};

import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useAssignPedidos = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignPedidos,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
};
