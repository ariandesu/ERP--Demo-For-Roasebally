'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { Material, SKU, UserProfile, MaterialCategory, MaterialUom, CATEGORY_LABELS, UOM_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Package, Search, Plus, Edit2, Trash2, ChevronDown, ChevronUp, Construction,
  Info, ShieldCheck, Ruler, Layers, Tag, Scale, Loader2, ArrowLeft, RefreshCw,
  AlertTriangle, CheckCircle, Truck, ExternalLink
} from 'lucide-react';
import { createMaterialAction, updateMaterialAction, deleteMaterialAction } from '@/app/actions/material-actions';
import Link from 'next/link';

interface MaterialsClientProps {
  initialMaterials: Material[];
  profile: UserProfile;
}

export default function MaterialsClient({ initialMaterials, profile }: MaterialsClientProps) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  
  // Provision Wizard Form Fields State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('fabric');
  const [uom, setUom] = useState<MaterialUom>('rolls');
  const [description, setDescription] = useState('');
  const [supplierName, setSupplierName] = useState('');
  
  // Specific Category Specs
  const [composition, setComposition] = useState('');
  const [weightGsm, setWeightGsm] = useState<number>(180);
  const [widthInches, setWidthInches] = useState<number>(58);
  const [yarnCount, setYarnCount] = useState('');

  // Variants Options
  const [colorInput, setColorInput] = useState('');
  const [sizeInput, setSizeInput] = useState('');
  const [minStockLevel, setMinStockLevel] = useState<number>(10);
  const [alertOnLowStock, setAlertOnLowStock] = useState(true);

  // Form Step Wizard
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Write Access Assertion Helper
  const isWritable = profile.role === 'super_admin' || profile.role === 'admin' || profile.role === 'warehouse_manager';

  // Toggle expansion row
  const toggleRow = (materialId: string) => {
    setExpandedMaterialId(expandedMaterialId === materialId ? null : materialId);
  };

  // Filtered Materials calculations
  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      const matchSearch = 
        material.name.toLowerCase().includes(search.toLowerCase()) ||
        material.code.toLowerCase().includes(search.toLowerCase()) ||
        (material.supplier_name || '').toLowerCase().includes(search.toLowerCase());
      
      const matchTab = activeTab === 'all' || material.category === activeTab;

      return matchSearch && matchTab;
    });
  }, [materials, search, activeTab]);

  // Compute warehouse-level aggregates
  const stats = useMemo(() => {
    let totalSKUs = 0;
    let lowStockCount = 0;
    materials.forEach(m => {
      (m.skus || []).forEach(sku => {
        totalSKUs++;
        const hand = Number(sku.quantity_on_hand);
        const min = Number(sku.min_stock_level);
        if (sku.alert_on_low_stock && hand <= min) {
          lowStockCount++;
        }
      });
    });
    return {
      totalCategories: new Set(materials.map(m => m.category)).size,
      totalItems: materials.length,
      totalSKUs,
      lowStockCount
    };
  }, [materials]);

  // Reset form fields helper
  const resetForm = () => {
    setCode('');
    setName('');
    setCategory('fabric');
    setUom('rolls');
    setDescription('');
    setSupplierName('');
    setComposition('');
    setWeightGsm(180);
    setWidthInches(58);
    setYarnCount('');
    setColorInput('');
    setSizeInput('');
    setMinStockLevel(10);
    setAlertOnLowStock(true);
    setStep(1);
    setSelectedMaterial(null);
  };

  // Open create modal
  const handleOpenCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  // Submit Create Material Action
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) {
      toast.warning('Details Required', { description: 'Please fill out the Material Code and Display Name.' });
      return;
    }

    const colors = colorInput
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const sizes = sizeInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      code,
      name,
      category,
      uom,
      description,
      supplier_name: supplierName,
      composition,
      weight_gsm: category === 'fabric' ? weightGsm : undefined,
      width_inches: category === 'fabric' ? widthInches : undefined,
      yarn_count: category === 'yarn' ? yarnCount : undefined,
      variants: {
        colors,
        sizes,
        min_stock_level: minStockLevel,
        alert_on_low_stock: alertOnLowStock
      }
    };

    startTransition(async () => {
      const result = await createMaterialAction(payload);
      if (result.success && result.materialId) {
        toast.success('Material Provisioned', { description: `Registered ${name} SKU catalog cards successfully.` });
        
        // Assemble flat visual list representation locally until manual reload
        const newLocalMaterial: Material = {
          id: result.materialId,
          code: code.toUpperCase().trim(),
          name: name.trim(),
          category,
          uom,
          description: description || undefined,
          supplier_name: supplierName || undefined,
          composition: composition || undefined,
          weight_gsm: category === 'fabric' ? weightGsm : undefined,
          width_inches: category === 'fabric' ? widthInches : undefined,
          yarn_count: category === 'yarn' ? yarnCount : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          skus: colors.map((col, cIdx) => 
            sizes.map((sz, sIdx) => ({
              id: `temp-${cIdx}-${sIdx}`,
              material_id: result.materialId,
              sku_code: `${code.toUpperCase()}-${col.toUpperCase().replace(/\s+/g, '')}-${sz.toUpperCase().replace(/\s+/g, '')}`,
              color: col,
              size: sz,
              quantity_on_hand: 0,
              quantity_allocated: 0,
              min_stock_level: minStockLevel,
              alert_on_low_stock: alertOnLowStock,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }))
          ).flat() as SKU[]
        };

        setMaterials(prev => [newLocalMaterial, ...prev]);
        setCreateOpen(false);
        resetForm();
      } else {
        toast.error('Provisioning Failed', { description: result.error });
      }
    });
  };

  // Open edit modal
  const handleOpenEdit = (material: Material) => {
    setSelectedMaterial(material);
    setName(material.name);
    setDescription(material.description || '');
    setSupplierName(material.supplier_name || '');
    setComposition(material.composition || '');
    setWeightGsm(material.weight_gsm || 180);
    setWidthInches(material.width_inches || 58);
    setYarnCount(material.yarn_count || '');
    setEditOpen(true);
  };

  // Submit Edit Material Action
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    const payload = {
      name,
      description,
      supplier_name: supplierName,
      composition,
      weight_gsm: selectedMaterial.category === 'fabric' ? weightGsm : undefined,
      width_inches: selectedMaterial.category === 'fabric' ? widthInches : undefined,
      yarn_count: selectedMaterial.category === 'yarn' ? yarnCount : undefined,
    };

    startTransition(async () => {
      const result = await updateMaterialAction(selectedMaterial.id, payload);
      if (result.success) {
        toast.success('Catalog Upgraded', { description: `${selectedMaterial.code} parameters synchronized successfully.` });
        setMaterials(prev => prev.map(m => m.id === selectedMaterial.id ? {
          ...m,
          name,
          description,
          supplier_name: supplierName,
          composition,
          weight_gsm: selectedMaterial.category === 'fabric' ? weightGsm : undefined,
          width_inches: selectedMaterial.category === 'fabric' ? widthInches : undefined,
          yarn_count: selectedMaterial.category === 'yarn' ? yarnCount : undefined,
        } : m));
        setEditOpen(false);
      } else {
        toast.error('Sync Failed', { description: result.error });
      }
    });
  };

  // Submit Delete Material Action
  const handleDeleteSubmit = async (materialId: string, materialCode: string) => {
    if (!confirm(`Are you absolutely sure you want to delete material ${materialCode}? This action cascades and purges all variants and SKU inventory tracking records.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteMaterialAction(materialId);
      if (result.success) {
        toast.success('Catalog Purged', { description: `Material ${materialCode} deleted successfully.` });
        setMaterials(prev => prev.filter(m => m.id !== materialId));
        if (expandedMaterialId === materialId) setExpandedMaterialId(null);
      } else {
        toast.error('Deletions Failed', { description: result.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              Materials Master Catalog
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Define fabric weight specifications, weave parameters, yarn strands, accessory codes, and generate variant SKU codes.
          </p>
        </div>

        {isWritable && (
          <Button 
            onClick={handleOpenCreate} 
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-sm hover:shadow-blue-500/20 font-semibold rounded-xl py-2.5 px-4 flex items-center gap-2 cursor-pointer transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Register New Material
          </Button>
        )}
      </div>

      {/* 2. Warehouse Stock Aggregates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Registered Materials', val: stats.totalItems, desc: 'Base catalog cards', icon: Layers, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Total SKU Variants', val: stats.totalSKUs, desc: 'Color/Size combinations', icon: Tag, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Categories Utilized', val: stats.totalCategories, desc: 'Out of 5 operational structures', icon: Info, color: 'text-violet-600 bg-violet-50 border-violet-100' },
          { label: 'Low Stock Alerts', val: stats.lowStockCount, desc: 'Needs procurement attention', icon: AlertTriangle, color: stats.lowStockCount > 0 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-slate-400 bg-slate-50 border-slate-100' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="border-slate-200 bg-white shadow-sm rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                <div className={`p-1.5 rounded-lg border ${stat.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </CardHeader>
              <CardContent className="space-y-0.5">
                <div className="text-xl font-bold text-slate-800">{stat.val}</div>
                <p className="text-[10px] text-slate-400 font-semibold">{stat.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. Search and Navigation Filter Console */}
      <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
        
        {/* Tab Controls */}
        <div className="flex flex-wrap border-b border-slate-100 px-4 py-1.5 bg-slate-50/50 gap-1">
          {[
            { id: 'all', label: 'All Catalog' },
            { id: 'fabric', label: 'Fabrics' },
            { id: 'yarn', label: 'Yarn Strands' },
            { id: 'accessory', label: 'Accessories' },
            { id: 'packaging', label: 'Packaging' },
            { id: 'finished_garment', label: 'Garments' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setExpandedMaterialId(null); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Filter catalog by Material Code, Name or Supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
            />
          </div>
        </div>

        {/* 4. Directory Catalog Table */}
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/30 border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-slate-500 font-bold px-4">Material Details</TableHead>
                  <TableHead className="text-slate-500 font-bold">UOM</TableHead>
                  <TableHead className="text-slate-500 font-bold">Composition & attributes</TableHead>
                  <TableHead className="text-slate-500 font-bold">Supplier Info</TableHead>
                  <TableHead className="text-slate-500 font-bold">Variants Matrix</TableHead>
                  <TableHead className="text-slate-500 font-bold text-right px-4">Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                      No materials found matching the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => {
                    const skus = material.skus || [];
                    const isExpanded = expandedMaterialId === material.id;
                    const stockAlert = skus.some(s => s.alert_on_low_stock && Number(s.quantity_on_hand) <= Number(s.min_stock_level));

                    return (
                      <React.Fragment key={material.id}>
                        {/* Primary Row */}
                        <TableRow className={`border-slate-100 hover:bg-slate-50/30 transition-colors ${isExpanded ? 'bg-slate-50/20' : ''}`}>
                          
                          {/* Row Expansion Button */}
                          <TableCell className="text-center">
                            <button
                              onClick={() => toggleRow(material.id)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </TableCell>

                          {/* Code & Name */}
                          <TableCell className="font-medium px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-800 text-sm truncate">{material.name}</p>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border font-bold capitalize">
                                    {material.category.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <p className="text-xs text-blue-600 font-bold tracking-wider mt-0.5">{material.code}</p>
                              </div>
                            </div>
                          </TableCell>

                          {/* UOM */}
                          <TableCell>
                            <span className="text-xs font-semibold text-slate-600">
                              {UOM_LABELS[material.uom]}
                            </span>
                          </TableCell>

                          {/* Attributes Summary */}
                          <TableCell className="max-w-[220px]">
                            <div className="space-y-0.5">
                              {material.composition && (
                                <p className="text-xs text-slate-700 font-semibold truncate" title={material.composition}>
                                  {material.composition}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                {material.weight_gsm && (
                                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[9px] py-0 px-1 font-medium border border-slate-200/50">
                                    <Scale className="w-2.5 h-2.5 mr-0.5" /> {material.weight_gsm} GSM
                                  </Badge>
                                )}
                                {material.width_inches && (
                                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[9px] py-0 px-1 font-medium border border-slate-200/50">
                                    <Ruler className="w-2.5 h-2.5 mr-0.5" /> {Number(material.width_inches)} in
                                  </Badge>
                                )}
                                {material.yarn_count && (
                                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[9px] py-0 px-1 font-medium border border-slate-200/50">
                                    Count: {material.yarn_count}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Supplier */}
                          <TableCell>
                            {material.supplier_name ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                <Truck className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate max-w-[120px]" title={material.supplier_name}>
                                  {material.supplier_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Not set</span>
                            )}
                          </TableCell>

                          {/* Variants metrics */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-blue-50 border border-blue-100 text-blue-600 font-bold text-xs">
                                {skus.length} variants
                              </Badge>
                              {stockAlert && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold py-0 flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Low Stock
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Action Options */}
                          <TableCell className="text-right px-4">
                            <div className="flex items-center justify-end gap-1">
                              {isWritable ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEdit(material)}
                                    className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl"
                                    title="Edit specifications"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteSubmit(material.id, material.code)}
                                    className="h-8 w-8 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl"
                                    title="Delete catalog entry"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-400 italic">Read-only</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Collapsible SKU Matrix Row */}
                        {isExpanded && (
                          <TableRow className="bg-slate-50/30 border-slate-100 hover:bg-transparent">
                            <TableCell colSpan={7} className="p-4 border-slate-100">
                              <div className="border border-slate-200/80 rounded-2xl bg-white p-4 shadow-sm space-y-3 slide-in-from-top-1 duration-200">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-blue-700" />
                                    SKU Variants Matrix ({skus.length} variations)
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-semibold italic">
                                    Automatically generated based on color/size specifications
                                  </p>
                                </div>

                                {skus.length === 0 ? (
                                  <p className="text-xs text-slate-400 font-semibold text-center py-4">
                                    No variants registered for this material.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader className="bg-slate-50/50">
                                        <TableRow className="border-slate-100">
                                          <TableHead className="text-[10px] font-bold text-slate-500 py-1.5">SKU Variant Code</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 py-1.5">Color Option</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 py-1.5">Size Tag</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 py-1.5 text-center">On Hand</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 py-1.5 text-center">Allocated</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 py-1.5 text-center">Available Stock</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 py-1.5 text-center">Safety Limit</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 py-1.5 text-right">Alert Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {skus.map((sku) => {
                                          const hand = Number(sku.quantity_on_hand);
                                          const allocated = Number(sku.quantity_allocated);
                                          const available = hand - allocated;
                                          const min = Number(sku.min_stock_level);
                                          const lowStock = sku.alert_on_low_stock && hand <= min;

                                          return (
                                            <TableRow key={sku.id} className="border-slate-100 hover:bg-slate-50/30 text-xs">
                                              <TableCell className="font-bold text-slate-700 tracking-wider font-sans">{sku.sku_code}</TableCell>
                                              <TableCell className="font-medium text-slate-650">{sku.color}</TableCell>
                                              <TableCell><Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold bg-slate-50 border-slate-200">{sku.size}</Badge></TableCell>
                                              <TableCell className="font-bold text-slate-800 text-center">{hand.toFixed(1)}</TableCell>
                                              <TableCell className="font-semibold text-slate-500 text-center">{allocated.toFixed(1)}</TableCell>
                                              <TableCell className={`font-bold text-center ${available > min ? 'text-blue-700' : 'text-slate-850'}`}>
                                                {available.toFixed(1)}
                                              </TableCell>
                                              <TableCell className="font-semibold text-slate-400 text-center">{min.toFixed(0)}</TableCell>
                                              <TableCell className="text-right">
                                                {lowStock ? (
                                                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-bold py-0 leading-none">
                                                    CRITICAL ALERT
                                                  </Badge>
                                                ) : (
                                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] font-bold py-0 leading-none">
                                                    SAFE LEVELS
                                                  </Badge>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
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
        </CardContent>
      </Card>

      {/* 5. Dialog: Register New Material Wizard */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 max-w-3xl rounded-xl shadow-sm relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-150 px-2 py-0.5 rounded-full">
                  STEP {step} OF 3
                </span>
                {step > 1 && (
                  <button 
                    type="button" 
                    onClick={() => setStep(prev => (prev - 1) as any)} 
                    className="text-xs text-slate-400 hover:text-slate-700 flex items-center font-bold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-0.5" /> Back
                  </button>
                )}
              </div>
              <DialogTitle className="text-xl text-slate-800 font-bold flex items-center gap-2 mt-1">
                <Plus className="w-5 h-5 text-blue-600" />
                Register New Stock Material
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Set catalog profiles, weaving specs, and auto-provision SKU variants in a single safe database entry.
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: Base Specs */}
            {step === 1 && (
              <div className="space-y-4 py-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="code" className="text-slate-700 font-semibold">Catalog Code</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="e.g. FAB-COT-01"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-slate-700 font-semibold">Display Title Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g. Cotton Weave Jersey"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-slate-700 font-semibold">Material Structure Category</Label>
                    <Select value={category} onValueChange={(val) => { if (val) setCategory(val as MaterialCategory); }}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-800 rounded-xl">
                        <SelectItem value="fabric">Fabric Materials</SelectItem>
                        <SelectItem value="yarn">Yarn Strands</SelectItem>
                        <SelectItem value="accessory">Garment Accessories</SelectItem>
                        <SelectItem value="packaging">Packaging Materials</SelectItem>
                        <SelectItem value="finished_garment">Finished Garment SKU</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="uom" className="text-slate-700 font-semibold">Unit of Measure (UOM)</Label>
                    <Select value={uom} onValueChange={(val) => { if (val) setUom(val as MaterialUom); }}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl">
                        <SelectValue placeholder="Select UOM" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-800 rounded-xl">
                        <SelectItem value="rolls">Rolls (rl)</SelectItem>
                        <SelectItem value="yards">Yards (yd)</SelectItem>
                        <SelectItem value="meters">Meters (m)</SelectItem>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="supplier" className="text-slate-700 font-semibold">Primary Supplier Partner</Label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="supplier"
                      type="text"
                      placeholder="e.g. Apex Textiles Ltd."
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="pl-10 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-slate-700 font-semibold">Internal Catalog Description</Label>
                  <Input
                    id="desc"
                    type="text"
                    placeholder="Provide description details for procurement logs..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Attribute Specs */}
            {step === 2 && (
              <div className="space-y-4 py-3 min-h-[220px]">
                <div className="p-3 bg-slate-50 rounded-2xl text-xs font-semibold text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  Showing attributes customized specifically for category: <strong className="text-slate-800 uppercase">{category.replace('_', ' ')}</strong>.
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="composition" className="text-slate-700 font-semibold">Material Composition Blend</Label>
                    <Input
                      id="composition"
                      type="text"
                      placeholder="e.g. 100% Organic Cotton or 60% Cotton 40% Polyester"
                      value={composition}
                      onChange={(e) => setComposition(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                    />
                  </div>

                  {category === 'fabric' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="gsm" className="text-slate-700 font-semibold">Fabric Weight (GSM)</Label>
                        <Input
                          id="gsm"
                          type="number"
                          value={weightGsm}
                          onChange={(e) => setWeightGsm(Number(e.target.value))}
                          className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                          min={20}
                          max={900}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="width" className="text-slate-700 font-semibold">Fabric Width (inches)</Label>
                        <Input
                          id="width"
                          type="number"
                          value={widthInches}
                          onChange={(e) => setWidthInches(Number(e.target.value))}
                          className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                          min={1}
                          max={200}
                        />
                      </div>
                    </div>
                  )}

                  {category === 'yarn' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="yarn" className="text-slate-700 font-semibold">Yarn Count Thickness</Label>
                      <Input
                        id="yarn"
                        type="text"
                        placeholder="e.g. 30s/1, 40s/2, 20/1 carded"
                        value={yarnCount}
                        onChange={(e) => setYarnCount(e.target.value)}
                        className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Variants Generator */}
            {step === 3 && (
              <div className="space-y-4 py-3">
                <div className="p-3 bg-slate-50 rounded-2xl text-xs font-semibold text-slate-600 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  Auto-generate distinct SKU variation cards below:
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="colors" className="text-slate-700 font-semibold">Color Variations (comma-separated)</Label>
                    <Input
                      id="colors"
                      type="text"
                      placeholder="e.g. Navy, Crimson, Black, Heather Grey"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Leave empty to auto-assign a single standard variation.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sizes" className="text-slate-700 font-semibold">Size Variations (comma-separated)</Label>
                    <Input
                      id="sizes"
                      type="text"
                      placeholder="e.g. M, L, XL, XXL"
                      value={sizeInput}
                      onChange={(e) => setSizeInput(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Leave empty to auto-assign a single free-size variation.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="min-stock" className="text-slate-700 font-semibold">Safety Min Stock Level</Label>
                      <Input
                        id="min-stock"
                        type="number"
                        value={minStockLevel}
                        onChange={(e) => setMinStockLevel(Number(e.target.value))}
                        className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                        min={0}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 self-end">
                      <Label htmlFor="alert-low" className="text-slate-705 font-semibold cursor-pointer">Low Stock Alerts</Label>
                      <Switch
                        id="alert-low"
                        checked={alertOnLowStock}
                        onCheckedChange={setAlertOnLowStock}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="border-t border-slate-200 pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
              >
                Discard
              </Button>
              
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={() => setStep(prev => (prev + 1) as any)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-2 px-4 cursor-pointer"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md hover:shadow-blue-700/10 transition-all rounded-xl py-2 px-4 cursor-pointer"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Provisioning SKUs...
                    </>
                  ) : (
                    'Provision Stock Material'
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Dialog: Edit Material Specifications */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 max-w-3xl rounded-xl shadow-sm relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
          <form onSubmit={handleEditSubmit}>
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl text-slate-800 font-bold flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-700" />
                Modify Catalog Details: {selectedMaterial?.code}
              </DialogTitle>
              <DialogDescription className="text-slate-550 font-medium">
                Update base descriptions, supplier allocations, or physical weaving specifications.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-slate-705 font-semibold">Display Title Name</Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-supplier" className="text-slate-705 font-semibold">Supplier Partner</Label>
                <Input
                  id="edit-supplier"
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-composition" className="text-slate-750 font-semibold">Blend Composition</Label>
                <Input
                  id="edit-composition"
                  type="text"
                  value={composition}
                  onChange={(e) => setComposition(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                />
              </div>

              {selectedMaterial?.category === 'fabric' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-gsm" className="text-slate-705 font-semibold">Fabric Weight (GSM)</Label>
                    <Input
                      id="edit-gsm"
                      type="number"
                      value={weightGsm}
                      onChange={(e) => setWeightGsm(Number(e.target.value))}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-width" className="text-slate-705 font-semibold">Width (inches)</Label>
                    <Input
                      id="edit-width"
                      type="number"
                      value={widthInches}
                      onChange={(e) => setWidthInches(Number(e.target.value))}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {selectedMaterial?.category === 'yarn' && (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-yarn" className="text-slate-705 font-semibold">Yarn Count</Label>
                  <Input
                    id="edit-yarn"
                    type="text"
                    value={yarnCount}
                    onChange={(e) => setYarnCount(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="edit-desc" className="text-slate-705 font-semibold">Internal Description</Label>
                <Input
                  id="edit-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-200 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md hover:shadow-blue-700/10 transition-all rounded-xl py-2 px-4 cursor-pointer"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Synchronizing Specs...
                  </>
                ) : (
                  'Synchronize Specifications'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
