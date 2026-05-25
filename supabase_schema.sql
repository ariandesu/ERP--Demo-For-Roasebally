-- ==========================================
-- 1. DROP EXISTING OBJECTS (FOR RESET PROTECTION)
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;

-- ==========================================
-- 2. CREATE CUSTOM ENUM TYPES
-- ==========================================
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'warehouse_manager', 'staff', 'viewer');
CREATE TYPE user_status AS ENUM ('active', 'inactive');

-- ==========================================
-- 3. CREATE PUBLIC USER PROFILES TABLE
-- ==========================================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'viewer',
    status user_status NOT NULL DEFAULT 'active',
    warehouse_access TEXT[] DEFAULT '{}', -- Array of warehouses the user is assigned to
    
    -- Fine-grained functional permissions
    dashboard_access BOOLEAN NOT NULL DEFAULT TRUE,
    materials_access BOOLEAN NOT NULL DEFAULT FALSE,
    goods_inward_access BOOLEAN NOT NULL DEFAULT FALSE,
    goods_outward_access BOOLEAN NOT NULL DEFAULT FALSE,
    reports_access BOOLEAN NOT NULL DEFAULT FALSE,
    purchase_orders_access BOOLEAN NOT NULL DEFAULT FALSE,
    analytics_access BOOLEAN NOT NULL DEFAULT FALSE,
    settings_access BOOLEAN NOT NULL DEFAULT FALSE,
    user_management_access BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. DEFINE RLS POLICIES FOR EXTRA SECURITY
-- ==========================================
-- A. Read Access: Users can read their own profiles, while admins can read all profiles
CREATE POLICY "Allow users to read their own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (id = auth.uid());

CREATE POLICY "Allow administrative accounts to read all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('super_admin', 'admin')
        AND profiles.status = 'active'
    )
);

-- B. Write Access: Only administrative users or the server-side service role client can modify profiles
CREATE POLICY "Allow write-access only for service_role and admin roles" 
ON public.profiles FOR ALL 
TO service_role 
USING (true);

-- ==========================================
-- 6. PROGRAMMATIC PROFILE HANDLING NOTE
-- ==========================================
-- Triggers on auth.users are dropped to avoid database-level failures during signup transactions.
-- Operator profile creations and role permissions allocations are executed programmatically
-- inside Next.js Server Actions and seeder scripts for absolute reliability and diagnostic logging.


-- ==========================================
-- 7. CREATE MATERIALS MASTER TABLES
-- ==========================================

-- A. Materials Catalog Table
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'fabric', 'yarn', 'accessory', 'packaging', 'finished_garment'
    uom VARCHAR(20) NOT NULL, -- 'yards', 'meters', 'kg', 'pcs', 'rolls'
    description TEXT,
    supplier_name VARCHAR(255),
    
    -- Category-specific attributes
    composition VARCHAR(255),
    weight_gsm INTEGER,
    width_inches DECIMAL(5,2),
    yarn_count VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- B. SKU Variant Combinations Table
CREATE TABLE IF NOT EXISTS public.skus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(50) NOT NULL,
    size VARCHAR(20) NOT NULL,
    
    -- Inventory levels
    quantity_on_hand DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    quantity_allocated DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    
    -- Low stock alerts settings
    min_stock_level DECIMAL(12,2) DEFAULT 10.00 NOT NULL,
    alert_on_low_stock BOOLEAN DEFAULT TRUE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 8. ENABLE ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ==========================================
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skus ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 9. DEFINE RLS POLICIES
-- ==========================================

-- A. RLS Policies for Materials
DROP POLICY IF EXISTS "Allow reading materials for authorized personnel" ON public.materials;
CREATE POLICY "Allow reading materials for authorized personnel"
ON public.materials FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.materials_access = TRUE
        AND profiles.status = 'active'
    )
);

DROP POLICY IF EXISTS "Allow writes to materials for administrative staff only" ON public.materials;
CREATE POLICY "Allow writes to materials for administrative staff only"
ON public.materials FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.materials_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.materials_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
);

