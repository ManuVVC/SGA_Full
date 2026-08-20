import { fetchData, mutateData } from './apiService';

export const getParametros = async () => {
  return fetchData('/entradas/parametros', {}, 'Error al obtener parámetros de entrada');
};

export const getMuelles = async () => {
  return fetchData('/entradas/muelles', {}, 'Error al obtener lista de muelles');
};

export const getAlbaranesEnCurso = async (codmuelle) => {
  return fetchData(`/entradas/albaranes-en-curso?codmuelle=${codmuelle}`, {}, 'Error al obtener albaranes en curso');
};

export const getProveedoresPendientes = async () => {
  return fetchData('/entradas/proveedores-pendientes', {}, 'Error al obtener proveedores pendientes');
};

export const getTodosProveedores = async () => {
  return fetchData('/entradas/proveedores', {}, 'Error al obtener lista de proveedores');
};

export const getPedidosPendientes = async (codproveedor) => {
  return fetchData(`/entradas/pedidos-pendientes?codproveedor=${codproveedor}`, {}, 'Error al obtener pedidos pendientes');
};

export const crearAlbaran = async (payload) => {
  return mutateData('post', '/entradas/crear-albaran', payload, {}, 'Error al crear albarán');
};

export const grabarLineaEntrada = async (payload) => {
  return mutateData('post', '/entradas/grabar-linea', payload, {}, 'Error al grabar línea de entrada');
};

export const finalizarEntrada = async (coddocumento) => {
  return mutateData('post', '/entradas/finalizar', { CODDOCUMENTO: coddocumento }, {}, 'Error al finalizar entrada');
};

export const getLineasGrabadas = async (coddocumento) => {
  return fetchData(`/entradas/lineas-grabadas/${coddocumento}`, {}, 'Error al obtener líneas grabadas');
};

export const getDetalleLinea = async (codlineadocumentoproveedor) => {
  return fetchData(`/entradas/detalle-linea/${codlineadocumentoproveedor}`, {}, 'Error al obtener detalle de línea');
};

export const getLineasPendientes = async (coddocumento_albaran) => {
  const t = new Date().getTime();
  return fetchData(`/entradas/lineas-pendientes/${coddocumento_albaran}?t=${t}`, {}, 'Error al obtener líneas pendientes');
};

export const getArticuloInfoEan = async (ean) => {
  return fetchData(`/entradas/articulo-info/${ean}`, {}, 'Error al obtener información de artículo por EAN');
};
