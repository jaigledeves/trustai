# Delta for api-rate-limiting

## ADDED Requirements

### Requirement: Global Default Throttle Coverage

Every HTTP route in the API MUST be covered by a default rate limit,
enforced by a global guard (`APP_GUARD`) registered alongside
`ThrottlerModule`. The window (`THROTTLE_TTL_SECONDS`) and the request
count per window (`THROTTLE_LIMIT`) MUST be configurable via environment
variables. Routes with no explicit per-route override MUST fall back to
this default.

#### Scenario: Requests within the default limit succeed

- GIVEN a route with no per-route throttle override
- WHEN a client sends requests up to `THROTTLE_LIMIT` within the
  `THROTTLE_TTL_SECONDS` window
- THEN each request is processed normally (no 429)

#### Scenario: Exceeding the default limit returns 429

- GIVEN a route with no per-route throttle override
- WHEN a client exceeds `THROTTLE_LIMIT` requests within the
  `THROTTLE_TTL_SECONDS` window
- THEN the next request receives HTTP 429 (Too Many Requests)

### Requirement: Auth-Aware Request Tracking

The global guard MUST key its rate-limit counter by authenticated user
identity (the JWT `sub` claim) when the request carries a valid
authenticated session, and MUST fall back to the client IP address only
for unauthenticated requests. Two authenticated users sharing the same
client IP (e.g. behind a corporate NAT) MUST NOT share a throttle bucket.

#### Scenario: Two authenticated users on the same IP do not share a budget

- GIVEN two different authenticated users (`sub` A and `sub` B) issuing
  requests from the same client IP
- WHEN user A exhausts their throttle limit
- THEN user B's subsequent requests are still counted against B's own
  budget and are not throttled by A's usage

#### Scenario: Anonymous requests from the same IP share a bucket

- GIVEN two unauthenticated requests originating from the same client IP
- WHEN both requests are counted by the guard
- THEN they are tracked against the same IP-keyed bucket

### Requirement: Stricter Throttle on Asset Upload

`POST /assets` (which enqueues the `analyze-document` job against the
paid OpenAI adapter) MUST enforce its own throttle limit, configured via
`UPLOAD_THROTTLE_LIMIT`, independent of the global default. The
effective upload limit MUST be lower (stricter) than the effective
global default limit (`THROTTLE_LIMIT`).

#### Scenario: Upload limit is stricter than the global default

- GIVEN `THROTTLE_LIMIT` and `UPLOAD_THROTTLE_LIMIT` are both configured
- WHEN the two effective limits are compared
- THEN `UPLOAD_THROTTLE_LIMIT` is lower than `THROTTLE_LIMIT`

#### Scenario: Exceeding the upload limit blocks the paid job

- GIVEN an authenticated user has reached `UPLOAD_THROTTLE_LIMIT` within
  the throttle window
- WHEN that user sends another `POST /assets` request
- THEN the response is HTTP 429, no `analyze-document` job is enqueued,
  and no OpenAI adapter call is made

### Requirement: Moderate Throttle on Trust Record Anchoring

`POST /trust-records/:id/anchor` (which incurs on-chain gas cost) MUST
enforce its own throttle limit, configured via its own environment
variable, independent of the global default.

#### Scenario: Exceeding the anchor limit returns 429

- GIVEN an authenticated user has reached the configured anchor throttle
  limit within the throttle window
- WHEN that user sends another `POST /trust-records/:id/anchor` request
- THEN the response is HTTP 429 (Too Many Requests)

### Requirement: Health Check Exempt From Throttling

`GET /health` MUST be exempt from all throttling (global default and any
per-route override), so that health/readiness probes are never rate
limited regardless of call volume.

#### Scenario: Health check is never throttled

- GIVEN `GET /health` is called far more frequently than
  `THROTTLE_LIMIT` within `THROTTLE_TTL_SECONDS`
- WHEN each call is made
- THEN every call is processed normally and none receives HTTP 429

### Requirement: Public Verification Limits Remain Unchanged

Introducing the global guard MUST NOT change the existing
`public-verification` rate limits or behavior: `GET /public/verify/:id`
MUST remain limited to 60 requests/min, and `POST /public/verify/:id`
MUST remain limited to 20 requests/min. These limits MUST be enforced as
per-route overrides on the global guard and MUST take precedence over the
global default limit regardless of its configured value.

#### Scenario: Public GET verification still throttles at its existing limit

- GIVEN 60 `GET /public/verify/:id` requests have been made within one
  minute from the same source
- WHEN the 61st request is made within that same minute
- THEN the response is HTTP 429, unchanged from current behavior

#### Scenario: Public POST verification still throttles at its existing limit

- GIVEN 20 `POST /public/verify/:id` requests have been made within one
  minute from the same source
- WHEN the 21st request is made within that same minute
- THEN the response is HTTP 429, unchanged from current behavior

### Requirement: Throttled Request Response Contract

Any request that exceeds its applicable limit — whether the global
default or a per-route override (upload, anchor, or the existing
public-verification limits) — MUST receive HTTP 429 (Too Many Requests).

#### Scenario: Any exceeded limit yields HTTP 429

- GIVEN any guarded route (global-default, upload, anchor, or
  public-verification) has reached its applicable throttle limit
- WHEN one more request is made within the same window
- THEN the response status is HTTP 429
