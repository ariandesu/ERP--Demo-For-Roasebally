import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUsersAction } from '@/app/actions/admin-user-actions';
import UserManagementClient from '@/components/user-management-client';

export const metadata = {
  title: 'User Management - Rosebally ERP',
  description: 'Provision operational accounts, edit permissions, and manage passwords.',
};

export default async function UserManagementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let usersList = [];
  try {
    // Perform server-side retrieval of all ERP operator profiles
    usersList = await getUsersAction();
  } catch (error) {
    console.error('Error fetching users in server component:', error);
    // If the server-side action fails (e.g. role assertion failure), redirect to dashboard home
    redirect('/?error=unauthorized_admin');
  }

  return (
    <UserManagementClient
      initialUsers={usersList}
      currentUserId={user.id}
    />
  );
}
