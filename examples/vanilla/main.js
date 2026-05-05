import { createChatScrollController, mergeMessages } from "../../dist/index.js";

const container = document.querySelector("#messages");
const status = document.querySelector("#status");
const jumpBottomButton = document.querySelector("#jump-bottom");
const composer = document.querySelector("#composer");
const input = document.querySelector("#message-input");
const names = ["Mina", "Rafi", "Casey", "You"];
const samples = [
	"Can you check the latest handoff notes?",
	"Older history should load above this point without jumping.",
	"The bottom loader adds fresh messages when the thread is live.",
	"This keeps the conversation anchored while the app owns rendering.",
	"Scroll away from an edge, then return to request the next page.",
];

let firstId = 1;
let lastId = 30;
let messages = Array.from({ length: 30 }, (_, index) => ({
	id: index + 1,
	author: names[index % names.length],
	text: samples[index % samples.length],
	time: formatTime(index + 1),
	mine: index % 4 === 3,
}));

function render() {
	container.innerHTML = messages
		.map((message, index) => {
			const marker =
				index === 0 || index === 15
					? `<div class="load-marker">${
							index === 0 ? "Earlier messages" : "Today"
						}</div>`
					: "";

			return `${marker}
        <article class="message ${message.mine ? "outgoing" : "incoming"}">
          <div class="bubble">
            <span class="message-name">${escapeHtml(message.author)}</span>
            <p class="message-text">${escapeHtml(message.text)}</p>
            <time class="message-time">${escapeHtml(message.time)}</time>
          </div>
        </article>`;
		})
		.join("");
}

function fetchOlderMessages() {
	const older = Array.from({ length: 10 }, (_, index) => {
		const id = firstId - 10 + index;
		return buildMessage(id);
	});
	firstId -= 10;
	return older;
}

function fetchNewerMessages() {
	const newer = Array.from({ length: 5 }, (_, index) => {
		const id = lastId + index + 1;
		return buildMessage(id);
	});
	lastId += 5;
	return newer;
}

function buildMessage(id) {
	const normalized = Math.abs(id);
	return {
		id,
		author: names[normalized % names.length],
		text: samples[normalized % samples.length],
		time: formatTime(normalized),
		mine: normalized % 4 === 0,
	};
}

function formatTime(seed) {
	const hour = 9 + Math.floor((seed % 18) / 3);
	const minute = String((seed * 7) % 60).padStart(2, "0");
	return `${hour}:${minute}`;
}

function setStatus(text) {
	status.textContent = text;
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

render();
container.scrollTop = container.scrollHeight;

const controller = createChatScrollController({
	container,
	getMessageId: (message) => message.id,
	onLoadTop: () => {
		setStatus("Loading older messages");
		return fetchOlderMessages();
	},
	onMergeTop: (incoming) => {
		messages = mergeMessages(messages, incoming, {
			getMessageId: (message) => message.id,
			direction: "prepend",
		});
		render();
		setStatus("Older messages loaded");
	},
	onLoadBottom: () => {
		setStatus("Loading new messages");
		return fetchNewerMessages();
	},
	onMergeBottom: (incoming) => {
		messages = mergeMessages(messages, incoming, {
			getMessageId: (message) => message.id,
			direction: "append",
		});
		render();
		setStatus("New messages loaded");
	},
});

jumpBottomButton.addEventListener("click", () => {
	controller.scrollToBottom();
});

composer.addEventListener("submit", (event) => {
	event.preventDefault();
	const text = input.value.trim();
	if (!text) {
		return;
	}

	lastId += 1;
	messages = mergeMessages(
		messages,
		[
			{
				id: lastId,
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
	);
	input.value = "";
	render();
	controller.scrollToBottom();
});
