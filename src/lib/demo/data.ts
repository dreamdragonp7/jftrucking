/**
 * Demo data for JFT TMS -- Development Only
 * Returns realistic data when Supabase is not configured.
 *
 * PRODUCTION SAFETY: This file is only imported by the demo helper,
 * which is gated behind missing Supabase env vars.
 *
 * DATA SOURCE: All data derived from JFT-MASTER.md (compiled from
 * Nene's computer SSH session, OCR'd invoices, and master reference).
 */

import type {
  Profile,
  Customer,
  Carrier,
  Driver,
  DriverWithCarrier,
  Truck,
  TruckWithCarrier,
  Site,
  SiteWithCustomer,
  Material,
  PurchaseOrder,
  PurchaseOrderWithRelations,
  Rate,
  Order,
  OrderWithRelations,
  Dispatch,
  DispatchWithRelations,
  Delivery,
  DeliveryWithRelations,
  Invoice,
  InvoiceLineItem,
  InvoiceWithLineItems,
  Payment,
  PaymentWithRelations,
  CarrierSettlement,
  CarrierSettlementWithLines,
  CarrierSettlementLine,
  Notification,
  Supplier,
  MaterialAlias,
  SiteContact,
  CustomerAddress,
} from "@/types/database";

import type { RateWithRelations } from "@/lib/data/rates.data";

import type {
  DashboardData,
  DashboardKpi,
  PendingAction,
  RecentDelivery,
  ArAgingBucket,
  QBHealthData,
} from "@/app/(admin)/admin/dashboard/_lib/dashboard.loader";

// ============================================================================
// CONSISTENT IDS
// ============================================================================

export const IDS = {
  // Profiles
  adminProfile: "00000000-0000-0000-0000-000000000001",
  adminProfile2: "00000000-0000-0000-0000-000000000006",
  customerProfile: "00000000-0000-0000-0000-000000000002",
  driverProfile1: "00000000-0000-0000-0000-000000000003",
  carrierProfile: "00000000-0000-0000-0000-000000000005",

  // Customers
  customer1: "10000000-0000-0000-0000-000000000001", // DR Horton
  customer2: "10000000-0000-0000-0000-000000000002", // The Kaufman Co Inc
  customer3: "10000000-0000-0000-0000-000000000003", // Shaddock Caldwell

  // Carriers
  carrier1: "20000000-0000-0000-0000-000000000001", // CD Hopkins

  // Drivers
  driver1: "30000000-0000-0000-0000-000000000001", // Chip West

  // Trucks
  truck1: "40000000-0000-0000-0000-000000000001", // Hi-Rail Rotary
  truck2: "40000000-0000-0000-0000-000000000002", // Dump truck
  truck3: "40000000-0000-0000-0000-000000000003", // Broken 1
  truck4: "40000000-0000-0000-0000-000000000004", // Broken 2

  // Pickup sites (quarries)
  siteQuarryKaufman: "50000000-0000-0000-0000-000000000001",
  siteQuarryLowery: "50000000-0000-0000-0000-000000000002",
  siteQuarryUnited: "50000000-0000-0000-0000-000000000003",

  // Delivery sites (DR Horton subdivisions)
  siteUnionPark70s: "50000000-0000-0000-0000-000000000010",
  siteUnionPark60s: "50000000-0000-0000-0000-000000000011",
  siteRivendalePointe: "50000000-0000-0000-0000-000000000012",
  siteRivendaleByLake: "50000000-0000-0000-0000-000000000013",
  siteOakmont: "50000000-0000-0000-0000-000000000014",
  siteHawkRidge: "50000000-0000-0000-0000-000000000015",
  siteBluewood: "50000000-0000-0000-0000-000000000016",
  siteDCRanch: "50000000-0000-0000-0000-000000000017",
  siteTrailsRiverstone: "50000000-0000-0000-0000-000000000018",
  siteFossilCreek: "50000000-0000-0000-0000-000000000019",
  siteTrinityFalls: "50000000-0000-0000-0000-000000000020",
  siteReserveWestridge: "50000000-0000-0000-0000-000000000021",
  siteHighlandsWestridge: "50000000-0000-0000-0000-000000000022",
  siteHighlandsVP: "50000000-0000-0000-0000-000000000023",
  siteHighlandsFC: "50000000-0000-0000-0000-000000000024",
  siteHighlandsR: "50000000-0000-0000-0000-000000000025",

  // Materials
  materialCushionSand: "60000000-0000-0000-0000-000000000001",
  materialMasonSand: "60000000-0000-0000-0000-000000000002",
  materialTopSoil: "60000000-0000-0000-0000-000000000003",
  materialScreenedSand: "60000000-0000-0000-0000-000000000004",
  materialBackfill: "60000000-0000-0000-0000-000000000005",

  // Purchase Orders
  po1: "70000000-0000-0000-0000-000000000001",
  po2: "70000000-0000-0000-0000-000000000002",
  po3: "70000000-0000-0000-0000-000000000003",

  // Rates
  rate1: "80000000-0000-0000-0000-000000000001",
  rate2: "80000000-0000-0000-0000-000000000002",
  rate3: "80000000-0000-0000-0000-000000000003",
  rate4: "80000000-0000-0000-0000-000000000004",
  rate5: "80000000-0000-0000-0000-000000000005",
  rate6: "80000000-0000-0000-0000-000000000006",
  rate7: "80000000-0000-0000-0000-000000000007",
  rateCarrier1: "80000000-0000-0000-0000-000000000010",
  rateCarrier2: "80000000-0000-0000-0000-000000000011",
  rateCarrier3: "80000000-0000-0000-0000-000000000012",

  // Orders
  order1: "90000000-0000-0000-0000-000000000001",
  order2: "90000000-0000-0000-0000-000000000002",
  order3: "90000000-0000-0000-0000-000000000003",

  // Dispatches
  dispatch1: "a0000000-0000-0000-0000-000000000001",
  dispatch2: "a0000000-0000-0000-0000-000000000002",
  dispatch3: "a0000000-0000-0000-0000-000000000003",
  dispatch4: "a0000000-0000-0000-0000-000000000004",
  dispatch5: "a0000000-0000-0000-0000-000000000005",
  dispatch6: "a0000000-0000-0000-0000-000000000006",
  dispatch7: "a0000000-0000-0000-0000-000000000007",
  dispatch8: "a0000000-0000-0000-0000-000000000008",

  // Deliveries
  delivery1: "b0000000-0000-0000-0000-000000000001",
  delivery2: "b0000000-0000-0000-0000-000000000002",
  delivery3: "b0000000-0000-0000-0000-000000000003",
  delivery4: "b0000000-0000-0000-0000-000000000004",
  delivery5: "b0000000-0000-0000-0000-000000000005",
  delivery6: "b0000000-0000-0000-0000-000000000006",

  // Invoices
  invoice1: "c0000000-0000-0000-0000-000000000001",
  invoice2: "c0000000-0000-0000-0000-000000000002",
  invoice3: "c0000000-0000-0000-0000-000000000003",

  // Line Items
  lineItem1: "c1000000-0000-0000-0000-000000000001",
  lineItem2: "c1000000-0000-0000-0000-000000000002",
  lineItem3: "c1000000-0000-0000-0000-000000000003",
  lineItem4: "c1000000-0000-0000-0000-000000000004",
  lineItem5: "c1000000-0000-0000-0000-000000000005",
  lineItem6: "c1000000-0000-0000-0000-000000000006",

  // Payments
  payment1: "d0000000-0000-0000-0000-000000000001",
  payment2: "d0000000-0000-0000-0000-000000000002",

  // Settlements
  settlement1: "e0000000-0000-0000-0000-000000000001",
  settlement2: "e0000000-0000-0000-0000-000000000002",
  settlementLine1: "e1000000-0000-0000-0000-000000000001",
  settlementLine2: "e1000000-0000-0000-0000-000000000002",
  settlementLine3: "e1000000-0000-0000-0000-000000000003",
  settlementLine4: "e1000000-0000-0000-0000-000000000004",
  settlementLine5: "e1000000-0000-0000-0000-000000000005",

  // Notifications
  notification1: "f0000000-0000-0000-0000-000000000001",
  notification2: "f0000000-0000-0000-0000-000000000002",
  notification3: "f0000000-0000-0000-0000-000000000003",
  notification4: "f0000000-0000-0000-0000-000000000004",
  notification5: "f0000000-0000-0000-0000-000000000005",
  notification6: "f0000000-0000-0000-0000-000000000006",

  // Suppliers
  supplierKaufman: "11000000-0000-0000-0000-000000000001",
  supplierLowery: "11000000-0000-0000-0000-000000000002",
  supplierUnited: "11000000-0000-0000-0000-000000000003",

  // Material Aliases
  aliasSlab: "12000000-0000-0000-0000-000000000001",
  aliasBackfill: "12000000-0000-0000-0000-000000000002",
  aliasFWork: "12000000-0000-0000-0000-000000000003",

  // Site Contacts
  contact1: "13000000-0000-0000-0000-000000000001",
  contact2: "13000000-0000-0000-0000-000000000002",
  contact3: "13000000-0000-0000-0000-000000000003",
  contact4: "13000000-0000-0000-0000-000000000004",
  contact5: "13000000-0000-0000-0000-000000000005",
  contact6: "13000000-0000-0000-0000-000000000006",
  contact7: "13000000-0000-0000-0000-000000000007",
  contact8: "13000000-0000-0000-0000-000000000008",
  contact9: "13000000-0000-0000-0000-000000000009",
  contact10: "13000000-0000-0000-0000-000000000010",

  // Customer Addresses
  custAddr1: "14000000-0000-0000-0000-000000000001",
  custAddr2: "14000000-0000-0000-0000-000000000002",
  custAddr3: "14000000-0000-0000-0000-000000000003",
};

