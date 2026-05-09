import { useState, useEffect, useRef, useCallback } from "react";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  { id: "P001", name: "Café Americano 250g", description: "Café molido premium", price: 8500, cost: 4200, category: "Bebidas", supplier: "CaféCo", stock: 45, minStock: 10, barcode: "7801234567890", image: "☕" },
  { id: "P002", name: "Agua Mineral 500ml", description: "Agua sin gas", price: 1200, cost: 600, category: "Bebidas", supplier: "AquaPura", stock: 3, minStock: 20, barcode: "7809876543210", image: "💧" },
  { id: "P003", name: "Galletas Integrales", description: "Pack x12 unidades", price: 3200, cost: 1800, category: "Snacks", supplier: "NutriSnack", stock: 28, minStock: 5, barcode: "7805555123456", image: "🍪" },
  { id: "P004", name: "Jugo de Naranja 1L", description: "100% natural", price: 4500, cost: 2500, category: "Bebidas", supplier: "FrescaFrut", stock: 12, minStock: 8, barcode: "7803333789012", image: "🍊" },
  { id: "P005", name: "Té Verde x20", description: "Bolsas de té verde orgánico", price: 5800, cost: 3100, category: "Bebidas", supplier: "TéAsia", stock: 7, minStock: 10, barcode: "7802222345678", image: "🍵" },
];

const INITIAL_MOVEMENTS = [
  { id: "M001", productId: "P001", type: "sale", qty: 5, date: "2026-04-28", note: "Venta mostrador", total: 42500 },
  { id: "M002", productId: "P002", type: "purchase", qty: 50, date: "2026-04-29", note: "Reposición semanal", total: 30000 },
  { id: "M003", productId: "P003", type: "sale", qty: 8, date: "2026-04-30", note: "Pedido delivery", total: 25600 },
  { id: "M004", productId: "P001", type: "sale", qty: 3, date: "2026-05-01", note: "Venta mostrador", total: 25500 },
  { id: "M005", productId: "P004", type: "sale", qty: 6, date: "2026-05-01", note: "Pedido online", total: 27000 },
  { id: "M006", productId: "P005", type: "sale", qty: 4, date: "2026-05-02", note: "Venta directa", total: 23200 },
];

const CATEGORIES = ["Bebidas", "Snacks", "Lácteos", "Limpieza", "Papelería", "Electrónica", "Otros"];
const USERS = [
  { id: "U001", name: "Admin", email: "administrador@.com", password: "contra1234", role: "admin" },
  { id: "U002", name: "Empleado", email: "administrador2@.com", password: "empleado123", role: "employee" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const formatCLP = (n) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const formatDate = (d) => new Date(d).toLocaleDateString("es-CL");
const generateId = (prefix) => `${prefix}${Date.now().toString(36).toUpperCase()}`;

// ─── MINI CHART ───────────────────────────────────────────────────────────────
function SparkBar({ data, color = "#10b981", label }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48 }}>
      {data.map((v, i) => (
        <div key={i} title={`${label}: ${v}`} style={{
          flex: 1, borderRadius: 3,
          background: i === data.length - 1 ? color : `${color}55`,
          height: `${Math.max(8, (v / max) * 100)}%`,
          transition: "height 0.4s ease",
        }} />
      ))}
    </div>
  );
}

