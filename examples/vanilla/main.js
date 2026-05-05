import {
  createChatScrollController,
  mergeMessages
} from "../../dist/index.js";

const container = document.querySelector("#messages");
let firstId = 1;
let lastId = 30;
let messages = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  text: `Message ${index + 1}`
}));

function render() {
  container.innerHTML = messages
    .map((message) => `<div class="message">${message.text}</div>`)
    .join("");
}

function fetchOlderMessages() {
  const older = Array.from({ length: 10 }, (_, index) => {
    const id = firstId - 10 + index;
    return { id, text: `Message ${id}` };
  });
  firstId -= 10;
  return older;
}

function fetchNewerMessages() {
  const newer = Array.from({ length: 5 }, (_, index) => {
    const id = lastId + index + 1;
    return { id, text: `Message ${id}` };
  });
  lastId += 5;
  return newer;
}

render();
container.scrollTop = container.scrollHeight;

createChatScrollController({
  container,
  getMessageId: (message) => message.id,
  onLoadTop: fetchOlderMessages,
  onMergeTop: (incoming) => {
    messages = mergeMessages(messages, incoming, {
      getMessageId: (message) => message.id,
      direction: "prepend"
    });
    render();
  },
  onLoadBottom: fetchNewerMessages,
  onMergeBottom: (incoming) => {
    messages = mergeMessages(messages, incoming, {
      getMessageId: (message) => message.id,
      direction: "append"
    });
    render();
  }
});
