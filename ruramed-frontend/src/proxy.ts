// src/proxy.ts (formerly middleware.ts)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ✅ UPDATED: Renamed from middleware() to proxy()
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname.startsWith('/login');
  const isRegisterPage = pathname.startsWith('/register');
  const isDashboard = pathname.startsWith('/dashboard');
  
  // For protected routes, redirect to login if no token
  if (isDashboard) {
    const token = request.cookies.get('jwt_token')?.value;
    
    // Note: Since tokens are in localStorage (client-side), 
    // we can't fully validate here. This is just a basic check.
    // Real validation happens in ProtectedRoute component.
    
    return NextResponse.next();
  }

  // Redirect authenticated users away from login/register
  if ((isLoginPage || isRegisterPage)) {
    // Can't check auth in middleware without cookies
    // Let client-side handle redirects
    return NextResponse.next();
  }

  return NextResponse.next();
}

// ✅ UPDATED: Export config for proxy
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/forgot-password', '/reset-password'],
};
