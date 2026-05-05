import { describe, expect, it, vi } from "vitest";
import { createChatScrollController, waitForNextFrame } from "../src";

type Message = {
  id: number;
};

function createContainer(metrics: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}) {
  const container = document.createElement("div");
  let scrollHeight = metrics.scrollHeight;
  let clientHeight = metrics.clientHeight;

  Object.defineProperty(container, "scrollHeight", {
    configurable: true,
    get: () => scrollHeight
  });
  Object.defineProperty(container, "clientHeight", {
    configurable: true,
    get: () => clientHeight
  });
  container.scrollTop = metrics.scrollTop;

  return {
    container,
    setMetrics(next: Partial<typeof metrics>) {
      if (typeof next.scrollHeight === "number") {
        scrollHeight = next.scrollHeight;
      }

      if (typeof next.clientHeight === "number") {
        clientHeight = next.clientHeight;
      }

      if (typeof next.scrollTop === "number") {
        container.scrollTop = next.scrollTop;
      }
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("createChatScrollController", () => {
  it("loads top messages and preserves the current viewport", async () => {
    const { container, setMetrics } = createContainer({
      scrollTop: 80,
      scrollHeight: 1000,
      clientHeight: 200
    });

    const controller = createChatScrollController<Message>({
      container,
      getMessageId: (message) => message.id,
      onLoadTop: () => [{ id: 1 }],
      onMergeTop: () => {
        setMetrics({ scrollHeight: 1200 });
      }
    });

    controller.check();
    await waitForNextFrame();
    await waitForNextFrame();

    expect(container.scrollTop).toBe(280);
    controller.destroy();
  });

  it("loads bottom messages and auto-scrolls when already near the bottom", async () => {
    const { container, setMetrics } = createContainer({
      scrollTop: 790,
      scrollHeight: 1000,
      clientHeight: 200
    });

    const controller = createChatScrollController<Message>({
      container,
      getMessageId: (message) => message.id,
      onLoadBottom: () => [{ id: 2 }],
      onMergeBottom: () => {
        setMetrics({ scrollHeight: 1100 });
      }
    });

    controller.check();
    await waitForNextFrame();
    await waitForNextFrame();

    expect(container.scrollTop).toBe(900);
    controller.destroy();
  });

  it("does not retrigger bottom loading from its own auto-scroll", async () => {
    const onLoadBottom = vi.fn(() => [{ id: 2 }]);
    const { container, setMetrics } = createContainer({
      scrollTop: 790,
      scrollHeight: 1000,
      clientHeight: 200
    });

    const controller = createChatScrollController<Message>({
      container,
      getMessageId: (message) => message.id,
      onLoadBottom,
      onMergeBottom: () => {
        setMetrics({ scrollHeight: 1100 });
      }
    });

    controller.check();
    await waitForNextFrame();
    await waitForNextFrame();

    container.dispatchEvent(new Event("scroll"));
    await waitForNextFrame();

    expect(container.scrollTop).toBe(900);
    expect(onLoadBottom).toHaveBeenCalledTimes(1);

    setMetrics({ scrollTop: 200 });
    controller.check();
    setMetrics({ scrollTop: 890 });
    controller.check();

    expect(onLoadBottom).toHaveBeenCalledTimes(2);
    controller.destroy();
  });

  it("does not auto-scroll bottom when the user moves away during loading", async () => {
    const load = deferred<Message[]>();
    const { container, setMetrics } = createContainer({
      scrollTop: 790,
      scrollHeight: 1000,
      clientHeight: 200
    });

    const controller = createChatScrollController<Message>({
      container,
      getMessageId: (message) => message.id,
      onLoadBottom: () => load.promise,
      onMergeBottom: () => {
        setMetrics({ scrollHeight: 1100 });
      }
    });

    controller.check();
    setMetrics({ scrollTop: 200 });
    load.resolve([{ id: 3 }]);
    await waitForNextFrame();
    await waitForNextFrame();

    expect(container.scrollTop).toBe(200);
    controller.destroy();
  });

  it("prevents duplicate loads in the same direction", async () => {
    const load = deferred<Message[]>();
    const onLoadTop = vi.fn(() => load.promise);
    const { container, setMetrics } = createContainer({
      scrollTop: 10,
      scrollHeight: 1000,
      clientHeight: 200
    });

    const controller = createChatScrollController<Message>({
      container,
      getMessageId: (message) => message.id,
      onLoadTop
    });

    controller.check();
    controller.check();
    expect(onLoadTop).toHaveBeenCalledTimes(1);

    load.resolve([]);
    await waitForNextFrame();
    controller.check();
    expect(onLoadTop).toHaveBeenCalledTimes(1);

    setMetrics({ scrollTop: 200 });
    controller.check();
    setMetrics({ scrollTop: 10 });
    controller.check();

    expect(onLoadTop).toHaveBeenCalledTimes(2);
    controller.destroy();
  });

  it("respects disabled state and has-more flags", () => {
    const onLoadTop = vi.fn(() => []);
    const { container } = createContainer({
      scrollTop: 10,
      scrollHeight: 1000,
      clientHeight: 200
    });

    const controller = createChatScrollController<Message>({
      container,
      getMessageId: (message) => message.id,
      disabled: true,
      onLoadTop
    });

    controller.check();
    controller.update({ disabled: false, hasMoreTop: false });
    controller.check();

    expect(onLoadTop).not.toHaveBeenCalled();
    controller.update({ hasMoreTop: true });
    controller.check();
    expect(onLoadTop).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  it("removes the scroll listener on destroy", async () => {
    const onLoadTop = vi.fn(() => []);
    const { container } = createContainer({
      scrollTop: 10,
      scrollHeight: 1000,
      clientHeight: 200
    });

    const controller = createChatScrollController<Message>({
      container,
      getMessageId: (message) => message.id,
      onLoadTop
    });

    controller.destroy();
    container.dispatchEvent(new Event("scroll"));
    await waitForNextFrame();

    expect(onLoadTop).not.toHaveBeenCalled();
  });

  it("reports load errors without leaving loading state active", async () => {
    const error = new Error("failed");
    const onLoadError = vi.fn();
    const { container } = createContainer({
      scrollTop: 10,
      scrollHeight: 1000,
      clientHeight: 200
    });

    const controller = createChatScrollController<Message>({
      container,
      getMessageId: (message) => message.id,
      onLoadTop: async () => {
        throw error;
      },
      onLoadError
    });

    controller.check();
    await waitForNextFrame();

    expect(onLoadError).toHaveBeenCalledWith(error, "top");
    expect(controller.getState().isLoadingTop).toBe(false);
    controller.destroy();
  });
});
