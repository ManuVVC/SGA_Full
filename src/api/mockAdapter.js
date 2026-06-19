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

// MOCK: GET /api/stock/search
mock.onGet('/stock/search').reply((config) => {
  const params = config.params || {};
  const searchType = params.type;
  const q = params.q;

  // Verificar token en headers
  const authHeader = config.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return [401, { message: 'Unauthorized' }];
  }

  if (q === '12345') {
    return [200, {
      status: "success",
      data: [
        {
          cod_articulo: 123,
          articulo_comercial: "12345",
          nombre: `MOCK (${searchType}): ARTÍCULO ÚNICO`,
          factor_conversion: 1
        }
      ]
    }];
  } else if (q === 'multiple') {
    return [200, {
      status: "success",
      data: [
        {
          cod_articulo: 111,
          articulo_comercial: "ART-111",
          nombre: "MOCK: ARTÍCULO MÚLTIPLE 1",
          factor_conversion: 1
        },
        {
          cod_articulo: 222,
          articulo_comercial: "ART-222",
          nombre: "MOCK: ARTÍCULO MÚLTIPLE 2",
          factor_conversion: 1
        }
      ]
    }];
  } else {
    // Si no es el query conocido, simulamos 404
    return [404, { message: 'ARTICULO NO ENCONTRADO' }];
  }
});

// MOCK: GET /api/stock/:cod_articulo (Ubicaciones)
mock.onGet(/\/stock\/\d+$/).reply((config) => {
  const urlParts = config.url.split('/');
  const codArticulo = parseInt(urlParts[urlParts.length - 1], 10);
  
  if (codArticulo === 222) {
    return [200, {
      status: "success",
      data: {
        ubicaciones: []
      }
    }];
  }
  
  return [200, {
    status: "success",
    data: {
      ubicaciones: [
        { cod_ubicacion: "A-01", etiqueta: "P01-N1", lote: "L23", cantidad: 10 },
        { cod_ubicacion: "A-02", etiqueta: "P01-N2", lote: "L23", cantidad: 5 },
        { cod_ubicacion: "B-05", etiqueta: "P02-N1", lote: "L24", cantidad: 20 }
      ]
    }
  }];
});

// MOCK: GET /api/stock/article/:cod_articulo/eans
mock.onGet(/\/stock\/article\/\d+\/eans$/).reply((config) => {
  const match = config.url.match(/\/stock\/article\/(\d+)\/eans/);
  const codArticulo = match ? parseInt(match[1], 10) : 0;
  
  if (codArticulo === 222) {
    return [200, {
      status: "success",
      data: []
    }];
  }
  
  return [200, {
    status: "success",
    data: [
      { CODFACTURACION: "8412345678901" },
      { CODFACTURACION: "8412345678902" }
    ]
  }];
});

export default mock;
