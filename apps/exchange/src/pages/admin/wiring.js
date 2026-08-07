// ─────────────────────────────────────────────────────────────────────────────
// WIRING REGISTRY
//
// Single source of truth for the admin Map tab. Every pointer and every role
// grant that holds the system together is one row in EDGES. The graph, the
// fault list and the fix buttons are all derived from this file - adding a
// contract later is a row here, not a change in three places.
//
// Severity:
//   critical - a user-facing operation reverts
//   degraded - an operation silently no-ops or a subsystem stops working
//   optional - only matters once a not-yet-live feature is switched on
//
// fix: null means there is no admin entry point. The reason goes in noFix so
// the UI can say why instead of showing a dead button.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ADDRESSES,
  TREASURY_ABI,
  MARKETPLACE_ABI,
  ROUTER_ABI,
  FACTORY_ABI,
  PAIR_ABI,
  RELAY_ABI,
  TOKEN_DEPLOYER_ABI,
  NFT_DEPLOYER_ABI,
  BEER_TOKEN_ABI,
} from '../../contracts';

export const ZERO = '0x0000000000000000000000000000000000000000';

// ── Nodes ────────────────────────────────────────────────────────────────────
// Fixed core-infra set. Positions are hand placed: Treasury centre, the two
// deployers it validates against above it, the DEX to the left, the relay and
// credential tokens to the right. Per-token and per-collection role grants stay
// in the Tokens and Collections tabs.

export const NODES = [
  { key: 'TREASURY',       label: 'Treasury',       group: 'core',   pos: { x: 420, y: 250 }, hashKey: 'TREASURY'       },
  { key: 'MARKETPLACE',    label: 'Marketplace',    group: 'core',   pos: { x: 420, y: 430 }, hashKey: 'MARKETPLACE'    },
  { key: 'TOKEN_DEPLOYER', label: 'Token Deployer', group: 'deploy', pos: { x: 300, y:  60 }, hashKey: 'TOKEN_DEPLOYER' },
  { key: 'NFT_DEPLOYER',   label: 'NFT Deployer',   group: 'deploy', pos: { x: 560, y:  60 }, hashKey: 'NFT_DEPLOYER'   },
  { key: 'ROUTER',         label: 'Router',         group: 'dex',    pos: { x: 140, y: 340 }, hashKey: 'ROUTER'         },
  { key: 'FACTORY',        label: 'DEX Factory',    group: 'dex',    pos: { x: 140, y: 190 }, hashKey: 'DEX_FACTORY'    },
  { key: 'RELAY',          label: 'Relay',          group: 'relay',  pos: { x: 700, y: 430 }, hashKey: 'RELAY'          },
  { key: 'STK_HOMESTEAD',  label: 'stkHomestead',   group: 'token',  pos: { x: 700, y: 250 }                            },
  { key: 'QUANTUM',        label: '$QUANTUM',       group: 'token',  pos: { x: 900, y: 340 }                            },
  { key: 'WETH',           label: 'WETH',           group: 'token',  pos: { x:  20, y:  60 }                            },
  { key: 'BEER_WETH_PAIR', label: 'BEER / WETH',    group: 'pair',   pos: { x:  60, y: 500 }                            },
  { key: 'EGG_WETH_PAIR',  label: 'EGG / WETH',     group: 'pair',   pos: { x: 240, y: 560 }                            },
  { key: 'TOKEN_ESCROW',   label: 'Token Escrow',   group: 'core',   pos: { x: 900, y: 130 }                            },
];

export const NODE_BY_KEY = Object.fromEntries(NODES.map(n => [n.key, n]));

// Contracts whose owner() is compared against Treasury.owner(). A divergence
// does not break anything today - it breaks the next time a setter is called.
export const OWNED_NODES = [
  { key: 'TREASURY',       abi: TREASURY_ABI       },
  { key: 'MARKETPLACE',    abi: MARKETPLACE_ABI    },
  { key: 'ROUTER',         abi: ROUTER_ABI         },
  { key: 'FACTORY',        abi: FACTORY_ABI        },
  { key: 'TOKEN_DEPLOYER', abi: TOKEN_DEPLOYER_ABI },
  { key: 'NFT_DEPLOYER',   abi: NFT_DEPLOYER_ABI   },
  { key: 'RELAY',          abi: RELAY_ABI          },
  { key: 'STK_HOMESTEAD',  abi: BEER_TOKEN_ABI     },
  { key: 'QUANTUM',        abi: BEER_TOKEN_ABI     },
];

