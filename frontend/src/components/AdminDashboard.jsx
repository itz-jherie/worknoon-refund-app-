import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const FILTERS = ["ALL", "APPROVED", "DENIED", "ESCALATED", "NEEDS_INFO"];

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () =>
      api
        .adminRequests(100)
        .then(setRequests)
        .catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(
    () => ({
      ALL: requests.length,
      APPROVED: requests.filter((r) => r.decision === "APPROVED").length,
      DENIED: requests.filter((r) => r.decision === "DENIED").length,
      ESCALATED: requests.filter((r) => r.decision === "ESCALATED").length,
      NEEDS_INFO: requests.filter((r) => r.decision === "NEEDS_INFO").length,
    }),
    [requests]
  );

  const visible = filter === "ALL" ? requests : requests.filter((r) => r.decision === filter);

  return (
    <div className="admin">
      {error && <div className="error-banner">{error}</div>}

      <div className="stats">
        <Stat label="Total" value={stats.ALL} cls="all" />
        <Stat label="Approved" value={stats.APPROVED} cls="approved" />
        <Stat label="Denied" value={stats.DENIED} cls="denied" />
        <Stat label="Escalated" value={stats.ESCALATED} cls="escalated" />
        <Stat label="Chit-chat" value={stats.NEEDS_INFO} cls="info" />
      </div>

      <div className="admin-toolbar">
        <div className="filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "NEEDS_INFO" ? "CHIT-CHAT" : f} ({stats[f]})
            </button>
          ))}
        </div>
        <div className="live">
          <span className="live-dot" /> Live — auto-refresh 5s
        </div>
      </div>

      <div className="split" style={{ flex: 1, minHeight: 0 }}>
        <div className="req-table panel">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Customer</th>
                <th>Order</th>
                <th>Decision</th>
                <th>Rules</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={selected?.id === r.id ? "selected" : ""}
                >
                  <td className="cell-ticket">{r.id}</td>
                  <td>{r.customerName}</td>
                  <td className="cell-muted">{r.orderId}</td>
                  <td>
                    <span className={`pill ${r.decision === "NEEDS_INFO" ? "info" : r.decision.toLowerCase()}`}>
                      {r.decision === "NEEDS_INFO" ? "NOT A REQUEST" : r.decision}
                    </span>
                  </td>
                  <td className="cell-muted">{(r.ruleIds ?? []).join(", ") || "—"}</td>
                  <td className="cell-muted">{new Date(r.createdAt).toLocaleTimeString()}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-table">
                    No requests in this view — submit one from the Customer Support tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && <AuditPanel request={selected} />}
      </div>
    </div>
  );
}

function Stat({ label, value, cls = "" }) {
  return (
    <div className="stat panel">
      <span className={`stat-dot ${cls}`} />
      <div>
        <div className="stat-num">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function AuditPanel({ request: r }) {
  const llm = r.llmClassification ?? {};
  const conf = Math.round((llm.confidence ?? 0) * 100);
  return (
    <aside className="audit panel">
      <h3>
        🔍 Audit trail
      </h3>
      <p className="meta">
        <span className="cell-ticket">{r.id}</span> · {r.customerName} · {r.orderId} ·{" "}
        {new Date(r.createdAt).toLocaleString()}
      </p>

      <h4>Customer message</h4>
      <blockquote>“{r.message}”</blockquote>

      <h4>Final decision</h4>
      <p>
        <span className={`pill ${r.decision === "NEEDS_INFO" ? "info" : r.decision.toLowerCase()}`}>
          {r.decision === "NEEDS_INFO" ? "NOT A REQUEST" : r.decision}
        </span>
      </p>

      <h4>Reasoning</h4>
      <p className="reason">{r.reason}</p>

      {llm.category && (
        <>
          <h4>AI classification</h4>
          <div className="llm-grid">
            <div className="llm-cell">
              <span className="k">Category</span>
              <span className="v">{llm.category}</span>
            </div>
            <div className="llm-cell">
              <span className="k">Provider</span>
              <span className="v">{llm.provider ?? "n/a"}</span>
            </div>
            <div className="llm-cell">
              <span className="k">Recommended</span>
              <span className="v">{llm.recommendedOutcome}</span>
            </div>
            <div className="llm-cell">
              <span className="k">Injection detected</span>
              <span className="v">{llm.injectionAttemptDetected ? "⚠️ YES" : "No"}</span>
            </div>
            <div className="llm-cell wide">
              <span className="k">Confidence — {conf}%</span>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${conf}%` }} />
              </div>
            </div>
            <div className="llm-cell wide">
              <span className="k">Evidence cited</span>
              <span className="v">{llm.evidenceQuote || "—"}</span>
            </div>
          </div>
        </>
      )}

      <h4>Response sent to customer</h4>
      <blockquote>{r.customerResponse}</blockquote>
    </aside>
  );
}
