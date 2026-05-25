'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { 
  TrendingUp, ArrowDownLeft, ArrowUpRight, Activity, Clock, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';

// Mock flow data for the last 7 days
const flowData = [
  { day: 'Mon', Inbound: 400, Outbound: 240 },
  { day: 'Tue', Inbound: 300, Outbound: 139 },
  { day: 'Wed', Inbound: 200, Outbound: 980 },
  { day: 'Thu', Inbound: 278, Outbound: 390 },
  { day: 'Fri', Inbound: 189, Outbound: 480 },
  { day: 'Sat', Inbound: 239, Outbound: 380 },
  { day: 'Sun', Inbound: 349, Outbound: 430 },
];

// Mock warehouse capacity data
const capacityData = [
  { name: 'WH-HQ', Used: 780, Available: 220 },
  { name: 'WH-Main', Used: 610, Available: 390 },
  { name: 'WH-East', Used: 450, Available: 550 },
  { name: 'WH-Transit', Used: 210, Available: 790 },
];

// Custom glassmorphic tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="border border-slate-200/80 rounded-xl p-3 shadow-md space-y-1 bg-white/95 backdrop-blur-md">
        <p className="text-xs font-bold text-slate-800">{label} Analysis</p>
        {payload.map((item: any) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-slate-500 font-semibold">{item.name}:</span>
            <span className="font-bold text-slate-800">{item.value} units</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Area Chart: Material Flow (Inbound vs Outbound) */}
      <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm relative overflow-hidden transition-all duration-300 rounded-xl">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Stock Operations Velocity
            </CardTitle>
            <CardDescription className="text-xs text-slate-505 font-medium">
              Comparative analysis of inbound raw materials vs outbound garment shipments.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-700" /> Inbound
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> Outbound
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.48 0.16 230)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="oklch(0.48 0.16 230)" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.60 0.18 260)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="oklch(0.60 0.18 260)" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="rgba(0,0,0,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={4}
                />
                <YAxis 
                  stroke="rgba(0,0,0,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="Inbound" 
                  stroke="oklch(0.48 0.16 230)" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorInbound)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Outbound" 
                  stroke="oklch(0.60 0.18 260)" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorOutbound)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Bar Chart: Warehouse Allocation Capacity */}
      <Card className="border-slate-200 bg-white shadow-sm relative overflow-hidden transition-all duration-300 rounded-xl">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
            <Activity className="w-4 h-4 text-blue-600" />
            Clearance Space allocation
          </CardTitle>
          <CardDescription className="text-xs text-slate-505 font-medium">
            Current visual metric of allocated bin shelves across warehouses.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capacityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(0,0,0,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={4}
                />
                <YAxis 
                  stroke="rgba(0,0,0,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="Used" 
                  stackId="a" 
                  fill="oklch(0.48 0.16 230)" 
                  radius={[0, 0, 0, 0]} 
                  barSize={16}
                />
                <Bar 
                  dataKey="Available" 
                  stackId="a" 
                  fill="oklch(0.96 0.015 220)" 
                  radius={[8, 8, 0, 0]} 
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 3. Recent Audit Activity Timeline Panel */}
      <Card className="lg:col-span-3 border-slate-200 bg-white shadow-sm relative overflow-hidden transition-all duration-300 rounded-xl">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-550" />
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
              <Clock className="w-4 h-4 text-violet-600" />
              Live Terminal Operations Feed
            </CardTitle>
            <CardDescription className="text-xs text-slate-505 font-medium">
              Live updates of operational changes performed by active warehouse terminals.
            </CardDescription>
          </div>
          <Badge className="bg-violet-50 text-violet-600 border-violet-100 text-[10px] uppercase font-bold py-0.5">
            Active System Sync
          </Badge>
        </CardHeader>
        
        <CardContent className="pb-6">
          <div className="space-y-4 relative">
            <div className="absolute left-[17px] top-1.5 bottom-1.5 w-[1px] bg-slate-100" />
            
            {[
              {
                time: '12 mins ago',
                user: 'Super Admin',
                event: 'Configured new staff terminal user permissions for manager@rosebally.com.',
                icon: CheckCircle2,
                color: 'text-blue-700 bg-blue-50 border-blue-100',
              },
              {
                time: '1 hour ago',
                user: 'Warehouse Manager',
                event: 'Completed Goods Inbound batch log for Fabric-Yarn roll shipment #IN-42412.',
                icon: ArrowDownLeft,
                color: 'text-blue-600 bg-blue-50 border-blue-100',
              },
              {
                time: '2 hours ago',
                user: 'System Seeder',
                event: 'Database migrated successfully. Synchronized Profiles, Roles, and RLS tables.',
                icon: FileText,
                color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
              },
              {
                time: '4 hours ago',
                user: 'Staff Operator',
                event: 'Initiated Goods Outward batch order shipment preparation for dispatch #OUT-98212.',
                icon: ArrowUpRight,
                color: 'text-purple-600 bg-purple-50 border-purple-100',
              },
            ].map((activity, idx) => {
              const Icon = activity.icon;
              return (
                <div key={idx} className="flex items-start gap-4 text-xs group">
                  <div className={`p-1.5 rounded-xl border z-10 shrink-0 ${activity.color} group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-700 group-hover:text-blue-700 transition-colors font-sans">{activity.user}</span>
                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">{activity.time}</span>
                    </div>
                    <p className="text-slate-500 font-medium leading-normal">
                      {activity.event}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
