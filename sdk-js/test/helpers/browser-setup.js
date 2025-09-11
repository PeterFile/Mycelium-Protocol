/**
 * 浏览器环境测试设置文件
 * 配置 jsdom 环境和浏览器特定的模拟
 */

// 导入基础设置
require('./test-setup');

// 模拟浏览器 API
Object.defineProperty(window, 'ethereum', {
  writable: true,
  value: {
    isMetaMask: true,
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    selectedAddress: '0x1234567890123456789012345678901234567890',
    chainId: '0x13882', // Polygon Amoy testnet
    networkVersion: '80002'
  }
});

// 模拟 localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// 模拟 sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// 模拟 fetch API
global.fetch = jest.fn();

// 浏览器特定的测试辅助函数
global.browserHelpers = {
  // 模拟 MetaMask 连接
  mockMetaMaskConnect: () => {
    window.ethereum.request.mockImplementation((params) => {
      if (params.method === 'eth_requestAccounts') {
        return Promise.resolve(['0x1234567890123456789012345678901234567890']);
      }
      return Promise.resolve();
    });
    // 触发连接请求以便测试验证
    return window.ethereum.request({ method: 'eth_requestAccounts' });
  },
  
  // 模拟网络切换
  mockNetworkSwitch: (chainId) => {
    window.ethereum.chainId = chainId;
    window.ethereum.networkVersion = parseInt(chainId, 16).toString();
  },
  
  // 重置 ethereum 模拟
  resetEthereumMock: () => {
    window.ethereum.request.mockReset();
    window.ethereum.on.mockReset();
    window.ethereum.removeListener.mockReset();
  }
};