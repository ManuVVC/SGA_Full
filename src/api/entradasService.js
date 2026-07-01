import apiClient from './apiService';

export const getParametros = async () => {
  const response = await apiClient.get('/entradas/parametros');
  return response.data;
};

export const getMuelles = async () => {
  const response = await apiClient.get('/entradas/muelles');
  return response.data;
};

export const getAlbaranesEnCurso = async (codmuelle) => {
  const response = await apiClient.get(`/entradas/albaranes-en-curso?codmuelle=${codmuelle}`);
  return response.data;
};

export const getProveedoresPendientes = async () => {
  const response = await apiClient.get('/entradas/proveedores-pendientes');
  return response.data;
};

export const getPedidosPendientes = async (codproveedor) => {
  const response = await apiClient.get(`/entradas/pedidos-pendientes?codproveedor=${codproveedor}`);
  return response.data;
};

export const crearAlbaran = async (payload) => {
  const response = await apiClient.post('/entradas/crear-albaran', payload);
  return response.data;
};

export const grabarLineaEntrada = async (payload) => {
  const response = await apiClient.post('/entradas/grabar-linea', payload);
  return response.data;
};

export const finalizarEntrada = async (coddocumento) => {
  const response = await apiClient.post('/entradas/finalizar', { CODDOCUMENTO: coddocumento });
  return response.data;
};

export const getLineasGrabadas = async (coddocumento) => {
  const response = await apiClient.get(`/entradas/lineas-grabadas/${coddocumento}`);
  return response.data;
};

export const getDetalleLinea = async (codlineadocumentoproveedor) => {
  const response = await apiClient.get(`/entradas/detalle-linea/${codlineadocumentoproveedor}`);
  return response.data;
};

export const getLineasPendientes = async (coddocumento_albaran) => {
  const response = await apiClient.get(`/entradas/lineas-pendientes/${coddocumento_albaran}`);
  return response.data;
};

export const getArticuloInfoEan = async (ean) => {
  const response = await apiClient.get(`/entradas/articulo-info/${ean}`);
  return response.data;
};
