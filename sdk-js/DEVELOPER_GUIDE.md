# Mycelium Protocol SDK - Developer Guide

## 🚀 Quick Start

### Installation
```bash
npm install @mycelium-protocol/sdk-js ethers
```

### TypeScript Support
This SDK is written in JavaScript but includes TypeScript type definitions for better development experience:

```typescript
import { MyceliumSDK, TaskCreationParams, TaskInfo } from '@mycelium-protocol/sdk-js';

const sdk = MyceliumSDK.withPrivateKey(process.env.PRIVATE_KEY!);

const params: TaskCreationParams = {
  agentAddress: '0x...',
  tokenAddress: '0x...',
  amount: '100',
  metadata: { description: 'AI task' },
  options: { autoApprove: true }
};

const result = await sdk.createTask(params);
const task: TaskInfo = await sdk.getTask(result.taskId);
```

### Backend Usage (Node.js)
```javascript
import { MyceliumSDK } from '@mycelium-protocol/sdk-js';

// Initialize with private key (server-side)
const sdk = MyceliumSDK.withPrivateKey(process.env.PRIVATE_KEY, {
  chainId: 80002 // Polygon Amoy testnet
});

// Create a task with auto-approval
const task = await sdk.createTask({
  agentAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  tokenAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // USDC on Amoy
  amount: '100',
  metadata: { description: 'AI data analysis task' },
  options: { autoApprove: true }
});

console.log('Task created:', task.taskId);
```

### Frontend Usage (Browser)
```javascript
import { MyceliumSDK } from '@mycelium-protocol/sdk-js';

// Initialize with MetaMask or other browser wallet
const sdk = MyceliumSDK.withBrowserProvider(window.ethereum);

// Request account access
await window.ethereum.request({ method: 'eth_requestAccounts' });

// Create a task (user will see MetaMask popups for approval + task creation)
const task = await sdk.createTask({
  agentAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  tokenAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  amount: '50',
  metadata: { description: 'Website integration task' },
  options: { autoApprove: true } // Will trigger 2 MetaMask popups if needed
});
```

### Read-Only Usage
```javascript
// For querying data without transactions
const sdk = MyceliumSDK.withRPC('https://rpc-amoy.polygon.technology');

// Query existing tasks
const taskInfo = await sdk.getTask('123');
const taskCount = await sdk.getTaskCount();
```

## 🎯 Key Features

### 1. Auto-Approval (Seamless UX)
Automatically handle token approvals for the best user experience:

```javascript
const result = await sdk.createTask({
  // ... task parameters
  options: {
    autoApprove: true,    // 🔥 Automatically approve tokens if needed
    estimateGas: true     // Optimize gas usage
  }
});

// Check if approval was needed
if (result.approvalTransaction) {
  console.log('Auto-approved:', result.approvalTransaction.transactionHash);
}
```

### 2. Smart Gas Estimation
Reduce transaction failures and optimize costs:

```javascript
// Automatic gas estimation (recommended)
await sdk.createTask({
  // ... parameters
  options: {
    estimateGas: true  // Estimates gas + 20% buffer
  }
});

// Manual gas control (advanced)
await sdk.approvePayment(taskId, {
  estimateGas: false,
  gasLimit: 150000,
  gasPrice: '30000000000' // 30 gwei
});
```

### 3. Comprehensive Error Handling
Get actionable error messages with proper type checking:

```javascript
import { 
  InsufficientFundsError, 
  ContractError, 
  ValidationError 
} from '@mycelium-protocol/sdk-js';

try {
  await sdk.createTask(params);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.log(`Need ${error.details.required}, have ${error.details.available}`);
  } else if (error instanceof ContractError && error.message.includes('allowance')) {
    console.log('Use autoApprove: true or call approveToken() first');
  } else if (error instanceof ValidationError) {
    console.log('Invalid parameters:', error.details);
  }
}
```

## 📚 API Reference

> **Note:** This SDK is written in JavaScript. The type annotations below (like `string`, `boolean`, `number`) are for documentation purposes to help you understand the expected parameter types and return values. They follow TypeScript syntax for clarity but are not enforced at runtime.

