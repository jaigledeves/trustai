import { NextResponse, type NextRequest } from "next/server";
import { ApiError, mapApiError } from "../../../../lib/api/errors";
import { serverFetch } from "../../../../lib/api/server-client";
import type { LoginResponse } from "../../../../lib/api/types";
import { setSessionCookie } from "../../../../lib/session";

interface LoginRequestBody {
  email?: string;
  password?: string;
}

/**
 * The ONLY place a session cookie is ever set (spec: "Login and Session
 * Establishment"). Calls `POST {API_BASE_URL}/auth/login` directly; on 200
 * it sets the httpOnly cookie from the returned `accessToken`. On 401/403
 * the cookie is never touched — the distinct copy (no enumeration vs.
 * unverified email) is chosen by `mapApiError`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { email, password } = (await request.json()) as LoginRequestBody;

  if (!email || !password) {
    return NextResponse.json(
      { status: 400, message: "email and password are required" },
      { status: 400 },
    );
  }

  try {
    const result = await serverFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    await setSessionCookie(result.accessToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { status: error.status, message: mapApiError(error.status, "login") },
        { status: error.status },
      );
    }
    throw error;
  }
}
