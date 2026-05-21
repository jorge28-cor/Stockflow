import { useState, useRef, useEffect } from "react";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc
} from "firebase/firestore";
import { db } from "./firebase";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const USERS = [
  { id:"U001", name:"Admin", email:"admin@controlpro.com", password:"admin2024", role:"admin" },
  { id:"U002", name:"Empleado", email:"emp@controlpro.com", password:"emp2024", role:"employee" },
];

const PAY_METHODS = [
  { id:"efectivo", label:"💵 Efectivo", color:"#00e676" },
  { id:"tarjeta", label:"💳 Tarjeta", color:"#4a9eff" },
  { id:"transferencia", label:"📲 Transferencia", color:"#a855f7" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n||0);
const fmtDate = (d) => new Date(d).toLocaleDateString("es-AR");
const todayStr = () => new Date().toISOString().split("T")[0];
const genId = (p) => `${p}${Date.now().toString(36).toUpperCase()}`;

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#080810", card:"#0f0f1a", card2:"#13131f", border:"#1a1a2e", border2:"#252540",
  text:"#eeeeff", muted:"#6666aa", green:"#00e676", red:"#ff4757", yellow:"#ffd32a",
  blue:"#4a9eff", purple:"#a855f7", cyan:"#00bcd4",
};

const inp = { width:"100%", background:C.card2, border:`1px solid ${C.border2}`, color:C.text, borderRadius:10, padding:"10px 14px", fontSize:14, boxSizing:"border-box", outline:"none", fontFamily:"inherit" };
const btnS = (bg, color="#fff", extra={}) => ({ background:bg, border:"none", color, borderRadius:10, padding:"10px 16px", fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"inherit", ...extra });

// ─── FIREBASE HELPERS ─────────────────────────────────────────────────────────
const COL = { products:"productos", movements:"movimientos", categories:"categorias" };

async function fbGetAll(colName) {
  try {
    const snap = await getDocs(collection(db, colName));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.error(`Error leyendo ${colName}:`, e); return []; }
}

async function fbAdd(colName, data) {
  try {
    const ref = await addDoc(collection(db, colName), data);
    return ref.id;
  } catch (e) { console.error(`Error agregando a ${colName}:`, e); return null; }
}

async function fbUpdate(colName, id, data) {
  try {
    await updateDoc(doc(db, colName, id), data);
    return true;
  } catch (e) { console.error(`Error actualizando ${colName}/${id}:`, e); return false; }
}

async function fbDelete(colName, id) {
  try {
    await deleteDoc(doc(db, colName, id));
    return true;
  } catch (e) { console.error(`Error eliminando ${colName}/${id}:`, e); return false; }
}

async function fbSet(colName, id, data) {
  try {
    await setDoc(doc(db, colName, id), data);
    return true;
  } catch (e) { console.error(`Error seteando ${colName}/${id}:`, e); return false; }
}

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────
function Loader({ text = "Cargando..." }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, gap:16 }}>
      <div style={{ width:36, height:36, border:`3px solid ${C.border2}`, borderTop:`3px solid ${C.green}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:C.muted, fontSize:13, margin:0 }}>{text}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── CONTROLPRO LOGO ──────────────────────────────────────────────────────────
function ControlProLogo({ size=48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 8 L88 22 L88 52 C88 72 70 88 50 95 C30 88 12 72 12 52 L12 22 Z" fill="url(#sg)" opacity="0.15"/>
      <path d="M50 8 L88 22 L88 52 C88 72 70 88 50 95 C30 88 12 72 12 52 L12 22 Z" stroke="url(#sg)" strokeWidth="2.5" fill="none"/>
      <rect x="28" y="55" width="10" height="20" rx="2" fill="url(#sg)" opacity="0.7"/>
      <rect x="44" y="42" width="10" height="33" rx="2" fill="url(#sg)" opacity="0.85"/>
      <rect x="60" y="32" width="10" height="43" rx="2" fill="url(#sg)"/>
      <path d="M30 52 L55 30 L72 38" stroke="#00e676" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M65 28 L75 36 L63 40" stroke="#00e676" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <defs>
        <linearGradient id="sg" x1="12" y1="8" x2="88" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e676"/><stop offset="100%" stopColor="#1a6b42"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── PRODUCT AVATAR ───────────────────────────────────────────────────────────
function ProductAvatar({ product, size=48 }) {
  const colors = ["#00e676","#4a9eff","#a855f7","#ff4757","#ffd32a","#00bcd4","#ff6b35","#e91e63"];
  const color = colors[(product.name||"?").charCodeAt(0)%colors.length];
  const initials = (product.name||"?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
  if (product.image) return <img src={product.image} alt={product.name} style={{ width:size, height:size, borderRadius:10, objectFit:"cover", flexShrink:0 }} />;
  return (
    <div style={{ width:size, height:size, borderRadius:10, background:`${color}22`, border:`1px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ color, fontWeight:900, fontSize:size*0.33 }}>{initials}</span>
    </div>
  );
}

