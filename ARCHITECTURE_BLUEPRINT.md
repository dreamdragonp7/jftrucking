# J Fudge Trucking - TMS Architecture Blueprint

## 2026 Technical Architecture & Development Standards

**Stack**: Next.js 16 App Router + Supabase + Vercel + shadcn/ui
**Last Updated**: March 2026

---

## Table of Contents

1. [Next.js App Router + Supabase Architecture](#1-nextjs-app-router--supabase-architecture)
2. [Supabase Auth - Multi-Role Setup](#2-supabase-auth---multi-role-setup)
3. [Database Schema Design](#3-database-schema-design)
4. [Supabase Real-time](#4-supabase-real-time)
5. [PWA / Offline-First Architecture](#5-pwa--offline-first-architecture)
6. [Vercel Deployment & Infrastructure](#6-vercel-deployment--infrastructure)
7. [UI / Component Architecture](#7-ui--component-architecture)
8. [Data Model Design (Complete Schema)](#8-data-model-design-complete-schema)
9. [Security Considerations](#9-security-considerations)

---

## 1. Next.js App Router + Supabase Architecture

### 1.1 Project Structure (Multi-Portal with Route Groups)

```
app/
├── (auth)/                          # Shared auth pages (no portal layout)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   └── layout.tsx                   # Minimal auth layout
│
├── (admin)/                         # Admin portal
│   ├── layout.tsx                   # Admin shell: sidebar + topbar
│   ├── dashboard/page.tsx
│   ├── orders/
│   │   ├── page.tsx                 # Order list (DataTable)
│   │   ├── [id]/page.tsx            # Order detail
│   │   └── new/page.tsx             # Create order
│   ├── dispatch/page.tsx
│   ├── customers/
│   ├── drivers/
│   ├── trucks/
│   ├── invoices/
│   ├── payments/
│   ├── rates/
│   ├── reports/
│   └── settings/
│
├── (customer)/                      # Customer portal
│   ├── layout.tsx                   # Customer shell: simplified nav
│   ├── dashboard/page.tsx
│   ├── orders/
│   │   ├── page.tsx                 # My orders
│   │   ├── [id]/page.tsx            # Order detail + tracking
│   │   └── new/page.tsx             # Request delivery
│   ├── invoices/page.tsx
│   └── account/page.tsx
│
├── (trucker)/                       # Trucker/Driver portal (mobile-first)
│   ├── layout.tsx                   # Mobile shell: bottom nav
│   ├── dashboard/page.tsx           # Today's jobs
│   ├── jobs/
│   │   ├── page.tsx                 # Job list
│   │   └── [id]/
│   │       ├── page.tsx             # Job detail
│   │       └── confirm/page.tsx     # Delivery confirmation + photo
│   ├── history/page.tsx
│   └── profile/page.tsx
│
├── api/                             # API Route Handlers
│   ├── webhooks/
│   │   ├── quickbooks/route.ts      # QB webhook handler
│   │   └── stripe/route.ts          # Payment webhook (future)
│   ├── cron/
│   │   ├── daily-sync/route.ts      # QB daily sync
│   │   ├── invoice-reminders/route.ts
│   │   └── insurance-alerts/route.ts
│   ├── quickbooks/
│   │   ├── auth/route.ts            # OAuth flow
│   │   ├── sync/route.ts            # Manual sync trigger
│   │   └── invoice/route.ts         # Push invoice to QB
│   └── pdf/
│       └── invoice/[id]/route.ts    # Generate invoice PDF
│
├── manifest.ts                      # PWA manifest
├── sw.ts                            # Service worker (Serwist source)
├── layout.tsx                       # Root layout (minimal - fonts, metadata)
└── not-found.tsx

lib/
├── supabase/
│   ├── client.ts                    # Browser client (createBrowserClient)
│   ├── server.ts                    # Server client (createServerClient)
│   ├── middleware.ts                # Middleware client (token refresh)
│   └── admin.ts                     # Service role client (server-only)
├── db/
│   ├── types.ts                     # Generated Supabase types
│   └── queries/                     # Reusable query functions
│       ├── orders.ts
│       ├── customers.ts
│       ├── invoices.ts
│       └── ...
├── actions/                         # Server Actions
│   ├── orders.ts
│   ├── deliveries.ts
│   ├── invoices.ts
│   └── ...
├── validations/                     # Zod schemas
│   ├── order.ts
│   ├── delivery.ts
│   ├── customer.ts
│   └── ...
├── hooks/                           # Client-side React hooks
│   ├── use-realtime-orders.ts
│   ├── use-online-status.ts
│   └── use-offline-sync.ts
├── offline/                         # Offline/PWA utilities
│   ├── db.ts                        # IndexedDB setup (idb)
│   ├── sync.ts                      # Sync queue logic
│   └── conflict-resolver.ts         # Conflict resolution
├── quickbooks/                      # QB integration
│   ├── client.ts                    # QB API client
│   ├── sync.ts                      # Sync logic
│   └── mappers.ts                   # TMS <-> QB data mapping
└── utils/
    ├── constants.ts
    ├── format.ts                    # Currency, date, weight formatting
    └── pdf.ts                       # PDF generation utilities

components/
├── ui/                              # shadcn/ui primitives
├── shared/                          # Cross-portal components
│   ├── online-status.tsx
│   ├── install-prompt.tsx
│   └── notification-provider.tsx
├── admin/                           # Admin-specific components
│   ├── sidebar.tsx
│   ├── order-table.tsx
│   ├── dispatch-board.tsx
│   └── dashboard-cards.tsx
├── customer/                        # Customer-specific components
├── trucker/                         # Trucker-specific components
│   ├── job-card.tsx
│   ├── delivery-form.tsx
│   ├── photo-capture.tsx
│   └── bottom-nav.tsx
└── forms/                           # Shared form components
    ├── order-form.tsx
    ├── customer-form.tsx
    └── rate-form.tsx

middleware.ts                        # Root middleware
```

### 1.2 Supabase Client Setup

**Browser Client** (`lib/supabase/client.ts`) - for Client Components:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
```

**Server Client** (`lib/supabase/server.ts`) - for Server Components, Server Actions, Route Handlers:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Silently ignore - Server Components can't set cookies
          }
        },
      },
    }
  )
}
```

**Middleware Client** (`lib/supabase/middleware.ts`) - for token refresh:

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse = NextResponse.next({ request })
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: use getUser() not getSession() for server-side validation
  const { data: { user } } = await supabase.auth.getUser()

  // Role-based portal routing
  if (user) {
    const role = user.app_metadata?.role
    const path = request.nextUrl.pathname

    // Prevent accessing wrong portal
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (path.startsWith('/customer') && role !== 'customer') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (path.startsWith('/trucker') && role !== 'driver') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Redirect unauthenticated users to login (except public pages)
  if (!user && !request.nextUrl.pathname.startsWith('/login')
    && !request.nextUrl.pathname.startsWith('/signup')
    && !request.nextUrl.pathname.startsWith('/api/webhooks')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}
```

**Admin/Service Role Client** (`lib/supabase/admin.ts`) - server-only, bypasses RLS:

```typescript
import { createClient } from '@supabase/supabase-js'

// NEVER import this in client code
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### 1.3 Server Components vs Client Components Decision Matrix

| Component Type | Use Server Component | Use Client Component |
|---|---|---|
| Order list page | Yes - fetch data directly | No |
| Order detail page | Yes - fetch, pass to client children | Partially - interactive sections |
| DataTable with sorting/filtering | No | Yes - requires useState/useEffect |
| Dashboard KPI cards | Yes - fetch aggregations | No |
| Delivery confirmation form | No | Yes - camera, form state, offline |
| Real-time delivery tracker | No | Yes - WebSocket subscription |
| Invoice PDF view | Yes - server-render | No |
| Navigation/sidebar | No | Yes - active state, mobile toggle |
| Photo capture | No | Yes - browser camera API |
| Map/location display | No | Yes - browser Geolocation API |

**Rule of thumb**: Fetch data in Server Components, pass to Client Components as props. Push `'use client'` boundaries as deep into the tree as possible.

### 1.4 Server Actions vs API Routes

| Use Case | Server Actions | API Routes |
|---|---|---|
| Create/update order from form | Yes | No |
| Confirm delivery (with photo) | Yes | No |
| Generate invoice | Yes | No |
| QuickBooks OAuth callback | No | Yes |
| QB webhook receiver | No | Yes |
| QB API proxy calls | No | Yes |
| Cron job endpoints | No | Yes |
| PDF generation endpoint | No | Yes |
| Offline sync endpoint | No | Yes (needs custom HTTP) |
| Push notification sender | Yes | Also viable |

**Server Action example** (`lib/actions/orders.ts`):

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { orderSchema } from '@/lib/validations/order'

export async function createOrder(formData: FormData) {
  const supabase = await createClient()

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  // 2. Validate input with Zod
  const raw = Object.fromEntries(formData)
  const parsed = orderSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // 3. Insert (RLS enforces authorization)
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...parsed.data,
      created_by: user.id,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/orders')
  redirect(`/admin/orders/${data.id}`)
}
```

---

## 2. Supabase Auth - Multi-Role Setup

### 2.1 Role Architecture

Use a **hybrid approach**: `app_metadata` for the primary role claim (set server-side only, cannot be modified by users) combined with a `profiles` table for extended user data and a `user_roles` table for granular permissions.

```
                    ┌──────────────────┐
                    │   auth.users     │
                    │                  │
                    │ app_metadata:    │
                    │   { role: "admin" } │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──┐  ┌───────▼────┐  ┌──────▼──────┐
    │  profiles  │  │ user_roles │  │ org_members │
    │            │  │            │  │             │
    │ name       │  │ role       │  │ org_id      │
    │ phone      │  │ permissions│  │ user_id     │
    │ avatar_url │  │            │  │ role        │
    └────────────┘  └────────────┘  └─────────────┘
```

### 2.2 Custom Access Token Hook

This hook injects the user's role into the JWT so RLS policies can read it without a database query per request:

```sql
-- Step 1: Create roles and permissions enums
create type public.app_role as enum ('admin', 'customer', 'driver');
create type public.app_permission as enum (
  'orders.create',
  'orders.read',
  'orders.read.own',
  'orders.update',
  'orders.delete',
  'orders.assign',
  'deliveries.confirm',
  'deliveries.read',
  'deliveries.read.own',
  'invoices.create',
  'invoices.read',
  'invoices.read.own',
  'invoices.send',
  'payments.manage',
  'customers.manage',
  'drivers.manage',
  'trucks.manage',
  'rates.manage',
  'settings.manage'
);

-- Step 2: Tables for role management
create table public.user_roles (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

create table public.role_permissions (
  id bigint generated by default as identity primary key,
  role app_role not null,
  permission app_permission not null,
  unique (role, permission)
);

-- Step 3: Seed default permissions
insert into public.role_permissions (role, permission) values
  -- Admin gets everything
  ('admin', 'orders.create'),
  ('admin', 'orders.read'),
  ('admin', 'orders.update'),
  ('admin', 'orders.delete'),
  ('admin', 'orders.assign'),
  ('admin', 'deliveries.confirm'),
  ('admin', 'deliveries.read'),
  ('admin', 'invoices.create'),
  ('admin', 'invoices.read'),
  ('admin', 'invoices.send'),
  ('admin', 'payments.manage'),
  ('admin', 'customers.manage'),
  ('admin', 'drivers.manage'),
  ('admin', 'trucks.manage'),
  ('admin', 'rates.manage'),
  ('admin', 'settings.manage'),
  -- Customers can view their own stuff and create orders
  ('customer', 'orders.create'),
  ('customer', 'orders.read.own'),
  ('customer', 'deliveries.read.own'),
  ('customer', 'invoices.read.own'),
  -- Drivers can view assigned jobs and confirm deliveries
  ('driver', 'orders.read.own'),
  ('driver', 'deliveries.confirm'),
  ('driver', 'deliveries.read.own');

-- Step 4: Auth hook to inject role into JWT
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role public.app_role;
begin
  -- Get user's role
  select role into user_role
  from public.user_roles
  where user_id = (event->>'user_id')::uuid
  limit 1;

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{user_role}', 'null');
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Step 5: Grant permissions to auth admin
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant all on table public.user_roles to supabase_auth_admin;
revoke all on table public.user_roles from authenticated, anon, public;

create policy "Allow auth admin to read user roles"
  on public.user_roles
  as permissive for select
  to supabase_auth_admin
  using (true);

-- Step 6: Authorization helper function
create or replace function public.authorize(
  requested_permission app_permission
)
returns boolean as $$
declare
  bind_permissions int;
  user_role public.app_role;
begin
  select (auth.jwt() ->> 'user_role')::public.app_role into user_role;

  select count(*)
  into bind_permissions
  from public.role_permissions
  where role_permissions.permission = requested_permission
    and role_permissions.role = user_role;

  return bind_permissions > 0;
end;
$$ language plpgsql stable security definer set search_path = '';
```

### 2.3 RLS Policies for Data Isolation

```sql
-- Orders: admin sees all, customer sees own, driver sees assigned
create policy "Admin reads all orders"
  on public.orders for select to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'admin');

create policy "Customer reads own orders"
  on public.orders for select to authenticated
  using (
    (select auth.jwt() ->> 'user_role') = 'customer'
    and customer_id in (
      select id from public.customers
      where user_id = (select auth.uid())
    )
  );

create policy "Driver reads assigned orders"
  on public.orders for select to authenticated
  using (
    (select auth.jwt() ->> 'user_role') = 'driver'
    and assigned_driver_id = (select auth.uid())
    and status in ('assigned', 'in_progress', 'delivered')
  );

-- Invoices: admin sees all, customer sees own
create policy "Admin reads all invoices"
  on public.invoices for select to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'admin');

create policy "Customer reads own invoices"
  on public.invoices for select to authenticated
  using (
    (select auth.jwt() ->> 'user_role') = 'customer'
    and customer_id in (
      select id from public.customers
      where user_id = (select auth.uid())
    )
  );
```

### 2.4 User Registration Flow

```typescript
// Server action: Admin creates a customer or driver account
'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function createUserAccount(data: {
  email: string
  role: 'customer' | 'driver'
  name: string
  phone: string
}) {
  // 1. Create auth user with role in app_metadata
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: generateTempPassword(),
    email_confirm: true,
    app_metadata: { role: data.role }
  })

  if (authError) throw authError

  // 2. Create profile
  await supabaseAdmin.from('profiles').insert({
    id: authData.user.id,
    full_name: data.name,
    phone: data.phone,
  })

  // 3. Assign role
  await supabaseAdmin.from('user_roles').insert({
    user_id: authData.user.id,
    role: data.role,
  })

  // 4. Send password reset email
  await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: data.email,
  })

  return authData.user
}
```

---

## 3. Database Schema Design

### 3.1 Schema Overview (Entity Relationship)

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│customers │────<│  orders   │>────│  sites   │
└──────────┘     └─────┬─────┘     └──────────┘
                       │
                 ┌─────▼─────┐
                 │deliveries │>────┌──────────┐
                 └─────┬─────┘    │  trucks  │
                       │          └──────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
   ┌──────▼──┐  ┌──────▼──┐  ┌─────▼──────┐
   │invoices │  │  rates  │  │delivery_   │
   └────┬────┘  └─────────┘  │photos      │
        │                    └────────────┘
   ┌────▼────┐
   │invoice_ │
   │line_items│
   └────┬────┘
        │
   ┌────▼────┐     ┌────────────┐
   │payments │     │purchase_   │
   └─────────┘     │orders      │
                   └────────────┘
```

### 3.2 Core Schema Patterns

**Enums for Status Tracking**:

```sql
-- Order status machine
create type order_status as enum (
  'draft',
  'pending',
  'confirmed',
  'assigned',
  'in_progress',
  'delivered',
  'invoiced',
  'paid',
  'cancelled'
);

-- Invoice status
create type invoice_status as enum (
  'draft',
  'sent',
  'viewed',
  'partial',
  'paid',
  'overdue',
  'void'
);

-- Delivery confirmation status
create type delivery_status as enum (
  'pending',
  'en_route',
  'at_site',
  'dumping',
  'confirmed',
  'disputed'
);

-- Rate type
create type rate_type as enum (
  'per_ton',
  'per_load',
  'per_hour',
  'flat_rate'
);

-- Material type
create type material_type as enum (
  'sand',
  'gravel',
  'crushed_stone',
  'topsoil',
  'fill_dirt',
  'asphalt',
  'concrete',
  'caliche',
  'base',
  'other'
);
```

**JSONB for Flexible Fields**:

```sql
-- Use JSONB for metadata that varies per record
alter table orders add column metadata jsonb default '{}';
-- Example: { "special_instructions": "gate code 1234", "po_line_ref": "A" }

alter table deliveries add column gps_data jsonb;
-- Example: { "pickup": {"lat": 30.2, "lng": -97.7}, "dropoff": {"lat": 30.3, "lng": -97.8} }

alter table invoices add column qb_sync_data jsonb;
-- Example: { "qb_invoice_id": "123", "synced_at": "2026-03-18T...", "sync_status": "success" }
```

**Audit Trail Pattern** (using Supabase's audit extension approach):

```sql
-- Enable the audit schema
create schema if not exists audit;

create table audit.record_version (
  id bigserial primary key,
  record_id uuid,
  old_record_id uuid,
  op varchar(8) not null,
  ts timestamptz not null default now(),
  table_oid oid not null,
  table_schema name not null,
  table_name name not null,
  record jsonb,
  old_record jsonb,
  auth_uid uuid default auth.uid(),
  auth_role text default auth.jwt() ->> 'user_role'
);

-- Create indexes for common queries
create index ix_audit_ts on audit.record_version using brin (ts);
create index ix_audit_table on audit.record_version (table_oid);
create index ix_audit_record_id on audit.record_version (record_id);

-- Trigger function
create or replace function audit.track_changes()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    insert into audit.record_version (record_id, op, table_oid, table_schema, table_name, record)
    values (NEW.id, 'INSERT', TG_RELID, TG_TABLE_SCHEMA, TG_TABLE_NAME, to_jsonb(NEW));
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    insert into audit.record_version (record_id, old_record_id, op, table_oid, table_schema, table_name, record, old_record)
    values (NEW.id, OLD.id, 'UPDATE', TG_RELID, TG_TABLE_SCHEMA, TG_TABLE_NAME, to_jsonb(NEW), to_jsonb(OLD));
    return NEW;
  elsif (TG_OP = 'DELETE') then
    insert into audit.record_version (record_id, op, table_oid, table_schema, table_name, old_record)
    values (OLD.id, 'DELETE', TG_RELID, TG_TABLE_SCHEMA, TG_TABLE_NAME, to_jsonb(OLD));
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

-- Enable auditing on critical tables
create trigger audit_orders after insert or update or delete on public.orders
  for each row execute function audit.track_changes();
create trigger audit_deliveries after insert or update or delete on public.deliveries
  for each row execute function audit.track_changes();
create trigger audit_invoices after insert or update or delete on public.invoices
  for each row execute function audit.track_changes();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function audit.track_changes();
```

**Soft Delete Pattern** (for compliance - cannot delete delivery records):

```sql
-- Add soft delete columns to relevant tables
alter table deliveries add column deleted_at timestamptz;
alter table invoices add column deleted_at timestamptz;
alter table orders add column deleted_at timestamptz;

-- Create a view that filters out soft-deleted records
create view public.active_deliveries
with (security_invoker = true) as
  select * from public.deliveries where deleted_at is null;

create view public.active_invoices
with (security_invoker = true) as
  select * from public.invoices where deleted_at is null;

create view public.active_orders
with (security_invoker = true) as
  select * from public.orders where deleted_at is null;

-- RLS on the base table still applies through security_invoker views
-- Application code queries the views instead of base tables
```

**Auto-Calculation Triggers**:

```sql
-- Auto-calculate invoice totals when line items change
create or replace function public.update_invoice_total()
returns trigger as $$
begin
  update invoices
  set
    subtotal = (
      select coalesce(sum(amount), 0)
      from invoice_line_items
      where invoice_id = coalesce(NEW.invoice_id, OLD.invoice_id)
    ),
    updated_at = now()
  where id = coalesce(NEW.invoice_id, OLD.invoice_id);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger recalculate_invoice_total
  after insert or update or delete on public.invoice_line_items
  for each row execute function public.update_invoice_total();

-- Auto-update PO remaining quantity when deliveries are confirmed
create or replace function public.update_po_remaining()
returns trigger as $$
begin
  if NEW.status = 'confirmed' and (OLD.status is null or OLD.status != 'confirmed') then
    update purchase_orders
    set
      delivered_quantity = delivered_quantity + NEW.quantity,
      remaining_quantity = total_quantity - (delivered_quantity + NEW.quantity),
      updated_at = now()
    where id = NEW.po_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger update_po_on_delivery
  after insert or update on public.deliveries
  for each row execute function public.update_po_remaining();
```

---

## 4. Supabase Real-time

### 4.1 Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│Driver App   │     │ Supabase Realtime │     │ Admin App   │
│(Trucker     │────>│                  │────>│(Dashboard)  │
│ Portal)     │     │  Postgres Changes │     │             │
│             │     │  + Broadcast      │     │             │
│ Confirms    │     │  + Presence       │     │ Sees live   │
│ delivery    │     │                  │     │ updates     │
└─────────────┘     └──────────────────┘     └─────────────┘
```

### 4.2 Use Cases and Channel Types

| Feature | Channel Type | Why |
|---|---|---|
| Delivery status updates | Postgres Changes | Persisted data, RLS-filtered |
| Driver location (live) | Broadcast | Ephemeral, high frequency |
| Who's online (dispatch) | Presence | Track active drivers |
| Order status changes | Postgres Changes | Persisted, audit trail |
| Chat/notifications | Broadcast | Real-time, not persisted in DB |

### 4.3 Implementation Examples

**Real-time delivery updates** (Admin watches for delivery confirmations):

```typescript
// hooks/use-realtime-orders.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/db/types'

export function useRealtimeOrders(initialOrders: Order[]) {
  const [orders, setOrders] = useState(initialOrders)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as Order, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === (payload.new as Order).id
                  ? (payload.new as Order)
                  : o
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) =>
              prev.filter((o) => o.id !== (payload.old as Order).id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return orders
}
```

**Driver presence tracking** (Dispatch board shows active drivers):

```typescript
// components/admin/dispatch-board.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DriverPresence {
  user_id: string
  name: string
  status: 'available' | 'en_route' | 'at_site'
  current_job_id?: string
  last_location?: { lat: number; lng: number }
}

export function useDriverPresence() {
  const [drivers, setDrivers] = useState<DriverPresence[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel('driver-presence', {
      config: { presence: { key: 'driver-id' } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const activeDrivers = Object.values(state)
          .flat()
          .map((p) => p as unknown as DriverPresence)
        setDrivers(activeDrivers)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return drivers
}
```

**Driver-side presence tracking** (trucker portal):

```typescript
// In the trucker layout or dashboard
const channel = supabase.channel('driver-presence')

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({
      user_id: user.id,
      name: profile.full_name,
      status: 'available',
      last_location: currentPosition,
    })
  }
})

// Update presence when status changes
async function updateDriverStatus(newStatus: string, jobId?: string) {
  await channel.track({
    user_id: user.id,
    name: profile.full_name,
    status: newStatus,
    current_job_id: jobId,
    last_location: currentPosition,
  })
}
```

### 4.4 Performance Considerations

- Postgres Changes with RLS: Each change triggers one read per subscriber. For 10 drivers and 1 admin, an order update triggers ~11 reads. This is fine at JFT's scale (1-10 drivers).
- Use **Broadcast** for high-frequency data like GPS pings (does not hit the database).
- Use **Postgres Changes** for persisted status updates.
- Enable replication on only the tables you need:
  ```sql
  alter publication supabase_realtime add table orders;
  alter publication supabase_realtime add table deliveries;
  -- Do NOT add high-write tables like audit logs
  ```

---

## 5. PWA / Offline-First Architecture

### 5.1 Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| PWA Framework | **Serwist** (next-pwa successor) | Service worker management, precaching |
| Offline Storage | **IndexedDB** via `idb` package | Structured local data storage |
| Sync Engine | Custom with Background Sync API | Queue offline writes |
| Manifest | Next.js built-in `app/manifest.ts` | PWA install metadata |

### 5.2 Serwist Configuration

**next.config.ts**:

```typescript
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: false,  // Don't force reload - could lose unsaved data
  disable: process.env.NODE_ENV === 'development',
})

export default withSerwist({
  // ... your existing next.config
})
```

**app/sw.ts** (Service Worker source):

```typescript
import { defaultCache } from '@serwist/next/worker'
import { Serwist } from 'serwist'

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    // Cache API responses for offline access
    {
      urlPattern: /\/api\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
      },
    },
    // Cache Supabase storage images (delivery photos)
    {
      urlPattern: /supabase\.co\/storage/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
        },
      },
    },
  ],
})

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/badge.png',
        vibrate: [100, 50, 100],
        data: data.payload,
      })
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(self.clients.openWindow(url))
})

