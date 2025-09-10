/**
 * @fileoverview Main Mycelium Protocol SDK class
 * @description Provides a simple interface for interacting with Mycelium Protocol smart contracts
 */

import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { TaskEscrowERC20ABI, ERC20ABI } from './abi.js';
import { TaskStatus, Networks, ContractAddresses, Defaults, Events } from './constants.js';
import {
  MyceliumError,
  ValidationError,
  NetworkError,
  ContractError,
  InsufficientFundsError
} from './errors.js';
import {
  validateAddress,
  validateAmount,
  validateMetadataHash,
  validateTaskId,
  formatAmount,
  parseAmount,
  getNetworkByChainId,
  isSupportedNetwork,
  waitForTransaction,
  generateTaskMetadata,
  parseTaskMetadata
} from './utils.js';

/**
 * Main Mycelium Protocol SDK class
 * Supports both private key (backend/automation) and browser provider (frontend) initialization
 */
export class MyceliumSDK extends EventEmitter {
  /**
   * Creates a new MyceliumSDK instance
   * @param {Object} config - Configuration object
   * @param {string} [config.privateKey] - Private key for backend/automation use
   * @param {Object} [config.provider] - Browser provider (MetaMask, etc.) for frontend use
   * @param {string} [config.rpcUrl] - Custom RPC URL
   * @param {number} [config.chainId] - Target chain ID (default: Polygon Amoy)
   * @param {Object} [config.options] - Additional options
   */
  constructor(config = {}) {
    super();

    this._validateConfig(config);
    this._mergeConfig(config);
    this._initialize(config);
  }

  /**
   * Validates the provided configuration
   * @private
   */
  _validateConfig(config) {
    if (!config.privateKey && !config.provider && !config.rpcUrl) {
      throw new ValidationError('Either privateKey, provider, or rpcUrl must be provided');
    }
  }

  /**
   * Merges user config with defaults
   * @private
   */
  _mergeConfig(config) {
    this.config = {
      chainId: Networks.POLYGON_AMOY.chainId,
      confirmations: Defaults.CONFIRMATION_BLOCKS,
      timeout: Defaults.TIMEOUT_MS,
      gasLimit: Defaults.GAS_LIMIT,
      gasPriceMultiplier: Defaults.GAS_PRICE_MULTIPLIER,
      ...config.options
    };
  }

  /**
   * Initializes all SDK components
   * @private
   */
  _initialize(config) {
    this._initializeProvider(config);
    this._initializeContracts();
    this._setupEventListeners();
  }

  /**
   * Initialize provider and signer based on configuration
   * @private
   */
  _initializeProvider(config) {
    if (config.privateKey) {
      // Backend/automation mode with private key
      this._initializeWithPrivateKey(config);
    } else if (config.provider) {
      // Frontend mode with browser provider
      this._initializeWithBrowserProvider(config);
    } else if (config.rpcUrl) {
      // Read-only mode with RPC URL
      this._initializeWithRPC(config);
    } else {
      throw new ValidationError('Either privateKey, provider, or rpcUrl must be provided');
    }
  }

  /**
   * Initialize with private key (backend/automation)
   * @private
   */
  _initializeWithPrivateKey(config) {
    try {
      const network = getNetworkByChainId(config.chainId || Networks.POLYGON_AMOY.chainId);
      if (!network) {
        throw new NetworkError(`Unsupported chain ID: ${config.chainId}`);
      }

      const rpcUrl = config.rpcUrl || network.rpcUrl;
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
      this.isReadOnly = false;
      this.mode = 'privateKey';

      this.config.chainId = network.chainId;
    } catch (error) {
      throw new ValidationError(`Failed to initialize with private key: ${error.message}`);
    }
  }

  /**
   * Initialize with browser provider (frontend)
   * @private
   */
  _initializeWithBrowserProvider(config) {
    try {
      this.provider = new ethers.BrowserProvider(config.provider);
      this.signer = null; // Will be set when needed
      this.isReadOnly = false;
      this.mode = 'browser';

      // Chain ID will be detected from provider
    } catch (error) {
      throw new ValidationError(`Failed to initialize with browser provider: ${error.message}`);
    }
  }

