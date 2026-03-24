/**
 * Server Client Shim -- patches @/lib/supabase/server's createClient
 *
 * MUST be imported BEFORE any @/lib/services/* or @/lib/data/* imports.
 *
 * The problem: service files like invoice.service.ts import createClient
 * from @/lib/supabase/server, which calls cookies() from next/headers.
 * Outside Next.js, this throws. This shim replaces the module export
 * with a function that returns the admin (service_role) Supabase client.
 *
 * Usage (in test scripts):
 *   import "./lib/patch-server-client"; // MUST be first
 *   import { generateInvoice } from "@/lib/services/invoice.service";
 */

import { loadEnv, createAdminClient } from "./test-helpers";

// Step 1: Load environment variables before anything else
loadEnv();

// Step 2: Resolve and patch the server module
const serverModulePath = require.resolve("../../../src/lib/supabase/server");

try {
  require(serverModulePath);
} catch {
  // Expected to fail -- the module imports `next/headers` which doesn't exist
  // outside Next.js. We'll replace it entirely below.
}

const mockModule = {
  createClient: async () => {
    return createAdminClient();
  },
};

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

// Also patch via the @/ alias resolution
try {
  const altPath = require.resolve("@/lib/supabase/server");
  if (altPath !== serverModulePath) {
    require.cache[altPath] = require.cache[serverModulePath]!;
  }
} catch {
  // If @/ alias doesn't resolve here, that's fine
}

// Step 3: Patch @/lib/demo to prevent demo mode from interfering
try {
  const demoModulePath = require.resolve("@/lib/demo");
  const demoMock = {
    isDemoMode: () => false,
    DEMO_MODE: false,
  };
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
  // Demo module may not exist
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
  // Settings module may not exist
}

// Step 5: Patch next/cache to prevent revalidatePath errors
try {
  const nextCachePath = require.resolve("next/cache");
  try { require(nextCachePath); } catch { /* ignore */ }

  const nextCacheMock = {
    revalidatePath: () => {},
    revalidateTag: () => {},
    unstable_cache: (fn: Function) => fn,
  };

  require.cache[nextCachePath] = {
    id: nextCachePath,
    filename: nextCachePath,
    loaded: true,
    exports: nextCacheMock,
    children: [],
    paths: [],
    path: require("path").dirname(nextCachePath),
    parent: null,
    isPreloading: false,
    require: require,
  } as unknown as NodeModule;
} catch {
  // next/cache may not be resolved
}

console.log("[Shim] Server client patched -- service imports will use admin client");
