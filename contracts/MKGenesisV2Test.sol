// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./MKGenesisV1.sol";
import "./OperatorFiltererUpgradeable.sol";
import {CANONICAL_OPERATOR_FILTER_REGISTRY_ADDRESS} from "operator-filter-registry/src/lib/Constants.sol";

/*
                       j╫╫╫╫╫╫ ]╫╫╫╫╫H                                          
                        ```╫╫╫ ]╫╫````                                          
    ▄▄▄▄      ▄▄▄▄  ÑÑÑÑÑÑÑ╫╫╫ ]╫╫ÑÑÑÑÑÑÑH ▄▄▄▄                                 
   ▐████      ████⌐ `````````` ``````````  ████▌                                
   ▐█████▌  ▐█████⌐▐██████████ ╫█████████▌ ████▌▐████ ▐██████████ ████▌ ████▌   
   ▐██████████████⌐▐████Γ▐████ ╫███▌└████▌ ████▌ ████ ▐████│█████ ████▌ ████▌   
   ▐████▀████▀████⌐▐████ ▐████ ╫███▌ ████▌ █████████▄ ▐██████████ ████▌ ████▌   
   ▐████ ▐██▌ ████⌐▐████ ▐████ ╫███▌ ████▌ ████▌▐████ ▐████│││││└ ██████████▌   
   ▐████      ████⌐▐██████████ ╫███▌ ████▌ ████▌▐████ ▐██████████ ▀▀▀▀▀▀████▌   
    ''''      ''''  '''''''''' `'''  `'''  ''''  ''''  '''''''''` ██████████▌   
╓╓╓╓  ╓╓╓╓  ╓╓╓╓                              .╓╓╓╓               ▀▀▀▀▀▀▀▀▀▀Γ   ===
████▌ ████=▐████                              ▐████                             
████▌ ████= ▄▄▄▄ ▐█████████▌ ██████████▌▐██████████ ║█████████▌ ███████▌▄███████
█████▄███▀ ▐████ ▐████▀████▌ ████▌▀████▌▐████▀▀████ ║████▀████▌ ████▌▀████▀▀████
█████▀████⌐▐████ ▐████ ╫███▌ ████▌ ████▌▐████ ▐████ ║████ ████▌ ████▌ ████=▐████
████▌ ████=▐████ ▐████ ╫███▌ █████▄████▌▐████ ▐████ ║████ ████▌ ████▌ ████=▐████
████▌ ████=▐████ ▐████ ╫███▌ ▀▀▀▀▀▀████▌▐██████████ ║█████████▌ ████▌ ████=▐████
▀▀▀▀` ▀▀▀▀  └└└└ `▀▀▀▀ "▀▀▀╘ ▄▄▄▄▄▄████▌ ▀▀▀▀▀▀▀▀▀▀ `▀▀▀▀▀▀▀▀▀└ ▀▀▀▀` ▀▀▀▀  ▀▀▀▀
                             ▀▀▀▀▀▀▀▀▀▀U                                      
*/

contract MKGenesisV2Test is MKGenesisV1 {
    function v2Test() external pure returns (string memory) {
        return "v2Test";
    }

    function migrate(
        uint256[] calldata tokenIds,
        bytes calldata sig,
        string calldata solSig
    ) external virtual override {
        require(false, "Migration closed");
    }
}
