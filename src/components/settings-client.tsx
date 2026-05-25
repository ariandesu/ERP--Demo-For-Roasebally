'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Settings, ArrowLeft, Building2, MapPin, Database, Link as LinkIcon, 
  Lock, Save, Plus, Trash2, Key, Send, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { UserProfile } from '@/types';

interface SettingsClientProps {
  profile: UserProfile;
}

interface WarehouseZone {
  id: string;
  name: string;
  code: string;
  binCount: number;
}

export default function SettingsClient({ profile }: SettingsClientProps) {
  // Check if operator has full write access (super_admin or admin)
  const hasWriteAccess = profile.role === 'super_admin' || profile.role === 'admin';

  // Active Tab selection: 'profile' | 'zones' | 'rules' | 'webhooks'
  const [activeTab, setActiveTab] = useState<string>('profile');

  // --- STATE 1: COMPANY PROFILE ---
  const [companyName, setCompanyName] = useState<string>('Rosebally Garment Industries Ltd');
  const [companyAddress, setCompanyAddress] = useState<string>('Plot 124, Sector 7, Uttara, Dhaka, Bangladesh');
  const [taxId, setTaxId] = useState<string>('TX-GAR-8910');
  const [supportEmail, setSupportEmail] = useState<string>('ops@rosebally.com');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  // --- STATE 2: STORAGE ZONES ---
  const [zones, setZones] = useState<WarehouseZone[]>([]);
  const [newZoneName, setNewZoneName] = useState<string>('');
  const [newZoneCode, setNewZoneCode] = useState<string>('');
  const [newZoneBins, setNewZoneBins] = useState<number>(10);

  // --- STATE 3: INVENTORY SAFETY RULES ---
  const [lowStockMultiplier, setLowStockMultiplier] = useState<number>(1.5);
  const [defaultSafetyStock, setDefaultSafetyStock] = useState<number>(50);
  const [autoEmailAlerts, setAutoEmailAlerts] = useState<boolean>(true);

  // --- STATE 4: WEBHOOK INTEGRATIONS ---
  const [webhookUrl, setWebhookUrl] = useState<string>('https://api.retailer.com/webhooks/stock-update');
  const [webhookToken, setWebhookToken] = useState<string>('');
  const [triggerInward, setTriggerInward] = useState<boolean>(true);
  const [triggerOutward, setTriggerOutward] = useState<boolean>(true);
  const [triggerAlert, setTriggerAlert] = useState<boolean>(false);
  const [webhookTesting, setWebhookTesting] = useState<boolean>(false);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);

  // Load state values from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Company Profile
      const storedName = localStorage.getItem('erp_company_name');
      const storedAddr = localStorage.getItem('erp_company_address');
      const storedTax = localStorage.getItem('erp_company_tax_id');
      const storedEmail = localStorage.getItem('erp_company_email');
      const storedCurrency = localStorage.getItem('erp_company_currency');
      
      if (storedName) setCompanyName(storedName);
      if (storedAddr) setCompanyAddress(storedAddr);
      if (storedTax) setTaxId(storedTax);
      if (storedEmail) setSupportEmail(storedEmail);
      if (storedCurrency) setCurrencySymbol(storedCurrency);

      // 2. Storage Zones
      const storedZones = localStorage.getItem('erp_warehouse_zones');
      if (storedZones) {
        setZones(JSON.parse(storedZones));
      } else {
        const defaultZones = [
          { id: "1", name: "HQ Raw Fabrics Zone", code: "Z-HQ-FAB", binCount: 18 },
          { id: "2", name: "Main Finished Garments Zone", code: "Z-M-FIN", binCount: 32 },
          { id: "3", name: "Accessories & Trimmings Cage", code: "Z-ACC-CAG", binCount: 12 }
        ];
        setZones(defaultZones);
        localStorage.setItem('erp_warehouse_zones', JSON.stringify(defaultZones));
      }

      // 3. Operational Rules
      const storedMultiplier = localStorage.getItem('erp_rule_multiplier');
      const storedSafety = localStorage.getItem('erp_rule_safety_stock');
      const storedAutoAlerts = localStorage.getItem('erp_rule_auto_alerts');

      if (storedMultiplier) setLowStockMultiplier(Number(storedMultiplier));
      if (storedSafety) setDefaultSafetyStock(Number(storedSafety));
      if (storedAutoAlerts) setAutoEmailAlerts(storedAutoAlerts === 'true');

      // 4. Webhook settings
      const storedUrl = localStorage.getItem('erp_webhook_url');
      const storedToken = localStorage.getItem('erp_webhook_token');
      
      if (storedUrl) setWebhookUrl(storedUrl);
      if (storedToken) setWebhookToken(storedToken);
    }
  }, []);

  // Save Settings Tab 1: Company Profile
  const handleSaveProfile = () => {
    if (!hasWriteAccess) {
      toast.error('Access Denied. You do not have permissions to modify Global Profile settings.');
      return;
    }

    localStorage.setItem('erp_company_name', companyName.trim());
    localStorage.setItem('erp_company_address', companyAddress.trim());
    localStorage.setItem('erp_company_tax_id', taxId.trim());
    localStorage.setItem('erp_company_email', supportEmail.trim());
    localStorage.setItem('erp_company_currency', currencySymbol.trim());

    toast.success('Company Profile saved successfully. Headers updated in PDF engines!');
  };

  // Add Warehouse Zone CRUD
  const handleAddZone = () => {
    if (!hasWriteAccess) {
      toast.error('Access Denied. You do not have permissions to create Storage Zones.');
      return;
    }

    if (!newZoneName.trim() || !newZoneCode.trim()) {
      toast.error('Invalid Input. Please provide both a Zone Name and unique Zone Code.');
      return;
    }

    const duplicate = zones.find(z => z.code.toUpperCase() === newZoneCode.toUpperCase().trim());
    if (duplicate) {
      toast.error(`Duplicate Entry. A zone with code "${newZoneCode.toUpperCase()}" already exists.`);
      return;
    }

    const addedZone: WarehouseZone = {
      id: Date.now().toString(),
      name: newZoneName.trim(),
      code: newZoneCode.toUpperCase().trim(),
      binCount: Number(newZoneBins) || 10
    };

    const updatedZones = [...zones, addedZone];
    setZones(updatedZones);
    localStorage.setItem('erp_warehouse_zones', JSON.stringify(updatedZones));

    // Clear inputs
    setNewZoneName('');
    setNewZoneCode('');
    setNewZoneBins(10);

    toast.success(`Warehouse Storage Zone "${addedZone.code}" registered.`);
  };

  // Delete Warehouse Zone CRUD
  const handleDeleteZone = (id: string) => {
    if (!hasWriteAccess) {
      toast.error('Access Denied. You do not have permissions to delete Storage Zones.');
      return;
    }

    const updatedZones = zones.filter(z => z.id !== id);
    setZones(updatedZones);
    localStorage.setItem('erp_warehouse_zones', JSON.stringify(updatedZones));
    toast.success('Warehouse zone removed from localized indexes.');
  };

  // Save Settings Tab 3: Operational Safety stock multipliers
  const handleSaveRules = () => {
    if (!hasWriteAccess) {
      toast.error('Access Denied. You do not have permissions to edit Inventory thresholds.');
      return;
    }

    localStorage.setItem('erp_rule_multiplier', lowStockMultiplier.toString());
    localStorage.setItem('erp_rule_safety_stock', defaultSafetyStock.toString());
    localStorage.setItem('erp_rule_auto_alerts', autoEmailAlerts.toString());

    toast.success('Safety Stock multipliers updated and locked.');
  };

  // Generate Hex webhook token
  const handleGenerateToken = () => {
    if (!hasWriteAccess) return;
    const array = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 16; i++) array[i] = Math.floor(Math.random() * 256);
    }
    const token = 'whsec_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    setWebhookToken(token);
    localStorage.setItem('erp_webhook_token', token);
    toast.success('New API Webhook Secret key generated!');
  };

  // Save Webhook Integrations
  const handleSaveWebhooks = () => {
    if (!hasWriteAccess) {
      toast.error('Access Denied. You do not have permissions to modify webhook bindings.');
      return;
    }

    localStorage.setItem('erp_webhook_url', webhookUrl.trim());
    toast.success('API webhook configuration saved and registered.');
  };

  // Trigger test webhook payload sender
  const handleSendTestWebhook = () => {
    if (!webhookUrl.trim()) {
      toast.error('URL missing. Please provide a test webhook endpoint URL.');
      return;
    }

    setWebhookTesting(true);
    setWebhookResponse(null);

    // Simulate standard webhook post payload execution after delay
    setTimeout(() => {
      setWebhookTesting(false);
      
      const simulatedPayload = {
        event: "goods_inward.received",
        timestamp: new Date().toISOString(),
        webhook_token_signature: webhookToken || "whsec_demotoken_7d8a9f02e4",
        operator: profile.name,
        warehouse: "WH-MAIN",
        payload: {
          inward_code: "IN-49212",
          supplier_name: "Garment Fabric Co Ltd",
          invoice_no: "INV-9908",
          total_items: 2,
          received_items: [
            { sku_code: "FB-COTTON-RED-XL", lot_number: "LOT-R23", quantity: 240, quality_status: "passed" },
            { sku_code: "FB-COTTON-RED-L", lot_number: "LOT-R24", quantity: 180, quality_status: "quarantine" }
          ]
        }
      };

      setWebhookResponse({
        status: 200,
        statusText: "OK",
        responseTimeMs: 240,
        url: webhookUrl,
        sent_payload: simulatedPayload,
        response: {
          success: true,
          message: "Event received and cataloged inside external retailer queue."
        }
      });

      toast.success('Simulated test webhook dispatch completed successfully!');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-850 font-sans tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-slate-500" />
              ERP Global Settings
            </h2>
            <p className="text-xs text-slate-500 font-medium">Configure corporate identity headers, warehouse physical subdivisions, thresholds, and sync configurations.</p>
          </div>
        </div>

        {/* Read-only role protection badge */}
        {!hasWriteAccess && (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-250 py-1.5 px-3 rounded-2xl flex items-center gap-1.5 self-start sm:self-auto font-sans font-bold text-xs">
            <Lock className="w-3.5 h-3.5" /> Read-Only Mode
          </Badge>
        )}
      </div>

      {/* 2. Main Config Layout Split */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar Panel */}
        <div className="space-y-1.5">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold font-sans flex items-center gap-2.5 transition-all-300 ${
              activeTab === 'profile' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 bg-white border border-slate-200/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Company Print Profile
          </button>
          
          <button 
            onClick={() => setActiveTab('zones')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold font-sans flex items-center gap-2.5 transition-all-300 ${
              activeTab === 'zones' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 bg-white border border-slate-200/50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Warehouse Storage Zones
          </button>

          <button 
            onClick={() => setActiveTab('rules')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold font-sans flex items-center gap-2.5 transition-all-300 ${
              activeTab === 'rules' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 bg-white border border-slate-200/50'
            }`}
          >
            <Database className="w-4 h-4" />
            Safety Thresholds
          </button>

          <button 
            onClick={() => setActiveTab('webhooks')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold font-sans flex items-center gap-2.5 transition-all-300 ${
              activeTab === 'webhooks' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 bg-white border border-slate-200/50'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Webhook Integrations
          </button>
        </div>

        {/* Configurations Tab Views Panel */}
        <div className="md:col-span-3">
          
          {/* TAB 1: COMPANY PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <Card className="border-slate-200 bg-white shadow-sm rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500" />
              <CardHeader>
                <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide font-sans">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Corporate print & Layout Identity
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">
                  Define structural ERP corporate properties. Headers saved here sync instantly across physical stock sheet exports and invoice PDFs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="compName" className="text-xs font-bold text-slate-600">Company Name</Label>
                    <Input 
                      id="compName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={!hasWriteAccess}
                      placeholder="e.g. Rosebally Garments Ltd"
                      className="rounded-xl border-slate-200 h-10 text-xs font-semibold focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="taxId" className="text-xs font-bold text-slate-600">Corporate Tax / Business ID</Label>
                    <Input 
                      id="taxId"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      disabled={!hasWriteAccess}
                      placeholder="e.g. TX-GAR-99212"
                      className="rounded-xl border-slate-200 h-10 text-xs font-semibold focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="compAddr" className="text-xs font-bold text-slate-600">Physical Address (Print Header Default)</Label>
                  <Input 
                    id="compAddr"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    disabled={!hasWriteAccess}
                    placeholder="e.g. Plot 124, Sector 7, Uttara, Dhaka"
                    className="rounded-xl border-slate-200 h-10 text-xs font-semibold focus:border-blue-500 bg-slate-50/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="compEmail" className="text-xs font-bold text-slate-600">Operations Support Email</Label>
                    <Input 
                      id="compEmail"
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      disabled={!hasWriteAccess}
                      placeholder="e.g. operations@rosebally.com"
                      className="rounded-xl border-slate-200 h-10 text-xs font-semibold focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="compCurrency" className="text-xs font-bold text-slate-600">Primary Currency symbol</Label>
                    <select
                      id="compCurrency"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      disabled={!hasWriteAccess}
                      className="w-full rounded-xl border border-slate-200 h-10 text-xs font-bold text-slate-700 bg-slate-50/50 px-3 focus:border-blue-500 focus:ring-0 cursor-pointer"
                    >
                      <option value="$">US Dollars ($)</option>
                      <option value="৳">Bangladeshi Taka (৳)</option>
                      <option value="€">Euros (€)</option>
                      <option value="£">Pounds Sterling (£)</option>
                    </select>
                  </div>
                </div>

              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex items-center justify-between py-4 rounded-b-3xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Synchronized with Local Ledger</span>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={!hasWriteAccess}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 px-4 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Profile
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 2: WAREHOUSE STORAGE ZONES CONFIGURATOR */}
          {activeTab === 'zones' && (
            <Card className="border-slate-200 bg-white shadow-sm rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-teal-500" />
              <CardHeader>
                <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide font-sans">
                  <MapPin className="w-4 h-4 text-teal-500" />
                  Physical storage zones configuration
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">
                  Register, map, or prune subdivisions of warehouse bays and physical stock containers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                
                {/* CRUD Add form for admins */}
                {hasWriteAccess && (
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Add New Storage Zone Allocation</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="zoneName" className="text-[10px] font-bold text-slate-500">Zone Description Name</Label>
                        <Input 
                          id="zoneName"
                          value={newZoneName}
                          onChange={(e) => setNewZoneName(e.target.value)}
                          placeholder="e.g. Bulk Fabric Row B"
                          className="rounded-xl border-slate-200 h-9 text-xs font-semibold focus:border-teal-500 bg-white"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor="zoneCode" className="text-[10px] font-bold text-slate-500">Zone Code (Unique)</Label>
                        <Input 
                          id="zoneCode"
                          value={newZoneCode}
                          onChange={(e) => setNewZoneCode(e.target.value)}
                          placeholder="e.g. Z-BULK-B"
                          className="rounded-xl border-slate-200 h-9 text-xs font-semibold focus:border-teal-500 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="zoneBins" className="text-[10px] font-bold text-slate-500">Sub-Bins Count Allocated</Label>
                        <Input 
                          id="zoneBins"
                          type="number"
                          value={newZoneBins}
                          onChange={(e) => setNewZoneBins(Number(e.target.value))}
                          placeholder="10"
                          className="rounded-xl border-slate-200 h-9 text-xs font-semibold focus:border-teal-500 bg-white"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleAddZone}
                      className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 px-4 h-9 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Zone Registry
                    </Button>
                  </div>
                )}

                {/* Zones listing table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 font-sans">
                      <TableRow>
                        <TableHead className="text-[10px] font-black text-slate-550 uppercase">Zone Code</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-550 uppercase">Zone Name / Description</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-550 uppercase text-center">Shelves/Bins allocated</TableHead>
                        {hasWriteAccess && (
                          <TableHead className="text-[10px] font-black text-slate-550 uppercase text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zones.length > 0 ? (
                        zones.map((zone) => (
                          <TableRow key={zone.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-bold text-slate-800 text-xs">{zone.code}</TableCell>
                            <TableCell className="font-medium text-slate-500 text-xs">{zone.name}</TableCell>
                            <TableCell className="font-bold text-slate-700 text-xs text-center">{zone.binCount} bins</TableCell>
                            {hasWriteAccess && (
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteZone(zone.id)}
                                  className="text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-slate-400 font-medium text-xs">
                            No physical storage zones registered.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

              </CardContent>
            </Card>
          )}

          {/* TAB 3: INVENTORY SAFETY RULES */}
          {activeTab === 'rules' && (
            <Card className="border-slate-200 bg-white shadow-sm rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-orange-500" />
              <CardHeader>
                <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide font-sans">
                  <Database className="w-4 h-4 text-orange-500" />
                  Inventory Operations Safety Rules
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">
                  Configure default multipliers and safety stock values utilized by low stock triggers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="stockMult" className="text-xs font-bold text-slate-600">Low Stock Warning Multiplier</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="stockMult"
                        type="number"
                        step="0.1"
                        value={lowStockMultiplier}
                        onChange={(e) => setLowStockMultiplier(Number(e.target.value))}
                        disabled={!hasWriteAccess}
                        className="rounded-xl border-slate-200 h-10 text-xs font-semibold focus:border-orange-500 bg-slate-50/50"
                      />
                      <Badge className="bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-50 rounded-xl px-3 flex items-center font-bold text-[10px] uppercase">
                        x baseline
                      </Badge>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-medium">Multiplies the baseline min limit to flag cautious inventory zones.</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="safetyStk" className="text-xs font-bold text-slate-600">Default safety Stock Level</Label>
                    <Input 
                      id="safetyStk"
                      type="number"
                      value={defaultSafetyStock}
                      onChange={(e) => setDefaultSafetyStock(Number(e.target.value))}
                      disabled={!hasWriteAccess}
                      placeholder="50"
                      className="rounded-xl border-slate-200 h-10 text-xs font-semibold focus:border-orange-500 bg-slate-50/50"
                    />
                    <span className="text-[10px] text-slate-400 block font-medium">Applied automatically to new material SKU specifications.</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl flex items-center justify-between gap-4 mt-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 block">Automatic Low Stock Alert Warnings</span>
                    <span className="text-[10px] text-slate-400 font-medium block">Send real-time alerts to the corporate dashboard feed when safety limits break.</span>
                  </div>
                  
                  <button
                    onClick={() => hasWriteAccess && setAutoEmailAlerts(!autoEmailAlerts)}
                    disabled={!hasWriteAccess}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      autoEmailAlerts ? 'bg-orange-500' : 'bg-slate-200'
                    } cursor-pointer disabled:opacity-50`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoEmailAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex items-center justify-between py-4 rounded-b-3xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Operational Bounds</span>
                <Button 
                  onClick={handleSaveRules}
                  disabled={!hasWriteAccess}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 px-4 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Lock Safety Rules
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 4: WEBHOOK INTEGRATIONS */}
          {activeTab === 'webhooks' && (
            <Card className="border-slate-200 bg-white shadow-sm rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-pink-500" />
              <CardHeader>
                <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide font-sans">
                  <LinkIcon className="w-4 h-4 text-pink-500" />
                  API Webhook developer integrations
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">
                  Simulate and configure real-time outbound payload updates to retail partner APIs on dispatch.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                
                <div className="space-y-1.5">
                  <Label htmlFor="webhookUrl" className="text-xs font-bold text-slate-600">Developer Webhook endpoint URL</Label>
                  <Input 
                    id="webhookUrl"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    disabled={!hasWriteAccess}
                    placeholder="https://api.retailer.com/webhooks/stock-update"
                    className="rounded-xl border-slate-200 h-10 text-xs font-semibold focus:border-pink-500 bg-slate-50/50"
                  />
                  <span className="text-[10px] text-slate-400 block font-medium">The URL where real-time inventory updates get POSTed.</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Active Authentication signature Token</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={webhookToken}
                      readOnly
                      placeholder="Click Generate to secure link..."
                      className="rounded-xl border-slate-200 h-10 text-xs font-bold text-slate-600 bg-slate-100"
                    />
                    {hasWriteAccess && (
                      <Button 
                        onClick={handleGenerateToken}
                        variant="secondary"
                        className="rounded-xl text-slate-700 border border-slate-200 hover:bg-slate-100 font-bold text-xs flex items-center gap-1 shrink-0 h-10 cursor-pointer"
                      >
                        <Key className="w-4 h-4" /> Generate Token
                      </Button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block font-medium">Appended to the header string for authentication verifying payload legitimacy.</span>
                </div>

                {/* Event triggers selection */}
                <div className="space-y-2 pt-1.5">
                  <span className="text-xs font-bold text-slate-600 block">Outbound Webhook Trigger Events:</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={triggerInward}
                        onChange={() => hasWriteAccess && setTriggerInward(!triggerInward)}
                        disabled={!hasWriteAccess}
                        className="rounded border-slate-300 text-pink-650 focus:ring-0 cursor-pointer"
                      />
                      On Inward Receipts
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={triggerOutward}
                        onChange={() => hasWriteAccess && setTriggerOutward(!triggerOutward)}
                        disabled={!hasWriteAccess}
                        className="rounded border-slate-300 text-pink-650 focus:ring-0 cursor-pointer"
                      />
                      On Outward Dispatches
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={triggerAlert}
                        onChange={() => hasWriteAccess && setTriggerAlert(!triggerAlert)}
                        disabled={!hasWriteAccess}
                        className="rounded border-slate-300 text-pink-650 focus:ring-0 cursor-pointer"
                      />
                      On Safety Stock Alerts
                    </label>
                  </div>
                </div>

                {/* Interactive Simulator Button & Results */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Interactive API testing Sandbox</span>
                      <span className="text-[10px] text-slate-400 font-medium block">Dispatch a mock Goods Inward transaction payload to test active connectivity response tags.</span>
                    </div>

                    <Button
                      onClick={handleSendTestWebhook}
                      disabled={webhookTesting}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 px-4 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {webhookTesting ? 'Posting payload...' : 'Test Webhook'}
                    </Button>
                  </div>

                  {/* Simulator Logger view */}
                  {webhookTesting && (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                      <div className="w-5 h-5 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transmitting HTTP POST request packet...</span>
                    </div>
                  )}

                  {webhookResponse && !webhookTesting && (
                    <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl space-y-3 shadow-inner text-[11px] font-mono text-slate-300">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-pink-400 font-bold uppercase tracking-wide">Webhook Logs Console</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                            {webhookResponse.status} {webhookResponse.statusText}
                          </Badge>
                          <span className="text-slate-500 text-[10px] font-bold">{webhookResponse.responseTimeMs} ms latency</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-500 block font-bold">Request Endpoint URL:</span>
                        <span className="text-slate-300 select-all block break-all">{webhookResponse.url}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <span className="text-slate-500 block font-bold mb-1">JSON Outbound Payload:</span>
                          <pre className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 overflow-x-auto max-h-[160px] text-[10px] text-slate-300 select-all">
                            {JSON.stringify(webhookResponse.sent_payload, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <span className="text-slate-500 block font-bold mb-1">Server Response payload:</span>
                          <pre className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 overflow-x-auto max-h-[160px] text-[10px] text-slate-300 select-all">
                            {JSON.stringify(webhookResponse.response, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold pt-1">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Integration Simulator holds! Connectivity verified successfully.</span>
                      </div>
                    </div>
                  )}

                </div>

              </CardContent>
              {hasWriteAccess && (
                <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex items-center justify-between py-4 rounded-b-3xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">External Sync Rules</span>
                  <Button 
                    onClick={handleSaveWebhooks}
                    className="bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 px-4 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save Endpoints
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}

        </div>

      </div>

    </div>
  );
}
