import { mutateData } from './apiService';

export const validarUbicacion = async (ubicacion, posicion = null) => {
  const payload = { ubicacion };
  if (posicion !== null) {
    payload.posicion = posicion;
  }
  return mutateData('post', '/reubicaciones/validar-ubicacion', payload, {}, 'Error al validar ubicación');
};

export const validarArticulo = async (articulo, tipoBusqueda = 'auto') => {
  return mutateData('post', '/reubicaciones/validar-articulo', {
    articulo,
    tipo_busqueda: tipoBusqueda
  }, {}, 'Error al validar artículo');
};

export const validarCantidad = async (codUbicacion, codArticulo, cantidad, unidadesConversion) => {
  return mutateData('post', '/reubicaciones/validar-cantidad', {
    cod_ubicacion: codUbicacion,
    cod_articulo: codArticulo,
    cantidad,
    unidades_conversion: unidadesConversion
  }, {}, 'Error al validar cantidad');
};

export const obtenerLotesDisponibles = async (codUbicacion, codArticulo) => {
  return mutateData('post', '/reubicaciones/lotes-disponibles', {
    cod_ubicacion: codUbicacion,
    cod_articulo: codArticulo
  }, {}, 'Error al obtener lotes disponibles');
};

export const grabarReubicacion = async (origen, destino, articulo, cantidad, lote = null) => {
  // Asegurarnos de mandar la cantidad en positivo
  const cantidadReal = Math.abs(cantidad);
  
  const payload = {
    origen,
    destino,
    articulo,
    cantidad: cantidadReal
  };

  if (lote) {
    payload.lote = lote;
  }

  return mutateData('post', '/reubicaciones/grabar', payload, {}, 'Error al grabar reubicación');
};

export const validarPalet = async (sscc) => {
  return mutateData('post', '/reubicaciones/validar-palet', { sscc }, {}, 'Error al validar palet');
};

export const grabarReubicacionPalet = async (palet, destino) => {
  return mutateData('post', '/reubicaciones/grabar-palet', {
    palet,
    destino
  }, {}, 'Error al grabar reubicación de palet');
};
