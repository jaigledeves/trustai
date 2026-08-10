import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { shellDictionary } from "@/dictionaries/es/shell";
import {
  buildThemeInitScript,
  parseThemePreference,
  resolveServerHtmlClassName,
  THEME_COOKIE_NAME,
} from "@/lib/theme";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: shellDictionary.appName,
  // RNF-041: sourced from the dictionary, never a hardcoded literal.
  description: shellDictionary.meta.description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // spec: web-theme — "SSR Renders Correct Theme Class (No FOUC)". An
  // explicit "dark"/"light" cookie is definitive here, so the class is
  // correct on first paint with no client correction needed. "system" (or
  // a missing cookie) deliberately renders WITHOUT the class — the server
  // cannot know the OS preference — and the blocking script below corrects
  // the DOM synchronously before paint, before React hydrates.
  // `suppressHydrationWarning` is the documented escape hatch for that one
  // pre-hydration DOM mutation (see
  // node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md);
  // it does NOT mask a real mismatch — the script always runs before
  // hydration starts, so by the time React compares the DOM the class is
  // already settled.
  const cookieStore = await cookies();
  const themePreference = parseThemePreference(
    cookieStore.get(THEME_COOKIE_NAME)?.value,
  );
  const themeClassName = resolveServerHtmlClassName(themePreference);

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${themeClassName ? ` ${themeClassName}` : ""}`}
      suppressHydrationWarning
    >
      <head>
        {/* Blocking pre-paint theme script (design.md), same pattern as
            Next's own preventing-flash-before-hydration.md guide. */}
        <script dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
