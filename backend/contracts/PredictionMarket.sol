// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./LiquidityPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ISportsOracle {
    function getResult(uint256 eventId) external view returns (uint8);
}

contract PredictionMarket is Ownable {
    struct Bet {
        uint256 amount;
        uint8 outcome;
        address bettor;
        bool paid;
    }

    mapping(uint256 => Bet[]) public bets;

    LiquidityPool public pool;
    ISportsOracle public sportsOracle;

    event BetPlaced(
        uint256 indexed eventId,
        address indexed bettor,
        uint256 amount,
        uint8 outcome
    );
    event Payout(
        uint256 indexed eventId,
        address indexed bettor,
        uint256 amount
    );
    event SportsOracleSet(address oracle);

    constructor(address payable _pool) Ownable(msg.sender) {
        pool = LiquidityPool(_pool);
    }

    function setSportsOracle(address _oracle) external onlyOwner {
        sportsOracle = ISportsOracle(_oracle);
        emit SportsOracleSet(_oracle);
    }

    function placeBet(uint256 eventId, uint8 outcome) external payable {
        require(msg.value > 0, "Amount must be > 0");

        bets[eventId].push(
            Bet({
                amount: msg.value,
                outcome: outcome,
                bettor: msg.sender,
                paid: false
            })
        );

        emit BetPlaced(eventId, msg.sender, msg.value, outcome);
    }

    function resolveEvent(uint256 eventId) external {
        uint8 winningOutcome = sportsOracle.getResult(eventId);
        _payWinners(eventId, winningOutcome);
    }

    function _payWinners(uint256 eventId, uint8 winningOutcome) internal {
        Bet[] storage eventBets = bets[eventId];

        for (uint256 i = 0; i < eventBets.length; i++) {
            Bet storage b = eventBets[i];

            if (!b.paid && b.outcome == winningOutcome) {
                uint256 prize = calculatePotentialPrize(b.amount, 2);

                pool.payout(b.bettor, prize);

                b.paid = true;
                emit Payout(eventId, b.bettor, prize);
            }
        }
    }

    function calculatePotentialPrize(uint256 betAmount, uint8 multiplier) public pure returns (uint256) {
        require(betAmount > 0, "Bet must be > 0");
        require(multiplier > 0, "Multiplier must be > 0");

        return betAmount * multiplier;
    }
}
