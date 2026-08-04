import { certifyDictionary } from "../../dictionaries/es/certify";
import type { TrustRecordAssetDetail } from "../../lib/api/types";

interface DocumentContextHeaderProps {
  asset: TrustRecordAssetDetail;
}

const KB = 1024;
const MB = KB * 1024;

/**
 * No shared byte-size formatter exists yet in `apps/web/lib` (only
 * `truncateId` in `lib/format.ts`, for a different concern) — kept local
 * per design.md's "reuse if one exists, otherwise format inline".
 */
function formatSizeBytes(bytes: number): string {
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

/** Fixed `UTC` so the rendered date is deterministic across CI/local timezones. */
function formatUploadedAt(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

/**
 * Persistent document identity above the wizard's step indicator (spec:
 * web-certify-flow — "Persistent Document Context"). Presentational only
 * (design.md "Component decomposition") — `filename`/`sizeBytes`/`uploadedAt`
 * come straight from `TrustRecordDetail.asset`, never null itself, but
 * `filename` can be `null` for a legacy asset, hence the fallback label.
 */
export function DocumentContextHeader({ asset }: DocumentContextHeaderProps) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-3 text-sm">
      <p className="font-medium">
        {asset.filename ?? certifyDictionary.documentContext.filenameFallback}
      </p>
      <p className="text-xs text-muted-foreground">
        {certifyDictionary.documentContext.sizeLabel}: {formatSizeBytes(asset.sizeBytes)}
        {" · "}
        {certifyDictionary.documentContext.uploadedAtLabel}: {formatUploadedAt(asset.uploadedAt)}
      </p>
    </div>
  );
}
