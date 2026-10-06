import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const KEY = "rutacomercio_partners_v1";
const input = { width:"100%", padding:"9px", borderRadius:"7px", border:"1px solid #cbd5e1", boxSizing:"border-box", color:"#0f172a", backgroundColor:"#fff" };

export default function AdminPromotores() {
  const [partners,setPartners]=useState([]);
  const [comisiones,setComisiones]=useState([]);
  const [mostrarAlta,setMostrarAlta]=useState(false);
  const [partnerDetalle,setPartnerDetalle]=useState(null);
  const [pago,setPago]=useState(null);

  const guardarPartners=(lista)=>{ setPartners(lista); localStorage.setItem(KEY,JSON.stringify(lista)); window.dispatchEvent(new Event("storage")); };
  const cargar=async()=>{
    try { const g=JSON.parse(localStorage.getItem(KEY)||"[]"); setPartners(Array.isArray(g)?g:[]); } catch { setPartners([]); }
    const {data,error}=await supabase.from("partner_comisiones").select("*").order("fecha_generada",{ascending:false});
    if(!error) setComisiones(data||[]); else console.warn("partner_comisiones:",error.message);
  };
  useEffect(()=>{cargar();},[]);

  const resumen=useMemo(()=>{
    const pendiente=comisiones.filter(c=>c.estado!=="pagada").reduce((a,c)=>a+Number(c.importe_comision||0),0);
    const pagado=comisiones.filter(c=>c.estado==="pagada").reduce((a,c)=>a+Number(c.importe_pagado??c.importe_comision??0),0);
    return {pendiente,pagado};
  },[comisiones]);

  const registrarPago=async(e)=>{
    e.preventDefault(); if(!pago) return;
    const importe=Number(pago.importe)||0;
    const {error}=await supabase.from("partner_comisiones").update({estado:"pagada",fecha_pago:new Date().toISOString(),importe_pagado:importe,medio_pago:pago.medio||null,notas_pago:pago.notas||null}).eq("id",pago.id);
    if(error) return alert("Error al registrar pago: "+error.message);
    setPago(null); await cargar(); alert("✅ Pago al Partner registrado en el historial.");
  };

  return <div style={{minHeight:"100vh",backgroundColor:"#f8fafc",fontFamily:"Arial,sans-serif",color:"#0f172a"}}>
    <header style={{backgroundColor:"#fff",borderBottom:"1px solid #e2e8f0",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
      <div><div style={{fontSize:"18px",fontWeight:900,color:"#0284c7"}}>RutaComercio <span style={{fontSize:"10px",color:"#16a34a"}}>SUPERADMIN</span></div><div style={{fontSize:"11px",color:"#64748b"}}>Partners • Comisiones • Historial de pagos</div></div>
      <div style={{display:"flex",gap:"8px"}}><a href="/admin" style={{padding:"8px 12px",border:"1px solid #cbd5e1",borderRadius:"8px",textDecoration:"none",color:"#334155",fontWeight:700,fontSize:"12px"}}>🏢 Empresas</a><button onClick={()=>setMostrarAlta(true)} style={{padding:"8px 14px",border:0,borderRadius:"8px",backgroundColor:"#b45309",color:"#fff",fontWeight:800,cursor:"pointer"}}>+ Alta Partner</button></div>
    </header>
    <main style={{maxWidth:"1200px",margin:"0 auto",padding:"22px"}}>
      <h1 style={{fontSize:"22px",margin:"0 0 4px"}}>🤝 Partners Comerciales</h1><p style={{color:"#64748b",fontSize:"13px",marginTop:0}}>La comisión no es general: cada empresa puede tener un acuerdo distinto. Acá ves lo generado y lo pagado.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"10px",margin:"18px 0"}}>
        {[['Partners registrados',partners.length],['Comisiones pendientes',`$${resumen.pendiente.toLocaleString('es-AR')}`],['Total pagado',`$${resumen.pagado.toLocaleString('es-AR')}`]].map(([t,v])=><div key={t} style={{backgroundColor:"#fff",border:"1px solid #e2e8f0",borderRadius:"10px",padding:"14px"}}><div style={{fontSize:"11px",color:"#64748b",fontWeight:800}}>{t}</div><div style={{fontSize:"23px",fontWeight:900,marginTop:"4px"}}>{v}</div></div>)}
      </div>
      <div style={{display:"grid",gap:"12px"}}>{partners.length===0?<div style={{backgroundColor:"#fff",padding:"22px",borderRadius:"10px",border:"1px solid #e2e8f0",color:"#64748b"}}>No hay Partners cargados.</div>:partners.map(p=>{
        const hist=comisiones.filter(c=>(c.partner_id&&c.partner_id===p.id)||(!c.partner_id&&c.partner_nombre===p.nombre));
        const pend=hist.filter(c=>c.estado!=="pagada").reduce((a,c)=>a+Number(c.importe_comision||0),0);
        return <div key={p.id||p.email||p.nombre} style={{backgroundColor:"#fff",border:"1px solid #e2e8f0",borderRadius:"10px",padding:"15px"}}><div style={{display:"flex",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}><div><div style={{fontWeight:900,fontSize:"16px"}}>{p.nombre}</div><div style={{fontSize:"12px",color:"#64748b"}}>{p.email||""} {p.telefono?`· ${p.telefono}`:""}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:"11px",color:"#64748b"}}>Pendiente</div><div style={{fontWeight:900,color:"#b45309"}}>${pend.toLocaleString('es-AR')}</div></div></div><div style={{marginTop:"10px",display:"flex",gap:"8px",flexWrap:"wrap"}}><button onClick={()=>setPartnerDetalle(p)} style={{padding:"7px 11px",borderRadius:"7px",border:"1px solid #0284c7",backgroundColor:"#e0f2fe",color:"#0369a1",fontWeight:800,cursor:"pointer"}}>📒 Ver historial</button><button onClick={()=>guardarPartners(partners.map(x=>x.id===p.id?{...x,activo:x.activo===false?true:false}:x))} style={{padding:"7px 11px",borderRadius:"7px",border:"1px solid #cbd5e1",backgroundColor:"#fff",fontWeight:700,cursor:"pointer"}}>{p.activo===false?"✓ Reactivar":"⏸ Pausar"}</button></div></div>
      })}</div>
    </main>

    {mostrarAlta&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",zIndex:100}}><div style={{background:"#fff",borderRadius:"12px",padding:"22px",width:"100%",maxWidth:"520px"}}><h3 style={{marginTop:0}}>+ Alta Nuevo Partner</h3><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const nom=String(f.get('nombre')||'').trim(),mail=String(f.get('email')||'').trim();if(!nom||!mail)return;const n={id:'PR-'+Date.now(),nombre:nom,email:mail,telefono:String(f.get('telefono')||'').trim(),activo:true,territorios:[]};guardarPartners([n,...partners]);setMostrarAlta(false);}} style={{display:"grid",gap:"10px"}}><label>Nombre *<input name="nombre" required style={input}/></label><label>Email *<input name="email" type="email" required style={input}/></label><label>Teléfono / WhatsApp<input name="telefono" style={input}/></label><div style={{fontSize:"12px",color:"#64748b",background:"#f8fafc",padding:"10px",borderRadius:"8px"}}>La comisión se define después por cada empresa. Un mismo Partner puede tener acuerdos distintos con clientes distintos.</div><div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}><button type="button" onClick={()=>setMostrarAlta(false)}>Cancelar</button><button type="submit" style={{background:"#b45309",color:"#fff",border:0,borderRadius:"7px",padding:"9px 15px",fontWeight:800}}>Crear Partner</button></div></form></div></div>}

    {partnerDetalle&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",zIndex:110}}><div style={{background:"#fff",borderRadius:"12px",padding:"20px",width:"100%",maxWidth:"900px",maxHeight:"90vh",overflow:"auto"}}><div style={{display:"flex",justifyContent:"space-between"}}><div><h3 style={{margin:"0 0 3px"}}>📒 {partnerDetalle.nombre}</h3><div style={{fontSize:"12px",color:"#64748b"}}>Historial de comisiones generado por cobros reales de empresas.</div></div><button onClick={()=>setPartnerDetalle(null)}>✕</button></div><div style={{marginTop:"14px",overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}><thead><tr>{['Fecha','Empresa','Cobro','Acuerdo','Comisión','Estado','Pago'].map(h=><th key={h} style={{textAlign:"left",padding:"8px",borderBottom:"1px solid #cbd5e1"}}>{h}</th>)}</tr></thead><tbody>{comisiones.filter(c=>(c.partner_id&&c.partner_id===partnerDetalle.id)||(!c.partner_id&&c.partner_nombre===partnerDetalle.nombre)).map(c=><tr key={c.id}><td style={{padding:"8px",borderBottom:"1px solid #f1f5f9"}}>{new Date(c.fecha_generada).toLocaleDateString('es-AR')}</td><td style={{padding:"8px",borderBottom:"1px solid #f1f5f9"}}>{c.empresa}</td><td style={{padding:"8px",borderBottom:"1px solid #f1f5f9"}}>{c.moneda} ${Number(c.cobro_empresa||0).toLocaleString('es-AR')}</td><td style={{padding:"8px",borderBottom:"1px solid #f1f5f9"}}>{c.tipo_comision==='porcentaje'?`${c.valor_acuerdo}%`:`$${Number(c.valor_acuerdo||0).toLocaleString('es-AR')}`}</td><td style={{padding:"8px",borderBottom:"1px solid #f1f5f9",fontWeight:900}}>{c.moneda} ${Number(c.importe_comision||0).toLocaleString('es-AR')}</td><td style={{padding:"8px",borderBottom:"1px solid #f1f5f9"}}>{c.estado==='pagada'?`✅ Pagada${c.fecha_pago?' '+new Date(c.fecha_pago).toLocaleDateString('es-AR'):''}`:'🟡 Pendiente'}</td><td style={{padding:"8px",borderBottom:"1px solid #f1f5f9"}}>{c.estado==='pagada'?<span>{c.medio_pago||'—'}{c.notas_pago?` · ${c.notas_pago}`:''}</span>:<button onClick={()=>setPago({id:c.id,importe:String(c.importe_comision||0),medio:'Transferencia',notas:''})}>💰 Registrar pago</button>}</td></tr>)}{comisiones.filter(c=>(c.partner_id&&c.partner_id===partnerDetalle.id)||(!c.partner_id&&c.partner_nombre===partnerDetalle.nombre)).length===0&&<tr><td colSpan="7" style={{padding:"20px",textAlign:"center",color:"#64748b"}}>Todavía no hay comisiones generadas.</td></tr>}</tbody></table></div></div></div>}

    {pago&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",zIndex:120}}><div style={{background:"#fff",padding:"20px",borderRadius:"12px",width:"100%",maxWidth:"430px"}}><h3 style={{marginTop:0}}>💰 Registrar pago al Partner</h3><form onSubmit={registrarPago} style={{display:"grid",gap:"10px"}}><label>Importe pagado<input type="number" step="0.01" value={pago.importe} onChange={e=>setPago({...pago,importe:e.target.value})} style={input}/></label><label>Medio de pago<input value={pago.medio} onChange={e=>setPago({...pago,medio:e.target.value})} style={input}/></label><label>Notas<textarea rows="3" value={pago.notas} onChange={e=>setPago({...pago,notas:e.target.value})} style={input}/></label><div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}><button type="button" onClick={()=>setPago(null)}>Cancelar</button><button type="submit" style={{background:"#059669",color:"#fff",border:0,borderRadius:"7px",padding:"9px 14px",fontWeight:800}}>Guardar pago</button></div></form></div></div>}
  </div>;
}
