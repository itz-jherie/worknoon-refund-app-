import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () =>
      api
        .adminRequests(100)
        .then(setRequests)
        .catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 5000); // light auto-refresh
    return () => clearInterval(t);
  }, []);

  const stats = {
    total: requests.length,
    approved: requests.filter((r) => r.decision === "APPROVED").length,
    denied: requests.filter((r) => r.decision === "DENIED").length,
    escalated: requests.filter((r) => r.decision === "ESCALATED").length,
    info: requests.filter((r) => r.decision === "NEEDS_INFO").length,
  };

  return (
    <div className="admin">
      {error && <div className="error-banner">{error}</div>}
      <div className="stats">
        <Stat label="Total requests" value={stats.total} />
        <Stat label="Approved" value={stats.approved} cls="approved" />
        <Stat label="Denied" value={stats.denied} cls="denied" />
        <Stat label="Escalated" value={stats.escalated} cls="escalated" />
        <Stat label="Chit-chat" value={stats.info} cls="info" />
      </div>

      <div className="split">
        <table className="req-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Order</th>
              <th>Decision</th>
              <th>Rules</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} onClick={() => setSelected(r)} className={selected?.id === r.id ? "selected" : ""}>
                <td>{r.customerName}</td>
                <td>{r.orderId}</td>
                <td>
                  <span className={`pill ${r.decision === "NEEDS_INFO" ? "info" : r.decision.toLowerCase()}`}>
                    {r.decision === "NEEDS_INFO" ? "NOT A REQUEST" : r.decision}
                  </span>
                </td>
                <td className="rules">{(r.ruleIds ?? []).join(", ")}</td>
                <td>{new Date(r.createdAt).toLocaleTimeString()}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5}>No refund requests yet — submit one from the Customer Support tab.</td>
              </tr>
            )}
          </tbody>
        </table>

        {selected && <AuditPanel request={selected} />}
      </div>
    </div>
  );
}

function Stat({ label, value, cls = "" }) {
  return (
    <div className={`stat ${cls}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function AuditPanel({ request: r }) {
  const llm = r.llmClassification ?? {};
  return (
    <aside className="audit">
      <h3>Audit trail</h3>
      <p className="meta">
        {r.customerName} · {r.orderId} · {new Date(r.createdAt).toLocaleString()}
      </p>

      <h4>Customer message</h4>
      <blockquote>“{r.message}”</blockquote>

      <h4>Final decision</h4>
      <p>
        <span className={`pill ${r.decision.toLowerCase()}`}>{r.decision}</span>
      </p>

      <h4>Reasoning</h4>
      <p className="reason">{r.reason}</p>

      {llm.category && (
        <>
          <h4>AI classification</h4>
          <ul className="llm-details">
            <li>
              <strong>Category:</strong> {llm.category}
            </li>
            <li>
              <strong>Recommended:</strong> {llm.recommendedOutcome}
            </li>
            <li>
              <strong>Confidence:</strong> {(llm.confidence * 100).toFixed(0)}%
            </li>
            <li>
              <strong>Evidence:</strong> {llm.evidenceQuote}
            </li>
            <li>
              <strong>Injection detected:</strong>{" "}
              {llm.injectionAttemptDetected ? "⚠️ YES" : "No"}
            </li>
            <li>
              <strong>Provider:</strong> {llm.provider ?? "n/a"}
            </li>
          </ul>
        </>
      )}

      <h4>Response sent to customer</h4>
      <blockquote>{r.customerResponse}</blockquote>
    </aside>
  );
}