// Background sync for offline deliveries
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-deliveries') {
    event.waitUntil(syncPendingDeliveries())
  }
})

async function syncPendingDeliveries() {
  // This will be called when connectivity is restored
  const response = await fetch('/api/sync/deliveries', {
    method: 'POST',
  })
  return response
}

serwist.addEventListeners()
```

### 5.3 PWA Manifest

**app/manifest.ts**:

```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'J Fudge Trucking',
    short_name: 'JFT',
    description: 'Transportation Management System',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a1a2e',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

### 5.4 IndexedDB Offline Storage

**lib/offline/db.ts**:

```typescript
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface JFTOfflineDB extends DBSchema {
  'pending-deliveries': {
    key: string
    value: {
      id: string
      orderId: string
      jobId: string
      quantity: number
      unit: string
      ticketNumber: string
      notes: string
      photos: Blob[]         // Camera photos stored as blobs
      confirmedAt: number    // timestamp
      gpsLat?: number
      gpsLng?: number
      synced: boolean
      syncAttempts: number
      createdAt: number
    }
    indexes: {
      'by-synced': boolean
      'by-order': string
    }
  }
  'cached-jobs': {
    key: string
    value: {
      id: string
      orderNumber: string
      customerName: string
      pickupSite: string
      dropoffSite: string
      material: string
      scheduledDate: string
      poNumber?: string
      specialInstructions?: string
      cachedAt: number
    }
  }
  'sync-queue': {
    key: string
    value: {
      id: string
      operation: 'create' | 'update' | 'delete'
      table: string
      data: Record<string, unknown>
      timestamp: number
      attempts: number
      lastError?: string
    }
    indexes: {
      'by-timestamp': number
    }
  }
}

let dbPromise: Promise<IDBPDatabase<JFTOfflineDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<JFTOfflineDB>('jft-offline', 1, {
      upgrade(db) {
        // Pending deliveries store
        const deliveryStore = db.createObjectStore('pending-deliveries', {
          keyPath: 'id',
        })
        deliveryStore.createIndex('by-synced', 'synced')
        deliveryStore.createIndex('by-order', 'orderId')

        // Cached jobs for offline viewing
        db.createObjectStore('cached-jobs', { keyPath: 'id' })

        // General sync queue
        const syncStore = db.createObjectStore('sync-queue', {
          keyPath: 'id',
        })
        syncStore.createIndex('by-timestamp', 'timestamp')
      },
    })
  }
  return dbPromise
}

// Delivery operations
export async function savePendingDelivery(delivery: JFTOfflineDB['pending-deliveries']['value']) {
  const db = await getDB()
  await db.put('pending-deliveries', delivery)
}

export async function getUnsyncedDeliveries() {
  const db = await getDB()
  return db.getAllFromIndex('pending-deliveries', 'by-synced', false)
}

export async function markDeliverySynced(id: string) {
  const db = await getDB()
  const delivery = await db.get('pending-deliveries', id)
  if (delivery) {
    delivery.synced = true
    await db.put('pending-deliveries', delivery)
  }
}

// Job caching
export async function cacheJobs(jobs: JFTOfflineDB['cached-jobs']['value'][]) {
  const db = await getDB()
  const tx = db.transaction('cached-jobs', 'readwrite')
  await Promise.all([
    ...jobs.map((job) => tx.store.put(job)),
    tx.done,
  ])
}

export async function getCachedJobs() {
  const db = await getDB()
  return db.getAll('cached-jobs')
}
```

