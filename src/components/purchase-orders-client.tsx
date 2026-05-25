'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  ArrowLeft, Search, Plus, Trash2, ChevronDown, ChevronUp, 
  Loader2, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert,
  Truck, Calendar, FileText, Layers, Package, ClipboardCheck,
  DollarSign, FileSpreadsheet, Tag, Clock, Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Material, SKU, UserProfile } from '@/types';
import { createPurchaseOrderAction, updatePurchaseOrderStatusAction, deletePurchaseOrderAction } from '@/app/actions/po-actions';

interface POClientProps {
  initialPOs: PurchaseOrder[];
  materials: Material[];
  profile: UserProfile;
}

interface FormItem {
  id: string; // client-side unique ID
  material_id: string;
  sku_id: string;
  quantity_ordered: string;
  unit_price: string;
}

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  pending: 'Pending Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function PurchaseOrdersClient({ initialPOs, materials, profile }: POClientProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPOs);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedPOId, setExpandedPOId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Form states for Header (Step 1)
  const [poCode, setPoCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Form states for Items (Step 2)
  const [formItems, setFormItems] = useState<FormItem[]>([
    {
      id: Math.random().toString(),
      material_id: '',
      sku_id: '',
      quantity_ordered: '',
      unit_price: '',
    }
  ]);

  const isWritable = profile.role === 'super_admin' || profile.role === 'admin' || profile.role === 'warehouse_manager';

  // Toggle row details
  const toggleRow = (poId: string) => {
    setExpandedPOId(expandedPOId === poId ? null : poId);
  };

  // Helper to generate a code
  const generateRandomCode = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `PO-${num}`;
  };

  // Reset form
  const resetForm = () => {
    setPoCode(generateRandomCode());
    setSupplierName('');
    setDeliveryDate('');
    setFormItems([
      {
        id: Math.random().toString(),
        material_id: '',
        sku_id: '',
        quantity_ordered: '',
        unit_price: '',
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
    if (!poCode.trim()) {
      toast.warning('PO Code Required', { description: 'Please enter a unique Purchase Order code.' });
      return;
    }
    if (!supplierName.trim()) {
      toast.warning('Supplier Required', { description: 'Please enter the supplier name.' });
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
        quantity_ordered: '',
        unit_price: '',
      }
    ]);
  };

  // Remove a row from items builder
  const handleRemoveItemRow = (id: string) => {
    if (formItems.length === 1) {
      toast.warning('Minimum Item Required', { description: 'A Purchase Order must contain at least one item.' });
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

  // Live order amount calculation
  const liveTotalAmount = useMemo(() => {
    return formItems.reduce((sum, item) => {
      const q = Number(item.quantity_ordered) || 0;
      const p = Number(item.unit_price) || 0;
      return sum + (q * p);
    }, 0);
  }, [formItems]);

  // Submit new Purchase Order
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (formItems.some(item => !item.sku_id)) {
      toast.warning('SKU Selection Required', { description: 'Please select a variant SKU for each item row.' });
      return;
    }
    if (formItems.some(item => !item.quantity_ordered || Number(item.quantity_ordered) <= 0)) {
      toast.warning('Quantity Error', { description: 'Quantity ordered must be positive.' });
      return;
    }
    if (formItems.some(item => !item.unit_price || Number(item.unit_price) < 0)) {
      toast.warning('Price Error', { description: 'Unit price must be a valid non-negative number.' });
      return;
    }

    const payload = {
      po_code: poCode,
      supplier_name: supplierName,
      delivery_date: deliveryDate || undefined,
      items: formItems.map(item => ({
        sku_id: item.sku_id,
        quantity_ordered: Number(item.quantity_ordered),
        unit_price: Number(item.unit_price),
      })),
    };

    startTransition(async () => {
      const result = await createPurchaseOrderAction(payload);
      if (result.success && result.poId) {
        toast.success('PO Drafted successfully', {
          description: `Purchase Order ${poCode} with ${formItems.length} items created.`,
        });

        // Refetch / update UI representation locally
        const addedItems: PurchaseOrderItem[] = formItems.map((item, idx) => {
          const mat = materials.find(m => m.id === item.material_id);
          const sku = mat?.skus?.find(s => s.id === item.sku_id);
          return {
            id: `local-item-${idx}`,
            po_id: result.poId!,
            sku_id: item.sku_id,
            quantity_ordered: Number(item.quantity_ordered),
            unit_price: Number(item.unit_price),
            quantity_received: 0.00,
            created_at: new Date().toISOString(),
            sku: sku ? { ...sku } : undefined,
            material: mat ? { ...mat } : undefined,
          };
        });

        const newPO: PurchaseOrder = {
          id: result.poId!,
          po_code: poCode.toUpperCase().trim(),
          supplier_name: supplierName.trim(),
          delivery_date: deliveryDate || undefined,
          order_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          total_amount: liveTotalAmount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: profile.id,
          items: addedItems,
        };

        setPurchaseOrders(prev => [newPO, ...prev]);
        setCreateOpen(false);
        resetForm();
      } else {
        toast.error('PO Creation Failed', { description: result.error });
      }
    });
  };

  // Submit Status Change Action
  const handleStatusChange = async (poId: string, status: PurchaseOrderStatus, code: string) => {
    startTransition(async () => {
      const result = await updatePurchaseOrderStatusAction(poId, status);
      if (result.success) {
        toast.success('PO Status Shifted', { 
          description: `Order ${code} status successfully updated to ${STATUS_LABELS[status]}.`,
        });
        setPurchaseOrders(prev => prev.map(po => po.id === poId ? { ...po, status } : po));
      } else {
        toast.error('Status Shift Failed', { description: result.error });
      }
    });
  };

  // Submit Delete PO Action
  const handleDeleteSubmit = async (poId: string, code: string) => {
    if (!confirm(`Are you absolutely sure you want to delete Purchase Order ${code}?\n\nThis will permanently purge this procurement log and all associated item rows. This action is IRREVERSIBLE!`)) {
      return;
    }

    startTransition(async () => {
      const result = await deletePurchaseOrderAction(poId);
      if (result.success) {
        toast.success('Purchase Order Purged', { 
          description: `Order ${code} has been successfully deleted.`,
        });
        setPurchaseOrders(prev => prev.filter(po => po.id !== poId));
        if (expandedPOId === poId) setExpandedPOId(null);
      } else {
        toast.error('Deletion Failed', { description: result.error });
      }
    });
  };

  // Stats computation
  const stats = useMemo(() => {
    let draftCount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let totalValue = 0;

    purchaseOrders.forEach(po => {
      totalValue += Number(po.total_amount);
      if (po.status === 'draft') draftCount++;
      else if (po.status === 'pending') pendingCount++;
      else if (po.status === 'completed') completedCount++;
    });

    return {
      poCount: purchaseOrders.length,
      draftCount,
      pendingCount,
      completedCount,
      totalValue,
    };
  }, [purchaseOrders]);

  // Filtered dispatches
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchSearch = 
        po.po_code.toLowerCase().includes(search.toLowerCase()) ||
        po.supplier_name.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'all' || po.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, search, statusFilter]);

  // Style badge helpers
  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-[10px] py-0.5 rounded-md flex items-center gap-1 w-fit"><Clock className="w-3 h-3 text-slate-500" /> DRAFT</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold text-[10px] py-0.5 rounded-md flex items-center gap-1 w-fit"><RefreshCw className="w-3 h-3 text-blue-600 animate-spin" /> PENDING</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200/50 font-bold text-[10px] py-0.5 rounded-md flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3 text-emerald-600" /> COMPLETED</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200/50 font-bold text-[10px] py-0.5 rounded-md flex items-center gap-1 w-fit"><Ban className="w-3 h-3 text-rose-600" /> CANCELLED</Badge>;
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
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-850 font-sans">
              Purchase Orders Procurement
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-8">
            Manage procurement logs, draft supplier quotation orders, configure unit prices, and update arrival status cycles.
          </p>
        </div>
        
        {isWritable ? (
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 shadow-md hover:shadow-emerald-550/20 transition-all rounded-xl gap-2 flex items-center self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" /> Draft Purchase Order
          </Button>
        ) : (
          <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 font-bold p-2 text-xs self-start md:self-auto rounded-xl">
            Purchase Orders: Read Only
          </Badge>
        )}
      </div>

      {/* 2. Statistical Aggregations Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active PO Logs</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.poCount}</h3>
              <p className="text-[10px] text-slate-400 font-bold">Total procurement logs</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Draft POs</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.draftCount}</h3>
              <p className="text-[10px] text-slate-400 font-bold">Orders awaiting approval</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Delivery</p>
              <h3 className="text-2xl font-extrabold text-slate-850">{stats.pendingCount}</h3>
              <p className="text-[10px] text-blue-650 font-bold">Active shipments in-transit</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</p>
              <h3 className="text-2xl font-extrabold text-slate-850">${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
              <p className="text-[10px] text-emerald-650 font-bold">Total procurement spend</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50/50 flex items-center justify-center text-emerald-650">
              <DollarSign className="w-5 h-5" />
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
                placeholder="Search purchase order code or supplier name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 border-slate-200/80 hover:border-slate-350 focus-visible:ring-emerald-500 rounded-xl w-full bg-slate-50/20"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-64">
              <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl focus:ring-emerald-500">
                  <SelectValue placeholder="PO Status Filter" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Status Tiers</SelectItem>
                  <SelectItem value="draft">Draft (Unapproved)</SelectItem>
                  <SelectItem value="pending">Pending (Active)</SelectItem>
                  <SelectItem value="completed">Completed (Arrived)</SelectItem>
                  <SelectItem value="cancelled">Cancelled (Voided)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="h-10 border-slate-200 hover:bg-slate-100 rounded-xl gap-2 font-bold text-xs text-slate-650 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* 4. Purchase Orders Procurement Grid */}
      <Card className="border-slate-200/80 bg-white shadow-md relative overflow-hidden rounded-2xl">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
        <CardHeader className="border-b border-slate-100/80 py-4 px-6 flex flex-row items-center justify-between bg-slate-50/20">
          <div>
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5 font-sans">
              <Layers className="w-4 h-4 text-emerald-650" />
              Procurement Register Ledger
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              Historical ledger listing supplier quotation sheets and estimated delivery cycles.
            </p>
          </div>
          <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-600 font-bold px-2 py-0.5 text-xs">
            {filteredPOs.length} POs shown
          </Badge>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/40">
              <TableRow className="border-slate-100">
                <TableHead className="w-12 text-center"></TableHead>
                <TableHead className="font-bold text-slate-700 px-4 text-xs">PO Code ID</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Order Date</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Supplier Partner</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Estimated Arrival</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Order Value</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Status Badge</TableHead>
                <TableHead className="font-bold text-slate-700 text-right px-4 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && purchaseOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-semibold mt-2">Loading procurement registry...</p>
                  </TableCell>
                </TableRow>
              ) : filteredPOs.length === 0 ? (
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                    No purchase orders found matching the filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => {
                  const items = po.items || [];
                  const isExpanded = expandedPOId === po.id;

                  return (
                    <React.Fragment key={po.id}>
                      
                      {/* PO Main Row */}
                      <TableRow className={`border-slate-100 hover:bg-slate-50/30 transition-colors ${isExpanded ? 'bg-slate-50/20' : ''}`}>
                        
                        {/* Expand Button */}
                        <TableCell className="text-center">
                          <button
                            onClick={() => toggleRow(po.id)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </TableCell>

                        {/* PO Code */}
                        <TableCell className="font-bold px-4 text-sm text-emerald-700">
                          {po.po_code}
                        </TableCell>

                        {/* Order Date */}
                        <TableCell className="font-semibold text-slate-700 text-xs">
                          {po.order_date}
                        </TableCell>

                        {/* Supplier */}
                        <TableCell className="font-bold text-slate-800 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{po.supplier_name}</span>
                          </div>
                        </TableCell>

                        {/* Delivery Date */}
                        <TableCell className="font-semibold text-slate-600 text-xs">
                          {po.delivery_date ? (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{po.delivery_date}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-normal">Not estimated</span>
                          )}
                        </TableCell>

                        {/* Value */}
                        <TableCell className="font-extrabold text-slate-800 text-xs">
                          ${Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* Status dropdown or static badge based on permissions */}
                        <TableCell>
                          {isWritable ? (
                            <Select 
                              value={po.status} 
                              onValueChange={(val) => handleStatusChange(po.id, val as PurchaseOrderStatus, po.po_code)}
                              disabled={isPending}
                            >
                              <SelectTrigger className="border-slate-200 rounded-lg h-8 px-2 text-xs font-bold w-36 bg-slate-50 hover:bg-slate-100">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="draft" className="text-xs font-bold text-slate-600">DRAFT</SelectItem>
                                <SelectItem value="pending" className="text-xs font-bold text-blue-600">PENDING</SelectItem>
                                <SelectItem value="completed" className="text-xs font-bold text-emerald-600">COMPLETED</SelectItem>
                                <SelectItem value="cancelled" className="text-xs font-bold text-rose-600">CANCELLED</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getStatusBadge(po.status)
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right px-4">
                          {isWritable ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSubmit(po.id, po.po_code)}
                              className="h-8 w-8 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl cursor-pointer"
                              title="Delete log"
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
                                  <Layers className="w-3.5 h-3.5 text-emerald-650" />
                                  Purchase Order Itemization details ({items.length} items)
                                </h4>
                                <span className="text-[10px] text-slate-400 font-bold italic">
                                  Material SKU requirements mapped to supplier quotations
                                </span>
                              </div>

                              <Table className="border border-slate-100 rounded-xl overflow-hidden">
                                <TableHeader className="bg-slate-50/50">
                                  <TableRow className="border-slate-100">
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2 px-3">Master Material</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2">Variant SKU Code</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2 text-right">Quantity Ordered</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2 text-right">Unit Price</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-[11px] py-2 text-right">Subtotal</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map((item, idx) => {
                                    const materialName = item.material?.name || (item.sku as any)?.material?.name || 'Unknown Material';
                                    const materialCode = item.material?.code || (item.sku as any)?.material?.code || '???';
                                    const skuCode = item.sku?.sku_code || '???';
                                    const skuSpec = item.sku ? `${item.sku.color} / ${item.sku.size}` : 'Standard';
                                    const uomVal = item.material?.uom || (item.sku as any)?.material?.uom || 'units';
                                    const subTotalVal = Number(item.quantity_ordered) * Number(item.unit_price);

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

                                        {/* Ordered Qty */}
                                        <TableCell className="py-2 font-extrabold text-slate-850 text-right text-xs">
                                          {Number(item.quantity_ordered).toLocaleString()} <span className="font-medium text-slate-500 text-[10px] capitalize">{uomVal}</span>
                                        </TableCell>

                                        {/* Unit Price */}
                                        <TableCell className="py-2 font-bold text-slate-700 text-right text-xs">
                                          ${Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </TableCell>

                                        {/* Subtotal */}
                                        <TableCell className="py-2 font-extrabold text-slate-800 text-right text-xs">
                                          ${subTotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              <ClipboardCheck className="w-5.5 h-5.5 text-emerald-650" />
              Log Purchase Order Quotation Draft
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold mt-1">
              Step-by-step wizard to register procurement quotation bids, calculate total expenditures, and log draft PO codes.
            </DialogDescription>

            {/* Steps Visual Indicator */}
            <div className="flex items-center gap-2 mt-4 pt-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 1 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-100 text-emerald-700'}`}>
                  {step === 2 ? '✓' : '1'}
                </span>
                <span className={`text-xs font-bold ${step === 1 ? 'text-slate-800' : 'text-emerald-700'}`}>Order Header</span>
              </div>
              <div className="w-8 h-[2px] bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 2 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                  2
                </span>
                <span className={`text-xs font-bold ${step === 2 ? 'text-slate-800' : 'text-slate-400'}`}>Order Items Builder</span>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit}>
            
            {/* Step 1: PO Header details */}
            {step === 1 && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* PO Code */}
                  <div className="space-y-1.5">
                    <Label htmlFor="po_code" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      PO Code / ID <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="po_code"
                        placeholder="e.g. PO-98124"
                        value={poCode}
                        onChange={e => setPoCode(e.target.value.toUpperCase())}
                        required
                        className="border-slate-200 focus-visible:ring-emerald-500 uppercase rounded-xl font-bold font-mono h-10 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPoCode(generateRandomCode())}
                        className="h-10 border-slate-200 rounded-xl px-3 text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Generate code ID"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold font-mono">Unique purchase order identifier.</p>
                  </div>

                  {/* Supplier Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="supplier_name" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      Supplier Partner Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="supplier_name"
                      placeholder="e.g. Apex Premier Mills Ltd"
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                      required
                      className="border-slate-200 focus-visible:ring-emerald-500 rounded-xl font-bold h-10"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">Supplier supplying the ordered materials.</p>
                  </div>

                  {/* Target Delivery Date */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="delivery_date" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Target Delivery Date
                    </Label>
                    <Input
                      id="delivery_date"
                      type="date"
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                      className="border-slate-200 focus-visible:ring-emerald-500 rounded-xl font-bold h-10"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">Optional expected delivery date for tracking schedules.</p>
                  </div>

                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer"
                  >
                    Proceed to Items Builder →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: PO Items Builder */}
            {step === 2 && (
              <div className="p-6 space-y-4">
                
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-650" />
                    Interactive Items Calculations Matrix
                  </span>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddItemRow}
                    className="h-9 border-emerald-200 hover:bg-emerald-50/50 text-emerald-700 rounded-xl gap-1.5 font-bold text-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Item Row
                  </Button>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {formItems.map((item, index) => {
                    const selectedMaterialObj = materials.find(m => m.id === item.material_id);
                    const skuVariants = selectedMaterialObj?.skus || [];
                    const rowQty = Number(item.quantity_ordered) || 0;
                    const rowPrice = Number(item.unit_price) || 0;
                    const rowSubtotal = rowQty * rowPrice;

                    return (
                      <div 
                        key={item.id} 
                        className="p-4 border border-slate-200 rounded-2xl bg-slate-50/40 space-y-3 relative overflow-hidden group hover:border-slate-350 transition-colors"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 group-hover:bg-emerald-450" />
                        
                        {/* Header Row */}
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

                        {/* Fields Row 1 */}
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

                          {/* SKU Selector */}
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

                        {/* Fields Row 2 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          
                          {/* Quantity ordered */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-600">Qty to Order *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.quantity_ordered}
                              onChange={e => handleUpdateItemField(item.id, 'quantity_ordered', e.target.value)}
                              className="border-slate-200 rounded-xl h-9 text-xs font-semibold focus-visible:ring-emerald-500"
                              required
                            />
                          </div>

                          {/* Unit price */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-600">Unit Price ($) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.unit_price}
                              onChange={e => handleUpdateItemField(item.id, 'unit_price', e.target.value)}
                              className="border-slate-200 rounded-xl h-9 text-xs font-semibold focus-visible:ring-emerald-500"
                              required
                            />
                          </div>

                          {/* Row subtotal */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-400">Row Subtotal</Label>
                            <div className="border border-slate-100 rounded-xl h-9 text-xs font-extrabold text-slate-700 bg-slate-100/30 flex items-center px-3 justify-end">
                              ${rowSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Live total aggregation bar */}
                <div className="p-4 border border-emerald-100 rounded-2xl bg-emerald-50/30 flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-850 uppercase tracking-wide flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Total Estimated Order spend</span>
                  <span className="text-lg font-extrabold text-emerald-700">${liveTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-10 border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs text-slate-650 cursor-pointer"
                  >
                    ← Back to Order Header
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
                      disabled={isPending}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl gap-2 flex items-center cursor-pointer h-10"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Saving PO...
                        </>
                      ) : (
                        'Save PO Draft'
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
