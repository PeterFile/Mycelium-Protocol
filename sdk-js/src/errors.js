/**
 * @fileoverview Custom error classes for Mycelium Protocol SDK
 */

/**
 * Base error class for all Mycelium SDK errors
 */
export class MyceliumError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string|Error} codeOrCause - Error code or original error
   * @param {*} details - Additional error details
   */
  constructor(message, codeOrCause = 'MYCELIUM_ERROR', details = null) {
    super(message);
    this.name = 'MyceliumError';
    this.timestamp = new Date().toISOString();
    
    // Handle both code and original error
    if (codeOrCause instanceof Error) {
      this.code = 'MYCELIUM_ERROR';
      this.cause = codeOrCause;
      this.details = details;
      // Preserve original stack trace
      if (codeOrCause.stack) {
        this.stack = `${this.stack}\nCaused by: ${codeOrCause.stack}`;
      }
    } else {
      this.code = codeOrCause;
      this.details = details;
    }
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
  constructor(message, networkDetailsOrCause = null) {
    if (networkDetailsOrCause instanceof Error) {
      super(message, networkDetailsOrCause);
      this.code = 'NETWORK_ERROR';
    } else {
      super(message, 'NETWORK_ERROR', networkDetailsOrCause);
    }
    this.name = 'NetworkError';
  }
}

/**
 * Smart contract interaction errors
 */
export class ContractError extends MyceliumError {
  constructor(message, contractAddressOrCause = null, transactionHashOrCause = null) {
    // Handle different parameter combinations
    if (contractAddressOrCause instanceof Error) {
      super(message, contractAddressOrCause);
      this.code = 'CONTRACT_ERROR';
    } else if (transactionHashOrCause instanceof Error) {
      super(message, transactionHashOrCause, { contractAddress: contractAddressOrCause });
      this.code = 'CONTRACT_ERROR';
    } else {
      super(message, 'CONTRACT_ERROR', { 
        contractAddress: contractAddressOrCause, 
        transactionHash: transactionHashOrCause 
      });
    }
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