### 5.5 Sync Engine with Conflict Resolution

**lib/offline/sync.ts**:

```typescript
import { getUnsyncedDeliveries, markDeliverySynced } from './db'
import { createClient } from '@/lib/supabase/client'

export async function syncPendingDeliveries() {
  if (!navigator.onLine) {
    console.log('Still offline - will sync later')
    return { synced: 0, failed: 0 }
  }

  const unsynced = await getUnsyncedDeliveries()
  if (unsynced.length === 0) return { synced: 0, failed: 0 }

  const supabase = createClient()
  let synced = 0
  let failed = 0

  // Sort by timestamp to replay in order
  const sorted = unsynced.sort((a, b) => a.createdAt - b.createdAt)

  for (const delivery of sorted) {
    try {
      // 1. Upload photos to Supabase Storage
      const photoUrls: string[] = []
      for (let i = 0; i < delivery.photos.length; i++) {
        const fileName = `deliveries/${delivery.id}/photo-${i}.jpg`
        const { data, error } = await supabase.storage
          .from('delivery-photos')
          .upload(fileName, delivery.photos[i], {
            contentType: 'image/jpeg',
            upsert: true,
          })
        if (error) throw error
        const { data: urlData } = supabase.storage
          .from('delivery-photos')
          .getPublicUrl(fileName)
        photoUrls.push(urlData.publicUrl)
      }

      // 2. Check for conflicts (was the job cancelled while offline?)
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', delivery.orderId)
        .single()

      if (currentOrder?.status === 'cancelled') {
        // CONFLICT: Job was cancelled while driver was offline
        // Mark as synced but flag the conflict
        await supabase.from('delivery_conflicts').insert({
          delivery_data: delivery,
          conflict_type: 'order_cancelled',
          resolved: false,
        })
        await markDeliverySynced(delivery.id)
        failed++
        continue
      }

      // 3. Insert the delivery confirmation
      const { error: insertError } = await supabase.from('deliveries').insert({
        id: delivery.id,
        order_id: delivery.orderId,
        quantity: delivery.quantity,
        unit: delivery.unit,
        ticket_number: delivery.ticketNumber,
        notes: delivery.notes,
        photo_urls: photoUrls,
        confirmed_at: new Date(delivery.confirmedAt).toISOString(),
        gps_lat: delivery.gpsLat,
        gps_lng: delivery.gpsLng,
        status: 'confirmed',
        synced_from_offline: true,
      })

      if (insertError) throw insertError

      // 4. Update order status
      await supabase
        .from('orders')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .eq('id', delivery.orderId)

      await markDeliverySynced(delivery.id)
      synced++
    } catch (error) {
      console.error(`Failed to sync delivery ${delivery.id}:`, error)
      failed++
    }
  }

  return { synced, failed }
}
```

