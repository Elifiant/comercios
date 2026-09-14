import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const iconoAzul = new L.Icon({
 iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
 iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
 shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
 iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const COMERCIOS_DEMO = [
 { id: 101, nombre: "Supermercado San Martín", rubro: "Almacén", direccion: "Av. San Martín 1420", preventista: "Ian", fecha: "13/09/2024 10:30", latitud: -34.7185, longitud: -58.2650, total_pedidos: 125400, estado: "Activo" },
 { id: 102, nombre: "Kiosco El Trébol", rubro: "Kiosco", direccion: "Mitre 450", preventista: "Alex", fecha: "13/09/2024 11:15", latitud: -34.7210, longitud: -58.2610, total_pedidos: 48200, estado: "Activo" },
 { id: 103, nombre: "Fiambrería Los Hermanos", rubro: "Fiambrería", direccion: "Rivadavia 890", preventista: "Walter", fecha: "13/09/2024 12:05", latitud: -34.7150, longitud: -58.2680, total_pedidos: 89600, estado: "Activo" },
 { id: 104, nombre: "Almacén La Esquina", rubro: "Almacén", direccion: "Belgrano 1102", preventista: "Ian", fecha: "13/09/2024 12:45", latitud: -34.7240, longitud: -58.2635, total_pedidos: 63100, estado: "Activo" }
];

function AutoFit({ puntos }) {
 const map = useMap();
 useEffect(() => {
 if (puntos && puntos.length > 0) {
 const bounds = L.latLngBounds(puntos.map(p => [p.latitud, p.longitud]));
 map.fitBounds(bounds, { padding: [40, 40] });
 }
 }, [puntos, map]);
 return null;
}

export default function Supervisor() {
 const [preventistaSel, setPreventistaSel] = useState("Todos");
 const [rubroSel, setRubroSel] = useState("Todos");
 const [menuAbierto, setMenuAbierto] = useState(false);
 const [comercioActivo, setComercioActivo] = useState(null);

 const comerciosFiltrados = COMERCIOS_DEMO.filter(c => {
 const cumplePrev = preventistaSel === "Todos" || c.preventista === preventistaSel;
 const cumpleRubro = rubroSel === "Todos" || c.rubro === rubroSel;
 return cumplePrev && cumpleRubro;
 });

 const totalFacturado = comerciosFiltrados.reduce((acc, c) => acc + c.total_pedidos, 0);

 return (
 <div style={{ display: "flex", height: "100vh", width: "100vw", background: "#0f172a", color: "#f8fafc", fontFamily: "sans-serif", overflow: "hidden" }}>
 {/* SIDEBAR DESKTOP & MOVIL OVERLAY */}
 <aside style={{
 width: "250px",
 background: "#1e293b",
 borderRight: "1px solid #334155",
 display: "flex",
 flexDirection: "column",
 position: window.innerWidth < 768 ? "fixed" : "relative",
 left: window.innerWidth < 768 ? (menuAbierto ? 0 : "-260px") : 0,
 top: 0,
 bottom: 0,
 zIndex: 1000,
 transition: "left 0.3s ease",
 boxShadow: window.innerWidth < 768 && menuAbierto ? "4px 0 20px rgba(0,0,0,0.5)" : "none"
 }}>
 <div style={{ padding: "18px 20px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
 <div>
 <div style={{ fontSize: "18px", fontWeight: "800", color: "#38bdf8", letterSpacing: "-0.5px" }}>📍 RutaComercio</div>
 <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Panel de Supervisión · Demo</div>
 </div>
 {window.innerWidth < 768 && (
 <button onClick={() => setMenuAbierto(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
 )}
 </div>

 <nav style={{ padding: "14px 10px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
 <a href="/supervisor" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: "#2563eb", color: "#fff", textDecoration: "none", fontSize: "14px", fontWeight: "700" }}>
 <span>🗺️</span> Monitoreo en Vivo (Mapa)
 </a>
 <a href="/pedidos" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: "transparent", color: "#cbd5e1", textDecoration: "none", fontSize: "14px", fontWeight: "500" }}>
 <span>📦</span> Pedidos y Ventas Diarias
 </a>
 <a href="#comercios" onClick={(e) => { e.preventDefault(); alert("Mostrando los " + comerciosFiltrados.length + " comercios en el panel derecho"); }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: "transparent", color: "#cbd5e1", textDecoration: "none", fontSize: "14px", fontWeight: "500" }}>
 <span>🏪</span> Comercios y Fichas
 </a>
 <a href="#rutas" onClick={(e) => { e.preventDefault(); alert("Seguimiento de rutas de Ian, Alex y Walter activo."); }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: "transparent", color: "#cbd5e1", textDecoration: "none", fontSize: "14px", fontWeight: "500" }}>
 <span>📍</span> Rutas y Preventistas
 </a>
 </nav>

 <div style={{ padding: "16px", borderTop: "1px solid #334155", background: "#0f172a" }}>
 <div style={{ fontSize: "12px", color: "#64748b" }}>Empresa Activa</div>
 <div style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>🏢 Elifiant (Demo)</div>
 <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
 <a href="/web" style={{ fontSize: "12px", color: "#38bdf8", textDecoration: "none" }}>← Ir a Web Comercial</a>
 </div>
 </div>
 </aside>

 {/* MAIN CONTENT */}
 <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
 {/* HEADER */}
 <header style={{
 background: "#1e293b",
 borderBottom: "1px solid #334155",
 padding: "12px 16px",
 display: "flex",
 flexWrap: "wrap",
 alignItems: "center",
 justifyContent: "space-between",
 gap: "12px"
 }}>
 <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
 {window.innerWidth < 768 && (
 <button onClick={() => setMenuAbierto(true)} style={{ background: "#334155", border: "none", color: "#fff", padding: "8px 12px", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>
 ☰ Menú
 </button>
 )}
 <div>
 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>Auditoría de Rutas y Comercios</h2>
 <span style={{ fontSize: "12px", color: "#94a3b8" }}>{comerciosFiltrados.length} puntos relevados</span>
 </div>
 </div>

 {/* FILTROS CON CONTRASTE ALTO (NOMBRES SIEMPRE VISIBLES) */}
 <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
 <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
 <label style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: "bold" }}>Preventista:</label>
 <select
 value={preventistaSel}
 onChange={(e) => setPreventistaSel(e.target.value)}
 style={{
 background: "#ffffff",
 color: "#0f172a",
 border: "2px solid #38bdf8",
 borderRadius: "6px",
 padding: "6px 10px",
 fontSize: "13px",
 fontWeight: "700",
 cursor: "pointer",
 outline: "none"
 }}
 >
 <option value="Todos">Todos los preventistas</option>
 <option value="Ian">👤 Ian</option>
 <option value="Alex">👤 Alex</option>
 <option value="Walter">👤 Walter</option>
 </select>
 </div>

 <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
 <label style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: "bold" }}>Rubro:</label>
 <select
 value={rubroSel}
 onChange={(e) => setRubroSel(e.target.value)}
 style={{
 background: "#ffffff",
 color: "#0f172a",
 border: "1px solid #94a3b8",
 borderRadius: "6px",
 padding: "6px 10px",
 fontSize: "13px",
 fontWeight: "600",
 cursor: "pointer",
 outline: "none"
 }}
 >
 <option value="Todos">Todos los rubros</option>
 <option value="Almacén">Almacén</option>
 <option value="Kiosco">Kiosco</option>
 <option value="Fiambrería">Fiambrería</option>
 </select>
 </div>

 <div style={{ background: "#0f172a", padding: "6px 12px", borderRadius: "6px", border: "1px solid #334155", fontSize: "13px", fontWeight: "700", color: "#4ade80" }}>
 Total: $ {totalFacturado.toLocaleString("es-AR")}
 </div>
 </div>
 </header>

 {/* MAPA + LISTADO DERECHO */}
 <div style={{ flex: 1, display: "flex", flexDirection: window.innerWidth < 900 ? "column" : "row", overflow: "hidden" }}>
 {/* MAPA */}
 <div style={{ flex: 2, height: window.innerWidth < 900 ? "55vh" : "100%", position: "relative" }}>
 <MapContainer center={[-34.72, -58.265]} zoom={14} style={{ height: "100%", width: "100%" }}>
 <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
 <AutoFit puntos={comerciosFiltrados} />
 {comerciosFiltrados.map((c) => (
 <Marker key={c.id} position={[c.latitud, c.longitud]} icon={iconoAzul}>
 <Popup>
 <div style={{ color: "#0f172a", fontSize: "13px" }}>
 <div style={{ fontWeight: "bold", fontSize: "14px" }}>{c.nombre}</div>
 <div>🏪 {c.rubro} · {c.direccion}</div>
 <div style={{ marginTop: "4px", color: "#2563eb", fontWeight: "600" }}>👤 Preventista: {c.preventista}</div>
 <div style={{ fontSize: "12px", color: "#64748b" }}>🕒 {c.fecha}</div>
 <div style={{ marginTop: "6px", fontWeight: "bold", color: "#16a34a" }}>Total Ventas: ${c.total_pedidos.toLocaleString("es-AR")}</div>
 </div>
 </Popup>
 </Marker>
 ))}
 </MapContainer>
 </div>

 {/* FEED LISTA DERECHA */}
 <div style={{
 flex: 1,
 background: "#1e293b",
 borderLeft: "1px solid #334155",
 display: "flex",
 flexDirection: "column",
 overflowY: "auto",
 height: window.innerWidth < 900 ? "45vh" : "100%"
 }}>
 <div style={{ padding: "12px 16px", borderBottom: "1px solid #334155", background: "#0f172a", position: "sticky", top: 0, zIndex: 10 }}>
 <div style={{ fontSize: "13px", fontWeight: "700", color: "#f8fafc" }}>Feed de Comercios ({comerciosFiltrados.length})</div>
 </div>

 <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
 {comerciosFiltrados.map(c => (
 <div key={c.id} style={{
 background: "#0f172a",
 border: "1px solid #334155",
 borderRadius: "8px",
 padding: "12px",
 display: "flex",
 flexDirection: "column",
 gap: "4px"
 }}>
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
 <div style={{ fontWeight: "700", fontSize: "14px", color: "#f8fafc" }}>{c.nombre}</div>
 <span style={{ fontSize: "11px", background: "#1e3a8a", color: "#60a5fa", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>{c.rubro}</span>
 </div>
 <div style={{ fontSize: "12px", color: "#94a3b8" }}>📍 {c.direccion}</div>
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed #334155" }}>
 <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "bold" }}>👤 {c.preventista}</span>
 <span style={{ fontSize: "13px", fontWeight: "800", color: "#4ade80" }}>${c.total_pedidos.toLocaleString("es-AR")}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}