# Homestead Smart Contract Audit

**Scope:** `contracts/` — core, dex, marketplace, treasury, relay
**Date:** 2026-06-13
**Method:** Manual source review (no test suite or build dependencies present in-tree; findings are not compiler-verified).
**Commit/branch:** `claude/smart-contracts-audit-q54m4c`

Severity legend: **Critical** (funds loss / total DoS of a core path), **High** (economic exploit or deployment blocker), **Medium** (conditional loss / accounting drift), **Low/Info** (centralization, hygiene, hardening).

---

## Critical

### C-1 — Router calls a Treasury function that does not exist (`lpRewardFeeBps()`); every Token→ETH exit reverts
`Router.swapExactTokensForETH` and `Router.getFeeSchedule` call `ITreasury(treasury).lpRewardFeeBps()` (`dex/Router.sol:77,138`, interface `dex/Interfaces.sol:65`). Treasury renamed this variable to `lpShareBps` (`treasury/Treasury.sol:59`), and STATUS.md documents the rename (`setLpShareBps(200) -- NOTE: renamed from lpRewardFeeBps`). Treasury exposes **no** `lpRewardFeeBps` getter and has no `fallback()`, so the external call reverts.

Impact: the entire exit path is bricked — `swapExactTokensForETH`, `getFeeSchedule`, and by extension **`Marketplace.redeem` whenever a producer swap is triggered** (`marketplace/Marketplace.sol:317`) all revert. STATUS.md line 128 already flags "verify Treasury rename is reflected in Router source" — it is **not**.

Fix: change both Router call sites (and the interface) to `lpShareBps()`, or add an `lpRewardFeeBps()` alias to Treasury. Add an integration test that runs a full Token→ETH swap before deploying the new Router.

---

## High

### H-1 — Collateral can be double-spent: `stkHomestead` is a transferable/burnable ERC-20, but collateral is only checked at `openLot`
`stkHomestead` is the shared `masterTemplate` (STATUS.md:133-135) — a fully transferable, burnable ERC-20. The collateral system (`Treasury.openLot`, `availableCollateral`) enforces capacity only at lot-open time via `balanceOf(msg.sender) >= usedCollateral[msg.sender] + required` (`treasury/Treasury.sol:351`), and tracks commitment in the `usedCollateral` mapping.

Because the token can be moved after a lot is opened:
1. Wallet A stakes, opens a lot → `usedCollateral[A]` rises, balance is *not* locked.
2. A transfers `stkHomestead` to wallet B.
3. `availableCollateral(A)` underflows to 0 (guarded), but **B now has free balance and can open its own lot against the same staked ETH.**

The same staked ETH backs two (or N) lots → the floor no longer covers minted production tokens. This also contradicts the code comments ("perpetual credential — never burned / never decreases"): `claimStake` actually **burns** `stkHomestead` (`treasury/Treasury.sol:510`), and burning collateral that backs *other* open lots silently under-collateralizes them with no runtime check.

Fix: make `stkHomestead` non-transferable (soulbound) for the collateral role, or lock/escrow the committed balance inside Treasury rather than only accounting it in a mapping, and re-validate collateral on every state-changing path (not just `openLot`).

### H-2 — Spot-reserve price oracle is manipulable (no TWAP)
`Treasury._spotEthValue` / `_quoteTokensForEth` / `floorRatio` and `Relay.ethEquivalent` read instantaneous pair reserves (`treasury/Treasury.sol:187-207,288-305`; `relay/HomesteadRelay.sol:145-153`). The pair explicitly removed Uniswap's TWAP accumulators (slots reserved, `dex/DexPair.sol:31-35`) and even exposes `depositAndSync()` (`dex/DexPair.sol:78`) which lets anyone shift one-sided reserves.

Exploit surfaces:
- **`openLot`:** push the token's ETH price down right before opening → `collateralRequired` shrinks → mint a large lot for near-zero collateral, then dump at the real price.
- **`receiveAndMintLPReward`:** mints production tokens to the LP based on a spot quote (`treasury/Treasury.sol:633-636`) → manipulate spot to mint more tokens than the ETH is worth.