**lib/offline/conflict-resolver.ts**:

```typescript
/**
 * Conflict Resolution Strategy for JFT TMS
 *
 * Rules (in priority order):
 * 1. Server state is authoritative for ORDER STATUS
 *    - If admin cancels a job, the cancellation wins even if driver confirmed offline
 *    - Creates a conflict record for admin review
 *
 * 2. Driver confirmations are authoritative for DELIVERY DATA
 *    - Quantity, ticket number, photos, GPS are driver's truth
 *    - Admin can dispute but driver's original data is preserved
 *
 * 3. Last-Write-Wins for non-critical fields
 *    - Notes, special instructions, etc.
 *    - Use updated_at timestamp comparison
 *
 * 4. Manual resolution required for:
 *    - Order cancelled + delivery confirmed (needs admin decision)
 *    - Quantity mismatch > 10% from expected
 *    - Missing required photos
 */

export type ConflictType =
  | 'order_cancelled'        // Admin cancelled while driver was offline
  | 'order_reassigned'       // Admin reassigned to different driver
  | 'quantity_mismatch'      // Delivered quantity differs significantly
  | 'duplicate_delivery'     // Same order confirmed twice

export interface ConflictRecord {
  id: string
  delivery_data: Record<string, unknown>
  conflict_type: ConflictType
  server_state: Record<string, unknown>
  resolved: boolean
  resolution?: 'accept_delivery' | 'reject_delivery' | 'adjust'
  resolved_by?: string
  resolved_at?: string
}

export function detectConflict(
  offlineDelivery: Record<string, unknown>,
  serverOrder: Record<string, unknown>
): ConflictType | null {
  if (serverOrder.status === 'cancelled') return 'order_cancelled'
  if (serverOrder.assigned_driver_id !== offlineDelivery.driver_id) return 'order_reassigned'

  const expectedQty = serverOrder.quantity as number
  const deliveredQty = offlineDelivery.quantity as number
  if (Math.abs(expectedQty - deliveredQty) / expectedQty > 0.1) {
    return 'quantity_mismatch'
  }

  return null
}
```

### 5.6 What to Cache vs. Live Data

| Data | Cache Strategy | Reason |
|---|---|---|
| Today's assigned jobs | Cache on load + live updates | Must work offline |
| Job details (pickup/dropoff sites) | Cache aggressively | Rarely changes, needed at sites |
| Customer names & contacts | Cache daily | Reference data |
| Delivery form (blank) | Precache (service worker) | Must work offline |
| Delivery photos | Store in IndexedDB until synced | Offline capture |
| Rate tables | Cache daily | Rarely changes |
| Dashboard data | Network-first | Needs to be real-time |
| Invoice details | Network-only | Sensitive, always latest |
| Order history | Network-first, cache fallback | Historical reference |

### 5.7 iOS vs Android PWA in 2026

| Feature | Android (Chrome) | iOS (Safari) |
|---|---|---|
| Install prompt | Automatic prompt | Manual: "Add to Home Screen" |
| Push notifications | Full support | Supported (iOS 16.4+, must be installed) |
| Background sync | Full support | Not supported |
| Service worker | Full support | Supported with limitations |
| Storage quota | ~100MB+ | ~50MB (stricter) |
| Persistent storage | `navigator.storage.persist()` | Limited |
| Camera access | Full | Full (from installed PWA) |
| Geolocation | Full | Full |
| Offline caching | Full | Supported |

**iOS workaround for no Background Sync**: Use the `online` event listener to trigger sync when connectivity returns while the app is in the foreground. Show prominent "Pending sync" indicators to drivers so they know to keep the app open briefly when they regain signal.

---

## 6. Vercel Deployment & Infrastructure

### 6.1 Integration Architecture

```
┌─────────────────────────────────────────────────┐
│                    Vercel                        │
│                                                 │
│  ┌─────────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Next.js App │  │ API      │  │ Cron Jobs │ │
│  │ (SSR/SSG)   │  │ Routes   │  │ (vercel   │ │
│  │             │  │          │  │  .json)   │ │
│  └──────┬──────┘  └────┬─────┘  └─────┬─────┘ │
│         │              │              │        │
└─────────┼──────────────┼──────────────┼────────┘
          │              │              │
    ┌─────▼──────────────▼──────────────▼────┐
    │              Supabase                   │
    │                                         │
    │  ┌──────────┐ ┌──────┐ ┌─────────┐    │
    │  │ Postgres │ │ Auth │ │ Storage │    │
    │  │ + RLS    │ │      │ │ (photos)│    │
    │  └──────────┘ └──────┘ └─────────┘    │
    │                                         │
    │  ┌──────────┐ ┌────────────────────┐   │
    │  │ Realtime │ │ Edge Functions     │   │
    │  │          │ │ (optional - for    │   │
    │  │          │ │  DB-heavy webhooks)│   │
    │  └──────────┘ └────────────────────┘   │
    └─────────────────────────────────────────┘
          │
    ┌─────▼─────────────┐
    │ QuickBooks Online  │
    │ API                │
    └───────────────────┘
```

### 6.2 Environment Variables

**.env.local** (development):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-only, never expose

# QuickBooks
QB_CLIENT_ID=AB...
QB_CLIENT_SECRET=...
QB_REDIRECT_URI=https://yourdomain.com/api/quickbooks/auth/callback
QB_ENVIRONMENT=sandbox  # or production
QB_COMPANY_ID=...

# PWA Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=...

# Vercel Cron
CRON_SECRET=...  # Auto-set by Vercel

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Set these in Vercel Dashboard > Project > Settings > Environment Variables. Use different values for Preview vs Production.

### 6.3 Cron Jobs

**vercel.json**:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/invoice-reminders",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/insurance-alerts",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**app/api/cron/daily-sync/route.ts**:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Sync invoices and payments with QuickBooks
    const result = await syncWithQuickBooks()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Daily sync failed:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
```

### 6.4 Serverless vs Edge Functions Decision

| Use Case | Function Type | Reason |
|---|---|---|
| QB OAuth & API calls | **Vercel Serverless** (Node.js) | QB SDK needs Node.js, may take >25s |
| Webhook handlers | **Vercel Serverless** | May need long execution, DB writes |
| PDF generation | **Vercel Serverless** | CPU-intensive, needs Node.js APIs |
| Auth middleware | **Next.js Middleware** (Edge) | Runs on every request, must be fast |
| Cron jobs | **Vercel Serverless** | Triggered by Vercel, may run long |
| Image optimization | **Vercel Edge** (built-in) | Uses Next.js Image component |

### 6.5 File Storage Strategy

| File Type | Storage | Reason |
|---|---|---|
| Delivery ticket photos | **Supabase Storage** | RLS policies, linked to DB records |
| Driver documents (CDL, insurance) | **Supabase Storage** | Private bucket, RLS-protected |
| Generated invoice PDFs | **Supabase Storage** | Linked to invoice records, shareable |
| Company logos/branding | **Vercel (public/)** | Static assets, CDN-cached |
| Temporary upload previews | **Client-side only** | Never persisted until confirmed |

**Supabase Storage bucket setup**:

```sql
-- Create buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('delivery-photos', 'delivery-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png']),
  ('invoices', 'invoices', false, 5242880, array['application/pdf']);

-- RLS for delivery photos: drivers can upload, admin can view all
create policy "Drivers upload delivery photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'delivery-photos'
    and (select auth.jwt() ->> 'user_role') in ('driver', 'admin')
  );

create policy "Admin views all delivery photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'delivery-photos'
    and (select auth.jwt() ->> 'user_role') = 'admin'
  );

create policy "Drivers view own delivery photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'delivery-photos'
    and (select auth.jwt() ->> 'user_role') = 'driver'
    and (storage.foldername(name))[1] = 'deliveries'
    -- Photo path: deliveries/{delivery_id}/photo-0.jpg
    -- Additional check: delivery belongs to this driver (via function)
  );
```

---

## 7. UI / Component Architecture

### 7.1 shadcn/ui Component Selection

**Install the components most relevant to a TMS**:

```bash
# Core layout
npx shadcn@latest add button card dialog sheet sidebar