### Core Methods

#### `createTask(params)`
Creates a new escrow task with optional auto-approval.

**Parameters:**
```javascript
{
  agentAddress: string,        // Agent's wallet address
  tokenAddress: string,        // ERC20 token contract address  
  amount: string | number,     // Token amount to lock (in token units)
  metadata: string | object,   // Task description/metadata
  options?: {                  // Optional transaction options
    autoApprove?: boolean,     // Auto-approve tokens if needed (default: false)
    estimateGas?: boolean,     // Estimate gas automatically (default: true)
    gasLimit?: number,         // Manual gas limit
    gasPrice?: string,         // Manual gas price in wei
    maxFeePerGas?: string,     // EIP-1559 max fee per gas
    maxPriorityFeePerGas?: string // EIP-1559 priority fee
  }
}
```

**Returns:**
```javascript
{
  taskId: string,              // Created task ID
  transactionHash: string,     // Transaction hash
  blockNumber: number,         // Block number
  gasUsed: string,            // Gas used
  effectiveGasPrice: string,   // Effective gas price
  metadata: object,           // Parsed metadata
  gasEstimated: boolean,      // Whether gas was estimated
  approvalTransaction?: {     // Present if auto-approval was used
    transactionHash: string,
    approvedAmount: string,
    gasUsed: string
  }
}
```

#### `checkAndApproveToken(tokenAddress, amount, options)`
Check token allowance and optionally approve if insufficient.

**Parameters:**
```javascript
tokenAddress: string,        // Token contract address
amount: string | number,     // Required amount
options?: {                  // Optional configuration
  autoApprove?: boolean,     // Auto-approve if insufficient (default: false)
  estimateGas?: boolean,     // Estimate gas for approval (default: true)
  gasLimit?: number,         // Manual gas limit
  gasPrice?: string          // Manual gas price
}
```

**Returns:**
```javascript
{
  tokenAddress: string,           // Token contract address
  requiredAmount: string,         // Required amount (raw)
  currentAllowance: string,       // Current allowance (raw)
  isAllowanceSufficient: boolean, // Whether allowance is sufficient
  needsApproval: boolean,         // Whether approval is needed
  approvalTransaction?: {         // Present if auto-approval was executed
    transactionHash: string,
    approvedAmount: string,
    gasUsed: string
  }
}
```

#### `approveToken(tokenAddress, amount, options)`
Approve tokens for the escrow contract with gas optimization.

**Parameters:**
```javascript
tokenAddress: string,        // Token contract address
amount: string | number,     // Amount to approve
options?: {
  estimateGas?: boolean,     // Estimate gas automatically (default: true)
  gasLimit?: number,         // Manual gas limit
  gasPrice?: string          // Manual gas price
}
```

**Returns:**
```javascript
{
  transactionHash: string,     // Transaction hash
  blockNumber: number,         // Block number
  gasUsed: string,            // Gas used
  effectiveGasPrice: string,   // Effective gas price
  approvedAmount: string,      // Approved amount (formatted)
  gasEstimated: boolean       // Whether gas was estimated
}
```

#### `approvePayment(taskId, options)`
Approve task completion (client only).

**Parameters:**
```javascript
taskId: string | number,     // Task ID to approve
options?: {
  estimateGas?: boolean,     // Estimate gas automatically (default: true)
  gasLimit?: number,         // Manual gas limit
  gasPrice?: string          // Manual gas price
}
```

**Returns:**
```javascript
{
  taskId: string,              // Task ID
  transactionHash: string,     // Transaction hash
  blockNumber: number,         // Block number
  gasUsed: string,            // Gas used
  effectiveGasPrice: string,   // Effective gas price
  gasEstimated: boolean       // Whether gas was estimated
}
```

#### `claimPayment(taskId, options)`
Claim payment for completed task (agent only).

**Parameters:**
```javascript
taskId: string | number,     // Task ID to claim
options?: {
  estimateGas?: boolean,     // Estimate gas automatically (default: true)
  gasLimit?: number,         // Manual gas limit
  gasPrice?: string          // Manual gas price
}
```

