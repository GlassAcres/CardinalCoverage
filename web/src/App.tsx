import { useState } from "react";
import Planner from "./pages/Planner";
import Login from "./pages/Login";

export default function App() {
  const [view, setView] = useState<"planner" | "login">("planner");

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #eee" }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>CrHS Coverage Planner</h1>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setView("planner")}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: view === "planner" ? "#f2f2f2" : "white",
              cursor: "pointer"
            }}
          >
            Planner
          </button>
          <button
            onClick={() => setView("login")}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: view === "login" ? "#f2f2f2" : "white",
              cursor: "pointer"
            }}
          >
            Login
          </button>
        </nav>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto" }}>
        {view === "planner" ? <Planner /> : <Login />}
      </main>
    </div>
  );
}
