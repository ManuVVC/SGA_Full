import apiService from './apiService';

/** Obtiene el documento asignado al terminal del operario. */
export const obtenerDocumento = async () => {
  try {
    const response = await apiService.get('/preparacion/obtener-documento');
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener documento para preparar';
  }
};

/**
 * Obtiene los parámetros PRM_SOLICITAR* y PRM_PUEDESERVIRMAS del operario en sesión.
 * solicitar_ubicacion / solicitar_articulo / solicitar_cantidad: -1=activo, 0=no
 */
export const getPermisosPreparacion = async () => {
  try {
    const response = await apiService.get('/preparacion/permisos');
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener permisos de preparación';
  }
};

/** Obtiene la cabecera completa del pedido. */
export const getCabeceraPedido = async (codDocumento) => {
  try {
    const response = await apiService.get(`/preparacion/cabecera/${codDocumento}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener cabecera del pedido';
  }
};

/** Devuelve todas las líneas pendientes (para el selector de líneas). */
export const getLineasPendientes = async (codDocumento) => {
  try {
    const response = await apiService.get(`/preparacion/lineas-pendientes/${codDocumento}`);
    return response.data.lineas || [];
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener líneas pendientes';
  }
};

/**
 * Obtiene la primera línea a preparar.
 * SPPRP_ARTICULOSPARAPREPARAR ya llama internamente a SPPRP_INSTMP_ARTPARAPREPARAR.
 */
export const getPrimeraLinea = async (codDocumento) => {
  try {
    const response = await apiService.post('/preparacion/primera-linea', { cod_documento: codDocumento });
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener primera línea';
  }
};

/**
 * Devuelve el siguiente o anterior artículo a preparar.
 * @param {object} params - { cod_documento, cod_ubicacion, numero_orden,
 *   tipo_avance (0=siguiente, 1=anterior), cod_ubicacion_actual, cod_articulo, cant_solicitada? }
 */
export const siguienteLinea = async (params) => {
  try {
    const response = await apiService.post('/preparacion/siguiente-linea', params);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener siguiente línea';
  }
};

/**
 * Registra las unidades preparadas de una línea.
 * @param {object} params - { cod_documento, cod_ubicacion, cod_articulo, num_linea, unidades,
 *   fecha_caducidad?, numero_lote?, cod_tipo_dato_maestro?, cod_dato_maestro? }
 */
export const cargarMercancia = async (params) => {
  try {
    const response = await apiService.post('/preparacion/cargar-mercancia', params);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al cargar mercancía';
  }
};

/**
 * Valida que una ubicación exista a partir de su código o hueco.
 * @param {string} cod_hueco 
 */
export const validarUbicacion = async (cod_hueco, cod_ubicacion_esperada, posicion = null) => {
  try {
    const response = await apiService.post('/preparacion/validar-ubicacion', { cod_hueco, cod_ubicacion_esperada, posicion });
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al validar ubicación';
  }
};

/**
 * Obtiene los lotes/caducidades disponibles para un artículo en una ubicación específica.
 * @param {number} cod_ubicacion 
 * @param {number} cod_articulo 
 */
export const getStockLotes = async (cod_ubicacion, cod_articulo) => {
  try {
    const response = await apiService.post('/preparacion/stock-lotes', { cod_ubicacion, cod_articulo });
    return response.data.lotes || [];
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener stock por lotes';
  }
};
