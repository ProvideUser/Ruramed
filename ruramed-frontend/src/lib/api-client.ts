import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/store/auth.store';

// ================================
// Axios Client Configuration
// ================================
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ================================
// Token Refresh Queue Management
// ================================
let isRefreshing = false;
let failedQueue: Array<{
  onSuccess: (token: string) => void;
  onFail: (error: AxiosError) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.onFail(error);
    else if (token) prom.onSuccess(token);
  });
  failedQueue = [];
  isRefreshing = false;
};

// ================================
// Public Routes (No Auth Required)
// ================================
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/refresh',
];

const isPublicRoute = (url: string): boolean => {
  return PUBLIC_ROUTES.some((route) => url.includes(route));
};

// ================================
// Request Interceptor
// ================================
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('jwt_token');
      const sessionId = localStorage.getItem('session_id'); // ✅ GET SESSION ID
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Only add auth headers for non-public routes
      if (!isPublicRoute(config.url || '')) {
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // ✅ ADD SESSION ID HEADER (Required by backend)
        if (sessionId) {
          config.headers['x-session-id'] = sessionId;
        }
      }

      config.headers['x-timezone'] = timezone;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ================================
// Response Interceptor
// ================================
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,

  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip if no config or already retried
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Only handle 401 errors
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const requestUrl = originalRequest.url || '';
      const errorData = error.response?.data;

      // Skip handling for public routes
      if (isPublicRoute(requestUrl)) {
        console.log('🔓 Public route - skipping token refresh');
        return Promise.reject(error);
      }

      // ================================
      // Handle Different 401 Scenarios
      // ================================
      
      // ✅ Case 1: Token Expired (refresh it)
      if (errorData?.error === 'Token expired' || error.response.data?.expired_at) {
        if (!isRefreshing) {
          isRefreshing = true;
          originalRequest._retry = true;

          const refreshToken = localStorage.getItem('refresh_token');

          if (!refreshToken) {
            console.warn('🔐 No refresh token found - logging out');
            useAuthStore.getState().logout();
            processQueue(error, null);
            window.location.href = '/login?session=expired';
            return Promise.reject(error);
          }

          try {
            console.log('🔄 Token expired - refreshing access token...');
            
            const response = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
              { refreshToken },
              { 
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
              }
            );

            const { accessToken, expiresIn } = response.data;

            if (!accessToken) {
              throw new Error('No access token in refresh response');
            }

            console.log('✅ Token refreshed successfully');

            // Update token in localStorage
            localStorage.setItem('jwt_token', accessToken);

            // Update Zustand store
            useAuthStore.getState().setAccessToken?.(accessToken);

            // Process queued requests
            processQueue(null, accessToken);

            // Retry original request with new token
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            
            // ✅ RE-ADD SESSION ID to retry request
            const sessionId = localStorage.getItem('session_id');
            if (sessionId) {
              originalRequest.headers['x-session-id'] = sessionId;
            }
            
            return apiClient(originalRequest);

          } catch (refreshError: any) {
            console.error('❌ Token refresh failed:', refreshError.response?.data || refreshError.message);
            
            useAuthStore.getState().logout();
            processQueue(refreshError as AxiosError, null);
            window.location.href = '/login?session=expired';
            return Promise.reject(refreshError);
          }
        }

        // Queue request while refresh is in progress
        return new Promise<AxiosResponse>((onSuccess, onFail) => {
          failedQueue.push({
            onSuccess: (token: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              
              // ✅ RE-ADD SESSION ID
              const sessionId = localStorage.getItem('session_id');
              if (sessionId) {
                originalRequest.headers['x-session-id'] = sessionId;
              }
              
              onSuccess(apiClient(originalRequest));
            },
            onFail: (err: AxiosError) => onFail(err),
          });
        });
      }

      // ✅ Case 2: Session Invalid/Revoked (force re-login)
      if (
        errorData?.error === 'Session ID required' ||
        errorData?.error === 'Session invalid or revoked' ||
        errorData?.error === 'Session not found'
      ) {
        console.warn('🔐 Session invalid - forcing re-login');
        useAuthStore.getState().logout();
        window.location.href = '/login?reason=session_invalid';
        return Promise.reject(error);
      }

      // ✅ Case 3: Other 401 errors (missing token, etc.)
      console.warn('🔐 Unauthorized - logging out');
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Non-401 errors - pass through
    return Promise.reject(error);
  }
);

export default apiClient;
