# QuickBooks Online API Integration Research
## J Fudge Trucking TMS - Comprehensive Integration Guide

**Research Date:** March 18, 2026
**Purpose:** Determine feasibility and architecture for integrating a Next.js + Supabase TMS with QuickBooks Online
**Verdict:** Fully feasible. QBO API covers all required workflows: invoice creation, payment recording, vendor bills, 1099 tracking, reports, and attachments.

---

## Table of Contents

1. [API Capabilities & Endpoints](#1-api-capabilities--endpoints)
2. [Authentication & OAuth 2.0](#2-authentication--oauth-20)
3. [QuickBooks Payments](#3-quickbooks-payments)
4. [Webhooks](#4-webhooks)
5. [1099 Tracking & Tax Season](#5-1099-tracking--tax-season)
6. [Data Sync Patterns](#6-data-sync-patterns)
7. [Libraries & SDKs](#7-libraries--sdks)
8. [Migration & Transition Plan](#8-migration--transition-plan)

---

## 1. API Capabilities & Endpoints

### Base URLs

| Environment | URL |
|-------------|-----|
| Production  | `https://quickbooks.api.intuit.com` |
| Sandbox     | `https://sandbox-quickbooks.api.intuit.com` |

All endpoints follow the pattern: `{baseUrl}/v3/company/{realmId}/{entity}`

Add `?minorversion=75` (or current latest) to all requests for latest features.

### Core Entities & Endpoints

| Entity | Create | Read | Update | Delete | Query |
|--------|--------|------|--------|--------|-------|
| Invoice | POST /invoice | GET /invoice/{id} | POST /invoice | POST /invoice?operation=delete | GET /query |
| Payment | POST /payment | GET /payment/{id} | POST /payment | POST /payment?operation=delete | GET /query |
| Bill | POST /bill | GET /bill/{id} | POST /bill | POST /bill?operation=delete | GET /query |
| BillPayment | POST /billpayment | GET /billpayment/{id} | POST /billpayment | POST /billpayment?operation=delete | GET /query |
| Customer | POST /customer | GET /customer/{id} | POST /customer | N/A (deactivate) | GET /query |
| Vendor | POST /vendor | GET /vendor/{id} | POST /vendor | N/A (deactivate) | GET /query |
| Item | POST /item | GET /item/{id} | POST /item | N/A (deactivate) | GET /query |
| Attachable | POST /upload | GET /attachable/{id} | POST /attachable | POST /attachable?operation=delete | GET /query |

### 1.1 Invoice Creation API

**Endpoint:** `POST /v3/company/{realmId}/invoice`

**J Fudge Use Case:** Creating bi-weekly invoices for Horton with sand hauling line items.

#### Full Invoice Example with Line Items, Quantities, Rates, and PO Reference

```json
{
  "CustomerRef": {
    "value": "123",
    "name": "Horton Construction"
  },
  "DocNumber": "INV-2026-0315",
  "TxnDate": "2026-03-15",
  "DueDate": "2026-03-29",
  "Line": [
    {
      "Amount": 4500.00,
      "DetailType": "SalesItemLineDetail",
      "Description": "Mason Sand Hauling - Job Site Alpha - 03/01 to 03/14",
      "SalesItemLineDetail": {
        "ItemRef": {
          "value": "1",
          "name": "Mason Sand Hauling"
        },
        "Qty": 45,
        "UnitPrice": 100.00,
        "ClassRef": {
          "value": "200000000001",
          "name": "Job Site Alpha"
        }
      }
    },
    {
      "Amount": 3200.00,
      "DetailType": "SalesItemLineDetail",
      "Description": "Cushion Sand Hauling - Job Site Alpha - 03/01 to 03/14",
      "SalesItemLineDetail": {
        "ItemRef": {
          "value": "2",
          "name": "Cushion Sand Hauling"
        },
        "Qty": 32,
        "UnitPrice": 100.00,
        "ClassRef": {
          "value": "200000000001",
          "name": "Job Site Alpha"
        }
      }
    }
  ],
  "CustomField": [
    {
      "DefinitionId": "1",
      "StringValue": "PO-2026-1234",
      "Type": "StringType",
      "Name": "PO Number"
    }
  ],
  "BillEmail": {
    "Address": "ap@hortonconstruction.com"
  },
  "EmailStatus": "NeedToSend",
  "PrintStatus": "NeedToPrint"
}
```

**Key Invoice Fields:**

| Field | Description | J Fudge Usage |
|-------|-------------|---------------|
| `CustomerRef.value` | QB Customer ID | Horton's QB ID |
| `DocNumber` | Invoice number (auto-assigned if omitted) | TMS-generated invoice # |
| `TxnDate` | Invoice date | End date of 2-week cycle |
| `DueDate` | Payment due date | Net 14 from invoice date |
| `Line[].SalesItemLineDetail.ItemRef` | References a Service/Product item | Mason Sand Hauling, Cushion Sand Hauling |
| `Line[].SalesItemLineDetail.Qty` | Quantity (load count) | Number of loads in the cycle |
| `Line[].SalesItemLineDetail.UnitPrice` | Rate per unit | Rate per load |
| `Line[].SalesItemLineDetail.ClassRef` | Class tracking (job site) | Job site identifier |
| `CustomField` | Up to 3 custom string fields via API | PO Number reference |
| `BillEmail` | Email to send invoice to | Horton's AP email |

**Line Item Types:**
- `SalesItemLineDetail` -- Standard line item with item, qty, rate (primary for JFT)
- `GroupItemLineDetail` -- Group of items bundled together
- `DescriptionOnly` -- Text-only line (for notes/headers)
- `DiscountLineDetail` -- Discount application
- `SubTotalLineDetail` -- Subtotal line

**PO Number Handling:** Use `CustomField` array (up to 3 string custom fields accessible via API). Alternatively, use the `DocNumber` field or a `PrivateNote` field. QBO supports custom fields on invoices, but API visibility is limited to first 3 string custom fields depending on the QBO plan tier.

**Sending Invoices:** Use `/v3/company/{realmId}/invoice/{invoiceId}/send` endpoint (POST) to email the invoice, or set `EmailStatus: "NeedToSend"` during creation.

**PDF Generation:** `GET /v3/company/{realmId}/invoice/{invoiceId}/pdf` returns the invoice as a PDF.

### 1.2 Payment Recording API

**Endpoint:** `POST /v3/company/{realmId}/payment`

**J Fudge Use Case:** Recording payments received from Horton against outstanding invoices.

#### Full Payment Example (Against Invoice)

```json
{
  "CustomerRef": {
    "value": "123"
  },
  "TotalAmt": 7700.00,
  "Line": [
    {
      "Amount": 7700.00,
      "LinkedTxn": [
        {
          "TxnId": "456",
          "TxnType": "Invoice"
        }
      ]
    }
  ],
  "PaymentMethodRef": {
    "value": "2",
    "name": "Check"
  },
  "PaymentRefNum": "CHK-10234",
  "TxnDate": "2026-03-20",
  "DepositToAccountRef": {
    "value": "35",
    "name": "Checking"
  }
}
```

#### Partial Payment

Same structure but set `Amount` and `TotalAmt` to less than the full invoice amount. QBO automatically tracks the remaining balance.

#### Payment Against Multiple Invoices

```json
{
  "CustomerRef": { "value": "123" },
  "TotalAmt": 15000.00,
  "Line": [
    {
      "Amount": 7700.00,
      "LinkedTxn": [{ "TxnId": "456", "TxnType": "Invoice" }]
    },
    {
      "Amount": 7300.00,
      "LinkedTxn": [{ "TxnId": "457", "TxnType": "Invoice" }]
    }
  ]
}
```

### 1.3 Vendor Bill Creation API

**Endpoint:** `POST /v3/company/{realmId}/bill`

**J Fudge Use Case:** Creating bills for CD Hopkins subcontractor payments ($12-15k per 2-week cycle + $1k/week dispatch fee).

#### Bill Creation Example

```json
{
  "VendorRef": {
    "value": "56",
    "name": "CD Hopkins"
  },
  "TxnDate": "2026-03-15",
  "DueDate": "2026-03-22",
  "Line": [
    {
      "Amount": 13500.00,
      "DetailType": "AccountBasedExpenseLineDetail",
      "Description": "Sand Hauling Services - 03/01 to 03/14",
      "AccountBasedExpenseLineDetail": {
        "AccountRef": {
          "value": "7",
          "name": "Subcontractor Expense"
        },
        "ClassRef": {
          "value": "200000000001",
          "name": "Job Site Alpha"
        }
      }
    },
    {
      "Amount": 2000.00,
      "DetailType": "AccountBasedExpenseLineDetail",
      "Description": "Dispatch Fee - 2 weeks @ $1,000/week",
      "AccountBasedExpenseLineDetail": {
        "AccountRef": {
          "value": "8",
          "name": "Dispatch Fees"
        }
      }
    }
  ],
  "CurrencyRef": {
    "value": "USD"
  }
}
```

**Bill Line Detail Types:**
- `AccountBasedExpenseLineDetail` -- Expense categorized by account (best for JFT subcontractor costs)
- `ItemBasedExpenseLineDetail` -- Expense tied to a specific item/service

#### Bill Payment (Paying the Vendor)

**Endpoint:** `POST /v3/company/{realmId}/billpayment`

```json
{
  "VendorRef": { "value": "56" },
  "TotalAmt": 15500.00,
  "PayType": "Check",
  "CheckPayment": {
    "BankAccountRef": { "value": "35", "name": "Checking" }
  },
  "Line": [
    {
      "Amount": 15500.00,
      "LinkedTxn": [{ "TxnId": "789", "TxnType": "Bill" }]
    }
  ]
}
```

### 1.4 Customer & Vendor Management APIs

#### Create Customer

**Endpoint:** `POST /v3/company/{realmId}/customer`

```json
{
  "DisplayName": "Horton Construction",
  "CompanyName": "Horton Construction Co.",
  "PrimaryEmailAddr": { "Address": "ap@hortonconstruction.com" },
  "PrimaryPhone": { "FreeFormNumber": "(512) 555-0100" },
  "BillAddr": {
    "Line1": "123 Main St",
    "City": "Austin",
    "CountrySubDivisionCode": "TX",
    "PostalCode": "78701"
  }
}
```

#### Create Vendor (1099-Eligible Subcontractor)

**Endpoint:** `POST /v3/company/{realmId}/vendor`

```json
{
  "DisplayName": "CD Hopkins Trucking",
  "CompanyName": "CD Hopkins Trucking LLC",
  "GivenName": "CD",
  "FamilyName": "Hopkins",
  "Vendor1099": true,
  "TaxIdentifier": "XX-XXXXXXX",
  "PrimaryEmailAddr": { "Address": "cd@hopkinstrucking.com" },
  "PrimaryPhone": { "FreeFormNumber": "(512) 555-0200" },
  "BillAddr": {
    "Line1": "456 Truck Ln",
    "City": "San Antonio",
    "CountrySubDivisionCode": "TX",
    "PostalCode": "78201"
  }
}
```

**Critical Vendor Fields for 1099:**
- `Vendor1099: true` -- Marks vendor as 1099-eligible independent contractor
- `TaxIdentifier` -- Vendor's SSN or EIN (stored securely in QB)
- `DisplayName` -- Must be unique across ALL customers, employees, and vendors

### 1.5 Items/Products/Services API

**Endpoint:** `POST /v3/company/{realmId}/item`

**J Fudge Use Case:** Creating "Mason Sand Hauling" and "Cushion Sand Hauling" as service items.

```json
{
  "Name": "Mason Sand Hauling",
  "Type": "Service",
  "IncomeAccountRef": {
    "value": "79",
    "name": "Hauling Revenue"
  },
  "Description": "Mason sand hauling services per load",
  "UnitPrice": 100.00
}
```

```json
{
  "Name": "Cushion Sand Hauling",
  "Type": "Service",
  "IncomeAccountRef": {
    "value": "79",
    "name": "Hauling Revenue"
  },
  "Description": "Cushion sand hauling services per load",
  "UnitPrice": 95.00
}
```

### 1.6 Class & Location Tracking

**J Fudge Use Case:** Tracking profitability by job site.

- **Class** = Job site, project, or cost center. Set via `ClassRef` on invoice line items and bill line items.
- **Location/Department** = Broader location grouping. Set via `DepartmentRef` on transactions.

**Important:** Class tracking requires QuickBooks Online Plus or Advanced subscription.

In the API, set `ClassRef` on individual line items:
```json
"ClassRef": {
  "value": "200000000001",
  "name": "Job Site Alpha"
}
```

This enables Profit & Loss by Class reports to show per-job-site profitability.

### 1.7 Reports API

**Endpoint:** `GET /v3/company/{realmId}/reports/{reportName}`

Available reports relevant to JFT:

| Report | Endpoint | Use Case |
|--------|----------|----------|
| Profit and Loss | `/reports/ProfitAndLoss` | Overall financial performance |
| Profit and Loss Detail | `/reports/ProfitAndLossDetail` | Detailed breakdown |
| Balance Sheet | `/reports/BalanceSheet` | Financial position |
| Cash Flow | `/reports/CashFlow` | Cash flow tracking |
| Aged Receivables | `/reports/AgedReceivables` | Outstanding Horton invoices |
| Aged Receivables Detail | `/reports/AgedReceivableDetail` | Invoice-level aging |
| Aged Payables | `/reports/AgedPayables` | Outstanding CD Hopkins bills |
| Aged Payables Detail | `/reports/AgedPayableDetail` | Bill-level aging |
| Customer Sales | `/reports/CustomerSales` | Revenue by customer |
| Vendor Balance | `/reports/VendorBalance` | Amounts owed to vendors |
| Transaction List | `/reports/TransactionList` | All transactions |
| Department Sales (Class) | `/reports/DepartmentSales` | Revenue by department |

**Report Parameters:**
```
GET /v3/company/{realmId}/reports/ProfitAndLoss
  ?start_date=2026-01-01
  &end_date=2026-03-31
  &accounting_method=Accrual
  &minorversion=75
```

### 1.8 Attachments API

**Endpoint:** `POST /v3/company/{realmId}/upload`

**J Fudge Use Case:** Attaching ticket images/PDFs to invoices.

**Upload and attach to an invoice:**

The upload uses multipart/form-data with two parts:
1. `file_metadata` (JSON): Contains attachment metadata and entity reference
2. `file_content` (binary): The actual file

```
POST /v3/company/{realmId}/upload
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="file_metadata"
Content-Type: application/json

{
  "AttachableRef": [
    {
      "EntityRef": {
        "type": "Invoice",
        "value": "456"
      },
      "IncludeOnSend": true
    }
  ],
  "FileName": "tickets-march-2026.pdf",
  "ContentType": "application/pdf"
}
------Boundary
Content-Disposition: form-data; name="file_content"; filename="tickets-march-2026.pdf"
Content-Type: application/pdf

[binary PDF data]
------Boundary--
```

**Limits:**
- File size: 46KB minimum, 20MB maximum per attachment
- Unlimited cloud storage for attachments
- `IncludeOnSend: true` attaches the file when emailing the invoice
- Supported types: PDF, PNG, JPG, JPEG, GIF, DOC, DOCX, XLS, XLSX, CSV, TXT, and more

### 1.9 Query Language

QBO uses a SQL-like query language:

```sql
SELECT * FROM Invoice WHERE CustomerRef = '123' AND TxnDate >= '2026-01-01' ORDERBY TxnDate DESC STARTPOSITION 1 MAXRESULTS 100
```

**Operators:** `=`, `IN`, `<`, `>`, `<=`, `>=`, `LIKE`
**Limitations:** No `OR`, `NOT`, or `GROUP BY` operators
**Pagination:** `STARTPOSITION` (1-based) and `MAXRESULTS` (default/max 1000)

### 1.10 Rate Limits

| Limit Type | Value | Notes |
|------------|-------|-------|
| Standard requests | 500/minute per company (realmId) | Per app per realm |
| Concurrent requests | 10 maximum | Simultaneous in-flight |
| Batch endpoint | 40 requests/minute per realmId | Each batch can hold 30 ops |
| Resource-intensive endpoints | 200/minute | Reports, complex queries |
| Throttle response | HTTP 429 | "Too Many Requests" |
| Sandbox (as of Sep 2025) | 10 requests/second | Matches production |

**Upcoming Changes (2025-2026):**
- Batch endpoint throttled at 120 requests/minute per realmId (production: Oct 31, 2025)

### 1.11 Batch Operations

**Endpoint:** `POST /v3/company/{realmId}/batch`

Process up to 30 operations in a single request. Operations execute serially within a batch.

```json
{
  "BatchItemRequest": [
    {
      "bId": "bid1",
      "operation": "create",
      "Invoice": {
        "CustomerRef": { "value": "123" },
        "Line": [...]
      }
    },
    {
      "bId": "bid2",
      "operation": "create",
      "Payment": {
        "CustomerRef": { "value": "123" },
        "TotalAmt": 500
      }
    },
    {
      "bId": "bid3",
      "operation": "query",
      "Query": "SELECT * FROM Customer WHERE DisplayName = 'Horton'"
    }
  ]
}
```

---

## 2. Authentication & OAuth 2.0

### 2.1 OAuth 2.0 Flow

QBO uses standard OAuth 2.0 Authorization Code flow.

**Step 1: Authorization URL**
```
https://appcenter.intuit.com/connect/oauth2
  ?client_id={clientId}
  &redirect_uri={redirectUri}
  &response_type=code
  &scope=com.intuit.quickbooks.accounting
  &state={csrfToken}
```

**Step 2: Token Exchange**
```
POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(clientId:clientSecret)}

grant_type=authorization_code
&code={authorizationCode}
&redirect_uri={redirectUri}
```

**Step 3: Use Access Token**
```
Authorization: Bearer {accessToken}
```

### 2.2 Token Lifetimes

| Token | Lifetime | Rotation Policy |
|-------|----------|-----------------|
| Access Token | 1 hour (3600 seconds) | Request new via refresh |
| Refresh Token | 100 days (rolling) or 5 years* | New token returned on each refresh |

*If your app uses `com.intuit.quickbooks.accounting` or `com.intuit.quickbooks.payment` scope, refresh tokens generated from October 2023 onward have a **5-year validity**.

**Critical:** Every refresh call returns a NEW refresh token. The old refresh token expires within 24 hours of a new one being issued. You MUST store the new refresh token after every refresh.

### 2.3 Available Scopes

| Scope | Purpose |
|-------|---------|
| `com.intuit.quickbooks.accounting` | Full QBO accounting access (invoices, bills, payments, vendors, customers, reports) |
| `com.intuit.quickbooks.payment` | QuickBooks Payments processing |
| `openid` | OpenID Connect authentication |
| `profile` | User profile info |
| `email` | User email |
| `phone` | User phone |
| `address` | User address |

**For JFT:** Use `com.intuit.quickbooks.accounting` as the primary scope. Add `com.intuit.quickbooks.payment` if implementing QB Payments for Horton's ACH payments.

### 2.4 Token Storage in Supabase

**Recommended Architecture:**

```sql
CREATE TABLE qb_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  realm_id TEXT NOT NULL,
  access_token TEXT NOT NULL,       -- Encrypt with Supabase Vault
  refresh_token TEXT NOT NULL,      -- Encrypt with Supabase Vault
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ NOT NULL,
  token_type TEXT DEFAULT 'bearer',
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE qb_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access tokens
CREATE POLICY "Service role only" ON qb_oauth_tokens
  USING (auth.role() = 'service_role');
```

**Security Best Practices:**
1. Store tokens encrypted using Supabase Vault (`vault.create_secret()`)
2. Never expose tokens to the client/browser
3. All QB API calls go through your server-side API routes (Next.js API routes or Edge Functions)
4. Implement token refresh middleware that checks `access_token_expires_at` before every API call
5. Use RLS to restrict token access to service role only

### 2.5 Token Refresh Pattern (Next.js)

```typescript
// lib/quickbooks/auth.ts
import OAuthClient from 'intuit-oauth';

const oauthClient = new OAuthClient({
  clientId: process.env.QB_CLIENT_ID!,
  clientSecret: process.env.QB_CLIENT_SECRET!,
  environment: process.env.QB_ENVIRONMENT as 'sandbox' | 'production',
  redirectUri: process.env.QB_REDIRECT_URI!,
});

export async function getValidToken(companyId: string) {
  const { data: tokenRecord } = await supabase
    .from('qb_oauth_tokens')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (!tokenRecord) throw new Error('No QB connection found');

  oauthClient.setToken({
    access_token: decrypt(tokenRecord.access_token),
    refresh_token: decrypt(tokenRecord.refresh_token),
    token_type: 'bearer',
    expires_in: 3600,
    x_refresh_token_expires_in: 8726400,
  });

  // Check if access token is expired
  if (!oauthClient.isAccessTokenValid()) {
    const authResponse = await oauthClient.refresh();
    const newToken = authResponse.getToken();

    // CRITICAL: Store the new refresh token
    await supabase.from('qb_oauth_tokens').update({
      access_token: encrypt(newToken.access_token),
      refresh_token: encrypt(newToken.refresh_token),
      access_token_expires_at: new Date(Date.now() + 3600 * 1000),
      updated_at: new Date(),
    }).eq('company_id', companyId);
  }

  return oauthClient;
}
```

### 2.6 Single-Company Connection

For JFT, this is a single-company setup (one QB account). After the initial OAuth connection is established:
- Store the `realmId` (company ID) permanently
- Set up automatic token refresh
- No need for app marketplace listing (private use)
- Register as a "Single-user app" on Intuit Developer Portal

---

## 3. QuickBooks Payments

### 3.1 Fee Structure (as of July 2025)

| Payment Method | Rate | Notes |
|----------------|------|-------|
| Online invoice (credit/debit card) | **2.99%** per transaction | Visa, MC, Amex, Discover |
| International cards | **Additional 1%** | On top of base rate |
| In-person (card reader) | **2.5%** per transaction | Tap/swipe/insert |
| Keyed-in card | **3.5%** per transaction | Manually typed |
| ACH bank transfer | **1%** per transaction | Cap varies (see below) |
| Instant deposit | **1.75%** additional | Same-day access |
| Payment dispute protection | **0.99%** | Up to $25k/year coverage |

**ACH Fee Cap Warning:**
- Accounts created **before** September 7, 2023: 1% with **$10-$15 cap**
- Accounts created **after** September 7, 2023: 1% with **NO CAP**
- For JFT invoices ($7,700-$15,000+), this is a significant consideration

**ACH Processing Time:** Next business day if processed before 3:00 PM Pacific.

### 3.2 Can You Embed QB Payments in a Custom Portal?

**Short answer: Limited, but workable.**

QuickBooks Payments does NOT provide a drop-in widget/iframe for custom websites. However, you have these options:

**Option A: Payment Links (Recommended for JFT)**
- When creating an invoice via API, QB generates a `invoiceLink` URL
- This link opens a QB-hosted payment page where Horton can pay via credit card or ACH
- You can embed this link in your TMS portal: "Pay Invoice" button redirects to QB's payment page
- Payment is automatically recorded in QB against the invoice
- No PCI compliance burden on your app

**Option B: QuickBooks Payments API (Direct Processing)**
- Full API for processing payments directly
- Requires PCI compliance considerations
- Endpoints:
  - `POST /quickbooks/v4/payments/charges` -- Credit card charge
  - `POST /quickbooks/v4/payments/echecks` -- ACH/eCheck charge
  - `POST /quickbooks/v4/payments/tokens` -- Tokenize card/bank account
- Bank account operations: `bankAccounts()`, `createBankAccount()`, `createBankAccountFromToken()`
- eCheck operations: `echeck()`, `getEcheck()`, `refundEcheck()`

**Option C: QB Invoice Email (Simplest)**
- Send invoice via QB email (API: `/invoice/{id}/send`)
- QB includes a "Pay Now" button in the email
- Horton clicks and pays through QB's secure portal
- Zero development on your side for the payment flow

### 3.3 Payment Flow Architecture for JFT

```
TMS creates invoice data
    |
    v
API: POST /invoice (creates invoice in QB)
    |
    v
API: POST /invoice/{id}/send (emails to Horton with Pay Now link)
    |
    v
Horton clicks "Pay Now" in email
    |
    v
QB Payments processes ACH/credit card
    |
    v
QB Webhook fires: Payment entity created
    |
    v
TMS webhook handler receives notification
    |
    v
TMS queries QB API for payment details
    |
    v
TMS updates local payment status in Supabase
```

### 3.4 ACH for JFT Specifically

For $7,700+ bi-weekly invoices, ACH is the best option:
- **Fee:** 1% = $77 on a $7,700 invoice (if capped at $10-15, much better)
- **vs Credit Card:** 2.99% = $230 on a $7,700 invoice
- **Settlement:** Next business day
- **Recommendation:** Verify JFT's QB account creation date for ACH fee cap status. If no cap, investigate direct ACH processing outside QB (e.g., via Stripe ACH at $5 flat fee).

---

## 4. Webhooks

### 4.1 Setup & Configuration

1. Log into Intuit Developer Portal
2. Navigate to your app's Webhooks section
3. Enter your HTTPS endpoint URL
4. Select entities to subscribe to
5. Note the **Verifier Token** (used for HMAC verification)
6. Use "Send Test Notification" to verify endpoint

### 4.2 Supported Events

Webhooks fire for **Create, Update, Delete, Merge, and Void** operations on these entities:

| Entity | Create | Update | Delete | Merge | Void |
|--------|--------|--------|--------|-------|------|
| Account | Yes | Yes | Yes | Yes | - |
| Bill | Yes | Yes | Yes | - | - |
| BillPayment | Yes | Yes | Yes | - | Yes |
| Budget | Yes | Yes | Yes | - | - |
| Customer | Yes | Yes | Yes | Yes | - |
| Employee | Yes | Yes | Yes | Yes | - |
| Estimate | Yes | Yes | Yes | - | - |
| Invoice | Yes | Yes | Yes | - | Yes |
| Item | Yes | Yes | Yes | Yes | - |
| JournalEntry | Yes | Yes | Yes | - | - |
| Payment | Yes | Yes | Yes | - | Yes |
| Purchase | Yes | Yes | Yes | - | Yes |
| PurchaseOrder | Yes | Yes | Yes | - | - |
| SalesReceipt | Yes | Yes | Yes | - | Yes |
| TaxAgency | Yes | Yes | Yes | - | - |
| Term | Yes | Yes | Yes | - | - |
| Vendor | Yes | Yes | Yes | Yes | - |

**JFT Priority Subscriptions:**
- Invoice (Create, Update, Void) -- Track invoice status
- Payment (Create, Update, Void) -- Know when Horton pays
- Bill (Create, Update) -- Track subcontractor bills
- BillPayment (Create) -- Track payments to CD Hopkins
- Customer, Vendor (Update, Merge) -- Sync contact changes

### 4.3 Webhook Payload Structure

```json
{
  "eventNotifications": [
    {
      "realmId": "1185883450",
      "dataChangeEvent": {
        "entities": [
          {
            "name": "Payment",
            "id": "39",
            "operation": "Create",
            "lastUpdated": "2026-03-15T15:00:00.000-07:00"
          },
          {
            "name": "Invoice",
            "id": "456",
            "operation": "Update",
            "lastUpdated": "2026-03-15T15:00:00.000-07:00"
          }
        ]
      }
    }
  ]
}
```

**Important:** The webhook payload does NOT include the full entity data. It only tells you WHAT changed. You must make a follow-up API call to get the actual entity data.

### 4.4 HMAC-SHA256 Signature Verification

```typescript
// app/api/webhooks/quickbooks/route.ts
import crypto from 'crypto';

export async function POST(request: Request) {
  const signature = request.headers.get('intuit-signature');
  const payload = await request.text();

  // Verify HMAC-SHA256 signature
  const hash = crypto
    .createHmac('sha256', process.env.QB_VERIFIER_TOKEN!)
    .update(payload)
    .digest('base64');

  if (hash !== signature) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = JSON.parse(payload);

  for (const notification of body.eventNotifications) {
    for (const entity of notification.dataChangeEvent.entities) {
      // Queue for processing (don't block the webhook response)
      await processEntityChange(entity);
    }
  }

  // MUST return 200 within 10 seconds or QB will retry
  return new Response('OK', { status: 200 });
}
```

### 4.5 Retry Logic

| Retry | Delay |
|-------|-------|
| 1st retry | 20 minutes |
| 2nd retry | 30 minutes |
| 3rd retry | 50 minutes |
| After exhaustion | Endpoint disabled |

**Best Practices:**
- Return 200 immediately, process asynchronously
- Implement idempotency (store processed webhook IDs to handle duplicates)
- If endpoint is disabled after retry exhaustion, you must re-enable it manually in the developer portal
- Webhook delivery is **best-effort**, not guaranteed -- always supplement with periodic CDC polling

---

## 5. 1099 Tracking & Tax Season

### 5.1 API Support for 1099 Tracking

**Setting up vendors for 1099 via API:**

```json
{
  "DisplayName": "CD Hopkins Trucking",
  "Vendor1099": true,
  "TaxIdentifier": "XX-XXXXXXX"
}
```

The `Vendor1099` boolean field on the Vendor entity marks the vendor as an independent contractor who receives a 1099-NEC at year end.

### 5.2 How QB Tracks 1099 Payments

- QB automatically tracks all check and cash payments to vendors marked `Vendor1099: true`
- Payments via credit card, debit card, PayPal are automatically excluded (payment processors issue their own 1099-K)
- Account mapping: During 1099 prep, you map expense accounts to 1099 boxes (e.g., Box 1 of 1099-NEC for nonemployee compensation)
- The $600 threshold is tracked automatically

### 5.3 1099 Preparation & Filing

**QB's built-in 1099 workflow (UI-based, not API):**
1. Review vendor list -- confirm all 1099-eligible vendors are marked
2. Map expense accounts to 1099 boxes
3. QB calculates totals per vendor
4. Review and verify amounts
5. E-file directly through QB (additional fee ~$15/contractor) or print and mail

**API Limitations for 1099:**
- The API can SET `Vendor1099` and `TaxIdentifier` on vendors
- The API can QUERY vendor payment totals via reports
- The API CANNOT directly generate or file 1099 forms
- For automated 1099 filing, use third-party integrations like Tax1099.com, BoomTax, or Track1099, which integrate with QB

### 5.4 Tax Season Support

| Feature | API Support | Notes |
|---------|-------------|-------|
| Mark vendor as 1099 | Yes (`Vendor1099`) | Set during vendor creation |
| Store TIN/EIN | Yes (`TaxIdentifier`) | Stored securely in QB |
| Track payments | Automatic | QB tracks by vendor |
| Generate 1099 | No (UI only) | Use QB UI or third-party |
| E-file 1099 | No (UI only) | QB charges ~$15/form |
| Quarterly estimates | No | Manual or use QB Payroll |
| P&L for tax prep | Yes (Reports API) | Export for CPA |

### 5.5 Practical Approach for JFT

1. When creating CD Hopkins as a vendor via API, set `Vendor1099: true` and `TaxIdentifier`
2. All bills and bill payments created through the API are automatically tracked
3. At year-end, Nene (or CPA) uses QB's 1099 wizard to review, verify, and e-file
4. The TMS can pull the P&L report and vendor payment summary via API for tax planning

---

## 6. Data Sync Patterns

### 6.1 Recommended Architecture: TMS as Operational Truth, QB as Financial Truth

```
                    TMS (Supabase)                    QuickBooks Online
                    ==============                    =================
Tickets/Loads       Source of truth                   Not stored
Job Sites           Source of truth                   Classes
Customers           Synced (copy)          <------    Source of truth
Vendors             Synced (copy)          <------    Source of truth
Invoices            Created here           ------>    Source of truth (after push)
Payments            Synced (copy)          <------    Source of truth
Bills               Created here           ------>    Source of truth (after push)
Reports             Pulled from QB         <------    Source of truth
```

### 6.2 Sync Strategy: Primarily One-Way Push + Webhook Pull

**TMS --> QB (Push):**
- Invoice creation: TMS calculates from tickets, pushes to QB
- Bill creation: TMS calculates subcontractor amounts, pushes to QB
- Vendor/Customer creation: TMS creates, pushes to QB

**QB --> TMS (Pull via Webhooks + CDC):**
- Payment received: Webhook notifies TMS, TMS fetches full payment
- Invoice status changes: Webhook notifies, TMS syncs
- Manual QB edits: CDC catches any changes made directly in QB

### 6.3 Change Data Capture (CDC)

**Endpoint:** `GET /v3/company/{realmId}/cdc?entities={list}&changedSince={datetime}`

```
GET /v3/company/{realmId}/cdc
  ?entities=Invoice,Payment,Bill,BillPayment,Customer,Vendor
  &changedSince=2026-03-15T00:00:00-05:00
```

**Usage Pattern:**
1. Store `last_sync_timestamp` in Supabase
2. Periodically (every 5-15 minutes) call CDC with that timestamp
3. Process all changed entities
4. Update `last_sync_timestamp`

**CDC + Webhooks Together (Recommended):**
- Webhooks provide near-real-time notification
- CDC serves as the safety net (catches anything webhooks miss)
- Run CDC poll every 15-30 minutes as a backup sync

### 6.4 Idempotency

QBO supports request-level idempotency:

```
POST /v3/company/{realmId}/invoice?requestid=unique-uuid-here
```

If the same `requestid` is sent again, QB returns the original response instead of creating a duplicate. Use this for:
- Invoice creation (prevent duplicate invoices)
- Payment recording (prevent double payments)
- Bill creation (prevent duplicate bills)

**Implementation:**
```typescript
import { v5 as uuidv5 } from 'uuid';

// Generate deterministic request ID from invoice data
const requestId = uuidv5(
  `invoice-${cycleId}-${customerId}-${dateRange}`,
  QB_NAMESPACE_UUID
);

const response = await qbClient.makeApiCall({
  url: `${baseUrl}/v3/company/${realmId}/invoice?requestid=${requestId}`,
  method: 'POST',
  body: invoiceData
});
```

### 6.5 Conflict Resolution

| Scenario | Resolution |
|----------|------------|
| Invoice edited in both TMS and QB | QB wins (financial truth). TMS re-syncs from QB. |
| Payment recorded manually in QB | Webhook/CDC catches it. TMS updates local status. |
| Customer updated in QB | Webhook catches it. TMS updates local copy. |
| TMS creates invoice, QB is down | Queue the request. Retry with exponential backoff. Store in `pending_sync` table. |

### 6.6 Error Handling & Retry Pattern

```typescript
// lib/quickbooks/sync.ts

interface QBSyncJob {
  id: string;
  entity_type: 'invoice' | 'bill' | 'payment';
  action: 'create' | 'update' | 'delete';
  payload: any;
  request_id: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  next_retry_at: string | null;
}

async function syncToQuickBooks(job: QBSyncJob) {
  try {
    const result = await qbApiCall(job);
    await markJobSuccess(job.id, result);
  } catch (error) {
    if (error.status === 429) {
      // Rate limited -- retry after delay
      await scheduleRetry(job, 60000); // 1 minute
    } else if (error.status === 401) {
      // Token expired -- refresh and retry
      await refreshToken();
      await scheduleRetry(job, 1000);
    } else if (error.status >= 500) {
      // QB server error -- exponential backoff
      const delay = Math.min(1000 * Math.pow(2, job.retry_count), 300000);
      await scheduleRetry(job, delay);
    } else {
      // Client error (400) -- likely bad data, don't retry
      await markJobFailed(job.id, error.message);
      await notifyAdmin(job, error);
    }
  }
}
```

### 6.7 Supabase Sync Queue Table

```sql
CREATE TABLE qb_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  request_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  qb_entity_id TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 5,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_status ON qb_sync_queue(status, next_retry_at);
```

---

## 7. Libraries & SDKs

### 7.1 Official: intuit-oauth (Recommended for Auth)

| | |
|---|---|
| **Package** | `intuit-oauth` |
| **npm** | `npm install intuit-oauth` |
| **GitHub** | github.com/intuit/oauth-jsclient |
| **Stars** | ~140 |
| **Maintained** | Yes (Intuit official) |
| **License** | Apache 2.0 |

**What it does:** OAuth 2.0 authentication only. Handles authorization URL generation, token exchange, token refresh, token revocation, and making authenticated API calls.

**Key Features:**
- Automatic retry with exponential backoff (3 retries: 1s, 2s, 4s)
- Retries on: 408, 429, 500, 502, 503, 504 status codes
- Token validity checking
- Structured logging
- Response validation

**Initialization:**
```typescript
const OAuthClient = require('intuit-oauth');

const oauthClient = new OAuthClient({
  clientId: process.env.QB_CLIENT_ID,
  clientSecret: process.env.QB_CLIENT_SECRET,
  environment: 'sandbox', // or 'production'
  redirectUri: 'https://yourapp.com/api/auth/quickbooks/callback',
  logging: true,
});
```

### 7.2 Community: node-quickbooks (Full API Client)

| | |
|---|---|
| **Package** | `node-quickbooks` |
| **npm** | `npm install node-quickbooks` |
| **GitHub** | github.com/mcohen01/node-quickbooks |
| **Stars** | ~500+ |
| **Last Updated** | March 17, 2026 (actively maintained) |
| **License** | MIT |

**What it does:** Full QBO API client wrapping all entity CRUD operations, queries, reports, batch operations, and file uploads.

**Key Methods (JFT-relevant):**

```javascript
// Invoices
qbo.createInvoice(invoiceObj, callback)
qbo.getInvoice(invoiceId, callback)
qbo.updateInvoice(invoiceObj, callback)
qbo.deleteInvoice(idOrObj, callback)
qbo.findInvoices(criteria, callback)
qbo.getInvoicePdf(invoiceId, callback)
qbo.sendInvoicePdf(invoiceId, callback)

// Payments
qbo.createPayment(paymentObj, callback)
qbo.getPayment(paymentId, callback)
qbo.updatePayment(paymentObj, callback)
qbo.findPayments(criteria, callback)

// Bills
qbo.createBill(billObj, callback)
qbo.getBill(billId, callback)
qbo.updateBill(billObj, callback)
qbo.findBills(criteria, callback)

// Bill Payments
qbo.createBillPayment(billPaymentObj, callback)
qbo.getBillPayment(billPaymentId, callback)

// Vendors
qbo.createVendor(vendorObj, callback)
qbo.getVendor(vendorId, callback)
qbo.updateVendor(vendorObj, callback)
qbo.findVendors(criteria, callback)

// Customers
qbo.createCustomer(customerObj, callback)
qbo.getCustomer(customerId, callback)
qbo.updateCustomer(customerObj, callback)
qbo.findCustomers(criteria, callback)

// Items
qbo.createItem(itemObj, callback)
qbo.getItem(itemId, callback)
qbo.updateItem(itemObj, callback)
qbo.findItems(criteria, callback)

// Attachments
qbo.upload(filename, contentType, stream, entityType, entityId, callback)

// Reports
qbo.reportProfitAndLoss(params, callback)
qbo.reportBalanceSheet(params, callback)
qbo.reportAgedReceivables(params, callback)
qbo.reportAgedPayables(params, callback)
qbo.reportCustomerSales(params, callback)
qbo.reportVendorBalance(params, callback)
qbo.reportTransactionList(params, callback)

// Batch & CDC
qbo.batch(batchItems, callback)  // Up to 30 operations
qbo.changeDataCapture(entities, since, callback)

// Query with advanced filtering
qbo.findInvoices({
  CustomerRef: '123',
  fetchAll: true,      // Auto-paginate
  desc: 'TxnDate',    // Sort descending
  limit: 100,
  offset: 0
}, callback)
```

### 7.3 Recommended Approach for JFT

**Use both libraries together:**

1. `intuit-oauth` for all authentication concerns (token management, refresh)
2. `node-quickbooks` for all API operations (CRUD, queries, reports)

**Or: Build a thin wrapper using `intuit-oauth` directly.**

Since the TMS is Next.js/TypeScript, a modern approach:

```typescript
// lib/quickbooks/client.ts
import OAuthClient from 'intuit-oauth';

class QuickBooksClient {
  private oauth: OAuthClient;
  private realmId: string;
  private baseUrl: string;

  constructor(oauth: OAuthClient, realmId: string) {
    this.oauth = oauth;
    this.realmId = realmId;
    this.baseUrl = process.env.QB_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';
  }

  async createInvoice(invoice: QBInvoice): Promise<QBInvoice> {
    const response = await this.oauth.makeApiCall({
      url: `${this.baseUrl}/v3/company/${this.realmId}/invoice?minorversion=75`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    return JSON.parse(response.text()).Invoice;
  }

  async createBill(bill: QBBill): Promise<QBBill> {
    const response = await this.oauth.makeApiCall({
      url: `${this.baseUrl}/v3/company/${this.realmId}/bill?minorversion=75`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bill),
    });
    return JSON.parse(response.text()).Bill;
  }

  async recordPayment(payment: QBPayment): Promise<QBPayment> {
    const response = await this.oauth.makeApiCall({
      url: `${this.baseUrl}/v3/company/${this.realmId}/payment?minorversion=75`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    return JSON.parse(response.text()).Payment;
  }

  async query<T>(entityName: string, queryString: string): Promise<T[]> {
    const response = await this.oauth.makeApiCall({
      url: `${this.baseUrl}/v3/company/${this.realmId}/query?query=${encodeURIComponent(queryString)}&minorversion=75`,
      method: 'GET',
    });
    const result = JSON.parse(response.text());
    return result.QueryResponse[entityName] || [];
  }

  async cdc(entities: string[], since: string) {
    const response = await this.oauth.makeApiCall({
      url: `${this.baseUrl}/v3/company/${this.realmId}/cdc?entities=${entities.join(',')}&changedSince=${since}&minorversion=75`,
      method: 'GET',
    });
    return JSON.parse(response.text());
  }
}
```

### 7.4 No Existing Supabase + QB Integration Pattern

There is no established Supabase-specific QB integration library. The architecture would be:
- **Supabase** stores operational data + QB sync metadata
- **Next.js API Routes** (or Supabase Edge Functions) handle QB API calls
- **Supabase Vault** stores OAuth tokens securely
- **Supabase Cron** (pg_cron or Vercel Cron) runs periodic CDC sync

---

## 8. Migration & Transition Plan

### 8.1 Developer Environment Setup

1. **Create Intuit Developer Account:** developer.intuit.com (free)
2. **Create an App:** Select "QuickBooks Online and Payments" scope
3. **Get Sandbox Company:** Auto-created with your developer account
   - Up to 10 sandbox companies allowed
   - Valid for 2 years
   - Pre-loaded with sample data
   - Sandbox uses development keys (not production)
4. **Note Your Credentials:**
   - Client ID (development)
   - Client Secret (development)
   - Redirect URI (register your callback URL)

### 8.2 Sandbox Limitations

- Payroll features not available
- Region-specific (US sandbox for US company)
- Development keys only work with sandbox companies
- Rate limits match production (10 req/sec as of Sep 2025)
- Cannot process real payments
- Email sending is simulated

### 8.3 Transition Phases

#### Phase 1: Parallel Operation (Weeks 1-4)
- Set up QB API connection (OAuth flow)
- Create service items in QB via API (Mason Sand Hauling, Cushion Sand Hauling)
- Verify existing customers/vendors exist in QB (query by name)
- Map TMS entities to QB entity IDs (store mappings in Supabase)
- **Nene continues manual entry** as primary
- TMS creates invoices in QB sandbox for validation

#### Phase 2: Shadow Mode (Weeks 5-8)
- TMS creates invoices in QB production in "draft" state
- Nene reviews draft invoices in QB, compares to manual versions
- Verify amounts, line items, customer references match
- TMS creates vendor bills in draft state
- Test webhook reception and CDC sync
- Fix any discrepancies

#### Phase 3: TMS Primary, Manual Verification (Weeks 9-12)
- TMS creates and sends invoices directly
- Nene spot-checks in QB (no longer entering manually)
- TMS creates vendor bills and records payments
- Webhook-driven payment notifications working
- Aged receivables report pulled via API

#### Phase 4: Fully Automated (Week 13+)
- TMS is the sole creator of invoices and bills
- QB is purely the financial system of record
- Nene uses QB for reporting and 1099 at year-end
- TMS dashboard shows real-time financial data from QB

### 8.4 Historical Data

**Can you import historical data via API?** Yes, with caveats:
- Create invoices with past `TxnDate` values
- Record payments with past dates
- Create bills with past dates
- QB will accept backdated transactions
- **Caution:** May require adjustments to avoid double-counting if data already exists in QB
- **Recommendation:** Start fresh from a cutoff date. Export historical reports from QB for reference, but don't try to backfill API data for already-entered transactions.

### 8.5 Testing Checklist

- [ ] OAuth connection flow (authorize, token exchange, refresh)
- [ ] Create service items (Mason Sand, Cushion Sand)
- [ ] Create customer (Horton)
- [ ] Create vendor (CD Hopkins, 1099-eligible)
- [ ] Create invoice with multiple line items, quantities, rates
- [ ] Create invoice with PO number in custom field
- [ ] Send invoice via email through API
- [ ] Record full payment against invoice
- [ ] Record partial payment against invoice
- [ ] Create vendor bill with multiple line items
- [ ] Record bill payment
- [ ] Upload and attach PDF to invoice
- [ ] Receive webhook notification for payment
- [ ] Verify HMAC webhook signature
- [ ] Run CDC sync for changed entities
- [ ] Pull P&L report
- [ ] Pull aged receivables report
- [ ] Pull aged payables report
- [ ] Test rate limiting (verify 429 handling)
- [ ] Test token expiration and auto-refresh
- [ ] Test idempotent request (same requestid)
- [ ] Verify 1099 tracking for vendor payments

---

## Quick Reference: JFT-Specific Integration Map

| JFT Workflow | QB API Operation | Endpoint |
|--------------|------------------|----------|
| Ticket → Invoice line | Create Invoice with SalesItemLineDetail | POST /invoice |
| Mason sand loads | Line item with ItemRef → "Mason Sand Hauling" | Line[].SalesItemLineDetail |
| Cushion sand loads | Line item with ItemRef → "Cushion Sand Hauling" | Line[].SalesItemLineDetail |
| PO reference | CustomField[0].StringValue | Invoice.CustomField |
| Email invoice to Horton | Send Invoice | POST /invoice/{id}/send |
| Attach ticket PDF | Upload attachment | POST /upload |
| Horton pays | Record Payment with LinkedTxn | POST /payment |
| Pay CD Hopkins | Create Bill, then BillPayment | POST /bill, POST /billpayment |
| Dispatch fee | Bill line item (AccountBased) | Bill.Line[].AccountBasedExpenseLineDetail |
| Track job site profit | ClassRef on line items | Line[].ClassRef |
| 1099 for CD Hopkins | Vendor1099: true, TaxIdentifier | POST /vendor |
| P&L report | Reports API | GET /reports/ProfitAndLoss |
| Aging report | Reports API | GET /reports/AgedReceivables |
| Payment notifications | Webhook subscription | Payment entity webhook |
| Sync changes | CDC polling | GET /cdc |

---

## Sources

- [Intuit OAuth JavaScript Client (GitHub)](https://github.com/intuit/oauth-jsclient)
- [node-quickbooks Library (GitHub)](https://github.com/mcohen01/node-quickbooks)
- [QuickBooks API Rate Limits Guide (Coefficient)](https://coefficient.io/quickbooks-api/quickbooks-api-rate-limits)
- [QuickBooks Webhooks Setup Guide (Coefficient)](https://coefficient.io/quickbooks-api/quickbooks-webhooks)
- [Reviewing Intuit Webhook Docs (Svix)](https://www.svix.com/blog/reviewing-intuit-webhook-docs/)
- [QuickBooks Invoice API Integration (Apideck)](https://www.apideck.com/blog/quickbooks-invoice-api-integration)
- [QuickBooks Accounting API Explorer (Apideck)](https://www.apideck.com/blog/exploring-the-quickbooks-online-accounting-api)
- [QuickBooks Online API Integration Guide (Knit)](https://www.getknit.dev/blog/quickbooks-online-api-integration-guide-in-depth)
- [QuickBooks Payments Rates](https://quickbooks.intuit.com/payments/payment-rates/)
- [QuickBooks Payments Overview](https://quickbooks.intuit.com/payments/)
- [Intuit Developer Portal](https://developer.intuit.com)
- [QuickBooks Sandbox Guide (Intuit Blog)](https://blogs.intuit.com/2024/11/27/a-guide-to-using-sandbox-environments-for-quickbooks-integrations/)
- [SaaS Guide to API Rate Limits (Satva Solutions)](https://satvasolutions.com/blog/saas-leaders-guide-api-rate-limits-in-accounting-platforms)
- [QuickBooks API Integration Guide (Zuplo)](https://zuplo.com/learning-center/quickbooks-api)
- [Intuit Developer Blog on CDC](https://blogs.intuit.com/2023/08/24/building-smarter-with-intuit-stay-in-sync-with-cdc/)
- [Intuit Developer Blog on Batch Operations](https://blogs.intuit.com/2023/07/19/building-smarter-with-intuit-batch-without-a-scratch/)
- [QuickBooks ACH Fees Guide (DepositFix)](https://www.depositfix.com/blog/quickbooks-ach-fees)
- [QuickBooks Payments Fees (Fyle)](https://www.fylehq.com/blog/quickbooks-payments-fees)
