import { config } from "../config";
import { getSession } from "../session";
import { ApiError } from "./errors";

export interface ServerFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

/** Outbound request timeout — a stuck backend must not hang the RSC render. */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Direct fetch to `API_BASE_URL`, for RSC / Server Action / route-handler
 * use. Reads the httpOnly session cookie server-side and re-attaches it as
 * `Authorization: Bearer <token>` — the raw cookie is NEVER forwarded
 * (spec: "JWT Never Exposed to Client JavaScript").
 */
export async function serverFetch<T>(
  path: string,
  options: ServerFetchOptions = {},
): Promise<T> {
  const token = await getSession();
  const url = new URL(path, config.apiBaseUrl());

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });
  } catch (error) {
    // A backend outage/timeout throws a TypeError/AbortError here. Map it to
    // an ApiError in the same {status,message} shape `errors.ts` consumes —
    // never let an uncaught network error bypass the app's error handling.
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError(503, "The backend service did not respond in time");
    }
    throw new ApiError(502, "Could not reach the backend service");
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message: unknown }).message;
      return Array.isArray(message) ? message.join(", ") : String(message);
    }
  } catch {
    // Response body wasn't JSON (or was empty) — fall through.
  }
  return `Request failed with status ${response.status}`;
}
