import api from './axiosInstance';

// IMPORTANT: login/logout/refresh are intentionally NOT exposed here.
// They live exclusively in AuthContext (src/context/AuthContext.jsx), which
// is the single source of truth that keeps the axios-level access token
// (sessionStorage, via setAuthToken) and the React-level `user` state in
// sync. Having a second, parallel implementation of login here previously
// caused a bug where pages calling authAPI.login() directly would set the
// token correctly, but AuthContext's own state (and its silent-refresh
// timer) never found out about it — leading to intermittent "access denied"
// errors after the first background token refresh. Only stateless,
// one-shot auth calls belong in this file.

export const authAPI = {
  register: async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (token, password) => {
    const res = await api.post(`/auth/reset-password/${token}`, { password });
    return res.data;
  }
};