-- B. RLS Policies for SKUs
DROP POLICY IF EXISTS "Allow reading skus for authorized personnel" ON public.skus;
CREATE POLICY "Allow reading skus for authorized personnel"
ON public.skus FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.materials_access = TRUE
        AND profiles.status = 'active'
    )
);

DROP POLICY IF EXISTS "Allow writes to skus for administrative staff only" ON public.skus;
CREATE POLICY "Allow writes to skus for administrative staff only"
ON public.skus FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.materials_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.materials_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
);


-- ==========================================
-- 10. CREATE GOODS INWARD LOGGING TABLES
-- ==========================================

-- A. Goods Inward Shipment Header Table
CREATE TABLE IF NOT EXISTS public.goods_inward (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inward_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. "IN-98124"
    supplier_name VARCHAR(255) NOT NULL,
    invoice_no VARCHAR(100),
    warehouse_id VARCHAR(50) NOT NULL DEFAULT 'WH-MAIN',
    received_date DATE DEFAULT CURRENT_DATE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- B. Goods Inward Shipment Items Table
CREATE TABLE IF NOT EXISTS public.goods_inward_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inward_id UUID REFERENCES public.goods_inward(id) ON DELETE CASCADE NOT NULL,
    sku_id UUID REFERENCES public.skus(id) ON DELETE CASCADE NOT NULL,
    lot_number VARCHAR(100) NOT NULL, -- Dye lot or batch identifier
    quantity_received DECIMAL(12,2) NOT NULL CHECK (quantity_received > 0),
    unit_price DECIMAL(12,2),
    quality_status VARCHAR(50) DEFAULT 'passed' NOT NULL, -- 'passed', 'quarantine', 'failed'
    remarks TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 11. ENABLE ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ==========================================
ALTER TABLE public.goods_inward ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_inward_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 12. DEFINE RLS POLICIES FOR GOODS INWARD
-- ==========================================

-- A. RLS Policies for Goods Inward
DROP POLICY IF EXISTS "Allow reading inward logs for authorized personnel" ON public.goods_inward;
CREATE POLICY "Allow reading inward logs for authorized personnel"
ON public.goods_inward FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_inward_access = TRUE
        AND profiles.status = 'active'
    )
);

DROP POLICY IF EXISTS "Allow writes to inward logs for administrative staff only" ON public.goods_inward;
CREATE POLICY "Allow writes to inward logs for administrative staff only"
ON public.goods_inward FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_inward_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_inward_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
);

-- B. RLS Policies for Inward Items
DROP POLICY IF EXISTS "Allow reading inward items for authorized personnel" ON public.goods_inward_items;
CREATE POLICY "Allow reading inward items for authorized personnel"
ON public.goods_inward_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_inward_access = TRUE
        AND profiles.status = 'active'
    )
);

DROP POLICY IF EXISTS "Allow writes to inward items for administrative staff only" ON public.goods_inward_items;
CREATE POLICY "Allow writes to inward items for administrative staff only"
ON public.goods_inward_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_inward_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_inward_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
);


-- ==========================================
-- 13. CREATE GOODS OUTWARD DISPATCH TABLES
-- ==========================================

-- A. Goods Outward Shipment Header Table
CREATE TABLE IF NOT EXISTS public.goods_outward (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outward_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. "OUT-98124"
    customer_name VARCHAR(255) NOT NULL,       -- Consignee / Retail partner / Client
    order_no VARCHAR(100),                     -- Sales Order / Export Order Ref
    warehouse_id VARCHAR(50) NOT NULL DEFAULT 'WH-MAIN',
    dispatched_date DATE DEFAULT CURRENT_DATE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    dispatched_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- B. Goods Outward Shipment Items Table
CREATE TABLE IF NOT EXISTS public.goods_outward_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outward_id UUID REFERENCES public.goods_outward(id) ON DELETE CASCADE NOT NULL,
    sku_id UUID REFERENCES public.skus(id) ON DELETE CASCADE NOT NULL,
    lot_number VARCHAR(100) NOT NULL, -- Dye lot rolls targeted for dispatch
    quantity_dispatched DECIMAL(12,2) NOT NULL CHECK (quantity_dispatched > 0),
    remarks TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 14. ENABLE ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ==========================================
ALTER TABLE public.goods_outward ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_outward_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 15. DEFINE RLS POLICIES FOR GOODS OUTWARD
-- ==========================================

-- A. RLS Policies for Goods Outward
DROP POLICY IF EXISTS "Allow reading outward logs for authorized personnel" ON public.goods_outward;
CREATE POLICY "Allow reading outward logs for authorized personnel"
ON public.goods_outward FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_outward_access = TRUE
        AND profiles.status = 'active'
    )
);

