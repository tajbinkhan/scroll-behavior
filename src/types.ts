export type Direction = "top" | "bottom";

export type MergeDirection = "prepend" | "append";

export type MessageId = string | number;

export type MaybePromise<T> = T | Promise<T>;

export type GetMessageId<TMessage> = (message: TMessage) => MessageId;

export type ChatScrollState = {
  isLoadingTop: boolean;
  isLoadingBottom: boolean;
};

export type ChatScrollOptions<TMessage> = {
  container: HTMLElement;
  getMessageId: GetMessageId<TMessage>;
  onLoadTop?: () => MaybePromise<TMessage[]>;
  onLoadBottom?: () => MaybePromise<TMessage[]>;
  onMergeTop?: (messages: TMessage[]) => MaybePromise<void>;
  onMergeBottom?: (messages: TMessage[]) => MaybePromise<void>;
  onLoadError?: (error: unknown, direction: Direction) => void;
  onLoadingChange?: (state: ChatScrollState) => void;
  thresholdPx?: number;
  bottomThresholdPx?: number;
  autoScrollBottom?: boolean;
  hasMoreTop?: boolean;
  hasMoreBottom?: boolean;
  disabled?: boolean;
};

export type ChatScrollController = {
  check(): void;
  scrollToTop(options?: ScrollIntoViewOptions): void;
  scrollToBottom(options?: ScrollIntoViewOptions): void;
  update(options: Partial<ChatScrollOptions<any>>): void;
  getState(): ChatScrollState;
  destroy(): void;
};

export type MergeMessagesOptions<TMessage> = {
  getMessageId: GetMessageId<TMessage>;
  direction: MergeDirection;
  dedupe?: boolean;
};

export type ScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

export type ScrollAnchorSnapshot = {
  scrollTop: number;
  scrollHeight: number;
};
