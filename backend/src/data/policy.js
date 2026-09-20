/**
 * Deterministic refund policy — the single source of truth for business rules.
 * These rules are evaluated in CODE, never delegated to the LLM.
 * The LLM only handles classification of free-text intent and response drafting.
 */
export const POLICY = {
  version: "2024.1",
  rules: {
    finalSale: {
      id: "R1",
      description: "Final sale items are not eligible for refunds.",
      outcome: "DENIED",
    },
    orderAgeDays: {
      id: "R2",
      description: "Orders older than 30 days from delivery cannot be refunded.",
      windowDays: 30,
      outcome: "DENIED",
    },
    highValueThreshold: {
      id: "R3",
      description: "Refunds above $500 require human review.",
      amount: 500,
      outcome: "ESCALATED",
    },
    damagedOrIncorrect: {
      id: "R4",
      description:
        "Damaged or incorrect items may qualify for approval within the return window.",
      outcome: "APPROVED",
    },
    changeOfMindDays: {
      id: "R5",
      description: "Change-of-mind requests are only refundable within 14 days.",
      windowDays: 14,
      outcome: "DENIED",
    },
    suspicious: {
      id: "R6",
      description:
        "Suspicious, conflicting, or policy-bypassing requests are escalated to a human agent.",
      outcome: "ESCALATED",
    },
  },
};
