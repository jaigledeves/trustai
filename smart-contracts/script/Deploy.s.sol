// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AnchorRegistry} from "../src/AnchorRegistry.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        AnchorRegistry registry = new AnchorRegistry();
        console.log("AnchorRegistry deployed at:", address(registry));
        vm.stopBroadcast();
    }
}
