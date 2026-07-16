"use client";

import { useRef, useState, type CSSProperties } from "react";
import { mergeMessages } from "chat-scroll-behavior";
import { useChatScroll } from "chat-scroll-behavior/react";

type Message = {
	id: number;
	author: string;
	text: string;
	time: string;
	mine: boolean;
};

const authors = ["Mina", "Rafi", "Casey", "You"];
const samples = [
	"Can you check the latest handoff notes?",
	"Older history should load above this point without jumping.",
	"The bottom loader adds fresh messages when the thread is live.",
	"This keeps the conversation anchored while the app owns rendering.",
	"Scroll away from an edge, then return to request the next page.",
];

export function ChatClient() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [messages, setMessages] = useState<Message[]>(
		Array.from({ length: 30 }, (_, index) => buildMessage(index + 1)),
	);
	const [draft, setDraft] = useState("");

	const chatScroll = useChatScroll<Message>({
		containerRef,
		getMessageId: (message) => message.id,
		onLoadTop: async () => {
			const firstId = messages[0]?.id ?? 1;
			return Array.from({ length: 10 }, (_, index) => {
				const id = firstId - 10 + index;
				return buildMessage(id);
			});
		},
		onMergeTop: (incoming) => {
			setMessages((current) =>
				mergeMessages(current, incoming, {
					getMessageId: (message) => message.id,
					direction: "prepend",
				}),
			);
		},
		onLoadBottom: async () => {
			const lastId = messages[messages.length - 1]?.id ?? 0;
			return Array.from({ length: 5 }, (_, index) => {
				const id = lastId + index + 1;
				return buildMessage(id);
			});
		},
		onMergeBottom: (incoming) => {
			setMessages((current) =>
				mergeMessages(current, incoming, {
					getMessageId: (message) => message.id,
					direction: "append",
				}),
			);
		},
	});

	function sendMessage() {
		const text = draft.trim();
		if (!text) {
			return;
		}

		const nextId = (messages[messages.length - 1]?.id ?? 0) + 1;
		setMessages((current) =>
			mergeMessages(
				current,
				[
					{
						id: nextId,
						author: "You",
						text,
						time: "Now",
						mine: true,
					},
				],
				{
					getMessageId: (message) => message.id,
					direction: "append",
				},
			),
		);
		setDraft("");
		requestAnimationFrame(() => chatScroll.scrollToBottom());
	}

	const loadingText = chatScroll.isLoadingTop
		? "Loading older messages"
		: chatScroll.isLoadingBottom
			? "Loading new messages"
			: `${messages.length} messages loaded`;

	return (
		<main style={styles.page}>
			<section style={styles.shell}>
				<header style={styles.header}>
					<div>
						<h1 style={styles.title}>Operations room</h1>
						<p style={styles.subtitle}>Next.js client example</p>
					</div>
					<div style={styles.headerActions}>
						<span style={styles.status}>{loadingText}</span>
						<button
							style={styles.secondaryButton}
							type="button"
							onClick={() => chatScroll.scrollToBottom()}
						>
							Latest
						</button>
					</div>
				</header>

				<div ref={containerRef} style={styles.messages}>
					<div style={styles.marker}>Earlier messages</div>
					{messages.map((message) => (
						<article
							key={message.id}
							style={{
								...styles.message,
								alignSelf: message.mine ? "flex-end" : "flex-start",
							}}
						>
							<div
								style={{
									...styles.bubble,
									...(message.mine
										? styles.outgoingBubble
										: styles.incomingBubble),
								}}
							>
								<span style={styles.messageName}>{message.author}</span>
								<p style={styles.messageText}>{message.text}</p>
								<time style={styles.messageTime}>{message.time}</time>
							</div>
						</article>
					))}
				</div>

				<form
					style={styles.composer}
					onSubmit={(event) => {
						event.preventDefault();
						sendMessage();
					}}
				>
					<input
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						placeholder="Write a local demo message"
						style={styles.input}
					/>
					<button style={styles.primaryButton} type="submit">
						Send
					</button>
				</form>
			</section>
		</main>
	);
}