  /**
   * Initialize with RPC URL (read-only mode)
   * @private
   */
  _initializeWithRPC(config) {
    try {
      const network = getNetworkByChainId(config.chainId || Networks.POLYGON_AMOY.chainId);
      if (!network) {
        throw new NetworkError(`Unsupported chain ID: ${config.chainId}`);
      }

      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.signer = null;
      this.isReadOnly = true;
      this.mode = 'rpc';

      this.config.chainId = network.chainId;
    } catch (error) {
      throw new ValidationError(`Failed to initialize with RPC: ${error.message}`);
    }
  }

  /**
   * Initialize smart contracts
   * @private
   */
  _initializeContracts() {
    const contractAddress = ContractAddresses[this.config.chainId]?.TaskEscrowERC20;
    if (!contractAddress) {
      throw new NetworkError(`TaskEscrowERC20 contract not deployed on chain ${this.config.chainId}`);
    }

    // Initialize with provider first (read-only)
    this.escrowContract = new ethers.Contract(contractAddress, TaskEscrowERC20ABI, this.provider);
    this.contractAddress = contractAddress;
  }

  /**
   * Set up event listeners for contract events
   * @private
   */
  _setupEventListeners() {
    if (!this.escrowContract) return;

    // Listen to contract events and re-emit them
    this.escrowContract.on('TaskCreated', (...args) => {
      this.emit(Events.TASK_CREATED, this._parseTaskCreatedEvent(args));
    });

    this.escrowContract.on('PaymentApproved', (...args) => {
      this.emit(Events.PAYMENT_APPROVED, this._parsePaymentApprovedEvent(args));
    });

    this.escrowContract.on('PaymentClaimed', (...args) => {
      this.emit(Events.PAYMENT_CLAIMED, this._parsePaymentClaimedEvent(args));
    });

    this.escrowContract.on('TaskCancelled', (...args) => {
      this.emit(Events.TASK_CANCELLED, this._parseTaskCancelledEvent(args));
    });
  }

  /**
   * Ensures signer is available for write operations
   * @private
   */
  async _ensureSigner() {
    if (this.mode === 'privateKey') {
      return this.signer;
    }

    if (this.mode === 'browser') {
      if (!this.signer) {
        this.signer = await this.provider.getSigner();
      }
      return this.signer;
    }

    throw new MyceliumError('No signer available');
  }

  /**
   * Ensures the SDK is not in read-only mode for write operations
   * @private
   */
  _ensureWriteMode() {
    if (this.isReadOnly) {
      throw new MyceliumError(
        'SDK is in read-only mode. Write operations are not supported. ' +
        'Initialize with privateKey or browser provider to enable write operations.'
      );
    }
  }

  /**
   * Gets a contract instance with signer for write operations
   * @private
   */
  async _getSignedContract() {
    this._ensureWriteMode();
    const signer = await this._ensureSigner();
    return this.escrowContract.connect(signer);
  }

