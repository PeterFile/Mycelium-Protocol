// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockFeeToken
 * @dev A mock ERC20 token that charges a fee on transfers (fee-on-transfer token)
 * Used for testing how the escrow contract handles such tokens
 */
contract MockFeeToken is ERC20 {
    uint256 public constant FEE_PERCENTAGE = 5; // 5% fee on transfers
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Override transfer to charge a fee
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        uint256 fee = (amount * FEE_PERCENTAGE) / 100;
        uint256 actualAmount = amount - fee;
        
        // Transfer the actual amount to recipient
        _transfer(_msgSender(), to, actualAmount);
        
        // Burn the fee (or could transfer to a fee collector)
        if (fee > 0) {
            _burn(_msgSender(), fee);
        }
        
        return true;
    }

    /**
     * @dev Override transferFrom to charge a fee
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        uint256 fee = (amount * FEE_PERCENTAGE) / 100;
        uint256 actualAmount = amount - fee;
        
        // Check and update allowance
        uint256 currentAllowance = allowance(from, _msgSender());
        require(currentAllowance >= amount, "ERC20: insufficient allowance");
        _approve(from, _msgSender(), currentAllowance - amount);
        
        // Transfer the actual amount to recipient
        _transfer(from, to, actualAmount);
        
        // Burn the fee
        if (fee > 0) {
            _burn(from, fee);
        }
        
        return true;
    }

    /**
     * @dev Mint tokens to any address (for testing convenience)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}