'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { LocationProvider } from '@/components/LocationProvider';
import { useAuthStore } from '@/store/auth.store';

export default function Providers({ children }: { children: React.ReactNode }) {
  // ✅ Initialize auth state on app load
  useEffect(() => {
    const initAuth = async () => {
      const authStore = useAuthStore.getState();
      
      // Wait for Zustand to hydrate from localStorage
      if (!authStore._hasHydrated) {
        const unsubscribe = useAuthStore.subscribe((state) => {
          if (state._hasHydrated) {
            authStore.checkAuth();
            unsubscribe();
          }
        });
      } else {
        authStore.checkAuth();
      }
    };

    initAuth();
  }, []);

  return (
    <LocationProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: '',
          style: {
            background: '#fff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </LocationProvider>
  );
}
