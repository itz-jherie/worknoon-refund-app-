import { Router } from "express";
import { getCustomerWithOrders, listRefundRequests, getRefundRequest } from "../db.js";
import { processRefundRequest } from "../services/refundService.js";
import { POLICY } from "../data/policy.js";

const router = Router();

/** GET /api/customers — directory picker for the demo UI */
router.get("/customers", async (_req, res, next) => {
  try {
    const { pool } = await import("../db.js");
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.email, c.risk_level AS "riskLevel",
              COUNT(o.id)::int AS "orderCount"
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       GROUP BY c.id ORDER BY c.id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** GET /api/customers/:id — customer with full order history */
router.get("/customers/:id", async (req, res, next) => {
  try {
    const customer = await getCustomerWithOrders(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

/** POST /api/refunds — submit a refund request; runs the full pipeline */
router.post("/refunds", async (req, res, next) => {
  try {
    const { customerId, orderId, message } = req.body ?? {};
    if (!customerId || !message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "customerId and non-empty message are required" });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: "message too long (max 4000 chars)" });
    }

    const customer = await getCustomerWithOrders(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    let order;
    if (orderId) {
      order = customer.orders.find((o) => o.id === orderId);
      if (!order) return res.status(404).json({ error: "Order not found for this customer" });
    } else {
      order = customer.orders[0]; // most recent order by default
    }
    if (!order) return res.status(422).json({ error: "Customer has no orders to refund" });

    const result = await processRefundRequest({
      customer,
      order: {
        ...order,
        items: typeof order.items === "string" ? JSON.parse(order.items) : order.items,
      },
      message: message.trim(),
    });

    res.status(201).json({ ...result, order });
  } catch (err) {
    next(err);
  }
});

/** GET /api/refunds/:id — single decision with audit trail */
router.get("/refunds/:id", async (req, res, next) => {
  try {
    const record = await getRefundRequest(req.params.id);
    if (!record) return res.status(404).json({ error: "Request not found" });
    res.json(record);
  } catch (err) {
    next(err);
  }
});

/** GET /api/policy — current refund policy (for UI display) */
router.get("/policy", (_req, res) => {
  res.json(POLICY);
});

/** GET /api/admin/requests — audit dashboard feed */
router.get("/admin/requests", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? "50", 10) || 50, 200);
    const rows = await listRefundRequests(limit);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
