export const ADDRESSES = {
  TOKEN_ESCROW:   import.meta.env.VITE_TOKEN_ESCROW,
  TOKEN_DEPLOYER: import.meta.env.VITE_TOKEN_DEPLOYER,
  STK_HOMESTEAD:  import.meta.env.VITE_STK_HOMESTEAD,
};

export const TOKEN_ESCROW_ABI = [
  {
    name: 'create', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'counterparty', type: 'address' },
      { name: 'token',        type: 'address' },
      { name: 'tokenAmount',  type: 'uint256' },
      { name: 'ethRequired',  type: 'uint256' },
    ],
    outputs: [{ name: 'escrowId', type: 'uint256' }],
  },
  {
    name: 'fund', type: 'function', stateMutability: 'payable',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'confirm', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'cancel', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getEscrow', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [
      { name: 'initiator',              type: 'address' },
      { name: 'counterparty',           type: 'address' },
      { name: 'token',                  type: 'address' },
      { name: 'tokenAmount',            type: 'uint256' },
      { name: 'ethRequired',            type: 'uint256' },
      { name: 'ethDeposited',           type: 'uint256' },
      { name: 'initiatorConfirmed',     type: 'bool'    },
      { name: 'counterpartyConfirmed',  type: 'bool'    },
      { name: 'released',               type: 'bool'    },
      { name: 'cancelled',              type: 'bool'    },
    ],
  },
  {
    name: 'nextEscrowId', type: 'function', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
];

export const ERC20_ABI = [
  { name: 'approve',     type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance',   type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf',   type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'decimals',    type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'symbol',      type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'string' }] },
  { name: 'name',        type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'string' }] },
];

export const TOKEN_DEPLOYER_ABI = [
  { name: 'getAllTokens',  type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'isRegistered', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'bool' }] },
];
