// src/app/dashboard/layout.tsx
'use client';

import { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardSidebar } from '@/components/DashboardSidebar'; // Import the sidebar

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        
        {/* 1. This is your persistent sidebar */}
        <DashboardSidebar /> 

        {/* 2. This is the main content area where your sections will be shown */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children} 
          {/* 'children' will be your src/app/dashboard/page.tsx */}
        </main>
      </div>
    </ProtectedRoute>
  );
}