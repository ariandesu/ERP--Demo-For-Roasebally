'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  ArrowLeft, Search, Plus, Trash2, ChevronDown, ChevronUp, 
  Loader2, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert,
  Truck, Calendar, Building, FileText, Layers, Package, ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InwardShipment, InwardItem, Material, SKU, UserProfile, QualityCheckStatus } from '@/types';
import { createInwardShipmentAction, deleteInwardShipmentAction } from '@/app/actions/inward-actions';

interface InwardClientProps {
  initialShipments: InwardShipment[];
  materials: Material[];
  profile: UserProfile;
}

interface FormItem {
  id: string; // client-side unique ID
  material_id: string;
  sku_id: string;
  lot_number: string;
  quantity_received: string;
  unit_price: string;
  quality_status: QualityCheckStatus;
  remarks: string;
}

const WAREHOUSES = [
  { id: 'WH-MAIN', name: 'Main Cutting & Fabric Storage (WH-MAIN)' },
  { id: 'WH-SECONDARY', name: 'Accessory & Finishing Depot (WH-SECONDARY)' },
  { id: 'WH-READYGOODS', name: 'Finished Goods Dispatch (WH-READYGOODS)' },
];

export default function InwardClient({ initialShipments, materials, profile }: InwardClientProps) {
  const [shipments, setShipments] = useState<InwardShipment[]>(initialShipments);
  const [search, setSearch] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('all');
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Form states for Header (Step 1)
  const [inwardCode, setInwardCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [warehouseId, setWarehouseId] = useState('WH-MAIN');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states for Items (Step 2)
  const [formItems, setFormItems] = useState<FormItem[]>([
    {
      id: Math.random().toString(),
      material_id: '',
      sku_id: '',
      lot_number: '',
      quantity_received: '',
      unit_price: '',
      quality_status: 'passed',
      remarks: '',
    }
  ]);

  const isWritable = profile.role === 'super_admin' || profile.role === 'admin' || profile.role === 'warehouse_manager';

  // Toggle row details
  const toggleRow = (shipmentId: string) => {
    setExpandedShipmentId(expandedShipmentId === shipmentId ? null : shipmentId);
  };

  // Helper to generate a code
  const generateRandomCode = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `IN-${num}`;
  };

  // Reset form
  const resetForm = () => {
    setInwardCode(generateRandomCode());
    setSupplierName('');
    setInvoiceNo('');
    setWarehouseId('WH-MAIN');
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setFormItems([
      {
        id: Math.random().toString(),
        material_id: '',
        sku_id: '',
        lot_number: '',
        quantity_received: '',
        unit_price: '',
        quality_status: 'passed',
        remarks: '',
      }
    ]);
    setStep(1);
  };

  // Open creation wizard modal
  const handleOpenCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  // Step transitions
  const handleNextStep = () => {
    if (!inwardCode.trim()) {
      toast.warning('Shipment Code Required', { description: 'Please enter a unique Inward Code.' });
      return;
    }
    if (!supplierName.trim()) {
      toast.warning('Supplier Required', { description: 'Please enter the supplier name.' });
      return;
    }
    if (!receivedDate) {
      toast.warning('Date Required', { description: 'Please pick a receipt date.' });
      return;
    }
    setStep(2);
  };

  // Add a new row to items builder
  const handleAddItemRow = () => {
    setFormItems(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        material_id: '',
        sku_id: '',
        lot_number: '',
        quantity_received: '',
        unit_price: '',
        quality_status: 'passed',
        remarks: '',
      }
    ]);
  };

  // Remove a row from items builder
  const handleRemoveItemRow = (id: string) => {
    if (formItems.length === 1) {
      toast.warning('Minimum Item Required', { description: 'An inward shipment must have at least one item.' });
      return;
    }
    setFormItems(prev => prev.filter(item => item.id !== id));
  };

  // Update specific item field
  const handleUpdateItemField = (id: string, field: keyof FormItem, value: any) => {
    setFormItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // If material changes, reset the SKU ID automatically
        if (field === 'material_id') {
          updated.sku_id = '';
        }
        return updated;
      }
      return item;
    }));
  };

  // Submit new Inward Shipment Log
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (formItems.some(item => !item.sku_id)) {
      toast.warning('SKU Selection Required', { description: 'Please select a variant SKU for each item row.' });
      return;
    }
    if (formItems.some(item => !item.lot_number.trim())) {
      toast.warning('Lot Number Required', { description: 'Garment dye-lots must have a lot number for quality tracking.' });
      return;
    }
    if (formItems.some(item => !item.quantity_received || Number(item.quantity_received) <= 0)) {
      toast.warning('Quantity Error', { description: 'Quantity received must be a positive number greater than 0.' });
      return;
    }

    const payload = {
      inward_code: inwardCode,
      supplier_name: supplierName,
      invoice_no: invoiceNo || undefined,
      warehouse_id: warehouseId,
      received_date: receivedDate,
      items: formItems.map(item => ({
        sku_id: item.sku_id,
        lot_number: item.lot_number,
        quantity_received: Number(item.quantity_received),
        unit_price: item.unit_price ? Number(item.unit_price) : undefined,
        quality_status: item.quality_status,
        remarks: item.remarks || undefined,
      })),
    };

    startTransition(async () => {
      const result = await createInwardShipmentAction(payload);
      if (result.success && result.shipmentId) {
        toast.success('Inbound Logged Successfully', {
          description: `Shipment ${inwardCode} with ${formItems.length} items recorded and stock accounts updated.`,
        });

        // Refetch / update UI representation locally
        // Standard in this ERP is server actions do revalidatePath, 
        // so to reflect updates instantly we reload or update locally. Let's build a visual state addition:
        const addedItems: InwardItem[] = formItems.map((item, idx) => {
          const mat = materials.find(m => m.id === item.material_id);
          const sku = mat?.skus?.find(s => s.id === item.sku_id);
          return {
            id: `local-item-${idx}`,
            inward_id: result.shipmentId!,
            sku_id: item.sku_id,
            lot_number: item.lot_number.toUpperCase().trim(),
            quantity_received: Number(item.quantity_received),
            unit_price: item.unit_price ? Number(item.unit_price) : undefined,
            quality_status: item.quality_status,
            remarks: item.remarks || undefined,
            created_at: new Date().toISOString(),
            sku: sku ? { ...sku } : undefined,
            material: mat ? { ...mat } : undefined,
          };
        });

        const newShipment: InwardShipment = {
          id: result.shipmentId!,
          inward_code: inwardCode.toUpperCase().trim(),
          supplier_name: supplierName.trim(),
          invoice_no: invoiceNo ? invoiceNo.trim() : undefined,
          warehouse_id: warehouseId,
          received_date: receivedDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          received_by: profile.id,
          items: addedItems,
        };

        setShipments(prev => [newShipment, ...prev]);
        setCreateOpen(false);
        resetForm();
      } else {
        toast.error('Logging Failed', { description: result.error });
      }
    });
  };

  // Submit Delete / Rollback Shipment Action
  const handleDeleteSubmit = async (shipmentId: string, code: string) => {
    if (!confirm(`Are you absolutely sure you want to delete Goods Inward shipment ${code}?\n\nCAUTION: This will atomic-decrement stock quantities from linked SKU inventory records. If quantity_on_hand falls, it will rollback to 0.00. This action is IRREVERSIBLE!`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteInwardShipmentAction(shipmentId);
      if (result.success) {
        toast.success('Inbound Log Rolled Back', { 
          description: `Shipment ${code} has been successfully deleted, and stock cards rolled back.`,
        });
        setShipments(prev => prev.filter(sh => sh.id !== shipmentId));
        if (expandedShipmentId === shipmentId) setExpandedShipmentId(null);
      } else {
        toast.error('Rollback Failed', { description: result.error });
      }
    });
  };

  // Stats computation
  const stats = useMemo(() => {
    let totalItems = 0;
    let passedCount = 0;
    let quarantineCount = 0;
    let failedCount = 0;
    let totalQty = 0;

    shipments.forEach(s => {
      (s.items || []).forEach(item => {
        totalItems++;
        totalQty += Number(item.quantity_received);
        if (item.quality_status === 'passed') passedCount++;
        else if (item.quality_status === 'quarantine') quarantineCount++;
        else if (item.quality_status === 'failed') failedCount++;
      });
    });

    return {
      shipmentsCount: shipments.length,
      totalItems,
      passedCount,
      quarantineCount,
      failedCount,
      totalQty,
    };
  }, [shipments]);

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter(sh => {
      const matchSearch = 
        sh.inward_code.toLowerCase().includes(search.toLowerCase()) ||
        sh.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
        (sh.invoice_no || '').toLowerCase().includes(search.toLowerCase());

      const matchWarehouse = selectedWarehouseFilter === 'all' || sh.warehouse_id === selectedWarehouseFilter;

      return matchSearch && matchWarehouse;
    });
  }, [shipments, search, selectedWarehouseFilter]);

  // Style badge helpers
  const getQualityBadge = (status: QualityCheckStatus) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-150 border-emerald-200/50 font-bold text-[10px] py-0.5 rounded-md flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3 text-emerald-600" /> PASSED</Badge>;
      case 'quarantine':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-150 border-amber-200/50 font-bold text-[10px] py-0.5 rounded-md flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3 text-amber-600" /> QUARANTINE</Badge>;
      case 'failed':
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-150 border-rose-200/50 font-bold text-[10px] py-0.5 rounded-md flex items-center gap-1 w-fit"><ShieldAlert className="w-3 h-3 text-rose-600" /> FAILED</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <ClipboardCheck className="w-5 h-5 text-blue-650" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-850">
              Goods Inward Ledger
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-8">
            Log incoming supplier roll batches, record dye-lots, run QC status reviews, and update stocks.
          </p>
        </div>
        
        {isWritable ? (
          <Button
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 shadow-md hover:shadow-blue-500/20 transition-all rounded-xl gap-2 flex items-center self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" /> Log Inbound Shipment
          </Button>
        ) : (
          <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 font-bold p-2 text-xs self-start md:self-auto rounded-xl">
            Inward Logging: Read Only
          </Badge>
        )}
      </div>

      {/* 2. Statistical Aggregations Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Received Logs</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.shipmentsCount}</h3>
              <p className="text-[10px] text-slate-400 font-bold">Inbound entries logged</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">QC Passed Items</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.passedCount}</h3>
              <p className="text-[10px] text-emerald-600 font-bold">Approved for cutting/production</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">QC Quarantine Items</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.quarantineCount}</h3>
              <p className="text-[10px] text-amber-600 font-bold">On hold under inspection</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">QC Failed & Qty</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.failedCount}</h3>
              <p className="text-[10px] text-slate-400 font-bold">
                Total qty received: <span className="font-extrabold text-slate-700">{stats.totalQty.toLocaleString()} units</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search and Filtering Console */}
      <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search inward code, supplier name, or invoice ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 border-slate-200/80 hover:border-slate-350 focus-visible:ring-blue-500 rounded-xl w-full bg-slate-50/20"
              />
            </div>

            {/* Warehouse Filter */}
            <div className="w-full sm:w-64">
              <Select value={selectedWarehouseFilter} onValueChange={(val) => { if (val) setSelectedWarehouseFilter(val); }}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl focus:ring-blue-500">
                  <SelectValue placeholder="Warehouse Filters" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Warehouse Sectors</SelectItem>
                  {WAREHOUSES.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => { setSearch(''); setSelectedWarehouseFilter('all'); }}
              className="h-10 border-slate-200 hover:bg-slate-100 rounded-xl gap-2 font-bold text-xs text-slate-650 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* 4. Goods Inward History Logging Table */}
      <Card className="border-slate-200/80 bg-white shadow-md relative overflow-hidden rounded-2xl">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
        <CardHeader className="border-b border-slate-100/80 py-4 px-6 flex flex-row items-center justify-between bg-slate-50/20">
          <div>
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5 font-sans">
              <Layers className="w-4 h-4 text-blue-550" />
              Goods Inward Ledger Grid
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              Historical ledger listing raw materials receipts mapped to specific variant inventories.
            </p>
          </div>
          <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-600 font-bold px-2 py-0.5 text-xs">
            {filteredShipments.length} logs shown
          </Badge>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/40">
              <TableRow className="border-slate-100">
                <TableHead className="w-12 text-center"></TableHead>
                <TableHead className="font-bold text-slate-700 px-4 text-xs">Inward Shipment ID</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Received Date</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Supplier Name</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Invoice Reference</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Warehouse Sector</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Batched items</TableHead>
                <TableHead className="font-bold text-slate-700 text-right px-4 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-semibold mt-2">Loading historical shipments...</p>
                  </TableCell>
                </TableRow>
              ) : filteredShipments.length === 0 ? (
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                    No inward shipments found matching the criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredShipments.map((shipment) => {
                  const items = shipment.items || [];
                  const isExpanded = expandedShipmentId === shipment.id;
                  const warehouseObj = WAREHOUSES.find(w => w.id === shipment.warehouse_id);

                  return (
                    <React.Fragment key={shipment.id}>
                      
                      {/* Shipment Main Row */}
                      <TableRow className={`border-slate-100 hover:bg-slate-50/30 transition-colors ${isExpanded ? 'bg-slate-50/20' : ''}`}>
                        
                        {/* Expand Button */}
                        <TableCell className="text-center">
                          <button
                            onClick={() => toggleRow(shipment.id)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </TableCell>

                        {/* Inward Code */}
                        <TableCell className="font-bold px-4 text-sm text-blue-700">
                          {shipment.inward_code}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="font-semibold text-slate-700 text-xs">
                          {shipment.received_date}
                        </TableCell>

                        {/* Supplier */}
                        <TableCell className="font-bold text-slate-800 text-xs">
                          <div className="flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{shipment.supplier_name}</span>
                          </div>
                        </TableCell>

                        {/* Invoice */}
                        <TableCell className="font-semibold text-slate-600 text-xs">
                          {shipment.invoice_no ? (
                            <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md text-[10px]">
                              {shipment.invoice_no}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-normal">No Invoice</span>
                          )}
                        </TableCell>

                        {/* Warehouse */}
                        <TableCell className="font-semibold text-slate-650 text-xs">
                          <Badge variant="secondary" className="bg-slate-100 border border-slate-200/50 text-slate-650 font-semibold text-[10px]">
                            {warehouseObj ? warehouseObj.id : shipment.warehouse_id}
                          </Badge>
                        </TableCell>

                        {/* Items count */}
                        <TableCell>
                          <Badge className="bg-blue-50 border border-blue-100 text-blue-700 font-bold text-xs">
                            {items.length} materials
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right px-4">
                          {isWritable ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSubmit(shipment.id, shipment.inward_code)}
                              className="h-8 w-8 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl cursor-pointer"
                              title="Delete log & rollback stock"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 italic">Read-only</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expandable Items Details sub-table */}
                      {isExpanded && (
                        <TableRow className="bg-slate-50/30 border-slate-100 hover:bg-transparent">
                          <TableCell colSpan={8} className="p-4 border-slate-100">
                            <div className="border border-slate-200/80 rounded-2xl bg-white p-4 shadow-sm space-y-3 slide-in-from-top-1 duration-200">
                              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-blue-650" />
                                  Shipment Dye-lot Itemization details ({items.length} items)
                                </h4>
                                <span className="text-[10px] text-slate-400 font-bold italic">
                                  Dye batch rolls mapped to physical SKU variants
                                </span>
                              </div>

                              <Table className="border border-slate-100 rounded-xl overflow-hidden">
                                <TableHeader className="bg-slate-50/50">
                                  <TableRow className="border-slate-100">
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2 px-3">Master Material</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2">Variant SKU Code</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2">Dye Lot / Roll Batch</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2">Quality Status</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2 text-right">Qty Received</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2 text-right">Unit Price</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2 px-3">Remarks</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map((item, idx) => {
                                    const materialName = item.material?.name || (item.sku as any)?.material?.name || 'Unknown Material';
                                    const materialCode = item.material?.code || (item.sku as any)?.material?.code || '???';
                                    const skuCode = item.sku?.sku_code || '???';
                                    const skuSpec = item.sku ? `${item.sku.color} / ${item.sku.size}` : 'Standard';
                                    const uomVal = item.material?.uom || (item.sku as any)?.material?.uom || 'units';

                                    return (
                                      <TableRow key={item.id || idx} className="border-slate-100 hover:bg-slate-50/20">
                                        
                                        {/* Material name */}
                                        <TableCell className="py-2 px-3 font-semibold text-slate-800 text-xs">
                                          <div>
                                            <p className="font-bold">{materialName}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Parent Code: {materialCode}</p>
                                          </div>
                                        </TableCell>

                                        {/* Variant SKU Code */}
                                        <TableCell className="py-2">
                                          <div>
                                            <p className="font-mono text-xs font-bold text-slate-700">{skuCode}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Spec: {skuSpec}</p>
                                          </div>
                                        </TableCell>

                                        {/* Lot code */}
                                        <TableCell className="py-2">
                                          <Badge className="bg-blue-50 border border-blue-100 text-blue-700 font-bold font-mono text-[10px] py-0 px-2 rounded-md">
                                            {item.lot_number}
                                          </Badge>
                                        </TableCell>

                                        {/* QC Badge */}
                                        <TableCell className="py-2">
                                          {getQualityBadge(item.quality_status)}
                                        </TableCell>

                                        {/* Received Qty */}
                                        <TableCell className="py-2 font-extrabold text-slate-800 text-right text-xs">
                                          {Number(item.quantity_received).toLocaleString()} <span className="font-medium text-slate-500 text-[10px] capitalize">{uomVal}</span>
                                        </TableCell>

                                        {/* Unit Price */}
                                        <TableCell className="py-2 font-bold text-slate-700 text-right text-xs">
                                          {item.unit_price ? `$${Number(item.unit_price).toFixed(2)}` : <span className="text-slate-400 italic font-normal text-[10px]">-</span>}
                                        </TableCell>

                                        {/* Remarks */}
                                        <TableCell className="py-2 px-3 text-xs text-slate-500 font-medium max-w-[180px] truncate" title={item.remarks}>
                                          {item.remarks || <span className="text-slate-350 italic font-normal text-[10px]">No remarks</span>}
                                        </TableCell>

                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 5. Two-Step Dialog shipment creation wizard */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white border border-slate-200 p-0 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
          
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/20">
            <DialogTitle className="text-xl font-extrabold text-slate-850 flex items-center gap-2">
              <ClipboardCheck className="w-5.5 h-5.5 text-blue-650" />
              Log Supplier Inbound Shipment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold mt-1">
              Step-by-step wizard to record incoming physical materials, dye lots, QC checks and automatically trigger stock increments.
            </DialogDescription>

            {/* Steps Visual Indicator */}
            <div className="flex items-center gap-2 mt-4 pt-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-emerald-100 text-emerald-700'}`}>
                  {step === 2 ? '✓' : '1'}
                </span>
                <span className={`text-xs font-bold ${step === 1 ? 'text-slate-800' : 'text-emerald-700'}`}>Shipment Header</span>
              </div>
              <div className="w-8 h-[2px] bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 2 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                  2
                </span>
                <span className={`text-xs font-bold ${step === 2 ? 'text-slate-800' : 'text-slate-400'}`}>Shipment Items Builder</span>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit}>
            
            {/* Step 1: Shipment Header details */}
            {step === 1 && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Inward Code */}
                  <div className="space-y-1.5">
                    <Label htmlFor="inward_code" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Inward Code / ID <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="inward_code"
                        placeholder="e.g. IN-98124"
                        value={inwardCode}
                        onChange={e => setInwardCode(e.target.value.toUpperCase())}
                        required
                        className="border-slate-200 focus-visible:ring-blue-500 uppercase rounded-xl font-bold font-mono h-10 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInwardCode(generateRandomCode())}
                        className="h-10 border-slate-200 rounded-xl px-3 text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Generate code ID"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold font-mono">Unique inbound shipment ledger identifier.</p>
                  </div>

                  {/* Supplier Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="supplier_name" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      Supplier Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="supplier_name"
                      placeholder="e.g. Paramount Textiles Ltd"
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                      required
                      className="border-slate-200 focus-visible:ring-blue-500 rounded-xl font-bold h-10"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">Authorized manufacturer supplying raw material.</p>
                  </div>

                  {/* Invoice Reference */}
                  <div className="space-y-1.5">
                    <Label htmlFor="invoice_no" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Invoice Number
                    </Label>
                    <Input
                      id="invoice_no"
                      placeholder="e.g. INV-2026-098"
                      value={invoiceNo}
                      onChange={e => setInvoiceNo(e.target.value)}
                      className="border-slate-200 focus-visible:ring-blue-500 rounded-xl font-bold h-10"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">Optional supplier invoice document identifier reference.</p>
                  </div>

                  {/* Received Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="received_date" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Received Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="received_date"
                      type="date"
                      value={receivedDate}
                      onChange={e => setReceivedDate(e.target.value)}
                      required
                      className="border-slate-200 focus-visible:ring-blue-500 rounded-xl font-bold h-10"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">Date of physical shipment clearance into warehouse.</p>
                  </div>

                  {/* Warehouse ID Selection */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="warehouse" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      Allocated Storage Warehouse Sector <span className="text-red-500">*</span>
                    </Label>
                    <Select value={warehouseId} onValueChange={(val) => { if (val) setWarehouseId(val); }}>
                      <SelectTrigger className="border-slate-200 rounded-xl font-bold h-10">
                        <SelectValue placeholder="Select Warehouse Sector" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {WAREHOUSES.map(wh => (
                          <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400 font-semibold">Storage location where inbound rolls will be dispatched and stacked.</p>
                  </div>

                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer"
                  >
                    Proceed to Items Builder →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Shipment Items Builder */}
            {step === 2 && (
              <div className="p-6 space-y-4">
                
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Interactive Dye-lot Items Matrix
                  </span>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddItemRow}
                    className="h-9 border-blue-200 hover:bg-blue-50/50 text-blue-700 rounded-xl gap-1.5 font-bold text-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Item Row
                  </Button>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {formItems.map((item, index) => {
                    // Filter active SKUs for the selected material
                    const selectedMaterialObj = materials.find(m => m.id === item.material_id);
                    const skuVariants = selectedMaterialObj?.skus || [];

                    return (
                      <div 
                        key={item.id} 
                        className="p-4 border border-slate-200 rounded-2xl bg-slate-50/40 space-y-3 relative overflow-hidden group transition-colors hover:border-slate-300"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 group-hover:bg-blue-400" />
                        
                        {/* Header Row: Count & Delete Option */}
                        <div className="flex justify-between items-center pb-1">
                          <span className="text-xs font-bold text-slate-500">Item Position #{index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItemRow(item.id)}
                            className="h-8 w-8 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Fields Row 1: Material & SKU Variant */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          
                          {/* Material Selector */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-600">Select Base Material *</Label>
                            <Select
                              value={item.material_id}
                              onValueChange={val => handleUpdateItemField(item.id, 'material_id', val)}
                            >
                              <SelectTrigger className="border-slate-200 rounded-xl h-9 text-xs font-semibold">
                                <SelectValue placeholder="Pick a Material" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {materials.map(mat => (
                                  <SelectItem key={mat.id} value={mat.id} className="text-xs font-semibold">
                                    {mat.name} ({mat.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* SKU Variant Selector */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-600">Select Variant SKU *</Label>
                            <Select
                              value={item.sku_id}
                              onValueChange={val => handleUpdateItemField(item.id, 'sku_id', val)}
                              disabled={!item.material_id}
                            >
                              <SelectTrigger className="border-slate-200 rounded-xl h-9 text-xs font-semibold">
                                <SelectValue placeholder={item.material_id ? "Pick SKU Variation" : "Select material first"} />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {skuVariants.length === 0 ? (
                                  <SelectItem value="_no_sku" disabled className="text-xs">No variations generated</SelectItem>
                                ) : (
                                  skuVariants.map(sku => (
                                    <SelectItem key={sku.id} value={sku.id} className="text-xs font-mono">
                                      {sku.sku_code} ({sku.color} / {sku.size})
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                        </div>

                        {/* Fields Row 2: Lot, Quantity, QC, Price & Remarks */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          
                          {/* Lot Batch */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-600">Dye-lot Batch # *</Label>
                            <Input
                              placeholder="e.g. LOT-A2"
                              value={item.lot_number}
                              onChange={e => handleUpdateItemField(item.id, 'lot_number', e.target.value.toUpperCase())}
                              className="border-slate-200 rounded-xl h-9 text-xs font-mono uppercase font-semibold"
                              required
                            />
                          </div>

                          {/* Quantity */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-600">Received Qty *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.quantity_received}
                              onChange={e => handleUpdateItemField(item.id, 'quantity_received', e.target.value)}
                              className="border-slate-200 rounded-xl h-9 text-xs font-semibold"
                              required
                            />
                          </div>

                          {/* Unit Price */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-600">Unit Price ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Optional"
                              value={item.unit_price}
                              onChange={e => handleUpdateItemField(item.id, 'unit_price', e.target.value)}
                              className="border-slate-200 rounded-xl h-9 text-xs font-semibold"
                            />
                          </div>

                          {/* QC status */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-600">Quality Status *</Label>
                            <Select
                              value={item.quality_status}
                              onValueChange={val => handleUpdateItemField(item.id, 'quality_status', val)}
                            >
                              <SelectTrigger className="border-slate-200 rounded-xl h-9 text-xs font-bold">
                                <SelectValue placeholder="Quality Status" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="passed" className="text-xs font-bold text-emerald-600">PASSED</SelectItem>
                                <SelectItem value="quarantine" className="text-xs font-bold text-amber-600">QUARANTINE</SelectItem>
                                <SelectItem value="failed" className="text-xs font-bold text-rose-600">FAILED</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Remarks */}
                          <div className="space-y-1 md:col-span-4">
                            <Label className="text-[10px] font-bold text-slate-600">Item Batch Remarks</Label>
                            <Input
                              placeholder="e.g. Slightly higher yarn hairiness but dye lot matches perfect"
                              value={item.remarks}
                              onChange={e => handleUpdateItemField(item.id, 'remarks', e.target.value)}
                              className="border-slate-200 rounded-xl h-9 text-xs font-semibold"
                            />
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-10 border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs text-slate-600 cursor-pointer"
                  >
                    ← Back to Header Specs
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                      className="h-10 border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl gap-2 flex items-center cursor-pointer h-10"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        'Verify & Save Log'
                      )}
                    </Button>
                  </div>
                </div>

              </div>
            )}

          </form>

        </DialogContent>
      </Dialog>

    </div>
  );
}
