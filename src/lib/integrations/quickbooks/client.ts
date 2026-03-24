/**
 * QuickBooks Online API client.
 *
 * Full OAuth 2.0 flow using intuit-oauth:
 * - getAuthorizationUrl() — generates OAuth URL for admin to click
 * - handleCallback(url) — exchanges auth code for tokens
 * - getClient() — returns authenticated node-quickbooks client, auto-refreshes tokens
 *
 * Supports sandbox vs production via QB_ENVIRONMENT env var.
 * Gracefully handles missing configuration.
 */

import { randomBytes } from "crypto";
import {
  saveTokens,
  getTokens,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  saveOAuthState,
  getOAuthState,
  clearOAuthState,
  type StoredQBTokens,
} from "./tokens";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QBConfig {
  clientId: string;
  clientSecret: string;
  environment: "sandbox" | "production";
  redirectUri: string;
}

export interface QBTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  realmId: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Check if QuickBooks environment variables are configured.
 */
export function isQBConfigured(): boolean {
  return Boolean(
    process.env.QB_CLIENT_ID &&
    process.env.QB_CLIENT_SECRET &&
    process.env.QB_REDIRECT_URI
  );
}

/**
 * Get QuickBooks configuration from environment variables.
 * Returns null if not configured.
 *
 * NOTE: This is a synchronous function that reads from env vars only.
 * For the authoritative environment, use getQBConfigAsync() which
 * reads from the database.
 */
export function getQBConfig(): QBConfig | null {
  if (!isQBConfigured()) return null;

  return {
    clientId: process.env.QB_CLIENT_ID!,
    clientSecret: process.env.QB_CLIENT_SECRET!,
    environment:
      (process.env.QB_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    redirectUri: process.env.QB_REDIRECT_URI!,
  };
}

/**
 * Async version of getQBConfig() that reads environment from the database
 * (qb_environment_state table) instead of just the env var.
 * The env var is used as fallback for initial setup.
 */
export async function getQBConfigAsync(): Promise<QBConfig | null> {
  if (!isQBConfigured()) return null;

  let environment: "sandbox" | "production";
  try {
    const { getCurrentQBEnvironment } = await import("./environment");
    environment = await getCurrentQBEnvironment();
  } catch {
    environment =
      (process.env.QB_ENVIRONMENT as "sandbox" | "production") || "sandbox";
  }

  return {
    clientId: process.env.QB_CLIENT_ID!,
    clientSecret: process.env.QB_CLIENT_SECRET!,
    environment,
    redirectUri: process.env.QB_REDIRECT_URI!,
  };
}

// ---------------------------------------------------------------------------
// OAuth 2.0 Flow
// ---------------------------------------------------------------------------

/**
 * Create a fresh intuit-oauth client instance.
 * Uses getQBConfigAsync() to read environment from DB.
 */
async function createOAuthClient() {
  const config = await getQBConfigAsync();
  if (!config) {
    throw new Error(
      "QuickBooks is not configured. Set QB_CLIENT_ID, QB_CLIENT_SECRET, and QB_REDIRECT_URI."
    );
  }

  // Dynamic import to avoid bundling intuit-oauth on client
  const OAuthClient = (await import("intuit-oauth")).default;

  return new OAuthClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    environment: config.environment === "production" ? "production" : "sandbox",
    redirectUri: config.redirectUri,
  });
}

/**
 * Generate the OAuth authorization URL for admin to click.
 * Uses CSRF state token for security.
 */
export async function getAuthorizationUrl(): Promise<{
  url: string;
  state: string;
}> {
  const oauthClient = await createOAuthClient();
  const state = generateStateToken();

  const authUri = oauthClient.authorizeUri({
    scope: [
      (await import("intuit-oauth")).default.scopes.Accounting,
    ],
    state,
  });

  // Store the state token in app_settings for validation during callback
  await saveOAuthState(state);

  return { url: authUri, state };
}

/**
 * Handle the OAuth callback — exchange authorization code for tokens.
 */