**Returns:**
```javascript
{
  taskId: string,              // Task ID
  transactionHash: string,     // Transaction hash
  blockNumber: number,         // Block number
  gasUsed: string,            // Gas used
  effectiveGasPrice: string,   // Effective gas price
  gasEstimated: boolean,      // Whether gas was estimated
  amount: string              // Claimed amount (raw)
}
```

#### `cancelTask(taskId, options)`
Cancel task and refund tokens (client only).

**Parameters:**
```javascript
taskId: string | number,     // Task ID to cancel
options?: {
  estimateGas?: boolean,     // Estimate gas automatically (default: true)
  gasLimit?: number,         // Manual gas limit
  gasPrice?: string          // Manual gas price
}
```

**Returns:**
```javascript
{
  taskId: string,              // Task ID
  transactionHash: string,     // Transaction hash
  blockNumber: number,         // Block number
  gasUsed: string,            // Gas used
  effectiveGasPrice: string,   // Effective gas price
  gasEstimated: boolean,      // Whether gas was estimated
  refundAmount: string        // Refunded amount (raw)
}
```

### Query Methods

#### `getTask(taskId)`
Get detailed task information.

**Parameters:**
```javascript
taskId: string | number      // Task ID to query
```

**Returns:**
```javascript
{
  id: string,                  // Task ID
  client: string,              // Client address
  agent: string,               // Agent address
  token: string,               // Token contract address
  amount: string,              // Locked amount (raw)
  status: number,              // Task status (0=Created, 1=Approved, 2=Paid, 3=Cancelled)
  metadataHash: string,        // Metadata hash
  metadata: object            // Parsed metadata
}
```

#### `getTaskCount()`
Get total number of tasks created.

**Returns:**
```javascript
{
  count: string               // Total task count
}
```

#### `taskExists(taskId)`
Check if a task exists.

**Parameters:**
```javascript
taskId: string | number      // Task ID to check
```

**Returns:**
```javascript
{
  exists: boolean,            // Whether task exists
  taskId: string             // Task ID (normalized)
}
```

#### `getTokenInfo(tokenAddress)`
Get ERC20 token information.

**Parameters:**
```javascript
tokenAddress: string         // Token contract address
```

**Returns:**
```javascript
{
  name: string,               // Token name
  symbol: string,             // Token symbol
  decimals: number,           // Token decimals
  address: string            // Token contract address
}
```

#### `getTokenBalance(tokenAddress, address?)`
Get token balance for an address.

**Parameters:**
```javascript
tokenAddress: string,        // Token contract address
address?: string            // Address to check (defaults to current signer)
```

**Returns:**
```javascript
{
  amountRaw: string,          // Raw balance
  amountFormatted: string,    // Formatted balance
  decimals: number,           // Token decimals
  symbol: string,             // Token symbol
  address: string            // Token contract address
}
```

#### `getTokenAllowance(tokenAddress, ownerAddress?)`
Get token allowance for the escrow contract.

**Parameters:**
```javascript
tokenAddress: string,        // Token contract address
ownerAddress?: string       // Owner address (defaults to current signer)
```

**Returns:**
```javascript
{
  amountRaw: string,          // Raw allowance
  amountFormatted: string,    // Formatted allowance
  decimals: number,           // Token decimals
  symbol: string,             // Token symbol
  spender: string,            // Escrow contract address
  owner: string              // Owner address
}
```

#### `getNetworkInfo()`
Get current network information.

**Returns:**
```javascript
{
  chainId: number,            // Chain ID
  name: string,               // Network name
  supported: boolean,         // Whether network is supported
  config: {                   // Network configuration
    chainId: number,
    name: string,
    rpcUrl: string,
    explorerUrl: string,
    nativeCurrency: {
      name: string,
      symbol: string,
      decimals: number
    }
  }
}
```

#### `getAccountInfo()`
Get current account information with native currency.

**Returns:**
```javascript
{
  address: string,            // Account address
  balance: {
    amountRaw: string,        // Raw native balance
    amountFormatted: string,  // Formatted native balance
    symbol: string           // Native currency symbol (MATIC, ETH, etc.)
  }
}
```

