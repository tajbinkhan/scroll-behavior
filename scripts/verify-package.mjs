import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const esm = await import("chat-scroll-behavior");
const esmReact = await import("chat-scroll-behavior/react");
const cjs = require("chat-scroll-behavior");
const cjsReact = require("chat-scroll-behavior/react");

assert.equal(typeof esm.createChatScrollController, "function");
assert.equal(typeof esm.mergeMessages, "function");
assert.equal(typeof esmReact.useChatScroll, "function");
assert.equal(typeof cjs.createChatScrollController, "function");
assert.equal(typeof cjs.mergeMessages, "function");
assert.equal(typeof cjsReact.useChatScroll, "function");

assert.equal(existsSync(new URL("../dist/index.d.ts", import.meta.url)), true);
assert.equal(existsSync(new URL("../dist/index.d.cts", import.meta.url)), true);
assert.equal(existsSync(new URL("../dist/react.d.ts", import.meta.url)), true);
assert.equal(existsSync(new URL("../dist/react.d.cts", import.meta.url)), true);

console.log("Package exports verified.");
