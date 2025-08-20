import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: 'http://localhost:3030/api', // Adjust this to your backend URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// For example, to add the auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;