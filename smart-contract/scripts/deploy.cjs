const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting TaskEscrowERC20 deployment to Polygon Amoy...\n");

  // 获取部署者账户信息
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log("📋 Deployment Information:");
  console.log("├─ Network:", await ethers.provider.getNetwork());
  console.log("├─ Deployer address:", deployerAddress);
  console.log("├─ Deployer balance:", ethers.formatEther(balance), "MATIC");
  console.log("└─ Gas price:", ethers.formatUnits(await ethers.provider.getFeeData().then(f => f.gasPrice), "gwei"), "gwei\n");

  // 检查余额是否足够
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Warning: Low balance detected. You may need more MATIC for deployment.");
  }

  try {
    // 部署 TaskEscrowERC20 合约
    console.log("📦 Deploying TaskEscrowERC20 contract...");
    const TaskEscrowERC20Factory = await ethers.getContractFactory("TaskEscrowERC20");
    
    // 估算部署成本
    const deploymentData = TaskEscrowERC20Factory.interface.encodeDeploy([]);
    const estimatedGas = await ethers.provider.estimateGas({
      data: TaskEscrowERC20Factory.bytecode + deploymentData.slice(2),
    });
    const gasPrice = (await ethers.provider.getFeeData()).gasPrice;
    const estimatedCost = estimatedGas * gasPrice;
    
    console.log("├─ Estimated gas:", estimatedGas.toString());
    console.log("├─ Estimated cost:", ethers.formatEther(estimatedCost), "MATIC");
    
    // 部署合约
    const taskEscrowERC20 = await TaskEscrowERC20Factory.deploy();
    
    console.log("├─ Transaction hash:", taskEscrowERC20.deploymentTransaction().hash);
    console.log("├─ Waiting for deployment confirmation...");
    
    // 等待部署确认
    await taskEscrowERC20.waitForDeployment();
    const contractAddress = await taskEscrowERC20.getAddress();
    
    console.log("✅ TaskEscrowERC20 deployed successfully!");
    console.log("├─ Contract address:", contractAddress);
    console.log("├─ Block number:", taskEscrowERC20.deploymentTransaction().blockNumber);
    console.log("└─ Gas used:", taskEscrowERC20.deploymentTransaction().gasLimit?.toString() || "N/A");

    // 验证合约部署
    console.log("\n🔍 Verifying deployment...");
    const code = await ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error("Contract deployment failed - no code at address");
    }
    console.log("✅ Contract code verified on blockchain");

    // 测试基本功能
    console.log("\n🧪 Testing basic contract functionality...");
    try {
      const owner = await taskEscrowERC20.owner();
      const taskCount = await taskEscrowERC20.getTaskCount();
      console.log("├─ Contract owner:", owner);
      console.log("├─ Initial task count:", taskCount.toString());
      console.log("└─ Contract is functional ✅");
    } catch (error) {
      console.log("⚠️  Warning: Could not verify contract functionality:", error.message);
    }

    // 保存部署信息
    const deploymentInfo = {
      network: "polygonAmoy",
      chainId: 80002,
      contractName: "TaskEscrowERC20",
      contractAddress: contractAddress,
      deployerAddress: deployerAddress,
      transactionHash: taskEscrowERC20.deploymentTransaction().hash,
      blockNumber: taskEscrowERC20.deploymentTransaction().blockNumber,
      timestamp: new Date().toISOString(),
      gasUsed: taskEscrowERC20.deploymentTransaction().gasLimit?.toString() || "N/A",
      constructorArgs: [], // No constructor arguments for this contract
    };

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `TaskEscrowERC20-polygonAmoy-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📄 Deployment information saved to:", deploymentFile);

    // 打印最终总结
    console.log("\n🎉 Deployment Summary:");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("Contract Name:     TaskEscrowERC20");
    console.log("Network:           Polygon Amoy Testnet");
    console.log("Contract Address: ", contractAddress);
    console.log("Explorer URL:     ", `https://amoy.polygonscan.com/address/${contractAddress}`);
    console.log("Transaction:      ", `https://amoy.polygonscan.com/tx/${taskEscrowERC20.deploymentTransaction().hash}`);
    console.log("═══════════════════════════════════════════════════════════");
    
    console.log("\n📝 Next Steps:");
    console.log("1. Verify the contract on Polygonscan (optional):");
    console.log(`   npx hardhat verify --network polygonAmoy ${contractAddress}`);
    console.log("2. Update your frontend/SDK with the new contract address");
    console.log("3. Test the contract functionality on the testnet");
    console.log("4. Consider setting up monitoring for the contract");

  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error("Error:", error.message);
    
    if (error.code === "INSUFFICIENT_FUNDS") {
      console.error("\n💡 Solution: Add more MATIC to your wallet");
      console.error("   Get testnet MATIC from: https://faucet.polygon.technology/");
    } else if (error.code === "NETWORK_ERROR") {
      console.error("\n💡 Solution: Check your RPC URL and network connection");
    }
    
    process.exit(1);
  }
}

// 错误处理
main()
  .then(() => {
    console.log("\n✨ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unexpected error:", error);
    process.exit(1);
  });