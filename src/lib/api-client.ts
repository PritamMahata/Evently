export interface ApiError { code: string; message: string; fields?: Record<string, string> }
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** Browser-side fetch wrapper that always resolves to a typed result (never throws). */
export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? "POST",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: json as T };
    return { ok: false, error: json?.error ?? { code: "INTERNAL", message: "Something went wrong. Please try again." } };
  } catch {
    return { ok: false, error: { code: "NETWORK", message: "Network problem. Check your connection and try again." } };
  }
}
