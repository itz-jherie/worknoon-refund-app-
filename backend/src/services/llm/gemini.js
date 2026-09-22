import { LLM_INSTRUCTIONS, RESPONSE_SCHEMA } from "./index.js";

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Google Gemini classifier. Uses responseMimeType application/json with a
 * responseSchema so the model's output is guaranteed to match our schema.
 */
export async function classifyWithGemini({ message, order, customer, policyContext }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
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

  const res = await fetch(`${API_URL}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: LLM_INSTRUCTIONS }] },
      contents: [{ role: "user", parts: [{ text: userPayload }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
  return sanitize(parsed);
}

function sanitize(parsed) {
  const allowedCategories = ["DAMAGED_ITEM", "INCORRECT_ITEM", "NOT_AS_DESCRIBED", "CHANGE_OF_MIND", "SUSPICIOUS", "UNCLEAR"];
  return {
    isRefundRequest: parsed.isRefundRequest !== false,
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
