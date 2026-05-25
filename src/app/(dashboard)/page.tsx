import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserProfile, ROLE_LABELS, ROLE_COLORS } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardCharts from '@/components/dashboard-charts';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  Users2,
  Warehouse,
  Boxes,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  AlertCircle
} from 'lucide-react';

export default async function DashboardPage() {
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

  const userProfile = profile as UserProfile;

  // Configuration of available quick links
  const erpModules = [
    {
      name: 'Materials Master',
      description: 'Define raw fabric materials, finished garments, and manage SKU configurations.',
      href: '/materials',
      icon: Package,
      allowed: userProfile.materials_access,
      color: 'text-blue-600 border-slate-200/80 hover:border-blue-300 bg-white',
    },
    {
      name: 'Goods Inward',
      description: 'Receive raw materials, record supplier batch numbers, and verify invoices.',
      href: '/inward',
      icon: ArrowDownLeft,
      allowed: userProfile.goods_inward_access,
      color: 'text-blue-600 border-slate-200/80 hover:border-blue-300 bg-white',
    },
    {
      name: 'Goods Outward',
      description: 'Dispatch finished goods, allocate customer order items, and print packaging slips.',
      href: '/outward',
      icon: ArrowUpRight,
      allowed: userProfile.goods_outward_access,
      color: 'text-violet-600 border-slate-200/80 hover:border-violet-300 bg-white',
    },
    {
      name: 'Purchase Orders',
      description: 'Draft purchase orders, track supplier requests, and verify receipt statuses.',
      href: '/purchase-orders',
      icon: ShieldCheck,
      allowed: userProfile.purchase_orders_access,
      color: 'text-emerald-600 border-slate-200/80 hover:border-emerald-300 bg-white',
    },
    {
      name: 'ERP Reports',
      description: 'Generate real-time inventory sheets, dispatch histories, and stock audits.',
      href: '/reports',
      icon: FileSpreadsheet,
      allowed: userProfile.reports_access,
      color: 'text-amber-600 border-slate-200/80 hover:border-amber-300 bg-white',
    },
    {
      name: 'Advanced Analytics',
      description: 'Inspect warehouse occupancy charts, stock turn values, and trends.',
      href: '/analytics',
      icon: TrendingUp,
      allowed: userProfile.analytics_access,
      color: 'text-pink-600 border-slate-200/80 hover:border-pink-300 bg-white',
    },
    {
      name: 'User Management',
      description: 'Control access, add new staff accounts, manage passwords, and configure permissions.',
      href: '/admin/user-management',
      icon: Users2,
      allowed: userProfile.user_management_access || userProfile.role === 'super_admin' || userProfile.role === 'admin',
      color: 'text-rose-600 border-slate-200/80 hover:border-rose-300 bg-white',
    },
    {
      name: 'ERP Settings',
      description: 'Configure warehouse physical structures, integration tokens, and system parameters.',
      href: '/settings',
      icon: Settings,
      allowed: userProfile.settings_access,
      color: 'text-slate-600 border-slate-200/80 hover:border-slate-300 bg-white',
    },
  ];

  const activeModules = erpModules.filter((module) => module.allowed);

  // Elite Dashboard Metrics (Mock Data)
  const metrics = [
    { title: 'Materials SKU Count', value: '1,424', change: '+12% this week', icon: Boxes, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { title: 'Warehouse Occupancy', value: '68.4%', change: 'Normal utility rate', icon: Warehouse, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { title: 'Active Purchase Orders', value: '42', change: '8 pending delivery', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { title: 'Active Staff Terminals', value: '12', change: 'Live terminal synchronization', icon: Users, color: 'text-violet-600 bg-violet-50 border-violet-100' },
  ];

  return (
    <div className="space-y-8">
      
      {/* Dynamic Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              Welcome Back, {userProfile.name}!
            </h2>
            <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wide border px-2 py-0.5 ${ROLE_COLORS[userProfile.role]}`}>
              {ROLE_LABELS[userProfile.role]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 max-w-xl font-medium">
            You are authenticated into the Rosebally Warehouse ERP. Below are your assigned business modules and real-time operational metrics.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div className="text-left">
            <p className="text-xs font-bold text-slate-800">Terminal Synchronized</p>
            <p className="text-[10px] text-slate-500 font-medium">Database Connection Active</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="border-slate-200 bg-white shadow-sm transition-all duration-200 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{metric.title}</CardTitle>
                <div className={`p-2 rounded-xl border ${metric.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold text-slate-800 tracking-tight">{metric.value}</div>
                <p className="text-xs text-slate-500 font-medium">{metric.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Visual Analytics Charts Section */}
      <DashboardCharts />

      {/* Authorized Modules Panel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-blue-600" />
          <h3 className="text-md font-bold text-slate-800 tracking-wide uppercase">Your Permitted Modules</h3>
        </div>

        {activeModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-200 rounded-2xl gap-3">
            <AlertCircle className="w-10 h-10 text-amber-500/80" />
            <div className="space-y-1">
              <h4 className="font-semibold text-slate-800 text-sm">No Modules Assigned</h4>
              <p className="text-xs text-slate-500 max-w-md">
                Your role does not currently have access to any specific warehouse module. Please contact your system administrator to assign permissions.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.name} href={module.href} className="group">
                  <Card className={`h-full border hover:shadow-md transition-all duration-300 shadow-sm rounded-xl ${module.color}`}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="p-3 rounded-2xl border bg-slate-50 border-slate-100">
                        <Icon className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-1 transition-all duration-200" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {module.name}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        {module.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
