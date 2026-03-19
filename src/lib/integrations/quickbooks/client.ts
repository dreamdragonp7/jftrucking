/**
 * QuickBooks Online API client.
 *
 * Handles OAuth token management and API calls to QuickBooks.
 * Agent 4 will implement the full integration including:
 * - OAuth 2.0 flow (authorization URL, token exchange, refresh)
 * - Invoice syncing (create, update, void)
 * - Payment recording
 * - Customer syncing
 * - Webhook signature verification
 */

export interface QBConfig {
  clientId: string;
  clientSecret: string;
  environment: "sandbox" | "production";
  redirectUri: string;
  realmId: string;
}

export interface QBTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  realmId: string;
}

/**
 * Get QuickBooks configuration from environment variables.
 */
export function getQBConfig(): QBConfig {
  return {
    clientId: process.env.QB_CLIENT_ID!,
    clientSecret: process.env.QB_CLIENT_SECRET!,
    environment: (process.env.QB_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    redirectUri: process.env.QB_REDIRECT_URI!,
    realmId: process.env.QB_REALM_ID!,
  };
}
