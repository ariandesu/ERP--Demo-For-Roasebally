'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, ROLE_LABELS, ROLE_COLORS } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  Users2,
  LogOut,
  Warehouse,
  Menu,
  X,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  profile: UserProfile;
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Session Closed', { description: 'You have logged out of the ERP console.' });
      router.refresh();
      router.push('/login');
    } catch (err: any) {
      toast.error('Logout Failure', { description: err.message });
    }
  };

  // Define sidebar navigation links mapped to module permissions
  const menuItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      allowed: profile.dashboard_access,
    },
    {
      name: 'Materials Master',
      href: '/materials',
      icon: Package,
      allowed: profile.materials_access,
    },
    {
      name: 'Goods Inward',
      href: '/inward',
      icon: ArrowDownLeft,
      allowed: profile.goods_inward_access,
    },
    {
      name: 'Goods Outward',
      href: '/outward',
      icon: ArrowUpRight,
      allowed: profile.goods_outward_access,
    },
    {
      name: 'Purchase Orders',
      href: '/purchase-orders',
      icon: ShieldCheck,
      allowed: profile.purchase_orders_access,
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FileSpreadsheet,
      allowed: profile.reports_access,
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: TrendingUp,
      allowed: profile.analytics_access,
    },
    {
      name: 'User Management',
      href: '/admin/user-management',
      icon: Users2,
      allowed: profile.user_management_access || profile.role === 'super_admin' || profile.role === 'admin',
    },
    {
      name: 'ERP Settings',
      href: '/settings',
      icon: Settings,
      allowed: profile.settings_access,
    },
  ];

  const activeItems = menuItems.filter((item) => item.allowed);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="flex items-center justify-center p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
            <Warehouse className="w-5 h-5" />
          </div>
          {!collapsed && (
            <span className="font-bold text-md tracking-wide text-slate-800 font-sans">
              Rosebally ERP
            </span>
          )}
        </Link>
        
        {/* Toggle Collapse Button (Desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-md hover:bg-sidebar-accent text-sidebar-foreground hover:text-slate-900 transition-colors border border-sidebar-border"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {activeItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'hover:bg-sidebar-accent text-slate-600 hover:text-blue-600'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              {!collapsed && <span>{item.name}</span>}
              
              {/* Tooltip on collapse */}
              {collapsed && (
                <div className="absolute left-14 scale-0 group-hover:scale-100 transition-all duration-150 origin-left bg-white text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-slate-200 shadow-md whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Information Profile Section */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/35">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-1.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{profile.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 border leading-none ${ROLE_COLORS[profile.role]}`}>
                    {ROLE_LABELS[profile.role]}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="w-full text-xs font-semibold bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-100 hover:border-red-600 transition-all py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out Session
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            
            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="md:hidden h-16 border-b border-sidebar-border bg-sidebar flex items-center justify-between px-4 z-40">
        <Link href="/" className="flex items-center gap-2 text-slate-800">
          <Warehouse className="w-5 h-5 text-sidebar-primary" />
          <span className="font-bold text-sm tracking-wide font-sans">Rosebally ERP</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg bg-sidebar-accent/50 text-slate-600 hover:text-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Sidebar Container */}
      <aside className={`hidden md:block h-screen shrink-0 transition-all duration-300 z-30 ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Slider Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar Drawer */}
          <div className="relative w-64 h-full flex flex-col slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-sidebar-accent text-slate-500 hover:text-slate-800 z-50"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
