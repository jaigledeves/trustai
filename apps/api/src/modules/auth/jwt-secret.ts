import type { ConfigService } from "@nestjs/config";

/** Placeholder published in `.env.example`; never valid as a real secret. */
export const JWT_SECRET_PLACEHOLDER = "change-me-in-production";

/**
 * Reads `JWT_SECRET` and fails fast when it is missing, blank, or still the
 * published placeholder. The repository is public, so any fallback value
 * would let anyone forge session tokens.
 */
export function requireJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>("JWT_SECRET");
  const trimmed = secret?.trim() ?? "";
  if (secret === undefined || trimmed === "" || trimmed === JWT_SECRET_PLACEHOLDER) {
    throw new Error(
      "JWT_SECRET must be set to a non-placeholder value before the API can start.",
    );
  }
  return secret;
}
