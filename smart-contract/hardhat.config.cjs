// 使用 require 导入，因为这是 .cjs (CommonJS) 文件
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20", // 你可以根据你的 pragma 更新这个版本号
};