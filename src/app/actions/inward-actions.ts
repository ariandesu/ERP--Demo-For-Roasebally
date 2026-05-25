'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { InwardShipment, InwardItem, QualityCheckStatus } from '@/types';

// Helper to assert current user has goods inward read access
async function assertInwardAccess() {
  const serverSupabase = await createServerSupabase();
  const { data: { user } } = await serverSupabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthenticated. Please log in to perform this action.');
  }

  const { data: profile } = await serverSupabase
    .from('profiles')
    .select('role, status, goods_inward_access')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status === 'inactive' || !profile.goods_inward_access) {
    throw new Error('Unauthorized. You do not have active Goods Inward logging permissions.');
  }
  
  return { userId: user.id, role: profile.role };
}

// Helper to assert administrative credentials for writing logs
function assertWriteAccess(role: string) {
  if (role !== 'super_admin' && role !== 'admin' && role !== 'warehouse_manager') {
    throw new Error('Unauthorized. Administrative role credentials required to modify Inward logs.');
  }
}

// 1. READ: Fetch all inward shipments preloaded with item sub-tables, SKUs, and Parent Materials
export async function getInwardShipmentsAction(): Promise<InwardShipment[]> {
  try {
    await assertInwardAccess();
    const serverSupabase = await createServerSupabase();

    // Query preloaded with items joins
    const { data: shipments, error } = await serverSupabase
      .from('goods_inward')
      .select(`
        *,
        items:goods_inward_items(
          *,
          sku:skus(
            *,
            material:materials(*)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Formatting type structures
    const formattedShipments = (shipments || []).map((sh: any) => {
      const items = (sh.items || []).map((item: any) => ({
        ...item,
        sku: item.sku,
        material: item.sku?.material,
      }));
      return {
        ...sh,
        items: items as InwardItem[],
      };
    });

    return formattedShipments as InwardShipment[];
  } catch (err: any) {
    console.error('getInwardShipmentsAction error:', err);
    throw new Error(err.message || 'Failed to retrieve Goods Inward history log.');
  }
}

// 2. CREATE: Record inbound shipment and update physical SKU stock hand counts
export async function createInwardShipmentAction(formData: {
  inward_code: string;
  supplier_name: string;
  invoice_no?: string;
  warehouse_id: string;
  received_date: string;
  items: {
    sku_id: string;
    lot_number: string;
    quantity_received: number;
    unit_price?: number;
    quality_status: QualityCheckStatus;
    remarks?: string;
  }[];
}) {
  try {
    const { role, userId } = await assertInwardAccess();
    assertWriteAccess(role);

    if (formData.items.length === 0) {
      throw new Error('Transaction Rejected. An inward shipment must contain at least one received item.');
    }

    const serverSupabase = await createServerSupabase();

    // A. Insert core shipment header details
    const { data: shipment, error: headerError } = await serverSupabase
      .from('goods_inward')
      .insert({
        inward_code: formData.inward_code.toUpperCase().trim(),
        supplier_name: formData.supplier_name.trim(),
        invoice_no: formData.invoice_no?.trim() || null,
        warehouse_id: formData.warehouse_id,
        received_date: formData.received_date,
        received_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (headerError) throw headerError;
    if (!shipment) throw new Error('Shipment logging succeeded but returned no record payload.');

    // B. Log items and update on-hand quantities (simulated atomic ledger loop)
    const itemsToInsert = [];
    try {
      for (const item of formData.items) {
        // 1. Get current stock levels of linked SKU
        const { data: skuRecord, error: skuFetchError } = await serverSupabase
          .from('skus')
          .select('quantity_on_hand')
          .eq('id', item.sku_id)
          .single();

        if (skuFetchError || !skuRecord) {
          throw new Error(`SKU identification error: unable to retrieve current balances.`);
        }

        // 2. Increment stock quantity
        const updatedQty = Number(skuRecord.quantity_on_hand) + Number(item.quantity_received);
        const { error: skuUpdateError } = await serverSupabase
          .from('skus')
          .update({ quantity_on_hand: updatedQty, updated_at: new Date().toISOString() })
          .eq('id', item.sku_id);

        if (skuUpdateError) throw skuUpdateError;

        // 3. Queue item row for insertion
        itemsToInsert.push({
          inward_id: shipment.id,
          sku_id: item.sku_id,
          lot_number: item.lot_number.toUpperCase().trim(),
          quantity_received: item.quantity_received,
          unit_price: item.unit_price || null,
          quality_status: item.quality_status,
          remarks: item.remarks?.trim() || null,
          created_at: new Date().toISOString(),
        });
      }

      // 4. Batch insert inward items
      const { error: itemsInsertError } = await serverSupabase
        .from('goods_inward_items')
        .insert(itemsToInsert);

      if (itemsInsertError) throw itemsInsertError;

    } catch (loopError: any) {
      // Rollback shipment header if nested updates fail
      await serverSupabase.from('goods_inward').delete().eq('id', shipment.id);
      throw loopError;
    }

    revalidatePath('/inward');
    revalidatePath('/materials');
    return { success: true, shipmentId: shipment.id };
  } catch (err: any) {
    console.error('createInwardShipmentAction error:', err);
    return { success: false, error: err.message || 'Failed to log Inbound shipment.' };
  }
}

// 3. DELETE: Prune shipment log and subtract stock levels from linked SKUs
export async function deleteInwardShipmentAction(shipmentId: string) {
  try {
    const { role } = await assertInwardAccess();
    assertWriteAccess(role);

    const serverSupabase = await createServerSupabase();

    // A. Fetch received quantities from items to rollback stock counts
    const { data: items, error: fetchItemsError } = await serverSupabase
      .from('goods_inward_items')
      .select('sku_id, quantity_received')
      .eq('inward_id', shipmentId);

    if (fetchItemsError) throw fetchItemsError;

    // B. Rollback/Subtract on-hand stock quantities from linked SKUs
    if (items && items.length > 0) {
      for (const item of items) {
        const { data: skuRecord, error: skuFetchError } = await serverSupabase
          .from('skus')
          .select('quantity_on_hand')
          .eq('id', item.sku_id)
          .single();

        if (!skuFetchError && skuRecord) {
          const decrementedQty = Math.max(0.00, Number(skuRecord.quantity_on_hand) - Number(item.quantity_received));
          
          await serverSupabase
            .from('skus')
            .update({ quantity_on_hand: decrementedQty, updated_at: new Date().toISOString() })
            .eq('id', item.sku_id);
        }
      }
    }

    // C. Pruning the Goods Inward header record cascades and purges item rows automatically
    const { error: deleteError } = await serverSupabase
      .from('goods_inward')
      .delete()
      .eq('id', shipmentId);

    if (deleteError) throw deleteError;

    revalidatePath('/inward');
    revalidatePath('/materials');
    return { success: true };
  } catch (err: any) {
    console.error('deleteInwardShipmentAction error:', err);
    return { success: false, error: err.message || 'Failed to rollback Inward shipment logs.' };
  }
}
