# Notes from Sonnet to Opus

These are not audit findings - the audit is in AUDIT.md. These are context notes: 
design intent, known tradeoffs, and things that look wrong but aren't, written by 
the model that built most of this alongside the developer. Read these before 
recommending changes so you understand what was deliberate.

---

## The unit convention is the most important thing to understand

Every user-facing amount parameter across all contracts is in human units (50 = 50 tokens).
The contract calls `_toBase(amount)` internally, which is the single place `1e18` appears.
This was a deliberate architectural decision to keep the UI clean and prevent double-scaling.

Legitimate exceptions that are NOT bugs:
- `msg.value` / ETH transaction value - EVM requires wei, so `parseEther` is correct here
- AMM swap and liquidity amounts (Router/DEXPair) - AMM math is base-units-native, scaling inside the DEX would break the invariant
- `stkHomestead` - minted 1:1 with ETH in wei via `mintExact`, intentionally base units

If you see `parseEther` on the UI side for a token amount, that's a bug. If you see it for ETH value or AMM input, it's correct.

---

## What is deployed vs. what is in source

The source in this repo is ahead of what's on-chain in several places. Do not assume
the source reflects the live contract state. Key gaps:

- **Router** - the new UUPS Router in `dex/Router.sol` has NOT been deployed. The live 
  Router is an immutable contract at `0x07460A6c6b036019e2ff5Ed8F7462c2Aa0f8BC07` that 
  does not collect entry fees, does not split LP rewards, and does not call `claimRewards`.
  The `lpRewardFeeBps` / `lpShareBps` mismatch (C-1 in AUDIT.md) is a pre-deployment issue,
  not a live revert. Nothing is broken in production from this - yet.

- **Treasury** - current deployed impl is `0x1cBc456ddaaB1D097caC85e6c6FfaF315EF3fB8c`
  (deployed 2026-06-07, adds surplus + withdrawSurplus). The Release 1 upgrade list
  (postStake fix, lpShareBps rename, attestationOverride, unslashStake) has NOT been deployed.

- **DEXPair beacon** - `claimRewards` does not exist on the live impl. LP rewards are
  not functional yet. This is intentional - waiting on Router deploy which depends on
  DEXPair upgrade first.

---

## The TWAP removal was intentional

The audit correctly flags H-2 (spot oracle manipulation). The TWAP was removed deliberately.
The reasoning: this is an isolated token market with no external price reference. 
Arbitrageurs cannot exist in an isolated market because there is no outside price to 
arbitrage against. A TWAP in this context would be a TWAP of the manipulated price, 
which offers no additional protection.

The real concern is `depositAndSync` - who can call it and whether it creates a 
meaningful attack vector before the market has significant liquidity. Worth investigating
the actual access restriction on that function before treating H-2 as fully open.

This tradeoff is known and accepted for the current stage. It should be revisited 
before significant TVL accumulates.

---

## H-1 (stkHomestead transferability) - we know, here's the context

This is real and needs to be fixed before scale. The developer is aware. The current 
mitigation is operational - there is effectively one producer right now (the owner),
so the double-spend attack has no practical surface. This does not make it acceptable
long-term.

The intended fix when the time comes: make stkHomestead non-transferable (soulbound),
or escrow the committed portion inside Treasury on `openLot`. The soulbound path is 
cleaner architecturally. The escrow path is more complex but allows a future transfer
market for staked positions if governance decides to permit it.

Do not recommend fixing this by adding checks to every downstream function - that
approach will miss cases. Fix it at the token level or the escrow level.

---

## postStake() revert - known, cause undiagnosed

`postStake()` reverts on the live contract. The cause is unknown - it needs a Remix
call against the live proxy to get the revert reason. Leading hypothesis: the deployed
Treasury impl predates the stkHomestead wiring, or `setMinter(Treasury, true)` was
not called on stkHomestead, or the token is paused. Do not write a fix until the
revert reason is confirmed. A fix written against the wrong hypothesis will deploy
and still revert.

---

## TokenEscrow is not a core dependency

H-3 (TokenEscrow compile error - IProductionToken undefined) is real. It also does not
block anything currently live. TokenEscrow is an OTC escrow mechanism that was designed 
but not wired into the main flow. The fix is: declare `interface IProductionToken { 
function mintExact(address to, uint256 amount) external; }` and confirm amounts are 
in base units (mintExact does not scale). This is a Release 1 item, not urgent.

---

## The slash design is intentional - partially

M-3 (slash permanently strands collateral) reflects a deliberate design choice: slash 
is a hard lock for review, not an automatic penalty. ETH never moves. The intent was 
always to add `unslashStake` in the next Treasury upgrade as the outcome of a review 
process (owner today, DAO later). The current state is incomplete by design - the 
developer decided not to ship unslashStake until the design questions were resolved:
- Should the event carry a reason string for audit trail?
- Should there be a cooldown before batch ops resume?
- Should there be a cap on slash/unslash cycles per batch?

Do not recommend removing slash or making it automatically settle. The human review
step is the point.

---

## M-2 (withdrawSurplus drains accumulatedFees) - fix this in the next Treasury upgrade

This is a real accounting bug and the fix is simple: subtract `accumulatedFees` from 
the `surplus()` calculation. It has not caused any real damage yet because withdrawSurplus
has not been called in anger. Flag it as a one-line fix for Release 1.

---

## No test suite exists - this is known and accepted for now

The developer reviews every line of code personally as a security practice. That is not
a substitute for a test suite and everyone involved knows it. The recommendation to add
Foundry tests is correct. It is also not actionable today. When recommending tests,
prioritize: (1) full swap round-trip, (2) lot open/mint/redeem/claimStake cycle, 
(3) collateral accounting under transfer scenarios (H-1 regression test).

---

## What the developer values in responses

Direct. No hedging. If something is broken say it's broken. If something is a known
tradeoff say so. The developer reads every line of code and will catch it if you are
being imprecise. He built the architecture from first principles - he understands the
why, not just the what. Treat him as a peer, not a client.
