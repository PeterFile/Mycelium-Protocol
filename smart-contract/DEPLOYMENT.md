# TaskEscrowERC20 Deployment Guide

## Prerequisites

1. **Node.js and npm** installed
2. **Hardhat** development environment set up
3. **Polygon Amoy testnet MATIC** in your wallet
4. **Private key** of your deployment wallet

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your actual values
nano .env
```

Required environment variables:
- `POLYGON_AMOY_RPC_URL`: Your Alchemy/Infura RPC URL
- `PRIVATE_KEY`: Your wallet's private key (64 hex characters)
- `POLYGONSCAN_API_KEY`: (Optional) For contract verification

### 3. Get Testnet MATIC
Visit [Polygon Faucet](https://faucet.polygon.technology/) to get free testnet MATIC.

## Deployment Commands

### Deploy to Polygon Amoy Testnet
```bash
npx hardhat run scripts/deploy.cjs --network polygonAmoy
```

### Verify Contract (Optional)
```bash
npx hardhat run scripts/verify.cjs --network polygonAmoy <CONTRACT_ADDRESS>
```

### Run Tests
```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/TaskEscrowERC20.test.js
```

## Deployment Process

The deployment script follows the "获取-部署-等待-打印" pattern:

1. **获取 (Fetch)**: Gets deployer info, balance, and network details
2. **部署 (Deploy)**: Deploys the TaskEscrowERC20 contract
3. **等待 (Wait)**: Waits for deployment confirmation
4. **打印 (Print)**: Displays deployment results and saves info

## Security Notes

⚠️ **IMPORTANT SECURITY REMINDERS**:

- Never commit your `.env` file to git
- Never share your private key
- Use a dedicated deployment wallet
- Verify the contract address after deployment
- Test thoroughly on testnet before mainnet

## Troubleshooting

### Common Issues

1. **"Insufficient funds"**
   - Solution: Get more testnet MATIC from the faucet

2. **"Invalid private key"**
   - Solution: Ensure your private key is 64 hex characters starting with 0x

3. **"Network error"**
   - Solution: Check your RPC URL and internet connection

4. **"Contract verification failed"**
   - Solution: Wait a few minutes and try again, or check your API key

### Getting Help

- Check the Hardhat documentation
- Verify your network configuration
- Ensure all dependencies are installed
- Check the console output for specific error messages

## Post-Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Contract address saved
- [ ] Contract verified on Polygonscan (optional)
- [ ] Basic functionality tested
- [ ] Deployment info saved to file
- [ ] Frontend/SDK updated with new address
- [ ] Team notified of new deployment

## Network Information

**Polygon Amoy Testnet**:
- Chain ID: 80002
- Currency: MATIC
- Explorer: https://amoy.polygonscan.com/
- Faucet: https://faucet.polygon.technology/

## Contract Features

The deployed TaskEscrowERC20 contract includes:
- ✅ Task metadata support for AI agent verification
- ✅ Fee-on-transfer token compatibility
- ✅ Emergency pause/unpause functionality
- ✅ Comprehensive security features
- ✅ Owner-based access control
- ✅ Emergency token recovery