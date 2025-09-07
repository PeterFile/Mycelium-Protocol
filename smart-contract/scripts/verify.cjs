const { run } = require("hardhat");

async function main() {
  const contractAddress = process.argv[2];
  
  if (!contractAddress) {
    console.error("❌ Please provide contract address as argument");
    console.error("Usage: npx hardhat run scripts/verify.cjs --network polygonAmoy <CONTRACT_ADDRESS>");
    process.exit(1);
  }

  console.log("🔍 Verifying contract on Polygonscan...");
  console.log("Contract address:", contractAddress);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [], // TaskEscrowERC20 has no constructor arguments
    });
    
    console.log("✅ Contract verified successfully!");
    console.log(`📋 View on Polygonscan: https://amoy.polygonscan.com/address/${contractAddress}#code`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contract is already verified!");
    } else {
      console.error("❌ Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });