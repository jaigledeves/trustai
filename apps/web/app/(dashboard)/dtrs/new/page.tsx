import { UploadStep } from "../../../../components/certify/UploadStep";

/**
 * Certify wizard entry point — not explicitly named in design.md's route
 * tree (which only lists `dtrs/[id]`), but a concrete place to START a
 * certification has to exist somewhere: `UploadStep` produces a
 * `trustRecordId` that `dtrs/[id]` then takes over. Deviation documented
 * in apply-progress.
 */
export default function NewCertificationPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <UploadStep />
    </main>
  );
}
