import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
 iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
 iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
 shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const crearIcono = (num, esInicio) => L.divIcon({
 className: "custom-stop-pin",
 html: "<div style=\"background:" + (esInicio ? "#10b981" : "#2563eb") + ";color:#fff;font-weight:800;font-size:12px;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.35)\">" + num + "</div>",
 iconSize: [28, 28],
 iconAnchor: [14, 14],
});

export default function PlanificadorRutas() {
 const [dia, setDia] = useState("JUEVES");
 const [comercios, setComercios] = useState([]);
 const [secuencia, setSecuencia] = useState([]);
 const [enviado, setEnviado] = useState(false);

 useEffect(() => {
 async function cargar() {
 try {
 const res = await supabase.from("comercios").select("*").order("id", { ascending: true });
 if (res.data && res.data.length > 0) {
 setComercios(res.data);
 setSecuencia(res.data.slice(0, Math.min(6, res.data.length)));
 }
 } catch (e) {
 console.error(e);
 }
 }
 cargar();
 }, []);

 const subir = (i) => {
 if (i === 0) return;
 const n = [...secuencia];
 const aux = n[i - 1];
 n[i - 1] = n[i];
 n[i] = aux;
 setSecuencia(n);
 };

 const bajar = (i) => {
 if (i === secuencia.length - 1) return;
 const n = [...secuencia];
 const aux = n[i + 1];
 n[i + 1] = n[i];
 n[i] = aux;
 setSecuencia(n);
 };

 const quitar = (id) => setSecuencia(secuencia.filter(c => c.id !== id));
 const sumar = (c) => {
 if (secuencia.some(s => s.id === c.id) === false) {
 setSecuencia([...secuencia, c]);
 }
 };

 const optimizar = () => {
 if (secuencia.length < 3) return;
 const copia = [...secuencia];
 const opt = [copia[0]];
 const resto = copia.slice(1);
 while (resto.length > 0) {
 const ult = opt[opt.length - 1];
 let minD = Infinity;
 let mejor = 0;
 resto.forEach((r, idx) => {
 const d = Math.hypot((r.latitud || 0) - (ult.latitud || 0), (r.longitud || 0) - (ult.longitud || 0));
 if (d < minD) { minD = d; mejor = idx; }
 });
 opt.push(resto.splice(mejor, 1)[0]);
 }
 setSecuencia(opt);
 };

 const pendientes = comercios.filter(c => secuencia.some(s => s.id === c.id) === false);
 const linea = secuencia
 .map(c => [c.ubicacion_exacta_latitud || c.latitud, c.ubicacion_exacta_longitud || c.longitud])
 .filter(([lat, lng]) => Boolean(lat && lng));
 const centro = linea.length > 0 ? linea[0] : [-34.719, -58.265];

 return (
 <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
 <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 20 }}>
 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
 <a href="/supervisor" style={{ textDecoration: "none", color: "#64748b", fontSize: "13px", fontWeight: "bold" }}>← Volver al Supervisor</a>
 <span style={{ color: "#cbd5e1" }}>|</span>
 <div>
 <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Planificador Visual de Hojas de Ruta</h1>
 <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Walter Morales · Elifiant Zona Sur</p>
 </div>
 </div>
 <div style={{ display: "flex", gap: "10px" }}>
 <button onClick={optimizar} style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "8px 14px", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}>⚡ Auto-optimizar</button>
 <button onClick={() => { setEnviado(true); setTimeout(() => setEnviado(false), 3000); }} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}>{enviado ? "✓ Enviada a Walter" : "📲 Enviar Hoja a Walter"}</button>
 </div>
 </header>
 <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "8px 24px", display: "flex", alignItems: "center", gap: "8px" }}>
 <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", marginRight: "8px" }}>DIA:</span>
 {["LUN", "MAR", "MIE", "JUEVES", "VIE", "SAB", "TODOS"].map(d => (
 <button key={d} onClick={() => setDia(d)} style={{ background: dia === d ? "#2563eb" : "#f1f5f9", color: dia === d ? "#fff" : "#475569", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: dia === d ? "800" : "600", cursor: "pointer" }}>{d}</button>
 ))}
 </div>
 <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
 <div style={{ flex: 1, position: "relative" }}>
 <MapContainer center={centro} zoom={14} style={{ width: "100%", height: "100%" }}>
 <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
 {linea.length > 1 && <Polyline positions={linea} color="#2563eb" weight={4} dashArray="6, 6" />}
 {secuencia.map((c, idx) => {
 const lat = c.ubicacion_exacta_latitud || c.latitud;
 const lng = c.ubicacion_exacta_longitud || c.longitud;
 if (!lat || !lng) return null;
 return (
 <Marker key={c.id} position={[lat, lng]} icon={crearIcono(idx + 1, idx === 0)}>
 <Popup><div><strong>#{idx + 1}: {c.nombre}</strong><p style={{ margin: "4px 0 0", fontSize: "12px" }}>{c.direccion || ""}</p></div></Popup>
 </Marker>
 );
 })}
 </MapContainer>
 <div style={{ position: "absolute", bottom: "20px", left: "20px", background: "rgba(255,255,255,0.95)", padding: "12px 18px", borderRadius: "10px", boxShadow: "0 4px 14px rgba(0,0,0,0.15)", display: "flex", gap: "20px", zIndex: 1000 }}>
 <div><div style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>RECORRIDO</div><div style={{ fontSize: "18px", fontWeight: "800" }}>{(secuencia.length * 1.2).toFixed(1)} km</div></div>
 <div><div style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>PARADAS {dia}</div><div style={{ fontSize: "18px", fontWeight: "800", color: "#2563eb" }}>{secuencia.length} comercios</div></div>
 </div>
 </div>
 <div style={{ width: "380px", background: "#fff", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
 <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
 <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>Secuencia ({dia})</h2>
 <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>Ordena el recorrido parada por parada.</p>
 </div>
 <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
 {secuencia.map((comercio, index) => (
 <div key={comercio.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", border: index === 0 ? "1px solid #10b981" : "1px solid #e2e8f0" }}>
 <div style={{ background: index === 0 ? "#10b981" : "#2563eb", color: "#fff", fontWeight: "800", fontSize: "12px", width: "26px", height: "26px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{index + 1}</div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{comercio.nombre || "Comercio #" + comercio.id} {index === 0 && <span style={{ background: "#dcfce7", color: "#166534", fontSize: "10px", padding: "1px 4px", borderRadius: "4px" }}>PARTIDA</span>}</div>
 <div style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{comercio.direccion || "Sin direccion"}</div>
 </div>
 <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
 <button onClick={() => subir(index)} disabled={index === 0} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "4px", width: "24px", height: "24px", cursor: index === 0 ? "default" : "pointer", opacity: index === 0 ? 0.3 : 1, fontWeight: "bold" }}>▲</button>
 <button onClick={() => bajar(index)} disabled={index === secuencia.length - 1} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "4px", width: "24px", height: "24px", cursor: index === secuencia.length - 1 ? "default" : "pointer", opacity: index === secuencia.length - 1 ? 0.3 : 1, fontWeight: "bold" }}>▼</button>
 <button onClick={() => quitar(comercio.id)} style={{ background: "#fff", border: "1px solid #fecaca", color: "#ef4444", borderRadius: "4px", width: "24px", height: "24px", cursor: "pointer", fontWeight: "bold" }}>✕</button>
 </div>
 </div>
 ))}
 {pendientes.length > 0 && (
 <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1" }}>
 <div style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b", marginBottom: "8px" }}>Comercios pendientes ({pendientes.length}):</div>
 <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
 {pendientes.slice(0, 6).map(p => (
 <div key={p.id} onClick={() => sumar(p)} style={{ padding: "8px 10px", background: "#f1f5f9", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
 <span style={{ color: "#334155", fontWeight: "600" }}>{p.nombre || "Comercio #" + p.id}</span>
 <span style={{ color: "#2563eb", fontWeight: "bold" }}>+ Sumar</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}