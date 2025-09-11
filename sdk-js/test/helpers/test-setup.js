/**
 * Jest 全局测试设置文件
 * 配置测试环境和全局设置
 */

// 设置测试超时
jest.setTimeout(30000);

// 全局测试配置
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// 模拟环境变量
process.env.NODE_ENV = 'test';

// 全局测试辅助函数
global.testHelpers = {
  // 等待异步操作完成
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // 生成测试用的随机地址
  generateTestAddress: () => '0x' + '1'.repeat(40),
  
  // 生成测试用的私钥
  generateTestPrivateKey: () => '0x' + '2'.repeat(64)
};

// 在每个测试前清理
beforeEach(() => {
  // 清理所有模拟调用
  jest.clearAllMocks();
});

// 在每个测试后清理
afterEach(() => {
  // 清理定时器
  jest.clearAllTimers();
});