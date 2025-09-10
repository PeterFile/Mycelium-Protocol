/**
 * Auto-Approval Example
 * 
 * This example demonstrates the seamless user experience with automatic token approval.
 * Perfect for production applications where you want to minimize user friction.
 */

import { MyceliumSDK } from '@mycelium-protocol/sdk-js';

async function autoApprovalExample() {
  // Initialize SDK with private key (backend) or browser provider (frontend)
  const sdk = MyceliumSDK.withPrivateKey(process.env.PRIVATE_KEY, {
    chainId: 80002 // Polygon Amoy testnet
  });

  try {
    console.log('🚀 Creating task with auto-approval...');

    // Create task with automatic token approval
    const result = await sdk.createTask({
      agentAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      tokenAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // USDC on Amoy
      amount: '10', // 10 USDC
      metadata: {
        title: 'Data Analysis Task',
        description: 'Analyze customer behavior data',
        deadline: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        requirements: ['Python', 'Pandas', 'Statistical analysis']
      },
      options: {
        autoApprove: true,    // 🎯 Key feature: automatic approval
        estimateGas: true     // Optimize gas usage
      }
    });

    console.log('✅ Task created successfully!');
    console.log('📋 Task ID:', result.taskId);
    console.log('🔗 Transaction:', result.transactionHash);
    console.log('⛽ Gas used:', result.gasUsed);

    // Check if auto-approval was triggered
    if (result.approvalTransaction) {
      console.log('🔓 Auto-approved tokens!');
      console.log('🔗 Approval TX:', result.approvalTransaction.transactionHash);
      console.log('💰 Approved amount:', result.approvalTransaction.approvedAmount);
    } else {
      console.log('✨ Sufficient allowance already existed');
    }

    // Get task details
    const taskInfo = await sdk.getTask(result.taskId);
    console.log('📊 Task details:', {
      client: taskInfo.client,
      agent: taskInfo.agent,
      amount: taskInfo.amount,
      status: taskInfo.status
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Handle specific error types
    if (error.name === 'InsufficientFundsError') {
      console.log('💸 Insufficient token balance');
      console.log('Required:', error.details.required);
      console.log('Available:', error.details.available);
    }
  } finally {
    // Clean up resources
    sdk.destroy();
  }
}

// Run the example
autoApprovalExample().catch(console.error);