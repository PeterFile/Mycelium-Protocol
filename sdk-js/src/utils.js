/**
 * @fileoverview Utility functions for Mycelium Protocol SDK
 */

import { ethers } from 'ethers';
import { ValidationError, NetworkError } from './errors.js';
import { Networks } from './constants.js';

/**
 * Validates an Ethereum address
 * @param {string} address - The address to validate
 * @param {string} fieldName - Name of the field for error reporting
 * @throws {ValidationError} If address is invalid
 */
export function validateAddress(address, fieldName = 'address') {
  if (!address || typeof address !== 'string') {
    throw new ValidationError(`${fieldName} is required and must be a string`, fieldName, address);
  }
  
  if (!ethers.isAddress(address)) {
    throw new ValidationError(`Invalid ${fieldName}: ${address}`, fieldName, address);
  }
  
  if (address === ethers.ZeroAddress) {
    throw new ValidationError(`${fieldName} cannot be zero address`, fieldName, address);
  }
}

/**
 * Validates an amount (must be positive)
 * @param {string|number|BigInt} amount - The amount to validate
 * @param {string} fieldName - Name of the field for error reporting
 * @throws {ValidationError} If amount is invalid
 */
export function validateAmount(amount, fieldName = 'amount') {
  if (amount === null || amount === undefined) {
    throw new ValidationError(`${fieldName} is required`, fieldName, amount);
  }
  
  let parsedAmount;
  try {
    parsedAmount = ethers.parseUnits(amount.toString(), 0); // Parse as wei
  } catch (error) {
    throw new ValidationError(`Invalid ${fieldName} format: ${amount}`, fieldName, amount);
  }
  
  if (parsedAmount <= 0n) {
    throw new ValidationError(`${fieldName} must be greater than zero`, fieldName, amount);
  }
}

/**
 * Validates metadata hash
 * @param {string} metadataHash - The metadata hash to validate
 * @throws {ValidationError} If metadata hash is invalid
 */
export function validateMetadataHash(metadataHash) {
  if (!metadataHash || typeof metadataHash !== 'string') {
    throw new ValidationError('Metadata hash is required and must be a string', 'metadataHash', metadataHash);
  }
  
  if (metadataHash.trim().length === 0) {
    throw new ValidationError('Metadata hash cannot be empty', 'metadataHash', metadataHash);
  }
  
  // Optional: Add more specific validation for IPFS hashes, etc.
  if (metadataHash.length > 1000) {
    throw new ValidationError('Metadata hash is too long (max 1000 characters)', 'metadataHash', metadataHash);
  }
}

/**
 * Validates task ID
 * @param {string|number|BigInt} taskId - The task ID to validate
 * @throws {ValidationError} If task ID is invalid
 */
export function validateTaskId(taskId) {
  if (taskId === null || taskId === undefined) {
    throw new ValidationError('Task ID is required', 'taskId', taskId);
  }
  
  let parsedTaskId;
  try {
    parsedTaskId = BigInt(taskId);
  } catch (error) {
    throw new ValidationError(`Invalid task ID format: ${taskId}`, 'taskId', taskId);
  }
  
  if (parsedTaskId < 0n) {
    throw new ValidationError('Task ID must be non-negative', 'taskId', taskId);
  }
}

/**
 * Validates network configuration
 * @param {Object} network - Network configuration object
 * @throws {ValidationError} If network is invalid
 */
export function validateNetwork(network) {
  if (!network || typeof network !== 'object') {
    throw new ValidationError('Network configuration is required', 'network', network);
  }
  
  const requiredFields = ['chainId', 'name', 'rpcUrl'];
  for (const field of requiredFields) {
    if (!network[field]) {
      throw new ValidationError(`Network ${field} is required`, field, network[field]);
    }
  }
  
  if (typeof network.chainId !== 'number' || network.chainId <= 0) {
    throw new ValidationError('Network chainId must be a positive number', 'chainId', network.chainId);
  }
}

/**
 * Formats an amount for display
 * @param {string|BigInt} amount - Amount in wei
 * @param {number} decimals - Token decimals (default: 18)
 * @param {number} displayDecimals - Number of decimals to show (default: 4)
 * @returns {string} Formatted amount
 */
export function formatAmount(amount, decimals = 18, displayDecimals = 4) {
  try {
    const formatted = ethers.formatUnits(amount, decimals);
    const num = parseFloat(formatted);
    return num.toFixed(displayDecimals).replace(/\.?0+$/, '');
  } catch (error) {
    return '0';
  }
}

/**
 * Parses an amount from human-readable format to wei
 * @param {string|number} amount - Human-readable amount
 * @param {number} decimals - Token decimals (default: 18)
 * @returns {BigInt} Amount in wei
 */
export function parseAmount(amount, decimals = 18) {
  try {
    return ethers.parseUnits(amount.toString(), decimals);
  } catch (error) {
    throw new ValidationError(`Invalid amount format: ${amount}`, 'amount', amount);
  }
}

/**
 * Gets network configuration by chain ID
 * @param {number} chainId - Chain ID
 * @returns {Object|null} Network configuration or null if not found
 */
export function getNetworkByChainId(chainId) {
  return Object.values(Networks).find(network => network.chainId === chainId) || null;
}

/**
 * Checks if a network is supported
 * @param {number} chainId - Chain ID to check
 * @returns {boolean} True if network is supported
 */
export function isSupportedNetwork(chainId) {
  return getNetworkByChainId(chainId) !== null;
}

/**
 * Waits for a transaction to be confirmed
 * @param {Object} provider - Ethers provider
 * @param {string} txHash - Transaction hash
 * @param {number} confirmations - Number of confirmations to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Transaction receipt
 */
export async function waitForTransaction(provider, txHash, confirmations = 2, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt && receipt.confirmations >= confirmations) {
        return receipt;
      }
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new NetworkError(`Transaction ${txHash} timed out after ${timeout}ms`);
}

/**
 * Retries an async function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<*>} Result of the function
 */
export async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Generates a simple task metadata object
 * @param {Object} taskData - Task data
 * @returns {string} JSON string of task metadata
 */
export function generateTaskMetadata(taskData) {
  const metadata = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ...taskData
  };
  
  return JSON.stringify(metadata);
}

/**
 * Parses task metadata from string
 * @param {string} metadataHash - Metadata hash/string
 * @returns {Object|null} Parsed metadata or null if invalid
 */
export function parseTaskMetadata(metadataHash) {
  try {
    // If it looks like JSON, try to parse it
    if (metadataHash.startsWith('{') && metadataHash.endsWith('}')) {
      return JSON.parse(metadataHash);
    }
    
    // Otherwise, return as-is (could be IPFS hash, etc.)
    return { hash: metadataHash };
  } catch (error) {
    return null;
  }
}