import axios from 'axios';

// Usamos una URL base genérica. Como tenemos mock, interceptará las llamadas.
const apiService = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Peticiones: Añadir el token JWT
apiService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sga_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Respuestas: Manejar 401 Globalmente
apiService.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Limpiar datos locales
      localStorage.removeItem('sga_token');
      localStorage.removeItem('sga_permissions');
      // Emitir un evento para que App.jsx redirija al login, 
      // o usar una redirección directa (window.location.href = '/')
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiService;
