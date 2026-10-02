import type { INestApplication } from "@nestjs/common";
import helmet from "helmet";

/**
 * Helmet options for the API. Helmet's other defaults stay on: HSTS, nosniff,
 * Referrer-Policy: no-referrer, X-Frame-Options, Cross-Origin-* policies and
 * removal of X-Powered-By.
 *
 * One CSP covers both the JSON routes and Swagger UI (`/api-docs`):
 * - `script-src 'self'`: @nestjs/swagger serves the Swagger UI bootstrap as an
 *   external `swagger-ui-init.js`, so no inline script needs to be allowed.
 * - `style-src 'self' 'unsafe-inline'` and `img-src 'self' data:`: Swagger UI
 *   sets inline styles and renders its icons as data: URIs.
 * - `upgrade-insecure-requests` is dropped: TLS terminates at the platform
 *   (HSTS already forces HTTPS in production), and over plain-HTTP local
 *   development the directive makes the browser request Swagger's assets over
 *   HTTPS, which breaks the page.
 * - `frame-ancestors 'none'`: nothing the API serves is meant to be embedded.
 */
export const securityHeadersOptions: Parameters<typeof helmet>[0] = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
      "upgrade-insecure-requests": null,
    },
  },
  frameguard: { action: "deny" },
};

export function applySecurityHeaders(app: INestApplication): void {
  app.use(helmet(securityHeadersOptions));
}
