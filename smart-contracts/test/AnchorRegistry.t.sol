// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AnchorRegistry} from "../src/AnchorRegistry.sol";

contract AnchorRegistryTest is Test {
    AnchorRegistry public registry;

    // Known test hash (SHA-256 of "trustai")
    bytes32 internal constant HASH_A = 0x5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5;
    // Simulated Merkle root (arbitrary non-zero bytes32)
    bytes32 internal constant MERKLE_ROOT = 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890;

    function setUp() public {
        registry = new AnchorRegistry();
    }

    // ─── Unit: happy path ───────────────────────────────────────────────────

    function test_AnchorStoresTimestamp() public {
        vm.warp(1_720_000_000);
        registry.anchor(HASH_A);
        assertEq(registry.anchoredAt(HASH_A), 1_720_000_000);
    }

    function test_AnchorEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit AnchorRegistry.Anchored(HASH_A, address(this), block.timestamp);
        registry.anchor(HASH_A);
    }

    function test_IsAnchoredFalseBeforeAnchor() public view {
        assertFalse(registry.isAnchored(HASH_A));
    }

    function test_IsAnchoredTrueAfterAnchor() public {
        registry.anchor(HASH_A);
        assertTrue(registry.isAnchored(HASH_A));
    }

    // ─── Unit: Merkle root treated identically to individual hash ───────────

    function test_MerkleRootAnchorable() public {
        registry.anchor(MERKLE_ROOT);
        assertTrue(registry.isAnchored(MERKLE_ROOT));
        assertEq(registry.anchoredAt(MERKLE_ROOT), block.timestamp);
    }

    // ─── Unit: reverts ──────────────────────────────────────────────────────

    function test_RevertZeroHash() public {
        vm.expectRevert(AnchorRegistry.ZeroHash.selector);
        registry.anchor(bytes32(0));
    }

    function test_RevertAlreadyAnchored() public {
        registry.anchor(HASH_A);
        vm.expectRevert(abi.encodeWithSelector(AnchorRegistry.AlreadyAnchored.selector, HASH_A));
        registry.anchor(HASH_A);
    }

    function test_DuplicateRevertsWithTheHash() public {
        bytes32 h = bytes32(uint256(42));
        registry.anchor(h);
        vm.expectRevert(abi.encodeWithSelector(AnchorRegistry.AlreadyAnchored.selector, h));
        registry.anchor(h);
    }

    // ─── Fuzz ───────────────────────────────────────────────────────────────

    function testFuzz_AnyNonZeroHashAnchors(bytes32 hash) public {
        vm.assume(hash != bytes32(0));
        registry.anchor(hash);
        assertEq(registry.anchoredAt(hash), block.timestamp);
        assertTrue(registry.isAnchored(hash));
    }

    function testFuzz_DuplicateAlwaysReverts(bytes32 hash) public {
        vm.assume(hash != bytes32(0));
        registry.anchor(hash);
        vm.expectRevert(abi.encodeWithSelector(AnchorRegistry.AlreadyAnchored.selector, hash));
        registry.anchor(hash);
    }

    // ─── Gas ────────────────────────────────────────────────────────────────

    function test_GasAnchorFirstCall() public {
        uint256 gasBefore = gasleft();
        registry.anchor(HASH_A);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("anchor() gas:", gasUsed);
        assertLt(gasUsed, 55_000, "anchor() must cost < 55k gas");
    }

    function test_GasIsAnchored() public {
        registry.anchor(HASH_A);
        uint256 gasBefore = gasleft();
        registry.isAnchored(HASH_A);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("isAnchored() gas:", gasUsed);
        assertLt(gasUsed, 3_000, "isAnchored() must cost < 3k gas");
    }
}

// ─── Invariant handler ──────────────────────────────────────────────────────

contract AnchorRegistryInvariantTest is Test {
    AnchorRegistry public registry;
    bytes32[] internal anchored;
    mapping(bytes32 => uint256) internal snapshotAt;

    function setUp() public {
        registry = new AnchorRegistry();
        targetContract(address(registry));
    }

    function anchor(bytes32 hash) external {
        if (hash == bytes32(0)) return;
        if (registry.isAnchored(hash)) return;
        registry.anchor(hash);
        anchored.push(hash);
        snapshotAt[hash] = registry.anchoredAt(hash);
    }

    function invariant_TimestampNeverChanges() public view {
        for (uint256 i = 0; i < anchored.length; i++) {
            assertEq(
                registry.anchoredAt(anchored[i]),
                snapshotAt[anchored[i]],
                "anchored timestamp must never change"
            );
        }
    }
}
