/**
 * Safe error summary for logs: never the raw object (which can carry request headers,
 * API responses or personal data). Only name, message and support identifiers.
 */
export function safeError(err: unknown) {
  if (!(err instanceof Error)) return { message: String(err).slice(0, 200) };
  const e = err as Error & { status?: number; statusCode?: number; code?: string; debugId?: string | null };
  return {
    name: e.name,
    message: e.message.slice(0, 300),
    ...(e.status ?? e.statusCode ? { status: e.status ?? e.statusCode } : {}),
    ...(e.code ? { code: e.code } : {}),
    ...(e.debugId ? { debugId: e.debugId } : {}),
  };
}
