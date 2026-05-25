import React from 'react';
import { redirect } from 'next/navigation';
import { getCachedProfile } from '@/lib/supabase/server';
import { getMaterialsAction } from '@/app/actions/material-actions';
import MaterialsClient from '@/components/materials-client';
import { UserProfile, Material } from '@/types';

export const metadata = {
  title: 'Materials Master - Rosebally ERP',
  description: 'Catalog fabric roll counts, yarn strands, and config SKU variant parameters.',
};

export default async function MaterialsPage() {
  const { user, profile } = await getCachedProfile();

  if (!user) {
    redirect('/login');
  }

  if (!profile || profile.status === 'inactive') {
    redirect('/login?error=account_disabled');
  }

  if (!profile.materials_access) {
    redirect('/?error=unauthorized_module');
  }

  let initialMaterials: Material[] = [];
  try {
    // Retrieve dynamic materials list from server action
    initialMaterials = await getMaterialsAction();
  } catch (error) {
    console.error('Error fetching materials in server component:', error);
  }

  return (
    <MaterialsClient
      initialMaterials={initialMaterials}
      profile={profile as UserProfile}
    />
  );
}
