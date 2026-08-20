import apiService, { fetchData, mutateData } from './apiService';

/** Obtiene el documento asignado al terminal del operario. */
export const obtenerDocumento = async () => {
  return fetchData('/preparacion/obtener-documento', {}, 'Error al obtener documento para preparar');
};

/**
 * Obtiene los parámetros PRM_SOLICITAR* y PRM_PUEDESERVIRMAS del operario en sesión.
 * solicitar_ubicacion / solicitar_articulo / solicitar_cantidad: -1=activo, 0=no
 */
export const getPermisosPreparacion = async () => {
  return fetchData('/preparacion/permisos', {}, 'Error al obtener permisos de preparación');
};

/** Obtiene la cabecera completa del pedido. */
export const getCabeceraPedido = async (codDocumento) => {
  return fetchData(`/preparacion/cabecera/${codDocumento}`, {}, 'Error al obtener cabecera del pedido');
};

/** Devuelve todas las líneas pendientes (para el selector de líneas). */
export const getLineasPendientes = async (codDocumento) => {
  const data = await fetchData(`/preparacion/lineas-pendientes/${codDocumento}`, {}, 'Error al obtener líneas pendientes');
  return data.lineas || [];
};

/** Devuelve el conteo de líneas pendientes. */
export const getNumLineasPendientes = async (codDocumento) => {
  const data = await fetchData(`/preparacion/num-lineas-pendientes/${codDocumento}`, {}, 'Error al obtener número de líneas pendientes');
  return data.num_lineas || 0;
};

/**
 * Obtiene la primera línea a preparar.
 * SPPRP_ARTICULOSPARAPREPARAR ya llama internamente a SPPRP_INSTMP_ARTPARAPREPARAR.
 */
export const getPrimeraLinea = async (codDocumento) => {
  return mutateData('post', '/preparacion/primera-linea', { cod_documento: codDocumento }, {}, 'Error al obtener primera línea');
};

/**
 * Devuelve el siguiente o anterior artículo a preparar.
 * @param {object} params - { cod_documento, cod_ubicacion, numero_orden,
 *   tipo_avance (0=siguiente, 1=anterior), cod_ubicacion_actual, cod_articulo, cant_solicitada? }
 */
export const siguienteLinea = async (params) => {
  return mutateData('post', '/preparacion/siguiente-linea', params, {}, 'Error al obtener siguiente línea');
};

/**
 * Registra las unidades preparadas de una línea.
 * @param {object} params - { cod_documento, cod_ubicacion, cod_articulo, num_linea, unidades,
 *   fecha_caducidad?, numero_lote?, cod_tipo_dato_maestro?, cod_dato_maestro? }
 */
export const cargarMercancia = async (params) => {
  return mutateData('post', '/preparacion/cargar-mercancia', params, {}, 'Error al cargar mercancía');
};

/**
 * Consulta las unidades ya preparadas en el terminal para esta línea/artículo/ubicación.
 * Llama a SPPRP_GET_UNIDSPREPDOCXUBIC.
 * @param {object} params - { cod_documento, num_linea, cod_ubicacion, cod_articulo, fecha_caducidad?, numero_lote? }
 */
export const getUnidsPreparadas = async (params) => {
  try {
    return await mutateData('post', '/preparacion/unids-preparadas', params);
  } catch (error) {
    // Si falla, devolvemos 0 para no bloquear el flujo
    console.warn('Error al consultar unidades preparadas:', error);
    return { unidades_preparadas: 0, unidades_preparadas_misma_fecha: 0, peso_preparado: 0, peso_preparado_misma_fecha: 0 };
  }
};

/**
 * Valida que una ubicación exista a partir de su código o hueco.
 * @param {string} cod_hueco 
 */
export const validarUbicacion = async (cod_hueco, cod_ubicacion_esperada, posicion = null) => {
  return mutateData('post', '/preparacion/validar-ubicacion', { cod_hueco, cod_ubicacion_esperada, posicion }, {}, 'Error al validar ubicación');
};

/**
 * Obtiene los lotes/caducidades disponibles para un artículo en una ubicación específica.
 * @param {number} cod_ubicacion 
 * @param {number} cod_articulo 
 */
export const getStockLotes = async (cod_ubicacion, cod_articulo) => {
  const data = await mutateData('post', '/preparacion/stock-lotes', { cod_ubicacion, cod_articulo }, {}, 'Error al obtener stock por lotes');
  return data.lotes || [];
};

/** Consulta el stock contenido en una ubicación por ID de ubicación */
export const getContenidoUbicacion = async (codUbicacion) => {
  try {
    const response = await apiService.get(`/stock/ubicacion/${codUbicacion}`);
    return response.data?.data || {};
  } catch (error) {
    throw error.response?.data?.message || error.response?.data?.error || 'Error al obtener el contenido de la ubicación';
  }
};

/** Consulta las ubicaciones donde hay stock de un artículo por ID o código de artículo */
export const getUbicacionesArticulo = async (codArticulo) => {
  try {
    const response = await apiService.get(`/stock/${codArticulo}`);
    return response.data?.data || {};
  } catch (error) {
    throw error.response?.data?.message || error.response?.data?.error || 'Error al obtener las ubicaciones del artículo';
  }
};

/** Consulta si existe un pedido directo en curso para el operario/terminal actual */
export const getPedidoDirectoEnCurso = async () => {
  return fetchData('/preparacion/directo/en-curso', {}, 'Error al consultar pedido directo en curso');
};

/** Crea una nueva cabecera para pedido directo */
export const crearCabeceraPedidoDirecto = async (params) => {
  return mutateData('post', '/preparacion/directo/cabecera', params, {}, 'Error al crear cabecera de pedido directo');
};

/** Graba una línea y carga mercancía en un pedido directo */
export const grabarLineaPedidoDirecto = async (params) => {
  return mutateData('post', '/preparacion/directo/linea', params, {}, 'Error al grabar línea de pedido directo');
};

/** Obtiene el listado de líneas preparadas de un pedido directo en curso */
export const getLineasPedidoDirecto = async (codDocumento) => {
  return fetchData(`/preparacion/directo/lineas/${codDocumento}`, {}, 'Error al obtener líneas del pedido directo');
};

