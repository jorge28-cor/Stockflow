// ─── PALETA CONTROLPRO ────────────────────────────────────────────────────────
export const C = {
  bg:       "#f0f4f0",
  card:     "#ffffff",
  card2:    "#f7faf7",
  sidebar:  "#1a2e1a",
  border:   "#e0ece0",
  border2:  "#d0e8d0",
  text:     "#1a2e1a",
  text2:    "#4a6a4a",
  muted:    "#7a9a7a",
  green:    "#2e7d32",
  greenL:   "#a5d6a7",
  greenBg:  "#e8f5e9",
  red:      "#c62828",
  redBg:    "#ffebee",
  orange:   "#f57f17",
  orangeBg: "#fff3e0",
  blue:     "#1565c0",
  blueBg:   "#e3f2fd",
  shadow:   "0 2px 12px rgba(46,125,50,0.08)",
  shadowMd: "0 4px 20px rgba(46,125,50,0.12)",
};

export const DARK = {
  bg:       "#0f1a0f",
  card:     "#1a2e1a",
  card2:    "#162616",
  sidebar:  "#0d1f0d",
  border:   "#2a3f2a",
  border2:  "#2e4a2e",
  text:     "#e8f5e9",
  text2:    "#a5d6a7",
  muted:    "#5a8a5a",
  green:    "#66bb6a",
  greenL:   "#a5d6a7",
  greenBg:  "#1a3a1a",
  red:      "#ef5350",
  redBg:    "#2a1010",
  orange:   "#ffa726",
  orangeBg: "#2a1a00",
  blue:     "#42a5f5",
  blueBg:   "#0a1a2a",
  shadow:   "0 2px 12px rgba(0,0,0,0.3)",
  shadowMd: "0 4px 20px rgba(0,0,0,0.4)",
};

export const PAY_METHODS = [
  { id: "efectivo",      label: "💵 Efectivo",      color: "#2e7d32" },
  { id: "tarjeta",       label: "💳 Tarjeta",        color: "#1565c0" },
  { id: "transferencia", label: "📲 Transferencia",  color: "#4a6a4a" },
];

export const SALE_STATES = [
  { id: "pendiente",  label: "⏳ Pendiente",  color: "#f57f17", bg: "#fff3e0" },
  { id: "pagado",     label: "✅ Pagado",     color: "#2e7d32", bg: "#e8f5e9" },
  { id: "entregado",  label: "📦 Entregado",  color: "#1565c0", bg: "#e3f2fd" },
];

export const COL = {
  products:   "productos",
  movements:  "movimientos",
  categories: "categorias",
  clients:    "clientes",
  suppliers:  "proveedores",
  expenses:   "gastos",
  payments:   "pagos",
};

export const EXPENSE_CATS = [
  "Mercadería","Publicidad","Envíos","Bolsas","Etiquetas","Servicios","Alquiler","Otro"
];

export const SUPERADMIN_EMAIL = "jorge21sb@gmail.com";

export const fmt = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n || 0);

export const fmtDate = (d) => new Date(d).toLocaleDateString("es-AR");
export const todayStr = () => new Date().toISOString().split("T")[0];
export const genId = (p) => `${p}${Date.now().toString(36).toUpperCase()}`;

export const makeStyles = (C) => ({
  inp: {
    width: "100%", background: C.card, border: `1.5px solid ${C.border2}`,
    color: C.text, borderRadius: 12, padding: "12px 14px", fontSize: 15,
    boxSizing: "border-box", outline: "none", fontFamily: "inherit",
    transition: "border-color 0.2s",
  },
  btnPrimary: (extra = {}) => ({
    background: C.green,
    border: "none", color: "#fff", borderRadius: 14, padding: "14px 20px",
    fontWeight: 700, cursor: "pointer", fontSize: 15, fontFamily: "inherit",
    boxShadow: `0 4px 14px ${C.green}44`, ...extra,
  }),
  btnSecondary: (extra = {}) => ({
    background: C.card, border: `1.5px solid ${C.border2}`,
    color: C.text2, borderRadius: 12, padding: "10px 16px",
    fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "inherit", ...extra,
  }),
  btnGhost: (color, bg, extra = {}) => ({
    background: bg, border: `1.5px solid ${color}33`,
    color, borderRadius: 10, padding: "8px 12px",
    fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit", ...extra,
  }),
});

export const inp = {
  width: "100%", background: "#ffffff", border: "1.5px solid #d0e8d0",
  color: "#1a2e1a", borderRadius: 12, padding: "12px 14px", fontSize: 15,
  boxSizing: "border-box", outline: "none", fontFamily: "inherit",
  transition: "border-color 0.2s",
};

export const btnPrimary = (extra = {}) => ({
  background: "#2e7d32",
  border: "none", color: "#fff", borderRadius: 14, padding: "14px 20px",
  fontWeight: 700, cursor: "pointer", fontSize: 15, fontFamily: "inherit",
  boxShadow: "0 4px 14px rgba(46,125,50,0.25)", ...extra,
});

export const btnSecondary = (extra = {}) => ({
  background: "#ffffff", border: "1.5px solid #d0e8d0",
  color: "#4a6a4a", borderRadius: 12, padding: "10px 16px",
  fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "inherit", ...extra,
});

export const btnGhost = (color, bg, extra = {}) => ({
  background: bg, border: `1.5px solid ${color}33`,
  color, borderRadius: 10, padding: "8px 12px",
  fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit", ...extra,
});