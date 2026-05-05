# scroll-behavior

Framework-agnostic chat scroll behavior for loading older and newer messages.

This package does not render UI. Your app owns messages, markup, fetching, styling, and framework state. The package owns the scroll logic that modern chat surfaces need:

- Load older messages near the top.
- Preserve the viewport when older messages are prepended.
- Load newer messages near the bottom.
- Auto-scroll to the bottom only when the user was already near the bottom.
- Share the same behavior across vanilla JavaScript, React, Next.js, and other frameworks.

## Install

```bash
npm install scroll-behavior
```

## Mental Model

The package calls `onLoadTop` or `onLoadBottom` when the scroll container reaches a threshold. Those callbacks return message records. Your app merges those records in `onMergeTop` or `onMergeBottom`, usually with `mergeMessages`.

When prepending older messages, the controller measures before your merge, waits for the next frame, then adjusts `scrollTop` by the added height so the viewport stays anchored.

Each edge triggers once while the user remains inside its threshold. The edge is armed again after the user scrolls away and then returns, which prevents package-driven scroll restoration or auto-scroll from starting an accidental load loop.

## Vanilla JavaScript

```js
import {
  createChatScrollController,
  mergeMessages
} from "scroll-behavior";

const container = document.querySelector("#messages");
let messages = [];

function render() {
  container.innerHTML = messages
    .map((message) => `<div>${message.text}</div>`)
    .join("");
}

const controller = createChatScrollController({
  container,
  getMessageId: (message) => message.id,
  onLoadTop: () => fetch("/api/messages?before=oldest").then((res) => res.json()),
  onMergeTop: (incoming) => {
    messages = mergeMessages(messages, incoming, {
      getMessageId: (message) => message.id,
      direction: "prepend"
    });
    render();
  },
  onLoadBottom: () => fetch("/api/messages?after=latest").then((res) => res.json()),
  onMergeBottom: (incoming) => {
    messages = mergeMessages(messages, incoming, {
      getMessageId: (message) => message.id,
      direction: "append"
    });
    render();
  }
});

controller.check();
```

## React

```tsx
import { useRef, useState } from "react";
import { mergeMessages } from "scroll-behavior";
import { useChatScroll } from "scroll-behavior/react";

type Message = {
  id: string;
  text: string;
};

export function Chat() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const chatScroll = useChatScroll<Message>({
    containerRef,
    getMessageId: (message) => message.id,
    onLoadTop: async () => fetchOlderMessages(),
    onMergeTop: (incoming) => {
      setMessages((current) =>
        mergeMessages(current, incoming, {
          getMessageId: (message) => message.id,
          direction: "prepend"
        })
      );
    },
    onLoadBottom: async () => fetchNewerMessages(),
    onMergeBottom: (incoming) => {
      setMessages((current) =>
        mergeMessages(current, incoming, {
          getMessageId: (message) => message.id,
          direction: "append"
        })
      );
    }
  });

  return (
    <>
      <div ref={containerRef} style={{ height: 480, overflowY: "auto" }}>
        {messages.map((message) => (
          <article key={message.id}>{message.text}</article>
        ))}
      </div>
      <button type="button" onClick={() => chatScroll.scrollToBottom()}>
        Jump to latest
      </button>
    </>
  );
}
```

## Next.js

Use the hook only inside a client component.

```tsx
"use client";

import { useRef, useState } from "react";
import { mergeMessages } from "scroll-behavior";
import { useChatScroll } from "scroll-behavior/react";

export function ChatClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState([]);

  useChatScroll({
    containerRef,
    getMessageId: (message) => message.id,
    onLoadTop: () => loadOlderMessages(),
    onMergeTop: (incoming) => {
      setMessages((current) =>
        mergeMessages(current, incoming, {
          getMessageId: (message) => message.id,
          direction: "prepend"
        })
      );
    }
  });

  return (
    <div ref={containerRef} style={{ height: "80vh", overflowY: "auto" }}>
      {messages.map((message) => (
        <article key={message.id}>{message.text}</article>
      ))}
    </div>
  );
}
```

