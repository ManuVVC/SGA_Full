import axios from 'axios';

const adminApi = axios.create({
  baseURL: '/admin',
  timeout: 10000
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default adminApi;
