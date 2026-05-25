'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createServerSupabase, getCachedProfile } from '@/lib/supabase/server';
import { Material, SKU, MaterialCategory, MaterialUom } from '@/types';

// Helper to assert current user has materials read access
async function assertMaterialsAccess() {
  const { user, profile } = await getCachedProfile();
  
  if (!user) {
    throw new Error('Unauthenticated. Please log in to perform this action.');
  }

  if (!profile || profile.status === 'inactive' || !profile.materials_access) {
    throw new Error('Unauthorized. You do not have active Materials Master clearance permissions.');
  }
  
  return { userId: user.id, role: profile.role };
}

// Helper to assert current user has materials write access (admin role)
function assertWriteAccess(role: string) {
  if (role !== 'super_admin' && role !== 'admin' && role !== 'warehouse_manager') {
    throw new Error('Unauthorized. Administrative role credentials required to modify Materials.');
  }
}

// 1. READ: Fetch all materials with their nested SKU variants
export async function getMaterialsAction(): Promise<Material[]> {
  try {
    await assertMaterialsAccess();
    const serverSupabase = await createServerSupabase();
    
    // Fetch materials
    const { data: materials, error: materialsError } = await serverSupabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: false });

    if (materialsError) throw materialsError;

    // Fetch skus
    const { data: skus, error: skusError } = await serverSupabase
      .from('skus')
      .select('*')
      .order('sku_code', { ascending: true });

    if (skusError) throw skusError;

    // Assemble relation nested objects
    const formattedMaterials = (materials || []).map((material: any) => {
      const materialSkus = (skus || []).filter((sku: any) => sku.material_id === material.id);
      return {
        ...material,
        skus: materialSkus as SKU[],
      };
    });

    return formattedMaterials as Material[];
  } catch (err: any) {
    console.error('getMaterialsAction error:', err);
    throw new Error(err.message || 'Failed to retrieve materials master catalog.');
  }
}

// 2. CREATE: Register material and auto-generate SKU variants list
export async function createMaterialAction(formData: {
  code: string;
  name: string;
  category: MaterialCategory;
  uom: MaterialUom;
  description?: string;
  supplier_name?: string;
  composition?: string;
  weight_gsm?: number;
  width_inches?: number;
  yarn_count?: string;
  variants: {
    colors: string[];
    sizes: string[];
    min_stock_level: number;
    alert_on_low_stock: boolean;
  };
}) {
  try {
    const { role, userId } = await assertMaterialsAccess();
    assertWriteAccess(role);

    const serverSupabase = await createServerSupabase();

    // A. Insert core material details
    const { data: newMaterial, error: materialError } = await serverSupabase
      .from('materials')
      .insert({
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        category: formData.category,
        uom: formData.uom,
        description: formData.description?.trim() || null,
        supplier_name: formData.supplier_name?.trim() || null,
        composition: formData.composition?.trim() || null,
        weight_gsm: formData.weight_gsm || null,
        width_inches: formData.width_inches || null,
        yarn_count: formData.yarn_count?.trim() || null,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (materialError) throw materialError;
    if (!newMaterial) throw new Error('Material registration succeeded but returned no record payload.');

    // B. Programmatically compile variant combinations and insert SKUs
    const colors = formData.variants.colors.length > 0 ? formData.variants.colors : ['STANDARD'];
    const sizes = formData.variants.sizes.length > 0 ? formData.variants.sizes : ['FREE'];

    const skusToInsert = [];
    for (const color of colors) {
      for (const size of sizes) {
        const cleanColor = color.toUpperCase().replace(/\s+/g, '');
        const cleanSize = size.toUpperCase().replace(/\s+/g, '');
        
        // Generate uniform SKU code: [MATERIAL_CODE]-[COLOR]-[SIZE]
        const skuCode = `${newMaterial.code}-${cleanColor}-${cleanSize}`;

        skusToInsert.push({
          material_id: newMaterial.id,
          sku_code: skuCode,
          color: color.trim(),
          size: size.trim(),
          quantity_on_hand: 0.00,
          quantity_allocated: 0.00,
          min_stock_level: formData.variants.min_stock_level,
          alert_on_low_stock: formData.variants.alert_on_low_stock,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (skusToInsert.length > 0) {
      const { error: skusError } = await serverSupabase
        .from('skus')
        .insert(skusToInsert);

      if (skusError) {
        // Rollback material if SKU insert fails (simulated atomic transaction)
        await serverSupabase.from('materials').delete().eq('id', newMaterial.id);
        throw skusError;
      }
    }

    revalidatePath('/materials');
    return { success: true, materialId: newMaterial.id };
  } catch (err: any) {
    console.error('createMaterialAction error:', err);
    return { success: false, error: err.message || 'Failed to register material catalog card.' };
  }
}

// 3. UPDATE: Modify specifications of an existing material
export async function updateMaterialAction(
  materialId: string,
  formData: {
    name: string;
    description?: string;
    supplier_name?: string;
    composition?: string;
    weight_gsm?: number;
    width_inches?: number;
    yarn_count?: string;
  }
) {
  try {
    const { role } = await assertMaterialsAccess();
    assertWriteAccess(role);

    const serverSupabase = await createServerSupabase();

    const { error } = await serverSupabase
      .from('materials')
      .update({
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        supplier_name: formData.supplier_name?.trim() || null,
        composition: formData.composition?.trim() || null,
        weight_gsm: formData.weight_gsm || null,
        width_inches: formData.width_inches || null,
        yarn_count: formData.yarn_count?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', materialId);

    if (error) throw error;

    revalidatePath('/materials');
    return { success: true };
  } catch (err: any) {
    console.error('updateMaterialAction error:', err);
    return { success: false, error: err.message || 'Failed to update material details.' };
  }
}

// 4. DELETE: Purge catalog and variant configurations cascade
export async function deleteMaterialAction(materialId: string) {
  try {
    const { role } = await assertMaterialsAccess();
    assertWriteAccess(role);

    const serverSupabase = await createServerSupabase();

    // Cascading delete is handled automatically by Postgres table triggers via "ON DELETE CASCADE" in DB schemas
    const { error } = await serverSupabase
      .from('materials')
      .delete()
      .eq('id', materialId);

    if (error) throw error;

    revalidatePath('/materials');
    return { success: true };
  } catch (err: any) {
    console.error('deleteMaterialAction error:', err);
    return { success: false, error: err.message || 'Failed to delete material from system.' };
  }
}
