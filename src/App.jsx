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
  { id:"efectivo", label:"💵 Efectivo", color:"#00a86b" },
  { id:"tarjeta", label:"💳 Tarjeta", color:"#5c6bc0" },
  { id:"transferencia", label:"📲 Transferencia", color:"#7c3aed" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n||0);
const fmtDate = (d) => new Date(d).toLocaleDateString("es-AR");
const todayStr = () => new Date().toISOString().split("T")[0];
const genId = (p) => `${p}${Date.now().toString(36).toUpperCase()}`;

// ─── DESIGN SYSTEM — Light / Fintech ─────────────────────────────────────────
const C = {
  // Backgrounds
  bg:       "#f0f4f0",      // fondo general verde muy suave
  card:     "#ffffff",      // cards blancas
  card2:    "#f7faf7",      // inputs y cards secundarias
  cardGreen:"#e8f5e9",      // card con tinte verde claro

  // Borders
  border:   "#e0ece0",
  border2:  "#d0e8d0",

  // Text
  text:     "#1a2e1a",      // texto principal verde muy oscuro
  text2:    "#3a5a3a",      // texto secundario
  muted:    "#7a9a7a",      // texto apagado

  // Brand
  green:    "#2e7d32",      // verde principal
  greenL:   "#43a047",      // verde medio
  greenXL:  "#a5d6a7",      // verde claro
  greenBg:  "#e8f5e9",      // fondo verde suave

  // Accents
  red:      "#c62828",
  redBg:    "#ffebee",
  yellow:   "#f57f17",
  yellowBg: "#fff8e1",
  blue:     "#1565c0",
  blueBg:   "#e3f2fd",
  purple:   "#6a1b9a",
  purpleBg: "#f3e5f5",

  // Shadows
  shadow:   "0 2px 12px rgba(46,125,50,0.08)",
  shadowMd: "0 4px 20px rgba(46,125,50,0.12)",
};

const inp = {
  width:"100%", background:C.card2, border:`1.5px solid ${C.border2}`,
  color:C.text, borderRadius:12, padding:"12px 14px", fontSize:15,
  boxSizing:"border-box", outline:"none", fontFamily:"inherit",
  transition:"border-color 0.2s",
};

