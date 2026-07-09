import { redirect } from "next/navigation";

// The marketing/landing page is out of this proposal's scope (see
// sdd/web-frontend proposal "Out of Scope"). Root "/" sends everyone
// straight to the golden-path entry point; `middleware.ts` (Phase 1.3)
// further guards `/dtrs/*` behind a session cookie.
export default function RootPage(): never {
  redirect("/login");
}
