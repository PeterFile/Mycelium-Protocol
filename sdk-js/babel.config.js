/**
 * Babel 配置文件
 * 用于 Jest 测试环境的代码转换
 */

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '16'
        },
        modules: 'commonjs'
      }
    ]
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            },
            modules: 'commonjs'
          }
        ]
      ]
    }
  }
};