import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studymate_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired/invalid and not already on login page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('studymate_token');
        localStorage.removeItem('studymate_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
