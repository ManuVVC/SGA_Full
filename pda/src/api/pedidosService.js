import apiService from './apiService';

export const getEnPreparacion = async () => {
  try {
    const response = await apiService.get('/pedidos/en_preparacion');
    return response.data.preparacion || [];
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener documentos en preparación';
  }
};

export const getAparcados = async () => {
  try {
    const response = await apiService.get('/pedidos/aparcados');
    return response.data.aparcados || [];
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener documentos aparcados';
  }
};

export const getLineasDocumento = async (codDocumento) => {
  try {
    const response = await apiService.get(`/pedidos/lineas/${codDocumento}`);
    return response.data.lineas || [];
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener líneas del documento';
  }
};

export const aparcarDocumento = async (codDocumento) => {
  try {
    const response = await apiService.post('/pedidos/aparcar', {
      cod_documento: codDocumento
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al aparcar el documento';
  }
};

export const finalizarDocumento = async (codDocumento, despreciarRestos = false, numBultos = null) => {
  try {
    const payload = {
      cod_documento: codDocumento,
      despreciar_restos: despreciarRestos
    };
    if (numBultos !== null) {
      payload.num_bultos = parseInt(numBultos, 10);
    }
    const response = await apiService.post('/pedidos/finalizar', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al finalizar documento';
  }
};

export const recuperarDocumento = async (codDocumento, codTerminal) => {
  try {
    const response = await apiService.post('/pedidos/recuperar', {
      cod_documento: codDocumento,
      cod_terminal: codTerminal
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al recuperar el documento aparcado';
  }
};