const btnPrimary = (extra={}) => ({
  background:`linear-gradient(135deg,${C.green},${C.greenL})`,
  border:"none", color:"#fff", borderRadius:14, padding:"14px 20px",
  fontWeight:700, cursor:"pointer", fontSize:15, fontFamily:"inherit",
  boxShadow:`0 4px 14px ${C.greenXL}`, ...extra,
});
const btnSecondary = (extra={}) => ({
  background:C.card2, border:`1.5px solid ${C.border2}`,
  color:C.text2, borderRadius:12, padding:"10px 16px",
  fontWeight:600, cursor:"pointer", fontSize:14, fontFamily:"inherit", ...extra,
});
const btnGhost = (color, bg, extra={}) => ({
  background:bg, border:`1.5px solid ${color}33`,
  color, borderRadius:10, padding:"8px 12px",
  fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", ...extra,
});

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const COL = { products:"productos", movements:"movimientos", categories:"categorias" };
async function fbGetAll(col) {
  try { const s=await getDocs(collection(db,col)); return s.docs.map(d=>({id:d.id,...d.data()})); }
  catch(e) { console.error(e); return []; }
}
async function fbAdd(col,data) {
  try { const r=await addDoc(collection(db,col),data); return r.id; }
  catch(e) { console.error(e); return null; }
}
async function fbUpdate(col,id,data) {
  try { await updateDoc(doc(db,col,id),data); return true; }
  catch(e) { console.error(e); return false; }
}
async function fbDelete(col,id) {
  try { await deleteDoc(doc(db,col,id)); return true; }
  catch(e) { console.error(e); return false; }
}
async function fbSet(col,id,data) {
  try { await setDoc(doc(db,col,id),data); return true; }
  catch(e) { console.error(e); return false; }
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function ControlProLogo({ size=40 }) {
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
function ProductAvatar({ product, size=48 }) {
  const palettes = [
    ["#e8f5e9","#2e7d32"], ["#e3f2fd","#1565c0"], ["#f3e5f5","#6a1b9a"],
    ["#fff8e1","#f57f17"], ["#fce4ec","#880e4f"], ["#e0f7fa","#006064"],
  ];
  const [bg, fg] = palettes[(product.name||"?").charCodeAt(0)%palettes.length];
  const initials = (product.name||"?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
  if (product.image) return <img src={product.image} alt={product.name} style={{ width:size, height:size, borderRadius:12, objectFit:"cover", flexShrink:0 }} />;
  return (
    <div style={{ width:size, height:size, borderRadius:12, background:bg, border:`1.5px solid ${fg}22`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ color:fg, fontWeight:900, fontSize:size*0.33 }}>{initials}</span>
    </div>
  );
}

function Chip({ children, color, bg }) {
  return <span style={{ background:bg||`${color}15`, color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{children}</span>;
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", color:C.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</label>
      {children}
    </div>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:C.card, borderRadius:18, padding:18, border:`1px solid ${C.border}`, boxShadow:C.shadow, ...style }}>{children}</div>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(26,46,26,0.4)", backdropFilter:"blur(4px)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.card, borderRadius:"24px 24px 0 0", width:"100%", maxWidth:wide?700:520, maxHeight:"94dvh", overflow:"auto", boxShadow:C.shadowMd }}>
        {/* Handle bar */}
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:40, height:4, background:C.border2, borderRadius:4 }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 24px 0" }}>
          <span style={{ color:C.text, fontWeight:800, fontSize:18 }}>{title}</span>
          <button onClick={onClose} style={{ background:C.card2, border:"none", color:C.muted, borderRadius:10, padding:"6px 12px", cursor:"pointer", fontSize:15 }}>✕</button>
        </div>
        <div style={{ padding:"16px 24px 32px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── LOADER ───────────────────────────────────────────────────────────────────
function Loader({ text="Cargando..." }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:60, gap:16 }}>
      <div style={{ width:40, height:40, border:`3px solid ${C.border2}`, borderTop:`3px solid ${C.green}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:C.muted, fontSize:14, margin:0 }}>{text}</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, bg, icon }) {
  return (
    <div style={{ background:bg||C.card, borderRadius:16, padding:16, border:`1px solid ${color}22`, boxShadow:C.shadow, flex:1, minWidth:140 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ color:C.muted, fontSize:12, fontWeight:600 }}>{label}</span>
      </div>
      <p style={{ color, fontWeight:800, fontSize:20, margin:0 }}>{value}</p>
    </div>
  );
}

// ─── CATEGORY MANAGER ─────────────────────────────────────────────────────────
function CategoryManager({ categories, onUpdate, onClose }) {
  const [list, setList] = useState([...categories]);
  const [newCat, setNewCat] = useState("");
  const [saving, setSaving] = useState(false);
  const add = () => { const t=newCat.trim(); if(!t||list.includes(t)) return; setList(l=>[...l,t]); setNewCat(""); };
  const remove = (c) => { if(c==="General") return alert("No se puede eliminar General."); setList(l=>l.filter(x=>x!==c)); };
  const save = async () => { setSaving(true); await fbSet(COL.categories,"lista",{items:list}); onUpdate(list); setSaving(false); onClose(); };
  return (
    <Modal title="🗂 Mis categorías" onClose={onClose}>
      <p style={{ color:C.muted, fontSize:13, margin:"0 0 16px" }}>Personalizá las categorías de tu negocio.</p>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input style={inp} value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Nueva categoría..." />
        <button onClick={add} style={btnPrimary({padding:"12px 16px"})}>+ Agregar</button>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:24 }}>
        {list.map(c=>(
          <div key={c} style={{ display:"flex", alignItems:"center", gap:6, background:C.greenBg, border:`1px solid ${C.border2}`, borderRadius:20, padding:"7px 14px" }}>
            <span style={{ fontSize:13, fontWeight:600, color:C.text2 }}>{c}</span>
            {c!=="General" && <button onClick={()=>remove(c)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:14, padding:0 }}>✕</button>}
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} style={{ ...btnPrimary(), width:"100%" }}>
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
    let qStarted=false;
    navigator.mediaDevices?.getUserMedia({video:{facingMode:"environment"}})
      .then(stream=>{
        streamRef.current=stream;
        if(videoRef.current) videoRef.current.srcObject=stream;
        setStatus("Apuntá al código de barras");
        const initQ=()=>{
          if(!videoRef.current) return;
          window.Quagga.init({inputStream:{type:"LiveStream",target:videoRef.current,constraints:{facingMode:"environment"}},decoder:{readers:["ean_reader","ean_8_reader","code_128_reader","upc_reader"]},locate:true},err=>{
            if(!err){qStarted=true;window.Quagga.start();window.Quagga.onDetected(r=>{
              if(detectedRef.current) return;
              const code=r.codeResult.code;
              if(code?.length>4){detectedRef.current=true;setStatus(`✅ ${code}`);setTimeout(()=>{onDetect(code);onClose();},400);}
            });}
          });
        };
        if(!window.Quagga){const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js";s.onload=initQ;document.head.appendChild(s);}
        else initQ();
      }).catch(()=>setStatus("Cámara no disponible — usá el código manual"));
    return ()=>{streamRef.current?.getTracks().forEach(t=>t.stop());if(qStarted&&window.Quagga){try{window.Quagga.stop();}catch{}}};
  },[]);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.card, borderRadius:24, padding:24, width:"100%", maxWidth:340, boxShadow:C.shadowMd }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:16 }}>📷 Escáner de código</span>
          <button onClick={onClose} style={btnSecondary({padding:"4px 12px"})}>✕</button>
        </div>
        <div style={{ background:"#000", borderRadius:16, overflow:"hidden", position:"relative", aspectRatio:"4/3", marginBottom:14 }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <div style={{ width:"70%", height:80, border:`2.5px solid ${C.green}`, borderRadius:10, boxShadow:`0 0 0 9999px rgba(0,0,0,0.5)` }} />
          </div>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, textAlign:"center", color:"#fff", fontSize:12, background:"rgba(0,0,0,0.5)", padding:"6px 0" }}>{status}</div>
        </div>
        <p style={{ color:C.muted, fontSize:12, textAlign:"center", marginBottom:10 }}>O ingresá el código manualmente:</p>
        <div style={{ display:"flex", gap:8 }}>
          <input value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&manual.trim()&&(onDetect(manual.trim()),onClose())} placeholder="Código..." style={{ ...inp, flex:1 }} />
          <button onClick={()=>manual.trim()&&(onDetect(manual.trim()),onClose())} style={btnPrimary({padding:"12px 16px"})}>OK</button>
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
    const file=e.target.files[0]; if(!file) return;
    const r=new FileReader(); r.onload=ev=>onChange(ev.target.result); r.readAsDataURL(file);
  };
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {["upload","url"].map(t=>(
          <button key={t} type="button" onClick={()=>setTab(t)}
            style={{ ...btnSecondary(), background:tab===t?C.greenBg:C.card2, borderColor:tab===t?C.green:C.border2, color:tab===t?C.green:C.muted }}>
            {t==="upload"?"📁 Subir foto":"🌐 URL"}
          </button>
        ))}
        {value && <button type="button" onClick={()=>onChange(null)} style={btnGhost(C.red,C.redBg)}>🗑 Quitar</button>}
      </div>
      {tab==="upload" && (
        <div onClick={()=>fileRef.current.click()}
          style={{ border:`2px dashed ${C.border2}`, borderRadius:14, padding:24, textAlign:"center", cursor:"pointer", background:C.card2, transition:"border-color 0.2s" }}>
          {value ? <img src={value} alt="preview" style={{ maxHeight:120, maxWidth:"100%", borderRadius:10, objectFit:"contain" }} />
            : <><div style={{ fontSize:36, marginBottom:8 }}>📷</div><p style={{ color:C.muted, fontSize:13, margin:0 }}>Tocá para subir una foto<br/><span style={{ fontSize:11 }}>JPG, PNG, WEBP</span></p></>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
        </div>
      )}
      {tab==="url" && (
        <>
          <div style={{ display:"flex", gap:8 }}>
            <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} placeholder="https://..." style={{ ...inp, flex:1 }} />
            <button type="button" onClick={()=>urlInput&&onChange(urlInput)} style={btnPrimary({padding:"12px 16px"})}>Aplicar</button>
          </div>
          {value && <img src={value} alt="preview" style={{ marginTop:8, maxHeight:80, borderRadius:10 }} />}
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
  const mColor = Number(margin)>30?C.green:Number(margin)>15?C.yellow:C.red;
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
        <div style={{ flex:1 }}>
          <Field label="Margen">
            <div style={{ ...inp, background:`${mColor}12`, borderColor:`${mColor}44`, color:mColor, fontWeight:800, fontSize:16 }}>{margin}%</div>
          </Field>
        </div>
      </div>
      <Field label="Proveedor"><input style={inp} value={f.supplier} onChange={e=>set("supplier",e.target.value)} /></Field>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Stock inicial"><input style={inp} type="number" value={f.stock} onChange={e=>set("stock",e.target.value)} /></Field></div>
        <div style={{ flex:1 }}><Field label="Stock mínimo"><input style={inp} type="number" value={f.minStock} onChange={e=>set("minStock",e.target.value)} /></Field></div>
      </div>
      <Field label="Código de barras">
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ ...inp, flex:1 }} value={f.barcode} onChange={e=>set("barcode",e.target.value)} placeholder="Escanear o ingresar" />
          <button type="button" onClick={()=>setShowScanner(true)} style={btnSecondary({padding:"12px 14px"})}>📷</button>
        </div>
      </Field>
      <button onClick={()=>onSave(f)} disabled={saving||!f.name} style={{ ...btnPrimary(), width:"100%", opacity:saving||!f.name?0.6:1 }}>
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
  const addToCart = (product) => setCart(c=>{ const e=c.find(i=>i.product.id===product.id); return e?c.map(i=>i.product.id===product.id?{...i,qty:i.qty+1}:i):[...c,{product,qty:1}]; });
  const handleBarcode = (code) => { const p=products.find(pr=>pr.barcode===code); if(p) addToCart(p); else alert(`Código ${code} no encontrado`); };
  const confirmSale = async () => {
    setSaving(true);
    for(const item of cart) await onSell({productId:item.product.id,qty:item.qty,type:"sale",unitPrice:getPrice(item.product),total:getPrice(item.product)*item.qty,date:todayStr(),note:`Caja rápida · ${priceType==="wholesale"?"Mayorista":"Minorista"}`,payMethod});
    setSaving(false); onClose();
  };
  return (
    <Modal title="⚡ Caja rápida" onClose={onClose} wide>
      {showScanner && <BarcodeScanner onDetect={handleBarcode} onClose={()=>setShowScanner(false)} />}
      {step==="cart" && <>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {["retail","wholesale"].map(t=>(
            <button key={t} onClick={()=>setPriceType(t)}
              style={{ ...btnSecondary(), flex:1, background:priceType===t?C.greenBg:C.card2, borderColor:priceType===t?C.green:C.border2, color:priceType===t?C.green:C.muted }}>
              {t==="retail"?"🛍 Minorista":"🏭 Mayorista"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar producto..." style={{ ...inp, flex:1 }} />
          <button onClick={()=>setShowScanner(true)} style={btnSecondary({padding:"12px 14px"})}>📷</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8, marginBottom:16, maxHeight:"28dvh", overflowY:"auto" }}>
          {filtered.map(p=>(
            <button key={p.id} onClick={()=>addToCart(p)} disabled={p.stock<=0}
              style={{ background:C.card2, border:`1.5px solid ${C.border}`, borderRadius:14, padding:10, cursor:p.stock>0?"pointer":"not-allowed", opacity:p.stock<=0?0.5:1, textAlign:"left", boxShadow:C.shadow }}>
              <ProductAvatar product={p} size={34} />
              <p style={{ margin:"6px 0 2px", fontSize:12, fontWeight:700, color:C.text, lineHeight:1.3 }}>{p.name}</p>
              <p style={{ margin:0, color:C.green, fontWeight:800, fontSize:12 }}>{fmt(getPrice(p))}</p>
              <p style={{ margin:0, color:p.stock<=p.minStock?C.red:C.muted, fontSize:11 }}>Stock: {p.stock}</p>
            </button>
          ))}
        </div>
        {cart.length>0 && <>
          <div style={{ background:C.greenBg, borderRadius:16, padding:16, marginBottom:14, border:`1px solid ${C.border2}` }}>
            <p style={{ color:C.muted, fontSize:11, fontWeight:700, margin:"0 0 10px", textTransform:"uppercase" }}>Carrito ({cart.length})</p>
            {cart.map(item=>(
              <div key={item.product.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <ProductAvatar product={item.product} size={28} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.product.name}</p>
                  <p style={{ margin:0, color:C.muted, fontSize:11 }}>{fmt(getPrice(item.product))} c/u</p>
                </div>
                <button onClick={()=>setCart(c=>c.map(i=>i.product.id===item.product.id?{...i,qty:Math.max(1,i.qty-1)}:i))} style={btnSecondary({padding:"3px 10px",fontSize:14})}>−</button>
                <span style={{ fontWeight:700, minWidth:20, textAlign:"center", color:C.text }}>{item.qty}</span>
                <button onClick={()=>setCart(c=>c.map(i=>i.product.id===item.product.id?{...i,qty:i.qty+1}:i))} style={btnSecondary({padding:"3px 10px",fontSize:14})}>+</button>
                <button onClick={()=>setCart(c=>c.filter(i=>i.product.id!==item.product.id))} style={btnGhost(C.red,C.redBg,{padding:"3px 10px",fontSize:13})}>🗑</button>
                <span style={{ fontWeight:700, color:C.green, minWidth:64, textAlign:"right", fontSize:13 }}>{fmt(getPrice(item.product)*item.qty)}</span>
              </div>
            ))}
            <div style={{ borderTop:`1px solid ${C.border2}`, paddingTop:12, display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:C.muted, fontWeight:700, fontSize:14 }}>TOTAL</span>
              <span style={{ color:C.green, fontWeight:900, fontSize:24 }}>{fmt(total)}</span>
            </div>
          </div>
          <button onClick={()=>setStep("pay")} style={{ ...btnPrimary(), width:"100%", fontSize:16 }}>Cobrar {fmt(total)} →</button>
        </>}
      </>}
      {step==="pay" && <>
        <div style={{ background:C.greenBg, borderRadius:18, padding:24, marginBottom:18, textAlign:"center", border:`1px solid ${C.border2}` }}>
          <p style={{ color:C.muted, margin:"0 0 4px", fontSize:13 }}>Total a cobrar</p>
          <p style={{ color:C.green, fontWeight:900, fontSize:40, margin:0 }}>{fmt(total)}</p>
        </div>
        <Field label="Método de pago">
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {PAY_METHODS.map(m=>(
              <button key={m.id} onClick={()=>setPayMethod(m.id)}
                style={{ ...btnSecondary(), flex:1, minWidth:80, background:payMethod===m.id?`${m.color}12`:C.card2, borderColor:payMethod===m.id?m.color:C.border2, color:payMethod===m.id?m.color:C.muted }}>
                {m.label}
              </button>
            ))}
          </div>
        </Field>
        {payMethod==="efectivo" && <>
          <Field label="💵 Efectivo recibido">
            <input style={{ ...inp, fontSize:22, fontWeight:700, textAlign:"center" }} type="number" value={cashReceived} onChange={e=>setCashReceived(e.target.value)} placeholder="0" />
          </Field>
          <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
            {[500,1000,2000,5000,10000].map(v=>(
              <button key={v} onClick={()=>setCashReceived(String(v))} style={{ ...btnSecondary(), flex:1, minWidth:50, padding:"8px 4px", fontSize:13 }}>{fmt(v)}</button>
            ))}
            <button onClick={()=>setCashReceived(String(Math.ceil(total/100)*100))} style={{ ...btnSecondary(), flex:1, minWidth:50, padding:"8px 4px", fontSize:13, background:C.blueBg, borderColor:C.blue, color:C.blue }}>Exacto</button>
          </div>
          {cashReceived && Number(cashReceived)>=total && (
            <div style={{ background:C.greenBg, border:`1.5px solid ${C.green}44`, borderRadius:14, padding:16, marginBottom:14, textAlign:"center" }}>
              <p style={{ color:C.muted, margin:"0 0 4px", fontSize:13 }}>Vuelto</p>
              <p style={{ color:C.green, fontWeight:900, fontSize:34, margin:0 }}>{fmt(change)}</p>
            </div>
          )}
          {cashReceived && Number(cashReceived)<total && (
            <div style={{ background:C.redBg, border:`1.5px solid ${C.red}44`, borderRadius:14, padding:12, marginBottom:14, textAlign:"center" }}>
              <p style={{ color:C.red, fontWeight:700, margin:0 }}>Falta: {fmt(total-Number(cashReceived))}</p>
            </div>
          )}
        </>}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setStep("cart")} style={{ ...btnSecondary(), flex:1, padding:14 }}>← Volver</button>
          <button onClick={confirmSale} disabled={saving||(payMethod==="efectivo"&&cashReceived&&Number(cashReceived)<total)}
            style={{ ...btnPrimary(), flex:2, opacity:(saving||(payMethod==="efectivo"&&cashReceived&&Number(cashReceived)<total))?0.5:1 }}>
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
  const [customPrice, setCustomPrice] = useState(editData?.unitPrice?.toString()||"");
  const isSale=type==="sale";
  const product=products.find(p=>p.id===productId);
  const autoPrice=isSale?(priceType==="wholesale"?product?.priceWholesale:product?.price):product?.cost;
  const unitPrice=customPrice!==""?Number(customPrice):(autoPrice||0);
  const total=product?Number(qty)*unitPrice:0;
  return (
    <Modal title={isEdit?"✏️ Editar movimiento":isSale?"📤 Nueva venta":"📥 Nueva compra"} onClose={onClose}>
      <Field label="Producto">
        <ProductSearchInput products={products} value={productId} onChange={setProductId} />
      </Field>
      {isSale && <Field label="Tipo de precio">
        <div style={{ display:"flex", gap:8 }}>
          {["retail","wholesale"].map(t=>(
            <button key={t} onClick={()=>setPriceType(t)}
              style={{ ...btnSecondary(), flex:1, background:priceType===t?C.greenBg:C.card2, borderColor:priceType===t?C.green:C.border2, color:priceType===t?C.green:C.muted }}>
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
              style={{ ...btnSecondary(), flex:1, minWidth:80, background:payMethod===m.id?`${m.color}12`:C.card2, borderColor:payMethod===m.id?m.color:C.border2, color:payMethod===m.id?m.color:C.muted }}>
              {m.label}
            </button>
          ))}
        </div>
        {!isSale && <Field label="💲 Precio de compra (por unidad)">
         <input style={inp} type="number" min="0" value={customPrice}
          onChange={e=>setCustomPrice(e.target.value)}
          placeholder={`Sugerido: ${autoPrice||0}`} />
      </Field>}
      <Field label="Nota"><input style={inp} value={note} onChange={e=>setNote(e.target.value)} placeholder="Referencia, cliente..." /></Field>
      {product && <div style={{ background:C.greenBg, borderRadius:14, padding:16, marginBottom:16, border:`1px solid ${C.border2}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ color:C.muted, fontSize:13 }}>Precio unitario</span>
          <span style={{ fontWeight:700, color:C.text2 }}>{fmt(unitPrice)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:C.muted, fontSize:13 }}>Total</span>
          <span style={{ fontWeight:900, fontSize:24, color:isSale?C.green:C.blue }}>{fmt(total)}</span>
        </div>
        {isSale&&!isEdit&&product.stock<Number(qty)&&<p style={{ color:C.red, fontSize:12, margin:"8px 0 0" }}>⚠ Stock insuficiente ({product.stock} disponibles)</p>}
      </div>}
      <button onClick={()=>onSave({productId,qty:Number(qty),note,date,type,unitPrice:unitPrice||0,total,payMethod})}
        disabled={saving||(isSale&&!isEdit&&product&&product.stock<Number(qty))}
        style={{ ...btnPrimary(isSale?{}:{background:`linear-gradient(135deg,${C.blue},#1976d2)`}), width:"100%", opacity:(saving||(isSale&&!isEdit&&product&&product.stock<Number(qty)))?0.5:1 }}>
        {saving?"Guardando...":isEdit?"Guardar cambios →":isSale?"Confirmar venta →":"Confirmar compra →"}
      </button>
    </Modal>
  );
}

