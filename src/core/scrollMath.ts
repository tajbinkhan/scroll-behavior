import type { ScrollAnchorSnapshot, ScrollMetrics } from "../types";

export const DEFAULT_THRESHOLD_PX = 120;

export function normalizeThreshold(
  value: number | undefined,
  fallback = DEFAULT_THRESHOLD_PX
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, value);
}

export function getScrollMetrics(container: HTMLElement): ScrollMetrics {
  return {
    scrollTop: Math.max(0, container.scrollTop),
    scrollHeight: Math.max(0, container.scrollHeight),
    clientHeight: Math.max(0, container.clientHeight)
  };
}

export function getBottomDistance(metrics: ScrollMetrics): number {
  return Math.max(0, metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop);
}

export function isNearTop(
  metrics: Pick<ScrollMetrics, "scrollTop">,
  thresholdPx = DEFAULT_THRESHOLD_PX
): boolean {
  return Math.max(0, metrics.scrollTop) <= normalizeThreshold(thresholdPx);
}

export function isNearBottom(
  metrics: ScrollMetrics,
  thresholdPx = DEFAULT_THRESHOLD_PX
): boolean {
  return getBottomDistance(metrics) <= normalizeThreshold(thresholdPx);
}

export function isUsableScrollContainer(metrics: ScrollMetrics): boolean {
  return metrics.clientHeight > 0 && metrics.scrollHeight > 0;
}

export function getScrollTopForBottom(metrics: ScrollMetrics): number {
  return Math.max(0, metrics.scrollHeight - metrics.clientHeight);
}

export function calculatePreservedScrollTop(
  snapshot: ScrollAnchorSnapshot,
  nextScrollHeight: number
): number {
  return Math.max(0, nextScrollHeight - snapshot.scrollHeight + snapshot.scrollTop);
}

export function shouldAutoScrollBottom(
  wasNearBottom: boolean,
  autoScrollBottom = true
): boolean {
  return autoScrollBottom && wasNearBottom;
}

export function captureScrollAnchor(container: HTMLElement): ScrollAnchorSnapshot {
  return {
    scrollTop: Math.max(0, container.scrollTop),
    scrollHeight: Math.max(0, container.scrollHeight)
  };
}

export function restoreScrollAnchor(
  container: HTMLElement,
  snapshot: ScrollAnchorSnapshot
): number {
  const nextScrollTop = calculatePreservedScrollTop(snapshot, container.scrollHeight);
  container.scrollTop = nextScrollTop;
  return nextScrollTop;
}

export function requestNextFrame(callback: () => void): number | ReturnType<typeof setTimeout> {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(() => callback());
  }

  return setTimeout(callback, 0);
}

export function cancelNextFrame(id: number | ReturnType<typeof setTimeout>): void {
  if (typeof globalThis.cancelAnimationFrame === "function" && typeof id === "number") {
    globalThis.cancelAnimationFrame(id);
    return;
  }

  clearTimeout(id);
}

export function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestNextFrame(resolve);
  });
}

export async function preserveScrollAnchor<T>(
  container: HTMLElement,
  mutate: () => T | Promise<T>
): Promise<T> {
  const snapshot = captureScrollAnchor(container);
  const result = await mutate();
  await waitForNextFrame();
  restoreScrollAnchor(container, snapshot);
  return result;
}