function Badge({ children, color=C.green }) {
  return <span style={{ background:`${color}22`, color, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{children}</span>;
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", color:C.muted, fontSize:11, fontWeight:700, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"env(safe-area-inset-top,16px) 16px env(safe-area-inset-bottom,16px)" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.card, borderRadius:20, width:"100%", maxWidth:wide?680:480, maxHeight:"92dvh", overflow:"auto", border:`1px solid ${C.border2}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px 0", position:"sticky", top:0, background:C.card, zIndex:1 }}>
          <span style={{ color:C.text, fontWeight:800, fontSize:18 }}>{title}</span>
          <button onClick={onClose} style={{ background:C.border2, border:"none", color:C.muted, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:16 }}>✕</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── CATEGORY MANAGER ─────────────────────────────────────────────────────────
function CategoryManager({ categories, onUpdate, onClose }) {
  const [list, setList] = useState([...categories]);
  const [newCat, setNewCat] = useState("");
  const [saving, setSaving] = useState(false);

  const add = () => {
    const t = newCat.trim();
    if (!t || list.includes(t)) return;
    setList(l=>[...l,t]); setNewCat("");
  };

  const remove = (cat) => {
    if (cat==="General") return alert("La categoría General no se puede eliminar.");
    setList(l=>l.filter(c=>c!==cat));
  };

  const save = async () => {
    setSaving(true);
    await fbSet(COL.categories, "lista", { items: list });
    onUpdate(list);
    setSaving(false);
    onClose();
  };

  return (
    <Modal title="🗂 Mis categorías" onClose={onClose}>
      <p style={{ color:C.muted, fontSize:13, margin:"0 0 16px" }}>Creá las categorías de tu negocio.</p>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input style={{ ...inp, flex:1 }} value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Nueva categoría..." />
        <button onClick={add} style={btnS(C.green,"#000")}>+ Agregar</button>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
        {list.map(c=>(
          <div key={c} style={{ display:"flex", alignItems:"center", gap:6, background:C.card2, border:`1px solid ${C.border2}`, borderRadius:20, padding:"6px 12px" }}>
            <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{c}</span>
            {c!=="General" && <button onClick={()=>remove(c)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:14, padding:0 }}>✕</button>}
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} style={{ ...btnS(`linear-gradient(135deg,${C.green},#00c853)`,"#000"), width:"100%", padding:14, fontSize:15 }}>
        {saving?"Guardando...":"Guardar categorías →"}
      </button>
    </Modal>
  );
}

// ─── BARCODE SCANNER ─────────────────────────────────────────────────────────
function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectedRef = useRef(false);
  const [status, setStatus] = useState("Iniciando cámara...");
  const [manual, setManual] = useState("");

  useState(() => {
    let quaggaStarted = false;
    navigator.mediaDevices?.getUserMedia({ video:{ facingMode:"environment" } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("Apuntá al código de barras");
        const initQ = () => {
          if (!videoRef.current) return;
          window.Quagga.init({
            inputStream:{ type:"LiveStream", target:videoRef.current, constraints:{ facingMode:"environment" } },
            decoder:{ readers:["ean_reader","ean_8_reader","code_128_reader","upc_reader"] },
            locate:true,
          }, err => {
            if (!err) {
              quaggaStarted=true; window.Quagga.start();
              window.Quagga.onDetected(r => {
                if (detectedRef.current) return;
                const code=r.codeResult.code;
                if (code?.length>4) { detectedRef.current=true; setStatus(`✅ ${code}`); setTimeout(()=>{ onDetect(code); onClose(); },400); }
              });
            }
          });
        };
        if (!window.Quagga) { const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js"; s.onload=initQ; document.head.appendChild(s); }
        else { initQ(); }
      })
      .catch(()=>setStatus("Cámara no disponible — usá el código manual"));
    return () => {
      streamRef.current?.getTracks().forEach(t=>t.stop());
      if (quaggaStarted&&window.Quagga) { try { window.Quagga.stop(); } catch {} }
    };
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, background:"#000e", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.card, borderRadius:20, padding:24, width:"100%", maxWidth:340, border:`1px solid ${C.border2}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:16 }}>📷 Escáner</span>
          <button onClick={onClose} style={{ background:C.border2, border:"none", color:C.muted, borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ background:"#000", borderRadius:12, overflow:"hidden", position:"relative", aspectRatio:"4/3", marginBottom:12 }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <div style={{ width:"70%", height:80, border:`2px solid ${C.green}`, borderRadius:8, boxShadow:`0 0 0 9999px #00000066` }} />
          </div>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, textAlign:"center", color:"#fff", fontSize:12, background:"#0008", padding:"4px 0" }}>{status}</div>
        </div>
        <p style={{ color:C.muted, fontSize:12, textAlign:"center", marginBottom:8 }}>O ingresá manualmente:</p>
        <div style={{ display:"flex", gap:8 }}>
          <input value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&manual.trim()&&(onDetect(manual.trim()),onClose())} placeholder="Código..." style={{ ...inp, flex:1 }} />
          <button onClick={()=>manual.trim()&&(onDetect(manual.trim()),onClose())} style={btnS(C.green,"#000")}>OK</button>
        </div>
      </div>
    </div>
  );
}

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────
function ImageUpload({ value, onChange }) {
  const fileRef = useRef();
  const [urlInput, setUrlInput] = useState("");
  const [tab, setTab] = useState("upload");
  const handleFile = (e) => {
    const file=e.target.files[0]; if (!file) return;
    const reader=new FileReader();
    reader.onload=ev=>onChange(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {["upload","url"].map(t=>(
          <button key={t} type="button" onClick={()=>setTab(t)} style={btnS(tab===t?C.blue:C.border2,tab===t?"#fff":C.muted)}>
            {t==="upload"?"📁 Subir foto":"🌐 URL"}
          </button>
        ))}
        {value && <button type="button" onClick={()=>onChange(null)} style={btnS(C.border2,C.red)}>🗑 Quitar</button>}
      </div>
      {tab==="upload" && (
        <div onClick={()=>fileRef.current.click()} style={{ border:`2px dashed ${C.border2}`, borderRadius:12, padding:20, textAlign:"center", cursor:"pointer", background:C.card2 }}>
          {value ? <img src={value} alt="preview" style={{ maxHeight:120, maxWidth:"100%", borderRadius:8, objectFit:"contain" }} />
            : <><div style={{ fontSize:32, marginBottom:8 }}>📷</div><p style={{ color:C.muted, fontSize:13, margin:0 }}>Tocá para subir una foto</p></>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
        </div>
      )}
      {tab==="url" && (
        <>
          <div style={{ display:"flex", gap:8 }}>
            <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} placeholder="https://..." style={{ ...inp, flex:1 }} />
            <button type="button" onClick={()=>urlInput&&onChange(urlInput)} style={btnS(C.blue)}>Aplicar</button>
          </div>
          {value && <img src={value} alt="preview" style={{ marginTop:8, maxHeight:80, borderRadius:8 }} />}
        </>
      )}
    </div>
  );
}

// ─── PRODUCT FORM ─────────────────────────────────────────────────────────────
function ProductForm({ initial, categories, onSave, onClose, saving }) {
  const def = { name:"", description:"", price:"", priceWholesale:"", cost:"", category:categories[0]||"General", supplier:"", stock:"0", minStock:"5", barcode:"", image:null };
  const [f, setF] = useState(initial?{...initial}:def);
  const [showScanner, setShowScanner] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const margin = f.price&&f.cost?(((f.price-f.cost)/f.price)*100).toFixed(1):0;
  return (
    <Modal title={initial?"✏️ Editar producto":"➕ Nuevo producto"} onClose={onClose}>
      {showScanner && <BarcodeScanner onDetect={c=>{set("barcode",c);setShowScanner(false);}} onClose={()=>setShowScanner(false)} />}
      <Field label="Foto del producto"><ImageUpload value={f.image} onChange={v=>set("image",v)} /></Field>
      <Field label="Nombre"><input style={inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Nombre del producto" /></Field>
      <Field label="Descripción"><input style={inp} value={f.description} onChange={e=>set("description",e.target.value)} /></Field>
      <Field label="Categoría">
        <select style={inp} value={f.category} onChange={e=>set("category",e.target.value)}>
          {categories.map(c=><option key={c}>{c}</option>)}
        </select>
      </Field>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Precio minorista"><input style={inp} type="number" value={f.price} onChange={e=>set("price",e.target.value)} /></Field></div>
        <div style={{ flex:1 }}><Field label="Precio mayorista"><input style={inp} type="number" value={f.priceWholesale} onChange={e=>set("priceWholesale",e.target.value)} /></Field></div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Costo"><input style={inp} type="number" value={f.cost} onChange={e=>set("cost",e.target.value)} /></Field></div>
        <div style={{ flex:1 }}><Field label="Margen"><div style={{ ...inp, color:Number(margin)>30?C.green:Number(margin)>15?C.yellow:C.red, fontWeight:700 }}>{margin}%</div></Field></div>
      </div>
      <Field label="Proveedor"><input style={inp} value={f.supplier} onChange={e=>set("supplier",e.target.value)} /></Field>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Stock inicial"><input style={inp} type="number" value={f.stock} onChange={e=>set("stock",e.target.value)} /></Field></div>
        <div style={{ flex:1 }}><Field label="Stock mínimo"><input style={inp} type="number" value={f.minStock} onChange={e=>set("minStock",e.target.value)} /></Field></div>
      </div>
      <Field label="Código de barras">
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ ...inp, flex:1 }} value={f.barcode} onChange={e=>set("barcode",e.target.value)} placeholder="Escanear o ingresar" />
          <button type="button" onClick={()=>setShowScanner(true)} style={btnS(C.border2,C.text)}>📷</button>
        </div>
      </Field>
      <button onClick={()=>onSave(f)} disabled={saving||!f.name} style={{ ...btnS(`linear-gradient(135deg,${C.green},#00c853)`,"#000"), width:"100%", padding:14, fontSize:15, marginTop:4, opacity:saving||!f.name?0.6:1 }}>
        {saving?"Guardando...":initial?"Guardar cambios →":"Crear producto →"}
      </button>
    </Modal>
  );
}

