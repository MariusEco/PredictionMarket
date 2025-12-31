// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LiquidityPool is Ownable {
    constructor() Ownable(msg.sender) {}
    
    mapping(address => uint) public balances;
    uint public totalLiquidity;

    address public predictionMarket;

    event Deposited(address indexed user, uint amount);
    event Withdrawn(address indexed user, uint amount);
    event Transferred(address indexed to, uint amount);

    modifier hasBalance(address user) {
        require(balances[user] > 0, "No balance to withdraw");
        _;
    }

    modifier onlyOwnerOrPM() {
        require(msg.sender == owner() || msg.sender == predictionMarket, "Not allowed");
        _;
    }

    function setPredictionMarket(address _pm) external onlyOwner {
        predictionMarket = _pm;
    }

    function deposit() external payable {
        require(msg.value > 0, "Must deposit > 0");
        balances[msg.sender] += msg.value;
        totalLiquidity += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint amount) external hasBalance(msg.sender) {
        require(amount <= balances[msg.sender], "Not enough balance");
        balances[msg.sender] -= amount;
        totalLiquidity -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    function transfer(address to, uint amount) external onlyOwnerOrPM {
        require(amount <= totalLiquidity, "Not enough liquidity");
        totalLiquidity -= amount;
        payable(to).transfer(amount);
        emit Transferred(to, amount);
    }

    function getBalance(address user) external view returns (uint) {
        return balances[user];
    }
}