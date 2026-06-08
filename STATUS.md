# Homestead Contract Status

Read this at the start of every session before touching any contract or frontend.
Legend: DEPLOYED = on-chain matches source | PENDING = source changed, needs redeploy | NOT-DEPLOYED = never deployed

---

## Treasury
- Proxy:   0x631f9D082019E25a2BfD219BF235cA0b742206EC
- Impl:    0x1cBc456ddaaB1D097caC85e6c6FfaF315EF3fB8c (deployed 2026-06-07)
- Source:  contracts/treasury/Treasury.sol
- VERSION: 1 in source, 1 deployed — **DEPLOYED** (surplus + withdrawSurplus live)

### What the deployed impl has
Everything in source including:
- `IStkToken.totalSupply()` added to interface
- `surplus() public view` — calculates ETH balance minus stkHomestead totalSupply
- `withdrawSurplus() external onlyOwner` — pulls surplus to owner wallet

### Post-deploy config (one-time, survives upgrades via proxy storage)
- [x] setStkHomestead(0x247178A36db9817d3FDb37eb7D7F54C7144e5432)
- [x] setCollateralRatioBps(11000)
- [x] setWeth(0xA51894664A773981C6C112C43ce576f315d5b1B6)
- [x] setTrustedCaller(Marketplace proxy, true)
- [x] setTrustedCaller(BEER/WETH pair, true)
- [x] setLpShareBps(200)  -- NOTE: renamed from lpRewardFeeBps
- [ ] setTierThreshold(1, amount) -- NOT SET, blocks group messaging tier gating
- [ ] setTierThreshold(2, amount) -- NOT SET
- [ ] setTierThreshold(3, amount) -- NOT SET

### Known issues / pending code changes
- [ ] postStake() revert — cause unknown, needs Remix call to get revert reason before fixing
- [ ] attestationOverride mapping not yet added (for trusted providers with no stake)

---

## HomesteadRelay
- Proxy:   0x96FC77220d578aF5D4380Dc2D2248Ed31444C491
- Impl:    0xE8069A9882194e1d33Db696fe1128a8c57281e28 (deployed 2026-06-07)
- Source:  contracts/relay/HomesteadRelay.sol
- VERSION: 2 in source, 1 deployed — **PENDING UPGRADE**

### What the deployed impl has (VERSION 1)
- registerKey(bytes32, bytes) with 1184-byte Kyber enforcement
- kyberKey mapping
- ethFee storage variable
- ethEquivalent() with ethFee override
- sendMessage / sendDeliveryMessage / sendGroupMessage
- All existing setters EXCEPT setEthFee

### What is in source but NOT yet deployed (VERSION 2)
- PausableUpgradeable inherited
- pause() / unpause() functions
- whenNotPaused on sendMessage, sendDeliveryMessage, sendGroupMessage
- setEthFee(uint256) — CRITICAL, without this the admin ETH fee setter will always revert

### Post-deploy config
- [ ] setEthFee(amount) -- can only be called after VERSION 2 is deployed
- [ ] setMarketplace(0x2321bDF62364ee38Fcf6b631C9742f6BF61B66Aa) -- unknown if set
- [ ] setQuantumFreeRecipient(supportWallet, true) -- unknown if set
- [x] Treasury is set (set during original deploy)
- [x] registerKey called by user (keys registered 2026-06-07)

---

## Marketplace
- Proxy:   0x2321bDF62364ee38Fcf6b631C9742f6BF61B66Aa
- Impl:    0xcA688a087F3D46554154E5EF7d8572c6Db258Aac (deployed 2026-06-06)
- Source:  contracts/marketplace/Marketplace.sol
- VERSION: 1 in source, 1 deployed — **DEPLOYED** (no source changes since last deploy)

