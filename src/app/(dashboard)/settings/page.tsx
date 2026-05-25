import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SettingsClient from '@/components/settings-client';
import { UserProfile } from '@/types';

export const metadata = {
  title: 'ERP Global Settings - Rosebally ERP',
  description: 'Configure corporate print profiles, physical warehouse storage zones, low-stock threshold triggers, and API developer integrations.',
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Retrieve user permissions and profile from the database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status === 'inactive') {
    redirect('/login?error=account_disabled');
  }

  if (!profile.settings_access) {
    redirect('/?error=unauthorized_module');
  }

  return (
    <SettingsClient
      profile={profile as UserProfile}
    />
  );
}
