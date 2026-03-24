/**
 * Type declarations for intuit-oauth package.
 * The package does not ship its own TypeScript types.
 */
declare module "intuit-oauth" {
  interface OAuthClientConfig {
    clientId: string;
    clientSecret: string;
    environment: "sandbox" | "production";
    redirectUri: string;
    logging?: boolean;
  }

  interface TokenData {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    id_token?: string;
    realmId?: string;
  }

  interface AuthResponse {
    getJson(): TokenData;
    getToken(): TokenData;
    text(): string;
    status: number;
  }

  interface AuthorizeUriOptions {
    scope: string[];
    state?: string;
  }

  class OAuthClient {
    constructor(config: OAuthClientConfig);

    static scopes: {
      Accounting: string;
      Payment: string;
      Payroll: string;
      TimeTracking: string;
      Benefits: string;
      Profile: string;
      Email: string;
      Phone: string;
      Address: string;
      OpenId: string;
    };

    authorizeUri(options: AuthorizeUriOptions): string;
    createToken(url: string): Promise<AuthResponse>;
    refresh(): Promise<AuthResponse>;
    refreshUsingToken(refreshToken: string): Promise<AuthResponse>;
    revoke(params?: { access_token?: string; refresh_token?: string }): Promise<AuthResponse>;
    getUserInfo(): Promise<AuthResponse>;
    makeApiCall(params: { url: string; method?: string; headers?: Record<string, string>; body?: string }): Promise<AuthResponse>;

    setToken(token: TokenData): OAuthClient;
    getToken(): TokenData;
    isAccessTokenValid(): boolean;

    token: TokenData;
    authHeader(): string;
  }

  export default OAuthClient;
}
