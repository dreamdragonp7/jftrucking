/**
 * Server Client Shim — patches @/lib/supabase/server's createClient
 *
 * MUST be imported BEFORE any @/lib/services/* or @/lib/data/* imports.
 *
 * The problem: service files like invoice.service.ts import createClient
 * from @/lib/supabase/server, which calls cookies() from next/headers.
 * Outside Next.js, this throws. This shim replaces the module export
 * with a function that returns the admin (service_role) Supabase client.
 *
 * How it works:
 *   1. Load env vars from .env.local
 *   2. Require the compiled server module via its resolved path
 *   3. Replace its createClient export with an admin client factory
 *
 * Usage (in test scripts):
 *   import "./lib/patch-server-client"; // MUST be first
 *   import { generateInvoice } from "@/lib/services/invoice.service";
 */

import { loadEnv, createAdminClient } from "./test-helpers";

// Step 1: Load environment variables before anything else
loadEnv();

// Step 2: Resolve and patch the server module
//
// tsx respects tsconfig paths, so `require("@/lib/supabase/server")` resolves
// to `src/lib/supabase/server.ts`. We require it, then overwrite its
// createClient export with a function that returns the admin client.
//
// Note: We also need to patch the data layer modules that call createClient()
// from server.ts. Since they import it at call-time (top-level import, but
// the function is async and called later), patching the module export before
// they execute is sufficient.

const serverModulePath = require.resolve("../../src/lib/supabase/server");

// Pre-load the module so it's in the require cache
try {
  require(serverModulePath);
} catch {
  // Expected to fail — the module imports `next/headers` which doesn't exist
  // outside Next.js. We'll replace it entirely below.
}

// Create a mock module that exports our admin client factory
const mockModule = {
  createClient: async () => {
    return createAdminClient();
  },
};

// Replace the cached module
require.cache[serverModulePath] = {
  id: serverModulePath,
  filename: serverModulePath,
  loaded: true,
  exports: mockModule,
  children: [],
  paths: [],
  path: require("path").dirname(serverModulePath),
  parent: null,
  isPreloading: false,
  require: require,
} as unknown as NodeModule;

// Also patch via the @/ alias resolution — tsx may resolve it differently
const altPath = require.resolve("@/lib/supabase/server");
if (altPath !== serverModulePath) {
  require.cache[altPath] = require.cache[serverModulePath]!;
}

// Step 3: Also patch @/lib/demo to prevent demo mode from interfering
try {
  const demoModulePath = require.resolve("@/lib/demo");
  const demoMock = {
    isDemoMode: () => false,
    DEMO_MODE: false,
  };
  // Pre-load to get it cached
  try { require(demoModulePath); } catch { /* ignore */ }
  require.cache[demoModulePath] = {
    id: demoModulePath,
    filename: demoModulePath,
    loaded: true,
    exports: demoMock,
    children: [],
    paths: [],
    path: require("path").dirname(demoModulePath),
    parent: null,
    isPreloading: false,
    require: require,
  } as unknown as NodeModule;
} catch {
  // Demo module may not exist — that's fine
}

// Step 4: Patch @/lib/utils/settings to avoid Next.js dependency
try {
  const settingsPath = require.resolve("@/lib/utils/settings");
  try { require(settingsPath); } catch { /* ignore */ }

  const adminClient = createAdminClient();
  const settingsMock = {
    getBusinessSetting: async (key: string): Promise<string> => {
      const { data } = await adminClient.from("app_settings").select("value").eq("key", key).maybeSingle();
      return data?.value ?? "";
    },
    getBusinessSettingNumber: async (key: string): Promise<number> => {
      const { data } = await adminClient.from("app_settings").select("value").eq("key", key).maybeSingle();
      return Number(data?.value ?? 30);
    },
    getBusinessSettingBool: async (key: string): Promise<boolean> => {
      const { data } = await adminClient.from("app_settings").select("value").eq("key", key).maybeSingle();
      return data?.value === "true";
    },
  };

  require.cache[settingsPath] = {
    id: settingsPath,
    filename: settingsPath,
    loaded: true,
    exports: settingsMock,
    children: [],
    paths: [],
    path: require("path").dirname(settingsPath),
    parent: null,
    isPreloading: false,
    require: require,
  } as unknown as NodeModule;
} catch {
  // Settings module may not exist — that's fine
}

console.log("[Shim] Server client patched — service imports will use admin client");
