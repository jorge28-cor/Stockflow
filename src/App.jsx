import { useState, useEffect, useRef, useCallback } from "react";
import { login, logout, onSessionChange, createUser, createNegocio, listNegocios, listUsers, updateNegocio, updateUserProfile, uploadImage } from "./firebase";
import { useFirestore, fbAdd, fbUpdate, fbDelete, fbSet } from "./hooks/useFirestore";
import { ControlProLogo, Loader, Card, Chip, Field, Modal, StatCard, ProductAvatar } from "./components/UI";
import { C, DARK, PAY_METHODS, COL, SUPERADMIN_EMAIL, SALE_STATES, EXPENSE_CATS, fmt, fmtDate, todayStr, makeStyles, btnPrimary, btnSecondary, btnGhost, inp } from "./constants";

// ─── THEME CONTEXT ────────────────────────────────────────────────────────────
import { createContext, useContext } from "react";
const ThemeCtx = createContext({ dark: false, T: C });
const useTheme = () => useContext(ThemeCtx);

// ─── BARCODE SCANNER ──────────────────────────────────────────────────────────
function BarcodeScanner({ onDetect, onClose }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [status, setStatus] = useState("Iniciando cámara...");
  const [manual, setManual] = useState("");
  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        if (!window.ZXing) {
          await new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/@zxing/library@0.19.1/umd/index.min.js";
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        const hints = new Map();
        hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, [
          window.ZXing.BarcodeFormat.EAN_13, window.ZXing.BarcodeFormat.EAN_8,
          window.ZXing.BarcodeFormat.CODE_128, window.ZXing.BarcodeFormat.UPC_A,
          window.ZXing.BarcodeFormat.QR_CODE,
        ]);
        const reader = new window.ZXing.BrowserMultiFormatReader(hints);
        readerRef.current = reader;
        setStatus("Apuntá al código de barras");
        const devices = await window.ZXing.BrowserCodeReader.listVideoInputDevices();
        const back = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[0];
        if (!videoRef.current || !active) return;
        reader.decodeFromVideoDevice(back?.deviceId, videoRef.current, (result) => {
          if (!active || !result) return;
          active = false;
          setTimeout(() => { onDetect(result.getText()); onClose(); }, 300);
        });
      } catch(e) { setStatus("Cámara no disponible — usá el código manual"); }
    };
    start();
    return () => { active = false; try { readerRef.current?.reset(); } catch{} };
  }, []);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:T.card, borderRadius:24, padding:24, width:"100%", maxWidth:340, boxShadow:T.shadowMd }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ color:T.text, fontWeight:700, fontSize:16 }}>📷 Escáner</span>
          <button onClick={onClose} style={S.btnSecondary({padding:"4px 12px"})}>✕</button>
        </div>
        <div style={{ background:"#000", borderRadius:16, overflow:"hidden", position:"relative", aspectRatio:"4/3", marginBottom:14 }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <div style={{ width:"70%", height:80, border:`2.5px solid ${T.green}`, borderRadius:10, boxShadow:"0 0 0 9999px rgba(0,0,0,0.5)" }} />
          </div>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, textAlign:"center", color:"#fff", fontSize:12, background:"rgba(0,0,0,0.5)", padding:"6px 0" }}>{status}</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={manual} onChange={e=>setManual(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&manual.trim()&&(onDetect(manual.trim()),onClose())}
            placeholder="Código manual..." style={{ ...S.inp, flex:1 }} />
          <button onClick={()=>manual.trim()&&(onDetect(manual.trim()),onClose())} style={S.btnPrimary({padding:"12px 16px"})}>OK</button>
        </div>
      </div>
    </div>
  );
}

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────
function ImageUpload({ value, onChange, businessId }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const fileRef = useRef();
  const [urlInput, setUrlInput] = useState("");
  const [tab, setTab] = useState("upload");
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (businessId) {
      setUploading(true);
      const url = await uploadImage(businessId, file);
      if (url) onChange(url);
      setUploading(false);
    } else {
      const r = new FileReader(); r.onload = ev => onChange(ev.target.result); r.readAsDataURL(file);
    }
  };
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {["upload","url"].map(t=>(
          <button key={t} type="button" onClick={()=>setTab(t)}
            style={{ ...S.btnSecondary(), background:tab===t?T.greenBg:T.card, borderColor:tab===t?T.green:T.border2, color:tab===t?T.green:T.muted }}>
            {t==="upload"?"📁 Subir":"🌐 URL"}
          </button>
        ))}
        {value && <button type="button" onClick={()=>onChange(null)} style={S.btnGhost(T.red,T.redBg)}>🗑</button>}
      </div>
      {tab==="upload" && (
        <div onClick={()=>!uploading&&fileRef.current.click()}
          style={{ border:`2px dashed ${T.border2}`, borderRadius:14, padding:24, textAlign:"center", cursor:uploading?"wait":"pointer", background:T.card }}>
          {uploading
            ? <><div style={{ fontSize:28, marginBottom:8 }}>⏳</div><p style={{ color:T.muted, fontSize:13, margin:0 }}>Subiendo imagen...</p></>
            : value
              ? <img src={value} alt="preview" style={{ maxHeight:120, maxWidth:"100%", borderRadius:10, objectFit:"contain" }} />
              : <><div style={{ fontSize:36, marginBottom:8 }}>📷</div><p style={{ color:T.muted, fontSize:13, margin:0 }}>Tocá para subir una foto</p></>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
        </div>
      )}
      {tab==="url" && (
        <>
          <div style={{ display:"flex", gap:8 }}>
            <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} placeholder="https://..." style={{ ...S.inp, flex:1 }} />
            <button type="button" onClick={()=>urlInput&&onChange(urlInput)} style={S.btnPrimary({padding:"12px 16px"})}>Aplicar</button>
          </div>
          {value && <img src={value} alt="preview" style={{ marginTop:8, maxHeight:80, borderRadius:10 }} />}
        </>
      )}
    </div>
  );
}

// ─── PRODUCT SEARCH INPUT ─────────────────────────────────────────────────────
function ProductSearchInput({ products, value, onChange }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = products.find(p => p.id === value);
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.barcode && p.barcode.includes(query)) ||
    (p.supplier && p.supplier.toLowerCase().includes(query.toLowerCase()))
  );
  return (
    <div style={{ position:"relative" }}>
      <div style={{ display:"flex", gap:8 }}>
        <input style={{ ...S.inp, flex:1 }}
          value={open ? query : (selected ? selected.name : "")}
          placeholder="🔍 Buscar producto..."
          onFocus={() => { setOpen(true); setQuery(""); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
        />
        {selected && !open && (
          <div style={{ display:"flex", alignItems:"center", gap:4, background:T.greenBg, border:`1px solid ${T.border2}`, borderRadius:10, padding:"6px 12px", fontSize:12, color:T.green, fontWeight:700, whiteSpace:"nowrap" }}>
            Stock: {selected.stock}
          </div>
        )}
      </div>
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:T.card, border:`1.5px solid ${T.border2}`, borderRadius:14, zIndex:300, maxHeight:220, overflowY:"auto", boxShadow:T.shadowMd, marginTop:4 }}>
          {filtered.length === 0 && <div style={{ padding:"14px 16px", color:T.muted, fontSize:13 }}>Sin resultados</div>}
          {filtered.map(p => (
            <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); setQuery(""); }}
              style={{ width:"100%", background:p.id===value?T.greenBg:"transparent", border:"none", borderBottom:`1px solid ${T.border}`, padding:"12px 16px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              <ProductAvatar product={p} size={32} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{p.name}</div>
                <div style={{ fontSize:11, color:T.muted }}>Stock: <strong style={{ color: p.stock <= p.minStock ? T.red : T.green }}>{p.stock}</strong></div>
              </div>
              <div style={{ fontSize:13, fontWeight:800, color:T.green }}>{fmt(p.price)}</div>
            </button>
          ))}
        </div>
      )}
      {open && <div style={{ position:"fixed", inset:0, zIndex:1 }} onClick={()=>setOpen(false)} />}
    </div>
  );
}

// ─── CLIENT SEARCH INPUT ──────────────────────────────────────────────────────
function ClientSearchInput({ clients, value, onChange }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = clients.find(c => c.id === value);
  const filtered = clients.filter(c =>
    (c.name||"").toLowerCase().includes(query.toLowerCase()) ||
    (c.phone||"").includes(query)
  );
  return (
    <div style={{ position:"relative" }}>
      <input style={{ ...S.inp }}
        value={open ? query : (selected ? selected.name : "")}
        placeholder="🔍 Buscar cliente (opcional)..."
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
      />
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:T.card, border:`1.5px solid ${T.border2}`, borderRadius:14, zIndex:300, maxHeight:200, overflowY:"auto", boxShadow:T.shadowMd, marginTop:4 }}>
          <button onClick={()=>{ onChange(""); setOpen(false); setQuery(""); }}
            style={{ width:"100%", background:"transparent", border:"none", borderBottom:`1px solid ${T.border}`, padding:"10px 16px", textAlign:"left", cursor:"pointer", color:T.muted, fontSize:13 }}>
            Sin cliente
          </button>
          {filtered.map(c => (
            <button key={c.id} onClick={() => { onChange(c.id); setOpen(false); setQuery(""); }}
              style={{ width:"100%", background:c.id===value?T.greenBg:"transparent", border:"none", borderBottom:`1px solid ${T.border}`, padding:"10px 16px", textAlign:"left", cursor:"pointer" }}>
              <div style={{ fontWeight:700, fontSize:13, color:T.text }}>{c.name}</div>
              <div style={{ fontSize:11, color:T.muted }}>{c.phone} · {c.instagram}</div>
            </button>
          ))}
        </div>
      )}
      {open && <div style={{ position:"fixed", inset:0, zIndex:1 }} onClick={()=>setOpen(false)} />}
    </div>
  );
}

// ─── CATEGORY MANAGER ─────────────────────────────────────────────────────────
function CategoryManager({ businessId, categories, onUpdate, onClose }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const [list, setList] = useState([...categories]);
  const [newCat, setNewCat] = useState("");
  const [saving, setSaving] = useState(false);
  const add = () => { const t=newCat.trim(); if(!t||list.includes(t)) return; setList(l=>[...l,t]); setNewCat(""); };
  const remove = (c) => { if(c==="General") return alert("No se puede eliminar General."); setList(l=>l.filter(x=>x!==c)); };
  const save = async () => { setSaving(true); await fbSet(businessId, COL.categories, "lista", {items:list}); onUpdate(list); setSaving(false); onClose(); };
  return (
    <Modal title="🗂 Categorías" onClose={onClose}>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input style={S.inp} value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Nueva categoría..." />
        <button onClick={add} style={S.btnPrimary({padding:"12px 16px"})}>+ Agregar</button>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:24 }}>
        {list.map(c=>(
          <div key={c} style={{ display:"flex", alignItems:"center", gap:6, background:T.greenBg, border:`1px solid ${T.border2}`, borderRadius:20, padding:"7px 14px" }}>
            <span style={{ fontSize:13, fontWeight:600, color:T.text2 }}>{c}</span>
            {c!=="General" && <button onClick={()=>remove(c)} style={{ background:"none", border:"none", color:T.red, cursor:"pointer", fontSize:14, padding:0 }}>✕</button>}
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} style={{ ...S.btnPrimary(), width:"100%" }}>{saving?"Guardando...":"Guardar →"}</button>
    </Modal>
  );
}

