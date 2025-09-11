/**
 * Jest 配置文件
 * 为 Mycelium Protocol JavaScript SDK 配置测试环境
 */

module.exports = {
  // 测试环境配置 - 默认使用 Node.js 环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/test/**/*.spec.js'
  ],

  // 忽略的测试文件路径
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // 覆盖率收集配置 - 默认关闭，通过命令行参数启用
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/types.d.ts'
  ],

  // 覆盖率阈值设置 - 要求90%以上覆盖率
  // 注意：只有在实际运行测试时才会应用这些阈值
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // 覆盖率输出目录
  coverageDirectory: 'coverage',

  // 测试设置文件
  setupFilesAfterEnv: [
    '<rootDir>/test/helpers/test-setup.js'
  ],

  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // 支持的文件扩展名
  moduleFileExtensions: [
    'js',
    'json'
  ],

  // 转换配置 - 使用 Babel 转换 ES6+ 代码
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // 不转换的模块
  transformIgnorePatterns: [
    '/node_modules/(?!(ethers)/)'
  ],

  // 测试超时设置 (30秒)
  testTimeout: 30000,

  // 详细输出
  verbose: true,

  // 没有测试时通过
  passWithNoTests: true,

  // 清除模拟调用和实例
  clearMocks: true,

  // 每次测试前重置模拟状态
  resetMocks: true,

  // 每次测试前恢复模拟状态
  restoreMocks: true,

  // 全局变量配置
  globals: {
    'process.env.NODE_ENV': 'test'
  },

  // 多环境配置项目
  projects: [
    // Node.js 环境配置
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/test/unit/**/*.test.js',
        '<rootDir>/test/integration/**/*.test.js',
        '<rootDir>/test/performance/**/*.test.js'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/test/helpers/test-setup.js'
      ],
      transform: {
        '^.+\\.js$': 'babel-jest'
      },
      collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/**/*.spec.js',
        '!src/types.d.ts'
      ]
    },
    // 浏览器环境配置 (使用 jsdom)
    {
      displayName: 'browser',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/test/browser/**/*.test.js'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/test/helpers/browser-setup.js'
      ],
      transform: {
        '^.+\\.js$': 'babel-jest'
      }
    }
  ]
};