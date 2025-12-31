// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./LiquidityPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PredictionMarket is Ownable {

    struct Bet {
        uint256 amount;
        uint8 outcome;
        address bettor;
        bool paid;
    }

    mapping(uint256 => Bet[]) public bets;

    LiquidityPool public pool;
    address public oracle;

    event BetPlaced(uint256 indexed eventId, address indexed bettor, uint256 amount, uint8 outcome);
    event Payout(uint256 indexed eventId, address indexed bettor, uint256 amount);
    event OracleSet(address oracle);

    constructor(address _pool) Ownable(msg.sender){
        pool = LiquidityPool(_pool);
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
        emit OracleSet(_oracle);
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not authorized");
        _;
    }

    function placeBet(uint256 eventId, uint8 outcome) external payable {
        require(msg.value > 0, "Amount must be > 0");
        bets[eventId].push(Bet(msg.value, outcome, msg.sender, false));
        emit BetPlaced(eventId, msg.sender, msg.value, outcome);
    }

    function setWinningOutcome(uint256 eventId, uint8 winningOutcome) external onlyOracle {
        Bet[] storage eventBets = bets[eventId];
        for (uint i = 0; i < eventBets.length; i++) {
            Bet storage b = eventBets[i];
            if (!b.paid && b.outcome == winningOutcome) {
                uint256 prize = b.amount * 2;
                pool.transfer(b.bettor, prize);
                b.paid = true;
                emit Payout(eventId, b.bettor, prize);
            }
        }
    }
}