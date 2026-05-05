import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createChatScrollController } from "../core/createChatScrollController";
import type {
  ChatScrollController,
  ChatScrollOptions,
  ChatScrollState
} from "../types";

export type UseChatScrollOptions<TMessage> = Omit<
  ChatScrollOptions<TMessage>,
  "container" | "onLoadingChange"
> & {
  containerRef: RefObject<HTMLElement | null>;
};

export type UseChatScrollReturn = ChatScrollState & {
  scrollToTop(options?: ScrollIntoViewOptions): void;
  scrollToBottom(options?: ScrollIntoViewOptions): void;
  check(): void;
};

export function useChatScroll<TMessage>(
  options: UseChatScrollOptions<TMessage>
): UseChatScrollReturn {
  const optionsRef = useRef(options);
  const controllerRef = useRef<ChatScrollController | null>(null);
  const [state, setState] = useState<ChatScrollState>({
    isLoadingTop: false,
    isLoadingBottom: false
  });

  optionsRef.current = options;

  const buildControllerOptions = useCallback(
    (container: HTMLElement): ChatScrollOptions<TMessage> => {
      const latest = optionsRef.current;

      return {
        ...latest,
        container,
        onLoadTop: latest.onLoadTop
          ? () => optionsRef.current.onLoadTop?.() ?? []
          : undefined,
        onLoadBottom: latest.onLoadBottom
          ? () => optionsRef.current.onLoadBottom?.() ?? []
          : undefined,
        onMergeTop: latest.onMergeTop
          ? (messages) => optionsRef.current.onMergeTop?.(messages)
          : undefined,
        onMergeBottom: latest.onMergeBottom
          ? (messages) => optionsRef.current.onMergeBottom?.(messages)
          : undefined,
        onLoadError: latest.onLoadError
          ? (error, direction) => optionsRef.current.onLoadError?.(error, direction)
          : undefined,
        onLoadingChange: setState
      };
    },
    []
  );

  useEffect(() => {
    const container = options.containerRef.current;
    if (!container) {
      return;
    }

    const controller = createChatScrollController(
      buildControllerOptions(container)
    );
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [buildControllerOptions, options.containerRef]);

  useEffect(() => {
    const controller = controllerRef.current;
    const container = options.containerRef.current;

    if (!controller || !container) {
      return;
    }

    controller.update(buildControllerOptions(container));
  });

  const scrollToTop = useCallback((scrollOptions?: ScrollIntoViewOptions) => {
    controllerRef.current?.scrollToTop(scrollOptions);
  }, []);

  const scrollToBottom = useCallback((scrollOptions?: ScrollIntoViewOptions) => {
    controllerRef.current?.scrollToBottom(scrollOptions);
  }, []);

  const check = useCallback(() => {
    controllerRef.current?.check();
  }, []);

  return {
    ...state,
    scrollToTop,
    scrollToBottom,
    check
  };
}
