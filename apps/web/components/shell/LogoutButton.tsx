"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { shellDictionary } from "../../dictionaries/es/shell";
import { Button } from "../ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={shellDictionary.nav.logout}
      onClick={handleLogout}
    >
      <LogOut />
    </Button>
  );
}
