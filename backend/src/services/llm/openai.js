import { LLM_INSTRUCTIONS, RESPONSE_SCHEMA } from "./index.js";

/**
 * OpenAI classifier using Chat Completions with strict structured output
 * (json_schema). Uses the built-in fetch available in Node >= 18.
 */
export async function classifyWithOpenAI({ message, order, customer, policyContext }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const userPayload = JSON.stringify(
    {
      customer_message: message,
      order_facts: {
        order_id: order.id,
        items: order.items,
        total: order.total,
        placed_at: order.placedAt,
        delivered_at: order.deliveredAt,
        status: order.status,
      },
      customer_facts: {
        name: customer.name,
        account_age_days: Math.floor((Date.now() - new Date(customer.joinedAt)) / 86_400_000),
        risk_level: customer.riskLevel,
      },
      policy_context: policyContext,
    },
    null,
    2
  );

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: LLM_INSTRUCTIONS },
        { role: "user", content: userPayload },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "refund_classification", strict: true, schema: RESPONSE_SCHEMA },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return sanitize(parsed);
}

function sanitize(parsed) {
  const allowedCategories = ["DAMAGED_ITEM", "INCORRECT_ITEM", "NOT_AS_DESCRIBED", "CHANGE_OF_MIND", "SUSPICIOUS", "UNCLEAR"];
  return {
    category: allowedCategories.includes(parsed.category) ? parsed.category : "UNCLEAR",
    recommendedOutcome: ["APPROVED", "DENIED", "ESCALATED"].includes(parsed.recommendedOutcome)
      ? parsed.recommendedOutcome
      : "ESCALATED",
    confidence: Number(parsed.confidence) || 0,
    evidenceQuote: String(parsed.evidenceQuote ?? "").slice(0, 300),
    injectionAttemptDetected: Boolean(parsed.injectionAttemptDetected),
    reasoningSummary: String(parsed.reasoningSummary ?? "").slice(0, 1000),
    customerResponseDraft: String(parsed.customerResponseDraft ?? "").slice(0, 2000),
  };
}
