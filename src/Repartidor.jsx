import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function AjustarMapa({ puntos }) {
  const map = useMap();
  useEffect(() => {
    if (!puntos.length) return;
    if (puntos.length === 1) {
      map.setView(puntos[0], 15);
    } else {
      map.fitBounds(puntos, { padding: [28, 28] });
    }
  }, [map, puntos]);
  return null;
}

const iconoNumero = (numero) => L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;border-radius:50%;background:#2563eb;color:white;border:3px solid white;box-shadow:0 2px 7px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font:900 14px Arial">${numero}</div>`,
  iconSize: [32,32],
  iconAnchor: [16,16],
  popupAnchor: [0,-16],
});

export default function Repartidor({ sesion: sesionProp, perfil: perfilProp, onVolver }) {
  const [perfil, setPerfil] = useState(perfilProp || null);
  const [entregas, setEntregas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [activa, setActiva] = useState(null);
  const [jornadaActiva, setJornadaActiva] = useState(false);
  const [procesandoJornada, setProcesandoJornada] = useState(false);
  const [gpsEstado, setGpsEstado] = useState("Sin iniciar");
  const [ordenRuta, setOrdenRuta] = useState([]);
  const [rutaGuardada, setRutaGuardada] = useState(false);
  const [arrastrandoId, setArrastrandoId] = useState(null);
  const arrastreTactil = React.useRef(null);
  const [resumenSalida, setResumenSalida] = useState(null);
  const [mapaAsignadasAbierto, setMapaAsignadasAbierto] = useState(false);
  const [chatAbierto, setChatAbierto] = useState(false);
  const [chatContactos, setChatContactos] = useState([]);
  const [chatDestino, setChatDestino] = useState("");
  const [chatMensajes, setChatMensajes] = useState([]);
  const [chatTexto, setChatTexto] = useState("");
  const [chatError, setChatError] = useState("");
  const [chatEnviando, setChatEnviando] = useState(false);

  const claveResumenSalida = () => {
    const uid = sesionProp?.user?.id || perfil?.id || "repartidor";
    const emp = perfil?.empresa_id || "empresa";
    return `rutacomercio:salida-activa:${emp}:${uid}`;
  };

  const claveOrdenRuta = () => {
    const uid = sesionProp?.user?.id || perfil?.id || "repartidor";
    const emp = perfil?.empresa_id || "empresa";
    const fecha = "orden-entregas";
    return `rutacomercio:ruta:${emp}:${uid}:${fecha}`;
  };

  const cargar = async () => {
    setCargando(true);
    setError("");
    try {
      let p = perfilProp || perfil;
      let session = sesionProp;

      if (!session) {
        session = (await supabase.auth.getSession()).data?.session;
      }
      if (!session?.user?.id) throw new Error("No hay sesión activa.");

      if (!p?.empresa_id) {
        const { data, error: ep } = await supabase
          .from("perfiles")
          .select("id,nombre,email,rol,empresa,empresa_id")
          .eq("id", session.user.id)
          .maybeSingle();
        if (ep) throw ep;
        if (!data?.empresa_id) throw new Error("El usuario no tiene empresa asignada.");
        p = data;
        setPerfil(data);
      }

      const { data: rows, error: ee } = await supabase
        .from("repartos_entregas")
        .select("*")
        .eq("empresa_id", p.empresa_id)
        .eq("repartidor_id", session.user.id)
        .in("estado", ["asignado", "recibido", "en_reparto", "reintentar", "entregado", "no_entregado", "devolucion_informada"])
        .order("fecha_programada", { ascending: true });

      if (ee) throw ee;

      const pedidoIds = [...new Set((rows || []).map(x => x.pedido_id).filter(Boolean))];
      const entregaIds = (rows || []).map(x => x.id).filter(Boolean);

      let pedidos = {};
      if (pedidoIds.length) {
        const { data: pd, error: pe } = await supabase
          .from("pedidos")
          .select("id,numero_pedido,comercio_id,comercio_nombre,total,notas")
          .in("id", pedidoIds);
        if (pe) throw pe;
        (pd || []).forEach(x => pedidos[String(x.id)] = x);
      }

      const comercioIds = [...new Set(Object.values(pedidos).map(x => x.comercio_id).filter(Boolean))];
      let comercios = {};
      if (comercioIds.length) {
        const { data: cd, error: ce } = await supabase
          .from("comercios")
          .select("id,direccion,localidad,provincia,telefono,whatsapp,contacto,ubicacion_exacta_latitud,ubicacion_exacta_longitud")
          .in("id", comercioIds);
        if (ce) throw ce;
        (cd || []).forEach(x => comercios[String(x.id)] = x);
      }

      let items = {};
      if (entregaIds.length) {
        const { data: idata, error: ie } = await supabase
          .from("repartos_entrega_items")
          .select("entrega_id,codigo,descripcion,color,talle,cantidad")
          .in("entrega_id", entregaIds);
        if (ie) throw ie;
        (idata || []).forEach(x => {
          const k = String(x.entrega_id);
          if (!items[k]) items[k] = [];
          items[k].push(x);
        });
      }

      const consolidadas = (rows || []).map(e => {
        const esManual = !e.pedido_id;
        const ped = pedidos[String(e.pedido_id)] || {};
        const com = comercios[String(ped.comercio_id)] || {};
        const direccionManual = [e.direccion, e.localidad, e.partido, e.provincia].filter(Boolean).join(", ");
        return {
          ...e,
          numeroVisible: esManual ? "" : String(ped.numero_pedido || "").padStart(6, "0"),
          cliente: esManual ? (e.destinatario || "Destinatario") : (ped.comercio_nombre || `Comercio #${ped.comercio_id || ""}`),
          total: esManual ? null : Number(ped.total || 0),
          direccion: esManual ? direccionManual : ([com.direccion, com.localidad, com.provincia].filter(Boolean).join(", ") || e.direccion || ""),
          latitud: esManual ? (e.latitud == null ? null : Number(e.latitud)) : (com.ubicacion_exacta_latitud == null ? (e.latitud == null ? null : Number(e.latitud)) : Number(com.ubicacion_exacta_latitud)),
          longitud: esManual ? (e.longitud == null ? null : Number(e.longitud)) : (com.ubicacion_exacta_longitud == null ? (e.longitud == null ? null : Number(e.longitud)) : Number(com.ubicacion_exacta_longitud)),
          telefono: esManual ? (e.telefono || "") : (com.telefono || e.telefono || ""),
          whatsapp: esManual ? "" : (com.whatsapp || ""),
          contacto: esManual ? "" : (com.contacto || ""),
          items: items[String(e.id)] || [],
        };
      });

      setEntregas(consolidadas);
      if (activa) {
        setActiva(consolidadas.find(x => x.id === activa.id) || null);
      }
    } catch (e) {
      console.error(e);
      setError(e?.message || "No se pudieron cargar las entregas.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(claveResumenSalida());
      if (raw) setResumenSalida(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const asignadas = useMemo(() => entregas.filter(e => e.estado === "asignado"), [entregas]);
  const recibidas = useMemo(() => entregas.filter(e => e.estado === "recibido"), [entregas]);
  const entregadas = useMemo(() => entregas.filter(e => e.estado === "entregado"), [entregas]);
  const enReparto = useMemo(() => entregas.filter(e => e.estado === "en_reparto"), [entregas]);
  const paraVolver = useMemo(() => entregas.filter(e => e.estado === "reintentar"), [entregas]);

  const guardarUbicacion = async (position) => {
    const userId = sesionProp?.user?.id || (await supabase.auth.getSession()).data?.session?.user?.id;
    if (!userId || !position?.coords) return;

    const { latitude, longitude } = position.coords;
    const ahora = new Date().toISOString();

    const { error } = await supabase
      .from("perfiles")
      .update({
        latitud: latitude,
        longitud: longitude,
        ultima_posicion_at: ahora,
        ultima_conexion: ahora,
        activo_hoy: true,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error actualizando GPS repartidor:", error);
      setGpsEstado("Error GPS");
    } else {
      setGpsEstado("GPS activo");
    }
  };

  const pedirUbicacionAhora = () => {
    if (!navigator.geolocation) {
      setGpsEstado("GPS no disponible");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      guardarUbicacion,
      (e) => {
        console.warn("GPS repartidor:", e);
        setGpsEstado("Sin permiso GPS");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  };

  useEffect(() => {
    const hayEnReparto = entregas.some(e => ["en_reparto", "reintentar"].includes(e.estado));
    let salidaGuardada = false;
    try {
      salidaGuardada = Boolean(localStorage.getItem(claveResumenSalida()));
    } catch {}
    setJornadaActiva(hayEnReparto || salidaGuardada || Boolean(resumenSalida));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregas, resumenSalida]);

  useEffect(() => {
    const idsRecibidas = entregas.filter(e => ["asignado", "recibido", "en_reparto", "reintentar"].includes(e.estado)).map(e => e.id);
    if (!idsRecibidas.length) {
      setOrdenRuta([]);
      return;
    }

    let guardado = [];
    try {
      guardado = JSON.parse(localStorage.getItem(claveOrdenRuta()) || "[]");
      if (!Array.isArray(guardado)) guardado = [];
    } catch {
      guardado = [];
    }

    setOrdenRuta(prev => {
      const base = prev.length ? prev : guardado;
      const conservadas = base.filter(id => idsRecibidas.includes(id));
      const nuevas = idsRecibidas.filter(id => !conservadas.includes(id));
      return [...conservadas, ...nuevas];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregas]);

  const guardarOrdenRuta = () => {
    try {
      localStorage.setItem(claveOrdenRuta(), JSON.stringify(ordenRuta));
      setRutaGuardada(true);
    } catch {
      alert("No se pudo guardar la ruta en este dispositivo.");
    }
  };

  const moverEnRuta = (origenId, destinoId) => {
    setRutaGuardada(false);
    if (!origenId || !destinoId || origenId === destinoId) return;
    setOrdenRuta(prev => {
      const nuevo = [...prev];
      const desde = nuevo.indexOf(origenId);
      const hasta = nuevo.indexOf(destinoId);
      if (desde < 0 || hasta < 0) return prev;
      const [movido] = nuevo.splice(desde, 1);
      nuevo.splice(hasta, 0, movido);
      return nuevo;
    });
  };

  // Arrastre táctil desde el símbolo ☰; el arrastre de mouse sigue siendo nativo.
  const iniciarArrastreTactil = (ev, id) => {
    if (ev.pointerType === "mouse") return;
    ev.preventDefault();
    arrastreTactil.current = { id, pointerId: ev.pointerId };
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setArrastrandoId(id);
  };

  const terminarArrastreTactil = (ev) => {
    const origen = arrastreTactil.current;
    if (!origen || origen.pointerId !== ev.pointerId) return;
    const debajo = document.elementFromPoint(ev.clientX, ev.clientY);
    const destino = debajo?.closest('[data-ruta-entrega]')?.getAttribute('data-ruta-entrega');
    if (destino) moverEnRuta(origen.id, destino);
    arrastreTactil.current = null;
    setArrastrandoId(null);
  };

  const cancelarArrastreTactil = () => {
    arrastreTactil.current = null;
    setArrastrandoId(null);
  };

  const recibidasOrdenadas = ordenRuta
    .map(id => recibidas.find(e => e.id === id))
    .filter(Boolean);
  const asignadasOrdenadas = ordenRuta
    .map(id => asignadas.find(e => e.id === id))
    .filter(Boolean);

  const paradasConCoordenadas = recibidasOrdenadas
    .map((e, idx) => ({ ...e, numeroParada: idx + 1 }))
    .filter(e => Number.isFinite(e.latitud) && Number.isFinite(e.longitud));

  const puntosRuta = paradasConCoordenadas.map(e => [e.latitud, e.longitud]);

  const pendientesRuta = ordenRuta
    .map(id => entregas.find(e => e.id === id))
    .filter(e => e && ["en_reparto", "reintentar"].includes(e.estado));

  const proximoDestino =
    pendientesRuta.find(e => e.estado === "en_reparto") ||
    pendientesRuta.find(e => e.estado === "reintentar") ||
    null;

  const pendientesOrdenadas = ordenRuta
    .map(id => entregas.find(e => e.id === id))
    .filter(e => e && ["en_reparto", "reintentar"].includes(e.estado));

  const otrasPendientes = entregas.filter(
    e => ["en_reparto", "reintentar"].includes(e.estado) && !ordenRuta.includes(e.id)
  );

  // Vista previa: solo destinos asignados; no cambia estados ni organiza automáticamente la ruta.
  const destinosAsignados = asignadasOrdenadas
    .map((e, idx) => ({ ...e, numeroParada: idx + 1 }))
    .filter(e => Number.isFinite(e.latitud) && Number.isFinite(e.longitud));
  const puntosAsignados = destinosAsignados.map(e => [e.latitud, e.longitud]);

  const asignadasRecibidas = entregas.filter(e => ["asignado", "recibido"].includes(e.estado));

  const finalizadas = entregas
    .filter(e => ["entregado", "no_entregado"].includes(e.estado))
    .sort((a, b) => {
      const ta = new Date(a.entregado_at || a.actualizado_at || 0).getTime();
      const tb = new Date(b.entregado_at || b.actualizado_at || 0).getTime();
      return ta - tb;
    });

  const entregasOrdenadasPantalla = jornadaActiva
    ? [...pendientesOrdenadas, ...otrasPendientes, ...asignadasRecibidas, ...finalizadas]
    : [...asignadasRecibidas, ...pendientesOrdenadas, ...otrasPendientes, ...finalizadas];

  const mapaDuranteRuta = [...pendientesOrdenadas, ...otrasPendientes]
    .map((e, idx) => ({ ...e, numeroParada: idx + 1 }))
    .filter(e => Number.isFinite(e.latitud) && Number.isFinite(e.longitud));

  const puntosDuranteRuta = mapaDuranteRuta.map(e => [e.latitud, e.longitud]);

  useEffect(() => {
    if (!jornadaActiva || !navigator.geolocation) return;

    setGpsEstado("Activando GPS...");
    pedirUbicacionAhora();

    const watchId = navigator.geolocation.watchPosition(
      guardarUbicacion,
      (e) => {
        console.warn("GPS continuo repartidor:", e);
        setGpsEstado("Sin señal GPS");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    const refuerzo = setInterval(() => {
      if (document.visibilityState === "visible") pedirUbicacionAhora();
    }, 30000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(refuerzo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaActiva]);

  const comenzarJornada = async () => {
    if (procesandoJornada) return;
    if (recibidas.length === 0) {
      alert("⚠️ Primero tenés que marcar como RECIBIDA al menos una entrega cargada en el vehículo.");
      return;
    }

    const ok = window.confirm(
      `¿Comenzar el reparto?\n\nEntrarán en la ruta ${recibidas.length} entrega/s RECIBIDA/S.` +
      (asignadas.length ? `\n\n⚠️ Quedarán ${asignadas.length} entrega/s todavía ASIGNADA/S fuera de esta salida.` : "")
    );
    if (!ok) return;

    setProcesandoJornada(true);
    try {
      pedirUbicacionAhora();
      const ahora = new Date().toISOString();
      const ids = recibidasOrdenadas.map(e => e.id);

      const resumen = {
        asignadasTotal: asignadas.length + recibidas.length,
        recibidasTotal: recibidas.length,
        idsSalida: ids,
        iniciadaAt: ahora,
      };
      setResumenSalida(resumen);
      try { localStorage.setItem(claveResumenSalida(), JSON.stringify(resumen)); } catch {}

      const { error } = await supabase
        .from("repartos_entregas")
        .update({
          estado: "en_reparto",
          salida_at: ahora,
          actualizado_at: ahora,
        })
        .in("id", ids);

      if (error) throw error;

      setJornadaActiva(true);
      await cargar();
    } catch (e) {
      alert("❌ No se pudo comenzar el reparto: " + (e?.message || "error desconocido"));
    } finally {
      setProcesandoJornada(false);
    }
  };

  const finalizarJornada = async () => {
    if (procesandoJornada) return;

    const pendientes = entregas.filter(e => ["en_reparto", "reintentar"].includes(e.estado));
    const volver = pendientes.filter(e => e.estado === "reintentar").length;

    const mensaje = pendientes.length
      ? `¿FINALIZAR REPARTO AHORA?\n\nQuedan ${pendientes.length} entrega/s pendientes.` +
        (volver ? `\n🕐 ${volver} marcada/s para volver.` : "") +
        `\n\nEsas entregas volverán a quedar ASIGNADAS a este repartidor para que Despacho pueda reprogramarlas o reasignarlas.`
      : "¿FINALIZAR REPARTO?\n\nLa salida quedará cerrada.";

    const ok = window.confirm(mensaje);
    if (!ok) return;

    setProcesandoJornada(true);
    try {
      const ahora = new Date().toISOString();

      if (pendientes.length > 0) {
        const idsPendientes = pendientes.map(e => e.id);
        const { error } = await supabase
          .from("repartos_entregas")
          .update({
            estado: "asignado",
            salida_at: null,
            actualizado_at: ahora,
          })
          .in("id", idsPendientes);

        if (error) throw error;
      }

      setJornadaActiva(false);
      setGpsEstado("Reparto finalizado");
      setResumenSalida(null);
      try { localStorage.removeItem(claveResumenSalida()); } catch {}
      setActiva(null);
      await cargar();
    } catch (e) {
      alert("❌ No se pudo finalizar el reparto: " + (e?.message || "error desconocido"));
    } finally {
      setProcesandoJornada(false);
    }
  };

  const marcarRecibida = async (entrega) => {
    if (jornadaActiva) {
      alert("⚠️ El reparto ya comenzó. La carga se confirma antes de salir.");
      return;
    }
    const ok = window.confirm(
      `¿Confirmar que recibiste/cargaste ${tituloEntrega(entrega)}?\n\n${entrega.cliente}`
    );
    if (!ok) return;

    try {
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("repartos_entregas")
        .update({ estado: "recibido", actualizado_at: ahora })
        .eq("id", entrega.id);
      if (error) throw error;
      setActiva(null);
      await cargar();
    } catch (e) {
      alert("❌ No se pudo confirmar la recepción: " + (e?.message || "error desconocido"));
    }
  };

  const devolverAAsignada = async (entrega) => {
    if (jornadaActiva) {
      alert("⚠️ El reparto ya comenzó. Ya no se puede devolver la carga a ASIGNADA.");
      return;
    }
    const ok = window.confirm(
      `¿Quitar esta entrega de RECIBIDAS y devolverla a ASIGNADAS?\n\n${tituloEntrega(entrega)} · ${entrega.cliente}`
    );
    if (!ok) return;

    try {
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("repartos_entregas")
        .update({ estado: "asignado", actualizado_at: ahora })
        .eq("id", entrega.id);
      if (error) throw error;
      setActiva(null);
      await cargar();
    } catch (e) {
      alert("❌ No se pudo devolver a ASIGNADAS: " + (e?.message || "error desconocido"));
    }
  };

  const navegarEntrega = (entrega) => {
    pedirUbicacionAhora();
    const destino =
      Number.isFinite(entrega.latitud) && Number.isFinite(entrega.longitud)
        ? `${entrega.latitud},${entrega.longitud}`
        : entrega.direccion;

    if (!destino) {
      alert("⚠️ Esta entrega no tiene ubicación ni dirección disponible.");
      return;
    }

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const marcarEntregada = async (entrega) => {
    const ok = window.confirm(
      `¿Confirmar ENTREGA REALIZADA?\n\n${tituloEntrega(entrega)} · ${entrega.cliente}\n${entrega.bultos ?? 0} bulto/s`
    );
    if (!ok) return;

    try {
      pedirUbicacionAhora();
      const ahora = new Date().toISOString();

      const { error } = await supabase
        .from("repartos_entregas")
        .update({
          estado: "entregado",
          entregado_at: ahora,
          motivo_no_entrega: null,
          actualizado_at: ahora,
        })
        .eq("id", entrega.id);

      if (error) throw error;

      setActiva(null);
      await cargar();
    } catch (e) {
      alert("❌ No se pudo confirmar la entrega: " + (e?.message || "error desconocido"));
    }
  };

  const marcarNoEntregada = async (entrega) => {
    const opciones =
      "Motivo de NO ENTREGA:\n\n" +
      "1 - Comercio cerrado\n" +
      "2 - Cliente rechazó la mercadería\n" +
      "3 - Dirección incorrecta / no encontrada\n" +
      "4 - Problema con documentación\n" +
      "5 - Otro\n\n" +
      "Escribí 1, 2, 3, 4 o 5.";

    const eleccion = window.prompt(opciones);
    if (eleccion === null) return;

    const motivos = {
      "1": "Comercio cerrado",
      "2": "Cliente rechazó la mercadería",
      "3": "Dirección incorrecta / no encontrada",
      "4": "Problema con documentación",
    };

    let motivo = motivos[String(eleccion).trim()] || "";

    if (String(eleccion).trim() === "5") {
      const otro = window.prompt("Escribí el motivo de la no entrega:");
      if (otro === null) return;
      motivo = otro.trim();
    }

    if (!motivo) {
      alert("⚠️ Elegí un motivo válido.");
      return;
    }

    const ok = window.confirm(
      `¿Marcar como NO ENTREGADA?\n\n${tituloEntrega(entrega)} · ${entrega.cliente}\nMotivo: ${motivo}`
    );
    if (!ok) return;

    try {
      pedirUbicacionAhora();
      const ahora = new Date().toISOString();

      const { error } = await supabase
        .from("repartos_entregas")
        .update({
          estado: "no_entregado",
          motivo_no_entrega: motivo,
          actualizado_at: ahora,
        })
        .eq("id", entrega.id);

      if (error) throw error;

      setActiva(null);
      await cargar();
    } catch (e) {
      alert("❌ No se pudo registrar la no entrega: " + (e?.message || "error desconocido"));
    }
  };

  const informarDevolucion = async (entrega) => {
    const ok = window.confirm(
      `¿Confirmar que devolvés al depósito la mercadería NO ENTREGADA?\n\n${tituloEntrega(entrega)} · ${entrega.cliente}\n${entrega.bultos ?? 0} bulto/s\n\nDepósito deberá confirmar luego la recepción física.`
    );
    if (!ok) return;

    try {
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("repartos_entregas")
        .update({
          estado: "devolucion_informada",
          actualizado_at: ahora,
        })
        .eq("id", entrega.id);

      if (error) throw error;
      setActiva(null);
      await cargar();
      alert("📦 Devolución informada. Queda pendiente de recepción por Depósito.");
    } catch (e) {
      alert("❌ No se pudo informar la devolución: " + (e?.message || "error desconocido"));
    }
  };

  const pasarMasTarde = async (entrega) => {
    const nota = window.prompt(
      "🕐 ¿Querés dejar una indicación para volver?\n\nEj.: volver después de las 16, pasar al regreso, dueño vuelve en una hora.\n\nPodés dejarlo vacío."
    );
    if (nota === null) return;

    try {
      pedirUbicacionAhora();
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("repartos_entregas")
        .update({
          estado: "reintentar",
          observaciones: nota.trim() || entrega.observaciones || null,
          actualizado_at: ahora,
        })
        .eq("id", entrega.id);

      if (error) throw error;
      setActiva(null);
      await cargar();
    } catch (e) {
      alert("❌ No se pudo marcar para volver más tarde: " + (e?.message || "error desconocido"));
    }
  };

  const irAlProximoDestino = () => {
    // Volver al tablero principal de la ruta.
    // La navegación GPS se inicia desde "NAVEGAR AL PRÓXIMO DESTINO".
    setActiva(null);
  };

  const retomarEntrega = async (entrega) => {
    const ok = window.confirm(`¿Retomar ahora la entrega de ${entrega.cliente}?`);
    if (!ok) return;

    try {
      pedirUbicacionAhora();
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("repartos_entregas")
        .update({ estado: "en_reparto", actualizado_at: ahora })
        .eq("id", entrega.id);

      if (error) throw error;
      await cargar();
      setActiva(prev => prev ? { ...prev, estado: "en_reparto" } : prev);
    } catch (e) {
      alert("❌ No se pudo retomar la entrega: " + (e?.message || "error desconocido"));
    }
  };

  const salir = async () => {
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  const idsSalidaActiva = resumenSalida?.idsSalida || [];
  const entregadasEstaSalida = entregas.filter(
    e => idsSalidaActiva.includes(e.id) && e.estado === "entregado"
  ).length;

  const asignadasMostradas = jornadaActiva && resumenSalida
    ? resumenSalida.asignadasTotal
    : asignadas.length + recibidas.length;

  const recibidasMostradas = jornadaActiva && resumenSalida
    ? resumenSalida.recibidasTotal
    : recibidas.length;

  const totalSalidaMostrado = jornadaActiva && resumenSalida
    ? resumenSalida.recibidasTotal
    : recibidas.length;

  const tituloEntrega = e => e.pedido_id ? `NVI #${e.numeroVisible}` : "Entrega manual";

  const miIdChat = sesionProp?.user?.id || perfil?.id;
  const cargarChat = async () => {
    if (!perfil?.empresa_id || !miIdChat) return;
    const {data,error:err} = await supabase.from("mensajes_operativos")
      .select("id,empresa_id,remitente_id,destinatario_id,contenido,creado_at,leido_at")
      .eq("empresa_id",perfil.empresa_id)
      .or(`remitente_id.eq.${miIdChat},destinatario_id.eq.${miIdChat}`)
      .order("creado_at",{ascending:true}).limit(300);
    if (err) setChatError(err.message);
    else {setChatError("");setChatMensajes(data || []);}
  };
  useEffect(()=>{
    if (!chatAbierto || !perfil?.empresa_id) return;
    let vivo=true;
    supabase.from("perfiles").select("id,nombre,rol").eq("empresa_id",perfil.empresa_id)
      .then(({data,error:err})=>{
        if (!vivo) return;
        if (err) {setChatError(err.message);return;}
        const contactos=(data||[]).filter(x=>x.id!==miIdChat &&
          ["supervisorr","supervisorv","supervisor","deposito","despacho"].includes(String(x.rol||"").toLowerCase()));
        setChatContactos(contactos);
        setChatDestino(actual=>actual || contactos[0]?.id || "");
      });
    cargarChat();
    const intervalo=setInterval(cargarChat,10000);
    return ()=>{vivo=false;clearInterval(intervalo);};
  },[chatAbierto,perfil?.empresa_id,miIdChat]);
  const enviarChat = async () => {
    if (!chatDestino || !chatTexto.trim() || chatEnviando) return;
    setChatEnviando(true);
    try {
      const {error:err}=await supabase.rpc("enviar_mensaje_operativo",{
        p_destinatario:chatDestino,p_contenido:chatTexto.trim()
      });
      if(err) throw err;
      setChatTexto("");
      await cargarChat();
    } catch(e){setChatError(e.message||"No se pudo enviar el mensaje.");}
    finally {setChatEnviando(false);}
  };
  const conversacionChat=chatMensajes.filter(m=>
    (m.remitente_id===miIdChat && m.destinatario_id===chatDestino) ||
    (m.remitente_id===chatDestino && m.destinatario_id===miIdChat));

  const boton = {
    border: "none", borderRadius: "9px", minHeight: "46px", padding: "9px 12px",
    fontWeight: "900", cursor: "pointer"
  };

  if (activa) {
    return (
      <div style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"Arial,sans-serif",color:"#0f172a"}}>
        <header style={{background:"#0f172a",color:"#fff",padding:"12px 14px"}}>
          <div style={{maxWidth:"760px",margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"11px",color:"#93c5fd",fontWeight:"900"}}>🚚 REPARTO</div>
              <div style={{fontSize:"19px",fontWeight:"900"}}>{tituloEntrega(activa)}</div>
            </div>
            <button onClick={()=>setActiva(null)} style={{...boton,background:"#1e293b",color:"#fff",border:"1px solid #64748b"}}>← VOLVER</button>
          </div>
        </header>
        <main style={{maxWidth:"760px",margin:"0 auto",padding:"14px"}}>
          <div style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:"12px",padding:"14px",marginBottom:"10px"}}>
            <div style={{fontSize:"21px",fontWeight:"950"}}>{activa.cliente}</div>
            <div style={{marginTop:"6px",color:"#475569"}}>📍 {activa.direccion || "Sin dirección cargada"}</div>
            {activa.contacto && <div style={{marginTop:"5px",fontSize:"13px"}}>👤 {activa.contacto}</div>}
            {activa.telefono && <div style={{marginTop:"5px",fontSize:"13px"}}>☎️ {activa.telefono}</div>}
            <div style={{marginTop:"8px",fontSize:"13px",color:"#475569"}}>
              📦 {activa.bultos ?? "—"} bulto/s
              {activa.numero_remito ? ` · Remito ${activa.numero_remito}` : ""}
              {activa.numero_factura ? ` · Factura ${activa.numero_factura}` : ""}
            </div>
          </div>

          {(activa.items || []).length > 0 && (
          <div style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:"12px",padding:"14px",marginBottom:"10px"}}>
            <div style={{fontSize:"13px",fontWeight:"950",marginBottom:"9px"}}>📦 DETALLE DE MERCADERÍA</div>
            {(activa.items || []).map((it,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",gap:"10px",padding:"8px 0",borderBottom:"1px solid #e2e8f0"}}>
                <div>
                  <div style={{fontWeight:"800"}}>{it.descripcion}</div>
                  <div style={{fontSize:"11px",color:"#64748b"}}>
                    {[it.codigo,it.color && `Color ${it.color}`,it.talle && `Talle ${it.talle}`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <strong>x {Number(it.cantidad || 0)}</strong>
              </div>
            ))}
          </div>
          )}

          {activa.estado === "asignado" ? (
            <div>
              <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"10px",padding:"12px",fontWeight:"900",color:"#1e3a8a",textAlign:"center",marginBottom:"9px"}}>
                📋 ENTREGA ASIGNADA · Confirmá cuando este pedido esté cargado en el vehículo.
              </div>
              <button onClick={()=>marcarRecibida(activa)} style={{...boton,width:"100%",background:"#0f766e",color:"#fff",fontSize:"14px"}}>
                📦 MARCAR COMO RECIBIDA
              </button>
            </div>
          ) : activa.estado === "recibido" ? (
            <div>
              <div style={{background:"#ecfeff",border:"1px solid #67e8f9",borderRadius:"10px",padding:"12px",fontWeight:"900",color:"#155e75",textAlign:"center",marginBottom:"9px"}}>
                📦 RECIBIDA · Este pedido está cargado y listo para entrar en la ruta.
              </div>
              <button onClick={()=>devolverAAsignada(activa)} style={{...boton,width:"100%",background:"#64748b",color:"#fff",fontSize:"13px"}}>
                ↩️ DEVOLVER A ASIGNADAS
              </button>
            </div>
          ) : activa.estado === "entregado" ? (
            <div style={{background:"#dcfce7",border:"1px solid #86efac",borderRadius:"10px",padding:"12px",fontWeight:"900",color:"#166534",textAlign:"center"}}>
              ✅ ENTREGA COMPLETADA
            </div>
          ) : activa.estado === "no_entregado" ? (
            <div>
              <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:"10px",padding:"12px",fontWeight:"900",color:"#991b1b",textAlign:"center",marginBottom:"9px"}}>
                ❌ NO ENTREGADA
                {activa.motivo_no_entrega ? <div style={{fontSize:"12px",fontWeight:"700",marginTop:"5px"}}>{activa.motivo_no_entrega}</div> : null}
              </div>
              {!jornadaActiva && (
                <button onClick={()=>informarDevolucion(activa)} style={{...boton,width:"100%",background:"#0f766e",color:"#fff",fontSize:"14px"}}>
                  📦 DEVOLVÍ MERCADERÍA NO ENTREGADA
                </button>
              )}
              {jornadaActiva && (
                <div style={{fontSize:"11px",color:"#64748b",textAlign:"center"}}>
                  Finalizá el reparto cuando regreses al depósito para informar la devolución.
                </div>
              )}
            </div>
          ) : activa.estado === "devolucion_informada" ? (
            <div style={{background:"#fff7ed",border:"1px solid #fdba74",borderRadius:"10px",padding:"12px",fontWeight:"900",color:"#9a3412",textAlign:"center"}}>
              📦 DEVOLUCIÓN INFORMADA
              <div style={{fontSize:"12px",fontWeight:"700",marginTop:"5px"}}>Pendiente de recepción por Depósito.</div>
            </div>
          ) : activa.estado === "reintentar" ? (
            <div>
              <div style={{background:"#fff7ed",border:"1px solid #fdba74",borderRadius:"10px",padding:"12px",fontWeight:"900",color:"#9a3412",textAlign:"center",marginBottom:"9px"}}>
                🕐 PASAR MÁS TARDE
                {activa.observaciones ? <div style={{fontSize:"12px",fontWeight:"700",marginTop:"5px"}}>{activa.observaciones}</div> : null}
              </div>
              <div style={{display:"grid",gap:"8px"}}>
                <button onClick={()=>irAlProximoDestino(activa)} style={{...boton,width:"100%",background:"#2563eb",color:"#fff",fontSize:"14px"}}>
                  🚚 IR AL PRÓXIMO DESTINO
                </button>
                <button onClick={()=>retomarEntrega(activa)} style={{...boton,width:"100%",background:"#64748b",color:"#fff",fontSize:"14px"}}>
                  🔄 REINTENTAR ENTREGA
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{background:"#dcfce7",border:"1px solid #86efac",borderRadius:"10px",padding:"12px",fontWeight:"900",color:"#166534",textAlign:"center",marginBottom:"9px"}}>
                🚚 REPARTO EN CURSO
              </div>

              <div style={{display:"grid",gap:"8px"}}>
                <button onClick={()=>navegarEntrega(activa)} style={{...boton,width:"100%",background:"#2563eb",color:"#fff",fontSize:"14px"}}>
                  📍 NAVEGAR
                </button>

                <button onClick={()=>marcarEntregada(activa)} style={{...boton,width:"100%",background:"#16a34a",color:"#fff",fontSize:"14px"}}>
                  ✅ ENTREGADA
                </button>

                <button onClick={()=>pasarMasTarde(activa)} style={{...boton,width:"100%",background:"#f59e0b",color:"#fff",fontSize:"14px"}}>
                  🕐 PASAR MÁS TARDE
                </button>

                <button onClick={()=>marcarNoEntregada(activa)} style={{...boton,width:"100%",background:"#dc2626",color:"#fff",fontSize:"14px"}}>
                  ❌ NO ENTREGADA
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"Arial,sans-serif",color:"#0f172a"}}>
      <header style={{background:"#0f172a",color:"#fff",padding:"12px 14px"}}>
        <div style={{maxWidth:"760px",margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:"20px",fontWeight:"950"}}>🚚 RutaComercio · Repartos</div>
            <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"2px"}}>{perfil?.nombre || "Repartidor"} · Mis entregas</div>
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            {onVolver && <button onClick={onVolver} style={{...boton,background:"#1e293b",color:"#fff",border:"1px solid #64748b"}}>← VOLVER</button>}
            <button onClick={salir} style={{...boton,background:"#1e293b",color:"#fff",border:"1px solid #64748b"}}>SALIR</button>
          </div>
        </div>
      </header>

      <main style={{maxWidth:"760px",margin:"0 auto",padding:"14px"}}>
        <div style={{marginBottom:"12px",background:"#fff",border:"1px solid #cbd5e1",borderRadius:"11px",padding:"10px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <button type="button"
              onClick={jornadaActiva ? finalizarJornada : comenzarJornada}
              disabled={procesandoJornada || (!jornadaActiva && recibidas.length===0)}
              style={{...boton,width:"100%",padding:"8px 5px",fontSize:"12px",
                background:procesandoJornada||(!jornadaActiva&&recibidas.length===0)?"#94a3b8":jornadaActiva?"#0f172a":"#2563eb",
                color:"#fff"}}>
              {procesandoJornada?"⏳ PROCESANDO":jornadaActiva?"🏁 FINALIZAR REPARTO":"🚚 COMENZAR REPARTO"}
            </button>
            <button type="button" onClick={()=>setChatAbierto(v=>!v)}
              style={{...boton,width:"100%",padding:"8px 5px",fontSize:"12px",background:"#166534",color:"#fff"}}>
              💬 RUTACHAT {chatAbierto?"▲":"▼"}
            </button>
          </div>
          {chatAbierto && (
            <div style={{paddingTop:"10px"}}>
              <div style={{fontSize:"12px",fontWeight:"800",marginBottom:"6px"}}>Mensajes al Supervisor</div>
              <select value={chatDestino} onChange={e=>setChatDestino(e.target.value)}
                style={{width:"100%",padding:"10px",borderRadius:"8px",border:"1px solid #cbd5e1"}}>
                {!chatContactos.length && <option value="">No hay supervisores disponibles</option>}
                {chatContactos.map(c=><option key={c.id} value={c.id}>{c.nombre||"Supervisor"}</option>)}
              </select>
              {chatError && <div style={{color:"#b91c1c",fontSize:"12px",marginTop:"8px"}}>⚠️ {chatError}</div>}
              <div style={{maxHeight:"230px",overflowY:"auto",background:"#f8fafc",borderRadius:"8px",padding:"8px",marginTop:"8px"}}>
                {!conversacionChat.length && <div style={{fontSize:"12px",color:"#64748b"}}>Todavía no hay mensajes.</div>}
                {conversacionChat.map(m=><div key={m.id} style={{marginBottom:"8px",textAlign:m.remitente_id===miIdChat?"right":"left"}}>
                  <div style={{display:"inline-block",maxWidth:"90%",background:m.remitente_id===miIdChat?"#dcfce7":"#e2e8f0",padding:"8px",borderRadius:"8px",fontSize:"12px",overflowWrap:"anywhere"}}>
                    {m.contenido}
                    <div style={{fontSize:"10px",color:"#64748b",marginTop:"3px"}}>{new Date(m.creado_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>)}
              </div>
              <textarea value={chatTexto} onChange={e=>setChatTexto(e.target.value)} rows={2}
                placeholder="Escribí un mensaje..." style={{width:"100%",boxSizing:"border-box",marginTop:"8px",padding:"9px",border:"1px solid #cbd5e1",borderRadius:"8px"}} />
              <button type="button" onClick={enviarChat} disabled={!chatDestino||!chatTexto.trim()||chatEnviando}
                style={{...boton,width:"100%",background:"#166534",color:"#fff",opacity:!chatDestino||!chatTexto.trim()?.5:1}}>
                {chatEnviando?"Enviando...":"ENVIAR MENSAJE"}
              </button>
            </div>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:"8px",marginBottom:"12px"}}>
          <div style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:"10px",padding:"11px",textAlign:"center"}}>
            <div style={{fontSize:"10px",fontWeight:"900",color:"#64748b"}}>ASIGNADAS</div>
            <div style={{fontSize:"25px",fontWeight:"950"}}>{asignadasMostradas}</div>
          </div>
          <div style={{background:"#ecfeff",border:"1px solid #67e8f9",borderRadius:"10px",padding:"11px",textAlign:"center"}}>
            <div style={{fontSize:"10px",fontWeight:"900",color:"#155e75"}}>RECIBIDAS</div>
            <div style={{fontSize:"25px",fontWeight:"950",color:"#155e75"}}>{recibidasMostradas}</div>
          </div>
          <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:"10px",padding:"11px",textAlign:"center"}}>
            <div style={{fontSize:"10px",fontWeight:"900",color:"#166534"}}>ENTREGADAS</div>
            <div style={{fontSize:"25px",fontWeight:"950",color:"#166534"}}>{jornadaActiva && resumenSalida
              ? `${entregadasEstaSalida} de ${totalSalidaMostrado}`
              : entregadas.length}</div>
          </div>
          <div style={{background:"#fff7ed",border:"1px solid #fdba74",borderRadius:"10px",padding:"11px",textAlign:"center"}}>
            <div style={{fontSize:"10px",fontWeight:"900",color:"#9a3412"}}>VOLVER</div>
            <div style={{fontSize:"25px",fontWeight:"950",color:"#9a3412"}}>{paraVolver.length}</div>
          </div>
        </div>

        {!cargando && !error && !jornadaActiva && asignadas.length > 0 && (
          <div style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:"11px",padding:"12px",marginBottom:"12px"}}>
            <button type="button" onClick={() => setMapaAsignadasAbierto(v => !v)}
              style={{...boton,width:"100%",background:"#eff6ff",color:"#1e40af",border:"1px solid #93c5fd"}}>
              🗺️ {mapaAsignadasAbierto ? "OCULTAR MAPA DE ENTREGAS ▲" : "VER MAPA DE ENTREGAS ▼"}
            </button>
            {mapaAsignadasAbierto && (
              <div style={{marginTop:"10px"}}>
                <div style={{fontSize:"11px",color:"#475569",marginBottom:"8px"}}>
                  Vista previa de {asignadas.length} entrega/s asignada/s. No inicia el reparto ni modifica el orden.
                </div>
                {destinosAsignados.length > 0 ? (
                  <>
                    <div style={{height:"320px",borderRadius:"10px",overflow:"hidden",border:"1px solid #cbd5e1"}}>
                      <MapContainer center={[destinosAsignados[0].latitud,destinosAsignados[0].longitud]}
                        zoom={14} style={{height:"100%",width:"100%"}} scrollWheelZoom={true}>
                        <TileLayer attribution="&copy; OpenStreetMap contributors"
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <AjustarMapa puntos={puntosAsignados} />
                        {destinosAsignados.map(e => (
                          <Marker key={e.id} position={[e.latitud,e.longitud]} icon={iconoNumero(e.numeroParada)}>
                            <Popup>
                              <strong>{e.cliente}</strong>
                              <div>{e.direccion}</div>
                              <div>{tituloEntrega(e)}</div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                    {destinosAsignados.length < asignadas.length && (
                      <div style={{fontSize:"11px",color:"#92400e",marginTop:"8px"}}>
                        ⚠️ {asignadas.length - destinosAsignados.length} entrega/s sin coordenadas no aparecen en el mapa.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{padding:"12px",background:"#fff7ed",borderRadius:"9px",fontSize:"12px"}}>
                    Las entregas asignadas no tienen coordenadas guardadas. Consultá al Supervisor para corregir la ubicación.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!cargando && !error && !jornadaActiva && asignadas.length > 0 && (
          <div style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:"11px",padding:"12px",marginBottom:"12px"}}>
            <div style={{fontSize:"13px",fontWeight:"950",marginBottom:"5px"}}>🧭 ORGANIZAR MI RUTA</div>
            <div style={{fontSize:"11px",color:"#64748b",marginBottom:"9px"}}>
              Arrastrá los destinos desde ☰ o usá las flechas. El mapa mostrará los números en ese orden.
              Esto no cambia las asignaciones del Supervisor.
            </div>
            <div style={{display:"grid",gap:"7px"}}>
              {asignadasOrdenadas.map((e,idx) => (
                <div key={e.id} data-ruta-entrega={e.id} draggable
                  onDragStart={ev=>{setArrastrandoId(e.id);ev.dataTransfer.effectAllowed="move";ev.dataTransfer.setData("text/plain",e.id);}}
                  onDragOver={ev=>ev.preventDefault()}
                  onDrop={ev=>{ev.preventDefault();moverEnRuta(arrastrandoId||ev.dataTransfer.getData("text/plain"),e.id);setArrastrandoId(null);}}
                  onDragEnd={()=>setArrastrandoId(null)}
                  style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px",border:"1px solid #e2e8f0",borderRadius:"8px",
                    cursor:"grab",background:arrastrandoId===e.id?"#dbeafe":"#fff"}}>
                  <span title="Arrastrar destino" onPointerDown={ev=>iniciarArrastreTactil(ev,e.id)} onPointerUp={terminarArrastreTactil} onPointerCancel={cancelarArrastreTactil} style={{fontSize:"20px",color:"#64748b",cursor:"grab",touchAction:"none",userSelect:"none",padding:"8px 3px"}}>☰</span>
                  <strong style={{minWidth:"22px"}}>{idx+1}</strong>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"12px",fontWeight:"800"}}>{e.cliente}</div>
                    <div style={{fontSize:"10px",color:"#64748b"}}>{e.direccion}</div>
                  </div>
                  <button type="button" disabled={idx===0} onClick={()=>moverEnRuta(e.id,asignadasOrdenadas[idx-1].id)}
                    style={{...boton,minHeight:"34px",background:"#e2e8f0",opacity:idx===0?.4:1}}>↑</button>
                  <button type="button" disabled={idx===asignadasOrdenadas.length-1} onClick={()=>moverEnRuta(e.id,asignadasOrdenadas[idx+1].id)}
                    style={{...boton,minHeight:"34px",background:"#e2e8f0",opacity:idx===asignadasOrdenadas.length-1?.4:1}}>↓</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={guardarOrdenRuta}
              style={{...boton,width:"100%",marginTop:"10px",background:rutaGuardada?"#166534":"#2563eb",color:"#fff"}}>
              {rutaGuardada ? "✅ RUTA GUARDADA" : "💾 GUARDAR ESTA RUTA"}
            </button>
            <div style={{fontSize:"10px",color:"#64748b",marginTop:"6px",textAlign:"center"}}>
              Se conserva en este dispositivo al actualizar la página. No modifica las asignaciones.
            </div>
          </div>
        )}

        {!cargando && !error && !jornadaActiva && recibidas.length > 0 && (
          <div style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:"11px",padding:"12px",marginBottom:"12px"}}>
            <div style={{fontSize:"13px",fontWeight:"950",marginBottom:"4px"}}>🗺️ ORGANIZAR RUTA</div>
            <div style={{fontSize:"10px",color:"#64748b",marginBottom:"10px"}}>
              Arrastrá las entregas para definir el orden del recorrido.
            </div>

            <div style={{display:"grid",gap:"7px"}}>
              {recibidasOrdenadas.map((e, idx) => (
                <div
                  key={e.id}
                  data-ruta-entrega={e.id}
                  draggable
                  onDragStart={() => setArrastrandoId(e.id)}
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={() => {
                    moverEnRuta(arrastrandoId, e.id);
                    setArrastrandoId(null);
                  }}
                  onDragEnd={() => setArrastrandoId(null)}
                  style={{
                    display:"grid",
                    gridTemplateColumns:"34px 28px 1fr 66px",
                    alignItems:"center",
                    gap:"7px",
                    border:"1px solid #cbd5e1",
                    borderRadius:"9px",
                    padding:"9px",
                    background: arrastrandoId===e.id ? "#f1f5f9" : "#fff",
                    cursor:"grab"
                  }}
                >
                  <div style={{fontSize:"18px",fontWeight:"950",textAlign:"center"}}>{idx+1}</div>
                  <div onPointerDown={ev=>iniciarArrastreTactil(ev,e.id)} onPointerUp={terminarArrastreTactil} onPointerCancel={cancelarArrastreTactil} style={{fontSize:"18px",color:"#64748b",textAlign:"center",touchAction:"none",userSelect:"none",padding:"8px 0",cursor:"grab"}}>☰</div>
                  <div>
                    <div style={{fontSize:"12px",fontWeight:"900"}}>{tituloEntrega(e)} · {e.cliente}</div>
                    <div style={{fontSize:"10px",color:"#64748b",marginTop:"3px"}}>📍 {e.direccion || "Sin dirección"}</div>
                  </div>
                  <div style={{display:"flex",gap:"4px",justifyContent:"flex-end"}}>
                    <button
                      type="button"
                      disabled={idx===0}
                      onClick={(ev)=>{
                        ev.stopPropagation();
                        if (idx===0) return;
                        setOrdenRuta(prev=>{
                          const n=[...prev];
                          [n[idx-1],n[idx]]=[n[idx],n[idx-1]];
                          return n;
                        });
                      }}
                      style={{border:"1px solid #cbd5e1",background:"#fff",borderRadius:"7px",width:"30px",height:"32px",fontWeight:"900",cursor:idx===0?"default":"pointer",opacity:idx===0?.35:1}}
                    >↑</button>
                    <button
                      type="button"
                      disabled={idx===recibidasOrdenadas.length-1}
                      onClick={(ev)=>{
                        ev.stopPropagation();
                        if (idx===recibidasOrdenadas.length-1) return;
                        setOrdenRuta(prev=>{
                          const n=[...prev];
                          [n[idx],n[idx+1]]=[n[idx+1],n[idx]];
                          return n;
                        });
                      }}
                      style={{border:"1px solid #cbd5e1",background:"#fff",borderRadius:"7px",width:"30px",height:"32px",fontWeight:"900",cursor:idx===recibidasOrdenadas.length-1?"default":"pointer",opacity:idx===recibidasOrdenadas.length-1?.35:1}}
                    >↓</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!cargando && !error && !jornadaActiva && recibidas.length > 0 && (
          <div style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:"11px",padding:"12px",marginBottom:"12px"}}>
            <div style={{fontSize:"13px",fontWeight:"950",marginBottom:"8px"}}>📍 MAPA DE LA RUTA</div>

            {paradasConCoordenadas.length > 0 ? (
              <>
                <div style={{height:"320px",borderRadius:"10px",overflow:"hidden",border:"1px solid #cbd5e1"}}>
                  <MapContainer
                    center={[paradasConCoordenadas[0].latitud, paradasConCoordenadas[0].longitud]}
                    zoom={14}
                    style={{height:"100%",width:"100%"}}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <AjustarMapa puntos={puntosRuta} />
                    {puntosRuta.length > 1 && (
                      <Polyline positions={puntosRuta} pathOptions={{weight:4,opacity:.65}} />
                    )}
                    {paradasConCoordenadas.map(e => (
                      <Marker
                        key={e.id}
                        position={[e.latitud,e.longitud]}
                        icon={iconoNumero(e.numeroParada)}
                      >
                        <Popup>
                          <div style={{fontFamily:"Arial,sans-serif"}}>
                            <div style={{fontWeight:"900"}}>Parada {e.numeroParada} · {e.cliente}</div>
                            <div style={{fontSize:"12px",marginTop:"4px"}}>{tituloEntrega(e)}</div>
                            <div style={{fontSize:"12px",marginTop:"4px"}}>{e.direccion}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
                {paradasConCoordenadas.length < recibidasOrdenadas.length && (
                  <div style={{fontSize:"10px",color:"#92400e",marginTop:"7px"}}>
                    ⚠️ {recibidasOrdenadas.length - paradasConCoordenadas.length} entrega/s no tienen coordenadas guardadas y no pueden mostrarse todavía en el mapa.
                  </div>
                )}
              </>
            ) : (
              <div style={{padding:"14px",background:"#fff7ed",border:"1px solid #fdba74",borderRadius:"9px",fontSize:"12px",color:"#9a3412"}}>
                ⚠️ Las entregas recibidas todavía no tienen coordenadas guardadas en sus comercios.
              </div>
            )}
          </div>
        )}

        {!cargando && !error && jornadaActiva && mapaDuranteRuta.length > 0 && (
          <div style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:"11px",padding:"12px",marginBottom:"12px"}}>
            <div style={{fontSize:"13px",fontWeight:"950",marginBottom:"8px"}}>📍 RUTA PENDIENTE</div>
            <div style={{height:"320px",borderRadius:"10px",overflow:"hidden",border:"1px solid #cbd5e1"}}>
              <MapContainer
                center={[mapaDuranteRuta[0].latitud, mapaDuranteRuta[0].longitud]}
                zoom={14}
                style={{height:"100%",width:"100%"}}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <AjustarMapa puntos={puntosDuranteRuta} />
                {puntosDuranteRuta.length > 1 && (
                  <Polyline positions={puntosDuranteRuta} pathOptions={{weight:4,opacity:.65}} />
                )}
                {mapaDuranteRuta.map(e => (
                  <Marker
                    key={e.id}
                    position={[e.latitud,e.longitud]}
                    icon={iconoNumero(e.numeroParada)}
                  >
                    <Popup>
                      <div style={{fontFamily:"Arial,sans-serif"}}>
                        <div style={{fontWeight:"900"}}>Próxima {e.numeroParada} · {e.cliente}</div>
                        <div style={{fontSize:"12px",marginTop:"4px"}}>{tituloEntrega(e)}</div>
                        <div style={{fontSize:"12px",marginTop:"4px"}}>{e.direccion}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {!cargando && !error && jornadaActiva && proximoDestino && (
          <div style={{background:"#fff",border:"2px solid #2563eb",borderRadius:"11px",padding:"12px",marginBottom:"12px"}}>
            <div style={{fontSize:"10px",fontWeight:"950",color:"#2563eb",marginBottom:"5px"}}>
              📍 PRÓXIMO DESTINO
            </div>
            <div style={{fontSize:"16px",fontWeight:"950"}}>
              {proximoDestino.cliente}
            </div>
            <div style={{fontSize:"11px",color:"#64748b",marginTop:"4px"}}>
              {tituloEntrega(proximoDestino)} · {proximoDestino.direccion || "Sin dirección"}
            </div>
            <button
              type="button"
              onClick={()=>navegarEntrega(proximoDestino)}
              style={{...boton,width:"100%",background:"#2563eb",color:"#fff",fontSize:"14px",marginTop:"10px"}}
            >
              📍 NAVEGAR AL PRÓXIMO DESTINO
            </button>
          </div>
        )}


        {cargando ? (
          <div style={{textAlign:"center",padding:"40px",color:"#64748b"}}>⏳ Cargando entregas...</div>
        ) : error ? (
          <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:"10px",padding:"14px",color:"#991b1b"}}>❌ {error}</div>
        ) : entregas.length === 0 ? (
          <div style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:"10px",padding:"30px",textAlign:"center",color:"#64748b"}}>
            No tenés entregas asignadas.
          </div>
        ) : (
          <div style={{display:"grid",gap:"9px"}}>
            {entregasOrdenadasPantalla.map(e=>(
              <button key={e.id} onClick={()=>setActiva(e)} style={{width:"100%",textAlign:"left",background:"#fff",border:"1px solid #cbd5e1",borderRadius:"11px",padding:"12px",cursor:"pointer",color:"#0f172a"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:"10px"}}>
                  <div>
                    <div style={{fontWeight:"950"}}>🧾 {tituloEntrega(e)} · {e.cliente}</div>
                    <div style={{fontSize:"11px",color:"#64748b",marginTop:"4px"}}>📍 {e.direccion || "Sin dirección cargada"}</div>
                    <div style={{fontSize:"11px",color:"#64748b",marginTop:"4px"}}>
                      📅 {e.fecha_programada || "Sin fecha"} · 📦 {e.bultos ?? "—"} bulto/s
                    </div>
                  </div>
                  <div style={{fontSize:"10px",fontWeight:"900",whiteSpace:"nowrap",
                    color:e.estado==="reintentar"?"#9a3412":e.estado==="entregado"?"#166534":e.estado==="no_entregado"?"#991b1b":e.estado==="devolucion_informada"?"#9a3412":e.estado==="recibido"?"#155e75":e.estado==="en_reparto"?"#166534":"#1d4ed8"}}>
                    {e.estado==="reintentar" ? "🕐 VOLVER" :
                     e.estado==="entregado" ? "✅ ENTREGADA" :
                     e.estado==="no_entregado" ? "❌ NO ENTREGADA" :
                     e.estado==="devolucion_informada" ? "📦 DEVOLUCIÓN INFORMADA" :
                     e.estado==="recibido" ? "📦 RECIBIDA" :
                     e.estado==="en_reparto" ? "🚚 EN REPARTO" : "📋 ASIGNADA"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