export async function handleCallback(
  callbackUrl: string
): Promise<{ realmId: string; companyName: string | null }> {
  const oauthClient = await createOAuthClient();

  // Exchange the authorization code for tokens
  const authResponse = await oauthClient.createToken(callbackUrl);
  const tokenData = authResponse.getJson();

  // Extract realmId from the callback URL
  const url = new URL(callbackUrl);
  const realmId = url.searchParams.get("realmId") ?? "";

  if (!realmId) {
    throw new Error("Missing realmId in OAuth callback");
  }

  // Calculate expiration dates
  const accessTokenExpiresAt = new Date(
    Date.now() + (tokenData.expires_in ?? 3600) * 1000
  );
  const refreshTokenExpiresAt = new Date(
    Date.now() + (tokenData.x_refresh_token_expires_in ?? 8726400) * 1000
  );

  // Try to fetch company name from QBO
  const currentConfig = (await getQBConfigAsync())!;
  let companyName: string | null = null;
  try {
    companyName = await fetchCompanyName(
      tokenData.access_token,
      realmId,
      currentConfig.environment
    );
  } catch (companyErr) {
    console.warn("[QB] Failed to fetch company name (non-critical):", companyErr instanceof Error ? companyErr.message : companyErr);
  }

  // Store tokens in Supabase
  await saveTokens({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    realmId,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    companyName: companyName ?? undefined,
  });

  return { realmId, companyName };
}

/**
 * Get an authenticated node-quickbooks client.
 * Automatically refreshes the access token if expired.
 * Returns null if QB is not connected.
 */
export async function getClient(): Promise<QBClient | null> {
  if (!isQBConfigured()) {
    console.log("[QB] QuickBooks not configured — skipping");
    return null;
  }

  const tokens = await getTokens();
  if (!tokens) {
    console.log("[QB] No QuickBooks tokens found — not connected");
    return null;
  }

  // Check if refresh token is expired
  if (isRefreshTokenExpired(tokens.refreshTokenExpiresAt)) {
    console.error(
      "[QB] Refresh token expired. Admin must reconnect QuickBooks."
    );
    return null;
  }

  // Refresh access token if expired
  let currentTokens = tokens;
  if (isAccessTokenExpired(tokens.accessTokenExpiresAt)) {
    console.log("[QB] Access token expired — refreshing...");
    try {
      currentTokens = await refreshAccessToken(tokens);
    } catch (refreshErr) {
      console.error("[QB] Failed to refresh access token:", refreshErr instanceof Error ? refreshErr.message : refreshErr);
      return null;
    }
  }

  // Create node-quickbooks client (use async config for DB-based environment)
  const config = (await getQBConfigAsync())!;
  const QuickBooks = (await import("node-quickbooks")).default;

  const qbo = new QuickBooks(
    config.clientId,
    config.clientSecret,
    currentTokens.accessToken,
    false, // no token secret (OAuth 2.0)
    currentTokens.realmId,
    config.environment === "sandbox", // useSandbox
    false, // debug
    null, // minor version — use default
    "2.0", // OAuth version
    currentTokens.refreshToken
  );

  return new QBClient(qbo, currentTokens);
}

// ---------------------------------------------------------------------------
// Token Refresh
// ---------------------------------------------------------------------------

