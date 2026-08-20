import { fetchData, mutateData } from './apiService';

export const getClientes = async (filtro) => {
  return fetchData(`/devoluciones/clientes?filtro=${encodeURIComponent(filtro)}`, {}, 'Error al obtener clientes para devolución');
};

export const getParametros = async () => {
  return fetchData('/devoluciones/parametros', {}, 'Error al obtener parámetros de devolución');
};

export const crearCabecera = async (payload) => {
  return mutateData('post', '/devoluciones/cabecera', payload, {}, 'Error al crear cabecera de devolución');
};

export const grabarLineaDevolucion = async (payload) => {
  return mutateData('post', '/devoluciones/linea', payload, {}, 'Error al grabar línea de devolución');
};

export const getDevolucionEnCurso = async () => {
  return fetchData('/devoluciones/en-curso', {}, 'Error al obtener devolución en curso');
};

export const getLineasDevolucion = async (codDocumento) => {
  return fetchData(`/devoluciones/lineas/${codDocumento}`, {}, 'Error al obtener líneas de la devolución');
};

export const finalizarDevolucion = async (codDocumento) => {
  return mutateData('post', '/devoluciones/finalizar', { CODDOCUMENTO: codDocumento }, {}, 'Error al finalizar devolución');
};