## API

### `createChatScrollController(options)`

```ts
type ChatScrollOptions<TMessage> = {
  container: HTMLElement;
  getMessageId: (message: TMessage) => string | number;
  onLoadTop?: () => Promise<TMessage[]> | TMessage[];
  onLoadBottom?: () => Promise<TMessage[]> | TMessage[];
  onMergeTop?: (messages: TMessage[]) => void | Promise<void>;
  onMergeBottom?: (messages: TMessage[]) => void | Promise<void>;
  onLoadError?: (error: unknown, direction: "top" | "bottom") => void;
  onLoadingChange?: (state: ChatScrollState) => void;
  thresholdPx?: number;
  bottomThresholdPx?: number;
  autoScrollBottom?: boolean;
  hasMoreTop?: boolean;
  hasMoreBottom?: boolean;
  disabled?: boolean;
};
```

Defaults:

- `thresholdPx`: `120`
- `bottomThresholdPx`: same as `thresholdPx`
- `autoScrollBottom`: `true`
- `hasMoreTop`: `true`
- `hasMoreBottom`: `true`
- `disabled`: `false`

Controller methods:

```ts
type ChatScrollController = {
  check(): void;
  scrollToTop(options?: ScrollIntoViewOptions): void;
  scrollToBottom(options?: ScrollIntoViewOptions): void;
  update(options: Partial<ChatScrollOptions<any>>): void;
  getState(): ChatScrollState;
  destroy(): void;
};
```

Call `check()` after manually changing the list if you want the controller to evaluate thresholds immediately.

### `mergeMessages(existing, incoming, options)`

```ts
mergeMessages(existing, incoming, {
  getMessageId: (message) => message.id,
  direction: "prepend",
  dedupe: true
});
```

`dedupe` defaults to `true`. Existing messages stay in their current order. Incoming messages that duplicate existing IDs or earlier incoming IDs are skipped.

### `useChatScroll(options)`

```ts
const {
  isLoadingTop,
  isLoadingBottom,
  check,
  scrollToTop,
  scrollToBottom
} = useChatScroll({
  containerRef,
  getMessageId,
  onLoadTop,
  onMergeTop,
  onLoadBottom,
  onMergeBottom
});
```

The hook creates and destroys a controller for the referenced element. It keeps callback references fresh across rerenders.

## Scroll Preservation

The core preservation formula is:

```ts
nextScrollTop = nextScrollHeight - previousScrollHeight + previousScrollTop;
```

The controller captures the anchor immediately before your merge runs. That keeps the viewport stable even if the user scrolls while an older-message request is pending.

For virtualized lists, use the low-level helpers:

```ts
import { preserveScrollAnchor } from "scroll-behavior";

await preserveScrollAnchor(container, async () => {
  prependRows();
});
```

Virtualization adapters are intentionally not shipped in v1. This keeps the runtime small while leaving a stable measurement hook for app-specific adapters.

## Edge Cases And Best Practices

- Set `hasMoreTop` or `hasMoreBottom` to `false` when the API reaches the end of history.
- Keep `onLoadTop` and `onLoadBottom` idempotent because scroll events can fire frequently.
- Edge loads fire once per threshold entry; scroll away from the edge and back to trigger the next page.
- Use stable message IDs and let `mergeMessages` dedupe cursor overlap.
- Keep `autoScrollBottom` enabled for live chats unless users need strict manual scroll control.
- Use `onLoadError` to show retry UI or telemetry in the host app.
- Destroy vanilla controllers on page teardown or when replacing the scroll container.
- Do not use smooth scrolling for top preservation. The controller preserves instantly to avoid visual jumps.

## Package Development

```bash
npm install
npm run check
```

Before publishing:

```bash
npm run build
npm pack --dry-run
npm publish --provenance
```