// ─── CASH CLOSE ───────────────────────────────────────────────────────────────
function CashClose({ movements, products, onClose }) {
  const [selDate, setSelDate] = useState(todayStr());
  const dayMovs=movements.filter(m=>m.date===selDate);
  const sales=dayMovs.filter(m=>m.type==="sale");
  const purchases=dayMovs.filter(m=>m.type==="purchase");
  const totalSales=sales.reduce((s,m)=>s+m.total,0);
  const totalPurchases=purchases.reduce((s,m)=>s+m.total,0);
  const totalCost=sales.reduce((s,m)=>{ const p=products.find(pr=>pr.id===m.productId); return s+(p?.cost||0)*m.qty; },0);
  const profit=totalSales-totalCost;
  const byMethod=PAY_METHODS.map(m=>({...m,total:sales.filter(s=>s.payMethod===m.id).reduce((s,mv)=>s+mv.total,0)}));
  return (
    <Modal title="💰 Cierre de caja" onClose={onClose} wide>
      <Field label="Fecha"><input style={inp} type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} /></Field>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
        {[{l:"Ventas",v:fmt(totalSales),c:C.green,bg:C.greenBg},{l:"Compras",v:fmt(totalPurchases),c:C.blue,bg:C.blueBg},{l:"Costo",v:fmt(totalCost),c:C.yellow,bg:C.yellowBg},{l:"Ganancia",v:fmt(profit),c:profit>=0?C.green:C.red,bg:profit>=0?C.greenBg:C.redBg}].map(s=>(
          <div key={s.l} style={{ flex:1, minWidth:110, background:s.bg, borderRadius:14, padding:14, border:`1px solid ${s.c}22` }}>
            <p style={{ color:C.muted, fontSize:11, margin:"0 0 4px" }}>{s.l}</p>
            <p style={{ color:s.c, fontWeight:800, fontSize:18, margin:0 }}>{s.v}</p>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {byMethod.map(m=>(
          <div key={m.id} style={{ flex:1, minWidth:90, background:`${m.color}10`, border:`1.5px solid ${m.color}33`, borderRadius:12, padding:12, textAlign:"center" }}>
            <p style={{ color:C.muted, fontSize:11, margin:"0 0 4px" }}>{m.label}</p>
            <p style={{ color:m.color, fontWeight:800, fontSize:15, margin:0 }}>{fmt(m.total)}</p>
          </div>
        ))}
      </div>
      {dayMovs.length===0 ? <p style={{ color:C.muted, textAlign:"center", padding:24 }}>Sin movimientos este día</p>
        : dayMovs.map(m=>{ const p=products.find(pr=>pr.id===m.productId); const pm=PAY_METHODS.find(pm=>pm.id===m.payMethod); return (
          <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ width:36, height:36, borderRadius:10, background:m.type==="sale"?C.greenBg:C.blueBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{m.type==="sale"?"📤":"📥"}</div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.text }}>{p?.name}</p>
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
    <div style={{ minHeight:"100dvh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:24, boxSizing:"border-box" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <div style={{ width:80, height:80, background:C.greenBg, borderRadius:24, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 8px 24px ${C.greenXL}` }}>
              <ControlProLogo size={52} />
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:C.blue, fontWeight:900, fontSize:34, letterSpacing:-1 }}>Control</span>
            <span style={{ color:C.green, fontWeight:900, fontSize:34, letterSpacing:-1 }}>Pro</span>
          </div>
          <p style={{ color:C.muted, marginTop:8, fontSize:14 }}>Gestión profesional de inventario</p>
        </div>
        <div style={{ background:C.card, borderRadius:24, padding:28, boxShadow:C.shadowMd, border:`1px solid ${C.border}` }}>
          <Field label="Correo electrónico"><input style={inp} value={email} onChange={e=>setEmail(e.target.value)} type="email" /></Field>
          <Field label="Contraseña"><input style={inp} value={pass} onChange={e=>setPass(e.target.value)} type="password" onKeyDown={e=>e.key==="Enter"&&go()} /></Field>
          {err && <div style={{ background:C.redBg, border:`1px solid ${C.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:16 }}><p style={{ color:C.red, fontSize:13, margin:0 }}>{err}</p></div>}
          <button onClick={go} style={{ ...btnPrimary(), width:"100%", fontSize:16 }}>Ingresar →</button>
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

  useEffect(() => { cargarTodo(); }, []);

  const cargarTodo = async () => {
    setLoading(true);
    const [prods,movs,cats] = await Promise.all([fbGetAll(COL.products),fbGetAll(COL.movements),fbGetAll(COL.categories)]);
    setProducts(prods);
    setMovements(movs.sort((a,b)=>(b.date||"").localeCompare(a.date||"")));
    if(cats.length>0&&cats[0].items) setCategories(cats[0].items);
    console.log("✅ ControlPro cargado:",prods.length,"productos");
    setLoading(false);
  };

  const todaySales=movements.filter(m=>m.type==="sale"&&m.date===todayStr()).reduce((s,m)=>s+m.total,0);
  const totalSales=movements.filter(m=>m.type==="sale").reduce((s,m)=>s+m.total,0);
  const totalCost=movements.filter(m=>m.type==="sale").reduce((s,m)=>{ const p=products.find(pr=>pr.id===m.productId); return s+(p?.cost||0)*m.qty; },0);
  const totalProfit=totalSales-totalCost;
  const lowStock=products.filter(p=>p.stock<=p.minStock);
  const inventoryValue=products.reduce((s,p)=>s+p.stock*p.cost,0);
  const rentData=products.map(p=>{
    const sold=movements.filter(m=>m.productId===p.id&&m.type==="sale").reduce((s,m)=>s+m.qty,0);
    const revenue=movements.filter(m=>m.productId===p.id&&m.type==="sale").reduce((s,m)=>s+m.total,0);
    const profit=revenue-sold*p.cost;
    const margin=revenue?((profit/revenue)*100).toFixed(1):0;
    const rotation=sold>5?"Alta":sold>0?"Media":"Baja";
    return {...p,sold,revenue,profit,margin,rotation};
  }).sort((a,b)=>b.profit-a.profit);

  const saveProduct = async (data) => {
    setSaving(true);
    const parsed={...data,price:Number(data.price),priceWholesale:Number(data.priceWholesale),cost:Number(data.cost),stock:Number(data.stock),minStock:Number(data.minStock),image:data.image||null,updatedAt:new Date().toISOString()};
    if(editProduct){ await fbUpdate(COL.products,editProduct.id,parsed); setProducts(ps=>ps.map(p=>p.id===editProduct.id?{...p,...parsed}:p)); }
    else { parsed.createdAt=new Date().toISOString(); const id=await fbAdd(COL.products,parsed); if(id) setProducts(ps=>[...ps,{...parsed,id}]); }
    setSaving(false); setShowProductForm(false); setEditProduct(null);
  };

  const saveMovement = async (data) => {
    setSaving(true);
    const movData={...data,createdAt:new Date().toISOString()};
    if(editMovement){
      const old=movements.find(m=>m.id===editMovement.id);
      const sr=old.type==="sale"?old.qty:-old.qty;
      const oldProd=products.find(p=>p.id===old.productId);
      if(oldProd){ await fbUpdate(COL.products,old.productId,{stock:oldProd.stock+sr}); setProducts(ps=>ps.map(p=>p.id===old.productId?{...p,stock:p.stock+sr}:p)); }
      await fbUpdate(COL.movements,editMovement.id,movData);
      setMovements(ms=>ms.map(m=>m.id===editMovement.id?{...m,...movData}:m));
      setEditMovement(null);
    } else {
      const id=await fbAdd(COL.movements,movData);
      if(id) setMovements(ms=>[{...movData,id},...ms]);
    }
    const product=products.find(p=>p.id===data.productId);
    if(product){ const ns=data.type==="sale"?product.stock-data.qty:product.stock+data.qty; await fbUpdate(COL.products,data.productId,{stock:ns}); setProducts(ps=>ps.map(p=>p.id===data.productId?{...p,stock:ns}:p)); }
    setSaving(false); setShowMovForm(null); setPreselProduct(null);
  };

  const deleteMovement = async (mov) => {
    if(!window.confirm("¿Eliminar este movimiento?")) return;
    setSaving(true);
    await fbDelete(COL.movements,mov.id);
    setMovements(ms=>ms.filter(m=>m.id!==mov.id));
    const product=products.find(p=>p.id===mov.productId);
    if(product){ const ns=mov.type==="sale"?product.stock+mov.qty:product.stock-mov.qty; await fbUpdate(COL.products,mov.productId,{stock:ns}); setProducts(ps=>ps.map(p=>p.id===mov.productId?{...p,stock:ns}:p)); }
    setSaving(false);
  };

  const deleteProduct = async (id) => {
    if(!window.confirm("¿Eliminar este producto?")) return;
    await fbDelete(COL.products,id); setProducts(ps=>ps.filter(p=>p.id!==id));
  };

  const handleBarcode = (code) => {
    const found=products.find(p=>p.barcode===code);
    if(found){ setSearch(code); setTab("products"); } else alert(`Código ${code} no registrado.`);
  };

  const filtMovements=movements.filter(m=>{ if(filterFrom&&m.date<filterFrom) return false; if(filterTo&&m.date>filterTo) return false; return true; });

  if(!user) return <Login onLogin={setUser} />;

  const navItems=[{id:"dashboard",icon:"◈",label:"Panel"},{id:"products",icon:"⊞",label:"Productos"},{id:"movements",icon:"⇅",label:"Movimientos"},{id:"rentability",icon:"◉",label:"Rent."}];

  return (
    <div style={{ minHeight:"100dvh", background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.text, display:"flex", flexDirection:"column", maxWidth:"100vw", overflowX:"hidden" }}>

      {/* TOP BAR */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:50, boxShadow:C.shadow, boxSizing:"border-box" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <ControlProLogo size={32} />
          <div style={{ display:"flex", gap:0 }}>
            <span style={{ color:C.blue, fontWeight:900, fontSize:17, letterSpacing:-0.5 }}>Control</span>
            <span style={{ color:C.green, fontWeight:900, fontSize:17, letterSpacing:-0.5 }}>Pro</span>
          </div>
          {lowStock.length>0 && <Chip color={C.red} bg={C.redBg}>⚠ {lowStock.length}</Chip>}
          {saving && <Chip color={C.yellow} bg={C.yellowBg}>💾 Guardando</Chip>}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={()=>setShowScanner(true)} style={btnSecondary({padding:"8px 10px",fontSize:16})}>📷</button>
          {isAdmin && <button onClick={()=>setShowCashClose(true)} style={btnSecondary({padding:"8px 10px",fontSize:14})}>💰</button>}
          <div style={{ background:C.greenBg, borderRadius:20, padding:"6px 12px", fontSize:12, fontWeight:700, color:C.green }}>
            {user.name}
          </div>
          <button onClick={()=>setUser(null)} style={btnSecondary({padding:"6px 10px",fontSize:12})}>Salir</button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, padding:"16px 16px 90px", width:"100%", maxWidth:960, margin:"0 auto", boxSizing:"border-box" }}>

        {loading ? <Loader text="Cargando datos desde la nube..." /> : <>

        {/* ── DASHBOARD */}
        {tab==="dashboard" && <div>
          {/* Greeting */}
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontSize:22, fontWeight:900, margin:"0 0 2px", color:C.text }}>Hola, {user.name} 👋</h2>
            <p style={{ color:C.muted, margin:0, fontSize:13 }}>{new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}</p>
          </div>

          {/* Stats — 2 cols */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            <StatCard label="Ventas hoy" value={fmt(todaySales)} color={C.green} bg={C.greenBg} icon="💰" />
            <StatCard label="Total ventas" value={fmt(totalSales)} color={C.blue} bg={C.blueBg} icon="📈" />
            <StatCard label="Ganancia" value={fmt(totalProfit)} color={C.purple} bg={C.purpleBg} icon="💵" />
            <StatCard label="Inventario" value={fmt(inventoryValue)} color={C.yellow} bg={C.yellowBg} icon="🏪" />
          </div>

          {/* Low stock alert */}
          {lowStock.length>0 && (
            <div style={{ background:C.redBg, border:`1.5px solid ${C.red}33`, borderRadius:16, padding:16, marginBottom:16 }}>
              <p style={{ color:C.red, fontWeight:700, margin:"0 0 10px", fontSize:13 }}>⚠ Productos con bajo stock</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {lowStock.map(p=>(
                  <div key={p.id} style={{ background:C.card, borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:C.shadow }}>
                    <ProductAvatar product={p} size={22} />
                    <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{p.name}</span>
                    <Chip color={C.red} bg={C.redBg}>{p.stock}/{p.minStock}</Chip>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {products.length===0 && (
            <Card style={{ textAlign:"center", padding:32, marginBottom:16 }}>
              <p style={{ fontSize:40, margin:"0 0 10px" }}>📦</p>
              <p style={{ color:C.muted, fontSize:14, margin:"0 0 16px" }}>Empezá agregando tu primer producto</p>
              {isAdmin && <button onClick={()=>{ setTab("products"); setShowProductForm(true); }} style={btnPrimary()}>+ Agregar primer producto</button>}
            </Card>
          )}

          {/* Top products */}
          {products.length>0 && (
            <Card style={{ marginBottom:16 }}>
              <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:15, color:C.text }}>🏆 Productos destacados</p>
              {rentData.slice(0,5).map((p,i)=>(
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<4?`1px solid ${C.border}`:"none" }}>
                  <span style={{ color:C.muted, width:18, fontSize:12, fontWeight:700 }}>#{i+1}</span>
                  <ProductAvatar product={p} size={36} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontWeight:700, fontSize:14, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                    <p style={{ margin:0, color:C.muted, fontSize:12 }}>{p.sold} vendidas · {p.margin}% margen</p>
                  </div>
                  <span style={{ color:C.green, fontWeight:800, fontSize:14 }}>{fmt(p.profit)}</span>
                </div>
              ))}
            </Card>
          )}

          {/* Quick actions */}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setShowMovForm("sale")} style={{ ...btnPrimary(), flex:1, fontSize:14 }}>+ Nueva venta</button>
            {isAdmin && <button onClick={()=>setShowMovForm("purchase")} style={{ ...btnPrimary({background:`linear-gradient(135deg,${C.blue},#1976d2)`}), flex:1, fontSize:14 }}>+ Compra</button>}
          </div>
        </div>}

        {/* ── PRODUCTS */}
        {tab==="products" && <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ fontSize:20, fontWeight:900, margin:0, color:C.text }}>Productos</h2>
            <div style={{ display:"flex", gap:8 }}>
              {isAdmin && <button onClick={()=>setShowCatManager(true)} style={btnSecondary({padding:"8px 12px",fontSize:13})}>🗂 Categorías</button>}
              {isAdmin && <button onClick={()=>{ setEditProduct(null); setShowProductForm(true); }} style={btnPrimary({padding:"9px 14px",fontSize:13})}>+ Nuevo</button>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar producto..." style={{ ...inp, flex:1 }} />
            <button onClick={()=>setShowScanner(true)} style={btnSecondary({padding:"12px 14px"})}>📷</button>
          </div>
          {/* Category pills */}
          <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
            {["Todas",...categories].map(c=>(
              <button key={c} onClick={()=>setFilterCat(c)}
                style={{ background:filterCat===c?C.green:C.card, border:`1.5px solid ${filterCat===c?C.green:C.border}`, color:filterCat===c?"#fff":C.text2, borderRadius:20, padding:"6px 16px", fontSize:12, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap", flexShrink:0, boxShadow:filterCat===c?`0 2px 8px ${C.greenXL}`:C.shadow }}>
                {c}
              </button>
            ))}
          </div>

          {products.length===0 && (
            <Card style={{ textAlign:"center", padding:28 }}>
              <p style={{ color:C.muted, fontSize:14, margin:"0 0 16px" }}>No hay productos todavía.</p>
              {isAdmin && <button onClick={()=>setShowProductForm(true)} style={btnPrimary()}>+ Crear primer producto</button>}
            </Card>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {products.filter(p=>{
              const ms=p.name.toLowerCase().includes(search.toLowerCase())||p.barcode?.includes(search)||p.supplier?.toLowerCase().includes(search.toLowerCase());
              return ms&&(filterCat==="Todas"||p.category===filterCat);
            }).map(p=>{
              const isLow=p.stock<=p.minStock;
              const margin=p.price&&p.cost?(((p.price-p.cost)/p.price)*100).toFixed(0):0;
              return (
                <div key={p.id} style={{ background:C.card, borderRadius:16, padding:14, border:`1.5px solid ${isLow?C.red+"55":C.border}`, display:"flex", alignItems:"center", gap:12, boxShadow:C.shadow }}>
                  <ProductAvatar product={p} size={54} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:800, fontSize:15, color:C.text }}>{p.name}</span>
                      <Chip color={C.blue} bg={C.blueBg}>{p.category}</Chip>
                      {isLow && <Chip color={C.red} bg={C.redBg}>↓ Stock</Chip>}
                    </div>
                    <p style={{ margin:0, color:C.muted, fontSize:12 }}>🏷 {p.barcode||"Sin código"} · {p.supplier}</p>
                    <div style={{ display:"flex", gap:12, marginTop:6, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:C.green, fontWeight:800, fontSize:15 }}>{fmt(p.price)}</span>
                      <span style={{ color:isLow?C.red:C.muted, fontSize:13 }}>Stock: <strong style={{ color:isLow?C.red:C.text2 }}>{p.stock}</strong></span>
                      <Chip color={Number(margin)>30?C.green:Number(margin)>15?C.yellow:C.red} bg={Number(margin)>30?C.greenBg:Number(margin)>15?C.yellowBg:C.redBg}>M:{margin}%</Chip>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                    <button onClick={()=>{ setShowMovForm("sale"); setPreselProduct(p); }} style={btnGhost(C.green,C.greenBg,{padding:"6px 10px",fontSize:12})}>Vender</button>
                    {isAdmin && <>
                      <button onClick={()=>{ setEditProduct(p); setShowProductForm(true); }} style={btnGhost(C.blue,C.blueBg,{padding:"6px 10px",fontSize:12})}>Editar</button>
                      <button onClick={()=>deleteProduct(p.id)} style={btnGhost(C.red,C.redBg,{padding:"6px 10px",fontSize:12})}>Eliminar</button>
                    </>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* ── MOVEMENTS */}
        {tab==="movements" && <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
            <h2 style={{ fontSize:20, fontWeight:900, margin:0, color:C.text }}>Movimientos</h2>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowMovForm("sale")} style={btnPrimary({padding:"9px 14px",fontSize:13})}>+ Venta</button>
              {isAdmin && <button onClick={()=>setShowMovForm("purchase")} style={btnPrimary({background:`linear-gradient(135deg,${C.blue},#1976d2)`,padding:"9px 14px",fontSize:13})}>+ Compra</button>}
            </div>
          </div>
          {/* Date filter */}
          <Card style={{ marginBottom:14, padding:14 }}>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:140 }}>
                <span style={{ color:C.muted, fontSize:12, whiteSpace:"nowrap" }}>Desde:</span>
                <input style={{ ...inp, flex:1, padding:"8px 12px" }} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:140 }}>
                <span style={{ color:C.muted, fontSize:12, whiteSpace:"nowrap" }}>Hasta:</span>
                <input style={{ ...inp, flex:1, padding:"8px 12px" }} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} />
              </div>
              {(filterFrom||filterTo) && <button onClick={()=>{ setFilterFrom(""); setFilterTo(""); }} style={btnSecondary({padding:"8px 12px"})}>✕ Limpiar</button>}
            </div>
            <div style={{ display:"flex", gap:16, marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
              <span style={{ color:C.muted, fontSize:12 }}>Ventas: <strong style={{ color:C.green }}>{fmt(filtMovements.filter(m=>m.type==="sale").reduce((s,m)=>s+m.total,0))}</strong></span>
              <span style={{ color:C.muted, fontSize:12 }}>Compras: <strong style={{ color:C.blue }}>{fmt(filtMovements.filter(m=>m.type==="purchase").reduce((s,m)=>s+m.total,0))}</strong></span>
            </div>
          </Card>

          {movements.length===0 && <Card style={{ textAlign:"center", padding:28 }}><p style={{ color:C.muted }}>No hay movimientos todavía.</p></Card>}

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filtMovements.map(m=>{ const p=products.find(pr=>pr.id===m.productId); const pm=PAY_METHODS.find(pm=>pm.id===m.payMethod); return (
              <div key={m.id} style={{ background:C.card, borderRadius:14, padding:14, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12, boxShadow:C.shadow }}>
                <div style={{ width:38, height:38, borderRadius:12, background:m.type==="sale"?C.greenBg:C.blueBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                  {m.type==="sale"?"📤":"📥"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontWeight:700, fontSize:14, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:130 }}>{p?.name||"Producto eliminado"}</span>
                    <Chip color={m.type==="sale"?C.green:C.blue} bg={m.type==="sale"?C.greenBg:C.blueBg}>{m.type==="sale"?"Venta":"Compra"}</Chip>
                    {pm && <Chip color={pm.color} bg={`${pm.color}12`}>{pm.label}</Chip>}
                  </div>
                  <p style={{ margin:"3px 0 0", color:C.muted, fontSize:12 }}>{fmtDate(m.date)} · {m.qty} uds · {m.note}</p>
                </div>
                <span style={{ fontWeight:800, color:m.type==="sale"?C.green:C.blue, fontSize:15, whiteSpace:"nowrap" }}>{fmt(m.total)}</span>
                {isAdmin && <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>{ setEditMovement(m); setShowMovForm(m.type); }} style={btnGhost(C.blue,C.blueBg,{padding:"5px 8px",fontSize:12})}>✏️</button>
                  <button onClick={()=>deleteMovement(m)} style={btnGhost(C.red,C.redBg,{padding:"5px 8px",fontSize:12})}>🗑</button>
                </div>}
              </div>
            );})}
            {filtMovements.length===0&&movements.length>0 && <Card style={{ textAlign:"center", padding:24 }}><p style={{ color:C.muted }}>Sin movimientos en este período</p></Card>}
          </div>
        </div>}

        {/* ── RENTABILITY */}
        {tab==="rentability" && <div>
          <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 16px", color:C.text }}>📊 Rentabilidad</h2>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            <StatCard label="Ingresos" value={fmt(totalSales)} color={C.green} bg={C.greenBg} icon="💰" />
            <StatCard label="Costo ventas" value={fmt(totalCost)} color={C.yellow} bg={C.yellowBg} icon="📦" />
            <StatCard label="Ganancia bruta" value={fmt(totalProfit)} color={C.purple} bg={C.purpleBg} icon="💵" />
            <StatCard label="Margen prom." value={`${totalSales?((totalProfit/totalSales)*100).toFixed(1):0}%`} color={C.blue} bg={C.blueBg} icon="📈" />
          </div>

          <Card style={{ marginBottom:16, overflowX:"auto" }}>
            <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:15, color:C.text }}>📋 Detalle por producto</p>
            {products.length===0 ? <p style={{ color:C.muted, textAlign:"center", padding:16 }}>Sin datos</p> :
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ borderBottom:`2px solid ${C.border}` }}>
                {["Producto","Vendido","Ingresos","Ganancia","Margen","Stock"].map(h=>(
                  <th key={h} style={{ color:C.muted, fontWeight:700, padding:"8px 8px", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{rentData.map((p,i)=>(
                <tr key={p.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===0?"transparent":C.card2 }}>
                  <td style={{ padding:"10px 8px" }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><ProductAvatar product={p} size={26} /><span style={{ color:C.text, fontWeight:600, maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", display:"block", whiteSpace:"nowrap" }}>{p.name}</span></div></td>
                  <td style={{ padding:"10px 8px", color:C.text2 }}>{p.sold}</td>
                  <td style={{ padding:"10px 8px", color:C.blue, fontWeight:600, whiteSpace:"nowrap" }}>{fmt(p.revenue)}</td>
                  <td style={{ padding:"10px 8px", color:p.profit>=0?C.green:C.red, fontWeight:700, whiteSpace:"nowrap" }}>{fmt(p.profit)}</td>
                  <td style={{ padding:"10px 8px" }}><Chip color={Number(p.margin)>30?C.green:Number(p.margin)>15?C.yellow:C.red} bg={Number(p.margin)>30?C.greenBg:Number(p.margin)>15?C.yellowBg:C.redBg}>{p.margin}%</Chip></td>
                  <td style={{ padding:"10px 8px", color:p.stock<=p.minStock?C.red:C.text2, fontWeight:p.stock<=p.minStock?700:400 }}>{p.stock}</td>
                </tr>
              ))}</tbody>
            </table>}
          </Card>

          <Card style={{ marginBottom:16 }}>
            <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:15, color:C.text }}>📦 Niveles de stock</p>
            {products.map(p=>{ const pct=Math.min(100,(p.stock/Math.max(p.stock,p.minStock*3))*100); const color=p.stock<=p.minStock?C.red:p.stock<=p.minStock*1.5?C.yellow:C.green; const bg=p.stock<=p.minStock?C.redBg:p.stock<=p.minStock*1.5?C.yellowBg:C.greenBg; return (
              <div key={p.id} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, display:"flex", alignItems:"center", gap:8, color:C.text2 }}><ProductAvatar product={p} size={18} />{p.name}</span>
                  <Chip color={color} bg={bg}>{p.stock} uds</Chip>
                </div>
                <div style={{ background:C.border, borderRadius:8, height:8, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:8, transition:"width 0.6s" }} />
                </div>
              </div>
            );})}
          </Card>

          <Card>
            <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:15, color:C.text }}>💡 Sugerencias</p>
            {rentData.filter(p=>p.rotation==="Baja"&&p.stock>p.minStock*2).map(p=>(
              <div key={`slow-${p.id}`} style={{ background:C.yellowBg, border:`1px solid ${C.yellow}44`, borderRadius:12, padding:14, marginBottom:10, display:"flex", gap:12 }}>
                <ProductAvatar product={p} size={32} />
                <div><p style={{ margin:0, fontWeight:700, fontSize:13, color:C.text }}>{p.name} — stock parado</p><p style={{ margin:"4px 0 0", color:C.muted, fontSize:12 }}>Tiene {p.stock} uds y vendió solo {p.sold}. Considerá una promoción.</p></div>
              </div>
            ))}
            {lowStock.map(p=>(
              <div key={`low-${p.id}`} style={{ background:C.redBg, border:`1px solid ${C.red}44`, borderRadius:12, padding:14, marginBottom:10, display:"flex", gap:12 }}>
                <ProductAvatar product={p} size={32} />
                <div><p style={{ margin:0, fontWeight:700, fontSize:13, color:C.text }}>{p.name} — reponer urgente</p><p style={{ margin:"4px 0 0", color:C.muted, fontSize:12 }}>Solo {p.stock} uds (mín: {p.minStock}). Contactar a {p.supplier}.</p></div>
              </div>
            ))}
            {rentData.filter(p=>Number(p.margin)<15&&p.sold>0).map(p=>(
              <div key={`margin-${p.id}`} style={{ background:C.purpleBg, border:`1px solid ${C.purple}44`, borderRadius:12, padding:14, marginBottom:10, display:"flex", gap:12 }}>
                <ProductAvatar product={p} size={32} />
                <div><p style={{ margin:0, fontWeight:700, fontSize:13, color:C.text }}>{p.name} — margen bajo ({p.margin}%)</p><p style={{ margin:"4px 0 0", color:C.muted, fontSize:12 }}>Revisá el precio o negociá con el proveedor.</p></div>
              </div>
            ))}
            {rentData.filter(p=>p.rotation==="Baja"&&p.stock>p.minStock*2).length===0&&lowStock.length===0&&rentData.filter(p=>Number(p.margin)<15&&p.sold>0).length===0&&(
              <div style={{ background:C.greenBg, borderRadius:12, padding:16, textAlign:"center" }}>
                <p style={{ color:C.green, fontWeight:700, margin:0, fontSize:14 }}>✅ Todo en orden — sin sugerencias urgentes</p>
              </div>
            )}
          </Card>
        </div>}

        </>} {/* end loading */}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.card, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-around", alignItems:"center", padding:"8px 8px", paddingBottom:"max(12px,env(safe-area-inset-bottom))", zIndex:40, boxSizing:"border-box", boxShadow:`0 -4px 20px rgba(46,125,50,0.08)` }}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"4px 10px", minWidth:50 }}>
            <span style={{ fontSize:18, color:tab===n.id?C.green:C.muted }}>{n.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, color:tab===n.id?C.green:C.muted }}>{n.label}</span>
            {tab===n.id && <div style={{ width:20, height:3, background:C.green, borderRadius:3 }} />}
          </button>
        ))}
        {/* CAJA BUTTON */}
        <button onClick={()=>setShowQuickCash(true)} style={{ ...btnPrimary(), display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"10px 16px", borderRadius:18, transform:"translateY(-6px)", boxShadow:`0 6px 20px ${C.greenXL}` }}>
          <span style={{ fontSize:22 }}>⚡</span>
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