Fix: use a manipulation-resistant oracle (cumulative-price TWAP over a minimum window, or a Chainlink-style feed). At minimum, sanity-bound the spot value and disallow same-block open-after-swap.

### H-3 — `TokenEscrow` references an undefined interface / wrong method; will not compile or will mis-mint
`TokenEscrow.sol` only imports `../dex/Interfaces.sol` (`marketplace/TokenEscrow.sol:8`) but calls `IProductionToken(e.token).mintExact(...)` (`:152`). `IProductionToken` is **not declared** in `dex/Interfaces.sol` (it lives in `Treasury.sol`), and even that declaration has **no `mintExact`** member (it has `mintToWallet`). As written the file does not compile; there is no test suite to catch this. Note also `_release` charges fees and transfers ETH **before** minting (`:144-152`) — acceptable ordering, but the contract is `nonReentrant`-protected only on the public entrypoints, and `confirm` → `_release` does the external ETH `call` to `e.initiator` before token mint, so a reverting initiator blocks counterparty's tokens (griefable stalemate; covered by `cancel`).

Fix: declare the correct interface (`function mintExact(address,uint256) external;`) and confirm units — `mintExact` mints **base units** (no ×1e18), so `tokenAmount` must be supplied in base units; document this to avoid a 1e18 sizing error vs. the human-unit convention used elsewhere.

---

## Medium

### M-1 — `openLot` does not require `collateralRatioBps > 0`
If `setCollateralRatioBps` was never called, `collateralRatioBps == 0` and `collateralRequired = ethValue * 0 / 10000 = 0` (`treasury/Treasury.sol:349`) → unlimited zero-collateral minting. Mitigated only by deployment config (STATUS.md set it to 11000). Add `if (collateralRatioBps == 0) revert OutOfRange();` to `openLot`.

### M-2 — `withdrawSurplus` can drain ETH earmarked as `accumulatedFees`
`surplus()` = `balance − stkHomestead.totalSupply` (`treasury/Treasury.sol:652`) ignores `accumulatedFees`. `withdrawSurplus` (`:658`) sends `balance − floor` to the owner without decrementing `accumulatedFees`, so DEX/escrow fee ETH can be swept as "surplus," after which `withdrawFees` is over-stated and will revert on `InsufficientFees`. Bookkeeping desync (owner-only, so not theft, but breaks accounting invariants). Subtract `accumulatedFees` from `surplus()`.

### M-3 — Slashing permanently strands collateral and escrowed tokens
`slashStake` only sets `batch.slashed = true` (`treasury/Treasury.sol:519-525`). Afterwards `claimStake`, `returnNFTs`, and `burnLotTokens` all revert on `Slashed`, so the producer's `usedCollateral` contribution is never released and any escrowed production tokens are locked forever. If that is intentional punishment, document it; otherwise add a slash-settlement path that zeroes `usedCollateral[producer] -= collateralLocked - collateralReleased`.

### M-4 — First-depositor / donation share inflation on `DexPair.mint`
`mint` derives deposited amounts from `balanceOf − reserve` and seeds LP via `sqrt(a0*a1) − MINIMUM_LIQUIDITY` (`dex/DexPair.sol:178-191`). The classic Uniswap-V2 first-LP donation/rounding grief applies: an attacker can donate to skew share price and round subsequent small LPs to zero. `MINIMUM_LIQUIDITY` (1000) only partially mitigates. Consider a larger minimum or virtual reserves; at minimum surface the known limitation.

### M-5 — LP-reward minting inflates supply against a manipulable quote
`receiveAndMintLPReward` mints freshly created production tokens to LP claimers priced at spot (`treasury/Treasury.sol:627-637`). Combined with H-2 this lets a manipulator extract more tokens than the deposited ETH is worth; independently it dilutes the pool on every claim. Bound the mint by a TWAP quote and/or cap per-claim minting.

---

## Low / Informational

