/**
 * TypeScript type definitions for Mycelium Protocol SDK
 * 
 * This file provides type definitions for TypeScript users while keeping
 * the main SDK implementation in JavaScript for broader compatibility.
 */

export interface TaskCreationParams {
  agentAddress: string;
  tokenAddress: string;
  amount: string | number;
  metadata: string | object;
  options?: TransactionOptions & {
    autoApprove?: boolean;
  };
}

export interface TransactionOptions {
  estimateGas?: boolean;
  gasLimit?: number;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface TaskCreationResult {
  taskId: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  effectiveGasPrice: string;
  metadata: object;
  gasEstimated: boolean;
  approvalTransaction?: ApprovalTransaction;
}

export interface ApprovalTransaction {
  transactionHash: string;
  approvedAmount: string;
  gasUsed: string;
}

export interface TaskInfo {
  id: string;
  client: string;
  agent: string;
  token: string;
  amount: string;
  status: number;
  metadataHash: string;
  metadata: object;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
}

export interface TokenBalance {
  amountRaw: string;
  amountFormatted: string;
  decimals: number;
  symbol: string;
  address: string;
}

export interface NetworkInfo {
  chainId: number;
  name: string;
  supported: boolean;
  config: NetworkConfig;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface AccountInfo {
  address: string;
  balance: {
    amountRaw: string;
    amountFormatted: string;
    symbol: string;
  };
}

export declare class MyceliumSDK {
  constructor(config: any);
  
  // Static factory methods
  static withPrivateKey(privateKey: string, options?: any): MyceliumSDK;
  static withBrowserProvider(provider: any, options?: any): MyceliumSDK;
  static withRPC(rpcUrl: string, options?: any): MyceliumSDK;
  
  // Core methods
  createTask(params: TaskCreationParams): Promise<TaskCreationResult>;
  approvePayment(taskId: string | number, options?: TransactionOptions): Promise<any>;
  claimPayment(taskId: string | number, options?: TransactionOptions): Promise<any>;
  cancelTask(taskId: string | number, options?: TransactionOptions): Promise<any>;
  
  // Token methods
  checkAndApproveToken(tokenAddress: string, amount: string | number, options?: any): Promise<any>;
  approveToken(tokenAddress: string, amount: string | number, options?: TransactionOptions): Promise<any>;
  getTokenInfo(tokenAddress: string): Promise<TokenInfo>;
  getTokenBalance(tokenAddress: string, address?: string): Promise<TokenBalance>;
  getTokenAllowance(tokenAddress: string, ownerAddress?: string): Promise<any>;
  
  // Query methods
  getTask(taskId: string | number): Promise<TaskInfo>;
  getTaskCount(): Promise<{ count: string }>;
  taskExists(taskId: string | number): Promise<{ exists: boolean; taskId: string }>;
  
  // Network methods
  getNetworkInfo(): Promise<NetworkInfo>;
  getAccountInfo(): Promise<AccountInfo>;
  
  // Lifecycle
  destroy(): void;
  
  // Events
  on(event: string, listener: Function): this;
  off(event: string, listener: Function): this;
  emit(event: string, ...args: any[]): boolean;
}

// Error classes
export declare class MyceliumError extends Error {
  code: string;
  details: any;
  timestamp: string;
  cause?: Error;
}

export declare class ValidationError extends MyceliumError {
  constructor(message: string, field?: string, value?: any);
}

export declare class NetworkError extends MyceliumError {
  constructor(message: string, networkDetails?: any);
}

export declare class ContractError extends MyceliumError {
  constructor(message: string, contractAddress?: string, transactionHash?: string);
}

export declare class InsufficientFundsError extends MyceliumError {
  constructor(required: string, available: string, token?: string);
}

// Constants
export declare const TaskStatus: {
  CREATED: 0;
  APPROVED: 1;
  PAID: 2;
  CANCELLED: 3;
};

export declare const Networks: {
  POLYGON_MAINNET: NetworkConfig;
  POLYGON_AMOY: NetworkConfig;
};

export declare const Events: {
  TASK_CREATED: string;
  PAYMENT_APPROVED: string;
  PAYMENT_CLAIMED: string;
  TASK_CANCELLED: string;
  ERROR: string;
};