# HomesteadXC — Claude Code Handoff Notes

## Current Architectural Decisions

### NFT Deployer Restructure (PRIORITY — do this first)
- Restructuring NFT deployer into a **beacon proxy pattern**, mirroring the DEX pair architecture
- Two-track deployment path:
  - **Standard flow** → beacon proxy (upgrades propagate to all standard collections simultaneously)
  - **Custom collections** → direct deployment via token deployer (preserves flexibility for novel logic)
- Token deployer acts as unified factory entry point for both tracks

### Existing Deployed Collections
- Two collections currently deployed
- No trades or transactions against either
- Claude Code previously flagged these may be orphaned by the restructure
- **Decision: clean break — orphan them, do not attempt migration**
- No legacy state worth preserving; cleaner to start fresh with beacon architecture

### Deployment Sequencing
1. Beacon restructure → upgrade NFT deployer
2. Run setter batch across all contracts against final architecture
3. Then any remaining functionality deployments

### Why Setters Haven't Run Yet
- Constant active development has kept contracts in flux
- Philosophy/architecture conversations keep surfacing refinements that ripple back into contract logic
- UUPS proxies provide upgrade path, but want stable architecture before initializing state
- Partial deployment with unset parameters = attack surface; holding until sequence is complete

### General State
- Multiple contract updates pushed but not yet deployed
- Unease around mainnet deployment cost (irreversibility, not dollar amount)
- ETH is both infrastructure and ideological position — burns matter beyond gas fees
- Goal: deploy beacon restructure first, then settle setter sequence in one coherent pass

## Questions to Investigate in This Session
- Confirm existing collection deployment structure (proxies or not?)
- Verify no hidden references from existing collections back to current deployer
- Design beacon implementation — how minimal/generic should it be to accommodate future custom variation via parameters rather than separate logic?
