'use client';

import React, { useState, useTransition } from 'react';
import { UserProfile, UserRole, UserStatus, ROLE_LABELS, ROLE_COLORS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Users2, UserPlus, Search, Edit2, Key, Trash2, ShieldCheck, Mail, Warehouse, ShieldAlert,
  Loader2, Settings, Lock, CheckCircle, RefreshCw, XCircle
} from 'lucide-react';
import { 
  createUserAction, 
  updateUserAction, 
  deleteUserAction, 
  resetUserPasswordAction 
} from '@/app/actions/admin-user-actions';

interface UserManagementClientProps {
  initialUsers: UserProfile[];
  currentUserId: string;
}

const getRoleDefaultPermissions = (role: UserRole) => {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return {
        dashboard_access: true,
        materials_access: true,
        goods_inward_access: true,
        goods_outward_access: true,
        purchase_orders_access: true,
        reports_access: true,
        analytics_access: true,
        settings_access: true,
        user_management_access: true,
      };
    case 'warehouse_manager':
      return {
        dashboard_access: true,
        materials_access: true,
        goods_inward_access: true,
        goods_outward_access: true,
        purchase_orders_access: true,
        reports_access: true,
        analytics_access: true,
        settings_access: false,
        user_management_access: false,
      };
    case 'staff':
      return {
        dashboard_access: true,
        materials_access: true,
        goods_inward_access: true,
        goods_outward_access: true,
        purchase_orders_access: false,
        reports_access: true,
        analytics_access: false,
        settings_access: false,
        user_management_access: false,
      };
    case 'viewer':
    default:
      return {
        dashboard_access: true,
        materials_access: true,
        goods_inward_access: false,
        goods_outward_access: false,
        purchase_orders_access: false,
        reports_access: true,
        analytics_access: true,
        settings_access: false,
        user_management_access: false,
      };
  }
};

