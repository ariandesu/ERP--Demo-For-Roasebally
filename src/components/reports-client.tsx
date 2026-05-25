'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Search, RefreshCw, FileSpreadsheet, Printer, 
  Layers, Package, CheckCircle, AlertTriangle, ShieldAlert,
  Truck, Calendar, DollarSign, BarChart3, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Material, SKU, InwardShipment, OutwardShipment, PurchaseOrder, UserProfile } from '@/types';

interface ReportsClientProps {
  materials: Material[];
  inwardShipments: InwardShipment[];
  outwardShipments: OutwardShipment[];
  purchaseOrders: PurchaseOrder[];
  profile: UserProfile;
}

type ReportTab = 'stock' | 'inward' | 'outward' | 'procurement';

export default function ReportsClient({ 
  materials, 
  inwardShipments, 
  outwardShipments, 
  purchaseOrders, 
  profile 
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('stock');
  const [search, setSearch] = useState('');
  const [companyName, setCompanyName] = useState('ROSEBALLY GARMENT INDUSTRIES LTD');
  const [companyAddress, setCompanyAddress] = useState('Plot 124, Sector 7, Uttara, Dhaka, Bangladesh');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('erp_company_name');
      const storedAddr = localStorage.getItem('erp_company_address');
      if (storedName) setCompanyName(storedName.toUpperCase());
      if (storedAddr) setCompanyAddress(storedAddr);
    }
  }, []);

  // 1. KPI Aggregations Calculations
  const stats = useMemo(() => {
    // A. Stock Valuation
    let totalStockVolume = 0;
    let totalValuation = 0;
    
    // Average prices lookup table from POs/Inwards to value the stock
    const pricingMap: Record<string, number> = {};
    inwardShipments.forEach(s => {
      (s.items || []).forEach(item => {
        if (item.sku_id && item.unit_price) {
          pricingMap[item.sku_id] = Number(item.unit_price);
        }
      });
    });

    materials.forEach(m => {
      (m.skus || []).forEach(sku => {
        const qty = Number(sku.quantity_on_hand);
        totalStockVolume += qty;
        
        // Lookup price or assume standard cost $4.50
        const price = pricingMap[sku.id] || 4.50;
        totalValuation += qty * price;
      });
    });

    // B. QC Clearance Rate
    let passedQC = 0;
    let totalQC = 0;
    inwardShipments.forEach(s => {
      (s.items || []).forEach(item => {
        totalQC++;
        if (item.quality_status === 'passed') passedQC++;
      });
    });
    const qcClearanceRate = totalQC > 0 ? (passedQC / totalQC) * 100 : 100.00;

    // C. Outbound Throughput Volume
    let totalOutboundVolume = 0;
    outwardShipments.forEach(s => {
      (s.items || []).forEach(item => {
        totalOutboundVolume += Number(item.quantity_dispatched);
      });
    });

    // D. Active Suppliers Count
    const suppliers = new Set<string>();
    inwardShipments.forEach(s => {
      if (s.supplier_name) suppliers.add(s.supplier_name.trim().toLowerCase());
    });
    purchaseOrders.forEach(po => {
      if (po.supplier_name) suppliers.add(po.supplier_name.trim().toLowerCase());
    });

    return {
      totalValuation,
      totalStockVolume,
      qcClearanceRate,
      totalOutboundVolume,
      suppliersCount: suppliers.size
    };
  }, [materials, inwardShipments, outwardShipments, purchaseOrders]);

  // 2. Client-side Real-time Search Filtering
  const filteredStockData = useMemo(() => {
    const list: { material: Material; sku: SKU }[] = [];
    materials.forEach(mat => {
      (mat.skus || []).forEach(sku => {
        list.push({ material: mat, sku });
      });
    });

    if (!search.trim()) return list;

    return list.filter(item => 
      item.sku.sku_code.toLowerCase().includes(search.toLowerCase()) ||
      item.material.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.color.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.size.toLowerCase().includes(search.toLowerCase())
    );
  }, [materials, search]);

  const filteredInwardData = useMemo(() => {
    const list: { shipment: InwardShipment; item: any }[] = [];
    inwardShipments.forEach(sh => {
      (sh.items || []).forEach(item => {
        list.push({ shipment: sh, item });
      });
    });

    if (!search.trim()) return list;

    return list.filter(row => 
      row.shipment.inward_code.toLowerCase().includes(search.toLowerCase()) ||
      row.shipment.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      row.item.lot_number.toLowerCase().includes(search.toLowerCase()) ||
      (row.item.sku?.sku_code || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [inwardShipments, search]);

  const filteredOutwardData = useMemo(() => {
    const list: { shipment: OutwardShipment; item: any }[] = [];
    outwardShipments.forEach(sh => {
      (sh.items || []).forEach(item => {
        list.push({ shipment: sh, item });
      });
    });

    if (!search.trim()) return list;

    return list.filter(row => 
      row.shipment.outward_code.toLowerCase().includes(search.toLowerCase()) ||
      row.shipment.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      row.item.lot_number.toLowerCase().includes(search.toLowerCase()) ||
      (row.item.sku?.sku_code || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [outwardShipments, search]);

  const filteredProcurementData = useMemo(() => {
    const list: { po: PurchaseOrder; item: any }[] = [];
    purchaseOrders.forEach(po => {
      (po.items || []).forEach(item => {
        list.push({ po, item });
      });
    });

    if (!search.trim()) return list;

    return list.filter(row => 
      row.po.po_code.toLowerCase().includes(search.toLowerCase()) ||
      row.po.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      (row.item.sku?.sku_code || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [purchaseOrders, search]);

  // Dynamic values based on active tab
  const activeCount = useMemo(() => {
    switch (activeTab) {
      case 'stock': return filteredStockData.length;
      case 'inward': return filteredInwardData.length;
      case 'outward': return filteredOutwardData.length;
      case 'procurement': return filteredProcurementData.length;
    }
  }, [activeTab, filteredStockData, filteredInwardData, filteredOutwardData, filteredProcurementData]);

  // Native Browser print execution
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print-full-width">
      
      {/* CSS-Native Print Stylesheet */}
      <style jsx global>{`
        @media print {
          /* Hide sidebar, headers, print controls, sidebar hooks */
          header, footer, nav, aside, .no-print, button, .tabs-toolbar, .kpi-toolbar {
            display: none !important;
          }
          /* Expand layout container to utilize full page dimensions */
          body, main, div, .print-full-width {
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          /* Table print borders alignment */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 10px !important;
            font-size: 11px !important;
            color: black !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
          .badge-print {
            border: 1px solid #475569 !important;
            background: none !important;
            color: black !important;
          }
        }
      `}</style>

      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <BarChart3 className="w-5 h-5 text-amber-600" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-850 font-sans">
              Operational Reports Console
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-8">
            Query stock values, monitor QC clearance stats, inspect outbound throughput rolls, and print PDF ledgers.
          </p>
        </div>
        
        <Button
          onClick={handlePrint}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 shadow-md hover:shadow-amber-500/20 transition-all rounded-xl gap-2 flex items-center self-start md:self-auto cursor-pointer"
        >
          <Printer className="w-4.5 h-4.5" /> Print / Export PDF
        </Button>
      </div>

      {/* Printable Header (Visible ONLY during print execution) */}
      <div className="hidden print:block space-y-2 pb-4 border-b border-slate-300">
        <h1 className="text-xl font-extrabold text-slate-950 tracking-tight font-sans">
          {companyName}
        </h1>
        <p className="text-[10px] text-slate-500 font-bold tracking-wide">{companyAddress}</p>
        <div className="flex justify-between text-xs text-slate-500 pt-1">
          <p>Report Segment: <span className="font-bold uppercase">{activeTab} Ledger</span></p>
          <p>Generated Date: <span className="font-bold">{new Date().toLocaleDateString()}</span></p>
          <p>Authorized By: <span className="font-bold">{profile.name} ({profile.email})</span></p>
        </div>
      </div>

      {/* 2. Statistical Aggregations Overview (no-print) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print kpi-toolbar">
        
        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stock Valuation</p>
              <h3 className="text-2xl font-extrabold text-slate-850">
                ${stats.totalValuation.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-450 font-bold">
                Live volume: <span className="font-extrabold text-slate-700">{stats.totalStockVolume.toLocaleString()} units</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">QC Clearance Rate</p>
              <h3 className="text-2xl font-extrabold text-slate-850">
                {stats.qcClearanceRate.toFixed(1)}%
              </h3>
              <p className="text-[10px] text-emerald-600 font-bold">Clearance clearance checks ratio</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outbound Throughput</p>
              <h3 className="text-2xl font-extrabold text-slate-850">
                {stats.totalOutboundVolume.toLocaleString()}
              </h3>
              <p className="text-[10px] text-violet-650 font-bold">Total rolls dispatched units</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Suppliers</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.suppliersCount}</h3>
              <p className="text-[10px] text-blue-650 font-bold">Procurement vendor network</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Report Toggles and Filtering Console (no-print) */}
      <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl no-print">
        <CardContent className="p-4 space-y-4">
          
          {/* Navigation tabs toggles */}
          <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3 tabs-toolbar">
            
            <button
              onClick={() => { setActiveTab('stock'); setSearch(''); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${activeTab === 'stock' ? 'bg-amber-600 border-amber-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
            >
              <Package className="w-3.5 h-3.5" /> Stock Balances Sheet
            </button>

            <button
              onClick={() => { setActiveTab('inward'); setSearch(''); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${activeTab === 'inward' ? 'bg-amber-600 border-amber-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Goods Inward History
            </button>

            <button
              onClick={() => { setActiveTab('outward'); setSearch(''); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${activeTab === 'outward' ? 'bg-amber-600 border-amber-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Goods Outward Registry
            </button>

            <button
              onClick={() => { setActiveTab('procurement'); setSearch(''); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${activeTab === 'procurement' ? 'bg-amber-600 border-amber-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Procurement Spend POs
            </button>

          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={
                  activeTab === 'stock' ? "Search SKU code, material name, or specs..." :
                  activeTab === 'inward' ? "Search inward shipment code, supplier, or lot batch..." :
                  activeTab === 'outward' ? "Search outward dispatch code, customer, or lot allocation..." :
                  "Search PO code, supplier partner, or SKU requirements..."
                }
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 border-slate-200/80 hover:border-slate-350 focus-visible:ring-amber-500 rounded-xl w-full bg-slate-50/20"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setSearch('')}
              className="h-10 border-slate-200 hover:bg-slate-100 rounded-xl gap-2 font-bold text-xs text-slate-650 cursor-pointer w-full sm:w-auto shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Clear Filters
            </Button>

          </div>

        </CardContent>
      </Card>

      {/* 4. Active Worksheet Report Grid */}
      <Card className="border-slate-200/80 bg-white shadow-md relative overflow-hidden rounded-2xl print:border-none print:shadow-none">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600 no-print" />
        <CardHeader className="border-b border-slate-100/80 py-4 px-6 flex flex-row items-center justify-between bg-slate-50/20 print:hidden">
          <div>
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5 font-sans">
              <Layers className="w-4 h-4 text-amber-550" />
              {activeTab === 'stock' ? 'Material Stock Balances Worksheet' :
               activeTab === 'inward' ? 'Supplier Inward Cargo Registry' :
               activeTab === 'outward' ? 'Consignee Outbound Dispatch Ledger' :
               'Supplier Purchase Order Spend Sheets'}
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              Live audit data mapping compiled databases values. Click Print at top-right to save as PDF.
            </p>
          </div>
          <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-600 font-bold px-2 py-0.5 text-xs">
            {activeCount} records compile
          </Badge>
        </CardHeader>
        
        <div>
          {/* TAB 1: Stock Balances Report */}
          {activeTab === 'stock' && (
            <Table>
              <TableHeader className="bg-slate-50/40">
                <TableRow className="border-slate-100">
                  <TableHead className="font-bold text-slate-700 px-4 text-xs">Master Material</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Category</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Variant SKU Code</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Color & Size</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right text-xs">Safety Min</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right text-xs">Stock on Hand</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Threshold Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStockData.length === 0 ? (
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                      No stock records found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStockData.map((row, idx) => {
                    const lowStockAlert = row.sku.alert_on_low_stock && 
                      Number(row.sku.quantity_on_hand) <= Number(row.sku.min_stock_level);
                    
                    return (
                      <TableRow key={row.sku.id || idx} className="border-slate-100 hover:bg-slate-50/20">
                        
                        {/* Parent Material */}
                        <TableCell className="px-4 font-bold text-xs text-slate-800">
                          {row.material.name}
                          <p className="text-[10px] text-slate-400 font-medium font-sans mt-0.5">Code: {row.material.code}</p>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="text-xs font-semibold text-slate-650 uppercase">
                          {row.material.category.replace('_', ' ')}
                        </TableCell>

                        {/* SKU code */}
                        <TableCell className="font-mono text-xs font-bold text-slate-700">
                          {row.sku.sku_code}
                        </TableCell>

                        {/* Specs */}
                        <TableCell className="text-xs font-semibold text-slate-600">
                          {row.sku.color} / {row.sku.size}
                        </TableCell>

                        {/* Safety Min */}
                        <TableCell className="text-right text-xs font-bold text-slate-600">
                          {Number(row.sku.min_stock_level).toLocaleString()} <span className="text-[9px] font-normal text-slate-400 lowercase">{row.material.uom}</span>
                        </TableCell>

                        {/* Stock Hand */}
                        <TableCell className={`text-right text-xs font-extrabold ${lowStockAlert ? 'text-rose-650' : 'text-slate-850'}`}>
                          {Number(row.sku.quantity_on_hand).toLocaleString()} <span className="text-[9px] font-normal text-slate-400 lowercase">{row.material.uom}</span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {lowStockAlert ? (
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-650 border-rose-500/20 font-bold text-[9px] py-0 px-1.5 rounded-md badge-print">
                              LOW STOCK ALERT
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-650 border-emerald-500/20 font-bold text-[9px] py-0 px-1.5 rounded-md badge-print">
                              STOCK SAFE
                            </Badge>
                          )}
                        </TableCell>

                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}

          {/* TAB 2: Goods Inward History Report */}
          {activeTab === 'inward' && (
            <Table>
              <TableHeader className="bg-slate-50/40">
                <TableRow className="border-slate-100">
                  <TableHead className="font-bold text-slate-700 px-4 text-xs">Inward Shipment ID</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Received Date</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Supplier</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">SKU Color/Size</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Dye-lot Batch #</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">QC Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right text-xs">Qty Received</TableHead>
                  <TableHead className="font-bold text-slate-700 px-4 text-xs">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInwardData.length === 0 ? (
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                      No inbound logs found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInwardData.map((row, idx) => {
                    const uomVal = row.item.sku?.material?.uom || 'units';
                    return (
                      <TableRow key={row.item.id || idx} className="border-slate-100 hover:bg-slate-50/20">
                        
                        {/* Inward code */}
                        <TableCell className="px-4 font-bold text-xs text-amber-700">
                          {row.shipment.inward_code}
                          {row.shipment.invoice_no && (
                            <p className="text-[10px] text-slate-400 font-medium font-sans mt-0.5">Invoice: {row.shipment.invoice_no}</p>
                          )}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-xs font-semibold text-slate-650">
                          {row.shipment.received_date}
                        </TableCell>

                        {/* Supplier */}
                        <TableCell className="text-xs font-bold text-slate-800">
                          {row.shipment.supplier_name}
                        </TableCell>

                        {/* SKU spec */}
                        <TableCell className="text-xs font-semibold text-slate-650">
                          <p className="font-mono font-bold text-slate-700 text-[11px]">{row.item.sku?.sku_code || '???'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{row.item.sku?.color} / {row.item.sku?.size}</p>
                        </TableCell>

                        {/* Lot */}
                        <TableCell className="font-mono font-bold text-xs text-slate-700">
                          {row.item.lot_number}
                        </TableCell>

                        {/* QC */}
                        <TableCell className="text-xs font-bold capitalize">
                          <span className={`text-[10px] font-bold ${row.item.quality_status === 'passed' ? 'text-emerald-650' : row.item.quality_status === 'quarantine' ? 'text-amber-650' : 'text-rose-650'}`}>
                            {row.item.quality_status.toUpperCase()}
                          </span>
                        </TableCell>

                        {/* Qty received */}
                        <TableCell className="text-right text-xs font-extrabold text-slate-800">
                          {Number(row.item.quantity_received).toLocaleString()} <span className="text-[9px] font-normal text-slate-400 lowercase">{uomVal}</span>
                        </TableCell>

                        {/* Remarks */}
                        <TableCell className="px-4 text-xs font-medium text-slate-500 max-w-[150px] truncate" title={row.item.remarks}>
                          {row.item.remarks || <span className="text-slate-300 italic font-normal">-</span>}
                        </TableCell>

                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}

          {/* TAB 3: Goods Outward History Report */}
          {activeTab === 'outward' && (
            <Table>
              <TableHeader className="bg-slate-50/40">
                <TableRow className="border-slate-100">
                  <TableHead className="font-bold text-slate-700 px-4 text-xs">Outward Code ID</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Dispatched Date</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Customer Consignee</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">SKU variant code</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Allocated Lot</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right text-xs">Qty Shipped</TableHead>
                  <TableHead className="font-bold text-slate-700 px-4 text-xs">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOutwardData.length === 0 ? (
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                      No outbound logs found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOutwardData.map((row, idx) => {
                    const uomVal = row.item.sku?.material?.uom || 'units';
                    return (
                      <TableRow key={row.item.id || idx} className="border-slate-100 hover:bg-slate-50/20">
                        
                        {/* Outward Code */}
                        <TableCell className="px-4 font-bold text-xs text-violet-750">
                          {row.shipment.outward_code}
                          {row.shipment.order_no && (
                            <p className="text-[10px] text-slate-400 font-medium font-sans mt-0.5">Order Ref: {row.shipment.order_no}</p>
                          )}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-xs font-semibold text-slate-650">
                          {row.shipment.dispatched_date}
                        </TableCell>

                        {/* Customer */}
                        <TableCell className="text-xs font-bold text-slate-800">
                          {row.shipment.customer_name}
                        </TableCell>

                        {/* SKU spec */}
                        <TableCell className="text-xs font-semibold text-slate-650">
                          <p className="font-mono font-bold text-slate-700 text-[11px]">{row.item.sku?.sku_code || '???'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{row.item.sku?.color} / {row.item.sku?.size}</p>
                        </TableCell>

                        {/* Lot */}
                        <TableCell className="font-mono font-bold text-xs text-slate-700">
                          {row.item.lot_number}
                        </TableCell>

                        {/* Qty Dispatched */}
                        <TableCell className="text-right text-xs font-extrabold text-slate-850">
                          {Number(row.item.quantity_dispatched).toLocaleString()} <span className="text-[9px] font-normal text-slate-400 lowercase">{uomVal}</span>
                        </TableCell>

                        {/* Remarks */}
                        <TableCell className="px-4 text-xs font-medium text-slate-500 max-w-[180px] truncate" title={row.item.remarks}>
                          {row.item.remarks || <span className="text-slate-300 italic font-normal">-</span>}
                        </TableCell>

                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}

          {/* TAB 4: Purchase Orders Spend Report */}
          {activeTab === 'procurement' && (
            <Table>
              <TableHeader className="bg-slate-50/40">
                <TableRow className="border-slate-100">
                  <TableHead className="font-bold text-slate-700 px-4 text-xs">PO Code ID</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Order Date</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Supplier partner</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Variant SKU Code</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right text-xs">Ordered Qty</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right text-xs">Quoted Unit Price</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right text-xs">Subtotal value</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">PO Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcurementData.length === 0 ? (
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                      No purchase order items found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcurementData.map((row, idx) => {
                    const uomVal = row.item.sku?.material?.uom || 'units';
                    const subtotal = Number(row.item.quantity_ordered) * Number(row.item.unit_price);
                    
                    return (
                      <TableRow key={row.item.id || idx} className="border-slate-100 hover:bg-slate-50/20">
                        
                        {/* PO Code */}
                        <TableCell className="px-4 font-bold text-xs text-emerald-700">
                          {row.po.po_code}
                          {row.po.delivery_date && (
                            <p className="text-[10px] text-slate-400 font-medium font-sans mt-0.5">Est. Arrival: {row.po.delivery_date}</p>
                          )}
                        </TableCell>

                        {/* Order date */}
                        <TableCell className="text-xs font-semibold text-slate-650">
                          {row.po.order_date}
                        </TableCell>

                        {/* Supplier */}
                        <TableCell className="text-xs font-bold text-slate-800">
                          {row.po.supplier_name}
                        </TableCell>

                        {/* SKU details */}
                        <TableCell className="text-xs font-semibold text-slate-650">
                          <p className="font-mono font-bold text-slate-700 text-[11px]">{row.item.sku?.sku_code || '???'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{row.item.sku?.color} / {row.item.sku?.size}</p>
                        </TableCell>

                        {/* Qty ordered */}
                        <TableCell className="text-right text-xs font-extrabold text-slate-850">
                          {Number(row.item.quantity_ordered).toLocaleString()} <span className="text-[9px] font-normal text-slate-400 lowercase">{uomVal}</span>
                        </TableCell>

                        {/* Unit price */}
                        <TableCell className="text-right text-xs font-bold text-slate-700">
                          ${Number(row.item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* Subtotal */}
                        <TableCell className="text-right text-xs font-extrabold text-emerald-750">
                          ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* PO Status */}
                        <TableCell className="text-xs font-bold uppercase">
                          <span className={`text-[10px] font-bold ${row.po.status === 'completed' ? 'text-emerald-650' : row.po.status === 'pending' ? 'text-blue-650' : row.po.status === 'cancelled' ? 'text-rose-650' : 'text-slate-500'}`}>
                            {row.po.status}
                          </span>
                        </TableCell>

                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

    </div>
  );
}