// ============================================================================
// DATE HELPERS
// ============================================================================

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysAgoDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

const NOW = new Date().toISOString();
const TODAY = new Date().toISOString().split("T")[0];

// ============================================================================
// PROFILES
// ============================================================================

export const DEMO_PROFILES: Profile[] = [
  {
    id: IDS.adminProfile,
    role: "admin",
    full_name: "Helen Fudge",
    phone: "(972) 423-7672",
    avatar_url: null,
    company_name: "J Fudge Trucking Inc",
    carrier_id: null,
    customer_id: null,
    status: "active",
    status_reason: null,
    status_changed_at: null,
    status_changed_by: null,
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.adminProfile2,
    role: "admin",
    full_name: "Zachary Wages",
    phone: "(469) 734-5713",
    avatar_url: null,
    company_name: "J Fudge Trucking Inc",
    carrier_id: null,
    customer_id: null,
    status: "active",
    status_reason: null,
    status_changed_at: null,
    status_changed_by: null,
    created_at: daysAgo(30),
    updated_at: NOW,
  },
  {
    id: IDS.customerProfile,
    role: "customer",
    full_name: "Cindy Corcoran",
    phone: null,
    avatar_url: null,
    company_name: "D.R. Horton",
    carrier_id: null,
    customer_id: IDS.customer1,
    status: "active",
    status_reason: null,
    status_changed_at: null,
    status_changed_by: null,
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.driverProfile1,
    role: "driver",
    full_name: "Chip West",
    phone: null,
    avatar_url: null,
    company_name: null,
    carrier_id: IDS.carrier1,
    customer_id: null,
    status: "active",
    status_reason: null,
    status_changed_at: null,
    status_changed_by: null,
    created_at: daysAgo(90),
    updated_at: NOW,
  },
  {
    id: IDS.carrierProfile,
    role: "carrier",
    full_name: "Terrie Hopkins",
    phone: null,
    avatar_url: null,
    company_name: "CD Hopkins",
    carrier_id: IDS.carrier1,
    customer_id: null,
    status: "active",
    status_reason: null,
    status_changed_at: null,
    status_changed_by: null,
    created_at: daysAgo(365),
    updated_at: NOW,
  },
];

// ============================================================================
// CUSTOMERS
// ============================================================================

export const DEMO_CUSTOMERS: Customer[] = [
  {
    id: IDS.customer1,
    name: "D.R. Horton",
    billing_address: "4306 Miller Rd, Rowlett TX 75088",
    billing_email: null,
    phone: null,
    payment_terms: "net_30",
    qb_customer_id: null,
    qb_environment: null,
    credit_limit: 100000,
    credit_limit_enabled: false,
    billing_cycle: "biweekly",
    contact_name: "Cindy Corcoran",
    vendor_number: "(DFWE)-1173061",
    vendor_portal_url: "cplogin.drhorton.com",
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.customer2,
    name: "The Kaufman Co Inc",
    billing_address: "PO Box 1917, Frisco TX 75034",
    billing_email: null,
    phone: null,
    payment_terms: "net_30",
    qb_customer_id: null,
    qb_environment: null,
    credit_limit: 0,
    credit_limit_enabled: false,
    billing_cycle: "monthly",
    contact_name: null,
    vendor_number: null,
    vendor_portal_url: null,
    status: "active",
    created_at: daysAgo(300),
    updated_at: NOW,
  },
  {
    id: IDS.customer3,
    name: "Shaddock Caldwell Builders",
    billing_address: "105 E Main St, Richardson TX 75081",
    billing_email: null,
    phone: null,
    payment_terms: "net_30",
    qb_customer_id: null,
    qb_environment: null,
    credit_limit: 0,
    credit_limit_enabled: false,
    billing_cycle: "as_needed",
    contact_name: "Todd",
    vendor_number: null,
    vendor_portal_url: null,
    status: "active",
    created_at: daysAgo(300),
    updated_at: NOW,
  },
];

// ============================================================================
// CARRIERS
// ============================================================================

