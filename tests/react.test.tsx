import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { useChatScroll, type UseChatScrollReturn } from "../src/react/useChatScroll";

type Message = {
  id: number;
};

let root: Root | null = null;

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
});

function setMetrics(
  container: HTMLElement,
  metrics: { scrollTop: number; scrollHeight: number; clientHeight: number }
) {
  Object.defineProperty(container, "scrollHeight", {
    configurable: true,
    get: () => metrics.scrollHeight
  });
  Object.defineProperty(container, "clientHeight", {
    configurable: true,
    get: () => metrics.clientHeight
  });
  container.scrollTop = metrics.scrollTop;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function Harness(props: {
  onLoadTop: () => Message[] | Promise<Message[]>;
  onResult: (result: UseChatScrollReturn) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const result = useChatScroll<Message>({
    containerRef,
    getMessageId: (message) => message.id,
    onLoadTop: props.onLoadTop
  });

  props.onResult(result);

  return <div data-testid="scroll-container" ref={containerRef} />;
}

async function renderHarness(
  onLoadTop: () => Message[] | Promise<Message[]>,
  onResult: (result: UseChatScrollReturn) => void
) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<Harness onLoadTop={onLoadTop} onResult={onResult} />);
  });

  const container = document.querySelector(
    "[data-testid='scroll-container']"
  ) as HTMLElement;
  setMetrics(container, {
    scrollTop: 10,
    scrollHeight: 1000,
    clientHeight: 200
  });

  return container;
}

describe("useChatScroll", () => {
  it("initializes a controller and exposes loading state", async () => {
    const load = deferred<Message[]>();
    const onLoadTop = vi.fn(() => load.promise);
    let latest!: UseChatScrollReturn;

    await renderHarness(onLoadTop, (result) => {
      latest = result;
    });

    await act(async () => {
      latest.check();
      await Promise.resolve();
    });

    expect(onLoadTop).toHaveBeenCalledTimes(1);
    expect(latest.isLoadingTop).toBe(true);

    await act(async () => {
      load.resolve([]);
      await Promise.resolve();
    });

    expect(latest.isLoadingTop).toBe(false);
  });

  it("uses the latest callback after rerender", async () => {
    const firstLoad = vi.fn(() => []);
    const secondLoad = vi.fn(() => []);
    let latest!: UseChatScrollReturn;

    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    await act(async () => {
      root?.render(<Harness onLoadTop={firstLoad} onResult={(result) => {
        latest = result;
      }} />);
    });

    const container = document.querySelector(
      "[data-testid='scroll-container']"
    ) as HTMLElement;
    setMetrics(container, {
      scrollTop: 10,
      scrollHeight: 1000,
      clientHeight: 200
    });

    await act(async () => {
      latest.check();
      await Promise.resolve();
    });

    await act(async () => {
      root?.render(<Harness onLoadTop={secondLoad} onResult={(result) => {
        latest = result;
      }} />);
    });

    setMetrics(container, {
      scrollTop: 200,
      scrollHeight: 1000,
      clientHeight: 200
    });

    await act(async () => {
      latest.check();
      await Promise.resolve();
    });

    setMetrics(container, {
      scrollTop: 10,
      scrollHeight: 1000,
      clientHeight: 200
    });

    await act(async () => {
      latest.check();
      await Promise.resolve();
    });

    expect(firstLoad).toHaveBeenCalledTimes(1);
    expect(secondLoad).toHaveBeenCalledTimes(1);
  });
});
