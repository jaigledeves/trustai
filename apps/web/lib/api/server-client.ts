import { config } from "../config";
import { getSession } from "../session";
import { ApiError } from "./errors";

export interface ServerFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

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

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

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
