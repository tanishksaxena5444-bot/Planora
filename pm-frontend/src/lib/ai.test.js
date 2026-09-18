import { describe, expect, it } from "vitest";
import { extractJSON } from "./ai";

describe("extractJSON", () => {
  it("parses plain JSON", () => {
    expect(extractJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json fences the model sometimes adds", () => {
    const text = "```json\n{\"a\":1}\n```";
    expect(extractJSON(text)).toEqual({ a: 1 });
  });

  it("strips bare ``` fences", () => {
    const text = "```\n[1,2,3]\n```";
    expect(extractJSON(text)).toEqual([1, 2, 3]);
  });

  it("throws a friendly error on empty input", () => {
    expect(() => extractJSON("")).toThrow(/did not return a response/i);
    expect(() => extractJSON("   ")).toThrow(/did not return a response/i);
  });

  it("throws a friendly error on invalid JSON", () => {
    expect(() => extractJSON("not json at all")).toThrow(/wasn't valid JSON/i);
  });
});