# Data display
npx shadcn@latest add table badge avatar separator

# Forms
npx shadcn@latest add input textarea select checkbox radio-group switch label
npx shadcn@latest add form  # React Hook Form + Zod integration

# Feedback
npx shadcn@latest add alert toast sonner progress skeleton

# Navigation
npx shadcn@latest add tabs navigation-menu breadcrumb dropdown-menu command

# Data entry
npx shadcn@latest add calendar date-picker popover combobox

# Mobile-specific
npx shadcn@latest add drawer  # Bottom sheet for mobile
```

### 7.2 Portal-Specific UI Patterns

**Admin Portal** (Desktop-first, data-heavy):

```
┌─────────────────────────────────────────────────┐
│ ┌────────┐  J Fudge Trucking Admin    [User] ▼ │
│ │        │──────────────────────────────────────│
│ │ SIDE   │                                      │
│ │ BAR    │  Dashboard                           │
│ │        │  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│ │ Dash   │  │ Revenue │ │ Active  │ │ Pending│ │
│ │ Orders │  │ $12,450 │ │ Jobs: 3 │ │ Inv: 5 │ │
│ │ Dispat │  └─────────┘ └─────────┘ └────────┘ │
│ │ Custom │                                      │
│ │ Driver │  Recent Orders                       │
│ │ Trucks │  ┌───┬───────┬────────┬──────┬────┐ │
│ │ Invoic │  │ # │ Cust  │ Site   │Status│ $  │ │
│ │ Paymen │  ├───┼───────┼────────┼──────┼────┤ │
│ │ Rates  │  │...│ ...   │ ...    │ ...  │ ...│ │
│ │ Report │  └───┴───────┴────────┴──────┴────┘ │
│ │ Settin │                                      │
│ └────────┘                                      │
└─────────────────────────────────────────────────┘
```

- Use shadcn `Sidebar` for navigation
- Use `Card` components for KPI dashboard widgets
- Use `DataTable` (TanStack Table + shadcn) for order/invoice lists
- Use `Dialog` for quick actions (assign driver, update status)
- Use `Sheet` for detail panels (slide-in order detail)

**Trucker Portal** (Mobile-first, action-oriented):

```
┌────────────────────┐
│ JFT        [avatar]│
│────────────────────│
│                    │
│ Today's Jobs (3)   │
│                    │
│ ┌────────────────┐ │
│ │ ORD-1234       │ │
│ │ ABC Const.     │ │
│ │ Sand - 20 tons │ │
│ │ ◉ In Progress  │ │
│ │ [Confirm] →    │ │
│ └────────────────┘ │
│                    │
│ ┌────────────────┐ │
│ │ ORD-1235       │ │
│ │ XYZ Builders   │ │
│ │ Gravel - 15 tn │ │
│ │ ○ Assigned     │ │
│ │ [Start] →      │ │
│ └────────────────┘ │
│                    │
│────────────────────│
│ 🏠  📋  ✅  👤    │
│ Home Jobs Done Me  │
└────────────────────┘
```

- Use `Card` for job cards with large tap targets
- Use `Drawer` (bottom sheet) for delivery confirmation form
- Use bottom navigation bar (custom component)
- Large buttons, minimal text, high contrast
- Photo capture with `<input type="file" accept="image/*" capture="environment">`

**Customer Portal** (Hybrid, form-focused):

- Simplified navigation (top bar only)
- Order request form with material/site selection
- Order tracking with status timeline
- Invoice list with download/pay actions

### 7.3 TanStack Table for Data Tables

TanStack Table (v8) remains the standard for React data tables in 2026. Combined with shadcn/ui's DataTable component:

```typescript
// components/admin/order-table.tsx
'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { Order } from '@/lib/db/types'

export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: 'order_number',
    header: 'Order #',
    cell: ({ row }) => (
      <a href={`/admin/orders/${row.original.id}`} className="font-medium text-blue-600">
        {row.getValue('order_number')}
      </a>
    ),
  },
  {
    accessorKey: 'customer_name',
    header: 'Customer',
  },
  {
    accessorKey: 'material',
    header: 'Material',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const variant = {
        pending: 'secondary',
        assigned: 'outline',
        in_progress: 'default',
        delivered: 'success',
        invoiced: 'warning',
        paid: 'success',
      }[status] || 'secondary'
      return <Badge variant={variant}>{status}</Badge>
    },
  },
  {
    accessorKey: 'total_amount',
    header: 'Amount',
    cell: ({ row }) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
        .format(row.getValue('total_amount')),
  },
]
```

### 7.4 Charts and Dashboard

**Recommended**: **Tremor** (acquired by Vercel, built on Recharts + Tailwind, integrates with shadcn/ui).

```bash
npm install @tremor/react
```

```typescript
// components/admin/revenue-chart.tsx
import { AreaChart } from '@tremor/react'

export function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  return (
    <AreaChart
      data={data}
      index="date"
      categories={['revenue']}
      colors={['blue']}
      valueFormatter={(v) => `$${v.toLocaleString()}`}
      showLegend={false}
    />
  )
}
```

### 7.5 PDF Generation for Invoices

Use `@react-pdf/renderer` for server-side PDF generation via API routes:

```typescript
// app/api/pdf/invoice/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import ReactPDF from '@react-pdf/renderer'
import { InvoiceDocument } from '@/components/pdf/invoice-document'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Verify auth & fetch invoice
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(*), customers(*)')
    .eq('id', id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Generate PDF stream
  const stream = await ReactPDF.renderToStream(
    <InvoiceDocument invoice={invoice} />
  )

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.pdf"`,
    },
  })
}
```

---

## 8. Data Model Design (Complete Schema)

### 8.1 Complete Supabase Postgres Schema

```sql
-- =============================================================
-- J FUDGE TRUCKING - TMS DATABASE SCHEMA
-- =============================================================

-- EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";  -- For fuzzy text search

-- =============================================================
-- ENUMS
-- =============================================================

create type order_status as enum (
  'draft', 'pending', 'confirmed', 'assigned',
  'in_progress', 'delivered', 'invoiced', 'paid', 'cancelled'
);

create type invoice_status as enum (
  'draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void'
);

create type delivery_status as enum (
  'pending', 'en_route', 'at_site', 'dumping', 'confirmed', 'disputed'
);

create type rate_type as enum ('per_ton', 'per_load', 'per_hour', 'flat_rate');

create type material_type as enum (
  'sand', 'gravel', 'crushed_stone', 'topsoil', 'fill_dirt',
  'asphalt', 'concrete', 'caliche', 'base', 'recycled_concrete', 'other'
);

create type payment_method as enum (
  'check', 'ach', 'credit_card', 'cash', 'quickbooks_payment'
);

create type app_role as enum ('admin', 'customer', 'driver');

-- =============================================================
-- PROFILES & USER MANAGEMENT
-- =============================================================

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.user_roles (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', NEW.email));
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- CUSTOMERS
-- =============================================================

create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users,  -- nullable, not all customers have logins
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text default 'TX',
  billing_zip text,
  payment_terms integer default 30,  -- net days
  tax_exempt boolean default false,
  tax_id text,
  notes text,
  qb_customer_id text,  -- QuickBooks reference
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz  -- soft delete
);

create index idx_customers_user_id on public.customers(user_id);
create index idx_customers_company on public.customers using gin(company_name gin_trgm_ops);
create index idx_customers_qb_id on public.customers(qb_customer_id);

-- =============================================================
-- SITES (Pickup / Delivery Locations)
-- =============================================================

