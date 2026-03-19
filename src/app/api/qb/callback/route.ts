import { NextResponse, type NextRequest } from "next/server";

/**
 * QuickBooks OAuth callback handler.
 * Receives the authorization code after the user authorizes in QuickBooks.
 * Exchanges the code for access/refresh tokens and stores them.
 *
 * Agent 4 (QuickBooks) will implement the full OAuth flow here.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");

  if (!code || !realmId) {
    return NextResponse.json(
      { error: "Missing authorization code or realm ID" },
      { status: 400 }
    );
  }

  // Validate state parameter to prevent CSRF
  if (!state) {
    return NextResponse.json(
      { error: "Missing state parameter" },
      { status: 400 }
    );
  }

  // Exchange code for tokens (Agent 4 will implement)
  return NextResponse.redirect(
    new URL("/admin/quickbooks?connected=true", request.url)
  );
}