export default function UserManagementClient({ initialUsers, currentUserId }: UserManagementClientProps) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();

  // Create/Edit Modals State
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Password Reset Modal State
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [selectedResetUser, setSelectedResetUser] = useState<UserProfile | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [status, setStatus] = useState<UserStatus>('active');
  const [warehouseAccess, setWarehouseAccess] = useState('');

  // Module Permissions State
  const [permissions, setPermissions] = useState({
    dashboard_access: true,
    materials_access: false,
    goods_inward_access: false,
    goods_outward_access: false,
    reports_access: false,
    purchase_orders_access: false,
    analytics_access: false,
    settings_access: false,
    user_management_access: false,
  });

  // Filtered Users List
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.role.toLowerCase().includes(search.toLowerCase())
  );

  // Reset form helper
  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('viewer');
    setStatus('active');
    setWarehouseAccess('');
    setPermissions({
      dashboard_access: true,
      materials_access: false,
      goods_inward_access: false,
      goods_outward_access: false,
      reports_access: false,
      purchase_orders_access: false,
      analytics_access: false,
      settings_access: false,
      user_management_access: false,
    });
    setSelectedUser(null);
    setEditMode(false);
  };

  // Open creation modal
  const handleOpenCreate = () => {
    resetForm();
    setEditMode(false);
    setModalOpen(true);
  };

  // Open edit modal preloaded with data
  const handleOpenEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status);
    setWarehouseAccess(user.warehouse_access.join(', '));
    setPermissions({
      dashboard_access: user.dashboard_access,
      materials_access: user.materials_access,
      goods_inward_access: user.goods_inward_access,
      goods_outward_access: user.goods_outward_access,
      reports_access: user.reports_access,
      purchase_orders_access: user.purchase_orders_access,
      analytics_access: user.analytics_access,
      settings_access: user.settings_access,
      user_management_access: user.user_management_access,
    });
    setEditMode(true);
    setModalOpen(true);
  };

  // Submit create or edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const warehouseArray = warehouseAccess
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0);

    const payload = {
      name,
      role,
      status,
      warehouse_access: warehouseArray,
      permissions,
    };

    startTransition(async () => {
      if (editMode && selectedUser) {
        // Edit User Process
        const result = await updateUserAction(selectedUser.id, payload);
        if (result.success) {
          toast.success('Profile Synchronized', { description: `${name}'s access profiles were updated successfully.` });
          
          // Re-update local state with flat properties
          setUsers(prev => prev.map(u => u.id === selectedUser.id ? { 
            ...u, 
            name, 
            role, 
            status, 
            warehouse_access: warehouseArray, 
            ...permissions 
          } : u));
          setModalOpen(false);
          resetForm();
        } else {
          toast.error('Sync Error', { description: result.error });
        }
      } else {
        // Create User Process
        if (!password || password.length < 6) {
          toast.warning('Security Block', { description: 'Provide a password of at least 6 characters for the new account.' });
          return;
        }

        const result = await createUserAction({ ...payload, email, password });
        if (result.success && result.userId) {
          toast.success('Account Activated', { description: `ERP account created for ${name} under ${email}.` });
          
          // Update local state with flat mock details until hard refresh
          const newUser: UserProfile = {
            id: result.userId,
            name,
            email,
            role,
            status,
            warehouse_access: warehouseArray,
            ...permissions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setUsers(prev => [newUser, ...prev]);
          setModalOpen(false);
          resetForm();
        } else {
          toast.error('Activation Error', { description: result.error });
        }
      }
    });
  };

  // Delete user action
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUserId) {
      toast.error('Self-Deletion Prevented', { description: 'You cannot delete your own administrative session.' });
      return;
    }

    if (!confirm(`Are you absolutely sure you want to delete ${userName}'s ERP account? This action cascades and deletes their entire database footprint.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteUserAction(userId);
      if (result.success) {
        toast.success('Account Revoked', { description: `${userName}'s user credentials were permanently purged.` });
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        toast.error('Purging Error', { description: result.error });
      }
    });
  };

  // Open reset dialog
  const handleOpenReset = (user: UserProfile) => {
    setSelectedResetUser(user);
    setResetPassword('');
    setResetOpen(true);
  };

  // Submit reset password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResetUser) return;

    if (resetPassword.length < 6) {
      toast.warning('Invalid Length', { description: 'Passwords must contain at least 6 characters.' });
      return;
    }

    startTransition(async () => {
      const result = await resetUserPasswordAction(selectedResetUser.id, resetPassword);
      if (result.success) {
        toast.success('Security Override Done', { description: `Password reset successfully for ${selectedResetUser.name}.` });
        setResetOpen(false);
      } else {
        toast.error('Override Error', { description: result.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              User & Permission Administration
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Provision new employee warehouse logins, override credentials, and configure module RLS access.
          </p>
        </div>

        {/* Create Account Trigger Button */}
        <Button 
          onClick={handleOpenCreate} 
          className="bg-blue-600 hover:bg-blue-500 text-white shadow-sm hover:shadow-blue-500/20 font-medium rounded-xl py-2 px-4 flex items-center gap-2 cursor-pointer transition-all duration-300"
        >
          <UserPlus className="w-4 h-4" />
          Activate New Operator
        </Button>
      </div>

      {/* Directory Search and Filter Console */}
      <Card className="border-slate-200/80 bg-white shadow-md rounded-xl overflow-hidden">
        <CardHeader className="py-4 bg-slate-50/50 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search user profiles by name, email or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
            />
          </div>
        </CardHeader>

        {/* Directory Table */}
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-200/80">
                <TableRow className="hover:bg-transparent border-slate-200/80">
                  <TableHead className="text-slate-500 font-bold px-4">Operator Details</TableHead>
                  <TableHead className="text-slate-500 font-bold">Security Role</TableHead>
                  <TableHead className="text-slate-500 font-bold">Active Status</TableHead>
                  <TableHead className="text-slate-500 font-bold">Warehouse Clearance</TableHead>
                  <TableHead className="text-slate-500 font-bold">Module Access Grid</TableHead>
                  <TableHead className="text-slate-500 font-bold text-right px-4">Administrative Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow className="border-slate-200/80 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-semibold">
                      No user accounts found matching your query criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-slate-200/80 hover:bg-slate-50/40 transition-colors">
                      {/* Name & Email */}
                      <TableCell className="font-medium px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-250 shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{user.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3.5 h-3.5" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Role Badge */}
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-0.5 border leading-none ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </TableCell>
                      
                      {/* Status Badge */}
                      <TableCell>
                        {user.status === 'active' ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-650 border-emerald-500/20 text-xs font-semibold px-2 py-0.5">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold px-2 py-0.5">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>

                      {/* Warehouse Access */}
                      <TableCell className="max-w-[200px]">
                        {user.warehouse_access.length === 0 ? (
                          <span className="text-xs text-slate-400 font-semibold">Universal Access Blocked</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {user.warehouse_access.map(w => (
                              <Badge key={w} variant="secondary" className="bg-slate-100 text-slate-600 border border-slate-200/50 text-[10px] py-0 px-1.5 font-medium">
                                {w}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>

                      {/* Permission list */}
                      <TableCell>
                        <div className="grid grid-cols-5 gap-1 max-w-[220px]">
                          <span title="Dashboard" className={`text-[10px] font-bold text-center py-0.5 rounded ${user.dashboard_access ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-400'}`}>DSH</span>
                          <span title="Materials" className={`text-[10px] font-bold text-center py-0.5 rounded ${user.materials_access ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-400'}`}>MAT</span>
                          <span title="Inward" className={`text-[10px] font-bold text-center py-0.5 rounded ${user.goods_inward_access ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>INW</span>
                          <span title="Outward" className={`text-[10px] font-bold text-center py-0.5 rounded ${user.goods_outward_access ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-slate-100 text-slate-400'}`}>OUT</span>
                          <span title="Reports" className={`text-[10px] font-bold text-center py-0.5 rounded ${user.reports_access ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-400'}`}>REP</span>
                        </div>
                      </TableCell>

                      {/* Action buttons */}
                      <TableCell className="text-right px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(user)}
                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl"
                            title="Edit operator settings"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenReset(user)}
                            className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-xl"
                            title="Override security keys"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={user.id === currentUserId}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 rounded-xl"
                            title="Purge account credentials"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 1. Dialog: Create or Edit User */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 max-w-3xl rounded-xl shadow-sm relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
          <form onSubmit={handleFormSubmit}>
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl text-slate-800 font-bold flex items-center gap-2">
                {editMode ? <Edit2 className="w-5 h-5 text-blue-600" /> : <UserPlus className="w-5 h-5 text-blue-600" />}
                {editMode ? `Modify Operator: ${selectedUser?.name}` : 'Provision New Operational Account'}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Setup security privileges, physical warehouse allocation bounds, and strict module access controls.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Account details */}
              <div className="space-y-4 border-r border-slate-105 pr-0 md:pr-4">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-name" className="text-slate-700 font-semibold">Display Name</Label>
                  <Input
                    id="modal-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                    placeholder="e.g. Mahir Faisal"
                    required
                  />
                </div>

                {!editMode && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-email" className="text-slate-700 font-semibold">Email Address</Label>
                      <Input
                        id="modal-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                        placeholder="e.g. mahir@company.com"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-pass" className="text-slate-700 font-semibold">Security Password</Label>
                      <Input
                        id="modal-pass"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                        placeholder="Min. 6 characters"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="modal-role" className="text-slate-700 font-semibold">Operational Role</Label>
                  <Select 
                    value={role} 
                    onValueChange={(val) => { 
                      if (val) {
                        setRole(val as UserRole);
                        setPermissions(getRoleDefaultPermissions(val as UserRole));
                      }
                    }}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl">
                      <SelectValue placeholder="Assign Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-850 rounded-xl">
                      <SelectItem value="super_admin">Super Admin (Universal Access)</SelectItem>
                      <SelectItem value="admin">Admin (Staff Mgmt & Warehouse)</SelectItem>
                      <SelectItem value="warehouse_manager">Warehouse Manager (Stock & In/Out)</SelectItem>
                      <SelectItem value="staff">Staff (Limited assigned modules)</SelectItem>
                      <SelectItem value="viewer">Viewer (Read-Only access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-warehouses" className="text-slate-700 font-semibold">Warehouse Access Clearance</Label>
                  <Input
                    id="modal-warehouses"
                    type="text"
                    value={warehouseAccess}
                    onChange={(e) => setWarehouseAccess(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                    placeholder="e.g. WH-A, WH-B (comma separated)"
                  />
                  <p className="text-[10px] text-slate-400 font-medium leading-normal">
                    Enter identifiers separated by commas to restrict stock visibility.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <Label htmlFor="modal-status" className="text-slate-700 font-semibold cursor-pointer">Account Status</Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${status === 'active' ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {status === 'active' ? 'ACTIVE' : 'DISABLED'}
                    </span>
                    <Switch
                      id="modal-status"
                      checked={status === 'active'}
                      onCheckedChange={(checked) => setStatus(checked ? 'active' : 'inactive')}
                    />
                  </div>
                </div>
              </div>

              {/* Module privileges toggles */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  Module Authorization Flags
                </h4>

                <div className="space-y-2.5 overflow-y-auto max-h-[340px] pr-1">
                  {[
                    { key: 'dashboard_access', label: 'Overview Dashboard' },
                    { key: 'materials_access', label: 'Materials Master' },
                    { key: 'goods_inward_access', label: 'Goods Inward (Receive)' },
                    { key: 'goods_outward_access', label: 'Goods Outward (Dispatch)' },
                    { key: 'purchase_orders_access', label: 'Purchase Orders System' },
                    { key: 'reports_access', label: 'Operational Reports' },
                    { key: 'analytics_access', label: 'Advanced Business Analytics' },
                    { key: 'settings_access', label: 'System ERP Settings' },
                    { key: 'user_management_access', label: 'User & Security Admin' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                      <Label htmlFor={`perm-${item.key}`} className="text-xs text-slate-700 cursor-pointer font-semibold">
                        {item.label}
                      </Label>
                      <Switch
                        id={`perm-${item.key}`}
                        checked={permissions[item.key as keyof typeof permissions]}
                        onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, [item.key]: checked }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-200 pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
              >
                Discard
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md hover:shadow-blue-700/10 transition-all rounded-xl py-2 px-4 cursor-pointer"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  editMode ? 'Confirm Upgrades' : 'Provision Account'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Dialog: Password Override */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 max-w-sm rounded-xl shadow-sm relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
          <form onSubmit={handleResetSubmit}>
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl text-slate-800 font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-500" />
                Override Security Password
              </DialogTitle>
              <DialogDescription className="text-slate-505 font-medium">
                Instantly override credentials for operator: <strong className="text-slate-800 font-bold">{selectedResetUser?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <Label htmlFor="override-pass" className="text-slate-705 font-semibold">Enter New Security Password</Label>
              <Input
                id="override-pass"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResetOpen(false)}
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md hover:shadow-amber-650/10 transition-all rounded-xl py-2 px-4 cursor-pointer"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Overriding Keys...
                  </>
                ) : (
                  'Confirm Security Override'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
