export { createChatScrollController } from "./core/createChatScrollController";
export {
  DEFAULT_THRESHOLD_PX,
  calculatePreservedScrollTop,
  cancelNextFrame,
  captureScrollAnchor,
  getBottomDistance,
  getScrollMetrics,
  getScrollTopForBottom,
  isNearBottom,
  isNearTop,
  isUsableScrollContainer,
  normalizeThreshold,
  preserveScrollAnchor,
  requestNextFrame,
  restoreScrollAnchor,
  shouldAutoScrollBottom,
  waitForNextFrame
} from "./core/scrollMath";
export { mergeMessages } from "./merge/mergeMessages";
export type {
  ChatScrollController,
  ChatScrollOptions,
  ChatScrollState,
  Direction,
  GetMessageId,
  MergeDirection,
  MergeMessagesOptions,
  MessageId,
  ScrollAnchorSnapshot,
  ScrollMetrics
} from "./types";
