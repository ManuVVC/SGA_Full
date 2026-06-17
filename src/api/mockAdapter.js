import MockAdapter from 'axios-mock-adapter';
import apiService from './apiService';

const mock = new MockAdapter(apiService, { delayResponse: 500 }); // Simulamos 500ms de retraso

// MOCK: GET /api/auth/terminal
mock.onGet('/auth/terminal').reply((config) => {
  return [200, {
    status: 'success',
    terminal: {
      CODTERMINAL: 'TERM01',
      DESCRIPCION: 'Terminal de Pruebas Mock',
      CODOPERADOR: null,
      NOMBREOPERADOR: null,
      PRM_BLOQUEADO: 0
    }
  }];
});

// MOCK: POST /api/auth/login
mock.onPost('/auth/login').reply((config) => {
  const { username, password } = JSON.parse(config.data);
  const upperUser = username.toUpperCase();

  if (upperUser === 'CODIGO' && password === '123') {
    return [200, {
      token: 'mock_jwt_token_1234567890',
      permissions: {
        PRM_INVENTARIO: true,
        PRM_RECEPCION: false,
        PRM_EXPEDICION: true,
      }
    }];
  } else if (upperUser === 'CODIGO') {
    return [401, { message: 'Contraseña Incorrecta' }];
  } else {
    return [404, { message: 'Operador Inexistente' }];
  }
});

// MOCK: GET /api/stock/ean/<ean>
mock.onGet(/\/stock\/ean\/.+/).reply((config) => {
  // Extraer el EAN de la URL
  const ean = config.url.split('/').pop();
  
  // Verificar token en headers
  const authHeader = config.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return [401, { message: 'Unauthorized' }];
  }

  if (ean === '12345') {
    return [200, {
      articulo_comercial: "12345",
      nombre: "MOCK: DESCRIPCION DEL ARTICULO DE PRUEBA",
      ubicaciones: [
        { cod_ubicacion: "A-01", etiqueta: "P01-N1", lote: "L23", cantidad: 10 },
        { cod_ubicacion: "A-02", etiqueta: "P01-N2", lote: "L23", cantidad: 5 },
        { cod_ubicacion: "B-05", etiqueta: "P02-N1", lote: "L24", cantidad: 20 }
      ]
    }];
  } else {
    // Si no es el EAN 12345, simulamos 404
    return [404, { message: 'EAN NO ENCONTRADO o SIN STOCK' }];
  }
});

export default mock;
