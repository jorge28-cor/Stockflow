// ─── COLORES ──────────────────────────────────────────────────────────────────
export const C = {
  bg:       "#f0f4f0",
  card:     "#ffffff",
  card2:    "#f7faf7",
  cardGreen:"#e8f5e9",
  border:   "#e0ece0",
  border2:  "#d0e8d0",
  text:     "#1a2e1a",
  text2:    "#3a5a3a",
  muted:    "#7a9a7a",
  green:    "#2e7d32",
  greenL:   "#43a047",
  greenXL:  "#a5d6a7",
  greenBg:  "#e8f5e9",
  red:      "#c62828",
  redBg:    "#ffebee",
  yellow:   "#f57f17",
  yellowBg: "#fff8e1",
  blue:     "#1565c0",
  blueBg:   "#e3f2fd",
  purple:   "#6a1b9a",
  purpleBg: "#f3e5f5",
  shadow:   "0 2px 12px rgba(46,125,50,0.08)",
  shadowMd: "0 4px 20px rgba(46,125,50,0.12)",
};

// ─── MÉTODOS DE PAGO ──────────────────────────────────────────────────────────
export const PAY_METHODS = [
  { id: "efectivo",      label: "💵 Efectivo",      color: "#00a86b" },
  { id: "tarjeta",       label: "💳 Tarjeta",        color: "#5c6bc0" },
  { id: "transferencia", label: "📲 Transferencia",  color: "#7c3aed" },
];

// ─── COLECCIONES FIRESTORE ────────────────────────────────────────────────────
export const COL = {
  products:   "productos",
  movements:  "movimientos",
  categories: "categorias",
};

// ─── SUPERADMIN ───────────────────────────────────────────────────────────────
export const SUPERADMIN_EMAIL = "jorge21sb@gmail.com";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const fmt = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n || 0);

export const fmtDate = (d) => new Date(d).toLocaleDateString("es-AR");

export const todayStr = () => new Date().toISOString().split("T")[0];

export const genId = (p) => `${p}${Date.now().toString(36).toUpperCase()}`;

// ─── ESTILOS BASE ─────────────────────────────────────────────────────────────
export const inp = {
  width: "100%", background: "#f7faf7", border: "1.5px solid #d0e8d0",
  color: "#1a2e1a", borderRadius: 12, padding: "12px 14px", fontSize: 15,
  boxSizing: "border-box", outline: "none", fontFamily: "inherit",
  transition: "border-color 0.2s",
};

export const btnPrimary = (extra = {}) => ({
  background: "linear-gradient(135deg,#2e7d32,#43a047)",
  border: "none", color: "#fff", borderRadius: 14, padding: "14px 20px",
  fontWeight: 700, cursor: "pointer", fontSize: 15, fontFamily: "inherit",
  boxShadow: "0 4px 14px #a5d6a7", ...extra,
});

export const btnSecondary = (extra = {}) => ({
  background: "#f7faf7", border: "1.5px solid #d0e8d0",
  color: "#3a5a3a", borderRadius: 12, padding: "10px 16px",
  fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "inherit", ...extra,
});

export const btnGhost = (color, bg, extra = {}) => ({
  background: bg, border: `1.5px solid ${color}33`,
  color, borderRadius: 10, padding: "8px 12px",
  fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit", ...extra,
});