export const DEMO_CARRIERS: Carrier[] = [
  {
    id: IDS.carrier1,
    name: "CD Hopkins",
    dba: null,
    contact_name: "Terrie Hopkins",
    phone: null,
    email: "CDhopkins@gmail.com",
    address: null,
    dispatch_fee_weekly: 1000,
    ein: null,
    mc_number: null,
    dot_number: null,
    qb_vendor_id: null,
    qb_environment: null,
    insurance_expiry: daysFromNow(120),
    w9_url: null,
    bank_routing_encrypted: null,
    bank_account_encrypted: null,
    bank_name: null,
    insurance_cert_url: null,
    agreement_url: null,
    agreement_signed_at: daysAgo(365),
    payment_terms: "net_14",
    is_1099_tracked: true,
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
];

// ============================================================================
// DRIVERS
// ============================================================================

export const DEMO_DRIVERS: Driver[] = [
  {
    id: IDS.driver1,
    carrier_id: IDS.carrier1,
    profile_id: IDS.driverProfile1,
    name: "Chip West",
    phone: null,
    email: null,
    license_number: null,
    license_expiry: null,
    truck_id: IDS.truck1,
    status: "active",
    created_at: daysAgo(90),
    updated_at: NOW,
  },
];

export const DEMO_DRIVERS_WITH_CARRIER: DriverWithCarrier[] = DEMO_DRIVERS.map(
  (d) => ({
    ...d,
    carrier: DEMO_CARRIERS.find((c) => c.id === d.carrier_id)!,
  })
);

// ============================================================================
// TRUCKS
// ============================================================================

export const DEMO_TRUCKS: Truck[] = [
  {
    id: IDS.truck1,
    carrier_id: IDS.carrier1,
    number: "Truck 1",
    license_plate: null,
    type: "sand_hauler",
    capacity_tons: 10,
    vin: null,
    year: null,
    make: null,
    model: "Hi-Rail Rotary",
    insurance_policy: null,
    insurance_expiry: null,
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.truck2,
    carrier_id: IDS.carrier1,
    number: "Truck 2",
    license_plate: null,
    type: "dump_truck",
    capacity_tons: 16,
    vin: null,
    year: null,
    make: null,
    model: "Dump Truck",
    insurance_policy: null,
    insurance_expiry: null,
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.truck3,
    carrier_id: IDS.carrier1,
    number: "Truck 3",
    license_plate: null,
    type: null,
    capacity_tons: null,
    vin: null,
    year: null,
    make: null,
    model: null,
    insurance_policy: null,
    insurance_expiry: null,
    status: "maintenance",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.truck4,
    carrier_id: IDS.carrier1,
    number: "Truck 4",
    license_plate: null,
    type: null,
    capacity_tons: null,
    vin: null,
    year: null,
    make: null,
    model: null,
    insurance_policy: null,
    insurance_expiry: null,
    status: "inactive",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
];

export const DEMO_TRUCKS_WITH_CARRIER: TruckWithCarrier[] = DEMO_TRUCKS.map(
  (t) => ({
    ...t,
    carrier: DEMO_CARRIERS.find((c) => c.id === t.carrier_id)!,
  })
);

// ============================================================================
// SITES — Quarries (pickup)
// ============================================================================

const QUARRY_SITES: Site[] = [
  {
    id: IDS.siteQuarryKaufman,
    name: "Kaufman Sand",
    type: "quarry",
    address: null,
    city: "McKinney",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: "6:00 AM - 5:00 PM Mon-Sat",
    special_instructions: null,
    customer_id: null,
    subdivision_name: null,
    project_number: null,
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.siteQuarryLowery,
    name: "Lowery Sand and Gravel",
    type: "quarry",
    address: null,
    city: null,
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: null,
    subdivision_name: null,
    project_number: null,
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.siteQuarryUnited,
    name: "United Sand and Gravel",
    type: "quarry",
    address: null,
    city: null,
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: null,
    subdivision_name: null,
    project_number: null,
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(30),
    updated_at: NOW,
  },
];

// ============================================================================
// SITES — DR Horton Subdivisions (delivery)
// ============================================================================

const JOBSITE_SITES: Site[] = [
  {
    id: IDS.siteUnionPark70s,
    name: "Union Park 70s",
    type: "jobsite",
    address: null,
    city: null,
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Union Park 70s",
    project_number: "25378",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteUnionPark60s,
    name: "Union Park 60s",
    type: "jobsite",
    address: null,
    city: null,
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Union Park 60s",
    project_number: "25377",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteRivendalePointe,
    name: "Rivendale Pointe LF",
    type: "jobsite",
    address: null,
    city: null,
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Rivendale Pointe LF",
    project_number: "25448",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteRivendaleByLake,
    name: "Rivendale by the Lake",
    type: "jobsite",
    address: null,
    city: "Hackberry",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Rivendale by the Lake",
    project_number: "25313",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteOakmont,
    name: "Oakmont",
    type: "jobsite",
    address: null,
    city: "Frisco",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Oakmont",
    project_number: "25297",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteHawkRidge,
    name: "Hawk Ridge",
    type: "jobsite",
    address: null,
    city: "Prosper",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Hawk Ridge",
    project_number: "25351",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteBluewood,
    name: "Bluewood",
    type: "jobsite",
    address: null,
    city: "Celina",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Bluewood",
    project_number: "25422",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteDCRanch,
    name: "DC Ranch",
    type: "jobsite",
    address: null,
    city: "Celina",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "DC Ranch",
    project_number: "25279",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteTrailsRiverstone,
    name: "Trails at Riverstone",
    type: "jobsite",
    address: null,
    city: "Princeton",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "The Trails at Riverstone",
    project_number: "25389",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteFossilCreek,
    name: "Fossil Creek at Westridge",
    type: "jobsite",
    address: null,
    city: "McKinney",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Fossil Creek at Westridge",
    project_number: "25211",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteTrinityFalls,
    name: "Trinity Falls",
    type: "jobsite",
    address: null,
    city: "McKinney",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Trinity Falls",
    project_number: "25394",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteReserveWestridge,
    name: "Reserve at Westridge Late Phase",
    type: "jobsite",
    address: null,
    city: null,
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Reserve at Westridge Late Phase",
    project_number: "25411",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteHighlandsWestridge,
    name: "Highlands at Westridge",
    type: "jobsite",
    address: null,
    city: "McKinney",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "The Highlands at Westridge",
    project_number: "25210",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteHighlandsVP,
    name: "Highlands at Wridge VP",
    type: "jobsite",
    address: null,
    city: "McKinney",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Highlands at Wridge (VP Series)",
    project_number: "25441",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteHighlandsFC,
    name: "Highlands at Wridge FC",
    type: "jobsite",
    address: null,
    city: "McKinney",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Highlands at Wridge (FC Series)",
    project_number: "25439",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.siteHighlandsR,
    name: "Highlands at Wridge R",
    type: "jobsite",
    address: null,
    city: "McKinney",
    state: "TX",
    zip: null,
    latitude: null,
    longitude: null,
    contact_name: null,
    contact_phone: null,
    gate_code: null,
    operating_hours: null,
    special_instructions: null,
    customer_id: IDS.customer1,
    subdivision_name: "Highlands at Wridge (R Series)",
    project_number: "25440",
    geofence_radius_meters: 500,
    status: "active",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
];

export const DEMO_SITES: Site[] = [...QUARRY_SITES, ...JOBSITE_SITES];

export const DEMO_SITES_WITH_CUSTOMER: SiteWithCustomer[] = DEMO_SITES.map(
  (s) => ({
    ...s,
    customer: s.customer_id
      ? DEMO_CUSTOMERS.find((c) => c.id === s.customer_id) ?? null
      : null,
  })
);

// ============================================================================
// MATERIALS
// ============================================================================

export const DEMO_MATERIALS: Material[] = [
  {
    id: IDS.materialCushionSand,
    name: "Cushion Sand",
    unit_of_measure: "load",
    description: "Sand under concrete slabs, plumber bedding",
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.materialMasonSand,
    name: "Mason Sand",
    unit_of_measure: "load",
    description: "Fine sand for brick layers and house construction",
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.materialTopSoil,
    name: "Top Soil",
    unit_of_measure: "load",
    description: "Landscaping and grading",
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.materialScreenedSand,
    name: "Screened Sand",
    unit_of_measure: "load",
    description: "Fine-grade applications",
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.materialBackfill,
    name: "Backfill",
    unit_of_measure: "load",
    description: "Backfill material for foundations (may be same as Cushion Sand)",
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
];

// ============================================================================
// SUPPLIERS
// ============================================================================

export const DEMO_SUPPLIERS: Supplier[] = [
  {
    id: IDS.supplierKaufman,
    name: "Kaufman Sand",
    contact_name: null,
    phone: null,
    email: null,
    address: null,
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.supplierLowery,
    name: "Lowery Sand and Gravel",
    contact_name: null,
    phone: null,
    email: null,
    address: null,
    status: "active",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.supplierUnited,
    name: "United Sand and Gravel",
    contact_name: null,
    phone: null,
    email: null,
    address: null,
    status: "active",
    created_at: daysAgo(30),
    updated_at: NOW,
  },
];

// ============================================================================
// MATERIAL ALIASES
// ============================================================================

export const DEMO_MATERIAL_ALIASES: MaterialAlias[] = [
  {
    id: IDS.aliasSlab,
    material_id: IDS.materialCushionSand,
    alias_name: "Slab Sand",
    used_by_customer_id: IDS.customer2, // Kaufman Co
    created_at: daysAgo(365),
  },
  {
    id: IDS.aliasBackfill,
    material_id: IDS.materialCushionSand,
    alias_name: "Backfill",
    used_by_customer_id: IDS.customer1, // DR Horton
    created_at: daysAgo(365),
  },
  {
    id: IDS.aliasFWork,
    material_id: IDS.materialMasonSand,
    alias_name: "F/Work Sand",
    used_by_customer_id: IDS.customer2, // Kaufman Co
    created_at: daysAgo(365),
  },
];

// ============================================================================
// SITE CONTACTS (DR Horton Superintendents)
// ============================================================================

export const DEMO_SITE_CONTACTS: SiteContact[] = [
  {
    id: IDS.contact1,
    site_id: IDS.siteFossilCreek,
    name: "Anderson, Landon",
    phone: "214-287-4984",
    role: "Superintendent",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.contact2,
    site_id: IDS.siteHighlandsWestridge,
    name: "Barajas, Jose",
    phone: "214-287-0703",
    role: "Superintendent",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.contact3,
    site_id: IDS.siteTrinityFalls,
    name: "Belanger, Rick",
    phone: "214-998-2749",
    role: "Superintendent",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.contact4,
    site_id: IDS.siteHawkRidge,
    name: "Brakebill, Kyle",
    phone: "214-470-5542",
    role: "Superintendent",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.contact5,
    site_id: IDS.siteOakmont,
    name: "Brumley, Josh",
    phone: "469-243-6937",
    role: "Superintendent",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.contact6,
    site_id: IDS.siteBluewood,
    name: "Elmore, Josh",
    phone: "214-406-7857",
    role: "Superintendent",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.contact7,
    site_id: IDS.siteDCRanch,
    name: "Fish, Mark",
    phone: "469-418-7750",
    role: "Superintendent",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.contact8,
    site_id: IDS.siteUnionPark70s,
    name: "Glinka, Sean",
    phone: "469-990-5534",
    role: "Superintendent",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.contact9,
    site_id: IDS.siteUnionPark60s,
    name: "Graham, Tyler",
    phone: "469-416-1002",
    role: "Superintendent",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.contact10,
    site_id: IDS.siteTrailsRiverstone,
    name: "Henderson, Brandon",
    phone: "682-803-3571",
    role: "Superintendent",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
];

// ============================================================================
// CUSTOMER ADDRESSES
// ============================================================================

export const DEMO_CUSTOMER_ADDRESSES: CustomerAddress[] = [
  {
    id: IDS.custAddr1,
    customer_id: IDS.customer1,
    label: "Billing",
    address: "4306 Miller Rd",
    city: "Rowlett",
    state: "TX",
    zip: "75088",
    site_id: null,
    is_default: true,
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.custAddr2,
    customer_id: IDS.customer2,
    label: "Billing",
    address: "PO Box 1917",
    city: "Frisco",
    state: "TX",
    zip: "75034",
    site_id: null,
    is_default: true,
    created_at: daysAgo(300),
    updated_at: NOW,
  },
  {
    id: IDS.custAddr3,
    customer_id: IDS.customer3,
    label: "Billing",
    address: "105 E Main St",
    city: "Richardson",
    state: "TX",
    zip: "75081",
    site_id: null,
    is_default: true,
    created_at: daysAgo(300),
    updated_at: NOW,
  },
];

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

export const DEMO_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: IDS.po1,
    customer_id: IDS.customer1,
    po_number: "HOR-2026-001",
    material_id: IDS.materialBackfill,
    delivery_site_id: IDS.siteUnionPark70s,
    quantity_ordered: 200,
    quantity_delivered: 142,
    unit: "load",
    status: "active",
    cost_code: "40026.05",
    po_type: "corporate",
    parent_po_id: null,
    notes: "Union Park 70s — Backfill, corporate PO from Horton accounting",
    created_at: daysAgo(60),
    updated_at: NOW,
  },
  {
    id: IDS.po2,
    customer_id: IDS.customer1,
    po_number: "HOR-2026-002",
    material_id: IDS.materialTopSoil,
    delivery_site_id: IDS.siteTrinityFalls,
    quantity_ordered: 50,
    quantity_delivered: 18,
    unit: "load",
    status: "active",
    cost_code: "40023.06",
    po_type: "corporate",
    parent_po_id: null,
    notes: "Trinity Falls — Top Soil",
    created_at: daysAgo(30),
    updated_at: NOW,
  },
  {
    id: IDS.po3,
    customer_id: IDS.customer1,
    po_number: "FD-WEEK-0312",
    material_id: IDS.materialBackfill,
    delivery_site_id: IDS.siteUnionPark70s,
    quantity_ordered: 20,
    quantity_delivered: 8,
    unit: "load",
    status: "active",
    cost_code: "40026.05",
    po_type: "field_direction",
    parent_po_id: IDS.po1,
    notes: "Weekly field direction from superintendent — 20 loads this week",
    created_at: daysAgo(5),
    updated_at: NOW,
  },
];

export const DEMO_PURCHASE_ORDERS_WITH_RELATIONS: PurchaseOrderWithRelations[] =
  DEMO_PURCHASE_ORDERS.map((po) => ({
    ...po,
    customer: DEMO_CUSTOMERS.find((c) => c.id === po.customer_id)!,
    material: DEMO_MATERIALS.find((m) => m.id === po.material_id)!,
    delivery_site: DEMO_SITES.find((s) => s.id === po.delivery_site_id)!,
    parent_po: po.parent_po_id
      ? DEMO_PURCHASE_ORDERS.find((p) => p.id === po.parent_po_id) ?? null
      : null,
  }));

// ============================================================================
// RATES — Customer rates (what JFT charges)
// ============================================================================

export const DEMO_RATES: Rate[] = [
  // DR Horton rates
  {
    id: IDS.rate1,
    type: "customer",
    customer_id: IDS.customer1,
    carrier_id: null,
    material_id: IDS.materialBackfill,
    pickup_site_id: null,
    delivery_site_id: null,
    delivery_city: null,
    rate_per_unit: 185,
    rate_type: "per_load",
    effective_date: "2025-02-04",
    expiration_date: null,
    created_by: IDS.adminProfile,
    notes: "DR Horton — Backfill $185/load (Feb 2025 price increase)",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.rate2,
    type: "customer",
    customer_id: IDS.customer1,
    carrier_id: null,
    material_id: IDS.materialTopSoil,
    pickup_site_id: null,
    delivery_site_id: null,
    delivery_city: null,
    rate_per_unit: 185,
    rate_type: "per_load",
    effective_date: "2025-02-04",
    expiration_date: null,
    created_by: IDS.adminProfile,
    notes: "DR Horton — Top Soil $185/load (Feb 2025 price increase)",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.rate3,
    type: "customer",
    customer_id: IDS.customer1,
    carrier_id: null,
    material_id: IDS.materialMasonSand,
    pickup_site_id: null,
    delivery_site_id: null,
    delivery_city: null,
    rate_per_unit: 375,
    rate_type: "per_load",
    effective_date: "2025-02-04",
    expiration_date: null,
    created_by: IDS.adminProfile,
    notes: "DR Horton — Mason Sand $375/load (Feb 2025 price increase)",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  // Shaddock rate
  {
    id: IDS.rate4,
    type: "customer",
    customer_id: IDS.customer3,
    carrier_id: null,
    material_id: IDS.materialCushionSand,
    pickup_site_id: null,
    delivery_site_id: null,
    delivery_city: null,
    rate_per_unit: 275,
    rate_type: "per_load",
    effective_date: "2025-01-01",
    expiration_date: null,
    created_by: IDS.adminProfile,
    notes: "Shaddock — Cushion Sand $275/load",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  // Kaufman Co rates (by city)
  {
    id: IDS.rate5,
    type: "customer",
    customer_id: IDS.customer2,
    carrier_id: null,
    material_id: IDS.materialCushionSand,
    pickup_site_id: null,
    delivery_site_id: null,
    delivery_city: "Ft Worth",
    rate_per_unit: 260,
    rate_type: "per_load",
    effective_date: "2024-11-01",
    expiration_date: null,
    created_by: IDS.adminProfile,
    notes: "Kaufman Co — Slab Sand to Ft Worth $260/load",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.rate6,
    type: "customer",
    customer_id: IDS.customer2,
    carrier_id: null,
    material_id: IDS.materialCushionSand,
    pickup_site_id: null,
    delivery_site_id: null,
    delivery_city: "Sanger",
    rate_per_unit: 245,
    rate_type: "per_load",
    effective_date: "2024-11-01",
    expiration_date: null,
    created_by: IDS.adminProfile,
    notes: "Kaufman Co — Slab Sand to Sanger $245/load",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  {
    id: IDS.rate7,
    type: "customer",
    customer_id: IDS.customer2,
    carrier_id: null,
    material_id: IDS.materialMasonSand,
    pickup_site_id: null,
    delivery_site_id: null,
    delivery_city: "Ft Worth",
    rate_per_unit: 260,
    rate_type: "per_load",
    effective_date: "2024-11-01",
    expiration_date: null,
    created_by: IDS.adminProfile,
    notes: "Kaufman Co — F/Work Sand to Ft Worth $260/load",
    created_at: daysAgo(180),
    updated_at: NOW,
  },
  // Carrier rates — CD Hopkins
  {
    id: IDS.rateCarrier1,
    type: "carrier",
    customer_id: null,
    carrier_id: IDS.carrier1,
    material_id: IDS.materialCushionSand,
    pickup_site_id: null,
    delivery_site_id: null,
    delivery_city: null,
    rate_per_unit: 130,
    rate_type: "per_load",
    effective_date: "2025-01-01",
    expiration_date: null,
    created_by: IDS.adminProfile,
    notes: "CD Hopkins carrier rate — Cushion Sand $130/load",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.rateCarrier2,
    type: "carrier",
    customer_id: null,
    carrier_id: IDS.carrier1,
    material_id: IDS.materialMasonSand,
    pickup_site_id: null,
    delivery_site_id: null,
    delivery_city: null,
    rate_per_unit: 130,
    rate_type: "per_load",
    effective_date: "2025-01-01",
    expiration_date: null,
    created_by: IDS.adminProfile,
    notes: "CD Hopkins carrier rate — Mason Sand $130/load",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
  {
    id: IDS.rateCarrier3,
    type: "carrier",
    customer_id: null,
    carrier_id: IDS.carrier1,
    material_id: IDS.materialTopSoil,
    pickup_site_id: null,
    delivery_site_id: null,
    delivery_city: null,
    rate_per_unit: 130,
    rate_type: "per_load",
    effective_date: "2025-01-01",
    expiration_date: null,
    created_by: IDS.adminProfile,
    notes: "CD Hopkins carrier rate — Top Soil $130/load",
    created_at: daysAgo(365),
    updated_at: NOW,
  },
];

export const DEMO_RATES_WITH_RELATIONS: RateWithRelations[] = DEMO_RATES.map(
  (r) => ({
    ...r,
    customer: r.customer_id
      ? {
          id: r.customer_id,
          name:
            DEMO_CUSTOMERS.find((c) => c.id === r.customer_id)?.name ?? "",
        }
      : null,
    carrier: r.carrier_id
      ? {
          id: r.carrier_id,
          name:
            DEMO_CARRIERS.find((c) => c.id === r.carrier_id)?.name ?? "",
        }
      : null,
    material: {
      id: r.material_id,
      name: DEMO_MATERIALS.find((m) => m.id === r.material_id)?.name ?? "",
      unit_of_measure:
        DEMO_MATERIALS.find((m) => m.id === r.material_id)?.unit_of_measure ??
        "load",
    },
    pickup_site: r.pickup_site_id
      ? {
          id: r.pickup_site_id,
          name:
            DEMO_SITES.find((s) => s.id === r.pickup_site_id)?.name ?? "",
        }
      : null,
    delivery_site: r.delivery_site_id
      ? {
          id: r.delivery_site_id,
          name:
            DEMO_SITES.find((s) => s.id === r.delivery_site_id)?.name ?? "",
        }
      : null,
  })
);

// ============================================================================
// ORDERS
// ============================================================================

export const DEMO_ORDERS: Order[] = [
  {
    id: IDS.order1,
    customer_id: IDS.customer1,
    purchase_order_id: IDS.po1,
    material_id: IDS.materialBackfill,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    requested_loads: 10,
    scheduled_date: daysAgoDate(5),
    status: "in_progress",
    notes: "Backfill to Union Park 70s — 10 loads",
    created_by: IDS.adminProfile,
    created_at: daysAgo(7),
    updated_at: NOW,
  },
  {
    id: IDS.order2,
    customer_id: IDS.customer1,
    purchase_order_id: IDS.po2,
    material_id: IDS.materialTopSoil,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteTrinityFalls,
    delivery_address: null,
    requested_loads: 5,
    scheduled_date: TODAY,
    status: "approved",
    notes: "Top Soil to Trinity Falls",
    created_by: IDS.adminProfile,
    created_at: daysAgo(3),
    updated_at: NOW,
  },
  {
    id: IDS.order3,
    customer_id: IDS.customer1,
    purchase_order_id: IDS.po3,
    material_id: IDS.materialBackfill,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    requested_loads: 8,
    scheduled_date: daysFromNow(2),
    status: "pending",
    notes: "Weekly field direction — Backfill to Union Park 70s",
    created_by: IDS.adminProfile,
    created_at: daysAgo(1),
    updated_at: NOW,
  },
];

export const DEMO_ORDERS_WITH_RELATIONS: OrderWithRelations[] =
  DEMO_ORDERS.map((o) => ({
    ...o,
    customer: DEMO_CUSTOMERS.find((c) => c.id === o.customer_id)!,
    purchase_order: DEMO_PURCHASE_ORDERS.find(
      (p) => p.id === o.purchase_order_id
    )!,
    material: DEMO_MATERIALS.find((m) => m.id === o.material_id)!,
    pickup_site: DEMO_SITES.find((s) => s.id === o.pickup_site_id)!,
    delivery_site: DEMO_SITES.find((s) => s.id === o.delivery_site_id)!,
  }));

// ============================================================================
// DISPATCHES
// ============================================================================

export const DEMO_DISPATCHES: Dispatch[] = [
  // Completed dispatches from 5 days ago — Backfill to Union Park 70s
  {
    id: IDS.dispatch1,
    order_id: IDS.order1,
    carrier_id: IDS.carrier1,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    purchase_order_id: IDS.po1,
    scheduled_date: daysAgoDate(5),
    status: "confirmed",
    dispatched_at: daysAgo(5),
    acknowledged_at: daysAgo(5),
    notes: null,
    created_at: daysAgo(6),
    updated_at: daysAgo(4),
  },
  {
    id: IDS.dispatch2,
    order_id: IDS.order1,
    carrier_id: IDS.carrier1,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    purchase_order_id: IDS.po1,
    scheduled_date: daysAgoDate(5),
    status: "confirmed",
    dispatched_at: daysAgo(5),
    acknowledged_at: daysAgo(5),
    notes: null,
    created_at: daysAgo(6),
    updated_at: daysAgo(4),
  },
  // Dispatches from 3 days ago — one delivered, one disputed
  {
    id: IDS.dispatch3,
    order_id: IDS.order1,
    carrier_id: IDS.carrier1,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    purchase_order_id: IDS.po1,
    scheduled_date: daysAgoDate(3),
    status: "delivered",
    dispatched_at: daysAgo(3),
    acknowledged_at: daysAgo(3),
    notes: null,
    created_at: daysAgo(4),
    updated_at: daysAgo(3),
  },
  {
    id: IDS.dispatch4,
    order_id: IDS.order1,
    carrier_id: IDS.carrier1,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    purchase_order_id: IDS.po1,
    scheduled_date: daysAgoDate(3),
    status: "disputed",
    dispatched_at: daysAgo(3),
    acknowledged_at: daysAgo(3),
    notes: null,
    created_at: daysAgo(4),
    updated_at: daysAgo(2),
  },
  // Today's dispatches — Top Soil to Trinity Falls
  {
    id: IDS.dispatch5,
    order_id: IDS.order2,
    carrier_id: IDS.carrier1,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialTopSoil,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteTrinityFalls,
    delivery_address: null,
    purchase_order_id: IDS.po2,
    scheduled_date: TODAY,
    status: "in_progress",
    dispatched_at: NOW,
    acknowledged_at: NOW,
    notes: "Top Soil load",
    created_at: daysAgo(1),
    updated_at: NOW,
  },
  {
    id: IDS.dispatch6,
    order_id: IDS.order2,
    carrier_id: IDS.carrier1,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialTopSoil,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteTrinityFalls,
    delivery_address: null,
    purchase_order_id: IDS.po2,
    scheduled_date: TODAY,
    status: "scheduled",
    dispatched_at: null,
    acknowledged_at: null,
    notes: null,
    created_at: daysAgo(1),
    updated_at: NOW,
  },
  // Future dispatches
  {
    id: IDS.dispatch7,
    order_id: IDS.order3,
    carrier_id: IDS.carrier1,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    purchase_order_id: IDS.po3,
    scheduled_date: daysFromNow(2),
    status: "scheduled",
    dispatched_at: null,
    acknowledged_at: null,
    notes: "Field direction — Backfill to Union Park 70s",
    created_at: daysAgo(1),
    updated_at: NOW,
  },
  {
    id: IDS.dispatch8,
    order_id: IDS.order3,
    carrier_id: IDS.carrier1,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    pickup_site_id: IDS.siteQuarryKaufman,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    purchase_order_id: IDS.po3,
    scheduled_date: daysFromNow(1),
    status: "scheduled",
    dispatched_at: null,
    acknowledged_at: null,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_DISPATCHES_WITH_RELATIONS: DispatchWithRelations[] =
  DEMO_DISPATCHES.map((d) => ({
    ...d,
    order: d.order_id
      ? DEMO_ORDERS.find((o) => o.id === d.order_id) ?? null
      : null,
    carrier: DEMO_CARRIERS.find((c) => c.id === d.carrier_id)!,
    driver: DEMO_DRIVERS.find((dr) => dr.id === d.driver_id)!,
    truck: DEMO_TRUCKS.find((t) => t.id === d.truck_id)!,
    material: DEMO_MATERIALS.find((m) => m.id === d.material_id)!,
    pickup_site: DEMO_SITES.find((s) => s.id === d.pickup_site_id)!,
    delivery_site: DEMO_SITES.find((s) => s.id === d.delivery_site_id)!,
    purchase_order: d.purchase_order_id
      ? DEMO_PURCHASE_ORDERS.find((p) => p.id === d.purchase_order_id) ?? null
      : null,
  }));

// ============================================================================
// DELIVERIES
// ============================================================================

export const DEMO_DELIVERIES: Delivery[] = [
  // Delivery 1 — Backfill, confirmed, 5 days ago
  {
    id: IDS.delivery1,
    dispatch_id: IDS.dispatch1,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    ticket_number: "TKT-001",
    ticket_photo_url: null,
    gross_weight: null,
    tare_weight: null,
    net_weight: null,
    gps_latitude: null,
    gps_longitude: null,
    gps_accuracy_meters: null,
    geofence_verified: true,
    delivered_at: daysAgo(5),
    confirmation_status: "confirmed",
    confirmed_at: daysAgo(4),
    confirmed_by: IDS.customerProfile,
    dispute_reason: null,
    dispute_resolved_at: null,
    dispute_resolved_by: null,
    dispute_resolution: null,
    synced_offline: false,
    synced_at: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(4),
  },
  // Delivery 2 — Backfill, confirmed, 5 days ago
  {
    id: IDS.delivery2,
    dispatch_id: IDS.dispatch2,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    ticket_number: "TKT-002",
    ticket_photo_url: null,
    gross_weight: null,
    tare_weight: null,
    net_weight: null,
    gps_latitude: null,
    gps_longitude: null,
    gps_accuracy_meters: null,
    geofence_verified: true,
    delivered_at: daysAgo(5),
    confirmation_status: "confirmed",
    confirmed_at: daysAgo(4),
    confirmed_by: IDS.customerProfile,
    dispute_reason: null,
    dispute_resolved_at: null,
    dispute_resolved_by: null,
    dispute_resolution: null,
    synced_offline: false,
    synced_at: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(4),
  },
  // Delivery 3 — Backfill, pending confirmation, 3 days ago
  {
    id: IDS.delivery3,
    dispatch_id: IDS.dispatch3,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    ticket_number: "TKT-003",
    ticket_photo_url: null,
    gross_weight: null,
    tare_weight: null,
    net_weight: null,
    gps_latitude: null,
    gps_longitude: null,
    gps_accuracy_meters: null,
    geofence_verified: true,
    delivered_at: daysAgo(3),
    confirmation_status: "pending",
    confirmed_at: null,
    confirmed_by: null,
    dispute_reason: null,
    dispute_resolved_at: null,
    dispute_resolved_by: null,
    dispute_resolution: null,
    synced_offline: false,
    synced_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  // Delivery 4 — Backfill, DISPUTED, 3 days ago
  {
    id: IDS.delivery4,
    dispatch_id: IDS.dispatch4,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    ticket_number: "TKT-004",
    ticket_photo_url: null,
    gross_weight: null,
    tare_weight: null,
    net_weight: null,
    gps_latitude: null,
    gps_longitude: null,
    gps_accuracy_meters: null,
    geofence_verified: false,
    delivered_at: daysAgo(3),
    confirmation_status: "disputed",
    confirmed_at: null,
    confirmed_by: null,
    dispute_reason: "Superintendent says load was not delivered to correct lot",
    dispute_resolved_at: null,
    dispute_resolved_by: null,
    dispute_resolution: null,
    synced_offline: false,
    synced_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(2),
  },
  // Delivery 5 — Backfill, confirmed, 4 days ago
  {
    id: IDS.delivery5,
    dispatch_id: IDS.dispatch5,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    ticket_number: "TKT-005",
    ticket_photo_url: null,
    gross_weight: null,
    tare_weight: null,
    net_weight: null,
    gps_latitude: null,
    gps_longitude: null,
    gps_accuracy_meters: null,
    geofence_verified: true,
    delivered_at: daysAgo(4),
    confirmation_status: "confirmed",
    confirmed_at: daysAgo(3),
    confirmed_by: IDS.customerProfile,
    dispute_reason: null,
    dispute_resolved_at: null,
    dispute_resolved_by: null,
    dispute_resolution: null,
    synced_offline: false,
    synced_at: null,
    created_at: daysAgo(4),
    updated_at: daysAgo(3),
  },
  // Delivery 6 — Backfill, pending confirmation, 4 days ago
  {
    id: IDS.delivery6,
    dispatch_id: IDS.dispatch6,
    driver_id: IDS.driver1,
    truck_id: IDS.truck1,
    material_id: IDS.materialBackfill,
    delivery_site_id: IDS.siteUnionPark70s,
    delivery_address: null,
    ticket_number: "TKT-006",
    ticket_photo_url: null,
    gross_weight: null,
    tare_weight: null,
    net_weight: null,
    gps_latitude: null,
    gps_longitude: null,
    gps_accuracy_meters: null,
    geofence_verified: true,
    delivered_at: daysAgo(4),
    confirmation_status: "pending",
    confirmed_at: null,
    confirmed_by: null,
    dispute_reason: null,
    dispute_resolved_at: null,
    dispute_resolved_by: null,
    dispute_resolution: null,
    synced_offline: false,
    synced_at: null,
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
  },
];

export const DEMO_DELIVERIES_WITH_RELATIONS: DeliveryWithRelations[] =
  DEMO_DELIVERIES.map((d) => ({
    ...d,
    dispatch: DEMO_DISPATCHES.find((di) => di.id === d.dispatch_id)!,
    driver: DEMO_DRIVERS.find((dr) => dr.id === d.driver_id)!,
    truck: DEMO_TRUCKS.find((t) => t.id === d.truck_id)!,
    material: DEMO_MATERIALS.find((m) => m.id === d.material_id)!,
    delivery_site: DEMO_SITES.find((s) => s.id === d.delivery_site_id)!,
  }));

// ============================================================================
// INVOICES & LINE ITEMS
// ============================================================================

export const DEMO_LINE_ITEMS: InvoiceLineItem[] = [
  // Invoice 1: 2 loads Backfill @ $185 = $370
  {
    id: IDS.lineItem1,
    invoice_id: IDS.invoice1,
    delivery_id: IDS.delivery1,
    purchase_order_id: IDS.po1,
    description: "Backfill - 1 load @ $185/load (TKT-001) — Union Park 70s",
    quantity: 1,
    unit: "load",
    rate: 185,
    amount: 185,
    material_id: IDS.materialBackfill,
    cost_code: "40026.05",
    delivery_date: daysAgoDate(5),
    delivery_address: null,
    created_at: daysAgo(10),
  },
  {
    id: IDS.lineItem2,
    invoice_id: IDS.invoice1,
    delivery_id: IDS.delivery2,
    purchase_order_id: IDS.po1,
    description: "Backfill - 1 load @ $185/load (TKT-002) — Union Park 70s",
    quantity: 1,
    unit: "load",
    rate: 185,
    amount: 185,
    material_id: IDS.materialBackfill,
    cost_code: "40026.05",
    delivery_date: daysAgoDate(5),
    delivery_address: null,
    created_at: daysAgo(10),
  },
  // Invoice 2: 2 loads Backfill @ $185 = $370
  {
    id: IDS.lineItem3,
    invoice_id: IDS.invoice2,
    delivery_id: IDS.delivery5,
    purchase_order_id: IDS.po1,
    description: "Backfill - 1 load @ $185/load (TKT-005) — Union Park 70s",
    quantity: 1,
    unit: "load",
    rate: 185,
    amount: 185,
    material_id: IDS.materialBackfill,
    cost_code: "40026.05",
    delivery_date: daysAgoDate(4),
    delivery_address: null,
    created_at: daysAgo(5),
  },
  {
    id: IDS.lineItem4,
    invoice_id: IDS.invoice2,
    delivery_id: IDS.delivery6,
    purchase_order_id: IDS.po1,
    description: "Backfill - 1 load @ $185/load (TKT-006) — Union Park 70s",
    quantity: 1,
    unit: "load",
    rate: 185,
    amount: 185,
    material_id: IDS.materialBackfill,
    cost_code: "40026.05",
    delivery_date: daysAgoDate(4),
    delivery_address: null,
    created_at: daysAgo(5),
  },
  // Invoice 3: 2 loads (1 pending confirmation, 1 disputed) @ $185 = $370
  {
    id: IDS.lineItem5,
    invoice_id: IDS.invoice3,
    delivery_id: IDS.delivery3,
    purchase_order_id: IDS.po1,
    description: "Backfill - 1 load @ $185/load (TKT-003) — Union Park 70s",
    quantity: 1,
    unit: "load",
    rate: 185,
    amount: 185,
    material_id: IDS.materialBackfill,
    cost_code: "40026.05",
    delivery_date: daysAgoDate(3),
    delivery_address: null,
    created_at: daysAgo(2),
  },
  {
    id: IDS.lineItem6,
    invoice_id: IDS.invoice3,
    delivery_id: IDS.delivery4,
    purchase_order_id: IDS.po1,
    description: "Backfill - 1 load @ $185/load (TKT-004) — Union Park 70s [DISPUTED]",
    quantity: 1,
    unit: "load",
    rate: 185,
    amount: 185,
    material_id: IDS.materialBackfill,
    cost_code: "40026.05",
    delivery_date: daysAgoDate(3),
    delivery_address: null,
    created_at: daysAgo(2),
  },
];

export const DEMO_INVOICES: Invoice[] = [
  {
    id: IDS.invoice1,
    customer_id: IDS.customer1,
    invoice_number: "JFT-2026-0001",
    period_start: daysAgoDate(14),
    period_end: daysAgoDate(7),
    subtotal: 370,
    tax_amount: 0,
    total: 370,
    status: "paid",
    due_date: daysAgoDate(0),
    sent_at: daysAgo(10),
    paid_at: daysAgo(5),
    qb_invoice_id: null,
    qb_environment: null,
    qb_payment_link: null,
    pdf_url: null,
    notes: null,
    created_by: IDS.adminProfile,
    created_at: daysAgo(10),
    updated_at: daysAgo(5),
  },
  {
    id: IDS.invoice2,
    customer_id: IDS.customer1,
    invoice_number: "JFT-2026-0002",
    period_start: daysAgoDate(7),
    period_end: daysAgoDate(1),
    subtotal: 370,
    tax_amount: 0,
    total: 370,
    status: "sent",
    due_date: daysFromNow(23),
    sent_at: daysAgo(3),
    paid_at: null,
    qb_invoice_id: null,
    qb_environment: null,
    qb_payment_link: null,
    pdf_url: null,
    notes: null,
    created_by: IDS.adminProfile,
    created_at: daysAgo(5),
    updated_at: daysAgo(3),
  },
  {
    id: IDS.invoice3,
    customer_id: IDS.customer1,
    invoice_number: "JFT-2026-0003",
    period_start: daysAgoDate(3),
    period_end: TODAY,
    subtotal: 370,
    tax_amount: 0,
    total: 370,
    status: "draft",
    due_date: daysFromNow(30),
    sent_at: null,
    paid_at: null,
    qb_invoice_id: null,
    qb_environment: null,
    qb_payment_link: null,
    pdf_url: null,
    notes: "Includes 1 disputed delivery (TKT-004)",
    created_by: IDS.adminProfile,
    created_at: daysAgo(2),
    updated_at: NOW,
  },
];

export const DEMO_INVOICES_WITH_CUSTOMER: (Invoice & {
  customer: Customer;
})[] = DEMO_INVOICES.map((inv) => ({
  ...inv,
  customer: DEMO_CUSTOMERS.find((c) => c.id === inv.customer_id)!,
}));

export const DEMO_INVOICES_WITH_LINE_ITEMS: InvoiceWithLineItems[] =
  DEMO_INVOICES.map((inv) => ({
    ...inv,
    customer: DEMO_CUSTOMERS.find((c) => c.id === inv.customer_id)!,
    line_items: DEMO_LINE_ITEMS.filter((li) => li.invoice_id === inv.id),
  }));

// ============================================================================
// PAYMENTS
// ============================================================================

export const DEMO_PAYMENTS: Payment[] = [
  {
    id: IDS.payment1,
    invoice_id: IDS.invoice1,
    customer_id: IDS.customer1,
    amount: 370,
    payment_method: "check",
    status: "completed",
    qb_payment_id: null,
    qb_environment: null,
    ach_transaction_id: null,
    failure_reason: null,
    paid_at: daysAgo(5),
    recorded_at: daysAgo(5),
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
  },
  {
    id: IDS.payment2,
    invoice_id: IDS.invoice2,
    customer_id: IDS.customer1,
    amount: 185,
    payment_method: "check",
    status: "pending",
    qb_payment_id: null,
    qb_environment: null,
    ach_transaction_id: null,
    failure_reason: null,
    paid_at: null,
    recorded_at: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
];

export const DEMO_PAYMENTS_WITH_RELATIONS: PaymentWithRelations[] =
  DEMO_PAYMENTS.map((p) => ({
    ...p,
    invoice: DEMO_INVOICES.find((i) => i.id === p.invoice_id)!,
    customer: DEMO_CUSTOMERS.find((c) => c.id === p.customer_id)!,
  }));

// ============================================================================
// CARRIER SETTLEMENTS
// CD Hopkins: ~100 loads biweekly = ~$13,000 hauling + $2,000 dispatch fee
// ============================================================================

export const DEMO_SETTLEMENT_LINES: CarrierSettlementLine[] = [
  {
    id: IDS.settlementLine1,
    settlement_id: IDS.settlement1,
    delivery_id: IDS.delivery1,
    rate_applied: 130,
    amount: 130,
    created_at: daysAgo(8),
  },
  {
    id: IDS.settlementLine2,
    settlement_id: IDS.settlement1,
    delivery_id: IDS.delivery2,
    rate_applied: 130,
    amount: 130,
    created_at: daysAgo(8),
  },
  {
    id: IDS.settlementLine3,
    settlement_id: IDS.settlement1,
    delivery_id: IDS.delivery5,
    rate_applied: 130,
    amount: 130,
    created_at: daysAgo(8),
  },
  {
    id: IDS.settlementLine4,
    settlement_id: IDS.settlement2,
    delivery_id: IDS.delivery3,
    rate_applied: 130,
    amount: 130,
    created_at: daysAgo(3),
  },
  {
    id: IDS.settlementLine5,
    settlement_id: IDS.settlement2,
    delivery_id: IDS.delivery6,
    rate_applied: 130,
    amount: 130,
    created_at: daysAgo(3),
  },
];

export const DEMO_SETTLEMENTS: CarrierSettlement[] = [
  {
    id: IDS.settlement1,
    carrier_id: IDS.carrier1,
    settlement_number: "SET-00001",
    period_start: daysAgoDate(14),
    period_end: daysAgoDate(7),
    hauling_amount: 390,
    dispatch_fee: 2000,
    deductions: 0,
    total_amount: 2390,
    status: "paid",
    qb_bill_id: null,
    qb_environment: null,
    approved_by: IDS.adminProfile,
    approved_at: daysAgo(6),
    paid_at: daysAgo(5),
    notes: "Biweekly settlement — 3 confirmed loads + $1,000/wk dispatch fee",
    created_at: daysAgo(8),
    updated_at: daysAgo(5),
  },
  {
    id: IDS.settlement2,
    carrier_id: IDS.carrier1,
    settlement_number: "SET-00002",
    period_start: daysAgoDate(7),
    period_end: daysAgoDate(1),
    hauling_amount: 260,
    dispatch_fee: 2000,
    deductions: 0,
    total_amount: 2260,
    status: "approved",
    qb_bill_id: null,
    qb_environment: null,
    approved_by: IDS.adminProfile,
    approved_at: daysAgo(1),
    paid_at: null,
    notes: "Biweekly settlement — 2 loads (pending + confirmed) + dispatch fee",
    created_at: daysAgo(3),
    updated_at: daysAgo(1),
  },
];

export const DEMO_SETTLEMENTS_WITH_LINES: CarrierSettlementWithLines[] =
  DEMO_SETTLEMENTS.map((s) => ({
    ...s,
    carrier: DEMO_CARRIERS.find((c) => c.id === s.carrier_id)!,
    lines: DEMO_SETTLEMENT_LINES.filter((l) => l.settlement_id === s.id),
  }));

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: IDS.notification1,
    user_id: IDS.adminProfile,
    type: "delivery_confirmed",
    title: "Delivery Confirmed",
    message:
      "D.R. Horton confirmed delivery TKT-001 (1 load Backfill to Union Park 70s).",
    channel: "in_app",
    read: false,
    read_at: null,
    data: { delivery_id: IDS.delivery1 },
    created_at: daysAgo(4),
  },
  {
    id: IDS.notification2,
    user_id: IDS.adminProfile,
    type: "delivery_disputed",
    title: "Delivery Disputed",
    message:
      "D.R. Horton disputed delivery TKT-004: Load not delivered to correct lot.",
    channel: "in_app",
    read: false,
    read_at: null,
    data: { delivery_id: IDS.delivery4 },
    created_at: daysAgo(2),
  },
  {
    id: IDS.notification3,
    user_id: IDS.adminProfile,
    type: "payment_received",
    title: "Payment Received",
    message:
      "D.R. Horton paid invoice JFT-2026-0001 ($370.00 via check).",
    channel: "in_app",
    read: true,
    read_at: daysAgo(4),
    data: { payment_id: IDS.payment1, invoice_id: IDS.invoice1 },
    created_at: daysAgo(5),
  },
  {
    id: IDS.notification4,
    user_id: IDS.adminProfile,
    type: "po_threshold",
    title: "PO Nearing Limit",
    message: "PO HOR-2026-001 is 71% consumed (142 of 200 loads delivered).",
    channel: "in_app",
    read: false,
    read_at: null,
    data: { po_id: IDS.po1 },
    created_at: daysAgo(1),
  },
  {
    id: IDS.notification5,
    user_id: IDS.customerProfile,
    type: "invoice_sent",
    title: "New Invoice",
    message:
      "Invoice JFT-2026-0002 for $370.00 has been sent. Due in 23 days.",
    channel: "in_app",
    read: false,
    read_at: null,
    data: { invoice_id: IDS.invoice2 },
    created_at: daysAgo(3),
  },
  {
    id: IDS.notification6,
    user_id: IDS.driverProfile1,
    type: "dispatch_assigned",
    title: "New Load Assigned",
    message:
      "You have a new load scheduled for today: Top Soil to Trinity Falls (McKinney).",
    channel: "in_app",
    read: false,
    read_at: null,
    data: { dispatch_id: IDS.dispatch5 },
    created_at: daysAgo(0),
  },
];

// ============================================================================
// DASHBOARD DATA (admin)
// ============================================================================

export function getDemoDashboardData(): DashboardData {
  const kpi: DashboardKpi = {
    todaysLoads: 2,
    todaysLoadsTrend: 10,
    weekLoads: 8,
    monthRevenue: 35000,
    outstandingInvoices: 370,
    overdueInvoices: 3,
    overdueAmount: 45000,
    grossMargin: 18000,
    marginPercent: 51,
    carrierPayTotal: 13000,
    dispatchFeeTotal: 4000,
    payablesAmount: 15000,
    payablesCount: 1,
  };

  const pendingActions: PendingAction[] = [
    {
      id: "pending-confirmations",
      type: "confirmation",
      title: "2 deliveries awaiting confirmation",
      subtitle: "D.R. Horton — Union Park 70s",
      href: "/admin/deliveries?status=pending",
      severity: "warning",
    },
    {
      id: "disputes",
      type: "dispute",
      title: "1 dispute needs review",
      subtitle: "TKT-004 — Load not delivered to correct lot",
      href: "/admin/disputes",
      severity: "critical",
    },
    {
      id: `po-${IDS.po1}`,
      type: "po_threshold",
      title: "PO #HOR-2026-001: 71% consumed",
      subtitle: "142 of 200 loads delivered — Union Park 70s Backfill",
      href: "/admin/rates",
      severity: "warning",
    },
  ];

  const recentDeliveries: RecentDelivery[] = DEMO_DELIVERIES.slice(0, 6).map(
    (d) => ({
      id: d.id,
      deliveryNumber: d.ticket_number ?? "---",
      material:
        DEMO_MATERIALS.find((m) => m.id === d.material_id)?.name ?? "Unknown",
      weight: d.net_weight,
      unit: "load",
      status: d.confirmation_status as RecentDelivery["status"],
      deliveredAt: d.delivered_at,
      driverName:
        DEMO_DRIVERS.find((dr) => dr.id === d.driver_id)?.name ?? null,
      customerName: "D.R. Horton",
    })
  );

  const arAging: ArAgingBucket[] = [
    { label: "Current", amount: 370, color: "#4ADE80" },
    { label: "1-30 days", amount: 12500, color: "#EDBC18" },
    { label: "31-60 days", amount: 15000, color: "#FBB040" },
    { label: "61-90 days", amount: 10000, color: "#F97316" },
    { label: "90+ days", amount: 7500, color: "#C75030" },
  ];

  // Last 30 days revenue data — realistic at ~$1,200/day average
  const revenueByDay: { date: string; revenue: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = daysAgoDate(i);
    // Weekdays get revenue (5 loads/day @ $185 + some mason sand at $375)
    const dayOfWeek = new Date(date).getDay();
    const isWeekday = dayOfWeek > 0 && dayOfWeek < 6;
    let revenue = 0;
    if (isWeekday) {
      // Vary daily revenue realistically between $925-$1850
      revenue = 925 + Math.floor((i * 37) % 6) * 185;
    }
    revenueByDay.push({ date, revenue });
  }

  const qbHealth: QBHealthData = {
    connected: false,
    lastSyncAt: null,
    failedSyncsCount: 0,
    totalSyncsToday: 0,
  };

  return {
    kpi,
    pendingActions,
    recentDeliveries,
    arAging,
    revenueByDay,
    qbHealth,
  };
}
