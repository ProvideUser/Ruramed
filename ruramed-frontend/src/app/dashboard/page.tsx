'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  useEffect(() => {
    // Redirect /dashboard to /dashboard/profile by default
    redirect('/dashboard/profile');
  }, []);

  return null;
}
