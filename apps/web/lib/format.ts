const DEFAULT_TRUNCATE_THRESHOLD = 12;

/**
 * Shared middle-ellipsis truncation for long ids/hashes (spec:
 * web-visual-coherence — "Truncated Yet Accessible Record IDs"). Values at
 * or under `threshold` are returned untouched; longer values become
 * `head…tail` (first 6 / last 4 chars). Consumers needing an accessible
 * name for the full value should pair this with `aria-label`.
 */
export function truncateId(value: string, threshold = DEFAULT_TRUNCATE_THRESHOLD): string {
  return value.length > threshold ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
