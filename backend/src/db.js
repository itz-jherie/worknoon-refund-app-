import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL || "postgres://refund:refund@localhost:5432/refunds";

export const pool = new Pool({ connectionString });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL,
      risk_level TEXT NOT NULL DEFAULT 'low'
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      items JSONB NOT NULL,
      total NUMERIC(10,2) NOT NULL,
      placed_at TIMESTAMPTZ NOT NULL,
      delivered_at TIMESTAMPTZ,
      status TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS refund_requests (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      order_id TEXT REFERENCES orders(id),
      message TEXT NOT NULL,
      decision TEXT NOT NULL,
      rule_ids TEXT[] NOT NULL DEFAULT '{}',
      reason TEXT NOT NULL,
      llm_classification JSONB,
      customer_response TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE SEQUENCE IF NOT EXISTS refund_ticket_seq;
  `);
}

/**
 * Human-readable ticket numbers, e.g. RFD-2026-0042.
 * Backed by a Postgres sequence so concurrent requests can never collide.
 */
export async function nextTicketId() {
  const { rows } = await pool.query(
    `SELECT 'RFD-' || to_char(now(), 'YYYY') || '-' || LPAD(nextval('refund_ticket_seq')::text, 4, '0') AS ticket`
  );
  return rows[0].ticket;
}

export async function seedIfEmpty() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM customers");
  if (rows[0].count > 0) return false;

  for (const c of CUSTOMERS_SEED) {
    await pool.query(
      `INSERT INTO customers (id, name, email, joined_at, risk_level) VALUES ($1,$2,$3,$4,$5)`,
      [c.id, c.name, c.email, c.joinedAt, c.riskLevel]
    );
    for (const o of c.orders) {
      await pool.query(
        `INSERT INTO orders (id, customer_id, items, total, placed_at, delivered_at, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [o.id, c.id, JSON.stringify(o.items), o.total, o.placedAt, o.deliveredAt, o.status]
      );
    }
  }
  return true;
}

export async function getCustomerWithOrders(customerId) {
  const cust = await pool.query(
    `SELECT id, name, email, joined_at AS "joinedAt", risk_level AS "riskLevel" FROM customers WHERE id = $1`,
    [customerId]
  );
  if (cust.rows.length === 0) return null;
  const orders = await pool.query(
    `SELECT id, customer_id AS "customerId", items, total, placed_at AS "placedAt",
            delivered_at AS "deliveredAt", status
     FROM orders WHERE customer_id = $1 ORDER BY placed_at DESC`,
    [customerId]
  );
  return { ...cust.rows[0], orders: orders.rows };
}

export async function saveRefundRequest(r) {
  await pool.query(
    `INSERT INTO refund_requests
       (id, customer_id, order_id, message, decision, rule_ids, reason, llm_classification, customer_response)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      r.id,
      r.customerId,
      r.orderId ?? null,
      r.message,
      r.decision,
      r.ruleIds,
      r.reason,
      r.llmClassification ? JSON.stringify(r.llmClassification) : null,
      r.customerResponse ?? null,
    ]
  );
}

export async function listRefundRequests(limit = 50) {
  const { rows } = await pool.query(
    `SELECT r.id, r.customer_id AS "customerId", c.name AS "customerName", r.order_id AS "orderId",
            r.message, r.decision, r.rule_ids AS "ruleIds", r.reason,
            r.llm_classification AS "llmClassification", r.customer_response AS "customerResponse",
            r.created_at AS "createdAt"
     FROM refund_requests r JOIN customers c ON c.id = r.customer_id
     ORDER BY r.created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getRefundRequest(id) {
  const { rows } = await pool.query(
    `SELECT id, customer_id AS "customerId", order_id AS "orderId", message, decision,
            rule_ids AS "ruleIds", reason, llm_classification AS "llmClassification",
            customer_response AS "customerResponse", created_at AS "createdAt"
     FROM refund_requests WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

import { CUSTOMERS as CUSTOMERS_SEED } from "./data/customers.js";
