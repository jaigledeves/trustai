import { cookies } from "next/headers";
import { config } from "./config";

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
}

/**
 * Pure builder for the session cookie's flags. Extracted from
 * setSessionCookie/clearSessionCookie so the httpOnly/maxAge contract
 * (spec: "JWT Never Exposed to Client JavaScript") is testable without
 * mocking `next/headers` at all.
 */
export function buildSessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: config.sessionMaxAgeSeconds,
  };
}

/** Reads the raw JWT from the httpOnly cookie, server-side only. */
export async function getSession(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(config.sessionCookieName)?.value;
}

/** Sets the httpOnly session cookie on a successful login. */
export async function setSessionCookie(accessToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    config.sessionCookieName,
    accessToken,
    buildSessionCookieOptions(),
  );
}

/** Clears the session cookie (logout). JWT is stateless — no backend call needed. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(config.sessionCookieName, "", {
    ...buildSessionCookieOptions(),
    maxAge: 0,
  });
}
