import { POLICY } from "../data/policy.js";

/**
 * Deterministic policy engine.
 *
 * Evaluates hard, fact-based rules in a fixed priority order. These decisions
 * NEVER depend on the LLM. The LLM is only consulted for the remaining cases
 * that require interpreting free-text intent (damaged/incorrect/suspicious).
 *
 * @returns {{
 *  outcome: 'APPROVED'|'DENIED'|'ESCALATED'|'LLM_REVIEW',
 *  triggered: Array<{id: string, description: string}>,
 *  context: { daysSinceDelivery: number, daysSincePlaced: number }
 * }}
 */
export function evaluatePolicy({ order, amount, now = new Date() }) {
  const triggered = [];

  // Facts derived from order data (computed here, passed to LLM as read-only context)
  const daysSinceDelivery = order?.deliveredAt
    ? Math.floor((now - new Date(order.deliveredAt)) / 86_400_000)
    : null;
  const daysSincePlaced = Math.floor((now - new Date(order.placedAt)) / 86_400_000);

  // R1 — final sale items: hard deny
  const hasFinalSale = (order.items ?? []).some((i) => i.finalSale);
  if (hasFinalSale) {
    triggered.push({
      id: POLICY.rules.finalSale.id,
      description: POLICY.rules.finalSale.description,
    });
    return {
      outcome: "DENIED",
      triggered,
      context: { daysSinceDelivery, daysSincePlaced },
    };
  }

  // R2 — order age window: hard deny
  const ageRef = daysSinceDelivery ?? daysSincePlaced;
  if (ageRef > POLICY.rules.orderAgeDays.windowDays) {
    triggered.push({
      id: POLICY.rules.orderAgeDays.id,
      description: `${POLICY.rules.orderAgeDays.description} (order age: ${ageRef} days)`,
    });
    return {
      outcome: "DENIED",
      triggered,
      context: { daysSinceDelivery, daysSincePlaced },
    };
  }

  // R3 — high-value refunds: always escalate to a human, regardless of story
  if (Number(order.total) > POLICY.rules.highValueThreshold.amount) {
    triggered.push({
      id: POLICY.rules.highValueThreshold.id,
      description: `${POLICY.rules.highValueThreshold.description} (order total: $${order.total})`,
    });
    return {
      outcome: "ESCALATED",
      triggered,
      context: { daysSinceDelivery, daysSincePlaced },
    };
  }

  // Remaining rules depend on understanding the customer's message.
  // Hand off to the LLM layer for intent classification.
  return {
    outcome: "LLM_REVIEW",
    triggered,
    context: { daysSinceDelivery, daysSincePlaced },
  };
}

/**
 * Validate the LLM's proposed outcome against hard policy facts.
 * The LLM can never override R1/R2/R3 — this is the safety net.
 */
export function enforcePolicyOnLlmDecision({ llmDecision, policyOutcome, order }) {
  if (policyOutcome !== "LLM_REVIEW") return policyOutcome;

  const hasFinalSale = (order.items ?? []).some((i) => i.finalSale);
  const daysSinceDelivery = order?.deliveredAt
    ? Math.floor((Date.now() - new Date(order.deliveredAt)) / 86_400_000)
    : null;
  const ageRef = daysSinceDelivery ?? Math.floor((Date.now() - new Date(order.placedAt)) / 86_400_000);

  if (hasFinalSale || ageRef > POLICY.rules.orderAgeDays.windowDays) return "DENIED";
  if (Number(order.total) > POLICY.rules.highValueThreshold.amount) return "ESCALATED";

  return llmDecision;
}
