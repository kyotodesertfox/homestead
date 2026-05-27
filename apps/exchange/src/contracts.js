export const ADDRESSES = {
  WETH:           import.meta.env.VITE_WETH,
  BEER_TOKEN:     import.meta.env.VITE_BEER_TOKEN,
  BEER_NFT:       import.meta.env.VITE_BEER_NFT,
  ROUTER:         import.meta.env.VITE_ROUTER,
  FACTORY:        import.meta.env.VITE_FACTORY,
  MARKETPLACE:    import.meta.env.VITE_MARKETPLACE,
  TREASURY:       import.meta.env.VITE_TREASURY,
  BEER_WETH_PAIR: import.meta.env.VITE_BEER_WETH_PAIR,
  TOKEN_DEPLOYER:   import.meta.env.VITE_TOKEN_DEPLOYER,
  NFT_DEPLOYER:     import.meta.env.VITE_NFT_DEPLOYER,
  STK_HOMESTEAD:    import.meta.env.VITE_STK_HOMESTEAD,
};

export const ERC20_ABI = [
  { name: 'approve',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance',    type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner',   type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf',    type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'decimals',     type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'totalSupply',  type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'name',         type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol',       type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'string' }] },
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
  {
    name: 'getFeeSchedule',
    type: 'function', stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 's', type: 'tuple',
        components: [
          { name: 'ammFeeBps',   type: 'uint256' },
          { name: 'entryFeeBps', type: 'uint256' },
          { name: 'exitFeeBps',  type: 'uint256' },
          { name: 'lpRewardBps', type: 'uint256' },
          { name: 'treasuryBps', type: 'uint256' },
        ],
      },
    ],
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
  { name: 'token0',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'token1',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf',   type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

export const FACTORY_ABI = [
  { name: 'allPairsLength', type: 'function', stateMutability: 'view', inputs: [],                                  outputs: [{ type: 'uint256' }] },
  { name: 'allPairs',       type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }],     outputs: [{ type: 'address' }] },
  { name: 'getPair',        type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ type: 'address' }] },
];