DROP POLICY IF EXISTS "Allow writes to outward logs for administrative staff only" ON public.goods_outward;
CREATE POLICY "Allow writes to outward logs for administrative staff only"
ON public.goods_outward FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_outward_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_outward_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
);

-- B. RLS Policies for Outward Items
DROP POLICY IF EXISTS "Allow reading outward items for authorized personnel" ON public.goods_outward_items;
CREATE POLICY "Allow reading outward items for authorized personnel"
ON public.goods_outward_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_outward_access = TRUE
        AND profiles.status = 'active'
    )
);

DROP POLICY IF EXISTS "Allow writes to outward items for administrative staff only" ON public.goods_outward_items;
CREATE POLICY "Allow writes to outward items for administrative staff only"
ON public.goods_outward_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_outward_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.goods_outward_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
);


-- ==========================================
-- 16. CREATE PURCHASE ORDERS PROCUREMENT TABLES
-- ==========================================

-- A. Purchase Orders Header Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_code VARCHAR(50) UNIQUE NOT NULL,       -- e.g. "PO-98124"
    supplier_name VARCHAR(255) NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE NOT NULL,
    delivery_date DATE,                       -- Estimated target arrival
    status VARCHAR(50) DEFAULT 'draft' NOT NULL, -- 'draft', 'pending', 'completed', 'cancelled'
    total_amount DECIMAL(12,2) DEFAULT 0.00 NOT NULL CHECK (total_amount >= 0),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- B. Purchase Orders Items Table
CREATE TABLE IF NOT EXISTS public.purchase_orders_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
    sku_id UUID REFERENCES public.skus(id) ON DELETE CASCADE NOT NULL,
    quantity_ordered DECIMAL(12,2) NOT NULL CHECK (quantity_ordered > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity_received DECIMAL(12,2) DEFAULT 0.00 NOT NULL CHECK (quantity_received >= 0),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 17. ENABLE ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ==========================================
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 18. DEFINE RLS POLICIES FOR PURCHASE ORDERS
-- ==========================================

-- A. RLS Policies for Purchase Orders
DROP POLICY IF EXISTS "Allow reading PO logs for authorized personnel" ON public.purchase_orders;
CREATE POLICY "Allow reading PO logs for authorized personnel"
ON public.purchase_orders FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.purchase_orders_access = TRUE
        AND profiles.status = 'active'
    )
);

DROP POLICY IF EXISTS "Allow writes to PO logs for administrative staff only" ON public.purchase_orders;
CREATE POLICY "Allow writes to PO logs for administrative staff only"
ON public.purchase_orders FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.purchase_orders_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.purchase_orders_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
);

-- B. RLS Policies for Purchase Orders Items
DROP POLICY IF EXISTS "Allow reading PO items for authorized personnel" ON public.purchase_orders_items;
CREATE POLICY "Allow reading PO items for authorized personnel"
ON public.purchase_orders_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.purchase_orders_access = TRUE
        AND profiles.status = 'active'
    )
);

DROP POLICY IF EXISTS "Allow writes to PO items for administrative staff only" ON public.purchase_orders_items;
CREATE POLICY "Allow writes to PO items for administrative staff only"
ON public.purchase_orders_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.purchase_orders_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.purchase_orders_access = TRUE
        AND profiles.status = 'active'
        AND profiles.role IN ('super_admin', 'admin', 'warehouse_manager')
    )
);



