import test from "node:test";
import assert from "node:assert/strict";
import { parseJSON } from "../src/lib/llm.mjs";

// The tags are assembled rather than written literally, for the same reason
// they are in llm.mjs: a literal <think> in source has already been eaten once.
const THINK = (inner) => `<think>${inner}</think>`;
const THINKING = (inner) => `<thinking>${inner}</thinking>`;

test("parses a bare JSON object", () => {
  assert.deepEqual(parseJSON('{"company":"Wipro"}'), { company: "Wipro" });
});

test("parses JSON wrapped in a markdown fence", () => {
  assert.deepEqual(parseJSON('```json\n{"company":"Wipro"}\n```'), { company: "Wipro" });
  assert.deepEqual(parseJSON('```\n{"company":"Wipro"}\n```'), { company: "Wipro" });
});

test("parses JSON buried in chatter", () => {
  assert.deepEqual(parseJSON('Sure! Here it is: {"company":"Wipro"} — hope that helps.'), {
    company: "Wipro",
  });
});

test("parses a top-level array", () => {
  assert.deepEqual(parseJSON("[1, 2, 3]"), [1, 2, 3]);
});

test("strips a reasoning block before the answer", () => {
  // The regression this whole module exists for. The scratchpad contains braces,
  // so a parser that does not strip it starts reading mid-thought and fails.
  const response = THINK('the answer might be {"company":"Wrong"}') + '{"company":"Wipro"}';
  assert.deepEqual(parseJSON(response), { company: "Wipro" });
});

test("strips a <thinking> block too", () => {
  const response = THINKING('considering {"company":"Wrong"}') + '\n{"company":"Wipro"}';
  assert.deepEqual(parseJSON(response), { company: "Wipro" });
});

test("strips a reasoning block wrapping a fenced answer", () => {
  const response = THINK('{"junk":1}') + '```json\n{"company":"Wipro"}\n```';
  assert.deepEqual(parseJSON(response), { company: "Wipro" });
});

test("strips multiple reasoning blocks", () => {
  const response = THINK("first") + "some text" + THINK("second") + '{"company":"Wipro"}';
  assert.deepEqual(parseJSON(response), { company: "Wipro" });
});

test("throws when the response is cut off inside a reasoning block", () => {
  // Truncated by the token cap: there is no answer to salvage, and the braces
  // in the scratchpad must not be mistaken for one.
  assert.throws(
    () => parseJSON('<think>still working, maybe {"company":"Wrong"}'),
    /truncated inside a reasoning block/
  );
});

test("throws when there is no JSON at all", () => {
  assert.throws(() => parseJSON("I cannot help with that."), /no JSON/);
  assert.throws(() => parseJSON(""), /no JSON/);
});

test("throws on unterminated JSON", () => {
  assert.throws(() => parseJSON('{"company": "Wip'), /unterminated JSON|Unexpected|Unterminated/);
});
