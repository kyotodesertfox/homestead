export const ADDRESSES = {
  WETH:           import.meta.env.VITE_WETH,
  BEER_TOKEN:     import.meta.env.VITE_BEER_TOKEN,
  BEER_NFT:       import.meta.env.VITE_BEER_NFT,
  ROUTER:         import.meta.env.VITE_ROUTER,
  MARKETPLACE:    import.meta.env.VITE_MARKETPLACE,
  TREASURY:       import.meta.env.VITE_TREASURY,
  BEER_WETH_PAIR: import.meta.env.VITE_BEER_WETH_PAIR,
};

export const CONTRACT_URI_ABI = [
  { name: 'contractURI', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
];

export const ERC20_ABI = [
  { name: 'approve',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance',    type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf',    type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'decimals',     type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'uint8' }] },
];

export const BEER_TOKEN_ABI = [
  ...ERC20_ABI,
  { name: 'isMinter',     type: 'function', stateMutability: 'view',       inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'mintToWallet', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'wallet', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'mintToPool',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'poolAddress', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
];

export const NFT_ABI = [
  { name: 'balanceOf',           type: 'function', stateMutability: 'view',        inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'tokenOfOwnerByIndex', type: 'function', stateMutability: 'view',        inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'tokenURI',            type: 'function', stateMutability: 'view',        inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] },
  { name: 'approve',             type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { name: 'isApprovedForAll',    type: 'function', stateMutability: 'view',        inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'setApprovalForAll',   type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { name: 'ownerOf',             type: 'function', stateMutability: 'view',        inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
];

export const TREASURY_ABI = [
  { name: 'nftPrices',           type: 'function', stateMutability: 'view',    inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'purchaseInventoryNFT',type: 'function', stateMutability: 'payable', inputs: [{ name: 'nftContract', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { name: 'floorBalance',        type: 'function', stateMutability: 'view',    inputs: [], outputs: [{ type: 'uint256' }] },
];

export const MARKETPLACE_ABI = [
  {
    name: 'getListing',
    type: 'function', stateMutability: 'view',
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
  {
    name: 'getInventory',
    type: 'function', stateMutability: 'view',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [{ name: 'tokenIds', type: 'uint256[]' }],
  },
  {
    name: 'nextListingId',
    type: 'function', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'buy',
    type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'redeem',
    type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'nftContract', type: 'address' }, { name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
];
