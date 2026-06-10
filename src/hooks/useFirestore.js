import { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, updateDoc,
  deleteDoc, doc, setDoc, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { COL } from "../constants";

// ─── CRUD BASE ────────────────────────────────────────────────────────────────
export async function fbGetAll(bId, col) {
  try {
    const s = await getDocs(collection(db, "negocios", bId, col));
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error(e); return []; }
}

export async function fbAdd(bId, col, data) {
  try {
    const r = await addDoc(collection(db, "negocios", bId, col), {
      ...data, creadoEn: serverTimestamp(),
    });
    return r.id;
  } catch(e) { console.error(e); return null; }
}

export async function fbUpdate(bId, col, id, data) {
  try {
    await updateDoc(doc(db, "negocios", bId, col, id), data);
    return true;
  } catch(e) { console.error(e); return false; }
}

export async function fbDelete(bId, col, id) {
  try {
    await deleteDoc(doc(db, "negocios", bId, col, id));
    return true;
  } catch(e) { console.error(e); return false; }
}

export async function fbSet(bId, col, id, data) {
  try {
    await setDoc(doc(db, "negocios", bId, col, id), data);
    return true;
  } catch(e) { console.error(e); return false; }
}

export function fbListen(bId, col, cb) {
  return onSnapshot(collection(db, "negocios", bId, col), s => {
    cb(s.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ─── HOOK PRINCIPAL ───────────────────────────────────────────────────────────
export function useFirestore(businessId) {
  const [products,   setProducts]   = useState([]);
  const [movements,  setMovements]  = useState([]);
  const [categories, setCategories] = useState(["General"]);
  const [clients,    setClients]    = useState([]);
  const [suppliers,  setSuppliers]  = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    let u1, u2, u3, u4, u5;
    const load = async () => {
      setLoading(true);
      const cats = await fbGetAll(businessId, COL.categories);
      if (cats.length > 0 && cats[0].items) setCategories(cats[0].items);

      u1 = fbListen(businessId, COL.products, data => {
        setProducts(data);
        setLoading(false);
      });
      u2 = fbListen(businessId, COL.movements, data => {
        setMovements(data.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
      });
      u3 = fbListen(businessId, COL.clients, data => {
        setClients(data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      });
      u4 = fbListen(businessId, COL.suppliers, data => {
        setSuppliers(data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      });
      u5 = fbListen(businessId, COL.expenses, data => {
        setExpenses(data.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
      });
    };
    load();
    return () => { u1?.(); u2?.(); u3?.(); u4?.(); u5?.(); };
  }, [businessId]);

  return {
    products, movements, categories, setCategories,
    clients, suppliers, expenses, loading,
  };
}