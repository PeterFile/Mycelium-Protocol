/**
 * @fileoverview Contract ABI definitions for Mycelium Protocol
 */

/**
 * TaskEscrowERC20 contract ABI
 * Generated from the deployed contract
 */
export const TaskEscrowERC20ABI = [
  // Constructor
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  
  // Events
  {
    "type": "event",
    "name": "TaskCreated",
    "inputs": [
      { "name": "taskId", "type": "uint256", "indexed": true },
      { "name": "client", "type": "address", "indexed": true },
      { "name": "agent", "type": "address", "indexed": true },
      { "name": "token", "type": "address", "indexed": false },
      { "name": "requestedAmount", "type": "uint256", "indexed": false },
      { "name": "actualAmount", "type": "uint256", "indexed": false },
      { "name": "metadataHash", "type": "string", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PaymentApproved",
    "inputs": [
      { "name": "taskId", "type": "uint256", "indexed": true }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PaymentClaimed",
    "inputs": [
      { "name": "taskId", "type": "uint256", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskCancelled",
    "inputs": [
      { "name": "taskId", "type": "uint256", "indexed": true }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      { "name": "previousOwner", "type": "address", "indexed": true },
      { "name": "newOwner", "type": "address", "indexed": true }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [
      { "name": "account", "type": "address", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [
      { "name": "account", "type": "address", "indexed": false }
    ],
    "anonymous": false
  },

  // Read Functions
  {
    "type": "function",
    "name": "tasks",
    "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [
      { "name": "id", "type": "uint256" },
      { "name": "client", "type": "address" },
      { "name": "agent", "type": "address" },
      { "name": "token", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "status", "type": "uint8" },
      { "name": "metadataHash", "type": "string" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTaskInfo",
    "inputs": [{ "name": "_taskId", "type": "uint256" }],
    "outputs": [
      {
        "name": "task",
        "type": "tuple",
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "client", "type": "address" },
          { "name": "agent", "type": "address" },
          { "name": "token", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "status", "type": "uint8" },
          { "name": "metadataHash", "type": "string" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTaskMetadata",
    "inputs": [{ "name": "_taskId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTaskCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "taskExists",
    "inputs": [{ "name": "_taskId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },

  // Write Functions
  {
    "type": "function",
    "name": "createTask",
    "inputs": [
      { "name": "_agent", "type": "address" },
      { "name": "_tokenContract", "type": "address" },
      { "name": "_amount", "type": "uint256" },
      { "name": "_metadataHash", "type": "string" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approvePayment",
    "inputs": [{ "name": "_taskId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimPayment",
    "inputs": [{ "name": "_taskId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelTaskAndRefund",
    "inputs": [{ "name": "_taskId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },

  // Owner Functions
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "emergencyRecoverToken",
    "inputs": [
      { "name": "_token", "type": "address" },
      { "name": "_amount", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
];

/**
 * Standard ERC20 ABI (minimal interface needed for token operations)
 */
export const ERC20ABI = [
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  }
];