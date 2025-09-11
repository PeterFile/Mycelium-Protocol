# Mycelium Protocol JavaScript SDK 测试指南

## 概述

本目录包含 Mycelium Protocol JavaScript SDK 的完整测试套件，包括单元测试、集成测试、性能测试和浏览器环境测试。

## 测试结构

```
test/
├── unit/                    # 单元测试
├── integration/             # 集成测试
├── performance/             # 性能测试
├── browser/                 # 浏览器环境测试
├── fixtures/                # 测试数据和模拟数据
└── helpers/                 # 测试辅助工具
    ├── test-setup.js        # Node.js 环境测试设置
    └── browser-setup.js     # 浏览器环境测试设置
```

## 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

### 分类测试

```bash
# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行性能测试
npm run test:performance

# 运行浏览器环境测试
npm run test:browser

# CI 环境测试（无监视模式）
npm run test:ci
```

## 测试环境

### Node.js 环境
- 用于单元测试、集成测试和性能测试
- 支持 ES6+ 语法和异步操作
- 包含 ethers.js 模拟和区块链交互测试

### 浏览器环境 (jsdom)
- 用于浏览器特定功能测试
- 模拟 MetaMask 和其他浏览器 Provider
- 包含 localStorage、sessionStorage 等浏览器 API 模拟

## 覆盖率要求

- **整体覆盖率**: ≥90%
- **核心模块覆盖率**: ≥95%
- **覆盖率报告**: 生成在 `coverage/` 目录
- **HTML 报告**: 打开 `coverage/index.html` 查看详细报告

## 测试辅助工具

### 全局辅助函数 (testHelpers)

```javascript
// 等待异步操作
await global.testHelpers.waitFor(1000);

// 生成测试地址
const address = global.testHelpers.generateTestAddress();

// 生成测试私钥
const privateKey = global.testHelpers.generateTestPrivateKey();
```

### 浏览器辅助函数 (browserHelpers)

```javascript
// 模拟 MetaMask 连接
await global.browserHelpers.mockMetaMaskConnect();

// 模拟网络切换
global.browserHelpers.mockNetworkSwitch('0x1');

// 重置 ethereum 模拟
global.browserHelpers.resetEthereumMock();
```

## 编写测试

### 单元测试示例

```javascript
describe('MyModule', () => {
  test('should perform basic operation', () => {
    // 测试逻辑
    expect(result).toBe(expected);
  });

  test('should handle async operations', async () => {
    const result = await asyncFunction();
    expect(result).toBeDefined();
  });
});
```

### 集成测试示例

```javascript
describe('Contract Integration', () => {
  test('should interact with real contract', async () => {
    // 使用真实网络进行测试
    const sdk = new MyceliumSDK(config);
    const result = await sdk.someOperation();
    expect(result).toBeTruthy();
  });
});
```

### 浏览器测试示例

```javascript
describe('Browser Features', () => {
  test('should work with MetaMask', async () => {
    // 模拟浏览器环境
    global.browserHelpers.mockMetaMaskConnect();
    const provider = window.ethereum;
    expect(provider.isMetaMask).toBe(true);
  });
});
```

## 配置文件

### jest.config.js
- Jest 主配置文件
- 定义测试环境、覆盖率阈值、文件匹配模式
- 配置多项目支持（Node.js 和浏览器）

### babel.config.js
- Babel 转换配置
- 支持 ES6+ 语法转换
- 针对测试环境优化

## 最佳实践

1. **测试命名**: 使用描述性的测试名称
2. **测试隔离**: 每个测试应该独立运行
3. **模拟使用**: 适当使用 Mock 减少外部依赖
4. **异步处理**: 正确处理 Promise 和 async/await
5. **覆盖率目标**: 确保关键路径有充分的测试覆盖

## 故障排除

### 常见问题

1. **测试超时**: 检查异步操作是否正确处理
2. **模拟失效**: 确保在每个测试后清理模拟状态
3. **覆盖率不足**: 检查是否有未测试的代码路径
4. **环境问题**: 确认测试环境配置正确

### 调试技巧

```bash
# 运行单个测试文件
npm test -- test/unit/specific.test.js

# 启用详细输出
npm test -- --verbose

# 运行特定测试用例
npm test -- --testNamePattern="specific test name"
```

## 持续集成

测试配置已准备好与 CI/CD 系统集成：

- 使用 `npm run test:ci` 进行 CI 环境测试
- 覆盖率报告自动生成
- 支持多 Node.js 版本测试矩阵