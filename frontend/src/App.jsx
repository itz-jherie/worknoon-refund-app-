import React, { useState } from "react";
import CustomerChat from "./components/CustomerChat.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";

export default function App() {
  const [view, setView] = useState("customer");

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">RF</span>
          <div>
            <div className="brand-name">RefundFlow</div>
            <div className="brand-sub">AI-powered refund support</div>
          </div>
        </div>
        <nav className="segmented">
          <button className={view === "customer" ? "active" : ""} onClick={() => setView("customer")}>
            Customer Support
          </button>
          <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>
            Admin Dashboard
          </button>
        </nav>
      </header>
      <main className="content">{view === "customer" ? <CustomerChat /> : <AdminDashboard />}</main>
    </div>
  );
}
