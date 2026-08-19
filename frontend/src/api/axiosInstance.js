import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let accessToken = null;

export const getAuthToken = () => accessToken;

export const setAuthToken = (token) => {
  accessToken = token || null;
  if (accessToken) api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  else delete api.defaults.headers.common.Authorization;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
}, (error) => Promise.reject(error));

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!error.response || !originalRequest) return Promise.reject(error);

    const isAuthEndpoint = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']
      .some((path) => originalRequest.url?.includes(path));

    if (error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => { originalRequest.headers.Authorization = `Bearer ${token}`; return api(originalRequest); });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const res = await api.post('/auth/refresh');
        const newToken = res.data?.data?.accessToken;
        if (!newToken) throw new Error('Refresh response did not include an access token');
        setAuthToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        setAuthToken(null);
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
        if (!publicPaths.some((path) => window.location.pathname.startsWith(path))) window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
