 import apiClient from './client';

export const authService = {
  register: async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    location?: string;
    otp?: string;
  }) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    
    if (response.data.token) {
      localStorage.setItem('jwt_token', response.data.token);
      localStorage.setItem('session_id', response.data.sessionId);
    }
    
    return response.data;
  },

  logout: async () => {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('session_id');
  },

  getProfile: async () => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },
};