// ─── BARCODE SCANNER ─────────────────────────────────────────────────────────
function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("Iniciando cámara...");
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let interval;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("Apunta al código de barras");
        // Simulate detection after 3s for demo
        interval = setTimeout(() => setStatus("Listo para escanear — ingresa código manual si prefieres"), 3000);
      })
      .catch(() => setStatus("Cámara no disponible — usa entrada manual"));
    return () => {
      clearTimeout(interval);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleManual = () => { if (manualCode.trim()) { onDetect(manualCode.trim()); onClose(); } };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0f172a", borderRadius: 20, padding: 24, width: 340, border: "1px solid #334155" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>📷 Escanear código</span>
          <button onClick={onClose} style={{ background: "#334155", border: "none", color: "#94a3b8", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 12, overflow: "hidden", position: "relative", aspectRatio: "4/3", marginBottom: 12 }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 200, height: 80, border: "2px solid #10b981", borderRadius: 8, boxShadow: "0 0 0 9999px #00000066" }} />
          </div>
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>{status}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={manualCode} onChange={e => setManualCode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleManual()}
            placeholder="O ingresa código manualmente" style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#f1f5f9", borderRadius: 8, padding: "8px 12px", fontSize: 14 }} />
          <button onClick={handleManual} style={{ background: "#10b981", border: "none", color: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>OK</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#0f172a", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", border: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 0" }}>
          <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 18 }}>{title}</span>
          <button onClick={onClose} style={{ background: "#1e293b", border: "none", color: "#94a3b8", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── FORM INPUT ───────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle = { width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#f1f5f9", borderRadius: 10, padding: "10px 14px", fontSize: 14, boxSizing: "border-box", outline: "none" };

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@aponia.com");
  const [pass, setPass] = useState("admin123");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const u = USERS.find(u => u.email === email && u.password === pass);
    if (u) onLogin(u);
    else setError("Credenciales incorrectas");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <h1 style={{ color: "#f1f5f9", fontSize: 28, fontWeight: 800, margin: 0 }}>StockFlow</h1>
          <p style={{ color: "#64748b", marginTop: 8, fontSize: 14 }}>Gestión de inventario y ventas</p>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 20, padding: 28, border: "1px solid #1e293b" }}>
          <Field label="Correo electrónico">
            <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} type="email" />
          </Field>
          <Field label="Contraseña">
            <input style={inputStyle} value={pass} onChange={e => setPass(e.target.value)} type="password" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </Field>
          {error && <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 16px" }}>{error}</p>}
          <button onClick={handleLogin} style={{ width: "100%", background: "linear-gradient(135deg,#10b981,#059669)", border: "none", color: "#fff", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            Ingresar →
          </button>
          <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 16 }}>
            Admin: admin@aponia.com / admin123<br />Empleado: emp@aponia.com / emp123
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ children, color = "#10b981" }) {
  return <span style={{ background: `${color}22`, color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{children}</span>;
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, spark, sparkColor }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: 16, padding: 20, border: "1px solid #1e293b", flex: 1, minWidth: 140 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 4px", fontWeight: 600 }}>{icon} {label}</p>
          <p style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 800, margin: 0 }}>{value}</p>
          {sub && <p style={{ color: "#10b981", fontSize: 12, margin: "4px 0 0" }}>{sub}</p>}
        </div>
      </div>
      {spark && <SparkBar data={spark} color={sparkColor || "#10b981"} label={label} />}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [movements, setMovements] = useState(INITIAL_MOVEMENTS);
  const [search, setSearch] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMovForm, setShowMovForm] = useState(null); // "sale" | "purchase"
  const [showScanner, setShowScanner] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterCat, setFilterCat] = useState("Todas");

  const isAdmin = user?.role === "admin";

  // ── Stats
  const lowStock = products.filter(p => p.stock <= p.minStock);
  const totalInventoryValue = products.reduce((s, p) => s + p.stock * p.cost, 0);
  const todaySales = movements.filter(m => m.type === "sale" && m.date === "2026-05-02").reduce((s, m) => s + m.total, 0);
  const weekSales = movements.filter(m => m.type === "sale").reduce((s, m) => s + m.total, 0);
  const salesByDay = ["04-28","04-29","04-30","05-01","05-02"].map(d =>
    movements.filter(m => m.type === "sale" && m.date.endsWith(d.replace("-",""))||m.date.includes(d)).reduce((s,m)=>s+m.total,0)
  );
  const topProducts = [...products].sort((a, b) => {
    const sa = movements.filter(m => m.productId === a.id && m.type === "sale").reduce((s,m)=>s+m.qty,0);
    const sb = movements.filter(m => m.productId === b.id && m.type === "sale").reduce((s,m)=>s+m.qty,0);
    return sb - sa;
  }).slice(0, 5);

  // ── Filtered products
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search) || p.supplier.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "Todas" || p.category === filterCat;
    return matchSearch && matchCat;
  });

  // ── Product CRUD
  const saveProduct = (data) => {
    if (editProduct) {
      setProducts(ps => ps.map(p => p.id === editProduct.id ? { ...p, ...data } : p));
    } else {
      setProducts(ps => [...ps, { ...data, id: generateId("P"), stock: Number(data.stock) || 0 }]);
    }
    setShowProductForm(false); setEditProduct(null);
  };

  const deleteProduct = (id) => { if (window.confirm("¿Eliminar producto?")) setProducts(ps => ps.filter(p => p.id !== id)); };

  // ── Movement
  const saveMovement = (data) => {
    const product = products.find(p => p.id === data.productId);
    if (!product) return;
    const qty = Number(data.qty);
    const total = data.type === "sale" ? qty * product.price : qty * product.cost;
    const mov = { id: generateId("M"), ...data, qty, total, date: new Date().toISOString().split("T")[0] };
    setMovements(ms => [mov, ...ms]);
    setProducts(ps => ps.map(p => p.id === data.productId ? { ...p, stock: data.type === "sale" ? p.stock - qty : p.stock + qty } : p));
    setShowMovForm(null);
  };

  // ── Barcode scan
  const handleBarcode = (code) => {
    const found = products.find(p => p.barcode === code);
    if (found) { setSelectedProduct(found); setTab("products"); setSearch(code); }
    else alert(`Código ${code} no encontrado. Puedes crear un producto y asignarle este código.`);
  };

  // ── COLORS
  const C = { bg: "#020617", card: "#0f172a", border: "#1e293b", text: "#f1f5f9", muted: "#64748b", green: "#10b981", red: "#ef4444", yellow: "#f59e0b", blue: "#3b82f6" };

  if (!user) return <Login onLogin={setUser} />;

  // ── NAV
  const navItems = [
    { id: "dashboard", icon: "◈", label: "Panel" },
    { id: "products", icon: "⊞", label: "Productos" },
    { id: "movements", icon: "⇅", label: "Movimientos" },
    { id: "stats", icon: "◉", label: "Estadísticas" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text, display: "flex", flexDirection: "column" }}>
      {/* TOP BAR */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>📦</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: C.text }}>StockFlow</span>
          {lowStock.length > 0 && <span style={{ background: "#ef444422", color: C.red, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>⚠ {lowStock.length} bajo stock</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setShowScanner(true)} style={{ background: "#1e293b", border: "none", color: C.text, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 16 }} title="Escanear código">📷</button>
          <div style={{ background: "#1e293b", borderRadius: 10, padding: "6px 12px", fontSize: 13 }}>
            <span style={{ color: C.muted }}>Hola, </span><span style={{ fontWeight: 700 }}>{user.name}</span>
            {isAdmin && <Badge color={C.blue}> admin</Badge>}
          </div>
          <button onClick={() => setUser(null)} style={{ background: "none", border: "1px solid #334155", color: C.muted, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Salir</button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, padding: "20px 20px 80px", maxWidth: 900, margin: "0 auto", width: "100%" }}>

        {/* ── DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Panel de control</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatCard icon="💰" label="Ventas hoy" value={formatCLP(todaySales)} sub="↑ vs ayer" spark={[18000,25000,32000,todaySales,todaySales]} sparkColor={C.green} />
              <StatCard icon="📈" label="Ventas semana" value={formatCLP(weekSales)} spark={salesByDay} sparkColor={C.blue} />
              <StatCard icon="🏪" label="Valor inventario" value={formatCLP(totalInventoryValue)} />
              <StatCard icon="📦" label="Productos" value={products.length} sub={`${lowStock.length} con bajo stock`} />
            </div>

            {/* Low stock alerts */}
            {lowStock.length > 0 && (
              <div style={{ background: "#ef444411", border: "1px solid #ef444433", borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <p style={{ color: C.red, fontWeight: 700, margin: "0 0 10px" }}>⚠ Alertas de bajo stock</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {lowStock.map(p => (
                    <div key={p.id} style={{ background: "#ef444422", borderRadius: 8, padding: "6px 12px" }}>
                      <span style={{ fontSize: 16 }}>{p.image} </span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                      <span style={{ color: C.red, fontSize: 12, marginLeft: 8 }}>Stock: {p.stock}/{p.minStock}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top products */}
            <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <p style={{ fontWeight: 700, margin: "0 0 16px", fontSize: 15 }}>🏆 Productos más vendidos</p>
              {topProducts.map((p, i) => {
                const sold = movements.filter(m => m.productId === p.id && m.type === "sale").reduce((s,m)=>s+m.qty,0);
                const rev = movements.filter(m => m.productId === p.id && m.type === "sale").reduce((s,m)=>s+m.total,0);
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ color: C.muted, fontSize: 13, width: 20 }}>#{i+1}</span>
                    <span style={{ fontSize: 22 }}>{p.image}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{p.name}</p>
                      <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>{sold} unidades vendidas</p>
                    </div>
                    <span style={{ color: C.green, fontWeight: 700, fontSize: 14 }}>{formatCLP(rev)}</span>
                  </div>
                );
              })}
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowMovForm("sale")} style={{ flex: 1, background: "linear-gradient(135deg,#10b981,#059669)", border: "none", color: "#fff", borderRadius: 12, padding: 14, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>+ Nueva venta</button>
              {isAdmin && <button onClick={() => setShowMovForm("purchase")} style={{ flex: 1, background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", color: "#fff", borderRadius: 12, padding: 14, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>+ Compra / Entrada</button>}
            </div>
          </div>
        )}

        {/* ── PRODUCTS */}
        {tab === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Productos</h2>
              {isAdmin && <button onClick={() => { setEditProduct(null); setShowProductForm(true); }} style={{ background: C.green, border: "none", color: "#fff", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>+ Nuevo</button>}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar por nombre, código o proveedor..." style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
              <button onClick={() => setShowScanner(true)} style={{ background: "#1e293b", border: "1px solid #334155", color: C.text, borderRadius: 10, padding: "0 14px", cursor: "pointer" }}>📷</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {["Todas", ...CATEGORIES].map(c => (
                <button key={c} onClick={() => setFilterCat(c)} style={{ background: filterCat === c ? C.green : "#1e293b", border: "none", color: filterCat === c ? "#fff" : C.muted, borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>{c}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredProducts.map(p => {
                const isLow = p.stock <= p.minStock;
                return (
                  <div key={p.id} style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${isLow ? "#ef444433" : C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 32 }}>{p.image}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                        <Badge color={C.blue}>{p.category}</Badge>
                        {isLow && <Badge color={C.red}>Bajo stock</Badge>}
                      </div>
                      <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>🏷 {p.barcode || "Sin código"} · 🏢 {p.supplier}</p>
                      <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                        <span style={{ color: C.green, fontWeight: 700, fontSize: 14 }}>{formatCLP(p.price)}</span>
                        <span style={{ color: C.muted, fontSize: 13 }}>Stock: <strong style={{ color: isLow ? C.red : C.text }}>{p.stock}</strong></span>
                        <span style={{ color: C.muted, fontSize: 13 }}>Mín: {p.minStock}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button onClick={() => { setShowMovForm("sale"); setSelectedProduct(p); }} style={{ background: "#10b98122", border: "none", color: C.green, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Vender</button>
                      {isAdmin && <>
                        <button onClick={() => { setEditProduct(p); setShowProductForm(true); }} style={{ background: "#3b82f622", border: "none", color: C.blue, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Editar</button>
                        <button onClick={() => deleteProduct(p.id)} style={{ background: "#ef444422", border: "none", color: C.red, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Eliminar</button>
                      </>}
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && <p style={{ color: C.muted, textAlign: "center", padding: 40 }}>Sin resultados</p>}
            </div>
          </div>
        )}

        {/* ── MOVEMENTS */}
        {tab === "movements" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Movimientos</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowMovForm("sale")} style={{ background: C.green, border: "none", color: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ Venta</button>
                {isAdmin && <button onClick={() => setShowMovForm("purchase")} style={{ background: C.blue, border: "none", color: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ Compra</button>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {movements.map(m => {
                const p = products.find(pr => pr.id === m.productId);
                return (
                  <div key={m.id} style={{ background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{m.type === "sale" ? "📤" : "📥"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{p?.name || m.productId}</span>
                        <Badge color={m.type === "sale" ? C.green : C.blue}>{m.type === "sale" ? "Venta" : "Compra"}</Badge>
                      </div>
                      <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 12 }}>{formatDate(m.date)} · {m.note} · Qty: {m.qty}</p>
                    </div>
                    <span style={{ fontWeight: 800, color: m.type === "sale" ? C.green : C.blue, fontSize: 15 }}>{formatCLP(m.total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STATS */}
        {tab === "stats" && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Estadísticas</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Sales chart */}
              <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
                <p style={{ fontWeight: 700, margin: "0 0 16px" }}>📊 Ventas últimos 5 días</p>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 120 }}>
                  {["28 Abr","29 Abr","30 Abr","1 May","2 May"].map((day, i) => {
                    const val = [42500, 30000, 25600, 52500, 23200][i];
                    const max = 60000;
                    return (
                      <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>{formatCLP(val).replace("$","")}</span>
                        <div style={{ width: "100%", background: i === 4 ? C.green : `${C.green}44`, borderRadius: "6px 6px 0 0", height: `${(val/max)*100}%`, minHeight: 8 }} />
                        <span style={{ color: C.muted, fontSize: 10 }}>{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stock levels */}
              <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
                <p style={{ fontWeight: 700, margin: "0 0 16px" }}>📦 Niveles de stock</p>
                {products.map(p => {
                  const pct = Math.min(100, (p.stock / Math.max(p.stock, p.minStock * 3)) * 100);
                  const color = p.stock <= p.minStock ? C.red : p.stock <= p.minStock * 1.5 ? C.yellow : C.green;
                  return (
                    <div key={p.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13 }}>{p.image} {p.name}</span>
                        <span style={{ color, fontWeight: 700, fontSize: 13 }}>{p.stock} uds</span>
                      </div>
                      <div style={{ background: "#1e293b", borderRadius: 6, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Category breakdown */}
              <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
                <p style={{ fontWeight: 700, margin: "0 0 16px" }}>🗂 Ventas por categoría</p>
                {[...new Set(products.map(p => p.category))].map(cat => {
                  const catProducts = products.filter(p => p.category === cat);
                  const catSales = movements.filter(m => m.type === "sale" && catProducts.some(p => p.id === m.productId)).reduce((s,m)=>s+m.total,0);
                  const total = movements.filter(m=>m.type==="sale").reduce((s,m)=>s+m.total,0);
                  const pct = total ? (catSales/total*100).toFixed(0) : 0;
                  return (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <span style={{ color: C.muted, fontSize: 13, width: 80 }}>{cat}</span>
                      <div style={{ flex: 1, background: "#1e293b", borderRadius: 6, height: 10 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: C.blue, borderRadius: 6 }} />
                      </div>
                      <span style={{ color: C.text, fontWeight: 700, fontSize: 13, width: 70, textAlign: "right" }}>{formatCLP(catSales)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Low rotation */}
              <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
                <p style={{ fontWeight: 700, margin: "0 0 16px" }}>🐢 Menor rotación</p>
                {[...products].sort((a,b) => {
                  const sa = movements.filter(m=>m.productId===a.id&&m.type==="sale").reduce((s,m)=>s+m.qty,0);
                  const sb = movements.filter(m=>m.productId===b.id&&m.type==="sale").reduce((s,m)=>s+m.qty,0);
                  return sa-sb;
                }).slice(0,3).map(p => {
                  const sold = movements.filter(m=>m.productId===p.id&&m.type==="sale").reduce((s,m)=>s+m.qty,0);
                  return (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                      <span style={{fontSize:20}}>{p.image}</span>
                      <div style={{flex:1}}>
                        <p style={{margin:0,fontSize:14,fontWeight:600}}>{p.name}</p>
                        <p style={{margin:0,color:C.muted,fontSize:12}}>{sold} unidades vendidas · Stock: {p.stock}</p>
                      </div>
                      <Badge color={C.yellow}>Baja rotación</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "8px 0 12px" }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 16px", borderRadius: 10 }}>
            <span style={{ fontSize: 20, color: tab === n.id ? C.green : C.muted }}>{n.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: tab === n.id ? C.green : C.muted }}>{n.label}</span>
          </button>
        ))}
      </div>

      {/* ── MODALS */}
      {showScanner && <BarcodeScanner onDetect={handleBarcode} onClose={() => setShowScanner(false)} />}

      {showProductForm && (
        <ProductForm
          initial={editProduct}
          onSave={saveProduct}
          onClose={() => { setShowProductForm(false); setEditProduct(null); }}
        />
      )}

      {showMovForm && (
        <MovementForm
          type={showMovForm}
          products={products}
          preselected={selectedProduct}
          onSave={saveMovement}
          onClose={() => { setShowMovForm(null); setSelectedProduct(null); }}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

// ─── PRODUCT FORM ─────────────────────────────────────────────────────────────
function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name:"", description:"", price:"", cost:"", category:"Bebidas", supplier:"", minStock:"10", barcode:"", image:"📦" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputS = { width:"100%", background:"#1e293b", border:"1px solid #334155", color:"#f1f5f9", borderRadius:10, padding:"10px 14px", fontSize:14, boxSizing:"border-box" };
  const EMOJIS = ["📦","☕","💧","🍪","🍊","🍵","🥛","🧴","📝","💡","🛒","🍫","🧃","🥤","🫙"];

  return (
    <Modal title={initial ? "Editar producto" : "Nuevo producto"} onClose={onClose}>
      <Field label="Emoji / ícono">
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:4 }}>
          {EMOJIS.map(e => <button key={e} onClick={() => set("image",e)} style={{ background: form.image===e?"#10b98133":"#1e293b", border: form.image===e?"1px solid #10b981":"1px solid #334155", borderRadius:8, padding:"4px 8px", fontSize:20, cursor:"pointer" }}>{e}</button>)}
        </div>
      </Field>
      <Field label="Nombre"><input style={inputS} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Nombre del producto" /></Field>
      <Field label="Descripción"><input style={inputS} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Descripción breve" /></Field>
      <div style={{ display:"flex", gap:12 }}>
        <Field label="Precio venta"><input style={inputS} type="number" value={form.price} onChange={e=>set("price",e.target.value)} placeholder="0" /></Field>
        <Field label="Costo"><input style={inputS} type="number" value={form.cost} onChange={e=>set("cost",e.target.value)} placeholder="0" /></Field>
      </div>
      <Field label="Categoría">
        <select style={inputS} value={form.category} onChange={e=>set("category",e.target.value)}>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Proveedor"><input style={inputS} value={form.supplier} onChange={e=>set("supplier",e.target.value)} placeholder="Nombre del proveedor" /></Field>
      <div style={{ display:"flex", gap:12 }}>
        <Field label="Stock inicial"><input style={inputS} type="number" value={form.stock||0} onChange={e=>set("stock",e.target.value)} /></Field>
        <Field label="Stock mínimo"><input style={inputS} type="number" value={form.minStock} onChange={e=>set("minStock",e.target.value)} /></Field>
      </div>
      <Field label="Código de barras"><input style={inputS} value={form.barcode} onChange={e=>set("barcode",e.target.value)} placeholder="Código EAN / interno" /></Field>
      <button onClick={() => onSave(form)} style={{ width:"100%", background:"linear-gradient(135deg,#10b981,#059669)", border:"none", color:"#fff", borderRadius:12, padding:14, fontWeight:700, fontSize:15, cursor:"pointer", marginTop:8 }}>
        {initial ? "Guardar cambios" : "Crear producto"} →
      </button>
    </Modal>
  );
}

// ─── MOVEMENT FORM ────────────────────────────────────────────────────────────
function MovementForm({ type, products, preselected, onSave, onClose, isAdmin }) {
  const [productId, setProductId] = useState(preselected?.id || products[0]?.id || "");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const inputS = { width:"100%", background:"#1e293b", border:"1px solid #334155", color:"#f1f5f9", borderRadius:10, padding:"10px 14px", fontSize:14, boxSizing:"border-box" };
  const product = products.find(p => p.id === productId);
  const isSale = type === "sale";
  const total = product ? Number(qty) * (isSale ? product.price : product.cost) : 0;

  return (
    <Modal title={isSale ? "📤 Registrar venta" : "📥 Registrar compra"} onClose={onClose}>
      <Field label="Producto">
        <select style={inputS} value={productId} onChange={e=>setProductId(e.target.value)}>
          {products.map(p=><option key={p.id} value={p.id}>{p.image} {p.name} (Stock: {p.stock})</option>)}
        </select>
      </Field>
      <Field label="Cantidad">
        <input style={inputS} type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} />
      </Field>
      <Field label="Nota / referencia">
        <input style={inputS} value={note} onChange={e=>setNote(e.target.value)} placeholder="Venta mostrador, pedido #123..." />
      </Field>
      {product && (
        <div style={{ background:"#1e293b", borderRadius:12, padding:14, marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ color:"#64748b", fontSize:13 }}>{isSale ? "Precio unitario" : "Costo unitario"}</span>
            <span style={{ fontWeight:700 }}>{new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(isSale?product.price:product.cost)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:"#64748b", fontSize:13 }}>Total</span>
            <span style={{ fontWeight:800, fontSize:18, color: isSale?"#10b981":"#3b82f6" }}>{new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(total)}</span>
          </div>
          {isSale && product.stock < Number(qty) && <p style={{color:"#ef4444",fontSize:12,margin:"8px 0 0"}}>⚠ Stock insuficiente ({product.stock} disponibles)</p>}
        </div>
      )}
      <button
        onClick={() => onSave({ productId, qty, note, type })}
        disabled={isSale && product && product.stock < Number(qty)}
        style={{ width:"100%", background: isSale?"linear-gradient(135deg,#10b981,#059669)":"linear-gradient(135deg,#3b82f6,#2563eb)", border:"none", color:"#fff", borderRadius:12, padding:14, fontWeight:700, fontSize:15, cursor:"pointer", opacity: (isSale && product && product.stock < Number(qty)) ? 0.5 : 1 }}>
        Confirmar {isSale?"venta":"compra"} →
      </button>
    </Modal>
  );
}