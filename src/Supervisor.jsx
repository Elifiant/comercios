 import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import DisenadorRutas from "./DisenadorRutas";
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
  const bg = estado === "no_visitar" ? "#111827" : estado === "visitado" ? "#10b981" : estado === "activo" ? "#2563eb" : "#64748b";
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


function iconoAutoGPS(nombre) {
  return L.divIcon({
    className: "pin-auto-gps",
    html: '<div style="background:#2563eb; color:#fff; border:2px solid #fff; border-radius:50%; width:38px; height:38px; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 0 16px rgba(37,99,235,0.95); position:relative;"><span style="position:absolute; width:100%; height:100%; border-radius:50%; border:2px solid #38bdf8; animation:ping 1.5s infinite;"></span>🚗</div><div style="background:#0f172a; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; margin-top:2px; white-space:nowrap; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.6);">' + (nombre || "Preventista") + ' (En vivo)</div>',
    iconSize: [38, 54],
    iconAnchor: [19, 27]
  });
}

export default function Supervisor() {
  const cerrarSesionSupervisor = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
    } catch(e) {}
    window.location.href = "/";
  };
  const aprobarNoVisitar = async (solicitud) => {
  const confirmar = window.confirm(
    `⚫ ¿Aprobar NO VISITAR MÁS para "${solicitud.comercio_nombre}"?`
  );

  if (!confirmar) return;

  try {
    // 1️⃣ Marcar el comercio como NO VISITAR MÁS
    const { error: errorComercio } = await supabase
      .from("comercios")
      .update({ no_visitar: true })
      .eq("id", solicitud.comercio_id)
      .eq("empresa_id", solicitud.empresa_id);

    if (errorComercio) throw errorComercio;

    // 2️⃣ Marcar la solicitud como aprobada
    const { data: solicitudActualizada, error: errorSolicitud } = await supabase
  .from("solicitudes_no_visitar")
  .update({ estado: "aprobada" })
  .eq("id", solicitud.id)
  .eq("empresa_id", solicitud.empresa_id)
  .select("id")
  .maybeSingle();

if (errorSolicitud) throw errorSolicitud;

if (!solicitudActualizada) {
  throw new Error("La solicitud no fue actualizada en Supabase.");
}

    // 3️⃣ Sacarla de pendientes en pantalla
    setSolicitudesNoVisitar((prev) =>
      prev.map((s) => s.id === solicitud.id ? { ...s, estado: "aprobada" } : s)
    );

    // 4️⃣ Actualizar también el comercio en Supervisor
    setComercios((prev) =>
      prev.map((c) =>
        c.id === solicitud.comercio_id
          ? { ...c, no_visitar: true }
          : c
      )
    );

    alert("⚫ Solicitud aprobada. Comercio marcado como NO VISITAR MÁS.");
  } catch (error) {
    console.error("Error aprobando solicitud:", error);
    alert("❌ No se pudo aprobar la solicitud.");
  }
};
const rechazarNoVisitar = async (solicitud) => {
  const confirmar = window.confirm(
    `❌ ¿Rechazar la solicitud de NO VISITAR MÁS para "${solicitud.comercio_nombre}"?`
  );

  if (!confirmar) return;

  try {
    const { data: solicitudActualizada, error } = await supabase
  .from("solicitudes_no_visitar")
  .update({ estado: "rechazada" })
  .eq("id", solicitud.id)
  .eq("empresa_id", solicitud.empresa_id)
  .select("id")
  .maybeSingle();

if (error) throw error;

if (!solicitudActualizada) {
  throw new Error("La solicitud no fue actualizada en Supabase.");
}

    setSolicitudesNoVisitar((prev) =>
      prev.map((s) => s.id === solicitud.id ? { ...s, estado: "rechazada" } : s)
    );

    alert("❌ Solicitud rechazada. El comercio continúa activo.");
  } catch (error) {
    console.error("Error rechazando solicitud:", error);
    alert("❌ No se pudo rechazar la solicitud.");
  }
};

const reactivarComercio = async (comercio) => {
  if (!comercio) return;

  const confirmar = window.confirm(
    `♻️ ¿Reactivar "${comercio.nombre || "este comercio"}"?\n\nVolverá a estar disponible para los preventistas.`
  );

  if (!confirmar) return;

  try {
    const { data: comercioActualizado, error } = await supabase
      .from("comercios")
      .update({ no_visitar: false })
      .eq("id", comercio.id)
      .eq("empresa_id", comercio.empresa_id)
      .select("id, no_visitar")
      .maybeSingle();

    if (error) throw error;

    if (!comercioActualizado) {
      throw new Error("El comercio no fue actualizado en Supabase.");
    }

    setComercios((prev) =>
      prev.map((c) =>
        c.id === comercio.id
          ? { ...c, no_visitar: false }
          : c
      )
    );
    
    setComercioDetalleModal((prev) =>
      prev
        ? { ...prev, no_visitar: false }
        : prev
    );

    alert("♻️ Comercio reactivado correctamente.");
  } catch (error) {
    console.error("Error reactivando comercio:", error);
    alert("❌ No se pudo reactivar el comercio.");
  }
};
  const [comercios, setComercios] = useState([]);
  const [pedidosReal, setPedidosReal] = useState([]);
  const [cargandoPedidosReal, setCargandoPedidosReal] = useState(false);
  const [pedidosSupervisor, setPedidosSupervisor] = useState([]);
  const [visitasSupervisor, setVisitasSupervisor] = useState([]);
  const [seccionActiva, setSeccionActiva] = useState("monitoreo");
  const [cargando, setCargando] = useState(true);
  const [perfiles, setPerfiles] = useState([]);
  const [perfilSupervisor, setPerfilSupervisor] = useState(null);
  const [solicitudesNoVisitar, setSolicitudesNoVisitar] = useState([]);
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
  const [datosAbono, setDatosAbono] = useState(null);
  const [filtroEstadoCuenta, setFiltroEstadoCuenta] = useState("todos");
  const [filtroPreventistaCuenta, setFiltroPreventistaCuenta] = useState("TODOS");
  const [busquedaCuenta, setBusquedaCuenta] = useState("");
  const [modalImportacionCuenta, setModalImportacionCuenta] = useState(false);
  const [modoImportacionCuenta, setModoImportacionCuenta] = useState("parcial");
  const [archivoCuentaNombre, setArchivoCuentaNombre] = useState("");
  const [vistaPreviaCuenta, setVistaPreviaCuenta] = useState(null);
  const [importandoCuenta, setImportandoCuenta] = useState(false);
  const inputArchivoCuentaRef = useRef(null);

  // Inicialización de supervisor y datos
  useEffect(() => {
    async function inicializarSupervisor() {
      try {
        setCargando(true);

        const { data: authData } = await supabase.auth.getSession();
        const sesion = authData?.session;

        if (!sesion) return;

        setSesionSupervisor(sesion);

        // 1) Averiguar a qué empresa pertenece EL supervisor que inició sesión
        const { data: pData, error: errorPerfil } = await supabase
          .from("perfiles")
          .select("empresa, empresa_id")
          .eq("id", sesion.user.id)
          .maybeSingle();

        if (errorPerfil) throw errorPerfil;
        if (!pData?.empresa_id) {
          throw new Error("El supervisor no tiene empresa_id asignado.");
        }

        setPerfilSupervisor(pData);

        // 2) Cargar solamente los perfiles de SU empresa
        const { data: perfilesData, error: errorPerfiles } = await supabase
          .from("perfiles")
          .select("id, nombre, email, empresa, rol, latitud, longitud, ultima_posicion_at")
          .eq("empresa_id", pData.empresa_id);

        if (errorPerfiles) throw errorPerfiles;
        setPerfiles(perfilesData || []);

        // 3) Cargar solamente los comercios de SU empresa
        const { data: comerciosData, error: errorComercios } = await supabase
          .from("comercios")
          .select("*")
          .eq("empresa_id", pData.empresa_id)
          .order("id", { ascending: false });

        if (errorComercios) throw errorComercios;

        setComercios(comerciosData || []);
        console.log("Comercios cargados con éxito:", (comerciosData || []).length);
      } catch (err) {
        console.error("Fallo al inicializar supervisor:", err);
      } finally {
        setCargando(false);
      }
    }

    inicializarSupervisor();
  }, []);

  // 🚫 Cargar solicitudes pendientes de NO VISITAR MÁS
