/**
 * Gas Optimization Example
 * 
 * This example shows how to use gas estimation and optimization features
 * to reduce transaction costs and improve success rates.
 */

import { MyceliumSDK } from '@mycelium-protocol/sdk-js';

async function gasOptimizationExample() {
  const sdk = MyceliumSDK.withPrivateKey(process.env.PRIVATE_KEY, {
    chainId: 80002 // Polygon Amoy testnet
  });

  try {
    console.log('⛽ Gas Optimization Demo');
    console.log('========================\n');

    // Example 1: Automatic gas estimation (recommended)
    console.log('1️⃣ Creating task with automatic gas estimation...');
    
    const taskResult = await sdk.createTask({
      agentAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      tokenAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
      amount: '5',
      metadata: { description: 'Gas optimized task' },
      options: {
        estimateGas: true,  // 🎯 Automatic gas estimation
        autoApprove: true
      }
    });

    console.log('✅ Task created with estimated gas');
    console.log('📊 Gas used:', taskResult.gasUsed);
    console.log('💰 Effective gas price:', taskResult.effectiveGasPrice);
    console.log('🔧 Gas was estimated:', taskResult.gasEstimated);

    // Example 2: Manual gas limit (for advanced users)
    console.log('\n2️⃣ Approving payment with manual gas limit...');
    
    const approvalResult = await sdk.approvePayment(taskResult.taskId, {
      estimateGas: false,  // Disable estimation
      gasLimit: 100000,    // Manual gas limit
      gasPrice: '30000000000' // 30 gwei
    });

    console.log('✅ Payment approved with manual gas');
    console.log('📊 Gas used:', approvalResult.gasUsed);

    // Example 3: Gas estimation for token approval
    console.log('\n3️⃣ Checking token allowance and gas estimation...');
    
    const allowanceCheck = await sdk.checkAndApproveToken(
      '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
      '100',
      {
        autoApprove: false // Just check, don't approve yet
      }
    );

    console.log('🔍 Allowance check result:', {
      sufficient: allowanceCheck.isAllowanceSufficient,
      current: allowanceCheck.currentAllowance,
      required: allowanceCheck.requiredAmount
    });

    if (allowanceCheck.needsApproval) {
      console.log('🔓 Approving tokens with gas estimation...');
      
      const approveResult = await sdk.approveToken(
        '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
        '100',
        {
          estimateGas: true // Estimate gas for approval
        }
      );

      console.log('✅ Tokens approved');
      console.log('📊 Approval gas used:', approveResult.gasUsed);
      console.log('🔧 Gas was estimated:', approveResult.gasEstimated);
    }

    // Example 4: Network-specific gas optimization
    const networkInfo = await sdk.getNetworkInfo();
    console.log('\n4️⃣ Network-specific optimization:');
    console.log('🌐 Network:', networkInfo.name);
    console.log('⛽ Recommended for', networkInfo.name, ':');
    
    if (networkInfo.chainId === 137) { // Polygon Mainnet
      console.log('   - Use gasPrice: 30-50 gwei for normal priority');
      console.log('   - Use gasPrice: 50-100 gwei for high priority');
    } else if (networkInfo.chainId === 80002) { // Polygon Amoy
      console.log('   - Use gasPrice: 30 gwei (testnet)');
      console.log('   - Gas estimation is more reliable on testnet');
    }

    console.log('\n💡 Gas Optimization Tips:');
    console.log('   ✓ Always use estimateGas: true in production');
    console.log('   ✓ Monitor gas prices and adjust accordingly');
    console.log('   ✓ Use autoApprove to batch approval + task creation');
    console.log('   ✓ Consider gas price based on transaction urgency');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    sdk.destroy();
  }
}

// Run the example
gasOptimizationExample().catch(console.error);