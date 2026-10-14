import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Operator {
  CODOPERADOR: number;
  NOMBRE: string;
}

interface OperatorsResponse {
  status: string;
  data: Operator[];
}

export function useOperators() {
  return useQuery({
    queryKey: ['operators'],
    queryFn: async () => {
      const response = await apiClient.get<OperatorsResponse>('/admin/operadores');
      return response.data.data;
    },
  });
}
