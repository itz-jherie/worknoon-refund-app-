import { POLICY } from "../../data/policy.js";

/**
 * Deterministic mock classifier — used when no API key is configured
 * (LLM_PROVIDER=mock). Keeps the entire product flow functional with zero
 * external dependencies, so `docker-compose up` works out of the box.
 *
 * It mimics the real provider contract: same fields, same allow-lists.
 * Keyword-based heuristic replaces the LLM's language understanding.
 */
export async function classifyWithMock({ message, order, customer, policyContext }) {
  const text = String(message).toLowerCase();

  const injectionPatterns = [
    /ignore (your|all|previous) (rules|instructions|policy)/,
    /disregard (your|the) (policy|rules|instructions)/,
    /you (must|have to|are required to) (approve|refund)/,
    /act as (an? )?(admin|manager|developer)/,
    /system prompt/,
    /developer mode/,
    /override (your|the) (policy|rules)/,
    /my (manager|supervisor) (said|approved)/,
  ];
  const injectionAttemptDetected = injectionPatterns.some((p) => p.test(text));

  let category = "UNCLEAR";
  if (injectionAttemptDetected) {
    category = "SUSPICIOUS";
  } else if (/damage|broken|smashed|crushed|shattered|cracked|defective|leaking/.test(text)) {
    category = "DAMAGED_ITEM";
  } else if (/wrong item|wrong size|wrong color|wrong colour|not what i ordered|sent me the/.test(text)) {
    category = "INCORRECT_ITEM";
  } else if (/not as described|doesn'?t match|different from the (picture|description)/.test(text)) {
    category = "NOT_AS_DESCRIBED";
  } else if (/changed my mind|don'?t (want|need)|no longer (want|need)|accidental|by mistake/.test(text)) {
    category = "CHANGE_OF_MIND";
  }

  const recommendedOutcome =
    category === "SUSPICIOUS"
      ? "ESCALATED"
      : category === "DAMAGED_ITEM" || category === "INCORRECT_ITEM" || category === "NOT_AS_DESCRIBED"
        ? "APPROVED"
        : category === "CHANGE_OF_MIND"
          ? policyContext?.daysSinceDelivery <= POLICY.rules.changeOfMindDays.windowDays
            ? "APPROVED"
            : "DENIED"
          : "ESCALATED";

  const words = text.split(/\s+/).filter(Boolean).slice(0, 12).join(" ");
  return {
    category,
    recommendedOutcome,
    confidence: 0.6,
    evidenceQuote: words ? `"${words}${text.split(/\s+/).length > 12 ? "..." : ""}"` : "",
    injectionAttemptDetected,
    reasoningSummary: `Mock classifier (no LLM key configured): matched category ${category} via keyword heuristics. Configure LLM_PROVIDER=gemini or openai for real language understanding.`,
    customerResponseDraft:
      category === "SUSPICIOUS"
        ? "For security review purposes, your request has been forwarded to a human support agent who will follow up with you shortly."
        : `Thank you for reaching out about order ${order.id}. ${
            recommendedOutcome === "APPROVED"
              ? "We've reviewed your request and it has been approved — your refund is being processed."
              : recommendedOutcome === "DENIED"
                ? "Unfortunately, based on our refund policy your request is not eligible for a refund."
                : "Your request has been forwarded to a human support agent for review."
          }`,
  };
}
