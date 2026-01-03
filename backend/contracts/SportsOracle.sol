// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SportsOracle is Ownable {
    mapping(uint256 => bool) public resolved;

    mapping(uint256 => uint8) private results;

    event ResultUpdated(uint256 indexed eventId, uint8 outcome);

    constructor() Ownable(msg.sender) {}

    function setResultFromApi(uint256 eventId, uint8 outcome) external onlyOwner {
        require(!resolved[eventId], "Already resolved");
        require(outcome <= 2, "Invalid outcome");

        results[eventId] = outcome;
        resolved[eventId] = true;

        emit ResultUpdated(eventId, outcome);
    }

    function getResult(uint256 eventId) external view returns (uint8) {
        require(resolved[eventId], "Result not set yet");
        return results[eventId];
    }
}
