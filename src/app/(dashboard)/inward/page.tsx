import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getInwardShipmentsAction } from '@/app/actions/inward-actions';
import { getMaterialsAction } from '@/app/actions/material-actions';
import InwardClient from '@/components/inward-client';
import { UserProfile, InwardShipment, Material } from '@/types';

export const metadata = {
  title: 'Goods Inward - Rosebally ERP',
  description: 'Log supplier fabric roll shipments, record dye lot batches, and manage incoming material inventory.',
};

export default async function InwardPage() {
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

  if (!profile.goods_inward_access) {
    redirect('/?error=unauthorized_module');
  }

  let initialShipments: InwardShipment[] = [];
  let initialMaterials: Material[] = [];

  try {
    // Retrieve historical shipment logs
    initialShipments = await getInwardShipmentsAction();
  } catch (error) {
    console.error('Error fetching goods inward history in server component:', error);
  }

  try {
    // Retrieve master materials list for the creation wizard options
    initialMaterials = await getMaterialsAction();
  } catch (error) {
    console.error('Error fetching materials master in server component:', error);
  }

  return (
    <InwardClient
      initialShipments={initialShipments}
      materials={initialMaterials}
      profile={profile as UserProfile}
    />
  );
}
