import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const iconoLocal = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function SelectorUbicacion({ posicion, onElegir }) {
  useMapEvents({ click: (e) => onElegir([e.latlng.lat, e.latlng.lng]) });
  return posicion ? <Marker position={posicion} icon={iconoLocal} draggable
    eventHandlers={{ dragend: e => { const p = e.target.getLatLng(); onElegir([p.lat, p.lng]); } }} /> : null;
}
function CentrarMapa({ posicion }) {
  const mapa = useMap();
  useEffect(() => { if (posicion) mapa.setView(posicion, Math.max(mapa.getZoom(), 14)); }, [mapa, posicion?.[0], posicion?.[1]]);
  return null;
}

// RutaComercios Express: pedidos persistidos por empresa en Supabase.
// RLS de Supabase es la autoridad final para leer y escribir.
const colores = { fondo: "#0f172a", tarjeta: "#1e293b", borde: "#334155", texto: "#f8fafc", suave: "#cbd5e1" };
const campo = { width: "100%", boxSizing: "border-box", padding: "13px", borderRadius: 10, border: `1px solid ${colores.borde}`, background: "#0b1220", color: "white", fontSize: 16 };
const boton = { border: 0, borderRadius: 10, padding: "13px 17px", fontWeight: 800, fontSize: 15, cursor: "pointer" };
const normalizarTelefono = (valor) => String(valor || "").replace(/\D/g, "");
const dinero = (n) => Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

