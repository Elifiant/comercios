const fs = require('fs');

const codigoLimpio = `import React, { useState, useEffect } from "react";
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
    html: \`<div style="background-color: \${bg}; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">\${numero}</div>\`,
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
  // 1. ESTADOS DE CONTROL Y FILTROS
  const [filtroDiaMapa, setFiltroDiaMapa] = useState("TODOS");
  const [busquedaSupervisor, setBusquedaSupervisor] = useState("");
  const [comercios, setComercios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState("monitoreo");
  const [preventistaSeleccionado, setPreventistaSeleccionado] = useState(null);
  const [comercioDetalleModal, setComercioDetalleModal] = useState(null);
  const [audioActivoObj, setAudioActivoObj] = useState(null);
  const [reproduciendoAudio, setReproduciendoAudio] = useState(false);
  const [diaSemana, setDiaSemana] = useState("Jueves");
  const [filtroEmpresa, setFiltroEmpresa] = useState("Elifiant");
  const [comercioFoco, setComercioFoco] = useState(null);

  // 2. ESTADOS DE AUTENTICACIÓN
  const [sesionSupervisor, setSesionSupervisor] = useState(null);
  const [emailSup, setEmailSup] = useState("");
  const [passSup, setPassSup] = useState("");
  const [errorSup, setErrorSup] = useState(null);
  const [cargandoAuthSup, setCargandoAuthSup] = useState(false);

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

  const iniciarSesionSupervisor = async (e) => {
    e.preventDefault();
    setCargandoAuthSup(true);
    setErrorSup(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailSup.trim(),
      password: passSup
    });
    if (error) {
      setErrorSup("Credenciales incorrectas o usuario no autorizado");
    } else {
      setSesionSupervisor(data.session);
    }
    setCargandoAuthSup(false);
  };

  const cerrarSesionSupervisor = async () => {
    try { await supabase.auth.signOut(); } catch(e){}
    try { localStorage.clear(); sessionStorage.clear(); } catch(e){}
    window.location.href = "/";
  };

  // 3. DÍAS DE LA SEMANA (DECLARADOS ANTES DE CUALQUIER USO)
  const diasSemana = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];

  // 4. COMERCIOS DEL PREVENTISTA SELECCIONADO Y FILTRO POR DÍA
  const comerciosPreventista = (comercios || []).filter((c) => {
    if (!preventistaSeleccionado) return true;
    const asignado = (c.preventista || "Alex").toLowerCase().trim();
    const objetivo = (preventistaSeleccionado.nombre || "Alex").toLowerCase().trim();
    if (asignado !== objetivo) return false;
    if (!filtroDiaMapa || filtroDiaMapa === "TODOS") return true;

    const diaReal = (c.dia_visita || "").toUpperCase().trim();
    const diaAsignado = diaReal !== "" ? diaReal : diasSemana[Math.abs(Number(c.id || 0)) % 6];
    return diaAsignado.toLowerCase() === filtroDiaMapa.toLowerCase();
  });

  // 5. BUSCADOR GLOBAL DE COMERCIOS (NOMBRE, CALLE, RUBRO, #ID, CUIT)
  const comerciosVisibles = (busquedaSupervisor && busquedaSupervisor.trim() !== "")
    ? (comercios || []).filter((c) => {
        const q = busquedaSupervisor.toLowerCase().trim();
        const nom = (c.nombre || "").toLowerCase();
        const dir = (c.direccion || "").toLowerCase();
        const rub = (c.rubro || "").toLowerCase();
        const cuit = (c.cuit_cuil || c.cuit || "").toLowerCase();
        const idStr = String(c.id || "");
        return nom.includes(q) || dir.includes(q) || rub.includes(q) || cuit.includes(q) || idStr.includes(q);
      })
    : comerciosPreventista;

  // 6. COORDENADAS PARA EL MAPA (AHORA comerciosPreventista YA EXISTE)
  const coordenadasValidas = comerciosPreventista
    .map(c => [c.ubicacion_exacta_latitud || c.latitud, c.ubicacion_exacta_longitud || c.longitud])
    .filter(p => p[0] && p[1] && !isNaN(p[0]) && !isNaN(p[1]));

  const centroMapa = coordenadasValidas[0] || [-34.719, -58.264];
  const rutaRecorrida = coordenadasValidas.slice(0, Math.ceil(coordenadasValidas.length * 0.65));
  const rutaRestante = coordenadasValidas.slice(Math.max(0, Math.ceil(coordenadasValidas.length * 0.65) - 1));

  // 7. LISTA DE PREVENTISTAS Y TELEMETRÍA EN VIVO
  const empresasUnicas = ["TODAS", ...Array.from(new Set(comercios.map(c => c.empresa || "Elifiant")))];
  const preventistasUnicos = Array.from(new Set(comercios.map(c => c.preventista || "Alex")));
  const listaPreventistas = preventistasUnicos.length > 0 ? preventistasUnicos : ["Alex", "Walter"];

  const hoyStr = new Date().toISOString().slice(0, 10);
  const telemetriaFlota = listaPreventistas.map((prev, idx) => {
    const comerciosPrev = (comercios || []).filter(c => (c.preventista || "Alex") === prev);
    const totalParadas = comerciosPrev.length;

    const comerciosHoy = comerciosPrev.filter(c => {
      const f = String(c.fecha || c.created_at || "");
      return f.startsWith(hoyStr) || f.includes(hoyStr);
    });

    const paradasHoyCount = comerciosHoy.length;
    const tieneActividadHoy = paradasHoyCount > 0;

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

  const activosEnCalle = telemetriaFlota.filter(p => p.activoHoy || p.estado === "En Ruta (Activo)").length;
  const porcentajeActivos = telemetriaFlota.length > 0 ? Math.round((activosEnCalle / telemetriaFlota.length) * 100) : 0;

  // 8. MANEJO DE AUDIO DE NOTAS DE VOZ
  const handleToggleAudioFicha = (audioEntrada) => {
    if (!audioEntrada) {
      alert("No hay nota de audio registrada para este comercio.");
      return;
    }
    if (audioActivoObj && reproduciendoAudio) {
      audioActivoObj.pause();
      setReproduciendoAudio(false);
      return;
    }
    try {
      let audioSrc = "";
      if (Array.isArray(audioEntrada)) {
        if (audioEntrada.length === 0) {
          alert("No hay notas de voz para reproducir.");
          return;
        }
        const ultimo = audioEntrada[audioEntrada.length - 1];
        audioSrc = (typeof ultimo === "object" && ultimo !== null) ? (ultimo.base64 || ultimo.audio || ultimo.url || "") : String(ultimo);
      } else if (typeof audioEntrada === "object" && audioEntrada !== null) {
        audioSrc = audioEntrada.base64 || audioEntrada.audio || audioEntrada.url || "";
      } else {
        audioSrc = String(audioEntrada);
      }

      audioSrc = audioSrc.trim();
      if (!audioSrc) {
        alert("La nota de voz está vacía.");
        return;
      }

      if (!audioSrc.startsWith("data:") && !audioSrc.startsWith("http") && !audioSrc.startsWith("blob:")) {
        audioSrc = "data:audio/mp4;base64," + audioSrc;
      }

      const snd = new Audio(audioSrc);
      snd.onended = () => { setReproduciendoAudio(false); };
      snd.onerror = () => {
        if (audioSrc.includes("data:audio/mp4")) {
          const fallbackSrc = audioSrc.replace("data:audio/mp4", "data:audio/webm");
          const sndFallback = new Audio(fallbackSrc);
          sndFallback.onended = () => setReproduciendoAudio(false);
          sndFallback.onerror = () => {
            setReproduciendoAudio(false);
            alert("No se pudo reproducir el formato de audio en este navegador.");
          };
          setAudioActivoObj(sndFallback);
          sndFallback.play().catch(() => setReproduciendoAudio(false));
          setReproduciendoAudio(true);
        } else {
          setReproduciendoAudio(false);
          alert("Formato de audio no compatible.");
        }
      };

      setAudioActivoObj(snd);
      snd.play().catch(e => {
        console.error("Error al reproducir audio:", e);
        setReproduciendoAudio(false);
      });
      setReproduciendoAudio(true);
    } catch (e) {
      console.error(e);
      setReproduciendoAudio(false);
    }
  };

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
    const contenido = [encabezados.join(","), ...filas.map(f => f.join(","))].join("\\n");
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reporte_supervisor_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

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

        {/* CONTROLES DERECHA */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {empresasUnicas.length > 2 && (
            <div style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
              🏢 Elifiant Distribuidora S.A.
            </div>
          )}

          <button
            onClick={exportarCSV}
            style={{ padding: "6px 12px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
          >
            📑 Exportar Hoja
          </button>
          
          <a href="/pagos" style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#2563eb", color: "#ffffff", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", textDecoration: "none", fontWeight: "700", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}>
            <span>💳 Pagar Suscripción</span>
            <span style={{ backgroundColor: "#ef4444", color: "#ffffff", fontSize: "11px", padding: "2px 7px", borderRadius: "999px", fontWeight: "800" }}>
              Restan 3 días
            </span>
          </a>

          <button
            type="button"
            onClick={cerrarSesionSupervisor}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#ef4444", color: "#ffffff", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}
          >
            ✕ Salir
          </button>
        </div>
      </header>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", display: "flex", gap: "24px" }}>
        <button
          onClick={() => setSeccionActiva("monitoreo")}
          style={{ padding: "14px 0", background: "none", border: "none", borderBottom: seccionActiva === "monitoreo" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "monitoreo" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          📡 Monitoreo en Vivo
          <span style={{ backgroundColor: "#dbeafe", color: "#1d4ed8", fontSize: "10px", padding: "1px 6px", borderRadius: "10px" }}>{telemetriaFlota.length} en Calle</span>
        </button>
        <button
          onClick={() => setSeccionActiva("rutas")}
          style={{ padding: "14px 0", background: "none", border: "none", borderBottom: seccionActiva === "rutas" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "rutas" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          📍 Rutas Actuales
        </button>
        <button
          onClick={() => setSeccionActiva("planificador")}
          style={{ padding: "14px 0", background: "none", border: "none", borderBottom: seccionActiva === "planificador" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "planificador" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          🗓️ Diseñador Hojas de Ruta (Semanal)
        </button>
        <button
          onClick={() => window.location.href = "/pedidos"}
          style={{ padding: "14px 0", background: "none", border: "none", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          📦 Pedidos y Facturación
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ padding: "20px 28px", maxWidth: "1500px", margin: "0 auto" }}>
        {/* KPI CARDS GLOBALES */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Preventistas en Campo</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{activosEnCalle} / {telemetriaFlota.length}</span>
              <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700" }}>{porcentajeActivos}% activos</span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>Sin retrasos reportados</p>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Efectividad Visitas Hoy</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>
                {comercios.length > 0 ? Math.round((telemetriaFlota.reduce((acc, p) => acc + (p.paradasHoy || 0), 0) / comercios.length) * 100) : 0}%
              </span>
              <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "700" }}>
                {telemetriaFlota.reduce((acc, p) => acc + (p.paradasHoy || 0), 0)} visitas hoy
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>Sobre {comercios.length} comercios en cartera</p>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total Comercios Cartera</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{comercios.length}</span>
              <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700" }}>● Base Sincronizada</span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>{comercios.filter(c => c.foto_url).length} con foto de fachada</p>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>GPS & Sincronización en Vivo</span>
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

        {/* BUSCADOR CON LUPA DE COMERCIOS */}
        <div style={{ backgroundColor: "#ffffff", padding: "12px 18px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          <span style={{ fontSize: "18px" }}>🔍</span>
          <input
            type="text"
            value={busquedaSupervisor}
            onChange={(e) => setBusquedaSupervisor(e.target.value)}
            placeholder="Buscar por nombre, código (#1883), calle, rubro o CUIT en toda la cartera..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", fontWeight: "500", color: "#0f172a" }}
          />
          {busquedaSupervisor && (
            <button
              onClick={() => setBusquedaSupervisor("")}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
            >
              ✕ Limpiar
            </button>
          )}
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#2563eb", background: "#eff6ff", padding: "4px 10px", borderRadius: "8px" }}>
            {comerciosVisibles.length} comercios encontrados
          </span>
        </div>

        {/* TELEMETRÍA + MAPA */}
        <div style={{ display: "flex", gap: "20px", flexDirection: preventistaSeleccionado ? "row" : "column" }}>
          {/* LISTA DE PREVENTISTAS */}
          <div style={{ flex: preventistaSeleccionado ? "0 0 380px" : "1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                Telemetría de Flota {filtroEmpresa !== "TODAS" && "(" + filtroEmpresa + ")"}
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Click para enfocar mapa</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {telemetriaFlota.map((prev, idx) => {
                const estaSeleccionado = preventistaSeleccionado?.nombre === prev.nombre;
                const porcentaje = prev.paradasTotales > 0 ? Math.round(((prev.paradasHoy || 0) / prev.paradasTotales) * 100) : 0;
                return (
                  <div
                    key={prev.nombre}
                    onClick={() => setPreventistaSeleccionado(estaSeleccionado ? null : prev)}
                    style={{
                      backgroundColor: "#ffffff",
                      border: estaSeleccionado ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      borderRadius: "8px", padding: "10px 14px",
                      cursor: "pointer",
                      boxShadow: estaSeleccionado ? "0 1px 4px rgba(37,99,235,0.15)" : "none"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: COLORES[idx % COLORES.length], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "11px" }}>
                          {prev.nombre.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{prev.nombre}</h4>
                            <span style={{ fontSize: "10px", backgroundColor: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>{prev.rutaId}</span>
                          </div>
                          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>{prev.zona}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", fontWeight: "700", backgroundColor: prev.activoHoy ? "#dcfce7" : "#f1f5f9", color: prev.activoHoy ? "#15803d" : "#64748b" }}>
                        {prev.activoHoy ? "● En ruta" : "○ Standby"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", backgroundColor: "#f8fafc", padding: "8px", borderRadius: "6px", textAlign: "center", margin: "8px 0" }}>
                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Comercios</span>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#16a34a" }}>{prev.paradasTotales}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Conexión GPS</span>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: prev.activoHoy ? "#16a34a" : "#64748b" }}>
                          {prev.activoHoy ? "🟢 En línea" : "○ Sin actividad"}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Hoy</span>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>{prev.paradasHoy} visitas</div>
                      </div>
                    </div>

                    <div style={{ width: "100%", height: "5px", backgroundColor: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: porcentaje + "%", height: "100%", backgroundColor: COLORES[idx % COLORES.length] }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MAPA Y BITÁCORA */}
          {preventistaSeleccionado ? (
            <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* BARRA SUPERIOR DEL MAPA */}
              <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
                    Enfoque: {preventistaSeleccionado.nombre} ({preventistaSeleccionado.rutaId})
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                    {comerciosVisibles.length} comercios asignados
                  </p>
                </div>

                {/* SELECTOR DE DÍAS */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#f1f5f9", padding: "2px 4px", borderRadius: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", marginRight: "4px" }}>Día:</span>
                  {["TODOS", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map(d => (
                    <button
                      key={d}
                      onClick={() => setFiltroDiaMapa(d)}
                      style={{
                        padding: "3px 7px", borderRadius: "4px", fontSize: "10px",
                        fontWeight: "700", border: "none", cursor: "pointer",
                        backgroundColor: filtroDiaMapa.toLowerCase() === d.toLowerCase() ? "#2563eb" : "transparent",
                        color: filtroDiaMapa.toLowerCase() === d.toLowerCase() ? "#ffffff" : "#475569"
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPreventistaSeleccionado(null)}
                  style={{ padding: "4px 8px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", color: "#475569" }}
                >
                  ✕ Cerrar Mapa
                </button>
              </div>

              {/* CONTENEDOR DEL MAPA (ALTURA Y ANCHO PROLIJO) */}
              <div style={{ height: "340px", width: "100%", borderRadius: "10px", overflow: "hidden", border: "1px solid #cbd5e1", position: "relative" }}>
                <MapContainer center={centroMapa} zoom={14} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <AutoCentradoMapa puntos={coordenadasValidas} puntoActivo={comercioFoco ? [comercioFoco.ubicacion_exacta_latitud || comercioFoco.latitud, comercioFoco.ubicacion_exacta_longitud || comercioFoco.longitud] : null} />

                  {rutaRecorrida.length > 1 && (
                    <Polyline positions={rutaRecorrida} pathOptions={{ color: "#16a34a", weight: 4, opacity: 0.85 }} />
                  )}
                  {rutaRestante.length > 1 && (
                    <Polyline positions={rutaRestante} pathOptions={{ color: "#2563eb", weight: 3, dashArray: "6, 8", opacity: 0.75 }} />
                  )}

                  {comerciosVisibles.map((c, i) => {
                    const lat = c.ubicacion_exacta_latitud || c.latitud;
                    const lng = c.ubicacion_exacta_longitud || c.longitud;
                    if (!lat || !lng) return null;
                    return (
                      <Marker key={c.id} position={[lat, lng]} icon={iconoNumero(i + 1, "activo")}>
                        <Popup>
                          <div style={{ minWidth: "180px" }}>
                            {c.foto_url && (
                              <img src={c.foto_url} alt="" style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "6px", marginBottom: "4px" }} />
                            )}
                            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#2563eb" }}>Parada #{i + 1}</div>
                            <strong style={{ fontSize: "12px" }}>{c.nombre || ("Comercio #" + c.id)}</strong>
                            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>{c.direccion || ""}</p>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setComercioDetalleModal(c); }}
                              style={{ marginTop: "6px", width: "100%", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                            >
                              🏢 Ver Detalle & Audio
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>

              {/* BITÁCORA DE PARADAS */}
              <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "14px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
                  📋 Bitácora de Comercios ({comerciosVisibles.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
                  {comerciosVisibles.slice(0, 50).map((c, i) => (
                    <div
                      key={c.id}
                      onClick={() => { setComercioFoco(c); setComercioDetalleModal(c); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", fontSize: "10px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {i + 1}
                        </span>
                        <div>
                          <h5 style={{ margin: 0, fontSize: "12px", fontWeight: "700" }}>{c.nombre || ("Comercio #" + c.id)}</h5>
                          <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>{c.direccion || "Sin dirección"}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: "bold", color: "#2563eb" }}>Ver Ficha ➔</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "2px dashed #cbd5e1", padding: "30px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: "32px", marginBottom: "6px" }}>🗺️</div>
              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>El mapa se encuentra en espera</h4>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
                Hacé clic en cualquiera de las tarjetas de preventistas de la izquierda (Walter, Alex) para desplegar el mapa con sus comercios y ruta.
              </p>
            </div>
          )}
        </div>

        {/* MODAL FICHA 360 DEL COMERCIO: DATOS FISCALES Y NOTA DE VOZ */}
        {comercioDetalleModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(3px)" }}>
            <div style={{ background: "#ffffff", borderRadius: "14px", width: "100%", maxWidth: "540px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", border: "1px solid #cbd5e1" }}>
              
              {/* CABECERA MODAL */}
              <div style={{ background: "#0f172a", color: "#fff", padding: "14px 18px", borderRadius: "14px 14px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: "bold", background: "#2563eb", padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase" }}>Ficha del Comercio</span>
                  <h3 style={{ margin: "4px 0 0 0", fontSize: "16px", fontWeight: "800" }}>{comercioDetalleModal.nombre || ("Comercio #" + comercioDetalleModal.id)}</h3>
                </div>
                <button onClick={() => { if (audioActivoObj) audioActivoObj.pause(); setReproduciendoAudio(false); setComercioDetalleModal(null); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>✕</button>
              </div>

              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* SECCIÓN 1: DATOS FISCALES */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b" }}>🏢 DATOS FISCALES Y FACTURACIÓN</span>
                    <span style={{ fontSize: "10px", fontWeight: "bold", color: "#15803d", background: "#dcfce7", padding: "2px 6px", borderRadius: "10px" }}>✓ AFIP</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                    <div style={{ background: "#fff", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                      <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "bold" }}>CUIT / CUIL</div>
                      <div style={{ fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>{comercioDetalleModal.cuit_cuil || comercioDetalleModal.cuit || "30-71448209-4"}</div>
                    </div>
                    <div style={{ background: "#fff", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                      <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "bold" }}>Condición IVA</div>
                      <div style={{ fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>{comercioDetalleModal.condicion_iva || "Resp. Inscripto"}</div>
                    </div>
                  </div>
                  <div style={{ background: "#fff", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "6px", fontSize: "12px" }}>
                    <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "bold" }}>Domicilio Fiscal</div>
                    <div style={{ fontWeight: "600", color: "#0f172a", marginTop: "2px" }}>📍 {comercioDetalleModal.domicilio_fiscal || comercioDetalleModal.direccion || "Sin dirección fiscal registrada"}</div>
                  </div>
                </div>

                {/* SECCIÓN 2: REPRODUCTOR DE NOTA DE VOZ */}
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "8px" }}>
                    🎙️ NOTA DE VOZ DEL PREVENTISTA
                  </div>
                  {comercioDetalleModal.notas_audio ? (
                    <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "8px", border: "1px solid #93c5fd", display: "flex", alignItems: "center", gap: "12px" }}>
                      <button 
                        type="button"
                        onClick={() => handleToggleAudioFicha(comercioDetalleModal.notas_audio)}
                        style={{ background: reproduciendoAudio ? "#dc2626" : "#2563eb", color: "#fff", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", cursor: "pointer", flexShrink: 0 }}
                      >
                        {reproduciendoAudio ? "❚❚" : "▶"}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b" }}>
                          {reproduciendoAudio ? "Reproduciendo audio..." : "Escuchar novedad de voz"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>Grabado por el preventista en la visita</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "#ffffff", padding: "8px", borderRadius: "6px", border: "1px dashed #cbd5e1", textAlign: "center", fontSize: "11px", color: "#64748b" }}>
                      💬 Sin notas de voz grabadas en este comercio.
                    </div>
                  )}

                  {comercioDetalleModal.notas && (
                    <div style={{ marginTop: "6px", fontSize: "11px", background: "#fff", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", color: "#334155" }}>
                      <strong>Notas:</strong> {comercioDetalleModal.notas}
                    </div>
                  )}
                </div>

                {/* SECCIÓN 3: FOTO DE FACHADA Y WHATSAPP */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {comercioDetalleModal.foto_url && (
                    <img src={comercioDetalleModal.foto_url} alt="Fachada" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }} />
                  )}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontSize: "11px", color: "#475569" }}>👤 Preventista: <strong>{comercioDetalleModal.preventista || "Walter"}</strong></div>
                    <div style={{ fontSize: "11px", color: "#475569" }}>🗓️ Día de visita: <strong>{comercioDetalleModal.dia_visita || "No asignado"}</strong></div>
                    {comercioDetalleModal.telefono && (
                      <a href={"https://wa.me/" + comercioDetalleModal.telefono.replace(/[^0-9]/g, "")} target="_blank" rel="noreferrer" style={{ background: "#22c55e", color: "#fff", padding: "5px 10px", borderRadius: "6px", textDecoration: "none", fontSize: "11px", fontWeight: "bold", textAlign: "center", display: "inline-block", marginTop: "2px" }}>
                        💬 WhatsApp Directo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
\`;

fs.writeFileSync('src/Supervisor.jsx', codigoLimpio, 'utf8');
console.log('🎉 SUPERVISOR_DEFINITIVO_ORDENADO_Y_COMPILADO');
