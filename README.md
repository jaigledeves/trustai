# TrustAI

Intelligent certification of digital assets: AI understands the
content, blockchain certifies its integrity. Every asset gets a
verifiable **Digital Trust Record (DTR)**.

> Status: Phase 2 (development). Product definition lives in
> [`docs/`](docs/TDD-Index.md).

## Monorepo layout

```
packages/dtr-core/   # Canonicalization, hashing and verification core (framework-free)
apps/                # web (Next.js) and api (NestJS) — upcoming
smart-contracts/     # AnchorRegistry (Solidity + Foundry) — upcoming
docs/                # Product & architecture documentation (TDD index inside)
```

## Getting started

```bash
pnpm install
pnpm test
```

## Documentation

Start at [`docs/TDD-Index.md`](docs/TDD-Index.md). Key decisions are
recorded as ADRs in [`docs/adr/`](docs/adr/).
