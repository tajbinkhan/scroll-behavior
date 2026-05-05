import { describe, expect, it } from "vitest";
import { mergeMessages } from "../src";

type Message = {
  id: number;
  text: string;
};

const getMessageId = (message: Message) => message.id;

describe("mergeMessages", () => {
  it("prepends unique incoming messages without mutating inputs", () => {
    const existing = [{ id: 3, text: "three" }];
    const incoming = [
      { id: 1, text: "one" },
      { id: 2, text: "two" }
    ];

    const result = mergeMessages(existing, incoming, {
      getMessageId,
      direction: "prepend"
    });

    expect(result.map((message) => message.id)).toEqual([1, 2, 3]);
    expect(existing.map((message) => message.id)).toEqual([3]);
  });

  it("appends unique incoming messages", () => {
    const result = mergeMessages(
      [{ id: 1, text: "one" }],
      [
        { id: 2, text: "two" },
        { id: 3, text: "three" }
      ],
      { getMessageId, direction: "append" }
    );

    expect(result.map((message) => message.id)).toEqual([1, 2, 3]);
  });

  it("dedupes against existing and incoming messages by default", () => {
    const result = mergeMessages(
      [{ id: 2, text: "two" }],
      [
        { id: 1, text: "one" },
        { id: 1, text: "one duplicate" },
        { id: 2, text: "already exists" }
      ],
      { getMessageId, direction: "prepend" }
    );

    expect(result.map((message) => message.id)).toEqual([1, 2]);
  });

  it("can keep duplicates when dedupe is disabled", () => {
    const result = mergeMessages(
      [{ id: 1, text: "one" }],
      [{ id: 1, text: "duplicate" }],
      { getMessageId, direction: "append", dedupe: false }
    );

    expect(result.map((message) => message.text)).toEqual(["one", "duplicate"]);
  });

  it("supports custom id getters", () => {
    const result = mergeMessages(
      [{ key: "a" }],
      [{ key: "b" }],
      {
        getMessageId: (message) => message.key,
        direction: "append"
      }
    );

    expect(result.map((message) => message.key)).toEqual(["a", "b"]);
  });

  it("returns a new ordered array for empty incoming messages", () => {
    const existing = [{ id: 1, text: "one" }];
    const result = mergeMessages(existing, [], {
      getMessageId,
      direction: "append"
    });

    expect(result).toEqual(existing);
    expect(result).not.toBe(existing);
  });
});
