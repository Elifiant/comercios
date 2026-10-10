import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Mapa de planificación: no consulta Geoapify mientras se navega por el mapa.
const puntoValido = (lat, lng) => lat != null && lng != null &&
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
  Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;

function AjustarMapaRepartos({ puntos }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 1) map.setView(puntos[0], 14);
    else if (puntos.length > 1) map.fitBounds(puntos, { padding: [35, 35], maxZoom: 15 });
  }, [map, puntos]);
  return null;
}

function ElegirPuntoMapa({ onElegir }) {
  useMapEvents({ click(evento) { onElegir([evento.latlng.lat, evento.latlng.lng]); } });
  return null;
}

const iconoEntrega = (estado) => {
  const color = ["asignado", "recibido", "en_reparto"].includes(estado) ? "#2563eb" :
    ["entregado"].includes(estado) ? "#16a34a" : "#ea580c";
  return L.divIcon({ className: "", html: `<div style="width:19px;height:19px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px #33415588"></div>`, iconSize:[25,25], iconAnchor:[12,12] });
};

function MapaPlanificacion({ destinos, repartidores, alElegirEntrega, ubicando, onUbicar, filtro, setFiltro }) {
  const [filtroEstado, setFiltroEstado] = useState("todos");
  // Los filtros solo cambian la visualización; nunca guardan ni asignan entregas.
  const visibles = destinos.filter(d => {
    const coincideChofer = filtro === "todos" || (filtro === "sin_asignar" ? !d.repartidor_id : String(d.repartidor_id) === filtro);
    const estado = String(d.estado || "").toLowerCase();
    const coincideEstado = filtroEstado === "todos" ||
      (filtroEstado === "pendientes" && ["pendiente_preparacion", "preparado"].includes(estado)) ||
      (filtroEstado === "asignadas" && ["asignado", "recibido", "en_reparto", "reintentar"].includes(estado)) ||
      (filtroEstado === "finalizadas" && ["entregado", "no_entregado", "devolucion_informada", "vuelto_deposito"].includes(estado));
    return coincideChofer && coincideEstado;
  });
  const ubicados = visibles.filter(d => puntoValido(d.latitud, d.longitud));
  const puntos = useMemo(() => ubicados.map(d => [Number(d.latitud), Number(d.longitud)]), [destinos, filtro, filtroEstado]);
  const sinCoordenadas = destinos.filter(d => !puntoValido(d.latitud, d.longitud) && d.direccion);
  return <section style={{background:"white",border:"1px solid #cbd5e1",borderRadius:12,padding:12,marginBottom:14}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:9}}>
      <strong>🗺️ MAPA DE PLANIFICACIÓN</strong>
      <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{padding:8,borderRadius:7,border:"1px solid #cbd5e1"}}>
        <option value="todos">Todos los choferes</option><option value="sin_asignar">Sin chofer asignado</option>
        {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre || r.email}</option>)}
      </select>
      <select aria-label="Filtrar por estado" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{padding:8,borderRadius:7,border:"1px solid #cbd5e1"}}>
        <option value="todos">Todos los estados</option>
        <option value="pendientes">Pendientes y preparadas</option>
        <option value="asignadas">Asignadas y en reparto</option>
        <option value="finalizadas">Finalizadas</option>
      </select>
    </div>
    {puntos.length > 0 ? <div style={{height:350,borderRadius:9,overflow:"hidden"}}>
      <MapContainer center={puntos[0]} zoom={13} style={{height:"100%",width:"100%"}} scrollWheelZoom={true}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <AjustarMapaRepartos puntos={puntos}/>
        {ubicados.map(d => <Marker key={d.id} position={[Number(d.latitud),Number(d.longitud)]} icon={iconoEntrega(d.estado)}>
          <Popup><strong>{d.cliente}</strong><div>{d.direccion}</div><div>{d.estado}</div>
            <div>Chofer: {repartidores.find(r => String(r.id) === String(d.repartidor_id))?.nombre || "Sin asignar"}</div>
            <button type="button" onClick={() => alElegirEntrega(d)}>VER ENTREGA</button>
          </Popup></Marker>)}
      </MapContainer>
    </div> : <div style={{padding:20,background:"#f8fafc",borderRadius:8}}>No hay destinos ubicados para los filtros seleccionados.</div>}
    <div style={{fontSize:12,color:"#475569",marginTop:8}}>🟠 Pendiente/preparada · 🔵 Asignada/en reparto · 🟢 Entregada. {ubicados.length} de {visibles.length} destinos visibles en el mapa. Los filtros no modifican asignaciones.</div>
    {sinCoordenadas.length > 0 && <div style={{fontSize:12,marginTop:8}}>
      ⚠️ {sinCoordenadas.length} entrega/s sin coordenadas.
      <button type="button" disabled={ubicando} onClick={onUbicar} style={{marginLeft:8,padding:"7px 10px"}}>{ubicando ? "Ubicando..." : "📍 UBICAR DIRECCIONES"}</button>
    </div>}
  </section>;
}

const ESTADO_LABEL = {
  pendiente_preparacion: "📦 PENDIENTE",
  preparado: "✅ PREPARADO",
  asignado: "🚚 ASIGNADO",
  en_reparto: "🚚 EN REPARTO",
  entregado: "✅ ENTREGADO",
  no_entregado: "❌ NO ENTREGADO",
  vuelto_deposito: "🔄 VOLVIÓ A DEPÓSITO",
  anulacion_solicitada: "⏳ ANULACIÓN SOLICITADA",
};

const PROVINCIAS_ARGENTINAS = ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Ciudad Autónoma de Buenos Aires", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego, Antártida e Islas del Atlántico Sur", "Tucumán"];

const fechaLocalISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
};


// RutaChat de Depósito y Repartos. No modifica entregas ni estados logísticos.
function RutaChatSupervisor({ empresaId, repartidores }) {
  const [abierto, setAbierto] = useState(false);
  const [miId, setMiId] = useState(null);
  const [destino, setDestino] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    supabase.auth.getUser().then(({ data, error: err }) => {
      if (!vigente) return;
      if (err) setError(err.message);
      else setMiId(data?.user?.id || null);
    });
    return () => { vigente = false; };
  }, [abierto]);

  useEffect(() => {
    if (!repartidores.some(r => String(r.id) === destino)) {
      setDestino(repartidores[0]?.id || "");
    }
  }, [repartidores, destino]);

  const cargarMensajes = async () => {
    if (!empresaId || !miId) return;
    const { data, error: err } = await supabase.from("mensajes_operativos")
      .select("id,empresa_id,remitente_id,destinatario_id,contenido,creado_at,leido_at")
      .eq("empresa_id", empresaId)
      .or(`remitente_id.eq.${miId},destinatario_id.eq.${miId}`)
      .order("creado_at", { ascending: true }).limit(300);
    if (err) setError(err.message);
    else { setMensajes(data || []); setError(""); }
  };

  useEffect(() => {
    if (!abierto || !empresaId || !miId) return;
    cargarMensajes();
    const intervalo = setInterval(cargarMensajes, 10000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, empresaId, miId]);

  const enviar = async () => {
    if (!destino || !texto.trim() || enviando) return;
    setEnviando(true);
    try {
      const { error: err } = await supabase.rpc("enviar_mensaje_operativo", {
        p_destinatario: destino, p_contenido: texto.trim()
      });
      if (err) throw err;
      setTexto("");
      await cargarMensajes();
    } catch (e) { setError(e.message || "No se pudo enviar el mensaje."); }
    finally { setEnviando(false); }
  };

  const conversacion = mensajes.filter(m =>
    (m.remitente_id === miId && m.destinatario_id === destino) ||
    (m.remitente_id === destino && m.destinatario_id === miId));
  const sinLeer = mensajes.filter(m => m.destinatario_id === miId && !m.leido_at).length;

  return <section style={{background:"white",border:"1px solid #cbd5e1",borderRadius:11,padding:12,marginBottom:14}}>
    <button type="button" onClick={() => setAbierto(v => !v)}
      style={{width:"100%",padding:12,border:0,borderRadius:8,background:"#166534",color:"white",fontWeight:900,cursor:"pointer"}}>
      💬 RUTACHAT {sinLeer ? `· ${sinLeer} sin leer` : ""} {abierto ? "▲" : "▼"}
    </button>
    {abierto && <div style={{paddingTop:12}}>
      <strong>Mensajes con los repartidores</strong>
      <select aria-label="Elegir repartidor" value={destino} onChange={e => setDestino(e.target.value)}
        style={{width:"100%",padding:10,marginTop:8,borderRadius:8,border:"1px solid #cbd5e1"}}>
        {!repartidores.length && <option value="">No hay repartidores disponibles</option>}
        {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre || r.email || "Repartidor"}</option>)}
      </select>
      {error && <p style={{color:"#b91c1c",fontSize:12}}>⚠️ {error}</p>}
      <div style={{maxHeight:280,overflowY:"auto",background:"#f8fafc",padding:10,borderRadius:8,marginTop:10}}>
        {!conversacion.length && <div style={{fontSize:12,color:"#64748b"}}>Todavía no hay mensajes con este repartidor.</div>}
        {conversacion.map(m => <div key={m.id} style={{textAlign:m.remitente_id === miId ? "right" : "left",marginBottom:8}}>
          <div style={{display:"inline-block",maxWidth:"90%",background:m.remitente_id === miId ? "#dcfce7" : "#e2e8f0",padding:9,borderRadius:8,fontSize:13,overflowWrap:"anywhere"}}>
            {m.contenido}
            <div style={{fontSize:10,color:"#64748b",marginTop:4}}>{new Date(m.creado_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</div>
          </div>
        </div>)}
      </div>
      <textarea value={texto} onChange={e => setTexto(e.target.value)} maxLength={1000} rows={2}
        placeholder="Escribí un mensaje al repartidor..." style={{width:"100%",boxSizing:"border-box",marginTop:10,padding:10,border:"1px solid #cbd5e1",borderRadius:8}} />
      <button type="button" disabled={!destino || !texto.trim() || enviando} onClick={enviar}
        style={{width:"100%",padding:12,background:"#166534",color:"white",border:0,borderRadius:8,fontWeight:900,opacity:!destino || !texto.trim() || enviando ? .5 : 1}}>
        {enviando ? "ENVIANDO..." : "ENVIAR MENSAJE"}
      </button>
    </div>}
  </section>;
}

