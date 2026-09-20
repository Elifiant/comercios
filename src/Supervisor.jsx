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
      map.flyTo(puntoActivo, 16, { animate: true });
    } else if (puntos && puntos.length > 0) {
      const validos = puntos.filter(p => p && p[0] && p[1]);
      if (validos.length > 0) {
        const bounds = L.latLngBounds(validos);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [puntos, puntoActivo, map]);
  return null;
}


function iconoPreventistaVivo(nombre) {
  return L.divIcon({
    className: "custom-marker-preventista",
    html: '<div style="background:#2563eb; color:#fff; border:2px solid #fff; box-shadow:0 0 12px rgba(37,99,235,0.8); border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; font-size:16px; position:relative;"><span style="position:absolute; width:100%; height:100%; border-radius:50%; border:2px solid #38bdf8; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>🚗</div><div style="background:#0f172a; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; margin-top:2px; white-space:nowrap; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.4);">' + (nombre || "Preventista") + '</div>',
    iconSize: [34, 50],
    iconAnchor: [17, 25]
  });
}


function iconoAutoGPS(nombre) {
  return L.divIcon({
    className: "pin-auto-gps",
    html: '<div style="background:#2563eb; color:#fff; border:2px solid #fff; border-radius:50%; width:38px; height:38px; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 0 16px rgba(37,99,235,0.95); position:relative;"><span style="position:absolute; width:100%; height:100%; border-radius:50%; border:2px solid #38bdf8; animation:ping 1.5s infinite;"></span>🚗</div><div style="background:#0f172a; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; margin-top:2px; white-space:nowrap; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.6);">' + (nombre || "Preventista") + ' (En vivo)</div>',
    iconSize: [38, 54],
    iconAnchor: [19, 27]
  });
}

