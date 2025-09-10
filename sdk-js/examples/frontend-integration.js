/**
 * Frontend Integration Example
 * 
 * This example demonstrates how to integrate Mycelium Protocol SDK
 * in a web application with MetaMask or other browser wallets.
 */

import { MyceliumSDK, InsufficientFundsError, ContractError } from '@mycelium-protocol/sdk-js';

class MyceliumTaskManager {
  constructor() {
    this.sdk = null;
    this.isConnected = false;
  }

  /**
   * Connect to MetaMask and initialize SDK
   */
  async connectWallet() {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Initialize SDK with browser provider
      this.sdk = MyceliumSDK.withBrowserProvider(window.ethereum);

      // Check network
      const networkInfo = await this.sdk.getNetworkInfo();
      if (networkInfo.chainId !== 80002) { // Polygon Amoy
        await this.switchToAmoyNetwork();
      }

      this.isConnected = true;
      console.log('✅ Connected to Mycelium Protocol');
      
      return await this.sdk.getAccountInfo();
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Switch to Polygon Amoy testnet
   */
  async switchToAmoyNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x13882' }], // 80002 in hex
      });
    } catch (switchError) {
      // Network not added, try to add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x13882',
            chainName: 'Polygon Amoy Testnet',
            nativeCurrency: {
              name: 'MATIC',
              symbol: 'MATIC',
              decimals: 18
            },
            rpcUrls: ['https://rpc-amoy.polygon.technology'],
            blockExplorerUrls: ['https://amoy.polygonscan.com/']
          }]
        });
      } else {
        throw switchError;
      }
    }
  }

  /**
   * Create a task with user-friendly error handling
   */
  async createTask(taskData) {
    if (!this.isConnected) {
      throw new Error('Please connect your wallet first');
    }

    try {
      console.log('🚀 Creating task...');
      
      // Show loading state in UI
      this.updateUI('Creating task...', 'loading');

      const result = await this.sdk.createTask({
        agentAddress: taskData.agentAddress,
        tokenAddress: taskData.tokenAddress,
        amount: taskData.amount,
        metadata: {
          title: taskData.title,
          description: taskData.description,
          deadline: taskData.deadline,
          requirements: taskData.requirements
        },
        options: {
          autoApprove: true,  // Seamless UX - handle approval automatically
          estimateGas: true   // Optimize gas costs
        }
      });

      console.log('✅ Task created successfully!');
      
      // Update UI with success
      this.updateUI(`Task created! ID: ${result.taskId}`, 'success');
      
      // Show transaction details
      if (result.approvalTransaction) {
        console.log('🔓 Auto-approved tokens:', result.approvalTransaction.transactionHash);
      }

      return result;

    } catch (error) {
      console.error('❌ Task creation failed:', error);
      
      // Handle specific error types with user-friendly messages
      if (error instanceof InsufficientFundsError) {
        const message = `Insufficient ${error.details.token} balance. You need ${error.details.required} but only have ${error.details.available}.`;
        this.updateUI(message, 'error');
      } else if (error instanceof ContractError && error.message.includes('allowance')) {
        this.updateUI('Token approval failed. Please try again.', 'error');
      } else if (error.code === 4001) { // User rejected
        this.updateUI('Transaction cancelled by user.', 'warning');
      } else if (error.code === -32603) { // Internal error
        this.updateUI('Network error. Please check your connection and try again.', 'error');
      } else {
        this.updateUI(`Error: ${error.message}`, 'error');
      }
      
      throw error;
    }
  }

  /**
   * Approve task payment (for clients)
   */
  async approvePayment(taskId) {
    try {
      console.log('✅ Approving payment for task:', taskId);
      this.updateUI('Approving payment...', 'loading');

      const result = await this.sdk.approvePayment(taskId, {
        estimateGas: true
      });

      console.log('✅ Payment approved!');
      this.updateUI('Payment approved successfully!', 'success');
      
      return result;
    } catch (error) {
      console.error('❌ Payment approval failed:', error);
      this.handleTransactionError(error);
      throw error;
    }
  }

  /**
   * Claim payment (for agents)
   */
  async claimPayment(taskId) {
    try {
      console.log('💰 Claiming payment for task:', taskId);
      this.updateUI('Claiming payment...', 'loading');

      const result = await this.sdk.claimPayment(taskId, {
        estimateGas: true
      });

      console.log('✅ Payment claimed!');
      this.updateUI(`Payment claimed! Amount: ${result.amount}`, 'success');
      
      return result;
    } catch (error) {
      console.error('❌ Payment claim failed:', error);
      this.handleTransactionError(error);
      throw error;
    }
  }

  /**
   * Get task information
   */
  async getTaskInfo(taskId) {
    try {
      const task = await this.sdk.getTask(taskId);
      
      // Format for display
      return {
        ...task,
        statusText: this.getStatusText(task.status),
        formattedAmount: await this.formatTokenAmount(task.token, task.amount)
      };
    } catch (error) {
      console.error('❌ Failed to get task info:', error);
      throw error;
    }
  }

  /**
   * Listen for task events
   */
  setupEventListeners() {
    if (!this.sdk) return;

    this.sdk.on('taskCreated', (event) => {
      console.log('📋 New task created:', event.taskId);
      this.onTaskCreated(event);
    });

    this.sdk.on('paymentApproved', (event) => {
      console.log('✅ Payment approved for task:', event.taskId);
      this.onPaymentApproved(event);
    });

    this.sdk.on('paymentClaimed', (event) => {
      console.log('💰 Payment claimed for task:', event.taskId);
      this.onPaymentClaimed(event);
    });
  }

  /**
   * Helper methods for UI updates
   */
  updateUI(message, type) {
    // Update your UI components here
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status ${type}`;
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  handleTransactionError(error) {
    if (error.code === 4001) {
      this.updateUI('Transaction cancelled by user.', 'warning');
    } else if (error.message.includes('insufficient funds')) {
      this.updateUI('Insufficient funds for gas fees.', 'error');
    } else {
      this.updateUI(`Transaction failed: ${error.message}`, 'error');
    }
  }

  getStatusText(status) {
    const statusMap = {
      0: 'Created',
      1: 'Approved', 
      2: 'Paid',
      3: 'Cancelled'
    };
    return statusMap[status] || 'Unknown';
  }

  async formatTokenAmount(tokenAddress, rawAmount) {
    try {
      const tokenInfo = await this.sdk.getTokenInfo(tokenAddress);
      const formatted = rawAmount / Math.pow(10, tokenInfo.decimals);
      return `${formatted} ${tokenInfo.symbol}`;
    } catch {
      return rawAmount;
    }
  }

  // Event handlers (implement based on your UI framework)
  onTaskCreated(event) {
    // Update task list, show notification, etc.
  }

  onPaymentApproved(event) {
    // Update task status, notify agent, etc.
  }

  onPaymentClaimed(event) {
    // Update task status, show completion, etc.
  }

  /**
   * Cleanup when component unmounts
   */
  disconnect() {
    if (this.sdk) {
      this.sdk.destroy();
      this.sdk = null;
    }
    this.isConnected = false;
  }
}

// Usage example
const taskManager = new MyceliumTaskManager();

// Connect wallet button handler
document.getElementById('connectWallet')?.addEventListener('click', async () => {
  try {
    const accountInfo = await taskManager.connectWallet();
    console.log('Connected account:', accountInfo.address);
    taskManager.setupEventListeners();
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
});

// Create task form handler
document.getElementById('createTaskForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const taskData = {
    agentAddress: formData.get('agentAddress'),
    tokenAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // USDC on Amoy
    amount: formData.get('amount'),
    title: formData.get('title'),
    description: formData.get('description'),
    deadline: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    requirements: formData.get('requirements').split(',')
  };

  try {
    const result = await taskManager.createTask(taskData);
    console.log('Task created:', result);
  } catch (error) {
    console.error('Failed to create task:', error);
  }
});

// Export for use in other modules
export { MyceliumTaskManager };