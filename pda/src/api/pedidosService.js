import { fetchData, mutateData } from './apiService';

export const getEnPreparacion = async () => {
  const data = await fetchData('/pedidos/en_preparacion', {}, 'Error al obtener documentos en preparación');
  return data.preparacion || [];
};

export const getAparcados = async () => {
  const data = await fetchData('/pedidos/aparcados', {}, 'Error al obtener documentos aparcados');
  return data.aparcados || [];
};

export const getLineasDocumento = async (codDocumento) => {
  const data = await fetchData(`/pedidos/lineas/${codDocumento}`, {}, 'Error al obtener líneas del documento');
  return data.lineas || [];
};

export const aparcarDocumento = async (codDocumento) => {
  return mutateData('post', '/pedidos/aparcar', { cod_documento: codDocumento }, {}, 'Error al aparcar el documento');
};

export const finalizarDocumento = async (codDocumento, despreciarRestos = false, numBultos = null) => {
  const payload = {
    cod_documento: codDocumento,
    despreciar_restos: despreciarRestos
  };
  if (numBultos !== null) {
    payload.num_bultos = parseInt(numBultos, 10);
  }
  return mutateData('post', '/pedidos/finalizar', payload, {}, 'Error al finalizar documento');
};

export const recuperarDocumento = async (codDocumento, codTerminal) => {
  return mutateData('post', '/pedidos/recuperar', {
    cod_documento: codDocumento,
    cod_terminal: codTerminal
  }, {}, 'Error al recuperar el documento aparcado');
};