  /**
   * Creates a new task with ERC20 token payment
   * @param {Object} params - Task parameters
   * @param {string} params.agentAddress - Address of the agent who will perform the task
   * @param {string} params.tokenAddress - Address of the ERC20 token contract
   * @param {string|number} params.amount - Amount of tokens to lock (in token units)
   * @param {string|Object} params.metadata - Task metadata (string or object)
   * @param {Object} [params.options] - Transaction options
   * @returns {Promise<Object>} Task creation result
   */
  async createTask({ agentAddress, tokenAddress, amount, metadata, options = {} }) {
    this._ensureNotDestroyed();
    this._ensureWriteMode();

    // Validation
    validateAddress(agentAddress, 'agentAddress');
    validateAddress(tokenAddress, 'tokenAddress');
    validateAmount(amount, 'amount');

    // Process metadata
    let metadataHash;
    if (typeof metadata === 'string') {
      validateMetadataHash(metadata);
      metadataHash = metadata;
    } else if (typeof metadata === 'object') {
      metadataHash = generateTaskMetadata(metadata);
    } else {
      throw new ValidationError('Metadata must be a string or object', 'metadata', metadata);
    }

    try {
      // Get token contract for decimals and approval check
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider);
      const decimals = await tokenContract.decimals();
      const parsedAmount = parseAmount(amount, decimals);

      // Check token balance and allowance
      const signer = await this._ensureSigner();
      const signerAddress = await signer.getAddress();

      const balance = await tokenContract.balanceOf(signerAddress);
      if (balance < parsedAmount) {
        const symbol = await tokenContract.symbol().catch(() => 'TOKEN');
        throw new InsufficientFundsError(
          formatAmount(parsedAmount, decimals),
          formatAmount(balance, decimals),
          symbol
        );
      }

      const allowance = await tokenContract.allowance(signerAddress, this.contractAddress);
      if (allowance < parsedAmount) {
        throw new ContractError(
          `Insufficient token allowance. Please approve ${formatAmount(parsedAmount, decimals)} tokens first.`,
          tokenAddress
        );
      }

      // Execute transaction
      const contract = await this._getSignedContract();
      const tx = await contract.createTask(
        agentAddress,
        tokenAddress,
        parsedAmount,
        metadataHash,
        {
          gasLimit: options.gasLimit || this.config.gasLimit,
          ...options
        }
      );

      // Wait for confirmation
      const receipt = await waitForTransaction(
        this.provider,
        tx.hash,
        this.config.confirmations,
        this.config.timeout
      );

      // Parse task ID from events
      const taskCreatedEvent = receipt.logs
        .map(log => {
          try {
            return this.escrowContract.interface.parseLog(log);
          } catch (parseError) {
            // In development mode, warn about parsing failures
            if (process.env.NODE_ENV === 'development') {
              console.warn('Failed to parse event log:', parseError.message, log);
            }
            return null;
          }
        })
        .find(event => event && event.name === 'TaskCreated');

      if (!taskCreatedEvent) {
        throw new ContractError('TaskCreated event not found in transaction receipt', this.contractAddress, tx.hash);
      }

      const taskId = taskCreatedEvent.args.taskId;

      return {
        taskId: taskId.toString(),
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
        metadata: parseTaskMetadata(metadataHash)
      };

    } catch (error) {
      if (error instanceof MyceliumError) {
        throw error;
      }
      throw new ContractError(`Failed to create task: ${error.message}`, this.contractAddress, error);
    }
  }

  /**
   * Approves payment for a completed task (client only)
   * @param {string|number} taskId - Task ID to approve
   * @param {Object} [options] - Transaction options
   * @returns {Promise<Object>} Approval result
   */
  async approvePayment(taskId, options = {}) {
    this._ensureNotDestroyed();

    return this._executeTaskOperation(
      taskId,
      'approve payment',
      (task, signerAddress) => {
        if (task.client.toLowerCase() !== signerAddress.toLowerCase()) {
          throw new ValidationError('Only the task client can approve payment', 'caller', signerAddress);
        }
        if (task.status !== TaskStatus.CREATED) {
          throw new ValidationError(`Task status must be CREATED, current status: ${task.status}`, 'status', task.status);
        }
      },
      'approvePayment',
      options
    );
  }

  /**
   * Claims payment for an approved task (agent only)
   * @param {string|number} taskId - Task ID to claim payment for
   * @param {Object} [options] - Transaction options
   * @returns {Promise<Object>} Claim result
   */
  async claimPayment(taskId, options = {}) {
    this._ensureNotDestroyed();

    // Get task info first to include amount in result
    const task = await this.getTask(taskId);

    const result = await this._executeTaskOperation(
      taskId,
      'claim payment',
      (task, signerAddress) => {
        if (task.agent.toLowerCase() !== signerAddress.toLowerCase()) {
          throw new ValidationError('Only the task agent can claim payment', 'caller', signerAddress);
        }
        if (task.status !== TaskStatus.APPROVED) {
          throw new ValidationError(`Task status must be APPROVED, current status: ${task.status}`, 'status', task.status);
        }
      },
      'claimPayment',
      options
    );

    // Add amount to result
    return {
      ...result,
      amount: task.amount
    };
  }

  /**
   * Cancels a task and refunds the client (client only)
   * @param {string|number} taskId - Task ID to cancel
   * @param {Object} [options] - Transaction options
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelTask(taskId, options = {}) {
    this._ensureNotDestroyed();

    // Get task info first to include refund amount in result
    const task = await this.getTask(taskId);

    const result = await this._executeTaskOperation(
      taskId,
      'cancel task',
      (task, signerAddress) => {
        if (task.client.toLowerCase() !== signerAddress.toLowerCase()) {
          throw new ValidationError('Only the task client can cancel the task', 'caller', signerAddress);
        }
        if (task.status !== TaskStatus.CREATED) {
          throw new ValidationError(`Task status must be CREATED, current status: ${task.status}`, 'status', task.status);
        }
      },
      'cancelTaskAndRefund',
      options
    );

    // Add refund amount to result
    return {
      ...result,
      refundAmount: task.amount
    };
  }

  /**
   * Gets detailed information about a task
   * @param {string|number} taskId - Task ID
   * @returns {Promise<Object>} Task information
   */
  async getTask(taskId) {
    this._ensureNotDestroyed();
    validateTaskId(taskId);

    try {
      const taskInfo = await this.escrowContract.getTaskInfo(taskId);

      return {
        id: taskInfo.id.toString(),
        client: taskInfo.client,
        agent: taskInfo.agent,
        token: taskInfo.token,
        amount: taskInfo.amount.toString(),
        status: Number(taskInfo.status),
        metadataHash: taskInfo.metadataHash,
        metadata: parseTaskMetadata(taskInfo.metadataHash)
      };
    } catch (error) {
      if (error.message.includes('Task does not exist')) {
        throw new ValidationError(`Task ${taskId} does not exist`, 'taskId', taskId);
      }
      throw new ContractError(`Failed to get task info: ${error.message}`, this.contractAddress, error);
    }
  }

  /**
   * Gets task metadata
   * @param {string|number} taskId - Task ID
   * @returns {Promise<string>} Task metadata hash
   */
  async getTaskMetadata(taskId) {
    validateTaskId(taskId);

    try {
      return await this.escrowContract.getTaskMetadata(taskId);
    } catch (error) {
      if (error.message.includes('Task does not exist')) {
        throw new ValidationError(`Task ${taskId} does not exist`, 'taskId', taskId);
      }
      throw new ContractError(`Failed to get task metadata: ${error.message}`, this.contractAddress, error);
    }
  }

  /**
   * Gets the total number of tasks created
   * @returns {Promise<Object>} Task count information
   */
  async getTaskCount() {
    this._ensureNotDestroyed();
    try {
      const count = await this.escrowContract.getTaskCount();
      return {
        count: count.toString()
      };
    } catch (error) {
      throw new ContractError(`Failed to get task count: ${error.message}`, this.contractAddress, error);
    }
  }

  /**
   * Checks if a task exists
   * @param {string|number} taskId - Task ID to check
   * @returns {Promise<Object>} Task existence information
   */
  async taskExists(taskId) {
    validateTaskId(taskId);

    try {
      const exists = await this.escrowContract.taskExists(taskId);
      return {
        exists,
        taskId: taskId.toString()
      };
    } catch (error) {
      throw new ContractError(`Failed to check task existence: ${error.message}`, this.contractAddress, error);
    }
  }

  /**
   * Gets ERC20 token information
   * @param {string} tokenAddress - Token contract address
   * @returns {Promise<Object>} Token information
   */
  async getTokenInfo(tokenAddress) {
    validateAddress(tokenAddress, 'tokenAddress');

    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider);

      const [name, symbol, decimals] = await Promise.all([
        tokenContract.name().catch(() => 'Unknown'),
        tokenContract.symbol().catch(() => 'UNKNOWN'),
        tokenContract.decimals().catch(() => 18)
      ]);

      return { name, symbol, decimals, address: tokenAddress };
    } catch (error) {
      throw new ContractError(`Failed to get token info: ${error.message}`, tokenAddress, error);
    }
  }

  /**
   * Gets token balance for an address
   * @param {string} tokenAddress - Token contract address
   * @param {string} [address] - Address to check balance for (defaults to current signer)
   * @returns {Promise<Object>} Balance information
   */
  async getTokenBalance(tokenAddress, address = null) {
    validateAddress(tokenAddress, 'tokenAddress');

    try {
      if (!address) {
        const signer = await this._ensureSigner();
        address = await signer.getAddress();
      } else {
        validateAddress(address, 'address');
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider);
      const [balance, decimals, symbol] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.decimals().catch(() => 18),
        tokenContract.symbol().catch(() => 'TOKEN')
      ]);

      return {
        amountRaw: balance.toString(),
        amountFormatted: formatAmount(balance, decimals),
        decimals,
        symbol,
        address: tokenAddress
      };
    } catch (error) {
      throw new ContractError(`Failed to get token balance: ${error.message}`, tokenAddress, error);
    }
  }

  /**
   * Gets token allowance for the escrow contract
   * @param {string} tokenAddress - Token contract address
   * @param {string} [ownerAddress] - Owner address (defaults to current signer)
   * @returns {Promise<Object>} Allowance information
   */
  async getTokenAllowance(tokenAddress, ownerAddress = null) {
    validateAddress(tokenAddress, 'tokenAddress');

    try {
      if (!ownerAddress) {
        const signer = await this._ensureSigner();
        ownerAddress = await signer.getAddress();
      } else {
        validateAddress(ownerAddress, 'ownerAddress');
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider);
      const [allowance, decimals, symbol] = await Promise.all([
        tokenContract.allowance(ownerAddress, this.contractAddress),
        tokenContract.decimals().catch(() => 18),
        tokenContract.symbol().catch(() => 'TOKEN')
      ]);

      return {
        amountRaw: allowance.toString(),
        amountFormatted: formatAmount(allowance, decimals),
        decimals,
        symbol,
        spender: this.contractAddress,
        owner: ownerAddress
      };
    } catch (error) {
      throw new ContractError(`Failed to get token allowance: ${error.message}`, tokenAddress, error);
    }
  }

  /**
   * Approves tokens for the escrow contract
   * @param {string} tokenAddress - Token contract address
   * @param {string|number} amount - Amount to approve (in token units)
   * @param {Object} [options] - Transaction options
   * @returns {Promise<Object>} Approval result
   */
  async approveToken(tokenAddress, amount, options = {}) {
    this._ensureWriteMode();
    validateAddress(tokenAddress, 'tokenAddress');
    validateAmount(amount, 'amount');

    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider);
      const decimals = await tokenContract.decimals();
      const parsedAmount = parseAmount(amount, decimals);

      const signer = await this._ensureSigner();
      const signedTokenContract = tokenContract.connect(signer);

      const tx = await signedTokenContract.approve(this.contractAddress, parsedAmount, {
        gasLimit: options.gasLimit || this.config.gasLimit,
        ...options
      });

      const receipt = await waitForTransaction(
        this.provider,
        tx.hash,
        this.config.confirmations,
        this.config.timeout
      );

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
        approvedAmount: formatAmount(parsedAmount, decimals)
      };

    } catch (error) {
      throw new ContractError(`Failed to approve token: ${error.message}`, tokenAddress, error);
    }
  }

  /**
   * Gets current network information
   * @returns {Promise<Object>} Network information
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      const networkConfig = getNetworkByChainId(chainId);

      return {
        chainId,
        name: network.name || networkConfig?.name || 'Unknown',
        supported: isSupportedNetwork(chainId),
        config: networkConfig
      };
    } catch (error) {
      throw new NetworkError(`Failed to get network info: ${error.message}`, error);
    }
  }

  /**
   * Gets current account information
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo() {
    try {
      const signer = await this._ensureSigner();
      const address = await signer.getAddress();
      const balance = await this.provider.getBalance(address);

      // Get network info to determine native currency symbol
      const networkInfo = await this.getNetworkInfo();
      const nativeSymbol = networkInfo.config?.nativeCurrency?.symbol || 'ETH';

      return {
        address,
        balance: {
          amountRaw: balance.toString(),
          amountFormatted: formatAmount(balance, 18),
          symbol: nativeSymbol
        }
      };
    } catch (error) {
      throw new MyceliumError(`Failed to get account info: ${error.message}`, error);
    }
  }

  /**
   * Event parsing helpers
   * @private
   */
  _parseTaskCreatedEvent(args) {
    const [taskId, client, agent, token, requestedAmount, actualAmount, metadataHash, event] = args;
    return {
      taskId: taskId.toString(),
      client,
      agent,
      token,
      requestedAmount: requestedAmount.toString(),
      actualAmount: actualAmount.toString(),
      metadataHash,
      metadata: parseTaskMetadata(metadataHash),
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    };
  }

  _parsePaymentApprovedEvent(args) {
    const [taskId, event] = args;
    return {
      taskId: taskId.toString(),
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    };
  }

  _parsePaymentClaimedEvent(args) {
    const [taskId, amount, event] = args;
    return {
      taskId: taskId.toString(),
      amount: amount.toString(),
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    };
  }

  _parseTaskCancelledEvent(args) {
    const [taskId, event] = args;
    return {
      taskId: taskId.toString(),
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    };
  }

  /**
   * Common helper for task operations (approve, claim, cancel)
   * @private
   */
  async _executeTaskOperation(taskId, operationName, validationFn, contractMethodName, options = {}) {
    this._ensureWriteMode();
    validateTaskId(taskId);

    try {
      // Get task info and validate
      const task = await this.getTask(taskId);
      const signer = await this._ensureSigner();
      const signerAddress = await signer.getAddress();

      // Run operation-specific validation
      validationFn(task, signerAddress);

      // Execute transaction
      const contract = await this._getSignedContract();
      const tx = await contract[contractMethodName](taskId, {
        gasLimit: options.gasLimit || this.config.gasLimit,
        ...options
      });

      // Wait for confirmation
      const receipt = await waitForTransaction(
        this.provider,
        tx.hash,
        this.config.confirmations,
        this.config.timeout
      );

      return {
        taskId: taskId.toString(),
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString()
      };

    } catch (error) {
      if (error instanceof MyceliumError) {
        throw error;
      }
      throw new ContractError(`Failed to ${operationName}: ${error.message}`, this.contractAddress, error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Mark as destroyed first to prevent new operations
    this._destroyed = true;

    // Clean up contract event listeners
    if (this.escrowContract) {
      try {
        this.escrowContract.removeAllListeners();
      } catch (error) {
        // Silent cleanup - RPC errors during cleanup are expected
      }
    }

    // Clean up SDK event listeners
    this.removeAllListeners();

    // Clean up any timers or intervals
    if (this._cleanupTasks) {
      this._cleanupTasks.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          // Silent cleanup - don't throw during destruction
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error during cleanup:', error);
          }
        }
      });
      this._cleanupTasks = [];
    }

    // Clean up provider connections if possible
    if (this.provider && typeof this.provider.destroy === 'function') {
      try {
        this.provider.destroy();
      } catch (error) {
        // Silent cleanup
      }
    }
  }

  /**
   * Register a cleanup task to be executed on destroy
   * @private
   */
  _registerCleanup(cleanupFn) {
    if (!this._cleanupTasks) {
      this._cleanupTasks = [];
    }
    this._cleanupTasks.push(cleanupFn);
  }

  /**
   * Check if SDK has been destroyed
   * @private
   */
  _ensureNotDestroyed() {
    if (this._destroyed) {
      throw new MyceliumError('SDK has been destroyed. Create a new instance to continue.');
    }
  }

  /**
   * Static factory methods for easy initialization
   */

  /**
   * Creates SDK instance with private key (for backend/automation)
   * @param {string} privateKey - Private key
   * @param {Object} [options] - Additional options
   * @returns {MyceliumSDK} SDK instance
   */
  static withPrivateKey(privateKey, options = {}) {
    return new MyceliumSDK({
      privateKey,
      ...options
    });
  }

  /**
   * Creates SDK instance with browser provider (for frontend)
   * @param {Object} provider - Browser provider (window.ethereum, etc.)
   * @param {Object} [options] - Additional options
   * @returns {MyceliumSDK} SDK instance
   */
  static withBrowserProvider(provider, options = {}) {
    return new MyceliumSDK({
      provider,
      ...options
    });
  }

  /**
   * Creates SDK instance with custom RPC (read-only)
   * @param {string} rpcUrl - RPC URL
   * @param {Object} [options] - Additional options
   * @returns {MyceliumSDK} SDK instance (read-only)
   */
  static withRPC(rpcUrl, options = {}) {
    return new MyceliumSDK({
      rpcUrl,
      ...options
    });
  }
}