const distanciaKm = (a, b, c, d) => {
  const rad = Math.PI / 180;
  const deltaLat = (c - a) * rad, deltaLon = (d - b) * rad;
  const x = Math.sin(deltaLat / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export default function RepartosExpress() {
  const salirExpress = async () => {
    if (!window.confirm("¿Querés salir de RutaComercios Express?")) return;
    const { error } = await supabase.auth.signOut();
    if (error) { window.alert(`No se pudo cerrar sesión: ${error.message}`); return; }
    window.location.replace("/");
  };

  const [pedidos, setPedidos] = useState([]);
  const [auditoriasGps, setAuditoriasGps] = useState({});
  const [identidad, setIdentidad] = useState(null);
  const [esAdminExpress, setEsAdminExpress] = useState(false);
  // Sucursal operativa; null mantiene compatibilidad con empresas sin sucursales.
  const sucursalOperativaRef = useRef(null);
  const sucursalesActivasRef = useRef(0);
  const [nombreSucursalOperativa, setNombreSucursalOperativa] = useState("");

  const [turnoActual, setTurnoActual] = useState(null);
  const [cargandoTurno, setCargandoTurno] = useState(false);
  const [operandoTurno, setOperandoTurno] = useState(false);
  const [turnosDisponibles, setTurnosDisponibles] = useState([]);
  const [nombresSupervisores, setNombresSupervisores] = useState({});
  const [turnosHistoricos, setTurnosHistoricos] = useState({});
  const [herenciasPendientes, setHerenciasPendientes] = useState([]);
  const [destinosHerencia, setDestinosHerencia] = useState({});
  const [operacionHerencia, setOperacionHerencia] = useState(null);
  const [errorHerencia, setErrorHerencia] = useState("");
  const [cargandoHerencias, setCargandoHerencias] = useState(false);
  const [avisoHerencia, setAvisoHerencia] = useState("");
  const [errorTurno, setErrorTurno] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [errorPantalla, setErrorPantalla] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [coincidencias, setCoincidencias] = useState([]);
  const [direccionesGuardadas, setDireccionesGuardadas] = useState([]);
  const [direccionElegida, setDireccionElegida] = useState("nueva");
  const [etiquetaDireccion, setEtiquetaDireccion] = useState("");
  const [indicacionesDireccion, setIndicacionesDireccion] = useState("");
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [avisoCliente, setAvisoCliente] = useState("");
  const busquedaActual = useRef(0);
  const [total, setTotal] = useState("");
  const [notas, setNotas] = useState("");
  const [pago, setPago] = useState("efectivo_repartidor");
  const [filtro, setFiltro] = useState("todos");
  const [repartidorSeleccionado, setRepartidorSeleccionado] = useState("todos");
  const [vista, setVista] = useState("pedidos");
  const [repartidores, setRepartidores] = useState([]);
  const [borradores, setBorradores] = useState({});
  const [viajes, setViajes] = useState([]);
  const [jornadas, setJornadas] = useState({});
  const [asignacionMovil, setAsignacionMovil] = useState({});
  const [arrastrando, setArrastrando] = useState(null);
  const [cargandoRepartidores, setCargandoRepartidores] = useState(false);
  const [saldosExpress, setSaldosExpress] = useState([]);
  const [errorSaldosExpress, setErrorSaldosExpress] = useState("");
  const [saldosVerificados, setSaldosVerificados] = useState(false);
  const [repartidorRendicion, setRepartidorRendicion] = useState("todos");
  const [devolucionesExpress, setDevolucionesExpress] = useState([]);
  const [historialDinero, setHistorialDinero] = useState([]);
  const [historialDevoluciones, setHistorialDevoluciones] = useState([]);
  const [verHistorialDinero, setVerHistorialDinero] = useState(false);
  const [verHistorialDevoluciones, setVerHistorialDevoluciones] = useState(false);
  const [cargandoControl, setCargandoControl] = useState(false);
  const [operandoControl, setOperandoControl] = useState(false);
  const [importeRecepcion, setImporteRecepcion] = useState({});
  const [notaRecepcion, setNotaRecepcion] = useState({});
  const [devolucionesSeleccionadas, setDevolucionesSeleccionadas] = useState([]);
  const [notasDevolucion, setNotasDevolucion] = useState({});
  const [notaLoteDevolucion, setNotaLoteDevolucion] = useState("");


  const [destinoConfirmado, setDestinoConfirmado] = useState(null);
  const [opcionesDestino, setOpcionesDestino] = useState([]);
  const [buscandoDestino, setBuscandoDestino] = useState(false);
  const [avisoDestino, setAvisoDestino] = useState("");
  const [autorizarExcepcion, setAutorizarExcepcion] = useState(false);
  const [mostrarMapaDestino, setMostrarMapaDestino] = useState(false);
  const [configComercio, setConfigComercio] = useState({
    nombre_comercio: "", direccion: "", latitud: null, longitud: null, radio_entregas_km: 5
  });
  const [cargandoConfig, setCargandoConfig] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [resultadosUbicacion, setResultadosUbicacion] = useState([]);
  const [avisoConfig, setAvisoConfig] = useState("");

  const cargarConfiguracion = useCallback(async (empresaId) => {
    setCargandoConfig(true);
    try {
      const sucursalId = sucursalOperativaRef.current;
      const { data, error } = sucursalId
        ? await supabase.from("express_sucursales")
            .select("nombre,direccion,latitud,longitud,radio_entregas_km")
            .eq("empresa_id", empresaId).eq("id", sucursalId).single()
        : await supabase.from("express_configuracion")
            .select("nombre_comercio,direccion,latitud,longitud,radio_entregas_km")
            .eq("empresa_id", empresaId).maybeSingle();
      if (error) throw error;
      setConfigComercio(data ? {
        ...data, nombre_comercio: data.nombre_comercio || data.nombre || ""
      } : {
        nombre_comercio: "", direccion: "", latitud: null, longitud: null, radio_entregas_km: 5
      });
    } catch (e) { setAvisoConfig(`No se pudo leer la configuración: ${e.message}`); }
    finally { setCargandoConfig(false); }
  }, []);

  const buscarDireccionLocal = async () => {
    const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
    if (!apiKey) { setAvisoConfig("No está configurada la clave de Geoapify. Podés ubicar el local tocando el mapa."); return; }
    if (!configComercio.direccion.trim()) { setAvisoConfig("Escribí la dirección completa, incluyendo localidad y provincia."); return; }
    setBuscandoUbicacion(true); setAvisoConfig(""); setResultadosUbicacion([]);
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(configComercio.direccion)}&filter=countrycode:ar&limit=5&apiKey=${encodeURIComponent(apiKey)}`;
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error("No se pudo consultar Geoapify.");
      const json = await respuesta.json();
      const opciones = (json.features || []).map(f => ({
        nombre: f.properties.formatted, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0]
      }));
      setResultadosUbicacion(opciones);
      if (!opciones.length) setAvisoConfig("No encontramos la dirección. Ubicá el local manualmente en el mapa.");
    } catch (e) { setAvisoConfig(`Error buscando la dirección: ${e.message}`); }
    finally { setBuscandoUbicacion(false); }
  };

  // El turno comercial es independiente de la jornada del repartidor.
  const cargarTurnoActual = useCallback(async (empresaId, usuarioId) => {
    setCargandoTurno(true);
    setErrorTurno("");
    try {
      const { data, error } = await supabase.from("express_turnos_supervisores")
        .select("id,jornada_id,inicio_en,estado,sucursal_id")
        .eq("empresa_id", empresaId)
        .eq("supervisor_id", usuarioId)
        .eq("estado", "abierto")
        .maybeSingle();
      if (error) throw error;
      setTurnoActual(data || null);
      return data || null;
    } catch (e) {
      setErrorTurno(`No se pudo consultar el turno: ${e.message}`);
      setTurnoActual(null);
      return null;
    } finally {
      setCargandoTurno(false);
    }
  }, []);

  const iniciarTurnoComercial = async () => {
    if (!identidad || operandoTurno || cargandoTurno || turnoActual) return;
    setOperandoTurno(true);
    setErrorTurno("");
    try {
      const { error } = await supabase.rpc("express_iniciar_turno");
      if (error) throw error;
      const turno = await cargarTurnoActual(identidad.empresaId, identidad.usuarioId);
      if (!turno) throw new Error("Se solicitó la apertura, pero no se pudo verificar el turno. Actualizá antes de intentar otra vez.");
      setMensaje("✅ Turno iniciado. Los nuevos pedidos quedarán asociados a este turno.");
    } catch (e) {
      setErrorTurno(`No se pudo confirmar el inicio del turno: ${e.message}`);
    } finally {
      setOperandoTurno(false);
    }
  };

  const finalizarTurnoComercial = async () => {
    if (!identidad || operandoTurno || cargandoTurno || !turnoActual) return;
    if (!window.confirm(
      "¿Finalizar tu turno de supervisor?\n\n" +
      "Si tenés pedidos pendientes bajo tu responsabilidad, el sistema impedirá el cierre. " +
      "Los demás supervisores podrán seguir trabajando."
    )) return;

    setOperandoTurno(true);
    setErrorTurno("");
    setMensaje("");
    try {
      const { error } = await supabase.rpc("express_finalizar_turno");
      if (error) throw error;

      // Verificar el resultado de forma explícita: no confundir un fallo de lectura
      // con un turno cerrado, ni intentar ejecutar dos veces el cierre.
      const { data, error: errorVerificacion } = await supabase
        .from("express_turnos_supervisores")
        .select("id")
        .eq("empresa_id", identidad.empresaId)
        .eq("supervisor_id", identidad.usuarioId)
        .eq("estado", "abierto")
        .maybeSingle();
      if (errorVerificacion) {
        setErrorTurno("Se solicitó el cierre, pero no se pudo verificar su estado. Actualizá la pantalla antes de volver a intentarlo: " + errorVerificacion.message);
        return;
      }
      if (data) {
        setErrorTurno("Se solicitó el cierre, pero todavía figura un turno abierto. Actualizá la pantalla antes de volver a intentarlo.");
        return;
      }
      setTurnoActual(null);
      setMensaje("✅ Tu turno de supervisor finalizó correctamente.");
    } catch (e) {
      setErrorTurno(`No se pudo finalizar el turno: ${e.message}`);
    } finally {
      setOperandoTurno(false);
    }
  };

  // Consultas acotadas a la vista de cierre, sin agregar polling a Supabase.
  const cargarHerencias = async () => {
    if (!identidad) return;
    setCargandoHerencias(true);
    setErrorHerencia("");
    try {
      const [t, h] = await Promise.all([
        supabase.from("express_turnos_supervisores")
          .select("id,supervisor_id,estado,inicio_en,sucursal_id")
          .eq("empresa_id", identidad.empresaId).eq("estado", "abierto"),
        supabase.from("express_herencias")
          .select("id,pedido_id,turno_origen_id,turno_destino_id,estado,creada_en")
          .eq("empresa_id", identidad.empresaId).eq("estado", "pendiente")
      ]);
      if (t.error) throw t.error;
      if (h.error) throw h.error;
      const sucursal = sucursalOperativaRef.current;
      // La sucursal habitual del personal se administra en SuperAdmin.
      // Si un turno antiguo no tiene sucursal_id, comprobar su asignación vigente;
      // nunca incluir turnos que tengan otra sucursal explícita.
      let turnosLocales = t.data || [];
      if (sucursal) {
        const sinSucursal = turnosLocales.filter(x => !x.sucursal_id);
        let asignados = new Set();
        if (sinSucursal.length) {
          const { data: asignaciones, error: ea } = await supabase
            .from("express_personal_sucursales")
            .select("perfil_id")
            .eq("empresa_id", identidad.empresaId)
            .eq("sucursal_id", sucursal)
            .in("perfil_id", [...new Set(sinSucursal.map(x => x.supervisor_id))]);
          if (ea) throw ea;
          asignados = new Set((asignaciones || []).map(x => x.perfil_id));
        }
        turnosLocales = turnosLocales.filter(x =>
          x.sucursal_id === sucursal || (!x.sucursal_id && asignados.has(x.supervisor_id))
        );
      }
      setTurnosDisponibles(turnosLocales);
      const ids = [...new Set(turnosLocales.map(x => x.supervisor_id))];
      if (ids.length) {
        const { data: perfiles, error: ep } = await supabase.from("perfiles")
          .select("id,nombre").eq("empresa_id", identidad.empresaId).in("id", ids);
        if (ep) throw ep;
        setNombresSupervisores(prev => ({ ...prev, ...Object.fromEntries((perfiles || []).map(x => [x.id, x.nombre])) }));
      }
      setHerenciasPendientes(sucursal
        ? (h.data || []).filter(x => turnosLocales.some(t => t.id === x.turno_destino_id || t.id === x.turno_origen_id))
        : (h.data || []));
    } catch (e) { setErrorHerencia(`No se pudieron consultar las transferencias: ${e.message}`); }
    finally { setCargandoHerencias(false); }
  };

  // Al entrar directamente a Ver pedidos, cargar también los turnos destinatarios.
  // La consulta es puntual, sin polling adicional.
  useEffect(() => {
    if (identidad?.empresaId) cargarHerencias();
  }, [identidad?.empresaId, identidad?.usuarioId]);

  // Resolver nombres de turnos históricos (incluidos los ya cerrados).
  // Solo consulta al cambiar los IDs de turno presentes en los pedidos;
  // no agrega consultas a cada refresco automático de 15 segundos.
  const idsTurnosEnPedidos = useMemo(() => [...new Set(
    pedidos.flatMap(p => [p.turnoOrigenId, p.turnoResponsableId]).filter(Boolean)
  )].sort().join(","), [pedidos]);
  useEffect(() => {
    if (!identidad?.empresaId || !idsTurnosEnPedidos) return;
    let activo = true;
    (async () => {
      try {
        const ids = idsTurnosEnPedidos.split(",");
        const { data: turnos, error: et } = await supabase.from("express_turnos_supervisores")
          .select("id,supervisor_id").eq("empresa_id", identidad.empresaId).in("id", ids);
        if (et) throw et;
        const supervisores = [...new Set((turnos || []).map(t => t.supervisor_id))];
        let nombres = {};
        if (supervisores.length) {
          const { data: perfiles, error: ep } = await supabase.from("perfiles")
            .select("id,nombre").eq("empresa_id", identidad.empresaId).in("id", supervisores);
          if (ep) throw ep;
          nombres = Object.fromEntries((perfiles || []).map(p => [p.id, p.nombre]));
        }
        if (activo) {
          setTurnosHistoricos(prev => ({ ...prev, ...Object.fromEntries((turnos || []).map(t => [t.id, t.supervisor_id])) }));
          setNombresSupervisores(prev => ({ ...prev, ...nombres }));
        }
      } catch (error) { console.warn("No se pudieron resolver los nombres históricos de supervisores:", error); }
    })();
    return () => { activo = false; };
  }, [identidad?.empresaId, idsTurnosEnPedidos]);

  const ejecutarHerencia = async (accion, id, numero) => {
    if (operacionHerencia || !identidad) return;
    if (accion === "ofrecer" && !destinosHerencia[id]) {
      setErrorHerencia("Elegí primero el supervisor que recibirá el pedido."); return;
    }
    if (!window.confirm(accion === "ofrecer"
      ? `¿Ofrecer el pedido ${numero} al supervisor seleccionado? El pedido seguirá bajo tu responsabilidad hasta que lo acepte.`
      : `¿Aceptar el pedido ${numero}? Pasará a ser responsabilidad de tu turno.`)) return;
    setOperacionHerencia(id); setErrorHerencia(""); setAvisoHerencia("");
    try {
      const { error } = accion === "ofrecer"
        ? await supabase.rpc("express_ofrecer_herencia", { p_pedido_id: id, p_turno_destino_id: destinosHerencia[id] })
        : await supabase.rpc("express_aceptar_herencia", { p_herencia_id: id });
      if (error) throw error;
      await Promise.all([cargarPedidos(identidad.empresaId), cargarHerencias()]);
      setAvisoHerencia(accion === "ofrecer" ? "✓ Transferencia ofrecida. Falta la aceptación del otro supervisor." : "✓ Pedido recibido y asignado a tu turno.");
    } catch (e) { setErrorHerencia(`No se pudo completar la operación: ${e.message}`); }
    finally { setOperacionHerencia(null); }
  };

  // Indicadores operativos: pedidos bajo responsabilidad ACTUAL del turno.
  // El origen histórico de cada pedido se conserva en turnoOrigenId.
  const pedidosDelTurno = useMemo(() =>
    turnoActual?.id ? pedidos.filter(p => p.turnoResponsableId === turnoActual.id) : [],
    [pedidos, turnoActual?.id]
  );
  const resumen = useMemo(() => ({
    total: pedidosDelTurno.length,
    preparando: pedidosDelTurno.filter(p => p.estado === "preparando").length,
    listos: pedidosDelTurno.filter(p => p.estado === "listo").length,
    enCamino: pedidosDelTurno.filter(p => p.estado === "en_camino").length,
    entregados: pedidosDelTurno.filter(p => p.estado === "entregado").length,
  }), [pedidosDelTurno]);

  const cargarPedidos = useCallback(async (empresaId) => {
    let consulta = supabase
      .from("express_pedidos")
      .select("id, numero_express, cliente_nombre, direccion, telefono, notas, detalle, importe_total, modalidad_cobro, estado, creado_en, entregado_en, turno_origen_id, turno_responsable_id")
      .eq("empresa_id", empresaId);
    if (sucursalOperativaRef.current) consulta = consulta.eq("sucursal_id", sucursalOperativaRef.current);
    const { data, error } = await consulta.order("creado_en", { ascending: false }).limit(500);
    if (error) throw error;
    // Auditoría de proximidad: lectura independiente para no interrumpir pedidos si falla GPS.
    const idsFinalizados = (data || []).filter(p => ["entregado", "no_entregado"].includes(p.estado)).map(p => p.id);
    if (idsFinalizados.length) {
      const { data: gps, error: errorGps } = await supabase.from("express_entregas_gps")
        .select("pedido_id,estado_gps,distancia_m,precision_m,registrado_en")
        .eq("empresa_id", empresaId).in("pedido_id", idsFinalizados)
        .order("registrado_en", { ascending: false });
      if (errorGps) {
        console.warn("Express: auditoría GPS no disponible:", errorGps.message);
        setAuditoriasGps({});
      } else {
        const porPedido = {};
        (gps || []).forEach(g => { if (!porPedido[g.pedido_id]) porPedido[g.pedido_id] = g; });
        setAuditoriasGps(porPedido);
      }
    } else setAuditoriasGps({});
    setPedidos((data || []).map(p => ({
      id: p.id,
      numero: `EX-${String(p.numero_express).padStart(6, "0")}`,
      nombre: p.cliente_nombre,
      direccion: p.direccion,
      telefono: p.telefono || "",
      notas: p.detalle || p.notas || "",
      total: p.importe_total,
      pago: p.modalidad_cobro,
      estado: p.estado,
      creado: new Date(p.creado_en).toLocaleString("es-AR"),
      entregadoEn: p.entregado_en,
      turnoOrigenId: p.turno_origen_id,
      turnoResponsableId: p.turno_responsable_id,
    })));
  }, []);

  const cargarRepartidores = useCallback(async (empresaId) => {
    setCargandoRepartidores(true);
    try {
      const { data: roles, error: errRoles } = await supabase.from("perfiles_roles")
        .select("perfil_id").eq("empresa_id", empresaId)
        .eq("rol", "express_repartidor").eq("activo", true);
      if (errRoles) throw errRoles;
      let ids = [...new Set((roles || []).map(r => r.perfil_id))];
      if (sucursalOperativaRef.current) {
        const { data: asignaciones, error: errorAsignaciones } = await supabase
          .from("express_personal_sucursales").select("perfil_id")
          .eq("empresa_id", empresaId).eq("sucursal_id", sucursalOperativaRef.current);
        if (errorAsignaciones) throw errorAsignaciones;
        const permitidos = new Set((asignaciones || []).map(a => a.perfil_id));
        ids = ids.filter(id => permitidos.has(id));
      }
      if (!ids.length) { setRepartidores([]); return; }
      const { data: perfiles, error: errPerfiles } = await supabase.from("perfiles")
        .select("id, nombre, activo").eq("empresa_id", empresaId)
        .in("id", ids).eq("activo", true);
      if (errPerfiles) throw errPerfiles;
      setRepartidores((perfiles || []).sort((a,b) => (a.nombre || "").localeCompare(b.nombre || "")));
    } catch (e) { setErrorPantalla(`No se pudieron cargar repartidores: ${e.message}`); }
    finally { setCargandoRepartidores(false); }
  }, []);

  const cargarJornadas = useCallback(async (empresaId) => {
    const { data, error } = await supabase.from("express_jornadas")
      .select("repartidor_id,estado").eq("empresa_id", empresaId);
    if (error) throw error;
    setJornadas(Object.fromEntries((data || []).map(j => [j.repartidor_id, j.estado])));
  }, []);

  const cargarViajes = useCallback(async (empresaId) => {
    let consulta = supabase.from("express_viajes")
      .select("id, repartidor_id, estado, creado_en, salida_en, sucursal_id")
      .eq("empresa_id", empresaId).in("estado", ["preparando", "en_camino", "regresando"]);
    if (sucursalOperativaRef.current) consulta = consulta.eq("sucursal_id", sucursalOperativaRef.current);
    const { data: vs, error: ev } = await consulta.order("creado_en", { ascending: false }).limit(100);
    if (ev) throw ev;
    const ids = (vs || []).map(v => v.id);
    let relaciones = [];
    if (ids.length) {
      const { data, error } = await supabase.from("express_viajes_pedidos")
        .select("viaje_id, pedido_id, orden, resultado, registrado_en").eq("empresa_id", empresaId).in("viaje_id", ids);
      if (error) throw error;
      relaciones = data || [];
    }
    setViajes((vs || []).map(v => ({ ...v, relaciones: relaciones.filter(r => r.viaje_id === v.id) })));
    const nuevos = {};
    (vs || []).filter(v => v.estado === "preparando").forEach(v => {
      nuevos[v.repartidor_id] = relaciones.filter(x => x.viaje_id === v.id)
        .sort((a,b) => a.orden - b.orden).map(x => x.pedido_id);
    });
    setBorradores(nuevos);
  }, []);

  useEffect(() => {
    let activo = true;
    const iniciar = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Iniciá sesión para acceder a Express.");
        const { data: perfil, error: perfilError } = await supabase
          .from("perfiles").select("id, empresa_id, nombre, activo")
          .eq("id", user.id).single();
        if (perfilError || !perfil?.empresa_id || perfil.activo !== true) {
          throw new Error("No se encontró un perfil activo asociado a una empresa.");
        }
        const { data: roles, error: rolesError } = await supabase
          .from("perfiles_roles").select("rol")
          .eq("perfil_id", user.id).eq("empresa_id", perfil.empresa_id)
          .eq("activo", true).in("rol", ["express_admin", "express_operador"]);
        if (rolesError) throw rolesError;
        if (!roles?.length) throw new Error("Este usuario no tiene permiso para administrar Express.");
        if (!activo) return;
        setEsAdminExpress(roles.some(r => r.rol === "express_admin"));
        const { data: sucursales, error: errorSucursales } = await supabase
          .from("express_sucursales").select("id,nombre")
          .eq("empresa_id", perfil.empresa_id).eq("activa", true);
        if (errorSucursales) throw errorSucursales;
        sucursalesActivasRef.current = (sucursales || []).length;
        let sucursalAsignada = null;
        if (sucursalesActivasRef.current > 0) {
          const { data: asignacion, error: errorAsignacion } = await supabase
            .from("express_personal_sucursales").select("sucursal_id")
            .eq("empresa_id", perfil.empresa_id).eq("perfil_id", user.id).maybeSingle();
          if (errorAsignacion) throw errorAsignacion;
          sucursalAsignada = asignacion?.sucursal_id ||
            (sucursalesActivasRef.current === 1 ? sucursales[0].id : null);
          if (!sucursalAsignada || !(sucursales || []).some(x => x.id === sucursalAsignada)) {
            throw new Error("No tenés una sucursal activa asignada. Solicitá la asignación al administrador.");
          }
        }
        sucursalOperativaRef.current = sucursalAsignada;
        setNombreSucursalOperativa((sucursales || []).find(x => x.id === sucursalAsignada)?.nombre || "");
        setIdentidad({ usuarioId: user.id, empresaId: perfil.empresa_id, nombre: perfil.nombre });
        await cargarPedidos(perfil.empresa_id);
        if (activo) await cargarTurnoActual(perfil.empresa_id, user.id);
        if (activo) await cargarConfiguracion(perfil.empresa_id);
        if (activo) await Promise.all([cargarRepartidores(perfil.empresa_id), cargarViajes(perfil.empresa_id), cargarJornadas(perfil.empresa_id)]);
      } catch (err) {
        if (activo) setErrorPantalla(err.message || "No fue posible cargar Express.");
      } finally {
        if (activo) setCargando(false);
      }
    };
    iniciar();
    return () => { activo = false; };
  }, [cargarPedidos, cargarRepartidores, cargarViajes, cargarConfiguracion, cargarJornadas, cargarTurnoActual]);

  // Actualización automática del supervisor: consulta cambios de pedidos cada 15 segundos.
  // No recarga la página ni modifica pedidos o asignaciones.
  useEffect(() => {
    if (!identidad?.empresaId) return;
    let enCurso = false;
    let activo = true;
    const intervalo = setInterval(async () => {
      if (!activo || enCurso || guardando || document.visibilityState === "hidden") return;
      enCurso = true;
      try {
        await Promise.all([cargarPedidos(identidad.empresaId), cargarViajes(identidad.empresaId)]);
      } catch (err) {
        console.warn("Express: no se pudieron actualizar los pedidos automáticamente.", err);
      } finally {
        enCurso = false;
      }
    }, 15000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [identidad?.empresaId, guardando, cargarPedidos, cargarViajes]);
  // Al regresar a la pantalla, recuperar cambios que pudieron ocurrir
  // mientras el dispositivo estaba suspendido o sin conexión.
  useEffect(() => {
    if (!identidad?.empresaId) return;
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      cargarJornadas(identidad.empresaId).catch(error => {
        console.warn("Express: no se pudieron recuperar las jornadas al volver.", error);
      });
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [identidad?.empresaId, cargarJornadas]);

  // Los pedidos siguen actualizándose automáticamente. Las jornadas solo se
  // consultan cuando Supabase informa un cambio (además de la carga inicial,
  // actualización manual y regreso a la pantalla).
  // REQUIERE que public.express_jornadas esté en supabase_realtime y RLS permita SELECT.
  useEffect(() => {
    if (!identidad?.empresaId) return;

    const canal = supabase
      .channel(`express-pedidos-y-jornadas-${identidad.empresaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "express_pedidos",
          filter: `empresa_id=eq.${identidad.empresaId}`,
        },
        () => {
          Promise.all([cargarPedidos(identidad.empresaId), cargarViajes(identidad.empresaId)]).catch((error) => {
            console.error("Error al actualizar pedidos y viajes Express:", error);
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "express_jornadas",
          filter: `empresa_id=eq.${identidad.empresaId}`,
        },
        (evento) => {
          // Realtime ya incluye el nuevo estado: no hace falta consultar toda la tabla.
          // Para DELETE o mensajes incompletos, recuperar el estado desde Supabase.
          const nueva = evento.new;
          if (evento.eventType !== "DELETE" && nueva?.repartidor_id && nueva?.estado) {
            setJornadas(actual => ({ ...actual, [nueva.repartidor_id]: nueva.estado }));
          } else {
            cargarJornadas(identidad.empresaId).catch(error => {
              console.warn("Express: no se pudo recuperar la jornada notificada.", error);
            });
          }
        }
      )
      .subscribe(status => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Express: conexión de notificaciones interrumpida:", status);
        }
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [identidad?.empresaId, cargarPedidos, cargarViajes, cargarJornadas]);
  // Búsqueda progresiva por prefijo. Solo muestra clientes de esta empresa.
  // No se cargan datos de una persona hasta que el operador la selecciona.
  useEffect(() => {
    const secuencia = ++busquedaActual.current;
    const numero = normalizarTelefono(telefono);
    setCoincidencias([]);
    setBuscandoCliente(false);
    if (!identidad || editandoId || clienteEncontrado || numero.length < 3) return;
    const timer = setTimeout(async () => {
      setBuscandoCliente(true);
      try {
        const { data, error } = await supabase.from("express_clientes")
          .select("id, nombre, telefono, telefono_normalizado")
          .eq("empresa_id", identidad.empresaId)
          .ilike("telefono_normalizado", `${numero}%`)
          .order("telefono_normalizado", { ascending: true })
          .limit(15);
        if (error) throw error;
        if (secuencia !== busquedaActual.current) return;
        setCoincidencias(data || []);
        setAvisoCliente(data?.length ? "Elegí un cliente de la lista para cargar sus direcciones." : "No hay coincidencias. Podés registrar un cliente nuevo.");
      } catch (err) {
        if (secuencia === busquedaActual.current) setAvisoCliente(`No se pudo consultar la agenda: ${err.message}`);
      } finally {
        if (secuencia === busquedaActual.current) setBuscandoCliente(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [telefono, identidad, clienteEncontrado, editandoId]);

  const cambiarTelefono = (valor) => {
    ++busquedaActual.current;
    setTelefono(valor);
    setClienteEncontrado(null);
    setCoincidencias([]);
    setDireccionesGuardadas([]);
    setDireccionElegida("nueva");
    setDireccion("");
    setNombre("");
    setEtiquetaDireccion("");
    setIndicacionesDireccion("");
    setAvisoCliente("");
    limpiarDestino();
  };

  const elegirCliente = async (cliente) => {
    limpiarDestino();
    const secuencia = ++busquedaActual.current;
    setCoincidencias([]);
    setBuscandoCliente(true);
    setAvisoCliente("");
    try {
      const { data: dirs, error } = await supabase.from("express_clientes_direcciones")
        .select("id, etiqueta, direccion, indicaciones, ultima_utilizada_en, latitud, longitud")
        .eq("empresa_id", identidad.empresaId).eq("cliente_id", cliente.id)
        .order("ultima_utilizada_en", { ascending: false, nullsFirst: false })
        .order("creado_en", { ascending: false });
      if (error) throw error;
      if (secuencia !== busquedaActual.current) return;
      setClienteEncontrado(cliente);
      setTelefono(cliente.telefono);
      setNombre(cliente.nombre);
      setDireccionesGuardadas(dirs || []);
      if (dirs?.length) {
        setDireccionElegida(dirs[0].id);
        setDireccion(dirs[0].direccion);
        setIndicacionesDireccion(dirs[0].indicaciones || "");
        if (dirs[0].latitud != null && dirs[0].longitud != null) {
          setDestinoConfirmado({ lat: Number(dirs[0].latitud), lon: Number(dirs[0].longitud) });
          setMostrarMapaDestino(true);
        }
      } else {
        setDireccionElegida("nueva");
        setDireccion("");
        setIndicacionesDireccion("");
      }
      setAvisoCliente(`✓ ${cliente.nombre} seleccionado. ${dirs?.length || 0} dirección(es) guardada(s).`);
    } catch (err) {
      if (secuencia === busquedaActual.current) setAvisoCliente(`No se pudieron cargar las direcciones: ${err.message}`);
    } finally {
      if (secuencia === busquedaActual.current) setBuscandoCliente(false);
    }
  };

  const limpiarDestino = () => {
    setDestinoConfirmado(null); setOpcionesDestino([]);
    setAvisoDestino(""); setAutorizarExcepcion(false); setMostrarMapaDestino(false);
  };

  const buscarDestino = async () => {
    if (!direccion.trim()) { setAvisoDestino("Escribí una dirección de entrega."); return; }
    if (configComercio.latitud == null || configComercio.longitud == null) {
      setAvisoDestino("El dueño debe configurar la ubicación de esta sucursal desde su panel."); return;
    }
    const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
    if (!apiKey) { setAvisoDestino("Falta configurar Geoapify."); return; }
    setBuscandoDestino(true); setAvisoDestino(""); setOpcionesDestino([]);
    try {
      const lat = Number(configComercio.latitud), lon = Number(configComercio.longitud);
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(direccion)}&filter=countrycode:ar&bias=proximity:${lon},${lat}&limit=10&apiKey=${encodeURIComponent(apiKey)}`;
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error("Geoapify no respondió correctamente.");
      const json = await respuesta.json();
      const encontrados = (json.features || []).map(f => ({
        nombre: f.properties.formatted,
        lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
        distancia: distanciaKm(lat, lon, f.geometry.coordinates[1], f.geometry.coordinates[0])
      })).sort((a, b) => a.distancia - b.distancia);
      setOpcionesDestino(encontrados);
      if (!encontrados.length) setAvisoDestino("No se encontraron coincidencias. Podés elegir el destino directamente en el mapa.");
      setMostrarMapaDestino(true);
    } catch (e) { setAvisoDestino(`Error buscando destino: ${e.message}`); }
    finally { setBuscandoDestino(false); }
  };

  const seleccionarDireccion = (id) => {
    setDireccionElegida(id);
    const encontrada = direccionesGuardadas.find(d => d.id === id);
    setDireccion(encontrada?.direccion || "");
    setIndicacionesDireccion(encontrada?.indicaciones || "");
    setEtiquetaDireccion("");
    limpiarDestino();
    if (encontrada?.latitud != null && encontrada?.longitud != null) {
      setDestinoConfirmado({ lat: Number(encontrada.latitud), lon: Number(encontrada.longitud) });
      setMostrarMapaDestino(true);
    }
  };

  const guardarClienteDireccion = async () => {
    const numero = normalizarTelefono(telefono);
    if (!numero) return null; // Se mantiene la posibilidad de pedido sin teléfono.
    if (numero.length < 6) throw new Error("El teléfono debe tener al menos 6 números para guardarse en la agenda.");
    let cliente = clienteEncontrado;
    if (!cliente) {
      const { data, error } = await supabase.from("express_clientes").upsert({
        empresa_id: identidad.empresaId, nombre: nombre.trim(),
        telefono: telefono.trim(), telefono_normalizado: numero,
        actualizado_en: new Date().toISOString(),
      }, { onConflict: "empresa_id,telefono_normalizado" }).select("id").single();
      if (error) throw error;
      cliente = data;
    } else if (cliente.nombre !== nombre.trim()) {
      const { error } = await supabase.from("express_clientes")
        .update({ nombre: nombre.trim(), actualizado_en: new Date().toISOString() })
        .eq("id", cliente.id).eq("empresa_id", identidad.empresaId);
      if (error) throw error;
    }
    const ahora = new Date().toISOString();
    if (direccionElegida !== "nueva") {
      const { error } = await supabase.from("express_clientes_direcciones")
        .update({ ultima_utilizada_en: ahora,
          ...(destinoConfirmado ? { latitud: destinoConfirmado.lat, longitud: destinoConfirmado.lon } : {}) })
        .eq("id", direccionElegida).eq("cliente_id", cliente.id).eq("empresa_id", identidad.empresaId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("express_clientes_direcciones").insert({
        empresa_id: identidad.empresaId, cliente_id: cliente.id,
        etiqueta: etiquetaDireccion.trim() || null, direccion: direccion.trim(),
        indicaciones: indicacionesDireccion.trim() || null, ultima_utilizada_en: ahora,
        latitud: destinoConfirmado?.lat ?? null, longitud: destinoConfirmado?.lon ?? null,
      });
      if (error) throw error;
    }
    return cliente.id;
  };

  const limpiarFormulario = () => {
    ++busquedaActual.current;
    setEditandoId(null); setNombre(""); setDireccion(""); setTelefono("");
    setClienteEncontrado(null); setCoincidencias([]); setDireccionesGuardadas([]);
    setDireccionElegida("nueva"); setEtiquetaDireccion(""); setIndicacionesDireccion("");
    setAvisoCliente(""); setTotal(""); setNotas(""); setPago("efectivo_repartidor");
    limpiarDestino();
  };

  const comenzarEdicion = async (pedido) => {
    if (guardando || !identidad || !["preparando", "listo"].includes(pedido.estado)) return;
    // Una transferencia aceptada quita las facultades operativas al supervisor saliente.
    if (!turnoActual?.id || pedido.turnoResponsableId !== turnoActual.id) {
      setErrorPantalla("Este pedido ya no está bajo tu responsabilidad. Solo podés consultarlo.");
      return;
    }
    setErrorPantalla(""); setMensaje("");
    limpiarFormulario();
    setEditandoId(pedido.id);
    setNombre(pedido.nombre || ""); setDireccion(pedido.direccion || "");
    setTelefono(pedido.telefono || ""); setTotal(String(pedido.total ?? ""));
    setNotas(pedido.notas || ""); setPago(pedido.pago || "efectivo_repartidor");
    // La dirección original permanece como texto del pedido hasta que el usuario elija otra.
    // No se cambia automáticamente la agenda ni se crean direcciones al editar.
    setVista("nuevo");
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    if (!identidad || guardando || !editandoId) return;
    // Segunda validación por si el pedido cambió de responsable mientras se editaba.
    const { data: responsableVigente, error: errorResponsable } = await supabase
      .from("express_pedidos")
      .select("turno_responsable_id")
      .eq("id", editandoId).eq("empresa_id", identidad.empresaId).single();
    if (errorResponsable || !turnoActual?.id || responsableVigente?.turno_responsable_id !== turnoActual.id) {
      setErrorPantalla("No se guardó: el pedido no pertenece a tu turno. Actualizá los pedidos.");
      limpiarFormulario(); setVista("pedidos"); return;
    }
    const importe = Number(total);
    if (!nombre.trim() || !direccion.trim() || !Number.isFinite(importe) || importe <= 0) {
      window.alert("Completá cliente, dirección e importe mayor a cero."); return;
    }
    setGuardando(true); setErrorPantalla(""); setMensaje("");
    try {
      const { error } = await supabase.rpc("express_editar_pedido", {
        p_pedido: editandoId,
        p_nombre: nombre.trim(), p_telefono: telefono.trim() || null,
        p_direccion: direccion.trim(), p_detalle: notas.trim() || null,
        p_importe: importe, p_cobro: pago,
      });
      if (error) throw error;
      await cargarPedidos(identidad.empresaId);
      limpiarFormulario(); setVista("pedidos"); setFiltro("todos");
      setMensaje("Pedido modificado correctamente. Conserva su número y su asignación.");
    } catch (err) {
      setErrorPantalla(`No se pudo editar el pedido: ${err.message || "Error desconocido"}`);
    } finally { setGuardando(false); }
  };

  const crearPedido = async (e) => {
    e.preventDefault();
    if (!identidad || guardando) return;
    if (cargandoTurno || operandoTurno) {
      window.alert("Esperá a que termine la consulta del turno."); return;
    }
    if (!turnoActual?.id) {
      window.alert("Antes de crear un pedido, tocá «Iniciar turno» en la parte superior. Los pedidos anteriores no se modifican."); return;
    }
    const importe = Number(total);
    if (buscandoCliente) { window.alert("Esperá a que termine la búsqueda del teléfono."); return; }
    if (!clienteEncontrado && coincidencias.some(c => c.telefono_normalizado === normalizarTelefono(telefono))) {
      window.alert("Ese teléfono ya está registrado. Tocá el cliente de la lista antes de guardar el pedido.");
      return;
    }
    if (!nombre.trim() || !direccion.trim() || !Number.isFinite(importe) || importe <= 0) {
      window.alert("Completá cliente, dirección e importe mayor a cero.");
      return;
    }
    if (configComercio.latitud == null || configComercio.longitud == null) {
      window.alert("El dueño debe configurar la ubicación de esta sucursal desde su panel."); return;
    }
    if (!destinoConfirmado) {
      window.alert("Buscá y confirmá la ubicación de entrega en el mapa antes de guardar."); return;
    }
    const kmDestino = distanciaKm(Number(configComercio.latitud), Number(configComercio.longitud), destinoConfirmado.lat, destinoConfirmado.lon);
    const fueraRadio = kmDestino > Number(configComercio.radio_entregas_km);
    if (fueraRadio && !autorizarExcepcion) {
      window.alert(`El destino está a ${kmDestino.toFixed(1)} km, fuera del radio habitual. Marcá la autorización para continuar.`); return;
    }
    setGuardando(true);
    setErrorPantalla("");
    setMensaje("");
    try {
      await guardarClienteDireccion();
      const { error } = await supabase.from("express_pedidos").insert({
        empresa_id: identidad.empresaId,
        creado_por: identidad.usuarioId,
        turno_origen_id: turnoActual.id,
        turno_responsable_id: turnoActual.id,
        cliente_nombre: nombre.trim(),
        direccion: direccion.trim(),
        telefono: telefono.trim() || null,
        detalle: [notas.trim(), indicacionesDireccion.trim() ? `Entrega: ${indicacionesDireccion.trim()}` : ""].filter(Boolean).join(" | ") || null,
        importe_total: importe,
        modalidad_cobro: pago,
        estado: "preparando",
        destino_latitud: destinoConfirmado.lat,
        destino_longitud: destinoConfirmado.lon,
        fuera_de_radio_autorizado: fueraRadio && autorizarExcepcion,
      });
      if (error) throw error;
      await cargarPedidos(identidad.empresaId);
      limpiarFormulario();
      setVista("pedidos"); setFiltro("todos");
      setMensaje("Pedido guardado en Supabase.");
    } catch (err) {
      setErrorPantalla(`No se completó el guardado: ${err.message || "Error desconocido"}`);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    if (!identidad || guardando) return;
    setGuardando(true);
    setErrorPantalla("");
    setMensaje("");
    try {
      if (estado !== "listo") throw new Error("Cambio de estado no autorizado desde esta pantalla.");
      const { error } = await supabase.rpc("express_marcar_listo", { p_pedido: id });
      if (error) throw error;
      await cargarPedidos(identidad.empresaId);
      setMensaje("Estado actualizado.");
    } catch (err) {
      setErrorPantalla(`No se cambió el estado: ${err.message || "Error desconocido"}`);
    } finally {
      setGuardando(false);
    }
  };
  const refrescarTodo = async () => {
    if (!identidad) return;
    await Promise.all([cargarPedidos(identidad.empresaId), cargarRepartidores(identidad.empresaId), cargarViajes(identidad.empresaId), cargarJornadas(identidad.empresaId), cargarTurnoActual(identidad.empresaId, identidad.usuarioId), cargarHerencias()]);
  };

  const cargarControlExpress = async () => {
    if (!identidad) return;
    setCargandoControl(true);
    setErrorSaldosExpress("");
    setSaldosVerificados(false);
    setSaldosExpress([]);
    try {
      const [rs, ds, hd, hv] = await Promise.all([
        supabase.rpc("express_consultar_saldos"),
        supabase.rpc("express_consultar_devoluciones"),
        supabase.rpc("express_historial_recepciones"),
        supabase.rpc("express_historial_devoluciones")
      ]);
      if (rs.error) {
        setErrorSaldosExpress(`No se pudieron consultar los saldos: ${rs.error.message}`);
        setErrorPantalla(`No se pudieron consultar los saldos: ${rs.error.message}`);
      } else {
        setSaldosExpress(rs.data || []);
        setSaldosVerificados(true);
      }
      if (ds.error) setErrorPantalla(`No se pudieron consultar las devoluciones: ${ds.error.message}`);
      else {
        setDevolucionesExpress(ds.data || []);
        setDevolucionesSeleccionadas(actual => actual.filter(id => (ds.data || []).some(d => d.pedido_id === id)));
      }
      if (hd.error) setErrorPantalla(`No se pudo consultar el historial de rendiciones: ${hd.error.message}`);
      else setHistorialDinero(hd.data || []);
      if (hv.error) setErrorPantalla(`No se pudo consultar el historial de devoluciones: ${hv.error.message}`);
      else setHistorialDevoluciones(hv.data || []);
    } catch (e) {
      setErrorSaldosExpress(`No se pudieron verificar los saldos: ${e.message}`);
      setErrorPantalla(`No se pudo consultar el control: ${e.message}`);
    } finally { setCargandoControl(false); }
  };

  const recibirDineroExpress = async (repartidorId, saldo) => {
    if (operandoControl) return;
    const importe = Number(importeRecepcion[repartidorId]);
    if (!Number.isFinite(importe) || importe <= 0 || !/^\d+(?:[.,]\d{1,2})?$/.test(String(importeRecepcion[repartidorId] || "").trim())) {
      setErrorPantalla("Ingresá un importe positivo con hasta dos decimales (usá punto decimal)."); return;
    }
    if (Math.round(importe * 100) > Math.round(Number(saldo) * 100)) {
      setErrorPantalla("El importe no puede superar el saldo pendiente."); return;
    }
    if (!window.confirm(`¿Confirmás que recibiste ${dinero(importe)} en efectivo de este repartidor?`)) return;
    setOperandoControl(true); setErrorPantalla(""); setMensaje("");
    try {
      const { error } = await supabase.rpc("express_registrar_recepcion", {
        p_repartidor: repartidorId, p_importe: importe, p_observaciones: notaRecepcion[repartidorId]?.trim() || null
      });
      if (error) throw error;
      setImporteRecepcion(a => ({ ...a, [repartidorId]: "" }));
      setNotaRecepcion(a => ({ ...a, [repartidorId]: "" }));
      await cargarControlExpress();
      setMensaje(`✅ Recepción de ${dinero(importe)} registrada correctamente.`);
    } catch (e) { setErrorPantalla(`No se registró el dinero: ${e.message}`); }
    finally { setOperandoControl(false); }
  };

  const confirmarDevolucionesExpress = async (ids, observaciones = "") => {
    if (operandoControl || !ids.length) return;
    if (!window.confirm(`¿Confirmás la recepción física de ${ids.length} pedido(s) devuelto(s)?`)) return;
    setOperandoControl(true); setErrorPantalla(""); setMensaje("");
    try {
      const { data, error } = await supabase.rpc("express_confirmar_devoluciones", {
        p_pedidos: ids, p_observaciones: observaciones.trim() || null
      });
      if (error) throw error;
      await cargarControlExpress();
      setMensaje(`✅ ${data} devolución(es) confirmada(s).`);
      if (ids.length > 1) setNotaLoteDevolucion("");
    } catch (e) { setErrorPantalla(`No se confirmó la devolución: ${e.message}`); }
    finally { setOperandoControl(false); }
  };

  const ejecutarViaje = async (accion, datos = {}) => {
    if (!identidad || guardando) return;
    setGuardando(true); setErrorPantalla(""); setMensaje("");
    try {
      const { error } = await supabase.rpc("express_gestionar_viaje", {
        p_accion: accion, p_repartidor: datos.repartidor || null,
        p_pedido: datos.pedido || null, p_viaje: datos.viaje || null,
      });
      if (error) throw error;
      await refrescarTodo();
      setMensaje(accion === "asignar" ? "Pedido asignado y guardado." : accion === "quitar" ? "Pedido retirado del viaje." : "Salida confirmada y guardada.");
    } catch (e) { setErrorPantalla(`No se completó la operación: ${e.message}`); }
    finally { setGuardando(false); setArrastrando(null); }
  };
  const asignarBorrador = (pedidoId, repartidorId) => {
    if (jornadas[repartidorId] === "finalizada") {
      setErrorPantalla("Este repartidor finalizó su jornada. No se le pueden asignar pedidos.");
      return;
    }
    return ejecutarViaje("asignar", { pedido: pedidoId, repartidor: repartidorId });
  };
  const quitarBorrador = (pedidoId) => ejecutarViaje("quitar", { pedido: pedidoId });
  const pedidoEnBorrador = (id) => Object.values(borradores).some(lista => lista.includes(id));

  // La base conserva recorridos históricos como "regresando". Para el panel operativo
  // mostramos únicamente el último recorrido en curso por repartidor y los preparativos.
  // No se cambia ningún estado ni se borra información de Supabase.
  const viajesOperativos = viajes.filter(v => {
    if (v.estado === "preparando") return true;
    if (v.estado === "regresando" && jornadas[v.repartidor_id] === "finalizada") return false;
    return !viajes.some(otro =>
      otro.repartidor_id === v.repartidor_id &&
      otro.estado !== "preparando" &&
      (new Date(otro.creado_en).getTime() > new Date(v.creado_en).getTime() ||
        (otro.creado_en === v.creado_en && otro.id > v.id))
    );
  });
  const viajesFiltrados = viajesOperativos.filter(v => repartidorSeleccionado === "todos" || v.repartidor_id === repartidorSeleccionado);
  const estadoViaje = v => {
    if (v.estado === "regresando") return "↩️ REGRESANDO · entregas resueltas";
    if (v.estado === "preparando") return "🟡 Preparando salida";
    if (v.estado === "en_camino" && v.relaciones?.length && v.relaciones.every(r => r.resultado))
      return "🏁 Entregas terminadas · regreso pendiente de confirmar";
    return "🛵 En reparto";
  };
  // Progreso de entregas del recorrido actual, no del viaje futuro en preparación.
  const resumenRepartidor = (repartidorId) => {
    const propios = viajesOperativos.filter(v => v.repartidor_id === repartidorId);
    const actual = propios.find(v => v.estado === "en_camino") || propios.find(v => v.estado === "regresando");
    const proximo = propios.find(v => v.estado === "preparando");
    const total = actual?.relaciones?.length || 0;
    const resueltos = actual?.relaciones?.filter(rel => rel.resultado === "entregado" || rel.resultado === "no_entregado").length || 0;
    return { actual, proximo, total, resueltos, porcentaje: total ? Math.round(100 * resueltos / total) : 0 };
  };
  const barraProgreso = (resueltos, total, porcentaje) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, fontSize: 14 }}>
        <span>Entregas resueltas: {resueltos} de {total}</span>
        <strong>{porcentaje}%</strong>
      </div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje}
        aria-label="Progreso de entregas" style={{ width: "100%", height: 15, background: "#334155", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ width: `${porcentaje}%`, height: "100%", background: porcentaje === 100 ? "#22c55e" : "#38bdf8", borderRadius: 20, transition: "width 0.3s" }} />
      </div>
      <p style={{ color: colores.suave, fontSize: 12, margin: "7px 0 0" }}>Porcentaje de entregas resueltas, no de distancia recorrida.</p>
    </div>
  );
  // Filtrado visual: NO sustituye la seguridad RLS en Supabase.
  const transferenciasParaMi = herenciasPendientes.filter(h => h.turno_destino_id === turnoActual?.id);
  const transferenciasEnviadas = herenciasPendientes.filter(h => h.turno_origen_id === turnoActual?.id);
  const idsParaMi = new Set(transferenciasParaMi.map(h => h.pedido_id));
  const pedidosVisibles = pedidos.filter(p => esAdminExpress || (turnoActual?.id && p.turnoResponsableId === turnoActual.id));
  const visibles = pedidosVisibles
  .filter(p => filtro === "todos" || p.estado === filtro)
  .sort((a, b) => {
    if (a.estado === "entregado" && b.estado !== "entregado") return 1;
    if (a.estado !== "entregado" && b.estado === "entregado") return -1;
    return 0;
  });
  const etiqueta = { preparando: "👩‍🍳 Preparando", listo: "✅ Listo para retirar", en_camino: "🛵 En camino", entregado: "📦 Entregado" };

  // Vista de control: solo lectura. Ningún cierre o transferencia se ejecuta desde aquí.
  const pendientesCierre = pedidosVisibles.filter(p => !["entregado", "no_entregado", "cancelado"].includes(p.estado));
  const pendientesEnViajes = pendientesCierre.map(p => ({
    ...p,
    viaje: viajes.find(v => v.relaciones?.some(r => r.pedido_id === p.id)) || null
  }));
  const pedidosHeredados = turnoActual?.id
    ? pedidos.filter(p => p.turnoResponsableId === turnoActual.id && p.turnoOrigenId !== turnoActual.id)
    : [];

  const menuExpress = [
    { id: "nuevo", icono: "➕", texto: "Nuevo pedido", accion: () => { limpiarFormulario(); setVista("nuevo"); } },
    { id: "pedidos", icono: "📋", texto: "Ver pedidos", accion: () => { setVista("pedidos"); cargarHerencias(); } },
    { id: "asignar", icono: "🛵", texto: "Preparar viajes", accion: () => { setVista("asignar"); if (identidad) refrescarTodo().catch(e => setErrorPantalla(e.message)); } },
    { id: "estados", icono: "👥", texto: "Repartidores", accion: () => { setVista("estados"); if (identidad) refrescarTodo().catch(e => setErrorPantalla(e.message)); } },
    { id: "rendiciones", icono: "💰", texto: "Rendiciones", accion: () => { setVista("rendiciones"); cargarControlExpress(); } },
    { id: "devoluciones", icono: "📦", texto: "Devoluciones", accion: () => { setVista("devoluciones"); cargarControlExpress(); } },
    { id: "cierre", icono: "🌙", texto: "Cierre y turnos", accion: () => { setVista("cierre"); cargarHerencias(); } },
    { id: "configuracion", icono: "⚙️", texto: "Configuración", accion: () => { setVista("configuracion"); setAvisoConfig(""); } },
  ];
  const tituloActual = menuExpress.find(m => m.id === vista)?.texto || "Express";

  return (
    <main className="express-redisenado" style={{ minHeight: "100vh", background: colores.fondo, color: colores.texto, fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        .express-redisenado { --ex-panel:#1e293b; --ex-border:#334155; }
        .ex-cabecera { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 24px; border-bottom:1px solid #334155; background:#111c30; }
        .ex-marca { font-weight:850; font-size:clamp(22px,2.5vw,30px); letter-spacing:-.6px; }
        .ex-marca span { color:#fb923c; }
        .ex-subtitulo { color:#cbd5e1; font-size:14px; margin-top:3px; }
        .ex-identidad { font-size:14px; color:#cbd5e1; text-align:right; }
        .ex-estructura { display:grid; grid-template-columns:245px minmax(0,1fr); max-width:1600px; margin:0 auto; min-height:calc(100vh - 82px); }
        .ex-lateral { background:#111827; border-right:1px solid #334155; padding:22px 12px; }
        .ex-menu { display:flex; flex-direction:column; gap:7px; position:sticky; top:16px; }
        .ex-menu button { border:1px solid transparent; background:transparent; color:#dbeafe; font-size:15px; font-weight:650; text-align:left; padding:14px 13px; border-radius:10px; cursor:pointer; display:flex; align-items:center; gap:12px; }
        .ex-menu button:hover { background:#24344c; }
        .ex-menu button.ex-nuevo { background:#15803d; color:white; border-color:#4ade80; }
        .ex-menu button.ex-nuevo:hover { background:#16a34a; }
        .ex-menu button[aria-current="page"] { background:#1d4ed8; color:white; }
        .ex-contenido { min-width:0; padding:24px; }
        .ex-titulo-vista { margin:0; font-size:clamp(22px,2.6vw,30px); }
        .ex-resumen { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; margin-bottom:14px; }
        .ex-indicador { background:#1e293b; border:1px solid #334155; border-radius:11px; padding:10px 12px; }
        .ex-indicador strong { display:block; font-size:clamp(22px,2.3vw,30px); margin-top:6px; }
        .ex-actualizar { border:1px solid #475569; border-radius:9px; background:#26374e; color:white; padding:10px 14px; cursor:pointer; font-weight:700; }
        .express-redisenado section { max-width:100%; min-width:0; }
        .ex-barra-vista { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
        .ex-lista-pedidos { gap:7px !important; }
        .ex-pedido { padding:10px 13px !important; }
        .ex-pedido-cabecera { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .ex-estado { display:inline-flex; align-items:center; border-radius:7px; padding:3px 9px; font-size:12px; font-weight:800; background:#24344c; color:#bfdbfe; }
        .ex-estado-no-entregado { background:#713f12; color:#fed7aa; border:1px solid #c2410c; }
        .ex-pedido details summary { padding:4px 0 !important; font-size:13px; }
        .ex-contenido > section { padding:14px !important; }
        @media(max-width:1050px) {
          .ex-estructura { grid-template-columns:205px minmax(0,1fr); }
          .ex-resumen { grid-template-columns:repeat(3,minmax(0,1fr)); }
          .ex-contenido { padding:18px; }
        }
        @media(max-width:720px) {
          .ex-cabecera { padding:15px; align-items:flex-start; }
          .ex-identidad { font-size:12px; }
          .ex-estructura { display:block; }
          .ex-lateral { border-right:0; border-bottom:1px solid #334155; padding:10px; }
          .ex-menu { position:static; flex-direction:row; overflow-x:auto; gap:7px; scrollbar-width:thin; }
          .ex-menu button { white-space:nowrap; flex:0 0 auto; padding:12px; font-size:14px; }
          .ex-contenido { padding:14px 10px 32px; }
          .ex-resumen { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
          .ex-indicador { padding:11px; }
        }
      `}</style>
      <header className="ex-cabecera">
        <div>
          <div className="ex-marca">🛵 RutaComercios <span>Express</span></div>
          <div className="ex-subtitulo">Panel del comercio · Gestión de entregas</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
          {identidad && <div className="ex-identidad">👤 {identidad.nombre || "Usuario autorizado"}<div>🍕 {configComercio.nombre_comercio?.trim() || "Comercio sin configurar"}</div></div>}
          <button type="button" onClick={salirExpress} style={{ ...boton, background: "#b91c1c", color: "white" }}>🚪 SALIR</button>
        </div>
      </header>
      <div className="ex-estructura">
        <aside className="ex-lateral" aria-label="Menú principal">
          <nav className="ex-menu" aria-label="Secciones">
            {menuExpress.map(item => (
              <button key={item.id} type="button" className={item.id === "nuevo" ? "ex-nuevo" : undefined} aria-current={vista === item.id ? "page" : undefined} onClick={item.accion}>
                <span aria-hidden="true">{item.icono}</span>{item.texto}
              </button>
            ))}
          </nav>
        </aside>
        <div className="ex-contenido">
          <div className="ex-barra-vista">
            <h1 className="ex-titulo-vista">{tituloActual}</h1>
            {!cargando && identidad && <button className="ex-actualizar" type="button" disabled={guardando || refrescando} onClick={async () => { setRefrescando(true); setMensaje(""); setErrorPantalla(""); try { await refrescarTodo(); if (vista === "rendiciones" || vista === "devoluciones") await cargarControlExpress(); setMensaje("✅ Información actualizada correctamente."); } catch (e) { setErrorPantalla(`No se pudo actualizar: ${e.message}`); } finally { setRefrescando(false); } }}>{refrescando ? "⏳ Actualizando..." : "↻ Actualizar"}</button>}
          </div>
          {cargando && <p>Cargando información, por favor esperá...</p>}
          {errorPantalla && <p role="alert" style={{ background: "#7f1d1d", padding: 12, borderRadius: 8 }}>{errorPantalla}</p>}
          {mensaje && <p role="status" style={{ background: "#14532d", padding: 12, borderRadius: 8 }}>{mensaje}</p>}
          {identidad && <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, background: "#17243a", border: `1px solid ${colores.borde}`, borderRadius: 11, padding: "10px 14px", marginBottom: 14 }}>
            <strong>🕒 Turno comercial</strong>
            {cargandoTurno ? <span>Consultando turno...</span> : turnoActual ? (
              <span style={{ color: "#86efac" }}>● Abierto desde {new Date(turnoActual.inicio_en).toLocaleString("es-AR")} · Los nuevos pedidos se asocian a este turno.</span>
            ) : (
              <>
                <span style={{ color: "#fde68a" }}>No tenés un turno abierto.</span>
                <button type="button" disabled={operandoTurno || cargandoTurno} onClick={iniciarTurnoComercial} style={{ ...boton, background: "#15803d", color: "white", padding: "9px 14px" }}>{operandoTurno ? "⏳ Iniciando..." : "▶ Iniciar turno"}</button>
              </>
            )}
            {errorTurno && <span role="alert" style={{ color: "#fca5a5", width: "100%" }}>{errorTurno}</span>}
            <span style={{ color: colores.suave, fontSize: 12, width: "100%" }}>Los indicadores muestran los pedidos bajo responsabilidad actual de tu turno, incluidos los heredados (entre los últimos 500 cargados). Los transferidos a otro supervisor ya no cuentan como tuyos.</span>
          </div>}

          {!identidad ? null : (
            <>
              <section className="ex-resumen" aria-label="Resumen de pedidos" style={{ marginTop: 0 }}>
                {[["Pedidos", resumen.total], ["Preparando", resumen.preparando], ["Listos", resumen.listos], ["En camino", resumen.enCamino], ["Entregados", resumen.entregados]].map(([titulo, valor]) => (
                  <div className="ex-indicador" key={titulo}>
                    <div style={{ fontSize: 13, color: colores.suave }}>{titulo}</div>
                    <strong>{valor}</strong>
                  </div>
                ))}
              </section>

        {vista === "cierre" ? (
          <section style={{ background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: 14, padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>🌙 Cierre y turnos</h2>
            <div style={{ background: "#17243a", border: `1px solid ${colores.borde}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>🕒 Mi turno de supervisor</h3>
              {cargandoTurno ? (
                <p>Consultando turno...</p>
              ) : turnoActual ? (
                <>
                  <p>Turno abierto desde <strong>{new Date(turnoActual.inicio_en).toLocaleString("es-AR")}</strong></p>
                  <button type="button" disabled={operandoTurno || cargandoTurno || guardando || refrescando}
                    onClick={finalizarTurnoComercial}
                    style={{ ...boton, background: "#b91c1c", color: "white", padding: "14px 20px", fontWeight: 900 }}>
                    {operandoTurno ? "⏳ FINALIZANDO..." : "🌙 FINALIZAR MI TURNO"}
                  </button>
                </>
              ) : (
                <p style={{ color: "#86efac", fontWeight: 700 }}>No tenés un turno abierto.</p>
              )}
              {errorTurno && <p role="alert" style={{ color: "#fca5a5" }}>{errorTurno}</p>}
            </div>
            <p style={{ color: "#fde68a", fontWeight: 700 }}>El cierre definitivo de la jornada comercial todavía no está habilitado.</p>
            <p style={{ color: colores.suave }}>Las transferencias de pedidos se realizan en «Ver pedidos». Podés finalizar tu turno cuando no tengas pedidos pendientes bajo tu responsabilidad. El cierre definitivo de la jornada comercial todavía no está habilitado.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              {[["Pendientes de resolver", pendientesCierre.length], ["En viajes activos", pendientesEnViajes.filter(p => p.viaje).length]].map(([nombre, valor]) => (
                <div key={nombre} style={{ background: "#111827", border: `1px solid ${colores.borde}`, padding: 13, borderRadius: 10 }}>
                  <div style={{ fontSize: 13, color: colores.suave }}>{nombre}</div><strong style={{ fontSize: 28 }}>{valor}</strong>
                </div>
              ))}
            </div>
          </section>
        ) : vista === "rendiciones" ? (
          <section style={{ background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: 14, padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>💰 Rendiciones de efectivo</h2>
            <p style={{ color: colores.suave }}>Acumuladas por repartidor, incluso entre jornadas. Solo se contabilizan entregas en efectivo posteriores al corte inicial. Tarjetas y transferencias se controlarán por separado.</p>
            <button type="button" disabled={cargandoControl || operandoControl} onClick={cargarControlExpress} style={{ ...boton, background: colores.borde, color: "white", marginBottom: 15 }}>↻ Actualizar saldos</button>
            {cargandoControl && <p>Consultando saldos...</p>}
            {!cargandoControl && !saldosVerificados && <p role="alert" style={{ color: "#fca5a5", fontWeight: 800 }}>⚠️ Saldos no verificados. No se puede afirmar que estén en cero. {errorSaldosExpress}</p>}
            <label style={{ display: "block", maxWidth: 420, margin: "0 auto 16px", textAlign: "left" }}>
              Consultar repartidor
              <select style={{ ...campo, marginTop: 6 }} value={repartidorRendicion} onChange={e => setRepartidorRendicion(e.target.value)}>
                <option value="todos">Todos los repartidores</option>
                {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre || "Repartidor"}</option>)}
              </select>
            </label>
            {!cargandoControl && repartidores.length === 0 && <p>No hay repartidores habilitados en esta empresa.</p>}
            {!cargandoControl && saldosVerificados && repartidores.length > 0 && saldosExpress.length === 0 && <p>No hay cobros en efectivo posteriores al corte inicial. Todos los saldos están en cero.</p>}
            {saldosVerificados && repartidores.filter(r => repartidorRendicion === "todos" || r.id === repartidorRendicion).map(r => {
              const s = saldosExpress.find(item => item.repartidor_id === r.id) || { repartidor_id: r.id, total_cobrado: 0, total_rendido: 0, saldo_pendiente: 0 };
              const nombreRep = repartidores.find(r => r.id === s.repartidor_id)?.nombre || "Repartidor";
              const saldo = Number(s.saldo_pendiente || 0);
              return <article key={s.repartidor_id} style={{ background: "#111827", border: `1px solid ${colores.borde}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <h3 style={{ margin: "0 0 12px" }}>🛵 {nombreRep}</h3>
                <p>Cobrado: <strong>{dinero(s.total_cobrado)}</strong> · Recibido: <strong>{dinero(s.total_rendido)}</strong></p>
                <p style={{ fontSize: 20, fontWeight: 800, color: saldo > 0 ? "#fde68a" : "#86efac" }}>Pendiente: {dinero(saldo)}</p>
                {saldo > 0 && <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
                  <label>Importe que recibió el Supervisor
                    <input type="number" min="0.01" max={saldo} step="0.01" style={{ ...campo, marginTop: 5 }} value={importeRecepcion[s.repartidor_id] || ""} onChange={e => setImporteRecepcion(a => ({ ...a, [s.repartidor_id]: e.target.value }))} placeholder="Ej.: 15000.00" />
                  </label>
                  <label>Observaciones (opcional)
                    <textarea style={{ ...campo, marginTop: 5 }} maxLength={500} value={notaRecepcion[s.repartidor_id] || ""} onChange={e => setNotaRecepcion(a => ({ ...a, [s.repartidor_id]: e.target.value }))} />
                  </label>
                  <button type="button" disabled={operandoControl || cargandoControl} onClick={() => recibirDineroExpress(s.repartidor_id, saldo)} style={{ ...boton, background: "#15803d", color: "white" }}>💵 Confirmar dinero recibido</button>
                </div>}
              </article>;
            })}
            <button type="button" onClick={() => setVerHistorialDinero(v => !v)} style={{ ...boton, background: colores.borde, color: "white", marginTop: 12 }}>
              📋 {verHistorialDinero ? "Ocultar historial de rendiciones" : `Ver historial de rendiciones (${historialDinero.length})`}
            </button>
            {verHistorialDinero && <div style={{ marginTop: 14, textAlign: "left" }}>
              <h3>📋 Historial de dinero recibido</h3>
              {historialDinero.filter(h => repartidorRendicion === "todos" || h.repartidor_id === repartidorRendicion).length === 0 && <p>No hay recepciones registradas para esta selección.</p>}
              {historialDinero.filter(h => repartidorRendicion === "todos" || h.repartidor_id === repartidorRendicion).map(h => <article key={h.id} style={{ background: "#111827", border: `1px solid ${colores.borde}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <strong>🛵 {repartidores.find(r => r.id === h.repartidor_id)?.nombre || "Repartidor"} · {dinero(h.importe)}</strong>
                <div style={{ color: colores.suave, marginTop: 5 }}>{new Date(h.recibido_en).toLocaleString("es-AR")} · Recibió: {h.supervisor_nombre || "Supervisor"}</div>
                {h.observaciones && <div style={{ marginTop: 5 }}>📝 {h.observaciones}</div>}
              </article>)}
              {historialDinero.length >= 1000 && <p style={{ color: colores.suave }}>Se muestran las 1000 recepciones más recientes.</p>}
            </div>}
          </section>
        ) : vista === "devoluciones" ? (
          <section style={{ background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: 14, padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>📦 Devoluciones pendientes</h2>
            <p style={{ color: colores.suave }}>Confirmá únicamente la mercadería que regresó físicamente al comercio. Podés confirmar cada pedido o seleccionar varios.</p>
            <button type="button" disabled={cargandoControl || operandoControl} onClick={cargarControlExpress} style={{ ...boton, background: colores.borde, color: "white", marginBottom: 15 }}>↻ Actualizar devoluciones</button>
            {cargandoControl && <p>Consultando devoluciones...</p>}
            {!cargandoControl && devolucionesExpress.length === 0 && <p>Por ahora no hay devoluciones pendientes.</p>}
            {devolucionesExpress.map(d => <article key={d.pedido_id} style={{ background: "#111827", border: `1px solid ${colores.borde}`, borderRadius: 12, padding: 15, marginBottom: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
                <input type="checkbox" checked={devolucionesSeleccionadas.includes(d.pedido_id)} onChange={e => setDevolucionesSeleccionadas(a => e.target.checked ? [...a, d.pedido_id] : a.filter(id => id !== d.pedido_id))} />
                EX-{String(d.numero_express).padStart(6, "0")} · {d.cliente_nombre}
              </label>
              <p style={{ margin: "9px 0" }}>🛵 {repartidores.find(r => r.id === d.repartidor_id)?.nombre || "Repartidor"} · {dinero(d.importe_total)}</p>
              <p style={{ color: "#fde68a" }}>Motivo: {d.motivo_no_entrega || "No informado"}</p>
              <label>Observación de recepción (opcional)
                <input style={{ ...campo, marginTop: 5 }} maxLength={500} value={notasDevolucion[d.pedido_id] || ""} onChange={e => setNotasDevolucion(a => ({ ...a, [d.pedido_id]: e.target.value }))} placeholder="Ej.: Faltó una gaseosa" />
              </label>
              <button type="button" disabled={operandoControl || cargandoControl} onClick={() => confirmarDevolucionesExpress([d.pedido_id], notasDevolucion[d.pedido_id] || "")} style={{ ...boton, background: "#15803d", color: "white", marginTop: 10 }}>✅ Confirmar esta devolución</button>
            </article>)}
            {devolucionesSeleccionadas.length > 0 && <div style={{ background: "#0b1220", borderRadius: 12, padding: 14, marginTop: 16, display: "grid", gap: 10 }}>
              <strong>{devolucionesSeleccionadas.length} devolución(es) seleccionada(s)</strong>
              <label>Observación común para todos los seleccionados (opcional)
                <input style={{ ...campo, marginTop: 5 }} maxLength={500} value={notaLoteDevolucion} onChange={e => setNotaLoteDevolucion(e.target.value)} />
              </label>
              <button type="button" disabled={operandoControl || cargandoControl} onClick={() => confirmarDevolucionesExpress(devolucionesSeleccionadas, notaLoteDevolucion)} style={{ ...boton, background: "#15803d", color: "white" }}>✅ Confirmar devoluciones seleccionadas</button>
            </div>}
            <button type="button" onClick={() => setVerHistorialDevoluciones(v => !v)} style={{ ...boton, background: colores.borde, color: "white", marginTop: 16 }}>
              📋 {verHistorialDevoluciones ? "Ocultar historial de devoluciones" : `Ver historial de devoluciones (${historialDevoluciones.length})`}
            </button>
            {verHistorialDevoluciones && <div style={{ marginTop: 14, textAlign: "left" }}>
              <h3>📋 Mercadería recibida</h3>
              {historialDevoluciones.length === 0 && <p>No hay devoluciones confirmadas.</p>}
              {historialDevoluciones.map(h => <article key={h.id} style={{ background: "#111827", border: `1px solid ${colores.borde}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <strong>📦 EX-{String(h.numero_express).padStart(6, "0")} · {h.cliente_nombre}</strong>
                <div style={{ marginTop: 5 }}>🛵 {repartidores.find(r => r.id === h.repartidor_id)?.nombre || "Repartidor"} · {dinero(h.importe_total)}</div>
                <div style={{ color: colores.suave, marginTop: 5 }}>Recibida: {new Date(h.recibido_en).toLocaleString("es-AR")} · Por: {h.supervisor_nombre || "Supervisor"}</div>
                <div style={{ marginTop: 5 }}>Motivo de no entrega: {h.motivo_no_entrega || "No informado"}</div>
                {h.observaciones && <div style={{ marginTop: 5 }}>📝 Observaciones de recepción: {h.observaciones}</div>}
              </article>)}
              {historialDevoluciones.length >= 1000 && <p style={{ color: colores.suave }}>Se muestran las 1000 devoluciones más recientes.</p>}
            </div>}
          </section>
        ) : vista === "estados" ? (

          <section style={{ background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: 14, padding: 18, marginBottom: 18 }}>
            <h2 style={{ marginTop: 0 }}>👥 Estados de repartidores</h2>
            <p style={{ color: colores.suave }}>Situación de la jornada y avance de las entregas. Se actualiza automáticamente.</p>
            {!repartidores.length && <p>No hay repartidores habilitados en esta empresa.</p>}
            {repartidores.map(r => {
              const { actual, proximo, total, resueltos, porcentaje } = resumenRepartidor(r.id);
              const finalizada = jornadas[r.id] === "finalizada";
              return <article key={r.id} style={{ background: "#111827", border: `1px solid ${colores.borde}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <h3 style={{ margin: "0 0 8px" }}>🛵 {r.nombre || "Repartidor"}</h3>
                <p style={{ margin: "5px 0", color: finalizada ? "#fca5a5" : "#86efac", fontWeight: 700 }}>
                  {finalizada ? "🌙 Jornada finalizada · no disponible" : "🟢 Jornada habilitada · disponible para asignaciones"}
                </p>
                <p style={{ margin: "9px 0", fontWeight: 700 }}>
                  {finalizada
                    ? (actual ? `Último recorrido: ${resueltos} de ${total} entregas resueltas` : "Sin recorrido activo")
                    : (actual ? estadoViaje(actual) : "Sin recorrido activo")}
                </p>
                {actual ? barraProgreso(resueltos, total, porcentaje) : <p style={{ color: colores.suave, fontSize: 13 }}>Sin entregas en curso para calcular progreso.</p>}
                {proximo && <p style={{ margin: "12px 0 0", color: "#fde68a" }}>🟡 Próximo recorrido en preparación: {proximo.relaciones?.length || 0} pedido(s)</p>}
              </article>;
            })}
          </section>
        ) : vista === "configuracion" ? (
          <section style={{ background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: 14, padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>📍 Datos de la sucursal {nombreSucursalOperativa ? `· ${nombreSucursalOperativa}` : ""}</h2>
            <p style={{ color: colores.suave }}>Estos datos los administra el dueño desde su panel. El supervisor solamente los consulta.</p>
            {cargandoConfig ? <p>Cargando datos...</p> : (
              <div style={{ display: "grid", gap: 12 }}>
                <div><strong>Comercio:</strong> {configComercio.nombre_comercio || "Sin configurar"}</div>
                <div><strong>Dirección:</strong> {configComercio.direccion || "Sin configurar"}</div>
                <div><strong>Radio de entregas:</strong> {configComercio.radio_entregas_km ?? "Sin configurar"} km</div>
                <div><strong>Ubicación GPS:</strong> {configComercio.latitud != null && configComercio.longitud != null
                  ? `${Number(configComercio.latitud).toFixed(6)}, ${Number(configComercio.longitud).toFixed(6)}`
                  : "Pendiente de configurar por el dueño"}</div>
                {(configComercio.latitud == null || configComercio.longitud == null || !configComercio.direccion) && (
                  <p style={{ color: "#fde68a" }}>⚠️ El dueño debe completar la dirección y ubicación GPS de esta sucursal desde su panel antes de cargar entregas.</p>
                )}
                {avisoConfig && <p role="status">{avisoConfig}</p>}
              </div>
            )}
          </section>
        ) : vista === "asignar" ? (
          <section style={{ background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: 14, padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>🛵 Preparar pedidos por repartidor</h2>
            <p style={{ color: colores.suave, fontSize: 13 }}>
              Arrastrá pedidos o usá «Asignar» desde el celular. Las operaciones se guardan en Supabase.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 16 }}>
              <div style={{ background: "#111827", borderRadius: 12, padding: 14 }}>
                <h3>📋 Pedidos listos para salir</h3>
                {pedidosVisibles.filter(p => p.estado === "listo" && !pedidoEnBorrador(p.id)).length === 0 && <p style={{ color: colores.suave }}>No hay pedidos listos sin asignar.</p>}
                {pedidosVisibles.filter(p => p.estado === "listo" && !pedidoEnBorrador(p.id)).map(p => (
                  <div key={p.id} draggable onDragStart={e => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "move"; setArrastrando(p.id); }} onDragEnd={() => setArrastrando(null)}
                    style={{ border: `1px solid ${colores.borde}`, background: arrastrando === p.id ? "#334155" : colores.tarjeta, borderRadius: 10, padding: 12, marginBottom: 10, cursor: "grab" }}>
                    <strong>☰ {p.numero} · {p.nombre}</strong>
                    <p style={{ margin: "5px 0", fontSize: 13 }}>{p.direccion}</p>
                    <strong>{dinero(p.total)}</strong>
                    {repartidores.length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
                      <select aria-label={`Repartidor para ${p.numero}`} value={asignacionMovil[p.id] || ""} onChange={e => setAsignacionMovil(v => ({ ...v, [p.id]: e.target.value }))} style={{ ...campo, padding: 8, flex: 1 }}>
                        <option value="">Elegir repartidor</option>
                        {repartidores.map(r => <option key={r.id} value={r.id} disabled={jornadas[r.id] === "finalizada"}>{r.nombre || "Repartidor"}{jornadas[r.id] === "finalizada" ? " · 🌙 Jornada finalizada" : ""}</option>)}
                      </select>
                      <button type="button" disabled={guardando || !asignacionMovil[p.id]} onClick={() => asignarBorrador(p.id, asignacionMovil[p.id])} style={{ ...boton, padding: "9px 11px", background: "#2563eb", color: "white" }}>Asignar</button>
                    </div>}
                  </div>
                ))}
              </div>
              <div>
                <h3>🛵 Repartidores</h3>
                <label style={{ display: "block", marginBottom: 12 }}>Consultar repartidor
                  <select style={{ ...campo, marginTop: 6 }} value={repartidorSeleccionado} onChange={e => setRepartidorSeleccionado(e.target.value)}>
                    <option value="todos">Todos los repartidores</option>
                    {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre || "Repartidor"}</option>)}
                  </select>
                </label>
                {cargandoRepartidores && <p>Cargando repartidores...</p>}
                {!cargandoRepartidores && !repartidores.length && <p style={{ color: "#fde68a" }}>Todavía no hay usuarios con el rol «express_repartidor» en esta empresa. Para probar el arrastre con personas reales tendremos que habilitar un repartidor de prueba.</p>}
                {viajesFiltrados.length === 0 && <p style={{ color: colores.suave }}>No hay recorridos operativos para esta selección.</p>}
                {repartidores.filter(r => repartidorSeleccionado === "todos" || r.id === repartidorSeleccionado).map(r => (
                  <div key={r.id} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={e => { e.preventDefault(); if (guardando || jornadas[r.id] === "finalizada") return; const pedidoId = e.dataTransfer.getData("text/plain"); setArrastrando(null); asignarBorrador(pedidoId, r.id); }}
                    style={{ background: "#111827", border: `2px dashed ${arrastrando ? "#a78bfa" : colores.borde}`, borderRadius: 12, padding: 14, marginBottom: 12, minHeight: 100 }}>
                    <strong>🛵 {r.nombre || "Repartidor"}</strong>
                    <p style={{ color: jornadas[r.id] === "finalizada" ? "#fca5a5" : "#86efac", fontWeight: 700, fontSize: 13 }}>
                      {jornadas[r.id] === "finalizada" ? "🌙 Jornada finalizada · no disponible" : "🟢 Jornada habilitada"}
                    </p>
                    {viajesOperativos.filter(v => v.repartidor_id === r.id).map(v =>
                      <p key={v.id} style={{ color: v.relaciones?.length && v.relaciones.every(x => x.resultado) ? "#86efac" : "#fde68a", fontSize: 13, margin: "8px 0" }}>
                        {estadoViaje(v)} · {v.relaciones?.filter(x => x.resultado).length || 0}/{v.relaciones?.length || 0} entregas resueltas
                      </p>
                    )}
                    <p style={{ color: colores.suave, fontSize: 13, margin: "7px 0" }}>Soltá aquí los pedidos · {(borradores[r.id] || []).length} en preparación</p>
                    {(borradores[r.id] || []).map(id => {
                      const p = pedidos.find(x => x.id === id);
                      return p ? <div key={id} style={{ background: colores.tarjeta, padding: 9, marginTop: 7, borderRadius: 8 }}>
                        <strong>{p.numero}</strong> · {p.nombre}
                        <button type="button" disabled={guardando} onClick={() => quitarBorrador(id)} style={{ ...boton, float: "right", padding: "3px 8px", background: "#475569", color: "white" }}>Quitar</button>
                      </div> : null;
                    })}
                    {viajesOperativos.filter(v => v.repartidor_id === r.id && v.estado === "en_camino").length > 0 && <p style={{ color: "#fde68a" }}>Tiene viaje(s) en reparto. La rendición se controla en su sección independiente.</p>}
                  </div>
                ))}
              </div>
            </div>
            <p style={{ color: colores.suave, fontSize: 13 }}>Los viajes en preparación quedan guardados al actualizar. Los recorridos anteriores no se repiten en este panel. Las entregas resueltas pasan automáticamente a ↩️ Regresando; las rendiciones se consultan por separado.</p>
          </section>
        ) : vista === "nuevo" ? (
          <section style={{ background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: 14, padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>{editandoId ? `✏️ Editar ${pedidos.find(p => p.id === editandoId)?.numero || "pedido"}` : "➕ Cargar pedido Express"}</h2>
            {editandoId && <p style={{ color: "#fde68a" }}>Podés corregir el pedido antes de la salida. Se conserva su número y el repartidor asignado. La agenda de clientes no se modifica al editar.</p>}
            <form onSubmit={editandoId ? guardarEdicion : crearPedido} style={{ display: "grid", gap: 15 }}>
              <label>📞 Teléfono del cliente (para buscarlo en la agenda)
                <input style={{ ...campo, marginTop: 6 }} type="tel" value={telefono} onChange={e => cambiarTelefono(e.target.value)} maxLength={50} placeholder="Ej.: 11 4567-8901" />
              </label>
              {!editandoId && buscandoCliente && <p style={{ color: colores.suave, margin: 0 }}>Buscando clientes...</p>}
              {!editandoId && !clienteEncontrado && coincidencias.length > 0 && <div style={{ background: "#0b1220", border: `1px solid ${colores.borde}`, borderRadius: 12, padding: 10 }}>
                <strong style={{ display: "block", marginBottom: 8 }}>📇 Clientes encontrados · tocá uno para seleccionarlo</strong>
                <div style={{ display: "grid", gap: 7 }}>
                  {coincidencias.map(c => <button key={c.id} type="button" onClick={() => elegirCliente(c)} disabled={buscandoCliente}
                    style={{ ...boton, background: "#1e3a5f", color: "white", textAlign: "left", width: "100%", border: "1px solid #60a5fa" }}>
                    👤 {c.nombre} <span style={{ display: "block", fontSize: 13, fontWeight: 400 }}>📞 {c.telefono}</span>
                  </button>)}
                </div>
                {coincidencias.length === 15 && <p style={{ fontSize: 12, color: colores.suave }}>Hay más coincidencias: escribí otro número para reducir la lista.</p>}
              </div>}
              {!editandoId && clienteEncontrado && <button type="button" onClick={() => cambiarTelefono("")}
                style={{ ...boton, background: "#334155", color: "white", textAlign: "left" }}>✓ {clienteEncontrado.nombre} · Cambiar cliente</button>}
              {!editandoId && avisoCliente && <p role="status" style={{ margin: 0, color: avisoCliente.startsWith("No se pudo") ? "#fca5a5" : "#86efac" }}>{avisoCliente}</p>}
              <label>Nombre del cliente *<input style={{ ...campo, marginTop: 6 }} value={nombre} onChange={e => setNombre(e.target.value)} required maxLength={100} placeholder="Ej.: María Pérez" /></label>
              {!editandoId && direccionesGuardadas.length > 0 && <label>📍 Elegí una dirección habitual
                <select style={{ ...campo, marginTop: 6 }} value={direccionElegida} onChange={e => seleccionarDireccion(e.target.value)}>
                  {direccionesGuardadas.map(d => <option key={d.id} value={d.id}>{d.etiqueta ? `${d.etiqueta} — ` : ""}{d.direccion}</option>)}
                  <option value="nueva">➕ Agregar otra dirección</option>
                </select>
              </label>}
              {(editandoId || direccionElegida === "nueva") ? <>
                <label>Dirección de entrega *<input style={{ ...campo, marginTop: 6 }} value={direccion} onChange={e => { setDireccion(e.target.value); limpiarDestino(); }} required maxLength={250} placeholder="Ej.: Mitre 1234, Quilmes" /></label>
                {!editandoId && <label>Nombre de esta dirección (opcional)<input style={{ ...campo, marginTop: 6 }} value={etiquetaDireccion} onChange={e => setEtiquetaDireccion(e.target.value)} maxLength={60} placeholder="Casa, trabajo, etc." /></label>}
                {!editandoId && <label>Indicaciones para encontrarla (opcional)<input style={{ ...campo, marginTop: 6 }} value={indicacionesDireccion} onChange={e => setIndicacionesDireccion(e.target.value)} maxLength={250} placeholder="Piso, timbre, portón..." /></label>}
              </> : <div style={{ background: "#0b1220", borderRadius: 10, padding: 12 }}>
                <strong>📍 {direccion}</strong>
                {indicacionesDireccion && <p style={{ marginBottom: 0, color: colores.suave }}>Indicaciones: {indicacionesDireccion}</p>}
                <p style={{ fontSize: 12, color: colores.suave, marginBottom: 0 }}>Para entregar en otro domicilio, elegí «Agregar otra dirección» arriba.</p>
              </div>}
                             {!editandoId && <div style={{ background: "#0b1220", padding: 14, borderRadius: 12, display: "grid", gap: 10 }}>
                 <strong>📍 Confirmar ubicación de entrega</strong>
                 <button type="button" disabled={buscandoDestino} onClick={buscarDestino} style={{ ...boton, background: "#2563eb", color: "white" }}>
                   {buscandoDestino ? "Buscando..." : "🔎 Buscar dirección cerca del comercio"}
                 </button>
                 {opcionesDestino.map((r, i) => <button type="button" key={i}
                   onClick={() => { setDestinoConfirmado({ lat: r.lat, lon: r.lon }); setOpcionesDestino([]); setMostrarMapaDestino(true); setAutorizarExcepcion(false); }}
                   style={{ ...boton, textAlign: "left", background: "#334155", color: "white" }}>
                   📍 {r.nombre} · {r.distancia.toFixed(1)} km del comercio
                 </button>)}
                 <button type="button" onClick={() => setMostrarMapaDestino(v => !v)}
                   style={{ ...boton, background: colores.borde, color: "white" }}>
                   {mostrarMapaDestino ? "Ocultar mapa" : "🗺️ Elegir ubicación manualmente en el mapa"}
                 </button>
                 {mostrarMapaDestino && <div style={{ height: 300, borderRadius: 10, overflow: "hidden" }}>
                   <MapContainer center={[Number(configComercio.latitud ?? -34.6037), Number(configComercio.longitud ?? -58.3816)]}
                     zoom={12} style={{ width: "100%", height: "100%" }} scrollWheelZoom={false}>
                     <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                     <CentrarMapa posicion={destinoConfirmado ? [destinoConfirmado.lat, destinoConfirmado.lon] : configComercio.latitud != null ? [Number(configComercio.latitud), Number(configComercio.longitud)] : null} />
                     <SelectorUbicacion posicion={destinoConfirmado ? [destinoConfirmado.lat, destinoConfirmado.lon] : null}
                       onElegir={([lat, lon]) => { setDestinoConfirmado({ lat, lon }); setAutorizarExcepcion(false); }} />
                     {configComercio.latitud != null && configComercio.longitud != null && <Circle
                       center={[Number(configComercio.latitud), Number(configComercio.longitud)]}
                       radius={Number(configComercio.radio_entregas_km || 5) * 1000}
                       pathOptions={{ color: "#2563eb", fillOpacity: 0.08 }} />}
                   </MapContainer>
                 </div>}
                 {destinoConfirmado && configComercio.latitud != null && configComercio.longitud != null && (() => {
                   const km = distanciaKm(Number(configComercio.latitud), Number(configComercio.longitud), destinoConfirmado.lat, destinoConfirmado.lon);
                   const fuera = km > Number(configComercio.radio_entregas_km);
                   return <div style={{ background: fuera ? "#3b2630" : "#14532d", borderRadius: 8, padding: 12 }}>
                     <strong>{fuera ? "⚠️ Fuera del radio habitual" : "✅ Destino dentro del radio"}</strong>
                     <p style={{ margin: "6px 0" }}>Distancia aproximada en línea recta: {km.toFixed(1)} km · Radio: {configComercio.radio_entregas_km} km.</p>
                     <p style={{ fontSize: 13 }}>Confirmá que el marcador está en el domicilio correcto. Podés arrastrarlo.</p>
                     {fuera && <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                       <input type="checkbox" checked={autorizarExcepcion} onChange={e => setAutorizarExcepcion(e.target.checked)} />
                       Autorizo esta entrega fuera del radio habitual
                     </label>}
                   </div>;
                 })()}
                 {avisoDestino && <p role="status" style={{ color: "#fde68a" }}>{avisoDestino}</p>}
               </div>}
               {!editandoId && !telefono.trim() && <p style={{ fontSize: 13, color: colores.suave, margin: 0 }}>Podés cargar un pedido sin teléfono, pero no se guardará en la agenda de clientes.</p>}
              <label>Importe total del pedido (ARS) *<input style={{ ...campo, marginTop: 6 }} type="number" min="0.01" step="0.01" value={total} onChange={e => setTotal(e.target.value)} required placeholder="Ej.: 18500" /></label>
              <label>Forma de cobro prevista<select style={{ ...campo, marginTop: 6 }} value={pago} onChange={e => setPago(e.target.value)}>
                <option value="efectivo_repartidor">Efectivo al entregar</option>
                <option value="tarjeta_repartidor">Tarjeta cobrada por repartidor</option>
                <option value="transferencia_repartidor">Transferencia al repartidor</option>
                <option value="transferencia_comercio">Transferencia al comercio (a verificar)</option>
                <option value="prepagado">Pagado previamente</option>
                <option value="pendiente">Pendiente / excepción</option>
              </select></label>
              <label>Detalle o indicaciones (opcional)<textarea style={{ ...campo, marginTop: 6, minHeight: 85 }} value={notas} onChange={e => setNotas(e.target.value)} maxLength={1000} placeholder="Ej.: 2 pizzas, timbre 3" /></label>
              <button type="submit" disabled={guardando} style={{ ...boton, background: "#16a34a", color: "white", minHeight: 52 }}>{guardando ? "Guardando..." : editandoId ? "💾 Guardar cambios" : "💾 Guardar pedido en Supabase"}</button>
              {editandoId && <button type="button" disabled={guardando} onClick={() => { limpiarFormulario(); setVista("pedidos"); }} style={{ ...boton, background: colores.borde, color: "white" }}>Cancelar edición</button>}
            </form>
          </section>
        ) : (
          <section style={{ background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: 14, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 21 }}>📋 Pedidos Express</h2>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>Estado<select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...campo, width: 170, padding: 9 }}>
              <option value="todos">Todos</option>
              <option value="preparando">Preparando</option>
              <option value="listo">Listos</option>
              <option value="en_camino">En camino</option>
              <option value="entregado">Entregados</option>
              <option value="no_entregado">No entregados</option>
            </select></label>
            </div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <strong>🤝 Transferencias de pedidos</strong>
              <span style={{ color: colores.suave, fontSize: 13 }}>Recibidas: {transferenciasParaMi.length} · Enviadas: {transferenciasEnviadas.length}</span>
              <button type="button" onClick={cargarHerencias} disabled={Boolean(operacionHerencia) || cargandoHerencias} style={{ ...boton, background: "#334155", color: "white", padding: "8px 12px" }}>{cargandoHerencias ? "⏳ Consultando..." : "↻ Actualizar"}</button>
            </div>
            {errorHerencia && <p role="alert" style={{ color: "#fca5a5" }}>{errorHerencia}</p>}
            {avisoHerencia && <p role="status" style={{ color: "#86efac" }}>{avisoHerencia}</p>}
            {/* La herencia recibida debe poder aceptarse ANTES de que el pedido pase a este turno.
                No depender de pedidosVisibles ni de que RLS permita leer el pedido ajeno. */}
            {transferenciasParaMi.length > 0 && (
              <section aria-label="Herencias recibidas pendientes" style={{ display: "grid", gap: 9, marginBottom: 15 }}>
                <strong style={{ color: "#fde68a" }}>📥 Herencias recibidas pendientes de aceptar</strong>
                {transferenciasParaMi.map(h => {
                  const pedido = pedidos.find(p => p.id === h.pedido_id);
                  const turnoOrigen = turnosDisponibles.find(t => t.id === h.turno_origen_id);
                  const supervisorOrigen = turnoOrigen ? nombresSupervisores[turnoOrigen.supervisor_id] : null;
                  return (
                    <div key={h.id} style={{ padding: 13, borderRadius: 10, border: "1px solid #a16207", background: "#29200e" }}>
                      <div style={{ fontWeight: 800, color: "#fef3c7" }}>
                        {pedido ? `${pedido.numero} · ${pedido.nombre}` : "Pedido pendiente de recibir"}
                      </div>
                      <div style={{ fontSize: 13, color: "#fde68a", marginTop: 5 }}>
                        {supervisorOrigen ? `Enviado por ${supervisorOrigen}. ` : ""}El pedido todavía está bajo responsabilidad del supervisor saliente.
                      </div>
                      <button type="button" disabled={Boolean(operacionHerencia)}
                        onClick={() => ejecutarHerencia("aceptar", h.id, pedido?.numero || "pendiente")}
                        style={{ ...boton, background: "#15803d", color: "white", marginTop: 10 }}>
                        {operacionHerencia === h.id ? "⏳ Aceptando..." : "✓ ACEPTAR HERENCIA"}
                      </button>
                    </div>
                  );
                })}
              </section>
            )}
            {visibles.length === 0 && transferenciasParaMi.length === 0 && <p style={{ color: colores.suave }}>No hay pedidos en esta selección.</p>}
            <div className="ex-lista-pedidos" style={{ display: "grid", gap: 7 }}>
              {visibles.map(p => (
                <article className="ex-pedido" key={p.id} style={{ border: `1px solid ${colores.borde}`, borderRadius: 10, padding: 10, background: "#111827" }}>
                  <details className="ex-pedido-desplegable" style={{ width: "100%" }}>
                    <summary style={{ cursor: "pointer", listStyle: "none", padding: "2px 0", color: colores.texto }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                        <strong style={{ fontSize: 15 }}>{p.numero} · {p.nombre}</strong>
                        <span className={`ex-estado ${p.estado === "no_entregado" ? "ex-estado-no-entregado" : ""}`} style={{ fontSize: 11, padding: "3px 6px" }}>
                          {p.estado === "no_entregado" ? "⚠️ No entregado" : (etiqueta[p.estado] || p.estado.replaceAll("_", " "))}
                        </span>
                        {transferenciasParaMi.some(h => h.pedido_id === p.id) && <span style={{ color: "#fde68a", fontSize: 11, fontWeight: 800 }}>⚠️ REQUIERE ATENCIÓN</span>}
                        {transferenciasEnviadas.some(h => h.pedido_id === p.id) && <span style={{ color: "#fbbf24", fontSize: 11, fontWeight: 800 }}>⏳ Transferencia pendiente</span>}
                        {turnoActual?.id && p.turnoOrigenId === turnoActual.id && p.turnoResponsableId && p.turnoResponsableId !== turnoActual.id && <span style={{ color: "#86efac", fontSize: 11, fontWeight: 800 }}>✓ Transferido</span>}
                        {p.turnoResponsableId === turnoActual?.id && p.turnoOrigenId !== turnoActual?.id && <span style={{ color: "#86efac", fontSize: 11, fontWeight: 800 }}>↪ Heredado</span>}
                        <span style={{ marginLeft: "auto", color: "#93c5fd", fontSize: 12 }}>▼ Ver</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 5, fontSize: 13 }}>
                        <span style={{ color: colores.suave, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>📍 {p.direccion || "Sin dirección"}</span>
                        <strong style={{ flexShrink: 0, fontSize: 15, color: "#f8fafc" }}>{dinero(p.total)}</strong>
                      </div>
                    </summary>
                    <div style={{ borderTop: `1px solid ${colores.borde}`, marginTop: 10, paddingTop: 5 }}>
                  {transferenciasEnviadas.some(h => h.pedido_id === p.id) && (() => {
                    const h = transferenciasEnviadas.find(h => h.pedido_id === p.id);
                    const destino = turnosDisponibles.find(t => t.id === h.turno_destino_id);
                    const nombreDestino = destino ? (nombresSupervisores[destino.supervisor_id] || "otro supervisor") : "otro supervisor";
                    return (
                      <div style={{ marginTop: 12, marginBottom: 7, padding: "13px 15px", background: "#33250e", border: "1px solid #d97706", borderRadius: 10, color: "#fef3c7" }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: "#fbbf24", letterSpacing: 0.4 }}>⏳ TRANSFERENCIA PENDIENTE</div>
                        <div style={{ marginTop: 6, fontWeight: 900, fontSize: 17, color: "#fff7ed" }}>Destino: {String(nombreDestino).toUpperCase()}</div>
                        <div style={{ marginTop: 5, fontSize: 13, color: "#fde68a" }}>Esperando que el supervisor entrante acepte el pedido.</div>
                      </div>
                    );
                  })()}
                  {turnoActual?.id && p.turnoOrigenId === turnoActual.id && p.turnoResponsableId && p.turnoResponsableId !== turnoActual.id && (() => {
                    const supervisorDestinoId = turnosHistoricos[p.turnoResponsableId] || turnosDisponibles.find(t => t.id === p.turnoResponsableId)?.supervisor_id;
                    const destino = supervisorDestinoId ? nombresSupervisores[supervisorDestinoId] : null;
                    return <div style={{ marginTop: 12, marginBottom: 8, padding: "13px 15px", borderRadius: 10, border: "1px solid #16a34a", background: "#102b22", color: "#bbf7d0" }}>
                      <div style={{ fontSize: 14, fontWeight: 900 }}>✓ TRANSFERENCIA ACEPTADA</div>
                      <div style={{ marginTop: 5, fontSize: 17, fontWeight: 900 }}>Responsable actual: {destino ? destino.toUpperCase() : "SUPERVISOR NO IDENTIFICADO"}</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>Solo consulta. Ya no podés editar ni operar este pedido.</div>
                    </div>;
                  })()}
                  {p.turnoResponsableId === turnoActual?.id && p.turnoOrigenId !== turnoActual?.id && (() => {
                    const origenId = turnosHistoricos[p.turnoOrigenId] || turnosDisponibles.find(t => t.id === p.turnoOrigenId)?.supervisor_id;
                    const nombreOrigen = origenId ? nombresSupervisores[origenId] : null;
                    return <div style={{ color: "#86efac", marginTop: 7, fontSize: 13 }}>↪ Heredado de {nombreOrigen || "otro supervisor"}</div>;
                  })()}
                  {(() => {
                    const h = transferenciasParaMi.find(h => h.pedido_id === p.id);
                    if (!h) return null;
                    const origen = turnosDisponibles.find(t => t.id === h.turno_origen_id);
                    const nombreOrigen = origen ? nombresSupervisores[origen.supervisor_id] : null;
                    return <div style={{ marginTop: 10, padding: 12, background: "#29200e", border: "1px solid #a16207", borderRadius: 9 }}>
                      <strong>⚠️ Requiere atención · Transferencia de {nombreOrigen || "otro supervisor"}</strong>
                      <p style={{ color: "#fde68a", fontSize: 13, margin: "7px 0" }}>Este pedido todavía pertenece al supervisor saliente. Aceptalo para asumir la responsabilidad.</p>
                      <button type="button" disabled={Boolean(operacionHerencia)} onClick={() => ejecutarHerencia("aceptar", h.id, p.numero)} style={{ ...boton, background: "#15803d", color: "white" }}>✓ ACEPTAR PEDIDO</button>
                    </div>;
                  })()}
                  {/* Datos adicionales, sin repetir importe ni dirección del resumen. */}
                  <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, border: `1px solid ${colores.borde}`, background: "#172235", fontSize: 13, lineHeight: 1.5 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", alignItems: "center" }}>
                      <span>📞 {p.telefono || "Sin teléfono"}</span>
                      <span>💳 {p.pago ? p.pago.replaceAll("_", " ") : "Sin modalidad informada"}</span>
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>📝 {p.notas || p.detalle || "Sin detalle"}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: 4, color: colores.suave, fontSize: 12 }}>
                      <span>🕒 Pedido: {p.creado || "Sin fecha registrada"}</span>
                      {p.estado === "entregado" && p.entregadoEn && <span>✓ Entregado: {new Date(p.entregadoEn).toLocaleString("es-AR")}</span>}
                      {["entregado", "no_entregado"].includes(p.estado) && (() => {
                        const gps = auditoriasGps[p.id];
                        if (!gps) return <span style={{ color: "#cbd5e1" }}>📍 GPS: sin registro de verificación</span>;
                        if (gps.estado_gps !== "medido" || gps.distancia_m == null)
                          return <span style={{ color: "#fbbf24" }}>📍 GPS: no verificado ({gps.estado_gps === "sin_destino" ? "destino sin coordenadas" : "sin ubicación nueva"})</span>;
                        const fuera = Number(gps.distancia_m) > 100;
                        return <span style={{ color: fuera ? "#fbbf24" : "#86efac", fontWeight: 700 }}>
                          {fuera ? "⚠️" : "📍"} GPS: {Number(gps.distancia_m).toLocaleString("es-AR")} m del destino
                          {fuera ? " · Fuera del margen (100 m)" : " · Dentro del margen"}
                          {gps.precision_m != null ? ` · Precisión ±${gps.precision_m} m` : ""}
                        </span>;
                      })()}
                    </div>
                  </div>
                  {p.turnoResponsableId === turnoActual?.id && !idsParaMi.has(p.id) && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {["preparando", "listo"].includes(p.estado) && <button type="button" disabled={guardando} onClick={() => comenzarEdicion(p)} style={{ ...boton, background: "#2563eb", color: "white" }}>✏️ Editar pedido</button>}
                    {p.estado === "preparando" && <button type="button" disabled={guardando} onClick={() => cambiarEstado(p.id, "listo")} style={{ ...boton, background: "#15803d", color: "white" }}>✅ Marcar listo</button>}
                  </div>}
                  {turnoActual?.id && p.turnoResponsableId === turnoActual.id && !herenciasPendientes.some(h => h.pedido_id === p.id) && !["entregado", "no_entregado", "cancelado"].includes(p.estado) &&
                    <details style={{ marginTop: 9 }}>
                      <summary style={{ cursor: "pointer", color: "#93c5fd", fontSize: 12, fontWeight: 700, padding: "5px 2px", width: "fit-content" }}>↗ Transferir a otro supervisor</summary>
                      <div style={{ padding: "10px 0 5px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <select aria-label="Supervisor que recibirá el pedido" value={destinosHerencia[p.id] || ""} onChange={e => setDestinosHerencia(prev => ({ ...prev, [p.id]: e.target.value }))} style={{ ...campo, maxWidth: 310 }}>
                          <option value="">Elegir supervisor con turno abierto...</option>
                          {turnosDisponibles.filter(t => t.id !== turnoActual.id).map(t => <option key={t.id} value={t.id}>{nombresSupervisores[t.supervisor_id] || `Supervisor ${t.supervisor_id.slice(0, 8)}`}</option>)}
                          {cargandoHerencias && <option value="" disabled>Consultando turnos abiertos...</option>}
                        </select>
                        <button type="button" disabled={Boolean(operacionHerencia) || !destinosHerencia[p.id]} onClick={() => ejecutarHerencia("ofrecer", p.id, p.numero)} style={{ ...boton, background: "#2563eb", color: "white", padding: "9px 12px", fontSize: 12 }}>➡️ CONFIRMAR TRANSFERENCIA</button>
                      </div>
                    </details>}
                    </div>
                  </details>
                </article>
              ))}
            </div>
            <p style={{ color: colores.suave, fontSize: 12, marginTop: 10 }}>Pedidos de tu responsabilidad actual (consulta limitada a los últimos 500 de la empresa). Para asignarlos, usá «Preparar viajes». {esAdminExpress ? "Vista general del administrador." : "Vista operativa de tu turno y transferencias recibidas."}</p>
          </section>
        )}
          </>
        )}
        </div>
      </div>
    </main>
  );
}
