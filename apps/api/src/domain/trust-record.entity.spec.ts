import { describe, expect, it } from "vitest";
import {
  ImmutableFieldError,
  InvalidTransitionError,
  TrustRecordState,
  TrustRecordStateMachine,
} from "./trust-record.entity";

const ALL_STATES = Object.values(TrustRecordState);

// dtr-lifecycle spec: "State Machine Guards Invalid Transitions" — the only
// allowed transitions. Every other (from, to) pair, including self-loops
// and CERTIFIED's full immutability (INV-23), must be rejected.
const VALID_TRANSITIONS: Array<[TrustRecordState, TrustRecordState]> = [
  [TrustRecordState.DRAFT, TrustRecordState.READY],
  [TrustRecordState.DRAFT, TrustRecordState.DISCARDED],
  [TrustRecordState.READY, TrustRecordState.ANCHORING],
  [TrustRecordState.ANCHORING, TrustRecordState.CERTIFIED],
  [TrustRecordState.ANCHORING, TrustRecordState.FAILED],
  [TrustRecordState.FAILED, TrustRecordState.ANCHORING],
];

function isValidPair(from: TrustRecordState, to: TrustRecordState): boolean {
  return VALID_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

describe("TrustRecordStateMachine", () => {
  describe("valid transitions", () => {
    it.each(VALID_TRANSITIONS)("allows %s -> %s", (from, to) => {
      expect(TrustRecordStateMachine.transition(from, to)).toBe(to);
      expect(TrustRecordStateMachine.canTransition(from, to)).toBe(true);
    });
  });

  describe("invalid transitions", () => {
    // Exhaustive: every (from, to) pair not in the valid list must be
    // rejected — this is the actual INV-23 enforcement surface, not just a
    // spot check of a couple of examples.
    for (const from of ALL_STATES) {
      for (const to of ALL_STATES) {
        if (isValidPair(from, to)) continue;

        it(`rejects ${from} -> ${to}`, () => {
          expect(TrustRecordStateMachine.canTransition(from, to)).toBe(false);
          expect(() => TrustRecordStateMachine.transition(from, to)).toThrow(
            InvalidTransitionError,
          );
        });
      }
    }
  });

  it("CERTIFIED is fully immutable: no transition out of it is ever allowed (INV-23)", () => {
    for (const target of ALL_STATES) {
      expect(TrustRecordStateMachine.canTransition(TrustRecordState.CERTIFIED, target)).toBe(
        false,
      );
    }
  });

  it("DISCARDED is terminal: no transition out of it is ever allowed", () => {
    for (const target of ALL_STATES) {
      expect(TrustRecordStateMachine.canTransition(TrustRecordState.DISCARDED, target)).toBe(
        false,
      );
    }
  });

  describe("assertMutableAiFields (INV-21: AI fields mutable only in DRAFT)", () => {
    it("does not throw when state is DRAFT", () => {
      expect(() =>
        TrustRecordStateMachine.assertMutableAiFields(TrustRecordState.DRAFT),
      ).not.toThrow();
    });

    it.each(ALL_STATES.filter((s) => s !== TrustRecordState.DRAFT))(
      "throws ImmutableFieldError when state is %s",
      (state) => {
        expect(() => TrustRecordStateMachine.assertMutableAiFields(state)).toThrow(
          ImmutableFieldError,
        );
      },
    );
  });
});