// ─── QUICK CASH ───────────────────────────────────────────────────────────────
function QuickCash({ products, onSell, onClose }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [payMethod, setPayMethod] = useState("efectivo");
  const [cashReceived, setCashReceived] = useState("");
  const [priceType, setPriceType] = useState("retail");
  const [step, setStep] = useState("cart");
  const [saving, setSaving] = useState(false);

  const getPrice = (p) => priceType==="wholesale"?(p.priceWholesale||p.price):p.price;
  const filtered = search ? products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.barcode?.includes(search)) : [...products].sort((a,b)=>b.stock-a.stock).slice(0,12);
  const total = cart.reduce((s,i)=>s+getPrice(i.product)*i.qty,0);
  const change = cashReceived?Number(cashReceived)-total:0;

  const addToCart = (product) => setCart(c=>{
    const exists=c.find(i=>i.product.id===product.id);
    return exists?c.map(i=>i.product.id===product.id?{...i,qty:i.qty+1}:i):[...c,{product,qty:1}];
  });

  const handleBarcode = (code) => {
    const p=products.find(pr=>pr.barcode===code);
    if (p) addToCart(p); else alert(`Código ${code} no encontrado`);
  };

  const confirmSale = async () => {
    setSaving(true);
    for (const item of cart) {
      await onSell({ productId:item.product.id, qty:item.qty, type:"sale", unitPrice:getPrice(item.product), total:getPrice(item.product)*item.qty, date:todayStr(), note:`Caja rápida · ${priceType==="wholesale"?"Mayorista":"Minorista"}`, payMethod });
    }
    setSaving(false);
    onClose();
  };

  return (
    <Modal title="⚡ Caja rápida" onClose={onClose} wide>
      {showScanner && <BarcodeScanner onDetect={handleBarcode} onClose={()=>setShowScanner(false)} />}
      {step==="cart" && <>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {["retail","wholesale"].map(t=>(
            <button key={t} onClick={()=>setPriceType(t)} style={{ ...btnS(priceType===t?C.blue:C.border2,priceType===t?"#fff":C.muted), flex:1 }}>
              {t==="retail"?"🛍 Minorista":"🏭 Mayorista"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{ ...inp, flex:1 }} />
          <button onClick={()=>setShowScanner(true)} style={btnS(C.border2,C.text)}>📷</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8, marginBottom:16, maxHeight:"30dvh", overflowY:"auto" }}>
          {filtered.map(p=>(
            <button key={p.id} onClick={()=>addToCart(p)} disabled={p.stock<=0}
              style={{ background:C.card2, border:`1px solid ${C.border2}`, borderRadius:12, padding:10, cursor:p.stock>0?"pointer":"not-allowed", opacity:p.stock<=0?0.4:1, textAlign:"left" }}>
              <ProductAvatar product={p} size={36} />
              <p style={{ margin:"6px 0 2px", fontSize:12, fontWeight:700, color:C.text, lineHeight:1.3 }}>{p.name}</p>
              <p style={{ margin:0, color:C.green, fontWeight:800, fontSize:12 }}>{fmt(getPrice(p))}</p>
              <p style={{ margin:0, color:p.stock<=p.minStock?C.red:C.muted, fontSize:11 }}>Stock: {p.stock}</p>
            </button>
          ))}
        </div>
        {cart.length>0 && <>
          <div style={{ background:C.card2, borderRadius:14, padding:14, marginBottom:14, border:`1px solid ${C.border2}` }}>
            <p style={{ color:C.muted, fontSize:11, fontWeight:700, margin:"0 0 10px", textTransform:"uppercase" }}>Carrito</p>
            {cart.map(item=>(
              <div key={item.product.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <ProductAvatar product={item.product} size={28} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.product.name}</p>
                  <p style={{ margin:0, color:C.muted, fontSize:11 }}>{fmt(getPrice(item.product))} c/u</p>
                </div>
                <button onClick={()=>setCart(c=>c.map(i=>i.product.id===item.product.id?{...i,qty:Math.max(1,i.qty-1)}:i))} style={btnS(C.border2,C.text,{padding:"3px 8px",fontSize:13})}>−</button>
                <span style={{ fontWeight:700, minWidth:18, textAlign:"center" }}>{item.qty}</span>
                <button onClick={()=>setCart(c=>c.map(i=>i.product.id===item.product.id?{...i,qty:i.qty+1}:i))} style={btnS(C.border2,C.text,{padding:"3px 8px",fontSize:13})}>+</button>
                <button onClick={()=>setCart(c=>c.filter(i=>i.product.id!==item.product.id))} style={btnS(C.border2,C.red,{padding:"3px 8px",fontSize:13})}>🗑</button>
                <span style={{ fontWeight:700, color:C.green, minWidth:64, textAlign:"right", fontSize:13 }}>{fmt(getPrice(item.product)*item.qty)}</span>
              </div>
            ))}
            <div style={{ borderTop:`1px solid ${C.border2}`, paddingTop:10, display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:C.muted, fontWeight:700 }}>TOTAL</span>
              <span style={{ color:C.green, fontWeight:900, fontSize:22 }}>{fmt(total)}</span>
            </div>
          </div>
          <button onClick={()=>setStep("pay")} style={{ ...btnS(`linear-gradient(135deg,${C.green},#00c853)`,"#000"), width:"100%", padding:14, fontSize:16 }}>Cobrar {fmt(total)} →</button>
        </>}
      </>}
      {step==="pay" && <>
        <div style={{ background:C.card2, borderRadius:14, padding:20, marginBottom:16, textAlign:"center", border:`1px solid ${C.border2}` }}>
          <p style={{ color:C.muted, margin:"0 0 4px", fontSize:13 }}>Total a cobrar</p>
          <p style={{ color:C.green, fontWeight:900, fontSize:36, margin:0 }}>{fmt(total)}</p>
        </div>
        <Field label="Método de pago">
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {PAY_METHODS.map(m=>(
              <button key={m.id} onClick={()=>setPayMethod(m.id)}
                style={{ ...btnS(payMethod===m.id?`${m.color}33`:C.border2,payMethod===m.id?m.color:C.muted), flex:1, minWidth:80, border:`1px solid ${payMethod===m.id?m.color:C.border2}` }}>
                {m.label}
              </button>
            ))}
          </div>
        </Field>
        {payMethod==="efectivo" && <>
          <Field label="💵 Efectivo recibido">
            <input style={{ ...inp, fontSize:20, fontWeight:700, textAlign:"center" }} type="number" value={cashReceived} onChange={e=>setCashReceived(e.target.value)} placeholder="0" />
          </Field>
          <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
            {[500,1000,2000,5000,10000].map(v=>(
              <button key={v} onClick={()=>setCashReceived(String(v))} style={btnS(C.border2,C.text,{flex:1,minWidth:50,padding:"8px 4px",fontSize:13})}>{fmt(v)}</button>
            ))}
            <button onClick={()=>setCashReceived(String(Math.ceil(total/100)*100))} style={btnS(C.blue,"#fff",{flex:1,minWidth:50,padding:"8px 4px",fontSize:13})}>Exacto</button>
          </div>
          {cashReceived && Number(cashReceived)>=total && (
            <div style={{ background:`${C.green}22`, border:`1px solid ${C.green}44`, borderRadius:12, padding:14, marginBottom:14, textAlign:"center" }}>
              <p style={{ color:C.muted, margin:"0 0 4px", fontSize:13 }}>Vuelto</p>
              <p style={{ color:C.green, fontWeight:900, fontSize:32, margin:0 }}>{fmt(change)}</p>
            </div>
          )}
          {cashReceived && Number(cashReceived)<total && (
            <div style={{ background:`${C.red}22`, border:`1px solid ${C.red}44`, borderRadius:12, padding:12, marginBottom:14, textAlign:"center" }}>
              <p style={{ color:C.red, fontWeight:700, margin:0 }}>Falta: {fmt(total-Number(cashReceived))}</p>
            </div>
          )}
        </>}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setStep("cart")} style={{ ...btnS(C.border2,C.muted), flex:1, padding:14 }}>← Volver</button>
          <button onClick={confirmSale} disabled={saving||(payMethod==="efectivo"&&cashReceived&&Number(cashReceived)<total)}
            style={{ ...btnS(`linear-gradient(135deg,${C.green},#00c853)`,"#000"), flex:2, padding:14, fontSize:15, opacity:(saving||(payMethod==="efectivo"&&cashReceived&&Number(cashReceived)<total))?0.5:1 }}>
            {saving?"Guardando...":"✅ Confirmar venta"}
          </button>
        </div>
      </>}
    </Modal>
  );
}

