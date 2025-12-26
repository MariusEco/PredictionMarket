// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LiquidityPool is Ownable {

    constructor() Ownable(msg.sender) {}
    // Mapping pentru fiecare utilizator -> balanța lui în pool
    mapping(address => uint) public balances;

    // Total ETH în pool
    uint public totalLiquidity;

    // Events
    event Deposited(address indexed user, uint amount);
    event Withdrawn(address indexed user, uint amount);

    // Modifiers
    modifier hasBalance(address user) {
        require(balances[user] > 0, "No balance to withdraw");
        _;
    }

    // Deposit ETH în pool
    function deposit() external payable {
        require(msg.value > 0, "Must deposit > 0");
        balances[msg.sender] += msg.value;
        totalLiquidity += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    // Withdraw ETH din pool (Withdrawal Pattern)
    function withdraw(uint amount) external hasBalance(msg.sender) {
        require(amount <= balances[msg.sender], "Not enough balance");

        balances[msg.sender] -= amount;
        totalLiquidity -= amount;

        // transfer
        payable(msg.sender).transfer(amount);

        emit Withdrawn(msg.sender, amount);
    }

    function transfer(address to, uint amount) external onlyOwner {
        require(amount <= totalLiquidity, "Not enough liquidity");
        payable(to).transfer(amount);
    }

    // Functie view pentru balanța unui utilizator
    function getBalance(address user) external view returns (uint) {
        return balances[user];
    }

    // Functie pure simplă pentru exemplu
    function double(uint x) external pure returns (uint) {
        return x * 2;
    }
}