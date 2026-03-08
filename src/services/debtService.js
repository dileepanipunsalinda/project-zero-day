// src/services/debtService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Debts ──────────────────────────────────────────────────────────────────

export const subscribeToDebts = (userId, callback) => {
  const q = query(
    collection(db, 'debts'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const addDebt = (userId, { name, totalAmount, note = '' }) =>
  addDoc(collection(db, 'debts'), {
    userId,
    name,
    totalAmount: Number(totalAmount),
    remaining: Number(totalAmount),
    note,
    createdAt: serverTimestamp(),
  });

export const deleteDebt = (debtId) => deleteDoc(doc(db, 'debts', debtId));

// ── Payments ───────────────────────────────────────────────────────────────

export const subscribeToPayments = (debtId, callback) => {
  const q = query(
    collection(db, 'payments'),
    where('debtId', '==', debtId),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const addPayment = async (debtId, amount) => {
  // 1. Add payment record
  await addDoc(collection(db, 'payments'), {
    debtId,
    amount: Number(amount),
    date: serverTimestamp(),
  });

  // 2. Decrement remaining on the debt doc
  const debtRef = doc(db, 'debts', debtId);
  // We read the current remaining via the caller (optimistic), so just decrement
  // For safety we use a transaction-free approach: caller passes current remaining
};

export const addPaymentAndUpdateDebt = async (debtId, amount, currentRemaining) => {
  const newRemaining = Math.max(0, currentRemaining - Number(amount));

  await addDoc(collection(db, 'payments'), {
    debtId,
    amount: Number(amount),
    date: serverTimestamp(),
  });

  await updateDoc(doc(db, 'debts', debtId), {
    remaining: newRemaining,
  });

  return newRemaining;
};
