import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000/api', // La URL de tu servidor Node
});

// Interceptor: Antes de cada petición, inyectar el Token si existe
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;