// ─── PRODUCT FORM ─────────────────────────────────────────────────────────────
function ProductForm({ initial, categories, businessId, onSave, onClose, saving }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const def = { name:"", brand:"", description:"", sku:"", price:"", priceWholesale:"", cost:"", category:categories[0]||"General", supplier:"", stock:"0", minStock:"5", barcode:"", image:null };
  const [f, setF] = useState(initial ? {...initial} : def);
  const [showScanner, setShowScanner] = useState(false);
  const set = (k, v) => setF(p => ({...p, [k]:v}));
  const margin = f.price&&f.cost ? (((f.price-f.cost)/f.price)*100).toFixed(1) : 0;
  const mColor = Number(margin)>30?T.green:Number(margin)>15?T.orange:T.red;
  return (
    <Modal title={initial?"✏️ Editar producto":"➕ Nuevo producto"} onClose={onClose}>
      {showScanner && <BarcodeScanner onDetect={c=>{set("barcode",c);setShowScanner(false);}} onClose={()=>setShowScanner(false)} />}
      <Field label="Foto"><ImageUpload value={f.image} onChange={v=>set("image",v)} businessId={businessId} /></Field>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:2 }}><Field label="Nombre *"><input style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Nombre del producto" /></Field></div>
        <div style={{ flex:1 }}><Field label="Marca"><input style={S.inp} value={f.brand||""} onChange={e=>set("brand",e.target.value)} placeholder="Marca" /></Field></div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Código interno"><input style={S.inp} value={f.sku||""} onChange={e=>set("sku",e.target.value)} placeholder="SKU-001" /></Field></div>
        <div style={{ flex:1 }}><Field label="Categoría">
          <select style={S.inp} value={f.category} onChange={e=>set("category",e.target.value)}>
            {categories.map(c=><option key={c}>{c}</option>)}
          </select>
        </Field></div>
      </div>
      <Field label="Descripción"><input style={S.inp} value={f.description||""} onChange={e=>set("description",e.target.value)} /></Field>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Precio minorista"><input style={S.inp} type="number" value={f.price} onChange={e=>set("price",e.target.value)} /></Field></div>
        <div style={{ flex:1 }}><Field label="Precio mayorista"><input style={S.inp} type="number" value={f.priceWholesale||""} onChange={e=>set("priceWholesale",e.target.value)} /></Field></div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Costo"><input style={S.inp} type="number" value={f.cost} onChange={e=>set("cost",e.target.value)} /></Field></div>
        <div style={{ flex:1 }}><Field label="Margen"><div style={{ ...S.inp, background:`${mColor}22`, borderColor:`${mColor}44`, color:mColor, fontWeight:800, fontSize:16 }}>{margin}%</div></Field></div>
      </div>
      <Field label="Proveedor"><input style={S.inp} value={f.supplier||""} onChange={e=>set("supplier",e.target.value)} /></Field>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Stock inicial"><input style={S.inp} type="number" value={f.stock} onChange={e=>set("stock",e.target.value)} /></Field></div>
        <div style={{ flex:1 }}><Field label="Stock mínimo"><input style={S.inp} type="number" value={f.minStock} onChange={e=>set("minStock",e.target.value)} /></Field></div>
      </div>
      <Field label="Código de barras">
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ ...S.inp, flex:1 }} value={f.barcode||""} onChange={e=>set("barcode",e.target.value)} placeholder="Escanear o ingresar" />
          <button type="button" onClick={()=>setShowScanner(true)} style={S.btnSecondary({padding:"12px 14px"})}>📷</button>
        </div>
      </Field>
      <button onClick={()=>onSave(f)} disabled={saving||!f.name} style={{ ...S.btnPrimary(), width:"100%", opacity:saving||!f.name?0.6:1 }}>
        {saving?"Guardando...":initial?"Guardar cambios →":"Crear producto →"}
      </button>
    </Modal>
  );
}

