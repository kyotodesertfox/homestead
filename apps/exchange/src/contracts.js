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
  { name: 'approve',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance',    type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner',   type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf',    type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'decimals',     type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'totalSupply',  type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'uint256' }] },
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
    name: 'addLiquidityETH',
    type: 'function', stateMutability: 'payable',
    inputs: [
      { name: 'token',               type: 'address' },
      { name: 'amountTokenDesired',  type: 'uint256' },
      { name: 'amountTokenMin',      type: 'uint256' },
      { name: 'amountETHMin',        type: 'uint256' },
      { name: 'to',                  type: 'address' },
      { name: 'deadline',            type: 'uint256' },
    ],
    outputs: [
      { name: 'amountToken', type: 'uint256' },
      { name: 'amountETH',   type: 'uint256' },
      { name: 'liquidity',   type: 'uint256' },
    ],
  },
  {
    name: 'removeLiquidityETH',
    type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'token',          type: 'address' },
      { name: 'liquidity',      type: 'uint256' },
      { name: 'amountTokenMin', type: 'uint256' },
      { name: 'amountETHMin',   type: 'uint256' },
      { name: 'to',             type: 'address' },
      { name: 'deadline',       type: 'uint256' },
    ],
    outputs: [
      { name: 'amountToken', type: 'uint256' },
      { name: 'amountETH',   type: 'uint256' },
    ],
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
  {
    name: 'getAmountsIn',
    type: 'function', stateMutability: 'view',
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'path',      type: 'address[]' },
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
      { name: '_reserve0', type: 'uint112' },
      { name: '_reserve1', type: 'uint112' },
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

export const MARKETPLACE_ABI = [
  { name: 'owner',         type: 'function', stateMutability: 'view',        inputs: [], outputs: [{ type: 'address' }] },
  { name: 'nextListingId', type: 'function', stateMutability: 'view',        inputs: [], outputs: [{ type: 'uint256' }] },
  {
    name: 'createListing', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'nftContract',   type: 'address' },
      { name: 'paymentToken',  type: 'address' },
      { name: 'price',         type: 'uint256' },
      { name: 'proceeds',      type: 'address' },
    ],
    outputs: [{ name: 'listingId', type: 'uint256' }],
  },
  {
    name: 'getListing', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [
      { name: 'nftContract',    type: 'address' },
      { name: 'paymentToken',   type: 'address' },
      { name: 'price',          type: 'uint256' },
      { name: 'proceeds',       type: 'address' },
      { name: 'inventoryCount', type: 'uint256' },
      { name: 'active',         type: 'bool'    },
    ],
  },
  { name: 'buy',              type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [] },
  { name: 'setActive',        type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'listingId', type: 'uint256' }, { name: 'active', type: 'bool' }], outputs: [] },
  { name: 'updatePrice',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'listingId', type: 'uint256' }, { name: 'newPrice', type: 'uint256' }], outputs: [] },
  { name: 'getInventory',     type: 'function', stateMutability: 'view',        inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'depositInventory',  type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'listingId', type: 'uint256' }, { name: 'tokenIds',  type: 'uint256[]' }], outputs: [] },
  { name: 'withdrawInventory', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'listingId', type: 'uint256' }, { name: 'count',     type: 'uint256'   }], outputs: [] },
];

export const NFT_ABI = [
  { name: 'tokenURI',         type: 'function', stateMutability: 'view',        inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] },
  { name: 'totalSupply',      type: 'function', stateMutability: 'view',        inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'tokenByIndex',     type: 'function', stateMutability: 'view',        inputs: [{ name: 'index', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'ownerOf',          type: 'function', stateMutability: 'view',        inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { name: 'nextTokenId',      type: 'function', stateMutability: 'view',        inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'mint',             type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'to', type: 'address' }, { name: 'cid', type: 'string' }], outputs: [{ name: 'tokenId', type: 'uint256' }] },
  { name: 'mintBatch',        type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'to', type: 'address' }, { name: 'cids', type: 'string[]' }], outputs: [{ name: 'startTokenId', type: 'uint256' }] },
  { name: 'isApprovedForAll', type: 'function', stateMutability: 'view',        inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
];

export const CONTRACT_URI_ABI = [
  { name: 'contractURI', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
];

export const DEADLINE = () => BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
export const SLIPPAGE_BPS = 50n;
export const applySlippage = (amount) => (amount * (10000n - SLIPPAGE_BPS)) / 10000n;
