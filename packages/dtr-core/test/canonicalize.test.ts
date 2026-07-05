import { describe, expect, it } from "vitest";
import { canonicalize, CanonicalizationError } from "../src/canonicalize.js";

describe("canonicalize — primitives", () => {
  it("serializes null and booleans", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(true)).toBe("true");
    expect(canonicalize(false)).toBe("false");
  });

  it("serializes strings with JSON escaping", () => {
    expect(canonicalize("hello")).toBe('"hello"');
    expect(canonicalize('say "hi"')).toBe('"say \\"hi\\""');
    expect(canonicalize("line\nbreak")).toBe('"line\\nbreak"');
  });

  it("serializes control characters as lowercase \\u escapes", () => {
    expect(canonicalize("\u000f")).toBe('"\\u000f"');
    expect(canonicalize("\u0001")).toBe('"\\u0001"');
  });

  it("serializes numbers per ECMAScript Number::toString", () => {
    expect(canonicalize(42)).toBe("42");
    expect(canonicalize(4.5)).toBe("4.5");
    expect(canonicalize(-0)).toBe("0");
    expect(canonicalize(1e30)).toBe("1e+30");
    expect(canonicalize(2e-3)).toBe("0.002");
    expect(canonicalize(1e-27)).toBe("1e-27");
    expect(canonicalize(333333333.33333329)).toBe("333333333.3333333");
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalize(NaN)).toThrow(CanonicalizationError);
    expect(() => canonicalize(Infinity)).toThrow(CanonicalizationError);
    expect(() => canonicalize(-Infinity)).toThrow(CanonicalizationError);
  });

  it("rejects non-JSON values", () => {
    expect(() => canonicalize(10n)).toThrow(CanonicalizationError);
    expect(() => canonicalize(() => 1)).toThrow(CanonicalizationError);
    expect(() => canonicalize(Symbol("x"))).toThrow(CanonicalizationError);
    expect(() => canonicalize(undefined)).toThrow(CanonicalizationError);
  });
});

describe("canonicalize — objects and arrays", () => {
  it("sorts object keys by UTF-16 code units", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("sorts keys recursively at every level", () => {
    const input = { z: { y: 1, x: 2 }, a: [{ c: 3, b: 4 }] };
    expect(canonicalize(input)).toBe('{"a":[{"b":4,"c":3}],"z":{"x":2,"y":1}}');
  });

  it("emits no whitespace", () => {
    expect(canonicalize({ a: [1, 2], b: "x" })).toBe('{"a":[1,2],"b":"x"}');
  });

  it("drops undefined-valued properties (JSON.stringify semantics)", () => {
    expect(canonicalize({ a: 1, skip: undefined })).toBe('{"a":1}');
  });

  it("turns undefined array items into null (JSON.stringify semantics)", () => {
    expect(canonicalize([1, undefined, 3])).toBe("[1,null,3]");
  });

  it("preserves array order (arrays are never sorted)", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("is deterministic regardless of property insertion order", () => {
    const a = { first: 1, second: 2, third: 3 };
    const b = { third: 3, first: 1, second: 2 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });
});

describe("canonicalize — RFC 8785 test vector", () => {
  it("matches the canonical output from the RFC example", () => {
    // Input object from RFC 8785 §3.3 (values, not JSON source text).
    const input = {
      numbers: [333333333.33333329, 1e30, 4.5, 2e-3, 0.000000000000000000000000001],
      string: "\u20ac$\u000f\u000aA'\u0042\u0022\u005c\\\"\u002f",
      literals: [null, true, false],
    };

    const expected =
      '{"literals":[null,true,false],' +
      '"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],' +
      '"string":"\u20ac$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}';

    expect(canonicalize(input)).toBe(expected);
  });
});