- **L-1 — `masterTemplate.burnFromSupply` (onlyOwner) can burn any holder's balance** (`core/masterTemplate.sol:119`). Self-described "emergency, to be removed" — a rug/centralization vector while present. Track for removal.
- **L-2 — Pervasive single-owner centralization.** Owner can `issueTokens` (mint arbitrary production tokens, `treasury/Treasury.sol:233`), pause everything, `withdrawSurplus`, set fees, and UUPS-upgrade every contract via `_authorizeUpgrade { onlyOwner }`. Recommend a multisig + timelock for all `onlyOwner` and upgrade authority.
- **L-3 — `nftTemplate.redeem` lets any `redemptionOperator` redeem a token without holder consent** (`marketplace/nftTemplate.sol:110-119`). Intended for the Marketplace POS, but it is unconditional trust in that operator. Acknowledge in docs.
- **L-4 — `PriceEvidence.completeTheDeal` mint-mode truncation** (`core/PriceEvidence.sol:255`): `eggsToAcquire / 1e18` truncates; safe today only because listing prices and credits are whole-unit multiples of 1e18. Add an exact-divisibility assertion or round up.
- **L-5 — Unbounded loops** in `Treasury.returnNFTs` / `_registerNFTBatch` / `mintLotNFTs` and `nftTemplate.mintBatch` (per-element mint/SSTORE). Large batches can exceed the block gas limit (griefable / stuck). Cap batch size.
- **L-6 — Reward dust locked at `0xdEaD`.** The `MINIMUM_LIQUIDITY` minted to `0xdEaD` (`dex/DexPair.sol:185`) accrues `rewardPerTokenStored` it can never claim, permanently locking a small slice of LP reward ETH in the pair.
- **L-7 — `postStake()` known to revert (STATUS.md:34).** Likely the deployed impl predates `stkHomestead` wiring or the token is paused / Treasury not a minter. Verify `stkHomestead.setMinter(Treasury,true)` and unpaused state; add a revert reason. Not a source-level bug in the current file.
- **L-8 — ETH pushed via low-level `call` to user-supplied `to`** in Router/Treasury (e.g. `Router.sol:155`). A contract recipient that reverts/gas-griefs can fail the swap; user-controlled, so DoS-of-self only. Consider pull-payment for the user leg.
- **L-9 — `deployer.js`** contains only hardcoded public addresses and a browser signer flow — no secret leakage. Fine.
- **L-10 — Per-pair trust wiring is manual.** Only the BEER/WETH pair is a Treasury `trustedCaller` (STATUS.md:27); LP-reward claims from any other pair will revert until individually added. Operational, not security.

---

## Positive observations
- UUPS `_authorizeUpgrade` is `onlyOwner` on every upgradeable contract; `_disableInitializers()` is set in all constructors; storage layouts use explicit `__gap` reserves with "do not reorder" guidance.
- `nonReentrant` is applied on the state-changing entrypoints (Marketplace buy/redeem/deposit/withdraw, Treasury stake/lot/claim, TokenEscrow lifecycle), and CEI ordering is generally respected (e.g. `claimStake` updates `_claimedAmount` before the ETH `call`).
- Production payment tokens are the in-house `masterTemplate` (no transfer hooks/callbacks), which removes ERC-777-style reentrancy from the token leg.
- `Router.receive()` asserts `msg.sender == WETH`, and the AMM invariant/fee math (`9970/10000`) is internally consistent between `DexPair.swap` and `HomesteadLibrary`.

## Top priorities before any further deployment
1. **C-1** — fix the `lpRewardFeeBps`/`lpShareBps` mismatch (blocks the Router release outright).
2. **H-3** — make `TokenEscrow` compile with the correct interface and confirm unit semantics.
3. **H-1 / H-2** — redesign collateral as non-transferable/escrowed and replace the spot oracle with a TWAP before enabling `openLot` at scale.
4. Stand up a Foundry test suite (no tests currently exist) covering the full swap, redeem, lot, and stake/claim flows.
