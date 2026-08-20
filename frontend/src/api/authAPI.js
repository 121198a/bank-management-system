import api from './axiosInstance';

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
