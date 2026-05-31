'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, ComposedChart, Line,
  RadialBarChart, RadialBar, LineChart, ReferenceLine
} from 'recharts';
import {
  TrendingUp, ArrowLeft, ArrowDownLeft, ArrowUpRight, DollarSign, Layers,
  Activity, AlertTriangle, ShieldCheck, PieChart as PieIcon, Calendar,
  BarChart3, Boxes, Warehouse, Package, Truck, CheckCircle2, XCircle,
  Target, Zap, Clock, ShieldAlert, Gauge
} from 'lucide-react';
import { Material, InwardShipment, OutwardShipment, PurchaseOrder, UserProfile } from '@/types';
import { useCurrency } from '@/hooks/use-currency';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface AnalyticsClientProps {
  materials: Material[];
  inwardShipments: InwardShipment[];
  outwardShipments: OutwardShipment[];
  purchaseOrders: PurchaseOrder[];
  profile: UserProfile;
}

type AnalyticsTab = 'executive' | 'inventory' | 'procurement' | 'warehouse' | 'quality';

// ==========================================
// DESIGN TOKENS
// ==========================================

const COLORS = {
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  danger: '#ef4444',
  dangerLight: '#f87171',
  violet: '#8b5cf6',
  violetLight: '#a78bfa',
  cyan: '#06b6d4',
  cyanLight: '#22d3ee',
  slate: '#64748b',
  rose: '#f43f5e',
  amber: '#f59e0b',
  emerald: '#10b981',
  indigo: '#6366f1',
  teal: '#14b8a6',
};

const CATEGORY_COLORS: Record<string, string> = {
  fabric: COLORS.primary,
  yarn: COLORS.violet,
  accessory: COLORS.amber,
  packaging: COLORS.cyan,
  finished_garment: COLORS.emerald,
};

const PIE_PALETTE = [COLORS.primary, COLORS.emerald, COLORS.violet, COLORS.amber, COLORS.cyan, COLORS.rose, COLORS.indigo, COLORS.teal];

// ==========================================
// SHARED COMPONENTS
// ==========================================



