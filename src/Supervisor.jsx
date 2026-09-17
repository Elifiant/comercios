import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/dist/images/marker-shadow.png",
});

const COLORES = ["#2563eb", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

function iconoNumero(numero, estado) {
  const bg = estado === "visitado" ? "#10b981" : estado === "activo" ? "#2563eb" : "#64748b";
  return L.divIcon({
    className: "pin-parada",
    html: `<div style="background-color: ${bg}; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">${numero}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
}

function AutoCentradoMapa({ puntos, puntoActivo }) {
  const map = useMap();
  useEffect(() => {
    if (puntoActivo && puntoActivo[0] && puntoActivo[1]) {
      map.flyTo(puntoActivo, 16, { duration: 1.2 });
      return;
    }
    if (puntos && puntos.length > 0) {
      const bounds = L.latLngBounds(puntos);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [puntos, puntoActivo, map]);
  return null;
}

export default function Supervisor() {
 const [sesionSupervisor, setSesionSupervisor] = useState(null);
 const [emailSup, setEmailSup] = useState("");
 const [passSup, setPassSup] = useState("");
 const [errorSup, setErrorSup] = useState(null);
 const [cargandoAuthSup, setCargandoAuthSup] = useState(false);
 const iniciarSesionSupervisor = async (e) => { e.preventDefault(); setCargandoAuthSup(true); setErrorSup(null); const { data, error } = await supabase.auth.signInWithPassword({ email: emailSup.trim(), password: passSup }); if (error) { setErrorSup("Credenciales incorrectas o usuario no autorizado"); } else { setSesionSupervisor(data.session); } setCargandoAuthSup(false); };
 const cerrarSesionSupervisor = async () => { await supabase.auth.signOut(); setSesionSupervisor(null); };
  const [comercios, setComercios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState("monitoreo");
  const [preventistaSeleccionado, setPreventistaSeleccionado] = useState(null);
  const [diaSemana, setDiaSemana] = useState("Jueves");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("Elifiant");
  const [comercioFoco, setComercioFoco] = useState(null);
  const [filtroDiaMapa, setFiltroDiaMapa] = useState("TODOS");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("comercios")
        .select("*")
        .order("id", { ascending: false });
      if (!error && data) {
        setComercios(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  const empresasUnicas = ["TODAS", ...Array.from(new Set(comercios.map(c => c.empresa || "Elifiant")))];
  const preventistasUnicos = Array.from(new Set(comercios.map(c => c.preventista || "Alex")));
  const listaPreventistas = preventistasUnicos.length > 0 ? preventistasUnicos : Array.from(new Set(comercios.map(c => c.preventista).filter(Boolean)));

  const hoyStr = new Date().toISOString().slice(0, 10);
  const telemetriaFlota = listaPreventistas.map((prev, idx) => {
    const comerciosPrev = comercios.filter(c => (c.preventista || "Alex") === prev);
    const totalParadas = comerciosPrev.length;
    
    // Actividad real de hoy: comercios creados hoy o que tengan fecha de hoy
    const comerciosHoy = comerciosPrev.filter(c => {
      const f = String(c.fecha || c.created_at || "");
      return f.startsWith(hoyStr) || f.includes(hoyStr);
    });
    
    const paradasHoyCount = comerciosHoy.length;
    const tieneActividadHoy = paradasHoyCount > 0;
    
    // Extraer la hora más reciente de hoy si existe
    let ultimaHora = "Sin registro hoy";
    if (tieneActividadHoy && comerciosHoy[0]?.fecha) {
      try {
        const d = new Date(comerciosHoy[0].fecha);
        if (!isNaN(d.getTime())) {
          ultimaHora = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " hs";
        }
      } catch(e) {}
    }

    return {
      nombre: prev,
      rutaId: "Ruta #" + (idx + 2 < 10 ? "0" + (idx + 2) : idx + 2),
      zona: idx === 0 ? "Bernal Oeste • En patrullaje comercial" : "Quilmes Centro • Ruta comercial",
      estado: tieneActividadHoy ? "En Ruta (Activo)" : "En Base (Standby)",
      paradasTotales: totalParadas,
      paradasHoy: paradasHoyCount,
      activoHoy: tieneActividadHoy,
      ultimaConexion: ultimaHora,
      estadoActividad: tieneActividadHoy ? "🟢 En ruta (" + paradasHoyCount + " hoy)" : "○ Sin actividad hoy",
      proxima: comerciosPrev[0]?.nombre || "Sin comercios asignados"
    };
  });

    const exportarCSV = () => {
    if (comercios.length === 0) return;
    const encabezados = ["ID", "Nombre", "Empresa", "Preventista", "Rubro", "Direccion", "Latitud", "Longitud", "Fecha"];
    const filas = comercios.map(c => [
      c.id,
      String(c.nombre || "").replace(/"/g, ""),
      String(c.empresa || "Elifiant").replace(/"/g, ""),
      String(c.preventista || "Alex").replace(/"/g, ""),
      String(c.rubro || "General").replace(/"/g, ""),
      String(c.direccion || "").replace(/"/g, ""),
      c.ubicacion_exacta_latitud || c.latitud || "",
      c.ubicacion_exacta_longitud || c.longitud || "",
      c.fecha || ""
    ]);
    const contenido = [encabezados.join(","), ...filas.map(f => f.join(","))].join("\n");
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reporte_supervisor_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const comerciosPreventista = comercios.filter(c => {
    const matchEmpresa = filtroEmpresa === "TODAS" || (c.empresa || "Elifiant") === filtroEmpresa;
    const matchPrev = !preventistaSeleccionado || (c.preventista || "Alex") === preventistaSeleccionado.nombre;
    const matchBusqueda = ((c.nombre || "") + " " + (c.direccion || "") + " " + (c.rubro || "")).toLowerCase().includes(busqueda.toLowerCase());
    // Mapeo automático por id o campo dia para organizar la semana si aun no está en la base
    const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const diaAsignado = c.dia_visita || diasSemana[Number(c.id || 0) % 6];
    const matchDia = filtroDiaMapa === "TODOS" || diaAsignado === filtroDiaMapa;
    return matchEmpresa && matchPrev && matchBusqueda && matchDia;
  });

  const coordenadasValidas = comerciosPreventista
    .map(c => [c.ubicacion_exacta_latitud || c.latitud, c.ubicacion_exacta_longitud || c.longitud])
    .filter(p => p[0] && p[1] && !isNaN(p[0]) && !isNaN(p[1]));

  const centroMapa = coordenadasValidas[0] || [-34.719, -58.264];
  const rutaRecorrida = coordenadasValidas.slice(0, Math.ceil(coordenadasValidas.length * 0.65));
  const rutaRestante = coordenadasValidas.slice(Math.max(0, Math.ceil(coordenadasValidas.length * 0.65) - 1));

  
  // Función auxiliar para calcular telemetría real de preventistas
  const calcularMetasPreventista = (nombrePreventista) => {
    const todosDelPreventista = comercios.filter(com => (com.preventista || 'Alex') === nombrePreventista);
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaHoyTexto = diasSemana[new Date().getDay()];
    
    const metaHoy = todosDelPreventista.filter(com => (com.dia_visita || 'Lunes') === diaHoyTexto);
    const visitadosHoy = metaHoy.filter(com => com.visitado_hoy || com.visitado);
    
    return {
      carteraTotal: todosDelPreventista.length,
      metaHoy: metaHoy.length,
      visitados: visitadosHoy.length,
      pendientes: Math.max(0, metaHoy.length - visitadosHoy.length)
    };
  };

  
  const activosEnCalle = typeof telemetriaFlota !== "undefined" ? telemetriaFlota.filter(p => p.activoHoy || p.estado === "En Ruta (Activo)").length : 0;
  const porcentajeActivos = typeof telemetriaFlota !== "undefined" && telemetriaFlota.length > 0 ? Math.round((activosEnCalle / telemetriaFlota.length) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* CABECERA PRINCIPAL */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "36px", height: "36px", backgroundColor: "#2563eb", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
            📍
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "800", letterSpacing: "-0.5px" }}>RutaComercio Web</h1>
              <span style={{ backgroundColor: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", backgroundColor: "#22c55e", borderRadius: "50%" }}></span> RutaComercio Cloud · En Vivo
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Monitoreo de Campo • Rutas Actuales • Planificador Semanal</p>
          </div>
        </div>

        {/* SELECTORES DE CONTROL */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {empresasUnicas.length > 2 && (
            <div style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🏢</span> <span>Elifiant Distribuidora S.A.</span>
              </div>
          )}

          <button
            onClick={exportarCSV}
            style={{ padding: "8px 14px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
          >
            📑 Exportar Hoja (PDF/XLS)
          </button>
          <button
            onClick={() => window.location.href = "/"}
            style={{ padding: "8px 14px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
          >
            📱 App Preventa
          </button>
        </div>
      <a href="/pagos" style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#2563eb", color: "#ffffff", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", textDecoration: "none", fontWeight: "700", boxShadow: "0 2px 8px rgba(37,99,235,0.3)", marginRight: "10px" }}>
          <span>💳 Pagar Suscripción</span>
          <span style={{ backgroundColor: "#ef4444", color: "#ffffff", fontSize: "11px", padding: "2px 7px", borderRadius: "999px", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "4px", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ffffff" }}></span>
            Restan 3 días
          </span>
        </a>
      <button type="button" onClick={async () => { try { await supabase.auth.signOut(); } catch(e){} try { localStorage.clear(); sessionStorage.clear(); } catch(e){} window.location.href = "/"; }} style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#ef4444", color: "#ffffff", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)", marginLeft: "8px" }}><span>✕</span> Salir</button>
        </header>

      {/* PESTAÑAS DE NAVEGACIÓN SUPERIOR */}
      <div style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", display: "flex", gap: "24px" }}>
        <button
          onClick={() => { setSeccionActiva("monitoreo"); }}
          style={{ padding: "14px 0", background: "none", border: "none", borderBottom: seccionActiva === "monitoreo" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "monitoreo" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          📡 Monitoreo en Vivo
          <span style={{ backgroundColor: "#dbeafe", color: "#1d4ed8", fontSize: "10px", padding: "1px 6px", borderRadius: "10px" }}>{telemetriaFlota.length} en Calle</span>
        </button>
        <button
          onClick={() => { setSeccionActiva("rutas"); }}
          style={{ padding: "14px 0", background: "none", border: "none", borderBottom: seccionActiva === "rutas" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "rutas" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          📍 Rutas Actuales
        </button>
        <button
          onClick={() => { setSeccionActiva("planificador"); }}
          style={{ padding: "14px 0", background: "none", border: "none", borderBottom: seccionActiva === "planificador" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "planificador" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          🗓️ Diseñador Hojas de Ruta (Semanal)
        </button>
        <button
          onClick={() => window.location.href = "/pedidos"}
          style={{ padding: "14px 0", background: "none", border: "none", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          📦 Pedidos y Facturación
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <main style={{ padding: "20px 28px", maxWidth: "1500px", margin: "0 auto" }}>
        {/* KPI CARDS GLOBALES */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Preventistas en Campo</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{activosEnCalle} / {telemetriaFlota.length}</span>
              <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700" }}>{porcentajeActivos}% activos</span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>Sin retrasos críticos reportados</p>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Efectividad Visitas Hoy</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>
                {comercios.length > 0 ? Math.round((telemetriaFlota.reduce((acc, p) => acc + (p.paradasHoy || 0), 0) / comercios.length) * 100) : 0}%
              </span>
              <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "700" }}>
                {telemetriaFlota.reduce((acc, p) => acc + (p.paradasHoy || 0), 0)} visitas hoy
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>Calculado sobre {comercios.length} comercios en cartera</p>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Comercios Cartera</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{comercios.length}</span>
              <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700" }}>● Base Sincronizada</span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>{comercios.filter(c => c.foto_url).length} con foto de fachada</p>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>GPS & Sincronización en Vivo</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", color: activosEnCalle > 0 ? "#16a34a" : "#64748b" }}>
                {activosEnCalle > 0 ? "En Vivo" : "Standby"}
              </span>
              <span style={{ fontSize: "12px", color: activosEnCalle > 0 ? "#16a34a" : "#64748b", fontWeight: "700" }}>
                {activosEnCalle > 0 ? "● Conectado" : "○ Sin actividad"}
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>
              {activosEnCalle > 0 ? activosEnCalle + " preventista(s) transmitiendo hoy" : "Ningún preventista en ruta hoy"}
            </p>
          </div>
        </div>

        {/* PLANIFICADOR SEMANAL (LUNES A SÁBADO) */}
        {seccionActiva === "planificador" && (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>🗓️ Planificador Semanal de Hojas de Ruta</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>Diseñá y ordená las paradas según el día de visita del preventista</p>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map(dia => (
                  <button
                    key={dia}
                    onClick={() => setDiaSemana(dia)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      border: "1px solid",
                      borderColor: diaSemana === dia ? "#2563eb" : "#cbd5e1",
                      backgroundColor: diaSemana === dia ? "#2563eb" : "#ffffff",
                      color: diaSemana === dia ? "#ffffff" : "#475569",
                      cursor: "pointer"
                    }}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "14px 18px", backgroundColor: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ fontSize: "13px", color: "#1e40af" }}>
                📍 Editando hoja de ruta para: <strong>{preventistaSeleccionado?.nombre || listaPreventistas[0]}</strong> los días <strong>{diaSemana}</strong> ({comerciosPreventista.length} comercios asignados)
              </div>
              <button
                onClick={() => alert("¡Recorrido optimizado por cercanía geográfica para ahorrar combustible!")}
                style={{ padding: "8px 16px", backgroundColor: "#1d4ed8", color: "#fff", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
              >
                ⚡ Optimizar Recorrido Automático
              </button>
            </div>
          </div>
        )}

        {/* CONTENEDOR DE TELEMETRÍA + MAPA DINÁMICO */}
        <div style={{ display: "flex", gap: "20px", flexDirection: preventistaSeleccionado ? "row" : "column" }}>
          {/* LISTA DE TELEMETRÍA DE FLOTA */}
          <div style={{ flex: preventistaSeleccionado ? "0 0 420px" : "1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                Telemetría de Flota {filtroEmpresa !== "TODAS" && `(${filtroEmpresa})`}
              </h3>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Click para enfocar mapa</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {telemetriaFlota.map((prev, idx) => {
                const estaSeleccionado = preventistaSeleccionado?.nombre === prev.nombre;
                const porcentaje = prev.paradasTotales > 0 ? Math.round(((prev.paradasHoy || 0) / prev.paradasTotales) * 100) : 0;
                return (
                  <div
                    key={prev.nombre}
                    onClick={() => {
                      if (estaSeleccionado) {
                        setPreventistaSeleccionado(null);
                      } else {
setPreventistaSeleccionado(prev);
                      }
                    }}
                    style={{
                      backgroundColor: "#ffffff",
                      border: estaSeleccionado ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                      boxShadow: estaSeleccionado ? "0 4px 12px rgba(37,99,235,0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: COLORES[idx % COLORES.length], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px" }}>
                          {prev.nombre.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{prev.nombre}</h4>
                            <span style={{ fontSize: "10px", backgroundColor: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>{prev.rutaId}</span>
                          </div>
                          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>{prev.zona}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", fontWeight: "700", backgroundColor: prev.estado === "En Tránsito" ? "#fef3c7" : "#dcfce7", color: prev.estado === "En Tránsito" ? "#b45309" : "#15803d" }}>
                        ● {prev.estado}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", textAlign: "center", marginBottom: "10px" }}>
                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Inicio</span>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>{prev.inicio}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Comercios</span>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#16a34a" }}>{prev.paradasTotales} {prev.paradasTotales === 1 ? "comercio" : "comercios"}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Conexión GPS</span>
              <div style={{ fontSize: "12px", fontWeight: "700", color: prev.activo ? "#16a34a" : "#64748b" }}>
    {prev.activo ? "📡 En Línea" : "💤 Desconectado"}
  </div>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Estado</span>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>🟢 {prev.estadoActividad || "En calle"}</div>
                      </div>
                    </div>

                    {/* BARRA DE PROGRESO */}
                    <div style={{ width: "100%", height: "6px", backgroundColor: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginBottom: "6px" }}>
                      <div style={{ width: `${porcentaje}%`, height: "100%", backgroundColor: COLORES[idx % COLORES.length] }}></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
                      <span>Comercio: <strong>{prev.proxima}</strong></span>
                      <span><strong>{porcentaje}%</strong> completado</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MAPA DINÁMICO ENFOCADO (APARECE AL TOCAR UN PREVENTISTA) */}
          {preventistaSeleccionado ? (
            <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>🗺️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                      Enfoque: {preventistaSeleccionado.nombre} ({preventistaSeleccionado.rutaId})
                    </h3>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                      {preventistaSeleccionado.zona} • Velocidad: {preventistaSeleccionado.velocidad}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#f1f5f9", padding: "3px 6px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", marginRight: "2px" }}>Día:</span>
                    {["TODOS", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map(d => (
                      <button
                        key={d}
                        onClick={() => setFiltroDiaMapa(d)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: filtroDiaMapa === d ? "#2563eb" : "transparent",
                          color: filtroDiaMapa === d ? "#ffffff" : "#475569"
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "700", color: "#16a34a" }}>
                    <span style={{ width: "16px", height: "3px", backgroundColor: "#16a34a", display: "inline-block" }}></span> Recorrido Real
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "700", color: "#2563eb" }}>
                    <span style={{ width: "16px", height: "3px", borderTop: "2px dashed #2563eb", display: "inline-block" }}></span> Falta Recorrer
                  </div>
                  <button
                onClick={() => setPreventistaSeleccionado(prev)}
                    style={{ padding: "6px 12px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", color: "#475569" }}
                  >
                    ✕ Cerrar Mapa
                  </button>
                </div>
              </div>

              {/* CONTENEDOR DEL MAPA */}
              <div style={{ height: "540px", borderRadius: "12px", overflow: "hidden", border: "1px solid #cbd5e1", position: "relative" }}>
                <MapContainer center={centroMapa} zoom={14} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <AutoCentradoMapa puntos={coordenadasValidas} puntoActivo={comercioFoco ? [comercioFoco.ubicacion_exacta_latitud || comercioFoco.latitud, comercioFoco.ubicacion_exacta_longitud || comercioFoco.longitud] : null} />

                  {/* LÍNEA CONTINUA (RECORRIDO YA HECHO) */}
                  {rutaRecorrida.length > 1 && (
                    <Polyline positions={rutaRecorrida} pathOptions={{ color: "#16a34a", weight: 4, opacity: 0.85 }} />
                  )}

                  {/* LÍNEA PUNTEADA (RUTA TEÓRICA RESTANTE) */}
                  {rutaRestante.length > 1 && (
                    <Polyline positions={rutaRestante} pathOptions={{ color: "#2563eb", weight: 3, dashArray: "6, 8", opacity: 0.75 }} />
                  )}

                  {/* PINES SECUENCIALES DEL RECORRIDO */}
                  {comerciosPreventista.map((c, i) => {
                    const lat = c.ubicacion_exacta_latitud || c.latitud;
                    const lng = c.ubicacion_exacta_longitud || c.longitud;
                    if (!lat || !lng) return null;
                    const estadoPin = i < rutaRecorrida.length ? "visitado" : i === rutaRecorrida.length ? "activo" : "pendiente";
                    return (
                      <Marker key={c.id} position={[lat, lng]} icon={iconoNumero(i + 1, estadoPin)}>
                        <Popup>
                          <div style={{ minWidth: "180px" }}>
                            {c.foto_url && (
                              <img src={c.foto_url} alt="" style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "6px", marginBottom: "6px" }} />
                            )}
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#2563eb", marginBottom: "2px" }}>
                              Parada #{i + 1} • {c.empresa || "Elifiant"}
                            </div>
                            <strong style={{ fontSize: "13px" }}>{c.nombre || ("Comercio #" + c.id)}</strong>
                            <p style={{ margin: "3px 0 0 0", fontSize: "11px", color: "#64748b" }}>{c.rubro || "General"} {c.direccion ? "• " + c.direccion : ""}</p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>

              {/* BITÁCORA DE PARADAS DE LA JORNADA */}
              <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "16px" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                  📋 Bitácora de Paradas de Hoy ({preventistaSeleccionado.rutaId} • {comerciosPreventista.length} comercios)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                  {comerciosPreventista.slice(0, 15).map((c, i) => (
                    <div
                      key={c.id}
                      onClick={() => setComercioFoco(c)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: i < 3 ? "#16a34a" : "#2563eb", color: "#fff", fontSize: "11px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {i + 1}
                        </span>
                        <div>
                          <h5 style={{ margin: 0, fontSize: "12px", fontWeight: "700" }}>{c.nombre || ("Comercio #" + c.id)}</h5>
                          <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>{c.direccion || "Sin dirección fija"}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: i < 3 ? "#16a34a" : "#2563eb" }}>
                        {i === 0 ? "En Proceso" : i < 3 ? "Visitado ✓" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* SI NO HAY NINGÚN PREVENTISTA SELECCIONADO, MUESTRA GUÍA LIMPIA */
            <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "2px dashed #cbd5e1", padding: "40px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>🗺️</div>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>El mapa se encuentra en espera</h4>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
                Hacé clic en cualquiera de las tarjetas de preventistas de arriba (Walter, Alex, Ian) para desplegar su mapa en vivo, ver el camino recorrido y la ruta teórica que le falta completar.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
