# Rosebally Inventory ERP System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Netlify-blue?style=for-the-badge)](https://your-netlify-url-here.netlify.app) <!-- Update your URL here when ready -->

A modern, high-performance, real-time warehouse and raw materials inventory management platform designed specifically for the garment manufacturing sector. Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL & Realtime)**.

The system features a premium, light-mode design language inspired by modern enterprise software (like Linear and Notion) prioritizing clean grids, high-readability typography, and soft visual structures for zero eye strain.

---

## 🚀 Key Modules & Features

### 1. Unified Operations Dashboard
- **KPI Metrics**: Real-time indicators of Total Stock Value, Active Purchase Orders, Inward Shipments, and Outward Deliveries.
- **Data Visualizations**: Beautiful, lightweight charts displaying weekly inward vs. outward material flows and categorized stock distribution.
- **Critical Alerts**: Real-time warnings for low-stock materials and pending PO deadlines.

### 2. Material Registration & Spec Management
- Register raw materials (Fabric, Sewing Thread, Zipper, Button, etc.) with detailed specifications (Unit of Measure, Minimum Alert Quantity, Rack Locations).
- Update and manage existing specifications instantly via smooth, center-aligned edit modals.

### 3. Real-Time Inward & Outward Logs
- **Inward Receiving**: Log incoming supplier materials, automatically update Supabase inventory levels, and track batch dates.
- **Outward Requisition**: Authorize stock issuance to production floors. Features real-time deductions and validation to prevent over-allocation.

### 4. Purchase Order (PO) Tracking
- Log supplier Purchase Orders with estimated delivery dates, tracking status (`Draft`, `Ordered`, `Partial`, `Completed`), and unit price data.
- Streamlines production planning by bridging procurement directly with stock intake.

### 5. Role-Based Account Provisioning
- Administrative user console to securely register and activate new operational accounts.
- Pre-configured, granular role access dropdowns (`Warehouse Manager`, `Production Lead`, `Admin`) designed for proper audit and log trail logging.

### 6. Interactive Filterable Reports
- Clean tabular audit logs of Materials, Inward shipments, and Outward requisitions.
- Complete data searching, status filtering, and sorting utilities for quick audit checks.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & React Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase PostgreSQL](https://supabase.com/) with Row-Level Security (RLS)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Core Typography**: [Inter Font](https://fonts.google.com/specimen/Inter)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 💻 Getting Started (Local Setup)

### 1. Clone & Install
```bash
git clone https://github.com/ariandesu/ERP--Demo-For-Roasebally.git
cd ERP--Demo-For-Roasebally
npm install
```

### 2. Configure Environment Variables
Create a local environment file by copying the template:
```bash
cp .env.local.example .env.local
```
Open `.env.local` and insert your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Setup Database Schema
Execute the schema script located in `supabase_schema.sql` directly inside your **Supabase SQL Editor** to create the necessary tables, columns, indexes, and relations:
- `materials`
- `inward_logs`
- `outward_logs`
- `purchase_orders`
- `profiles` (User Management)

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your browser.

---

## ☁️ Deploying on Netlify

This application is fully optimized to be hosted serverlessly on Netlify using the Next.js Runtime adapter.

### Step 1: Connect Repository to Netlify
1. Log in to your [Netlify Dashboard](https://app.netlify.com/).
2. Select **Add new site** > **Import an existing project**.
3. Link your GitHub account and select `ERP--Demo-For-Roasebally`.

### Step 2: Build Settings
Netlify will automatically detect Next.js. Verify the configuration settings:
- **Build command**: `npm run build`
- **Publish directory**: `.next`

### Step 3: Configure Environment Variables
Go to **Site Settings** > **Environment variables** and add the variables from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Deploy
Click **Deploy site**. Netlify will build and spin up the production build of your Next.js application!
Once deployed, remember to update the placeholder URL badge at the top of this `README.md` with your official Netlify live URL.
