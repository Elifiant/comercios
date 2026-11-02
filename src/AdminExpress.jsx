import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const iconoSucursal = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function ControlesMapaSucursal({ posicion, alCambiar }) {
  const mapa = useMap();
  useMapEvents({ click: e => alCambiar(e.latlng) });
  useEffect(() => { if (posicion) mapa.setView(posicion, Math.max(mapa.getZoom(), 16)); }, [mapa, posicion?.[0], posicion?.[1]]);
  return posicion ? <Marker position={posicion} icon={iconoSucursal} draggable
    eventHandlers={{ dragend: e => alCambiar(e.target.getLatLng()) }} /> : null;
}


// RutaComercios Express — panel del dueño: estadísticas de consulta y configuración de sucursales.
// La seguridad entre empresas debe estar garantizada también por RLS en Supabase.
const AZUL = "#60a5fa", VERDE = "#22c55e", ROJO = "#ef4444", NARANJA = "#fb923c";
const moneda = n => Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const diaLocal = valor => {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};
const fechaVisible = clave => {
  const [y,m,d] = clave.split("-");
  return `${d}/${m}`;
};
const inicioDiaArg = (diasAtras = 29) => {
  const ahora = new Date();
  const hoy = diaLocal(ahora);
  const inicio = new Date(`${hoy}T12:00:00-03:00`);
  inicio.setDate(inicio.getDate() - diasAtras);
  return diaLocal(inicio);
};
const suma = (arr, campo) => arr.reduce((a, x) => a + Number(x[campo] || 0), 0);
const fin = estado => ["entregado", "no_entregado", "cancelado"].includes(estado);

async function todasLasFilas(tabla, columnas, empresaId, desde, campoFecha) {
  const resultado = [];
  const pagina = 750;
  for (let offset = 0; ; offset += pagina) {
    let q = supabase.from(tabla).select(columnas).eq("empresa_id", empresaId)
      .order(campoFecha, { ascending: false }).range(offset, offset + pagina - 1);
    if (desde) q = q.gte(campoFecha, desde);
    const { data, error } = await q;
    if (error) throw new Error(`${tabla}: ${error.message}`);
    resultado.push(...(data || []));
    if (!data || data.length < pagina) break;
    if (offset > 30000) throw new Error(`Demasiados registros en ${tabla}. Hace falta una consulta resumida en el servidor.`);
  }
  return resultado;
}

function Grafico({ titulo, subtitulo, series, datos, formato = n => String(n) }) {
  const ancho = 920, alto = 230, izq = 78, der = 16, arriba = 20, abajo = 40;
  const maximo = Math.max(1, ...datos.flatMap(d => series.map(s => Number(d[s.clave] || 0))));
  const w = ancho - izq - der, h = alto - arriba - abajo;
  const x = i => izq + (datos.length < 2 ? w / 2 : i * w / (datos.length - 1));
  const y = v => arriba + h - Number(v || 0) / maximo * h;
  return <section style={est.tarjeta}>
    <h3 style={{ margin: "0 0 5px", color: "#f8fafc" }}>{titulo}</h3>
    <div style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 14 }}>{subtitulo}</div>
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
      {series.map(s => <span key={s.clave} style={{ color: s.color, fontWeight: 750, fontSize: 13 }}>● {s.nombre}</span>)}
    </div>
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} style={{ width: "100%", minWidth: 530, display: "block" }} role="img" aria-label={titulo}>
        {[0, 1, 2, 3, 4].map(i => {
          const valor = maximo * i / 4;
          return <g key={i}><line x1={izq} x2={ancho - der} y1={y(valor)} y2={y(valor)} stroke="#475569" strokeDasharray="3 5" opacity=".65" />
            <text x={izq - 9} y={y(valor) + 4} fill="#cbd5e1" textAnchor="end" fontSize="12">{formato(valor)}</text></g>;
        })}
        {series.map(s => <polyline key={s.clave} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
          points={datos.map((d, i) => `${x(i)},${y(d[s.clave])}`).join(" ")} />)}
        {datos.map((d, i) => (i % Math.max(1, Math.ceil(datos.length / 9)) === 0 || i === datos.length - 1)
          ? <text key={i} x={x(i)} y={alto - 12} fill="#cbd5e1" textAnchor="middle" fontSize="12">{d.etiqueta}</text> : null)}
      </svg>
    </div>
  </section>;
}

const est = {
  tarjeta: { background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: 18, minWidth: 0 },
  boton: { border: "1px solid #475569", borderRadius: 9, padding: "10px 14px", background: "#26374e", color: "white", fontWeight: 750, cursor: "pointer" },
};