// ─── MOVEMENT FORM ────────────────────────────────────────────────────────────
function MovementForm({ type, products, preselected, editData, onSave, onClose, saving }) {
  const [productId, setProductId] = useState(editData?.productId||preselected?.id||products[0]?.id||"");
  const [qty, setQty] = useState(editData?.qty?.toString()||"1");
  const [note, setNote] = useState(editData?.note||"");
  const [date, setDate] = useState(editData?.date||todayStr());
  const [priceType, setPriceType] = useState("retail");
  const [payMethod, setPayMethod] = useState(editData?.payMethod||"efectivo");
  const isSale = type==="sale";
  const product = products.find(p=>p.id===productId);
  const unitPrice = isSale?(priceType==="wholesale"?product?.priceWholesale:product?.price):product?.cost;
  const total = product?Number(qty)*(unitPrice||0):0;
  const isEdit = !!editData;
  return (
    <Modal title={isEdit?"✏️ Editar movimiento":isSale?"📤 Nueva venta":"📥 Nueva compra"} onClose={onClose}>
      <Field label="Producto">
        <select style={inp} value={productId} onChange={e=>setProductId(e.target.value)}>
          {products.map(p=><option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
        </select>
      </Field>
      {isSale && <Field label="Tipo de precio">
        <div style={{ display:"flex", gap:8 }}>
          {["retail","wholesale"].map(t=>(
            <button key={t} onClick={()=>setPriceType(t)} style={{ ...btnS(priceType===t?C.blue:C.border2,priceType===t?"#fff":C.muted), flex:1 }}>
              {t==="retail"?"🛍 Minorista":"🏭 Mayorista"}
            </button>
          ))}
        </div>
      </Field>}
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Cantidad"><input style={inp} type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} /></Field></div>
        <div style={{ flex:1 }}><Field label="Fecha"><input style={inp} type="date" value={date} onChange={e=>setDate(e.target.value)} /></Field></div>
      </div>
      <Field label="Método de pago">
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {PAY_METHODS.map(m=>(
            <button key={m.id} onClick={()=>setPayMethod(m.id)}
              style={{ ...btnS(payMethod===m.id?`${m.color}33`:C.border2,payMethod===m.id?m.color:C.muted), flex:1, minWidth:80, border:`1px solid ${payMethod===m.id?m.color:C.border2}` }}>
              {m.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Nota"><input style={inp} value={note} onChange={e=>setNote(e.target.value)} placeholder="Referencia, cliente..." /></Field>
      {product && <div style={{ background:C.card2, borderRadius:12, padding:14, marginBottom:16, border:`1px solid ${C.border2}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <span style={{ color:C.muted, fontSize:13 }}>Precio unitario</span>
          <span style={{ fontWeight:700 }}>{fmt(unitPrice)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:C.muted, fontSize:13 }}>Total</span>
          <span style={{ fontWeight:900, fontSize:22, color:isSale?C.green:C.blue }}>{fmt(total)}</span>
        </div>
        {isSale&&!isEdit&&product.stock<Number(qty)&&<p style={{ color:C.red, fontSize:12, margin:"8px 0 0" }}>⚠ Stock insuficiente ({product.stock} disponibles)</p>}
      </div>}
      <button onClick={()=>onSave({productId,qty:Number(qty),note,date,type,unitPrice:unitPrice||0,total,payMethod})}
        disabled={saving||(isSale&&!isEdit&&product&&product.stock<Number(qty))}
        style={{ ...btnS(isSale?`linear-gradient(135deg,${C.green},#00c853)`:`linear-gradient(135deg,${C.blue},#1565c0)`,isSale?"#000":"#fff"), width:"100%", padding:14, fontSize:15, opacity:(saving||(isSale&&!isEdit&&product&&product.stock<Number(qty)))?0.5:1 }}>
        {saving?"Guardando...":isEdit?"Guardar cambios →":isSale?"Confirmar venta →":"Confirmar compra →"}
      </button>
    </Modal>
  );
}

// ─── CASH CLOSE ───────────────────────────────────────────────────────────────
function CashClose({ movements, products, onClose }) {
  const [selDate, setSelDate] = useState(todayStr());
  const dayMovs = movements.filter(m=>m.date===selDate);
  const sales = dayMovs.filter(m=>m.type==="sale");
  const purchases = dayMovs.filter(m=>m.type==="purchase");
  const totalSales = sales.reduce((s,m)=>s+m.total,0);
  const totalPurchases = purchases.reduce((s,m)=>s+m.total,0);
  const totalCost = sales.reduce((s,m)=>{ const p=products.find(pr=>pr.id===m.productId); return s+(p?.cost||0)*m.qty; },0);
  const profit = totalSales-totalCost;
  const byMethod = PAY_METHODS.map(m=>({ ...m, total:sales.filter(s=>s.payMethod===m.id).reduce((s,mv)=>s+mv.total,0) }));
  return (
    <Modal title="💰 Cierre de caja" onClose={onClose} wide>
      <Field label="Fecha"><input style={inp} type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} /></Field>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
        {[{label:"Ventas",value:fmt(totalSales),color:C.green},{label:"Compras",value:fmt(totalPurchases),color:C.blue},{label:"Costo",value:fmt(totalCost),color:C.yellow},{label:"Ganancia",value:fmt(profit),color:profit>=0?C.green:C.red}].map(s=>(
          <div key={s.label} style={{ flex:1, minWidth:110, background:C.card2, borderRadius:12, padding:14, border:`1px solid ${C.border2}` }}>
            <p style={{ color:C.muted, fontSize:11, margin:"0 0 4px" }}>{s.label}</p>
            <p style={{ color:s.color, fontWeight:800, fontSize:18, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {byMethod.map(m=>(
          <div key={m.id} style={{ flex:1, minWidth:90, background:`${m.color}11`, border:`1px solid ${m.color}33`, borderRadius:10, padding:12, textAlign:"center" }}>
            <p style={{ color:C.muted, fontSize:11, margin:"0 0 4px" }}>{m.label}</p>
            <p style={{ color:m.color, fontWeight:800, fontSize:15, margin:0 }}>{fmt(m.total)}</p>
          </div>
        ))}
      </div>
      {dayMovs.length===0 ? <p style={{ color:C.muted, textAlign:"center", padding:24 }}>Sin movimientos</p>
        : dayMovs.map(m=>{ const p=products.find(pr=>pr.id===m.productId); const pm=PAY_METHODS.find(pm=>pm.id===m.payMethod); return (
          <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:18 }}>{m.type==="sale"?"📤":"📥"}</span>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:600 }}>{p?.name}</p>
              <p style={{ margin:0, color:C.muted, fontSize:11 }}>{m.note} · {m.qty} uds · {pm?.label}</p>
            </div>
            <span style={{ fontWeight:700, color:m.type==="sale"?C.green:C.blue }}>{fmt(m.total)}</span>
          </div>
        );})}
    </Modal>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@controlpro.com");
  const [pass, setPass] = useState("admin2024");
  const [err, setErr] = useState("");
  const go = () => { const u=USERS.find(u=>u.email===email&&u.password===pass); u?onLogin(u):setErr("Credenciales incorrectas"); };
  return (
    <div style={{ minHeight:"100dvh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:20, boxSizing:"border-box" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><ControlProLogo size={72} /></div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0 }}>
            <span style={{ color:"#4a9eff", fontWeight:900, fontSize:32, letterSpacing:-1 }}>Control</span>
            <span style={{ color:C.green, fontWeight:900, fontSize:32, letterSpacing:-1 }}>Pro</span>
          </div>
          <p style={{ color:C.muted, marginTop:8, fontSize:14 }}>Gestión profesional de inventario</p>
        </div>
        <div style={{ background:C.card, borderRadius:20, padding:28, border:`1px solid ${C.border2}` }}>
          <Field label="Correo"><input style={inp} value={email} onChange={e=>setEmail(e.target.value)} type="email" /></Field>
          <Field label="Contraseña"><input style={inp} value={pass} onChange={e=>setPass(e.target.value)} type="password" onKeyDown={e=>e.key==="Enter"&&go()} /></Field>
          {err && <p style={{ color:C.red, fontSize:13, margin:"0 0 12px" }}>{err}</p>}
          <button onClick={go} style={{ ...btnS(`linear-gradient(135deg,${C.green},#00c853)`,"#000"), width:"100%", padding:14, fontSize:16 }}>Ingresar →</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState(["General"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Todas");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showMovForm, setShowMovForm] = useState(null);
  const [editMovement, setEditMovement] = useState(null);
  const [preselProduct, setPreselProduct] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showCashClose, setShowCashClose] = useState(false);
  const [showQuickCash, setShowQuickCash] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const isAdmin = user?.role==="admin";

  // ── Cargar todo desde Firebase al iniciar
  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [prods, movs, cats] = await Promise.all([
        fbGetAll(COL.products),
        fbGetAll(COL.movements),
        fbGetAll(COL.categories),
      ]);
      setProducts(prods);
      setMovements(movs.sort((a,b)=>b.date?.localeCompare(a.date)));
      if (cats.length > 0 && cats[0].items) {
        setCategories(cats[0].items);
      }
      console.log("✅ ControlPro cargado:", prods.length, "productos,", movs.length, "movimientos");
    } catch (e) {
      console.error("Error cargando datos:", e);
    }
    setLoading(false);
  };

  // ── Stats
  const todaySales = movements.filter(m=>m.type==="sale"&&m.date===todayStr()).reduce((s,m)=>s+m.total,0);
  const totalSales = movements.filter(m=>m.type==="sale").reduce((s,m)=>s+m.total,0);
  const totalCost = movements.filter(m=>m.type==="sale").reduce((s,m)=>{ const p=products.find(pr=>pr.id===m.productId); return s+(p?.cost||0)*m.qty; },0);
  const totalProfit = totalSales-totalCost;
  const lowStock = products.filter(p=>p.stock<=p.minStock);
  const inventoryValue = products.reduce((s,p)=>s+p.stock*p.cost,0);
  const rentData = products.map(p=>{
    const sold=movements.filter(m=>m.productId===p.id&&m.type==="sale").reduce((s,m)=>s+m.qty,0);
    const revenue=movements.filter(m=>m.productId===p.id&&m.type==="sale").reduce((s,m)=>s+m.total,0);
    const profit=revenue-sold*p.cost;
    const margin=revenue?((profit/revenue)*100).toFixed(1):0;
    const rotation=sold>5?"Alta":sold>0?"Media":"Baja";
    return {...p,sold,revenue,profit,margin,rotation};
  }).sort((a,b)=>b.profit-a.profit);

  // ── Guardar producto en Firebase
  const saveProduct = async (data) => {
    setSaving(true);
    const parsed = {
      ...data,
      price:Number(data.price), priceWholesale:Number(data.priceWholesale),
      cost:Number(data.cost), stock:Number(data.stock), minStock:Number(data.minStock),
      image: data.image || null,
      updatedAt: new Date().toISOString(),
    };
    if (editProduct) {
      await fbUpdate(COL.products, editProduct.id, parsed);
      setProducts(ps=>ps.map(p=>p.id===editProduct.id?{...p,...parsed}:p));
    } else {
      parsed.createdAt = new Date().toISOString();
      const newId = await fbAdd(COL.products, parsed);
      if (newId) setProducts(ps=>[...ps,{...parsed,id:newId}]);
    }
    setSaving(false);
    setShowProductForm(false); setEditProduct(null);
  };

  // ── Guardar movimiento en Firebase
  const saveMovement = async (data) => {
    setSaving(true);
    const movData = { ...data, createdAt: new Date().toISOString() };

    if (editMovement) {
      // Revertir stock viejo
      const old = movements.find(m=>m.id===editMovement.id);
      const stockRevert = old.type==="sale" ? old.qty : -old.qty;
      await fbUpdate(COL.products, old.productId, { stock: (products.find(p=>p.id===old.productId)?.stock||0) + stockRevert });
      setProducts(ps=>ps.map(p=>p.id===old.productId?{...p,stock:p.stock+stockRevert}:p));
      // Aplicar nuevo
      await fbUpdate(COL.movements, editMovement.id, movData);
      setMovements(ms=>ms.map(m=>m.id===editMovement.id?{...m,...movData}:m));
      setEditMovement(null);
    } else {
      const newId = await fbAdd(COL.movements, movData);
      if (newId) setMovements(ms=>[{...movData,id:newId},...ms]);
    }

    // Actualizar stock en Firebase
    const product = products.find(p=>p.id===data.productId);
    if (product) {
      const newStock = data.type==="sale" ? product.stock - data.qty : product.stock + data.qty;
      await fbUpdate(COL.products, data.productId, { stock: newStock });
      setProducts(ps=>ps.map(p=>p.id===data.productId?{...p,stock:newStock}:p));
    }

    setSaving(false);
    setShowMovForm(null); setPreselProduct(null);
  };

  // ── Eliminar movimiento
  const deleteMovement = async (mov) => {
    if (!window.confirm("¿Eliminar este movimiento?")) return;
    setSaving(true);
    await fbDelete(COL.movements, mov.id);
    setMovements(ms=>ms.filter(m=>m.id!==mov.id));
    // Revertir stock
    const product = products.find(p=>p.id===mov.productId);
    if (product) {
      const newStock = mov.type==="sale" ? product.stock + mov.qty : product.stock - mov.qty;
      await fbUpdate(COL.products, mov.productId, { stock: newStock });
      setProducts(ps=>ps.map(p=>p.id===mov.productId?{...p,stock:newStock}:p));
    }
    setSaving(false);
  };

  // ── Eliminar producto
  const deleteProduct = async (id) => {
    if (!window.confirm("¿Eliminar este producto?")) return;
    await fbDelete(COL.products, id);
    setProducts(ps=>ps.filter(p=>p.id!==id));
  };

  const handleBarcode = (code) => {
    const found=products.find(p=>p.barcode===code);
    if (found) { setSearch(code); setTab("products"); } else alert(`Código ${code} no registrado.`);
  };

  const filtMovements = movements.filter(m=>{
    if (filterFrom&&m.date<filterFrom) return false;
    if (filterTo&&m.date>filterTo) return false;
    return true;
  });

  if (!user) return <Login onLogin={setUser} />;

  const navItems = [
    {id:"dashboard",icon:"◈",label:"Panel"},
    {id:"products",icon:"⊞",label:"Productos"},
    {id:"movements",icon:"⇅",label:"Movimientos"},
    {id:"rentability",icon:"◉",label:"Rent."},
  ];

  return (
    <div style={{ minHeight:"100dvh", background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.text, display:"flex", flexDirection:"column", maxWidth:"100vw", overflowX:"hidden" }}>

      {/* TOP BAR */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:50, boxSizing:"border-box" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <ControlProLogo size={30} />
          <div style={{ display:"flex", gap:0 }}>
            <span style={{ color:"#4a9eff", fontWeight:900, fontSize:16, letterSpacing:-0.5 }}>Control</span>
            <span style={{ color:C.green, fontWeight:900, fontSize:16, letterSpacing:-0.5 }}>Pro</span>
          </div>
          {lowStock.length>0 && <span style={{ background:`${C.red}22`, color:C.red, borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:700 }}>⚠{lowStock.length}</span>}
          {saving && <span style={{ background:`${C.yellow}22`, color:C.yellow, borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:700 }}>💾 Guardando...</span>}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <button onClick={()=>setShowScanner(true)} style={btnS(C.border2,C.text,{padding:"7px 10px",fontSize:15})}>📷</button>
          {isAdmin && <button onClick={()=>setShowCashClose(true)} style={btnS(C.border2,C.text,{padding:"7px 10px",fontSize:13})}>💰</button>}
          <span style={{ background:C.border2, borderRadius:10, padding:"5px 10px", fontSize:12 }}>{user.name}</span>
          <button onClick={()=>setUser(null)} style={btnS(C.border2,C.muted,{padding:"5px 8px",fontSize:11})}>Salir</button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, padding:"16px 16px 90px", width:"100%", maxWidth:960, margin:"0 auto", boxSizing:"border-box" }}>

        {loading ? <Loader text="Cargando datos desde la nube..." /> : <>

        {/* DASHBOARD */}
        {tab==="dashboard" && <div>
          <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 16px", letterSpacing:-0.5 }}>Panel de control</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:16 }}>
            {[{label:"Ventas hoy",value:fmt(todaySales),color:C.green},{label:"Total ventas",value:fmt(totalSales),color:C.blue},{label:"Ganancia",value:fmt(totalProfit),color:C.purple},{label:"Inventario",value:fmt(inventoryValue),color:C.cyan}].map(s=>(
              <div key={s.label} style={{ background:C.card, borderRadius:14, padding:14, border:`1px solid ${C.border2}` }}>
                <p style={{ color:C.muted, fontSize:11, margin:"0 0 4px" }}>{s.label}</p>
                <p style={{ color:s.color, fontWeight:800, fontSize:18, margin:0, wordBreak:"break-all" }}>{s.value}</p>
              </div>
            ))}
          </div>
          {lowStock.length>0 && <div style={{ background:`${C.red}11`, border:`1px solid ${C.red}33`, borderRadius:14, padding:14, marginBottom:16 }}>
            <p style={{ color:C.red, fontWeight:700, margin:"0 0 8px", fontSize:13 }}>⚠ Bajo stock</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {lowStock.map(p=>(
                <div key={p.id} style={{ background:`${C.red}22`, borderRadius:8, padding:"5px 10px", display:"flex", alignItems:"center", gap:6 }}>
                  <ProductAvatar product={p} size={20} />
                  <span style={{ fontSize:12, fontWeight:600 }}>{p.name}</span>
                  <Badge color={C.red}>{p.stock}/{p.minStock}</Badge>
                </div>
              ))}
            </div>
          </div>}
          {products.length===0 && <div style={{ background:C.card, borderRadius:16, padding:24, textAlign:"center", border:`1px solid ${C.border2}`, marginBottom:16 }}>
            <p style={{ fontSize:32, margin:"0 0 8px" }}>📦</p>
            <p style={{ color:C.muted, fontSize:14, margin:"0 0 16px" }}>No hay productos todavía.<br/>Empezá agregando tu primer producto.</p>
            {isAdmin && <button onClick={()=>{ setTab("products"); setShowProductForm(true); }} style={btnS(C.green,"#000")}>+ Agregar primer producto</button>}
          </div>}
          {products.length>0 && <div style={{ background:C.card, borderRadius:16, padding:16, border:`1px solid ${C.border2}`, marginBottom:16 }}>
            <p style={{ fontWeight:700, margin:"0 0 14px", fontSize:14 }}>🏆 Top productos</p>
            {rentData.slice(0,5).map((p,i)=>(
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:i<4?`1px solid ${C.border}`:"none" }}>
                <span style={{ color:C.muted, width:16, fontSize:12 }}>#{i+1}</span>
                <ProductAvatar product={p} size={32} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                  <p style={{ margin:0, color:C.muted, fontSize:11 }}>{p.sold} vend. · {p.margin}%</p>
                </div>
                <span style={{ color:C.green, fontWeight:700, fontSize:13 }}>{fmt(p.profit)}</span>
              </div>
            ))}
          </div>}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setShowMovForm("sale")} style={{ ...btnS(`linear-gradient(135deg,${C.green},#00c853)`,"#000"), flex:1, padding:13, fontSize:14 }}>+ Venta</button>
            {isAdmin && <button onClick={()=>setShowMovForm("purchase")} style={{ ...btnS(`linear-gradient(135deg,${C.blue},#1565c0)`), flex:1, padding:13, fontSize:14 }}>+ Compra</button>}
          </div>
        </div>}

        {/* PRODUCTS */}
        {tab==="products" && <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <h2 style={{ fontSize:20, fontWeight:900, margin:0 }}>Productos</h2>
            <div style={{ display:"flex", gap:6 }}>
              {isAdmin && <button onClick={()=>setShowCatManager(true)} style={btnS(C.border2,C.muted,{padding:"8px 10px",fontSize:12})}>🗂</button>}
              {isAdmin && <button onClick={()=>{ setEditProduct(null); setShowProductForm(true); }} style={btnS(C.green,"#000",{padding:"8px 12px"})}>+ Nuevo</button>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{ ...inp, flex:1 }} />
            <button onClick={()=>setShowScanner(true)} style={btnS(C.border2,C.text,{padding:"10px 12px"})}>📷</button>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
            {["Todas",...categories].map(c=>(
              <button key={c} onClick={()=>setFilterCat(c)}
                style={{ background:filterCat===c?C.green:C.border2, border:"none", color:filterCat===c?"#000":C.muted, borderRadius:20, padding:"5px 14px", fontSize:12, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                {c}
              </button>
            ))}
          </div>
          {products.length===0 && <div style={{ background:C.card, borderRadius:16, padding:24, textAlign:"center", border:`1px solid ${C.border2}` }}>
            <p style={{ fontSize:32, margin:"0 0 8px" }}>📦</p>
            <p style={{ color:C.muted, fontSize:14, margin:"0 0 16px" }}>No hay productos todavía.</p>
            {isAdmin && <button onClick={()=>setShowProductForm(true)} style={btnS(C.green,"#000")}>+ Crear primer producto</button>}
          </div>}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {products.filter(p=>{
              const ms=p.name.toLowerCase().includes(search.toLowerCase())||p.barcode?.includes(search)||p.supplier?.toLowerCase().includes(search.toLowerCase());
              return ms&&(filterCat==="Todas"||p.category===filterCat);
            }).map(p=>{
              const isLow=p.stock<=p.minStock;
              const margin=p.price&&p.cost?(((p.price-p.cost)/p.price)*100).toFixed(0):0;
              return (
                <div key={p.id} style={{ background:C.card, borderRadius:14, padding:12, border:`1px solid ${isLow?C.red+"44":C.border2}`, display:"flex", alignItems:"center", gap:12 }}>
                  <ProductAvatar product={p} size={52} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:700, fontSize:14 }}>{p.name}</span>
                      <Badge color={C.blue}>{p.category}</Badge>
                      {isLow && <Badge color={C.red}>↓ Stock</Badge>}
                    </div>
                    <p style={{ margin:0, color:C.muted, fontSize:11 }}>🏷 {p.barcode||"Sin código"} · {p.supplier}</p>
                    <div style={{ display:"flex", gap:10, marginTop:4, flexWrap:"wrap" }}>
                      <span style={{ color:C.green, fontWeight:700, fontSize:13 }}>{fmt(p.price)}</span>
                      <span style={{ color:isLow?C.red:C.muted, fontSize:12 }}>Stock: <strong style={{ color:isLow?C.red:C.text }}>{p.stock}</strong></span>
                      <Badge color={Number(margin)>30?C.green:Number(margin)>15?C.yellow:C.red}>M:{margin}%</Badge>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5, flexShrink:0 }}>
                    <button onClick={()=>{ setShowMovForm("sale"); setPreselProduct(p); }} style={btnS(`${C.green}22`,C.green,{padding:"5px 8px",fontSize:11})}>Vender</button>
                    {isAdmin && <>
                      <button onClick={()=>{ setEditProduct(p); setShowProductForm(true); }} style={btnS(`${C.blue}22`,C.blue,{padding:"5px 8px",fontSize:11})}>Editar</button>
                      <button onClick={()=>deleteProduct(p.id)} style={btnS(`${C.red}22`,C.red,{padding:"5px 8px",fontSize:11})}>Eliminar</button>
                    </>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* MOVEMENTS */}
        {tab==="movements" && <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
            <h2 style={{ fontSize:20, fontWeight:900, margin:0 }}>Movimientos</h2>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>setShowMovForm("sale")} style={btnS(C.green,"#000",{padding:"8px 12px",fontSize:13})}>+ Venta</button>
              {isAdmin && <button onClick={()=>setShowMovForm("purchase")} style={btnS(C.blue,"#fff",{padding:"8px 12px",fontSize:13})}>+ Compra</button>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:140 }}>
              <span style={{ color:C.muted, fontSize:12, whiteSpace:"nowrap" }}>Desde:</span>
              <input style={{ ...inp, flex:1 }} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:140 }}>
              <span style={{ color:C.muted, fontSize:12, whiteSpace:"nowrap" }}>Hasta:</span>
              <input style={{ ...inp, flex:1 }} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} />
            </div>
            {(filterFrom||filterTo) && <button onClick={()=>{ setFilterFrom(""); setFilterTo(""); }} style={btnS(C.border2,C.muted)}>✕</button>}
          </div>
          <div style={{ background:C.card, borderRadius:12, padding:"8px 14px", marginBottom:12, border:`1px solid ${C.border2}`, display:"flex", gap:16, flexWrap:"wrap" }}>
            <span style={{ color:C.muted, fontSize:12 }}>Ventas: <strong style={{ color:C.green }}>{fmt(filtMovements.filter(m=>m.type==="sale").reduce((s,m)=>s+m.total,0))}</strong></span>
            <span style={{ color:C.muted, fontSize:12 }}>Compras: <strong style={{ color:C.blue }}>{fmt(filtMovements.filter(m=>m.type==="purchase").reduce((s,m)=>s+m.total,0))}</strong></span>
          </div>
          {movements.length===0 && <div style={{ background:C.card, borderRadius:16, padding:24, textAlign:"center", border:`1px solid ${C.border2}` }}>
            <p style={{ color:C.muted, fontSize:14 }}>No hay movimientos todavía.<br/>Registrá tu primera venta.</p>
          </div>}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filtMovements.map(m=>{ const p=products.find(pr=>pr.id===m.productId); const pm=PAY_METHODS.find(pm=>pm.id===m.payMethod); return (
              <div key={m.id} style={{ background:C.card, borderRadius:12, padding:12, border:`1px solid ${C.border2}`, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:18 }}>{m.type==="sale"?"📤":"📥"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:130 }}>{p?.name||"Producto eliminado"}</span>
                    <Badge color={m.type==="sale"?C.green:C.blue}>{m.type==="sale"?"Venta":"Compra"}</Badge>
                    {pm && <Badge color={pm.color}>{pm.label}</Badge>}
                  </div>
                  <p style={{ margin:"3px 0 0", color:C.muted, fontSize:11 }}>{fmtDate(m.date)} · {m.qty} uds · {m.note}</p>
                </div>
                <span style={{ fontWeight:800, color:m.type==="sale"?C.green:C.blue, fontSize:14, whiteSpace:"nowrap" }}>{fmt(m.total)}</span>
                {isAdmin && <div style={{ display:"flex", gap:4 }}>
                  <button onClick={()=>{ setEditMovement(m); setShowMovForm(m.type); }} style={btnS(`${C.blue}22`,C.blue,{padding:"5px 8px",fontSize:11})}>✏️</button>
                  <button onClick={()=>deleteMovement(m)} style={btnS(`${C.red}22`,C.red,{padding:"5px 8px",fontSize:11})}>🗑</button>
                </div>}
              </div>
            );})}
            {filtMovements.length===0&&movements.length>0 && <p style={{ color:C.muted, textAlign:"center", padding:40 }}>Sin movimientos en este período</p>}
          </div>
        </div>}

        {/* RENTABILITY */}
        {tab==="rentability" && <div>
          <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 16px" }}>📊 Rentabilidad</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:16 }}>
            {[{label:"Ingresos",value:fmt(totalSales),color:C.green},{label:"Costo ventas",value:fmt(totalCost),color:C.yellow},{label:"Ganancia bruta",value:fmt(totalProfit),color:C.purple},{label:"Margen prom.",value:`${totalSales?((totalProfit/totalSales)*100).toFixed(1):0}%`,color:C.cyan}].map(s=>(
              <div key={s.label} style={{ background:C.card, borderRadius:14, padding:14, border:`1px solid ${C.border2}` }}>
                <p style={{ color:C.muted, fontSize:11, margin:"0 0 4px" }}>{s.label}</p>
                <p style={{ color:s.color, fontWeight:800, fontSize:17, margin:0, wordBreak:"break-all" }}>{s.value}</p>
              </div>
            ))}
          </div>
          <div style={{ background:C.card, borderRadius:16, padding:16, border:`1px solid ${C.border2}`, marginBottom:16, overflowX:"auto" }}>
            <p style={{ fontWeight:700, margin:"0 0 14px", fontSize:14 }}>📋 Por producto</p>
            {products.length===0 ? <p style={{ color:C.muted, textAlign:"center", padding:16 }}>Sin datos todavía</p> :
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border2}` }}>
                {["Producto","Vend.","Ingresos","Ganancia","M%","Stock"].map(h=>(
                  <th key={h} style={{ color:C.muted, fontWeight:700, padding:"6px 8px", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{rentData.map(p=>(
                <tr key={p.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"8px" }}><div style={{ display:"flex", alignItems:"center", gap:6 }}><ProductAvatar product={p} size={22} /><span style={{ maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", display:"block", whiteSpace:"nowrap" }}>{p.name}</span></div></td>
                  <td style={{ padding:"8px" }}>{p.sold}</td>
                  <td style={{ padding:"8px", color:C.blue, whiteSpace:"nowrap" }}>{fmt(p.revenue)}</td>
                  <td style={{ padding:"8px", color:p.profit>=0?C.green:C.red, fontWeight:700, whiteSpace:"nowrap" }}>{fmt(p.profit)}</td>
                  <td style={{ padding:"8px" }}><Badge color={Number(p.margin)>30?C.green:Number(p.margin)>15?C.yellow:C.red}>{p.margin}%</Badge></td>
                  <td style={{ padding:"8px", color:p.stock<=p.minStock?C.red:C.text }}>{p.stock}</td>
                </tr>
              ))}</tbody>
            </table>}
          </div>
          <div style={{ background:C.card, borderRadius:16, padding:16, border:`1px solid ${C.border2}`, marginBottom:16 }}>
            <p style={{ fontWeight:700, margin:"0 0 14px", fontSize:14 }}>📦 Niveles de stock</p>
            {products.map(p=>{ const pct=Math.min(100,(p.stock/Math.max(p.stock,p.minStock*3))*100); const color=p.stock<=p.minStock?C.red:p.stock<=p.minStock*1.5?C.yellow:C.green; return (
              <div key={p.id} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:12, display:"flex", alignItems:"center", gap:6 }}><ProductAvatar product={p} size={18} />{p.name}</span>
                  <span style={{ color, fontWeight:700, fontSize:12 }}>{p.stock}</span>
                </div>
                <div style={{ background:C.border2, borderRadius:6, height:7, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:6, transition:"width 0.6s" }} />
                </div>
              </div>
            );})}
          </div>
          <div style={{ background:C.card, borderRadius:16, padding:16, border:`1px solid ${C.border2}` }}>
            <p style={{ fontWeight:700, margin:"0 0 14px", fontSize:14 }}>💡 Sugerencias</p>
            {rentData.filter(p=>p.rotation==="Baja"&&p.stock>p.minStock*2).map(p=>(
              <div key={`slow-${p.id}`} style={{ background:`${C.yellow}11`, border:`1px solid ${C.yellow}33`, borderRadius:10, padding:12, marginBottom:8, display:"flex", gap:10 }}>
                <ProductAvatar product={p} size={28} />
                <div><p style={{ margin:0, fontWeight:600, fontSize:12 }}>{p.name} — stock parado</p><p style={{ margin:"3px 0 0", color:C.muted, fontSize:11 }}>Tiene {p.stock} uds, vendió solo {p.sold}. Considerá una promoción.</p></div>
              </div>
            ))}
            {lowStock.map(p=>(
              <div key={`low-${p.id}`} style={{ background:`${C.red}11`, border:`1px solid ${C.red}33`, borderRadius:10, padding:12, marginBottom:8, display:"flex", gap:10 }}>
                <ProductAvatar product={p} size={28} />
                <div><p style={{ margin:0, fontWeight:600, fontSize:12 }}>{p.name} — reponer urgente</p><p style={{ margin:"3px 0 0", color:C.muted, fontSize:11 }}>Solo {p.stock} uds (mín: {p.minStock}). Contactar a {p.supplier}.</p></div>
              </div>
            ))}
            {rentData.filter(p=>Number(p.margin)<15&&p.sold>0).map(p=>(
              <div key={`margin-${p.id}`} style={{ background:`${C.purple}11`, border:`1px solid ${C.purple}33`, borderRadius:10, padding:12, marginBottom:8, display:"flex", gap:10 }}>
                <ProductAvatar product={p} size={28} />
                <div><p style={{ margin:0, fontWeight:600, fontSize:12 }}>{p.name} — margen bajo ({p.margin}%)</p><p style={{ margin:"3px 0 0", color:C.muted, fontSize:11 }}>Revisá el precio o negociá con el proveedor.</p></div>
              </div>
            ))}
            {rentData.filter(p=>p.rotation==="Baja"&&p.stock>p.minStock*2).length===0&&lowStock.length===0&&rentData.filter(p=>Number(p.margin)<15&&p.sold>0).length===0&&(
              <p style={{ color:C.green, textAlign:"center", padding:16, fontSize:13 }}>✅ Sin sugerencias urgentes</p>
            )}
          </div>
        </div>}

        </>} {/* end loading */}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.card, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-around", alignItems:"center", padding:"6px 8px", paddingBottom:"max(10px,env(safe-area-inset-bottom))", zIndex:40, boxSizing:"border-box" }}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"4px 8px", minWidth:48 }}>
            <span style={{ fontSize:18, color:tab===n.id?C.green:C.muted }}>{n.icon}</span>
            <span style={{ fontSize:10, fontWeight:600, color:tab===n.id?C.green:C.muted }}>{n.label}</span>
          </button>
        ))}
        <button onClick={()=>setShowQuickCash(true)} style={{ background:`linear-gradient(135deg,${C.green},#00c853)`, border:"none", color:"#000", borderRadius:14, padding:"8px 14px", fontWeight:900, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:1, boxShadow:`0 0 20px ${C.green}55`, transform:"translateY(-5px)" }}>
          <span style={{ fontSize:20 }}>⚡</span>
          <span style={{ fontSize:10, fontWeight:900 }}>CAJA</span>
        </button>
      </div>

      {/* MODALS */}
      {showScanner && <BarcodeScanner onDetect={handleBarcode} onClose={()=>setShowScanner(false)} />}
      {showProductForm && <ProductForm initial={editProduct} categories={categories} onSave={saveProduct} onClose={()=>{ setShowProductForm(false); setEditProduct(null); }} saving={saving} />}
      {showMovForm && <MovementForm type={showMovForm} products={products} preselected={preselProduct} editData={editMovement} onSave={saveMovement} onClose={()=>{ setShowMovForm(null); setPreselProduct(null); setEditMovement(null); }} saving={saving} />}
      {showCashClose && <CashClose movements={movements} products={products} onClose={()=>setShowCashClose(false)} />}
      {showQuickCash && <QuickCash products={products} onSell={saveMovement} onClose={()=>setShowQuickCash(false)} />}
      {showCatManager && <CategoryManager categories={categories} onUpdate={setCategories} onClose={()=>setShowCatManager(false)} />}
    </div>
  );
}