import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Nav } from "@/components/landing/Nav";
import { Pillars } from "@/components/landing/Pillars";
import { UseCases } from "@/components/landing/UseCases";
import { VerificationDemo } from "@/components/landing/VerificationDemo";

// Public marketing landing (route "/"). Replaces the old
// `redirect("/login")` placeholder: the deployed URL's first impression is
// now a real product page, and `proxy.ts` still guards `/dtrs/*` behind a
// session. A thin Server Component composing the 9 sections in order
// (spec: public-landing — Landing Composition); only `VerificationDemo` is
// `'use client'`.
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <VerificationDemo />
        <UseCases />
        <Pillars />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
