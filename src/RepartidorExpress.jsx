import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const fondo = "#0f172a";
const tarjeta = "#1e293b";
const borde = "#334155";
const textoSuave = "#cbd5e1";
const btn = { border: 0, borderRadius: 12, padding: "13px 16px", fontSize: 16, fontWeight: 700, cursor: "pointer", color: "white" };
const dinero = (valor) => Number(valor || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const fecha = (valor) => valor ? new Date(valor).toLocaleString("es-AR") : "—";

const iconoDestino = L.divIcon({ className: "", html: '<div style="background:#2563eb;border:3px solid white;border-radius:50%;width:23px;height:23px;box-shadow:0 2px 6px #0008"></div>', iconSize: [29, 29], iconAnchor: [14, 14] });
const iconoGps = L.divIcon({ className: "", html: '<div style="background:#16a34a;border:3px solid white;border-radius:50%;width:19px;height:19px;box-shadow:0 2px 6px #0008"></div>', iconSize: [25, 25], iconAnchor: [12, 12] });
const distanciaMetros = (a, b) => {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
};
const GPS_RECIENTE_MS = 30000;
const GPS_PRECISION_BUENA_M = 100;
const mostrarDistancia = m => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2).replace(".", ",")} km`;
function AjustarMapa({ puntos }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length) map.fitBounds(puntos.map(p => [p.lat, p.lon]), { padding: [30, 30], maxZoom: 15 });
  }, [map, JSON.stringify(puntos)]);
  return null;
}

// Pantalla del motociclista Express. Registra salidas, entregas y jornadas; aún no registra cobros.
// Solo muestra viajes propios, según las políticas de seguridad de Supabase.
export default function RepartidorExpress() {
  const [sesion, setSesion] = useState(null);
  const [viajes, setViajes] = useState([]);
  const [jornada, setJornada] = useState("trabajando");
  const [cambiandoJornada, setCambiandoJornada] = useState(false);
  const [relaciones, setRelaciones] = useState([]);
  const [pedidos, setPedidos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("todos");
  const [iniciandoViaje, setIniciandoViaje] = useState(null);
  const [aviso, setAviso] = useState("");
  const [registrandoPedido, setRegistrandoPedido] = useState(null);
  const [gps, setGps] = useState(null);
  const [ahoraGps, setAhoraGps] = useState(Date.now());
  const [errorGps, setErrorGps] = useState("");
  const [coordenadas, setCoordenadas] = useState({});
  const [errorMapa, setErrorMapa] = useState("");
  const [verMapa, setVerMapa] = useState(true);
  const [saldoEfectivo, setSaldoEfectivo] = useState(null);
  const [errorSaldo, setErrorSaldo] = useState("");
  const [cargandoSaldo, setCargandoSaldo] = useState(false);

  const cargarSaldo = useCallback(async () => {
    setCargandoSaldo(true);
    try {
      const { data, error: err } = await supabase.rpc("express_mi_saldo_repartidor");
      if (err) throw err;
      setSaldoEfectivo(data?.[0] || null);
      setErrorSaldo("");
    } catch (e) {
      setSaldoEfectivo(null);
      setErrorSaldo(e.message || "No se pudo consultar el saldo.");
    } finally {
      setCargandoSaldo(false);
    }
  }, []);



  const cargarJornada = useCallback(async (identidad) => {
    const { data, error } = await supabase.from("express_jornadas")
      .select("estado").eq("empresa_id", identidad.empresaId)
      .eq("repartidor_id", identidad.usuarioId).maybeSingle();
    if (error) throw new Error(`No se pudo consultar tu jornada: ${error.message}`);
    setJornada(data?.estado || "trabajando");
  }, []);

  const cargar = useCallback(async (identidad) => {
    const { data: viajesData, error: errorViajes } = await supabase.from("express_viajes")
      .select("id, empresa_id, repartidor_id, estado, creado_en, salida_en")
      .eq("empresa_id", identidad.empresaId)
      .eq("repartidor_id", identidad.usuarioId)
      .in("estado", ["preparando", "en_camino", "regresando", "regresado", "cerrado"])
      .order("creado_en", { ascending: false })
      .limit(50);
    if (errorViajes) throw new Error(`No se pudieron consultar tus viajes: ${errorViajes.message}`);
    const actuales = viajesData || [];
    const idsViajes = actuales.map(v => v.id);
    let vinculos = [];
    let mapaPedidos = {};
    if (idsViajes.length) {
      const { data, error: errorRelaciones } = await supabase.from("express_viajes_pedidos")
        .select("viaje_id, pedido_id, orden, resultado, motivo_no_entrega")
        .eq("empresa_id", identidad.empresaId)
        .in("viaje_id", idsViajes);
      if (errorRelaciones) throw new Error(`No se pudieron consultar las entregas asignadas: ${errorRelaciones.message}`);
      vinculos = data || [];
      const idsPedidos = [...new Set(vinculos.map(v => v.pedido_id))];
      if (idsPedidos.length) {
        const { data: detalles, error: errorPedidos } = await supabase.from("express_pedidos")
          .select("id, numero_express, cliente_nombre, direccion, telefono, detalle, notas, importe_total, modalidad_cobro, estado, destino_latitud, destino_longitud")
          .eq("empresa_id", identidad.empresaId)
          .in("id", idsPedidos);
        if (errorPedidos) throw new Error(`No se pudieron consultar los pedidos: ${errorPedidos.message}`);
        mapaPedidos = Object.fromEntries((detalles || []).map(p => [p.id, p]));
      }
    }
    setViajes(actuales);
    setRelaciones(vinculos);
    setPedidos(mapaPedidos);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Iniciá sesión para ver tus repartos.");
        const { data: perfil, error: errorPerfil } = await supabase.from("perfiles")
          .select("id, empresa_id, nombre, activo").eq("id", user.id).single();
        if (errorPerfil || !perfil?.empresa_id || perfil.activo !== true) throw new Error("Tu usuario no tiene un perfil activo.");
        const { data: roles, error: errorRoles } = await supabase.from("perfiles_roles")
          .select("rol").eq("perfil_id", user.id).eq("empresa_id", perfil.empresa_id)
          .eq("rol", "express_repartidor").eq("activo", true);
        if (errorRoles) throw errorRoles;
        if (!roles?.length) throw new Error("Tu usuario no tiene el rol de repartidor Express.");
        const identidad = { usuarioId: user.id, empresaId: perfil.empresa_id, nombre: perfil.nombre || "Repartidor" };
        if (!vivo) return;
        setSesion(identidad);
        await Promise.all([cargar(identidad), cargarJornada(identidad), cargarSaldo()]);
      } catch (e) {
        if (vivo) setError(e.message || "No se pudieron cargar los repartos.");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [cargar, cargarJornada, cargarSaldo]);

  // Refrescar asignaciones y saldo sin consultar periódicamente la jornada.
  useEffect(() => {
    if (!sesion) return;
    let activo = true;
    let ocupado = false;
    const timer = setInterval(async () => {
      if (!activo || ocupado || document.visibilityState === "hidden") return;
      ocupado = true;
      try {
        await cargar(sesion);
      } catch (e) {
        console.warn("Express: no se pudieron actualizar las asignaciones", e);
      } finally { ocupado = false; }
    }, 15000);
    return () => { activo = false; clearInterval(timer); };
  }, [sesion?.usuarioId, sesion?.empresaId, cargar, cargarJornada, cargarSaldo]);

  const actualizar = async () => {
    if (!sesion || actualizando) return;
    setActualizando(true);
    setError("");
    try { await Promise.all([cargar(sesion), cargarJornada(sesion), cargarSaldo()]); }
    catch (e) { setError(e.message || "No se pudo actualizar."); }
    finally { setActualizando(false); }
  };

  const cambiarJornada = async (accion) => {
    if (!sesion || cambiandoJornada) return;
    if (!window.confirm(accion === "finalizar"
      ? "¿Finalizar tu día laboral? No podrán asignarte nuevos pedidos hasta que inicies otra jornada."
      : "¿Iniciar tu jornada laboral y quedar disponible para nuevas asignaciones?")) return;
    setCambiandoJornada(true); setError(""); setAviso("");
    try {
      const { error: err } = await supabase.rpc("express_cambiar_jornada", { p_accion: accion });
      if (err) throw err;
      await Promise.all([cargarJornada(sesion), cargar(sesion)]);
      setAviso(accion === "finalizar" ? "🌙 Jornada finalizada. No recibirás nuevas asignaciones." : "🟢 Jornada iniciada. Ya estás disponible para nuevos pedidos.");
    } catch (e) {
      setError(`No se pudo cambiar la jornada: ${e.message}`);
    } finally { setCambiandoJornada(false); }
  };

  const comenzarReparto = async (viaje, cantidad) => {
    if (!sesion || iniciandoViaje) return;
    if (jornada === "finalizada") { setError("Primero tenés que iniciar tu jornada laboral."); return; }
    if (!cantidad) {
      setError("Este viaje no tiene pedidos asignados. Consultá al supervisor.");
      return;
    }
    if (!window.confirm(`¿Comenzar el reparto con ${cantidad} pedido(s)?\n\nSe notificará la salida al supervisor.`)) return;
    setIniciandoViaje(viaje.id);
    setError("");
    setAviso("");
    try {
      // Misma operación de salida que utiliza el panel del supervisor.
      // No simulamos el cambio de estado: se confirma únicamente al persistir en Supabase.
      const { error: errorSalida } = await supabase.rpc("express_gestionar_viaje", {
        p_accion: "salir",
        p_repartidor: null,
        p_pedido: null,
        p_viaje: viaje.id,
      });
      if (errorSalida) throw errorSalida;
      await cargar(sesion);
      setVista("en_camino");
      setAviso("🛵 ¡Reparto comenzado! La salida quedó registrada en Supabase.");
    } catch (e) {
      setError(`No se pudo comenzar el reparto: ${e.message || "Error desconocido"}. El viaje no se marcó como iniciado en esta pantalla.`);
    } finally {
      setIniciandoViaje(null);
    }
  };

  // Una lectura reciente para la entrega: la ubicación del mapa nunca sustituye esta verificación.
  const medirEntrega = (pedido) => new Promise(resolve => {
    const destino = puntoPedido(pedido);
    if (!destino || !Number.isFinite(destino.lat) || !Number.isFinite(destino.lon)) {
      resolve({ estado: "sin_destino", distancia: null, precision: null, lat: null, lon: null });
      return;
    }
    if (!navigator.geolocation) {
      resolve({ estado: "sin_gps", distancia: null, precision: null, lat: null, lon: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      const precision = pos.coords.accuracy;
      // Algunos navegadores pueden devolver una lectura en caché aun solicitando maximumAge: 0.
      if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
          !Number.isFinite(pos.timestamp) || Date.now() - pos.timestamp > GPS_RECIENTE_MS ||
          pos.timestamp > Date.now() + 5000) {
        resolve({ estado: "sin_gps", distancia: null, precision: null, lat: null, lon: null });
        return;
      }
      resolve({ estado: "medido", distancia: Math.round(distanciaMetros({ lat, lon }, destino)),
        precision: Number.isFinite(precision) ? Math.round(precision) : null, lat, lon });
    }, () => resolve({ estado: "sin_gps", distancia: null, precision: null, lat: null, lon: null }),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
  });

  const registrarEntrega = async (viaje, pedido, resultado) => {
    if (!sesion || registrandoPedido || viaje.estado !== "en_camino") return;
    const etiqueta = resultado === "entregado" ? "ENTREGADO" : "NO ENTREGADO";
    let motivo = null;
    if (resultado === "no_entregado") {
      const escrito = window.prompt(`¿Por qué no se entregó el pedido EX-${String(pedido.numero_express).padStart(6, "0")}?\nEj.: cliente ausente, comercio cerrado, rechazo.`);
      if (escrito === null) return;
      motivo = escrito.trim();
      if (!motivo) { setError("Es obligatorio indicar el motivo de la no entrega."); return; }
    }
    setRegistrandoPedido(pedido.id);
    setError(""); setAviso("");
    try {
      // También auditamos NO ENTREGADO, para que no pueda eludirse la verificación.
      const medicion = await medirEntrega(pedido);
      const descripcion = medicion.estado === "medido"
        ? `Distancia al destino: ${mostrarDistancia(medicion.distancia)} (precisión GPS aproximada: ${medicion.precision ?? "desconocida"} m).${medicion.precision == null || medicion.precision > GPS_PRECISION_BUENA_M ? "\n⚠️ La precisión es baja; la distancia es orientativa." : ""}${medicion.distancia > 100 ? "\n⚠️ La ubicación medida está a más de 100 metros del destino." : ""}`
        : medicion.estado === "sin_destino" ? "⚠️ No hay coordenadas válidas del destino. La distancia no puede verificarse."
        : "⚠️ No se pudo obtener una ubicación GPS nueva. La distancia no puede verificarse.";
      const detalleRegistro = medicion.estado === "medido"
        ? "Se intentará registrar la distancia y la precisión obtenidas."
        : "Se intentará registrar la entrega como ubicación no verificada, sin distancia GPS.";
      if (!window.confirm(`${descripcion}\n\n¿Confirmar ${etiqueta} para EX-${String(pedido.numero_express).padStart(6, "0")}?\n${detalleRegistro}`)) return;
      const { error: err } = await supabase.rpc("express_registrar_entrega", {
        p_viaje: viaje.id, p_pedido: pedido.id, p_resultado: resultado, p_motivo: motivo,
      });
      if (err) throw err;
      // Auditoría persistente. Si falla, avisamos claramente sin duplicar la entrega.
      const { error: auditoriaError } = await supabase.from("express_entregas_gps").insert({
        empresa_id: sesion.empresaId, viaje_id: viaje.id, pedido_id: pedido.id,
        repartidor_id: sesion.usuarioId, resultado, estado_gps: medicion.estado,
        distancia_m: medicion.distancia, precision_m: medicion.precision,
        latitud: medicion.lat, longitud: medicion.lon,
      });
      await cargar(sesion);
      if (auditoriaError) {
        setError(`⚠️ La entrega se registró, pero NO se guardó la auditoría GPS: ${auditoriaError.message}. No vuelvas a marcar la entrega.`);
      } else {
        setAviso(`✓ Pedido EX-${String(pedido.numero_express).padStart(6, "0")} ${etiqueta}. ${medicion.estado === "medido" ? `Distancia registrada: ${mostrarDistancia(medicion.distancia)}.` : "GPS no verificable (registrado)."}`);
      }
    } catch (e) {
      setError(`No se pudo completar la operación: ${e.message || "Error desconocido"}. Revisá el estado antes de reintentar.`);
    } finally { setRegistrandoPedido(null); }
  };

  // El GPS se usa únicamente mientras la pantalla del repartidor está abierta.
  useEffect(() => {
    if (!sesion || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => {
        setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude, precision: pos.coords.accuracy, timestamp: pos.timestamp });
        setAhoraGps(Date.now());
        setErrorGps("");
      },
      err => setErrorGps(err.code === 1 ? "Permití el acceso a la ubicación para ver las distancias." : "No se pudo obtener la ubicación GPS."),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [sesion?.usuarioId]);

  // Actualizar la antigüedad visible aunque el GPS deje de enviar nuevas lecturas.
  useEffect(() => {
    if (!sesion) return;
    const timer = setInterval(() => setAhoraGps(Date.now()), 10000);
    return () => clearInterval(timer);
  }, [sesion?.usuarioId]);

  const antiguedadGps = gps?.timestamp != null ? Math.max(0, ahoraGps - gps.timestamp) : null;
  const gpsReciente = antiguedadGps != null && antiguedadGps <= GPS_RECIENTE_MS;
  const gpsPreciso = gpsReciente && Number.isFinite(gps?.precision) && gps.precision <= GPS_PRECISION_BUENA_M;
  const etiquetaGps = !gps ? "🔴 GPS no disponible"
    : !gpsReciente ? `🟡 Última ubicación conocida · hace ${Math.max(1, Math.floor(antiguedadGps / 1000))} s`
    : gpsPreciso ? `🟢 GPS actualizado · precisión ±${Math.round(gps.precision)} m`
    : `🟡 GPS reciente, precisión baja${Number.isFinite(gps.precision) ? ` (±${Math.round(gps.precision)} m)` : ""}`;

  // Geoapify: cada dirección pendiente se consulta una sola vez por sesión.
  useEffect(() => {
    const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
    const pendientes = relaciones.filter(r => !r.resultado && !["entregado", "no_entregado"].includes(pedidos[r.pedido_id]?.estado));
    const direcciones = [...new Set(pendientes.map(r => {
      const p = pedidos[r.pedido_id];
      return p?.destino_latitud != null && p?.destino_longitud != null ? null : p?.direccion?.trim();
    }).filter(Boolean))];
    if (!direcciones.length) return;
    if (!key) { setErrorMapa("No está configurada la clave VITE_GEOAPIFY_API_KEY. Revisá el archivo .env del proyecto."); return; }
    let cancelado = false;
    const controller = new AbortController();
    (async () => {
      for (const dir of direcciones) {
        if (cancelado) break;
        if (coordenadas[dir] !== undefined) continue;
        try {
          const params = new URLSearchParams({ text: dir, lang: "es", limit: "1", filter: "countrycode:ar", apiKey: key });
          const res = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`, { signal: controller.signal });
          if (!res.ok) throw new Error(`Geoapify: ${res.status}`);
          const json = await res.json();
          const f = json.features?.[0];
          const loc = f?.geometry?.coordinates;
          if (!cancelado) setCoordenadas(prev => ({ ...prev, [dir]: loc?.length === 2 ? { lat: loc[1], lon: loc[0] } : null }));
        } catch (e) {
          if (!cancelado) { setErrorMapa(`No se pudo localizar una dirección: ${e.message}`); setCoordenadas(prev => ({ ...prev, [dir]: null })); }
        }
      }
    })();
    return () => { cancelado = true; controller.abort(); };
  }, [relaciones, pedidos]);

  const puntoPedido = p => {
    if (!p) return null;
    if (p.destino_latitud != null && p.destino_longitud != null)
      return { lat: Number(p.destino_latitud), lon: Number(p.destino_longitud) };
    return coordenadas[p.direccion?.trim()] || null;
  };
  // Solo destinos del recorrido que se está realizando; si no hay uno, del próximo preparado.
  const viajeActual = viajes.find(v => v.estado === "en_camino") || viajes.find(v => v.estado === "preparando");
  const destinosMapa = relaciones.filter(r => r.viaje_id === viajeActual?.id && !r.resultado && !["entregado", "no_entregado"].includes(pedidos[r.pedido_id]?.estado))
    .map(r => ({ pedido: pedidos[r.pedido_id], punto: puntoPedido(pedidos[r.pedido_id]) }))
    .filter(x => x.pedido && x.punto);
  const listado = useMemo(() => viajes.filter(v => vista === "todos"
    ? ["preparando", "en_camino"].includes(v.estado)
    : vista === "historial"
      ? ["regresando", "regresado", "cerrado"].includes(v.estado)
      : v.estado === vista), [viajes, vista]);
  const totalAsignados = relaciones.filter(r => viajes.some(v => v.id === r.viaje_id && ["preparando", "en_camino"].includes(v.estado))).length;
  const totalEnRuta = viajes.filter(v => v.estado === "en_camino").length;

  return (
    <main style={{ minHeight: "100vh", background: fondo, color: "white", padding: "18px 12px 55px", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 750, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(24px, 6vw, 34px)", marginBottom: 4, color: "#f8fafc", fontWeight: 800, fontSize: 14, margin: "5px 0" }}>🛵 RutaComercios Express</h1>
        <p style={{ color: textoSuave, marginTop: 0 }}>Mis repartos {sesion ? `· ${sesion.nombre}` : ""}</p>
        {cargando && <p>Consultando tus pedidos...</p>}
        {aviso && <p role="status" style={{ background: "#14532d", padding: 12, borderRadius: 10 }}>{aviso}</p>}
        {error && <p role="alert" style={{ background: "#7f1d1d", padding: 12, borderRadius: 10 }}>{error}</p>}
        {sesion && <>
          <section style={{ background: tarjeta, border: `1px solid ${borde}`, padding: 14, borderRadius: 12, marginBottom: 14 }}>
            <strong style={{ fontSize: 18 }}>{jornada === "finalizada" ? "🌙 Jornada finalizada" : "🟢 Jornada trabajando"}</strong>
            <p style={{ color: textoSuave, fontSize: 13 }}>La jornada es independiente de cada recorrido. Podés terminarla desde cualquier lugar, siempre que no tengas entregas pendientes ni otro reparto preparado.</p>
            <button type="button" disabled={cambiandoJornada || Boolean(registrandoPedido) || Boolean(iniciandoViaje)}
              onClick={() => cambiarJornada(jornada === "finalizada" ? "iniciar" : "finalizar")}
              style={{ ...btn, width: "100%", minHeight: 56, background: jornada === "finalizada" ? "#15803d" : "#475569" }}>
              {cambiandoJornada ? "⏳ Guardando jornada..." : jornada === "finalizada" ? "🟢 INICIAR JORNADA" : "🌙 FIN DEL DÍA LABORAL"}
            </button>
          </section>
          <button type="button" disabled={actualizando} onClick={actualizar} style={{ ...btn, background: "#2563eb", width: "100%", marginBottom: 14 }}>
            {actualizando ? "Actualizando..." : "↻ Actualizar mis pedidos"}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginBottom: 14 }}>
            <div style={{ background: tarjeta, borderRadius: 10, padding: "10px 5px", textAlign: "center", minWidth: 0 }}>
              <div style={{ color: textoSuave, fontSize: 10 }}>Pedidos</div>
              <strong style={{ fontSize: 23 }}>{totalAsignados}</strong>
            </div>
            <div style={{ background: tarjeta, borderRadius: 10, padding: "10px 5px", textAlign: "center", minWidth: 0 }}>
              <div style={{ color: textoSuave, fontSize: 10 }}>Viajes en curso</div>
              <strong style={{ fontSize: 23 }}>{totalEnRuta}</strong>
            </div>
            <button type="button" onClick={cargarSaldo} disabled={cargandoSaldo}
              title={errorSaldo || (saldoEfectivo ? `Pendiente: ${dinero(saldoEfectivo.saldo_pendiente)}. Tocá para actualizar.` : "Tocá para consultar el saldo")}
              style={{ background: tarjeta, color: "inherit", border: `1px solid ${borde}`, borderRadius: 10, padding: "7px 3px", minWidth: 0, cursor: "pointer", textAlign: "center" }}>
              <div style={{ color: textoSuave, fontSize: 10, marginBottom: 4 }}>💵 Cobrado / Rendido</div>
              <div style={{ fontSize: 12, fontWeight: 700, overflowWrap: "anywhere", lineHeight: 1.5 }}>
                {errorSaldo ? "Saldo no disponible" : saldoEfectivo ? <>
                  <div>{dinero(saldoEfectivo.total_cobrado)}</div>
                  <div style={{ color: "#86efac" }}>{dinero(saldoEfectivo.total_rendido)}</div>
                </> : "Consultando…"}
              </div>
              <div style={{ fontSize: 9, color: textoSuave, marginTop: 3 }}>{cargandoSaldo ? "Actualizando…" : "↻ Actualizar"}</div>
            </button>
          </div>
          {errorSaldo && <p role="alert" style={{ color: "#fca5a5", fontSize: 12 }}>{errorSaldo}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {[["todos", "Actuales"], ["preparando", "Por salir"], ["en_camino", "En reparto"], ["historial", "Historial"]].map(([id, label]) =>
              <button key={id} type="button" onClick={() => setVista(id)} style={{ ...btn, background: vista === id ? "#7c3aed" : borde, fontSize: 14 }}>{label}</button>
            )}
          </div>
          <section style={{ background: tarjeta, border: `1px solid ${borde}`, borderRadius: 14, padding: 12, marginBottom: 16 }}>
            <button type="button" onClick={() => setVerMapa(v => !v)} style={{ ...btn, background: "#2563eb", width: "100%" }}>
              🗺️ {verMapa ? "Ocultar mapa de entregas" : "Ver mapa de entregas"}
            </button>
            {verMapa && <>
              <p style={{ color: textoSuave, fontSize: 13 }}>🔵 Destinos del {viajeActual?.estado === "en_camino" ? "recorrido actual" : "próximo recorrido"} · 🟢 Tu GPS. Elegí libremente el próximo destino.</p>
              <p style={{ color: gpsPreciso ? "#86efac" : "#fbbf24", fontSize: 12 }}>{etiquetaGps}</p>
              {errorGps && <p style={{ color: "#fca5a5" }}>{errorGps}</p>}
              {errorMapa && <p style={{ color: "#fca5a5" }}>{errorMapa}</p>}
              <div style={{ height: 340, overflow: "hidden", borderRadius: 12 }}>
                <MapContainer center={gps ? [gps.lat, gps.lon] : [-34.7206, -58.2545]} zoom={12} style={{ height: "100%", width: "100%" }}>
                  <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <AjustarMapa puntos={[...(gps ? [gps] : []), ...destinosMapa.map(x => x.punto)]} />
                  {gps && <Marker position={[gps.lat, gps.lon]} icon={iconoGps}><Popup>🛵 {etiquetaGps}</Popup></Marker>}
                  {destinosMapa.map(({ pedido, punto }) => <Marker key={pedido.id} position={[punto.lat, punto.lon]} icon={iconoDestino}>
                    <Popup><strong>{pedido.cliente_nombre}</strong><div>{pedido.direccion}</div>{gps && <strong>{mostrarDistancia(distanciaMetros(gps, punto))} en línea recta · {gpsReciente ? "GPS reciente" : "última ubicación conocida"}</strong>}</Popup>
                  </Marker>)}
                </MapContainer>
              </div>
              <p style={{ color: textoSuave, fontSize: 12 }}>Las ubicaciones obtenidas de direcciones escritas son aproximadas. Verificá el destino antes de viajar.</p>
            </>}
          </section>
          {!cargando && !listado.length && <p style={{ color: textoSuave }}>No hay recorridos en esta sección. Podés actualizar para consultar nuevas asignaciones.</p>}
          {listado.map(viaje => {
            const paradas = relaciones
               .filter(r => r.viaje_id === viaje.id)
               .sort((a, b) => {
                 const finalizadoA = a.resultado === "entregado" || a.resultado === "no_entregado" || ["entregado", "no_entregado"].includes(pedidos[a.pedido_id]?.estado);
                 const finalizadoB = b.resultado === "entregado" || b.resultado === "no_entregado" || ["entregado", "no_entregado"].includes(pedidos[b.pedido_id]?.estado);
                 return Number(finalizadoA) - Number(finalizadoB);
               });
            return <section key={viaje.id} style={{ background: tarjeta, border: `1px solid ${borde}`, borderRadius: 12, padding: 10, marginBottom: 10 }}>
              <h2 style={{ fontSize: 17, margin: "0 0 4px", color: "#f8fafc" }}>{["regresando", "regresado", "cerrado"].includes(viaje.estado) ? `📋 RECORRIDO FINALIZADO · ${paradas.filter(r => ["entregado", "no_entregado"].includes(r.resultado) || ["entregado", "no_entregado"].includes(pedidos[r.pedido_id]?.estado)).length}/${paradas.length}` : viaje.estado === "en_camino" ? "🟢 En reparto" : "🟡 Preparando salida"}</h2>
              <p style={{ color: textoSuave, fontSize: 11, marginTop: 0 }}>Asignado: {fecha(viaje.creado_en)} {viaje.salida_en ? `· Salida: ${fecha(viaje.salida_en)}` : ""} · {paradas.length} pedido(s)</p>
              {viaje.estado === "preparando" && (
                <button type="button"
                  disabled={Boolean(iniciandoViaje) || !paradas.length || actualizando || jornada === "finalizada" || viajes.some(v => v.estado === "en_camino")}
                  onClick={() => comenzarReparto(viaje, paradas.length)}
                  style={{ ...btn, background: iniciandoViaje === viaje.id ? "#64748b" : "#16a34a", width: "100%", margin: "8px 0 12px", minHeight: 58, fontSize: 19, opacity: !paradas.length ? 0.6 : 1 }}>
                  {iniciandoViaje === viaje.id ? "⏳ Registrando salida..." : "🛵 COMENZAR REPARTO"}
                </button>
              )}
              {!paradas.length && <p>Este viaje todavía no tiene pedidos.</p>}
              {paradas.map((rel) => {
                const p = pedidos[rel.pedido_id];
                if (!p) return <p key={rel.pedido_id} style={{ color: "#fca5a5" }}>No se pudo leer el pedido asignado. Revisar permisos de Supabase.</p>;
                return <article key={rel.pedido_id} style={{ background: "#0b1220", border: `1px solid ${borde}`, borderRadius: 10, padding: 9, marginTop: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 14, fontWeight: 700 }}>
                    <span>EX-{String(p.numero_express).padStart(6, "0")} · {p.cliente_nombre}</span>
                    {rel.resultado && <span style={{ color: rel.resultado === "entregado" ? "#86efac" : "#fca5a5", fontSize: 12 }}>
                      {rel.resultado === "entregado" ? "✅ ENTREGADO" : "❌ NO ENTREGADO"}
                    </span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", alignItems: "center", fontSize: 13, marginTop: 5 }}>
                    <span>📍 {p.direccion || "Dirección no informada"}</span>
                    {p.telefono && <a style={{ color: "#93c5fd" }} href={`tel:${p.telefono.replace(/[^\d+]/g, "")}`}>📞 {p.telefono}</a>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px 8px", fontSize: 13, marginTop: 5 }}>
                    <strong style={{ fontSize: 15 }}>{dinero(p.importe_total)}</strong>
                    <span style={{ color: textoSuave }}>· {(p.modalidad_cobro || "Sin definir").replaceAll("_", " ")}</span>
                    {rel.resultado === "no_entregado" && rel.motivo_no_entrega && <span style={{ color: "#fca5a5" }}>· {rel.motivo_no_entrega}</span>}
                  </div>
                  {(p.detalle || p.notas) && <div style={{ color: textoSuave, fontSize: 12, marginTop: 4 }}>📝 {p.detalle || p.notas}</div>}
                  {gps && puntoPedido(p) && !rel.resultado && <div style={{ color: "#86efac", fontSize: 12, marginTop: 4 }}>
                    📍 A {mostrarDistancia(distanciaMetros(gps, puntoPedido(p)))} en línea recta
                  </div>}
                  {!rel.resultado && viaje.estado === "en_camino" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginBottom: 12 }}>
                      <button type="button" disabled={Boolean(registrandoPedido)} onClick={() => registrarEntrega(viaje, p, "entregado")}
                        style={{ ...btn, background: "#15803d", minHeight: 56, opacity: registrandoPedido ? 0.65 : 1 }}>
                        {registrandoPedido === p.id ? "⏳ Guardando..." : "✅ ENTREGADO"}
                      </button>
                      <button type="button" disabled={Boolean(registrandoPedido)} onClick={() => registrarEntrega(viaje, p, "no_entregado")}
                        style={{ ...btn, background: "#b91c1c", minHeight: 56, opacity: registrandoPedido ? 0.65 : 1 }}>
                        ❌ NO ENTREGADO
                      </button>
                    </div>
                  ) : null}
                </article>;
              })}
            </section>;
          })}
        </>}
      </div>
    </main>
  );
}
