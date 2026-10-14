import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api-proxy', // Utiliza el proxy configurado en next.config.ts
  headers: {
    'Content-Type': 'application/json',
  },
});
