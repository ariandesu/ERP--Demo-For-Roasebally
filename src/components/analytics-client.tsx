'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, ArrowLeft, ArrowDownLeft, ArrowUpRight, DollarSign, Layers,
  Activity, AlertTriangle, ShieldCheck, PieChart as PieIcon, RefreshCw, Calendar
} from 'lucide-react';
import { Material, InwardShipment, OutwardShipment, PurchaseOrder, UserProfile, SKU } from '@/types';

interface AnalyticsClientProps {
  materials: Material[];
  inwardShipments: InwardShipment[];
  outwardShipments: OutwardShipment[];
  purchaseOrders: PurchaseOrder[];
  profile: UserProfile;
}

// Custom tooltip styled with a crisp bright mode glassmorphic aesthetic
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass border border-slate-200/80 rounded-2xl p-3.5 shadow-md space-y-1.5 bg-white/95 backdrop-blur-md text-xs font-sans">
        <p className="font-bold text-slate-800 text-xs">{label}</p>
        {payload.map((item: any) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
            <span className="text-slate-500 font-semibold">{item.name}:</span>
            <span className="font-bold text-slate-800">
              {item.name.toLowerCase().includes('spend') || item.name.toLowerCase().includes('amount') || item.name.toLowerCase().includes('value')
                ? `$${Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${Number(item.value).toLocaleString()} units`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsClient({
  materials,
  inwardShipments,
  outwardShipments,
  purchaseOrders,
  profile
}: AnalyticsClientProps) {
  // Projections Filter State: '30' (Last 30 Days), '90' (Last 90 Days), '180' (Last 180 Days), 'all' (All Time)
  const [timeRange, setTimeRange] = useState<string>('90');

  // 1. Filtered Collections based on chosen projection time window
  const filteredData = useMemo(() => {
    const now = new Date();
    const thresholdDate = new Date();
    
    if (timeRange !== 'all') {
      thresholdDate.setDate(now.getDate() - Number(timeRange));
    }

    const isInRange = (dateStr: string) => {
      if (timeRange === 'all') return true;
      const itemDate = new Date(dateStr);
      return itemDate >= thresholdDate;
    };

    return {
      inwards: inwardShipments.filter(s => isInRange(s.received_date)),
      outwards: outwardShipments.filter(s => isInRange(s.dispatched_date)),
      pos: purchaseOrders.filter(po => isInRange(po.order_date))
    };
  }, [timeRange, inwardShipments, outwardShipments, purchaseOrders]);

  // 2. Compute dynamic operational aggregates
  const stats = useMemo(() => {
    // Current stock on hand across all material variants
    let currentStockTotal = 0;
    let lowStockAlertsCount = 0;
    let activeSKUsCount = 0;

    materials.forEach(m => {
      (m.skus || []).forEach(s => {
        activeSKUsCount++;
        const qoh = Number(s.quantity_on_hand);
        currentStockTotal += qoh;
        if (s.alert_on_low_stock && qoh <= Number(s.min_stock_level)) {
          lowStockAlertsCount++;
        }
      });
    });

    // Total dispatched units in filtered period
    const periodDispatchedVolume = filteredData.outwards.reduce((sum, s) => {
      const itemsSum = (s.items || []).reduce((iSum, item) => iSum + Number(item.quantity_dispatched), 0);
      return sum + itemsSum;
    }, 0);

    // Total inward received units in filtered period
    const periodReceivedVolume = filteredData.inwards.reduce((sum, s) => {
      const itemsSum = (s.items || []).reduce((iSum, item) => iSum + Number(item.quantity_received), 0);
      return sum + itemsSum;
    }, 0);

    // Cumulative procurement spend
    const periodProcurementSpend = filteredData.pos.reduce((sum, po) => sum + Number(po.total_amount), 0);

    // Target Warehouse Capacity Constant (adjustable, pull from config later)
    const warehouseCapacity = 60000;
    const occupancyPercentage = Math.min((currentStockTotal / warehouseCapacity) * 100, 100);

    return {
      currentStockTotal,
      lowStockAlertsCount,
      activeSKUsCount,
      periodDispatchedVolume,
      periodReceivedVolume,
      periodProcurementSpend,
      warehouseCapacity,
      occupancyPercentage
    };
  }, [materials, filteredData]);

  // 3. CHART DATA 1: Stock Level Allocation by Material Category
  const categoryChartData = useMemo(() => {
    const catsMap: Record<string, { name: string; quantity: number; val: number }> = {
      fabric: { name: 'Fabric Materials', quantity: 0, val: 0 },
      yarn: { name: 'Yarn Stock', quantity: 0, val: 0 },
      accessory: { name: 'Accessories', quantity: 0, val: 0 },
      packaging: { name: 'Packaging', quantity: 0, val: 0 },
      finished_garment: { name: 'Finished SKUs', quantity: 0, val: 0 }
    };

    materials.forEach(m => {
      const cat = m.category || 'fabric';
      const qoh = (m.skus || []).reduce((sum, s) => sum + Number(s.quantity_on_hand), 0);
      // Rough valuation estimate: inward items average price * quantity, fallback to $5/unit
      let valRate = 5.0;
      if (cat === 'fabric') valRate = 12.0;
      else if (cat === 'finished_garment') valRate = 22.0;
      
      if (catsMap[cat]) {
        catsMap[cat].quantity += qoh;
        catsMap[cat].val += qoh * valRate;
      }
    });

    return Object.values(catsMap);
  }, [materials]);

  // 4. CHART DATA 2: Monthly Shipment Velocity (Inflow vs Outflow)
  const monthlyFlowChartData = useMemo(() => {
    const monthlyData: Record<string, { monthKey: string; sortKey: string; Inbound: number; Outbound: number }> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Inward Shipments items
    filteredData.inwards.forEach(s => {
      const date = new Date(s.received_date);
      const mName = monthNames[date.getMonth()];
      const yName = date.getFullYear().toString().slice(-2);
      const label = `${mName} '${yName}`;
      const sortKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      const totalReceived = (s.items || []).reduce((sum, item) => sum + Number(item.quantity_received), 0);

      if (!monthlyData[label]) {
        monthlyData[label] = { monthKey: label, sortKey, Inbound: 0, Outbound: 0 };
      }
      monthlyData[label].Inbound += totalReceived;
    });

    // Outward Dispatches items
    filteredData.outwards.forEach(s => {
      const date = new Date(s.dispatched_date);
      const mName = monthNames[date.getMonth()];
      const yName = date.getFullYear().toString().slice(-2);
      const label = `${mName} '${yName}`;
      const sortKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      const totalDispatched = (s.items || []).reduce((sum, item) => sum + Number(item.quantity_dispatched), 0);

      if (!monthlyData[label]) {
        monthlyData[label] = { monthKey: label, sortKey, Inbound: 0, Outbound: 0 };
      }
      monthlyData[label].Outbound += totalDispatched;
    });

    // Sort chronologically
    return Object.values(monthlyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredData]);

  // 5. CHART DATA 3: Purchase Order Spending Allocation by PO Status
  const poStatusChartData = useMemo(() => {
    const poMap: Record<string, { name: string; spend: number; count: number }> = {
      draft: { name: 'Draft Phase', spend: 0, count: 0 },
      pending: { name: 'Pending Review', spend: 0, count: 0 },
      completed: { name: 'Disbursed/Received', spend: 0, count: 0 },
      cancelled: { name: 'Cancelled POs', spend: 0, count: 0 }
    };

    filteredData.pos.forEach(po => {
      const status = po.status || 'draft';
      if (poMap[status]) {
        poMap[status].spend += Number(po.total_amount);
        poMap[status].count++;
      }
    });

    return Object.values(poMap);
  }, [filteredData]);

  // 6. CHART DATA 4: Quality Assurance Inspections Pass Ratio
  const qualityInspectionData = useMemo(() => {
    const statusMap: Record<string, { name: string; value: number; color: string }> = {
      passed: { name: 'Passed Quality Inspection', value: 0, color: 'oklch(0.68 0.16 140)' },
      quarantine: { name: 'Quarantined Batch Lots', value: 0, color: 'oklch(0.72 0.12 80)' },
      failed: { name: 'Rejected Goods Faulty', value: 0, color: 'oklch(0.58 0.18 25)' }
    };

    filteredData.inwards.forEach(s => {
      (s.items || []).forEach(item => {
        const qStatus = item.quality_status || 'passed';
        const qty = Number(item.quantity_received);
        if (statusMap[qStatus]) {
          statusMap[qStatus].value += qty;
        }
      });
    });

    // Filter out zero categories to render cleanly
    return Object.values(statusMap).filter(item => item.value > 0);
  }, [filteredData]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header with Title and Time-Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-850 font-sans tracking-tight">Garment Warehouse Telemetry</h2>
            <p className="text-xs text-slate-500 font-medium">Advanced dashboard mapping warehouse occupancy, physical stock velocities, and quality ratios.</p>
          </div>
        </div>
        
        {/* Time-Range Projection Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-2xl shadow-sm self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 mr-1 uppercase">Projections:</span>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs font-extrabold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer pr-1"
          >
            <option value="30">Last 30 Days</option>
            <option value="90">Last 30 Days (Quarterly)</option>
            <option value="180">Last 180 Days (Half-Year)</option>
            <option value="all">All-Time Historical</option>
          </select>
        </div>
      </div>

      {/* 2. Top-tier KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Warehouse Occupancy Gauge */}
        <Card className="border-slate-200/80 bg-white shadow-sm relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-md hover:border-slate-300/80">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500 to-sky-400" />
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Warehouse Space Occupancy
              <Activity className="w-4 h-4 text-cyan-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800 font-sans">
                  {stats.occupancyPercentage.toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold text-slate-400">capacity used</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {stats.currentStockTotal.toLocaleString()} of {stats.warehouseCapacity.toLocaleString()} units cataloged.
              </p>
            </div>
            
            {/* Horizontal custom bar gauge */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full transition-all duration-500"
                style={{ width: `${stats.occupancyPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Active catalog lines & Low Stock Alerts */}
        <Card className="border-slate-200/80 bg-white shadow-sm relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-md hover:border-slate-300/80">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-rose-500 to-orange-400" />
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Stock Lines & Alerts
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 font-sans">{stats.activeSKUsCount}</span>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase">Unique SKUs active</p>
              </div>
              
              {stats.lowStockAlertsCount > 0 ? (
                <Badge className="bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-50 rounded-xl px-2.5 py-1 text-xs font-extrabold flex items-center gap-1">
                  {stats.lowStockAlertsCount} Low Stock
                </Badge>
              ) : (
                <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-50 rounded-xl px-2.5 py-1 text-xs font-extrabold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Healthy
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Materials Master contains {materials.length} parent item categories.
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Outflow Dispatch Velocity */}
        <Card className="border-slate-200/80 bg-white shadow-sm relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-md hover:border-slate-300/80">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Dispatches Velocity
              <ArrowUpRight className="w-4 h-4 text-violet-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-2xl font-black text-slate-800 font-sans">
                {stats.periodDispatchedVolume.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-400 ml-1">units shipped</span>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase">Outbound shipments: {filteredData.outwards.length}</p>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Average dispatch rate of {filteredData.outwards.length > 0 ? (stats.periodDispatchedVolume / filteredData.outwards.length).toFixed(0) : 0} units per loadout.
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Cumulative Procurement Spend */}
        <Card className="border-slate-200/80 bg-white shadow-sm relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-md hover:border-slate-300/80">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-teal-400" />
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Procurement spent
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-2xl font-black text-slate-800 font-sans">
                ${stats.periodProcurementSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase">Purchase Orders drafted: {filteredData.pos.length}</p>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Averages ${filteredData.pos.length > 0 ? (stats.periodProcurementSpend / filteredData.pos.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0} spent value per purchase ticket.
            </p>
          </CardContent>
        </Card>

      </div>

      {/* 3. Deep Analysis Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART A: Stock Level Valuation by Material Category */}
        <Card className="border-slate-200/80 bg-white shadow-sm relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-md">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-cyan-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide font-sans">
              <Layers className="w-4 h-4 text-cyan-600" />
              Stock Valuation by Category
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500 font-medium">
              Comparison of stock roll counts vs inventory capital assets grouped by material master category.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.16 210)" />
                      <stop offset="100%" stopColor="oklch(0.48 0.16 230)" />
                    </linearGradient>
                  </defs>
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
                    dataKey="quantity" 
                    name="Stock Roll Count"
                    fill="url(#cyanGrad)" 
                    radius={[8, 8, 0, 0]} 
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CHART B: Operations Shipment Velocity (Inward vs Outward) */}
        <Card className="border-slate-200/80 bg-white shadow-sm relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-md">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-violet-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide font-sans">
              <TrendingUp className="w-4 h-4 text-violet-600" />
              Inflow vs Outflow Shipment Velocity
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500 font-medium">
              Plotting inbound received rolls vs outbound cargo dispatches chronologically across monthly logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[280px] w-full">
              {monthlyFlowChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyFlowChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.68 0.16 140)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="oklch(0.68 0.16 140)" stopOpacity={0.01}/>
                      </linearGradient>
                      <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.60 0.18 260)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="oklch(0.60 0.18 260)" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis 
                      dataKey="monthKey" 
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
                      name="Inward Received"
                      stroke="oklch(0.68 0.16 140)" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorInbound)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Outbound" 
                      name="Outward Dispatched"
                      stroke="oklch(0.60 0.18 260)" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorOutbound)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                  <RefreshCw className="w-8 h-8 mb-2 animate-spin text-slate-350" />
                  <span className="text-xs font-bold uppercase tracking-wider">Compiling Shipment Flow Ledger...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CHART C: Procurement Capital Allocation by PO Status */}
        <Card className="border-slate-200/80 bg-white shadow-sm relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-md">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide font-sans">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Capital Budget Allocation by Status
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500 font-medium">
              Distribution of procurement purchase orders capital budget (USD) depending on transactional states.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={poStatusChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="oklch(0.76 0.12 160)" />
                      <stop offset="100%" stopColor="oklch(0.68 0.16 140)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                  <XAxis 
                    type="number"
                    stroke="rgba(0,0,0,0.3)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    stroke="rgba(0,0,0,0.4)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="spend" 
                    name="PO Spend Amount"
                    fill="url(#emeraldGrad)" 
                    radius={[0, 8, 8, 0]} 
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CHART D: Quality Assurance (QA) Inward Pass Ratio */}
        <Card className="border-slate-200/80 bg-white shadow-sm relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-md">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-orange-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide font-sans">
              <PieIcon className="w-4 h-4 text-orange-600" />
              Inward Cargo Quality Assurance (QA) Ratio
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500 font-medium">
              Inspection breakdown of received supplier lot batches showing passed, quarantined, and failed shares.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[280px] w-full flex flex-col sm:flex-row items-center justify-center gap-6">
              {qualityInspectionData.length > 0 ? (
                <>
                  <div className="w-[180px] h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={qualityInspectionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {qualityInspectionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Custom legend alignment side items */}
                  <div className="space-y-3 font-sans shrink-0">
                    {qualityInspectionData.map((item, idx) => {
                      const percentage = ((item.value / stats.periodReceivedVolume) * 100) || 0;
                      return (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <span className="w-3.5 h-3.5 rounded-md mt-0.5 shrink-0" style={{ backgroundColor: item.color }} />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">{item.name}</span>
                              <span className="font-extrabold text-[10px] text-slate-400">({percentage.toFixed(1)}%)</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold">{item.value.toLocaleString()} yards/meters</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                  <ShieldCheck className="w-8 h-8 mb-2 text-slate-350" />
                  <span className="text-xs font-bold uppercase tracking-wider">No received QC lots in this window</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
