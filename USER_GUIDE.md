# Codentra — User Guide

> **Codentra — "Simplicity that Scales"**
> A multi-tenant, subscription-based Inventory Management & Point-of-Sale (POS) platform built on Supabase + Next.js.

This guide covers every screen and every action available to all user types — from a brand-new cashier ringing up a sale to a Tenant Admin managing the workspace, to the Platform Super Admin monitoring every tenant.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Getting Started](#2-getting-started)
3. [Roles & Permissions](#3-roles--permissions)
4. [The Dashboard](#4-the-dashboard)
5. [Settings](#5-settings)
6. [Inventory](#6-inventory)
7. [Stock Movements (Ledger)](#7-stock-movements-ledger)
8. [Production (Bills of Materials)](#8-production-bills-of-materials)
9. [Purchase Orders](#9-purchase-orders)
10. [Suppliers](#10-suppliers)
11. [Point of Sale (POS)](#11-point-of-sale-pos)
12. [Cash Management](#12-cash-management)
13. [Alerts](#13-alerts)
14. [Reports](#14-reports)
15. [Users](#15-users)
16. [Billing & Subscription Plans](#16-billing--subscription-plans)
17. [Platform / Tenant Monitor (Super Admin)](#17-platform--tenant-monitor-super-admin)
18. [Multi-Tenancy & Audit](#18-multi-tenancy--audit)
19. [Deletion Approval Workflow](#19-deletion-approval-workflow)
20. [FAQ & Troubleshooting](#20-faq--troubleshooting)

---

## 1. System Overview

Codentra is organized around a **Tenant** (a single business / workspace). Each tenant gets an isolated dataset (products, sales, users, suppliers, stock movements) enforced by Row-Level Security (RLS) — one tenant can never see another's data.

A tenant manages three core record groups:

| Group | What it is |
|-------|-------------|
| **Catalog** | Categories, Units of Measure, Locations, Suppliers, Products |
| **Operations** | Inventory, Stock Movements, Production, Purchase Orders, POS sales |
| **People** | Users (team members with roles), Cash shifts, Audit logs |

Codentra is **flexible for any business type**: Coffee Shop, Convenience Store, Manufacturing, Restaurant, Retail, Pharmacy, or General. Each type ships sensible starter categories and a shared set of units of measure on signup.

Key concepts you'll see everywhere:

- **SKU / Item Code** — your unique product identifier (e.g. `COF001`).
- **FIFO Lots** — stock is tracked in receiving batches (first-in, first-out). This keeps cost of goods sold accurate.
- **Reorder Point** — when on-hand stock drops to or below this number, Codentra raises a low-stock alert.
- **Finished Good** — a product that is *produced* from a recipe (Bill of Materials) rather than just bought and resold. When Production is enabled, only finished goods can be sold at the POS.
- **Waste / Defect / Reject location** — a quarantine bin that written-off stock is moved into. Stock there can never be sold or issued.

---

## 2. Getting Started

### Sign up / Onboarding
1. Open Codentra and choose **Sign Up** (or use your invitation link if a teammate invited you).
2. Provide your email and create a password.
3. Complete **Onboarding**:
   - Business name
   - Business type (coffee shop, restaurant, manufacturing, etc.)
   - Currency & timezone (defaults to `PHP` / `Asia/Manila`)
   - Initial plan (Starter / Professional / Enterprise)
4. On submit, Codentra provisions your **Tenant** workspace and seeds starter categories, units of measure, a `MAIN` storage location, and a `WASTE` (Waste / Defect / Reject) quarantine location automatically.

### Sign in
Use your email + password on the **Sign In** screen. If you forgot your password, use **Forgot Password** — a reset link is emailed to you.

### Your first session
After sign-in you land on the **Dashboard**. The left **Sidebar** shows only the modules your role is allowed to use. The top-right shows the current workspace name, your role, and a notifications bell for open alerts.

### Switching tenants (multi-tenant users)
If your account belongs to more than one tenant, you can switch the active workspace from the session/tenant switcher. All screens then operate within that tenant's isolated data.

---

## 3. Roles & Permissions

Codentra uses a layered role model. Permissions are enforced both in the UI and at the database (RLS) level.

### Role summary

| Role | Typical person | Scope |
|------|----------------|--------|
| **Super Admin** | Platform owner / SaaS operator | Global: all tenants, can provision tenants and monitor everything. Platform-only role. |
| **Tenant Admin** | Business owner | Full control of *their* tenant: settings, users, all operations. |
| **Manager** | Store / ops manager | Full operational scope: inventory, POS, production, orders, reports. Can approve/deny deletions. |
| **Supervisor** | Shift lead | Same operational scope as Manager **except** cannot delete records directly — deletions go to a Manager for approval. |
| **Inventory Staff** | Stock clerk | Catalog + stock accuracy: products, locations, units, categories, transfers, waste logging, alert acknowledgement. |
| **Sales Staff** | Sales associate | POS + cash drawer only (cash/QR Ph). Cannot refund or override prices. |
| **Production Staff** | Production controller | Recipes (BOM), production templates, producing finished goods, stock movements. |
| **Purchasing Staff** | Buyer | Purchase orders + supplier management. |
| **Cashier** | Counter cashier | POS + cash drawer only (cash/QR Ph). Cannot refund or override prices. |

### Access matrix (which modules each role sees)

| Module | Super Admin* | Tenant Admin | Manager | Supervisor | Inventory | Sales | Production | Purchasing |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| Inventory | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| POS | — | ✔ | ✔ | ✔ | — | ✔ | — | — |
| Production | — | ✔ | ✔ | ✔ | — | — | ✔ | — |
| Stock Movements | — | ✔ | ✔ | ✔ | ✔ | — | ✔ | — |
| Purchase Orders | — | ✔ | ✔ | ✔ | — | — | — | ✔ |
| Suppliers | — | ✔ | ✔ | ✔ | — | — | — | ✔ |
| Reports | — | ✔ | ✔ | ✔ | — | — | — | — |
| Users | — | ✔ | — | — | — | — | — | — |
| Settings | — | ✔ | — | — | — | — | — | — |
| Tenant Monitor | ✔ | — | — | — | — | — | — | — |

`*` Super Admin operates from the separate `/admin` area and has platform-wide visibility, not a tenant dashboard.

### What each role can *do*

| Capability | Admin | Manager | Supervisor | Inventory | Sales | Production | Purchasing |
|-------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Manage products / categories / units / locations | ✔ | ✔ | ✔ | ✔ | — | ✔ | — |
| Transfer stock / log waste | ✔ | ✔ | ✔ | ✔ | — | ✔ | — |
| Run POS (cash/QR) | ✔ | ✔ | ✔ | — | ✔ | — | — |
| Open / close shift, cash in/out | ✔ | ✔ | ✔ | — | ✔ | — | — |
| Void a sale (own shift) | ✔ | ✔ | ✔ | — | ✔ | — | — |
| Refund a sale (money back) | ✔ | ✔ | — | — | — | — | — |
| Override prices / apply manual discount | ✔ | ✔ | — | — | — | — | — |
| Manage recipes & produce | ✔ | ✔ | ✔ | — | — | ✔ | — |
| Manage POs & suppliers | ✔ | ✔ | ✔ | — | — | — | ✔ |
| View reports | ✔ | ✔ | ✔ | — | — | — | — |
| Approve / reject deletions | ✔ | ✔ | — | — | — | — | — |
| **Directly delete records** | ✔ | ✔ | **No** | ✔ | — | ✔ | ✔ |

> **Rule of thumb:** Supervisors share the Manager's operational reach but cannot delete anything directly — they *request* deletion, and a Manager/Admin approves it. Cashiers and Sales Staff can ring up sales and run the till but never refund, override prices, or apply arbitrary discounts.

---

## 4. The Dashboard

Your at-a-glance command center (visible to Admin, Manager, Supervisor, Inventory, Production, and Purchasing roles).

- **Workspace capacity** — live usage vs. plan limits (users / products / locations).
- **Health snapshot** — low-stock count, open alerts, total movements, today's sales.
- **Quick navigation tiles** — jump straight to any module.
- **Stat cards** — Total SKUs, Inventory Value, Low Stock, Open Alerts, Pending Orders, Today's Sales, Stock Movements, Active Users.
- **Sales pulse** — last 7 days of revenue (chart).
- **Movement mix** — inbound / outbound / adjustment / production breakdown.
- **Alert timeline** — most recent stock alerts; acknowledge (✓) or resolve (✕) them inline.
- **Top selling products** — best movers by units sold.
- **Inventory by category** — stock-value distribution (donut chart).
- **Critical stock levels** — low/out-of-stock items with quick links.
- **Recent movements** — latest stock ledger entries.
- **Recent notifications** — same alert feed mirrored in the top-right bell.

The dashboard also surfaces a **"Attention needed"** banner when any item is low or out of stock, linking straight to the filtered Inventory view.

---

## 5. Settings

*Tenant Admin only.* Settings is where you shape the workspace, its catalog foundations, and its selling configuration.

### Business profile
Edit:
- **Business name**, **Business type** (coffee shop, convenience store, manufacturing, restaurant, retail, pharmacy, general)
- **Plan** and **Status** (active / inactive / suspended / trial) — editable only by the Platform Super Admin
- **Currency** and **Timezone**
- **Plan limits** (max users / products / locations) — set by the provider; shown read-only unless you are the Super Admin

### Production toggle
Turn **Enable Production** on to unlock Bills of Materials and finished goods. When on, the POS only sells finished goods; raw materials become production-only inputs. Manufacturing tenants have this on by default.

### Catalog management (Categories / Units / Locations)
Build the master data used everywhere:

- **Categories** — colored groups (e.g. Bakery, Dairy). Add name, color, optional description.
- **Units of Measure** — standardized units with abbreviations (e.g. `pcs`, `kg`, `btl`).
- **Locations** — where stock lives. Add with a `code`, `name`, and optional `zone`. Edit or **delete** (deleting unassigns stock but keeps the products).

### Store payment accounts
Add your store's own **GCash, Maya, BDO, and Maribank** details (account number + uploaded QR image). The POS then shows a "Scan this to pay" QR at checkout for these *manual* tenders — no third-party gateway is involved. QR images upload to a public storage bucket and display in the POS.

### POS configuration
- **Store location (POS sales)** — the dedicated location sales are tagged to (separate from inventory warehouses).
- **Stations / Bays** — define cashier stations (e.g. `Bay 1`, `Register A`) that appear when opening a shift.

### Billing
- **Manage billing** opens the provider checkout to change or renew your subscription.
- An overview card shows plan state, users/products/locations usage, and the billing email.

### Reset demo data
Re-seeds the workspace with a clean, coherent sample dataset for training or demonstration.

---

## 6. Inventory

The product master and the heart of stock control (Admin, Manager, Supervisor, Inventory, Production, Purchasing).

### Adding & editing items
Click **Add Item**. Provide:
- **Item Code** (unique SKU) and **Product Name**
- **Category**, **Unit of Measure**, **Supplier** (auto-created if new)
- **Unit Cost** and **Selling Price**
- **Quantity on Hand**, **Reorder Point**
- Optional **Location**, **Description**, and a **Finished Good** toggle (when Production is enabled)

Saving a new item with on-hand stock automatically opens a FIFO lot so costing stays accurate. Editing quantities reconciles the lot ledger and writes an *adjustment* movement.

### Import CSV / XLSX
Click **Import CSV/XLSX** and upload a spreadsheet. Codentra intelligently maps common column headers (it understands `SKU`/`item code`, `cost`/`unit cost`, `reorder`/`min stock`, etc.). Preview the parsed rows, then confirm to bulk-create/update products.

### Product table & filters
- Filter by **Category** and **Status** (`In Stock`, `Low Stock`, `Out of Stock`, `Waste / Defect`).
- Search by name, code, supplier, or location.
- Click a **low-stock** or **out-of-stock** banner to jump to the matching filtered list.
- Per-row actions: **View**, **Edit**, **Lots** (FIFO batches), **Log Waste**, **Transfer**, **Deactivate/Activate**, **Delete**.

### Waste / Defect / Reject
The Inventory page shows a dedicated panel summarizing written-off stock:
- **Waste**, **Defect**, **Reject** counts, plus **Estimated loss** (units × unit cost).

Click **Log Waste** on a product to write off units as `waste`, `defect`, or `reject`. The stock is physically moved into the quarantine `WASTE` location — it can no longer be sold or issued. You can later **reverse** or **edit** a waste entry. Click any of the three totals to see a full breakdown by product.

### Stock transfer
Use **Transfer** to move units between locations. Source and destination must differ; you cannot transfer *into* the Waste/Defect/Reject location (that is only reached via waste logging). Transfers move FIFO lots and record a `transfer` movement.

### Multi-site stock
Products stocked in more than one location show a **multi-site** badge and a per-location quantity breakdown (the lot ledger tracks every bin separately).

### FIFO lots
Click **Lots** on any product to view its receiving batches (FIFO): each lot's quantity, unit cost, received date, source, and location. This is what drives accurate COGS and the consumption order during sales.

### Deleting items
- **Single delete** and **bulk delete** (select rows via checkboxes) are available.
- If your role can delete directly (Admin/Manager/Inventory/Production/Purchasing), the item and all dependent rows (sales lines, PO lines, movements, lots, alerts) are removed cleanly.
- If your role **cannot** delete directly (Supervisor), the request is routed to a Manager for approval — see [§19](#19-deletion-approval-workflow).

---

## 7. Stock Movements (Ledger)

The complete, append-only audit trail of every stock change (Admin, Manager, Supervisor, Inventory, Production).

Movement types you'll see:
- **Inbound** — stock received (PO delivery, seed/opening stock, import)
- **Outbound** — stock sold at the POS
- **Adjustment** — manual counts / corrections
- **Return** — customer returns
- **Production** — finished goods produced
- **Waste / Defect / Reject** — written-off stock

The page shows summary cards (total movements, inbound, outbound, adjustments, production, waste, units moved) plus a filterable history table: date, product, type, quantity, before/after levels, reference, and notes. Filter by **type**, **product**, or free-text search. Newest entries first.

---

## 8. Production (Bills of Materials)

*Admin, Manager, Supervisor, Production Staff.* Turn raw materials into sellable finished goods.

### Finished goods & BOM
A **Finished Good** is a product built from a **Bill of Materials (recipe)** — a list of ingredient quantities per unit. Open **New Production Run**, pick a finished good, and add ingredients (e.g. Iced Caramel Macchiato = 0.02 kg Espresso + 0.15 L Milk + 0.05 pack Hot Chocolate Powder).

### Producing
With a recipe defined, enter a **quantity to produce** and an optional **production location**. Codentra shows the ingredients required and flags any **insufficient** stock (production can still proceed and go negative, with a warning). Producing consumes the FIFO ingredients and increases finished-good stock, recording a `production` movement.

### Production templates
Save a run (finished good + quantity + location + notes) as a **template** to reuse it. Templates can be duplicated, edited, or triggered with one click ("Produce 20"). This is ideal for repeatable batches like a "Morning Batch".

> The **Production** page only lists finished goods (products with a BOM or the Finished Good flag). Raw materials appear as recipe ingredients, not as standalone production targets.

---

## 9. Purchase Orders

*Admin, Manager, Supervisor, Purchasing Staff.* The procurement workflow.

### Create a PO
Click **Create PO**. Choose a **Supplier** (then only that supplier's products are offered), the **Product**, **Quantity**, **Unit Cost**, **Expected date**, **Delivery date**, and **Notes**. A PO number is auto-generated (`PO-YYYYMM-####`).

### Lifecycle & statuses
`draft → pending_approval → approved → ordered → partially_received → received → (or) cancelled`

From the table you can:
- **View** a read-only PO detail (supplier, status, dates, line items, totals)
- **Edit** an open PO (supplier, item, dates)
- **Receive** a PO — converts the ordered quantity into inbound stock (FIFO lots) at the linked location
- **Cancel** a PO (marks it cancelled; can no longer be received)

Summary cards show total POs, drafts, received, pending, and total estimated PO value.

---

## 10. Suppliers

*Admin, Manager, Supervisor, Purchasing Staff.*

Maintain your vendor directory: name, contact person, email, phone, address, **lead days** (used to estimate delivery timing), and notes. The summary shows total suppliers, filtered count, and average lead time.

- **View** a supplier to see their details and the list of products linked to them.
- **Edit** or **Delete** (bulk delete supported; deletion-request workflow applies for Supervisors — see [§19](#19-deletion-approval-workflow)).
- When creating a Purchase Order, only products belonging to the chosen supplier are offered.

---

## 11. Point of Sale (POS)

*Admin, Manager, Supervisor, Sales Staff, Cashier.* The selling screen.

### Before you sell: open a shift
If no shift is open, the header shows **No Active Shift** and checkout is blocked. Click **Open Shift**, enter the **starting cash float**, pick a **station/bay** (if configured), and optionally add a note. The system shows the shift code, float, and cashier.

### Building a sale
- **Product grid** — tap items to add them to the cart (out-of-stock items are disabled).
- **Barcode scanner** — type/scan an item code or barcode into the scanner field; the matching product is added automatically.
- **Search & category filters** — find products fast.
- **Type filter** — when Production is enabled, choose *Finished Goods* or *Raw Materials*; otherwise *All / Finished / Raw*.
- Adjust **quantity** per line, remove items, or **clear** the cart.

### Discounts
- **PWD/Senior** (−20%) and **Employee** (−15%) preset discounts.
- **Manual discount (%)** — manager-only. Cashiers/Sales Staff attempting it are denied with "Access denied".
- Price overrides on a line are also **manager-only**.

### Payment methods
- **Cash** — enter amount tendered; change is calculated automatically. Quick-tender buttons add common peso denominations; "Exact" sets tender to the total.
- **QR Ph (PayMongo)** — generates a scannable QR; the sale is finalized automatically when PayMongo reports the payment succeeded (the screen polls the status).
- **GCash / Maya / BDO / Maribank** — manual tenders; if you configured the store's QR in Settings, a "Scan this to pay" QR is shown to the customer.
- **Card / Bank Transfer / Other** — recorded manually by the cashier (manual methods; refunds/overrides still require a manager).
- **Split payments** — combine multiple tenders (e.g. part cash, part GCash). The combined total must equal the grand total.

> Cashiers and Sales Staff may only use **cash** and **QR Ph**; all other methods require a Manager/Supervisor/Admin.

### Completing & receipts
Click **Complete Sale**. A receipt appears on screen with items, subtotal, discounts, total, payment method, tendered/change, reference, date, and cashier. **Print** sends it to a thermal printer. The sale deducts FIFO stock and writes an `outbound` movement.

### Void & Refund
- **Void** — cancel the *current* sale (immediate correction). Available to anyone who can run the POS, but requires a reason.
- **Refund** — return money after the fact; **manager-only**. Restores the sold stock.

### Cash in / out
During an open shift, use **Cash In** (add to drawer, e.g. change fund) and **Cash Out** (remove, e.g. payout) to log till movements.

### Close shift
Click **Close Shift**, enter the **counted cash** from the drawer. Codentra computes the variance (expected vs. counted) and records the shift totals.

---

## 12. Cash Management

*Admin, Manager, Supervisor, Sales Staff, Cashier.* Shifts tie sales and till activity together.

Each **Cash Shift** records:
- **Opening float**, **closing float**, **counted cash**
- **Cash sales total**, **QR sales total**, **total sales**
- **Variance** (counted − expected)
- The **station/bay** and **location**
- Opened-by / closed-by and timestamps

**Cash Movements** within a shift capture `cash_in`, `cash_out`, `cash_sale`, `refund_payout`, `void_payout`, and `denomination_adjustment` events with optional denomination breakdowns. Shift and cash totals update automatically as sales and refunds/voids occur, giving managers a clean end-of-day reconciliation.

---

## 13. Alerts

Codentra automatically raises stock alerts (driven by the dashboard bell and timeline):

- **Low Stock** — on-hand dropped to or below the reorder point.
- **Out of Stock** — on-hand reached zero.

Alerts are generated the moment a product crosses its threshold (e.g. after a sale). From the Dashboard timeline or the bell you can:
- **Acknowledge** (✓) — mark as seen/handled.
- **Resolve** (✕) — close it out.

Restocking a product automatically clears its open alert. Alerts are per-tenant and isolated from other workspaces.

---

## 14. Reports

*Admin, Manager, Supervisor.* Three report tabs, all exportable to CSV.

### Stock Balance
- Inventory value by category (donut)
- Top products by stock value
- Full table: item code, name, category, UOM, qty on hand, unit cost, total value, status — with a **Total Inventory Value** footer.

### Cost of Goods Sold (COGS)
Pick a **date range** (from / to). For completed sales in range:
- Revenue vs. COGS bars and **gross margin %**
- Top products by margin
- Table per product: qty sold, unit cost, COGS, revenue, gross margin, margin %

### Sales Summary
Pick **Daily** or **Weekly** trend and a date range:
- KPIs: Total Sales, Transactions, Average per Transaction
- Area chart of revenue over the period
- Table per period with transaction counts and totals

Use the **daily/weekly** quick links from the Dashboard for one-click reports.

---

## 15. Users

*Tenant Admin only.* Manage your team and their access.

- **Invite User** — enter full name, email, and role. Codentra emails them a password-setup link. Pending invites show a **"Pending invite"** badge; you can **resend** the invitation.
- **Edit User** — update name, email, or role.
- **Activate / Deactivate** — toggle a user's access without deleting their history.
- **Role filter & search** — find users by name, email, or role.
- **Audit trail** — a live feed of user-related actions (created, edited, activated/deactivated) with actor and timestamp.

User counts per role are summarized at the bottom. Invited users count toward your plan's **max users** limit.

---

## 16. Billing & Subscription Plans

Codentra is subscription-based. Your plan defines hard limits and feature access.

| Plan | Monthly | Yearly | Max Users | Max Products | Max Locations | Highlights |
|------|--------:|-------:|-----------:|-------------:|--------------:|------------|
| **Starter** | ₱499 | ₱4,999 | 3 | 100 | 1 | Inventory, POS, Basic Reports, Low-Stock Alerts, 1 Location, up to 3 Users |
| **Professional** | ₱999 | ₱9,999 | 10 | 1,000 | 5 | + Advanced Reports, Multi-Location, Purchase Orders, User Roles, Excel Import, up to 10 Users |
| **Enterprise** | ₱2,499 | ₱24,999 | 999 | 9,999 | 99 | + Unlimited Users/Products/Locations, Priority Support, Custom Branding, API Access |

- **Plan limits** are shown on the Dashboard and Settings. Attempting to exceed a limit (e.g. adding an 101st product on Starter) is blocked with an "upgrade your plan" message.
- **Manage billing** (Settings) opens the provider checkout to upgrade, downgrade, or renew.
- Tenants are created **active** immediately (no trial gate). The Tenant record tracks `subscription_status` (active/inactive/suspended/trial), renewal date, and Stripe identifiers.

---

## 17. Platform / Tenant Monitor (Super Admin)

*Platform Super Admin only.* A separate `/admin` area for global oversight.

- **Summary** — total tenants, active, trials, enterprise counts.
- **Provision Tenant** — create a new business workspace (name, business type, plan, status, limits, billing email). This is how new customers are onboarded at the platform level.
- **Tenant table** — every tenant with type, plan, status, member count, user count, product count, and billing email.
- **Cross-tenant audit trail** — the most recent audit-log entries across *all* tenants (action, target, tenant, actor, timestamp), giving the platform a single oversight view.

Super Admin access is gated to configured super-admin emails / memberships; everyone else is redirected to their dashboard.

---

## 18. Multi-Tenancy & Audit

### Data isolation
Every business table is protected by **Row-Level Security**. A `get_tenant_id()` helper resolves the caller's tenant, and policies restrict each user to rows where `tenant_id = get_tenant_id()`. Even the Super Admin's tenant-monitor queries run through the service role with explicit cross-tenant selects. One tenant's products, sales, suppliers, and movements are never visible to another.

### Audit logs
Key actions (user created/edited, product created/deleted, supplier changes, order receives, deletions approved/rejected, etc.) are written to an `audit_logs` table with `action`, `target_type`, `target_id`, `details`, `performed_by`, and `performed_at`. These power the Users page trail and the platform cross-tenant monitor.

---

## 19. Deletion Approval Workflow

Some roles can *initiate* a deletion but not *execute* it, preserving accountability.

1. A **Supervisor** (or any role without direct-delete) clicks delete on a product/supplier or selects bulk rows.
2. Instead of deleting, Codentra stores a **Deletion Request** (`deletion_requests` table) with the action, target type/id, and details, and notifies that the request was sent to a Manager.
3. A **Manager / Admin / Super Admin** reviews the pending request and **Approves** (performs the deletion and cascades to dependent rows) or **Rejects** it.
4. Approving/rejecting is itself recorded in the audit trail.

Direct-delete roles (Admin, Manager, Inventory, Production, Purchasing) skip the workflow and delete immediately.

---

## 20. FAQ & Troubleshooting

**Q: I can't see the Reports / Users / Settings menu.**
Those modules are role-restricted. Reports and Users/Settings are Admin/Manager/Supervisor only. Ask your Tenant Admin to adjust your role.

**Q: The POS says "Open a shift before completing a sale."**
You must open a cash shift first. Click **Open Shift**, enter the starting float, and (if configured) choose a station.

**Q: Why can't I change a price or apply a manual discount?**
Price overrides and manual discounts are manager-level actions. Cashiers and Sales Staff are intentionally blocked; ask a Manager.

**Q: A refund is denied — why?**
Refunding (returning money after the sale) requires a Manager/Admin. Voids are allowed for the current shift but refunds are not.

**Q: My product won't delete ("failed").**
This usually means dependent rows (sales lines, PO lines, movements) blocked a hard delete. Codentra handles this by cascading deletes; if you're a Supervisor, your delete is sent as an approval request instead of executing.

**Q: Why can't I sell a raw material at the POS?**
Production is enabled for this tenant, so only **Finished Goods** (products with a Bill of Materials) are sellable. Mark the product as a finished good and build its recipe in Production.

**Q: Why did stock move into a "Waste / Defect / Reject" location?**
Someone logged waste/defect/reject for that item. Stock there is quarantined — it can't be sold or transferred out. Use Inventory → Log Waste to see, reverse, or edit those entries.

**Q: I hit a plan limit (e.g. "Your Starter plan allows up to 100 products").**
You've reached a subscription cap. Open **Settings → Manage billing** to upgrade your plan.

**Q: My invited teammate never got the email.**
On the Users page, click the **resend invitation** (mail) icon next to their pending invite.

**Q: I belong to two businesses — how do I switch?**
Use the tenant/session switcher to set the active workspace; all screens then operate within that tenant's isolated data.

**Q: Where do barcode scans go?**
Type or scan into the **scanner input** on the POS. Codentra matches by item code, barcode, or name and adds the product to the cart.

---

*End of User Guide — Codentra, "Simplicity that Scales".*
