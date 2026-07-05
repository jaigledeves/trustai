/**
 * JSON canonicalization per RFC 8785 (JCS).
 *
 * Why in-house instead of a dependency: this function produces the bytes
 * that get hashed and anchored on-chain (ADR-001). Evidence-critical code
 * must be auditable and dependency-free. The implementation leans on
 * ECMAScript semantics that RFC 8785 was designed around:
 *  - `JSON.stringify` number serialization matches JCS (ES Number::toString).
 *  - `JSON.stringify` string escaping matches JCS (shortest escapes,
 *    lowercase `\uXXXX` for control characters).
 *  - Default `Array.prototype.sort()` compares UTF-16 code units, which is
 *    the property-name ordering JCS mandates.
 *
 * IMMUTABILITY WARNING (INV-22, ADR-001): any observable change to this
 * function invalidates verification of previously issued DTRs. Changes
 * require a new DTR schema version, never an in-place edit.
 */

/** Raised when a value cannot be canonicalized safely. */
export class CanonicalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalizationError";
  }
}

/** JSON-compatible input accepted by {@link canonicalize}. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Serializes a JSON-compatible value to its RFC 8785 canonical form.
 * Same value in, same bytes out — always.
 *
 * @throws CanonicalizationError on non-finite numbers, bigints, functions,
 *         symbols or other non-JSON values.
 */
export function canonicalize(value: unknown): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";

    case "number": {
      if (!Number.isFinite(value)) {
        throw new CanonicalizationError(
          "Non-finite numbers (NaN, Infinity) cannot be canonicalized",
        );
      }
      // ES number-to-string matches RFC 8785 (incl. -0 => "0").
      return JSON.stringify(value);
    }

    case "string":
      return JSON.stringify(value);

    case "object": {
      if (Array.isArray(value)) {
        // JSON.stringify semantics: undefined inside arrays becomes null.
        const items = value.map((item) =>
          item === undefined ? "null" : canonicalize(item),
        );
        return `[${items.join(",")}]`;
      }
      return canonicalizeObject(value as Record<string, unknown>);
    }

    default:
      throw new CanonicalizationError(
        `Values of type "${typeof value}" cannot be canonicalized`,
      );
  }
}

function canonicalizeObject(obj: Record<string, unknown>): string {
  // UTF-16 code unit order, as mandated by RFC 8785 §3.2.3.
  const keys = Object.keys(obj).sort();

  const entries: string[] = [];
  for (const key of keys) {
    const propertyValue = obj[key];
    // JSON.stringify semantics: undefined-valued properties are dropped.
    if (propertyValue === undefined) {
      continue;
    }
    entries.push(`${JSON.stringify(key)}:${canonicalize(propertyValue)}`);
  }

  return `{${entries.join(",")}}`;
}