export default function AdminExpress() {
  const salirExpress = async () => {
    if (!window.confirm("¿Querés salir de RutaComercios Express?")) return;
    const { error } = await supabase.auth.signOut();
    if (error) { window.alert(`No se pudo cerrar sesión: ${error.message}`); return; }
    window.location.replace("/");
  };

  const [identidad, setIdentidad] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");
  const [ultimaCarga, setUltimaCarga] = useState(null);
  const [detalle, setDetalle] = useState("todos");
  // El dueño crea y configura las sucursales de su propia empresa.
  // El servidor debe aplicar los permisos de creación y edición mediante RLS.
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState("");
  const [formSucursal, setFormSucursal] = useState({
    nombre: "", direccion: "", latitud: "", longitud: "", radio_entregas_km: ""
  });
  const [cargandoSucursales, setCargandoSucursales] = useState(false);
  const [guardandoSucursal, setGuardandoSucursal] = useState(false);
  const [mensajeSucursal, setMensajeSucursal] = useState("");
  const [creandoSucursal, setCreandoSucursal] = useState(false);
  const [nombreNuevaSucursal, setNombreNuevaSucursal] = useState("");
  const [direccionBusqueda, setDireccionBusqueda] = useState({ calle: "", localidad: "", partido: "", provincia: "Buenos Aires" });
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [mensajeMapa, setMensajeMapa] = useState("");
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [centroMapa, setCentroMapa] = useState([-34.72, -58.26]);

  // Asignación de supervisor y repartidor a una sucursal.
  const [personalExpress, setPersonalExpress] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [cargandoPersonal, setCargandoPersonal] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState("");
  const [mensajePersonal, setMensajePersonal] = useState("");

  const cargarPersonalExpress = useCallback(async (empresaId) => {
    setCargandoPersonal(true);
    setMensajePersonal("");
    try {
      const { data: roles, error: er } = await supabase.from("perfiles_roles")
        .select("perfil_id,rol").eq("empresa_id", empresaId).eq("activo", true)
        .in("rol", ["express_operador", "express_repartidor"]);
      if (er) throw er;
      const ids = [...new Set((roles || []).map(r => r.perfil_id).filter(Boolean))];
      let perfiles = [];
      for (let i = 0; i < ids.length; i += 100) {
        const { data, error: ep } = await supabase.from("perfiles")
          .select("id,nombre,email,activo").eq("empresa_id", empresaId).in("id", ids.slice(i, i + 100));
        if (ep) throw ep;
        perfiles.push(...(data || []));
      }
      const { data: asignadas, error: ea } = await supabase.from("express_personal_sucursales")
        .select("perfil_id,sucursal_id").eq("empresa_id", empresaId);
      if (ea) throw ea;
      const rolesPorId = {};
      for (const r of (roles || [])) {
        if (!rolesPorId[r.perfil_id]) rolesPorId[r.perfil_id] = new Set();
        rolesPorId[r.perfil_id].add(r.rol);
      }
      setPersonalExpress(perfiles.filter(p => p.activo !== false).map(p => ({
        ...p, roles: [...(rolesPorId[p.id] || [])]
      })).sort((a,b) => (a.nombre || "").localeCompare(b.nombre || "", "es")));
      setAsignaciones(Object.fromEntries((asignadas || []).map(a => [a.perfil_id, a.sucursal_id])));
    } catch (e) {
      setMensajePersonal(`No se pudo cargar el personal: ${e.message}`);
    } finally {
      setCargandoPersonal(false);
    }
  }, []);

  useEffect(() => {
    if (identidad?.empresa_id) cargarPersonalExpress(identidad.empresa_id);
  }, [identidad?.empresa_id, cargarPersonalExpress]);

  const asignarSucursal = async (perfilId, nuevaSucursalId) => {
    if (!identidad?.empresa_id || !nuevaSucursalId || guardandoPerfil) return;
    const anterior = asignaciones[perfilId] || "";
    if (anterior === nuevaSucursalId) return;
    setGuardandoPerfil(perfilId);
    setMensajePersonal("");
    try {
      const { error: e } = await supabase.from("express_personal_sucursales")
        .upsert({ empresa_id: identidad.empresa_id, perfil_id: perfilId, sucursal_id: nuevaSucursalId },
          { onConflict: "empresa_id,perfil_id" });
      if (e) throw e;
      setAsignaciones(prev => ({ ...prev, [perfilId]: nuevaSucursalId }));
      setMensajePersonal("✅ Sucursal principal asignada correctamente.");
    } catch (e) {
      setMensajePersonal(`No se pudo asignar la sucursal: ${e.message}`);
    } finally {
      setGuardandoPerfil("");
    }
  };

  useEffect(() => {
    if (!identidad?.empresa_id) return;
    let activo = true;
    (async () => {
      setCargandoSucursales(true);
      const { data, error: e } = await supabase.from("express_sucursales")
        .select("id,nombre,direccion,latitud,longitud,radio_entregas_km,activa")
        .eq("empresa_id", identidad.empresa_id).eq("activa", true).order("nombre");
      if (!activo) return;
      if (e) setMensajeSucursal(`No se pudieron cargar las sucursales: ${e.message}`);
      else {
        setSucursales(data || []);
        setSucursalId(anterior => (data || []).some(s => s.id === anterior) ? anterior : (data?.[0]?.id || ""));
      }
      setCargandoSucursales(false);
    })();
    return () => { activo = false; };
  }, [identidad?.empresa_id]);

  useEffect(() => {
    const s = sucursales.find(x => x.id === sucursalId);
    setFormSucursal({
      nombre: s?.nombre || "",
      direccion: s?.direccion || "",
      latitud: s?.latitud == null ? "" : String(s.latitud),
      longitud: s?.longitud == null ? "" : String(s.longitud),
      radio_entregas_km: s?.radio_entregas_km == null ? "" : String(s.radio_entregas_km)
    });
  }, [sucursalId, sucursales]);

  useEffect(() => {
    const actual = sucursales.find(x => x.id === sucursalId);
    const partes = String(actual?.direccion || "").split(",").map(x => x.trim());
    setDireccionBusqueda({
      calle: partes[0] || "",
      localidad: partes[1] || "",
      partido: partes[2] || "",
      provincia: partes[3] || "Buenos Aires"
    });
    setMostrarMapa(false);
    setMensajeMapa("");
  }, [sucursalId]);

  const posicionSucursal = useMemo(() => {
    const lat = Number(String(formSucursal.latitud).replace(",", "."));
    const lon = Number(String(formSucursal.longitud).replace(",", "."));
    return String(formSucursal.latitud).trim() && String(formSucursal.longitud).trim() &&
      Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
      ? [lat, lon] : null;
  }, [formSucursal.latitud, formSucursal.longitud]);

  const fijarUbicacionSucursal = ({ lat, lng }) => {
    setFormSucursal(f => ({ ...f, latitud: Number(lat).toFixed(7), longitud: Number(lng).toFixed(7) }));
    setCentroMapa([lat, lng]);
    setMensajeMapa("📍 Marcador actualizado. Tocá GUARDAR CONFIGURACIÓN para confirmar.");
  };

  const buscarDireccionSucursal = async () => {
    const { calle, localidad, partido, provincia } = direccionBusqueda;
    if (!calle.trim() || !localidad.trim() || !provincia.trim()) {
      setMensajeMapa("Completá calle y número, localidad y provincia."); return;
    }
    setBuscandoDireccion(true);
    setMensajeMapa("");
    try {
      const consulta = [calle, localidad, partido, provincia, "Argentina"].filter(Boolean).join(", ");
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=3&countrycodes=ar&q=${encodeURIComponent(consulta)}`;
      const respuesta = await fetch(url, { headers: { Accept: "application/json" } });
      if (!respuesta.ok) throw new Error("El servicio de mapas no respondió.");
      const lugares = await respuesta.json();
      if (!lugares.length) { setMensajeMapa("No se encontró esa dirección. Revisala o corregí el punto directamente en el mapa."); setMostrarMapa(true); return; }
      const lat = Number(lugares[0].lat), lng = Number(lugares[0].lon);
      setFormSucursal(f => ({ ...f, latitud: lat.toFixed(7), longitud: lng.toFixed(7) }));
      setCentroMapa([lat, lng]);
      setMostrarMapa(true);
      setMensajeMapa("📍 Dirección encontrada. Verificá el marcador y movelo si hace falta; después guardá.");
    } catch (e) { setMensajeMapa(`No se pudo buscar la dirección: ${e.message}`); }
    finally { setBuscandoDireccion(false); }
  };

  const crearSucursal = async (evento) => {
    evento.preventDefault();
    if (!identidad?.empresa_id || guardandoSucursal) return;
    const nombre = nombreNuevaSucursal.trim();
    if (!nombre) { setMensajeSucursal("Ingresá el nombre de la nueva sucursal."); return; }
    if (sucursales.some(s => s.nombre.trim().toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"))) {
      setMensajeSucursal("Ya existe una sucursal activa con ese nombre."); return;
    }
    if (!window.confirm(`¿Dar de alta la sucursal «${nombre}»?`)) return;
    setGuardandoSucursal(true);
    setMensajeSucursal("");
    try {
      const { data, error: e } = await supabase.from("express_sucursales")
        .insert({ empresa_id: identidad.empresa_id, nombre, activa: true })
        .select("id,nombre,direccion,latitud,longitud,radio_entregas_km,activa")
        .single();
      if (e) throw e;
      setSucursales(prev => [...prev, data].sort((a,b) => a.nombre.localeCompare(b.nombre, "es")));
      setSucursalId(data.id);
      setNombreNuevaSucursal("");
      setCreandoSucursal(false);
      setMensajeSucursal("✅ Sucursal creada. Completá su dirección, GPS y radio de entregas.");
    } catch (e) {
      setMensajeSucursal(`No se pudo crear la sucursal: ${e.message}. Si indica falta de permisos, hay que habilitar el alta para el dueño en Supabase.`);
    } finally {
      setGuardandoSucursal(false);
    }
  };

  const guardarSucursal = async (evento) => {
    evento.preventDefault();
    if (!identidad?.empresa_id || !sucursalId || guardandoSucursal) return;
    const nombre = sucursales.find(s => s.id === sucursalId)?.nombre?.trim();
    if (!nombre) { setMensajeSucursal("Seleccioná una sucursal válida."); return; }
    const convertir = (valor, minimo, maximo, etiqueta) => {
      if (String(valor).trim() === "") return null;
      const n = Number(String(valor).replace(",", "."));
      if (!Number.isFinite(n) || n < minimo || n > maximo) throw new Error(`${etiqueta}: valor inválido.`);
      return n;
    };
    let cambios;
    try {
      const latitud = convertir(formSucursal.latitud, -90, 90, "Latitud");
      const longitud = convertir(formSucursal.longitud, -180, 180, "Longitud");
      if ((latitud === null) !== (longitud === null)) throw new Error("Completá latitud y longitud juntas.");
      cambios = {
        nombre,
        direccion: [direccionBusqueda.calle, direccionBusqueda.localidad, direccionBusqueda.partido, direccionBusqueda.provincia]
          .map(v => v.trim()).filter(Boolean).join(", ") || null,
        latitud,
        longitud,
        radio_entregas_km: convertir(formSucursal.radio_entregas_km, 0, 100000, "Radio de entregas")
      };
    } catch (e) { setMensajeSucursal(e.message); return; }
    setGuardandoSucursal(true);
    setMensajeSucursal("");
    const { data, error: e } = await supabase.from("express_sucursales")
      .update(cambios)
      .eq("id", sucursalId).eq("empresa_id", identidad.empresa_id)
      .select("id,nombre,direccion,latitud,longitud,radio_entregas_km,activa")
      .single();
    if (e) setMensajeSucursal(`No se pudo guardar: ${e.message}`);
    else {
      setSucursales(prev => prev.map(s => s.id === data.id ? data : s));
      setMensajeSucursal("✅ Configuración guardada correctamente.");
    }
    setGuardandoSucursal(false);
  };


  const cargar = useCallback(async (empresaId, primera = false) => {
    if (primera) setCargando(true); else setActualizando(true);
    setError("");
    try {
      const desde = inicioDiaArg(29);
      const desdeISO = `${desde}T00:00:00-03:00`;
      const [ps, ts, roles, rs] = await Promise.all([
        todasLasFilas("express_pedidos", "id,numero_express,importe_total,estado,creado_en,entregado_en,turno_origen_id,turno_responsable_id", empresaId, desdeISO, "creado_en"),
        todasLasFilas("express_turnos_supervisores", "id,supervisor_id,inicio_en,estado", empresaId, null, "inicio_en"),
        supabase.from("perfiles_roles").select("perfil_id,rol,activo").eq("empresa_id", empresaId).eq("activo", true).in("rol", ["express_operador", "express_repartidor"]),
        todasLasFilas("express_viajes_pedidos", "pedido_id,viaje_id,resultado,registrado_en", empresaId, desdeISO, "registrado_en"),
      ]);
      if (roles.error) throw new Error(`perfiles_roles: ${roles.error.message}`);
      const ids = [...new Set([...(roles.data || []).map(r => r.perfil_id), ...ts.map(t => t.supervisor_id)].filter(Boolean))];
      let perfiles = [];
      for (let i = 0; i < ids.length; i += 100) {
        const { data, error: e } = await supabase.from("perfiles").select("id,nombre,activo").eq("empresa_id", empresaId).in("id", ids.slice(i, i + 100));
        if (e) throw new Error(`perfiles: ${e.message}`);
        perfiles.push(...(data || []));
      }
      setPedidos(ps); setTurnos(ts); setPersonas(perfiles); setResultados(rs);
      setUltimaCarga(new Date());
    } catch (e) { setError(e.message || "No se pudieron cargar las estadísticas."); }
    finally { setCargando(false); setActualizando(false); }
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data: auth, error: eAuth } = await supabase.auth.getUser();
        if (eAuth || !auth?.user) throw new Error("Iniciá sesión para ver el panel del dueño.");
        const { data: perfil, error: ep } = await supabase.from("perfiles")
          .select("id,nombre,empresa,empresa_id,activo").eq("id", auth.user.id).single();
        if (ep || !perfil?.empresa_id || perfil.activo !== true) throw new Error("Perfil o empresa no disponibles.");
        const { data: roles, error: er } = await supabase.from("perfiles_roles").select("rol")
          .eq("perfil_id", auth.user.id).eq("empresa_id", perfil.empresa_id).eq("activo", true).eq("rol", "express_admin");
        if (er || !roles?.length) throw new Error("Esta pantalla es exclusiva del Administrador Express.");
        if (!vivo) return;
        setIdentidad(perfil);
        await cargar(perfil.empresa_id, true);
      } catch (e) { if (vivo) { setError(e.message); setCargando(false); } }
    })();
    return () => { vivo = false; };
  }, [cargar]);

  const estadisticas = useMemo(() => {
    const desde = inicioDiaArg(29);
    const dias = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(`${desde}T12:00:00-03:00`);
      d.setDate(d.getDate() + i);
      const clave = diaLocal(d);
      return { clave, etiqueta: fechaVisible(clave), pedidos: 0, entregadas: 0, rechazadas: 0, ventas: 0, pendientes: 0 };
    });
    const mapa = Object.fromEntries(dias.map(d => [d.clave, d]));
    const turnosPorId = Object.fromEntries(turnos.map(t => [t.id, t]));
    const nombres = Object.fromEntries(personas.map(p => [p.id, p.nombre]));
    const supervisores = {};
    const porTurno = {};
    const getSupervisor = id => {
      const nombre = nombres[id] || (id ? `Supervisor ${id.slice(0, 8)}` : "Sin turno de origen");
      if (!supervisores[id || "sin-turno"]) supervisores[id || "sin-turno"] = { id, nombre, pedidos: 0, ventas: 0, entregadas: 0, rechazadas: 0 };
      return supervisores[id || "sin-turno"];
    };
    for (const p of pedidos) {
      const fecha = diaLocal(p.creado_en);
      const d = mapa[fecha];
      if (!d) continue;
      const supervisorId = turnosPorId[p.turno_origen_id]?.supervisor_id || null;
      const s = getSupervisor(supervisorId);
      const claveTurno = p.turno_origen_id || "sin-turno";
      if (!porTurno[claveTurno]) porTurno[claveTurno] = { id: claveTurno, supervisorId, nombre: s.nombre, inicio: turnosPorId[claveTurno]?.inicio_en || null, pedidos: 0, ventas: 0 };
      const t = porTurno[claveTurno];
      t.pedidos++;
      const importe = Number(p.importe_total || 0);
      d.pedidos++; s.pedidos++;
      if (p.estado === "entregado") { d.ventas += importe; s.ventas += importe; t.ventas += importe; s.entregadas++; }
      else if (p.estado === "no_entregado" || p.estado === "cancelado") { s.rechazadas++; }
      else { d.ventas += importe; d.pendientes += importe; s.ventas += importe; t.ventas += importe; }
    }
    // Resultados por fecha efectiva de resolución, no por fecha de creación.
    // Un pedido puede figurar en varios viajes; usar únicamente el último resultado registrado.
    const ultimo = new Map();
    for (const r of resultados) {
      if (!r.pedido_id || !["entregado", "no_entregado"].includes(r.resultado)) continue;
      const anterior = ultimo.get(r.pedido_id);
      if (!anterior || new Date(r.registrado_en) > new Date(anterior.registrado_en)) ultimo.set(r.pedido_id, r);
    }
    for (const r of ultimo.values()) {
      const d = mapa[diaLocal(r.registrado_en)];
      if (!d) continue;
      if (r.resultado === "entregado") d.entregadas++;
      if (r.resultado === "no_entregado") d.rechazadas++;
    }
    return { dias, supervisores: Object.values(supervisores).sort((a,b) => b.ventas - a.ventas), porTurno: Object.values(porTurno).sort((a,b) => String(b.inicio).localeCompare(String(a.inicio))), nombres, turnosPorId };
  }, [pedidos, turnos, personas, resultados]);

  const { dias, supervisores, porTurno } = estadisticas;
  const totales = { pedidos: suma(dias, "pedidos"), entregadas: suma(dias, "entregadas"), rechazadas: suma(dias, "rechazadas"), ventas: suma(dias, "ventas"), pendientes: suma(dias, "pendientes") };
  const formatoMiles = n => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n));
  const hoy = diaLocal(new Date());
  const pedidosHoy = pedidos.filter(p => diaLocal(p.creado_en) === hoy);
  const turnoAbierto = turnos.filter(t => t.estado === "abierto");

  return <main style={{ minHeight: "100vh", background: "#0f172a", color: "#f8fafc", padding: "22px clamp(12px,3vw,36px)", fontFamily: "system-ui,sans-serif" }}>
    <div style={{ maxWidth: 1400, margin: "auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <div><h1 style={{ margin: 0, fontSize: 28, color: "#f8fafc" }}>RutaComercios <span style={{ color: NARANJA }}>Express</span></h1>
          <div style={{ color: "#cbd5e1", marginTop: 5 }}>Panel del dueño · {identidad?.empresa || ""}</div></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" style={est.boton} disabled={!identidad || actualizando} onClick={() => cargar(identidad.empresa_id)}>{actualizando ? "Actualizando…" : "↻ Actualizar"}</button>
          <button type="button" onClick={salirExpress} style={{ ...est.boton, background: "#b91c1c", color: "white" }}>🚪 SALIR</button>
        </div>
      </header>
      <section style={{ ...est.tarjeta, marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 21, color: "#f8fafc" }}>⚙️ Configuración de sucursales</h2>
        <p style={{ color: "#cbd5e1", fontSize: 13, marginTop: 0 }}>
          Como dueño, podés dar de alta sucursales de tu empresa y configurar su dirección, GPS y radio de entregas.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <button type="button" style={{ ...est.boton, background: creandoSucursal ? "#475569" : "#166534" }}
            onClick={() => { setCreandoSucursal(v => !v); setMensajeSucursal(""); }}>
            {creandoSucursal ? "Cancelar alta" : "＋ DAR DE ALTA SUCURSAL"}
          </button>
        </div>
        {creandoSucursal && <form onSubmit={crearSucursal} style={{ border: "1px solid #475569", borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <label htmlFor="ae-nueva-sucursal" style={{ display: "block", marginBottom: 6 }}>Nombre de la nueva sucursal</label>
          <input id="ae-nueva-sucursal" value={nombreNuevaSucursal} maxLength={120}
            onChange={e => setNombreNuevaSucursal(e.target.value)} placeholder="Ej.: Quilmes Centro"
            style={{ padding: 11, background: "#0f172a", border: "1px solid #64748b", borderRadius: 8, color: "white", width: "100%", maxWidth: 430, boxSizing: "border-box" }} />
          <div style={{ marginTop: 10 }}><button type="submit" disabled={guardandoSucursal || !nombreNuevaSucursal.trim()}
            style={{ ...est.boton, background: "#15803d" }}>
            {guardandoSucursal ? "Creando…" : "CREAR SUCURSAL"}
          </button></div>
        </form>}
        {cargandoSucursales ? <p>Cargando sucursales…</p> : sucursales.length === 0
          ? <p>Todavía no hay sucursales activas. Podés crear la primera con el botón de arriba.</p>
          : <form onSubmit={guardarSucursal}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, alignItems: "end", marginBottom: 10 }}>
                <label htmlFor="ae-sucursal" style={{ display: "grid", gap: 4, fontSize: 13 }}>Sucursal
                  <select id="ae-sucursal" value={sucursalId} onChange={e => setSucursalId(e.target.value)} style={{ ...est.boton, width: "100%", boxSizing: "border-box" }}>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Radio de entregas (km)
                  <input type="text" value={formSucursal.radio_entregas_km} onChange={e => setFormSucursal(f => ({ ...f, radio_entregas_km: e.target.value }))}
                    style={{ padding: 10, background: "#0f172a", border: "1px solid #64748b", borderRadius: 8, color: "white", fontSize: 14, width: "100%", boxSizing: "border-box" }} />
                </label>
                {[["calle", "Calle y número", "Ej.: Rivadavia 100"], ["localidad", "Localidad", "Ej.: Ezpeleta"], ["partido", "Partido", "Ej.: Quilmes"], ["provincia", "Provincia", "Buenos Aires"]].map(([campo, etiqueta, ejemplo]) =>
                  <label key={campo} style={{ display: "grid", gap: 4, fontSize: 13 }}>{etiqueta}
                    <input type="text" value={direccionBusqueda[campo]} placeholder={ejemplo}
                      onChange={e => setDireccionBusqueda(v => ({ ...v, [campo]: e.target.value }))}
                      style={{ padding: 10, background: "#0f172a", border: "1px solid #64748b", borderRadius: 8, color: "white", fontSize: 14, width: "100%", boxSizing: "border-box" }} />
                  </label>)}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" disabled={buscandoDireccion} onClick={buscarDireccionSucursal} style={{ ...est.boton, background: "#1d4ed8" }}>
                  {buscandoDireccion ? "Buscando…" : "🔎 UBICAR EN EL MAPA"}
                </button>
                <button type="button" onClick={() => { setMostrarMapa(v => !v); setMensajeMapa(""); }} style={est.boton}>
                  🗺️ {mostrarMapa ? "OCULTAR MAPA" : "CORREGIR UBICACIÓN"}
                </button>
                <button type="submit" disabled={guardandoSucursal} style={{ ...est.boton, background: "#15803d" }}>
                  {guardandoSucursal ? "Guardando…" : "💾 GUARDAR CONFIGURACIÓN"}
                </button>
              </div>
              {mostrarMapa && <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid #64748b" }}>
                <MapContainer key={sucursalId} center={posicionSucursal || centroMapa} zoom={posicionSucursal ? 16 : 12}
                  style={{ height: 340, width: "100%", zIndex: 0 }} scrollWheelZoom={false}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <ControlesMapaSucursal posicion={posicionSucursal} alCambiar={fijarUbicacionSucursal} />
                </MapContainer>
              </div>}
              {mensajeMapa && <p role="status" style={{ fontSize: 13, color: "#fcd34d", margin: "8px 0 0" }}>{mensajeMapa}</p>}
            </form>}
        {mensajeSucursal && <p role="status" style={{ marginBottom: 0, color: mensajeSucursal.startsWith("✅") ? "#86efac" : "#fca5a5" }}>{mensajeSucursal}</p>}
      </section>
      <section style={{ ...est.tarjeta, marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 21, color: "#f8fafc" }}>👥 Sucursal principal del personal</h2>
        <p style={{ color: "#cbd5e1", fontSize: 13, marginTop: 0 }}>
          Asigná cada supervisor y repartidor a su sucursal habitual. Esto no modifica sus roles ni sus pedidos anteriores.
        </p>
        {cargandoPersonal ? <p>Cargando personal Express…</p>
          : !sucursales.length ? <p>Primero debe haber una sucursal habilitada.</p>
          : !personalExpress.length ? <p>No hay supervisores ni repartidores Express activos en esta empresa.</p>
          : <div style={{ display: "grid", gap: 10 }}>
              {personalExpress.map(p => <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderBottom: "1px solid #334155", padding: "10px 0" }}>
                <div>
                  <strong style={{ color: "#f8fafc" }}>{p.nombre || p.email || "Empleado"}</strong>
                  <div style={{ color: "#cbd5e1", fontSize: 12 }}>
                    {p.roles.includes("express_operador") ? "Supervisor" : ""}
                    {p.roles.length > 1 ? " · " : ""}
                    {p.roles.includes("express_repartidor") ? "Repartidor" : ""}
                  </div>
                </div>
                <select aria-label={`Sucursal principal de ${p.nombre || p.email || "empleado"}`}
                  value={asignaciones[p.id] || ""}
                  disabled={Boolean(guardandoPerfil)}
                  onChange={e => asignarSucursal(p.id, e.target.value)}
                  style={{ ...est.boton, minWidth: 220, maxWidth: "100%" }}>
                  <option value="">Sin asignar</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>)}
            </div>}
        {mensajePersonal && <p role="status" style={{ color: mensajePersonal.startsWith("✅") ? "#86efac" : "#fca5a5" }}>{mensajePersonal}</p>}
      </section>
      {error && <div role="alert" style={{ background: "#7f1d1d", padding: 15, borderRadius: 10, marginBottom: 18 }}>⚠️ {error}</div>}
      {cargando ? <p>Cargando estadísticas de la empresa…</p> : <>
        <p style={{ color: "#cbd5e1", marginTop: 0 }}>Últimos 30 días · {fechaVisible(dias[0].clave)} al {fechaVisible(dias[29].clave)} · {ultimaCarga ? `Actualizado ${ultimaCarga.toLocaleTimeString("es-AR")}` : "Sin actualizar"}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 12, marginBottom: 20 }}>
          {[["Pedidos creados", totales.pedidos, AZUL],["Entregas resueltas", totales.entregadas, VERDE],["No entregadas", totales.rechazadas, ROJO],["Ventas registradas*", moneda(totales.ventas), NARANJA]].map(([titulo, valor, color]) =>
            <div key={titulo} style={est.tarjeta}><div style={{ color: "#cbd5e1", fontSize: 13 }}>{titulo}</div><strong style={{ display: "block", fontSize: 25, color, marginTop: 8 }}>{valor}</strong></div>)}
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <Grafico titulo="1. Pedidos recibidos" subtitulo="Pedidos creados cada día, sin duplicar los heredados." datos={dias} series={[{ clave: "pedidos", nombre: "Pedidos", color: AZUL }]} formato={n => String(Math.round(n))} />
          <Grafico titulo="2. Resultado de las entregas" subtitulo="Resultados por día en que se resolvió la entrega. Verde: entregadas. Rojo: no entregadas." datos={dias} series={[{ clave: "entregadas", nombre: "Entregadas", color: VERDE }, { clave: "rechazadas", nombre: "No entregadas", color: ROJO }]} formato={n => String(Math.round(n))} />
          <section style={est.tarjeta}>
            <h3 style={{ marginTop: 0, color: "#f8fafc" }}>3. Ventas por supervisor de origen</h3>
            <p style={{ color: "#cbd5e1", fontSize: 13 }}>Cada pedido corresponde al supervisor y turno que lo creó, incluso cuando otro lo hereda. Importes registrados menos rechazos y cancelaciones definitivos.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {supervisores.length ? supervisores.map(s => <div key={s.id || "sin-turno"}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 14 }}><strong>{s.nombre}</strong><strong>{moneda(s.ventas)}</strong></div>
                <div style={{ height: 15, background: "#334155", borderRadius: 8, overflow: "hidden", marginTop: 6 }}><div style={{ width: `${totales.ventas ? Math.max(0, 100 * s.ventas / totales.ventas) : 0}%`, height: "100%", background: AZUL }} /></div>
                <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{s.pedidos} pedidos creados · {s.entregadas} entregados (de pedidos creados en el período)</div>
              </div>) : <p>No hay pedidos en este período.</p>}
            </div>
            <h4 style={{ marginBottom: 6, color: "#f8fafc" }}>Desglose por turno de origen</h4>
            {porTurno.length ? porTurno.map(t => <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #334155", flexWrap: "wrap", fontSize: 13 }}><span>{t.nombre} · {t.inicio ? new Date(t.inicio).toLocaleString("es-AR") : "Turno sin fecha"} · {t.pedidos} pedidos</span><strong>{moneda(t.ventas)}</strong></div>) : <p style={{ color: "#cbd5e1" }}>Sin turnos en el período.</p>}
          </section>
          <Grafico titulo="4. Ventas totales por delivery" subtitulo="Últimos 30 días. Se atribuyen a la fecha original del pedido; rechazos y cancelaciones definitivos no suman." datos={dias} series={[{ clave: "ventas", nombre: "Importe de pedidos vigentes y entregados", color: NARANJA }]} formato={formatoMiles} />
        </div>
        <section style={{ ...est.tarjeta, marginTop: 16 }}>
          <h3 style={{ marginTop: 0, color: "#f8fafc" }}>Trabajo de los supervisores y repartidores</h3>
          <p style={{ color: "#cbd5e1", fontSize: 13 }}>Turnos abiertos: <strong>{turnoAbierto.length}</strong> · Pedidos creados hoy: <strong>{pedidosHoy.length}</strong></p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {["todos", "supervisores", "repartidores"].map(v => <button type="button" key={v} onClick={() => setDetalle(v)} style={{ ...est.boton, background: detalle === v ? "#1d4ed8" : "#26374e" }}>{v === "todos" ? "Todos" : v === "supervisores" ? "Supervisores" : "Repartidores"}</button>)}
          </div>
          {(detalle !== "repartidores") && <div style={{ marginBottom: 12 }}><strong>Supervisores</strong>
            {turnoAbierto.length ? turnoAbierto.map(t => <p key={t.id} style={{ color: "#cbd5e1" }}>🟢 {estadisticas.nombres[t.supervisor_id] || "Supervisor"} · Turno abierto desde {new Date(t.inicio_en).toLocaleString("es-AR")}</p>) : <p style={{ color: "#cbd5e1" }}>No hay turnos abiertos visibles.</p>}
          </div>}
          {(detalle !== "supervisores") && <div><strong>Repartidores</strong><p style={{ color: "#cbd5e1" }}>Para mostrar jornadas y resultados individuales correctamente falta integrar el historial de viajes y sus asignaciones. No se inventan estadísticas por repartidor.</p></div>}
        </section>
        <p style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.6, marginTop: 16 }}>* Ventas registradas: pedidos entregados o todavía pendientes, menos los rechazados o cancelados definitivamente. Los pendientes son provisionales ({moneda(totales.pendientes)}). No equivale a dinero cobrado ni rendido. Los resultados de entrega se agrupan por fecha de resolución, por lo que pueden incluir pedidos creados antes de estos 30 días. Las cifras dependen de los permisos de lectura de Supabase.</p>
      </>}
    </div>
  </main>;
}
