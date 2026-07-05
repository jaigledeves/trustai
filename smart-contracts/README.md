# smart-contracts — AnchorRegistry

Permissionless on-chain evidence registry for TrustAI. See `docs/09-Smart-Contract-Design.md`
for the full design rationale (ADR-003).

## Toolchain

Built with [Foundry](https://book.getfoundry.sh/) (Forge/Cast/Anvil).

> **Windows note**: `foundryup` targets Linux/macOS. On Windows, install and run Foundry
> through WSL (Git Bash's `bash.exe` on this machine is backed by WSL2):
>
> ```powershell
> (Invoke-WebRequest -Uri https://foundry.paradigm.xyz -UseBasicParsing).Content | bash
> # then, in a new shell (or after sourcing ~/.bashrc):
> foundryup
> ```
>
> Run all `forge`/`cast` commands from a `bash` shell (or `wsl`), from this directory's
> WSL-mounted path (`/mnt/c/...`). Native Windows binaries are not produced by `foundryup`.

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

## Deploy (Base Sepolia)

```bash
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

`--verify` publishes the source to Basescan using `BASESCAN_API_KEY` (set in `.env`).

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
