import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc, getDoc, setDoc, onSnapshot
} from "firebase/firestore";
import { auth, db } from "./firebase";
import Login from "./Login";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const TODAY = new Date();
const THIS_MONTH = TODAY.getMonth();
const THIS_YEAR = TODAY.getFullYear();
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BILL_CATS = ["Housing","Utilities","Insurance","Subscriptions","Loans","Other"];
const BUDGET_CATS = ["Groceries","Dining","Transport","Entertainment","Health","Shopping","Utilities","Other"];

function nextDueDate(dueDay) {
  const d = new Date(THIS_YEAR, THIS_MONTH, dueDay);
  if (d < TODAY) d.setMonth(d.getMonth() + 1);
  return d;
}
function daysUntil(date) { return Math.round((date - TODAY) / 86400000); }
function urgencyColor(days) {
  if (days < 0) return "#e07070";
  if (days <= 3) return "#e09060";
  if (days <= 7) return "#d4a843";
  return "var(--moss)";
}
function urgencyLabel(days) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Tomorrow";
  return `${days}d`;
}

// ─── Default Data ─────────────────────────────────────────────────────────────
const DEFAULT_BILLS = [];
const DEFAULT_BUDGETS = [];
const DEFAULT_SAVINGS = [];

// ─── Firestore helpers ────────────────────────────────────────────────────────
const SHARED_DOC = "shared/data";

async function loadData(db) {
  try {
    const snap = await getDoc(doc(db, "shared", "data"));
    if (snap.exists()) return snap.data();
  } catch (e) { console.error(e); }
  return null;
}

async function saveData(db, data) {
  try {
    await setDoc(doc(db, "shared", "data"), data, { merge: true });
  } catch (e) { console.error(e); }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "0.6rem 0.85rem", borderRadius: "10px",
  border: "1.5px solid var(--sand-dark)", background: "var(--sand-light)",
  fontSize: "0.95rem", fontFamily: "var(--font-body)", color: "var(--brown)",
  outline: "none", boxSizing: "border-box", transition: "border-color 0.15s"
};
const selectStyle = { ...inputStyle, cursor: "pointer" };

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(60,40,20,0.35)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      animation: "fadeIn 0.15s ease"
    }} onClick={onClose}>
      <div style={{
        background: "var(--cream)", borderRadius: "20px", padding: "2rem",
        width: "100%", maxWidth: "440px",
        boxShadow: "0 20px 60px rgba(80,40,10,0.25)",
        border: "1.5px solid var(--sand-dark)", animation: "slideUp 0.2s ease"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--brown)", fontSize: "1.3rem" }}>{title}</h3>
          <button onClick={onClose} style={{
            background: "var(--sand)", border: "none", borderRadius: "50%",
            width: 32, height: 32, cursor: "pointer", fontSize: "1.2rem",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brown-mid)"
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--brown-mid)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

function SaveBtn({ onClick, label = "Save" }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "0.75rem", background: "var(--terracotta)", color: "#fff",
      border: "none", borderRadius: "12px", fontSize: "1rem",
      fontFamily: "var(--font-display)", cursor: "pointer", marginTop: "0.5rem",
      letterSpacing: "0.03em", transition: "opacity 0.15s"
    }}
      onMouseEnter={e => e.target.style.opacity = "0.85"}
      onMouseLeave={e => e.target.style.opacity = "1"}
    >{label}</button>
  );
}

