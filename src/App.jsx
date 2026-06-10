import { useState, useEffect, useRef, useCallback } from "react";
import { login, logout, onSessionChange, createUser, createNegocio, listNegocios, listUsers, updateNegocio, updateUserProfile, db } from "./firebase";
import { useFirestore, fbAdd, fbUpdate, fbDelete, fbSet } from "./hooks/useFirestore";
import { ControlProLogo, Loader, Card, Chip, Field, Modal, StatCard, ProductAvatar } from "./components/UI";
import { C, PAY_METHODS, COL, SUPERADMIN_EMAIL, fmt, fmtDate, todayStr, inp, btnPrimary, btnSecondary, btnGhost } from "./constants";

// ─── BARCODE SCANNER ──────────────────────────────────────────────────────────
function BarcodeScanner({ onDetect, onClose }) {
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
      <div style={{ background:C.card, borderRadius:24, padding:24, width:"100%", maxWidth:340, boxShadow:C.shadowMd }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:16 }}>📷 Escáner</span>
          <button onClick={onClose} style={btnSecondary({padding:"4px 12px"})}>✕</button>
        </div>
        <div style={{ background:"#000", borderRadius:16, overflow:"hidden", position:"relative", aspectRatio:"4/3", marginBottom:14 }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <div style={{ width:"70%", height:80, border:`2.5px solid ${C.green}`, borderRadius:10, boxShadow:"0 0 0 9999px rgba(0,0,0,0.5)" }} />
          </div>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, textAlign:"center", color:"#fff", fontSize:12, background:"rgba(0,0,0,0.5)", padding:"6px 0" }}>{status}</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={manual} onChange={e=>setManual(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&manual.trim()&&(onDetect(manual.trim()),onClose())}
            placeholder="Código manual..." style={{ ...inp, flex:1 }} />
          <button onClick={()=>manual.trim()&&(onDetect(manual.trim()),onClose())} style={btnPrimary({padding:"12px 16px"})}>OK</button>
        </div>
      </div>
    </div>
  );
}

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────
function ImageUpload({ value, onChange, businessId }) {
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
            style={{ ...btnSecondary(), background:tab===t?C.greenBg:C.card, borderColor:tab===t?C.green:C.border2, color:tab===t?C.green:C.muted }}>
            {t==="upload"?"📁 Subir":"🌐 URL"}
          </button>
        ))}
        {value && <button type="button" onClick={()=>onChange(null)} style={btnGhost(C.red,C.redBg)}>🗑</button>}
      </div>
      {tab==="upload" && (
        <div onClick={()=>!uploading&&fileRef.current.click()}
          style={{ border:`2px dashed ${C.border2}`, borderRadius:14, padding:24, textAlign:"center", cursor:uploading?"wait":"pointer", background:C.card }}>
          {uploading
            ? <><div style={{ fontSize:28, marginBottom:8 }}>⏳</div><p style={{ color:C.muted, fontSize:13, margin:0 }}>Subiendo imagen...</p></>
            : value
              ? <img src={value} alt="preview" style={{ maxHeight:120, maxWidth:"100%", borderRadius:10, objectFit:"contain" }} />
              : <><div style={{ fontSize:36, marginBottom:8 }}>📷</div><p style={{ color:C.muted, fontSize:13, margin:0 }}>Tocá para subir una foto</p></>}
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

// ─── PRODUCT SEARCH INPUT ─────────────────────────────────────────────────────
function ProductSearchInput({ products, value, onChange }) {
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
        <input style={{ ...inp, flex:1 }}
          value={open ? query : (selected ? selected.name : "")}
          placeholder="🔍 Buscar producto..."
          onFocus={() => { setOpen(true); setQuery(""); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
        />
        {selected && !open && (
          <div style={{ display:"flex", alignItems:"center", gap:4, background:C.greenBg, border:`1px solid ${C.border2}`, borderRadius:10, padding:"6px 12px", fontSize:12, color:C.green, fontWeight:700, whiteSpace:"nowrap" }}>
            Stock: {selected.stock}
          </div>
        )}
      </div>
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:C.card, border:`1.5px solid ${C.border2}`, borderRadius:14, zIndex:300, maxHeight:220, overflowY:"auto", boxShadow:C.shadowMd, marginTop:4 }}>
          {filtered.length === 0 && <div style={{ padding:"14px 16px", color:C.muted, fontSize:13 }}>Sin resultados</div>}
          {filtered.map(p => (
            <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); setQuery(""); }}
              style={{ width:"100%", background:p.id===value?C.greenBg:"transparent", border:"none", borderBottom:`1px solid ${C.border}`, padding:"12px 16px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              <ProductAvatar product={p} size={32} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{p.name}</div>
                <div style={{ fontSize:11, color:C.muted }}>Stock: <strong style={{ color: p.stock <= p.minStock ? C.red : C.green }}>{p.stock}</strong></div>
              </div>
              <div style={{ fontSize:13, fontWeight:800, color:C.green }}>{fmt(p.price)}</div>
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
  const [list, setList] = useState([...categories]);
  const [newCat, setNewCat] = useState("");
  const [saving, setSaving] = useState(false);
  const add = () => { const t=newCat.trim(); if(!t||list.includes(t)) return; setList(l=>[...l,t]); setNewCat(""); };
  const remove = (c) => { if(c==="General") return alert("No se puede eliminar General."); setList(l=>l.filter(x=>x!==c)); };
  const save = async () => { setSaving(true); await fbSet(businessId, COL.categories, "lista", {items:list}); onUpdate(list); setSaving(false); onClose(); };
  return (
    <Modal title="🗂 Categorías" onClose={onClose}>
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
      <button onClick={save} disabled={saving} style={{ ...btnPrimary(), width:"100%" }}>{saving?"Guardando...":"Guardar →"}</button>
    </Modal>
  );
}

// ─── PRODUCT FORM ─────────────────────────────────────────────────────────────
function ProductForm({ initial, categories, onSave, onClose, saving }) {
  const def = { name:"", description:"", price:"", priceWholesale:"", cost:"", category:categories[0]||"General", supplier:"", stock:"0", minStock:"5", barcode:"", image:null };
  const [f, setF] = useState(initial ? {...initial} : def);
  const [showScanner, setShowScanner] = useState(false);
  const set = (k, v) => setF(p => ({...p, [k]:v}));
  const margin = f.price&&f.cost ? (((f.price-f.cost)/f.price)*100).toFixed(1) : 0;
  const mColor = Number(margin)>30?C.green:Number(margin)>15?C.orange:C.red;
  return (
    <Modal title={initial?"✏️ Editar producto":"➕ Nuevo producto"} onClose={onClose}>
      {showScanner && <BarcodeScanner onDetect={c=>{set("barcode",c);setShowScanner(false);}} onClose={()=>setShowScanner(false)} />}
      <Field label="Foto"><ImageUpload value={f.image} onChange={v=>set("image",v)} /></Field>
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
        <div style={{ flex:1 }}><Field label="Margen"><div style={{ ...inp, background:`${mColor}12`, borderColor:`${mColor}44`, color:mColor, fontWeight:800, fontSize:16 }}>{margin}%</div></Field></div>
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

// ─── MOVEMENT FORM ────────────────────────────────────────────────────────────
function MovementForm({ type, products, preselected, editData, onSave, onClose, saving }) {
  const [productId, setProductId] = useState(editData?.productId||preselected?.id||products[0]?.id||"");
  const [qty, setQty] = useState(editData?.qty?.toString()||"1");
  const [note, setNote] = useState(editData?.note||"");
  const [date, setDate] = useState(editData?.date||todayStr());
  const [priceType, setPriceType] = useState("retail");
  const [payMethod, setPayMethod] = useState(editData?.payMethod||"efectivo");
  const [customPrice, setCustomPrice] = useState(editData?.unitPrice?.toString()||"");
  const isSale = type==="sale";
  const product = products.find(p=>p.id===productId);
  const autoPrice = isSale?(priceType==="wholesale"?product?.priceWholesale:product?.price):product?.cost;
  const unitPrice = customPrice!==""?Number(customPrice):(autoPrice||0);
  const total = product?Number(qty)*unitPrice:0;
  const isEdit = !!editData;
  return (
    <Modal title={isEdit?"✏️ Editar":isSale?"📤 Nueva venta":"📥 Nueva compra"} onClose={onClose}>
      <Field label="Producto"><ProductSearchInput products={products} value={productId} onChange={setProductId} /></Field>
      {isSale && <Field label="Tipo de precio">
        <div style={{ display:"flex", gap:8 }}>
          {["retail","wholesale"].map(t=>(
            <button key={t} onClick={()=>setPriceType(t)}
              style={{ ...btnSecondary(), flex:1, background:priceType===t?C.greenBg:C.card, borderColor:priceType===t?C.green:C.border2, color:priceType===t?C.green:C.muted }}>
              {t==="retail"?"🛍 Minorista":"🏭 Mayorista"}
            </button>
          ))}
        </div>
      </Field>}
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ flex:1 }}><Field label="Cantidad"><input style={inp} type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} /></Field></div>
        <div style={{ flex:1 }}><Field label="Fecha"><input style={inp} type="date" value={date} onChange={e=>setDate(e.target.value)} /></Field></div>
      </div>
      {!isSale && <Field label="Precio de compra (por unidad)">
        <input style={inp} type="number" min="0" value={customPrice} onChange={e=>setCustomPrice(e.target.value)} placeholder={`Costo guardado: $${autoPrice||0}`} />
      </Field>}
      <Field label="Método de pago">
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {PAY_METHODS.map(m=>(
            <button key={m.id} onClick={()=>setPayMethod(m.id)}
              style={{ ...btnSecondary(), flex:1, minWidth:80, background:payMethod===m.id?C.greenBg:C.card, borderColor:payMethod===m.id?C.green:C.border2, color:payMethod===m.id?C.green:C.muted }}>
              {m.label}
            </button>
          ))}
        </div>
      </Field>
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
        {saving?"Guardando...":isEdit?"Guardar →":isSale?"Confirmar venta →":"Confirmar compra →"}
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
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {["retail","wholesale"].map(t=>(
            <button key={t} onClick={()=>setPriceType(t)}
              style={{ ...btnSecondary(), flex:1, background:priceType===t?C.greenBg:C.card, borderColor:priceType===t?C.green:C.border2, color:priceType===t?C.green:C.muted }}>
              {t==="retail"?"🛍 Minorista":"🏭 Mayorista"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{ ...inp, flex:1 }} />
          <button onClick={()=>setShowScanner(true)} style={btnSecondary({padding:"12px 14px"})}>📷</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8, marginBottom:16, maxHeight:"28dvh", overflowY:"auto" }}>
          {filtered.map(p=>(
            <button key={p.id} onClick={()=>addToCart(p)} disabled={p.stock<=0}
              style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14, padding:10, cursor:p.stock>0?"pointer":"not-allowed", opacity:p.stock<=0?0.5:1, textAlign:"left", boxShadow:C.shadow }}>
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
                style={{ ...btnSecondary(), flex:1, minWidth:80, background:payMethod===m.id?C.greenBg:C.card, borderColor:payMethod===m.id?C.green:C.border2, color:payMethod===m.id?C.green:C.muted }}>
                {m.label}
              </button>
            ))}
          </div>
        </Field>
        {payMethod==="efectivo" && <>
          <Field label="Efectivo recibido">
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
  const byMethod = PAY_METHODS.map(m=>({...m,total:sales.filter(s=>s.payMethod===m.id).reduce((s,mv)=>s+mv.total,0)}));
  return (
    <Modal title="💰 Cierre de caja" onClose={onClose} wide>
      <Field label="Fecha"><input style={inp} type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} /></Field>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
        {[{l:"Ventas",v:fmt(totalSales),c:C.green,bg:C.greenBg},{l:"Compras",v:fmt(totalPurchases),c:C.blue,bg:C.blueBg},{l:"Costo",v:fmt(totalCost),c:C.orange,bg:C.orangeBg},{l:"Ganancia",v:fmt(profit),c:profit>=0?C.green:C.red,bg:profit>=0?C.greenBg:C.redBg}].map(s=>(
          <div key={s.l} style={{ flex:1, minWidth:110, background:s.bg, borderRadius:14, padding:14, border:`1px solid ${s.c}22` }}>
            <p style={{ color:C.muted, fontSize:11, margin:"0 0 4px" }}>{s.l}</p>
            <p style={{ color:s.c, fontWeight:800, fontSize:18, margin:0 }}>{s.v}</p>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {byMethod.map(m=>(
          <div key={m.id} style={{ flex:1, minWidth:90, background:C.greenBg, border:`1.5px solid ${C.border2}`, borderRadius:12, padding:12, textAlign:"center" }}>
            <p style={{ color:C.muted, fontSize:11, margin:"0 0 4px" }}>{m.label}</p>
            <p style={{ color:C.green, fontWeight:800, fontSize:15, margin:0 }}>{fmt(m.total)}</p>
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

// ─── SUPERADMIN PANEL ─────────────────────────────────────────────────────────
function SuperadminPanel() {
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
          <button key={t} onClick={()=>setTab(t)} style={{ ...btnSecondary(), background:tab===t?C.greenBg:C.card, borderColor:tab===t?C.green:C.border2, color:tab===t?C.green:C.text2 }}>
            {t==="negocios"?"🏢 Negocios":"👥 Usuarios"}
          </button>
        ))}
        <button onClick={()=>{ setForm(tab==="negocios"?{}:{rol:"empleado"}); setModal(tab==="negocios"?"negocio":"user"); }}
          style={{ ...btnPrimary({padding:"10px 16px",fontSize:14}), marginLeft:"auto" }}>
          + Nuevo {tab==="negocios"?"negocio":"usuario"}
        </button>
      </div>
      {tab==="negocios" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {negocios.length===0 && <Card style={{ textAlign:"center", padding:28 }}><p style={{ color:C.muted }}>Sin negocios aún</p></Card>}
          {negocios.map(n=>(
            <Card key={n.id}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <div><p style={{ margin:0, fontWeight:800, fontSize:15, color:C.text }}>🏢 {n.nombre}</p><p style={{ margin:"4px 0 0", fontSize:11, color:C.muted }}>{n.id}</p></div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <Chip color={C.blue} bg={C.blueBg}>{n.plan}</Chip>
                  <Chip color={n.activo?C.green:C.red} bg={n.activo?C.greenBg:C.redBg}>{n.activo?"Activo":"Inactivo"}</Chip>
                  <button onClick={async()=>{ await updateNegocio(n.id,{activo:!n.activo}); load(); }} style={btnGhost(n.activo?C.red:C.green, n.activo?C.redBg:C.greenBg, {padding:"6px 10px",fontSize:12})}>{n.activo?"Desactivar":"Activar"}</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {tab==="usuarios" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {users.length===0 && <Card style={{ textAlign:"center", padding:28 }}><p style={{ color:C.muted }}>Sin usuarios aún</p></Card>}
          {users.map(u=>{ const neg=negocios.find(n=>n.id===u.businessId); return (
            <Card key={u.uid}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <div>
                  <p style={{ margin:0, fontWeight:800, fontSize:15, color:C.text }}>{u.nombre}</p>
                  <p style={{ margin:"3px 0 0", fontSize:12, color:C.muted }}>{u.email} · {neg?.nombre||u.businessId||"—"}</p>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <Chip color={u.rol==="admin"?C.blue:C.orange} bg={u.rol==="admin"?C.blueBg:C.orangeBg}>{u.rol}</Chip>
                  <Chip color={u.activo?C.green:C.red} bg={u.activo?C.greenBg:C.redBg}>{u.activo?"Activo":"Inactivo"}</Chip>
                  <button
                    onClick={async()=>{ await updateUserProfile(u.uid,{rol:u.rol==="admin"?"empleado":"admin"}); load(); }}
                    style={btnGhost(C.blue,C.blueBg,{padding:"6px 10px",fontSize:12})}>
                    {u.rol==="admin"?"→ Empleado":"→ Admin"}
                  </button>
                  <button
                    onClick={async()=>{ await updateUserProfile(u.uid,{activo:!u.activo}); load(); }}
                    style={btnGhost(u.activo?C.red:C.green, u.activo?C.redBg:C.greenBg, {padding:"6px 10px",fontSize:12})}>
                    {u.activo?"Desactivar":"Activar"}
                  </button>
                </div>
              </div>
            </Card>
          );})}
        </div>
      )}
      {modal==="negocio" && (
        <Modal title="🏢 Nuevo negocio" onClose={()=>setModal(null)}>
          <Field label="Nombre *"><input style={inp} value={form.nombre||""} onChange={e=>setForm({...form,nombre:e.target.value})}/></Field>
          <Field label="Descripción"><input style={inp} value={form.descripcion||""} onChange={e=>setForm({...form,descripcion:e.target.value})}/></Field>
          <Field label="Plan"><select style={inp} value={form.plan||"basic"} onChange={e=>setForm({...form,plan:e.target.value})}><option value="basic">Basic</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></Field>
          <button onClick={saveNeg} disabled={loading||!form.nombre} style={{ ...btnPrimary(), width:"100%" }}>{loading?"Creando...":"Crear negocio →"}</button>
        </Modal>
      )}
      {modal==="user" && (
        <Modal title="👤 Nuevo usuario" onClose={()=>setModal(null)}>
          <div style={{ display:"flex", gap:12 }}>
            <div style={{ flex:1 }}><Field label="Nombre *"><input style={inp} value={form.nombre||""} onChange={e=>setForm({...form,nombre:e.target.value})}/></Field></div>
            <div style={{ flex:1 }}><Field label="Rol"><select style={inp} value={form.rol||"empleado"} onChange={e=>setForm({...form,rol:e.target.value})}><option value="empleado">Empleado</option><option value="admin">Admin</option></select></Field></div>
          </div>
          <Field label="Email *"><input style={inp} type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
          <Field label="Contraseña *"><input style={inp} type="password" value={form.password||""} onChange={e=>setForm({...form,password:e.target.value})}/></Field>
          <Field label="Negocio *">
            <select style={inp} value={form.businessId||""} onChange={e=>setForm({...form,businessId:e.target.value})}>
              <option value="">— Seleccionar —</option>
              {negocios.map(n=><option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </Field>
          <button onClick={saveUsr} disabled={loading||!form.nombre||!form.email||!form.password||!form.businessId} style={{ ...btnPrimary(), width:"100%" }}>{loading?"Creando...":"Crear usuario →"}</button>
        </Modal>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login() {
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
    <div style={{ minHeight:"100dvh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:24 }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <div style={{ width:80, height:80, background:C.greenBg, borderRadius:24, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 8px 24px ${C.greenL}44` }}>
              <ControlProLogo size={52} />
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0 }}>
            <span style={{ color:C.blue, fontWeight:900, fontSize:34, letterSpacing:-1 }}>Control</span>
            <span style={{ color:C.green, fontWeight:900, fontSize:34, letterSpacing:-1 }}>Pro</span>
          </div>
          <p style={{ color:C.muted, marginTop:8, fontSize:14 }}>Gestión profesional de inventario</p>
        </div>
        <div style={{ background:C.card, borderRadius:24, padding:28, boxShadow:C.shadowMd, border:`1px solid ${C.border}` }}>
          <Field label="Correo electrónico"><input style={inp} value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="tu@email.com"/></Field>
          <Field label="Contraseña"><input style={inp} value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&go()}/></Field>
          {err && <div style={{ background:C.redBg, border:`1px solid ${C.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:16 }}><p style={{ color:C.red, fontSize:13, margin:0 }}>{err}</p></div>}
          <button onClick={go} disabled={loading||!email||!pass} style={{ ...btnPrimary(), width:"100%", fontSize:16, opacity:loading||!email||!pass?0.6:1 }}>{loading?"Ingresando...":"Ingresar →"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR NAV ITEM ─────────────────────────────────────────────────────────
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

  const [tab, setTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { products, movements, categories, setCategories, loading } = useFirestore(businessId);
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

  const todaySales = movements.filter(m=>m.type==="sale"&&m.date===todayStr()).reduce((s,m)=>s+m.total,0);
  const totalSales = movements.filter(m=>m.type==="sale").reduce((s,m)=>s+m.total,0);
  const totalCost = movements.filter(m=>m.type==="sale").reduce((s,m)=>{ const p=products.find(pr=>pr.id===m.productId); return s+(p?.cost||0)*m.qty; },0);
  const totalProfit = totalSales-totalCost;
  const lowStock = products.filter(p=>p.stock<=p.minStock);
  const inventoryValue = products.reduce((s,p)=>s+p.stock*(p.cost||0),0);
  const rentData = products.map(p=>{
    const sold = movements.filter(m=>m.productId===p.id&&m.type==="sale").reduce((s,m)=>s+m.qty,0);
    const revenue = movements.filter(m=>m.productId===p.id&&m.type==="sale").reduce((s,m)=>s+m.total,0);
    const profit = revenue-sold*(p.cost||0);
    const margin = revenue?((profit/revenue)*100).toFixed(1):0;
    const rotation = sold>5?"Alta":sold>0?"Media":"Baja";
    return {...p,sold,revenue,profit,margin,rotation};
  }).sort((a,b)=>b.profit-a.profit);

  const saveProduct = async (data) => {
    setSaving(true);
    const parsed = {...data,price:Number(data.price),priceWholesale:Number(data.priceWholesale),cost:Number(data.cost),stock:Number(data.stock),minStock:Number(data.minStock),image:data.image||null};
    if(editProduct) { await fbUpdate(businessId,COL.products,editProduct.id,parsed); }
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
    { id:"rentability", icon:"📊", label:"Rentabilidad" },
    ...(isSuperadmin?[{id:"superadmin",icon:"⚙️",label:"Admin"}]:[]),
  ];

  // ── SIDEBAR (desktop) ──
  const Sidebar = (
    <div style={{ width:sidebarCollapsed?56:220, background:C.sidebar, display:"flex", flexDirection:"column", transition:"width 0.25s ease", overflow:"hidden", flexShrink:0, minHeight:"100dvh" }}>
      {/* Header */}
      <div style={{ padding:"16px 12px 12px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.08)", minHeight:56 }}>
        <ControlProLogo size={32} />
        {!sidebarCollapsed && (
          <div style={{ display:"flex", gap:0, overflow:"hidden" }}>
            <span style={{ color:"#90caf9", fontWeight:900, fontSize:16 }}>Control</span>
            <span style={{ color:"#a5d6a7", fontWeight:900, fontSize:16 }}>Pro</span>
          </div>
        )}
        <button onClick={()=>setSidebarCollapsed(!sidebarCollapsed)}
          style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", padding:4, borderRadius:6, flexShrink:0, fontSize:16 }}>
          {sidebarCollapsed?"›":"‹"}
        </button>
      </div>

      {/* Nav */}
      <div style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:2 }}>
        {!sidebarCollapsed && <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:0.8, padding:"8px 8px 4px" }}>Principal</div>}
        {navItems.map(n=>(
          <SidebarItem key={n.id} icon={n.icon} label={n.label} active={tab===n.id} onClick={()=>setTab(n.id)} collapsed={sidebarCollapsed} />
        ))}
        {!sidebarCollapsed && <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:0.8, padding:"16px 8px 4px" }}>Acciones</div>}
        <SidebarItem icon="⚡" label="Caja rápida" active={false} onClick={()=>setShowQuickCash(true)} collapsed={sidebarCollapsed} />
        <SidebarItem icon="💰" label="Cierre de caja" active={false} onClick={()=>setShowCashClose(true)} collapsed={sidebarCollapsed} />
        {isAdmin && <SidebarItem icon="📷" label="Escanear" active={false} onClick={()=>setShowScanner(true)} collapsed={sidebarCollapsed} />}
      </div>

      {/* Footer */}
      <div style={{ padding:"12px 8px", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", flexShrink:0 }}>
          {(perfil?.nombre||user.email)[0].toUpperCase()}
        </div>
        {!sidebarCollapsed && (
          <div style={{ overflow:"hidden", flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#c8e6c9", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{perfil?.nombre||user.email}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{perfil?.rol||"usuario"}</div>
          </div>
        )}
        {!sidebarCollapsed && <button onClick={logout} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:12, whiteSpace:"nowrap" }}>Salir</button>}
      </div>
    </div>
  );

  // ── BOTTOM NAV (mobile) ──
  const BottomNav = (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.sidebar, display:"flex", alignItems:"center", justifyContent:"space-around", padding:"10px 8px 16px", zIndex:40, boxSizing:"border-box" }}>
      {navItems.filter(n=>n.id!=="superadmin").map(n=>(
        <button key={n.id} onClick={()=>setTab(n.id)} style={{ background:tab===n.id?"rgba(255,255,255,0.12)":"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 10px", borderRadius:12 }}>
          <span style={{ fontSize:18 }}>{n.icon}</span>
          <span style={{ fontSize:10, fontWeight:700, color:tab===n.id?"#fff":"rgba(255,255,255,0.35)" }}>{n.label}</span>
        </button>
      ))}
      <button onClick={()=>setShowQuickCash(true)} style={{ ...btnPrimary(), display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"10px 16px", borderRadius:18, transform:"translateY(-8px)", boxShadow:`0 6px 20px rgba(46,125,50,0.5)` }}>
        <span style={{ fontSize:22 }}>⚡</span>
        <span style={{ fontSize:10, fontWeight:900 }}>CAJA</span>
      </button>
    </div>
  );

  const contentPad = isMobile ? "16px 16px 90px" : "24px";

  return (
    <div style={{ minHeight:"100dvh", background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.text, display:"flex", maxWidth:"100vw", overflowX:"hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap'); * { box-sizing: border-box; }`}</style>

      {/* SIDEBAR — solo desktop */}
      {!isMobile && Sidebar}

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:"100dvh", overflow:"hidden" }}>

        {/* TOP BAR */}
        <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:50, boxShadow:C.shadow }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {isMobile && <ControlProLogo size={28} />}
            {isMobile && <div><span style={{ color:C.blue, fontWeight:900, fontSize:16 }}>Control</span><span style={{ color:C.green, fontWeight:900, fontSize:16 }}>Pro</span></div>}
            {!isMobile && <span style={{ fontSize:18, fontWeight:800, color:C.text }}>{navItems.find(n=>n.id===tab)?.label||"Dashboard"}</span>}
            {lowStock.length>0 && <Chip color={C.red} bg={C.redBg}>⚠ {lowStock.length}</Chip>}
            {saving && <Chip color={C.orange} bg={C.orangeBg}>💾 Guardando</Chip>}
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {!isMobile && isAdmin && businessId && <button onClick={()=>setShowMovForm("sale")} style={btnPrimary({padding:"8px 16px",fontSize:13})}>+ Venta</button>}
            {!isMobile && isAdmin && businessId && <button onClick={()=>setShowMovForm("purchase")} style={{ ...btnPrimary({background:C.blue,padding:"8px 16px",fontSize:13}) }}>+ Compra</button>}
            {isMobile && <button onClick={logout} style={btnSecondary({padding:"6px 10px",fontSize:12})}>Salir</button>}
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex:1, padding:contentPad, overflowY:"auto" }}>

          {tab==="superadmin" && isSuperadmin && (
            <div>
              <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 16px", color:C.text }}>⚙️ Panel Superadmin</h2>
              <SuperadminPanel />
            </div>
          )}

          {tab!=="superadmin" && !businessId && (
            <Card style={{ textAlign:"center", padding:40 }}>
              <p style={{ fontSize:32, margin:"0 0 12px" }}>🏢</p>
              <p style={{ color:C.text, fontWeight:700, fontSize:16, margin:"0 0 8px" }}>Sin negocio asignado</p>
              <p style={{ color:C.muted, fontSize:13 }}>Contactá al administrador.</p>
            </Card>
          )}

          {tab!=="superadmin" && businessId && (loading ? <Loader text="Cargando datos..." /> : <>

            {/* DASHBOARD */}
            {tab==="dashboard" && <div>
              <div style={{ marginBottom:20 }}>
                <h2 style={{ fontSize:22, fontWeight:900, margin:"0 0 2px", color:C.text }}>Hola, {perfil?.nombre?.split(" ")[0]||"Admin"} 👋</h2>
                <p style={{ color:C.muted, margin:0, fontSize:13 }}>{new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}</p>
              </div>

              {/* Hero number */}
              <div style={{ background:C.card, borderRadius:20, padding:24, marginBottom:16, border:`1px solid ${C.border}`, textAlign:"center", boxShadow:C.shadow }}>
                <p style={{ color:C.muted, fontSize:12, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:0.8 }}>Ventas hoy</p>
                <p style={{ color:C.green, fontWeight:900, fontSize:48, margin:0, lineHeight:1 }}>{fmt(todaySales)}</p>
              </div>

              {/* Quick actions */}
              <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                {[
                  { icon:"📤", label:"Nueva venta", color:C.green, bg:C.greenBg, action:()=>setShowMovForm("sale") },
                  { icon:"📥", label:"Nueva compra", color:C.blue, bg:C.blueBg, action:()=>isAdmin&&setShowMovForm("purchase") },
                  { icon:"📷", label:"Escanear", color:C.text2, bg:C.card, action:()=>setShowScanner(true) },
                  { icon:"💰", label:"Cierre", color:C.orange, bg:C.orangeBg, action:()=>setShowCashClose(true) },
                ].map(a=>(
                  <button key={a.label} onClick={a.action} style={{ flex:1, background:a.bg, border:`1px solid ${C.border}`, borderRadius:16, padding:"12px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", boxShadow:C.shadow }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:C.card, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:C.shadow }}>{a.icon}</div>
                    <span style={{ fontSize:11, fontWeight:600, color:a.color }}>{a.label}</span>
                  </button>
                ))}
              </div>

              {/* Stats grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                <StatCard label="Total ventas" value={fmt(totalSales)} color={C.blue} bg={C.blueBg} icon="📈" />
                <StatCard label="Ganancia" value={fmt(totalProfit)} color={totalProfit>=0?C.green:C.red} bg={totalProfit>=0?C.greenBg:C.redBg} icon="💵" />
                <StatCard label="Inventario" value={fmt(inventoryValue)} color={C.orange} bg={C.orangeBg} icon="🏪" />
                <StatCard label="Productos" value={products.length} color={C.text2} bg={C.card} icon="📦" />
              </div>

              {lowStock.length>0 && (
                <div style={{ background:C.redBg, border:`1.5px solid ${C.red}33`, borderRadius:16, padding:16, marginBottom:16 }}>
                  <p style={{ color:C.red, fontWeight:700, margin:"0 0 10px", fontSize:13 }}>⚠ Productos con stock bajo</p>
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

              {products.length>0 && (
                <Card>
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
            </div>}

            {/* PRODUCTS */}
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
              <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
                {["Todas",...categories].map(c=>(
                  <button key={c} onClick={()=>setFilterCat(c)}
                    style={{ background:filterCat===c?C.green:C.card, border:`1.5px solid ${filterCat===c?C.green:C.border}`, color:filterCat===c?"#fff":C.text2, borderRadius:20, padding:"6px 16px", fontSize:12, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                    {c}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {products.filter(p=>{
                  const ms = p.name.toLowerCase().includes(search.toLowerCase())||p.barcode?.includes(search)||p.supplier?.toLowerCase().includes(search.toLowerCase());
                  return ms&&(filterCat==="Todas"||p.category===filterCat);
                }).map(p=>{
                  const isLow = p.stock<=p.minStock;
                  const margin = p.price&&p.cost?(((p.price-p.cost)/p.price)*100).toFixed(0):0;
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
                          <Chip color={Number(margin)>30?C.green:Number(margin)>15?C.orange:C.red} bg={Number(margin)>30?C.greenBg:Number(margin)>15?C.orangeBg:C.redBg}>M: {margin}%</Chip>
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

            {/* MOVEMENTS */}
            {tab==="movements" && <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
                <h2 style={{ fontSize:20, fontWeight:900, margin:0, color:C.text }}>Movimientos</h2>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>setShowMovForm("sale")} style={btnPrimary({padding:"9px 14px",fontSize:13})}>+ Venta</button>
                  {isAdmin && <button onClick={()=>setShowMovForm("purchase")} style={{ ...btnPrimary({background:C.blue,padding:"9px 14px",fontSize:13}) }}>+ Compra</button>}
                </div>
              </div>
              <Card style={{ marginBottom:14, padding:14 }}>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:140 }}>
                    <span style={{ color:C.muted, fontSize:12 }}>Desde:</span>
                    <input style={{ ...inp, flex:1, padding:"8px 12px" }} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} />
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:140 }}>
                    <span style={{ color:C.muted, fontSize:12 }}>Hasta:</span>
                    <input style={{ ...inp, flex:1, padding:"8px 12px" }} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} />
                  </div>
                  {(filterFrom||filterTo) && <button onClick={()=>{ setFilterFrom(""); setFilterTo(""); }} style={btnSecondary({padding:"8px 12px"})}>✕ Limpiar</button>}
                </div>
                <div style={{ display:"flex", gap:16, marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                  <span style={{ color:C.muted, fontSize:12 }}>Ventas: <strong style={{ color:C.green }}>{fmt(filtMovements.filter(m=>m.type==="sale").reduce((s,m)=>s+m.total,0))}</strong></span>
                  <span style={{ color:C.muted, fontSize:12 }}>Compras: <strong style={{ color:C.blue }}>{fmt(filtMovements.filter(m=>m.type==="purchase").reduce((s,m)=>s+m.total,0))}</strong></span>
                </div>
              </Card>
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
                        {pm && <Chip color={pm.color} bg={C.greenBg}>{pm.label}</Chip>}
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
                {filtMovements.length===0 && <Card style={{ textAlign:"center", padding:24 }}><p style={{ color:C.muted, fontSize:13 }}>Sin movimientos.</p></Card>}
              </div>
            </div>}

            {/* RENTABILITY */}
            {tab==="rentability" && <div>
              <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 16px", color:C.text }}>📊 Rentabilidad</h2>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                <StatCard label="Ingresos" value={fmt(totalSales)} color={C.green} bg={C.greenBg} icon="💰" />
                <StatCard label="Costo ventas" value={fmt(totalCost)} color={C.orange} bg={C.orangeBg} icon="📦" />
                <StatCard label="Ganancia bruta" value={fmt(totalProfit)} color={totalProfit>=0?C.green:C.red} bg={totalProfit>=0?C.greenBg:C.redBg} icon="💵" />
                <StatCard label="Margen" value={`${totalSales?((totalProfit/totalSales)*100).toFixed(1):0}%`} color={C.blue} bg={C.blueBg} icon="📈" />
              </div>
              <Card style={{ marginBottom:16, overflowX:"auto" }}>
                <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:15, color:C.text }}>📋 Detalle por producto</p>
                {products.length===0 ? <p style={{ color:C.muted, textAlign:"center", padding:16 }}>Sin datos</p> :
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead><tr style={{ borderBottom:`2px solid ${C.border}` }}>
                    {["Producto","Vendido","Ingresos","Ganancia","Margen","Stock"].map(h=>(
                      <th key={h} style={{ color:C.muted, fontWeight:700, padding:"8px", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{rentData.map((p,i)=>(
                    <tr key={p.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===0?"transparent":C.card2 }}>
                      <td style={{ padding:"10px 8px" }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><ProductAvatar product={p} size={26} /><span style={{ color:C.text, fontWeight:600 }}>{p.name}</span></div></td>
                      <td style={{ padding:"10px 8px", color:C.text2 }}>{p.sold}</td>
                      <td style={{ padding:"10px 8px", color:C.blue, fontWeight:600 }}>{fmt(p.revenue)}</td>
                      <td style={{ padding:"10px 8px", color:p.profit>=0?C.green:C.red, fontWeight:700 }}>{fmt(p.profit)}</td>
                      <td style={{ padding:"10px 8px" }}><Chip color={Number(p.margin)>30?C.green:Number(p.margin)>15?C.orange:C.red} bg={Number(p.margin)>30?C.greenBg:Number(p.margin)>15?C.orangeBg:C.redBg}>{p.margin}%</Chip></td>
                      <td style={{ padding:"10px 8px", color:p.stock<=p.minStock?C.red:C.text2, fontWeight:p.stock<=p.minStock?700:400 }}>{p.stock}</td>
                    </tr>
                  ))}</tbody>
                </table>}
              </Card>
              <Card>
                <p style={{ fontWeight:800, margin:"0 0 14px", fontSize:15, color:C.text }}>💡 Sugerencias</p>
                {rentData.filter(p=>p.rotation==="Baja"&&p.stock>p.minStock*2).map(p=>(
                  <div key={`slow-${p.id}`} style={{ background:C.orangeBg, border:`1px solid ${C.orange}44`, borderRadius:12, padding:14, marginBottom:10, display:"flex", gap:12 }}>
                    <ProductAvatar product={p} size={32} />
                    <div><p style={{ margin:0, fontWeight:700, fontSize:13, color:C.text }}>{p.name} — stock parado</p><p style={{ margin:"4px 0 0", color:C.muted, fontSize:12 }}>Tiene {p.stock} uds y vendió solo {p.sold}. Considerá una promoción.</p></div>
                  </div>
                ))}
                {lowStock.map(p=>(
                  <div key={`low-${p.id}`} style={{ background:C.redBg, border:`1px solid ${C.red}44`, borderRadius:12, padding:14, marginBottom:10, display:"flex", gap:12 }}>
                    <ProductAvatar product={p} size={32} />
                    <div><p style={{ margin:0, fontWeight:700, fontSize:13, color:C.text }}>{p.name} — reponer urgente</p><p style={{ margin:"4px 0 0", color:C.muted, fontSize:12 }}>Solo {p.stock} uds (mín: {p.minStock}). Proveedor: {p.supplier||"N/A"}.</p></div>
                  </div>
                ))}
                {rentData.filter(p=>Number(p.margin)<15&&p.sold>0).map(p=>(
                  <div key={`margin-${p.id}`} style={{ background:C.blueBg, border:`1px solid ${C.blue}44`, borderRadius:12, padding:14, marginBottom:10, display:"flex", gap:12 }}>
                    <ProductAvatar product={p} size={32} />
                    <div><p style={{ margin:0, fontWeight:700, fontSize:13, color:C.text }}>{p.name} — margen bajo ({p.margin}%)</p><p style={{ margin:"4px 0 0", color:C.muted, fontSize:12 }}>Revisá el precio o negociá con el proveedor.</p></div>
                  </div>
                ))}
                {rentData.filter(p=>p.rotation==="Baja"&&p.stock>p.minStock*2).length===0&&lowStock.length===0&&rentData.filter(p=>Number(p.margin)<15&&p.sold>0).length===0 && (
                  <div style={{ background:C.greenBg, borderRadius:12, padding:16, textAlign:"center" }}>
                    <p style={{ color:C.green, fontWeight:700, margin:0, fontSize:14 }}>✅ Todo en orden</p>
                  </div>
                )}
              </Card>
            </div>}

          </>)}
        </div>
      </div>

      {/* BOTTOM NAV — solo mobile */}
      {isMobile && BottomNav}

      {/* MODALS */}
      {showScanner    && <BarcodeScanner onDetect={handleBarcode} onClose={()=>setShowScanner(false)} />}
      {showProductForm && <ProductForm initial={editProduct} categories={categories} onSave={saveProduct} onClose={()=>{ setShowProductForm(false); setEditProduct(null); }} saving={saving} />}
      {showMovForm    && <MovementForm type={showMovForm} products={products} preselected={preselProduct} editData={editMovement} onSave={saveMovement} onClose={()=>{ setShowMovForm(null); setPreselProduct(null); setEditMovement(null); }} saving={saving} />}
      {showCashClose  && <CashClose movements={movements} products={products} onClose={()=>setShowCashClose(false)} />}
      {showQuickCash  && <QuickCash products={products} onSell={saveMovement} onClose={()=>setShowQuickCash(false)} />}
      {showCatManager && <CategoryManager businessId={businessId} categories={categories} onUpdate={setCategories} onClose={()=>setShowCatManager(false)} />}
    </div>
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

  if (!session) return <Login />;

  if (!session.perfil) return (
    <div style={{ minHeight:"100dvh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"DM Sans,sans-serif" }}>
      <ControlProLogo size={60} />
      <p style={{ color:C.text, fontWeight:700, fontSize:16 }}>Cuenta sin perfil asignado</p>
      <p style={{ color:C.muted, fontSize:13 }}>Contactá al administrador.</p>
      <button onClick={logout} style={btnPrimary({padding:"12px 24px"})}>Cerrar sesión</button>
    </div>
  );

  return <MainApp session={session} />;
}