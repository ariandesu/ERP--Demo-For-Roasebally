import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPurchaseOrdersAction } from '@/app/actions/po-actions';
import { getMaterialsAction } from '@/app/actions/material-actions';
import PurchaseOrdersClient from '@/components/purchase-orders-client';
import { UserProfile, PurchaseOrder, Material } from '@/types';

export const metadata = {
  title: 'Purchase Orders - Rosebally ERP',
  description: 'Manage procurement schedules, draft supplier quotation requests, track order status transitions, and audit raw material balances.',
};

export default async function PurchaseOrdersPage() {
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

  if (!profile.purchase_orders_access) {
    redirect('/?error=unauthorized_module');
  }

  let initialPOs: PurchaseOrder[] = [];
  let initialMaterials: Material[] = [];

  try {
    // Retrieve historical PO logs
    initialPOs = await getPurchaseOrdersAction();
  } catch (error) {
    console.error('Error fetching purchase orders history in server component:', error);
  }

  try {
    // Retrieve master materials list for the creation wizard options
    initialMaterials = await getMaterialsAction();
  } catch (error) {
    console.error('Error fetching materials master in server component:', error);
  }

  return (
    <PurchaseOrdersClient
      initialPOs={initialPOs}
      materials={initialMaterials}
      profile={profile as UserProfile}
    />
  );
}