export default function Repartos({ sesion: sesionProp, perfil: perfilProp, onVolver }) {
  const [perfil, setPerfil] = useState(perfilProp || null);
  const [empresaId, setEmpresaId] = useState(perfilProp?.empresa_id || null);
  const [empresaNombre, setEmpresaNombre] = useState(perfilProp?.empresa || "");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [modoIndependiente, setModoIndependiente] = useState(false);
  const [nuevaEntregaAbierta, setNuevaEntregaAbierta] = useState(false);
  const [entregaManualActiva, setEntregaManualActiva] = useState(null);
  const [guardandoManual, setGuardandoManual] = useState(false);
  const [corrigiendoPunto, setCorrigiendoPunto] = useState(false);
  const [puntoElegido, setPuntoElegido] = useState(null);
  const [manual, setManual] = useState({ destinatario: "", direccion: "", localidad: "", provincia: "", partido: "", telefono: "", referencia_domicilio: "", bultos: "1", fecha_programada: fechaLocalISO(), numero_remito: "", numero_factura: "", observaciones: "" });
  const [pedidos, setPedidos] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [bandeja, setBandeja] = useState("pendientes");
  const [repartidores, setRepartidores] = useState([]);
  const [filtroRepartidor, setFiltroRepartidor] = useState("todos");
  const [ubicandoDestinos, setUbicandoDestinos] = useState(false);
  const [seleccionUbicacion, setSeleccionUbicacion] = useState(null);
  const [indiceUbicacion, setIndiceUbicacion] = useState("");
  const [municipios, setMunicipios] = useState([]);
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);
  const [municipiosError, setMunicipiosError] = useState("");
  const [corrigiendoUbicacion, setCorrigiendoUbicacion] = useState(false);

  // Catálogo público de municipios/departamentos argentinos; nunca se escribe en Supabase.
  useEffect(() => {
    if (!manual.provincia || !nuevaEntregaAbierta) { setMunicipios([]); return; }
    const controller = new AbortController();
    const obtener = async () => {
      setCargandoMunicipios(true); setMunicipiosError(""); setMunicipios([]);
      try {
        const p = await fetch("https://apis.datos.gob.ar/georef/api/provincias?nombre=" + encodeURIComponent(manual.provincia) + "&campos=id,nombre", {signal:controller.signal});
        if (!p.ok) throw new Error("No se pudo consultar provincias");
        const prov = (await p.json()).provincias?.find(x => x.nombre.toLowerCase() === manual.provincia.toLowerCase());
        if (!prov) throw new Error("Provincia no encontrada en el catálogo");
        const tipo = manual.provincia === "Buenos Aires" ? "municipios" : "departamentos";
        const r = await fetch(`https://apis.datos.gob.ar/georef/api/${tipo}?provincia=${encodeURIComponent(prov.id)}&max=5000&campos=id,nombre`, {signal:controller.signal});
        if (!r.ok) throw new Error("No se pudo consultar municipios");
        const datos = await r.json();
        setMunicipios((datos[tipo] || []).map(x => x.nombre).sort((a,b)=>a.localeCompare(b,"es")));
      } catch(e) { if (e.name !== "AbortError") setMunicipiosError("No se pudo cargar el catálogo. Podés escribir el partido manualmente."); }
      finally { if (!controller.signal.aborted) setCargandoMunicipios(false); }
    };
    obtener();
    return () => controller.abort();
  }, [manual.provincia, nuevaEntregaAbierta]);
  const [repartidorSeleccionado, setRepartidorSeleccionado] = useState("");
  const [asignando, setAsignando] = useState(false);
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false);

  const [form, setForm] = useState({
    bultos: "",
    numero_factura: "",
    numero_remito: "",
    fecha_programada: fechaLocalISO(),
    observaciones: "",
  });

  const cargarDatos = async () => {
    setCargando(true);
    setErrorCarga("");

    try {
      let p = perfilProp || perfil || null;

      if (!p?.empresa_id) {
        const session = sesionProp || (await supabase.auth.getSession()).data?.session;
        if (!session?.user?.id) throw new Error("No hay una sesión activa.");

        const { data: perfilDb, error: errorPerfil } = await supabase
          .from("perfiles")
          .select("id,nombre,email,rol,empresa,empresa_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (errorPerfil) throw errorPerfil;
        if (!perfilDb?.empresa_id) throw new Error("El usuario no tiene empresa_id asignado.");
        p = perfilDb;
        setPerfil(perfilDb);
      }

      setEmpresaId(p.empresa_id);

      const { data: empresaDb } = await supabase
        .from("empresas")
        .select("nombre")
        .eq("id", p.empresa_id)
        .maybeSingle();

      setEmpresaNombre(empresaDb?.nombre || p.empresa || "");

      // La modalidad depende del abono vigente, nunca del nombre de la empresa.
      const { data: abonosDb, error: errorAbonos } = await supabase
        .from("empresa_abonos")
        .select("cupo_preventistas,cupo_repartidores,activo,created_at")
        .eq("empresa_id", p.empresa_id)
        .eq("activo", true)
        .order("created_at", { ascending: false });
      if (errorAbonos) throw errorAbonos;
      const abono = (abonosDb || [])[0];
      const independiente = Boolean(abono && Number(abono.cupo_repartidores) > 0 && Number(abono.cupo_preventistas) === 0);
      setModoIndependiente(independiente);
      console.log("🔎 DIAGNÓSTICO REPARTOS:", {
  empresaId: p.empresa_id,
  abonos: abonosDb,
  independiente
});


      // Repartidores habilitados de la empresa.
      const { data: rolesRepartidor, error: errorRolesRepartidor } = await supabase
        .from("perfiles_roles")
        .select("perfil_id")
        .eq("empresa_id", p.empresa_id)
        .eq("rol", "repartidor")
        .eq("activo", true);

      if (errorRolesRepartidor) throw errorRolesRepartidor;

      const idsRepartidores = [...new Set((rolesRepartidor || []).map(r => r.perfil_id).filter(Boolean))];
      let listaRepartidores = [];

      if (idsRepartidores.length) {
        const { data: perfilesRepartidor, error: errorPerfilesRepartidor } = await supabase
          .from("perfiles")
          .select("id,nombre,email,activo")
          .eq("empresa_id", p.empresa_id)
          .in("id", idsRepartidores);

        if (errorPerfilesRepartidor) throw errorPerfilesRepartidor;

        listaRepartidores = (perfilesRepartidor || [])
          .filter(r => r.activo !== false)
          .sort((a, b) => String(a.nombre || a.email || "").localeCompare(String(b.nombre || b.email || ""), "es"));
      }

      setRepartidores(listaRepartidores);

      if (!independiente) {
      // NVI que ya fueron enviadas por el Supervisor a Depósito.
      const { data: pedidosDb, error: errorPedidos } = await supabase
        .from("pedidos")
        .select("id,empresa_id,numero_pedido,comercio_id,comercio_nombre,preventista,total,estado,created_at,pasado_deposito_at,deposito_stock_id,notas")
        .eq("empresa_id", p.empresa_id)
        .in("estado", ["Pasado a Depósito", "En Depósito"])
        .order("created_at", { ascending: false });

      if (errorPedidos) throw errorPedidos;

      const idsPedidos = (pedidosDb || []).map(x => x.id).filter(Boolean);
      const idsComercios = [...new Set((pedidosDb || []).map(x => x.comercio_id).filter(Boolean))];

      let itemsPorPedido = {};
      if (idsPedidos.length) {
        const { data: itemsDb, error: errorItems } = await supabase
          .from("pedido_items")
          .select("pedido_id,producto_id,producto_nombre,codigo,color,talle,cantidad,precio_unitario,subtotal")
          .in("pedido_id", idsPedidos);

        if (errorItems) throw errorItems;

        (itemsDb || []).forEach(it => {
          const k = String(it.pedido_id);
          if (!itemsPorPedido[k]) itemsPorPedido[k] = [];
          itemsPorPedido[k].push({
            producto_id: it.producto_id || null,
            descripcion: it.producto_nombre || it.codigo || "Producto",
            codigo: it.codigo || "",
            color: it.color || "",
            talle: it.talle || "",
            cantidad: Number(it.cantidad || 0),
            precio_unitario: Number(it.precio_unitario || 0),
            subtotal: Number(it.subtotal || 0),
          });
        });
      }

      let comercioPorId = {};
      if (idsComercios.length) {
        const { data: comerciosDb, error: errorComercios } = await supabase
          .from("comercios")
          .select("id,direccion,localidad,provincia,telefono,whatsapp,contacto,ubicacion_exacta_latitud,ubicacion_exacta_longitud")
          .in("id", idsComercios);

        if (errorComercios) throw errorComercios;

        (comerciosDb || []).forEach(c => {
          comercioPorId[String(c.id)] = c;
        });
      }

      const consolidados = (pedidosDb || []).map(ped => {
        const c = comercioPorId[String(ped.comercio_id)] || {};
        return {
          ...ped,
          numeroVisible: String(ped.numero_pedido || "").padStart(6, "0"),
          cliente: ped.comercio_nombre || `Comercio #${ped.comercio_id || ""}`,
          direccion: [c.direccion, c.localidad, c.provincia].filter(Boolean).join(", "),
          latitud: c.ubicacion_exacta_latitud,
          longitud: c.ubicacion_exacta_longitud,
          telefono: c.telefono || "",
          whatsapp: c.whatsapp || "",
          contacto: c.contacto || "",
          items: itemsPorPedido[String(ped.id)] || [],
        };
      });

      setPedidos(consolidados);

      } else {
        setPedidos([]);
      }

      const { data: entregasDb, error: errorEntregas } = await supabase
        .from("repartos_entregas")
        .select("*")
        .eq("empresa_id", p.empresa_id)
        .order("creado_at", { ascending: false });

      if (errorEntregas) throw errorEntregas;
      setEntregas(entregasDb || []);
    } catch (e) {
      console.error("Error cargando Depósito y Repartos:", e);
      setErrorCarga(e?.message || "No se pudo cargar Depósito y Repartos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entregasPorPedido = useMemo(() => {
    const mapa = new Map();
    (entregas || []).forEach(e => {
      const k = String(e.pedido_id || "");
      if (!k) return;
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k).push(e);
    });
    return mapa;
  }, [entregas]);

  const estadoLogisticoPedido = (pedido) => {
    const creadas = entregasPorPedido.get(String(pedido.id)) || [];
    return creadas[0]?.estado || "pendiente_preparacion";
  };

  const esDeHoy = (valor) => {
    if (!valor) return false;
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return false;
    const hoy = new Date();
    return d.getFullYear() === hoy.getFullYear() &&
      d.getMonth() === hoy.getMonth() &&
      d.getDate() === hoy.getDate();
  };

  const pedidosRecibidosHoy = useMemo(
    () => pedidos.filter(p => esDeHoy(p.pasado_deposito_at)),
    [pedidos]
  );

  const fueAsignado = (pedido) => {
    const creadas = entregasPorPedido.get(String(pedido.id)) || [];
    return creadas.some(e => Boolean(e.repartidor_id || e.asignado_at));
  };

  const volvioDeposito = (pedido) => {
    const creadas = entregasPorPedido.get(String(pedido.id)) || [];
    return creadas.some(e => Boolean(e.devolucion_recibida_at) || e.estado === "vuelto_deposito" || e.estado === "anulacion_solicitada");
  };

  const contadoresBandeja = useMemo(() => {
    const pendientes = pedidos.filter(p => estadoLogisticoPedido(p) === "pendiente_preparacion").length;
    const preparados = pedidos.filter(p => estadoLogisticoPedido(p) === "preparado").length;
    const asignados = pedidos.filter(p =>
      ["asignado", "en_reparto"].includes(estadoLogisticoPedido(p))
    ).length;

    return { pendientes, preparados, asignados, todos: pedidos.length };
  }, [pedidos, entregasPorPedido]);

  const resumenHoy = useMemo(() => {
    const recibidas = pedidosRecibidosHoy.length;
    const sinPreparar = pedidosRecibidosHoy.filter(p =>
      estadoLogisticoPedido(p) === "pendiente_preparacion"
    ).length;
    const asignadas = pedidosRecibidosHoy.filter(fueAsignado).length;
    const devolucionesPendientes = pedidos.filter(p =>
      estadoLogisticoPedido(p) === "devolucion_informada"
    ).length;
    const volvieron = pedidosRecibidosHoy.filter(volvioDeposito).length;
    return { recibidas, sinPreparar, asignadas, devolucionesPendientes, volvieron };
  }, [pedidosRecibidosHoy, entregasPorPedido]);

  const pedidosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return pedidos.filter(p => {
      const estado = estadoLogisticoPedido(p);
      const recibidoHoy = esDeHoy(p.pasado_deposito_at);

      const perteneceBandeja =
        bandeja === "todos" ||
        (bandeja === "hoy" && recibidoHoy) ||
        (bandeja === "sin_preparar_hoy" && recibidoHoy && estado === "pendiente_preparacion") ||
        (bandeja === "asignadas_hoy" && recibidoHoy && fueAsignado(p)) ||
        (bandeja === "devoluciones_pendientes" && estado === "devolucion_informada") ||
        (bandeja === "volvieron_hoy" && recibidoHoy && volvioDeposito(p)) ||
        (bandeja === "pendientes" && estado === "pendiente_preparacion") ||
        (bandeja === "preparados" && estado === "preparado") ||
        (bandeja === "asignados" && ["asignado", "en_reparto"].includes(estado));

      if (!perteneceBandeja) return false;
      if (!q) return true;

      return [p.numeroVisible, p.cliente, p.direccion, p.preventista]
        .some(v => String(v || "").toLowerCase().includes(q));
    });
  }, [pedidos, busqueda, bandeja, entregasPorPedido]);

  const abrirPedido = (pedido) => {
    setPedidoActivo(pedido);

    const ya = entregasPorPedido.get(String(pedido.id)) || [];
    const ultima = ya[0] || null;

    setForm({
      bultos: ultima?.bultos ?? "",
      numero_factura: ultima?.numero_factura || "",
      numero_remito: ultima?.numero_remito || "",
      fecha_programada: ultima?.fecha_programada || fechaLocalISO(),
      observaciones: ultima?.observaciones || "",
    });
    setRepartidorSeleccionado(ultima?.repartidor_id || "");
  };

  const prepararEntregaCompleta = async () => {
    if (!pedidoActivo?.id || !empresaId || guardando) return;

    const bultos = form.bultos === "" ? null : Number(form.bultos);
    if (bultos === null || !Number.isInteger(bultos) || bultos < 1) {
      alert("⚠️ Ingresá la cantidad de bultos. Debe ser un número entero de 1 o más.");
      return;
    }

    const existentes = entregasPorPedido.get(String(pedidoActivo.id)) || [];
    if (existentes.length > 0) {
      alert(
        "⚠️ Esta NVI ya tiene una entrega creada.\n\n" +
        "La división en varios remitos/entregas la vamos a habilitar en el siguiente paso."
      );
      return;
    }

    if (!pedidoActivo.items?.length) {
      alert("⚠️ Esta NVI no tiene renglones de pedido para preparar.");
      return;
    }

    const confirmar = window.confirm(
      `¿Marcar como PREPARADA la entrega completa de la NVI #${pedidoActivo.numeroVisible}?\n\n` +
      `${pedidoActivo.cliente}\n` +
      `${pedidoActivo.items.length} renglón/es`
    );
    if (!confirmar) return;

    setGuardando(true);

    try {
      const ahora = new Date().toISOString();

      const { data: entrega, error: errorEntrega } = await supabase
        .from("repartos_entregas")
        .insert([{
          empresa_id: empresaId,
          pedido_id: pedidoActivo.id,
          deposito_id: pedidoActivo.deposito_stock_id || null,
          repartidor_id: null,
          numero_factura: form.numero_factura.trim() || null,
          numero_remito: form.numero_remito.trim() || null,
          bultos,
          fecha_programada: form.fecha_programada || null,
          estado: "preparado",
          observaciones: form.observaciones.trim() || null,
          motivo_no_entrega: null,
          preparado_at: ahora,
          actualizado_at: ahora,
        }])
        .select("*")
        .single();

      if (errorEntrega) throw errorEntrega;

      const filasItems = pedidoActivo.items
        .filter(it => Number(it.cantidad || 0) > 0)
        .map(it => ({
          empresa_id: empresaId,
          entrega_id: entrega.id,
          producto_id: it.producto_id || null,
          codigo: it.codigo || null,
          descripcion: it.descripcion || "Producto",
          color: it.color || null,
          talle: it.talle || null,
          cantidad: Number(it.cantidad || 0),
        }));

      const { error: errorItems } = await supabase
        .from("repartos_entrega_items")
        .insert(filasItems);

      if (errorItems) {
        // Evitamos dejar una entrega vacía si falló la copia de los renglones.
        await supabase.from("repartos_entregas").delete().eq("id", entrega.id);
        throw errorItems;
      }

      alert(`✅ NVI #${pedidoActivo.numeroVisible} preparada para reparto.`);
      setPedidoActivo(null);
      await cargarDatos();
    } catch (e) {
      console.error("Error preparando entrega:", e);
      alert("❌ No se pudo preparar la entrega: " + (e?.message || "error desconocido"));
    } finally {
      setGuardando(false);
    }
  };

  const guardarDatosLogisticos = async () => {
    if (!pedidoActivo?.id || guardandoDatos) return;

    const existentes = entregasPorPedido.get(String(pedidoActivo.id)) || [];
    const entrega = existentes[0] || null;
    if (!entrega) return;

    // Logística puede corregir la preparación mientras todavía no salió a reparto.
    if (!["preparado", "asignado"].includes(entrega.estado)) {
      alert("⚠️ Esta entrega ya salió a reparto. Los datos de preparación ya no se modifican desde Depósito y Repartos.");
      return;
    }

    const bultos = form.bultos === "" ? null : Number(form.bultos);
    if (bultos === null || !Number.isInteger(bultos) || bultos < 1) {
      alert("⚠️ Ingresá la cantidad de bultos. Debe ser un número entero de 1 o más.");
      return;
    }

    setGuardandoDatos(true);
    try {
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("repartos_entregas")
        .update({
          bultos,
          numero_remito: form.numero_remito.trim() || null,
          numero_factura: form.numero_factura.trim() || null,
          fecha_programada: form.fecha_programada || null,
          observaciones: form.observaciones.trim() || null,
          actualizado_at: ahora,
        })
        .eq("id", entrega.id)
        .eq("empresa_id", empresaId);

      if (error) throw error;

      alert("✅ Datos de logística actualizados.");
      await cargarDatos();
      setPedidoActivo(prev => prev ? { ...prev } : prev);
    } catch (e) {
      console.error("Error actualizando datos logísticos:", e);
      alert("❌ No se pudieron guardar los cambios: " + (e?.message || "error desconocido"));
    } finally {
      setGuardandoDatos(false);
    }
  };

  const asignarReparto = async () => {
    if (!pedidoActivo?.id || asignando) return;

    const existentes = entregasPorPedido.get(String(pedidoActivo.id)) || [];
    const entrega = existentes[0] || null;

    if (!entrega || entrega.estado !== "preparado") {
      alert("⚠️ Esta entrega todavía no está en estado PREPARADO.");
      return;
    }

    if (!repartidorSeleccionado) {
      alert("⚠️ Elegí un repartidor.");
      return;
    }

    if (!form.fecha_programada) {
      alert("⚠️ Elegí la fecha de reparto.");
      return;
    }

    const rep = repartidores.find(r => String(r.id) === String(repartidorSeleccionado));
    const nombreRep = rep?.nombre || rep?.email || "Repartidor";

    const confirmar = window.confirm(
      `¿Asignar la NVI #${pedidoActivo.numeroVisible} a ${nombreRep}?\n\n` +
      `Fecha de reparto: ${form.fecha_programada}`
    );
    if (!confirmar) return;

    setAsignando(true);
    try {
      const ahora = new Date().toISOString();

      const { error } = await supabase
        .from("repartos_entregas")
        .update({
          repartidor_id: repartidorSeleccionado,
          fecha_programada: form.fecha_programada,
          estado: "asignado",
          asignado_at: ahora,
          actualizado_at: ahora,
        })
        .eq("id", entrega.id)
        .eq("empresa_id", empresaId);

      if (error) throw error;

      alert(`🚚 NVI #${pedidoActivo.numeroVisible} asignada a ${nombreRep}.`);
      setPedidoActivo(null);
      setBandeja("asignados");
      await cargarDatos();
    } catch (e) {
      console.error("Error asignando reparto:", e);
      alert("❌ No se pudo asignar el reparto: " + (e?.message || "error desconocido"));
    } finally {
      setAsignando(false);
    }
  };

  const recibirMercaderiaDevuelta = async () => {
    if (!pedidoActivo?.id || procesandoDevolucion) return;
    const existentes = entregasPorPedido.get(String(pedidoActivo.id)) || [];
    const entrega = existentes[0] || null;
    if (!entrega || entrega.estado !== "devolucion_informada") {
      alert("⚠️ El repartidor todavía no informó la devolución de esta mercadería.");
      return;
    }

    const ok = window.confirm(
      `¿Confirmar que la mercadería de la NVI #${pedidoActivo.numeroVisible} volvió físicamente al depósito?\n\n` +
      `${pedidoActivo.cliente}\n` +
      `Motivo: ${entrega.motivo_no_entrega || "No informado"}\n\n` +
      `Esto NO anula la venta ni devuelve todavía la mercadería al stock disponible.`
    );
    if (!ok) return;

    setProcesandoDevolucion(true);
    try {
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("repartos_entregas")
        .update({
          estado: "vuelto_deposito",
          devolucion_recibida_at: ahora,
          devolucion_recibida_por: perfil?.id || null,
          actualizado_at: ahora,
        })
        .eq("id", entrega.id)
        .eq("empresa_id", empresaId);
      if (error) throw error;
      alert(`📥 NVI #${pedidoActivo.numeroVisible}: devolución recibida en Depósito.`);
      setPedidoActivo(null);
      setBandeja("volvieron_hoy");
      await cargarDatos();
    } catch (e) {
      console.error("Error recibiendo devolución:", e);
      alert("❌ No se pudo registrar la devolución: " + (e?.message || "error desconocido"));
    } finally {
      setProcesandoDevolucion(false);
    }
  };

  const reenviarDevolucion = async () => {
    if (!pedidoActivo?.id || procesandoDevolucion) return;
    const existentes = entregasPorPedido.get(String(pedidoActivo.id)) || [];
    const entrega = existentes[0] || null;
    if (!entrega || !["vuelto_deposito"].includes(entrega.estado)) {
      alert("⚠️ Esta devolución todavía no está disponible para reenvío.");
      return;
    }
    if (!repartidorSeleccionado) {
      alert("⚠️ Elegí el repartidor para el reenvío.");
      return;
    }
    if (!form.fecha_programada) {
      alert("⚠️ Elegí la nueva fecha de reparto.");
      return;
    }
    const rep = repartidores.find(r => String(r.id) === String(repartidorSeleccionado));
    const nombreRep = rep?.nombre || rep?.email || "Repartidor";
    const ok = window.confirm(
      `¿REENVIAR la NVI #${pedidoActivo.numeroVisible}?\n\n` +
      `Repartidor: ${nombreRep}\nFecha: ${form.fecha_programada}\n\nLa NVI seguirá vigente.`
    );
    if (!ok) return;

    setProcesandoDevolucion(true);
    try {
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("repartos_entregas")
        .update({
          repartidor_id: repartidorSeleccionado,
          fecha_programada: form.fecha_programada,
          estado: "asignado",
          asignado_at: ahora,
          salida_at: null,
          entregado_at: null,
          motivo_no_entrega: null,
          solicitud_anulacion_at: null,
          motivo_solicitud_anulacion: null,
          actualizado_at: ahora,
        })
        .eq("id", entrega.id)
        .eq("empresa_id", empresaId);
      if (error) throw error;
      alert(`🚚 NVI #${pedidoActivo.numeroVisible} reprogramada y asignada a ${nombreRep}.`);
      setPedidoActivo(null);
      setBandeja("asignados");
      await cargarDatos();
    } catch (e) {
      console.error("Error reenviando devolución:", e);
      alert("❌ No se pudo programar el reenvío: " + (e?.message || "error desconocido"));
    } finally {
      setProcesandoDevolucion(false);
    }
  };

  const solicitarAnulacionNvi = async () => {
    if (!pedidoActivo?.id || procesandoDevolucion) return;
    const existentes = entregasPorPedido.get(String(pedidoActivo.id)) || [];
    const entrega = existentes[0] || null;
    if (!entrega || entrega.estado !== "vuelto_deposito") {
      alert("⚠️ Primero Depósito debe confirmar la recepción física de la devolución.");
      return;
    }
    const motivo = window.prompt(
      `Motivo de la solicitud de anulación de la NVI #${pedidoActivo.numeroVisible}:\n\n` +
      `Esta acción NO anula la NVI. La decisión quedará pendiente del Supervisor.`
    );
    if (motivo === null) return;
    if (!motivo.trim()) {
      alert("⚠️ Escribí el motivo de la solicitud.");
      return;
    }
    const ok = window.confirm(
      `¿Enviar SOLICITUD DE ANULACIÓN al Supervisor?\n\nNVI #${pedidoActivo.numeroVisible} · ${pedidoActivo.cliente}\nMotivo: ${motivo.trim()}\n\nLa venta y el stock NO se modificarán todavía.`
    );
    if (!ok) return;

    setProcesandoDevolucion(true);
    try {
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("repartos_entregas")
        .update({
          estado: "anulacion_solicitada",
          solicitud_anulacion_at: ahora,
          solicitud_anulacion_por: perfil?.id || null,
          motivo_solicitud_anulacion: motivo.trim(),
          actualizado_at: ahora,
        })
        .eq("id", entrega.id)
        .eq("empresa_id", empresaId);
      if (error) throw error;
      alert("📨 Solicitud enviada al Supervisor. La NVI continúa vigente hasta que sea aprobada.");
      setPedidoActivo(null);
      setBandeja("volvieron_hoy");
      await cargarDatos();
    } catch (e) {
      console.error("Error solicitando anulación:", e);
      alert("❌ No se pudo enviar la solicitud: " + (e?.message || "error desconocido"));
    } finally {
      setProcesandoDevolucion(false);
    }
  };

  const crearEntregaManual = async () => {
    if (guardandoManual || !empresaId) return;
    if (!manual.destinatario.trim() || !manual.direccion.trim() || !manual.provincia.trim() || !manual.partido.trim() || !manual.localidad.trim()) {
      alert("Ingresá destinatario, calle, provincia, partido y localidad."); return;
    }
    const bultos = Number(manual.bultos);
    if (!Number.isInteger(bultos) || bultos < 1) {
      alert("Los bultos deben ser un número entero mayor que cero."); return;
    }
    setGuardandoManual(true);
    try {
      const { error } = await supabase.from("repartos_entregas").insert([{
        empresa_id: empresaId, pedido_id: null, deposito_id: null, repartidor_id: null,
        destinatario: manual.destinatario.trim(), direccion: manual.direccion.trim(),
        localidad: manual.localidad.trim() || null, provincia: manual.provincia.trim() || null,
        partido: manual.partido.trim() || null,
        telefono: manual.telefono.trim() || null, referencia_domicilio: manual.referencia_domicilio.trim() || null,
        bultos, fecha_programada: manual.fecha_programada || null,
        numero_remito: manual.numero_remito.trim() || null, numero_factura: manual.numero_factura.trim() || null,
        observaciones: manual.observaciones.trim() || null, estado: "pendiente_preparacion",
        actualizado_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      setNuevaEntregaAbierta(false);
      setManual({ destinatario: "", direccion: "", localidad: "", provincia: "", partido: "", telefono: "", referencia_domicilio: "", bultos: "1", fecha_programada: fechaLocalISO(), numero_remito: "", numero_factura: "", observaciones: "" });
      await cargarDatos();
      alert("✅ Entrega creada correctamente.");
    } catch (e) { alert("❌ No se pudo crear la entrega: " + (e?.message || "Error")); }
    finally { setGuardandoManual(false); }
  };

  const actualizarEntregaManual = async (nuevoEstado, repartidorId = null) => {
    if (!entregaManualActiva || guardandoManual) return;
    if (nuevoEstado === "asignado" && !repartidorId) { alert("Elegí un repartidor."); return; }
    setGuardandoManual(true);
    try {
      const ahora = new Date().toISOString();
      const cambios = { estado: nuevoEstado, actualizado_at: ahora };
      if (nuevoEstado === "preparado") cambios.preparado_at = ahora;
      if (nuevoEstado === "asignado") { cambios.repartidor_id = repartidorId; cambios.asignado_at = ahora; }
      const { error } = await supabase.from("repartos_entregas").update(cambios)
        .eq("id", entregaManualActiva.id).eq("empresa_id", empresaId).eq("estado", entregaManualActiva.estado);
      if (error) throw error;
      setEntregaManualActiva(null);
      await cargarDatos();
    } catch (e) { alert("❌ No se pudo actualizar: " + (e?.message || "Error")); }
    finally { setGuardandoManual(false); }
  };

  const eliminarEntregaSinAsignar = async () => {
    const e = entregaManualActiva;
    if (!e || guardandoManual || !empresaId) return;
    const permitidos = ["pendiente_preparacion", "preparado"];
    if (!permitidos.includes(e.estado) || e.repartidor_id || e.pedido_id) {
      alert("Esta entrega no se puede eliminar desde aquí: ya está vinculada a un repartidor o a Ventas.");
      return;
    }
    const nombre = e.destinatario || "esta entrega";
    if (!window.confirm(`¿ELIMINAR DEFINITIVAMENTE la entrega de ${nombre}?\n\nEsta operación no se puede deshacer. No afecta otras entregas.`)) return;
    setGuardandoManual(true);
    try {
      // No eliminar entregas que contienen artículos: requieren un proceso específico.
      const { data: articulos, error: errorArticulos } = await supabase
        .from("repartos_entrega_items").select("id").eq("entrega_id", e.id)
        .eq("empresa_id", empresaId).limit(1);
      if (errorArticulos) throw errorArticulos;
      if (articulos?.length) throw new Error("La entrega tiene artículos vinculados. No se eliminó para proteger los datos.");
      const { data, error } = await supabase.from("repartos_entregas")
        .delete()
        .eq("id", e.id).eq("empresa_id", empresaId)
        .is("pedido_id", null).is("repartidor_id", null)
        .in("estado", permitidos)
        .select("id");
      if (error) throw error;
      if (data?.length !== 1) throw new Error("No se eliminó: la entrega pudo haber cambiado de estado o faltan permisos.");
      setEntregaManualActiva(null);
      await cargarDatos();
      alert("✅ Entrega eliminada correctamente.");
    } catch (err) {
      alert("❌ No se pudo eliminar: " + (err?.message || "Error desconocido"));
    } finally {
      setGuardandoManual(false);
    }
  };

  const desasignarManual = async () => {
    const e = entregaManualActiva;
    if (!e || e.estado !== "asignado" || !e.repartidor_id || guardandoManual) return;
    if (!window.confirm(`¿DESASIGNAR la entrega de ${e.destinatario}?\n\nVolverá a PREPARADO y quedará sin repartidor.`)) return;
    setGuardandoManual(true);
    try {
      const { data, error } = await supabase.from("repartos_entregas")
        .update({ estado: "preparado", repartidor_id: null, asignado_at: null, actualizado_at: new Date().toISOString() })
        .eq("id", e.id).eq("empresa_id", empresaId).eq("estado", "asignado")
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("La entrega cambió de estado. Actualizá la pantalla.");
      setEntregaManualActiva(null);
      await cargarDatos();
    } catch (err) { alert("No se pudo desasignar: " + (err.message || err)); }
    finally { setGuardandoManual(false); }
  };

  const guardarPuntoManual = async () => {
    if (!entregaManualActiva || !puntoElegido || guardandoManual) return;
    const idEntrega = entregaManualActiva.id;
    const latitud = Number(puntoElegido[0]);
    const longitud = Number(puntoElegido[1]);
    if (!puntoValido(latitud, longitud)) { alert("El punto seleccionado no es válido."); return; }
    if (!window.confirm(`¿Guardar este punto para ${entregaManualActiva.destinatario}?\n\nLatitud: ${latitud.toFixed(6)}\nLongitud: ${longitud.toFixed(6)}\n\nConfirmá solo si está en el domicilio correcto.`)) return;
    setGuardandoManual(true);
    try {
      // Verificar la fila devuelta: un UPDATE sin error puede afectar cero filas por RLS.
      const { data: actualizadas, error } = await supabase.from("repartos_entregas")
        .update({ latitud, longitud, actualizado_at: new Date().toISOString() })
        .eq("id", idEntrega).eq("empresa_id", empresaId)
        .select("id,latitud,longitud");
      if (error) throw error;
      if (!actualizadas || actualizadas.length !== 1) throw new Error("Supabase no confirmó la actualización. Revisar permisos de la empresa.");
      const guardada = actualizadas[0];
      if (Math.abs(Number(guardada.latitud) - latitud) > 0.000001 || Math.abs(Number(guardada.longitud) - longitud) > 0.000001)
        throw new Error("Las coordenadas devueltas no coinciden con las seleccionadas.");
      // Confirmar con una lectura nueva antes de cerrar el editor.
      const { data: verificada, error: errorLectura } = await supabase.from("repartos_entregas")
        .select("id,latitud,longitud").eq("id", idEntrega).eq("empresa_id", empresaId).single();
      if (errorLectura) throw errorLectura;
      if (Math.abs(Number(verificada.latitud) - latitud) > 0.000001 || Math.abs(Number(verificada.longitud) - longitud) > 0.000001)
        throw new Error("El punto no quedó persistido en la base de datos.");
      setEntregas(prev => prev.map(e => e.id === idEntrega ? { ...e, latitud, longitud } : e));
      setCorrigiendoPunto(false);
      setPuntoElegido(null);
      setEntregaManualActiva(null);
      await cargarDatos();
      alert("✅ Ubicación guardada y verificada en Supabase. Al actualizar la página debe permanecer en el mismo lugar.");
    } catch (err) { alert("❌ No se pudo confirmar el guardado del punto: " + (err.message || err)); }
    finally { setGuardandoManual(false); }
  };

  // Buscar candidatos y permitir elección explícita, nunca aceptar el primero automáticamente.
  const ubicarDirecciones = async () => {
    const clave = import.meta.env.VITE_GEOAPIFY_API_KEY;
    if (!clave) { alert("Falta configurar VITE_GEOAPIFY_API_KEY."); return; }
    const faltantes = entregas.filter(e => !e.pedido_id && !puntoValido(e.latitud, e.longitud) && e.direccion);
    if (!faltantes.length) { alert("No hay direcciones pendientes de ubicar."); return; }
    setUbicandoDestinos(true);
    try {
      const e = faltantes[0];
      const texto = [e.direccion, e.localidad, e.partido, e.provincia, "Argentina"].filter(Boolean).join(", ");
      const params = new URLSearchParams({text:texto,filter:"countrycode:ar",format:"json",limit:"10",apiKey:clave});
      const respuesta = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`);
      if (!respuesta.ok) throw new Error(`Geoapify respondió ${respuesta.status}`);
      const data = await respuesta.json();
      const candidatos = (data.results || []).filter(r => puntoValido(r.lat,r.lon));
      setIndiceUbicacion("");
      setSeleccionUbicacion({ entrega:e, texto, candidatos });
    } catch (err) { alert("No se pudo buscar la dirección: " + (err.message || err)); }
    finally { setUbicandoDestinos(false); }
  };

  const guardarCandidato = async () => {
    if (!seleccionUbicacion || indiceUbicacion === "") return;
    const r = seleccionUbicacion.candidatos[Number(indiceUbicacion)];
    if (!r) return;
    const e = seleccionUbicacion.entrega;
    const normalizar = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const ubicacion = normalizar([r.formatted,r.county,r.city,r.state,r.suburb].join(" "));
    const partidoOk = !e.partido || ubicacion.includes(normalizar(e.partido));
    const localidadOk = !e.localidad || ubicacion.includes(normalizar(e.localidad));
    if (!partidoOk || !localidadOk) {
      alert("La opción seleccionada no coincide con el partido o localidad cargados. No se guardó. Usá el punto manual si Geoapify no encuentra la dirección correcta.");
      return;
    }
    if (!window.confirm(`¿Guardar esta ubicación para ${e.destinatario}?\n\n${r.formatted}\n\nConfirmá solamente si es el domicilio correcto.`)) return;
    setUbicandoDestinos(true);
    try {
      const {data: actualizadas, error} = await supabase.from("repartos_entregas")
        .update({latitud:Number(r.lat),longitud:Number(r.lon)})
        .eq("id",e.id).eq("empresa_id",empresaId)
        .is("latitud", null).is("longitud", null)
        .select("id");
      if (error) throw error;
      if (!actualizadas?.length) throw new Error("No se guardó: esta entrega ya tiene una ubicación o no hay permiso para modificarla.");
      setSeleccionUbicacion(null);
      await cargarDatos();
    } catch (err) { alert("No se pudo guardar la ubicación: " + (err.message || err)); }
    finally { setUbicandoDestinos(false); }
  };

  const destinosMapa = modoIndependiente
    ? entregas.filter(e => !e.pedido_id).map(e => ({ ...e, cliente: e.destinatario || "Destinatario", direccion: [e.direccion,e.localidad,e.partido,e.provincia].filter(Boolean).join(", ") }))
    : pedidos.map(p => ({
        ...p, estado: estadoLogisticoPedido(p),
        repartidor_id: (entregasPorPedido.get(String(p.id)) || [])[0]?.repartidor_id || null,
      }));

  const cerrarSesion = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    window.location.replace("/");
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "42px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "9px 10px",
    fontSize: "14px",
    background: "#fff",
    color: "#0f172a",
  };

  if (modoIndependiente) {
    const hoy = fechaLocalISO();
    const manuales = entregas.filter(e => !e.pedido_id);
    const cuenta = estado => manuales.filter(e => e.estado === estado).length;
    const filtradas = manuales.filter(e => {
      const grupo = bandeja === "todos" ||
        (bandeja === "pendientes" && e.estado === "pendiente_preparacion") ||
        (bandeja === "preparados" && e.estado === "preparado") ||
        (bandeja === "asignados" && ["asignado", "en_reparto"].includes(e.estado)) ||
        (bandeja === "hoy" && e.creado_at?.slice(0, 10) === hoy) ||
        (bandeja === "devoluciones_pendientes" && e.estado === "devolucion_informada") ||
        (bandeja === "volvieron_hoy" && e.estado === "vuelto_deposito");
      const coincideRepartidor = filtroRepartidor === "todos" ||
        (filtroRepartidor === "sin_asignar" ? !e.repartidor_id : String(e.repartidor_id) === filtroRepartidor);
      return grupo && coincideRepartidor && [e.destinatario, e.direccion, e.localidad, e.numero_remito, e.numero_factura]
        .some(x => String(x || "").toLowerCase().includes(busqueda.toLowerCase().trim()));
    });
    const campo = (clave, titulo, tipo = "text", obligatorio = false) => (
      <label style={{ display: "block", fontSize: 12, fontWeight: 800 }} key={clave}>
        {titulo}
        <input type={tipo} required={obligatorio} value={manual[clave]}
          onChange={e => setManual(m => ({ ...m, [clave]: e.target.value }))}
          style={{ ...inputStyle, marginTop: 5 }} />
      </label>
    );
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", color: "#0f172a", fontFamily: "Arial, sans-serif" }}>
        <header style={{ background: "#0f172a", color: "white", padding: 16 }}>
          <div style={{ maxWidth: 1000, margin: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div><div style={{ fontSize: 20, fontWeight: 900 }}>🚚 RutaComercio · Repartos</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>{empresaNombre} · Repartos independiente</div></div>
            <div style={{ display: "flex", gap: 8 }}>
              {typeof onVolver === "function" && <button onClick={onVolver}>← VOLVER</button>}
              <button onClick={cerrarSesion} style={{ padding: 9 }}>SALIR</button>
            </div>
          </div>
        </header>
        <main style={{ maxWidth: 1000, margin: "auto", padding: 14 }}>
          <RutaChatSupervisor empresaId={empresaId} repartidores={repartidores} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <strong>Gestión de entregas</strong>
            <button onClick={() => { setNuevaEntregaAbierta(true); setEntregaManualActiva(null); }}
              style={{ padding: "12px 18px", background: "#16a34a", color: "white", border: 0, borderRadius: 8, fontWeight: 900, cursor: "pointer" }}>＋ NUEVA ENTREGA</button>
          </div>
          <MapaPlanificacion filtro={filtroRepartidor} setFiltro={setFiltroRepartidor} destinos={destinosMapa} repartidores={repartidores} ubicando={ubicandoDestinos} onUbicar={ubicarDirecciones} alElegirEntrega={d => { const e = entregas.find(x => x.id === d.id); if (e) { setEntregaManualActiva(e); setRepartidorSeleccionado(e.repartidor_id || ""); } }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8, marginBottom: 14 }}>
            {[["pendientes", "📦 PENDIENTES", cuenta("pendiente_preparacion")], ["preparados", "✅ PREPARADAS", cuenta("preparado")],
              ["asignados", "🚚 ASIGNADAS", cuenta("asignado") + cuenta("en_reparto")], ["todos", "📋 TODAS", manuales.length],
              ["devoluciones_pendientes", "📥 DEVOLUCIONES", cuenta("devolucion_informada")], ["volvieron_hoy", "🔄 VOLVIERON", cuenta("vuelto_deposito")]].map(([id, titulo, n]) => (
              <button key={id} onClick={() => { setBandeja(id); setFiltroRepartidor(["pendientes", "preparados"].includes(id) ? "sin_asignar" : "todos"); }} style={{ padding: 12, textAlign: "left", background: bandeja === id ? "#dbeafe" : "white", border: bandeja === id ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: 9, cursor: "pointer" }}>
                <div style={{ fontSize: 11, fontWeight: 800 }}>{titulo}</div><div style={{ fontSize: 24, fontWeight: 900 }}>{n}</div>
              </button>))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><input placeholder="🔎 Destinatario, dirección, remito o factura..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={inputStyle} />
            <button onClick={cargarDatos} style={{ padding: "0 14px" }}>↻</button></div>
          {cargando ? <p>Cargando entregas...</p> : errorCarga ? <p style={{ color: "#b91c1c" }}>❌ {errorCarga}</p> : filtradas.length === 0 ?
            <div style={{ background: "white", padding: 25, borderRadius: 9, textAlign: "center" }}>No hay entregas en esta bandeja.</div> :
            <div style={{ display: "grid", gap: 8 }}>{filtradas.map(e => <button key={e.id} onClick={() => { setEntregaManualActiva(e); setNuevaEntregaAbierta(false); setRepartidorSeleccionado(e.repartidor_id || ""); }}
              style={{ textAlign: "left", padding: 14, background: "white", border: "1px solid #cbd5e1", borderRadius: 9, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><strong>📦 {e.destinatario || "Sin destinatario"}</strong><strong>{ESTADO_LABEL[e.estado] || e.estado}</strong></div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>📍 {[e.direccion, e.localidad, e.partido, e.provincia].filter(Boolean).join(", ")}</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{e.bultos || "—"} bulto/s · {e.fecha_programada || "Sin fecha"} · {e.numero_remito ? `Remito ${e.numero_remito}` : "Sin remito"}</div>
            </button>)}</div>}
          {seleccionUbicacion && <div style={{position:"fixed",inset:0,zIndex:3000,background:"#000a",padding:16,overflowY:"auto"}}>
            <div style={{maxWidth:680,margin:"25px auto",padding:20,background:"white",borderRadius:12}}>
              <h3>📍 Elegir ubicación — {seleccionUbicacion.entrega.destinatario}</h3>
              <p style={{fontSize:13}}>Dirección solicitada: {seleccionUbicacion.texto}</p>
              <p style={{fontSize:12,color:"#92400e"}}>Elegí una opción que corresponda al partido y localidad indicados. Si no aparece, usá el mapa manual.</p>
              <div style={{display:"grid",gap:9,maxHeight:300,overflowY:"auto"}}>
                {seleccionUbicacion.candidatos.length===0 && <p>Geoapify no encontró alternativas.</p>}
                {seleccionUbicacion.candidatos.map((r,i)=><label key={i} style={{display:"flex",gap:10,padding:10,border:"1px solid #cbd5e1",borderRadius:8,cursor:"pointer"}}>
                  <input type="radio" name="ubicacion-candidata" checked={indiceUbicacion===String(i)} onChange={()=>setIndiceUbicacion(String(i))}/>
                  <span>{r.formatted || "Ubicación sin dirección detallada"}</span>
                </label>)}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16}}>
                <button type="button" disabled={indiceUbicacion==="" || ubicandoDestinos} onClick={guardarCandidato}>✅ GUARDAR UBICACIÓN ELEGIDA</button>
                <button type="button" onClick={()=>{setEntregaManualActiva(seleccionUbicacion.entrega);setCorrigiendoPunto(true);setPuntoElegido(null);setSeleccionUbicacion(null);}}>🗺️ ELEGIR EN EL MAPA MANUALMENTE</button>
                <button type="button" onClick={()=>setSeleccionUbicacion(null)}>CANCELAR</button>
              </div>
            </div>
          </div>}
          {nuevaEntregaAbierta && <div style={{ position: "fixed", inset: 0, background: "#0009", zIndex: 2000, overflowY: "auto", padding: 16 }}>
            <form onSubmit={e => { e.preventDefault(); crearEntregaManual(); }} style={{ maxWidth: 650, margin: "30px auto", background: "white", padding: 20, borderRadius: 12 }}>
              <h3>＋ Nueva entrega</h3><p style={{ fontSize: 12, color: "#64748b" }}>No requiere NVI ni pedido de Ventas.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                {campo("destinatario", "Destinatario *", "text", true)}
                {campo("direccion", "Dirección *", "text", true)}
                {campo("localidad", "Localidad *", "text", true)}
                <label style={{display:"block",fontSize:12,fontWeight:800}}>Provincia *
                  <select required value={manual.provincia} onChange={e=>setManual(m=>({...m,provincia:e.target.value,partido:""}))} style={{...inputStyle,marginTop:5}}>
                    <option value="">Seleccionar provincia...</option>{PROVINCIAS_ARGENTINAS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label style={{display:"block",fontSize:12,fontWeight:800}}>Partido / Departamento *
                  <input
                    required
                    type="text"
                    list="repartos-lista-municipios"
                    autoComplete="off"
                    disabled={!manual.provincia}
                    placeholder={!manual.provincia ? "Primero elegí la provincia" : cargandoMunicipios ? "Cargando partidos..." : "Escribí para buscar, ej.: Quilmes"}
                    value={manual.partido}
                    onChange={e=>setManual(m=>({...m,partido:e.target.value}))}
                    style={{...inputStyle,marginTop:5}}
                  />
                  <datalist id="repartos-lista-municipios">
                    {municipios.map(x=><option key={x} value={x}/>)}
                  </datalist>
                  {municipiosError && <span style={{fontSize:11,color:"#92400e"}}>{municipiosError}</span>}
                  <span style={{display:"block",fontSize:11,color:"#64748b",marginTop:4}}>Podés buscar por nombre o escribirlo manualmente.</span>
                </label>
                {campo("telefono", "Teléfono", "tel")}
                {campo("referencia_domicilio", "Referencia del domicilio")}{campo("bultos", "Cantidad de bultos *", "number", true)}
                {campo("fecha_programada", "Fecha programada", "date")}{campo("numero_remito", "Nº remito")}{campo("numero_factura", "Nº factura")}
              </div>
              <label style={{ display: "block", marginTop: 12, fontWeight: 800, fontSize: 12 }}>Observaciones<textarea value={manual.observaciones} onChange={e => setManual(m => ({ ...m, observaciones: e.target.value }))} style={{ ...inputStyle, marginTop: 5 }} rows={3} /></label>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}><button type="button" onClick={() => setNuevaEntregaAbierta(false)} disabled={guardandoManual}>CANCELAR</button>
                <button type="submit" disabled={guardandoManual} style={{ background: "#16a34a", color: "white", border: 0, borderRadius: 8, padding: 12, fontWeight: 900 }}>{guardandoManual ? "GUARDANDO..." : "💾 GUARDAR ENTREGA"}</button></div>
            </form></div>}
          {entregaManualActiva && <div style={{ position: "fixed", inset: 0, background: "#0009", zIndex: 2000, overflowY: "auto", padding: 16 }}>
            <div style={{ maxWidth: 600, margin: "40px auto", background: "white", padding: 20, borderRadius: 12 }}>
              <h3>📦 {entregaManualActiva.destinatario}</h3>
              <p>📍 {[entregaManualActiva.direccion, entregaManualActiva.localidad, entregaManualActiva.partido, entregaManualActiva.provincia].filter(Boolean).join(", ")}</p>
              {puntoValido(entregaManualActiva.latitud, entregaManualActiva.longitud) && <button type="button" disabled={corrigiendoUbicacion} onClick={async()=>{
                if (!window.confirm("¿Quitar la ubicación guardada de esta entrega para poder ubicarla nuevamente? No se borra la entrega.")) return;
                setCorrigiendoUbicacion(true);
                try { const {error}=await supabase.from("repartos_entregas").update({latitud:null,longitud:null}).eq("id",entregaManualActiva.id).eq("empresa_id",empresaId); if(error) throw error; setEntregaManualActiva(null); await cargarDatos(); alert("Ubicación quitada. Revisá el domicilio antes de volver a ubicarla."); }
                catch(e){alert("No se pudo quitar la ubicación: "+(e.message||e));} finally {setCorrigiendoUbicacion(false);}
              }} style={{padding:8,marginBottom:10}}>📍 CORREGIR UBICACIÓN DEL MAPA</button>}
              <button type="button" onClick={() => { setCorrigiendoPunto(v => !v); setPuntoElegido(null); }} style={{padding:9,marginBottom:10}}>📍 ELEGIR PUNTO MANUALMENTE</button>
              {corrigiendoPunto && <div style={{marginBottom:12}}>
                <p style={{fontSize:12}}>Tocá el domicilio correcto en el mapa. No se guarda hasta que confirmes.</p>
                <div style={{height:310,overflow:"hidden",borderRadius:9}}>
                  <MapContainer center={puntoValido(entregaManualActiva.latitud, entregaManualActiva.longitud) ? [Number(entregaManualActiva.latitud),Number(entregaManualActiva.longitud)] : [-34.724,-58.254]} zoom={13} style={{height:"100%",width:"100%"}}>
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                    <ElegirPuntoMapa onElegir={setPuntoElegido}/>
                    {puntoElegido && <Marker position={puntoElegido}/>}
                  </MapContainer>
                </div>
                <button type="button" disabled={!puntoElegido || guardandoManual} onClick={guardarPuntoManual} style={{padding:10,marginTop:8,background:"#16a34a",color:"white",border:0,borderRadius:8}}>✅ GUARDAR PUNTO ELEGIDO</button>
              </div>}
              <p>☎ {entregaManualActiva.telefono || "Sin teléfono"} · {entregaManualActiva.bultos || "—"} bultos</p>
              <p><strong>{ESTADO_LABEL[entregaManualActiva.estado] || entregaManualActiva.estado}</strong></p>
              {entregaManualActiva.observaciones && <p>📝 {entregaManualActiva.observaciones}</p>}
              {entregaManualActiva.estado === "pendiente_preparacion" && <button disabled={guardandoManual} onClick={() => actualizarEntregaManual("preparado")} style={{ padding: 12, background: "#16a34a", color: "white", border: 0, borderRadius: 8, fontWeight: 800 }}>✅ MARCAR PREPARADA</button>}
              {entregaManualActiva.estado === "preparado" && <div style={{ display: "grid", gap: 10 }}>
                {repartidores.length === 0 ? <p>No hay repartidores habilitados para esta empresa.</p> : <><label>Elegir repartidor<select value={repartidorSeleccionado} onChange={e => setRepartidorSeleccionado(e.target.value)} style={inputStyle}><option value="">Seleccionar...</option>{repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre || r.email}</option>)}</select></label>
                  <button disabled={guardandoManual || !repartidorSeleccionado} onClick={() => actualizarEntregaManual("asignado", repartidorSeleccionado)} style={{ padding: 12, background: "#2563eb", color: "white", border: 0, borderRadius: 8, fontWeight: 800 }}>🚚 ASIGNAR REPARTO</button></>}
              </div>}
              {["pendiente_preparacion", "preparado"].includes(entregaManualActiva.estado) && !entregaManualActiva.repartidor_id && !entregaManualActiva.pedido_id && (
                <div style={{ marginTop: 16 }}>
                  <button type="button" disabled={guardandoManual} onClick={eliminarEntregaSinAsignar}
                    style={{padding:11,background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:8,fontWeight:800}}>
                    🗑️ ELIMINAR ENTREGA
                  </button>
                </div>
              )}
              {entregaManualActiva.estado === "asignado" && <button type="button" disabled={guardandoManual} onClick={desasignarManual} style={{padding:11,background:"#f59e0b",border:0,borderRadius:8,fontWeight:800}}>↩️ DESASIGNAR REPARTIDOR</button>}
              {entregaManualActiva.repartidor_id && <p style={{ fontSize: 12 }}>Repartidor: {repartidores.find(r => r.id === entregaManualActiva.repartidor_id)?.nombre || "Asignado"}</p>}
              <div style={{ marginTop: 16 }}><button onClick={() => setEntregaManualActiva(null)}>← CERRAR</button></div>
            </div></div>}
        </main>
      </div>
    );
  }

  if (pedidoActivo) {
    const existentes = entregasPorPedido.get(String(pedidoActivo.id)) || [];

    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
        <header style={{ background: "#0f172a", color: "#fff", padding: "12px 14px" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: "900" }}>📦 DESPACHO · PREPARACIÓN</div>
              <div style={{ fontSize: "19px", fontWeight: "900" }}>NVI #{pedidoActivo.numeroVisible}</div>
            </div>
            <button onClick={() => setPedidoActivo(null)} style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #64748b", background: "#1e293b", color: "#fff", fontWeight: "800", cursor: "pointer" }}>
              ← VOLVER
            </button>
          </div>
        </header>

        <main style={{ maxWidth: "900px", margin: "0 auto", padding: "14px" }}>
          <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
            <div style={{ fontSize: "20px", fontWeight: "900" }}>{pedidoActivo.cliente}</div>
            <div style={{ marginTop: "4px", color: "#475569", fontSize: "13px" }}>📍 {pedidoActivo.direccion || "Sin dirección cargada"}</div>
            <div style={{ marginTop: "4px", color: "#475569", fontSize: "12px" }}>
              Vendedor: <strong>{pedidoActivo.preventista || "—"}</strong> · Total NVI: <strong>${Number(pedidoActivo.total || 0).toLocaleString("es-AR")}</strong>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
            <div style={{ fontSize: "13px", fontWeight: "900", marginBottom: "9px" }}>ARTÍCULOS A PREPARAR</div>
            <div style={{ display: "grid", gap: "7px" }}>
              {(pedidoActivo.items || []).map((it, i) => (
                <div key={`${it.producto_id || it.codigo || i}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: "10px", borderBottom: "1px solid #e2e8f0", paddingBottom: "7px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: "800", fontSize: "13px" }}>{it.descripcion}</div>
                    <div style={{ color: "#64748b", fontSize: "11px" }}>
                      {[it.codigo, it.color && `Color ${it.color}`, it.talle && `Talle ${it.talle}`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{ fontWeight: "900", whiteSpace: "nowrap" }}>x {Number(it.cantidad || 0)}</div>
                </div>
              ))}
            </div>
          </div>

          {existentes.length > 0 ? (
            <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontWeight: "900", marginBottom: "10px" }}>
                {ESTADO_LABEL[existentes[0]?.estado] || existentes[0]?.estado}
              </div>

              <div style={{ fontSize: "12px", color: "#475569", marginBottom: "12px" }}>
                {existentes[0]?.numero_remito ? `Remito ${existentes[0].numero_remito}` : "Sin remito"}
                {" · "}
                {existentes[0]?.numero_factura ? `Factura ${existentes[0].numero_factura}` : "Sin factura"}
                {existentes[0]?.bultos !== null && existentes[0]?.bultos !== undefined ? ` · ${existentes[0].bultos} bulto/s` : ""}
              </div>

              {["preparado", "asignado"].includes(existentes[0]?.estado) && (
                <div style={{ background:"#f8fafc", border:"1px solid #cbd5e1", borderRadius:"10px", padding:"12px", marginBottom:"14px" }}>
                  <div style={{ fontSize:"14px", fontWeight:"900", marginBottom:"10px" }}>📦 DATOS REALES DE LOGÍSTICA</div>
                  <div style={{ fontSize:"11px", color:"#64748b", marginBottom:"10px" }}>
                    Depósito y Repartos puede corregir estos datos hasta que la mercadería salga a reparto.
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:"10px" }}>
                    <label style={{ fontSize:"11px", fontWeight:"900", color:"#475569" }}>
                      📦 BULTOS REALES
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.bultos}
                        onChange={e => setForm(f => ({ ...f, bultos:e.target.value }))}
                        style={{ ...inputStyle, marginTop:"5px" }}
                      />
                    </label>

                    <label style={{ fontSize:"11px", fontWeight:"900", color:"#475569" }}>
                      🧾 REMITO
                      <input
                        value={form.numero_remito}
                        onChange={e => setForm(f => ({ ...f, numero_remito:e.target.value }))}
                        style={{ ...inputStyle, marginTop:"5px" }}
                      />
                    </label>

                    <label style={{ fontSize:"11px", fontWeight:"900", color:"#475569" }}>
                      🧾 FACTURA
                      <input
                        value={form.numero_factura}
                        onChange={e => setForm(f => ({ ...f, numero_factura:e.target.value }))}
                        style={{ ...inputStyle, marginTop:"5px" }}
                      />
                    </label>

                    <label style={{ fontSize:"11px", fontWeight:"900", color:"#475569" }}>
                      📅 FECHA DE REPARTO
                      <input
                        type="date"
                        value={form.fecha_programada}
                        onChange={e => setForm(f => ({ ...f, fecha_programada:e.target.value }))}
                        style={{ ...inputStyle, marginTop:"5px" }}
                      />
                    </label>
                  </div>

                  <label style={{ display:"block", fontSize:"11px", fontWeight:"900", color:"#475569", marginTop:"10px" }}>
                    📝 OBSERVACIONES DE LOGÍSTICA
                    <textarea
                      value={form.observaciones}
                      onChange={e => setForm(f => ({ ...f, observaciones:e.target.value }))}
                      rows="2"
                      style={{ ...inputStyle, marginTop:"5px", resize:"vertical" }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={guardarDatosLogisticos}
                    disabled={guardandoDatos}
                    style={{
                      width:"100%", marginTop:"10px", minHeight:"46px", border:"none",
                      borderRadius:"9px", background:guardandoDatos ? "#94a3b8" : "#0f766e",
                      color:"#fff", fontSize:"13px", fontWeight:"900", cursor:guardandoDatos ? "wait" : "pointer"
                    }}
                  >
                    {guardandoDatos ? "⏳ GUARDANDO..." : "💾 GUARDAR DATOS DE LOGÍSTICA"}
                  </button>
                </div>
              )}

              {existentes[0]?.estado === "devolucion_informada" ? (
                <div style={{ background:"#fff7ed", border:"1px solid #fdba74", borderRadius:"10px", padding:"12px" }}>
                  <div style={{ fontWeight:"900", color:"#9a3412", marginBottom:"6px" }}>❌ ENTREGA NO REALIZADA</div>
                  <div style={{ fontSize:"12px", color:"#7c2d12", marginBottom:"10px" }}>
                    Motivo: <strong>{existentes[0]?.motivo_no_entrega || "No informado"}</strong>
                  </div>
                  <div style={{ fontSize:"11px", color:"#475569", marginBottom:"10px" }}>
                    Confirmá únicamente cuando los bultos hayan regresado físicamente al depósito.
                  </div>
                  <button type="button" onClick={recibirMercaderiaDevuelta} disabled={procesandoDevolucion}
                    style={{ width:"100%", minHeight:"50px", border:"none", borderRadius:"9px", background:procesandoDevolucion?"#94a3b8":"#0f766e", color:"#fff", fontWeight:"900", cursor:procesandoDevolucion?"wait":"pointer" }}>
                    {procesandoDevolucion ? "⏳ REGISTRANDO..." : "📥 RECIBIR MERCADERÍA DEVUELTA"}
                  </button>
                </div>
              ) : existentes[0]?.estado === "vuelto_deposito" ? (
                <div style={{ background:"#f0fdfa", border:"1px solid #5eead4", borderRadius:"10px", padding:"12px" }}>
                  <div style={{ fontWeight:"900", color:"#115e59", marginBottom:"6px" }}>🔄 MERCADERÍA RECIBIDA EN DEPÓSITO</div>
                  <div style={{ fontSize:"11px", color:"#475569", marginBottom:"12px" }}>
                    La NVI sigue vigente. Elegí reenvío o solicitá su anulación al Supervisor.
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(210px, 1fr))", gap:"10px", marginBottom:"10px" }}>
                    <label style={{ fontSize:"11px", fontWeight:"900", color:"#475569" }}>
                      👤 REPARTIDOR PARA REENVÍO
                      <select value={repartidorSeleccionado} onChange={e=>setRepartidorSeleccionado(e.target.value)} style={{...inputStyle,marginTop:"5px"}}>
                        <option value="">Elegir repartidor...</option>
                        {repartidores.map(r=><option key={r.id} value={r.id}>{r.nombre || r.email}</option>)}
                      </select>
                    </label>
                    <label style={{ fontSize:"11px", fontWeight:"900", color:"#475569" }}>
                      📅 NUEVA FECHA
                      <input type="date" value={form.fecha_programada} onChange={e=>setForm(f=>({...f,fecha_programada:e.target.value}))} style={{...inputStyle,marginTop:"5px"}} />
                    </label>
                  </div>
                  <button type="button" onClick={reenviarDevolucion} disabled={procesandoDevolucion}
                    style={{ width:"100%", minHeight:"48px", border:"none", borderRadius:"9px", background:procesandoDevolucion?"#94a3b8":"#2563eb", color:"#fff", fontWeight:"900", cursor:procesandoDevolucion?"wait":"pointer", marginBottom:"8px" }}>
                    🚚 REENVIAR / REPROGRAMAR
                  </button>
                  <button type="button" onClick={solicitarAnulacionNvi} disabled={procesandoDevolucion}
                    style={{ width:"100%", minHeight:"48px", border:"none", borderRadius:"9px", background:procesandoDevolucion?"#94a3b8":"#b91c1c", color:"#fff", fontWeight:"900", cursor:procesandoDevolucion?"wait":"pointer" }}>
                    ❌ SOLICITAR ANULACIÓN DE NVI
                  </button>
                </div>
              ) : existentes[0]?.estado === "anulacion_solicitada" ? (
                <div style={{ background:"#fff7ed", border:"1px solid #fdba74", borderRadius:"10px", padding:"12px", color:"#9a3412" }}>
                  <div style={{ fontWeight:"900" }}>⏳ ANULACIÓN PENDIENTE DE SUPERVISOR</div>
                  <div style={{ fontSize:"12px", marginTop:"6px" }}>Motivo: {existentes[0]?.motivo_solicitud_anulacion || "—"}</div>
                  <div style={{ fontSize:"11px", marginTop:"7px", color:"#475569" }}>La NVI continúa vigente y el stock no fue revertido.</div>
                </div>
              ) : existentes[0]?.estado === "preparado" ? (
                <>
                  <div style={{ fontSize: "14px", fontWeight: "900", marginBottom: "10px" }}>🚚 ASIGNAR REPARTO</div>

                  {repartidores.length === 0 ? (
                    <div style={{ padding: "10px", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: "8px", color: "#9a3412", fontSize: "12px" }}>
                      No hay repartidores habilitados para esta empresa.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "900", color: "#475569" }}>
                        👤 REPARTIDOR
                        <select
                          value={repartidorSeleccionado}
                          onChange={e => setRepartidorSeleccionado(e.target.value)}
                          style={{ ...inputStyle, marginTop: "5px" }}
                        >
                          <option value="">Elegir repartidor...</option>
                          {repartidores.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.nombre || r.email}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ fontSize: "11px", fontWeight: "900", color: "#475569" }}>
                        📅 FECHA DE REPARTO
                        <input
                          type="date"
                          value={form.fecha_programada}
                          onChange={e => setForm(f => ({ ...f, fecha_programada: e.target.value }))}
                          style={{ ...inputStyle, marginTop: "5px" }}
                        />
                      </label>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={asignarReparto}
                    disabled={asignando || repartidores.length === 0}
                    style={{
                      width: "100%",
                      marginTop: "12px",
                      minHeight: "50px",
                      border: "none",
                      borderRadius: "9px",
                      background: asignando || repartidores.length === 0 ? "#94a3b8" : "#2563eb",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "900",
                      cursor: asignando ? "wait" : "pointer",
                    }}
                  >
                    {asignando ? "⏳ ASIGNANDO..." : "🚚 ASIGNAR REPARTO"}
                  </button>
                </>
              ) : (
                <div style={{ padding: "10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "12px", color: "#1e3a8a" }}>
                  Esta entrega ya fue asignada.
                  {(() => {
                    const rep = repartidores.find(r => String(r.id) === String(existentes[0]?.repartidor_id));
                    return rep ? ` Repartidor: ${rep.nombre || rep.email}.` : "";
                  })()}
                  {existentes[0]?.fecha_programada ? ` Fecha: ${existentes[0].fecha_programada}.` : ""}
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "14px", fontWeight: "900", marginBottom: "12px" }}>DATOS DE PREPARACIÓN</div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px" }}>
                <label style={{ fontSize: "11px", fontWeight: "900", color: "#475569" }}>
                  📦 BULTOS
                  <input type="number" min="1" step="1" value={form.bultos} onChange={e => setForm(f => ({ ...f, bultos: e.target.value }))} style={{ ...inputStyle, marginTop: "5px" }} placeholder="Ej.: 3" />
                </label>

                <label style={{ fontSize: "11px", fontWeight: "900", color: "#475569" }}>
                  📄 Nº REMITO
                  <input value={form.numero_remito} onChange={e => setForm(f => ({ ...f, numero_remito: e.target.value }))} style={{ ...inputStyle, marginTop: "5px" }} placeholder="Opcional" />
                </label>

                <label style={{ fontSize: "11px", fontWeight: "900", color: "#475569" }}>
                  🧾 Nº FACTURA
                  <input value={form.numero_factura} onChange={e => setForm(f => ({ ...f, numero_factura: e.target.value }))} style={{ ...inputStyle, marginTop: "5px" }} placeholder="Opcional" />
                </label>

                <label style={{ fontSize: "11px", fontWeight: "900", color: "#475569" }}>
                  📅 FECHA PREVISTA
                  <input type="date" value={form.fecha_programada} onChange={e => setForm(f => ({ ...f, fecha_programada: e.target.value }))} style={{ ...inputStyle, marginTop: "5px" }} />
                </label>
              </div>

              <label style={{ display: "block", marginTop: "10px", fontSize: "11px", fontWeight: "900", color: "#475569" }}>
                📝 OBSERVACIONES
                <textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={3} style={{ ...inputStyle, marginTop: "5px", resize: "vertical" }} placeholder="Opcional" />
              </label>

              <div style={{ marginTop: "10px", padding: "9px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1e3a8a", fontSize: "11px" }}>
                Esta primera versión prepara la <strong>entrega completa</strong>. La división de una NVI en varios remitos/entregas se habilitará sobre esta misma estructura.
              </div>

              <button
                type="button"
                onClick={prepararEntregaCompleta}
                disabled={guardando}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  minHeight: "50px",
                  border: "none",
                  borderRadius: "9px",
                  background: guardando ? "#94a3b8" : "#16a34a",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "900",
                  cursor: guardando ? "wait" : "pointer",
                }}
              >
                {guardando ? "⏳ PREPARANDO..." : "✅ PEDIDO PREPARADO"}
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
      <header style={{ background: "#0f172a", color: "#fff", padding: "12px 14px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "950" }}>📦 RutaComercio · Depósito y Repartos</div>
            <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>
              {empresaNombre || "Empresa"} · Preparación de entregas
            </div>
          </div>
          <div style={{ display: "flex", gap: "7px" }}>
            {typeof onVolver === "function" && (
              <button onClick={onVolver} style={{ padding: "8px 10px", border: "1px solid #64748b", borderRadius: "8px", background: "#1e293b", color: "#fff", fontWeight: "800", cursor: "pointer" }}>
                ← VOLVER
              </button>
            )}
            <button onClick={cerrarSesion} style={{ padding: "8px 10px", border: "1px solid #64748b", borderRadius: "8px", background: "#1e293b", color: "#fff", fontWeight: "800", cursor: "pointer" }}>
              SALIR
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "14px" }}>
          <RutaChatSupervisor empresaId={empresaId} repartidores={repartidores} />
        <MapaPlanificacion filtro={filtroRepartidor} setFiltro={setFiltroRepartidor} destinos={destinosMapa} repartidores={repartidores} ubicando={ubicandoDestinos} onUbicar={ubicarDirecciones} alElegirEntrega={d => { const p = pedidos.find(x => x.id === d.id); if (p) abrirPedido(p); }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px", marginBottom: "12px" }}>
          {[
            ["hoy", "📥 NVIs RECIBIDAS HOY", resumenHoy.recibidas],
            ["sin_preparar_hoy", "📦 SIN PREPARAR", resumenHoy.sinPreparar],
            ["asignadas_hoy", "🚚 ASIGNADAS", `${resumenHoy.asignadas}/${resumenHoy.recibidas}`],
            ["devoluciones_pendientes", "📥 DEVOLUCIONES PENDIENTES", resumenHoy.devolucionesPendientes],
            ["volvieron_hoy", "🔄 VOLVIERON", resumenHoy.volvieron],
          ].map(([clave, texto, cantidad]) => {
            const activa = bandeja === clave;
            return (
              <button
                key={clave}
                type="button"
                onClick={() => setBandeja(clave)}
                style={{
                  background: activa ? "#dbeafe" : "#fff",
                  border: activa ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "10px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: activa ? "#1d4ed8" : "#0f172a",
                }}
              >
                <div style={{ fontSize: "10px", color: activa ? "#1d4ed8" : "#64748b", fontWeight: "900" }}>{texto}</div>
                <div style={{ fontSize: "24px", fontWeight: "950" }}>{cantidad}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "7px", marginBottom: "12px" }}>
          {[
            ["pendientes", "📦 PENDIENTES", contadoresBandeja.pendientes],
            ["preparados", "✅ PREPARADOS", contadoresBandeja.preparados],
            ["asignados", "🚚 ASIGNADOS", contadoresBandeja.asignados],
            ["todos", "📋 TODOS", contadoresBandeja.todos],
          ].map(([clave, texto, cantidad]) => {
            const activa = bandeja === clave;
            return (
              <button
                key={clave}
                type="button"
                onClick={() => setBandeja(clave)}
                style={{
                  minHeight: "48px",
                  border: activa ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  borderRadius: "9px",
                  background: activa ? "#dbeafe" : "#fff",
                  color: activa ? "#1d4ed8" : "#334155",
                  fontSize: "11px",
                  fontWeight: "950",
                  cursor: "pointer",
                  padding: "7px 5px",
                }}
              >
                <div>{texto}</div>
                <div style={{ fontSize: "17px", marginTop: "2px" }}>{cantidad}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="🔎 NVI, cliente, dirección o vendedor..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={cargarDatos} style={{ border: "1px solid #94a3b8", borderRadius: "8px", background: "#fff", padding: "8px 12px", fontWeight: "900", cursor: "pointer" }}>
            ↻
          </button>
        </div>

        {cargando ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>⏳ Cargando Depósito y Repartos...</div>
        ) : errorCarga ? (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: "10px", padding: "14px" }}>
            ❌ {errorCarga}
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "28px", textAlign: "center", color: "#64748b" }}>
            {bandeja === "hoy" && "No hay NVI recibidas hoy."}
            {bandeja === "sin_preparar_hoy" && "No hay NVI recibidas hoy pendientes de preparación."}
            {bandeja === "asignadas_hoy" && "No hay NVI recibidas hoy que hayan sido asignadas."}
            {bandeja === "devoluciones_pendientes" && "No hay mercadería pendiente de recepción por devolución."}
            {bandeja === "volvieron_hoy" && "No hay NVI recibidas hoy que hayan vuelto al depósito."}
            {bandeja === "pendientes" && "No hay NVI pendientes de preparación."}
            {bandeja === "preparados" && "No hay entregas preparadas esperando asignación."}
            {bandeja === "asignados" && "No hay entregas asignadas a repartidores."}
            {bandeja === "todos" && "No hay NVI pasadas a Depósito para mostrar."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {pedidosFiltrados.map(p => {
              const creadas = entregasPorPedido.get(String(p.id)) || [];
              const ultima = creadas[0] || null;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => abrirPedido(p)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "#fff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    padding: "11px 12px",
                    cursor: "pointer",
                    color: "#0f172a",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: "950" }}>🧾 NVI #{p.numeroVisible} · {p.cliente}</div>
                      <div style={{ marginTop: "3px", color: "#64748b", fontSize: "11px" }}>📍 {p.direccion || "Sin dirección cargada"}</div>
                      <div style={{ marginTop: "3px", color: "#64748b", fontSize: "11px" }}>
                        {p.items.length} renglón/es · ${Number(p.total || 0).toLocaleString("es-AR")} · {p.preventista || "Sin vendedor"}
                      </div>
                    </div>
                    <div style={{
                      flexShrink: 0,
                      padding: "4px 7px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      fontWeight: "900",
                      background: ultima ? "#dcfce7" : "#ffedd5",
                      color: ultima ? "#166534" : "#9a3412",
                    }}>
                      {ultima ? (ESTADO_LABEL[ultima.estado] || ultima.estado) : "📦 PENDIENTE"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