export default function Supervisor() {

  const [comercios, setComercios] = useState([]);
  const [seccionActiva, setSeccionActiva] = useState("monitoreo");
  const [cargando, setCargando] = useState(true);
  const [perfiles, setPerfiles] = useState([]);
  const [perfilSupervisor, setPerfilSupervisor] = useState(null);
  const [sesionSupervisor, setSesionSupervisor] = useState(null);
  const [filtroDiaMapa, setFiltroDiaMapa] = useState("TODOS");
  const diaSemana = filtroDiaMapa || "TODOS";
  const [preventistaSeleccionado, setPreventistaSeleccionado] = useState(null);
  const [comercioSeleccionado, setComercioSeleccionado] = useState(null);
  const [comercioFoco, setComercioFoco] = useState(null);
  const [comercioDetalleModal, setComercioDetalleModal] = useState(null);
  const [editPrevFicha, setEditPrevFicha] = useState("");
  const [editDiaFicha, setEditDiaFicha] = useState("");
  const [guardandoFicha, setGuardandoFicha] = useState(false);
  const [msgExitoFicha, setMsgExitoFicha] = useState(false);
  const [filtroEmpresa, setFiltroEmpresa] = useState("TODAS");
  const [secuenciaPersonalizada, setSecuenciaPersonalizada] = useState([]);
  const [busquedaSupervisor, setBusquedaSupervisor] = useState("");
  const [reproduciendoAudio, setReproduciendoAudio] = useState(false);
  const [audioActivoObj, setAudioActivoObj] = useState(null);

  // Inicialización de supervisor y datos
  useEffect(() => {
    async function inicializarSupervisor() {
    let empSupervisor = "DEMO S.A.";
      try {
        setCargando(true);
        const { data: authData } = await supabase.auth.getSession();
        if (authData && authData.session) {
          setSesionSupervisor(authData.session);
          const { data: pData } = await supabase
            .from("perfiles")
            .select("*")
            .eq("id", authData.session.user.id)
            .maybeSingle();
          if (pData) {
            setPerfilSupervisor(pData);
          }
        }

        const { data: perfilesData } = await supabase.from("perfiles").select("id, nombre, email, empresa, rol, latitud, longitud, ultima_posicion_at");
        if (perfilesData) setPerfiles(perfilesData);

        let queryComercios = supabase.from("comercios").select("*");
      const empActual = (perfilSupervisor?.empresa || (typeof empSupervisor !== "undefined" ? empSupervisor : "DEMO S.A.")).trim();
      if (empActual && empActual !== "TODAS") {
        queryComercios = queryComercios.ilike("empresa", "%DEMO S.A.%");
      }
      queryComercios = queryComercios.order("id", { ascending: false });
        const { data: comerciosData, error: errCom } = await queryComercios;
        if (comerciosData) {
          setComercios(comerciosData);
          console.log("Comercios cargados con éxito:", comerciosData.length);
        }
      } catch (err) {
        console.error("Fallo al inicializar supervisor:", err);
      } finally {
        setCargando(false);
      }
    }
    inicializarSupervisor();
  }, []);

  // Empresa del supervisor logueado
  const miEmpresa = (perfilSupervisor && (perfilSupervisor.empresa || perfilSupervisor.nombre_empresa)) || "";

  // Lista única de preventistas aislada por empresa
  const listaPreventistas = Array.from(new Set([
    ...(perfiles || [])
      .filter(p => p.rol === "preventista" && (!miEmpresa || miEmpresa === "TODAS" || miEmpresa === "SuperAdmin" || p.empresa === miEmpresa))
      .map(p => p.nombre),
    ...(comercios || [])
      .filter(co => !miEmpresa || miEmpresa === "TODAS" || miEmpresa === "SuperAdmin" || co.empresa === miEmpresa)
      .map(co => co.preventista)
      .filter(Boolean)
  ])).filter(Boolean);

  // Autoseleccionar preventista de la empresa actual
  useEffect(() => {
    if (listaPreventistas.length > 0) {
      const nomActual = typeof preventistaSeleccionado === "object" ? preventistaSeleccionado?.nombre : preventistaSeleccionado;
      const existe = listaPreventistas.find(p => (nomActual || "").trim().toUpperCase() === (p || "").trim().toUpperCase());
      if (!existe) {
        setPreventistaSeleccionado(listaPreventistas[0]);
      }
    } else {
      setPreventistaSeleccionado(null);
    }
  }, [listaPreventistas, preventistaSeleccionado]);

  // Ordenamiento por secuencia
  const ordenarPorSecuenciaGuardada = (lista) => {
    if (!Array.isArray(lista)) return [];
    return [...lista].sort((a, b) => {
      const ordA = a.orden_visita !== null && a.orden_visita !== undefined ? Number(a.orden_visita) : 999999;
      const ordB = b.orden_visita !== null && b.orden_visita !== undefined ? Number(b.orden_visita) : 999999;
      if (ordA !== ordB) return ordA - ordB;
      return String(a.nombre || "").localeCompare(String(b.nombre || ""));
    });
  };

  // Comercios asignados al preventista
  const comerciosPreventista = (comercios || []).filter(item => { const target = String(preventistaSeleccionado?.nombre || preventistaSeleccionado || "").toLowerCase().trim(); if (!target || target === "todos") return true; const asignado = String(item.preventista || "").toLowerCase().trim(); return asignado === target || asignado.includes(target) || target.includes(asignado); });

  const diaActivo = seccionActiva === "planificador" ? diaSemana : filtroDiaMapa;

  const comerciosFiltradosPorDia = comerciosPreventista.filter(com => {
    if (diaActivo === "TODOS" || !diaActivo) return true;
    const dCom = (com.dia_visita || "").toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const dFiltro = diaActivo.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return dCom === dFiltro || dCom.includes(dFiltro);
  });

  const comerciosVisibles = ordenarPorSecuenciaGuardada(
    (comerciosFiltradosPorDia || []).filter(com => {
      if (!busquedaSupervisor || busquedaSupervisor.trim() === "") return true;
      const q = busquedaSupervisor.toLowerCase().trim();
      const nom = String(com.nombre || "").toLowerCase();
      const dir = String(com.direccion || "").toLowerCase();
      const rub = String(com.rubro || "").toLowerCase();
      const cuitStr = String(com.cuit || "").toLowerCase();
      const idStr = String(com.id || "");
      return nom.includes(q) || dir.includes(q) || rub.includes(q) || cuitStr.includes(q) || idStr.includes(q);
    })
  );

  useEffect(() => {
    if (comerciosVisibles && comerciosVisibles.length > 0) {
      const ordenados = [...comerciosVisibles].sort((a, b) => {
        const ordA = a.orden_visita !== null && a.orden_visita !== undefined ? a.orden_visita : 999;
        const ordB = b.orden_visita !== null && b.orden_visita !== undefined ? b.orden_visita : 999;
        return ordA - ordB;
      });
      setSecuenciaPersonalizada(prev => {
        if (!prev || prev.length === 0) return ordenados;
        const idsPrev = prev.map(p => p.id).sort().join(",");
        const idsNuevos = ordenados.map(p => p.id).sort().join(",");
        if (idsPrev !== idsNuevos) return ordenados;
        return prev;
      });
    } else {
      setSecuenciaPersonalizada([]);
    }
  }, [filtroDiaMapa, preventistaSeleccionado, comercios]);

  const moverParada = (index, direccion) => {
    setSecuenciaPersonalizada(prev => {
      const nuevoIndex = index + direccion;
      if (nuevoIndex < 0 || nuevoIndex >= prev.length) return prev;
      const copia = [...prev];
      const temp = copia[index];
      copia[index] = copia[nuevoIndex];
      copia[nuevoIndex] = temp;
      return copia;
    });
  };

  const guardarSecuenciaEnBase = async () => {
    if (!secuenciaPersonalizada || secuenciaPersonalizada.length === 0) return;
    try {
      setCargando(true);
      const promesas = secuenciaPersonalizada.map((c, index) => {
        return supabase
          .from("comercios")
          .update({ orden_visita: index + 1 })
          .eq("id", c.id);
      });
      await Promise.all(promesas);

      setComercios(prev => {
        const mapa = {};
        secuenciaPersonalizada.forEach((c, idx) => { mapa[c.id] = idx + 1; });
        return prev.map(item => {
          if (mapa[item.id] !== undefined) {
            return { ...item, orden_visita: mapa[item.id] };
          }
          return item;
        });
      });

      alert("✓ Hoja de ruta guardada con éxito.");
    } catch (err) {
      console.error("Error al guardar hoja de ruta:", err);
      alert("Error al guardar: " + (err.message || "Verificar conexión"));
    } finally {
      setCargando(false);
    }
  };

  const listaParaMapa = (seccionActiva === "planificador" && secuenciaPersonalizada.length > 0)
    ? secuenciaPersonalizada
    : comerciosVisibles;

  const coordenadasValidas = listaParaMapa
    .map(c => [c.ubicacion_exacta_latitud || c.latitud, c.ubicacion_exacta_longitud || c.longitud])
    .filter(p => p[0] && p[1] && !isNaN(p[0]) && !isNaN(p[1]));

  const centroMapa = coordenadasValidas[0] || [-34.719, -58.264];
  const rutaRecorrida = coordenadasValidas.slice(0, Math.ceil(coordenadasValidas.length * 0.65));
  const rutaRestante = coordenadasValidas.slice(Math.max(0, Math.ceil(coordenadasValidas.length * 0.65) - 1));

  // Telemetría de flota
  const hoyStr = new Date().toISOString().slice(0, 10);
  const telemetriaFlota = listaPreventistas.map((prev, idx) => {
    const cPrev = comercios.filter(c => (c.preventista || "").toUpperCase().includes(prev.toUpperCase()));
    const cHoy = cPrev.filter(c => String(c.fecha || c.created_at || "").includes(hoyStr));
    const activoHoy = cHoy.length > 0;
    return {
      nombre: prev,
      rutaId: "Ruta #" + (idx + 1 < 10 ? "0" + (idx + 1) : idx + 1),
      zona: "Zona Comercial",
      estado: activoHoy ? "En Ruta (Activo)" : "En Base (Standby)",
      paradasTotales: cPrev.length,
      paradasHoy: cHoy.length,
      activoHoy: activoHoy,
      proxima: cPrev[0]?.nombre || "Sin comercios asignados"
    };
  });

  const activosEnCalle = telemetriaFlota.filter(p => p.activoHoy).length;
  const porcentajeActivos = telemetriaFlota.length > 0 ? Math.round((activosEnCalle / telemetriaFlota.length) * 100) : 0;

  const cerrarModalComercioFicha = () => {
    try {
      if (audioActivoObj && typeof audioActivoObj.pause === "function") {
        audioActivoObj.pause();
      }
    } catch(e) {}
    setReproduciendoAudio(false);
    setMsgExitoFicha(false);
    setComercioDetalleModal(null);
  };

  const guardarReasignacionComercio = async () => {
    if (!comercioDetalleModal) return;
    setGuardandoFicha(true);
    try {
      const pFinal = String(editPrevFicha || comercioDetalleModal.preventista || "").trim();
      const dFinal = editDiaFicha ? String(editDiaFicha).trim().toUpperCase() : "";
      
      const { error } = await supabase
        .from("comercios")
        .update({ preventista: pFinal, dia_visita: dFinal })
        .eq("id", comercioDetalleModal.id);
        
      if (error) throw error;
      
      const nuevosComercios = (comercios || []).map(item => {
        if (item.id === comercioDetalleModal.id) {
          return { ...item, preventista: pFinal, dia_visita: dFinal };
        }
        return item;
      });
      setComercios(nuevosComercios);
      setComercioDetalleModal(prev => prev ? { ...prev, preventista: pFinal, dia_visita: dFinal } : null);
      setEditPrevFicha(pFinal);
      setEditDiaFicha(dFinal);

      setSecuenciaPersonalizada(prev => {
        const lista = Array.isArray(prev) ? prev : [];
        if (filtroDiaMapa && filtroDiaMapa !== "TODOS" && dFinal !== filtroDiaMapa) {
          return lista.filter(item => item.id !== comercioDetalleModal.id);
        }
        return lista.map(item => {
          if (item.id === comercioDetalleModal.id) {
            return { ...item, preventista: pFinal, dia_visita: dFinal };
          }
          return item;
        });
      });
      
      setMsgExitoFicha(true);
      setTimeout(() => setMsgExitoFicha(false), 2000);
    } catch (err) {
      console.error("Error al reasignar comercio:", err);
      alert("Error al guardar reasignación: " + (err.message || "Verifique conexión"));
    } finally {
      setGuardandoFicha(false);
    }
  };

  const handleToggleAudioFicha = (audioBase64) => {
    if (!audioBase64) return;
    if (reproduciendoAudio && audioActivoObj) {
      audioActivoObj.pause();
      setReproduciendoAudio(false);
      return;
    }
    try {
      const snd = new Audio(audioBase64);
      setAudioActivoObj(snd);
      setReproduciendoAudio(true);
      snd.play();
      snd.onended = () => setReproduciendoAudio(false);
      snd.onerror = () => {
        alert("Formato de audio no compatible o vacío");
        setReproduciendoAudio(false);
      };
    } catch(err) {
      alert("Error al reproducir audio");
      setReproduciendoAudio(false);
    }
  };

  const nombrePrevActivo = typeof preventistaSeleccionado === "object" ? preventistaSeleccionado?.nombre : (preventistaSeleccionado || "");
  
  // Auto-actualización periódica en segundo plano cada 12 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (typeof cargarDatos === "function") {
        cargarDatos();
      }
    }, 12000);
    return () => clearInterval(intervalo);
  }, [preventistaSeleccionado, filtroDiaMapa]);


  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* CABECERA PRINCIPAL */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "32px", height: "32px", backgroundColor: "#2563eb", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "16px" }}>
            📍
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ margin: 0, fontSize: "17px", fontWeight: "800", letterSpacing: "-0.5px" }}>RutaComercio Web</h1>
              <span style={{ backgroundColor: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: "700", padding: "1px 6px", borderRadius: "10px" }}>
                ● En Vivo
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>Panel de Supervisión • Rutas • Planificador</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          
          <a href="/pagos" style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#1e293b", color: "#ffffff", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", textDecoration: "none", fontWeight: "700" }}>
            💳 Pagos
          </a>
          <button
            type="button"
            onClick={async () => { try { await supabase.auth.signOut(); } catch(e){} try { localStorage.clear(); sessionStorage.clear(); } catch(e){} window.location.href = "/"; }}
            style={{ padding: "6px 12px", backgroundColor: "#ef4444", color: "#ffffff", borderRadius: "6px", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}
          >
            ✕ Salir
          </button>
        </div>
      </header>

      {/* PESTAÑAS */}
      <div style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", display: "flex", gap: "20px" }}>
        <button
          onClick={() => setSeccionActiva("monitoreo")}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "monitoreo" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "monitoreo" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          📡 Monitoreo en Vivo
        </button>
        <button
          onClick={() => setSeccionActiva("planificador")}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "planificador" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "planificador" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          🗓️ Diseñador Hojas de Ruta (Semanal)
        </button>
        <button
          onClick={() => window.location.href = "/pedidos"}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          📦 Pedidos
        </button>
      </div>

      <main style={{ padding: "16px 24px", maxWidth: "1500px", margin: "0 auto" }}>
        {/* KPI CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <div style={{ backgroundColor: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Preventistas</span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
              {activosEnCalle} / {telemetriaFlota.length} <span style={{ fontSize: "11px", color: "#16a34a" }}>({porcentajeActivos}%)</span>
            </div>
          </div>
          <div style={{ backgroundColor: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total Comercios</span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>{comercios.length}</div>
          </div>
          <div style={{ backgroundColor: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Comercios en Foco</span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb", marginTop: "2px" }}>{comerciosVisibles.length}</div>
          </div>
        </div>

        
        {/* TELEMETRÍA DE FLOTA (TARJETAS DE PREVENTISTAS) */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Flota de Preventistas</span>
            {preventistaSeleccionado && (
              <button
                type="button"
                onClick={() => setPreventistaSeleccionado(null)}
                style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
              >
                ✕ Ver Todos
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
            {telemetriaFlota.map((prev, idx) => {
              const seleccionado = (preventistaSeleccionado?.nombre || preventistaSeleccionado) === prev.nombre;
              return (
                <div
                  key={prev.nombre || idx}
                  onClick={() => setPreventistaSeleccionado(seleccionado ? null : prev)}
                  style={{
                    backgroundColor: seleccionado ? "#eff6ff" : "#ffffff",
                    border: seleccionado ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: seleccionado ? "0 2px 8px rgba(37,99,235,0.15)" : "none"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>👤 {prev.nombre}</div>
                    <div style={{ fontSize: "11px", color: prev.activoHoy ? "#16a34a" : "#64748b", marginTop: "2px", fontWeight: "600" }}>
                      {prev.activoHoy ? "🟢 En ruta" : "💤 Standby"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#2563eb" }}>{prev.paradasTotales || 0}</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>comercios</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SELECTOR DE DÍAS (ULTRA COMPACTO) */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "8px 14px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>🗓️ Día:</span>
            {["TODOS", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map(d => {
              const activo = diaActivo === d;
              return (
                <button
                  key={d}
                  onClick={() => {
                    const diaElegido = d.toUpperCase();
                    setFiltroDiaMapa(diaElegido);
                  }}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "5px",
                    fontSize: "11px",
                    fontWeight: "700",
                    border: activo ? "1px solid #2563eb" : "1px solid #cbd5e1",
                    backgroundColor: activo ? "#2563eb" : "#ffffff",
                    color: activo ? "#ffffff" : "#475569",
                    cursor: "pointer"
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="text"
              placeholder="Buscar comercio..."
              value={busquedaSupervisor}
              onChange={(e) => setBusquedaSupervisor(e.target.value)}
              style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", width: "180px", outline: "none" }}
            />
            {busquedaSupervisor && (
              <button onClick={() => setBusquedaSupervisor("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b", fontWeight: "bold" }}>✕</button>
            )}
          </div>
        </div>

        {/* CUERPO PRINCIPAL: SECUENCIADOR COMPACTO A LA IZQUIERDA + MAPA A LA DERECHA */}
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "16px", alignItems: "start" }}>
          
          {/* COLUMNA IZQUIERDA: LISTADO DE PARADAS Y ORDENADOR */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
                  📋 {seccionActiva === "planificador" ? "Secuenciador de Paradas" : "Comercios"} ({secuenciaPersonalizada.length})
                </h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#64748b" }}>
                  {nombrePrevActivo} • {diaActivo}
                </p>
              </div>

              {seccionActiva === "planificador" && (
                <button
                  type="button"
                  onClick={guardarSecuenciaEnBase}
                  style={{ padding: "4px 10px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                >
                  💾 Guardar
                </button>
              )}
            </div>

            {/* LISTADO DE PARADAS (COMPACTO CON SCROLL) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "480px", overflowY: "auto", paddingRight: "4px" }}>
              {secuenciaPersonalizada.length === 0 ? (
                <div style={{ padding: "20px 10px", textAlign: "center", color: "#64748b", fontSize: "12px", border: "1px dashed #cbd5e1", borderRadius: "8px" }}>
                  No hay comercios para {diaActivo}. Elegí otro día o agregá comercios.
                </div>
              ) : (
                secuenciaPersonalizada.map((c, i) => (
                  <div
                    key={c.id || i}
                    onClick={() => { setComercioFoco(c); setComercioDetalleModal(c); setEditPrevFicha(c.preventista || ""); setEditDiaFicha(c.dia_visita ? String(c.dia_visita).trim().toUpperCase() : ""); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      backgroundColor: i === 0 ? "#f0fdf4" : "#f8fafc",
                      borderRadius: "6px",
                      border: i === 0 ? "1px solid #86efac" : "1px solid #e2e8f0",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: i === 0 ? "#16a34a" : "#2563eb",
                        color: "#fff",
                        fontSize: "10px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        {i + 1}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.nombre || ("Comercio #" + c.id)}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.direccion || "Sin dirección"} {c.dia_visita ? "• " + c.dia_visita : ""}
                        </div>
                      </div>
                    </div>

                    {/* BOTONERA DE REORDENAMIENTO */}
                    {seccionActiva === "planificador" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => moverParada(i, -1)}
                          disabled={i === 0}
                          style={{ width: "22px", height: "22px", borderRadius: "4px", border: "1px solid #cbd5e1", backgroundColor: i === 0 ? "#f1f5f9" : "#ffffff", color: i === 0 ? "#94a3b8" : "#0f172a", fontSize: "9px", cursor: i === 0 ? "not-allowed" : "pointer" }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moverParada(i, 1)}
                          disabled={i === secuenciaPersonalizada.length - 1}
                          style={{ width: "22px", height: "22px", borderRadius: "4px", border: "1px solid #cbd5e1", backgroundColor: i === secuenciaPersonalizada.length - 1 ? "#f1f5f9" : "#ffffff", color: i === secuenciaPersonalizada.length - 1 ? "#94a3b8" : "#0f172a", fontSize: "9px", cursor: i === secuenciaPersonalizada.length - 1 ? "not-allowed" : "pointer" }}
                        >
                          ▼
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: MAPA LEAFLET EN PARALELO */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
                🗺️ Mapa de Recorrido: <span style={{ color: "#2563eb" }}>{nombrePrevActivo}</span> ({coordenadasValidas.length} puntos con GPS)
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "10px", fontWeight: "bold" }}>
                <span style={{ color: "#16a34a" }}>— Real</span>
                <span style={{ color: "#2563eb" }}>- - Restante</span>
              </div>
            </div>

            <div style={{ height: "480px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
              <MapContainer center={centroMapa} zoom={14} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AutoCentradoMapa puntos={coordenadasValidas} puntoActivo={comercioFoco ? [comercioFoco.ubicacion_exacta_latitud || comercioFoco.latitud, comercioFoco.ubicacion_exacta_longitud || comercioFoco.longitud] : null} />

                {rutaRecorrida.length > 1 && (
                  <Polyline positions={rutaRecorrida} pathOptions={{ color: "#16a34a", weight: 4, opacity: 0.85 }} />
                )}

                {rutaRestante.length > 1 && (
                  <Polyline positions={rutaRestante} pathOptions={{ color: "#2563eb", weight: 3, dashArray: "6, 8", opacity: 0.75 }} />
                )}

                {listaParaMapa.map((c, i) => {
                  const lat = c.ubicacion_exacta_latitud || c.latitud;
                  const lng = c.ubicacion_exacta_longitud || c.longitud;
                  if (!lat || !lng) return null;
                  const estadoPin = i < rutaRecorrida.length ? "visitado" : i === rutaRecorrida.length ? "activo" : "pendiente";
                  return (
                    <Marker key={c.id} position={[lat, lng]} icon={iconoNumero(i + 1, estadoPin)}>
                      <Popup>
                        <div style={{ minWidth: "160px" }}>
                          {c.foto_url && (
                            <img src={c.foto_url} alt="" style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "4px", marginBottom: "4px" }} />
                          )}
                          <div style={{ fontSize: "10px", fontWeight: "bold", color: "#2563eb" }}>
                            Parada #{i + 1}
                          </div>
                          <strong style={{ fontSize: "12px" }}>{c.nombre || ("Comercio #" + c.id)}</strong>
                          <p style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#64748b" }}>{c.direccion || "Sin dirección"}</p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setComercioDetalleModal(c); setEditPrevFicha(c.preventista || ""); setEditDiaFicha(c.dia_visita ? String(c.dia_visita).trim().toUpperCase() : ""); }}
                            style={{ marginTop: "6px", width: "100%", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", padding: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                          >
                            Ver Ficha & Audio
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              
                {/* MARCADOR DEL PREVENTISTA EN VIVO */}
                {(() => {
                  const targetPrev = String(preventistaSeleccionado?.nombre || preventistaSeleccionado || "").toLowerCase().trim();
                  const pVivo = (perfiles || []).find(p => {
                    const n = String(p.nombre || p.email || "").toLowerCase().trim();
                    return targetPrev && (n === targetPrev || n.includes(targetPrev) || targetPrev.includes(n));
                  });
                  const latP = parseFloat(pVivo?.latitud);
                  const lngP = parseFloat(pVivo?.longitud);
                  if (!latP || !lngP || isNaN(latP) || isNaN(lngP)) return null;
                  return (
                    <Marker position={[latP, lngP]} icon={iconoPreventistaVivo(pVivo?.nombre || targetPrev)}>
                      <Popup>
                        <div style={{ fontSize: "12px", textAlign: "center" }}>
                          <strong style={{ color: "#2563eb", fontSize: "13px" }}>📡 {pVivo?.nombre || "Preventista"} (En vivo)</strong>
                          <div style={{ color: "#64748b", marginTop: "4px" }}>Última señal: {pVivo?.ultima_posicion_at ? new Date(pVivo.ultima_posicion_at).toLocaleTimeString() : "Reciente"}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })()}

                
                {/* MARCADOR DEL PREVENTISTA EN TIEMPO REAL */}
                {(() => {
                  const target = String(preventistaSeleccionado?.nombre || preventistaSeleccionado || "").toLowerCase().trim();
                  const pVivo = (perfiles || []).find(p => {
                    const n = String(p.nombre || p.email || "").toLowerCase().trim();
                    return target && (n === target || n.includes(target) || target.includes(n));
                  });
                  const latP = parseFloat(pVivo?.latitud);
                  const lngP = parseFloat(pVivo?.longitud);
                  if (!latP || !lngP || isNaN(latP) || isNaN(lngP)) return null;
                  return (
                    <Marker position={[latP, lngP]} icon={iconoPreventistaVivo(pVivo?.nombre || target)}>
                      <Popup>
                        <div style={{ textAlign: "center", fontSize: "12px" }}>
                          <strong style={{ color: "#2563eb", fontSize: "13px" }}>🚗 {pVivo?.nombre || "Preventista"} (En vivo)</strong>
                          <div style={{ color: "#64748b", marginTop: "3px" }}>Última señal: {pVivo?.ultima_posicion_at ? new Date(pVivo.ultima_posicion_at).toLocaleTimeString() : "Reciente"}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })()}

                
                {/* AUTO PREVENTISTA EN TIEMPO REAL */}
                {(() => {
                  const target = String(preventistaSeleccionado?.nombre || preventistaSeleccionado || "").toLowerCase().trim();
                  const pVivo = (perfiles || []).find(p => {
                    const n = String(p.nombre || p.email || "").toLowerCase().trim();
                    return target && (n === target || n.includes(target) || target.includes(n));
                  });
                  // Si no encontró por nombre, toma el primer perfil con coordenadas
                  const perfilConGPS = pVivo || (perfiles || []).find(p => p.latitud && p.longitud);
                  const latA = parseFloat(perfilConGPS?.latitud);
                  const lngA = parseFloat(perfilConGPS?.longitud);
                  if (!latA || !lngA || isNaN(latA) || isNaN(lngA)) return null;
                  return (
                    <Marker position={[latA, lngA]} icon={iconoAutoGPS(perfilConGPS?.nombre || target)}>
                      <Popup>
                        <div style={{ textAlign: "center", fontSize: "12px", padding: "4px" }}>
                          <strong style={{ color: "#2563eb", fontSize: "13px" }}>🚗 {perfilConGPS?.nombre || "Preventista"}</strong>
                          <div style={{ color: "#16a34a", fontWeight: "bold", marginTop: "2px" }}>● En ruta en tiempo real</div>
                          <div style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}>Última señal: {perfilConGPS?.ultima_posicion_at ? new Date(perfilConGPS.ultima_posicion_at).toLocaleTimeString() : "Ahora"}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })()}

                
                {/* 🚗 AUTITO PREVENTISTA EN VIVO EN EL MAPA */}
                {(() => {
                  const targetNom = String(preventistaSeleccionado?.nombre || preventistaSeleccionado || "").toLowerCase().trim();
                  
                  // Busca el perfil del preventista
                  const pVivo = (perfiles || []).find(p => {
                    const n = String(p.nombre || p.email || "").toLowerCase().trim();
                    return targetNom && (n === targetNom || n.includes(targetNom) || targetNom.includes(n));
                  });

                  // 1. Prioridad absoluta: Coordenadas del GPS real transmitido por el celular
                  let latA = parseFloat(pVivo?.latitud);
                  let lngA = parseFloat(pVivo?.longitud);

                  // 2. Si aún no hay GPS en perfil, busca el comercio con la FECHA/HORA más reciente (NUNCA por orden de ruta)
                  if ((!latA || !lngA || isNaN(latA) || isNaN(lngA)) && comercios && comercios.length > 0) {
                    const comerciosPrev = comercios.filter(c => {
                      const asig = String(c.preventista || "").toLowerCase().trim();
                      return targetNom && (asig === targetNom || asig.includes(targetNom) || targetNom.includes(asig));
                    });
                    if (comerciosPrev.length > 0) {
                      const ordenadosPorFecha = [...comerciosPrev].sort((a, b) => new Date(b.fecha || b.created_at || 0) - new Date(a.fecha || a.created_at || 0));
                      const masReciente = ordenadosPorFecha[0];
                      latA = parseFloat(masReciente?.ubicacion_exacta_latitud || masReciente?.latitud);
                      lngA = parseFloat(masReciente?.ubicacion_exacta_longitud || masReciente?.longitud);
                    }
                  }

                  if (!latA || !lngA || isNaN(latA) || isNaN(lngA)) return null;

                  const etiquetaNombre = pVivo?.nombre || targetNom || "Preventista";

                  return (
                    <Marker position={[latA, lngA]} icon={iconoAutoGPS(etiquetaNombre)}>
                      <Popup>
                        <div style={{ textAlign: "center", fontSize: "12px", padding: "6px" }}>
                          <strong style={{ color: "#2563eb", fontSize: "14px" }}>🚗 {etiquetaNombre}</strong>
                          <div style={{ color: "#16a34a", fontWeight: "bold", marginTop: "3px" }}>● En ruta en tiempo real</div>
                          <div style={{ color: "#64748b", fontSize: "11px", marginTop: "3px" }}>
                            Última señal GPS: {pVivo?.ultima_posicion_at ? new Date(pVivo.ultima_posicion_at).toLocaleTimeString() : "Hoy en ruta"}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })()}

                </MapContainer>
            </div>
          </div>

        </div>

        {/* MODAL FICHA DE COMERCIO: DATOS FISCALES Y AUDIO */}
        {comercioDetalleModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(3px)" }}>
            <div style={{ background: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)", border: "1px solid #cbd5e1" }}>
              <div style={{ background: "#0f172a", color: "#fff", padding: "12px 16px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: "bold", background: "#2563eb", padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase" }}>Ficha Operativa</span>
                  <h3 style={{ margin: "2px 0 0 0", fontSize: "15px", fontWeight: "800" }}>{comercioDetalleModal.nombre || ("Comercio #" + comercioDetalleModal.id)}</h3>
                </div>
                <button type="button" onClick={cerrarModalComercioFicha} style={{ background: "rgba(255,255,255,0.25)", border: "none", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "16px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>✕</button>
              </div>

              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* DATOS FISCALES */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b", marginBottom: "6px" }}>🏢 DATOS FISCALES</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
                    <div style={{ background: "#fff", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                      <div style={{ color: "#64748b", fontSize: "9px", fontWeight: "bold" }}>CUIT / CUIL</div>
                      <div style={{ fontWeight: "800", color: "#0f172a" }}>{comercioDetalleModal.cuit || "No informado"}</div>
                    </div>
                    <div style={{ background: "#fff", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                      <div style={{ color: "#64748b", fontSize: "9px", fontWeight: "bold" }}>Condición IVA</div>
                      <div style={{ fontWeight: "800", color: "#0f172a" }}>{comercioDetalleModal.condicion_iva || "Consumidor Final"}</div>
                    </div>
                  </div>
                  <div style={{ background: "#fff", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1", marginTop: "6px", fontSize: "11px" }}>
                    <div style={{ color: "#64748b", fontSize: "9px", fontWeight: "bold" }}>Domicilio Fiscal</div>
                    <div style={{ fontWeight: "600", color: "#0f172a" }}>📍 {comercioDetalleModal.domicilio_fiscal || comercioDetalleModal.direccion || "Sin dirección"}</div>
                  </div>
                </div>

                {/* AUDIO */}
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "6px" }}>🎙️ NOTA DE VOZ</div>
                  {comercioDetalleModal.notas_audio ? (
                    <div style={{ background: "#ffffff", padding: "8px", borderRadius: "6px", border: "1px solid #93c5fd", display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleAudioFicha(comercioDetalleModal.notas_audio)}
                        style={{ background: reproduciendoAudio ? "#dc2626" : "#2563eb", color: "#fff", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", cursor: "pointer", flexShrink: 0 }}
                      >
                        {reproduciendoAudio ? "❚❚" : "▶"}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b" }}>{reproduciendoAudio ? "Reproduciendo audio..." : "Escuchar audio del preventista"}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "#ffffff", padding: "8px", borderRadius: "6px", border: "1px dashed #cbd5e1", textAlign: "center", fontSize: "11px", color: "#64748b" }}>
                      Sin notas de voz registradas.
                    </div>
                  )}
                  {comercioDetalleModal.notas && (
                    <div style={{ marginTop: "6px", fontSize: "11px", background: "#fff", padding: "6px", borderRadius: "4px", border: "1px solid #e2e8f0", color: "#334155" }}>
                      <strong>Notas:</strong> {comercioDetalleModal.notas}
                    </div>
                  )}
                </div>

                {/* FOTO Y TELEFONO */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {comercioDetalleModal.foto_url && (
                    <img src={comercioDetalleModal.foto_url} alt="" style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                  )}
                  <div style={{ flex: 1, fontSize: "11px" }}>
                    
              {/* REASIGNACIÓN DIRECTA DE PREVENTISTA Y DÍA DE VISITA */}
              <div style={{ marginTop: "10px", padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ⚙️ Reasignar Preventista y Ruta
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: "bold", color: "#64748b", marginBottom: "3px" }}>👤 Preventista Asignado</label>
                    <select
                      value={editPrevFicha || comercioDetalleModal.preventista || ""}
                      onChange={(e) => setEditPrevFicha(e.target.value)}
                      style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#fff", color: "#0f172a", fontWeight: "600" }}
                    >
                      {listaPreventistas.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: "bold", color: "#64748b", marginBottom: "3px" }}>🗓️ Día de Visita</label>
                    <select
                      value={editDiaFicha ? String(editDiaFicha).trim().toUpperCase() : ""}
                      onChange={(e) => setEditDiaFicha(e.target.value)}
                      style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#fff", color: "#0f172a", fontWeight: "600" }}
                    >
                      <option value="">(Sin asignar)</option>
                      {["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={guardarReasignacionComercio}
                  disabled={guardandoFicha}
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    background: guardandoFicha ? "#94a3b8" : "#2563eb",
                    color: "#fff",
                    border: "none",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: guardandoFicha ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(37,99,235,0.2)"
                  }}
                >
                  {guardandoFicha ? "Guardando en Supabase..." : "💾 Guardar Reasignación"}
                </button>
                {msgExitoFicha && (
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#16a34a", fontWeight: "bold", textAlign: "center" }}>
                    ✅ Reasignado con éxito en Supabase y mapa
                  </div>
                )}
              </div>

                    {comercioDetalleModal.telefono && (
                      <a href={"https://wa.me/" + comercioDetalleModal.telefono.replace(/[^0-9]/g, "")} target="_blank" rel="noreferrer" style={{ background: "#22c55e", color: "#fff", padding: "4px 8px", borderRadius: "4px", textDecoration: "none", fontSize: "11px", fontWeight: "bold", display: "inline-block", marginTop: "4px" }}>
                        💬 WhatsApp
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