useEffect(() => {
  if (!perfilSupervisor?.empresa_id) return;

  const cargarSolicitudesNoVisitar = async () => {
    try {
      const { data, error } = await supabase
        .from("solicitudes_no_visitar")
        .select("id, created_at, comercio_id, comercio_nombre, preventista, empresa_id, motivo, estado")
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSolicitudesNoVisitar(data || []);

    } catch (error) {
      console.error(
        "Error cargando solicitudes de no visitar:",
        error
      );
    }
  };

  cargarSolicitudesNoVisitar();
}, [perfilSupervisor]);

  // 🕐 Cargar visitas y pedidos de la empresa para la ficha operativa
  useEffect(() => {
    if (!perfilSupervisor?.empresa_id) return;

    const cargarActividadOperativa = async () => {
      try {
        const [visitasResp, pedidosResp] = await Promise.all([
          supabase
            .from("visitas")
            .select("*")
            .eq("empresa_id", perfilSupervisor.empresa_id)
            .order("fecha", { ascending: false }),
          supabase
            .from("pedidos")
            .select("*")
            .eq("empresa_id", perfilSupervisor.empresa_id)
            .order("created_at", { ascending: false }),
        ]);

        if (visitasResp.error) throw visitasResp.error;
        if (pedidosResp.error) throw pedidosResp.error;

        setVisitasSupervisor(visitasResp.data || []);
        setPedidosSupervisor(pedidosResp.data || []);
      } catch (error) {
        console.error("Error cargando actividad operativa:", error);
      }
    };

    cargarActividadOperativa();
  }, [perfilSupervisor?.empresa_id]);

  // 💳 Cargar vigencia real del abono de la empresa
  useEffect(() => {
    if (!perfilSupervisor?.empresa_id) return;

    const cargarDatosAbono = async () => {
      try {
        const { data, error } = await supabase
          .from("empresas")
          .select("nombre, abonado_hasta")
          .eq("id", perfilSupervisor.empresa_id)
          .maybeSingle();

        if (error) throw error;
        setDatosAbono(data || null);
      } catch (error) {
        console.error("Error cargando vigencia del abono:", error);
        setDatosAbono(null);
      }
    };

    cargarDatosAbono();
  }, [perfilSupervisor?.empresa_id]);

  const estadoAbono = (() => {
    const nombreEmpresa = String(datosAbono?.nombre || perfilSupervisor?.empresa || "").trim().toUpperCase();

    if (nombreEmpresa === "DEMO S.A." || nombreEmpresa === "DEMO SA") {
      return { texto: "Cuenta DEMO", color: "#2563eb", icono: "🧪" };
    }

    if (!datosAbono?.abonado_hasta) {
      return { texto: "Vencimiento no informado", color: "#64748b", icono: "🗓️" };
    }

    const partes = String(datosAbono.abonado_hasta).split("-").map(Number);
    const vencimiento = new Date(partes[0], partes[1] - 1, partes[2]);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    vencimiento.setHours(0, 0, 0, 0);

    const dias = Math.ceil((vencimiento - hoy) / 86400000);

    if (dias < 0) return { texto: "Abono vencido", color: "#dc2626", icono: "🔴" };
    if (dias === 0) return { texto: "Vence hoy", color: "#dc2626", icono: "🔴" };
    if (dias <= 5) return { texto: `${dias} día${dias === 1 ? "" : "s"} restante${dias === 1 ? "" : "s"}`, color: "#d97706", icono: "⚠️" };

    return { texto: `${dias} días restantes`, color: "#16a34a", icono: "🗓️" };
  })();

  // Empresa del supervisor logueado
  const miEmpresa = (perfilSupervisor && perfilSupervisor.empresa) || "";

  // Lista única de preventistas.
  // Los perfiles y comercios ya llegan aislados por empresa_id desde Supabase.
  const listaPreventistas = Array.from(new Set([
    ...(perfiles || [])
      .filter(p => p.rol === "preventista")
      .map(p => p.nombre || p.email)
      .filter(Boolean),
    ...(comercios || [])
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

  const diaActivo =
  seccionActiva === "planificador"
    ? diaSemana
    : new Date()
        .toLocaleDateString("es-AR", { weekday: "long" })
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

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

  const posicionPreventistaSeleccionado = (() => {
    const targetNom = String(preventistaSeleccionado?.nombre || preventistaSeleccionado || "").toLowerCase().trim();
    if (!targetNom) return null;
    const pVivo = (perfiles || []).find(p => {
      const n = String(p.nombre || p.email || "").toLowerCase().trim();
      return n === targetNom || n.includes(targetNom) || targetNom.includes(n);
    });
    const lat = parseFloat(pVivo?.latitud);
    const lng = parseFloat(pVivo?.longitud);
    return lat && lng && !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
  })();

  const normalizarCodigoCliente = (valor) => String(valor ?? "").trim().toUpperCase();

  const leerArchivoEstadoCuenta = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    try {
      setArchivoCuentaNombre(archivo.name);
      setVistaPreviaCuenta(null);

      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { defval: "", raw: false });

      if (!filas.length) throw new Error("La planilla está vacía.");

      const obtenerCampo = (fila, opciones) => {
        const mapa = Object.fromEntries(Object.entries(fila).map(([k, v]) => [String(k).trim().toLowerCase(), v]));
        for (const op of opciones) {
          if (Object.prototype.hasOwnProperty.call(mapa, op)) return mapa[op];
        }
        return undefined;
      };

      const mapaComercios = new Map(
        (comercios || []).map(c => [normalizarCodigoCliente(c.codigo_cliente), c])
      );
      const vistos = new Set();
      const encontrados = [];
      const noEncontrados = [];
      const duplicados = [];
      const invalidos = [];

      filas.forEach((fila, indice) => {
        const codigoRaw = obtenerCampo(fila, ["codigo_cliente", "código_cliente", "codigo cliente", "código cliente", "codigo", "código"]);
        const saldoRaw = obtenerCampo(fila, ["saldo", "deuda", "saldo pendiente", "saldo_pendiente"]);
        const codigo = normalizarCodigoCliente(codigoRaw);

        if (!codigo) {
          invalidos.push({ fila: indice + 2, motivo: "Código vacío" });
          return;
        }
        if (vistos.has(codigo)) {
          duplicados.push({ fila: indice + 2, codigo });
          return;
        }
        vistos.add(codigo);

        let textoSaldo = String(saldoRaw ?? "").trim().replace(/\s/g, "");
        if (textoSaldo.includes(",") && textoSaldo.includes(".")) {
          textoSaldo = textoSaldo.lastIndexOf(",") > textoSaldo.lastIndexOf(".")
            ? textoSaldo.replace(/\./g, "").replace(",", ".")
            : textoSaldo.replace(/,/g, "");
        } else if (textoSaldo.includes(",")) {
          textoSaldo = textoSaldo.replace(",", ".");
        }
        textoSaldo = textoSaldo.replace(/[^0-9.-]/g, "");
        const saldo = Number(textoSaldo);
        if (!Number.isFinite(saldo) || saldo < 0) {
          invalidos.push({ fila: indice + 2, codigo, motivo: "Saldo inválido" });
          return;
        }

        const comercio = mapaComercios.get(codigo);
        if (!comercio) {
          noEncontrados.push({ fila: indice + 2, codigo, saldo });
          return;
        }
        encontrados.push({ comercio, codigo, saldo });
      });

      const totalSaldo = encontrados.reduce((acc, item) => acc + item.saldo, 0);
      const conSaldo = encontrados.filter(item => item.saldo > 0).length;
      setVistaPreviaCuenta({
        totalFilas: filas.length,
        encontrados,
        noEncontrados,
        duplicados,
        invalidos,
        totalSaldo,
        conSaldo
      });
    } catch (error) {
      console.error("Error leyendo Estado de Cuenta:", error);
      alert("❌ No se pudo leer la planilla: " + (error.message || "Formato inválido"));
      setArchivoCuentaNombre("");
      setVistaPreviaCuenta(null);
    } finally {
      event.target.value = "";
    }
  };

  const confirmarImportacionEstadoCuenta = async () => {
    if (!vistaPreviaCuenta || !perfilSupervisor?.empresa_id) return;
    if (vistaPreviaCuenta.duplicados.length || vistaPreviaCuenta.invalidos.length) {
      alert("⚠️ Corregí los códigos duplicados o filas inválidas antes de importar.");
      return;
    }
    if (!vistaPreviaCuenta.encontrados.length) {
      alert("⚠️ No hay clientes válidos para actualizar.");
      return;
    }

    const mensaje = modoImportacionCuenta === "completo"
      ? "⚠️ REEMPLAZAR ESTADO DE CUENTA COMPLETO\n\nLos clientes que NO aparecen en la planilla pasarán a saldo $0.\n\n¿Confirmar importación?"
      : `Se actualizarán ${vistaPreviaCuenta.encontrados.length} clientes incluidos en la planilla.\n\n¿Confirmar importación?`;
    if (!window.confirm(mensaje)) return;

    setImportandoCuenta(true);
    try {
      const ahora = new Date().toISOString();
      const idsIncluidos = new Set(vistaPreviaCuenta.encontrados.map(x => x.comercio.id));
      const operaciones = vistaPreviaCuenta.encontrados.map(item =>
        supabase.from("comercios")
          .update({ deuda: item.saldo, deuda_actualizada_at: ahora })
          .eq("id", item.comercio.id)
          .eq("empresa_id", perfilSupervisor.empresa_id)
      );

      if (modoImportacionCuenta === "completo") {
        (comercios || []).filter(c => !idsIncluidos.has(c.id)).forEach(c => {
          operaciones.push(
            supabase.from("comercios")
              .update({ deuda: 0, deuda_actualizada_at: ahora })
              .eq("id", c.id)
              .eq("empresa_id", perfilSupervisor.empresa_id)
          );
        });
      }

      const resultados = await Promise.all(operaciones);
      const error = resultados.find(r => r.error)?.error;
      if (error) throw error;

      const saldoPorId = new Map(vistaPreviaCuenta.encontrados.map(x => [x.comercio.id, x.saldo]));
      setComercios(prev => (prev || []).map(c => {
        if (saldoPorId.has(c.id)) return { ...c, deuda: saldoPorId.get(c.id), deuda_actualizada_at: ahora };
        if (modoImportacionCuenta === "completo") return { ...c, deuda: 0, deuda_actualizada_at: ahora };
        return c;
      }));

      alert(`✅ Estado de Cuenta actualizado.\n\n${vistaPreviaCuenta.encontrados.length} clientes procesados.${vistaPreviaCuenta.noEncontrados.length ? `\n⚠️ ${vistaPreviaCuenta.noEncontrados.length} códigos no encontrados.` : ""}`);
      setModalImportacionCuenta(false);
      setVistaPreviaCuenta(null);
      setArchivoCuentaNombre("");
    } catch (error) {
      console.error("Error importando Estado de Cuenta:", error);
      alert("❌ No se pudo completar la importación: " + (error.message || "Verifique conexión"));
    } finally {
      setImportandoCuenta(false);
    }
  };

  // 💳 Estado de Cuenta de clientes
  const comerciosEstadoCuenta = (comercios || []).filter((c) => {
    const deuda = Number(c.deuda || 0);
    if (filtroEstadoCuenta === "con_saldo" && deuda <= 0) return false;
    if (filtroEstadoCuenta === "sin_saldo" && deuda > 0) return false;

    if (filtroPreventistaCuenta !== "TODOS") {
      const asignado = String(c.preventista || "").trim().toLowerCase();
      if (asignado !== String(filtroPreventistaCuenta).trim().toLowerCase()) return false;
    }

    const q = String(busquedaCuenta || "").trim().toLowerCase();
    if (q) {
      const nombre = String(c.nombre || "").toLowerCase();
      const codigo = String(c.codigo_cliente || c.codigo || c.id || "").toLowerCase();
      if (!nombre.includes(q) && !codigo.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => Number(b.deuda || 0) - Number(a.deuda || 0));

  const clientesConSaldo = (comercios || []).filter(c => Number(c.deuda || 0) > 0).length;
  const saldoTotalPendiente = (comercios || []).reduce((acc, c) => acc + Math.max(0, Number(c.deuda || 0)), 0);
  const solicitudesPendientes = (solicitudesNoVisitar || []).filter(s => s.estado === "pendiente");
  const solicitudesHistorial = (solicitudesNoVisitar || []).filter(s => s.estado !== "pendiente");

  // 🟡 Comercios dados de alta por preventistas que esperan aprobación del supervisor
  const altasProvisorias = (comercios || []).filter(c => c.estado_alta === "provisorio");

  const aprobarAltaProvisoria = async (comercio) => {
    if (!comercio?.id || !perfilSupervisor?.empresa_id) return;
    const confirmar = window.confirm(`✅ ¿Aprobar el alta de "${comercio.nombre || "este comercio"}"?`);
    if (!confirmar) return;

    try {
      const { data, error } = await supabase
        .from("comercios")
        .update({ estado_alta: "aprobado" })
        .eq("id", comercio.id)
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .select("id, estado_alta")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("El comercio no fue actualizado en Supabase.");

      setComercios(prev => (prev || []).map(c =>
        c.id === comercio.id ? { ...c, estado_alta: "aprobado" } : c
      ));
      alert("✅ Alta aprobada. El comercio quedó confirmado.");
    } catch (error) {
      console.error("Error aprobando alta provisoria:", error);
      alert("❌ No se pudo aprobar el alta: " + (error.message || "Verifique conexión"));
    }
  };

  const aprobarTodasAltasProvisorias = async () => {
    if (!perfilSupervisor?.empresa_id || altasProvisorias.length === 0) return;

    const cantidad = altasProvisorias.length;
    const confirmar = window.confirm(
      `✅ ¿Aprobar las ${cantidad} altas provisorias pendientes?\n\nSe confirmarán todos los comercios provisorios de esta empresa. No se borrará ningún pedido ni venta.`
    );
    if (!confirmar) return;

    try {
      const { data, error } = await supabase
        .from("comercios")
        .update({ estado_alta: "aprobado" })
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .eq("estado_alta", "provisorio")
        .select("id");

      if (error) throw error;

      const idsAprobados = new Set((data || []).map(item => String(item.id)));
      if (idsAprobados.size === 0) {
        throw new Error("No se actualizó ninguna alta provisoria en Supabase.");
      }

      setComercios(prev => (prev || []).map(c =>
        idsAprobados.has(String(c.id)) ? { ...c, estado_alta: "aprobado" } : c
      ));

      alert(`✅ ${idsAprobados.size} alta${idsAprobados.size === 1 ? "" : "s"} aprobada${idsAprobados.size === 1 ? "" : "s"} correctamente.`);
    } catch (error) {
      console.error("Error aprobando todas las altas provisorias:", error);
      alert("❌ No se pudieron aprobar todas las altas: " + (error.message || "Verifique conexión"));
    }
  };

  const rechazarAltaProvisoria = async (comercio) => {
    if (!comercio?.id || !perfilSupervisor?.empresa_id) return;
    const confirmar = window.confirm(
      `❌ ¿Rechazar el alta de "${comercio.nombre || "este comercio"}"?\n\nEl comercio NO se borrará y sus pedidos/ventas se conservarán.`
    );
    if (!confirmar) return;

    try {
      const { data, error } = await supabase
        .from("comercios")
        .update({ estado_alta: "rechazado" })
        .eq("id", comercio.id)
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .select("id, estado_alta")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("El comercio no fue actualizado en Supabase.");

      setComercios(prev => (prev || []).map(c =>
        c.id === comercio.id ? { ...c, estado_alta: "rechazado" } : c
      ));
      alert("❌ Alta rechazada. El comercio y sus ventas quedaron conservados.");
    } catch (error) {
      console.error("Error rechazando alta provisoria:", error);
      alert("❌ No se pudo rechazar el alta: " + (error.message || "Verifique conexión"));
    }
  };

  const actividadComercioDetalle = (() => {
    if (!comercioDetalleModal?.id) return { visita: null, pedido: null, esHoy: false };

    const idComercio = String(comercioDetalleModal.id);
    const visitas = (visitasSupervisor || [])
      .filter(v => String(v.comercio_id) === idComercio)
      .sort((a, b) => new Date(b.fecha || b.created_at || 0) - new Date(a.fecha || a.created_at || 0));

    const visita = visitas[0] || null;
    const pedidos = (pedidosSupervisor || [])
      .filter(p => String(p.comercio_id) === idComercio)
      .sort((a, b) => new Date(b.created_at || b.fecha || 0) - new Date(a.created_at || a.fecha || 0));

    const pedido = pedidos[0] || null;
    const fechaVisita = visita?.fecha || visita?.created_at || null;
    const hoy = new Date();
    const fv = fechaVisita ? new Date(fechaVisita) : null;
    const esHoy = !!fv && fv.getFullYear() === hoy.getFullYear() && fv.getMonth() === hoy.getMonth() && fv.getDate() === hoy.getDate();

    return { visita, pedido, esHoy };
  })();

  const estiloResultadoVisita = (resultado) => {
    const r = String(resultado || "").toLowerCase();
    if (r.includes("venta") || r.includes("pedido")) return { icono: "💰", fondo: "#f0fdf4", borde: "#86efac", color: "#166534" };
    if (r.includes("stock")) return { icono: "📦", fondo: "#eff6ff", borde: "#93c5fd", color: "#1d4ed8" };
    if (r.includes("cerrado")) return { icono: "🔒", fondo: "#fff7ed", borde: "#fdba74", color: "#9a3412" };
    if (r.includes("no estaba")) return { icono: "🚪", fondo: "#fefce8", borde: "#fde047", color: "#854d0e" };
    if (r.includes("interes")) return { icono: "❌", fondo: "#fef2f2", borde: "#fca5a5", color: "#991b1b" };
    return { icono: "📍", fondo: "#f8fafc", borde: "#cbd5e1", color: "#334155" };
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        .rc-supervisor-tabs {
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }
        @media (max-width: 700px) {
          .rc-supervisor-header {
            padding: 10px 12px !important;
            align-items: stretch !important;
          }
          .rc-supervisor-header-left {
            width: 100%;
          }
          .rc-supervisor-header-actions {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 7px !important;
          }
          .rc-supervisor-header-actions > :first-child {
            grid-column: 1 / -1;
            justify-content: center;
          }
          .rc-supervisor-header-actions a,
          .rc-supervisor-header-actions button {
            justify-content: center !important;
            text-align: center;
            padding: 8px 7px !important;
            font-size: 11px !important;
          }
          .rc-supervisor-tabs {
            padding: 0 12px !important;
            gap: 16px !important;
            overflow-x: auto;
            flex-wrap: nowrap !important;
          }
          .rc-supervisor-tabs > button {
            flex: 0 0 auto;
            white-space: nowrap;
            min-height: 44px;
          }
          .rc-supervisor-main {
            padding: 12px !important;
            width: 100%;
            box-sizing: border-box;
            overflow-x: hidden;
          }
          .rc-supervisor-main input,
          .rc-supervisor-main select,
          .rc-supervisor-main button {
            max-width: 100%;
          }
          .rc-supervisor-two-columns {
            grid-template-columns: 1fr !important;
          }
          .rc-supervisor-map {
            height: 360px !important;
          }
          .rc-supervisor-modal-grid {
            grid-template-columns: 1fr !important;
          }
          .rc-cuenta-header { display: none !important; }
          .rc-cuenta-row {
            grid-template-columns: 1fr 1fr !important;
            gap: 7px 10px !important;
            padding: 10px !important;
          }
          .rc-cuenta-row > :first-child { grid-column: 1 / -1; }
          .rc-cuenta-row > :nth-child(4) { text-align: left !important; }
          .rc-solicitud-historial {
            grid-template-columns: 1fr !important;
            gap: 3px !important;
            padding: 9px 4px !important;
          }
          .rc-alta-card { padding: 9px !important; border-radius: 9px !important; }
          .rc-alta-info { flex: 1 1 100% !important; }
          .rc-alta-actions { width: 100%; gap: 5px !important; }
          .rc-alta-actions button {
            flex: 1 1 auto;
            padding: 7px 6px !important;
            font-size: 10px !important;
          }
        }
      `}</style>

      {/* CABECERA PRINCIPAL */}
      <header className="rc-supervisor-header" style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {/* IZQUIERDA: MARCA Y LOGO OFICIAL */}
        <div className="rc-supervisor-header-left" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo.svg" alt="RutaComercio" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ margin: 0, fontSize: "17px", fontWeight: "800", letterSpacing: "-0.5px", color: "#0f172a" }}>RutaComercio Web</h1>
              <span style={{ backgroundColor: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: "700", padding: "1px 6px", borderRadius: "10px" }}>
                ● En Vivo
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Panel de Control y Supervisión Territorial
            </p>
          </div>
        </div>

        {/* DERECHA: ESTADO ABONO + PAGOS + SALIR */}
        <div className="rc-supervisor-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* CARTEL DE VIGENCIA DE ABONO */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#f8fafc",
            border: "1px solid #cbd5e1",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "700",
            color: "#334155"
          }}>
            <span>{estadoAbono.icono}</span>
            <span>
              Abono: <strong style={{ color: estadoAbono.color }}>{estadoAbono.texto}</strong>
            </span>
          </div>

          <a
            href="/pagos"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "700",
              textDecoration: "none",
              cursor: "pointer"
            }}
          >
            <span>💳</span> Pagos & Suscripción
          </a>

          <button
            type="button"
            onClick={cerrarSesionSupervisor}
            style={{
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              border: "1px solid #fca5a5",
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>✕</span> Salir
          </button>
        </div>
      </header>

      {/* PESTAÑAS */}
      <div className="rc-supervisor-tabs" style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", display: "flex", gap: "20px" }}>
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
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "pedidos" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "pedidos" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          📦 Pedidos
        </button>
        <button
          onClick={() => setSeccionActiva("estadoCuenta")}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "estadoCuenta" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "estadoCuenta" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          💳 Estado de Cuenta
        </button>
        <button
          onClick={() => setSeccionActiva("solicitudes")}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "solicitudes" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "solicitudes" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          🚫 Solicitudes{solicitudesPendientes.length > 0 ? ` (${solicitudesPendientes.length})` : ""}
        </button>
        <button
          onClick={() => setSeccionActiva("altasProvisorias")}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "altasProvisorias" ? "2px solid #d97706" : "2px solid transparent", color: seccionActiva === "altasProvisorias" ? "#b45309" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          🟡 Altas provisorias{altasProvisorias.length > 0 ? ` (${altasProvisorias.length})` : ""}
        </button>
      </div>

      <main className="rc-supervisor-main" style={{ padding: "16px 24px", maxWidth: "1500px", margin: "0 auto" }}>
        {modalImportacionCuenta && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}>
            <div style={{ width: "min(760px, 96vw)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>📥 Importar Estado de Cuenta</h3>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Excel con dos columnas: <strong>codigo_cliente</strong> y <strong>saldo</strong>.</div>
                </div>
                <button type="button" onClick={() => !importandoCuenta && setModalImportacionCuenta(false)} style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "7px 10px", cursor: "pointer", fontWeight: "800" }}>✕</button>
              </div>

              <div style={{ marginTop: "16px", display: "grid", gap: "9px" }}>
                <label style={{ border: modoImportacionCuenta === "parcial" ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "10px", padding: "11px", cursor: "pointer", background: modoImportacionCuenta === "parcial" ? "#eff6ff" : "#fff" }}>
                  <input type="radio" name="modoCuenta" checked={modoImportacionCuenta === "parcial"} onChange={() => setModoImportacionCuenta("parcial")} /> <strong>Actualizar solamente los clientes incluidos</strong>
                  <div style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 22px" }}>Los demás clientes conservan su saldo actual.</div>
                </label>
                <label style={{ border: modoImportacionCuenta === "completo" ? "2px solid #d97706" : "1px solid #cbd5e1", borderRadius: "10px", padding: "11px", cursor: "pointer", background: modoImportacionCuenta === "completo" ? "#fffbeb" : "#fff" }}>
                  <input type="radio" name="modoCuenta" checked={modoImportacionCuenta === "completo"} onChange={() => setModoImportacionCuenta("completo")} /> <strong>Reemplazar estado de cuenta completo</strong>
                  <div style={{ fontSize: "11px", color: "#92400e", margin: "4px 0 0 22px" }}>⚠️ Los clientes que no aparezcan en el archivo pasarán a saldo $0.</div>
                </label>
              </div>

              <input ref={inputArchivoCuentaRef} type="file" accept=".xlsx,.xls,.csv" onChange={leerArchivoEstadoCuenta} style={{ display: "none" }} />
              <button type="button" onClick={() => inputArchivoCuentaRef.current?.click()} style={{ marginTop: "14px", width: "100%", padding: "10px", border: "1px dashed #2563eb", borderRadius: "9px", background: "#eff6ff", color: "#1d4ed8", fontWeight: "800", cursor: "pointer" }}>📄 ELEGIR ARCHIVO EXCEL</button>
              {archivoCuentaNombre && <div style={{ fontSize: "11px", color: "#475569", marginTop: "6px" }}>Archivo: <strong>{archivoCuentaNombre}</strong></div>}

              {vistaPreviaCuenta && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ fontWeight: "800", fontSize: "13px", marginBottom: "8px" }}>Vista previa — todavía no se modificó Supabase</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: "8px" }}>
                    <div style={{ background: "#f8fafc", padding: "9px", borderRadius: "8px" }}><small>Filas leídas</small><div style={{ fontWeight: "900" }}>{vistaPreviaCuenta.totalFilas}</div></div>
                    <div style={{ background: "#f0fdf4", padding: "9px", borderRadius: "8px" }}><small>Encontrados</small><div style={{ fontWeight: "900", color: "#15803d" }}>{vistaPreviaCuenta.encontrados.length}</div></div>
                    <div style={{ background: "#fef2f2", padding: "9px", borderRadius: "8px" }}><small>Con saldo</small><div style={{ fontWeight: "900", color: "#dc2626" }}>{vistaPreviaCuenta.conSaldo}</div></div>
                    <div style={{ background: "#fff7ed", padding: "9px", borderRadius: "8px" }}><small>No encontrados</small><div style={{ fontWeight: "900", color: "#c2410c" }}>{vistaPreviaCuenta.noEncontrados.length}</div></div>
                  </div>
                  <div style={{ marginTop: "9px", fontSize: "13px", fontWeight: "900" }}>Saldo de clientes encontrados: $ {vistaPreviaCuenta.totalSaldo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>

                  {(vistaPreviaCuenta.noEncontrados.length > 0 || vistaPreviaCuenta.duplicados.length > 0 || vistaPreviaCuenta.invalidos.length > 0) && (
                    <div style={{ marginTop: "10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "9px", fontSize: "11px", maxHeight: "150px", overflowY: "auto" }}>
                      {vistaPreviaCuenta.noEncontrados.map((x, i) => <div key={`n-${i}`}>⚠️ {x.codigo} — cliente no encontrado</div>)}
                      {vistaPreviaCuenta.duplicados.map((x, i) => <div key={`d-${i}`}>❌ Fila {x.fila}: {x.codigo} está repetido en la planilla</div>)}
                      {vistaPreviaCuenta.invalidos.map((x, i) => <div key={`i-${i}`}>❌ Fila {x.fila}: {x.codigo ? `${x.codigo} — ` : ""}{x.motivo}</div>)}
                    </div>
                  )}

                  <button type="button" disabled={importandoCuenta || vistaPreviaCuenta.duplicados.length > 0 || vistaPreviaCuenta.invalidos.length > 0 || vistaPreviaCuenta.encontrados.length === 0} onClick={confirmarImportacionEstadoCuenta} style={{ marginTop: "14px", width: "100%", padding: "11px", border: "none", borderRadius: "9px", background: importandoCuenta ? "#94a3b8" : "#16a34a", color: "#fff", fontWeight: "900", cursor: importandoCuenta ? "wait" : "pointer" }}>{importandoCuenta ? "GUARDANDO..." : "✅ CONFIRMAR IMPORTACIÓN"}</button>
                </div>
              )}
            </div>
          </div>
        )}
        {seccionActiva === "planificador" ? (
          <DisenadorRutas
            perfilSupervisor={perfilSupervisor}
            perfiles={perfiles}
          />
         ) : seccionActiva === "altasProvisorias" ? (
          <div>
            <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "#0f172a" }}>🟡 Altas provisorias</h2>
                <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>Comercios capturados por preventistas. Pueden vender inmediatamente y el supervisor confirma el alta después.</p>
              </div>
              {altasProvisorias.length > 0 && (
                <button
                  type="button"
                  onClick={aprobarTodasAltasProvisorias}
                  style={{ padding: "9px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "900", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  ✅ APROBAR TODAS ({altasProvisorias.length})
                </button>
              )}
            </div>

            {altasProvisorias.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "24px", color: "#64748b", fontSize: "13px" }}>
                ✅ No hay altas provisorias pendientes.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {altasProvisorias.map((comercio) => {
                  const pedidosComercio = (pedidosSupervisor || []).filter(p => String(p.comercio_id) === String(comercio.id));
                  return (
                    <div key={comercio.id} className="rc-alta-card" style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "12px", padding: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div className="rc-alta-info" style={{ flex: "1 1 320px" }}>
                          <div style={{ fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>🏪 {comercio.nombre || "Comercio sin nombre"}</div>
                          <div style={{ fontSize: "12px", color: "#475569", marginTop: "5px" }}>👤 Preventista: <strong>{comercio.preventista || "Sin informar"}</strong></div>
                          {comercio.direccion && <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px" }}>📍 {comercio.direccion}</div>}
                          {comercio.contacto && <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px" }}>🙋 Contacto: {comercio.contacto}</div>}
                          {(comercio.telefono || comercio.whatsapp) && <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px" }}>📞 {comercio.whatsapp || comercio.telefono}</div>}
                          <div style={{ fontSize: "11px", color: "#92400e", marginTop: "7px", fontWeight: "800" }}>🟡 Alta provisoria · ID {comercio.id}</div>
                          <div style={{ fontSize: "11px", color: pedidosComercio.length > 0 ? "#166534" : "#64748b", marginTop: "3px", fontWeight: pedidosComercio.length > 0 ? "800" : "600" }}>
                            {pedidosComercio.length > 0 ? `💰 Tiene ${pedidosComercio.length} pedido${pedidosComercio.length === 1 ? "" : "s"} registrado${pedidosComercio.length === 1 ? "" : "s"}` : "📦 Todavía no tiene pedidos registrados"}
                          </div>
                        </div>
                        <div className="rc-alta-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button type="button" onClick={() => { setSeccionActiva("monitoreo"); setComercioDetalleModal(comercio); setEditPrevFicha(comercio.preventista || ""); setEditDiaFicha(comercio.dia_visita ? String(comercio.dia_visita).trim().toUpperCase() : ""); }} style={{ padding: "8px 12px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "7px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>👁️ VER FICHA</button>
                          <button type="button" onClick={() => aprobarAltaProvisoria(comercio)} style={{ padding: "8px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "900", cursor: "pointer" }}>✅ APROBAR ALTA</button>
                          <button type="button" onClick={() => rechazarAltaProvisoria(comercio)} style={{ padding: "8px 12px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "900", cursor: "pointer" }}>❌ RECHAZAR</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
         ) : seccionActiva === "solicitudes" ? (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "#0f172a" }}>🚫 Solicitudes de NO VISITAR MÁS</h2>
              <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>El supervisor decide si un comercio deja de aparecer en futuras rutas.</p>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "#9a3412", marginBottom: "10px" }}>⏳ Pendientes ({solicitudesPendientes.length})</div>
              {solicitudesPendientes.length === 0 ? (
                <div style={{ padding: "20px 8px", color: "#64748b", fontSize: "12px" }}>No hay solicitudes pendientes.</div>
              ) : solicitudesPendientes.map((solicitud) => (
                <div key={solicitud.id} style={{ border: "1px solid #fed7aa", background: "#fff7ed", borderRadius: "9px", padding: "12px", marginTop: "8px" }}>
                  <div style={{ fontWeight: "900", fontSize: "13px" }}>🏪 {solicitud.comercio_nombre}</div>
                  <div style={{ fontSize: "12px", marginTop: "4px", color: "#475569" }}>👤 Preventista: <strong>{solicitud.preventista || "Sin informar"}</strong></div>
                  <div style={{ fontSize: "12px", marginTop: "4px", color: "#475569" }}>💬 Motivo: <strong>{solicitud.motivo || "Sin motivo"}</strong></div>
                  <div style={{ fontSize: "11px", marginTop: "4px", color: "#94a3b8" }}>{solicitud.created_at ? new Date(solicitud.created_at).toLocaleString("es-AR") : ""}</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                    <button type="button" onClick={() => aprobarNoVisitar(solicitud)} style={{ padding: "7px 12px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>✅ APROBAR</button>
                    <button type="button" onClick={() => rechazarNoVisitar(solicitud)} style={{ padding: "7px 12px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>❌ RECHAZAR</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "#334155", marginBottom: "10px" }}>📚 Historial ({solicitudesHistorial.length})</div>
              {solicitudesHistorial.length === 0 ? (
                <div style={{ padding: "20px 8px", color: "#64748b", fontSize: "12px" }}>Todavía no hay solicitudes resueltas.</div>
              ) : solicitudesHistorial.map((solicitud) => (
                <div key={solicitud.id} className="rc-solicitud-historial" style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) minmax(130px,1fr) minmax(180px,2fr) 110px", gap: "8px", alignItems: "center", padding: "9px 4px", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
                  <div><strong>{solicitud.comercio_nombre}</strong></div>
                  <div style={{ color: "#475569" }}>{solicitud.preventista || "Sin informar"}</div>
                  <div style={{ color: "#64748b" }}>{solicitud.motivo || "Sin motivo"}</div>
                  <div style={{ fontWeight: "900", color: solicitud.estado === "aprobada" ? "#16a34a" : "#dc2626" }}>{solicitud.estado === "aprobada" ? "✅ APROBADA" : "❌ RECHAZADA"}</div>
                </div>
              ))}
            </div>
          </div>
        ) : seccionActiva === "estadoCuenta" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "#0f172a" }}>💳 Estado de Cuenta</h2>
                <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>Saldos pendientes de los clientes de tu empresa</p>
              </div>
              <button
                type="button"
                onClick={() => { setModalImportacionCuenta(true); setVistaPreviaCuenta(null); setArchivoCuentaNombre(""); setModoImportacionCuenta("parcial"); }}
                style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 14px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}
              >
                📥 IMPORTAR ESTADO DE CUENTA
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", marginBottom: "14px" }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Clientes</div>
                <div style={{ fontSize: "21px", fontWeight: "800", marginTop: "2px" }}>{comercios.length}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#991b1b", textTransform: "uppercase" }}>Con saldo pendiente</div>
                <div style={{ fontSize: "21px", fontWeight: "800", color: "#dc2626", marginTop: "2px" }}>{clientesConSaldo}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Saldo total pendiente</div>
                <div style={{ fontSize: "21px", fontWeight: "800", color: "#dc2626", marginTop: "2px" }}>$ {saldoTotalPendiente.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", marginBottom: "14px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  ["todos", "Todos"],
                  ["con_saldo", "Con saldo pendiente"],
                  ["sin_saldo", "Sin saldo"]
                ].map(([valor, texto]) => (
                  <button key={valor} type="button" onClick={() => setFiltroEstadoCuenta(valor)} style={{ padding: "7px 10px", borderRadius: "7px", border: filtroEstadoCuenta === valor ? "1px solid #2563eb" : "1px solid #cbd5e1", background: filtroEstadoCuenta === valor ? "#eff6ff" : "#fff", color: filtroEstadoCuenta === valor ? "#1d4ed8" : "#475569", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}>
                    {texto}
                  </button>
                ))}
              </div>

              <select value={filtroPreventistaCuenta} onChange={(e) => setFiltroPreventistaCuenta(e.target.value)} style={{ padding: "7px 10px", borderRadius: "7px", border: "1px solid #cbd5e1", background: "#fff", fontSize: "11px", fontWeight: "700", color: "#334155" }}>
                <option value="TODOS">👤 Todos los preventistas</option>
                {listaPreventistas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              <input type="text" value={busquedaCuenta} onChange={(e) => setBusquedaCuenta(e.target.value)} placeholder="🔎 Buscar cliente o código..." style={{ flex: "1 1 220px", minWidth: "200px", padding: "7px 10px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none" }} />
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
              <div className="rc-cuenta-header" style={{ display: "grid", gridTemplateColumns: "minmax(180px, 2fr) 100px minmax(140px, 1fr) 140px 140px", gap: "8px", padding: "9px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
                <div>Cliente</div><div>Código</div><div>Preventista</div><div style={{ textAlign: "right" }}>Saldo</div><div>Actualizado</div>
              </div>
              {comerciosEstadoCuenta.length === 0 ? (
                <div style={{ padding: "35px 15px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>No hay clientes que coincidan con los filtros.</div>
              ) : comerciosEstadoCuenta.map((c) => {
                const deuda = Number(c.deuda || 0);
                const conSaldo = deuda > 0;
                return (
                  <div key={c.id} className="rc-cuenta-row" style={{ display: "grid", gridTemplateColumns: "minmax(180px, 2fr) 100px minmax(140px, 1fr) 140px 140px", gap: "8px", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: "800", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre || `Comercio #${c.id}`}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.direccion || "Sin dirección"}</div>
                    </div>
                    <div style={{ fontWeight: "700", color: "#475569" }}>{c.codigo_cliente || c.codigo || c.id}</div>
                    <div style={{ color: "#475569" }}>{c.preventista || "Sin asignar"}</div>
                    <div style={{ textAlign: "right", fontWeight: "900", color: conSaldo ? "#dc2626" : "#2563eb" }}>{conSaldo ? "🔴" : "🔵"} $ {deuda.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ color: "#64748b", fontSize: "11px" }}>{c.deuda_actualizada_at ? new Date(c.deuda_actualizada_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Sin actualizar"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
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
        {seccionActiva === "planificador" && (
        <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "8px 14px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>🗓️ Día:</span>
            {["TODOS", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map(d => {
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
      )}

        {/* CUERPO PRINCIPAL: SECUENCIADOR COMPACTO A LA IZQUIERDA + MAPA A LA DERECHA */}
        <div className="rc-supervisor-two-columns" style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "16px", alignItems: "start" }}>
          
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

            <div className="rc-supervisor-map" style={{ height: "480px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
              <MapContainer center={centroMapa} zoom={14} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AutoCentradoMapa puntos={coordenadasValidas} puntoActivo={comercioFoco ? [comercioFoco.ubicacion_exacta_latitud || comercioFoco.latitud, comercioFoco.ubicacion_exacta_longitud || comercioFoco.longitud] : posicionPreventistaSeleccionado} />

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
                  const estadoPin = c.no_visitar === true
                    ? "no_visitar"
                    : i < rutaRecorrida.length
                      ? "visitado"
                      : i === rutaRecorrida.length
                        ? "activo"
                        : "pendiente";
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
                {comercioDetalleModal.estado_alta === "provisorio" && (
                  <div style={{ background: "#fffbeb", border: "2px solid #facc15", borderRadius: "8px", padding: "10px 12px", color: "#854d0e" }}>
                    <div style={{ fontSize: "12px", fontWeight: "900" }}>🟡 ALTA PROVISORIA</div>
                    <div style={{ fontSize: "11px", fontWeight: "700", marginTop: "3px" }}>Pendiente de validación del supervisor.</div>
                  </div>
                )}
                {comercioDetalleModal.no_visitar === true && (
  <div
    style={{
      background: "#f3f4f6",
      border: "2px solid #111827",
      borderRadius: "8px",
      padding: "10px",
    }}
  >
    <div
      style={{
        fontSize: "11px",
        fontWeight: "800",
        color: "#111827",
        marginBottom: "8px",
      }}
    >
      ⚫ ESTE COMERCIO ESTÁ MARCADO COMO NO VISITAR MÁS
    </div>

    <button
      type="button"
      onClick={() => reactivarComercio(comercioDetalleModal)}
      style={{
        width: "100%",
        padding: "10px",
        backgroundColor: "#16a34a",
        color: "#ffffff",
        border: "none",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "800",
        cursor: "pointer",
      }}
    >
      ♻️ REACTIVAR COMERCIO
    </button>
  </div>
)}
                {/* DATOS FISCALES */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b", marginBottom: "6px" }}>🏢 DATOS FISCALES</div>
                  <div className="rc-supervisor-modal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
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

                {/* ÚLTIMA VISITA / VISITA DE HOY */}
                {actividadComercioDetalle.visita && (() => {
                  const visita = actividadComercioDetalle.visita;
                  const pedido = actividadComercioDetalle.pedido;
                  const estilo = estiloResultadoVisita(visita.resultado);
                  const fechaVisita = visita.fecha || visita.created_at;
                  const esVenta = String(visita.resultado || "").toLowerCase().includes("venta") || String(visita.resultado || "").toLowerCase().includes("pedido");
                  const omiteFecha = comercioDetalleModal.omitir_visita_fecha;

                  return (
                    <div style={{ background: estilo.fondo, border: `2px solid ${estilo.borde}`, borderRadius: "8px", padding: "10px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "900", color: estilo.color, marginBottom: "3px" }}>
                        🕐 {actividadComercioDetalle.esHoy ? "VISITA DE HOY" : "ÚLTIMA VISITA"}
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: "900", color: "#15803d", marginBottom: "7px" }}>
                        ✅ VISITA REALIZADA CON ÉXITO
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "15px", fontWeight: "900", color: estilo.color }}>
                            {estilo.icono} {String(visita.resultado || "Visita registrada").toUpperCase()}
                          </div>
                          <div style={{ marginTop: "4px", fontSize: "11px", color: "#475569" }}>
                            👤 {visita.preventista || comercioDetalleModal.preventista || "Sin informar"}
                            {fechaVisita ? ` · 🕒 ${new Date(fechaVisita).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}
                          </div>
                          {visita.observacion &&
                            !(omiteFecha || comercioDetalleModal.revisita_fecha) && (
                              <div style={{ marginTop: "4px", fontSize: "11px", color: "#111827", fontWeight: "700" }}>
                                📝 {visita.observacion}
                              </div>
                            )}
                        </div>
                        {esVenta && pedido && (
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "14px", fontWeight: "900", color: "#15803d", marginBottom: "5px" }}>
                              $ {Number(pedido.total || pedido.total_pedido || 0).toLocaleString("es-AR")}
                            </div>
                            <button
                              type="button"
                              onClick={() => { window.location.href = `/pedidos?pedido=${encodeURIComponent(pedido.id)}`; }}
                              style={{ border: "none", borderRadius: "6px", background: "#2563eb", color: "#fff", padding: "7px 10px", fontSize: "11px", fontWeight: "900", cursor: "pointer" }}
                            >
                              🧾 VER PEDIDO #{pedido.numero_pedido != null
                                ? String(pedido.numero_pedido).padStart(6, "0")
                                : "SIN NÚMERO"}
                            </button>
                          </div>
                        )}
                      </div>
                      {(omiteFecha || comercioDetalleModal.revisita_fecha) && (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "11px",
                            borderRadius: "8px",
                            background: "#fff7ed",
                            border: "2px solid #f59e0b",
                          }}
                        >
                          <div style={{ fontSize: "12px", fontWeight: "900", color: "#9a3412", marginBottom: "8px" }}>
                            ⚠️ CAMBIO EXCEPCIONAL DE VISITA
                          </div>

                          {omiteFecha && (
                            <div style={{ background: "#ffedd5", border: "1px solid #fdba74", borderRadius: "6px", padding: "7px 8px", marginBottom: "7px" }}>
                              <div style={{ fontSize: "10px", fontWeight: "900", color: "#9a3412" }}>
                                ⏭️ VISITA HABITUAL SALTADA
                              </div>
                              <div style={{ fontSize: "13px", fontWeight: "900", color: "#7c2d12", marginTop: "2px" }}>
                                {new Date(`${omiteFecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                              </div>
                            </div>
                          )}

                          {comercioDetalleModal.revisita_fecha && (
                            <div style={{ background: "#dcfce7", border: "2px solid #22c55e", borderRadius: "6px", padding: "8px" }}>
                              <div style={{ fontSize: "10px", fontWeight: "900", color: "#166534" }}>
                                📅 RE-VISITAR
                              </div>
                              <div style={{ fontSize: "15px", fontWeight: "900", color: "#14532d", marginTop: "2px", textTransform: "uppercase" }}>
                                {new Date(`${comercioDetalleModal.revisita_fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                              </div>
                            </div>
                          )}

                          {comercioDetalleModal.revisita_motivo && (
                            <div style={{ marginTop: "7px", fontSize: "11px", color: "#7c2d12", lineHeight: "1.4" }}>
                              📝 <strong>Motivo:</strong> {comercioDetalleModal.revisita_motivo}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                <div className="rc-supervisor-modal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
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
                      {["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"].map(d => (
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
              {seccionActiva === "pedidos" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>📦 Monitor de Comandas y Pedidos en Vivo</h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>Control de ventas levantadas en la calle en tiempo real</p>
              </div>
              <button
                onClick={() => cargarPedidosSupabase()}
                style={{ backgroundColor: "#2563eb", color: "#ffffff", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span>🔄</span> Actualizar Comandas
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              <div style={{ backgroundColor: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>Total Facturado Real</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#16a34a", marginTop: "4px" }}>
                  $ {pedidosReal.reduce((acc, p) => acc + Number(p.total || 0), 0).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>Comandas Reales Emitidas</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb", marginTop: "4px" }}>
                  {pedidosReal.length} pedidos
                </div>
              </div>
            </div>

            {cargandoPedidosReal ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>⏳ Consultando pedidos en Supabase...</div>
            ) : pedidosReal.length === 0 ? (
              <div style={{ backgroundColor: "#ffffff", padding: "40px", textAlign: "center", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>📭</div>
                <div style={{ fontWeight: "bold", color: "#334155", fontSize: "15px" }}>No hay pedidos registrados todavía</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Las comandas que envíen los preventistas desde el celular aparecerán acá al instante.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {pedidosReal.map((ped, idx) => (
                  <div
                    key={ped.id || idx}
                    style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "16px" }}>
                        📦
                      </div>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                          {ped.comercio_nombre || ("Comercio #" + (ped.comercio_id || "S/N"))}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                          👤 Preventista: <strong style={{ color: "#334155" }}>{ped.preventista || "Sin asignar"}</strong> · 🕒 {ped.fecha ? new Date(ped.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : (ped.created_at ? new Date(ped.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-")}
                        </div>
                        {ped.notas && (
                          <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px", backgroundColor: "#f8fafc", padding: "3px 8px", borderRadius: "4px", display: "inline-block" }}>
                            💬 {ped.notas}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "17px", fontWeight: "800", color: "#16a34a" }}>
                        $ {Number(ped.total || 0).toLocaleString()}
                      </div>
                      {Number(ped.decuento_porcentaje || 0) > 0 && (
                        <div style={{ fontSize: "11px", color: "#ea580c" }}>
                          Desc: {ped.decuento_porcentaje}% (Subt: ${Number(ped.subtotal || 0).toLocaleString()})
                        </div>
                      )}
                      <div style={{ marginTop: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold", padding: "2px 8px", borderRadius: "10px", backgroundColor: ped.estado === "Entregado" ? "#dcfce7" : "#fef9c3", color: ped.estado === "Entregado" ? "#15803d" : "#a16207" }}>
                          ● {ped.estado || "Pendiente"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}

