import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "./supabase";

function iconoNumero(numero) {
  return L.divIcon({
    className: "pin-ruta",
    html: `<div style="background:#2563eb;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;border:2px solid white;box-shadow:0 2px 7px rgba(0,0,0,.35)">${numero}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function AjustarMapa({ puntos }) {
  const map = useMap();
  useEffect(() => {
    const validos = puntos.filter(p => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (validos.length) map.fitBounds(L.latLngBounds(validos), { padding: [35, 35], maxZoom: 15 });
  }, [puntos, map]);
  return null;
}

const normalizar = v =>
  String(v || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function DisenadorRutas({ perfilSupervisor, perfiles = [] }) {
  const preventistas = useMemo(
    () => perfiles.filter(p => normalizar(p.rol) === "PREVENTISTA"),
    [perfiles]
  );

  const [preventista, setPreventista] = useState("");
  const [dia, setDia] = useState("LUNES");
  const [paradas, setParadas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [visitasHoy, setVisitasHoy] = useState([]);

  useEffect(() => {
    if (!preventista && preventistas.length) {
      setPreventista(preventistas[0].nombre || preventistas[0].email || "");
    }
  }, [preventistas, preventista]);

  const cargarRuta = async () => {
    if (!perfilSupervisor?.empresa_id || !preventista || !dia) {
      setParadas([]);
      return;
    }
    setCargando(true);
    setMensaje("");
    try {
      const { data, error } = await supabase
        .from("comercios")
        .select("*")
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .order("orden_visita", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });
      if (error) throw error;

      // Filtramos acá para que no importe si Supabase tiene
      // "Lunes", "LUNES", "lunes" o diferencias de acentos.
      const filtrados = (data || []).filter(c =>
        normalizar(c.preventista) === normalizar(preventista) &&
        normalizar(c.dia_visita) === normalizar(dia)
      );
      setParadas(filtrados);
    } catch (e) {
      console.error("Error cargando ruta:", e);
      setParadas([]);
      setMensaje("❌ No se pudo cargar la hoja de ruta.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarRuta(); }, [perfilSupervisor?.empresa_id, preventista, dia]);

  // Visitas reales de hoy del preventista seleccionado.
  useEffect(() => {
    if (!perfilSupervisor?.empresa_id || !preventista) {
      setVisitasHoy([]);
      return;
    }
    const cargarVisitasHoy = async () => {
      try {
        const ahora = new Date();
        const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString();
        const { data, error } = await supabase
          .from("visitas")
          .select("comercio_id, resultado, fecha, empresa_id, preventista")
          .eq("empresa_id", perfilSupervisor.empresa_id)
          .gte("fecha", inicioHoy)
          .order("fecha", { ascending: true });
        if (error) throw error;
        setVisitasHoy((data || []).filter(v =>
          normalizar(v.preventista) === normalizar(preventista) &&
          v.comercio_id !== null && v.comercio_id !== undefined
        ));
      } catch (e) {
        console.error("Error cargando visitas reales de hoy:", e);
        setVisitasHoy([]);
      }
    };
    cargarVisitasHoy();
  }, [perfilSupervisor?.empresa_id, preventista]);


  const moverParada = (index, direccion) => {
    setParadas(prev => {
      const nuevoIndex = index + direccion;
      if (nuevoIndex < 0 || nuevoIndex >= prev.length) return prev;
      const copia = [...prev];
      [copia[index], copia[nuevoIndex]] = [copia[nuevoIndex], copia[index]];
      return copia;
    });
    setMensaje("Cambios sin guardar");
  };

  const soltarEn = destino => {
    if (dragIndex === null || dragIndex === destino) return setDragIndex(null);
    setParadas(prev => {
      const copia = [...prev];
      const [movida] = copia.splice(dragIndex, 1);
      copia.splice(destino, 0, movida);
      return copia;
    });
    setDragIndex(null);
    setMensaje("Cambios sin guardar");
  };

  const guardar = async () => {
    if (!paradas.length || !perfilSupervisor?.empresa_id) return;
    setGuardando(true);
    setMensaje("");
    try {
      const resultados = await Promise.all(
        paradas.map((c, i) =>
          supabase.from("comercios")
            .update({ orden_visita: i + 1 })
            .eq("id", c.id)
            .eq("empresa_id", perfilSupervisor.empresa_id)
        )
      );
      const fallo = resultados.find(r => r.error);
      if (fallo?.error) throw fallo.error;

      // La base vuelve a ser la única verdad: releemos después de guardar.
      const { data, error } = await supabase
        .from("comercios")
        .select("*")
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .order("orden_visita", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });
      if (error) throw error;

      const filtrados = (data || []).filter(c =>
        normalizar(c.preventista) === normalizar(preventista) &&
        normalizar(c.dia_visita) === normalizar(dia)
      );
      setParadas(filtrados);
      setMensaje("✓ Ruta guardada");
    } catch (e) {
      console.error("Error guardando ruta:", e);
      setMensaje("❌ No se pudo guardar la ruta.");
    } finally {
      setGuardando(false);
    }
  };

  const coordenadaDe = c => {
    const lat = Number(c.ubicacion_exacta_latitud || c.latitud);
    const lng = Number(c.ubicacion_exacta_longitud || c.longitud);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  };

  const puntos = paradas.map(coordenadaDe).filter(Boolean);
  const idsVisitadosHoy = new Set((visitasHoy || []).map(v => String(v.comercio_id)));

  let ultimaParadaConsecutivaVisitada = -1;
  for (let i = 0; i < paradas.length; i += 1) {
    if (idsVisitadosHoy.has(String(paradas[i].id))) ultimaParadaConsecutivaVisitada = i;
    else break;
  }

  const puntosRecorridos = paradas
    .slice(0, ultimaParadaConsecutivaVisitada + 1)
    .map(coordenadaDe).filter(Boolean);

  const inicioPendiente = Math.max(ultimaParadaConsecutivaVisitada, 0);
  const puntosPendientes = paradas
    .slice(inicioPendiente)
    .map(coordenadaDe).filter(Boolean);

  const centro = puntos[0] || [-34.72, -58.26];
  const dias = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];

  return (
    <div style={{ background:"#f8fafc", borderRadius:12 }}>
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:12, marginBottom:14 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <strong style={{fontSize:14}}>🗓️ Diseñador de Hojas de Ruta</strong>
          <select value={preventista} onChange={e=>setPreventista(e.target.value)}
            style={{padding:"7px 10px",border:"1px solid #cbd5e1",borderRadius:7}}>
            {preventistas.map(p => {
              const n=p.nombre || p.email;
              return <option key={p.id || n} value={n}>{n}</option>;
            })}
          </select>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {dias.map(d => <button key={d} onClick={()=>setDia(d)}
              style={{padding:"6px 9px",borderRadius:6,border:"1px solid #cbd5e1",cursor:"pointer",
                background:dia===d?"#2563eb":"#fff",color:dia===d?"#fff":"#334155",fontWeight:700,fontSize:11}}>
              {d.charAt(0)+d.slice(1).toLowerCase()}
            </button>)}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"minmax(320px,420px) 1fr",gap:16}}>
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <strong>{preventista || "Preventista"} · {dia}</strong>
              <div style={{fontSize:11,color:"#64748b"}}>{paradas.length} paradas · arrastrá para ordenar</div>
            </div>
            <span style={{fontSize:11,fontWeight:700,color:mensaje.startsWith("✓")?"#16a34a":"#64748b"}}>{mensaje}</span>
          </div>

          {cargando ? <div style={{padding:20}}>Cargando ruta...</div> :
           paradas.length===0 ? <div style={{padding:20,color:"#64748b"}}>No hay comercios asignados para este día.</div> :
           <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:470,overflowY:"auto"}}>
             {paradas.map((c,i)=>(
               <div key={c.id}
                 draggable
                 onDragStart={()=>setDragIndex(i)}
                 onDragOver={e=>e.preventDefault()}
                 onDrop={()=>soltarEn(i)}
                 onDragEnd={()=>setDragIndex(null)}
                 style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",
                   border:dragIndex===i?"2px dashed #2563eb":"1px solid #e2e8f0",
                   borderRadius:8,background:"#fff",cursor:"grab",boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                 <span title="Arrastrar" style={{fontSize:20,color:"#94a3b8",cursor:"grab"}}>☰</span>
                 <span style={{width:25,height:25,borderRadius:"50%",background:"#2563eb",color:"#fff",
                   display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</span>
                 <div style={{minWidth:0,flex:1}}>
                   <div style={{fontSize:12,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                     {c.nombre || `Comercio #${c.id}`}
                   </div>
                   <div style={{fontSize:10,color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                     {c.direccion || "Sin dirección"}
                   </div>
                 </div>
                  <div style={{display:"flex",gap:5,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                    <button type="button" onClick={()=>moverParada(i,-1)} disabled={i===0} style={{width:34,height:34,borderRadius:7,border:"1px solid #cbd5e1",background:i===0?"#f1f5f9":"#fff",fontSize:15,fontWeight:800}}>▲</button>
                    <button type="button" onClick={()=>moverParada(i,1)} disabled={i===paradas.length-1} style={{width:34,height:34,borderRadius:7,border:"1px solid #cbd5e1",background:i===paradas.length-1?"#f1f5f9":"#fff",fontSize:15,fontWeight:800}}>▼</button>
                  </div>
               </div>
             ))}
           </div>}

          <button onClick={guardar} disabled={guardando || !paradas.length}
            style={{width:"100%",marginTop:12,padding:"11px",border:0,borderRadius:8,
              background:"#16a34a",color:"#fff",fontWeight:800,cursor:"pointer",fontSize:13}}>
            {guardando ? "Guardando..." : "💾 GUARDAR HOJA DE RUTA"}
          </button>
        </div>

        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{fontSize:12,fontWeight:800}}>🗺️ Orden de recorrido</div>
            <div style={{fontSize:10,fontWeight:700}}>
              <span style={{color:"#16a34a",marginRight:10}}>— Recorrido</span>
              <span style={{color:"#2563eb"}}>- - Pendiente</span>
            </div>
          </div>
          <div style={{height:520,borderRadius:8,overflow:"hidden"}}>
            <MapContainer center={centro} zoom={14} style={{height:"100%",width:"100%"}}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
              <AjustarMapa puntos={puntos}/>
              {puntosRecorridos.length > 1 && (
                <Polyline positions={puntosRecorridos}
                  pathOptions={{ color:"#16a34a", weight:4, opacity:0.9 }} />
              )}
              {puntosPendientes.length > 1 && (
                <Polyline positions={puntosPendientes}
                  pathOptions={{ color:"#2563eb", weight:4, opacity:0.8, dashArray:"8, 8" }} />
              )}
              {paradas.map((c,i)=>{
                const lat=Number(c.ubicacion_exacta_latitud || c.latitud);
                const lng=Number(c.ubicacion_exacta_longitud || c.longitud);
                if(!Number.isFinite(lat)||!Number.isFinite(lng)) return null;
                return <Marker key={`${c.id}-${i}`} position={[lat,lng]} icon={iconoNumero(i+1)}>
                  <Popup><strong>Parada #{i+1}</strong><br/>{c.nombre || `Comercio #${c.id}`}</Popup>
                </Marker>;
              })}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
