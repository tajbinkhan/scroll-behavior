import { describe, expect, it } from "vitest";
import {
  calculatePreservedScrollTop,
  getBottomDistance,
  getScrollTopForBottom,
  isNearBottom,
  isNearTop,
  normalizeThreshold,
  shouldAutoScrollBottom
} from "../src";

describe("scroll math", () => {
  it("detects the top threshold", () => {
    expect(isNearTop({ scrollTop: 80 }, 120)).toBe(true);
    expect(isNearTop({ scrollTop: 121 }, 120)).toBe(false);
  });

  it("detects the bottom threshold", () => {
    const metrics = { scrollTop: 780, clientHeight: 200, scrollHeight: 1000 };
    expect(getBottomDistance(metrics)).toBe(20);
    expect(isNearBottom(metrics, 40)).toBe(true);
    expect(isNearBottom(metrics, 10)).toBe(false);
  });

  it("calculates preserved scroll top after prepending content", () => {
    expect(
      calculatePreservedScrollTop(
        { scrollTop: 80, scrollHeight: 1000 },
        1250
      )
    ).toBe(330);
  });

  it("calculates the scroll top for the bottom", () => {
    expect(
      getScrollTopForBottom({
        scrollTop: 0,
        clientHeight: 200,
        scrollHeight: 1000
      })
    ).toBe(800);
  });

  it("normalizes thresholds and auto-scroll decisions", () => {
    expect(normalizeThreshold(-10)).toBe(0);
    expect(normalizeThreshold(Number.NaN, 80)).toBe(80);
    expect(shouldAutoScrollBottom(true, true)).toBe(true);
    expect(shouldAutoScrollBottom(false, true)).toBe(false);
    expect(shouldAutoScrollBottom(true, false)).toBe(false);
  });
});
