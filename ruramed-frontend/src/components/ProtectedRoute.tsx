'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, checkAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Step 1: Wait for Zustand hydration
    if (!_hasHydrated) {
      console.log('⏳ Waiting for hydration...');
      return;
    }

    // Step 2: Check for tokens in localStorage
    const token = localStorage.getItem('jwt_token');
    const refreshToken = localStorage.getItem('refresh_token');

    // Step 3: No tokens = redirect to login
    if (!token || !refreshToken) {
      console.log('🔐 No tokens found, redirecting to login');
      router.replace('/login?expired=true');
      setIsReady(true);
      return;
    }

    // Step 4: Already authenticated = render
    if (isAuthenticated) {
      console.log('✅ Already authenticated');
      setIsReady(true);
      return;
    }

    // Step 5: Tokens exist but not in store = validate with backend
    console.log('🔄 Validating tokens with backend...');
    checkAuth()
      .then(() => {
        console.log('✅ Token validation successful');
        setIsReady(true);
      })
      .catch((error) => {
        console.error('❌ Token validation failed:', error);
        // api-client will handle 401 and redirect
        setIsReady(true);
      });
  }, [_hasHydrated, isAuthenticated, checkAuth, router]);

  // Loading state during hydration/validation
  if (!_hasHydrated || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated = api-client will redirect, don't render
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