create table public.sites (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address_line1 text,
  address_line2 text,
  city text,
  state text default 'TX',
  zip text,
  lat decimal(10, 7),
  lng decimal(10, 7),
  site_type text check (site_type in ('quarry', 'construction', 'yard', 'customer', 'other')),
  contact_name text,
  contact_phone text,
  gate_code text,
  special_instructions text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_sites_name on public.sites using gin(name gin_trgm_ops);

-- =============================================================
-- TRUCKS
-- =============================================================

create table public.trucks (
  id uuid primary key default uuid_generate_v4(),
  truck_number text not null unique,  -- e.g., "T-001"
  make text,
  model text,
  year integer,
  vin text unique,
  license_plate text,
  license_state text default 'TX',
  capacity_tons decimal(10, 2),
  truck_type text,  -- dump truck, flatbed, etc.
  insurance_policy_number text,
  insurance_expiry date,
  registration_expiry date,
  dot_inspection_expiry date,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================
-- DRIVERS
-- =============================================================

create table public.drivers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users,  -- linked to auth
  full_name text not null,
  phone text,
  email text,
  cdl_number text,
  cdl_state text default 'TX',
  cdl_expiry date,
  medical_card_expiry date,
  hire_date date,
  default_truck_id uuid references public.trucks,
  hourly_rate decimal(10, 2),
  pay_type text check (pay_type in ('hourly', 'per_load', 'salary')),
  is_active boolean default true,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_drivers_user_id on public.drivers(user_id);

-- =============================================================
-- RATES
-- =============================================================

create table public.rates (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers,  -- null = default rate
  material material_type not null,
  rate_type rate_type not null,
  rate_amount decimal(10, 2) not null,
  pickup_site_id uuid references public.sites,   -- null = any
  dropoff_site_id uuid references public.sites,  -- null = any
  min_quantity decimal(10, 2),
  effective_date date not null default current_date,
  expiry_date date,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_rates_customer on public.rates(customer_id);
create index idx_rates_material on public.rates(material);
create index idx_rates_effective on public.rates(effective_date, expiry_date);

-- =============================================================
-- PURCHASE ORDERS (POs)
-- =============================================================

create table public.purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  po_number text not null,
  customer_id uuid not null references public.customers,
  material material_type not null,
  total_quantity decimal(12, 2) not null,
  unit text not null default 'tons',
  delivered_quantity decimal(12, 2) default 0,
  remaining_quantity decimal(12, 2) generated always as (total_quantity - delivered_quantity) stored,
  rate_amount decimal(10, 2),
  rate_type rate_type,
  pickup_site_id uuid references public.sites,
  dropoff_site_id uuid references public.sites,
  start_date date,
  end_date date,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_po_customer on public.purchase_orders(customer_id);
create index idx_po_number on public.purchase_orders(po_number);

-- =============================================================
-- ORDERS / JOBS
-- =============================================================

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  customer_id uuid not null references public.customers,
  po_id uuid references public.purchase_orders,

  -- Material details
  material material_type not null,
  requested_quantity decimal(12, 2),
  unit text not null default 'tons',

  -- Locations
  pickup_site_id uuid references public.sites,
  dropoff_site_id uuid references public.sites,

  -- Scheduling
  scheduled_date date,
  scheduled_time_start time,
  scheduled_time_end time,

  -- Assignment
  assigned_driver_id uuid references public.drivers,
  assigned_truck_id uuid references public.trucks,

  -- Status
  status order_status not null default 'pending',

  -- Pricing
  rate_id uuid references public.rates,
  rate_amount decimal(10, 2),
  rate_type rate_type,
  estimated_total decimal(12, 2),

  -- Metadata
  special_instructions text,
  internal_notes text,  -- admin only
  created_by uuid references auth.users,
  metadata jsonb default '{}',

  -- Timestamps
  confirmed_at timestamptz,
  assigned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz  -- soft delete
);

create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_driver on public.orders(assigned_driver_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_date on public.orders(scheduled_date);
create index idx_orders_po on public.orders(po_id);
create index idx_orders_number on public.orders(order_number);

-- Auto-generate order numbers
create or replace function public.generate_order_number()
returns trigger as $$
declare
  next_num integer;
begin
  select coalesce(max(cast(substring(order_number from 5) as integer)), 0) + 1
  into next_num
  from public.orders;

  NEW.order_number := 'ORD-' || lpad(next_num::text, 5, '0');
  return NEW;
end;
$$ language plpgsql;

create trigger set_order_number
  before insert on public.orders
  for each row
  when (NEW.order_number is null)
  execute function public.generate_order_number();

-- =============================================================
-- DELIVERIES (Delivery Confirmations)
-- =============================================================

create table public.deliveries (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders,
  driver_id uuid references public.drivers,
  truck_id uuid references public.trucks,

  -- Delivery data (captured by driver)
  ticket_number text,
  quantity decimal(12, 2) not null,
  unit text not null default 'tons',
  material material_type,

  -- Confirmation
  status delivery_status not null default 'pending',
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users,

  -- Photos & GPS
  photo_urls jsonb default '[]',
  gps_pickup jsonb,    -- { lat, lng, timestamp }
  gps_dropoff jsonb,   -- { lat, lng, timestamp }

  -- Timing
  departed_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,

  -- Receiver info
  receiver_name text,
  receiver_signature_url text,

  -- Sync tracking
  synced_from_offline boolean default false,
  offline_created_at timestamptz,

  -- Notes
  notes text,
  metadata jsonb default '{}',

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz  -- soft delete (compliance)
);

create index idx_deliveries_order on public.deliveries(order_id);
create index idx_deliveries_driver on public.deliveries(driver_id);
create index idx_deliveries_status on public.deliveries(status);
create index idx_deliveries_date on public.deliveries(confirmed_at);
create index idx_deliveries_ticket on public.deliveries(ticket_number);

-- =============================================================
-- DELIVERY CONFLICTS (from offline sync)
-- =============================================================

create table public.delivery_conflicts (
  id uuid primary key default uuid_generate_v4(),
  delivery_data jsonb not null,
  conflict_type text not null,
  server_state jsonb,
  resolved boolean default false,
  resolution text,  -- 'accept_delivery' | 'reject_delivery' | 'adjust'
  resolved_by uuid references auth.users,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- =============================================================
-- INVOICES
-- =============================================================

create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text not null unique,
  customer_id uuid not null references public.customers,

  -- Financial
  subtotal decimal(12, 2) default 0,
  tax_rate decimal(5, 4) default 0,
  tax_amount decimal(12, 2) default 0,
  total_amount decimal(12, 2) default 0,
  amount_paid decimal(12, 2) default 0,
  balance_due decimal(12, 2) generated always as (total_amount - amount_paid) stored,

  -- Status & dates
  status invoice_status not null default 'draft',
  issue_date date default current_date,
  due_date date,
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,

  -- QuickBooks sync
  qb_invoice_id text,
  qb_sync_data jsonb,

  -- Metadata
  notes text,
  terms text,
  footer_text text,
  created_by uuid references auth.users,
  pdf_url text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz  -- soft delete
);

create index idx_invoices_customer on public.invoices(customer_id);
create index idx_invoices_status on public.invoices(status);
create index idx_invoices_date on public.invoices(issue_date);
create index idx_invoices_number on public.invoices(invoice_number);
create index idx_invoices_qb on public.invoices(qb_invoice_id);

-- Auto-generate invoice numbers
create or replace function public.generate_invoice_number()
returns trigger as $$
declare
  next_num integer;
begin
  select coalesce(max(cast(substring(invoice_number from 5) as integer)), 0) + 1
  into next_num
  from public.invoices;

  NEW.invoice_number := 'INV-' || lpad(next_num::text, 5, '0');
  return NEW;
end;
$$ language plpgsql;

create trigger set_invoice_number
  before insert on public.invoices
  for each row
  when (NEW.invoice_number is null)
  execute function public.generate_invoice_number();

-- =============================================================
-- INVOICE LINE ITEMS
-- =============================================================

create table public.invoice_line_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices on delete cascade,
  delivery_id uuid references public.deliveries,
  order_id uuid references public.orders,

  description text not null,
  quantity decimal(12, 2) not null,
  unit text default 'tons',
  unit_price decimal(10, 2) not null,
  amount decimal(12, 2) generated always as (quantity * unit_price) stored,

  -- For grouping/sorting
  sort_order integer default 0,
  metadata jsonb default '{}',

  created_at timestamptz default now()
);

create index idx_line_items_invoice on public.invoice_line_items(invoice_id);
create index idx_line_items_delivery on public.invoice_line_items(delivery_id);

-- =============================================================
-- PAYMENTS
-- =============================================================

create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices,
  customer_id uuid not null references public.customers,

  amount decimal(12, 2) not null,
  payment_method payment_method not null,
  payment_date date not null default current_date,

  -- Reference numbers
  check_number text,
  transaction_id text,  -- from payment processor
  qb_payment_id text,

  notes text,
  created_by uuid references auth.users,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_payments_invoice on public.payments(invoice_id);
create index idx_payments_customer on public.payments(customer_id);
create index idx_payments_date on public.payments(payment_date);

-- Update invoice amounts when payment is recorded
create or replace function public.update_invoice_on_payment()
returns trigger as $$
begin
  update invoices
  set
    amount_paid = (
      select coalesce(sum(amount), 0)
      from payments
      where invoice_id = NEW.invoice_id
    ),
    status = case
      when (select coalesce(sum(amount), 0) from payments where invoice_id = NEW.invoice_id)
        >= (select total_amount from invoices where id = NEW.invoice_id) then 'paid'
      when (select coalesce(sum(amount), 0) from payments where invoice_id = NEW.invoice_id) > 0
        then 'partial'
      else status
    end,
    paid_at = case
      when (select coalesce(sum(amount), 0) from payments where invoice_id = NEW.invoice_id)
        >= (select total_amount from invoices where id = NEW.invoice_id) then now()
      else paid_at
    end,
    updated_at = now()
  where id = NEW.invoice_id;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger update_invoice_payment
  after insert or update or delete on public.payments
  for each row execute function public.update_invoice_on_payment();

-- =============================================================
-- CARRIER PAY (Driver/Carrier Payments)
-- =============================================================

create table public.carrier_pay (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid not null references public.drivers,
  pay_period_start date not null,
  pay_period_end date not null,
  total_loads integer default 0,
  total_tons decimal(12, 2) default 0,
  total_hours decimal(8, 2) default 0,
  gross_pay decimal(12, 2) not null,
  deductions decimal(12, 2) default 0,
  net_pay decimal(12, 2) generated always as (gross_pay - deductions) stored,
  status text check (status in ('draft', 'approved', 'paid')) default 'draft',
  paid_at timestamptz,
  notes text,
  line_items jsonb default '[]',  -- Breakdown of loads/hours
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_carrier_pay_driver on public.carrier_pay(driver_id);
create index idx_carrier_pay_period on public.carrier_pay(pay_period_start, pay_period_end);

-- =============================================================
-- QUICKBOOKS SYNC LOG
-- =============================================================

create table public.qb_sync_log (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,  -- 'customer', 'invoice', 'payment'
  entity_id uuid not null,
  qb_entity_id text,
  direction text check (direction in ('push', 'pull')) not null,
  status text check (status in ('success', 'error', 'pending')) not null,
  request_data jsonb,
  response_data jsonb,
  error_message text,
  created_at timestamptz default now()
);

create index idx_qb_sync_entity on public.qb_sync_log(entity_type, entity_id);

-- =============================================================
-- PUSH NOTIFICATION SUBSCRIPTIONS
-- =============================================================

create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  subscription jsonb not null,  -- Web Push subscription object
  device_info text,
  created_at timestamptz default now(),
  unique (user_id, subscription)
);

-- =============================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.sites enable row level security;
alter table public.trucks enable row level security;
alter table public.drivers enable row level security;
alter table public.rates enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.orders enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_conflicts enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.payments enable row level security;
alter table public.carrier_pay enable row level security;
alter table public.qb_sync_log enable row level security;
alter table public.push_subscriptions enable row level security;

-- =============================================================
-- RLS POLICIES (Key examples)
-- =============================================================

-- Profiles: users read own, admin reads all
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Admin reads all profiles"
  on public.profiles for select to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'admin');

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Orders: role-based access
create policy "Admin full access to orders"
  on public.orders for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'admin')
  with check ((select auth.jwt() ->> 'user_role') = 'admin');

