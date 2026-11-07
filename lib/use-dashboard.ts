"use client";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, basePath, db, friendlyError } from "./firebase";
import { demoCompany, demoData } from "./demo";
export const collections = [
  "transactions",
  "contracts",
  "bankTransactions",
  "partners",
  "marketing",
];
export function useDashboard() {
  const [data, setData] = useState<Record<string, any[]>>(() =>
    Object.fromEntries(collections.map((c) => [c, []])),
  );
  const [company, setCompany] = useState<any>({});
  const [status, setStatus] = useState("Conectando");
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      setDemo(true);
      setData(structuredClone(demoData));
      setCompany({ ...demoCompany });
      setStatus("Demostración");
      return;
    }
    let active = true;
    let listeners: (() => void)[] = [];
    const fail = (e: unknown) => {
      if (active) {
        setError(friendlyError(e));
        setStatus("Error de conexión");
      }
    };
    const stop = onAuthStateChanged(
      auth,
      (user) => {
        listeners.forEach((fn) => fn());
        listeners = [];
        if (!active) return;
        if (!user) {
          setStatus("Sin sesión");
          return;
        }
        setStatus("Sincronizando");
        const pending = new Set([...collections, "company"]);
        const loaded = (key: string) => {
          pending.delete(key);
          if (!pending.size && active) setStatus("Conectado");
        };
        for (const col of collections)
          listeners.push(
            onSnapshot(
              collection(db, `${basePath}/${col}`),
              (snap) => {
                if (!active) return;
                setData((prev) => ({
                  ...prev,
                  [col]: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
                }));
                loaded(col);
              },
              fail,
            ),
          );
        listeners.push(
          onSnapshot(
            doc(db, `${basePath}/company/info`),
            (snap) => {
              if (active) {
                setCompany(snap.data() || {});
                loaded("company");
              }
            },
            fail,
          ),
        );
      },
      fail,
    );
    if (!auth.currentUser) signInAnonymously(auth).catch(fail);
    return () => {
      active = false;
      stop();
      listeners.forEach((fn) => fn());
    };
  }, []);
  async function execute(action: () => Promise<void>) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (!demo && typeof navigator !== "undefined" && !navigator.onLine)
        throw new Error(
          "No hay conexión. Conectate a Internet antes de guardar.",
        );
      if (!demo && !auth.currentUser)
        throw new Error(
          "Todavía no hay sesión en Firebase. Revisá la conexión o la autenticación anónima.",
        );
      await action();
      return true;
    } catch (e) {
      setError(friendlyError(e));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save(col: string, record: any, id?: string) {
    return execute(async () => {
      const payload = { ...record, updatedAt: new Date().toISOString() };
      delete payload.id;
      if (demo) {
        if (col === "company") setCompany((prev) => ({ ...prev, ...payload }));
        else
          setData((prev) => ({
            ...prev,
            [col]: id
              ? prev[col].map((r) => (r.id === id ? { ...r, ...payload } : r))
              : [...prev[col], { ...payload, id: crypto.randomUUID() }],
          }));
      } else if (col === "company")
        await setDoc(doc(db, `${basePath}/company/info`), payload, {
          merge: true,
        });
      else if (id)
        await updateDoc(doc(db, `${basePath}/${col}/${id}`), payload);
      else
        await addDoc(collection(db, `${basePath}/${col}`), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
    });
  }
  async function remove(col: string, id: string) {
    return execute(async () => {
      if (demo)
        setData((prev) => ({
          ...prev,
          [col]: prev[col].filter((r) => r.id !== id),
        }));
      else await deleteDoc(doc(db, `${basePath}/${col}/${id}`));
    });
  }
  async function importBank(records: any[]) {
    let added = 0,
      skipped = 0;
    const ok = await execute(async () => {
      // Hasta 50 lecturas + escrituras por transacción. Una reimportación nunca pisa ediciones.
      for (let i = 0; i < records.length; i += 50) {
        const chunk = records.slice(i, i + 50);
        if (demo) {
          const ids = new Set(data.bankTransactions.map((r) => r.id));
          const fresh = chunk.filter((r) => !ids.has(r.id));
          added += fresh.length;
          skipped += chunk.length - fresh.length;
          setData((prev) => ({
            ...prev,
            bankTransactions: [...prev.bankTransactions, ...fresh],
          }));
        } else {
          const result = await runTransaction(db, async (tx) => {
            const refs = chunk.map((r) =>
              doc(db, `${basePath}/bankTransactions/${r.id}`),
            );
            const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
            let count = 0;
            snaps.forEach((snap, index) => {
              if (snap.exists()) return;
              const { id, selected, ...payload } = chunk[index];
              tx.set(refs[index], {
                ...payload,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              count++;
            });
            return count;
          });
          added += result;
          skipped += chunk.length - result;
        }
      }
    });
    return { ok, added, skipped };
  }
  return {
    data,
    company,
    status,
    error,
    setError,
    demo,
    busy,
    save,
    remove,
    importBank,
  };
}
