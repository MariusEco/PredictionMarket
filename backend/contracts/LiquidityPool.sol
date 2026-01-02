// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LiquidityPool is Ownable {

    mapping(address => uint256) private balances;
    uint256 public totalLiquidity;
    address public predictionMarket;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event PayoutExecuted(address indexed to, uint256 amount);

    constructor() Ownable(msg.sender) {}

    modifier onlyPredictionMarket() {
        require(msg.sender == predictionMarket, "Only PredictionMarket");
        _;
    }

    function setPredictionMarket(address _pm) external onlyOwner {
        predictionMarket = _pm;
    }

    function deposit() external payable {
        require(msg.value > 0, "Zero deposit");

        balances[msg.sender] += msg.value;
        totalLiquidity += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Zero withdraw");
        require(balances[msg.sender] >= amount, "Not enough deposited");

        balances[msg.sender] -= amount;
        totalLiquidity -= amount;

        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Withdraw failed");

        emit Withdrawn(msg.sender, amount);
    }

    function payout(address to, uint256 amount) external onlyPredictionMarket {
        require(address(this).balance >= amount, "Insufficient liquidity");

        totalLiquidity -= amount;

        (bool success,) = to.call{value: amount}("");
        require(success, "Payout failed");

        emit PayoutExecuted(to, amount);
    }

    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    receive() external payable {}
}