create policy "Customer reads own orders"
  on public.orders for select to authenticated
  using (
    (select auth.jwt() ->> 'user_role') = 'customer'
    and customer_id in (
      select id from public.customers where user_id = (select auth.uid())
    )
  );

create policy "Customer creates orders"
  on public.orders for insert to authenticated
  with check (
    (select auth.jwt() ->> 'user_role') = 'customer'
    and customer_id in (
      select id from public.customers where user_id = (select auth.uid())
    )
  );

create policy "Driver reads assigned orders"
  on public.orders for select to authenticated
  using (
    (select auth.jwt() ->> 'user_role') = 'driver'
    and assigned_driver_id in (
      select id from public.drivers where user_id = (select auth.uid())
    )
    and status in ('assigned', 'in_progress', 'delivered')
  );

create policy "Driver updates assigned orders"
  on public.orders for update to authenticated
  using (
    (select auth.jwt() ->> 'user_role') = 'driver'
    and assigned_driver_id in (
      select id from public.drivers where user_id = (select auth.uid())
    )
    and status in ('assigned', 'in_progress')
  )
  with check (
    (select auth.jwt() ->> 'user_role') = 'driver'
    and status in ('assigned', 'in_progress', 'delivered')
  );

-- Deliveries: similar pattern
create policy "Admin full access to deliveries"
  on public.deliveries for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'admin')
  with check ((select auth.jwt() ->> 'user_role') = 'admin');

create policy "Driver creates deliveries for assigned orders"
  on public.deliveries for insert to authenticated
  with check (
    (select auth.jwt() ->> 'user_role') = 'driver'
    and driver_id in (
      select id from public.drivers where user_id = (select auth.uid())
    )
  );

create policy "Driver reads own deliveries"
  on public.deliveries for select to authenticated
  using (
    (select auth.jwt() ->> 'user_role') = 'driver'
    and driver_id in (
      select id from public.drivers where user_id = (select auth.uid())
    )
  );

-- Invoices
create policy "Admin full access to invoices"
  on public.invoices for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'admin')
  with check ((select auth.jwt() ->> 'user_role') = 'admin');

create policy "Customer reads own invoices"
  on public.invoices for select to authenticated
  using (
    (select auth.jwt() ->> 'user_role') = 'customer'
    and customer_id in (
      select id from public.customers where user_id = (select auth.uid())
    )
  );

-- Sites, Trucks, Rates: admin manages, others read
create policy "Everyone reads active sites"
  on public.sites for select to authenticated
  using (is_active = true);

create policy "Admin manages sites"
  on public.sites for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'admin')
  with check ((select auth.jwt() ->> 'user_role') = 'admin');

-- Push subscriptions: users manage their own
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- =============================================================
-- ENABLE REALTIME ON SELECTED TABLES
-- =============================================================

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.deliveries;
-- Do NOT add audit tables or high-write tables
```

### 8.2 Status Machine Patterns

```
ORDER STATUS FLOW:
                                          ┌──────────┐
                                     ┌───>│cancelled │
                                     │    └──────────┘
┌─────┐   ┌───────┐   ┌─────────┐   │   ┌──────────┐   ┌─────────┐   ┌────────┐   ┌────┐
│draft│──>│pending│──>│confirmed│──>├──>│assigned  │──>│in_      │──>│delivered│──>│inv.│──>│paid│
└─────┘   └───────┘   └─────────┘   │   └──────────┘   │progress │   └────────┘   └────┘   └────┘
                                     │                   └─────────┘
                                     │
                              (can cancel from any
                               pre-delivery state)

INVOICE STATUS FLOW:
┌─────┐   ┌────┐   ┌──────┐   ┌───────┐   ┌────┐
│draft│──>│sent│──>│viewed│──>│partial│──>│paid│
└─────┘   └────┘   └──────┘   └───────┘   └────┘
             │                                │
             └──────────> overdue ◄───────────┘
                            │                (if payment
                            └──> void        bounces/reverses)

DELIVERY STATUS FLOW:
┌───────┐   ┌────────┐   ┌───────┐   ┌───────┐   ┌─────────┐
│pending│──>│en_route│──>│at_site│──>│dumping│──>│confirmed│
└───────┘   └────────┘   └───────┘   └───────┘   └─────────┘
                                                       │
                                                  ┌────▼────┐
                                                  │disputed │
                                                  └─────────┘
```

### 8.3 Rate Modeling

Rates support multiple dimensions:

```sql
-- Example rate lookups:

-- 1. Customer-specific rate for sand to a specific site
select rate_amount, rate_type from rates
where customer_id = $1
  and material = 'sand'
  and dropoff_site_id = $2
  and is_active = true
  and effective_date <= current_date
  and (expiry_date is null or expiry_date >= current_date)
order by effective_date desc
limit 1;

-- 2. Fallback: default rate for sand (no customer specified)
select rate_amount, rate_type from rates
where customer_id is null
  and material = 'sand'
  and is_active = true
  and effective_date <= current_date
  and (expiry_date is null or expiry_date >= current_date)
order by effective_date desc
limit 1;

-- Rate lookup function with cascading fallback
create or replace function public.get_rate(
  p_customer_id uuid,
  p_material material_type,
  p_pickup_site_id uuid default null,
  p_dropoff_site_id uuid default null
) returns table(rate_amount decimal, rate_type rate_type) as $$
begin
  -- Try customer + material + both sites
  return query select r.rate_amount, r.rate_type from rates r
    where r.customer_id = p_customer_id and r.material = p_material
      and r.pickup_site_id = p_pickup_site_id and r.dropoff_site_id = p_dropoff_site_id
      and r.is_active and r.effective_date <= current_date
      and (r.expiry_date is null or r.expiry_date >= current_date)
    order by r.effective_date desc limit 1;
  if found then return; end if;

  -- Try customer + material + dropoff site only
  return query select r.rate_amount, r.rate_type from rates r
    where r.customer_id = p_customer_id and r.material = p_material
      and r.pickup_site_id is null and r.dropoff_site_id = p_dropoff_site_id
      and r.is_active and r.effective_date <= current_date
      and (r.expiry_date is null or r.expiry_date >= current_date)
    order by r.effective_date desc limit 1;
  if found then return; end if;

  -- Try customer + material (any site)
  return query select r.rate_amount, r.rate_type from rates r
    where r.customer_id = p_customer_id and r.material = p_material
      and r.pickup_site_id is null and r.dropoff_site_id is null
      and r.is_active and r.effective_date <= current_date
      and (r.expiry_date is null or r.expiry_date >= current_date)
    order by r.effective_date desc limit 1;
  if found then return; end if;

  -- Fallback: default rate (no customer)
  return query select r.rate_amount, r.rate_type from rates r
    where r.customer_id is null and r.material = p_material
      and r.is_active and r.effective_date <= current_date
      and (r.expiry_date is null or r.expiry_date >= current_date)
    order by r.effective_date desc limit 1;
end;
$$ language plpgsql stable;
```

### 8.4 Invoice Generation from Deliveries

```sql
-- Generate invoice line items from confirmed deliveries
create or replace function public.generate_invoice_from_deliveries(
  p_customer_id uuid,
  p_delivery_ids uuid[],
  p_created_by uuid
) returns uuid as $$
declare
  v_invoice_id uuid;
  v_delivery record;
begin
  -- Create invoice
  insert into invoices (customer_id, created_by, status, due_date)
  values (
    p_customer_id,
    p_created_by,
    'draft',
    current_date + (select payment_terms from customers where id = p_customer_id) * interval '1 day'
  )
  returning id into v_invoice_id;

  -- Create line items from deliveries
  for v_delivery in
    select d.*, o.rate_amount, o.rate_type, o.material,
           ps.name as pickup_name, ds.name as dropoff_name
    from deliveries d
    join orders o on d.order_id = o.id
    left join sites ps on o.pickup_site_id = ps.id
    left join sites ds on o.dropoff_site_id = ds.id
    where d.id = any(p_delivery_ids)
      and d.status = 'confirmed'
  loop
    insert into invoice_line_items (invoice_id, delivery_id, order_id, description, quantity, unit, unit_price)
    values (
      v_invoice_id,
      v_delivery.id,
      v_delivery.order_id,
      format('%s - %s to %s (Ticket: %s)',
        v_delivery.material,
        v_delivery.pickup_name,
        v_delivery.dropoff_name,
        v_delivery.ticket_number
      ),
      v_delivery.quantity,
      v_delivery.unit,
      v_delivery.rate_amount
    );

    -- Update order status
    update orders set status = 'invoiced', updated_at = now()
    where id = v_delivery.order_id and status = 'delivered';
  end loop;

  return v_invoice_id;
end;
$$ language plpgsql security definer;
```

---

## 9. Security Considerations

### 9.1 Defense-in-Depth Architecture

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Network (Vercel Edge / Cloudflare)         │
│ - DDoS protection, rate limiting, geo-blocking      │
├─────────────────────────────────────────────────────┤
│ Layer 2: Next.js Middleware                         │
│ - Auth token validation (supabase.auth.getUser())   │
│ - Role-based route protection                       │
│ - CSRF: Origin/Host header comparison (built-in)    │
├─────────────────────────────────────────────────────┤
│ Layer 3: Server Actions / API Routes                │
│ - Zod input validation                              │
│ - Auth check (getUser() not getSession())           │
│ - Authorization check (role/permission)             │
├─────────────────────────────────────────────────────┤
│ Layer 4: Supabase RLS                               │
│ - Row-level data isolation                          │
│ - JWT claim-based policies                          │
│ - Prevent data leaks even if app logic fails        │
├─────────────────────────────────────────────────────┤
│ Layer 5: Database Constraints                       │
│ - Foreign keys, check constraints, not null         │
│ - Triggers for data integrity                       │
│ - Audit trail                                       │
└─────────────────────────────────────────────────────┘
```

