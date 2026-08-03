import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LANDING_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Spec: public-landing — Landing Composition ("Only VerificationDemo ships
 * client JS" scenario). Reads every section's source directly rather than
 * asserting per-file, so a new section added later is automatically
 * covered without editing this test.
 */
describe("components/landing client boundary (spec: public-landing)", () => {
  const sectionFiles = readdirSync(LANDING_DIR).filter(
    (file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"),
  );

  it("found the expected landing section component files", () => {
    expect(sectionFiles.length).toBeGreaterThan(0);
  });

  it.each(sectionFiles.map((file) => [file]))(
    "%s only declares 'use client' if it is VerificationDemo.tsx",
    (file) => {
      const source = readFileSync(join(LANDING_DIR, file), "utf-8");
      const declaresUseClient = /^["']use client["'];?/m.test(source.trimStart());

      if (file === "VerificationDemo.tsx") {
        expect(declaresUseClient).toBe(true);
      } else {
        expect(declaresUseClient).toBe(false);
      }
    },
  );
});
