// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./LiquidityPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PredictionMarket is Ownable {
    
    struct Bet {
        uint256 amount;
        uint8 outcome; // 0 sau 1
        address bettor;
    }

    mapping(uint256 => Bet[]) public bets; // bets pe eveniment
    LiquidityPool public pool;

    event BetPlaced(uint256 indexed eventId, address indexed bettor, uint256 amount, uint8 outcome);
    event Payout(uint256 indexed eventId, address indexed bettor, uint256 amount);

    constructor (address _pool) Ownable(msg.sender) {
        pool = LiquidityPool(_pool);
    }

    function placeBet(uint256 eventId, uint8 outcome) external payable {
        require(msg.value > 0, "Amount must be > 0");
        bets[eventId].push(Bet(msg.value, outcome, msg.sender));
        emit BetPlaced(eventId, msg.sender, msg.value, outcome);
    }

    // payout simplificat (doar pentru demo)
    function payout(uint256 eventId, uint8 winningOutcome) external onlyOwner {
        Bet[] memory eventBets = bets[eventId];
        for (uint i = 0; i < eventBets.length; i++) {
            if (eventBets[i].outcome == winningOutcome) {
                uint256 prize = eventBets[i].amount * 2; // simplu: dublu
                pool.transfer(eventBets[i].bettor, prize);
                emit Payout(eventId, eventBets[i].bettor, prize);
            }
        }
    }
}