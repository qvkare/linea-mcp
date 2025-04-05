// Standard ERC20 ABI subset needed for approval
export const erc20Abi = [
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "_owner", "type": "address" },
      { "name": "_spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// SyncSwap MasterChef ABI (Based on typical MasterChef v2)
export const syncSwapMasterChefAbi = [
  // Get Pool Info (including lpToken address)
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "poolInfo",
    "outputs": [
      { "internalType": "contract IERC20", "name": "lpToken", "type": "address" },
      { "internalType": "uint256", "name": "allocPoint", "type": "uint256" },
      { "internalType": "uint256", "name": "lastRewardBlock", "type": "uint256" },
      { "internalType": "uint256", "name": "accRewardPerShare", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Get User Info (staked amount)
  {
    "inputs": [
      { "internalType": "uint256", "name": "_pid", "type": "uint256" },
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "userInfo",
    "outputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "rewardDebt", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Get Pending Rewards
  {
    "inputs": [
      { "internalType": "uint256", "name": "_pid", "type": "uint256" },
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "pendingReward",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // Stake LP tokens
  {
    "inputs": [
      { "internalType": "uint256", "name": "_pid", "type": "uint256" },
      { "internalType": "uint256", "name": "_amount", "type": "uint256" }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Unstake LP tokens
  {
    "inputs": [
      { "internalType": "uint256", "name": "_pid", "type": "uint256" },
      { "internalType": "uint256", "name": "_amount", "type": "uint256" }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Get number of pools
  {
    "inputs": [],
    "name": "poolLength",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const; 