const CustomTooltip = ({ active, payload, label, isCurrency }: any) => {
  const { formatAmount } = useCurrency();
  if (active && payload && payload.length) {
    return (
      <div className="border border-slate-200/80 rounded-2xl p-3.5 shadow-lg space-y-1.5 bg-white/95 backdrop-blur-md text-xs font-sans">
        <p className="font-bold text-slate-800 text-xs">{label}</p>
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || item.fill }} />
            <span className="text-slate-500 font-semibold">{item.name}:</span>
            <span className="font-bold text-slate-800">
              {isCurrency || item.name.toLowerCase().includes('spend') || item.name.toLowerCase().includes('value') || item.name.toLowerCase().includes('cost') || item.name.toLowerCase().includes('amount') || item.name.toLowerCase().includes('$')
                ? formatAmount(Number(item.value))
                : item.name.toLowerCase().includes('rate') || item.name.toLowerCase().includes('%')
                  ? `${Number(item.value).toFixed(1)}%`
                  : `${Number(item.value).toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Sparkline micro-chart for KPI cards
const Sparkline = ({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) => {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// KPI card with sparkline
const KPICard = ({ title, value, subtitle, delta, deltaLabel, sparkData, sparkColor, accentColor, icon: Icon }: {
  title: string;
  value: string;
  subtitle?: string;
  delta?: number;
  deltaLabel?: string;
  sparkData?: number[];
  sparkColor?: string;
  accentColor: string;
  icon: any;
}) => {
  const isPositive = (delta ?? 0) >= 0;
  return (
    <Card className="border-slate-200/80 bg-white shadow-sm relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-md hover:border-slate-300/80 group">
      <div className={`absolute top-0 left-0 w-full h-[2px]`} style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColor}88)` }} />
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{title}</p>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-black text-slate-800 font-sans tracking-tight">{value}</span>
              {delta !== undefined && (
                <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {isPositive ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
                </span>
              )}
            </div>
            {subtitle && <p className="text-[11px] text-slate-500 font-medium leading-snug">{subtitle}</p>}
            {deltaLabel && <p className="text-[10px] text-slate-400 font-semibold">{deltaLabel}</p>}
          </div>
          <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 text-slate-500 shrink-0 group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-4.5 h-4.5" />
          </div>
        </div>
        {sparkData && sparkData.length > 0 && (
          <div className="pt-1">
            <Sparkline data={sparkData} color={sparkColor || accentColor} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Section header
const SectionHeader = ({ icon: Icon, title, description, color }: { icon: any; title: string; description: string; color: string }) => (
  <div className="flex items-start gap-3 pb-1">
    <div className="p-2 rounded-xl border border-slate-100 bg-slate-50/80 shrink-0" style={{ color }}>
      <Icon className="w-4.5 h-4.5" />
    </div>
    <div>
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide font-sans">{title}</h3>
      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{description}</p>
    </div>
  </div>
);

// Chart card wrapper
const ChartCard = ({ title, description, icon: Icon, accentColor, height = 300, children }: {
  title: string;
  description: string;
  icon: any;
  accentColor: string;
  height?: number;
  children: React.ReactNode;
}) => (
  <Card className="border-slate-200/80 bg-white shadow-sm relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-md">
    <div className="absolute top-0 left-0 w-[3px] h-full" style={{ backgroundColor: accentColor }} />
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide font-sans">
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
        {title}
      </CardTitle>
      <CardDescription className="text-[11px] text-slate-500 font-medium">{description}</CardDescription>
    </CardHeader>
    <CardContent className="pt-2">
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </CardContent>
  </Card>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AnalyticsClient({
  materials,
  inwardShipments,
  outwardShipments,
  purchaseOrders,
  profile
}: AnalyticsClientProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('executive');
  const [timeRange, setTimeRange] = useState<string>('90');
  const { currency, toggleCurrency, convertAmount, formatAmount, formatCompact } = useCurrency();

  // ==========================================
  // TIME-FILTERED DATA
  // ==========================================

  const filteredData = useMemo(() => {
    const now = new Date();
    const thresholdDate = new Date();
    if (timeRange !== 'all') {
      thresholdDate.setDate(now.getDate() - Number(timeRange));
    }
    const isInRange = (dateStr: string) => {
      if (timeRange === 'all') return true;
      return new Date(dateStr) >= thresholdDate;
    };
    return {
      inwards: inwardShipments.filter(s => isInRange(s.received_date)),
      outwards: outwardShipments.filter(s => isInRange(s.dispatched_date)),
      pos: purchaseOrders.filter(po => isInRange(po.order_date)),
    };
  }, [timeRange, inwardShipments, outwardShipments, purchaseOrders]);

  // Previous period data for delta calculations
  const previousPeriodData = useMemo(() => {
    if (timeRange === 'all') return null;
    const days = Number(timeRange);
    const now = new Date();
    const currentStart = new Date();
    currentStart.setDate(now.getDate() - days);
    const prevStart = new Date();
    prevStart.setDate(now.getDate() - days * 2);

    const isInPrevRange = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= prevStart && d < currentStart;
    };
    return {
      inwards: inwardShipments.filter(s => isInPrevRange(s.received_date)),
      outwards: outwardShipments.filter(s => isInPrevRange(s.dispatched_date)),
      pos: purchaseOrders.filter(po => isInPrevRange(po.order_date)),
    };
  }, [timeRange, inwardShipments, outwardShipments, purchaseOrders]);

  // ==========================================
  // PRICING MAP
  // ==========================================

  const pricingMap = useMemo(() => {
    const map: Record<string, number> = {};
    inwardShipments.forEach(s => {
      (s.items || []).forEach(item => {
        if (item.sku_id && item.unit_price) {
          map[item.sku_id] = Number(item.unit_price);
        }
      });
    });
    purchaseOrders.forEach(po => {
      (po.items || []).forEach(item => {
        if (item.sku_id && item.unit_price) {
          map[item.sku_id] = Number(item.unit_price);
        }
      });
    });
    return map;
  }, [inwardShipments, purchaseOrders]);

  // ==========================================
  // EXECUTIVE KPI COMPUTATIONS
  // ==========================================

  const execKPIs = useMemo(() => {
    // Stock metrics
    let totalStockVolume = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let activeSKUs = 0;
    let totalAllocated = 0;

    materials.forEach(m => {
      (m.skus || []).forEach(s => {
        activeSKUs++;
        const qoh = Number(s.quantity_on_hand);
        const alloc = Number(s.quantity_allocated);
        totalStockVolume += qoh;
        totalAllocated += alloc;
        const price = pricingMap[s.id] || 4.50;
        totalStockValue += qoh * price;
        if (s.alert_on_low_stock && qoh <= Number(s.min_stock_level)) {
          lowStockCount++;
        }
      });
    });

    // Period volumes
    const periodReceived = filteredData.inwards.reduce((sum, s) => 
      sum + (s.items || []).reduce((iSum, item) => iSum + Number(item.quantity_received), 0), 0);
    const periodDispatched = filteredData.outwards.reduce((sum, s) => 
      sum + (s.items || []).reduce((iSum, item) => iSum + Number(item.quantity_dispatched), 0), 0);
    const netMovement = periodReceived - periodDispatched;
    const periodSpend = filteredData.pos.reduce((sum, po) => sum + Number(po.total_amount), 0);

    // Warehouse occupancy
    const warehouseCapacity = 60000;
    const occupancy = Math.min((totalStockVolume / warehouseCapacity) * 100, 100);

    // Inventory turnover (COGS proxy / avg inventory)
    const avgInventory = totalStockVolume > 0 ? totalStockVolume : 1;
    const turnoverRate = periodDispatched > 0 ? (periodDispatched / avgInventory) : 0;

    // Fill rate (dispatched shipments with all items fulfilled)
    const totalOutwardItems = filteredData.outwards.reduce((sum, s) => sum + (s.items || []).length, 0);
    const fillRate = totalOutwardItems > 0 ? 100 : 0; // All dispatched items are by definition fulfilled in this model

    // PO fulfillment
    let totalOrdered = 0;
    let totalPOReceived = 0;
    filteredData.pos.forEach(po => {
      (po.items || []).forEach(item => {
        totalOrdered += Number(item.quantity_ordered);
        totalPOReceived += Number(item.quantity_received);
      });
    });
    const poFulfillmentRate = totalOrdered > 0 ? (totalPOReceived / totalOrdered) * 100 : 0;

    // Previous period deltas
    let prevSpend = 0;
    let prevReceived = 0;
    let prevDispatched = 0;
    if (previousPeriodData) {
      prevSpend = previousPeriodData.pos.reduce((sum, po) => sum + Number(po.total_amount), 0);
      prevReceived = previousPeriodData.inwards.reduce((sum, s) => 
        sum + (s.items || []).reduce((iSum, item) => iSum + Number(item.quantity_received), 0), 0);
      prevDispatched = previousPeriodData.outwards.reduce((sum, s) => 
        sum + (s.items || []).reduce((iSum, item) => iSum + Number(item.quantity_dispatched), 0), 0);
    }

    const spendDelta = prevSpend > 0 ? ((periodSpend - prevSpend) / prevSpend) * 100 : undefined;
    const receivedDelta = prevReceived > 0 ? ((periodReceived - prevReceived) / prevReceived) * 100 : undefined;
    const dispatchedDelta = prevDispatched > 0 ? ((periodDispatched - prevDispatched) / prevDispatched) * 100 : undefined;

    return {
      totalStockVolume, totalStockValue, lowStockCount, activeSKUs, totalAllocated,
      periodReceived, periodDispatched, netMovement, periodSpend,
      warehouseCapacity, occupancy, turnoverRate, fillRate, poFulfillmentRate,
      spendDelta, receivedDelta, dispatchedDelta,
    };
  }, [materials, filteredData, previousPeriodData, pricingMap]);

  // ==========================================
  // MONTHLY SPARKLINE DATA GENERATORS
  // ==========================================

  const monthlySparklines = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const months: Record<string, { received: number; dispatched: number; spend: number }> = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      months[key] = { received: 0, dispatched: 0, spend: 0 };
    }

    inwardShipments.forEach(s => {
      const d = new Date(s.received_date);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (months[key] !== undefined) {
        months[key].received += (s.items || []).reduce((sum, i) => sum + Number(i.quantity_received), 0);
      }
    });

    outwardShipments.forEach(s => {
      const d = new Date(s.dispatched_date);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (months[key] !== undefined) {
        months[key].dispatched += (s.items || []).reduce((sum, i) => sum + Number(i.quantity_dispatched), 0);
      }
    });

    purchaseOrders.forEach(po => {
      const d = new Date(po.order_date);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (months[key] !== undefined) {
        months[key].spend += Number(po.total_amount);
      }
    });

    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
    return {
      received: sorted.map(([, v]) => v.received),
      dispatched: sorted.map(([, v]) => v.dispatched),
      spend: sorted.map(([, v]) => v.spend),
      net: sorted.map(([, v]) => v.received - v.dispatched),
    };
  }, [inwardShipments, outwardShipments, purchaseOrders]);

  // ==========================================
  // CHART DATA: Executive — Inventory & Movement Timeline (ComposedChart)
  // ==========================================

  const movementTimelineData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData: Record<string, { month: string; sortKey: string; Inbound: number; Outbound: number; 'Net Movement': number; 'Inventory Value ($)': number }> = {};

    filteredData.inwards.forEach(s => {
      const d = new Date(s.received_date);
      const label = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
      const sk = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthlyData[sk]) monthlyData[sk] = { month: label, sortKey: sk, Inbound: 0, Outbound: 0, 'Net Movement': 0, 'Inventory Value ($)': 0 };
      monthlyData[sk].Inbound += (s.items || []).reduce((sum, i) => sum + Number(i.quantity_received), 0);
    });

    filteredData.outwards.forEach(s => {
      const d = new Date(s.dispatched_date);
      const label = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
      const sk = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthlyData[sk]) monthlyData[sk] = { month: label, sortKey: sk, Inbound: 0, Outbound: 0, 'Net Movement': 0, 'Inventory Value ($)': 0 };
      monthlyData[sk].Outbound += (s.items || []).reduce((sum, i) => sum + Number(i.quantity_dispatched), 0);
    });

    // Compute net & estimated value
    Object.values(monthlyData).forEach(m => {
      m['Net Movement'] = m.Inbound - m.Outbound;
      m['Inventory Value ($)'] = m.Inbound * 8.5; // rough avg cost per unit
    });

    return Object.values(monthlyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredData]);

  // ==========================================
  // CHART DATA: Executive — Category Treemap
  // ==========================================

  const categoryTreemapData = useMemo(() => {
    const cats: Record<string, { name: string; value: number; color: string }> = {};
    const catLabels: Record<string, string> = {
      fabric: 'Fabric', yarn: 'Yarn', accessory: 'Accessories',
      packaging: 'Packaging', finished_garment: 'Finished Goods'
    };

    materials.forEach(m => {
      const cat = m.category || 'fabric';
      if (!cats[cat]) cats[cat] = { name: catLabels[cat] || cat, value: 0, color: CATEGORY_COLORS[cat] || COLORS.slate };
      (m.skus || []).forEach(s => {
        const qoh = Number(s.quantity_on_hand);
        const price = pricingMap[s.id] || 4.50;
        cats[cat].value += qoh * price;
      });
    });

    return Object.values(cats).filter(c => c.value > 0);
  }, [materials, pricingMap]);

  // ==========================================
  // CHART DATA: Inventory — ABC Pareto
  // ==========================================

  const abcParetoData = useMemo(() => {
    const skuValues: { name: string; value: number; category: string }[] = [];

    materials.forEach(m => {
      (m.skus || []).forEach(s => {
        const qoh = Number(s.quantity_on_hand);
        const price = pricingMap[s.id] || 4.50;
        const val = qoh * price;
        if (val > 0) {
          skuValues.push({
            name: s.sku_code,
            value: val,
            category: m.category,
          });
        }
      });
    });

    // Sort descending by value
    skuValues.sort((a, b) => b.value - a.value);

    // Limit to top 20 for readability
    const top = skuValues.slice(0, 20);
    const totalValue = skuValues.reduce((sum, s) => sum + s.value, 0);

    let cumulative = 0;
    return top.map(s => {
      cumulative += s.value;
      return {
        ...s,
        'Cumulative %': totalValue > 0 ? (cumulative / totalValue) * 100 : 0,
        'SKU Value ($)': s.value,
      };
    });
  }, [materials, pricingMap]);

  // ==========================================
  // CHART DATA: Inventory — Stock Aging
  // ==========================================

  const stockAgingData = useMemo(() => {
    const now = new Date();
    const categories: Record<string, { name: string; '0-30 Days': number; '31-60 Days': number; '61-90 Days': number; '90+ Days': number }> = {};
    const catLabels: Record<string, string> = {
      fabric: 'Fabric', yarn: 'Yarn', accessory: 'Accessories',
      packaging: 'Packaging', finished_garment: 'Finished Goods'
    };

    // Build last receipt date per SKU from inward items
    const lastReceiptPerSKU: Record<string, Date> = {};
    inwardShipments.forEach(s => {
      const rDate = new Date(s.received_date);
      (s.items || []).forEach(item => {
        if (!lastReceiptPerSKU[item.sku_id] || rDate > lastReceiptPerSKU[item.sku_id]) {
          lastReceiptPerSKU[item.sku_id] = rDate;
        }
      });
    });

    materials.forEach(m => {
      const cat = m.category || 'fabric';
      const label = catLabels[cat] || cat;
      if (!categories[cat]) categories[cat] = { name: label, '0-30 Days': 0, '31-60 Days': 0, '61-90 Days': 0, '90+ Days': 0 };

      (m.skus || []).forEach(s => {
        const qoh = Number(s.quantity_on_hand);
        if (qoh <= 0) return;

        const lastReceipt = lastReceiptPerSKU[s.id] || new Date(s.created_at);
        const ageDays = Math.floor((now.getTime() - lastReceipt.getTime()) / (1000 * 60 * 60 * 24));

        if (ageDays <= 30) categories[cat]['0-30 Days'] += qoh;
        else if (ageDays <= 60) categories[cat]['31-60 Days'] += qoh;
        else if (ageDays <= 90) categories[cat]['61-90 Days'] += qoh;
        else categories[cat]['90+ Days'] += qoh;
      });
    });

    return Object.values(categories);
  }, [materials, inwardShipments]);

  // ==========================================
  // CHART DATA: Inventory — Reorder Proximity
  // ==========================================

  const reorderProximityData = useMemo(() => {
    const items: { name: string; 'Current Stock': number; 'Min Level': number; ratio: number; critical: boolean }[] = [];

    materials.forEach(m => {
      (m.skus || []).forEach(s => {
        if (!s.alert_on_low_stock) return;
        const qoh = Number(s.quantity_on_hand);
        const min = Number(s.min_stock_level);
        if (min <= 0) return;
        items.push({
          name: s.sku_code,
          'Current Stock': qoh,
          'Min Level': min,
          ratio: qoh / min,
          critical: qoh <= min,
        });
      });
    });

    // Sort by ratio ascending (most critical first), take top 12
    items.sort((a, b) => a.ratio - b.ratio);
    return items.slice(0, 12);
  }, [materials]);

  // ==========================================
  // CHART DATA: Inventory — Allocated vs Available
  // ==========================================

  const allocatedVsAvailableData = useMemo(() => {
    const catLabels: Record<string, string> = {
      fabric: 'Fabric', yarn: 'Yarn', accessory: 'Accessories',
      packaging: 'Packaging', finished_garment: 'Finished Goods'
    };
    const cats: Record<string, { name: string; Allocated: number; Available: number }> = {};

    materials.forEach(m => {
      const cat = m.category || 'fabric';
      if (!cats[cat]) cats[cat] = { name: catLabels[cat] || cat, Allocated: 0, Available: 0 };
      (m.skus || []).forEach(s => {
        const qoh = Number(s.quantity_on_hand);
        const alloc = Number(s.quantity_allocated);
        cats[cat].Allocated += alloc;
        cats[cat].Available += Math.max(0, qoh - alloc);
      });
    });

    return Object.values(cats);
  }, [materials]);

  // ==========================================
  // CHART DATA: Procurement — Spend Trend
  // ==========================================

  const spendTrendData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly: Record<string, { month: string; sortKey: string; 'PO Spend ($)': number; count: number }> = {};

    filteredData.pos.forEach(po => {
      const d = new Date(po.order_date);
      const label = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
      const sk = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthly[sk]) monthly[sk] = { month: label, sortKey: sk, 'PO Spend ($)': 0, count: 0 };
      monthly[sk]['PO Spend ($)'] += Number(po.total_amount);
      monthly[sk].count++;
    });

    const sorted = Object.values(monthly).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // 3-month moving average
    return sorted.map((item, idx) => {
      const window = sorted.slice(Math.max(0, idx - 2), idx + 1);
      const avg = window.reduce((sum, w) => sum + w['PO Spend ($)'], 0) / window.length;
      return { ...item, 'Moving Avg ($)': avg };
    });
  }, [filteredData]);

  // ==========================================
  // CHART DATA: Procurement — Supplier Concentration
  // ==========================================

  const supplierConcentrationData = useMemo(() => {
    const supplierSpend: Record<string, number> = {};

    filteredData.pos.forEach(po => {
      const name = po.supplier_name.trim();
      supplierSpend[name] = (supplierSpend[name] || 0) + Number(po.total_amount);
    });

    // Also include inward shipment suppliers for count
    const supplierSet = new Set<string>();
    inwardShipments.forEach(s => supplierSet.add(s.supplier_name.trim().toLowerCase()));
    purchaseOrders.forEach(po => supplierSet.add(po.supplier_name.trim().toLowerCase()));

    const result = Object.entries(supplierSpend)
      .map(([name, spend]) => ({ name, value: spend }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { chartData: result, totalSuppliers: supplierSet.size };
  }, [filteredData, inwardShipments, purchaseOrders]);

  // ==========================================
  // CHART DATA: Procurement — Supplier Quality Scorecard
  // ==========================================

  const supplierQualityData = useMemo(() => {
    const suppliers: Record<string, { name: string; Passed: number; Quarantine: number; Failed: number }> = {};

    filteredData.inwards.forEach(s => {
      const name = s.supplier_name.trim();
      if (!suppliers[name]) suppliers[name] = { name, Passed: 0, Quarantine: 0, Failed: 0 };
      (s.items || []).forEach(item => {
        const qty = Number(item.quantity_received);
        const status = item.quality_status || 'passed';
        if (status === 'passed') suppliers[name].Passed += qty;
        else if (status === 'quarantine') suppliers[name].Quarantine += qty;
        else if (status === 'failed') suppliers[name].Failed += qty;
      });
    });

    return Object.values(suppliers)
      .sort((a, b) => (b.Passed + b.Quarantine + b.Failed) - (a.Passed + a.Quarantine + a.Failed))
      .slice(0, 8);
  }, [filteredData]);

  // ==========================================
  // CHART DATA: Procurement — PO Fulfillment Rate
  // ==========================================

  const poFulfillmentData = useMemo(() => {
    return filteredData.pos
      .filter(po => (po.items || []).length > 0)
      .map(po => {
        const totalOrdered = (po.items || []).reduce((sum, i) => sum + Number(i.quantity_ordered), 0);
        const totalReceived = (po.items || []).reduce((sum, i) => sum + Number(i.quantity_received), 0);
        const rate = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
        return {
          name: po.po_code,
          'Fulfillment Rate (%)': Math.min(rate, 100),
          supplier: po.supplier_name,
          status: po.status,
        };
      })
      .slice(0, 15);
  }, [filteredData]);

  // ==========================================
  // CHART DATA: Warehouse — Inflow/Outflow
  // ==========================================

  const warehouseFlowData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly: Record<string, { month: string; sortKey: string; Received: number; Dispatched: number; 'Net Change': number }> = {};

    filteredData.inwards.forEach(s => {
      const d = new Date(s.received_date);
      const label = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
      const sk = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthly[sk]) monthly[sk] = { month: label, sortKey: sk, Received: 0, Dispatched: 0, 'Net Change': 0 };
      monthly[sk].Received += (s.items || []).reduce((sum, i) => sum + Number(i.quantity_received), 0);
    });

    filteredData.outwards.forEach(s => {
      const d = new Date(s.dispatched_date);
      const label = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
      const sk = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthly[sk]) monthly[sk] = { month: label, sortKey: sk, Received: 0, Dispatched: 0, 'Net Change': 0 };
      monthly[sk].Dispatched += (s.items || []).reduce((sum, i) => sum + Number(i.quantity_dispatched), 0);
    });

    Object.values(monthly).forEach(m => {
      m['Net Change'] = m.Received - m.Dispatched;
    });

    return Object.values(monthly).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredData]);

  // ==========================================
  // CHART DATA: Warehouse — Throughput
  // ==========================================

  const throughputData = useMemo(() => {
    const weeklyData: Record<string, { week: string; sortKey: string; 'Receiving Volume': number; 'Dispatch Volume': number }> = {};

    const getWeekKey = (date: Date) => {
      const year = date.getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + startOfYear.getDay() + 1) / 7);
      return { key: `${year}-W${weekNum.toString().padStart(2, '0')}`, label: `W${weekNum}` };
    };

    filteredData.inwards.forEach(s => {
      const d = new Date(s.received_date);
      const { key, label } = getWeekKey(d);
      if (!weeklyData[key]) weeklyData[key] = { week: label, sortKey: key, 'Receiving Volume': 0, 'Dispatch Volume': 0 };
      weeklyData[key]['Receiving Volume'] += (s.items || []).reduce((sum, i) => sum + Number(i.quantity_received), 0);
    });

    filteredData.outwards.forEach(s => {
      const d = new Date(s.dispatched_date);
      const { key, label } = getWeekKey(d);
      if (!weeklyData[key]) weeklyData[key] = { week: label, sortKey: key, 'Receiving Volume': 0, 'Dispatch Volume': 0 };
      weeklyData[key]['Dispatch Volume'] += (s.items || []).reduce((sum, i) => sum + Number(i.quantity_dispatched), 0);
    });

    return Object.values(weeklyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-12);
  }, [filteredData]);

  // ==========================================
  // CHART DATA: Warehouse — Space Utilization (RadialBar)
  // ==========================================

  const spaceUtilData = useMemo(() => {
    return [{ name: 'Occupancy', value: execKPIs.occupancy, fill: execKPIs.occupancy > 85 ? COLORS.danger : execKPIs.occupancy > 70 ? COLORS.warning : COLORS.success }];
  }, [execKPIs.occupancy]);

  // ==========================================
  // CHART DATA: Warehouse — Receiving Efficiency
  // ==========================================

  const receivingEfficiencyData = useMemo(() => {
    const results: { name: string; 'Lead Time (Days)': number; supplier: string }[] = [];

    purchaseOrders.forEach(po => {
      if (!po.delivery_date || po.status === 'draft' || po.status === 'cancelled') return;
      const orderDate = new Date(po.order_date);
      const deliveryDate = new Date(po.delivery_date);
      const leadDays = Math.max(0, Math.floor((deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)));
      results.push({
        name: po.po_code,
        'Lead Time (Days)': leadDays,
        supplier: po.supplier_name,
      });
    });

    return results.slice(0, 15);
  }, [purchaseOrders]);

  // ==========================================
  // CHART DATA: Quality — Pass Rate Trend
  // ==========================================

  const qualityTrendData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly: Record<string, { month: string; sortKey: string; total: number; passed: number }> = {};

    filteredData.inwards.forEach(s => {
      const d = new Date(s.received_date);
      const label = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
      const sk = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthly[sk]) monthly[sk] = { month: label, sortKey: sk, total: 0, passed: 0 };
      (s.items || []).forEach(item => {
        const qty = Number(item.quantity_received);
        monthly[sk].total += qty;
        if (item.quality_status === 'passed') monthly[sk].passed += qty;
      });
    });

    return Object.values(monthly)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(m => ({
        month: m.month,
        'QC Pass Rate (%)': m.total > 0 ? (m.passed / m.total) * 100 : 100,
      }));
  }, [filteredData]);

  // ==========================================
  // CHART DATA: Quality — By Category
  // ==========================================

  const qualityByCategoryData = useMemo(() => {
    const catLabels: Record<string, string> = {
      fabric: 'Fabric', yarn: 'Yarn', accessory: 'Accessories',
      packaging: 'Packaging', finished_garment: 'Finished'
    };
    const cats: Record<string, { name: string; Passed: number; Quarantine: number; Failed: number }> = {};

    filteredData.inwards.forEach(s => {
      (s.items || []).forEach(item => {
        const cat = (item as any).material?.category || (item as any).sku?.material?.category || 'fabric';
        const label = catLabels[cat] || cat;
        if (!cats[cat]) cats[cat] = { name: label, Passed: 0, Quarantine: 0, Failed: 0 };
        const qty = Number(item.quantity_received);
        const status = item.quality_status || 'passed';
        if (status === 'passed') cats[cat].Passed += qty;
        else if (status === 'quarantine') cats[cat].Quarantine += qty;
        else cats[cat].Failed += qty;
      });
    });

    return Object.values(cats);
  }, [filteredData]);

  // ==========================================
  // CHART DATA: Quality — Quarantine Volume Trend
  // ==========================================

  const quarantineTrendData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly: Record<string, { month: string; sortKey: string; Quarantined: number; Rejected: number }> = {};

    filteredData.inwards.forEach(s => {
      const d = new Date(s.received_date);
      const label = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
      const sk = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthly[sk]) monthly[sk] = { month: label, sortKey: sk, Quarantined: 0, Rejected: 0 };
      (s.items || []).forEach(item => {
        const qty = Number(item.quantity_received);
        if (item.quality_status === 'quarantine') monthly[sk].Quarantined += qty;
        else if (item.quality_status === 'failed') monthly[sk].Rejected += qty;
      });
    });

    return Object.values(monthly).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredData]);

  // ==========================================
  // TAB DEFINITIONS
  // ==========================================

  const tabs: { key: AnalyticsTab; label: string; icon: any }[] = [
    { key: 'executive', label: 'Executive Overview', icon: BarChart3 },
    { key: 'inventory', label: 'Inventory Intelligence', icon: Boxes },
    { key: 'procurement', label: 'Procurement Analytics', icon: DollarSign },
    { key: 'warehouse', label: 'Warehouse Operations', icon: Warehouse },
    { key: 'quality', label: 'Quality Assurance', icon: ShieldCheck },
  ];

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 font-sans tracking-tight">Analytics Command Center</h2>
            <p className="text-xs text-slate-500 font-medium">Enterprise-grade insights across inventory, procurement, warehouse operations, and quality assurance.</p>
          </div>
        </div>

        {/* Time-Range Filter */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-2xl shadow-sm self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 mr-1 uppercase">Period:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs font-extrabold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer pr-1"
          >
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days (Quarterly)</option>
            <option value="180">Last 180 Days (Half-Year)</option>
            <option value="all">All-Time Historical</option>
          </select>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex flex-wrap gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-sm">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer border ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* ====================================================== */}
      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {/* ====================================================== */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          {/* KPI Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Inventory Value"
              value={formatAmount(execKPIs.totalStockValue, { maximumFractionDigits: 0 })}
              subtitle={`${execKPIs.totalStockVolume.toLocaleString()} units on hand`}
              accentColor={COLORS.primary}
              icon={DollarSign}
              sparkData={monthlySparklines.received}
              sparkColor={COLORS.primary}
            />
            <KPICard
              title="Inventory Turnover"
              value={execKPIs.turnoverRate.toFixed(2)}
              subtitle="Stock rotation ratio this period"
              delta={execKPIs.dispatchedDelta}
              deltaLabel="vs prior period"
              accentColor={COLORS.violet}
              icon={TrendingUp}
              sparkData={monthlySparklines.dispatched}
              sparkColor={COLORS.violet}
            />
            <KPICard
              title="Net Stock Movement"
              value={`${execKPIs.netMovement >= 0 ? '+' : ''}${execKPIs.netMovement.toLocaleString()}`}
              subtitle={`↓ ${execKPIs.periodReceived.toLocaleString()} received · ↑ ${execKPIs.periodDispatched.toLocaleString()} dispatched`}
              accentColor={execKPIs.netMovement >= 0 ? COLORS.emerald : COLORS.rose}
              icon={Activity}
              sparkData={monthlySparklines.net}
              sparkColor={execKPIs.netMovement >= 0 ? COLORS.emerald : COLORS.rose}
            />
            <KPICard
              title="Warehouse Occupancy"
              value={`${execKPIs.occupancy.toFixed(1)}%`}
              subtitle={`${execKPIs.totalStockVolume.toLocaleString()} of ${execKPIs.warehouseCapacity.toLocaleString()} capacity`}
              accentColor={execKPIs.occupancy > 85 ? COLORS.danger : execKPIs.occupancy > 70 ? COLORS.warning : COLORS.cyan}
              icon={Warehouse}
            />
          </div>

          {/* KPI Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Active SKU Lines"
              value={execKPIs.activeSKUs.toLocaleString()}
              subtitle={`${materials.length} parent materials cataloged`}
              accentColor={COLORS.indigo}
              icon={Package}
            />
            <KPICard
              title="Low Stock Alerts"
              value={execKPIs.lowStockCount.toString()}
              subtitle={execKPIs.lowStockCount > 0 ? 'Items below safety threshold' : 'All stock levels healthy'}
              accentColor={execKPIs.lowStockCount > 0 ? COLORS.danger : COLORS.emerald}
              icon={execKPIs.lowStockCount > 0 ? AlertTriangle : ShieldCheck}
            />
            <KPICard
              title="Procurement Spend"
              value={formatAmount(execKPIs.periodSpend, { maximumFractionDigits: 0 })}
              subtitle={`${filteredData.pos.length} purchase orders in period`}
              delta={execKPIs.spendDelta}
              deltaLabel="vs prior period"
              accentColor={COLORS.emerald}
              icon={Truck}
              sparkData={monthlySparklines.spend}
              sparkColor={COLORS.emerald}
            />
            <KPICard
              title="PO Fulfillment Rate"
              value={`${execKPIs.poFulfillmentRate.toFixed(1)}%`}
              subtitle="Ordered vs received quantity"
              accentColor={execKPIs.poFulfillmentRate >= 90 ? COLORS.emerald : execKPIs.poFulfillmentRate >= 70 ? COLORS.warning : COLORS.danger}
              icon={Target}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Movement Timeline (ComposedChart) — 2 cols */}
            <div className="lg:col-span-2">
              <ChartCard
                title="Inventory Movement Timeline"
                description="Monthly inbound vs outbound volume with net movement delta overlay."
                icon={TrendingUp}
                accentColor={COLORS.primary}
                height={320}
              >
                {movementTimelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={movementTimelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradInbound" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="gradOutbound" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.violet} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={COLORS.violet} stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                      <XAxis dataKey="month" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={4} />
                      <YAxis stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Inbound" stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#gradInbound)" name="Inbound Received" />
                      <Area type="monotone" dataKey="Outbound" stroke={COLORS.violet} strokeWidth={2} fillOpacity={1} fill="url(#gradOutbound)" name="Outbound Dispatched" />
                      <Bar dataKey="Net Movement" fill={COLORS.emerald} radius={[4, 4, 0, 0]} barSize={14} opacity={0.7} name="Net Movement" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="No shipment data available for the selected period." />
                )}
              </ChartCard>
            </div>

            {/* Category Value Breakdown */}
            <ChartCard
              title="Stock Value by Category"
              description="Proportional inventory value distribution across material categories."
              icon={PieIcon}
              accentColor={COLORS.violet}
              height={320}
            >
              {categoryTreemapData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryTreemapData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {categoryTreemapData.map((entry, index) => (
                        <Cell key={`cat-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip isCurrency={true} />} />
                    <Legend
                      wrapperStyle={{ fontSize: '10px', fontWeight: 700 }}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No stock value data to display." />
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* TAB 2: INVENTORY INTELLIGENCE */}
      {/* ====================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Boxes}
            title="Inventory Intelligence"
            description="Deep analysis of stock composition, aging profiles, reorder proximity, and allocation patterns."
            color={COLORS.indigo}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ABC Pareto Analysis */}
            <ChartCard
              title="ABC Pareto Analysis — Top 20 SKUs"
              description="SKU value contribution with cumulative percentage line. A-class (0–80%), B-class (80–95%), C-class (95–100%)."
              icon={BarChart3}
              accentColor={COLORS.primary}
              height={320}
            >
              {abcParetoData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={abcParetoData} margin={{ top: 10, right: 40, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(0,0,0,0.3)" fontSize={8} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                    <YAxis yAxisId="left" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompact} />
                    <YAxis yAxisId="right" orientation="right" stroke="rgba(0,0,0,0.2)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip content={<CustomTooltip isCurrency={true} />} />
                    <ReferenceLine yAxisId="right" y={80} stroke={COLORS.warning} strokeDasharray="4 4" label={{ value: 'A-Class 80%', position: 'right', fontSize: 9, fill: COLORS.warning }} />
                    <ReferenceLine yAxisId="right" y={95} stroke={COLORS.danger} strokeDasharray="4 4" label={{ value: 'B-Class 95%', position: 'right', fontSize: 9, fill: COLORS.danger }} />
                    <Bar yAxisId="left" dataKey="SKU Value ($)" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={16} opacity={0.85} name="SKU Value ($)" />
                    <Line yAxisId="right" type="monotone" dataKey="Cumulative %" stroke={COLORS.rose} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.rose }} name="Cumulative %" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No SKU valuation data available." />
              )}
            </ChartCard>

            {/* Stock Aging Analysis */}
            <ChartCard
              title="Stock Aging Analysis"
              description="Material quantities segmented by age since last receipt — 0–30, 31–60, 61–90, and 90+ day brackets."
              icon={Clock}
              accentColor={COLORS.amber}
              height={320}
            >
              {stockAgingData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockAgingData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="rgba(0,0,0,0.4)" fontSize={10} tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="0-30 Days" stackId="a" fill={COLORS.emerald} radius={[0, 0, 0, 0]} barSize={18} name="0-30 Days" />
                    <Bar dataKey="31-60 Days" stackId="a" fill={COLORS.cyan} name="31-60 Days" />
                    <Bar dataKey="61-90 Days" stackId="a" fill={COLORS.warning} name="61-90 Days" />
                    <Bar dataKey="90+ Days" stackId="a" fill={COLORS.danger} radius={[0, 4, 4, 0]} name="90+ Days" />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} iconType="circle" iconSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No aging data available." />
              )}
            </ChartCard>

            {/* Reorder Proximity */}
            <ChartCard
              title="Reorder Point Proximity"
              description="SKUs closest to their minimum stock safety threshold. Red indicates items already at or below reorder level."
              icon={AlertTriangle}
              accentColor={COLORS.danger}
              height={340}
            >
              {reorderProximityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reorderProximityData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="rgba(0,0,0,0.4)" fontSize={8} tickLine={false} axisLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Current Stock" barSize={14} radius={[0, 6, 6, 0]} name="Current Stock">
                      {reorderProximityData.map((entry, index) => (
                        <Cell key={`reorder-${index}`} fill={entry.critical ? COLORS.danger : COLORS.primary} opacity={entry.critical ? 1 : 0.75} />
                      ))}
                    </Bar>
                    <Bar dataKey="Min Level" barSize={14} fill="transparent" stroke={COLORS.slate} strokeWidth={1} strokeDasharray="4 4" name="Safety Min Level" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No reorder proximity data to display." />
              )}
            </ChartCard>

            {/* Allocated vs Available */}
            <ChartCard
              title="Allocated vs Available Stock"
              description="Breakdown of committed (allocated) versus freely available inventory by material category."
              icon={Layers}
              accentColor={COLORS.teal}
              height={340}
            >
              {allocatedVsAvailableData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allocatedVsAvailableData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={4} />
                    <YAxis stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Allocated" stackId="a" fill={COLORS.amber} radius={[0, 0, 0, 0]} barSize={24} name="Allocated" />
                    <Bar dataKey="Available" stackId="a" fill={COLORS.emerald} radius={[6, 6, 0, 0]} name="Available" />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} iconType="circle" iconSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No allocation data available." />
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* TAB 3: PROCUREMENT ANALYTICS */}
      {/* ====================================================== */}
      {activeTab === 'procurement' && (
        <div className="space-y-6">
          <SectionHeader
            icon={DollarSign}
            title="Procurement Analytics"
            description="Supplier spend patterns, concentration risk assessment, quality scores, and PO fulfillment tracking."
            color={COLORS.emerald}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spend Trend */}
            <ChartCard
              title="Procurement Spend Trend"
              description="Monthly purchase order expenditure with a 3-month moving average overlay for trend detection."
              icon={TrendingUp}
              accentColor={COLORS.emerald}
              height={300}
            >
              {spendTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={spendTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={4} />
                    <YAxis stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompact} />
                    <Tooltip content={<CustomTooltip isCurrency={true} />} />
                    <Area type="monotone" dataKey="PO Spend ($)" stroke={COLORS.emerald} strokeWidth={2} fillOpacity={1} fill="url(#gradSpend)" name="PO Spend ($)" />
                    <Line type="monotone" dataKey="Moving Avg ($)" stroke={COLORS.amber} strokeWidth={2} strokeDasharray="5 5" dot={false} name="Moving Avg ($)" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No procurement spend data in this period." />
              )}
            </ChartCard>

            {/* Supplier Concentration */}
            <ChartCard
              title="Supplier Concentration Risk"
              description={`Spend distribution across ${supplierConcentrationData.totalSuppliers} supplier partners. High concentration on few suppliers = risk.`}
              icon={PieIcon}
              accentColor={COLORS.violet}
              height={300}
            >
              {supplierConcentrationData.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={supplierConcentrationData.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {supplierConcentrationData.chartData.map((_, index) => (
                        <Cell key={`sup-${index}`} fill={PIE_PALETTE[index % PIE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip isCurrency={true} />} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No supplier spend data." />
              )}
            </ChartCard>

            {/* Supplier Quality Scorecard */}
            <ChartCard
              title="Supplier Quality Scorecard"
              description="QC inspection outcomes by supplier — passed, quarantined, and rejected volumes."
              icon={ShieldAlert}
              accentColor={COLORS.amber}
              height={300}
            >
              {supplierQualityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierQualityData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="rgba(0,0,0,0.4)" fontSize={9} tickLine={false} axisLine={false} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Passed" stackId="a" fill={COLORS.emerald} barSize={16} name="Passed" />
                    <Bar dataKey="Quarantine" stackId="a" fill={COLORS.warning} name="Quarantine" />
                    <Bar dataKey="Failed" stackId="a" fill={COLORS.danger} radius={[0, 4, 4, 0]} name="Failed" />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} iconType="circle" iconSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No supplier quality data." />
              )}
            </ChartCard>

            {/* PO Fulfillment Rate */}
            <ChartCard
              title="PO Fulfillment Rate"
              description="Received quantity vs ordered quantity ratio per purchase order. Green ≥90%, amber 70–90%, red <70%."
              icon={Target}
              accentColor={COLORS.primary}
              height={300}
            >
              {poFulfillmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={poFulfillmentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(0,0,0,0.3)" fontSize={8} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 110]} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={100} stroke={COLORS.emerald} strokeDasharray="4 4" label={{ value: '100%', position: 'right', fontSize: 9, fill: COLORS.emerald }} />
                    <Bar dataKey="Fulfillment Rate (%)" barSize={16} radius={[6, 6, 0, 0]} name="Fulfillment Rate (%)">
                      {poFulfillmentData.map((entry, index) => (
                        <Cell
                          key={`ful-${index}`}
                          fill={entry['Fulfillment Rate (%)'] >= 90 ? COLORS.emerald : entry['Fulfillment Rate (%)'] >= 70 ? COLORS.warning : COLORS.danger}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No PO fulfillment data." />
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* TAB 4: WAREHOUSE OPERATIONS */}
      {/* ====================================================== */}
      {activeTab === 'warehouse' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Warehouse}
            title="Warehouse Operations"
            description="Physical flow analysis, throughput velocity, space utilization, and receiving efficiency metrics."
            color={COLORS.cyan}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inflow/Outflow Waterfall — 2 cols */}
            <div className="lg:col-span-2">
              <ChartCard
                title="Inflow vs Outflow Waterfall"
                description="Monthly goods received vs dispatched with net change delta. Positive = inventory growth, negative = drawdown."
                icon={Activity}
                accentColor={COLORS.primary}
                height={300}
              >
                {warehouseFlowData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={warehouseFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                      <XAxis dataKey="month" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={4} />
                      <YAxis stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Received" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={16} opacity={0.8} name="Received" />
                      <Bar dataKey="Dispatched" fill={COLORS.violet} radius={[4, 4, 0, 0]} barSize={16} opacity={0.8} name="Dispatched" />
                      <Line type="monotone" dataKey="Net Change" stroke={COLORS.emerald} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.emerald }} name="Net Change" />
                      <ReferenceLine y={0} stroke={COLORS.slate} strokeDasharray="3 3" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="No warehouse flow data for this period." />
                )}
              </ChartCard>
            </div>

            {/* Space Utilization Gauge */}
            <ChartCard
              title="Space Utilization Gauge"
              description="Current warehouse occupancy as percentage of total capacity."
              icon={Gauge}
              accentColor={COLORS.cyan}
              height={300}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="85%"
                    barSize={18}
                    data={spaceUtilData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#f1f5f9' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-center -mt-16 space-y-1">
                  <span className="text-3xl font-black text-slate-800 font-sans">{execKPIs.occupancy.toFixed(1)}%</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Occupied</p>
                </div>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Throughput Velocity */}
            <ChartCard
              title="Weekly Throughput Velocity"
              description="Weekly receiving and dispatch volume showing operational throughput cadence."
              icon={Zap}
              accentColor={COLORS.violet}
              height={280}
            >
              {throughputData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={throughputData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradReceiving" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="gradDispatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.violet} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={COLORS.violet} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="week" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={4} />
                    <YAxis stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Receiving Volume" stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#gradReceiving)" name="Receiving Volume" />
                    <Area type="monotone" dataKey="Dispatch Volume" stroke={COLORS.violet} strokeWidth={2} fillOpacity={1} fill="url(#gradDispatch)" name="Dispatch Volume" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No throughput data available." />
              )}
            </ChartCard>

            {/* Receiving Efficiency */}
            <ChartCard
              title="PO Receiving Lead Time"
              description="Days between purchase order date and estimated delivery date for each PO."
              icon={Clock}
              accentColor={COLORS.amber}
              height={280}
            >
              {receivingEfficiencyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={receivingEfficiencyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(0,0,0,0.3)" fontSize={8} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Lead Time (Days)" fill={COLORS.amber} radius={[6, 6, 0, 0]} barSize={14} name="Lead Time (Days)">
                      {receivingEfficiencyData.map((entry, index) => (
                        <Cell key={`lead-${index}`} fill={entry['Lead Time (Days)'] > 30 ? COLORS.danger : entry['Lead Time (Days)'] > 14 ? COLORS.warning : COLORS.emerald} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No lead time data available." />
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* TAB 5: QUALITY ASSURANCE */}
      {/* ====================================================== */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <SectionHeader
            icon={ShieldCheck}
            title="Quality Assurance"
            description="QC pass rate trends, inspection outcomes by category, quarantine volumes, and supplier quality performance."
            color={COLORS.emerald}
          />

          {/* QA Summary KPIs */}
          {(() => {
            let totalQCUnits = 0;
            let passedQCUnits = 0;
            let quarantineUnits = 0;
            let failedUnits = 0;
            filteredData.inwards.forEach(s => {
              (s.items || []).forEach(item => {
                const qty = Number(item.quantity_received);
                totalQCUnits += qty;
                if (item.quality_status === 'passed') passedQCUnits += qty;
                else if (item.quality_status === 'quarantine') quarantineUnits += qty;
                else failedUnits += qty;
              });
            });
            const passRate = totalQCUnits > 0 ? (passedQCUnits / totalQCUnits) * 100 : 100;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="QC Pass Rate" value={`${passRate.toFixed(1)}%`} subtitle={`${passedQCUnits.toLocaleString()} of ${totalQCUnits.toLocaleString()} units passed`} accentColor={COLORS.emerald} icon={CheckCircle2} />
                <KPICard title="Quarantined Volume" value={quarantineUnits.toLocaleString()} subtitle="Units held for further inspection" accentColor={COLORS.warning} icon={ShieldAlert} />
                <KPICard title="Rejected Volume" value={failedUnits.toLocaleString()} subtitle="Units failed quality inspection" accentColor={COLORS.danger} icon={XCircle} />
                <KPICard title="Total Inspected" value={totalQCUnits.toLocaleString()} subtitle={`Across ${filteredData.inwards.length} inbound shipments`} accentColor={COLORS.primary} icon={Package} />
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QA Pass Rate Trend */}
            <ChartCard
              title="QC Pass Rate Trend"
              description="Monthly quality control pass rate percentage with 95% target reference line."
              icon={TrendingUp}
              accentColor={COLORS.emerald}
              height={280}
            >
              {qualityTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={qualityTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradQC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={4} />
                    <YAxis stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 105]} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={95} stroke={COLORS.amber} strokeDasharray="4 4" label={{ value: 'Target 95%', position: 'right', fontSize: 9, fill: COLORS.amber }} />
                    <Area type="monotone" dataKey="QC Pass Rate (%)" stroke={COLORS.emerald} strokeWidth={2.5} fillOpacity={1} fill="url(#gradQC)" name="QC Pass Rate (%)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No quality trend data." />
              )}
            </ChartCard>

            {/* Quality by Category */}
            <ChartCard
              title="Quality Distribution by Category"
              description="QC inspection outcomes grouped by material category — passed, quarantined, and rejected."
              icon={Layers}
              accentColor={COLORS.indigo}
              height={280}
            >
              {qualityByCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qualityByCategoryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={4} />
                    <YAxis stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Passed" stackId="a" fill={COLORS.emerald} barSize={22} name="Passed" />
                    <Bar dataKey="Quarantine" stackId="a" fill={COLORS.warning} name="Quarantine" />
                    <Bar dataKey="Failed" stackId="a" fill={COLORS.danger} radius={[6, 6, 0, 0]} name="Failed" />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} iconType="circle" iconSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No quality category data." />
              )}
            </ChartCard>

            {/* Quarantine Volume Trend */}
            <ChartCard
              title="Quarantine & Rejection Volume"
              description="Monthly trend of quarantined and rejected goods volume — indicates supplier or process quality issues."
              icon={ShieldAlert}
              accentColor={COLORS.rose}
              height={280}
            >
              {quarantineTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={quarantineTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradQuarantine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={4} />
                    <YAxis stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Quarantined" stroke={COLORS.warning} strokeWidth={2} fillOpacity={1} fill="url(#gradQuarantine)" name="Quarantined" />
                    <Area type="monotone" dataKey="Rejected" stroke={COLORS.danger} strokeWidth={2} fillOpacity={1} fill="url(#gradRejected)" name="Rejected" />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} iconType="circle" iconSize={8} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No quarantine trend data." />
              )}
            </ChartCard>

            {/* Quality by Supplier */}
            <ChartCard
              title="Quality Performance by Supplier"
              description="Supplier-level QC inspection results showing quality reliability across the vendor network."
              icon={Truck}
              accentColor={COLORS.teal}
              height={280}
            >
              {supplierQualityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierQualityData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(0,0,0,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="rgba(0,0,0,0.4)" fontSize={9} tickLine={false} axisLine={false} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Passed" stackId="a" fill={COLORS.emerald} barSize={14} name="Passed" />
                    <Bar dataKey="Quarantine" stackId="a" fill={COLORS.warning} name="Quarantine" />
                    <Bar dataKey="Failed" stackId="a" fill={COLORS.danger} radius={[0, 4, 4, 0]} name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No supplier quality data." />
              )}
            </ChartCard>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// EMPTY STATE COMPONENT
// ==========================================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-400 gap-2 p-6">
      <BarChart3 className="w-8 h-8 text-slate-300" />
      <span className="text-xs font-bold uppercase tracking-wider text-center">{message}</span>
    </div>
  );
}
