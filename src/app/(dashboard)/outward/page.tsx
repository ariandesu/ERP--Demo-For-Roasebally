import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOutwardShipmentsAction } from '@/app/actions/outward-actions';
import { getMaterialsAction } from '@/app/actions/material-actions';
import OutwardClient from '@/components/outward-client';
import { UserProfile, OutwardShipment, Material } from '@/types';

export const metadata = {
  title: 'Goods Outward - Rosebally ERP',
  description: 'Log and dispatch raw material rolls and accessory variants, verify dye-lots, check safety stock limits, and manage shipment accounts.',
};

export default async function OutwardPage() {
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

  if (!profile.goods_outward_access) {
    redirect('/?error=unauthorized_module');
  }

  let initialShipments: OutwardShipment[] = [];
  let initialMaterials: Material[] = [];

  try {
    // Retrieve historical shipment logs
    initialShipments = await getOutwardShipmentsAction();
  } catch (error) {
    console.error('Error fetching goods outward history in server component:', error);
  }

  try {
    // Retrieve master materials list for the creation wizard options
    initialMaterials = await getMaterialsAction();
  } catch (error) {
    console.error('Error fetching materials master in server component:', error);
  }

  return (
    <OutwardClient
      initialShipments={initialShipments}
      materials={initialMaterials}
      profile={profile as UserProfile}
    />
  );
}
