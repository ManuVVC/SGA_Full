import { fetchData, mutateData } from './apiService';

/**
 * Obtiene la composición detallada de un artículo kit.
 * Si se especifica codUbicacion, incluye el stock disponible de cada componente en dicha ubicación
 * y el número máximo de kits montables.
 */
export const obtenerComposicionKit = async (codArticulo, codUbicacion = null) => {
  const url = codUbicacion 
    ? `/kits/${codArticulo}/composicion?cod_ubicacion=${codUbicacion}`
    : `/kits/${codArticulo}/composicion`;
  return fetchData(url, {}, 'Error al consultar la composición del kit');
};

/**
 * Valida con GSM_LOTES.SPPRP_CHECKUNIDADESPREPLOTE si existen unidades suficientes
 * de todos los componentes en la ubicación para montar la cantidad indicada.
 */
export const validarMontajeKit = async (codUbicacion, codArticulo, cantidad) => {
  return mutateData('post', '/kits/validar-montaje', {
    cod_ubicacion: codUbicacion,
    cod_articulo: codArticulo,
    cantidad
  }, {}, 'Error al validar el montaje del kit');
};

/**
 * Ejecuta el procedimiento GSM_LOTES.SPPRP_CrearLote para ensamblar kits en almacén.
 */
export const montarKit = async (datos) => {
  return mutateData('post', '/kits/montar', datos, {}, 'Error al ejecutar el montaje del kit');
};

/**
 * Obtiene los kits con stock disponible en una ubicación y valida si su desmontaje
 * está permitido por zonificación (GSM_LOTES.GET_PERMITIRDESMONTARLOTE).
 */
export const obtenerKitsEnUbicacion = async (codUbicacion) => {
  return fetchData(`/kits/ubicacion/${codUbicacion}`, {}, 'Error al consultar los kits de la ubicación');
};

/**
 * Valida la viabilidad de desmontar un kit (zonas y stock).
 */
export const validarDesmontajeKit = async (codUbicacion, codArticulo, numeroOrden, unidades) => {
  return mutateData('post', '/kits/validar-desmontaje', {
    cod_ubicacion: codUbicacion,
    cod_articulo: codArticulo,
    numero_orden: numeroOrden,
    unidades
  }, {}, 'Error al validar el desmontaje del kit');
};

/**
 * Ejecuta el procedimiento GSM_LOTES.SPPRP_DESMONTARLOTES para desensamblar kits.
 */
export const desmontarKit = async (datos) => {
  return mutateData('post', '/kits/desmontar', datos, {}, 'Error al desmontar el kit');
};
