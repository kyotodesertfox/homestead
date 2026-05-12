export const ADDRESSES = {
  WETH:           import.meta.env.VITE_WETH,
  BEER_TOKEN:     import.meta.env.VITE_BEER_TOKEN,
  BEER_NFT:       import.meta.env.VITE_BEER_NFT,
  ROUTER:         import.meta.env.VITE_ROUTER,
  FACTORY:        import.meta.env.VITE_FACTORY,
  MARKETPLACE:    import.meta.env.VITE_MARKETPLACE,
  TREASURY:       import.meta.env.VITE_TREASURY,
  BEER_WETH_PAIR: import.meta.env.VITE_BEER_WETH_PAIR,
};

export const ERC20_ABI = [
  { name: 'approve',     type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance',   type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner',   type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf',   type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'decimals',    type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'uint8' }] },
];

export const ROUTER_ABI = [
  {
    name: 'swapExactETHForTokens',
    type: 'function', stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path',         type: 'address[]' },
      { name: 'to',           type: 'address' },
      { name: 'deadline',     type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForETH',
    type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn',     type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path',         type: 'address[]' },
      { name: 'to',           type: 'address' },
      { name: 'deadline',     type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'getAmountsOut',
    type: 'function', stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path',     type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
];

export const PAIR_ABI = [
  {
    name: 'getReserves',
    type: 'function', stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '_reserve0',           type: 'uint112' },
      { name: '_reserve1',           type: 'uint112' },
      { name: '_blockTimestampLast', type: 'uint32'  },
    ],
  },
  {
    name: 'swapFeeBps',
    type: 'function', stateMutability: 'pure',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
];

export const TREASURY_ABI = [
  { name: 'dexExitFeeBps', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

export const BEER_TOKEN_ABI = [
  ...ERC20_ABI,
  { name: 'isMinter',     type: 'function', stateMutability: 'view',        inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'mintToWallet', type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'wallet', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'mintToPool',   type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'poolAddress', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
];

export const CONTRACT_URI_ABI = [
  { name: 'contractURI', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
];

export const DEADLINE = () => BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
export const SLIPPAGE_BPS = 50n;
export const applySlippage = (amount) => (amount * (10000n - SLIPPAGE_BPS)) / 10000n;
