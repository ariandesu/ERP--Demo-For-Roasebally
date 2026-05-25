export type UserRole = 'super_admin' | 'admin' | 'warehouse_manager' | 'staff' | 'viewer';
export type UserStatus = 'active' | 'inactive';

export interface UserPermissions {
  dashboard_access: boolean;
  materials_access: boolean;
  goods_inward_access: boolean;
  goods_outward_access: boolean;
  reports_access: boolean;
  purchase_orders_access: boolean;
  analytics_access: boolean;
  settings_access: boolean;
  user_management_access: boolean;
}

export interface UserProfile extends UserPermissions {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  warehouse_access: string[];
  created_at: string;
  updated_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  warehouse_manager: 'Warehouse Manager',
  staff: 'Staff',
  viewer: 'Viewer',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  admin: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  warehouse_manager: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  staff: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  viewer: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

// ==========================================
// MATERIALS MASTER OPERATIONS TYPES
// ==========================================

export type MaterialCategory = 'fabric' | 'yarn' | 'accessory' | 'packaging' | 'finished_garment';
export type MaterialUom = 'yards' | 'meters' | 'kg' | 'pcs' | 'rolls';

export interface SKU {
  id: string;
  material_id: string;
  sku_code: string;
  color: string;
  size: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  min_stock_level: number;
  alert_on_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  category: MaterialCategory;
  uom: MaterialUom;
  description?: string;
  supplier_name?: string;
  
  // Attributes (category-specific)
  composition?: string;
  weight_gsm?: number;
  width_inches?: number;
  yarn_count?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Relations
  skus?: SKU[];
}

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  fabric: 'Fabric Materials',
  yarn: 'Yarn Stock',
  accessory: 'Garment Accessories',
  packaging: 'Packaging Master',
  finished_garment: 'Finished Garment SKUs',
};

export const UOM_LABELS: Record<MaterialUom, string> = {
  yards: 'Yards (yd)',
  meters: 'Meters (m)',
  kg: 'Kilograms (kg)',
  pcs: 'Pieces (pcs)',
  rolls: 'Rolls (rl)',
};

// ==========================================
// GOODS INWARD OPERATIONS TYPES
// ==========================================

export type QualityCheckStatus = 'passed' | 'quarantine' | 'failed';

export interface InwardItem {
  id: string;
  inward_id: string;
  sku_id: string;
  lot_number: string;
  quantity_received: number;
  unit_price?: number;
  quality_status: QualityCheckStatus;
  remarks?: string;
  created_at: string;
  
  // Joins
  sku?: SKU;
  material?: Material;
}

export interface InwardShipment {
  id: string;
  inward_code: string;
  supplier_name: string;
  invoice_no?: string;
  warehouse_id: string;
  received_date: string;
  created_at: string;
  updated_at: string;
  received_by?: string;
  
  // Relations
  items?: InwardItem[];
}

// ==========================================
// GOODS OUTWARD OPERATIONS TYPES
// ==========================================

export interface OutwardItem {
  id: string;
  outward_id: string;
  sku_id: string;
  lot_number: string;
  quantity_dispatched: number;
  remarks?: string;
  created_at: string;
  
  // Joins
  sku?: SKU;
  material?: Material;
}

export interface OutwardShipment {
  id: string;
  outward_code: string;
  customer_name: string;
  order_no?: string;
  warehouse_id: string;
  dispatched_date: string;
  created_at: string;
  updated_at: string;
  dispatched_by?: string;
  
  // Relations
  items?: OutwardItem[];
}

// ==========================================
// PURCHASE ORDERS OPERATIONS TYPES
// ==========================================

export type PurchaseOrderStatus = 'draft' | 'pending' | 'completed' | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  sku_id: string;
  quantity_ordered: number;
  unit_price: number;
  quantity_received: number;
  created_at: string;
  
  // Joins
  sku?: SKU;
  material?: Material;
}

export interface PurchaseOrder {
  id: string;
  po_code: string;
  supplier_name: string;
  order_date: string;
  delivery_date?: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Relations
  items?: PurchaseOrderItem[];
}



