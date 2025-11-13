'use client';

import { ProfileCard } from '@/components/ProfileCard';

export function ProfileSection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your personal health information</p>
      </div>
      <ProfileCard />
    </div>
  );
}
