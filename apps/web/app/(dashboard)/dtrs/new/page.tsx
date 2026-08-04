import Link from "next/link";
import { UploadStep } from "../../../../components/certify/UploadStep";
import { shellDictionary } from "../../../../dictionaries/es/shell";

/**
 * Certify wizard entry point — not explicitly named in design.md's route
 * tree (which only lists `dtrs/[id]`), but a concrete place to START a
 * certification has to exist somewhere: `UploadStep` produces a
 * `trustRecordId` that `dtrs/[id]` then takes over. Deviation documented
 * in apply-progress.
 *
 * Back-link to the list mirrors `DtrDetailCard`'s recovery-navigation
 * pattern (spec: web-visual-coherence — reuses `shellDictionary.nav.dtrs`,
 * no new key).
 */
export default function NewCertificationPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Link
        href="/dtrs"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        {shellDictionary.nav.dtrs}
      </Link>
      <UploadStep />
    </main>
  );
}
