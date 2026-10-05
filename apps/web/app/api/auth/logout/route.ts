import { NextResponse, type NextRequest } from "next/server";
import { rejectCrossOrigin } from "../../../../lib/security/same-origin";
import { clearSessionCookie } from "../../../../lib/session";

/**
 * Clears the session cookie. JWT is stateless — no backend call needed.
 * Same-origin only, so a third-party page cannot log the user out.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rejected = rejectCrossOrigin(request);
  if (rejected) {
    return rejected;
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
