# smart-contracts — AnchorRegistry

Permissionless on-chain evidence registry for TrustAI. See `docs/09-Smart-Contract-Design.md`
for the full design rationale (ADR-003).

## Toolchain

Built with [Foundry](https://book.getfoundry.sh/) (Forge/Cast/Anvil).

> **Windows note (corrected — certification-flow Phase 6)**: an earlier version of this note
> claimed native Windows binaries don't exist and required WSL. That's no longer accurate:
> Foundry publishes native `win32_amd64` release archives directly on GitHub
> (`https://github.com/foundry-rs/foundry/releases`, e.g. `foundry_v1.7.1_win32_amd64.zip`),
> containing `forge.exe`/`cast.exe`/`anvil.exe`/`chisel.exe` — no WSL/Git Bash required.
> `foundryup`'s installer script itself is still Linux/macOS-only (it's a bash script), but you
> can skip it entirely:
>
> ```powershell
> # Download the latest native Windows release, extract, and add to PATH:
> $latest = (Invoke-WebRequest -Uri "https://api.github.com/repos/foundry-rs/foundry/releases/latest" -UseBasicParsing).Content | ConvertFrom-Json
> $zipUrl = ($latest.assets | Where-Object { $_.name -like "*win32_amd64.zip" }).browser_download_url
> Invoke-WebRequest -Uri $zipUrl -OutFile "$env:TEMP\foundry.zip"
> Expand-Archive -Path "$env:TEMP\foundry.zip" -DestinationPath "$env:USERPROFILE\.foundry\bin" -Force
> # Add $env:USERPROFILE\.foundry\bin to your User PATH, then open a new shell.
> forge --version
> anvil --version
> ```
>
> Verified working end-to-end this way (certification-flow Phase 6): `forge build`, `forge test`
> (all 13 existing tests pass), and `anvil` all run natively, no WSL involved.

## Setup

```bash
cp .env.example .env
# fill in BASE_SEPOLIA_RPC_URL, PRIVATE_KEY, BASESCAN_API_KEY
```

## Commands

### Build

```bash
forge build
```

### Test (unit + fuzz + invariant)

```bash
forge test -vv
```

### Coverage

```bash
forge coverage --report summary
```

### Gas snapshot

Regenerate `.gas-snapshot` after any change that affects gas cost, and commit the diff:

```bash
forge snapshot
```

### Local dev / integration testing (anvil)

`apps/api`'s chain integration test (`apps/api/test/anchor-chain.e2e-spec.ts`, certification-flow
Phase 6) deploys a fresh `AnchorRegistry` instance to a **local anvil node** and drives it through
the real `viem` adapter — this is how `AnchorPort`/`ViemAnchorAdapter` get tested against a real
EVM chain without needing a funded testnet wallet or RPC secrets. Start anvil in a separate
terminal before running that suite:

```bash
anvil
# defaults to http://127.0.0.1:8545, chain id 31337, 10 pre-funded test accounts
```

The test is service-gated (skips gracefully, doesn't fail, if anvil isn't running or this
package hasn't been `forge build`-ed yet — see `apps/api/test/utils/anvil-availability.ts`).
This is intentionally **not** run against Base Sepolia — no testnet funds/secrets are available
in most dev/CI environments, and anvil gives byte-for-byte the same EVM semantics for this
contract's purposes.

## Deploy (Base Sepolia)

**Prerequisites** (none of this has been executed against the real network yet — this section
documents the exact procedure for whoever runs it with real credentials):

1. A wallet with Base Sepolia testnet ETH. Fund one via a faucet, e.g.
   <https://www.alchemy.com/faucets/base-sepolia> or Coinbase's Base Sepolia faucet — a few cents
   worth of testnet ETH is more than enough (this contract's `anchor()` call costs ~29k gas per
   `.gas-snapshot`).
2. A Base Sepolia RPC URL. The public default (`https://sepolia.base.org`, already in
   `.env.example`) works for low-volume use; for anything more than occasional manual testing,
   use a dedicated RPC provider (Alchemy/Infura/QuickNode) to avoid public-endpoint rate limits.
3. A Basescan API key (free tier) from <https://basescan.org/myapikey>, only needed if you pass
   `--verify` to publish the source.

```bash
cp .env.example .env
# Fill in:
#   BASE_SEPOLIA_RPC_URL=<your RPC URL, or the sepolia.base.org default>
#   PRIVATE_KEY=<funded wallet's private key, 0x-prefixed>
#   BASESCAN_API_KEY=<from basescan.org/myapikey>

forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

`--verify` publishes the source to Basescan using `BASESCAN_API_KEY` (set in `.env`). Omit
`--verify` for a dry run without source verification.

**After a successful deploy**, `Deploy.s.sol`'s `console.log` prints the deployed address
(`AnchorRegistry deployed at: 0x...`). Copy it into `apps/api/.env`'s `ANCHOR_CONTRACT_ADDRESS`
(see that file's `.env.example` entry) — that's the only wiring needed on the API side; no
Prisma migration, no code change (design.md: "No Prisma migration was needed").

`apps/api` also needs `CHAIN_RPC_URL` (same value as `BASE_SEPOLIA_RPC_URL` above),
`CHAIN_ID=84532` (Base Sepolia's chain id), and `WORKER_WALLET_PRIVATE_KEY` — this can be the
same funded wallet used for `PRIVATE_KEY` above, or a separate one; `anchor()` is permissionless
(any address can call it), so there's no on-chain requirement linking the deployer to the
anchoring wallet. All three are unset by default (`apps/api/.env.example`), which makes
`ANCHOR_PORT` fall back to `ChainNotConfiguredAnchorAdapter` — the app boots normally and every
other feature works, but an actual anchor submission attempt fails with a clear error until all
three are configured.

## Independently verify an anchor

Anyone can confirm a hash was anchored, without trusting TrustAI's infrastructure, using a
public RPC and the deployed contract address:

```bash
cast call <contract_address> "anchoredAt(bytes32)(uint256)" <hash> --rpc-url https://sepolia.base.org
```

A non-zero result is the block timestamp at which `<hash>` was anchored. `0` means it was
never anchored.

## Contract

`src/AnchorRegistry.sol` — permissionless, immutable, no owner, no proxy. A `bytes32` may be
either the hash of an individual DTR or the Merkle root of a batch of DTRs (ADR-003).
