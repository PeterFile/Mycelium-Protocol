/**
 * @fileoverview Custom error classes for Mycelium Protocol SDK
 */

/**
 * Base error class for all Mycelium SDK errors
 */
export class MyceliumError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {*} details - Additional error details
   */
  constructor(message, code = 'MYCELIUM_ERROR', details = null) {
    super(message);
    this.name = 'MyceliumError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Validation error for invalid inputs
 */
export class ValidationError extends MyceliumError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends MyceliumError {
  constructor(message, networkDetails = null) {
    super(message, 'NETWORK_ERROR', networkDetails);
    this.name = 'NetworkError';
  }
}

/**
 * Smart contract interaction errors
 */
export class ContractError extends MyceliumError {
  constructor(message, contractAddress = null, transactionHash = null) {
    super(message, 'CONTRACT_ERROR', { contractAddress, transactionHash });
    this.name = 'ContractError';
  }
}

/**
 * Insufficient funds error
 */
export class InsufficientFundsError extends MyceliumError {
  constructor(required, available, token = 'ETH') {
    const message = `Insufficient ${token} balance. Required: ${required}, Available: ${available}`;
    super(message, 'INSUFFICIENT_FUNDS', { required, available, token });
    this.name = 'InsufficientFundsError';
  }
}

/**
 * Transaction timeout error
 */
export class TransactionTimeoutError extends MyceliumError {
  constructor(transactionHash, timeoutMs) {
    const message = `Transaction ${transactionHash} timed out after ${timeoutMs}ms`;
    super(message, 'TRANSACTION_TIMEOUT', { transactionHash, timeoutMs });
    this.name = 'TransactionTimeoutError';
  }
}