// ── Edges ────────────────────────────────────────────────────────────────────
// read.args and fix.args accept either a literal value or { node: 'KEY' },
// which resolves through ADDRESSES at call time.

export const EDGES = [

  // ── Treasury pointers ──────────────────────────────────────────────────────
  {
    id: 'treasury.tokenDeployer', from: 'TREASURY', to: 'TOKEN_DEPLOYER', kind: 'pointer',
    label: 'tokenDeployer', expect: 'TOKEN_DEPLOYER', severity: 'critical',
    read: { on: 'TREASURY', abi: TREASURY_ABI, fn: 'tokenDeployer' },
    breaks: 'openLot reverts UnregisteredToken. Producers cannot mint against their stake, and LP reward minting reverts.',
    fix:   { on: 'TREASURY', abi: TREASURY_ABI, fn: 'setTokenDeployer', args: [{ node: 'TOKEN_DEPLOYER' }] },
  },
  {
    id: 'treasury.nftDeployer', from: 'TREASURY', to: 'NFT_DEPLOYER', kind: 'pointer',
    label: 'nftDeployer', expect: 'NFT_DEPLOYER', severity: 'critical',
    read: { on: 'TREASURY', abi: TREASURY_ABI, fn: 'nftDeployer' },
    breaks: 'mintLotNFTs reverts UnregisteredNFT. No lot can ever produce claim tickets.',
    fix:   { on: 'TREASURY', abi: TREASURY_ABI, fn: 'setNFTDeployer', args: [{ node: 'NFT_DEPLOYER' }] },
  },
  {
    id: 'treasury.dexFactory', from: 'TREASURY', to: 'FACTORY', kind: 'pointer',
    label: 'dexFactory', expect: 'FACTORY', severity: 'critical',
    read: { on: 'TREASURY', abi: TREASURY_ABI, fn: 'dexFactory' },
    breaks: 'Lot ETH valuation and floorRatio both call getPair on this address. openLot cannot price a lot.',
    fix:   { on: 'TREASURY', abi: TREASURY_ABI, fn: 'setDexFactory', args: [{ node: 'FACTORY' }] },
  },
  {
    id: 'treasury.weth', from: 'TREASURY', to: 'WETH', kind: 'pointer',
    label: 'weth', expect: 'WETH', severity: 'critical',
    read: { on: 'TREASURY', abi: TREASURY_ABI, fn: 'weth' },
    breaks: 'openLot reverts WethNotSet. The pair lookup that prices a lot has no quote asset.',
    fix:   { on: 'TREASURY', abi: TREASURY_ABI, fn: 'setWeth', args: [{ node: 'WETH' }] },
  },
  {
    id: 'treasury.stkHomestead', from: 'TREASURY', to: 'STK_HOMESTEAD', kind: 'pointer',
    label: 'stkHomestead', expect: 'STK_HOMESTEAD', severity: 'critical',
    read: { on: 'TREASURY', abi: TREASURY_ABI, fn: 'stkHomestead' },
    breaks: 'postStake reverts StkNotSet. The single entry point to the platform is closed.',
    fix:   { on: 'TREASURY', abi: TREASURY_ABI, fn: 'setStkHomestead', args: [{ node: 'STK_HOMESTEAD' }] },
  },
  {
    id: 'treasury.trustedRelay', from: 'TREASURY', to: 'RELAY', kind: 'pointer',
    label: 'trustedRelay', expect: 'RELAY', severity: 'degraded',
    read: { on: 'TREASURY', abi: TREASURY_ABI, fn: 'trustedRelay' },
    breaks: 'Relay.sendMessage asserts treasury.trustedRelay() == itself. All messaging is dead until this matches.',
    fix:   { on: 'TREASURY', abi: TREASURY_ABI, fn: 'setTrustedRelay', args: [{ node: 'RELAY' }] },
  },

  // ── Treasury roles ─────────────────────────────────────────────────────────
  {
    id: 'treasury.trusted.marketplace', from: 'TREASURY', to: 'MARKETPLACE', kind: 'role',
    label: 'isTrustedCaller[Marketplace]', expect: true, severity: 'critical',
    read: { on: 'TREASURY', abi: TREASURY_ABI, fn: 'isTrustedCaller', args: [{ node: 'MARKETPLACE' }] },
    breaks: 'onRedeem and markListed revert NotTrusted. Listings cannot be created and no redemption can settle.',
    fix:   { on: 'TREASURY', abi: TREASURY_ABI, fn: 'setTrustedCaller', args: [{ node: 'MARKETPLACE' }, true] },
  },
  {
    id: 'treasury.trusted.beerpair', from: 'TREASURY', to: 'BEER_WETH_PAIR', kind: 'role',
    label: 'isTrustedCaller[BEER/WETH]', expect: true, severity: 'degraded',
    read: { on: 'TREASURY', abi: TREASURY_ABI, fn: 'isTrustedCaller', args: [{ node: 'BEER_WETH_PAIR' }] },
    breaks: 'receiveAndMintLPReward reverts NotTrusted. LP holders in this pool cannot claim rewards.',
    fix:   { on: 'TREASURY', abi: TREASURY_ABI, fn: 'setTrustedCaller', args: [{ node: 'BEER_WETH_PAIR' }, true] },
  },
  {
    id: 'treasury.trusted.eggpair', from: 'TREASURY', to: 'EGG_WETH_PAIR', kind: 'role',
    label: 'isTrustedCaller[EGG/WETH]', expect: true, severity: 'degraded',
    read: { on: 'TREASURY', abi: TREASURY_ABI, fn: 'isTrustedCaller', args: [{ node: 'EGG_WETH_PAIR' }] },
    breaks: 'receiveAndMintLPReward reverts NotTrusted. LP holders in this pool cannot claim rewards.',
    fix:   { on: 'TREASURY', abi: TREASURY_ABI, fn: 'setTrustedCaller', args: [{ node: 'EGG_WETH_PAIR' }, true] },
  },

  // ── Marketplace pointers ───────────────────────────────────────────────────
  {
    id: 'marketplace.feeCollector', from: 'MARKETPLACE', to: 'TREASURY', kind: 'pointer',
    label: 'feeCollector', expect: 'TREASURY', severity: 'critical',
    read: { on: 'MARKETPLACE', abi: MARKETPLACE_ABI, fn: 'feeCollector' },
    breaks: 'Every Treasury call from the Marketplace goes here. onRedeem reverts and no redemption can complete.',
    fix:   { on: 'MARKETPLACE', abi: MARKETPLACE_ABI, fn: 'setFeeCollector', args: [{ node: 'TREASURY' }] },
  },
  {
    id: 'marketplace.router', from: 'MARKETPLACE', to: 'ROUTER', kind: 'pointer',
    label: 'router', expect: 'ROUTER', severity: 'critical',
    read: { on: 'MARKETPLACE', abi: MARKETPLACE_ABI, fn: 'router' },
    breaks: 'Producer tokens released by the Treasury on redemption have no swap path. They strand in the Marketplace and the producer never receives ETH.',
    fix:   { on: 'MARKETPLACE', abi: MARKETPLACE_ABI, fn: 'setRouter', args: [{ node: 'ROUTER' }] },
  },
  {
    id: 'marketplace.relay', from: 'MARKETPLACE', to: 'RELAY', kind: 'pointer',
    label: 'relay', expect: 'RELAY', severity: 'degraded',
    read: { on: 'MARKETPLACE', abi: MARKETPLACE_ABI, fn: 'relay' },
    breaks: 'Redemption attestation is skipped silently - the call is wrapped in try/catch. Provenance gaps leave no trace. createListing with subsidyCount > 0 also reverts RELAY_NOT_SET.',
    fix:   { on: 'MARKETPLACE', abi: MARKETPLACE_ABI, fn: 'setRelay', args: [{ node: 'RELAY' }] },
  },
  {
    id: 'marketplace.farmToken', from: 'MARKETPLACE', to: 'QUANTUM', kind: 'pointer',
    label: 'farmToken', expect: 'QUANTUM', severity: 'optional',
    read: { on: 'MARKETPLACE', abi: MARKETPLACE_ABI, fn: 'farmToken' },
    breaks: 'createListing with subsidyCount > 0 reverts FARM_NOT_SET. Listings with no subsidy are unaffected.',
    fix:   { on: 'MARKETPLACE', abi: MARKETPLACE_ABI, fn: 'setFarmToken', args: [{ node: 'QUANTUM' }] },
  },
  {
    id: 'marketplace.tokenDeployer', from: 'MARKETPLACE', to: 'TOKEN_DEPLOYER', kind: 'pointer',
    label: 'tokenDeployer', expect: 'TOKEN_DEPLOYER', severity: 'critical',
    read: { on: 'MARKETPLACE', abi: MARKETPLACE_ABI, fn: 'tokenDeployer' },
    breaks: 'createListing reverts on the payment token registry check. No listing can be created.',
    fix: null,
    noFix: 'Set in initialize only. The Marketplace has no setter for this - correcting it needs a contract upgrade.',
  },
  {
    id: 'marketplace.nftDeployer', from: 'MARKETPLACE', to: 'NFT_DEPLOYER', kind: 'pointer',
    label: 'nftDeployer', expect: 'NFT_DEPLOYER', severity: 'critical',
    read: { on: 'MARKETPLACE', abi: MARKETPLACE_ABI, fn: 'nftDeployer' },
    breaks: 'createListing and redeem both revert on the collection registry check.',
    fix: null,
    noFix: 'Set in initialize only. The Marketplace has no setter for this - correcting it needs a contract upgrade.',
  },

  // ── Router pointers ────────────────────────────────────────────────────────
  {
    id: 'router.treasury', from: 'ROUTER', to: 'TREASURY', kind: 'pointer',
    label: 'treasury', expect: 'TREASURY', severity: 'critical',
    read: { on: 'ROUTER', abi: ROUTER_ABI, fn: 'treasury' },
    breaks: 'The Router reads all fee policy from the Treasury at call time and forwards fees there. Swaps fail or fees are lost.',
    fix:   { on: 'ROUTER', abi: ROUTER_ABI, fn: 'setTreasury', args: [{ node: 'TREASURY' }] },
  },
  {
    id: 'router.factory', from: 'ROUTER', to: 'FACTORY', kind: 'pointer',
    label: 'factory', expect: 'FACTORY', severity: 'critical',
    read: { on: 'ROUTER', abi: ROUTER_ABI, fn: 'factory' },
    breaks: 'Every swap and liquidity operation resolves its pair through this factory. All of them fail.',
    fix: null,
    noFix: 'Set in initialize only. Correcting it means deploying a new Router proxy and updating VITE_ROUTER.',
  },
  {
    id: 'router.weth', from: 'ROUTER', to: 'WETH', kind: 'pointer',
    label: 'WETH', expect: 'WETH', severity: 'critical',
    read: { on: 'ROUTER', abi: ROUTER_ABI, fn: 'WETH' },
    breaks: 'ETH wrapping on every swap leg uses this address.',
    fix: null,
    noFix: 'Set in initialize only. Correcting it means deploying a new Router proxy and updating VITE_ROUTER.',
  },

  // ── DEX Factory ────────────────────────────────────────────────────────────
  {
    id: 'factory.tokenDeployer', from: 'FACTORY', to: 'TOKEN_DEPLOYER', kind: 'pointer',
    label: 'tokenDeployer', expect: 'TOKEN_DEPLOYER', severity: 'critical',
    read: { on: 'FACTORY', abi: FACTORY_ABI, fn: 'tokenDeployer' },
    breaks: 'createPair reverts UNREGISTERED_TOKEN. No new pool can be created for any token.',
    fix:   { on: 'FACTORY', abi: FACTORY_ABI, fn: 'setTokenDeployer', args: [{ node: 'TOKEN_DEPLOYER' }] },
  },
  {
    id: 'factory.pairTreasury', from: 'FACTORY', to: 'TREASURY', kind: 'pointer',
    label: 'pairTreasury', expect: 'TREASURY', severity: 'degraded',
    read: { on: 'FACTORY', abi: FACTORY_ABI, fn: 'pairTreasury' },
    breaks: 'This is forwarded to each new pair at creation. While it is unset, every pool created from now on is born with no LP reward route and cannot be repaired afterwards.',
    fix:   { on: 'FACTORY', abi: FACTORY_ABI, fn: 'setPairTreasury', args: [{ node: 'TREASURY' }] },
  },
  {
    id: 'factory.beacon', from: 'FACTORY', to: null, kind: 'pointer',
    label: 'beacon', expect: 'SET', severity: 'critical',
    read: { on: 'FACTORY', abi: FACTORY_ABI, fn: 'beacon' },
    breaks: 'createPair deploys a BeaconProxy against this address. No new pool can be deployed.',
    fix: null,
    noFix: 'The Factory has no setBeacon. Pair logic is swapped with upgradePairs instead.',
  },

  // ── Deployers ──────────────────────────────────────────────────────────────
  {
    id: 'tokenDeployer.template', from: 'TOKEN_DEPLOYER', to: null, kind: 'pointer',
    label: 'templateAddress', expect: 'SET', severity: 'degraded',
    read: { on: 'TOKEN_DEPLOYER', abi: TOKEN_DEPLOYER_ABI, fn: 'templateAddress' },
    breaks: 'deployNewToken has no implementation to clone. Existing tokens are unaffected.',
    fix: null,
    noFix: 'updateTemplate takes a new implementation address - set it from the Tokens tab once you have deployed one.',
  },
  {
    id: 'nftDeployer.beacon', from: 'NFT_DEPLOYER', to: null, kind: 'pointer',
    label: 'beacon', expect: 'SET', severity: 'degraded',
    read: { on: 'NFT_DEPLOYER', abi: NFT_DEPLOYER_ABI, fn: 'beacon' },
    breaks: 'deployCollection has no beacon to point new proxies at. Existing collections are unaffected.',
    fix: null,
    noFix: 'setBeacon takes a deployed UpgradeableBeacon address - deploy one first, then set it.',
  },

  // ── Relay ──────────────────────────────────────────────────────────────────
  {
    id: 'relay.treasury', from: 'RELAY', to: 'TREASURY', kind: 'pointer',
    label: 'treasury', expect: 'TREASURY', severity: 'critical',
    read: { on: 'RELAY', abi: RELAY_ABI, fn: 'treasury' },
    breaks: 'Attestation tier lookups and ETH fee forwarding both target this address.',
    fix:   { on: 'RELAY', abi: RELAY_ABI, fn: 'setTreasury', args: [{ node: 'TREASURY' }] },
  },
  {
    id: 'relay.marketplace', from: 'RELAY', to: 'MARKETPLACE', kind: 'pointer',
    label: 'marketplace', expect: 'MARKETPLACE', severity: 'degraded',
    read: { on: 'RELAY', abi: RELAY_ABI, fn: 'marketplace' },
    breaks: 'Subsidised delivery messages fall back to charging the sender instead of the listing balance.',
    fix:   { on: 'RELAY', abi: RELAY_ABI, fn: 'setMarketplace', args: [{ node: 'MARKETPLACE' }] },
  },
  {
    id: 'relay.registered.marketplace', from: 'RELAY', to: 'MARKETPLACE', kind: 'role',
    label: 'registeredContract[Marketplace]', expect: true, severity: 'degraded',
    read: { on: 'RELAY', abi: RELAY_ABI, fn: 'registeredContract', args: [{ node: 'MARKETPLACE' }] },
    breaks: 'recordRedemption reverts "caller not registered". The Marketplace swallows it in a try/catch, so every redemption settles economically but leaves no attestation. Permanent, silent provenance gap.',
    fix:   { on: 'RELAY', abi: RELAY_ABI, fn: 'registerContract', args: [{ node: 'MARKETPLACE' }] },
  },
  {
    id: 'relay.feeToken', from: 'RELAY', to: 'QUANTUM', kind: 'pointer',
    label: 'feeToken', expect: 'QUANTUM', severity: 'optional',
    read: { on: 'RELAY', abi: RELAY_ABI, fn: 'feeToken' },
    breaks: 'The token fee path burns this token. Only the ETH fee path works while it is unset.',
    fix:   { on: 'RELAY', abi: RELAY_ABI, fn: 'setFeeToken', args: [{ node: 'QUANTUM' }] },
  },
  {
    id: 'relay.dexPair', from: 'RELAY', to: null, kind: 'pointer',
    label: 'dexPair', expect: 'SET', severity: 'optional',
    read: { on: 'RELAY', abi: RELAY_ABI, fn: 'dexPair' },
    breaks: 'ethEquivalent reverts DEX_PAIR_NOT_SET. Only matters once quantumFee is above zero.',
    fix: null,
    noFix: 'Set the fee token pair from the Relay tab - it depends on which token is acting as the fee token.',
  },

  // ── Pair wiring ────────────────────────────────────────────────────────────
  {
    id: 'beerpair.rewardsTreasury', from: 'BEER_WETH_PAIR', to: 'TREASURY', kind: 'pointer',
    label: 'rewardsTreasury', expect: 'TREASURY', severity: 'degraded',
    read: { on: 'BEER_WETH_PAIR', abi: PAIR_ABI, fn: 'rewardsTreasury' },
    breaks: 'Accrued LP reward ETH has nowhere to route. Claims fail for this pool.',
    fix: null,
    noFix: 'setRewardsTreasury is gated to the Factory, and the Factory only calls it inside createPair. An existing pair cannot be repaired without a Factory upgrade.',
  },
  {
    id: 'eggpair.rewardsTreasury', from: 'EGG_WETH_PAIR', to: 'TREASURY', kind: 'pointer',
    label: 'rewardsTreasury', expect: 'TREASURY', severity: 'degraded',
    read: { on: 'EGG_WETH_PAIR', abi: PAIR_ABI, fn: 'rewardsTreasury' },
    breaks: 'Accrued LP reward ETH has nowhere to route. Claims fail for this pool.',
    fix: null,
    noFix: 'setRewardsTreasury is gated to the Factory, and the Factory only calls it inside createPair. An existing pair cannot be repaired without a Factory upgrade.',
  },
  {
    id: 'beerpair.factory', from: 'BEER_WETH_PAIR', to: 'FACTORY', kind: 'pointer',
    label: 'factory', expect: 'FACTORY', severity: 'critical',
    read: { on: 'BEER_WETH_PAIR', abi: PAIR_ABI, fn: 'factory' },
    breaks: 'The pair was created by a different factory than the one this UI reads from. Addresses are out of sync.',
    fix: null,
    noFix: 'Immutable after initialize. A mismatch means VITE_FACTORY points at the wrong deployment.',
  },
  {
    id: 'eggpair.factory', from: 'EGG_WETH_PAIR', to: 'FACTORY', kind: 'pointer',
    label: 'factory', expect: 'FACTORY', severity: 'critical',
    read: { on: 'EGG_WETH_PAIR', abi: PAIR_ABI, fn: 'factory' },
    breaks: 'The pair was created by a different factory than the one this UI reads from. Addresses are out of sync.',
    fix: null,
    noFix: 'Immutable after initialize. A mismatch means VITE_FACTORY points at the wrong deployment.',
  },

  // ── Credential token roles ─────────────────────────────────────────────────
  {
    id: 'stk.minter.treasury', from: 'STK_HOMESTEAD', to: 'TREASURY', kind: 'role',
    label: 'isMinter[Treasury]', expect: true, severity: 'critical',
    read: { on: 'STK_HOMESTEAD', abi: BEER_TOKEN_ABI, fn: 'isMinter', args: [{ node: 'TREASURY' }] },
    breaks: 'postStake cannot mintExact and claimStake cannot burnFromMinter. Staking and stake release both revert.',
    fix:   { on: 'STK_HOMESTEAD', abi: BEER_TOKEN_ABI, fn: 'setMinter', args: [{ node: 'TREASURY' }, true] },
  },
];

