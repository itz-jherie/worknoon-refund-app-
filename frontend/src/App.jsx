import React, { useState } from "react";
import CustomerChat from "./components/CustomerChat.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";

export default function App() {
  const [view, setView] = useState("customer");

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">↩</span> RefundFlow
          <span className="tagline">AI-powered refund support</span>
        </div>
        <nav>
          <button
            className={view === "customer" ? "nav-btn active" : "nav-btn"}
            onClick={() => setView("customer")}
          >
            Customer Support
          </button>
          <button
            className={view === "admin" ? "nav-btn active" : "nav-btn"}
            onClick={() => setView("admin")}
          >
            Admin Dashboard
          </button>
        </nav>
      </header>
      <main className="content">
        {view === "customer" ? <CustomerChat /> : <AdminDashboard />}
      </main>
    </div>
  );
}
