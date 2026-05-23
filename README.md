# Homestead

A physical goods marketplace backed by on-chain collateral. Built on Taiko L2.

## What It Is

Homestead lets producers stake real ETH, mint NFTs representing real goods, and sell them to buyers who pay with $BEER tokens. When the buyer receives the physical product, they redeem the NFT on-chain — burning the $BEER, unlocking the producer's ETH stake, and recording the transaction permanently.

No middleman. No platform taking a cut. No admin controlling who can participate.

## The Loop

```
Producer stakes ETH → opens batch → mints NFTs → lists on Marketplace
Buyer acquires $BEER via DEX → purchases NFT → receives physical goods
Buyer redeems NFT on-chain → $BEER burns → producer's ETH unlocks
```

## Philosophy

- **Stake is reputation.** Cumulative ETH staked builds on-chain identity and platform capability — no manually granted credentials
- **Physical redemption is the proof.** The QR code at point of delivery IS the co-presence proof. Both parties have skin in the outcome
- **The Treasury is the floor.** Every unclaimed stake strengthens it. There is no value sink
- **Permission is not required.** Any producer goes through the same flow. The protocol doesn't know what you're selling

## Stack

- Contracts: Solidity, UUPS upgradeable proxies, Taiko L2
- Frontend: React, wagmi, Taiko L2
- Infrastructure: Raspberry Pi, IPFS/Pinata

## Status

Live on Taiko mainnet. Contracts deployed. Frontend live at `homesteaders.netlify.app`. First real listing pending.

## This Is Not

- A speculative token
- A passive income scheme
- A platform with a CEO
- Finished
