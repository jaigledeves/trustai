export enum TrustRecordState {
  DRAFT = "DRAFT",
  READY = "READY",
  ANCHORING = "ANCHORING",
  CERTIFIED = "CERTIFIED",
  FAILED = "FAILED",
  DISCARDED = "DISCARDED",
}

export class InvalidTransitionError extends Error {
  constructor(from: TrustRecordState, to: TrustRecordState) {
    super(`Invalid TrustRecord state transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export class ImmutableFieldError extends Error {
  constructor(state: TrustRecordState) {
    super(
      `AI fields are only mutable while state is DRAFT (INV-21) — current state: ${state}`,
    );
    this.name = "ImmutableFieldError";
  }
}

// dtr-lifecycle spec "State Machine Guards Invalid Transitions" — the only
// transitions the system ever allows. CERTIFIED and DISCARDED have no
// outgoing edges: CERTIFIED is fully immutable (INV-23), DISCARDED is
// terminal.
const VALID_TRANSITIONS: Readonly<Record<TrustRecordState, readonly TrustRecordState[]>> = {
  [TrustRecordState.DRAFT]: [TrustRecordState.READY, TrustRecordState.DISCARDED],
  [TrustRecordState.READY]: [TrustRecordState.ANCHORING],
  [TrustRecordState.ANCHORING]: [TrustRecordState.CERTIFIED, TrustRecordState.FAILED],
  [TrustRecordState.CERTIFIED]: [],
  [TrustRecordState.FAILED]: [TrustRecordState.ANCHORING],
  [TrustRecordState.DISCARDED]: [],
};

/**
 * Pure, table-driven state machine — zero framework imports. Every use case
 * and job handler that changes a TrustRecord's state MUST go through this
 * instead of setting `state` directly (design.md "State Machine" decision):
 * one place to unit-test all 6 valid + every invalid transition (INV-23).
 */
export class TrustRecordStateMachine {
  static canTransition(current: TrustRecordState, target: TrustRecordState): boolean {
    return VALID_TRANSITIONS[current].includes(target);
  }

  static transition(current: TrustRecordState, target: TrustRecordState): TrustRecordState {
    if (!TrustRecordStateMachine.canTransition(current, target)) {
      throw new InvalidTransitionError(current, target);
    }
    return target;
  }

  /**
   * INV-21: `aiSummary`/`aiClassification`/`aiLanguage`/provenance fields
   * are editable only while `state === DRAFT`. Call this before writing any
   * AI field, regardless of caller (ConfirmReview's edit path, or the
   * AnalyzeDocument job handler).
   */
  static assertMutableAiFields(state: TrustRecordState): void {
    if (state !== TrustRecordState.DRAFT) {
      throw new ImmutableFieldError(state);
    }
  }
}

/**
 * Zero framework imports (hexagonal domain layer). AI fields are nullable
 * until the `analyze-document` job populates them; `canonicalHash` is set
 * exactly once, at the DRAFT->READY transition (INV-22, INV-24 — Phase 5).
 */
export class TrustRecord {
  constructor(
    public readonly id: string,
    public readonly schemaVersion: string,
    public readonly assetId: string,
    public readonly assetHash: string,
    public readonly canonicalHash: string | null,
    public readonly state: TrustRecordState,
    public readonly versionNumber: number,
    public readonly aiSummary: string | null,
    public readonly aiClassification: string | null,
    public readonly aiLanguage: string | null,
    public readonly aiProvider: string | null,
    public readonly aiModel: string | null,
    public readonly aiModelVersion: string | null,
    public readonly aiPromptVersion: string | null,
    public readonly aiTaxonomyVersion: string | null,
    public readonly aiAnalyzedAt: Date | null,
    public readonly reviewedByUserId: string | null,
    public readonly anchorId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /** RF-025/INV-26: a record must not reach READY without provenance populated. */
  hasProvenance(): boolean {
    return Boolean(this.aiProvider && this.aiModel && this.aiModelVersion);
  }
}