export const TREASURY_ABI = [
  // ── view ──
  { name: 'owner',               type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'paused',              type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool'    }] },
  { name: 'dexEntryFeeBps',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'dexExitFeeBps',       type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'marketplaceFeeBps',   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'lpRewardFeeBps',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'collateralRatioBps',  type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'stkHomestead',        type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'trustedRelay',        type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'weth',                type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'isTrustedCaller',     type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'bool' }] },
  // ── admin setters ──
  { name: 'setDexEntryFee',       type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_feeBps',  type: 'uint256' }], outputs: [] },
  { name: 'setDexExitFee',        type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_feeBps',  type: 'uint256' }], outputs: [] },
  { name: 'setMarketplaceFee',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_feeBps',  type: 'uint256' }], outputs: [] },
  { name: 'setLpRewardFeeBps',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'bps',      type: 'uint256' }], outputs: [] },
  { name: 'setCollateralRatioBps',type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'bps',      type: 'uint256' }], outputs: [] },
  { name: 'setTierThreshold',     type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tier',     type: 'uint8'   }, { name: 'ethAmount', type: 'uint256' }], outputs: [] },
  { name: 'setStkHomestead',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'stk',      type: 'address' }], outputs: [] },
  { name: 'setTrustedRelay',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'relay',    type: 'address' }], outputs: [] },
  { name: 'setTrustedCaller',     type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'caller',   type: 'address' }, { name: 'trusted', type: 'bool' }], outputs: [] },
  { name: 'setWeth',              type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_weth',    type: 'address' }], outputs: [] },
  { name: 'withdrawFees',         type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to',       type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'slashStake',           type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'batchId',  type: 'uint256' }], outputs: [] },
  { name: 'pause',                type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'unpause',              type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'cumulativeStake',     type: 'function', stateMutability: 'view', inputs: [{ name: 'wallet',   type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'attestationTier',     type: 'function', stateMutability: 'view', inputs: [{ name: 'wallet',   type: 'address' }], outputs: [{ type: 'uint8'   }] },
  { name: 'tierThreshold',       type: 'function', stateMutability: 'view', inputs: [{ name: 'tier',     type: 'uint8'   }], outputs: [{ type: 'uint256' }] },
  { name: 'nextBatchId',         type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'availableCollateral', type: 'function', stateMutability: 'view', inputs: [{ name: 'producer', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'usedCollateral',      type: 'function', stateMutability: 'view', inputs: [{ name: 'producer', type: 'address' }], outputs: [{ type: 'uint256' }] },
  {
    name: 'batches', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'batchId', type: 'uint256' }],
    outputs: [
      { name: 'producer',           type: 'address' },
      { name: 'nftContract',        type: 'address' },
      { name: 'token',              type: 'address' },
      { name: 'stakedAmount',       type: 'uint256' },
      { name: 'collateralLocked',   type: 'uint256' },
      { name: 'tokenAmount',        type: 'uint256' },
      { name: 'collateralReleased', type: 'uint256' },
      { name: 'tokenPerNFT',        type: 'uint256' },
      { name: 'totalNFTs',          type: 'uint256' },
      { name: 'redeemedCount',      type: 'uint256' },
      { name: 'returnedCount',      type: 'uint256' },
      { name: 'startTokenId',       type: 'uint256' },
      { name: 'listed',             type: 'bool'    },
      { name: 'slashed',            type: 'bool'    },
    ],
  },
  { name: 'accumulatedFees', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'floorBalance',   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'claimableStake', type: 'function', stateMutability: 'view',        inputs: [{ name: 'batchId', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'claimStake',     type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'batchId', type: 'uint256' }], outputs: [] },
  { name: 'postStake',      type: 'function', stateMutability: 'payable',     inputs: [], outputs: [] },
  {
    name: 'openLot', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'token',  type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'batchId', type: 'uint256' }],
  },
  {
    name: 'mintLotNFTs', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'batchId',     type: 'uint256'  },
      { name: 'nftContract', type: 'address'  },
      { name: 'cids',        type: 'string[]' },
      { name: 'tokenPerNFT', type: 'uint256'  },
    ],
    outputs: [],
  },
  {
    name: 'returnNFTs', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'batchId',  type: 'uint256'   },
      { name: 'tokenIds', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    name: 'burnLotTokens', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'batchId', type: 'uint256' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'StakeDeposited', type: 'event',
    inputs: [
      { name: 'producer',  type: 'address', indexed: true  },
      { name: 'ethAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'LotOpened', type: 'event',
    inputs: [
      { name: 'batchId',          type: 'uint256', indexed: true  },
      { name: 'producer',         type: 'address', indexed: true  },
      { name: 'token',            type: 'address', indexed: true  },
      { name: 'amount',           type: 'uint256', indexed: false },
      { name: 'collateralLocked', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'LotNFTsMinted', type: 'event',
    inputs: [
      { name: 'batchId',     type: 'uint256', indexed: true  },
      { name: 'nftContract', type: 'address', indexed: true  },
      { name: 'count',       type: 'uint256', indexed: false },
      { name: 'tokenPerNFT', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'StakeClaimed', type: 'event',
    inputs: [
      { name: 'batchId',       type: 'uint256', indexed: true  },
      { name: 'producer',      type: 'address', indexed: true  },
      { name: 'amount',        type: 'uint256', indexed: false },
      { name: 'redeemedCount', type: 'uint256', indexed: false },
    ],
  },
];

export const BEER_TOKEN_ABI = [
  ...ERC20_ABI,
  { name: 'owner',        type: 'function', stateMutability: 'view',        inputs: [],                                                                           outputs: [{ type: 'address' }] },
  { name: 'isMinter',     type: 'function', stateMutability: 'view',        inputs: [{ name: '', type: 'address' }],                                              outputs: [{ type: 'bool'    }] },
  { name: 'mintToWallet', type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'wallet',      type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'mintToPool',   type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'poolAddress', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'mintExact',    type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'to',          type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'setMinter',    type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'minter',      type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
];

export const MARKETPLACE_ABI = [
  { name: 'owner',         type: 'function', stateMutability: 'view',        inputs: [], outputs: [{ type: 'address' }] },
  { name: 'nextListingId', type: 'function', stateMutability: 'view',        inputs: [], outputs: [{ type: 'uint256' }] },
  {
    name: 'createListing', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'nftContract',  type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'price',        type: 'uint256' },
      { name: 'batchId',      type: 'uint256' },
      { name: 'subsidyCount', type: 'uint256' },
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
  {
    name: 'getTokenListing', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: 'listingId', type: 'uint256' }, { name: 'batchId', type: 'uint256' }],
  },
  { name: 'redeem', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'nftContract', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
];

export const NFT_ABI = [
  { name: 'name',             type: 'function', stateMutability: 'view',        inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol',           type: 'function', stateMutability: 'view',        inputs: [], outputs: [{ type: 'string' }] },
  { name: 'tokenURI',         type: 'function', stateMutability: 'view',        inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] },
  { name: 'totalSupply',      type: 'function', stateMutability: 'view',        inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'tokenByIndex',     type: 'function', stateMutability: 'view',        inputs: [{ name: 'index', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'ownerOf',          type: 'function', stateMutability: 'view',        inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { name: 'nextTokenId',      type: 'function', stateMutability: 'view',        inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'mint',             type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'to', type: 'address' }, { name: 'cid', type: 'string' }], outputs: [{ name: 'tokenId', type: 'uint256' }] },
  { name: 'mintBatch',        type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'to', type: 'address' }, { name: 'cids', type: 'string[]' }], outputs: [{ name: 'startTokenId', type: 'uint256' }] },
  { name: 'isApprovedForAll', type: 'function', stateMutability: 'view',        inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { name: 'balanceOf',           type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'tokenOfOwnerByIndex', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'redeemed',               type: 'function', stateMutability: 'view',        inputs: [{ name: 'tokenId',  type: 'uint256'  }], outputs: [{ type: 'bool'    }] },
  { name: 'owner',                  type: 'function', stateMutability: 'view',        inputs: [],                                     outputs: [{ type: 'address' }] },
  { name: 'contractURI',            type: 'function', stateMutability: 'view',        inputs: [],                                     outputs: [{ type: 'string'  }] },
  { name: 'isMinter',               type: 'function', stateMutability: 'view',        inputs: [{ name: '',         type: 'address'  }], outputs: [{ type: 'bool'    }] },
  { name: 'redemptionOperator',      type: 'function', stateMutability: 'view',        inputs: [{ name: '',         type: 'address'  }], outputs: [{ type: 'bool'    }] },
  { name: 'setTokenCID',            type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'tokenId',  type: 'uint256'  }, { name: 'newCID',   type: 'string'  }], outputs: [] },
  { name: 'setContractCID',         type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'newCID',   type: 'string'   }],                                        outputs: [] },
  { name: 'setMinter',              type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'minter',   type: 'address'  }, { name: 'approved', type: 'bool'    }], outputs: [] },
  { name: 'setRedemptionOperator',  type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'operator', type: 'address'  }, { name: 'approved', type: 'bool'    }], outputs: [] },
];

export const TOKEN_DEPLOYER_ABI = [
  { name: 'getAllTokens',  type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'isRegistered', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'totalTokens',  type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

export const NFT_DEPLOYER_ABI = [
  { name: 'getAllContracts', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'isRegistered',   type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'totalContracts', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

export const CONTRACT_URI_ABI = [
  { name: 'contractURI', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
];

export const DEADLINE = () => BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
export const SLIPPAGE_BPS = 50n;
export const applySlippage = (amount) => (amount * (10000n - SLIPPAGE_BPS)) / 10000n;