### 9.2 Zod Validation Schemas

```typescript
// lib/validations/order.ts
import { z } from 'zod'

export const orderSchema = z.object({
  customer_id: z.string().uuid('Invalid customer'),
  material: z.enum([
    'sand', 'gravel', 'crushed_stone', 'topsoil', 'fill_dirt',
    'asphalt', 'concrete', 'caliche', 'base', 'recycled_concrete', 'other'
  ]),
  requested_quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.enum(['tons', 'loads', 'yards']).default('tons'),
  pickup_site_id: z.string().uuid().optional(),
  dropoff_site_id: z.string().uuid('Delivery site is required'),
  scheduled_date: z.coerce.date().min(new Date(), 'Date must be in the future'),
  po_id: z.string().uuid().optional(),
  special_instructions: z.string().max(1000).optional(),
})

export const deliveryConfirmationSchema = z.object({
  order_id: z.string().uuid(),
  ticket_number: z.string().min(1, 'Ticket number required').max(50),
  quantity: z.coerce.number().positive(),
  unit: z.enum(['tons', 'loads', 'yards']),
  notes: z.string().max(500).optional(),
  receiver_name: z.string().min(1).max(100).optional(),
  gps_lat: z.coerce.number().min(-90).max(90).optional(),
  gps_lng: z.coerce.number().min(-180).max(180).optional(),
})

export const customerSchema = z.object({
  company_name: z.string().min(1, 'Company name required').max(255),
  contact_name: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[\d\s()-]{7,20}$/, 'Invalid phone').optional().or(z.literal('')),
  billing_address_line1: z.string().max(255).optional(),
  billing_city: z.string().max(100).optional(),
  billing_state: z.string().length(2).default('TX'),
  billing_zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP').optional().or(z.literal('')),
  payment_terms: z.coerce.number().int().min(0).max(120).default(30),
})
```

### 9.3 Server Action Security Pattern

```typescript
// lib/actions/deliveries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { deliveryConfirmationSchema } from '@/lib/validations/order'
import { revalidatePath } from 'next/cache'

export async function confirmDelivery(formData: FormData) {
  const supabase = await createClient()

  // 1. AUTHENTICATE - always use getUser(), never getSession()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Authentication required' }
  }

  // 2. AUTHORIZE - check role
  const role = user.app_metadata?.role
  if (role !== 'driver' && role !== 'admin') {
    return { error: 'Only drivers can confirm deliveries' }
  }

  // 3. VALIDATE INPUT - never trust client data
  const raw = Object.fromEntries(formData)
  const parsed = deliveryConfirmationSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // 4. ADDITIONAL AUTHORIZATION - verify this driver is assigned
  if (role === 'driver') {
    const { data: order } = await supabase
      .from('orders')
      .select('assigned_driver_id, status')
      .eq('id', parsed.data.order_id)
      .single()

    // Check via drivers table since driver_id != user_id
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!order || order.assigned_driver_id !== driver?.id) {
      return { error: 'You are not assigned to this order' }
    }

    if (!['assigned', 'in_progress'].includes(order.status)) {
      return { error: 'Order cannot be confirmed in current status' }
    }
  }

  // 5. EXECUTE (RLS provides additional safety net)
  const { error: insertError } = await supabase
    .from('deliveries')
    .insert({
      ...parsed.data,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.id,
    })

  if (insertError) {
    return { error: 'Failed to confirm delivery' }
  }

  revalidatePath('/trucker/jobs')
  revalidatePath('/admin/orders')
  return { success: true }
}
```

### 9.4 Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), geolocation=(self), microphone=()',
  },
]

export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
}
```

### 9.5 File Upload Security

```typescript
// lib/utils/file-upload.ts
import { z } from 'zod'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= MAX_FILE_SIZE, 'File too large (max 10MB)')
    .refine(
      (f) => ALLOWED_IMAGE_TYPES.includes(f.type),
      'Only JPEG, PNG, and WebP images are allowed'
    ),
})

// Validate file content matches declared MIME type
export async function validateFileContent(file: File): Promise<boolean> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Check magic bytes
  const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const isWebP = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46

  if (file.type === 'image/jpeg' && !isJPEG) return false
  if (file.type === 'image/png' && !isPNG) return false
  if (file.type === 'image/webp' && !isWebP) return false

  return true
}
```

### 9.6 RLS Security Checklist

```sql
-- Find tables without RLS enabled (run periodically)
select t.schemaname, t.tablename
from pg_tables t
join pg_class c on c.relname = t.tablename
join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
where t.schemaname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false;

-- Find tables with RLS but no policies (dangerous - completely inaccessible)
select c.relname as table_name
from pg_class c
join pg_namespace n on c.relnamespace = n.oid
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = true
  and not exists (
    select 1 from pg_policies p
    where p.tablename = c.relname and p.schemaname = n.nspname
  );
```

---

## Appendix A: Package Dependencies

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.50.0",
    "@supabase/ssr": "^0.6.0",
    "@tanstack/react-table": "^8.20.0",
    "@tremor/react": "^4.0.0",
    "@react-pdf/renderer": "^4.0.0",
    "zod": "^3.24.0",
    "react-hook-form": "^7.55.0",
    "@hookform/resolvers": "^4.0.0",
    "idb": "^8.0.0",
    "web-push": "^3.7.0",
    "nanoid": "^5.1.0",
    "date-fns": "^4.1.0",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "sonner": "latest"
  },
  "devDependencies": {
    "@serwist/next": "^9.0.0",
    "serwist": "^9.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^4.0.0",
    "@types/web-push": "^3.6.0",
    "supabase": "^1.230.0"
  }
}
```

## Appendix B: QuickBooks Integration Architecture

```
┌────────────────────────────────────────────────────────┐
│                   JFT TMS (Next.js)                    │
│                                                        │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐│
│  │ /api/qb/auth │   │ /api/qb/sync │   │ /api/cron/ ││
│  │              │   │              │   │ daily-sync  ││
│  │ OAuth 2.0    │   │ Manual push/ │   │             ││
│  │ flow         │   │ pull trigger │   │ Scheduled   ││
│  └──────┬───────┘   └──────┬───────┘   └──────┬──────┘│
│         │                  │                   │       │
│  ┌──────▼──────────────────▼───────────────────▼──────┐│
│  │               lib/quickbooks/                      ││
│  │                                                    ││
│  │  client.ts  - OAuth token management               ││
│  │  sync.ts    - Bi-directional sync logic            ││
│  │  mappers.ts - TMS Entity <-> QB Entity mapping     ││
│  └────────────────────────┬───────────────────────────┘│
│                           │                            │
└───────────────────────────┼────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │ QuickBooks Online  │
                  │ REST API v3       │
                  │                   │
                  │ Entities:         │
                  │ - Customer        │
                  │ - Invoice         │
                  │ - Payment         │
                  │ - Item (material) │
                  └───────────────────┘

Sync Strategy:
- Customers: TMS -> QB (push on create/update)
- Invoices: TMS -> QB (push when sent)
- Payments: QB -> TMS (pull via webhook or daily sync)
- Items/Materials: QB -> TMS (pull, map to material_type)

Token Management:
- Store OAuth tokens in encrypted env vars or Supabase vault
- Refresh token before expiry (1 hour access token lifetime)
- Handle token revocation gracefully
```

## Appendix C: Development Workflow

```
1. Local Development:
   - `npx supabase start` (local Supabase)
   - `npm run dev` (Next.js dev server)
   - Supabase Studio at localhost:54323

2. Database Migrations:
   - `npx supabase migration new <name>`
   - Write SQL in supabase/migrations/
   - `npx supabase db push` (apply to remote)
   - `npx supabase gen types typescript` (regenerate types)

3. Branching:
   - Feature branches with Supabase branch databases
   - Vercel preview deployments per branch
   - Vercel <-> Supabase integration auto-syncs env vars

4. Testing:
   - RLS policies: pgTap tests via `supabase test db`
   - Server Actions: Vitest with Supabase test helpers
   - E2E: Playwright for critical flows
   - Offline: Chrome DevTools offline mode

5. Deployment:
   - Push to main -> Vercel auto-deploys
   - Run `supabase db push` for migrations
   - Verify cron jobs in Vercel dashboard
```

---

## Sources

- [Supabase SSR Client Setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Best Practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js 16 PWA with Offline Support (LogRocket)](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Serwist with Next.js](https://dev.to/sukechris/building-offline-apps-with-nextjs-and-serwist-2cbj)
- [Offline-First PWA with Next.js + IndexedDB + Supabase](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9)
- [PWA iOS Limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Supabase for Vercel](https://vercel.com/marketplace/supabase)
- [Next.js Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- [Server Components vs Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js Server Actions Complete Guide](https://makerkit.dev/blog/tutorials/nextjs-server-actions)
- [Server Actions Security](https://makerkit.dev/blog/tutorials/secure-nextjs-server-actions)
- [shadcn/ui DataTable](https://ui.shadcn.com/docs/components/radix/data-table)
- [shadcn/ui Form (React Hook Form)](https://ui.shadcn.com/docs/forms/react-hook-form)
- [Tremor Charts](https://www.tremor.so/)
- [Postgres Auditing in 150 Lines](https://supabase.com/blog/postgres-audit)
- [Database Design for Logistics](https://www.geeksforgeeks.org/sql/how-to-design-database-for-logistics-and-transportation/)
- [Offline-First Conflict Resolution](https://dev.to/odunayo_dada/offline-first-mobile-app-architecture-syncing-caching-and-conflict-resolution-1j58)
- [QuickBooks API Integration Guide 2026](https://unified.to/blog/quickbooks_api_integration_a_step_by_step_guide_for_b2b_saas_teams_2026)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Next.js Security](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Multi-Tenant RLS (AntStack)](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
