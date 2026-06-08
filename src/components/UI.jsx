import { C, btnPrimary, btnSecondary } from "../constants";

// ─── LOGO ─────────────────────────────────────────────────────────────────────
export function ControlProLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path d="M50 8L88 22L88 52C88 72 70 88 50 95C30 88 12 72 12 52L12 22Z" fill={C.greenBg} stroke={C.green} strokeWidth="2.5"/>
      <rect x="28" y="55" width="10" height="20" rx="2" fill={C.greenXL}/>
      <rect x="44" y="42" width="10" height="33" rx="2" fill={C.greenL}/>
      <rect x="60" y="32" width="10" height="43" rx="2" fill={C.green}/>
      <path d="M30 52L55 30L72 38" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M65 28L75 36L63 40" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── PRODUCT AVATAR ───────────────────────────────────────────────────────────
export function ProductAvatar({ product, size = 48 }) {
  const palettes = [
    ["#e8f5e9","#2e7d32"], ["#e3f2fd","#1565c0"], ["#f3e5f5","#6a1b9a"],
    ["#fff8e1","#f57f17"], ["#fce4ec","#880e4f"], ["#e0f7fa","#006064"],
  ];
  const [bg, fg] = palettes[(product.name || "?").charCodeAt(0) % palettes.length];
  const initials = (product.name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  if (product.image) return (
    <img src={product.image} alt={product.name}
      style={{ width: size, height: size, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: bg, border: `1.5px solid ${fg}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: fg, fontWeight: 900, fontSize: size * 0.33 }}>{initials}</span>
    </div>
  );
}

// ─── CHIP ─────────────────────────────────────────────────────────────────────
export function Chip({ children, color, bg }) {
  return (
    <span style={{ background: bg || `${color}15`, color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// ─── FIELD ────────────────────────────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: 18, border: `1px solid ${C.border}`, boxShadow: C.shadow, ...style }}>
      {children}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(26,46,26,0.4)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: C.card, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: wide ? 700 : 520, maxHeight: "94dvh", overflow: "auto", boxShadow: C.shadowMd }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, background: C.border2, borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px 0" }}>
          <span style={{ color: C.text, fontWeight: 800, fontSize: 18 }}>{title}</span>
          <button onClick={onClose} style={{ background: C.card2, border: "none", color: C.muted, borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>
        <div style={{ padding: "16px 24px 32px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── LOADER ───────────────────────────────────────────────────────────────────
export function Loader({ text = "Cargando..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 16 }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.border2}`, borderTop: `3px solid ${C.green}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{text}</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, color, bg, icon }) {
  return (
    <div style={{ background: bg || C.card, borderRadius: 16, padding: 16, border: `1px solid ${color}22`, boxShadow: C.shadow, flex: 1, minWidth: 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>{label}</span>
      </div>
      <p style={{ color, fontWeight: 800, fontSize: 20, margin: 0 }}>{value}</p>
    </div>
  );
}