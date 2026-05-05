import { useRef, useState } from "react";
import { mergeMessages } from "chat-scroll-behavior";
import { useChatScroll } from "chat-scroll-behavior/react";

type Message = {
  id: number;
  text: string;
};

const initialMessages = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  text: `Message ${index + 1}`
}));

export function ChatExample() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [firstId, setFirstId] = useState(1);
  const [lastId, setLastId] = useState(30);

  const chatScroll = useChatScroll<Message>({
    containerRef,
    getMessageId: (message) => message.id,
    onLoadTop: () => {
      const nextFirstId = firstId - 10;
      setFirstId(nextFirstId);
      return Array.from({ length: 10 }, (_, index) => ({
        id: nextFirstId + index,
        text: `Message ${nextFirstId + index}`
      }));
    },
    onMergeTop: (incoming) => {
      setMessages((current) =>
        mergeMessages(current, incoming, {
          getMessageId: (message) => message.id,
          direction: "prepend"
        })
      );
    },
    onLoadBottom: () => {
      const nextLastId = lastId + 5;
      const incoming = Array.from({ length: 5 }, (_, index) => ({
        id: lastId + index + 1,
        text: `Message ${lastId + index + 1}`
      }));
      setLastId(nextLastId);
      return incoming;
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
    <section>
      <div
        ref={containerRef}
        style={{
          border: "1px solid #d0d7de",
          height: 420,
          overflowY: "auto",
          padding: 12
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{ borderBottom: "1px solid #eef1f4", padding: "12px 4px" }}
          >
            {message.text}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => chatScroll.scrollToBottom()}>
        Jump to latest
      </button>
    </section>
  );
}
