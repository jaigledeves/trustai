import { ApiError } from "./errors";

export interface ClientFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON body — mutually exclusive with `formData`. */
  body?: unknown;
  /** Multipart body (asset upload) — the browser sets the boundary content-type itself. */
  formData?: FormData;
}

/**
 * Browser fetch wrapper for Client Components. Targets the same-origin
 * `/api/backend/*` proxy (design.md) — the httpOnly session cookie is sent
 * automatically by the browser on this same-origin request; the proxy
 * route handler (Phase 1) reads it server-side and re-attaches it as
 * `Authorization: Bearer <token>`. This wrapper never touches the cookie
 * or the token itself.
 */
export async function clientFetch<T>(
  path: string,
  options: ClientFetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`/api/backend${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(body !== undefined ? { body } : {}),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { status?: number; message?: string }
      | null;
    throw new ApiError(
      errorBody?.status ?? response.status,
      errorBody?.message ?? `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
