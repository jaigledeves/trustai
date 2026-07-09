import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/session";

/** Clears the session cookie. JWT is stateless — no backend call needed. */
export async function POST(): Promise<NextResponse> {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
