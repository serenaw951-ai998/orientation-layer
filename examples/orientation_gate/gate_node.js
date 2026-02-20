/**
 * Minimal Orientation Gate runner (LLM-optional).
 * If OPENAI_API_KEY exists, it will call OpenAI. Otherwise it prints the prompt for manual LLM use.
 *
 * Usage:
 *   node orientation_gate/gate_node.js examples/demo_input.json
 */

import fs from "fs";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node orientation_gate/gate_node.js examples/demo_input.json");
  process.exit(1);
}

const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const promptTemplate = fs.readFileSync("orientation_gate/gate_prompt.md", "utf8");

const prompt = promptTemplate
  .replace("{{goal}}", input.goal || "")
  .replace("{{context}}", input.context || "")
  .replace("{{constraints}}", JSON.stringify(input.constraints || [], null, 2));

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.log("OPENAI_API_KEY not set. Copy the prompt below into any LLM and paste back the JSON result.\n");
  console.log(prompt);
  process.exit(0);
}

// ---- Optional: OpenAI call (requires npm i openai) ----
import OpenAI from "openai";

const client = new OpenAI({ apiKey });

const resp = await client.chat.completions.create({
  model: "gpt-4.1-mini",
  messages: [
    { role: "system", content: "Return ONLY valid JSON. No markdown." },
    { role: "user", content: prompt }
  ],
  temperature: 0.2
});

console.log(resp.choices[0]?.message?.content ?? "");
