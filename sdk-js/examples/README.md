# Mycelium Protocol SDK Examples

This directory contains practical examples demonstrating how to use the Mycelium Protocol JavaScript SDK.

## Quick Start

```bash
npm install @mycelium-protocol/sdk-js ethers
```

## Examples

### 1. Basic Task Creation
- [basic-task.js](./basic-task.js) - Simple task creation and completion flow
- [auto-approve.js](./auto-approve.js) - Using auto-approval for seamless UX

### 2. Advanced Usage
- [gas-optimization.js](./gas-optimization.js) - Gas estimation and optimization
- [error-handling.js](./error-handling.js) - Comprehensive error handling
- [event-listening.js](./event-listening.js) - Real-time event monitoring

### 3. Integration Patterns
- [frontend-integration.js](./frontend-integration.js) - Complete browser integration with MetaMask
- [backend-integration.js](./backend-integration.js) - Server-side integration with private keys
- [batch-operations.js](./batch-operations.js) - Handling multiple tasks efficiently

## Common Patterns

### Auto-Approval Pattern
```javascript
// Seamless task creation with automatic token approval
const result = await sdk.createTask({
  agentAddress: '0x...',
  tokenAddress: '0x...', // USDC address
  amount: '100', // 100 USDC
  metadata: { description: 'Data analysis task' },
  options: {
    autoApprove: true, // Automatically approve tokens if needed
    estimateGas: true  // Optimize gas usage
  }
});

if (result.approvalTransaction) {
  console.log('Auto-approved tokens:', result.approvalTransaction.transactionHash);
}
```

### Error Handling Pattern
```javascript
try {
  const task = await sdk.createTask(params);
  console.log('Task created:', task.taskId);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.log('Insufficient balance:', error.details);
  } else if (error instanceof ContractError) {
    console.log('Contract error:', error.message);
  }
}
```

### Event Monitoring Pattern
```javascript
// Listen for task events
sdk.on('taskCreated', (event) => {
  console.log('New task:', event.taskId);
});

sdk.on('paymentClaimed', (event) => {
  console.log('Payment claimed:', event.amount);
});
```

## Best Practices

1. **Always use auto-approval** for better UX in production apps
2. **Enable gas estimation** to optimize transaction costs
3. **Implement proper error handling** for all edge cases
4. **Listen to events** for real-time updates
5. **Clean up resources** by calling `sdk.destroy()` when done

## Need Help?

- 📖 [Full Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/mycelium-protocol/mycelium-protocol/issues)
- 💬 [Community Discord](https://discord.gg/mycelium)