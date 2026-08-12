# Delta for web-theme

## ADDED Requirements

### Requirement: Semantic Warning Token

A `--warning`/`--warning-foreground` token pair MUST exist in `:root`/
`.dark`, following the same pattern as `--success`/`--success-foreground`.
Pending/in-progress states (e.g. the `PENDING_ANCHOR` verdict) MUST use it,
not hardcoded amber/yellow Tailwind utilities. The pair MUST meet WCAG AA
contrast in both themes, mirroring `--success`'s pattern. Exact oklch
values are a design-phase decision, informed by the presentation deck's
amber tone (`#fbbf24`-adjacent).

#### Scenario: Pending state uses the token, not hardcoded amber

- GIVEN a verdict outcome renders `PENDING_ANCHOR`'s pending severity
- WHEN colors are inspected
- THEN it resolves via `--warning`/`--warning-foreground`, not a literal or
  hardcoded amber/yellow value

#### Scenario: Warning token meets WCAG AA in both themes

- GIVEN `--warning` against its paired surface in `:root` and `.dark`
- WHEN contrast is computed
- THEN it meets >= 4.5:1 (text) or >= 3:1 (large text/UI)