### Post-deploy config
- [x] setFeeCollector(Treasury proxy)
- [x] setRedemptionOperator on BEER NFT
- [ ] setRelay(0x96FC77220d578aF5D4380Dc2D2248Ed31444C491) -- unknown if set
- [ ] setRouter(Router proxy) -- blocked until Router deployed

---

## masterTemplate (ERC20 token impl)
- BEER proxy:  0x5a320af586CBDD2Cc732BD76bF2Ce74fD51f2d00
- Impl:        0x9D6C344d3fF927Df604660d48C9F28c5d7f98C77 (deployed 2026-05-19)
- Source:      contracts/core/masterTemplate.sol
- VERSION: 1 in source, 1 deployed — **DEPLOYED** (no source changes)

---

## nftTemplate (ERC721 NFT impl)
- BEER NFT proxy:  0x210970F39B3AD4081090100Ed871fE42C54C2101
- EGG NFT proxy:   0xB90bC6186bA7d480584E06F92ecb15DAf653DE5C
- Impl (shared):   0x637f1f6FD0fF64dF0C920C43B4945779EA706fa2 (deployed 2026-05-19)
- Source:          contracts/marketplace/nftTemplate.sol
- VERSION: 1 in source, 1 deployed — **DEPLOYED** (no source changes)

### Post-deploy config (per collection)
- [x] BEER NFT: setMinter(Treasury, true)
- [x] BEER NFT: setRedemptionOperator(Marketplace, true)
- [x] EGG NFT: setMinter(Treasury, true) -- per memory
- [x] EGG NFT: setRedemptionOperator(Marketplace, true) -- per memory

---

## DEXFactory
- Proxy:   0xC72096f120cBb6a8f9e942864b885e1bb5060Cf2
- Impl:    0xC95C39d2E18a9c560C4365E6bEbffb89CB8d0832
- Source:  contracts/dex/Factory.sol
- VERSION: 1 in source, 1 deployed — **DEPLOYED** (no source changes)

---

## DEXPair
- Beacon impl: 0x86e1092329e108267EB57A9a10fB62CDFF3edaeC
- Source:      contracts/dex/DexPair.sol
- VERSION: 1 in source, 1 deployed — **PENDING** (claimRewards not yet added, required before Router upgrade)

---

## Router
- Current (immutable, pre-upgrade): 0x07460A6c6b036019e2ff5Ed8F7462c2Aa0f8BC07
- New UUPS version: NOT DEPLOYED
- Source: contracts/dex/Router.sol
- VERSION: 1 in source — **NOT DEPLOYED**

### Blocked by
- DEXPair must be upgraded first (Router calls pair.claimRewards in removeLiquidityETH)
- Router source calls lpShareBps() — verify Treasury rename is reflected in Router source

---

## stkHomestead
- Proxy: 0x247178A36db9817d3FDb37eb7D7F54C7144e5432
- Impl:  masterTemplate (shared beacon)
- No source changes pending
- [x] setMinter(Treasury proxy, true)

---

## Deployment order for next release
1. Treasury upgrade (surplus + withdrawSurplus) — no dependencies
2. HomesteadRelay upgrade (setEthFee + pause) — no dependencies, urgent (admin setter broken without it)
3. DEXPair upgrade (add claimRewards) — required before Router
4. Router deploy (UUPS) — after DEXPair upgrade
5. After Router deploy: setRouter on Marketplace, update VITE_ROUTER in .env

---

## Frontend (apps/exchange)
- VITE_RELAY and VITE_QUANTUM added to .env and .env.mainnet
- ABI: surplus, withdrawSurplus, ethEquivalent, setEthFee, pause/unpause all present
- Admin page: surplus read + withdrawSurplus button wired to Treasury tab
- Admin page: ethFee read + setEthFee wired to Relay tab
- Chat: X25519 + ML-KEM-768 hybrid encryption implemented and working
- Chat: ETH fee path toggle implemented (only shows when ethFee > 0 on chain)
- All of the above committed but NOT pushed yet