## 🔧 Configuration

### Network Configuration
```javascript
// Polygon Amoy Testnet (default)
const sdk = MyceliumSDK.withPrivateKey(privateKey, {
  chainId: 80002
});

// Polygon Mainnet
const sdk = MyceliumSDK.withPrivateKey(privateKey, {
  chainId: 137,
  rpcUrl: 'https://polygon-rpc.com'
});
```

### Browser Integration
```javascript
// MetaMask integration
const sdk = MyceliumSDK.withBrowserProvider(window.ethereum);

// Read-only mode
const sdk = MyceliumSDK.withRPC('https://rpc-amoy.polygon.technology');
```

## 🎨 Usage Patterns

### Pattern 1: Simple Task Flow
```javascript
// 1. Create task with auto-approval
const task = await sdk.createTask({
  agentAddress: agentWallet,
  tokenAddress: usdcAddress,
  amount: '50',
  metadata: { task: 'Data analysis' },
  options: { autoApprove: true }
});

// 2. Agent completes work off-chain...

// 3. Client approves payment
await sdk.approvePayment(task.taskId);

// 4. Agent claims payment
await sdk.claimPayment(task.taskId);
```

### Pattern 2: Batch Operations
```javascript
// Check allowance for multiple tasks
const allowanceCheck = await sdk.checkAndApproveToken(
  usdcAddress, 
  '500', // Total for multiple tasks
  { autoApprove: true }
);

// Create multiple tasks efficiently
const tasks = await Promise.all([
  sdk.createTask({ /* task 1 */ }),
  sdk.createTask({ /* task 2 */ }),
  sdk.createTask({ /* task 3 */ })
]);
```

### Pattern 3: Event Monitoring
```javascript
// Listen for real-time events
sdk.on('taskCreated', (event) => {
  console.log('New task:', event.taskId);
  updateUI(event);
});

sdk.on('paymentClaimed', (event) => {
  console.log('Payment claimed:', event.amount);
  notifyCompletion(event);
});
```

## 🛡�?Best Practices

### 1. Always Use Auto-Approval
```javascript
// �?Good: Seamless user experience
const task = await sdk.createTask({
  // ... params
  options: { autoApprove: true }
});

// �?Avoid: Manual approval flow
await sdk.approveToken(tokenAddress, amount);
await sdk.createTask(params);
```

### 2. Enable Gas Estimation
```javascript
// �?Good: Optimized gas usage
const result = await sdk.createTask({
  // ... params
  options: { estimateGas: true }
});

// �?Avoid: Fixed gas limits
const result = await sdk.createTask({
  // ... params
  options: { gasLimit: 500000 }
});
```

### 3. Handle Errors Gracefully
```javascript
// �?Good: Specific error handling
try {
  await sdk.createTask(params);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    showInsufficientFundsDialog(error.details);
  } else if (error instanceof ValidationError) {
    showValidationError(error.message);
  } else {
    showGenericError(error.message);
  }
}
```

### 4. Clean Up Resources
```javascript
// �?Good: Proper cleanup
try {
  // ... use SDK
} finally {
  sdk.destroy(); // Clean up resources
}
```

## 🚨 Common Issues

### Issue 1: "Insufficient allowance" Error
**Solution:** Use `autoApprove: true` or call `checkAndApproveToken()` first.

### Issue 2: Transaction Failures
**Solution:** Enable `estimateGas: true` for automatic gas optimization.

### Issue 3: Network Mismatch
**Solution:** Ensure your wallet and SDK are on the same network.

### Issue 4: Provider Errors
**Solution:** Check RPC URL and network connectivity.

## 📞 Support

- 📖 [API Documentation](./README.md)
- 💬 [Discord Community](https://discord.gg/mycelium)
- 🐛 [GitHub Issues](https://github.com/mycelium-protocol/mycelium-protocol/issues)
- 📧 [Email Support](mailto:support@mycelium.xyz)

## 🔗 Links

- [Smart Contract](../smart-contract/)
- [Python SDK](../sdk-py/)
- [Examples](./examples/)
- [Deployment Guide](../smart-contract/DEPLOYMENT.md)
