import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthResponse, LoginInput, RegisterInput } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null; // ✅ NEW: Store session ID
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
  _checkAuthInProgress: boolean;

  setUser: (user: User | null) => void;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  setSessionId: (sessionId: string | null) => void; // ✅ NEW
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasHydrated: (state: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      sessionId: null, // ✅ NEW
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasHydrated: false,
      _checkAuthInProgress: false,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        });
      },

      setAccessToken: (token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('jwt_token', token);
        }
        set({ accessToken: token });
      },

      setRefreshToken: (token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('refresh_token', token);
        }
        set({ refreshToken: token });
      },

      // ✅ NEW: Set session ID
      setSessionId: (sessionId) => {
        if (typeof window !== 'undefined') {
          if (sessionId) {
            localStorage.setItem('session_id', sessionId);
          } else {
            localStorage.removeItem('session_id');
          }
        }
        set({ sessionId });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('session_id');
          localStorage.removeItem('refresh_token');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          sessionId: null, // ✅ Clear session ID
          isAuthenticated: false,
          error: 'Session expired. Please login again.',
          _checkAuthInProgress: false,
        });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password });

          set({
            user: response.user ?? null,
            accessToken: response.accessToken ?? null,
            refreshToken: response.refreshToken ?? null,
            sessionId: response.sessionId ?? null, // ✅ Store session ID
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Login failed. Please try again.';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            sessionId: null,
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(data);

          set({
            user: response.user ?? null,
            accessToken: response.accessToken ?? null,
            refreshToken: response.refreshToken ?? null,
            sessionId: response.sessionId ?? null, // ✅ Store session ID
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Registration failed. Please try again.';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            sessionId: null,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('session_id');
            localStorage.removeItem('refresh_token');
          }
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            sessionId: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            _checkAuthInProgress: false,
          });
        }
      },

      refreshProfile: async () => {
        try {
          const user = await authService.getProfile();
          set({ user, isAuthenticated: true });
        } catch (error) {
          console.error('Failed to refresh profile:', error);
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await authService.updateProfile(data);
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to update profile.';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      checkAuth: async () => {
        const currentState = get();

        if (currentState._checkAuthInProgress) {
          console.log('⏳ checkAuth already in progress, skipping...');
          return;
        }

        if (currentState.isAuthenticated && currentState.user) {
          return;
        }

        const token = authService.getToken();
        const refreshToken = authService.getRefreshToken();
        const sessionId = authService.getSessionId();

        if (!token || !refreshToken || !sessionId) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            sessionId: null,
            isAuthenticated: false,
            _checkAuthInProgress: false,
          });
          return;
        }

        set({ _checkAuthInProgress: true, isLoading: true });

        try {
          const user = await authService.getProfile();
          set({
            user,
            accessToken: token,
            refreshToken: refreshToken,
            sessionId: sessionId, // ✅ Restore session ID
            isAuthenticated: true,
            isLoading: false,
            _checkAuthInProgress: false,
            error: null,
          });
          console.log('✅ Auth validated successfully');
        } catch (error: any) {
          console.error('❌ Auth validation failed:', error.response?.status);

          if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('jwt_token');
              localStorage.removeItem('session_id');
              localStorage.removeItem('refresh_token');
            }

            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              sessionId: null,
              isAuthenticated: false,
              isLoading: false,
              _checkAuthInProgress: false,
              error: 'Session expired. Please login again.',
            });
          } else {
            set({
              isLoading: false,
              _checkAuthInProgress: false,
            });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        sessionId: state.sessionId, // ✅ Persist session ID
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);

          // Sync persisted data with localStorage
          if (typeof window !== 'undefined') {
            if (state.accessToken) {
              localStorage.setItem('jwt_token', state.accessToken);
            }
            if (state.refreshToken) {
              localStorage.setItem('refresh_token', state.refreshToken);
            }
            if (state.sessionId) {
              localStorage.setItem('session_id', state.sessionId);
            }
          }
        }
      },
    }
  )
);