async function refreshAccessToken(
  tokens: StoredQBTokens
): Promise<StoredQBTokens> {
  const oauthClient = await createOAuthClient();

  oauthClient.setToken({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: "bearer",
    expires_in: 3600,
    x_refresh_token_expires_in: 8726400,
  });

  const authResponse = await oauthClient.refresh();
  const newToken = authResponse.getJson();

  const accessTokenExpiresAt = new Date(
    Date.now() + (newToken.expires_in ?? 3600) * 1000
  );
  const refreshTokenExpiresAt = new Date(
    Date.now() + (newToken.x_refresh_token_expires_in ?? 8726400) * 1000
  );

  // CRITICAL: Store the new refresh token (old one expires in ~24h)
  await saveTokens({
    accessToken: newToken.access_token,
    refreshToken: newToken.refresh_token,
    realmId: tokens.realmId,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    companyName: tokens.companyName ?? undefined,
  });

  console.log("[QB] Access token refreshed successfully");

  return {
    ...tokens,
    accessToken: newToken.access_token,
    refreshToken: newToken.refresh_token,
    accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
    refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateStateToken(): string {
  return randomBytes(32).toString("hex");
}

async function fetchCompanyName(
  accessToken: string,
  realmId: string,
  environment: "sandbox" | "production"
): Promise<string> {
  const baseUrl =
    environment === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";

  const response = await fetch(
    `${baseUrl}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=75`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch company info: ${response.status}`);
  }

  const data = await response.json();
  return data.CompanyInfo?.CompanyName ?? "Unknown Company";
}

// ---------------------------------------------------------------------------
// QBClient Wrapper — provides promise-based access to node-quickbooks
// ---------------------------------------------------------------------------

/**
 * Wrapper around node-quickbooks that converts callback-based methods
 * to promise-based ones and provides typed helper methods.
 */
export class QBClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public qbo: any;
  public tokens: StoredQBTokens;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(qbo: any, tokens: StoredQBTokens) {
    this.qbo = qbo;
    this.tokens = tokens;
  }

  get realmId(): string {
    return this.tokens.realmId;
  }

  get baseUrl(): string {
    const config = getQBConfig();
    const env = config?.environment ?? "sandbox";
    return env === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";
  }

  // ---- Invoice ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createInvoice(invoice: Record<string, unknown>): Promise<any> {
    return this.promisify("createInvoice", invoice);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getInvoice(id: string): Promise<any> {
    return this.promisify("getInvoice", id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateInvoice(invoice: Record<string, unknown>): Promise<any> {
    return this.promisify("updateInvoice", invoice);
  }

  // ---- Customer ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createCustomer(customer: Record<string, unknown>): Promise<any> {
    return this.promisify("createCustomer", customer);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findCustomers(query: string): Promise<any> {
    return this.promisifyQuery("findCustomers", [{ field: "DisplayName", value: query, operator: "LIKE" }]);
  }

  // ---- Vendor ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createVendor(vendor: Record<string, unknown>): Promise<any> {
    return this.promisify("createVendor", vendor);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findVendors(query: string): Promise<any> {
    return this.promisifyQuery("findVendors", [{ field: "DisplayName", value: query, operator: "LIKE" }]);
  }

  // ---- Item (Service/Product) ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createItem(item: Record<string, unknown>): Promise<any> {
    return this.promisify("createItem", item);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findItems(query: string): Promise<any> {
    return this.promisifyQuery("findItems", [{ field: "Name", value: query, operator: "LIKE" }]);
  }

  // ---- Bill ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBill(bill: Record<string, unknown>): Promise<any> {
    return this.promisify("createBill", bill);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBill(id: string): Promise<any> {
    return this.promisify("getBill", id);
  }

  // ---- BillPayment ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBillPayment(payment: Record<string, unknown>): Promise<any> {
    return this.promisify("createBillPayment", payment);
  }

  // ---- Payment ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPayment(id: string): Promise<any> {
    return this.promisify("getPayment", id);
  }

  // ---- Attachable (upload) ----

  /**
   * Upload a file attachment and link it to a QBO entity (e.g., Invoice).
   */
  async uploadAttachment(
    entityType: string,
    entityId: string,
    fileName: string,
    contentType: string,
    fileBuffer: Buffer | Uint8Array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const url = `${this.baseUrl}/v3/company/${this.realmId}/upload?minorversion=75`;

    const boundary = "----QBBoundary" + Date.now();
    const metadata = JSON.stringify({
      AttachableRef: [
        {
          EntityRef: { type: entityType, value: entityId },
          IncludeOnSend: true,
        },
      ],
      FileName: fileName,
      ContentType: contentType,
    });

    const bodyParts = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="file_metadata"\r\n`,
      `Content-Type: application/json\r\n\r\n`,
      metadata,
      `\r\n--${boundary}\r\n`,
      `Content-Disposition: form-data; name="file_content"; filename="${fileName}"\r\n`,
      `Content-Type: ${contentType}\r\n\r\n`,
    ];

    const textEncoder = new TextEncoder();
    const prefix = textEncoder.encode(bodyParts.join(""));
    const suffix = textEncoder.encode(`\r\n--${boundary}--\r\n`);

    const body = new Uint8Array(
      prefix.length + fileBuffer.length + suffix.length
    );
    body.set(prefix, 0);
    body.set(new Uint8Array(fileBuffer), prefix.length);
    body.set(suffix, prefix.length + fileBuffer.length);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Accept: "application/json",
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`QB upload failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  // ---- Change Data Capture (CDC) ----

  /**
   * Fetch changed entities since a given date using CDC.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getChangedEntities(entityTypes: string[], since: string): Promise<any> {
    const entities = entityTypes.join(",");
    const url = `${this.baseUrl}/v3/company/${this.realmId}/cdc?entities=${entities}&changedSince=${since}&minorversion=75`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`QB CDC query failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  // ---- Generic Promisify ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private promisify(method: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.qbo[method](...args, (err: any, result: any) => {
        if (err) {
          reject(
            new Error(
              `QB ${method} failed: ${
                typeof err === "object" ? JSON.stringify(err) : err
              }`
            )
          );
        } else {
          resolve(result);
        }
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private promisifyQuery(method: string, criteria: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.qbo[method](criteria, (err: any, result: any) => {
        if (err) {
          reject(
            new Error(
              `QB ${method} query failed: ${
                typeof err === "object" ? JSON.stringify(err) : err
              }`
            )
          );
        } else {
          resolve(result);
        }
      });
    });
  }
}
