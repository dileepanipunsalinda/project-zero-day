// src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  TrendingDown, Plus, Trash2, CreditCard,
  CheckCircle2, ArrowDownCircle, LogOut, X, Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToDebts,
  addDebt,
  deleteDebt,
  addPaymentAndUpdateDebt,
} from '../services/debtService';
import './Dashboard.css';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

// ── Add Debt Modal ────────────────────────────────────────────────────────────
function AddDebtModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !amount || Number(amount) <= 0) return;
    setLoading(true);
    try {
      await onAdd({ name: name.trim(), totalAmount: amount, note: note.trim() });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Add New Debt</span>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Debt Name</label>
            <input
              id="debt-name-input"
              className="form-input"
              type="text"
              placeholder="e.g. Car Loan, Credit Card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Total Amount</label>
            <input
              id="debt-amount-input"
              className="form-input"
              type="number"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input
              id="debt-note-input"
              className="form-input"
              type="text"
              placeholder="Any additional details"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button id="debt-submit-btn" type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding…' : 'Add Debt'}
            </button>
          </div>

          {/* log the env data here for testing */}
          {console.log('ENV DATA:', import.meta.env)}
        </form>
      </div>
    </div>
  );
}

// ── Add Payment Modal ─────────────────────────────────────────────────────────
function AddPaymentModal({ debt, onClose, onPay }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) return;
    setLoading(true);
    try {
      await onPay(debt.id, Math.min(val, debt.remaining), debt.remaining);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Record Payment</span>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Debt: <strong style={{ color: 'var(--text-primary)' }}>{debt.name}</strong>
          <br />
          Remaining: <strong style={{ color: 'var(--accent-red)' }}>$ {fmt(debt.remaining)}</strong>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Payment Amount</label>
            <input
              id="payment-amount-input"
              className="form-input"
              type="number"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              max={debt.remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button id="payment-submit-btn" type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Debt Card ─────────────────────────────────────────────────────────────────
function DebtCard({ debt, onDelete, onPay }) {
  const paid = debt.totalAmount - debt.remaining;
  const pct = debt.totalAmount > 0 ? (paid / debt.totalAmount) * 100 : 0;
  const isCleared = debt.remaining <= 0;

  return (
    <div className="debt-card glass">
      <div className="debt-card-header">
        <div className="debt-card-info">
          <div className="debt-card-name">
            {debt.name}
            {isCleared && (
              <span className="badge-zero" style={{ marginLeft: 8 }}>
                <CheckCircle2 size={11} /> Cleared
              </span>
            )}
          </div>
          {debt.note && <div className="debt-card-note">{debt.note}</div>}
        </div>
        <div className="debt-card-actions">
          {!isCleared && (
            <button
              id={`pay-btn-${debt.id}`}
              className="btn-ghost"
              onClick={() => onPay(debt)}
              title="Record Payment"
            >
              <ArrowDownCircle size={14} /> Pay
            </button>
          )}
          <button
            id={`delete-btn-${debt.id}`}
            className="btn-danger"
            onClick={() => onDelete(debt.id)}
            title="Delete Debt"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Amounts */}
      <div className="debt-card-amounts">
        <div className="debt-amount-item">
          <div className={`debt-amount-value ${isCleared ? 'paid' : 'remaining'}`}>
            $ {fmt(debt.remaining)}
          </div>
          <div className="debt-amount-label">Remaining</div>
        </div>
        <div className="debt-amount-item">
          <div className="debt-amount-value paid">$ {fmt(paid)}</div>
          <div className="debt-amount-label">Paid</div>
        </div>
        <div className="debt-amount-item">
          <div className="debt-amount-value" style={{ color: 'var(--text-secondary)' }}>
            $ {fmt(debt.totalAmount)}
          </div>
          <div className="debt-amount-label">Total</div>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {pct.toFixed(0)}% paid
        </span>
      </div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const [debts, setDebts] = useState([]);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [payingDebt, setPayingDebt] = useState(null); // debt object for payment modal

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDebts(user.uid, setDebts);
    return unsub;
  }, [user]);

  // ── Aggregate Stats ───────────────────────────────────────────────────────
  const totalDebt      = debts.reduce((s, d) => s + d.totalAmount, 0);
  const totalRemaining = debts.reduce((s, d) => s + d.remaining, 0);
  const totalPaid      = totalDebt - totalRemaining;
  const overallPct     = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;
  const activeDebts    = debts.filter((d) => d.remaining > 0).length;
  const clearedDebts   = debts.filter((d) => d.remaining <= 0).length;

  const handleAddDebt = useCallback(
    (data) => addDebt(user.uid, data),
    [user]
  );

  const handlePay = useCallback(
    (debtId, amount, currentRemaining) =>
      addPaymentAndUpdateDebt(debtId, amount, currentRemaining),
    []
  );

  const handleDelete = useCallback((debtId) => {
    if (window.confirm('Delete this debt? This cannot be undone.')) {
      deleteDebt(debtId);
    }
  }, []);

  return (
    <div className="dashboard">
      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">Z</div>
          <span className="topbar-title">Zero Day</span>
        </div>
        <div className="topbar-actions">
          {user?.photoURL && (
            <img src={user.photoURL} alt={user.displayName} className="topbar-avatar" />
          )}
          <button id="btn-logout" className="btn-logout" onClick={logout}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="dashboard-content">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="hero-section">
          <div className="hero-glow" />
          <div className="hero-glow red" />

          <div>
            <div className="hero-label">Total Remaining Debt</div>
            <div className="hero-amount text-gradient-red">
              <span className="currency">$</span>
              {fmt(totalRemaining)}
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-labels">
              <span className="paid">$ {fmt(totalPaid)} paid</span>
              <span className="remaining">{overallPct.toFixed(1)}% complete</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${overallPct}%` }} />
            </div>
          </div>
        </section>

        {/* ── Stats Row ─────────────────────────────────────────────────── */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon red"><TrendingDown size={18} /></div>
            <div className="stat-value">$ {fmt(totalRemaining)}</div>
            <div className="stat-label">Remaining Balance</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle2 size={18} /></div>
            <div className="stat-value">$ {fmt(totalPaid)}</div>
            <div className="stat-label">Total Paid Off</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><CreditCard size={18} /></div>
            <div className="stat-value">{activeDebts}</div>
            <div className="stat-label">Active Debts</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Wallet size={18} /></div>
            <div className="stat-value">{clearedDebts}</div>
            <div className="stat-label">Cleared Debts</div>
          </div>
        </div>

        {/* ── Debt List ─────────────────────────────────────────────────── */}
        <section>
          <div className="section-header">
            <h2 className="section-title">My Debts</h2>
            <button
              id="btn-add-debt"
              className="btn-primary"
              onClick={() => setShowAddDebt(true)}
            >
              <Plus size={16} /> Add Debt
            </button>
          </div>

          {debts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><CreditCard size={24} /></div>
              <h3>No debts tracked yet</h3>
              <p>Add your first debt to start monitoring your journey to zero.</p>
              <button
                id="btn-add-debt-empty"
                className="btn-primary"
                onClick={() => setShowAddDebt(true)}
              >
                <Plus size={16} /> Add First Debt
              </button>
            </div>
          ) : (
            <div className="debt-list">
              {debts.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  onDelete={handleDelete}
                  onPay={setPayingDebt}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showAddDebt && (
        <AddDebtModal
          onClose={() => setShowAddDebt(false)}
          onAdd={handleAddDebt}
        />
      )}
      {payingDebt && (
        <AddPaymentModal
          debt={payingDebt}
          onClose={() => setPayingDebt(null)}
          onPay={handlePay}
        />
      )}
    </div>
  );
}
