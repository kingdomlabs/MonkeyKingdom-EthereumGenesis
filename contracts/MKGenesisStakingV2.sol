// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./MKGenesisStakingV1F.sol";

contract MKGenesisStakingV2 is MKGenesisStakingV1F {
    function stake(
        uint256[] calldata tokenIDs,
        uint256 ts,
        bytes memory sig,
        uint256[] calldata stakingTokenIDs
    ) external override {
        for (uint256 i = 0; i < tokenIDs.length; i++) {
            require(
                mk.ownerOf(tokenIDs[i]) == msg.sender,
                "Owner check failed"
            );
            mk.lock(tokenIDs[i]);
            staked[tokenIDs[i]] = msg.sender;
        }
        for (uint256 i = 0; i < stakingTokenIDs.length; i++) {
            peach.claim(stakingTokenIDs);
            staked[stakingTokenIDs[i]] = msg.sender;
        }
        peach.stake(tokenIDs, ts, sig);
    }

    function claim(uint256[] calldata tokenIDs) public override nonReentrant {
        uint256 sumClaimable;
        for (uint256 i = 0; i < tokenIDs.length; i++) {
            require(
                mk.ownerOf(tokenIDs[i]) == msg.sender,
                "Owner check failed"
            );
            sumClaimable += peach.claimable(tokenIDs[i]);
        }

        peach.claim(tokenIDs);
        peach.transfer(msg.sender, sumClaimable);
    }

    function unstake(
        uint256[] calldata tokenIDs,
        uint256[] calldata positions
    ) external override {
        claim(tokenIDs);
        for (uint256 i = 0; i < tokenIDs.length; i++) {
            mk.unlock(tokenIDs[i], positions[i]);
            staked[tokenIDs[i]] = address(0);
        }
    }
}