// ── Resolution helpers ───────────────────────────────────────────────────────

export const addrOf = key => ADDRESSES[key];

export const isSet = a => !!a && a.toLowerCase() !== ZERO;

export const sameAddr = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

// { node: 'KEY' } resolves through ADDRESSES; anything else passes through.
export const resolveArgs = (args = []) =>
  args.map(a => (a && typeof a === 'object' && a.node ? ADDRESSES[a.node] : a));

// An edge is only checkable when every address it touches is configured.
export function edgeReady(edge) {
  if (!isSet(addrOf(edge.read.on))) return false;
  if (typeof edge.expect === 'string' && edge.expect !== 'SET' && !isSet(addrOf(edge.expect))) return false;
  return resolveArgs(edge.read.args).every(a => typeof a !== 'string' || isSet(a));
}

// 'ok' | 'fault' | 'absent' | 'skipped'
//
// 'absent' means the call reverted: the getter does not exist on the
// implementation currently behind the proxy. The repo source is ahead of what
// is deployed, and the fix is an upgrade, not a setter. Treating that as a
// fault would tell you to call a function that is not there.
export function edgeStatus(edge, value, failed = false) {
  if (!edgeReady(edge)) return 'skipped';
  if (failed) return 'absent';
  if (value === undefined || value === null) return 'skipped';
  if (edge.expect === true)  return value === true ? 'ok' : 'fault';
  if (edge.expect === 'SET') return isSet(value) ? 'ok' : 'fault';
  return sameAddr(value, addrOf(edge.expect)) ? 'ok' : 'fault';
}

// What the edge should read, rendered for the UI.
export function expectedLabel(edge) {
  if (edge.expect === true)  return 'true';
  if (edge.expect === 'SET') return 'any non-zero address';
  return addrOf(edge.expect);
}

export const SEVERITY_RANK = { critical: 0, degraded: 1, optional: 2 };
