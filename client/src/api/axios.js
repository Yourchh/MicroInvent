import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Interceptor para agregar el token automáticamente
api.interceptors.request.use((config) => {
  // Si el Authorization header ya fue seteado (ej. tempToken), no lo sobrescribir
  if (config.headers.Authorization) {
    return config;
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;