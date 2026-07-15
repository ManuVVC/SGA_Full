import axios from 'axios';
import axiosRetry from 'axios-retry';

// ── Instancia principal de Axios ─────────────────────────────────────────────
// El timeout se amplía a 8s para dar margen al último reintento.
// En producción el proxy Nginx redirige /api/* al backend Flask.
const apiService = axios.create({
  baseURL: '/api',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// ── Reintentos automáticos con backoff exponencial ───────────────────────────
//
// Contexto: En almacenes con estanterías metálicas es habitual perder
// momentáneamente la cobertura Wi-Fi al desplazarse entre pasillos.
// Si el operario escanea un EAN justo en una "zona de sombra", la petición
// puede fallar en décimas de segundo. En lugar de mostrar inmediatamente
// un error rojo, esta configuración reintenta silenciosamente la petición
// hasta 3 veces antes de rendir:
//
//   Intento 1 → fallo → espera 1s
//   Intento 2 → fallo → espera 2s
//   Intento 3 → fallo → espera 4s
//   Error visible para el operario (~7s máximo de espera total)
//
// IMPORTANTE: Los errores 4xx (EAN inválido, sin permisos, etc.) son
// errores de lógica de negocio y NO se reintentarán. Solo se reintenta
// cuando el servidor no responde (red caída) o devuelve un error 5xx.
axiosRetry(apiService, {
  retries: 3,

  // Backoff exponencial: 1s → 2s → 4s entre intentos
  retryDelay: (retryCount) => axiosRetry.exponentialDelay(retryCount),

  // Solo reintentar errores de red (Wi-Fi caído) o errores 5xx del servidor
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error),

  // Log silencioso en consola para diagnóstico (invisible para el operario)
  onRetry: (retryCount, error, requestConfig) => {
    console.warn(
      `[SGA][axios-retry] Reintento ${retryCount}/3 · ` +
      `Ruta: ${requestConfig.url} · ` +
      `Motivo: ${error.message}`
    );
  },
});

// ── Interceptor de Peticiones: Adjuntar token JWT ────────────────────────────
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

// ── Interceptor de Respuestas: Manejar 401 globalmente ───────────────────────
// Este interceptor se ejecuta DESPUÉS de que axios-retry haya agotado
// todos los intentos, por lo que el error ya es definitivo.
apiService.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Sesión expirada o token inválido: limpiar datos locales y redirigir al login
      localStorage.removeItem('sga_token');
      localStorage.removeItem('sga_permissions');
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiService;
