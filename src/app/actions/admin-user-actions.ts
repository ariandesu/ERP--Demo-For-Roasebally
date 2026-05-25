'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { UserRole, UserStatus, UserProfile } from '@/types';

// Helper to assert current user is authorized to perform admin actions
async function assertAdminAccess() {
  const serverSupabase = await createServerSupabase();
  const { data: { user } } = await serverSupabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthenticated. Please log in to perform this action.');
  }

  const { data: profile } = await serverSupabase
    .from('profiles')
    .select('role, user_management_access')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin' && !profile.user_management_access)) {
    throw new Error('Unauthorized. You do not have permissions to manage users.');
  }
  
  return user.id;
}

// 1. READ: Fetch all user profiles
export async function getUsersAction(): Promise<UserProfile[]> {
  try {
    await assertAdminAccess();
    const adminSupabase = createAdminClient();
    
    const { data: profiles, error } = await adminSupabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return profiles as UserProfile[];
  } catch (err: any) {
    console.error('getUsersAction error:', err);
    throw new Error(err.message || 'Failed to retrieve user directory.');
  }
}

// 2. CREATE: Create new user in Auth system and configure their profile permissions
export async function createUserAction(formData: {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  warehouse_access: string[];
  permissions: {
    dashboard_access: boolean;
    materials_access: boolean;
    goods_inward_access: boolean;
    goods_outward_access: boolean;
    reports_access: boolean;
    purchase_orders_access: boolean;
    analytics_access: boolean;
    settings_access: boolean;
    user_management_access: boolean;
  };
}) {
  try {
    await assertAdminAccess();
    const adminSupabase = createAdminClient();

    // A. Create user in Supabase Auth Auth system
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: formData.email,
      password: formData.password || 'TemporaryPass123!',
      email_confirm: true,
      user_metadata: { name: formData.name },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Auth registration completed but returned no user object.');

    // B. Programmatically insert the operator profile directly into public.profiles
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        warehouse_access: formData.warehouse_access,
        dashboard_access: formData.permissions.dashboard_access,
        materials_access: formData.permissions.materials_access,
        goods_inward_access: formData.permissions.goods_inward_access,
        goods_outward_access: formData.permissions.goods_outward_access,
        reports_access: formData.permissions.reports_access,
        purchase_orders_access: formData.permissions.purchase_orders_access,
        analytics_access: formData.permissions.analytics_access,
        settings_access: formData.permissions.settings_access,
        user_management_access: formData.permissions.user_management_access,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      // Rollback Auth creation if profile update fails
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    revalidatePath('/admin/user-management');
    return { success: true, userId: authData.user.id };
  } catch (err: any) {
    console.error('createUserAction error:', err);
    return { success: false, error: err.message || 'Failed to create new user.' };
  }
}

// 3. UPDATE: Modify permissions, roles, warehouse assignments of an existing user
export async function updateUserAction(
  userId: string,
  formData: {
    name: string;
    role: UserRole;
    status: UserStatus;
    warehouse_access: string[];
    permissions: {
      dashboard_access: boolean;
      materials_access: boolean;
      goods_inward_access: boolean;
      goods_outward_access: boolean;
      reports_access: boolean;
      purchase_orders_access: boolean;
      analytics_access: boolean;
      settings_access: boolean;
      user_management_access: boolean;
    };
  }
) {
  try {
    const actorId = await assertAdminAccess();
    
    if (userId === actorId && formData.status === 'inactive') {
      throw new Error('Self-Deactivation Blocked. You cannot set your own account to inactive.');
    }

    const adminSupabase = createAdminClient();

    // A. Update the user metadata in Supabase Auth (e.g. display name)
    await adminSupabase.auth.admin.updateUserById(userId, {
      user_metadata: { name: formData.name }
    });

    // B. Update custom properties and module flags inside our public profile table
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        name: formData.name,
        role: formData.role,
        status: formData.status,
        warehouse_access: formData.warehouse_access,
        dashboard_access: formData.permissions.dashboard_access,
        materials_access: formData.permissions.materials_access,
        goods_inward_access: formData.permissions.goods_inward_access,
        goods_outward_access: formData.permissions.goods_outward_access,
        reports_access: formData.permissions.reports_access,
        purchase_orders_access: formData.permissions.purchase_orders_access,
        analytics_access: formData.permissions.analytics_access,
        settings_access: formData.permissions.settings_access,
        user_management_access: formData.permissions.user_management_access,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    revalidatePath('/admin/user-management');
    return { success: true };
  } catch (err: any) {
    console.error('updateUserAction error:', err);
    return { success: false, error: err.message || 'Failed to update user profile.' };
  }
}

// 4. DELETE: Completely erase user from auth system and cascade erase from profile
export async function deleteUserAction(userId: string) {
  try {
    const actorId = await assertAdminAccess();
    
    if (userId === actorId) {
      throw new Error('Self-Deletion Blocked. You cannot delete your own administrative session.');
    }

    const adminSupabase = createAdminClient();
    
    // Deleting from Auth system cascades deletes from public.profiles thanks to foreign key triggers
    const { error } = await adminSupabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    revalidatePath('/admin/user-management');
    return { success: true };
  } catch (err: any) {
    console.error('deleteUserAction error:', err);
    return { success: false, error: err.message || 'Failed to delete user account.' };
  }
}

// 5. SECURE PASSWORD RESET: Change password directly on behalf of a user
export async function resetUserPasswordAction(userId: string, newPassword?: string) {
  try {
    await assertAdminAccess();
    
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password complexity failure. Passwords must be at least 6 characters.');
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('resetUserPasswordAction error:', err);
    return { success: false, error: err.message || 'Failed to reset user password.' };
  }
}
