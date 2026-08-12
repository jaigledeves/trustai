import Link from "next/link";
import { shellDictionary } from "../../dictionaries/es/shell";
import { Button } from "../ui/button";
import { LogoutButton } from "./LogoutButton";

export interface HeaderAuthActionsProps {
  isAuthenticated: boolean;
}

/**
 * Shared session-aware auth cluster rendered by both the public landing
 * `Nav` and the `verify/[id]` layout header (spec: public-landing —
 * Session-Aware Nav Auth Affordance; web-public-verify — Unified Header
 * Auth Cluster on Verify; web-visual-coherence — No Ambiguous Auth Icon in
 * Public Nav). Pure render — never calls `getSession()` itself, so each
 * caller reads its own session once and passes the result down
 * (design.md: "Session read location" decision).
 *
 * No `'use client'` directive: it composes the existing client
 * `LogoutButton` as a child, same pattern the callers already use.
 */
export function HeaderAuthActions({ isAuthenticated }: HeaderAuthActionsProps) {
  if (!isAuthenticated) {
    return (
      <Button size="sm" asChild>
        <Link href="/login">{shellDictionary.nav.signIn}</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dtrs">{shellDictionary.nav.dtrs}</Link>
      </Button>
      <LogoutButton />
    </div>
  );
}
