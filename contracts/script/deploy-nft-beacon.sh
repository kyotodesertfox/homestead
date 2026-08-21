#!/usr/bin/env bash
# One-time migration: deploy the beacon-based NFTDeployer (V2).
# See project memory "project_nft_beacon" for the full design and why the
# old deployer (0x2A879059CfA27f707F1756DbfC6f683071099cC9) is orphaned,
# not upgraded — this is a fresh proxy deploy.
#
# Run this yourself with your own signer. Nothing here is broadcast by
# anyone but you. Set RPC_URL and one signing method below before running.
#
# Steps 3-6 (redeploy Beer/Egg/Honey collections, set roles, update
# contracts.js/.env) happen afterward through the admin panel once the
# ABI fix lands and you have the two addresses this script prints.

set -euo pipefail
cd "$(dirname "$0")/.."

RPC_URL="${RPC_URL:-https://rpc.mainnet.taiko.xyz}"
OWNER="0xe782e5f2DD980179bbc0604b353BfB59Fba0f9DC"        # who will OWN the new beacon + NFTDeployer (current consolidated platform owner — Treasury/current NFTDeployer already sit here)
DEPLOYER="0x202ECf228020b79bd1BFCE7457C15A9831BCe4D3"     # who SIGNS the deploy txs (your Trezor/deploy wallet) — does not need to match OWNER
TEMPLATE_IMPL="0x637f1f6FD0fF64dF0C920C43B4945779EA706fa2" # current nftTemplate impl (what Beer/Egg already run)

# Pick ONE signing method and uncomment it:
# SIGN_ARGS=(--private-key "${PRIVATE_KEY:?set PRIVATE_KEY or edit this script to use --ledger/--trezor/--keystore}")
# SIGN_ARGS=(--ledger --from "$DEPLOYER")
SIGN_ARGS=(--trezor --from "$DEPLOYER")
# SIGN_ARGS=(--keystore "$HOME/.foundry/keystores/homestead" --password-file "$HOME/.foundry/keystores/homestead.pass")

echo "== 1/3: compiling BeaconShell + NFTDeployer =="
forge build dex/UpgradeableBeacon.sol core/nftDeployer.sol

BEACON_BIN=$(jq -r '.bytecode.object' artifacts/foundry/UpgradeableBeacon.sol/BeaconShell.json)
NFTD_BIN=$(jq -r '.bytecode.object' artifacts/foundry/nftDeployer.sol/NFTDeployer.json)
PROXY_BIN=$(jq -r '.bytecode.object' artifacts/foundry/ERC1967Proxy.sol/ERC1967Proxy.json)

echo "== 2/3: deploy BeaconShell(logic=$TEMPLATE_IMPL, owner=$OWNER) =="
BEACON_ARGS=$(cast abi-encode "constructor(address,address)" "$TEMPLATE_IMPL" "$OWNER")
BEACON_INITCODE="${BEACON_BIN}${BEACON_ARGS#0x}"
BEACON_RECEIPT=$(cast send --rpc-url "$RPC_URL" "${SIGN_ARGS[@]}" --create "$BEACON_INITCODE" --json)
BEACON_ADDR=$(echo "$BEACON_RECEIPT" | jq -r '.contractAddress')
echo "Beacon deployed: $BEACON_ADDR"

echo "== 3/3: deploy NFTDeployer impl, then ERC1967Proxy(impl, initialize(beacon, owner)) =="
NFTD_RECEIPT=$(cast send --rpc-url "$RPC_URL" "${SIGN_ARGS[@]}" --create "$NFTD_BIN" --json)
NFTD_IMPL_ADDR=$(echo "$NFTD_RECEIPT" | jq -r '.contractAddress')
echo "NFTDeployer impl deployed: $NFTD_IMPL_ADDR"

INIT_CALLDATA=$(cast calldata "initialize(address,address)" "$BEACON_ADDR" "$OWNER")
PROXY_ARGS=$(cast abi-encode "constructor(address,bytes)" "$NFTD_IMPL_ADDR" "$INIT_CALLDATA")
PROXY_INITCODE="${PROXY_BIN}${PROXY_ARGS#0x}"
PROXY_RECEIPT=$(cast send --rpc-url "$RPC_URL" "${SIGN_ARGS[@]}" --create "$PROXY_INITCODE" --json)
PROXY_ADDR=$(echo "$PROXY_RECEIPT" | jq -r '.contractAddress')
echo "New NFTDeployer proxy: $PROXY_ADDR"

echo ""
echo "Done. Next:"
echo "  1. Set VITE_NFT_DEPLOYER=$PROXY_ADDR in .env.mainnet"
echo "  2. Redeploy Beer/Egg/Honey collections via the admin panel's Deploy Collection"
echo "     button (once the ABI fix is in) — new BeaconProxy addresses each time."
echo "  3. Run setMinter(treasury)/setRedemptionOperator(marketplace) on each new collection."
echo "  4. Update contracts.js BEERNFT/EGGNFT/HONEYNFT env vars with the new addresses."
