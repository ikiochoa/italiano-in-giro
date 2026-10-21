// Italiano in giro — words for any topic, written by Claude.
// POST /api/topic-words  { topic, level, have: ["la parola", ...] }  →  { words: [{ it, en, es }] }
// Only signed-in people who are in a group can use it (checked with their Supabase token), so the
// API key can't be spent by strangers. Needs ANTHROPIC_API_KEY in Netlify's environment variables.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// public values, the same as web/config.js
const SUPABASE_URL = "https://fcmeacdwqxapwrgcvpml.supabase.co";
const SUPABASE_KEY = "sb_publishable_NNOwRNesGWZTsbHj7ekRQA_ZNE0QvwY";
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const Words = z.object({
  words: z.array(z.object({
    it: z.string().describe("Italian word or short phrase; nouns with their definite article (il, lo, la, l', i, gli, le)"),
    g: z.enum(["m", "f", ""]).describe("gender of a noun, empty for anything else"),
    en: z.string().describe("English translation"),
    es: z.string().describe("Spanish translation, nouns with their article")
  }))
});

const json = (status, body) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

// who is asking: a signed-in person who belongs to at least one group
async function member(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const headers = { apikey: SUPABASE_KEY, authorization: "Bearer " + token };
  const user = await fetch(SUPABASE_URL + "/auth/v1/user", { headers });
  if (!user.ok) return null;
  const groups = await fetch(SUPABASE_URL + "/rest/v1/group_members?select=group_id&limit=1", { headers });
  if (!groups.ok) return null;
  return (await groups.json()).length ? await user.json() : false;
}

async function words(topic, level, have) {
  const client = new Anthropic();
  const msg = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Words) },
    system: "You write vocabulary lists for adult learners of Italian. The learners read English or Spanish. " +
      "Use standard, everyday Italian as spoken in Italy today, and make every translation accurate.",
    messages: [{
      role: "user",
      content: "Topic: " + topic + "\nLearner's CILS level: " + level + "\n\n" +
        "Write the 30 most useful Italian words and short phrases for this topic, for someone at this level. " +
        "Mix nouns, verbs (in the infinitive), adjectives and two or three set phrases people really say. " +
        "Start with the essential words, then the more specific ones." +
        (have.length ? "\nLeave out these, which the learner already has: " + have.join(", ") : "")
    }]
  });
  if (msg.stop_reason === "refusal" || !msg.parsed_output) return null;
  const seen = new Set(have.map(s => s.toLowerCase()));
  return msg.parsed_output.words
    .map(w => ({ it: w.it.trim(), g: w.g, en: w.en.trim(), es: w.es.trim() }))
    .filter(w => w.it && (w.en || w.es) && !seen.has(w.it.toLowerCase()) && seen.add(w.it.toLowerCase()));
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "method" });
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: "not_configured" });
  let body;
  try { body = await req.json(); } catch (e) { return json(400, { error: "bad_request" }); }
  const topic = String(body.topic || "").trim().slice(0, 80);
  const level = LEVELS.includes(body.level) ? body.level : "A1";
  const have = (Array.isArray(body.have) ? body.have : []).map(String).slice(0, 200);
  if (!topic) return json(400, { error: "bad_request" });
  const who = await member(req);
  if (who === null) return json(401, { error: "signed_out" });
  if (who === false) return json(403, { error: "no_group" });

  // Claude takes a while; a streamed response may run for 60 seconds instead of 10
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(c) {
      try {
        const list = await words(topic, level, have);
        c.enqueue(enc.encode(JSON.stringify(list && list.length ? { words: list } : { error: "no_words" })));
      } catch (e) {
        console.error("topic-words", e);
        c.enqueue(enc.encode(JSON.stringify({ error: "failed" })));
      }
      c.close();
    }
  });
  return new Response(stream, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
};

export const config = { path: "/api/topic-words" };