function AddBtn({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "6px",
      background: "var(--terracotta)", color: "#fff", border: "none",
      borderRadius: "12px", padding: "0.55rem 1.1rem", cursor: "pointer",
      fontFamily: "var(--font-body)", fontSize: "0.88rem", fontWeight: 600,
      transition: "opacity 0.15s", flexShrink: 0
    }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      {label}
    </button>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ bills, budgets, savings, setTab }) {
  const monthBudgets = budgets.filter(b => b.month === THIS_MONTH && b.year === THIS_YEAR);
  const totalBills = bills.reduce((s, b) => s + b.amount, 0);
  const totalBudgetLimit = monthBudgets.reduce((s, b) => s + b.limit, 0);
  const totalBudgetSpent = monthBudgets.reduce((s, b) => s + b.spent, 0);
  const totalSavingsTarget = savings.reduce((s, g) => s + g.target, 0);
  const totalSaved = savings.reduce((s, g) => s + g.saved, 0);
  const savingsPct = totalSavingsTarget > 0 ? Math.round((totalSaved / totalSavingsTarget) * 100) : 0;

  const upcoming = bills
    .map(b => ({ ...b, dueDate: nextDueDate(b.dueDay), days: daysUntil(nextDueDate(b.dueDay)) }))
    .sort((a, b) => a.days - b.days).slice(0, 5);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Hero cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.85rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Monthly Bills",  value: fmt(totalBills),       sub: "recurring",                    emoji: "📋", color: "#c4694a", bg: "#fdf0eb" },
          { label: "Budget Spent",   value: fmt(totalBudgetSpent), sub: `of ${fmt(totalBudgetLimit)}`,  emoji: "📊", color: "#5a8c5a", bg: "#edf5ed" },
          { label: "Total Saved",    value: fmt(totalSaved),       sub: `${savingsPct}% of goals`,      emoji: "🐷", color: "#6b8cae", bg: "#edf2f8" },
        ].map(card => (
          <div key={card.label} style={{
            background: card.bg, borderRadius: "18px", padding: "1rem 1rem 0.85rem",
            border: `1.5px solid ${card.color}33`, boxShadow: `0 2px 12px ${card.color}18`,
          }}>
            <div style={{ fontSize: "1.4rem", marginBottom: "0.3rem" }}>{card.emoji}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1rem,2.5vw,1.4rem)", color: "var(--brown)", fontWeight: 700, lineHeight: 1.1 }}>{card.value}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--brown-mid)", marginTop: "3px" }}>{card.sub}</div>
            <div style={{ fontSize: "0.68rem", fontWeight: 600, color: card.color, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* Upcoming Bills */}
        <div style={{ background: "var(--cream)", borderRadius: "18px", padding: "1.25rem", border: "1.5px solid var(--sand-dark)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--brown)" }}>Upcoming Bills</h3>
            <button onClick={() => setTab("bills")} style={{ fontSize: "0.72rem", color: "var(--terracotta)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-body)" }}>See all →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {upcoming.map(bill => (
              <div key={bill.id} style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "10px",
                  background: urgencyColor(bill.days) + "22",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  fontSize: "0.62rem", fontWeight: 800, color: urgencyColor(bill.days), lineHeight: 1, textAlign: "center", padding: "2px"
                }}>{urgencyLabel(bill.days)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--brown)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bill.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--brown-mid)" }}>{MONTHS[bill.dueDate.getMonth()]} {bill.dueDay}{bill.autopay ? " · auto" : ""}</div>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--brown)", fontWeight: 700, flexShrink: 0 }}>{fmt(bill.amount)}</div>
              </div>
            ))}
            {upcoming.length === 0 && <div style={{ color: "var(--brown-mid)", fontStyle: "italic", fontSize: "0.85rem" }}>No bills added yet</div>}
          </div>
        </div>

        {/* Budget Health */}
        <div style={{ background: "var(--cream)", borderRadius: "18px", padding: "1.25rem", border: "1.5px solid var(--sand-dark)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--brown)" }}>Budget Health</h3>
            <button onClick={() => setTab("budget")} style={{ fontSize: "0.72rem", color: "var(--terracotta)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-body)" }}>See all →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {monthBudgets.slice(0, 5).map(b => {
              const pct = Math.min((b.spent / b.limit) * 100, 100);
              const over = b.spent > b.limit;
              const barColor = over ? "#e07070" : pct > 80 ? "#d4a843" : "var(--moss)";
              return (
                <div key={b.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--brown)" }}>{b.category}</span>
                    <span style={{ fontSize: "0.78rem", color: over ? "#e07070" : "var(--brown-mid)" }}>{fmt(b.spent)} / {fmt(b.limit)}</span>
                  </div>
                  <div style={{ background: "var(--sand)", borderRadius: "99px", height: 7, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: "99px", transition: "width 0.4s ease" }}/>
                  </div>
                </div>
              );
            })}
            {monthBudgets.length === 0 && <div style={{ color: "var(--brown-mid)", fontStyle: "italic", fontSize: "0.85rem" }}>No budgets set yet</div>}
          </div>
        </div>
      </div>

      {/* Savings Goals */}
      <div style={{ background: "var(--cream)", borderRadius: "18px", padding: "1.25rem", border: "1.5px solid var(--sand-dark)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--brown)" }}>Savings Goals</h3>
          <button onClick={() => setTab("savings")} style={{ fontSize: "0.72rem", color: "var(--terracotta)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-body)" }}>See all →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: "0.85rem" }}>
          {savings.map(goal => {
            const pct = Math.min((goal.saved / goal.target) * 100, 100);
            return (
              <div key={goal.id} style={{ background: goal.color + "14", borderRadius: "14px", padding: "0.9rem", border: `1.5px solid ${goal.color}33`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: -16, right: -16, width: 60, height: 60, borderRadius: "50%", background: goal.color + "22" }}/>
                <div style={{ fontSize: "1.4rem", marginBottom: "0.35rem" }}>{goal.emoji}</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brown)", marginBottom: "2px" }}>{goal.name}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--brown-mid)", marginBottom: "0.6rem" }}>{fmt(goal.saved)} of {fmt(goal.target)}</div>
                <div style={{ background: "var(--sand)", borderRadius: "99px", height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: goal.color, borderRadius: "99px", transition: "width 0.4s ease" }}/>
                </div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: goal.color, marginTop: "4px" }}>{Math.round(pct)}%</div>
              </div>
            );
          })}
          {savings.length === 0 && <div style={{ color: "var(--brown-mid)", fontStyle: "italic", fontSize: "0.85rem" }}>No savings goals yet</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Bills Tab ────────────────────────────────────────────────────────────────
function BillsTab({ bills, setBills }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", dueDay: "1", category: "Housing", autopay: false });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const add = () => {
    if (!form.name || !form.amount) return;
    setBills(b => [...b, { ...form, id: Date.now().toString(), amount: parseFloat(form.amount), dueDay: parseInt(form.dueDay) }]);
    setModal(false);
    setForm({ name: "", amount: "", dueDay: "1", category: "Housing", autopay: false });
  };
  const remove = id => setBills(b => b.filter(x => x.id !== id));

  const sorted = [...bills]
    .map(b => ({ ...b, dueDate: nextDueDate(b.dueDay), days: daysUntil(nextDueDate(b.dueDay)) }))
    .sort((a, b) => a.days - b.days);

  const totalMonthly = bills.reduce((s, b) => s + b.amount, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--brown-mid)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Monthly Total</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--brown)", lineHeight: 1.1 }}>{fmt(totalMonthly)}</div>
        </div>
        <AddBtn onClick={() => setModal(true)} label="Add Bill" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {sorted.map(bill => {
          const color = urgencyColor(bill.days);
          return (
            <div key={bill.id} style={{
              background: "var(--cream)", borderRadius: "16px", padding: "1rem 1.2rem",
              border: "1.5px solid var(--sand-dark)", display: "flex", alignItems: "center", gap: "1rem",
              boxShadow: "0 2px 8px rgba(100,60,20,0.06)", transition: "transform 0.15s"
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 0 3px ${color}33` }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "var(--brown)", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  {bill.name}
                  {bill.autopay && <span style={{ fontSize: "0.62rem", background: "var(--moss-light)", color: "var(--moss-dark)", borderRadius: "6px", padding: "1px 6px", fontWeight: 700 }}>AUTO</span>}
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--brown-mid)", marginTop: "2px" }}>{bill.category} · Due {MONTHS[bill.dueDate.getMonth()]} {bill.dueDay}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--brown)", fontWeight: 700 }}>{fmt(bill.amount)}</div>
                <div style={{ fontSize: "0.72rem", color, fontWeight: 600 }}>{urgencyLabel(bill.days)}</div>
              </div>
              <button onClick={() => remove(bill.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sand-dark)", padding: "4px", borderRadius: "6px", display: "flex" }}
                onMouseEnter={e => e.currentTarget.style.color = "#e07070"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--sand-dark)"}
              ><TrashIcon/></button>
            </div>
          );
        })}
        {bills.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "var(--brown-mid)", fontStyle: "italic" }}>No bills yet — add your first one ☝️</div>}
      </div>
      {modal && (
        <Modal title="New Bill" onClose={() => setModal(false)}>
          <Field label="Bill Name"><input style={inputStyle} value={form.name} onChange={set("name")} placeholder="e.g. Electric" /></Field>
          <Field label="Amount ($)"><input style={inputStyle} type="number" value={form.amount} onChange={set("amount")} placeholder="0.00" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <Field label="Due Day"><input style={inputStyle} type="number" min="1" max="31" value={form.dueDay} onChange={set("dueDay")} /></Field>
            <Field label="Category"><select style={selectStyle} value={form.category} onChange={set("category")}>{BILL_CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
          </div>
          <Field label=" ">
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="checkbox" checked={form.autopay} onChange={set("autopay")} style={{ width: 16, height: 16 }}/>
              <span style={{ fontSize: "0.9rem", color: "var(--brown)" }}>Autopay enabled</span>
            </label>
          </Field>
          <SaveBtn onClick={add}/>
        </Modal>
      )}
    </div>
  );
}

// ─── Budget Tab ───────────────────────────────────────────────────────────────
function BudgetTab({ budgets, setBudgets }) {
  const [modal, setModal] = useState(false);
  const [spendModal, setSpendModal] = useState(null);
  const [form, setForm] = useState({ category: "Groceries", limit: "" });
  const [spendAmt, setSpendAmt] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const thisMonth = budgets.filter(b => b.month === THIS_MONTH && b.year === THIS_YEAR);
  const totalLimit = thisMonth.reduce((s, b) => s + b.limit, 0);
  const totalSpent = thisMonth.reduce((s, b) => s + b.spent, 0);

  const add = () => {
    if (!form.limit) return;
    setBudgets(b => [...b, { ...form, id: Date.now().toString(), limit: parseFloat(form.limit), spent: 0, month: THIS_MONTH, year: THIS_YEAR }]);
    setModal(false); setForm({ category: "Groceries", limit: "" });
  };
  const addSpend = () => {
    const amt = parseFloat(spendAmt);
    if (!amt || !spendModal) return;
    setBudgets(b => b.map(x => x.id === spendModal.id ? { ...x, spent: x.spent + amt } : x));
    setSpendModal(null); setSpendAmt("");
  };
  const remove = id => setBudgets(b => b.filter(x => x.id !== id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--brown-mid)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{MONTHS[THIS_MONTH]} Budget</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--brown)", lineHeight: 1.1 }}>
            {fmt(totalSpent)} <span style={{ fontSize: "1rem", color: "var(--brown-mid)" }}>/ {fmt(totalLimit)}</span>
          </div>
        </div>
        <AddBtn onClick={() => setModal(true)} label="Add Budget"/>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {thisMonth.map(budget => {
          const pct = Math.min((budget.spent / budget.limit) * 100, 100);
          const over = budget.spent > budget.limit;
          const barColor = over ? "#e07070" : pct > 80 ? "#d4a843" : "var(--moss)";
          return (
            <div key={budget.id} style={{ background: "var(--cream)", borderRadius: "16px", padding: "1rem 1.2rem", border: "1.5px solid var(--sand-dark)", boxShadow: "0 2px 8px rgba(100,60,20,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--brown)", fontSize: "0.95rem" }}>{budget.category}</div>
                  <div style={{ fontSize: "0.76rem", color: "var(--brown-mid)", marginTop: "2px" }}>{fmt(budget.limit - budget.spent)} remaining</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: over ? "#e07070" : "var(--brown)" }}>{fmt(budget.spent)}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--brown-mid)" }}>of {fmt(budget.limit)}</div>
                  </div>
                  <button onClick={() => setSpendModal(budget)} style={{ background: "var(--sand)", border: "none", borderRadius: "8px", padding: "5px 10px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, color: "var(--brown-mid)" }}>+ Spend</button>
                  <button onClick={() => remove(budget.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sand-dark)", padding: "4px", borderRadius: "6px", display: "flex" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#e07070"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--sand-dark)"}
                  ><TrashIcon/></button>
                </div>
              </div>
              <div style={{ background: "var(--sand)", borderRadius: "99px", height: 8, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: "99px", transition: "width 0.4s ease" }}/>
              </div>
            </div>
          );
        })}
        {thisMonth.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "var(--brown-mid)", fontStyle: "italic" }}>No budgets yet ☝️</div>}
      </div>
      {modal && (
        <Modal title="New Budget" onClose={() => setModal(false)}>
          <Field label="Category"><select style={selectStyle} value={form.category} onChange={set("category")}>{BUDGET_CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Monthly Limit ($)"><input style={inputStyle} type="number" value={form.limit} onChange={set("limit")} placeholder="0.00"/></Field>
          <SaveBtn onClick={add}/>
        </Modal>
      )}
      {spendModal && (
        <Modal title={`Log Spend — ${spendModal.category}`} onClose={() => setSpendModal(null)}>
          <Field label="Amount Spent ($)"><input style={inputStyle} type="number" value={spendAmt} onChange={e => setSpendAmt(e.target.value)} placeholder="0.00" autoFocus/></Field>
          <SaveBtn onClick={addSpend} label="Log Expense"/>
        </Modal>
      )}
    </div>
  );
}

// ─── Savings Tab ──────────────────────────────────────────────────────────────
function SavingsTab({ savings, setSavings }) {
  const [modal, setModal] = useState(false);
  const [addModal, setAddModal] = useState(null);
  const [form, setForm] = useState({ name: "", target: "", saved: "", emoji: "🎯" });
  const [addAmt, setAddAmt] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const PALETTES = ["#c47c5a","#7a9e7e","#6b8cae","#b89a5e","#9e7ab5","#c4a35a"];

  const add = () => {
    if (!form.name || !form.target) return;
    setSavings(s => [...s, { ...form, id: Date.now().toString(), target: parseFloat(form.target), saved: parseFloat(form.saved) || 0, color: PALETTES[savings.length % PALETTES.length] }]);
    setModal(false); setForm({ name: "", target: "", saved: "", emoji: "🎯" });
  };
  const contribute = () => {
    const amt = parseFloat(addAmt);
    if (!amt || !addModal) return;
    setSavings(s => s.map(x => x.id === addModal.id ? { ...x, saved: Math.min(x.saved + amt, x.target) } : x));
    setAddModal(null); setAddAmt("");
  };
  const remove = id => setSavings(s => s.filter(x => x.id !== id));

  const totalTarget = savings.reduce((s, g) => s + g.target, 0);
  const totalSaved = savings.reduce((s, g) => s + g.saved, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--brown-mid)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Saved</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--brown)", lineHeight: 1.1 }}>
            {fmt(totalSaved)} <span style={{ fontSize: "1rem", color: "var(--brown-mid)" }}>/ {fmt(totalTarget)}</span>
          </div>
        </div>
        <AddBtn onClick={() => setModal(true)} label="New Goal"/>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "1rem" }}>
        {savings.map(goal => {
          const pct = Math.min((goal.saved / goal.target) * 100, 100);
          const done = pct >= 100;
          return (
            <div key={goal.id} style={{
              background: "var(--cream)", borderRadius: "20px", padding: "1.4rem",
              border: "1.5px solid var(--sand-dark)", position: "relative", overflow: "hidden",
              boxShadow: "0 2px 12px rgba(100,60,20,0.08)", transition: "transform 0.15s"
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: goal.color + "22", pointerEvents: "none" }}/>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "1.6rem", marginBottom: "4px" }}>{goal.emoji}</div>
                  <div style={{ fontWeight: 700, color: "var(--brown)", fontSize: "1rem" }}>{goal.name}</div>
                  {done && <div style={{ fontSize: "0.72rem", color: goal.color, fontWeight: 700, marginTop: "2px" }}>🎉 Goal reached!</div>}
                </div>
                <button onClick={() => remove(goal.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sand-dark)", padding: "4px", borderRadius: "6px", display: "flex" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#e07070"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--sand-dark)"}
                ><TrashIcon/></button>
              </div>
              <div style={{ textAlign: "center", margin: "0.75rem 0" }}>
                <svg viewBox="0 0 100 56" width="140" style={{ overflow: "visible" }}>
                  <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="var(--sand)" strokeWidth="8" strokeLinecap="round"/>
                  <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke={goal.color} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray="125.66" strokeDashoffset={125.66 * (1 - pct / 100)}
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}/>
                  <text x="50" y="52" textAnchor="middle" fill="var(--brown)" style={{ fontSize: "13px", fontFamily: "var(--font-display)", fontWeight: 700 }}>{Math.round(pct)}%</text>
                </svg>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.68rem", color: "var(--brown-mid)", fontWeight: 600, textTransform: "uppercase" }}>Saved</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: goal.color }}>{fmt(goal.saved)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--brown-mid)", fontWeight: 600, textTransform: "uppercase" }}>Goal</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--brown)" }}>{fmt(goal.target)}</div>
                </div>
              </div>
              {!done && (
                <button onClick={() => setAddModal(goal)} style={{
                  width: "100%", padding: "0.55rem", background: goal.color + "22", color: goal.color,
                  border: `1.5px solid ${goal.color}44`, borderRadius: "10px", cursor: "pointer",
                  fontWeight: 700, fontSize: "0.85rem", fontFamily: "var(--font-body)", transition: "background 0.15s"
                }}
                  onMouseEnter={e => e.currentTarget.style.background = goal.color + "44"}
                  onMouseLeave={e => e.currentTarget.style.background = goal.color + "22"}
                >+ Add Savings</button>
              )}
            </div>
          );
        })}
        {savings.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "var(--brown-mid)", fontStyle: "italic", gridColumn: "1/-1" }}>No goals yet 🐷</div>}
      </div>
      {modal && (
        <Modal title="New Savings Goal" onClose={() => setModal(false)}>
          <Field label="Goal Name"><input style={inputStyle} value={form.name} onChange={set("name")} placeholder="e.g. New Car"/></Field>
          <Field label="Emoji"><input style={inputStyle} value={form.emoji} onChange={set("emoji")} placeholder="🎯"/></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <Field label="Target ($)"><input style={inputStyle} type="number" value={form.target} onChange={set("target")} placeholder="0"/></Field>
            <Field label="Already Saved ($)"><input style={inputStyle} type="number" value={form.saved} onChange={set("saved")} placeholder="0"/></Field>
          </div>
          <SaveBtn onClick={add} label="Create Goal"/>
        </Modal>
      )}
      {addModal && (
        <Modal title={`Add to "${addModal.name}"`} onClose={() => setAddModal(null)}>
          <Field label="Amount ($)"><input style={inputStyle} type="number" value={addAmt} onChange={e => setAddAmt(e.target.value)} placeholder="0.00" autoFocus/></Field>
          <SaveBtn onClick={contribute} label="Add Savings"/>
        </Modal>
      )}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard", emoji: "🏠" },
  { id: "bills",     label: "Bills",     emoji: "📋" },
  { id: "budget",    label: "Budget",    emoji: "📊" },
  { id: "savings",   label: "Savings",   emoji: "🐷" },
];

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [tab, setTab] = useState("dashboard");
  const [bills, setBillsState] = useState([]);
  const [budgets, setBudgetsState] = useState([]);
  const [savings, setSavingsState] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return unsub;
  }, []);

  // Load data + subscribe to real-time updates when logged in
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "shared", "data"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setBillsState(d.bills || []);
        setBudgetsState(d.budgets || []);
        setSavingsState(d.savings || []);
      }
      setDataLoaded(true);
    });
    return unsub;
  }, [user]);

  // Write helpers — save to Firestore on every change
  const setBills = async (updater) => {
    const next = typeof updater === "function" ? updater(bills) : updater;
    setBillsState(next);
    await saveData(db, { bills: next });
  };
  const setBudgets = async (updater) => {
    const next = typeof updater === "function" ? updater(budgets) : updater;
    setBudgetsState(next);
    await saveData(db, { budgets: next });
  };
  const setSavings = async (updater) => {
    const next = typeof updater === "function" ? updater(savings) : updater;
    setSavingsState(next);
    await saveData(db, { savings: next });
  };

  // Loading state
  if (user === undefined) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f5ede0", fontFamily: "'Playfair Display', Georgia, serif", color: "#7a5c42", fontSize: "1.2rem" }}>
      Loading…
    </div>
  );

  // Not logged in
  if (!user) return <Login/>;

  // Logged in but data still loading
  if (!dataLoaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f5ede0", fontFamily: "'Playfair Display', Georgia, serif", color: "#7a5c42", fontSize: "1.2rem" }}>
      Loading your finances…
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        :root {
          --font-display: 'Playfair Display', Georgia, serif;
          --font-body: 'Lora', Georgia, serif;
          --bg: #f5ede0;
          --cream: #fdf6ec;
          --sand: #e8d9c5;
          --sand-light: #f5ede0;
          --sand-dark: #d4c0a6;
          --terracotta: #c4694a;
          --brown: #3d2a1a;
          --brown-mid: #7a5c42;
          --moss: #5a8c5a;
          --moss-light: #e8f3e8;
          --moss-dark: #3d6b3d;
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); font-family: var(--font-body); }
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        input:focus, select:focus { border-color: var(--terracotta) !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--sand); }
        ::-webkit-scrollbar-thumb { background: var(--sand-dark); border-radius: 3px; }
      `}</style>

      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        backgroundImage: "radial-gradient(circle at 15% 15%, #e8c9a822 0%, transparent 55%), radial-gradient(circle at 85% 85%, #c4694a11 0%, transparent 50%)"
      }}>
        {/* Header */}
        <header style={{ padding: "1.4rem 2rem 0", maxWidth: 900, margin: "0 auto", animation: "fadeIn 0.4s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.5rem" }}>💰</span>
                <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem,3.5vw,2rem)", color: "var(--brown)", fontWeight: 700, letterSpacing: "-0.02em" }}>Mattress</h1>
              </div>
              <p style={{ margin: "2px 0 0", color: "var(--brown-mid)", fontSize: "0.82rem", fontStyle: "italic" }}>
                {TODAY.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            {/* User info + sign out */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--brown)" }}>{user.displayName || user.email}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--brown-mid)" }}>{user.email}</div>
              </div>
              {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid var(--sand-dark)" }}/>}
              <button onClick={() => signOut(auth)} style={{
                background: "var(--sand)", border: "1.5px solid var(--sand-dark)", borderRadius: "10px",
                padding: "0.4rem 0.75rem", cursor: "pointer", fontSize: "0.78rem",
                fontFamily: "var(--font-body)", color: "var(--brown-mid)", fontWeight: 600
              }}>Sign out</button>
            </div>
          </div>
        </header>

        {/* Nav */}
        <nav style={{ maxWidth: 900, margin: "1.2rem auto 0", padding: "0 2rem" }}>
          <div style={{ display: "flex", gap: "0.4rem", background: "var(--cream)", borderRadius: "14px", padding: "5px", border: "1.5px solid var(--sand-dark)", width: "fit-content" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "0.5rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: "0.88rem", fontWeight: 600,
                background: tab === t.id ? "var(--terracotta)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--brown-mid)",
                transition: "all 0.2s ease"
              }}>
                <span style={{ fontSize: "0.9rem" }}>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main style={{ maxWidth: 900, margin: "1.4rem auto 3rem", padding: "0 2rem", animation: "fadeIn 0.25s ease" }} key={tab}>
          {tab === "dashboard" && <Dashboard bills={bills} budgets={budgets} savings={savings} setTab={setTab}/>}
          {tab === "bills"     && <BillsTab bills={bills} setBills={setBills}/>}
          {tab === "budget"    && <BudgetTab budgets={budgets} setBudgets={setBudgets}/>}
          {tab === "savings"   && <SavingsTab savings={savings} setSavings={setSavings}/>}
        </main>
      </div>
    </>
  );
}
