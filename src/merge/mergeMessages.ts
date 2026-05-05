import type { MergeMessagesOptions } from "../types";

export function mergeMessages<TMessage>(
  existing: readonly TMessage[],
  incoming: readonly TMessage[],
  options: MergeMessagesOptions<TMessage>
): TMessage[] {
  const dedupe = options.dedupe !== false;

  if (!dedupe) {
    return options.direction === "prepend"
      ? [...incoming, ...existing]
      : [...existing, ...incoming];
  }

  const existingIds = new Set(existing.map(options.getMessageId));
  const incomingIds = new Set<string | number>();
  const uniqueIncoming: TMessage[] = [];

  for (const message of incoming) {
    const id = options.getMessageId(message);
    if (existingIds.has(id) || incomingIds.has(id)) {
      continue;
    }

    incomingIds.add(id);
    uniqueIncoming.push(message);
  }

  return options.direction === "prepend"
    ? [...uniqueIncoming, ...existing]
    : [...existing, ...uniqueIncoming];
}
