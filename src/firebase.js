import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ─── Config ───────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyC2DevBMeT80nj9NN6CDyXssSDyXUyceWA",
  authDomain: "stock-app-4afe8.firebaseapp.com",
  databaseURL: "https://stock-app-4afe8-default-rtdb.firebaseio.com",
  projectId: "stock-app-4afe8",
  storageBucket: "stock-app-4afe8.firebasestorage.app",
  messagingSenderId: "310499318784",
  appId: "1:310499318784:web:3589c499c939edf8d8cce5",
  measurementId: "G-YE84KR5W2N"

};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ─── Rutas multi-tenant ───────────────────────────────────────────────────────
export const paths = {
  negocio:    (bId)              => doc(db, "negocios", bId),
  negocios:   ()                 => collection(db, "negocios"),
  productos:  (bId)              => collection(db, "negocios", bId, "productos"),
  producto:   (bId, pId)         => doc(db, "negocios", bId, "productos", pId),
  movimientos:(bId)              => collection(db, "negocios", bId, "movimientos"),
  movimiento: (bId, mId)         => doc(db, "negocios", bId, "movimientos", mId),
  categorias: (bId)              => collection(db, "negocios", bId, "categorias"),
  categoria:  (bId, cId)         => doc(db, "negocios", bId, "categorias", cId),
  usuario:    (uid)              => doc(db, "usuarios", uid),
  usuarios:   ()                 => collection(db, "usuarios"),
};

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const perfil = await getUserProfile(cred.user.uid);
  return { user: cred.user, perfil };
}

export async function logout() {
  await signOut(auth);
}

export function onSessionChange(cb) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return cb(null);
    const perfil = await getUserProfile(user.uid);
    cb({ user, perfil });
  });
}

// ─── Usuarios (Firestore) ─────────────────────────────────────────────────────

export async function getUserProfile(uid) {
  const snap = await getDoc(paths.usuario(uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

export async function createUser({ email, password, nombre, businessId, rol = "empleado" }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const perfil = {
    nombre,
    email,
    businessId,
    rol,
    creadoEn: serverTimestamp(),
    activo: true,
  };
  await setDoc(paths.usuario(cred.user.uid), perfil);
  return { uid: cred.user.uid, ...perfil };
}

export async function updateUserProfile(uid, data) {
  await updateDoc(paths.usuario(uid), { ...data, actualizadoEn: serverTimestamp() });
}

export async function listUsers() {
  const snap = await getDocs(paths.usuarios());
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function listUsersByBusiness(businessId) {
  const q = query(paths.usuarios(), where("businessId", "==", businessId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

// ─── Negocios ─────────────────────────────────────────────────────────────────

export async function createNegocio({ nombre, descripcion = "", plan = "basic" }) {
  const ref = await addDoc(paths.negocios(), {
    nombre,
    descripcion,
    plan,
    activo: true,
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

export async function getNegocio(businessId) {
  const snap = await getDoc(paths.negocio(businessId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listNegocios() {
  const snap = await getDocs(paths.negocios());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateNegocio(businessId, data) {
  await updateDoc(paths.negocio(businessId), { ...data, actualizadoEn: serverTimestamp() });
}

// ─── Productos ────────────────────────────────────────────────────────────────

export function onProductosChange(businessId, cb) {
  return onSnapshot(paths.productos(businessId), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addProducto(businessId, data) {
  return addDoc(paths.productos(businessId), { ...data, creadoEn: serverTimestamp() });
}

export async function updateProducto(businessId, productoId, data) {
  await updateDoc(paths.producto(businessId, productoId), {
    ...data,
    actualizadoEn: serverTimestamp(),
  });
}

export async function deleteProducto(businessId, productoId) {
  await deleteDoc(paths.producto(businessId, productoId));
}

// ─── Movimientos ──────────────────────────────────────────────────────────────

export async function addMovimiento(businessId, { productoId, tipo, cantidad, nota = "", usuarioId }) {
  const batch = writeBatch(db);
  const movRef = doc(paths.movimientos(businessId));
  batch.set(movRef, {
    productoId,
    tipo,
    cantidad,
    nota,
    usuarioId,
    fecha: serverTimestamp(),
  });
  const prodRef = paths.producto(businessId, productoId);
  const prodSnap = await getDoc(prodRef);
  if (!prodSnap.exists()) throw new Error("Producto no encontrado");
  const stockActual = prodSnap.data().stock ?? 0;
  const delta = tipo === "salida" ? -cantidad : cantidad;
  batch.update(prodRef, { stock: stockActual + delta, actualizadoEn: serverTimestamp() });
  await batch.commit();
}

export function onMovimientosChange(businessId, cb) {
  return onSnapshot(paths.movimientos(businessId), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ─── Categorías ───────────────────────────────────────────────────────────────

export async function getCategorias(businessId) {
  const snap = await getDocs(paths.categorias(businessId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addCategoria(businessId, nombre) {
  return addDoc(paths.categorias(businessId), { nombre, creadoEn: serverTimestamp() });
}

// ─── Storage — subida de imágenes ─────────────────────────────────────────────

export async function uploadImage(businessId, file) {
  try {
    const storageRef = ref(
      storage,
      `negocios/${businessId}/productos/${Date.now()}_${file.name}`
    );
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch(e) {
    console.error("Error subiendo imagen:", e);
    return null;
  }
}

export { serverTimestamp, getDocs, query, where, collection, db as default };