// ─── MOVEMENT FORM ────────────────────────────────────────────────────────────
function MovementForm({ type, products, clients, preselected, editData, onSave, onClose, saving }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const [productId, setProductId] = useState(editData?.productId||preselected?.id||products[0]?.id||"");
  const [qty, setQty] = useState(editData?.qty?.toString()||"1");
  const [note, setNote] = useState(editData?.note||"");
  const [date, setDate] = useState(editData?.date||todayStr());
  const [priceType, setPriceType] = useState("retail");
  const [payMethod, setPayMethod] = useState(editData?.payMethod||"efectivo");
  const [customPrice, setCustomPrice] = useState(editData?.unitPrice?.toString()||"");
  const [clientId, setClientId] = useState(editData?.clientId||"");
  const [state, setState] = useState(editData?.state||"pagado");
  const [shipping, setShipping] = useState(editData?.shipping?.toString()||"0");
  const isSale = type==="sale";
  const product = products.find(p=>p.id===productId);
  const autoPrice = isSale?(priceType==="wholesale"?product?.priceWholesale:product?.price):product?.cost;
  const unitPrice = customPrice!==""?Number(customPrice):(autoPrice||0);
  const subtotal = product?Number(qty)*unitPrice:0;
  const total = subtotal + Number(shipping||0);
  const isEdit = !!editData;
  return (
    <Modal title={isEdit?"✏️ Editar":isSale?"📤 Nueva venta":"📥 Nueva compra"} onClose={onClose}>
      <Field label="Producto"><ProductSearchInput products={products} value={productId} onChange={setProductId} /></Field>
      {isSale && <>
        <Field label="Cliente"><ClientSearchInput clients={clients} value={clientId} onChange={setClientId} /></Field>
        <Field label="Tipo de precio">
          <div style={{ display:"flex", gap:8 }}>
            {["retail","wholesale"].map(t=>(
              <button key={t} onClick={()=>setPriceType(t)}
                style={{ ...S.btnSecondary(), flex:1, background:priceType===t?T.greenBg:T.card, borderColor:priceType===t?T.green:T.border2, color:priceType===t?T.green:T.muted }}>
                {t==="retail"?"🛍 Minorista":"🏭 Mayorista"}
              </button>
            ))}
          </div>
        </Field>
      </>}
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Cantidad"><input style={S.inp} type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} /></Field></div>
        <div style={{ flex:1 }}><Field label="Fecha"><input style={S.inp} type="date" value={date} onChange={e=>setDate(e.target.value)} /></Field></div>
      </div>
      {!isSale && <Field label="Precio de compra (por unidad)">
        <input style={S.inp} type="number" min="0" value={customPrice} onChange={e=>setCustomPrice(e.target.value)} placeholder={`Costo guardado: $${autoPrice||0}`} />
      </Field>}
      {isSale && <Field label="Envío">
        <input style={S.inp} type="number" min="0" value={shipping} onChange={e=>setShipping(e.target.value)} placeholder="0" />
      </Field>}
      <Field label="Método de pago">
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {PAY_METHODS.map(m=>(
            <button key={m.id} onClick={()=>setPayMethod(m.id)}
              style={{ ...S.btnSecondary(), flex:1, minWidth:80, background:payMethod===m.id?T.greenBg:T.card, borderColor:payMethod===m.id?T.green:T.border2, color:payMethod===m.id?T.green:T.muted }}>
              {m.label}
            </button>
          ))}
        </div>
      </Field>
      {isSale && <Field label="Estado">
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {SALE_STATES.map(s=>(
            <button key={s.id} onClick={()=>setState(s.id)}
              style={{ ...S.btnSecondary(), flex:1, background:state===s.id?s.bg:T.card, borderColor:state===s.id?s.color:T.border2, color:state===s.id?s.color:T.muted }}>
              {s.label}
            </button>
          ))}
        </div>
      </Field>}
      <Field label="Nota"><input style={S.inp} value={note} onChange={e=>setNote(e.target.value)} placeholder="Referencia, observación..." /></Field>
      {product && <div style={{ background:T.greenBg, borderRadius:14, padding:16, marginBottom:16, border:`1px solid ${T.border2}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ color:T.muted, fontSize:13 }}>Subtotal</span>
          <span style={{ fontWeight:700, color:T.text2 }}>{fmt(subtotal)}</span>
        </div>
        {isSale && Number(shipping)>0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ color:T.muted, fontSize:13 }}>Envío</span>
          <span style={{ fontWeight:700, color:T.text2 }}>{fmt(Number(shipping))}</span>
        </div>}
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:T.muted, fontSize:13 }}>Total</span>
          <span style={{ fontWeight:900, fontSize:24, color:isSale?T.green:T.blue }}>{fmt(total)}</span>
        </div>
        {isSale&&!isEdit&&product.stock<Number(qty)&&<p style={{ color:T.red, fontSize:12, margin:"8px 0 0" }}>⚠ Stock insuficiente ({product.stock} disponibles)</p>}
      </div>}
      <button onClick={()=>onSave({productId,qty:Number(qty),note,date,type,unitPrice:unitPrice||0,subtotal,shipping:Number(shipping||0),total,payMethod,clientId,state})}
        disabled={saving||(isSale&&!isEdit&&product&&product.stock<Number(qty))}
        style={{ ...S.btnPrimary(isSale?{}:{background:T.blue}), width:"100%", opacity:(saving||(isSale&&!isEdit&&product&&product.stock<Number(qty)))?0.5:1 }}>
        {saving?"Guardando...":isEdit?"Guardar →":isSale?"Confirmar venta →":"Confirmar compra →"}
      </button>
    </Modal>
  );
}

// ─── QUICK CASH ───────────────────────────────────────────────────────────────
function QuickCash({ products, onSell, onClose }) {
  const { T } = useTheme();
  const S = makeStyles(T);
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
    for(const item of cart) await onSell({productId:item.product.id,qty:item.qty,type:"sale",unitPrice:getPrice(item.product),subtotal:getPrice(item.product)*item.qty,shipping:0,total:getPrice(item.product)*item.qty,date:todayStr(),note:`Caja rápida · ${priceType==="wholesale"?"Mayorista":"Minorista"}`,payMethod,clientId:"",state:"pagado"});
    setSaving(false); onClose();
  };
  return (
    <Modal title="⚡ Caja rápida" onClose={onClose} wide>
      {showScanner && <BarcodeScanner onDetect={handleBarcode} onClose={()=>setShowScanner(false)} />}
      {step==="cart" && <>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {["retail","wholesale"].map(t=>(
            <button key={t} onClick={()=>setPriceType(t)}
              style={{ ...S.btnSecondary(), flex:1, background:priceType===t?T.greenBg:T.card, borderColor:priceType===t?T.green:T.border2, color:priceType===t?T.green:T.muted }}>
              {t==="retail"?"🛍 Minorista":"🏭 Mayorista"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{ ...S.inp, flex:1 }} />
          <button onClick={()=>setShowScanner(true)} style={S.btnSecondary({padding:"12px 14px"})}>📷</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8, marginBottom:16, maxHeight:"28dvh", overflowY:"auto" }}>
          {filtered.map(p=>(
            <button key={p.id} onClick={()=>addToCart(p)} disabled={p.stock<=0}
              style={{ background:T.card, border:`1.5px solid ${T.border}`, borderRadius:14, padding:10, cursor:p.stock>0?"pointer":"not-allowed", opacity:p.stock<=0?0.5:1, textAlign:"left", boxShadow:T.shadow }}>
              <ProductAvatar product={p} size={34} />
              <p style={{ margin:"6px 0 2px", fontSize:12, fontWeight:700, color:T.text, lineHeight:1.3 }}>{p.name}</p>
              <p style={{ margin:0, color:T.green, fontWeight:800, fontSize:12 }}>{fmt(getPrice(p))}</p>
              <p style={{ margin:0, color:p.stock<=p.minStock?T.red:T.muted, fontSize:11 }}>Stock: {p.stock}</p>
            </button>
          ))}
        </div>
        {cart.length>0 && <>
          <div style={{ background:T.greenBg, borderRadius:16, padding:16, marginBottom:14, border:`1px solid ${T.border2}` }}>
            <p style={{ color:T.muted, fontSize:11, fontWeight:700, margin:"0 0 10px", textTransform:"uppercase" }}>Carrito ({cart.length})</p>
            {cart.map(item=>(
              <div key={item.product.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <ProductAvatar product={item.product} size={28} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:600, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.product.name}</p>
                  <p style={{ margin:0, color:T.muted, fontSize:11 }}>{fmt(getPrice(item.product))} c/u</p>
                </div>
                <button onClick={()=>setCart(c=>c.map(i=>i.product.id===item.product.id?{...i,qty:Math.max(1,i.qty-1)}:i))} style={S.btnSecondary({padding:"3px 10px",fontSize:14})}>−</button>
                <span style={{ fontWeight:700, minWidth:20, textAlign:"center", color:T.text }}>{item.qty}</span>
                <button onClick={()=>setCart(c=>c.map(i=>i.product.id===item.product.id?{...i,qty:i.qty+1}:i))} style={S.btnSecondary({padding:"3px 10px",fontSize:14})}>+</button>
                <button onClick={()=>setCart(c=>c.filter(i=>i.product.id!==item.product.id))} style={S.btnGhost(T.red,T.redBg,{padding:"3px 10px",fontSize:13})}>🗑</button>
                <span style={{ fontWeight:700, color:T.green, minWidth:64, textAlign:"right", fontSize:13 }}>{fmt(getPrice(item.product)*item.qty)}</span>
              </div>
            ))}
            <div style={{ borderTop:`1px solid ${T.border2}`, paddingTop:12, display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:T.muted, fontWeight:700, fontSize:14 }}>TOTAL</span>
              <span style={{ color:T.green, fontWeight:900, fontSize:24 }}>{fmt(total)}</span>
            </div>
          </div>
          <button onClick={()=>setStep("pay")} style={{ ...S.btnPrimary(), width:"100%", fontSize:16 }}>Cobrar {fmt(total)} →</button>
        </>}
      </>}
      {step==="pay" && <>
        <div style={{ background:T.greenBg, borderRadius:18, padding:24, marginBottom:18, textAlign:"center", border:`1px solid ${T.border2}` }}>
          <p style={{ color:T.muted, margin:"0 0 4px", fontSize:13 }}>Total a cobrar</p>
          <p style={{ color:T.green, fontWeight:900, fontSize:40, margin:0 }}>{fmt(total)}</p>
        </div>
        <Field label="Método de pago">
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {PAY_METHODS.map(m=>(
              <button key={m.id} onClick={()=>setPayMethod(m.id)}
                style={{ ...S.btnSecondary(), flex:1, minWidth:80, background:payMethod===m.id?T.greenBg:T.card, borderColor:payMethod===m.id?T.green:T.border2, color:payMethod===m.id?T.green:T.muted }}>
                {m.label}
              </button>
            ))}
          </div>
        </Field>
        {payMethod==="efectivo" && <>
          <Field label="Efectivo recibido">
            <input style={{ ...S.inp, fontSize:22, fontWeight:700, textAlign:"center" }} type="number" value={cashReceived} onChange={e=>setCashReceived(e.target.value)} placeholder="0" />
          </Field>
          <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
            {[500,1000,2000,5000,10000].map(v=>(
              <button key={v} onClick={()=>setCashReceived(String(v))} style={{ ...S.btnSecondary(), flex:1, minWidth:50, padding:"8px 4px", fontSize:13 }}>{fmt(v)}</button>
            ))}
            <button onClick={()=>setCashReceived(String(Math.ceil(total/100)*100))} style={{ ...S.btnSecondary(), flex:1, minWidth:50, padding:"8px 4px", fontSize:13, background:T.blueBg, borderColor:T.blue, color:T.blue }}>Exacto</button>
          </div>
          {cashReceived && Number(cashReceived)>=total && (
            <div style={{ background:T.greenBg, border:`1.5px solid ${T.green}44`, borderRadius:14, padding:16, marginBottom:14, textAlign:"center" }}>
              <p style={{ color:T.muted, margin:"0 0 4px", fontSize:13 }}>Vuelto</p>
              <p style={{ color:T.green, fontWeight:900, fontSize:34, margin:0 }}>{fmt(change)}</p>
            </div>
          )}
          {cashReceived && Number(cashReceived)<total && (
            <div style={{ background:T.redBg, border:`1.5px solid ${T.red}44`, borderRadius:14, padding:12, marginBottom:14, textAlign:"center" }}>
              <p style={{ color:T.red, fontWeight:700, margin:0 }}>Falta: {fmt(total-Number(cashReceived))}</p>
            </div>
          )}
        </>}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setStep("cart")} style={{ ...S.btnSecondary(), flex:1, padding:14 }}>← Volver</button>
          <button onClick={confirmSale} disabled={saving||(payMethod==="efectivo"&&cashReceived&&Number(cashReceived)<total)}
            style={{ ...S.btnPrimary(), flex:2, opacity:(saving||(payMethod==="efectivo"&&cashReceived&&Number(cashReceived)<total))?0.5:1 }}>
            {saving?"Guardando...":"✅ Confirmar venta"}
          </button>
        </div>
      </>}
    </Modal>
  );
}

// ─── CASH CLOSE ───────────────────────────────────────────────────────────────
function CashClose({ movements, products, onClose }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const [selDate, setSelDate] = useState(todayStr());
  const dayMovs = movements.filter(m=>m.date===selDate);
  const sales = dayMovs.filter(m=>m.type==="sale");
  const purchases = dayMovs.filter(m=>m.type==="purchase");
  const totalSales = sales.reduce((s,m)=>s+m.total,0);
  const totalPurchases = purchases.reduce((s,m)=>s+m.total,0);
  const totalCost = sales.reduce((s,m)=>{ const p=products.find(pr=>pr.id===m.productId); return s+(p?.cost||0)*m.qty; },0);
  const profit = totalSales-totalCost;
  const byMethod = PAY_METHODS.map(m=>({...m,total:sales.filter(s=>s.payMethod===m.id).reduce((s,mv)=>s+mv.total,0)}));
  return (
    <Modal title="💰 Cierre de caja" onClose={onClose} wide>
      <Field label="Fecha"><input style={S.inp} type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} /></Field>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
        {[{l:"Ventas",v:fmt(totalSales),c:T.green,bg:T.greenBg},{l:"Compras",v:fmt(totalPurchases),c:T.blue,bg:T.blueBg},{l:"Costo",v:fmt(totalCost),c:T.orange,bg:T.orangeBg},{l:"Ganancia",v:fmt(profit),c:profit>=0?T.green:T.red,bg:profit>=0?T.greenBg:T.redBg}].map(s=>(
          <div key={s.l} style={{ flex:1, minWidth:110, background:s.bg, borderRadius:14, padding:14, border:`1px solid ${s.c}22` }}>
            <p style={{ color:T.muted, fontSize:11, margin:"0 0 4px" }}>{s.l}</p>
            <p style={{ color:s.c, fontWeight:800, fontSize:18, margin:0 }}>{s.v}</p>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {byMethod.map(m=>(
          <div key={m.id} style={{ flex:1, minWidth:90, background:T.greenBg, border:`1.5px solid ${T.border2}`, borderRadius:12, padding:12, textAlign:"center" }}>
            <p style={{ color:T.muted, fontSize:11, margin:"0 0 4px" }}>{m.label}</p>
            <p style={{ color:T.green, fontWeight:800, fontSize:15, margin:0 }}>{fmt(m.total)}</p>
          </div>
        ))}
      </div>
      {dayMovs.length===0 ? <p style={{ color:T.muted, textAlign:"center", padding:24 }}>Sin movimientos este día</p>
        : dayMovs.map(m=>{ const p=products.find(pr=>pr.id===m.productId); const pm=PAY_METHODS.find(pm=>pm.id===m.payMethod); return (
          <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ width:36, height:36, borderRadius:10, background:m.type==="sale"?T.greenBg:T.blueBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{m.type==="sale"?"📤":"📥"}</div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:600, color:T.text }}>{p?.name}</p>
              <p style={{ margin:0, color:T.muted, fontSize:11 }}>{m.note} · {m.qty} uds · {pm?.label}</p>
            </div>
            <span style={{ fontWeight:700, color:m.type==="sale"?T.green:T.blue }}>{fmt(m.total)}</span>
          </div>
        );})}
    </Modal>
  );
}

// ─── CLIENT FORM ──────────────────────────────────────────────────────────────
function ClientForm({ initial, onSave, onClose, saving }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const def = { name:"", phone:"", instagram:"", address:"", notes:"", balance:0 };
  const [f, setF] = useState(initial?{...initial}:def);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <Modal title={initial?"✏️ Editar cliente":"👤 Nuevo cliente"} onClose={onClose}>
      <Field label="Nombre *"><input style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Nombre y apellido" /></Field>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Teléfono"><input style={S.inp} value={f.phone||""} onChange={e=>set("phone",e.target.value)} placeholder="11 1234-5678" /></Field></div>
        <div style={{ flex:1 }}><Field label="Instagram"><input style={S.inp} value={f.instagram||""} onChange={e=>set("instagram",e.target.value)} placeholder="@usuario" /></Field></div>
      </div>
      <Field label="Dirección"><input style={S.inp} value={f.address||""} onChange={e=>set("address",e.target.value)} placeholder="Calle, número, ciudad" /></Field>
      <Field label="Notas"><input style={S.inp} value={f.notes||""} onChange={e=>set("notes",e.target.value)} placeholder="Observaciones..." /></Field>
      <button onClick={()=>onSave(f)} disabled={saving||!f.name} style={{ ...S.btnPrimary(), width:"100%", opacity:saving||!f.name?0.6:1 }}>
        {saving?"Guardando...":initial?"Guardar cambios →":"Crear cliente →"}
      </button>
    </Modal>
  );
}

// ─── SUPPLIER FORM ────────────────────────────────────────────────────────────
function SupplierForm({ initial, onSave, onClose, saving }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const def = { name:"", phone:"", instagram:"", web:"", notes:"", balance:0 };
  const [f, setF] = useState(initial?{...initial}:def);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <Modal title={initial?"✏️ Editar proveedor":"🏭 Nuevo proveedor"} onClose={onClose}>
      <Field label="Nombre *"><input style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Nombre del proveedor" /></Field>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Teléfono"><input style={S.inp} value={f.phone||""} onChange={e=>set("phone",e.target.value)} placeholder="11 1234-5678" /></Field></div>
        <div style={{ flex:1 }}><Field label="Instagram"><input style={S.inp} value={f.instagram||""} onChange={e=>set("instagram",e.target.value)} placeholder="@usuario" /></Field></div>
      </div>
      <Field label="Web / Email"><input style={S.inp} value={f.web||""} onChange={e=>set("web",e.target.value)} placeholder="web o email" /></Field>
      <Field label="Notas"><input style={S.inp} value={f.notes||""} onChange={e=>set("notes",e.target.value)} placeholder="Productos que vende, condiciones..." /></Field>
      <button onClick={()=>onSave(f)} disabled={saving||!f.name} style={{ ...S.btnPrimary(), width:"100%", opacity:saving||!f.name?0.6:1 }}>
        {saving?"Guardando...":initial?"Guardar cambios →":"Crear proveedor →"}
      </button>
    </Modal>
  );
}

// ─── EXPENSE FORM ─────────────────────────────────────────────────────────────
function ExpenseForm({ initial, onSave, onClose, saving }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const def = { concept:"", category:EXPENSE_CATS[0], amount:"", date:todayStr(), notes:"" };
  const [f, setF] = useState(initial?{...initial}:def);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <Modal title={initial?"✏️ Editar gasto":"💸 Nuevo gasto"} onClose={onClose}>
      <Field label="Concepto *"><input style={S.inp} value={f.concept} onChange={e=>set("concept",e.target.value)} placeholder="Ej: Bolsas de regalo" /></Field>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Categoría">
          <select style={S.inp} value={f.category} onChange={e=>set("category",e.target.value)}>
            {EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}
          </select>
        </Field></div>
        <div style={{ flex:1 }}><Field label="Fecha"><input style={S.inp} type="date" value={f.date} onChange={e=>set("date",e.target.value)} /></Field></div>
      </div>
      <Field label="Importe *"><input style={S.inp} type="number" value={f.amount} onChange={e=>set("amount",e.target.value)} placeholder="0" /></Field>
      <Field label="Notas"><input style={S.inp} value={f.notes||""} onChange={e=>set("notes",e.target.value)} placeholder="Observaciones..." /></Field>
      <button onClick={()=>onSave({...f,amount:Number(f.amount)})} disabled={saving||!f.concept||!f.amount} style={{ ...S.btnPrimary(), width:"100%", opacity:saving||!f.concept||!f.amount?0.6:1 }}>
        {saving?"Guardando...":initial?"Guardar cambios →":"Registrar gasto →"}
      </button>
    </Modal>
  );
}

// ─── PAYMENT FORM ─────────────────────────────────────────────────────────────
function PaymentForm({ type, entity, onSave, onClose, saving }) {
  const { T } = useTheme();
  const S = makeStyles(T);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [payMethod, setPayMethod] = useState("efectivo");
  const isClient = type === "client";
  return (
    <Modal title={isClient ? "💵 Registrar cobro" : "💸 Registrar pago"} onClose={onClose}>
      <div style={{ background:T.greenBg, borderRadius:14, padding:14, marginBottom:16, border:`1px solid ${T.border2}` }}>
        <p style={{ margin:0, color:T.muted, fontSize:12 }}>{isClient ? "Cliente" : "Proveedor"}</p>
        <p style={{ margin:"4px 0 0", fontWeight:700, color:T.text, fontSize:15 }}>{entity?.name}</p>
        <p style={{ margin:"4px 0 0", color:T.red, fontWeight:700, fontSize:13 }}>
          Saldo pendiente: {fmt(entity?.balance||0)}
        </p>
      </div>
      <Field label="Importe *">
        <input style={{ ...S.inp, fontSize:22, fontWeight:700, textAlign:"center" }} type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Método de pago">
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {PAY_METHODS.map(m=>(
            <button key={m.id} onClick={()=>setPayMethod(m.id)}
              style={{ ...S.btnSecondary(), flex:1, minWidth:80, background:payMethod===m.id?T.greenBg:T.card, borderColor:payMethod===m.id?T.green:T.border2, color:payMethod===m.id?T.green:T.muted }}>
              {m.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Fecha"><input style={S.inp} type="date" value={date} onChange={e=>setDate(e.target.value)} /></Field>
      <Field label="Nota"><input style={S.inp} value={note} onChange={e=>setNote(e.target.value)} placeholder="Observaciones..." /></Field>
      <button onClick={()=>onSave({amount:Number(amount),note,date,payMethod,entityId:entity.id,entityName:entity.name,type})}
        disabled={saving||!amount||Number(amount)<=0}
        style={{ ...S.btnPrimary(), width:"100%", opacity:saving||!amount?0.6:1 }}>
        {saving?"Guardando...":isClient?"Confirmar cobro →":"Confirmar pago →"}
      </button>
    </Modal>
  );
}

// ─── SUPERADMIN PANEL ─────────────────────────────────────────────────────────
function SuperadminPanel() {
  const { T } = useTheme();
  const S = makeStyles(T);
  const [tab, setTab] = useState("negocios");
  const [negocios, setNegocios] = useState([]);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => { setNegocios(await listNegocios()); setUsers(await listUsers()); }, []);
  useEffect(() => { load(); }, [load]);
  const saveNeg = async () => { setLoading(true); try { await createNegocio(form); await load(); setModal(null); } catch(e){ alert(e.message); } setLoading(false); };
  const saveUsr = async () => { setLoading(true); try { await createUser(form); await load(); setModal(null); } catch(e){ alert(e.message); } setLoading(false); };
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {["negocios","usuarios"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ ...S.btnSecondary(), background:tab===t?T.greenBg:T.card, borderColor:tab===t?T.green:T.border2, color:tab===t?T.green:T.text2 }}>
            {t==="negocios"?"🏢 Negocios":"👥 Usuarios"}
          </button>
        ))}
        <button onClick={()=>{ setForm(tab==="negocios"?{}:{rol:"empleado"}); setModal(tab==="negocios"?"negocio":"user"); }}
          style={{ ...S.btnPrimary({padding:"10px 16px",fontSize:14}), marginLeft:"auto" }}>
          + Nuevo {tab==="negocios"?"negocio":"usuario"}
        </button>
      </div>
      {tab==="negocios" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {negocios.length===0 && <Card style={{ textAlign:"center", padding:28 }}><p style={{ color:T.muted }}>Sin negocios aún</p></Card>}
          {negocios.map(n=>(
            <Card key={n.id}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <div><p style={{ margin:0, fontWeight:800, fontSize:15, color:T.text }}>🏢 {n.nombre}</p><p style={{ margin:"4px 0 0", fontSize:11, color:T.muted }}>{n.id}</p></div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <Chip color={T.blue} bg={T.blueBg}>{n.plan}</Chip>
                  <Chip color={n.activo?T.green:T.red} bg={n.activo?T.greenBg:T.redBg}>{n.activo?"Activo":"Inactivo"}</Chip>
                  <button onClick={async()=>{ await updateNegocio(n.id,{activo:!n.activo}); load(); }} style={S.btnGhost(n.activo?T.red:T.green,n.activo?T.redBg:T.greenBg,{padding:"6px 10px",fontSize:12})}>{n.activo?"Desactivar":"Activar"}</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {tab==="usuarios" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {users.length===0 && <Card style={{ textAlign:"center", padding:28 }}><p style={{ color:T.muted }}>Sin usuarios aún</p></Card>}
          {users.map(u=>{ const neg=negocios.find(n=>n.id===u.businessId); return (
            <Card key={u.uid}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <div>
                  <p style={{ margin:0, fontWeight:800, fontSize:15, color:T.text }}>{u.nombre}</p>
                  <p style={{ margin:"3px 0 0", fontSize:12, color:T.muted }}>{u.email} · {neg?.nombre||u.businessId||"—"}</p>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <Chip color={u.rol==="admin"?T.blue:T.orange} bg={u.rol==="admin"?T.blueBg:T.orangeBg}>{u.rol}</Chip>
                  <Chip color={u.activo?T.green:T.red} bg={u.activo?T.greenBg:T.redBg}>{u.activo?"Activo":"Inactivo"}</Chip>
                  <button onClick={async()=>{ await updateUserProfile(u.uid,{rol:u.rol==="admin"?"empleado":"admin"}); load(); }} style={S.btnGhost(T.blue,T.blueBg,{padding:"6px 10px",fontSize:12})}>{u.rol==="admin"?"→ Empleado":"→ Admin"}</button>
                  <button onClick={async()=>{ await updateUserProfile(u.uid,{activo:!u.activo}); load(); }} style={S.btnGhost(u.activo?T.red:T.green,u.activo?T.redBg:T.greenBg,{padding:"6px 10px",fontSize:12})}>{u.activo?"Desactivar":"Activar"}</button>
                </div>
              </div>
            </Card>
          );})}
        </div>
      )}
      {modal==="negocio" && (
        <Modal title="🏢 Nuevo negocio" onClose={()=>setModal(null)}>
          <Field label="Nombre *"><input style={S.inp} value={form.nombre||""} onChange={e=>setForm({...form,nombre:e.target.value})}/></Field>
          <Field label="Descripción"><input style={S.inp} value={form.descripcion||""} onChange={e=>setForm({...form,descripcion:e.target.value})}/></Field>
          <Field label="Plan"><select style={S.inp} value={form.plan||"basic"} onChange={e=>setForm({...form,plan:e.target.value})}><option value="basic">Basic</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></Field>
          <button onClick={saveNeg} disabled={loading||!form.nombre} style={{ ...S.btnPrimary(), width:"100%" }}>{loading?"Creando...":"Crear negocio →"}</button>
        </Modal>
      )}
      {modal==="user" && (
        <Modal title="👤 Nuevo usuario" onClose={()=>setModal(null)}>
          <div style={{ display:"flex", gap:12 }}>
            <div style={{ flex:1 }}><Field label="Nombre *"><input style={S.inp} value={form.nombre||""} onChange={e=>setForm({...form,nombre:e.target.value})}/></Field></div>
            <div style={{ flex:1 }}><Field label="Rol"><select style={S.inp} value={form.rol||"empleado"} onChange={e=>setForm({...form,rol:e.target.value})}><option value="empleado">Empleado</option><option value="admin">Admin</option></select></Field></div>
          </div>
          <Field label="Email *"><input style={S.inp} type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
          <Field label="Contraseña *"><input style={S.inp} type="password" value={form.password||""} onChange={e=>setForm({...form,password:e.target.value})}/></Field>
          <Field label="Negocio *">
            <select style={S.inp} value={form.businessId||""} onChange={e=>setForm({...form,businessId:e.target.value})}>
              <option value="">— Seleccionar —</option>
              {negocios.map(n=><option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </Field>
          <button onClick={saveUsr} disabled={loading||!form.nombre||!form.email||!form.password||!form.businessId} style={{ ...S.btnPrimary(), width:"100%" }}>{loading?"Creando...":"Crear usuario →"}</button>
        </Modal>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login() {
  const { T } = useTheme();
  const S = makeStyles(T);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setLoading(true); setErr("");
    try { await login(email, pass); }
    catch(e) { setErr(e.code==="auth/invalid-credential"?"Email o contraseña incorrectos":e.message); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight:"100dvh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:24 }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <div style={{ width:80, height:80, background:T.greenBg, borderRadius:24, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 8px 24px ${T.greenL}44` }}>
              <ControlProLogo size={52} />
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:T.blue, fontWeight:900, fontSize:34, letterSpacing:-1 }}>Control</span>
            <span style={{ color:T.green, fontWeight:900, fontSize:34, letterSpacing:-1 }}>Pro</span>
          </div>
          <p style={{ color:T.muted, marginTop:8, fontSize:14 }}>Gestión profesional de inventario</p>
        </div>
        <div style={{ background:T.card, borderRadius:24, padding:28, boxShadow:T.shadowMd, border:`1px solid ${T.border}` }}>
          <Field label="Correo electrónico"><input style={S.inp} value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="tu@email.com"/></Field>
          <Field label="Contraseña"><input style={S.inp} value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&go()}/></Field>
          {err && <div style={{ background:T.redBg, border:`1px solid ${T.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:16 }}><p style={{ color:T.red, fontSize:13, margin:0 }}>{err}</p></div>}
          <button onClick={go} disabled={loading||!email||!pass} style={{ ...S.btnPrimary(), width:"100%", fontSize:16, opacity:loading||!email||!pass?0.6:1 }}>{loading?"Ingresando...":"Ingresar →"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ITEM ─────────────────────────────────────────────────────────────
function SidebarItem({ icon, label, active, onClick, collapsed }) {
  return (
    <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, cursor:"pointer", border:"none", background:active?"rgba(165,214,167,0.18)":"transparent", width:"100%", textAlign:"left", transition:"background 0.15s" }}>
      <span style={{ fontSize:18, color:active?"#a5d6a7":"rgba(255,255,255,0.4)", flexShrink:0, width:20, textAlign:"center" }}>{icon}</span>
      {!collapsed && <span style={{ fontSize:13, fontWeight:600, color:active?"#c8e6c9":"rgba(255,255,255,0.5)", whiteSpace:"nowrap" }}>{label}</span>}
    </button>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function MainApp({ session }) {
  const { user, perfil } = session;
  const businessId = perfil?.businessId || null;
  const isSuperadmin = user.email === SUPERADMIN_EMAIL;
  const isAdmin = perfil?.rol === "admin" || isSuperadmin;
  const isMobile = window.innerWidth < 768;

  const [dark, setDark] = useState(()=>localStorage.getItem("cpDark")==="1");
  const T = dark ? DARK : C;
  const S = makeStyles(T);

  const toggleDark = () => setDark(d => { localStorage.setItem("cpDark", d?"0":"1"); return !d; });

  const [tab, setTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { products, movements, categories, setCategories, clients, suppliers, expenses, payments, loading } = useFirestore(businessId);
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
  const [showClientForm, setShowClientForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(null);
  const [financeTab, setFinanceTab] = useState("balance");

  // ── Stats ──
  const todaySales = movements.filter(m=>m.type==="sale"&&m.date===todayStr()).reduce((s,m)=>s+m.total,0);
  const totalSales = movements.filter(m=>m.type==="sale").reduce((s,m)=>s+m.total,0);
  const totalCost = movements.filter(m=>m.type==="sale").reduce((s,m)=>{ const p=products.find(pr=>pr.id===m.productId); return s+(p?.cost||0)*m.qty; },0);
  const totalExpenses = expenses.reduce((s,e)=>s+e.amount,0);
  const totalProfit = totalSales-totalCost-totalExpenses;
  const lowStock = products.filter(p=>p.stock<=p.minStock);
  const inventoryValue = products.reduce((s,p)=>s+p.stock*(p.cost||0),0);
  const totalClientDebt = clients.reduce((s,c)=>s+(c.balance||0),0);
  const totalSupplierDebt = suppliers.reduce((s,s2)=>s+(s2.balance||0),0);

  const rentData = products.map(p=>{
    const sold = movements.filter(m=>m.productId===p.id&&m.type==="sale").reduce((s,m)=>s+m.qty,0);
    const revenue = movements.filter(m=>m.productId===p.id&&m.type==="sale").reduce((s,m)=>s+m.total,0);
    const profit = revenue-sold*(p.cost||0);
    const margin = revenue?((profit/revenue)*100).toFixed(1):0;
    const rotation = sold>5?"Alta":sold>0?"Media":"Baja";
    return {...p,sold,revenue,profit,margin,rotation};
  }).sort((a,b)=>b.profit-a.profit);

  // ── Handlers ──
  const saveProduct = async (data) => {
    setSaving(true);
    const parsed = {...data,price:Number(data.price),priceWholesale:Number(data.priceWholesale||0),cost:Number(data.cost),stock:Number(data.stock),minStock:Number(data.minStock),image:data.image||null};
    if(editProduct){ await fbUpdate(businessId,COL.products,editProduct.id,parsed); }
    else { await fbAdd(businessId,COL.products,parsed); }
    setSaving(false); setShowProductForm(false); setEditProduct(null);
  };

  const saveMovement = async (data) => {
    setSaving(true);
    if(editMovement){
      const old = movements.find(m=>m.id===editMovement.id);
      const sr = old.type==="sale"?old.qty:-old.qty;
      const oldProd = products.find(p=>p.id===old.productId);
      if(oldProd){ await fbUpdate(businessId,COL.products,old.productId,{stock:oldProd.stock+sr}); }
      await fbUpdate(businessId,COL.movements,editMovement.id,data);
      setEditMovement(null);
    } else {
      await fbAdd(businessId,COL.movements,data);
    }
    const product = products.find(p=>p.id===data.productId);
    if(product){ const ns=data.type==="sale"?product.stock-data.qty:product.stock+data.qty; await fbUpdate(businessId,COL.products,data.productId,{stock:ns}); }
    if(data.clientId && data.type==="sale" && data.state==="pendiente"){
      const cl = clients.find(c=>c.id===data.clientId);
      if(cl){ await fbUpdate(businessId,COL.clients,data.clientId,{balance:(cl.balance||0)+data.total}); }
    }
    setSaving(false); setShowMovForm(null); setPreselProduct(null);
  };

  const deleteMovement = async (mov) => {
    if(!window.confirm("¿Eliminar este movimiento?")) return;
    setSaving(true);
    await fbDelete(businessId,COL.movements,mov.id);
    const product = products.find(p=>p.id===mov.productId);
    if(product){ const ns=mov.type==="sale"?product.stock+mov.qty:product.stock-mov.qty; await fbUpdate(businessId,COL.products,mov.productId,{stock:ns}); }
    setSaving(false);
  };

  const deleteProduct = async (id) => {
    if(!window.confirm("¿Eliminar este producto?")) return;
    await fbDelete(businessId,COL.products,id);
  };

  const saveClient = async (data) => {
    setSaving(true);
    if(editClient){ await fbUpdate(businessId,COL.clients,editClient.id,data); }
    else { await fbAdd(businessId,COL.clients,{...data,balance:0,totalSpent:0}); }
    setSaving(false); setShowClientForm(false); setEditClient(null);
  };

  const saveSupplier = async (data) => {
    setSaving(true);
    if(editSupplier){ await fbUpdate(businessId,COL.suppliers,editSupplier.id,data); }
    else { await fbAdd(businessId,COL.suppliers,{...data,balance:0}); }
    setSaving(false); setShowSupplierForm(false); setEditSupplier(null);
  };

  const saveExpense = async (data) => {
    setSaving(true);
    if(editExpense){ await fbUpdate(businessId,COL.expenses,editExpense.id,data); }
    else { await fbAdd(businessId,COL.expenses,data); }
    setSaving(false); setShowExpenseForm(false); setEditExpense(null);
  };

  const savePayment = async (data) => {
    setSaving(true);
    await fbAdd(businessId, COL.payments, data);
    if(data.type==="client"){
      const cl = clients.find(c=>c.id===data.entityId);
      if(cl){ await fbUpdate(businessId,COL.clients,data.entityId,{balance:Math.max(0,(cl.balance||0)-data.amount)}); }
    } else {
      const sup = suppliers.find(s=>s.id===data.entityId);
      if(sup){ await fbUpdate(businessId,COL.suppliers,data.entityId,{balance:Math.max(0,(sup.balance||0)-data.amount)}); }
    }
    setSaving(false); setShowPaymentForm(null);
  };

  const handleBarcode = (code) => {
    const p = products.find(pr => String(pr.barcode||"").trim() === String(code).trim());
    if(p){ setSearch(code); setTab("products"); } else { alert(`Código ${code} no encontrado`); }
  };

  const filtMovements = movements.filter(m=>{
    if(filterFrom&&m.date<filterFrom) return false;
    if(filterTo&&m.date>filterTo) return false;
    return true;
  });

  const navItems = [
    { id:"dashboard",   icon:"🏠", label:"Dashboard" },
    { id:"products",    icon:"📦", label:"Productos" },
    { id:"movements",   icon:"↕️",  label:"Movimientos" },
    { id:"clients",     icon:"👥", label:"Clientes" },
    { id:"suppliers",   icon:"🏭", label:"Proveedores" },
    { id:"expenses",    icon:"💸", label:"Gastos" },
    { id:"finance",     icon:"📈", label:"Finanzas" },
    { id:"rentability", icon:"📊", label:"Rentabilidad" },
    ...(isSuperadmin?[{id:"superadmin",icon:"⚙️",label:"Admin"}]:[]),
  ];

  const mobileNav = [
    { id:"dashboard",   icon:"🏠", label:"Panel" },
    { id:"products",    icon:"📦", label:"Productos" },
    { id:"movements",   icon:"↕️",  label:"Movim." },
    { id:"clients",     icon:"👥", label:"Clientes" },
    { id:"finance",     icon:"📈", label:"Finanzas" },
  ];

  const Sidebar = (
    <div style={{ width:sidebarCollapsed?56:220, background:"#1a2e1a", display:"flex", flexDirection:"column", transition:"width 0.25s ease", overflow:"hidden", flexShrink:0, minHeight:"100dvh" }}>
      <div style={{ padding:"16px 12px 12px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.08)", minHeight:56 }}>
        <ControlProLogo size={32} />
        {!sidebarCollapsed && <div><span style={{ color:"#90caf9", fontWeight:900, fontSize:16 }}>Control</span><span style={{ color:"#a5d6a7", fontWeight:900, fontSize:16 }}>Pro</span></div>}
        <button onClick={()=>setSidebarCollapsed(!sidebarCollapsed)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", padding:4, borderRadius:6, flexShrink:0, fontSize:18 }}>
          {sidebarCollapsed?"›":"‹"}
        </button>
      </div>
      <div style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
        {!sidebarCollapsed && <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:0.8, padding:"8px 8px 4px" }}>Principal</div>}
        {navItems.map(n=>(
          <SidebarItem key={n.id} icon={n.icon} label={n.label} active={tab===n.id} onClick={()=>setTab(n.id)} collapsed={sidebarCollapsed} />
        ))}
        {!sidebarCollapsed && <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:0.8, padding:"16px 8px 4px" }}>Acciones</div>}
        <SidebarItem icon="⚡" label="Caja rápida" active={false} onClick={()=>setShowQuickCash(true)} collapsed={sidebarCollapsed} />
        <SidebarItem icon="💰" label="Cierre de caja" active={false} onClick={()=>setShowCashClose(true)} collapsed={sidebarCollapsed} />
        {isAdmin && <SidebarItem icon="📷" label="Escanear" active={false} onClick={()=>setShowScanner(true)} collapsed={sidebarCollapsed} />}
        <SidebarItem icon={dark?"☀️":"🌙"} label={dark?"Modo claro":"Modo oscuro"} active={false} onClick={toggleDark} collapsed={sidebarCollapsed} />
      </div>
      <div style={{ padding:"12px 8px", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:"#2e7d32", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", flexShrink:0 }}>
          {(perfil?.nombre||user.email)[0].toUpperCase()}
        </div>
        {!sidebarCollapsed && <>
          <div style={{ overflow:"hidden", flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#c8e6c9", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{perfil?.nombre||user.email}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{perfil?.rol||"usuario"}</div>
          </div>
          <button onClick={logout} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:12, whiteSpace:"nowrap" }}>Salir</button>
        </>}
      </div>
    </div>
  );

  const BottomNav = (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#1a2e1a", display:"flex", alignItems:"center", justifyContent:"space-around", padding:"10px 4px 16px", zIndex:40 }}>
      {mobileNav.map(n=>(
        <button key={n.id} onClick={()=>setTab(n.id)} style={{ background:tab===n.id?"rgba(255,255,255,0.12)":"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 8px", borderRadius:12 }}>
          <span style={{ fontSize:18 }}>{n.icon}</span>
          <span style={{ fontSize:10, fontWeight:700, color:tab===n.id?"#fff":"rgba(255,255,255,0.35)" }}>{n.label}</span>
        </button>
      ))}
      <button onClick={()=>setShowQuickCash(true)} style={{ background:"#2e7d32", border:"none", color:"#fff", display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"10px 14px", borderRadius:18, transform:"translateY(-8px)", boxShadow:"0 6px 20px rgba(46,125,50,0.5)", cursor:"pointer" }}>
        <span style={{ fontSize:20 }}>⚡</span>
        <span style={{ fontSize:10, fontWeight:900 }}>CAJA</span>
      </button>
    </div>
  );

  const contentPad = isMobile ? "16px 16px 90px" : "24px";

  return (
    <ThemeCtx.Provider value={{ dark, T }}>
    <div style={{ minHeight:"100dvh", background:T.bg, fontFamily:"'DM Sans',sans-serif", color:T.text, display:"flex", maxWidth:"100vw", overflowX:"hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap'); *{box-sizing:border-box;} select option{background:${T.card};color:${T.text};}`}</style>

      {!isMobile && Sidebar}

      <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:"100dvh", overflow:"hidden" }}>
        <div style={{ background:T.card, borderBottom:`1px solid ${T.border}`, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:50, boxShadow:T.shadow }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {isMobile && <><ControlProLogo size={28} /><div><span style={{ color:T.blue, fontWeight:900, fontSize:16 }}>Control</span><span style={{ color:T.green, fontWeight:900, fontSize:16 }}>Pro</span></div></>}
            {!isMobile && <span style={{ fontSize:18, fontWeight:800, color:T.text }}>{navItems.find(n=>n.id===tab)?.label||"Dashboard"}</span>}
            {lowStock.length>0 && <Chip color={T.red} bg={T.redBg}>⚠ {lowStock.length}</Chip>}
            {saving && <Chip color={T.orange} bg={T.orangeBg}>💾 Guardando</Chip>}
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {!isMobile && isAdmin && businessId && <button onClick={()=>setShowMovForm("sale")} style={S.btnPrimary({padding:"8px 16px",fontSize:13})}>+ Venta</button>}
            {!isMobile && isAdmin && businessId && <button onClick={()=>setShowMovForm("purchase")} style={{ ...S.btnPrimary({background:T.blue,padding:"8px 16px",fontSize:13}) }}>+ Compra</button>}
            {isMobile && <button onClick={toggleDark} style={S.btnSecondary({padding:"6px 10px",fontSize:16})}>{dark?"☀️":"🌙"}</button>}
            {isMobile && <button onClick={logout} style={S.btnSecondary({padding:"6px 10px",fontSize:12})}>Salir</button>}
          </div>
        </div>

        <div style={{ flex:1, padding:contentPad, overflowY:"auto" }}>

          {tab==="superadmin" && isSuperadmin && <div><h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 16px", color:T.text }}>⚙️ Panel Superadmin</h2><SuperadminPanel /></div>}

          {tab!=="superadmin" && !businessId && (
            <Card style={{ textAlign:"center", padding:40 }}>
              <p style={{ fontSize:32, margin:"0 0 12px" }}>🏢</p>
              <p style={{ color:T.text, fontWeight:700, fontSize:16, margin:"0 0 8px" }}>Sin negocio asignado</p>
              <p style={{ color:T.muted, fontSize:13 }}>Contactá al administrador.</p>
            </Card>
          )}

          {tab!=="superadmin" && businessId && (loading ? <Loader text="Cargando datos..." /> : <>

            {/* DASHBOARD */}
            {tab==="dashboard" && <div>
              <div style={{ marginBottom:20 }}>
                <h2 style={{ fontSize:22, fontWeight:900, margin:"0 0 2px", color:T.text }}>Hola, {perfil?.nombre?.split(" ")[0]||"Admin"} 👋</h2>
                <p style={{ color:T.muted, margin:0, fontSize:13 }}>{new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}</p>
              </div>
              <div style={{ background:T.card, borderRadius:20, padding:24, marginBottom:16, border:`1px solid ${T.border}`, textAlign:"center", boxShadow:T.shadow }}>
                <p style={{ color:T.muted, fontSize:12, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:0.8 }}>Ventas hoy</p>
                <p style={{ color:T.green, fontWeight:900, fontSize:48, margin:0, lineHeight:1 }}>{fmt(todaySales)}</p>
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                {[
                  { icon:"📤", label:"Nueva venta", color:T.green, bg:T.greenBg, action:()=>setShowMovForm("sale") },
                  { icon:"📥", label:"Nueva compra", color:T.blue, bg:T.blueBg, action:()=>isAdmin&&setShowMovForm("purchase") },
                  { icon:"💸", label:"Gasto", color:T.orange, bg:T.orangeBg, action:()=>setShowExpenseForm(true) },
                  { icon:"📈", label:"Finanzas", color:T.green, bg:T.greenBg, action:()=>setTab("finance") },
                ].map(a=>(
                  <button key={a.label} onClick={a.action} style={{ flex:1, background:a.bg, border:`1px solid ${T.border}`, borderRadius:16, padding:"12px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", boxShadow:T.shadow }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:T.card, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:T.shadow }}>{a.icon}</div>
                    <span style={{ fontSize:11, fontWeight:600, color:a.color }}>{a.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                <StatCard label="Total ventas" value={fmt(totalSales)} color={T.blue} bg={T.blueBg} icon="📈" />
                <StatCard label="Gastos" value={fmt(totalExpenses)} color={T.orange} bg={T.orangeBg} icon="💸" />
                <StatCard label="Ganancia neta" value={fmt(totalProfit)} color={totalProfit>=0?T.green:T.red} bg={totalProfit>=0?T.greenBg:T.redBg} icon="💵" />
                <StatCard label="Inventario" value={fmt(inventoryValue)} color={T.text2} bg={T.card} icon="🏪" />
              </div>
              {totalClientDebt>0 && (
                <div style={{ background:T.blueBg, border:`1.5px solid ${T.blue}33`, borderRadius:16, padding:14, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:T.blue, fontWeight:700, fontSize:13 }}>👥 Te deben clientes</span>
                  <span style={{ color:T.blue, fontWeight:900, fontSize:16 }}>{fmt(totalClientDebt)}</span>
                </div>
              )}
              {totalSupplierDebt>0 && (
                <div style={{ background:T.orangeBg, border:`1.5px solid ${T.orange}33`, borderRadius:16, padding:14, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:T.orange, fontWeight:700, fontSize:13 }}>🏭 Debés a proveedores</span>
                  <span style={{ color:T.orange, fontWeight:900, fontSize:16 }}>{fmt(totalSupplierDebt)}</span>
                </div>
              )}
              {lowStock.length>0 && (
                <div style={{ background:T.redBg, border:`1.5px solid ${T.red}33`, borderRadius:16, padding:16, marginBottom:16 }}>
                  <p style={{ color:T.red, fontWeight:700, margin:"0 0 10px", fontSize:13 }}>⚠ Stock bajo</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {lowStock.map(p=>(
                      <div key={p.id} style={{ background:T.card, borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:T.shadow }}>
                        <ProductAvatar product={p} size={22} />
                        <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{p.name}</span>
                        <Chip color={T.red} bg={T.redBg}>{p.stock}/{p.minStock}</Chip>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {products.length>0 && (
                <Card style={{ background:T.card, border:`1px solid ${T.border}` }}>
                  <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:15, color:T.text }}>🏆 Productos destacados</p>
                  {rentData.slice(0,5).map((p,i)=>(
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<4?`1px solid ${T.border}`:"none" }}>
                      <span style={{ color:T.muted, width:18, fontSize:12, fontWeight:700 }}>#{i+1}</span>
                      <ProductAvatar product={p} size={36} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontWeight:700, fontSize:14, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                        <p style={{ margin:0, color:T.muted, fontSize:12 }}>{p.sold} vendidas · {p.margin}% margen</p>
                      </div>
                      <span style={{ color:T.green, fontWeight:800, fontSize:14 }}>{fmt(p.profit)}</span>
                    </div>
                  ))}
                </Card>
              )}
            </div>}

            {/* PRODUCTS */}
            {tab==="products" && <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h2 style={{ fontSize:20, fontWeight:900, margin:0, color:T.text }}>Productos</h2>
                <div style={{ display:"flex", gap:8 }}>
                  {isAdmin && <button onClick={()=>setShowCatManager(true)} style={S.btnSecondary({padding:"8px 12px",fontSize:13})}>🗂 Cats</button>}
                  {isAdmin && <button onClick={()=>{ setEditProduct(null); setShowProductForm(true); }} style={S.btnPrimary({padding:"9px 14px",fontSize:13})}>+ Nuevo</button>}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{ ...S.inp, flex:1 }} />
                <button onClick={()=>setShowScanner(true)} style={S.btnSecondary({padding:"12px 14px"})}>📷</button>
              </div>
              <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
                {["Todas",...categories].map(c=>(
                  <button key={c} onClick={()=>setFilterCat(c)}
                    style={{ background:filterCat===c?T.green:T.card, border:`1.5px solid ${filterCat===c?T.green:T.border}`, color:filterCat===c?"#fff":T.text2, borderRadius:20, padding:"6px 16px", fontSize:12, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                    {c}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {products.filter(p=>{
                  const ms = p.name.toLowerCase().includes(search.toLowerCase())||p.barcode?.includes(search)||p.supplier?.toLowerCase().includes(search.toLowerCase())||(p.sku||"").toLowerCase().includes(search.toLowerCase());
                  return ms&&(filterCat==="Todas"||p.category===filterCat);
                }).map(p=>{
                  const isLow = p.stock<=p.minStock;
                  const margin = p.price&&p.cost?(((p.price-p.cost)/p.price)*100).toFixed(0):0;
                  return (
                    <div key={p.id} style={{ background:T.card, borderRadius:16, padding:14, border:`1.5px solid ${isLow?T.red+"55":T.border}`, display:"flex", alignItems:"center", gap:12, boxShadow:T.shadow }}>
                      <ProductAvatar product={p} size={54} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, flexWrap:"wrap" }}>
                          <span style={{ fontWeight:800, fontSize:15, color:T.text }}>{p.name}</span>
                          {p.brand && <Chip color={T.text2} bg={T.card2}>{p.brand}</Chip>}
                          <Chip color={T.blue} bg={T.blueBg}>{p.category}</Chip>
                          {isLow && <Chip color={T.red} bg={T.redBg}>↓ Stock</Chip>}
                        </div>
                        <p style={{ margin:0, color:T.muted, fontSize:12 }}>
                          {p.sku && <span>#{p.sku} · </span>}🏷 {p.barcode||"Sin código"} · {p.supplier}
                        </p>
                        <div style={{ display:"flex", gap:12, marginTop:6, flexWrap:"wrap", alignItems:"center" }}>
                          <span style={{ color:T.green, fontWeight:800, fontSize:15 }}>{fmt(p.price)}</span>
                          <span style={{ color:isLow?T.red:T.muted, fontSize:13 }}>Stock: <strong style={{ color:isLow?T.red:T.text2 }}>{p.stock}</strong></span>
                          <Chip color={Number(margin)>30?T.green:Number(margin)>15?T.orange:T.red} bg={Number(margin)>30?T.greenBg:Number(margin)>15?T.orangeBg:T.redBg}>M: {margin}%</Chip>
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                        <button onClick={()=>{ setShowMovForm("sale"); setPreselProduct(p); }} style={S.btnGhost(T.green,T.greenBg,{padding:"6px 10px",fontSize:12})}>Vender</button>
                        {isAdmin && <>
                          <button onClick={()=>{ setEditProduct(p); setShowProductForm(true); }} style={S.btnGhost(T.blue,T.blueBg,{padding:"6px 10px",fontSize:12})}>Editar</button>
                          <button onClick={()=>deleteProduct(p.id)} style={S.btnGhost(T.red,T.redBg,{padding:"6px 10px",fontSize:12})}>Eliminar</button>
                        </>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>}

            {/* MOVEMENTS */}
            {tab==="movements" && <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
                <h2 style={{ fontSize:20, fontWeight:900, margin:0, color:T.text }}>Movimientos</h2>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>setShowMovForm("sale")} style={S.btnPrimary({padding:"9px 14px",fontSize:13})}>+ Venta</button>
                  {isAdmin && <button onClick={()=>setShowMovForm("purchase")} style={{ ...S.btnPrimary({background:T.blue,padding:"9px 14px",fontSize:13}) }}>+ Compra</button>}
                </div>
              </div>
              <Card style={{ background:T.card, border:`1px solid ${T.border}`, marginBottom:14, padding:14 }}>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:140 }}>
                    <span style={{ color:T.muted, fontSize:12 }}>Desde:</span>
                    <input style={{ ...S.inp, flex:1, padding:"8px 12px" }} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} />
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:140 }}>
                    <span style={{ color:T.muted, fontSize:12 }}>Hasta:</span>
                    <input style={{ ...S.inp, flex:1, padding:"8px 12px" }} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} />
                  </div>
                  {(filterFrom||filterTo) && <button onClick={()=>{ setFilterFrom(""); setFilterTo(""); }} style={S.btnSecondary({padding:"8px 12px"})}>✕</button>}
                </div>
                <div style={{ display:"flex", gap:16, marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
                  <span style={{ color:T.muted, fontSize:12 }}>Ventas: <strong style={{ color:T.green }}>{fmt(filtMovements.filter(m=>m.type==="sale").reduce((s,m)=>s+m.total,0))}</strong></span>
                  <span style={{ color:T.muted, fontSize:12 }}>Compras: <strong style={{ color:T.blue }}>{fmt(filtMovements.filter(m=>m.type==="purchase").reduce((s,m)=>s+m.total,0))}</strong></span>
                </div>
              </Card>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filtMovements.map(m=>{
                  const p=products.find(pr=>pr.id===m.productId);
                  const pm=PAY_METHODS.find(pm=>pm.id===m.payMethod);
                  const cl=clients.find(c=>c.id===m.clientId);
                  const st=SALE_STATES.find(s=>s.id===m.state);
                  return (
                    <div key={m.id} style={{ background:T.card, borderRadius:14, padding:14, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:12, boxShadow:T.shadow }}>
                      <div style={{ width:38, height:38, borderRadius:12, background:m.type==="sale"?T.greenBg:T.blueBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                        {m.type==="sale"?"📤":"📥"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                          <span style={{ fontWeight:700, fontSize:14, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 }}>{p?.name||"Eliminado"}</span>
                          <Chip color={m.type==="sale"?T.green:T.blue} bg={m.type==="sale"?T.greenBg:T.blueBg}>{m.type==="sale"?"Venta":"Compra"}</Chip>
                          {st && <Chip color={st.color} bg={st.bg}>{st.label}</Chip>}
                          {pm && <Chip color={pm.color} bg={T.greenBg}>{pm.label}</Chip>}
                        </div>
                        <p style={{ margin:"3px 0 0", color:T.muted, fontSize:11 }}>
                          {fmtDate(m.date)} · {m.qty} uds{cl?` · 👤 ${cl.name}`:""}
                          {m.note?` · ${m.note}`:""}
                        </p>
                      </div>
                      <span style={{ fontWeight:800, color:m.type==="sale"?T.green:T.blue, fontSize:15, whiteSpace:"nowrap" }}>{fmt(m.total)}</span>
                      {isAdmin && <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>{ setEditMovement(m); setShowMovForm(m.type); }} style={S.btnGhost(T.blue,T.blueBg,{padding:"5px 8px",fontSize:12})}>✏️</button>
                        <button onClick={()=>deleteMovement(m)} style={S.btnGhost(T.red,T.redBg,{padding:"5px 8px",fontSize:12})}>🗑</button>
                      </div>}
                    </div>
                  );
                })}
                {filtMovements.length===0 && <Card style={{ background:T.card, border:`1px solid ${T.border}`, textAlign:"center", padding:24 }}><p style={{ color:T.muted, fontSize:13 }}>Sin movimientos.</p></Card>}
              </div>
            </div>}

            {/* CLIENTS */}
            {tab==="clients" && <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h2 style={{ fontSize:20, fontWeight:900, margin:0, color:T.text }}>Clientes</h2>
                {isAdmin && <button onClick={()=>{ setEditClient(null); setShowClientForm(true); }} style={S.btnPrimary({padding:"9px 14px",fontSize:13})}>+ Nuevo</button>}
              </div>
              {totalClientDebt>0 && (
                <div style={{ background:T.redBg, border:`1.5px solid ${T.red}33`, borderRadius:14, padding:14, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:T.red, fontWeight:700, fontSize:13 }}>Total pendiente de cobro</span>
                  <span style={{ color:T.red, fontWeight:900, fontSize:18 }}>{fmt(totalClientDebt)}</span>
                </div>
              )}
              {clients.length===0 && <Card style={{ background:T.card, border:`1px solid ${T.border}`, textAlign:"center", padding:32 }}><p style={{ color:T.muted }}>No hay clientes todavía.</p></Card>}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {clients.map(c=>{
                  const purchases = movements.filter(m=>m.clientId===c.id&&m.type==="sale");
                  const total = purchases.reduce((s,m)=>s+m.total,0);
                  const hasDebt = (c.balance||0) > 0;
                  return (
                    <div key={c.id} style={{ background:T.card, borderRadius:16, padding:14, border:`1.5px solid ${hasDebt?T.red+"55":T.border}`, display:"flex", alignItems:"center", gap:12, boxShadow:T.shadow }}>
                      <div style={{ width:46, height:46, borderRadius:"50%", background:T.greenBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:T.green, flexShrink:0 }}>
                        {(c.name||"?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontWeight:800, fontSize:14, color:T.text }}>{c.name}</p>
                        <p style={{ margin:"2px 0 0", color:T.muted, fontSize:12 }}>
                          {c.phone&&<span>📞 {c.phone} · </span>}
                          {c.instagram&&<span>📸 {c.instagram} · </span>}
                          {purchases.length} compras
                        </p>
                        {hasDebt && <p style={{ margin:"4px 0 0", color:T.red, fontWeight:700, fontSize:12 }}>Debe: {fmt(c.balance)}</p>}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <p style={{ margin:0, fontWeight:800, color:T.green, fontSize:14 }}>{fmt(total)}</p>
                        <p style={{ margin:0, color:T.muted, fontSize:11 }}>total gastado</p>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {hasDebt && isAdmin && <button onClick={()=>setShowPaymentForm({type:"client",entity:c})} style={S.btnGhost(T.green,T.greenBg,{padding:"5px 8px",fontSize:11})}>💵 Cobrar</button>}
                        {isAdmin && <button onClick={()=>{ setEditClient(c); setShowClientForm(true); }} style={S.btnGhost(T.blue,T.blueBg,{padding:"5px 8px",fontSize:12})}>✏️</button>}
                        {isAdmin && <button onClick={async()=>{ if(window.confirm("¿Eliminar?")) await fbDelete(businessId,COL.clients,c.id); }} style={S.btnGhost(T.red,T.redBg,{padding:"5px 8px",fontSize:12})}>🗑</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>}

            {/* SUPPLIERS */}
            {tab==="suppliers" && <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h2 style={{ fontSize:20, fontWeight:900, margin:0, color:T.text }}>Proveedores</h2>
                {isAdmin && <button onClick={()=>{ setEditSupplier(null); setShowSupplierForm(true); }} style={S.btnPrimary({padding:"9px 14px",fontSize:13})}>+ Nuevo</button>}
              </div>
              {totalSupplierDebt>0 && (
                <div style={{ background:T.orangeBg, border:`1.5px solid ${T.orange}33`, borderRadius:14, padding:14, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:T.orange, fontWeight:700, fontSize:13 }}>Total pendiente de pago</span>
                  <span style={{ color:T.orange, fontWeight:900, fontSize:18 }}>{fmt(totalSupplierDebt)}</span>
                </div>
              )}
              {suppliers.length===0 && <Card style={{ background:T.card, border:`1px solid ${T.border}`, textAlign:"center", padding:32 }}><p style={{ color:T.muted }}>No hay proveedores todavía.</p></Card>}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {suppliers.map(s=>{
                  const prods = products.filter(p=>(p.supplier||"").toLowerCase()===s.name.toLowerCase());
                  const totalBought = movements.filter(m=>m.type==="purchase"&&prods.some(p=>p.id===m.productId)).reduce((acc,m)=>acc+m.total,0);
                  const hasDebt = (s.balance||0) > 0;
                  return (
                    <div key={s.id} style={{ background:T.card, borderRadius:16, padding:14, border:`1.5px solid ${hasDebt?T.orange+"55":T.border}`, display:"flex", alignItems:"center", gap:12, boxShadow:T.shadow }}>
                      <div style={{ width:46, height:46, borderRadius:12, background:T.blueBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:T.blue, flexShrink:0 }}>
                        {(s.name||"?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontWeight:800, fontSize:14, color:T.text }}>{s.name}</p>
                        <p style={{ margin:"2px 0 0", color:T.muted, fontSize:12 }}>
                          {s.phone&&<span>📞 {s.phone} · </span>}
                          {s.instagram&&<span>📸 {s.instagram} · </span>}
                          {prods.length} productos
                        </p>
                        {hasDebt && <p style={{ margin:"4px 0 0", color:T.orange, fontWeight:700, fontSize:12 }}>Debo: {fmt(s.balance)}</p>}
                        {s.notes && <p style={{ margin:"2px 0 0", color:T.muted, fontSize:11 }}>{s.notes}</p>}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <p style={{ margin:0, fontWeight:800, color:T.blue, fontSize:14 }}>{fmt(totalBought)}</p>
                        <p style={{ margin:0, color:T.muted, fontSize:11 }}>total comprado</p>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {hasDebt && isAdmin && <button onClick={()=>setShowPaymentForm({type:"supplier",entity:s})} style={S.btnGhost(T.orange,T.orangeBg,{padding:"5px 8px",fontSize:11})}>💸 Pagar</button>}
                        {isAdmin && <button onClick={()=>{ setEditSupplier(s); setShowSupplierForm(true); }} style={S.btnGhost(T.blue,T.blueBg,{padding:"5px 8px",fontSize:12})}>✏️</button>}
                        {isAdmin && <button onClick={async()=>{ if(window.confirm("¿Eliminar?")) await fbDelete(businessId,COL.suppliers,s.id); }} style={S.btnGhost(T.red,T.redBg,{padding:"5px 8px",fontSize:12})}>🗑</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>}

            {/* EXPENSES */}
            {tab==="expenses" && <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h2 style={{ fontSize:20, fontWeight:900, margin:0, color:T.text }}>Gastos</h2>
                <button onClick={()=>{ setEditExpense(null); setShowExpenseForm(true); }} style={S.btnPrimary({padding:"9px 14px",fontSize:13})}>+ Nuevo</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                <StatCard label="Total gastos" value={fmt(totalExpenses)} color={T.orange} bg={T.orangeBg} icon="💸" />
                <StatCard label="Este mes" value={fmt(expenses.filter(e=>e.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,e)=>s+e.amount,0))} color={T.red} bg={T.redBg} icon="📅" />
              </div>
              {expenses.length===0 && <Card style={{ background:T.card, border:`1px solid ${T.border}`, textAlign:"center", padding:32 }}><p style={{ color:T.muted }}>No hay gastos registrados.</p></Card>}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {expenses.map(e=>(
                  <div key={e.id} style={{ background:T.card, borderRadius:14, padding:14, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:12, boxShadow:T.shadow }}>
                    <div style={{ width:38, height:38, borderRadius:12, background:T.orangeBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>💸</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontWeight:700, fontSize:14, color:T.text }}>{e.concept}</p>
                      <p style={{ margin:"2px 0 0", color:T.muted, fontSize:12 }}>{fmtDate(e.date)} · <Chip color={T.orange} bg={T.orangeBg}>{e.category}</Chip></p>
                    </div>
                    <span style={{ fontWeight:800, color:T.orange, fontSize:15, whiteSpace:"nowrap" }}>{fmt(e.amount)}</span>
                    {isAdmin && <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{ setEditExpense(e); setShowExpenseForm(true); }} style={S.btnGhost(T.blue,T.blueBg,{padding:"5px 8px",fontSize:12})}>✏️</button>
                      <button onClick={async()=>{ if(window.confirm("¿Eliminar?")) await fbDelete(businessId,COL.expenses,e.id); }} style={S.btnGhost(T.red,T.redBg,{padding:"5px 8px",fontSize:12})}>🗑</button>
                    </div>}
                  </div>
                ))}
              </div>
            </div>}

            {/* FINANCE */}
            {tab==="finance" && <div>
              <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 16px", color:T.text }}>📈 Finanzas</h2>
              <div style={{ display:"flex", gap:8, marginBottom:18 }}>
                {[{id:"balance",label:"Balance"},{id:"clients",label:"Clientes"},{id:"suppliers",label:"Proveedores"}].map(t=>(
                  <button key={t.id} onClick={()=>setFinanceTab(t.id)}
                    style={{ ...S.btnSecondary(), background:financeTab===t.id?T.green:T.card, borderColor:financeTab===t.id?T.green:T.border2, color:financeTab===t.id?"#fff":T.text2, padding:"8px 18px", fontSize:13 }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {financeTab==="balance" && <>
                <div style={{ background:T.card, borderRadius:20, padding:24, marginBottom:16, border:`1px solid ${T.border}`, textAlign:"center" }}>
                  <p style={{ color:T.muted, fontSize:12, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:0.8 }}>Ganancia neta real</p>
                  <p style={{ color:totalProfit>=0?T.green:T.red, fontWeight:900, fontSize:40, margin:0 }}>{fmt(totalProfit)}</p>
                  <p style={{ color:T.muted, fontSize:12, margin:"6px 0 0" }}>Ventas {fmt(totalSales)} − Costos {fmt(totalCost)} − Gastos {fmt(totalExpenses)}</p>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                  <StatCard label="Ventas totales" value={fmt(totalSales)} color={T.green} bg={T.greenBg} icon="💰" />
                  <StatCard label="Costo de ventas" value={fmt(totalCost)} color={T.orange} bg={T.orangeBg} icon="📦" />
                  <StatCard label="Gastos" value={fmt(totalExpenses)} color={T.red} bg={T.redBg} icon="💸" />
                  <StatCard label="Inventario" value={fmt(inventoryValue)} color={T.blue} bg={T.blueBg} icon="🏪" />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                  <div style={{ background:T.blueBg, border:`1px solid ${T.blue}33`, borderRadius:16, padding:16 }}>
                    <p style={{ color:T.muted, fontSize:12, margin:"0 0 4px" }}>Te deben clientes</p>
                    <p style={{ color:T.blue, fontWeight:800, fontSize:20, margin:0 }}>{fmt(totalClientDebt)}</p>
                  </div>
                  <div style={{ background:T.orangeBg, border:`1px solid ${T.orange}33`, borderRadius:16, padding:16 }}>
                    <p style={{ color:T.muted, fontSize:12, margin:"0 0 4px" }}>Debés a proveedores</p>
                    <p style={{ color:T.orange, fontWeight:800, fontSize:20, margin:0 }}>{fmt(totalSupplierDebt)}</p>
                  </div>
                </div>
                <Card style={{ background:T.card, border:`1px solid ${T.border}`, marginBottom:16 }}>
                  <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:14, color:T.text }}>Por método de pago</p>
                  {PAY_METHODS.map(m=>{
                    const total = movements.filter(mv=>mv.type==="sale"&&mv.payMethod===m.id).reduce((s,mv)=>s+mv.total,0);
                    const pct = totalSales ? Math.round((total/totalSales)*100) : 0;
                    return (
                      <div key={m.id} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:13, color:T.text2 }}>{m.label}</span>
                          <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{fmt(total)} <span style={{ color:T.muted, fontWeight:400 }}>({pct}%)</span></span>
                        </div>
                        <div style={{ background:T.border, borderRadius:8, height:6, overflow:"hidden" }}>
                          <div style={{ width:`${pct}%`, height:"100%", background:m.color, borderRadius:8, transition:"width 0.6s" }} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
                <Card style={{ background:T.card, border:`1px solid ${T.border}` }}>
                  <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:14, color:T.text }}>Gastos por categoría</p>
                  {EXPENSE_CATS.map(cat=>{
                    const total = expenses.filter(e=>e.category===cat).reduce((s,e)=>s+e.amount,0);
                    if(!total) return null;
                    const pct = totalExpenses ? Math.round((total/totalExpenses)*100) : 0;
                    return (
                      <div key={cat} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:13, color:T.text2 }}>{cat}</span>
                          <span style={{ fontSize:13, fontWeight:700, color:T.orange }}>{fmt(total)} <span style={{ color:T.muted, fontWeight:400 }}>({pct}%)</span></span>
                        </div>
                        <div style={{ background:T.border, borderRadius:8, height:6, overflow:"hidden" }}>
                          <div style={{ width:`${pct}%`, height:"100%", background:T.orange, borderRadius:8 }} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </>}

              {financeTab==="clients" && <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                  <StatCard label="Total me deben" value={fmt(totalClientDebt)} color={T.red} bg={T.redBg} icon="👥" />
                  <StatCard label="Con deuda" value={clients.filter(c=>(c.balance||0)>0).length} color={T.orange} bg={T.orangeBg} icon="⚠️" />
                </div>
                {clients.filter(c=>(c.balance||0)>0).length===0 && (
                  <div style={{ background:T.greenBg, borderRadius:14, padding:16, textAlign:"center", marginBottom:16 }}>
                    <p style={{ color:T.green, fontWeight:700, margin:0 }}>✅ Sin deudas pendientes</p>
                  </div>
                )}
                {clients.filter(c=>(c.balance||0)>0).map(c=>(
                  <div key={c.id} style={{ background:T.card, borderRadius:16, padding:14, border:`1.5px solid ${T.red}44`, marginBottom:10, boxShadow:T.shadow }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                      <div style={{ width:42, height:42, borderRadius:"50%", background:T.redBg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:T.red, fontSize:16 }}>{c.name[0]}</div>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:0, fontWeight:800, color:T.text, fontSize:14 }}>{c.name}</p>
                        <p style={{ margin:"2px 0 0", color:T.muted, fontSize:12 }}>{c.phone} · {c.instagram}</p>
                      </div>
                      <p style={{ margin:0, color:T.red, fontWeight:900, fontSize:18 }}>{fmt(c.balance)}</p>
                    </div>
                    <div style={{ background:T.redBg, borderRadius:8, height:6, overflow:"hidden", marginBottom:10 }}>
                      <div style={{ width:`${Math.min(100,((c.balance||0)/Math.max(...clients.map(cl=>cl.balance||0)))*100)}%`, height:"100%", background:T.red, borderRadius:8 }} />
                    </div>
                    {isAdmin && <button onClick={()=>setShowPaymentForm({type:"client",entity:c})} style={{ ...S.btnPrimary(), width:"100%", padding:"10px" }}>💵 Registrar cobro</button>}
                  </div>
                ))}
                <p style={{ fontWeight:700, color:T.muted, fontSize:12, textTransform:"uppercase", margin:"16px 0 8px" }}>Últimos cobros</p>
                {payments.filter(p=>p.type==="client").slice(0,5).map(p=>(
                  <div key={p.id} style={{ background:T.card, borderRadius:12, padding:"10px 14px", border:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:T.greenBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✅</div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:600, color:T.text, fontSize:13 }}>{p.entityName}</p>
                      <p style={{ margin:0, color:T.muted, fontSize:11 }}>{fmtDate(p.date)} · {p.note}</p>
                    </div>
                    <span style={{ fontWeight:800, color:T.green, fontSize:14 }}>{fmt(p.amount)}</span>
                  </div>
                ))}
              </>}

              {financeTab==="suppliers" && <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                  <StatCard label="Total debo" value={fmt(totalSupplierDebt)} color={T.orange} bg={T.orangeBg} icon="🏭" />
                  <StatCard label="Con deuda" value={suppliers.filter(s=>(s.balance||0)>0).length} color={T.red} bg={T.redBg} icon="⚠️" />
                </div>
                {suppliers.filter(s=>(s.balance||0)>0).length===0 && (
                  <div style={{ background:T.greenBg, borderRadius:14, padding:16, textAlign:"center", marginBottom:16 }}>
                    <p style={{ color:T.green, fontWeight:700, margin:0 }}>✅ Sin deudas pendientes</p>
                  </div>
                )}
                {suppliers.filter(s=>(s.balance||0)>0).map(s=>(
                  <div key={s.id} style={{ background:T.card, borderRadius:16, padding:14, border:`1.5px solid ${T.orange}44`, marginBottom:10, boxShadow:T.shadow }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                      <div style={{ width:42, height:42, borderRadius:12, background:T.orangeBg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:T.orange, fontSize:16 }}>{s.name[0]}</div>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:0, fontWeight:800, color:T.text, fontSize:14 }}>{s.name}</p>
                        <p style={{ margin:"2px 0 0", color:T.muted, fontSize:12 }}>{s.phone} · {s.web}</p>
                      </div>
                      <p style={{ margin:0, color:T.orange, fontWeight:900, fontSize:18 }}>{fmt(s.balance)}</p>
                    </div>
                    <div style={{ background:T.orangeBg, borderRadius:8, height:6, overflow:"hidden", marginBottom:10 }}>
                      <div style={{ width:`${Math.min(100,((s.balance||0)/Math.max(...suppliers.map(sp=>sp.balance||0)))*100)}%`, height:"100%", background:T.orange, borderRadius:8 }} />
                    </div>
                    {isAdmin && <button onClick={()=>setShowPaymentForm({type:"supplier",entity:s})} style={{ ...S.btnPrimary({background:T.orange}), width:"100%", padding:"10px" }}>💸 Registrar pago</button>}
                  </div>
                ))}
                <p style={{ fontWeight:700, color:T.muted, fontSize:12, textTransform:"uppercase", margin:"16px 0 8px" }}>Últimos pagos</p>
                {payments.filter(p=>p.type==="supplier").slice(0,5).map(p=>(
                  <div key={p.id} style={{ background:T.card, borderRadius:12, padding:"10px 14px", border:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:T.greenBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✅</div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:600, color:T.text, fontSize:13 }}>{p.entityName}</p>
                      <p style={{ margin:0, color:T.muted, fontSize:11 }}>{fmtDate(p.date)} · {p.note}</p>
                    </div>
                    <span style={{ fontWeight:800, color:T.green, fontSize:14 }}>{fmt(p.amount)}</span>
                  </div>
                ))}
              </>}
            </div>}

            {/* RENTABILITY */}
            {tab==="rentability" && <div>
              <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 16px", color:T.text }}>📊 Rentabilidad</h2>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                <StatCard label="Ingresos" value={fmt(totalSales)} color={T.green} bg={T.greenBg} icon="💰" />
                <StatCard label="Costo ventas" value={fmt(totalCost)} color={T.orange} bg={T.orangeBg} icon="📦" />
                <StatCard label="Gastos" value={fmt(totalExpenses)} color={T.red} bg={T.redBg} icon="💸" />
                <StatCard label="Ganancia neta" value={fmt(totalProfit)} color={totalProfit>=0?T.green:T.red} bg={totalProfit>=0?T.greenBg:T.redBg} icon="💵" />
              </div>
              <Card style={{ background:T.card, border:`1px solid ${T.border}`, marginBottom:16, overflowX:"auto" }}>
                <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:15, color:T.text }}>📋 Por producto</p>
                {products.length===0 ? <p style={{ color:T.muted, textAlign:"center", padding:16 }}>Sin datos</p> :
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead><tr style={{ borderBottom:`2px solid ${T.border}` }}>
                    {["Producto","Vendido","Ingresos","Ganancia","Margen","Stock"].map(h=>(
                      <th key={h} style={{ color:T.muted, fontWeight:700, padding:"8px", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{rentData.map((p,i)=>(
                    <tr key={p.id} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?"transparent":T.card2 }}>
                      <td style={{ padding:"10px 8px" }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><ProductAvatar product={p} size={26} /><span style={{ color:T.text, fontWeight:600 }}>{p.name}</span></div></td>
                      <td style={{ padding:"10px 8px", color:T.text2 }}>{p.sold}</td>
                      <td style={{ padding:"10px 8px", color:T.blue, fontWeight:600 }}>{fmt(p.revenue)}</td>
                      <td style={{ padding:"10px 8px", color:p.profit>=0?T.green:T.red, fontWeight:700 }}>{fmt(p.profit)}</td>
                      <td style={{ padding:"10px 8px" }}><Chip color={Number(p.margin)>30?T.green:Number(p.margin)>15?T.orange:T.red} bg={Number(p.margin)>30?T.greenBg:Number(p.margin)>15?T.orangeBg:T.redBg}>{p.margin}%</Chip></td>
                      <td style={{ padding:"10px 8px", color:p.stock<=p.minStock?T.red:T.text2, fontWeight:p.stock<=p.minStock?700:400 }}>{p.stock}</td>
                    </tr>
                  ))}</tbody>
                </table>}
              </Card>
              <Card style={{ background:T.card, border:`1px solid ${T.border}`, marginBottom:16 }}>
                <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:15, color:T.text }}>👥 Mejores clientes</p>
                {clients.length===0 && <p style={{ color:T.muted, fontSize:13 }}>Sin clientes aún.</p>}
                {clients.map(c=>{
                  const total = movements.filter(m=>m.clientId===c.id&&m.type==="sale").reduce((s,m)=>s+m.total,0);
                  if(!total) return null;
                  return (
                    <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:T.greenBg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:T.green, fontSize:13 }}>{c.name[0]}</div>
                      <span style={{ flex:1, fontWeight:600, color:T.text, fontSize:13 }}>{c.name}</span>
                      <span style={{ fontWeight:800, color:T.green, fontSize:14 }}>{fmt(total)}</span>
                    </div>
                  );
                })}
              </Card>
              <Card style={{ background:T.card, border:`1px solid ${T.border}` }}>
                <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:15, color:T.text }}>💡 Sugerencias</p>
                {rentData.filter(p=>p.rotation==="Baja"&&p.stock>p.minStock*2).map(p=>(
                  <div key={`slow-${p.id}`} style={{ background:T.orangeBg, border:`1px solid ${T.orange}44`, borderRadius:12, padding:14, marginBottom:10, display:"flex", gap:12 }}>
                    <ProductAvatar product={p} size={32} />
                    <div><p style={{ margin:0, fontWeight:700, fontSize:13, color:T.text }}>{p.name} — stock parado</p><p style={{ margin:"4px 0 0", color:T.muted, fontSize:12 }}>Tiene {p.stock} uds y vendió solo {p.sold}. Considerá una promoción.</p></div>
                  </div>
                ))}
                {lowStock.map(p=>(
                  <div key={`low-${p.id}`} style={{ background:T.redBg, border:`1px solid ${T.red}44`, borderRadius:12, padding:14, marginBottom:10, display:"flex", gap:12 }}>
                    <ProductAvatar product={p} size={32} />
                    <div><p style={{ margin:0, fontWeight:700, fontSize:13, color:T.text }}>{p.name} — reponer urgente</p><p style={{ margin:"4px 0 0", color:T.muted, fontSize:12 }}>Solo {p.stock} uds (mín: {p.minStock}). Proveedor: {p.supplier||"N/A"}.</p></div>
                  </div>
                ))}
                {rentData.filter(p=>Number(p.margin)<15&&p.sold>0).map(p=>(
                  <div key={`margin-${p.id}`} style={{ background:T.blueBg, border:`1px solid ${T.blue}44`, borderRadius:12, padding:14, marginBottom:10, display:"flex", gap:12 }}>
                    <ProductAvatar product={p} size={32} />
                    <div><p style={{ margin:0, fontWeight:700, fontSize:13, color:T.text }}>{p.name} — margen bajo ({p.margin}%)</p><p style={{ margin:"4px 0 0", color:T.muted, fontSize:12 }}>Revisá el precio o negociá con el proveedor.</p></div>
                  </div>
                ))}
                {rentData.filter(p=>p.rotation==="Baja"&&p.stock>p.minStock*2).length===0&&lowStock.length===0&&rentData.filter(p=>Number(p.margin)<15&&p.sold>0).length===0 && (
                  <div style={{ background:T.greenBg, borderRadius:12, padding:16, textAlign:"center" }}>
                    <p style={{ color:T.green, fontWeight:700, margin:0, fontSize:14 }}>✅ Todo en orden</p>
                  </div>
                )}
              </Card>
            </div>}

          </>)}
        </div>
      </div>

      {isMobile && BottomNav}

      {showScanner      && <BarcodeScanner onDetect={handleBarcode} onClose={()=>setShowScanner(false)} />}
      {showProductForm  && <ProductForm initial={editProduct} categories={categories} businessId={businessId} onSave={saveProduct} onClose={()=>{ setShowProductForm(false); setEditProduct(null); }} saving={saving} />}
      {showMovForm      && <MovementForm type={showMovForm} products={products} clients={clients} preselected={preselProduct} editData={editMovement} onSave={saveMovement} onClose={()=>{ setShowMovForm(null); setPreselProduct(null); setEditMovement(null); }} saving={saving} />}
      {showCashClose    && <CashClose movements={movements} products={products} onClose={()=>setShowCashClose(false)} />}
      {showQuickCash    && <QuickCash products={products} onSell={saveMovement} onClose={()=>setShowQuickCash(false)} />}
      {showCatManager   && <CategoryManager businessId={businessId} categories={categories} onUpdate={setCategories} onClose={()=>setShowCatManager(false)} />}
      {showClientForm   && <ClientForm initial={editClient} onSave={saveClient} onClose={()=>{ setShowClientForm(false); setEditClient(null); }} saving={saving} />}
      {showSupplierForm && <SupplierForm initial={editSupplier} onSave={saveSupplier} onClose={()=>{ setShowSupplierForm(false); setEditSupplier(null); }} saving={saving} />}
      {showExpenseForm  && <ExpenseForm initial={editExpense} onSave={saveExpense} onClose={()=>{ setShowExpenseForm(false); setEditExpense(null); }} saving={saving} />}
      {showPaymentForm  && <PaymentForm type={showPaymentForm.type} entity={showPaymentForm.entity} onSave={savePayment} onClose={()=>setShowPaymentForm(null)} saving={saving} />}
    </div>
    </ThemeCtx.Provider>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => { const unsub = onSessionChange(setSession); return unsub; }, []);

  if (session === undefined) return (
    <div style={{ minHeight:"100dvh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Loader text="Iniciando ControlPro..." />
    </div>
  );

  if (!session) return (
    <ThemeCtx.Provider value={{ dark: false, T: C }}>
      <Login />
    </ThemeCtx.Provider>
  );

  if (!session.perfil) return (
    <ThemeCtx.Provider value={{ dark: false, T: C }}>
      <div style={{ minHeight:"100dvh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"DM Sans,sans-serif" }}>
        <ControlProLogo size={60} />
        <p style={{ color:C.text, fontWeight:700, fontSize:16 }}>Cuenta sin perfil asignado</p>
        <p style={{ color:C.muted, fontSize:13 }}>Contactá al administrador.</p>
        <button onClick={logout} style={btnPrimary({padding:"12px 24px"})}>Cerrar sesión</button>
      </div>
    </ThemeCtx.Provider>
  );

  return <MainApp session={session} />;
}