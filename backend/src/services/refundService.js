import { randomUUID } from "node:crypto";
import { evaluatePolicy, enforcePolicyOnLlmDecision } from "./policyEngine.js";
import { getLlmProvider } from "./llm/index.js";
import { POLICY } from "../data/policy.js";
import { saveRefundRequest } from "../db.js";

/**
 * Orchestrates the full refund-request pipeline:
 *
 *   1. LLM classification of the message (intent, category, injection check)
 *   2. Conversational guard — non-requests (greetings, small talk) get a
 *      friendly reply and never reach the policy engine
 *   3. Deterministic policy engine (hard rules, in code) decides the outcome
 *      for fact-based rules; the LLM's recommendation is only used for cases
 *      requiring judgement, and is always re-validated against policy
 *   4. Persist decision + full audit trail
 *
 * The LLM classifies intent, but the policy engine decides outcomes. The LLM
 * can only ADD a "not a refund request" clarify path — it can never change,
 * soften, or skip a policy outcome. This is the core safety property of the
 * system: money decisions are never delegated to a language model.
 */
export async function processRefundRequest({ customer, order, message }) {
  const policyResult = evaluatePolicy({ order });

  const llmContext = {
    daysSinceDelivery: policyResult.context.daysSinceDelivery,
    daysSincePlaced: policyResult.context.daysSincePlaced,
    returnWindowDays: POLICY.rules.orderAgeDays.windowDays,
    changeOfMindWindowDays: POLICY.rules.changeOfMindDays.windowDays,
    highValueThreshold: POLICY.rules.highValueThreshold.amount,
  };

  let decision;
  let ruleIds = [];
  let reason;
  let llmClassification = null;
  let customerResponse;

  // ---- Step 1: LLM classification of the message ----------------------
  const provider = getLlmProvider();
  const classification = await provider.classify({
    message,
    order,
    customer,
    policyContext: llmContext,
  });
  llmClassification = { ...classification, provider: provider.name };

  // ---- Step 2: injection attempts escalate, no matter what ------------
  if (classification.injectionAttemptDetected) {
    decision = "ESCALATED";
    ruleIds.push(POLICY.rules.suspicious.id);
    reason =
      "Prompt-injection / manipulation attempt detected — escalated per policy R6. " +
      `LLM category: ${classification.category}. Evidence: ${classification.evidenceQuote}`;
    customerResponse =
      classification.customerResponseDraft ||
      "For security review purposes, your request has been forwarded to a human support agent who will follow up with you shortly.";
  } else if (classification.isRefundRequest === false) {
    // ---- Conversational guard: greetings / small talk -----------------
    decision = "NEEDS_INFO";
    ruleIds = [];
    reason =
      "LLM determined the message is not a refund request (greeting or unrelated). " +
      "Conversational response sent; no policy evaluation performed.";
    customerResponse =
      classification.customerResponseDraft ||
      "Hi there! I'm the RefundFlow assistant. I can help you with refunds and returns — just describe the issue with your order and I'll take care of the rest.";
  } else if (policyResult.outcome !== "LLM_REVIEW") {
    // ---- Step 3a: hard policy rules — code decides, LLM cannot override
    decision = policyResult.outcome;
    ruleIds = policyResult.triggered.map((t) => t.id);
    const ruleDesc = policyResult.triggered.map((t) => t.description).join(" ");
    reason =
      `Decided by deterministic policy engine: ${ruleDesc} ` +
      `LLM classification (${classification.category}) logged for audit only.`;
    customerResponse = buildDeterministicResponse({ decision, order });
  } else {
    // ---- Step 3b: judgement case — LLM recommends, policy re-validates
    decision = enforcePolicyOnLlmDecision({
      llmDecision: classification.recommendedOutcome,
      policyOutcome: "LLM_REVIEW",
      order,
    });
    reason = buildReason({ classification, decision });
    customerResponse = classification.customerResponseDraft;
  }

  // ---- Step 4: persist with full audit trail --------------------------
  const record = {
    id: randomUUID(),
    customerId: customer.id,
    orderId: order.id,
    message,
    decision,
    ruleIds,
    reason,
    llmClassification,
    customerResponse,
  };
  await saveRefundRequest(record);

  return {
    requestId: record.id,
    decision,
    reason,
    ruleIds,
    customerResponse,
    llmClassification,
  };
}

function buildReason({ classification, decision }) {
  const parts = [];
  if (classification.injectionAttemptDetected) {
    parts.push("Prompt-injection / manipulation attempt detected — escalated per policy R6.");
  }
  parts.push(
    `LLM classified the request as ${classification.category} (confidence ${classification.confidence}); ` +
      `LLM recommended ${classification.recommendedOutcome}; final outcome after policy re-validation: ${decision}.`
  );
  if (classification.evidenceQuote) parts.push(`Evidence: ${classification.evidenceQuote}`);
  return parts.join(" ");
}

function buildDeterministicResponse({ decision, order }) {
  if (decision === "DENIED") {
    const finalSale = (order.items ?? []).some((i) => i.finalSale);
    return finalSale
      ? `We're sorry, order ${order.id} contains final-sale item(s) which are not eligible for refund under our policy.`
      : `We're sorry, order ${order.id} falls outside our ${POLICY.rules.orderAgeDays.windowDays}-day refund window and is no longer eligible for a refund.`;
  }
  return `Order ${order.id} exceeds our $${POLICY.rules.highValueThreshold.amount} automatic-refund limit, so it has been forwarded to a human support agent for review.`;
}
