"use client";

import { useRef, useState } from "react";
import { mergeMessages } from "chat-scroll-behavior";
import { useChatScroll } from "chat-scroll-behavior/react";

type Message = {
  id: number;
  text: string;
};

export function ChatClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>(
    Array.from({ length: 30 }, (_, index) => ({
      id: index + 1,
      text: `Message ${index + 1}`
    }))
  );

  useChatScroll<Message>({
    containerRef,
    getMessageId: (message) => message.id,
    onLoadTop: async () => {
      const firstId = messages[0]?.id ?? 1;
      return Array.from({ length: 10 }, (_, index) => {
        const id = firstId - 10 + index;
        return { id, text: `Message ${id}` };
      });
    },
    onMergeTop: (incoming) => {
      setMessages((current) =>
        mergeMessages(current, incoming, {
          getMessageId: (message) => message.id,
          direction: "prepend"
        })
      );
    },
    onLoadBottom: async () => {
      const lastId = messages[messages.length - 1]?.id ?? 0;
      return Array.from({ length: 5 }, (_, index) => {
        const id = lastId + index + 1;
        return { id, text: `Message ${id}` };
      });
    },
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
    <main>
      <div
        ref={containerRef}
        style={{
          height: "80vh",
          overflowY: "auto",
          padding: 16
        }}
      >
        {messages.map((message) => (
          <article key={message.id} style={{ padding: "12px 0" }}>
            {message.text}
          </article>
        ))}
      </div>
    </main>
  );
}
