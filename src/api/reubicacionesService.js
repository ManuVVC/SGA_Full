import apiService from './apiService';

export const validarUbicacion = async (ubicacion, posicion = null) => {
  const payload = { ubicacion };
  if (posicion !== null) {
    payload.posicion = posicion;
  }
  const response = await apiService.post('/reubicaciones/validar-ubicacion', payload);
  return response.data;
};

export const validarArticulo = async (articulo, tipoBusqueda = 'auto') => {
  const response = await apiService.post('/reubicaciones/validar-articulo', {
    articulo,
    tipo_busqueda: tipoBusqueda
  });
  return response.data;
};

export const validarCantidad = async (codUbicacion, codArticulo, cantidad, unidadesConversion) => {
  const response = await apiService.post('/reubicaciones/validar-cantidad', {
    cod_ubicacion: codUbicacion,
    cod_articulo: codArticulo,
    cantidad,
    unidades_conversion: unidadesConversion
  });
  return response.data;
};

export const obtenerLotesDisponibles = async (codUbicacion, codArticulo) => {
  const response = await apiService.post('/reubicaciones/lotes-disponibles', {
    cod_ubicacion: codUbicacion,
    cod_articulo: codArticulo
  });
  return response.data;
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

  const response = await apiService.post('/reubicaciones/grabar', payload);
  return response.data;
};
