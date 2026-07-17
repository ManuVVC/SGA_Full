import apiClient from './apiService';

export const getClientes = async (filtro) => {
  const response = await apiClient.get(`/devoluciones/clientes?filtro=${encodeURIComponent(filtro)}`);
  return response.data;
};

export const getParametros = async () => {
  const response = await apiClient.get('/devoluciones/parametros');
  return response.data;
};

export const crearCabecera = async (payload) => {
  const response = await apiClient.post('/devoluciones/cabecera', payload);
  return response.data;
};

export const grabarLineaDevolucion = async (payload) => {
  const response = await apiClient.post('/devoluciones/linea', payload);
  return response.data;
};

export const getDevolucionEnCurso = async () => {
  const response = await apiClient.get('/devoluciones/en-curso');
  return response.data;
};

export const getLineasDevolucion = async (codDocumento) => {
  const response = await apiClient.get(`/devoluciones/lineas/${codDocumento}`);
  return response.data;
};

export const finalizarDevolucion = async (codDocumento) => {
  const response = await apiClient.post('/devoluciones/finalizar', { CODDOCUMENTO: codDocumento });
  return response.data;
};
