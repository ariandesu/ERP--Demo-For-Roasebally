import React from 'react';
import { redirect } from 'next/navigation';
import { getCachedProfile } from '@/lib/supabase/server';
import Sidebar from '@/components/sidebar';
import { UserProfile } from '@/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getCachedProfile();

  if (!user) {
    redirect('/login');
  }

  if (!profile || profile.status === 'inactive') {
    redirect('/login?error=account_disabled');
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      {/* Persistent sidebar component */}
      <Sidebar profile={profile as UserProfile} />
      
      {/* Main dashboard viewport */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-6 md:p-8 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
