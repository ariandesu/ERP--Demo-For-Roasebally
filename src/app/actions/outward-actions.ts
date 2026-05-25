'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createServerSupabase, getCachedProfile } from '@/lib/supabase/server';
import { OutwardShipment, OutwardItem } from '@/types';

// Helper to assert current user has goods outward read access
async function assertOutwardAccess() {
  const { user, profile } = await getCachedProfile();
  
  if (!user) {
    throw new Error('Unauthenticated. Please log in to perform this action.');
  }

  if (!profile || profile.status === 'inactive' || !profile.goods_outward_access) {
    throw new Error('Unauthorized. You do not have active Goods Outward dispatching permissions.');
  }
  
  return { userId: user.id, role: profile.role };
}

// Helper to assert administrative credentials for writing logs
function assertWriteAccess(role: string) {
  if (role !== 'super_admin' && role !== 'admin' && role !== 'warehouse_manager') {
    throw new Error('Unauthorized. Administrative role credentials required to modify Outward logs.');
  }
}

// 1. READ: Fetch all outward shipments preloaded with items, SKUs, and Parent Materials
export async function getOutwardShipmentsAction(): Promise<OutwardShipment[]> {
  try {
    await assertOutwardAccess();
    const serverSupabase = await createServerSupabase();

    // Query preloaded with items joins
    const { data: shipments, error } = await serverSupabase
      .from('goods_outward')
      .select(`
        *,
        items:goods_outward_items(
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
        items: items as OutwardItem[],
      };
    });

    return formattedShipments as OutwardShipment[];
  } catch (err: any) {
    console.error('getOutwardShipmentsAction error:', err);
    throw new Error(err.message || 'Failed to retrieve Goods Outward history log.');
  }
}

// 2. CREATE: Record outbound shipment and update physical SKU stock balances with anti-negative check
export async function createOutwardShipmentAction(formData: {
  outward_code: string;
  customer_name: string;
  order_no?: string;
  warehouse_id: string;
  dispatched_date: string;
  items: {
    sku_id: string;
    lot_number: string;
    quantity_dispatched: number;
    remarks?: string;
  }[];
}) {
  try {
    const { role, userId } = await assertOutwardAccess();
    assertWriteAccess(role);

    if (formData.items.length === 0) {
      throw new Error('Transaction Rejected. An outward shipment must contain at least one dispatched item.');
    }

    const serverSupabase = await createServerSupabase();

    // A. Insert core shipment header details
    const { data: shipment, error: headerError } = await serverSupabase
      .from('goods_outward')
      .insert({
        outward_code: formData.outward_code.toUpperCase().trim(),
        customer_name: formData.customer_name.trim(),
        order_no: formData.order_no?.trim() || null,
        warehouse_id: formData.warehouse_id,
        dispatched_date: formData.dispatched_date,
        dispatched_by: userId,
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
          .select('quantity_on_hand, sku_code')
          .eq('id', item.sku_id)
          .single();

        if (skuFetchError || !skuRecord) {
          throw new Error(`SKU identification error: unable to retrieve current balances.`);
        }

        // 2. Check if enough inventory exists (Strict Anti-Negative Stock Validation)
        const currentQty = Number(skuRecord.quantity_on_hand);
        const requestQty = Number(item.quantity_dispatched);
        
        if (currentQty < requestQty) {
          throw new Error(`Insufficient inventory for variant SKU code: ${skuRecord.sku_code}.\nAvailable stock: ${currentQty.toFixed(2)}, Requested dispatch: ${requestQty.toFixed(2)}.`);
        }

        // 3. Decrement stock quantity
        const updatedQty = currentQty - requestQty;
        const { error: skuUpdateError } = await serverSupabase
          .from('skus')
          .update({ quantity_on_hand: updatedQty, updated_at: new Date().toISOString() })
          .eq('id', item.sku_id);

        if (skuUpdateError) throw skuUpdateError;

        // 4. Queue item row for insertion
        itemsToInsert.push({
          outward_id: shipment.id,
          sku_id: item.sku_id,
          lot_number: item.lot_number.toUpperCase().trim(),
          quantity_dispatched: item.quantity_dispatched,
          remarks: item.remarks?.trim() || null,
          created_at: new Date().toISOString(),
        });
      }

      // 5. Batch insert outward items
      const { error: itemsInsertError } = await serverSupabase
        .from('goods_outward_items')
        .insert(itemsToInsert);

      if (itemsInsertError) throw itemsInsertError;

    } catch (loopError: any) {
      // Rollback shipment header if nested updates fail
      await serverSupabase.from('goods_outward').delete().eq('id', shipment.id);
      throw loopError;
    }

    revalidatePath('/outward');
    revalidatePath('/materials');
    return { success: true, shipmentId: shipment.id };
  } catch (err: any) {
    console.error('createOutwardShipmentAction error:', err);
    return { success: false, error: err.message || 'Failed to log Outward shipment.' };
  }
}

// 3. DELETE: Prune shipment log and add back stock levels onto linked SKUs (restorative rollback)
export async function deleteOutwardShipmentAction(shipmentId: string) {
  try {
    const { role } = await assertOutwardAccess();
    assertWriteAccess(role);

    const serverSupabase = await createServerSupabase();

    // A. Fetch dispatched quantities from items to rollback stock counts
    const { data: items, error: fetchItemsError } = await serverSupabase
      .from('goods_outward_items')
      .select('sku_id, quantity_dispatched')
      .eq('outward_id', shipmentId);

    if (fetchItemsError) throw fetchItemsError;

    // B. Rollback/Restore stock quantities (incrementing back)
    if (items && items.length > 0) {
      for (const item of items) {
        const { data: skuRecord, error: skuFetchError } = await serverSupabase
          .from('skus')
          .select('quantity_on_hand')
          .eq('id', item.sku_id)
          .single();

        if (!skuFetchError && skuRecord) {
          const incrementedQty = Number(skuRecord.quantity_on_hand) + Number(item.quantity_dispatched);
          
          await serverSupabase
            .from('skus')
            .update({ quantity_on_hand: incrementedQty, updated_at: new Date().toISOString() })
            .eq('id', item.sku_id);
        }
      }
    }

    // C. Pruning the Goods Outward header record cascades and purges item rows automatically
    const { error: deleteError } = await serverSupabase
      .from('goods_outward')
      .delete()
      .eq('id', shipmentId);

    if (deleteError) throw deleteError;

    revalidatePath('/outward');
    revalidatePath('/materials');
    return { success: true };
  } catch (err: any) {
    console.error('deleteOutwardShipmentAction error:', err);
    return { success: false, error: err.message || 'Failed to rollback Outward shipment logs.' };
  }
}
