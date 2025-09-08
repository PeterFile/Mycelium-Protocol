/**
 * @fileoverview Constants and enums for Mycelium Protocol SDK
 */

/**
 * Task status enumeration
 * @readonly
 * @enum {number}
 */
export const TaskStatus = {
  /** Task has been created and funds are locked */
  CREATED: 0,
  /** Client has approved the task completion */
  APPROVED: 1,
  /** Agent has claimed the payment */
  PAID: 2,
  /** Task has been cancelled and funds refunded */
  CANCELLED: 3
};

/**
 * Supported networks configuration
 * @readonly
 * @enum {Object}
 */
export const Networks = {
  POLYGON_MAINNET: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  POLYGON_AMOY: {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://amoy.polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  }
};

/**
 * Contract addresses for different networks
 * @readonly
 * @enum {Object}
 */
export const ContractAddresses = {
  [Networks.POLYGON_AMOY.chainId]: {
    TaskEscrowERC20: '0x9815231475dEEB0588E86A0B1FbD5E6aAEd90987'
  },
  [Networks.POLYGON_MAINNET.chainId]: {
    TaskEscrowERC20: null // To be deployed
  }
};

/**
 * Event names emitted by the SDK
 * @readonly
 * @enum {string}
 */
export const Events = {
  TASK_CREATED: 'taskCreated',
  PAYMENT_APPROVED: 'paymentApproved',
  PAYMENT_CLAIMED: 'paymentClaimed',
  TASK_CANCELLED: 'taskCancelled',
  ERROR: 'error'
};

/**
 * Default configuration values
 * @readonly
 * @enum {*}
 */
export const Defaults = {
  GAS_LIMIT: 500000,
  GAS_PRICE_MULTIPLIER: 1.1,
  CONFIRMATION_BLOCKS: 2,
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000
};