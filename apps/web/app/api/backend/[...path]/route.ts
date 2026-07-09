import { NextResponse, type NextRequest } from "next/server";
import { config } from "../../../../lib/config";
import { getSession } from "../../../../lib/session";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

/** Outbound request timeout — a stuck backend must not hang the proxy. */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Generic Bearer-injecting proxy for every org-scoped backend call a Client
 * Component makes (design.md: "Single catch-all proxy ... avoids N
 * near-duplicate files and centralizes 401/403/409 mapping"). Client
 * Components cannot read the httpOnly session cookie themselves, so this
 * route handler reads it server-side and re-attaches it as
 * `Authorization: Bearer <token>` on every forwarded request — the raw
 * cookie is never sent onward.
 */
async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { path } = await context.params;

  const apiBaseUrl = config.apiBaseUrl();
  const targetUrl = new URL(`/${path.join("/")}`, apiBaseUrl);
  targetUrl.search = request.nextUrl.search;

  // SSRF guard: a leading empty catch-all segment makes `path.join("/")`
  // start with `//host`, which `new URL()` resolves to an ARBITRARY origin —
  // and we'd otherwise attach the user's Bearer to it. Reject anything that
  // escaped the configured API origin BEFORE reading the session / attaching
  // the token / fetching.
  if (targetUrl.origin !== new URL(apiBaseUrl).origin) {
    return NextResponse.json(
      { status: 400, message: "Invalid request path" },
      { status: 400 },
    );
  }

  const token = await getSession();

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(body && body.byteLength > 0 ? { body } : {}),
    });
  } catch (error) {
    // Backend outage/timeout: return the same {status,message} JSON shape the
    // client-fetch wrapper expects, never an uncaught TypeError -> 500 crash.
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    const status = isTimeout ? 503 : 502;
    return NextResponse.json(
      {
        status,
        message: isTimeout
          ? "The backend service did not respond in time"
          : "Could not reach the backend service",
      },
      { status },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { status: response.status, message: await readErrorMessage(response) },
      { status: response.status },
    );
  }

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const responseBody = await response.arrayBuffer();
  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
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

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
