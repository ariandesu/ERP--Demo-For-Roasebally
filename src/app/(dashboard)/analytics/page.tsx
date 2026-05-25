import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMaterialsAction } from '@/app/actions/material-actions';
import { getInwardShipmentsAction } from '@/app/actions/inward-actions';
import { getOutwardShipmentsAction } from '@/app/actions/outward-actions';
import { getPurchaseOrdersAction } from '@/app/actions/po-actions';
import AnalyticsClient from '@/components/analytics-client';
import { UserProfile, Material, InwardShipment, OutwardShipment, PurchaseOrder } from '@/types';

export const metadata = {
  title: 'Executive Analytics - Rosebally ERP',
  description: 'View advanced warehouse occupancy levels, stock turns, monthly dispatch schedules, and quality assurance pass rates.',
};

export default async function AnalyticsPage() {
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

  if (!profile.analytics_access) {
    redirect('/?error=unauthorized_module');
  }

  let materialsList: Material[] = [];
  let inwardList: InwardShipment[] = [];
  let outwardList: OutwardShipment[] = [];
  let poList: PurchaseOrder[] = [];

  try {
    // Run concurrent queries using Promise.all to optimize performance and reduce load times
    const [fetchedMaterials, fetchedInward, fetchedOutward, fetchedPOs] = await Promise.all([
      getMaterialsAction().catch(err => { console.error('Error loading materials for analytics:', err); return []; }),
      getInwardShipmentsAction().catch(err => { console.error('Error loading inward shipments for analytics:', err); return []; }),
      getOutwardShipmentsAction().catch(err => { console.error('Error loading outward dispatches for analytics:', err); return []; }),
      getPurchaseOrdersAction().catch(err => { console.error('Error loading POs for analytics:', err); return []; }),
    ]);

    materialsList = fetchedMaterials;
    inwardList = fetchedInward;
    outwardList = fetchedOutward;
    poList = fetchedPOs;
  } catch (error) {
    console.error('Unified analytics page data loading error:', error);
  }

  return (
    <AnalyticsClient
      materials={materialsList}
      inwardShipments={inwardList}
      outwardShipments={outwardList}
      purchaseOrders={poList}
      profile={profile as UserProfile}
    />
  );
}
