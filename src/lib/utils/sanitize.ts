/**
 * Converts all `undefined` values in an object to `null`.
 * Supabase/Postgres expects `null` for missing values,
 * but Zod v4 optional fields produce `undefined`.
 */
export function undefinedToNull<T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T]: Exclude<T[K], undefined> | (undefined extends T[K] ? null : never) } {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) {
      (result as Record<string, unknown>)[key] = null;
    }
  }
  return result as ReturnType<typeof undefinedToNull<T>>;
}

/**
 * Escape PostgREST filter special characters in search input.
 * Prevents injection through `.or()` / `.ilike()` filter strings.
 */
export function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\,.()"']/g, (char) => `\\${char}`);
}

/**
 * Strips undefined entries from an object entirely (for partial updates).
 */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}
