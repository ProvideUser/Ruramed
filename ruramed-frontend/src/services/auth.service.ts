import apiClient from '@/lib/api-client';
import { 
  AuthResponse, 
  LoginInput, 
  RegisterInput, 
  User, 
  ApiResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse
} from '@/types';


export const authService = {
  /**
   * Register a new user
   */
  register: async (data: RegisterInput): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);
      const responseData = response.data;
      
      const normalizedResponse: AuthResponse = {
        ...responseData,
        emailVerificationRequired: responseData.email_verification_required ?? responseData.emailVerificationRequired,
        expiresAt: responseData.expires_at ?? responseData.expiresAt,
        sessionId: responseData.session_id ?? responseData.sessionId,
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
      };
      
      // ✅ Store both tokens if registration is complete
      if (normalizedResponse.accessToken && normalizedResponse.refreshToken) {
        localStorage.setItem('jwt_token', normalizedResponse.accessToken);
        localStorage.setItem('refresh_token', normalizedResponse.refreshToken);
        if (normalizedResponse.sessionId) {
          localStorage.setItem('session_id', normalizedResponse.sessionId);
        }
        console.log('✓ Tokens stored successfully');
      }
      
      return normalizedResponse;
    } catch (error: any) {
      const errorData = error.response?.data;
      let errorMessage = errorData?.message || errorData?.error || 'Registration failed';
      
      if (errorData?.details) {
        if (Array.isArray(errorData.details)) {
          errorMessage = errorData.details.join('\n');
        } else if (typeof errorData.details === 'object') {
          const validationErrors = Object.entries(errorData.details)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('\n');
          errorMessage = validationErrors;
        }
      }
      
      throw {
        ...error,
        message: errorMessage,
        validationDetails: errorData?.details
      };
    }
  },


  /**
   * Login user with email and password
   */
  login: async (credentials: LoginInput): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      const responseData = response.data;

      const normalizedResponse: AuthResponse = {
        ...responseData,
        sessionId: responseData.session_id ?? responseData.sessionId,
      };

      console.log('Login response:', {
        hasAccessToken: !!normalizedResponse.accessToken,
        hasRefreshToken: !!normalizedResponse.refreshToken,
        hasSessionId: !!normalizedResponse.sessionId,
      });

      // ✅ Store BOTH tokens
      if (normalizedResponse.accessToken) {
        localStorage.setItem('jwt_token', normalizedResponse.accessToken);
        console.log('✓ Access token stored');

        if (normalizedResponse.refreshToken) {
          localStorage.setItem('refresh_token', normalizedResponse.refreshToken);
          console.log('✓ Refresh token stored');
        }

        if (normalizedResponse.sessionId) {
          localStorage.setItem('session_id', normalizedResponse.sessionId);
          console.log('✓ Session ID stored');
        }
      } else {
        console.error('❌ No access token in response!');
      }

      return normalizedResponse;
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || 'Login failed';

      throw {
        ...error,
        message: errorMessage
      };
    }
  },



  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('session_id');
      localStorage.removeItem('refresh_token');
    }
  },


  /**
   * Request OTP for email verification
   */
  requestOTP: async (email: string): Promise<ApiResponse> => {
    const response = await apiClient.post<ApiResponse>('/auth/request-otp', { email });
    return response.data;
  },


  /**
   * Verify OTP (accepts email, phone, or identifier)
   */
  verifyOTP: async (identifier: string, otp: string, otpType: string = 'forgot_password'): Promise<ApiResponse> => {
    try {
      const response = await apiClient.post<ApiResponse>('/auth/verify-otp', { 
        identifier,
        otp,
        otp_type: otpType
      });
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || 'OTP verification failed';
      
      throw {
        ...error,
        message: errorMessage
      };
    }
  },


  /**
   * Request password reset OTP (accepts email or phone)
   */
  forgotPassword: async (identifier: string): Promise<ForgotPasswordResponse> => {
    try {
      const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { 
        identifier 
      });
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || 'Failed to send reset OTP';
      
      throw {
        ...error,
        message: errorMessage
      };
    }
  },


  /**
   * Reset password with identifier, OTP, and new password
   */
  resetPassword: async (identifier: string, otp: string, newPassword: string): Promise<ResetPasswordResponse> => {
    try {
      const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', {
        identifier,
        otp,
        new_password: newPassword,
      });
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || 'Password reset failed';
      
      throw {
        ...error,
        message: errorMessage
      };
    }
  },



  /**
   * Resend OTP for any type
   */
  resendOTP: async (email: string, otpType: string = 'forgot_password'): Promise<ApiResponse> => {
    try {
      const response = await apiClient.post<ApiResponse>('/auth/resend-otp', { 
        email, 
        otp_type: otpType 
      });
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || 'Failed to resend OTP';
      
      throw {
        ...error,
        message: errorMessage
      };
    }
  },


  /**
   * Get current user profile
   */
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/users/profile');
    return response.data.data!;
  },


  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>('/users/profile', data);
    return response.data.data!;
  },


  /**
   * Change password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
    const response = await apiClient.post<ApiResponse>('/users/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },


  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('jwt_token');
    const refreshToken = localStorage.getItem('refresh_token');
    return !!(token && refreshToken);
  },

  /**
   * Get stored auth token
   */
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('jwt_token');
  },


  /**
   * Get stored session ID
   */
  getSessionId: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('session_id');
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  },

  // ✅ NEW: Check if token is about to expire
  isTokenExpiringSoon: (): boolean => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('jwt_token');
    if (!token) return true;

    try {
      // Decode token without verification
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(jsonPayload);
      const expiresAt = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Return true if expires in less than 2 minutes
      return timeUntilExpiry < 2 * 60 * 1000;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  },
};
