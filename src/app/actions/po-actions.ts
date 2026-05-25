'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createServerSupabase, getCachedProfile } from '@/lib/supabase/server';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '@/types';

// Helper to assert current user has purchase orders read access
async function assertPurchaseOrdersAccess() {
  const { user, profile } = await getCachedProfile();
  
  if (!user) {
    throw new Error('Unauthenticated. Please log in to perform this action.');
  }

  if (!profile || profile.status === 'inactive' || !profile.purchase_orders_access) {
    throw new Error('Unauthorized. You do not have active Purchase Orders procurement permissions.');
  }
  
  return { userId: user.id, role: profile.role };
}

// Helper to assert administrative credentials for writing logs
function assertWriteAccess(role: string) {
  if (role !== 'super_admin' && role !== 'admin' && role !== 'warehouse_manager') {
    throw new Error('Unauthorized. Administrative role credentials required to modify Purchase Orders.');
  }
}

// 1. READ: Fetch all purchase orders preloaded with items, SKUs, and Parent Materials
export async function getPurchaseOrdersAction(): Promise<PurchaseOrder[]> {
  try {
    await assertPurchaseOrdersAccess();
    const serverSupabase = await createServerSupabase();

    // Query preloaded with items joins
    const { data: shipments, error } = await serverSupabase
      .from('purchase_orders')
      .select(`
        *,
        items:purchase_orders_items(
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
    const formattedPOs = (shipments || []).map((po: any) => {
      const items = (po.items || []).map((item: any) => ({
        ...item,
        sku: item.sku,
        material: item.sku?.material,
      }));
      return {
        ...po,
        items: items as PurchaseOrderItem[],
      };
    });

    return formattedPOs as PurchaseOrder[];
  } catch (err: any) {
    console.error('getPurchaseOrdersAction error:', err);
    throw new Error(err.message || 'Failed to retrieve Purchase Orders procurement history log.');
  }
}

// 2. CREATE: Record purchase order
export async function createPurchaseOrderAction(formData: {
  po_code: string;
  supplier_name: string;
  delivery_date?: string;
  items: {
    sku_id: string;
    quantity_ordered: number;
    unit_price: number;
  }[];
}) {
  try {
    const { role, userId } = await assertPurchaseOrdersAccess();
    assertWriteAccess(role);

    if (formData.items.length === 0) {
      throw new Error('Transaction Rejected. A Purchase Order must contain at least one item.');
    }

    const serverSupabase = await createServerSupabase();

    // A. Calculate Total PO Value
    const totalAmount = formData.items.reduce((sum, item) => sum + (Number(item.quantity_ordered) * Number(item.unit_price)), 0);

    // B. Insert core shipment header details
    const { data: poRecord, error: headerError } = await serverSupabase
      .from('purchase_orders')
      .insert({
        po_code: formData.po_code.toUpperCase().trim(),
        supplier_name: formData.supplier_name.trim(),
        delivery_date: formData.delivery_date || null,
        status: 'draft',
        total_amount: totalAmount,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (headerError) throw headerError;
    if (!poRecord) throw new Error('PO drafting succeeded but returned no record payload.');

    // C. Log items (simulated atomic ledger loop)
    const itemsToInsert = [];
    try {
      for (const item of formData.items) {
        itemsToInsert.push({
          po_id: poRecord.id,
          sku_id: item.sku_id,
          quantity_ordered: item.quantity_ordered,
          unit_price: item.unit_price,
          quantity_received: 0.00, // initially zero
          created_at: new Date().toISOString(),
        });
      }

      // 4. Batch insert items
      const { error: itemsInsertError } = await serverSupabase
        .from('purchase_orders_items')
        .insert(itemsToInsert);

      if (itemsInsertError) throw itemsInsertError;

    } catch (loopError: any) {
      // Rollback PO header if nested updates fail
      await serverSupabase.from('purchase_orders').delete().eq('id', poRecord.id);
      throw loopError;
    }

    revalidatePath('/purchase-orders');
    return { success: true, poId: poRecord.id };
  } catch (err: any) {
    console.error('createPurchaseOrderAction error:', err);
    return { success: false, error: err.message || 'Failed to log Purchase Order.' };
  }
}

// 3. UPDATE: Transition purchase order status
export async function updatePurchaseOrderStatusAction(poId: string, status: PurchaseOrderStatus) {
  try {
    const { role } = await assertPurchaseOrdersAccess();
    assertWriteAccess(role);

    const serverSupabase = await createServerSupabase();

    const { error } = await serverSupabase
      .from('purchase_orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', poId);

    if (error) throw error;

    revalidatePath('/purchase-orders');
    return { success: true };
  } catch (err: any) {
    console.error('updatePurchaseOrderStatusAction error:', err);
    return { success: false, error: err.message || 'Failed to update Purchase Order status.' };
  }
}

// 4. DELETE: Prune PO log and items cascade
export async function deletePurchaseOrderAction(poId: string) {
  try {
    const { role } = await assertPurchaseOrdersAccess();
    assertWriteAccess(role);

    const serverSupabase = await createServerSupabase();

    // Cascading delete prunes PO items automatically in postgres triggers
    const { error: deleteError } = await serverSupabase
      .from('purchase_orders')
      .delete()
      .eq('id', poId);

    if (deleteError) throw deleteError;

    revalidatePath('/purchase-orders');
    return { success: true };
  } catch (err: any) {
    console.error('deletePurchaseOrderAction error:', err);
    return { success: false, error: err.message || 'Failed to purge Purchase Order logs.' };
  }
}
