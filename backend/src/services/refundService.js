import { randomUUID } from "node:crypto";
import { evaluatePolicy, enforcePolicyOnLlmDecision } from "./policyEngine.js";
import { getLlmProvider } from "./llm/index.js";
import { POLICY } from "../data/policy.js";
import { saveRefundRequest } from "../db.js";

/**
 * Orchestrates the full refund-request pipeline:
 *
 *   1. Deterministic policy engine (hard rules, in code)  -> instant outcome or
 *   2. LLM classification of free-text intent (soft rules) ->
 *   3. Policy re-validation of the LLM's recommendation    ->
 *   4. Persist decision + full audit trail
 *
 * The LLM can recommend, but the policy engine decides. This is the core
 * safety property of the system: money decisions are never delegated to a
 * language model.
 */
export async function processRefundRequest({ customer, order, message }) {
  // ---- Step 1: deterministic rules ------------------------------------
  const policyResult = evaluatePolicy({ order });

  const llmContext = {
    daysSinceDelivery: policyResult.context.daysSinceDelivery,
    daysSincePlaced: policyResult.context.daysSincePlaced,
    returnWindowDays: POLICY.rules.orderAgeDays.windowDays,
    changeOfMindWindowDays: POLICY.rules.changeOfMindDays.windowDays,
    highValueThreshold: POLICY.rules.highValueThreshold.amount,
  };

  // ---- Step 2+3: LLM classification, then re-validate -----------------
  let decision;
  let ruleIds = policyResult.triggered.map((t) => t.id);
  let reason;
  let llmClassification = null;
  let customerResponse;

  if (policyResult.outcome === "LLM_REVIEW") {
    const provider = getLlmProvider();
    const classification = await provider.classify({
      message,
      order,
      customer,
      policyContext: llmContext,
    });
    llmClassification = { ...classification, provider: provider.name };

    // Safety net: LLM recommendation must survive policy re-check
    decision = enforcePolicyOnLlmDecision({
      llmDecision: classification.recommendedOutcome,
      policyOutcome: "LLM_REVIEW",
      order,
    });

    // Injection attempt always escalates, regardless of recommendation
    if (classification.injectionAttemptDetected) {
      decision = "ESCALATED";
      ruleIds.push(POLICY.rules.suspicious.id);
    }

    reason = buildReason({ classification, decision, policyContext: llmContext });
    customerResponse = classification.customerResponseDraft;
  } else {
    // Deterministic outcome — LLM is not consulted for money-decisions
    decision = policyResult.outcome;
    const ruleDesc = policyResult.triggered.map((t) => t.description).join(" ");
    reason = `Decided by deterministic policy engine (no LLM involved): ${ruleDesc}`;
    customerResponse = buildDeterministicResponse({ decision, order, policyResult });
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

function buildReason({ classification, decision, policyContext }) {
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

function buildDeterministicResponse({ decision, order, policyResult }) {
  if (decision === "DENIED") {
    const finalSale = (order.items ?? []).some((i) => i.finalSale);
    return finalSale
      ? `We're sorry, order ${order.id} contains final-sale item(s) which are not eligible for refund under our policy.`
      : `We're sorry, order ${order.id} falls outside our ${POLICY.rules.orderAgeDays.windowDays}-day refund window and is no longer eligible for a refund.`;
  }
  return `Order ${order.id} exceeds our $${POLICY.rules.highValueThreshold.amount} automatic-refund limit, so it has been forwarded to a human support agent for review.`;
}