function buildMessage(id: number): Message {
	const normalized = Math.abs(id);
	return {
		id,
		author: authors[normalized % authors.length],
		text: samples[normalized % samples.length],
		time: formatTime(normalized),
		mine: normalized % 4 === 0,
	};
}

function formatTime(seed: number) {
	const hour = 9 + Math.floor((seed % 18) / 3);
	const minute = String((seed * 7) % 60).padStart(2, "0");
	return `${hour}:${minute}`;
}

const styles = {
	page: {
		background: "#f4f6f8",
		color: "#17212b",
		minHeight: "100vh",
		padding: 24,
	},
	shell: {
		background: "#ffffff",
		border: "1px solid #d9e0e7",
		display: "grid",
		gridTemplateRows: "auto minmax(0, 1fr) auto",
		height: "calc(100vh - 48px)",
		margin: "0 auto",
		maxWidth: 900,
		minHeight: 520,
	},
	header: {
		alignItems: "center",
		borderBottom: "1px solid #d9e0e7",
		display: "flex",
		gap: 16,
		justifyContent: "space-between",
		padding: "16px 20px",
	},
	title: {
		fontSize: 18,
		lineHeight: 1.2,
		margin: 0,
	},
	subtitle: {
		color: "#657282",
		fontSize: 13,
		margin: "4px 0 0",
	},
	headerActions: {
		alignItems: "center",
		display: "flex",
		gap: 10,
	},
	status: {
		color: "#657282",
		fontSize: 13,
	},
	messages: {
		background: "#f7f9fb",
		display: "flex",
		flexDirection: "column",
		gap: 10,
		minHeight: 0,
		overflowY: "auto",
		padding: "18px 20px",
	},
	marker: {
		alignSelf: "center",
		background: "#eef2f7",
		border: "1px solid #dce4ed",
		borderRadius: 8,
		color: "#657282",
		fontSize: 12,
		padding: "6px 10px",
	},
	message: {
		display: "flex",
		maxWidth: "78%",
	},
	bubble: {
		border: "1px solid #d9e0e7",
		borderRadius: 8,
		boxShadow: "0 1px 1px rgba(15, 23, 42, 0.04)",
		display: "grid",
		gap: 5,
		padding: "10px 12px",
	},
	incomingBubble: {
		background: "#ffffff",
	},
	outgoingBubble: {
		background: "#e8f3ee",
		borderColor: "#c7dfd4",
	},
	messageName: {
		color: "#657282",
		fontSize: 12,
	},
	messageText: {
		fontSize: 14,
		lineHeight: 1.45,
		margin: 0,
	},
	messageTime: {
		color: "#657282",
		fontSize: 11,
		justifySelf: "end",
	},
	composer: {
		borderTop: "1px solid #d9e0e7",
		display: "grid",
		gap: 12,
		gridTemplateColumns: "minmax(0, 1fr) auto",
		padding: "14px 20px",
	},
	input: {
		border: "1px solid #d9e0e7",
		borderRadius: 8,
		font: "inherit",
		minHeight: 40,
		minWidth: 0,
		padding: "0 12px",
	},
	primaryButton: {
		background: "#2563eb",
		border: "1px solid #2563eb",
		borderRadius: 8,
		color: "#ffffff",
		cursor: "pointer",
		font: "inherit",
		minHeight: 40,
		minWidth: 84,
		padding: "0 12px",
	},
	secondaryButton: {
		background: "#ffffff",
		border: "1px solid #d9e0e7",
		borderRadius: 8,
		color: "#17212b",
		cursor: "pointer",
		font: "inherit",
		minHeight: 36,
		padding: "0 12px",
	},
} satisfies Record<string, CSSProperties>;
