// Data layer kept for programmatic access. UI removed - see Phase 3 bloat removal.
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditLog } from "@/types/database";

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  tableName?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch audit log entries with optional filters.
 * Uses admin client since audit_log may have restricted RLS.
 */
export async function getAuditLogs(
  filters?: AuditLogFilters
): Promise<{ data: AuditLog[]; count: number }> {
  const supabase = createAdminClient();
  if (!supabase) return { data: [], count: 0 };

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" });

  if (filters?.userId) query = query.eq("changed_by", filters.userId);
  if (filters?.action) query = query.eq("action", filters.action);
  if (filters?.tableName) query = query.eq("table_name", filters.tableName);
  if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);

  return { data: (data ?? []) as AuditLog[], count: count ?? 0 };
}
