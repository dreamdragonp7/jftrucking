/**
 * Offline data sync using Dexie.js (IndexedDB wrapper).
 *
 * Provides offline-first delivery submission:
 * - Caches assigned loads for offline viewing
 * - Queues delivery submissions when offline
 * - Auto-syncs pending deliveries when connection returns
 *
 * Critical for construction site use where cell signal is spotty.
 */

import Dexie, { type EntityTable } from "dexie";

// ---------------------------------------------------------------------------
// Schema types
// ---------------------------------------------------------------------------

export interface PendingDelivery {
  id?: number; // auto-increment
  dispatch_id: string;
  ticket_number: string;
  net_weight: number | null;
  photo_blob: Blob | null;
  notes: string;
  created_at: string;
  synced: boolean;
  sync_error: string | null;
}

export interface CachedLoad {
  id: string; // dispatch ID
  data: string; // JSON stringified dispatch with relations
  cached_at: string;
}

// ---------------------------------------------------------------------------
// Database definition
// ---------------------------------------------------------------------------

class JFTOfflineDB extends Dexie {
  pendingDeliveries!: EntityTable<PendingDelivery, "id">;
  cachedLoads!: EntityTable<CachedLoad, "id">;

  constructor() {
    super("jft-trucker-offline");

    this.version(1).stores({
      pendingDeliveries:
        "++id, dispatch_id, synced, created_at",
      cachedLoads: "id, cached_at",
    });
  }
}

// Singleton instance
let db: JFTOfflineDB | null = null;

function getDB(): JFTOfflineDB {
  if (!db) {
    db = new JFTOfflineDB();
  }
  return db;
}

// ---------------------------------------------------------------------------
// Pending deliveries (offline queue)
// ---------------------------------------------------------------------------

/**
 * Save a delivery to the offline queue.
 * Called when the driver submits a delivery form while offline.
 */
export async function savePendingDelivery(data: {
  dispatch_id: string;
  ticket_number: string;
  net_weight: number | null;
  photo_blob: Blob | null;
  notes: string;
}): Promise<number> {
  const database = getDB();
  const id = await database.pendingDeliveries.add({
    ...data,
    created_at: new Date().toISOString(),
    synced: false,
    sync_error: null,
  });
  return id as number;
}

/**
 * Get all unsynced pending deliveries.
 */
export async function getUnsyncedDeliveries(): Promise<PendingDelivery[]> {
  const database = getDB();
  return database.pendingDeliveries
    .where("synced")
    .equals(0) // Dexie stores booleans as 0/1
    .toArray();
}

/**
 * Get count of unsynced deliveries.
 */
export async function getUnsyncedCount(): Promise<number> {
  const database = getDB();
  return database.pendingDeliveries
    .where("synced")
    .equals(0)
    .count();
}

/**
 * Mark a pending delivery as synced.
 */
export async function markSynced(id: number): Promise<void> {
  const database = getDB();
  await database.pendingDeliveries.update(id, { synced: true });
}

/**
 * Mark a pending delivery as failed with an error message.
 */
export async function markSyncFailed(
  id: number,
  error: string
): Promise<void> {
  const database = getDB();
  await database.pendingDeliveries.update(id, { sync_error: error });
}

/**
 * Remove synced deliveries older than 7 days (cleanup).
 */
export async function cleanupSynced(): Promise<void> {
  const database = getDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString();

  await database.pendingDeliveries
    .where("synced")
    .equals(1)
    .filter((d) => d.created_at < cutoffStr)
    .delete();
}

// ---------------------------------------------------------------------------
// Cached loads (offline viewing)
// ---------------------------------------------------------------------------

/**
 * Cache today's loads for offline viewing.
 * Replaces all existing cached loads with fresh data.
 */
export async function cacheLoads<T>(loads: T[]): Promise<void> {
  // Guard: don't clear cache with empty data (network error returned nothing)
  if (loads.length === 0) return;

  const database = getDB();
  const now = new Date().toISOString();

  await database.transaction("rw", database.cachedLoads, async () => {
    await database.cachedLoads.clear();
    const entries: CachedLoad[] = (loads as Array<T & { id: string }>).map(
      (load) => ({
        id: load.id,
        data: JSON.stringify(load),
        cached_at: now,
      })
    );
    await database.cachedLoads.bulkAdd(entries);
  });
}

/**
 * Get cached loads for offline display.
 * Returns parsed dispatch objects.
 */
export async function getCachedLoads<T>(): Promise<T[]> {
  const database = getDB();
  const entries = await database.cachedLoads.toArray();
  return entries
    .map((entry) => {
      try {
        return JSON.parse(entry.data) as T;
      } catch {
        console.warn("[Offline] Corrupted cache entry, skipping:", entry.id);
        return null;
      }
    })
    .filter((item): item is T => item !== null);
}

/**
 * Check if there are any cached loads.
 */
export async function hasCachedLoads(): Promise<boolean> {
  const database = getDB();
  const count = await database.cachedLoads.count();
  return count > 0;
}

// ---------------------------------------------------------------------------
// Sync engine
// ---------------------------------------------------------------------------

/**
 * Sync all pending deliveries to the server.
 * Called when the app detects the connection is back online.
 *
 * @param submitFn - Server action to submit each delivery
 * @returns Number of successfully synced deliveries
 */
export async function syncPendingDeliveries(
  submitFn: (data: {
    dispatch_id: string;
    ticket_number: string;
    net_weight: number | null;
    photo_blob: Blob | null;
    notes: string;
  }) => Promise<{ success: boolean; error?: string }>
): Promise<number> {
  const pending = await getUnsyncedDeliveries();
  let synced = 0;

  for (const delivery of pending) {
    try {
      const result = await submitFn({
        dispatch_id: delivery.dispatch_id,
        ticket_number: delivery.ticket_number,
        net_weight: delivery.net_weight,
        photo_blob: delivery.photo_blob,
        notes: delivery.notes,
      });

      if (result.success && delivery.id != null) {
        await markSynced(delivery.id);
        synced++;
      } else if (delivery.id != null) {
        await markSyncFailed(delivery.id, result.error ?? "Unknown error");
      }
    } catch (error) {
      if (delivery.id != null) {
        await markSyncFailed(
          delivery.id,
          error instanceof Error ? error.message : "Sync failed"
        );
      }
    }
  }

  // Cleanup old synced entries
  await cleanupSynced();

  return synced;
}
