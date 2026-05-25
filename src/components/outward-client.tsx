'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  ArrowLeft, Search, Plus, Trash2, ChevronDown, ChevronUp, 
  Loader2, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert,
  Truck, Calendar, Building, FileText, Layers, Package, ClipboardCheck,
  User, ShoppingCart, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OutwardShipment, OutwardItem, Material, SKU, UserProfile } from '@/types';
import { createOutwardShipmentAction, deleteOutwardShipmentAction } from '@/app/actions/outward-actions';

interface OutwardClientProps {
  initialShipments: OutwardShipment[];
  materials: Material[];
  profile: UserProfile;
}

interface FormItem {
  id: string; // client-side unique ID
  material_id: string;
  sku_id: string;
  lot_number: string;
  quantity_dispatched: string;
  remarks: string;
}

const WAREHOUSES = [
  { id: 'WH-MAIN', name: 'Main Cutting & Fabric Storage (WH-MAIN)' },
  { id: 'WH-SECONDARY', name: 'Accessory & Finishing Depot (WH-SECONDARY)' },
  { id: 'WH-READYGOODS', name: 'Finished Goods Dispatch (WH-READYGOODS)' },
];

export default function OutwardClient({ initialShipments, materials, profile }: OutwardClientProps) {
  const [shipments, setShipments] = useState<OutwardShipment[]>(initialShipments);
  const [search, setSearch] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('all');
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Form states for Header (Step 1)
  const [outwardCode, setOutwardCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [warehouseId, setWarehouseId] = useState('WH-MAIN');
  const [dispatchedDate, setDispatchedDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states for Items (Step 2)
  const [formItems, setFormItems] = useState<FormItem[]>([
    {
      id: Math.random().toString(),
      material_id: '',
      sku_id: '',
      lot_number: '',
      quantity_dispatched: '',
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
    return `OUT-${num}`;
  };

  // Reset form
  const resetForm = () => {
    setOutwardCode(generateRandomCode());
    setCustomerName('');
    setOrderNo('');
    setWarehouseId('WH-MAIN');
    setDispatchedDate(new Date().toISOString().split('T')[0]);
    setFormItems([
      {
        id: Math.random().toString(),
        material_id: '',
        sku_id: '',
        lot_number: '',
        quantity_dispatched: '',
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
    if (!outwardCode.trim()) {
      toast.warning('Shipment Code Required', { description: 'Please enter a unique Outward Code.' });
      return;
    }
    if (!customerName.trim()) {
      toast.warning('Customer Required', { description: 'Please enter the customer / consignee name.' });
      return;
    }
    if (!dispatchedDate) {
      toast.warning('Date Required', { description: 'Please pick a dispatch date.' });
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
        quantity_dispatched: '',
        remarks: '',
      }
    ]);
  };

  // Remove a row from items builder
  const handleRemoveItemRow = (id: string) => {
    if (formItems.length === 1) {
      toast.warning('Minimum Item Required', { description: 'An outward shipment must have at least one item.' });
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

  // Submit new Outward Shipment Log
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (formItems.some(item => !item.sku_id)) {
      toast.warning('SKU Selection Required', { description: 'Please select a variant SKU for each item row.' });
      return;
    }
    if (formItems.some(item => !item.lot_number.trim())) {
      toast.warning('Lot Number Required', { description: 'Please enter a targeted Dye-lot number for each row.' });
      return;
    }
    if (formItems.some(item => !item.quantity_dispatched || Number(item.quantity_dispatched) <= 0)) {
      toast.warning('Quantity Error', { description: 'Quantity dispatched must be a positive number greater than 0.' });
      return;
    }

    // Client side out-of-stock validation check
    for (const item of formItems) {
      const selectedMaterialObj = materials.find(m => m.id === item.material_id);
      const sku = selectedMaterialObj?.skus?.find(s => s.id === item.sku_id);
      if (sku) {
        const currentQty = Number(sku.quantity_on_hand);
        const reqQty = Number(item.quantity_dispatched);
        if (currentQty < reqQty) {
          toast.error('Insufficient Stock Block', {
            description: `SKU variant ${sku.sku_code} has insufficient stock. Available: ${currentQty} ${selectedMaterialObj?.uom || 'units'}, Requested: ${reqQty}.`,
          });
          return;
        }
      }
    }

    const payload = {
      outward_code: outwardCode,
      customer_name: customerName,
      order_no: orderNo || undefined,
      warehouse_id: warehouseId,
      dispatched_date: dispatchedDate,
      items: formItems.map(item => ({
        sku_id: item.sku_id,
        lot_number: item.lot_number,
        quantity_dispatched: Number(item.quantity_dispatched),
        remarks: item.remarks || undefined,
      })),
    };

    startTransition(async () => {
      const result = await createOutwardShipmentAction(payload);
      if (result.success && result.shipmentId) {
        toast.success('Inbound Dispatched successfully', {
          description: `Outbound ${outwardCode} with ${formItems.length} items logged and stocks decremented.`,
        });

        // Refetch / update UI representation locally
        const addedItems: OutwardItem[] = formItems.map((item, idx) => {
          const mat = materials.find(m => m.id === item.material_id);
          const sku = mat?.skus?.find(s => s.id === item.sku_id);
          
          // Keep local inventory levels in sync dynamically
          if (sku) {
            sku.quantity_on_hand = Math.max(0, Number(sku.quantity_on_hand) - Number(item.quantity_dispatched));
          }

          return {
            id: `local-item-${idx}`,
            outward_id: result.shipmentId!,
            sku_id: item.sku_id,
            lot_number: item.lot_number.toUpperCase().trim(),
            quantity_dispatched: Number(item.quantity_dispatched),
            remarks: item.remarks || undefined,
            created_at: new Date().toISOString(),
            sku: sku ? { ...sku } : undefined,
            material: mat ? { ...mat } : undefined,
          };
        });

        const newShipment: OutwardShipment = {
          id: result.shipmentId!,
          outward_code: outwardCode.toUpperCase().trim(),
          customer_name: customerName.trim(),
          order_no: orderNo ? orderNo.trim() : undefined,
          warehouse_id: warehouseId,
          dispatched_date: dispatchedDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          dispatched_by: profile.id,
          items: addedItems,
        };

        setShipments(prev => [newShipment, ...prev]);
        setCreateOpen(false);
        resetForm();
      } else {
        toast.error('Dispatch Logging Failed', { description: result.error });
      }
    });
  };

  // Submit Delete / Rollback Shipment Action
  const handleDeleteSubmit = async (shipmentId: string, code: string) => {
    if (!confirm(`Are you absolutely sure you want to delete Goods Outward dispatch log ${code}?\n\nCAUTION: This will atomic-increment stock quantities from linked SKU inventory records back onto stock cards. This action is IRREVERSIBLE!`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteOutwardShipmentAction(shipmentId);
      if (result.success) {
        toast.success('Dispatch Log Rolled Back', { 
          description: `Shipment ${code} deleted, and stock balances successfully restored.`,
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
    let totalQty = 0;
    const uniqueCustomers = new Set<string>();

    shipments.forEach(s => {
      uniqueCustomers.add(s.customer_name.toLowerCase().trim());
      (s.items || []).forEach(item => {
        totalItems++;
        totalQty += Number(item.quantity_dispatched);
      });
    });

    return {
      shipmentsCount: shipments.length,
      totalItems,
      customersCount: uniqueCustomers.size,
      totalQty,
    };
  }, [shipments]);

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter(sh => {
      const matchSearch = 
        sh.outward_code.toLowerCase().includes(search.toLowerCase()) ||
        sh.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        (sh.order_no || '').toLowerCase().includes(search.toLowerCase());

      const matchWarehouse = selectedWarehouseFilter === 'all' || sh.warehouse_id === selectedWarehouseFilter;

      return matchSearch && matchWarehouse;
    });
  }, [shipments, search, selectedWarehouseFilter]);

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
            <ArrowUpRight className="w-5 h-5 text-violet-600" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-850 font-sans">
              Goods Outward Dispatching
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-8">
            Allocate and dispatch raw fabric rolls and accessories, verify order references, check limits, and manage shipment cards.
          </p>
        </div>
        
        {isWritable ? (
          <Button
            onClick={handleOpenCreate}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 shadow-md hover:shadow-violet-500/20 transition-all rounded-xl gap-2 flex items-center self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" /> Log Outbound Dispatch
          </Button>
        ) : (
          <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 font-bold p-2 text-xs self-start md:self-auto rounded-xl">
            Outbound Dispatch: Read Only
          </Badge>
        )}
      </div>

      {/* 2. Statistical Aggregations Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Dispatch Logs</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.shipmentsCount}</h3>
              <p className="text-[10px] text-slate-400 font-bold">Outbound entries logged</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-400" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispatched Items</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.totalItems}</h3>
              <p className="text-[10px] text-violet-600 font-bold">Allocated items types</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50/50 flex items-center justify-center text-violet-500">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consignee Accounts</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.customersCount}</h3>
              <p className="text-[10px] text-blue-700 font-bold">Active customers partners</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <User className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Units Dispatched</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.totalQty.toLocaleString()}</h3>
              <p className="text-[10px] text-sky-650 font-bold">Total stock count out</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <Package className="w-5 h-5" />
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
                placeholder="Search outward code, customer consignee, or SO ref..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 border-slate-200/80 hover:border-slate-350 focus-visible:ring-violet-500 rounded-xl w-full bg-slate-50/20"
              />
            </div>

            {/* Warehouse Filter */}
            <div className="w-full sm:w-64">
              <Select value={selectedWarehouseFilter} onValueChange={(val) => { if (val) setSelectedWarehouseFilter(val); }}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl focus:ring-violet-500">
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

      {/* 4. Goods Outward History Logging Table */}
      <Card className="border-slate-200/80 bg-white shadow-md relative overflow-hidden rounded-2xl">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
        <CardHeader className="border-b border-slate-100/80 py-4 px-6 flex flex-row items-center justify-between bg-slate-50/20">
          <div>
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5 font-sans">
              <Layers className="w-4 h-4 text-violet-550" />
              Goods Outward Dispatch Registry
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              Historical ledger listing material physical roll allocations shipped from specific variant inventories.
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
                <TableHead className="font-bold text-slate-700 px-4 text-xs">Outward Code ID</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Dispatched Date</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Customer Consignee</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Order reference</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Warehouse Sector</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Dispatched Items</TableHead>
                <TableHead className="font-bold text-slate-700 text-right px-4 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-semibold mt-2">Loading dispatch logs...</p>
                  </TableCell>
                </TableRow>
              ) : filteredShipments.length === 0 ? (
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                    No outward dispatches logged matching the criteria.
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
                        <TableCell className="font-bold px-4 text-sm text-violet-750">
                          {shipment.outward_code}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="font-semibold text-slate-700 text-xs">
                          {shipment.dispatched_date}
                        </TableCell>

                        {/* Customer */}
                        <TableCell className="font-bold text-slate-800 text-xs">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{shipment.customer_name}</span>
                          </div>
                        </TableCell>

                        {/* Order Ref */}
                        <TableCell className="font-semibold text-slate-600 text-xs">
                          {shipment.order_no ? (
                            <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md text-[10px]">
                              {shipment.order_no}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-normal">No Order Ref</span>
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
                          <Badge className="bg-violet-50 border border-violet-100 text-violet-700 font-bold text-xs">
                            {items.length} materials
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right px-4">
                          {isWritable ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSubmit(shipment.id, shipment.outward_code)}
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
                                  <Layers className="w-3.5 h-3.5 text-violet-650" />
                                  Shipment Allocations Itemization details ({items.length} items)
                                </h4>
                                <span className="text-[10px] text-slate-400 font-bold italic">
                                  Dye batch rolls allocated for outward consignee dispatch
                                </span>
                              </div>

                              <Table className="border border-slate-100 rounded-xl overflow-hidden">
                                <TableHeader className="bg-slate-50/50">
                                  <TableRow className="border-slate-100">
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2 px-3">Master Material</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2">Variant SKU Code</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2">Allocated Dye Lot</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2 text-right">Qty Dispatched</TableHead>
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

                                        {/* Dispatched Qty */}
                                        <TableCell className="py-2 font-extrabold text-slate-800 text-right text-xs">
                                          {Number(item.quantity_dispatched).toLocaleString()} <span className="font-medium text-slate-500 text-[10px] capitalize">{uomVal}</span>
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
              <ClipboardCheck className="w-5.5 h-5.5 text-violet-650" />
              Log Outbound Material Dispatch
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold mt-1">
              Step-by-step wizard to allocate physical materials, verify orders, check stock levels, and automatically update ledger.
            </DialogDescription>

            {/* Steps Visual Indicator */}
            <div className="flex items-center gap-2 mt-4 pt-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 1 ? 'bg-violet-600 text-white shadow-sm' : 'bg-emerald-100 text-emerald-700'}`}>
                  {step === 2 ? '✓' : '1'}
                </span>
                <span className={`text-xs font-bold ${step === 1 ? 'text-slate-800' : 'text-emerald-700'}`}>Dispatch Header</span>
              </div>
              <div className="w-8 h-[2px] bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 2 ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                  2
                </span>
                <span className={`text-xs font-bold ${step === 2 ? 'text-slate-800' : 'text-slate-400'}`}>Dispatch Items Builder</span>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit}>
            
            {/* Step 1: Shipment Header details */}
            {step === 1 && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Outward Code */}
                  <div className="space-y-1.5">
                    <Label htmlFor="outward_code" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Dispatch Code / ID <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="outward_code"
                        placeholder="e.g. OUT-98124"
                        value={outwardCode}
                        onChange={e => setOutwardCode(e.target.value.toUpperCase())}
                        required
                        className="border-slate-200 focus-visible:ring-violet-500 uppercase rounded-xl font-bold font-mono h-10 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOutwardCode(generateRandomCode())}
                        className="h-10 border-slate-200 rounded-xl px-3 text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Generate code ID"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold font-mono">Unique dispatch shipment identifier.</p>
                  </div>

                  {/* Customer Consignee */}
                  <div className="space-y-1.5">
                    <Label htmlFor="customer_name" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Customer Consignee Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customer_name"
                      placeholder="e.g. Zara Dhaka Logistics"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      required
                      className="border-slate-200 focus-visible:ring-violet-500 rounded-xl font-bold h-10"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">Consignee, factory, or retail client receiving stock.</p>
                  </div>

                  {/* Order Reference */}
                  <div className="space-y-1.5">
                    <Label htmlFor="order_no" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                      Sales / Export Order Ref
                    </Label>
                    <Input
                      id="order_no"
                      placeholder="e.g. SO-2026-981"
                      value={orderNo}
                      onChange={e => setOrderNo(e.target.value)}
                      className="border-slate-200 focus-visible:ring-violet-500 rounded-xl font-bold h-10"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">Optional sales order number or export commercial ref.</p>
                  </div>

                  {/* Dispatched Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dispatched_date" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Dispatch Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dispatched_date"
                      type="date"
                      value={dispatchedDate}
                      onChange={e => setDispatchedDate(e.target.value)}
                      required
                      className="border-slate-200 focus-visible:ring-violet-500 rounded-xl font-bold h-10"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">Date of physical dispatch from active inventory.</p>
                  </div>

                  {/* Warehouse ID Selection */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="warehouse" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      Origin Dispatch Warehouse Sector *
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
                    <p className="text-[10px] text-slate-400 font-semibold">Warehouse location from where outbound material rolls will be allocated.</p>
                  </div>

                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer"
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
                    <Layers className="w-4 h-4 text-violet-600" />
                    Interactive Dispatch Allocations Matrix
                  </span>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddItemRow}
                    className="h-9 border-violet-200 hover:bg-violet-50/50 text-violet-700 rounded-xl gap-1.5 font-bold text-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Item Row
                  </Button>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {formItems.map((item, index) => {
                    // Filter active SKUs for the selected material
                    const selectedMaterialObj = materials.find(m => m.id === item.material_id);
                    const skuVariants = selectedMaterialObj?.skus || [];
                    const selectedSkuObj = skuVariants.find(s => s.id === item.sku_id);

                    // Warning conditions
                    const isQtyExceedsStock = selectedSkuObj && 
                      item.quantity_dispatched && 
                      Number(item.quantity_dispatched) > Number(selectedSkuObj.quantity_on_hand);

                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 border rounded-2xl bg-slate-50/40 space-y-3 relative overflow-hidden group transition-all duration-300 ${isQtyExceedsStock ? 'border-red-300 bg-red-50/10' : 'border-slate-200 hover:border-slate-350'}`}
                      >
                        <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-300 ${isQtyExceedsStock ? 'bg-red-500' : 'bg-slate-300 group-hover:bg-violet-400'}`} />
                        
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

                          {/* SKU Variant Selector with Active Stock balances indicators */}
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
                                      {sku.sku_code} ({sku.color} / {sku.size}) [Stock: {Number(sku.quantity_on_hand).toLocaleString()} {selectedMaterialObj?.uom}]
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                        </div>

                        {/* Fields Row 2: Lot, Quantity, QC, Price & Remarks */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          
                          {/* Lot Batch */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-600 font-sans">Dye-lot Allocation Batch *</Label>
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
                            <div className="flex justify-between items-center">
                              <Label className="text-[10px] font-bold text-slate-600">Qty to Dispatch *</Label>
                              {selectedSkuObj && (
                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                  Available: {Number(selectedSkuObj.quantity_on_hand).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.quantity_dispatched}
                              onChange={e => handleUpdateItemField(item.id, 'quantity_dispatched', e.target.value)}
                              className={`border-slate-200 rounded-xl h-9 text-xs font-semibold ${isQtyExceedsStock ? 'border-red-400 focus-visible:ring-red-400 text-red-700 bg-red-50/5' : 'focus-visible:ring-violet-500'}`}
                              required
                            />
                          </div>

                          {/* Remarks */}
                          <div className="space-y-1 sm:col-span-2 md:col-span-1">
                            <Label className="text-[10px] font-bold text-slate-600">Allocation remarks</Label>
                            <Input
                              placeholder="e.g. Dispatch rolls for sizing cut-out batch"
                              value={item.remarks}
                              onChange={e => handleUpdateItemField(item.id, 'remarks', e.target.value)}
                              className="border-slate-200 rounded-xl h-9 text-xs font-semibold"
                            />
                          </div>

                        </div>

                        {/* Error warning text block */}
                        {isQtyExceedsStock && (
                          <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Quantity exceeds active stock balance on hand! Validation block active.
                          </p>
                        )}

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
                    className="h-10 border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs text-slate-650 cursor-pointer"
                  >
                    ← Back to Header Specs
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                      className="h-10 border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs text-slate-650 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending || formItems.some(item => {
                        const mat = materials.find(m => m.id === item.material_id);
                        const sku = mat?.skus?.find(s => s.id === item.sku_id);
                        return sku && item.quantity_dispatched && Number(item.quantity_dispatched) > Number(sku.quantity_on_hand);
                      })}
                      className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl gap-2 flex items-center cursor-pointer h-10 disabled:opacity-50 disabled:cursor-not-allowed"
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
