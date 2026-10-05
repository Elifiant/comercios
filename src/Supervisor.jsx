 import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import DisenadorRutas from "./DisenadorRutas";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap,
  useMapEvents} from "react-leaflet";
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
  const yaCentroInicial = useRef(false);
  const usuarioMovioMapa = useRef(false);

  useEffect(() => {
    const marcarMovimientoManual = () => {
      usuarioMovioMapa.current = true;
    };
    map.on("dragstart", marcarMovimientoManual);
    map.on("zoomstart", marcarMovimientoManual);
    return () => {
      map.off("dragstart", marcarMovimientoManual);
      map.off("zoomstart", marcarMovimientoManual);
    };
  }, [map]);

  useEffect(() => {
    // Si se eligió expresamente un comercio, sí lo enfocamos.
    if (puntoActivo && puntoActivo[0] && puntoActivo[1]) {
      usuarioMovioMapa.current = false;
      map.flyTo(puntoActivo, 16, { animate: true });
      return;
    }

    // Encuadre automático sólo al entrar/cambiar de recorrido.
    // Las actualizaciones periódicas de GPS ya no pelean con el supervisor.
    if (!yaCentroInicial.current && puntos && puntos.length > 0) {
      const validos = puntos.filter(p => p && p[0] && p[1]);
      if (validos.length > 0) {
        const bounds = L.latLngBounds(validos);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        yaCentroInicial.current = true;
      }
    }
  }, [puntos, puntoActivo, map]);
  return null;
}


function ControlCentradoMapa({ accion, puntoPreventista, puntosRecorrido }) {
  const map = useMap();

  useEffect(() => {
    if (!accion?.id) return;

    if (accion.tipo === "preventista" && puntoPreventista?.[0] && puntoPreventista?.[1]) {
      map.flyTo(puntoPreventista, 16, { animate: true });
      return;
    }

    if (accion.tipo === "recorrido") {
      const validos = (puntosRecorrido || []).filter(p => p && p[0] && p[1] && !isNaN(p[0]) && !isNaN(p[1]));
      if (validos.length > 0) {
        map.fitBounds(L.latLngBounds(validos), { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [accion, puntoPreventista, puntosRecorrido, map]);

  return null;
}

function iconoAutoGPS(nombre) {
  return L.divIcon({
    className: "pin-auto-gps",
    html: '<div style="background:#2563eb; color:#fff; border:2px solid #fff; border-radius:50%; width:38px; height:38px; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 0 16px rgba(37,99,235,0.95); position:relative;"><span style="position:absolute; width:100%; height:100%; border-radius:50%; border:2px solid #38bdf8; animation:ping 1.5s infinite;"></span>🚗</div><div style="background:#0f172a; color:#fff; font-size:10px; font-weight:800; padding:4px 10px; min-width:92px; border-radius:5px; margin-top:2px; white-space:nowrap; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.6); position:relative; left:50%; transform:translateX(-50%); width:max-content;">' + (nombre || "Preventista") + ' (En vivo)</div>',
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
  const validarClienteNuevo = async (comercio) => {
    if (!comercio || !perfilSupervisor?.empresa_id) return;

    const confirmar = window.confirm(
      `✅ ¿Validar como cliente a "${comercio.nombre || "este comercio"}"?`
    );
    if (!confirmar) return;

    try {
      const { data, error } = await supabase
        .from("comercios")
        .update({ estado_alta: "validado" })
        .eq("id", comercio.id)
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .select("id, estado_alta")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("El cliente no fue actualizado en Supabase.");

      setComercios((prev) =>
        (prev || []).map((c) =>
          c.id === comercio.id ? { ...c, estado_alta: "validado" } : c
        )
      );

      alert("✅ Cliente validado correctamente.");
    } catch (error) {
      console.error("Error validando cliente:", error);
      alert("❌ No se pudo validar el cliente: " + (error.message || "Verifique conexión"));
    }
  };

  const [comercios, setComercios] = useState([]);
  const [pedidosReal, setPedidosReal] = useState([]);
  const [cargandoPedidosReal, setCargandoPedidosReal] = useState(false);
  const [pedidosSupervisor, setPedidosSupervisor] = useState([]);
  const [disponibilidadArticulos, setDisponibilidadArticulos] = useState([]);
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);
  const [busquedaDisponibilidad, setBusquedaDisponibilidad] = useState("");
  const [seccionActiva, setSeccionActiva] = useState(() => {
    const seccionUrl = new URLSearchParams(window.location.search).get("seccion");
    const seccionesValidas = ["monitoreo", "planificador", "stock", "disponibilidad", "clientes", "estadoCuenta", "listasPrecios", "solicitudes"];
    return seccionesValidas.includes(seccionUrl) ? seccionUrl : "monitoreo";
  });
  const [cargando, setCargando] = useState(true);
  const [perfiles, setPerfiles] = useState([]);
  const [perfilSupervisor, setPerfilSupervisor] = useState(null);
  const [solicitudesNoVisitar, setSolicitudesNoVisitar] = useState([]);
  const [sesionSupervisor, setSesionSupervisor] = useState(null);
  const [filtroDiaMapa, setFiltroDiaMapa] = useState("TODOS");
  const diaSemana = filtroDiaMapa || "TODOS";
  const [preventistaSeleccionado, setPreventistaSeleccionado] = useState(null);
  const [accionMapa, setAccionMapa] = useState({ tipo: null, id: 0 });
  const [comercioSeleccionado, setComercioSeleccionado] = useState(null);
  const [comercioFoco, setComercioFoco] = useState(null);
  const [comercioDetalleModal, setComercioDetalleModal] = useState(null);
  const [editPrevFicha, setEditPrevFicha] = useState("");
  const [editDiaFicha, setEditDiaFicha] = useState("");
  const [editClienteDatos, setEditClienteDatos] = useState({});
  const [guardandoFicha, setGuardandoFicha] = useState(false);
  const [msgExitoFicha, setMsgExitoFicha] = useState(false);
  const [mostrarAsignacionClientes, setMostrarAsignacionClientes] = useState(false);
  const [clientesSeleccionadosAsignacion, setClientesSeleccionadosAsignacion] = useState([]);
  const [preventistaAsignacion, setPreventistaAsignacion] = useState("");
  const [guardandoAsignacionMasiva, setGuardandoAsignacionMasiva] = useState(false);
  const [filtroEmpresa, setFiltroEmpresa] = useState("TODAS");
  const [secuenciaPersonalizada, setSecuenciaPersonalizada] = useState([]);
  const [busquedaSupervisor, setBusquedaSupervisor] = useState("");
  const [reproduciendoAudio, setReproduciendoAudio] = useState(false);
  const [audioActivoObj, setAudioActivoObj] = useState(null);
  const [datosAbono, setDatosAbono] = useState(null);
  const [visitasHoy, setVisitasHoy] = useState([]);
  const [nviHoyActividad, setNviHoyActividad] = useState([]);
  const [filtroEstadoCuenta, setFiltroEstadoCuenta] = useState("todos");
  const [filtroPreventistaCuenta, setFiltroPreventistaCuenta] = useState("TODOS");
  const [busquedaCuenta, setBusquedaCuenta] = useState("");
  const [modalImportacionCuenta, setModalImportacionCuenta] = useState(false);
  const [modoImportacionCuenta, setModoImportacionCuenta] = useState("parcial");
  const [archivoCuentaNombre, setArchivoCuentaNombre] = useState("");
  const [vistaPreviaCuenta, setVistaPreviaCuenta] = useState(null);
  const [importandoCuenta, setImportandoCuenta] = useState(false);
  const inputArchivoCuentaRef = useRef(null);

  // 📥 Importación masiva de clientes — PASO 1: solo lectura y vista previa
  const [modalImportacionClientes, setModalImportacionClientes] = useState(false);
  const [archivoClientesNombre, setArchivoClientesNombre] = useState("");
  const [vistaPreviaClientes, setVistaPreviaClientes] = useState(null);
  const [archivoClientesTieneEncabezados, setArchivoClientesTieneEncabezados] = useState(true);
  const [mostrarOpcionesArchivoClientes, setMostrarOpcionesArchivoClientes] = useState(false);
  const [probandoGeo, setProbandoGeo] = useState(false);
  const [resultadoGeo, setResultadoGeo] = useState(null);
  const [revisionMapa, setRevisionMapa] = useState(null);
  const [preConfirmacionImportacion, setPreConfirmacionImportacion] = useState(false);
  const [importandoClientes, setImportandoClientes] = useState(false);
  const inputArchivoClientesRef = useRef(null);

  // 📦 Pedidos activos del Supervisor
  // Los pedidos que ya pasaron a Depósito/Historial no deben seguir apareciendo acá.
  const cargarPedidosSupabase = async () => {
    if (!perfilSupervisor?.empresa_id) return;

    try {
      setCargandoPedidosReal(true);

      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizarEstado = (valor) =>
        String(valor || "")
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

      const pedidosActivos = (data || []).filter((pedido) => {
        const estado = normalizarEstado(pedido.estado);
        return ![
          "pasado a deposito",
          "en deposito",
          "deposito",
          "historico",
          "historial",
        ].includes(estado);
      });

      setPedidosReal(pedidosActivos);
    } catch (error) {
      console.error("Error cargando pedidos activos del Supervisor:", error);
    } finally {
      setCargandoPedidosReal(false);
    }
  };

  // 💲 Listas de precios — primera etapa visual, todavía no guarda nada
  const [numeroListaPrecios, setNumeroListaPrecios] = useState("");
  const [vigenciaListaPrecios, setVigenciaListaPrecios] = useState("");
  const [descripcionListaPrecios, setDescripcionListaPrecios] = useState("");
  const [archivoListaPreciosNombre, setArchivoListaPreciosNombre] = useState("");
  const [vistaPreviaListaPrecios, setVistaPreviaListaPrecios] = useState(null);
  const inputArchivoListaPreciosRef = useRef(null);

  // 📦 Stock físico — importación real con equivalencias, variantes y confirmación
  const [archivoStockNombre, setArchivoStockNombre] = useState("");
  const [stockVistaPrevia, setStockVistaPrevia] = useState([]);
  const [stockColumnas, setStockColumnas] = useState({ codigo: "", descripcion: "", color: "", talle: "", stock: "" });
  const [stockEncabezadoFila, setStockEncabezadoFila] = useState(null);
  const [stockMensaje, setStockMensaje] = useState("");
  const [cargandoStockArchivo, setCargandoStockArchivo] = useState(false);
  const [stockReconocidos, setStockReconocidos] = useState([]);
  const [stockNoReconocidos, setStockNoReconocidos] = useState([]);
  const [analizandoStock, setAnalizandoStock] = useState(false);
  const [productosStockCatalogo, setProductosStockCatalogo] = useState([]);
  const [productosNuevosPropuestos, setProductosNuevosPropuestos] = useState([]);
  const [confirmandoImportacionStock, setConfirmandoImportacionStock] = useState(false);
  const [stockActualEmpresa, setStockActualEmpresa] = useState([]);
  const [cargandoStockActual, setCargandoStockActual] = useState(false);
  const [busquedaStockActual, setBusquedaStockActual] = useState("");


  const descargarPlantillaStock = () => {
    try {
      const filas = [
        { codigo: "WELT001", descripcion: "Botín Oxisol", color: "Negro", talle: "40", stock: 5 },
        { codigo: "WELT001", descripcion: "Botín Oxisol", color: "Negro", talle: "41", stock: 8 },
        { codigo: "WELT001", descripcion: "Botín Oxisol", color: "Marrón", talle: "40", stock: 3 },
      ];
      const hoja = XLSX.utils.json_to_sheet(filas, { header: ["codigo", "descripcion", "color", "talle", "stock"] });
      hoja["!cols"] = [{ wch: 16 }, { wch: 38 }, { wch: 18 }, { wch: 12 }, { wch: 12 }];
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Stock");
      XLSX.writeFile(libro, "RutaComercio_Plantilla_Stock.xlsx");
    } catch (error) {
      console.error("Error descargando plantilla de stock:", error);
      alert("❌ No se pudo descargar la plantilla de stock.");
    }
  };

  const normalizarTextoStock = (valor) =>
    String(valor ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const elegirColumnaStock = (encabezados, candidatos) => {
    const normalizados = encabezados.map(h => ({ original: h, normal: normalizarTextoStock(h) }));
    for (const candidato of candidatos) {
      const exacta = normalizados.find(h => h.normal === candidato);
      if (exacta) return exacta.original;
    }
    for (const candidato of candidatos) {
      const parcial = normalizados.find(h => h.normal.includes(candidato));
      if (parcial) return parcial.original;
    }
    return "";
  };

  const cargarCatalogoProductosStock = async () => {
    if (!perfilSupervisor?.empresa_id) return;

    try {
      // Para Stock físico combinamos dos fuentes de ESTA empresa:
      // 1) productos presentes en sus listas activas;
      // 2) productos que ya tienen stock/equivalencias importadas.
      // Así un producto recién creado por una importación aparece aunque todavía
      // no haya sido incorporado a una lista de precios.
      const { data: listasEmpresa, error: errorListas } = await supabase
        .from("listas_precios")
        .select("id")
        .eq("empresa_id", perfilSupervisor.empresa_id);

      if (errorListas) throw errorListas;

      const idsListas = (listasEmpresa || []).map(l => l.id).filter(Boolean);
      let filasLista = [];

      if (idsListas.length > 0) {
        const { data, error } = await supabase
          .from("lista_productos")
          .select("producto_id, codigo_lista")
          .in("lista_id", idsListas)
          .eq("activo", true);

        if (error) throw error;
        filasLista = data || [];
      }

      // stock_informado sí está aislado por empresa_id y contiene los productos
      // creados/reconocidos por las importaciones de stock.
      const { data: filasStockEmpresa, error: errorStockEmpresa } = await supabase
        .from("stock_informado")
        .select("producto_id")
        .eq("empresa_id", perfilSupervisor.empresa_id);

      if (errorStockEmpresa) throw errorStockEmpresa;

      const idsProductos = [...new Set([
        ...(filasLista || []).map(x => x.producto_id),
        ...(filasStockEmpresa || []).map(x => x.producto_id),
      ].filter(Boolean))];

      if (idsProductos.length === 0) {
        setProductosStockCatalogo([]);
        return;
      }

      const { data: productosEmpresa, error: errorProductos } = await supabase
        .from("productos")
        .select("id, codigo_cge, nombre, marca, presentacion, descripcion, activo, usa_color, usa_talle")
        .in("id", idsProductos)
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (errorProductos) throw errorProductos;

      const codigosListaPorProducto = {};
      (filasLista || []).forEach(f => {
        const pid = String(f.producto_id || "");
        const codigo = String(f.codigo_lista || "").trim();
        if (pid && codigo && !codigosListaPorProducto[pid]) {
          codigosListaPorProducto[pid] = codigo;
        }
      });

      setProductosStockCatalogo(
        (productosEmpresa || []).map(p => ({
          ...p,
          codigo_lista: codigosListaPorProducto[String(p.id)] || "",
        }))
      );
    } catch (error) {
      console.error("Error cargando catálogo de stock de la empresa:", error);
      setProductosStockCatalogo([]);
    }
  };

  const cargarStockActualEmpresa = async () => {
    if (!perfilSupervisor?.empresa_id) return;
    try {
      setCargandoStockActual(true);
      const { data, error } = await supabase
        .from("stock_informado")
        .select("id,empresa_id,importacion_id,producto_id,codigo_archivo,descripcion_archivo,stock_informado,fecha_actualizacion,color,talle")
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .order("fecha_actualizacion", { ascending: false })
        .order("id", { ascending: false });
      if (error) throw error;

      // stock_informado conserva historial. Para mostrar el inventario actual,
      // dejamos solo la fila más reciente de cada producto + color + talle.
      const ultimos = new Map();
      (data || []).forEach((fila) => {
        const clave = [
          String(fila.producto_id || ""),
          String(fila.color || "").trim().toLowerCase(),
          String(fila.talle || "").trim().toLowerCase(),
        ].join("|");
        if (!ultimos.has(clave)) ultimos.set(clave, fila);
      });

      const filasActuales = [...ultimos.values()];

      // Enriquecer cada fila de stock con su producto real. De esta manera la
      // visualización NO depende de que el producto esté o no en una lista de precios.
      const idsConStock = [...new Set(filasActuales.map(f => f.producto_id).filter(Boolean))];
      let productosPorId = new Map();
      if (idsConStock.length > 0) {
        const { data: productosStock, error: errorProductosStock } = await supabase
          .from("productos")
          .select("id,codigo_cge,nombre,descripcion,marca,presentacion,activo,usa_color,usa_talle")
          .in("id", idsConStock);
        if (errorProductosStock) throw errorProductosStock;
        productosPorId = new Map((productosStock || []).map(p => [String(p.id), p]));
      }

      setStockActualEmpresa(
        filasActuales.map(fila => ({
          ...fila,
          __producto: productosPorId.get(String(fila.producto_id || "")) || null,
        }))
      );
    } catch (error) {
      console.error("Error cargando stock actual de la empresa:", error);
      setStockActualEmpresa([]);
    } finally {
      setCargandoStockActual(false);
    }
  };

  useEffect(() => {
    if (!perfilSupervisor?.empresa_id) return;
    cargarCatalogoProductosStock();
    cargarStockActualEmpresa();
    const timerStockActual = setInterval(cargarStockActualEmpresa, 5000);
    return () => clearInterval(timerStockActual);
  }, [perfilSupervisor?.empresa_id]);

  const textoProductoStock = (p) => {
    if (!p) return "";
    const codigo = p.codigo_cge || p.cge || p.codigo || "";
    const nombre = p.nombre || p.descripcion || p.producto || "Producto";
    const marca = p.marca || "";
    const presentacion = p.presentacion || "";
    return [codigo, nombre, marca, presentacion].filter(Boolean).join(" · ");
  };

  const analizarProductosStock = async (filas, columnas) => {
    if (!perfilSupervisor?.empresa_id) throw new Error("No se pudo identificar la empresa del Supervisor.");

    setAnalizandoStock(true);
    setStockReconocidos([]);
    setStockNoReconocidos([]);

    try {
      const { data: equivalencias, error: errorEquivalencias } = await supabase
        .from("stock_equivalencias")
        .select("codigo_archivo, producto_id, descripcion_archivo")
        .eq("empresa_id", perfilSupervisor?.empresa_id);

      if (errorEquivalencias) throw errorEquivalencias;

      const idsProductos = [...new Set((equivalencias || []).map(e => e.producto_id).filter(Boolean))];
      let productosPorId = {};

      if (idsProductos.length > 0) {
        const { data: productos, error: errorProductos } = await supabase
          .from("productos")
          .select("id, codigo_cge, nombre, marca, presentacion")
          .in("id", idsProductos);

        if (errorProductos) throw errorProductos;
        (productos || []).forEach(p => {
          productosPorId[String(p.id)] = p;
        });
      }

      const equivalenciaPorCodigo = {};
      (equivalencias || []).forEach(e => {
        const codigoEq = String(e.codigo_archivo ?? "").trim();
        if (!codigoEq) return;
        equivalenciaPorCodigo[codigoEq] = e;
        equivalenciaPorCodigo[codigoEq.toUpperCase()] = e;
        equivalenciaPorCodigo[codigoEq.toLowerCase()] = e;
      });

      // Códigos comerciales históricos de las listas de ESTA empresa.
      // Esto permite que Stock reconozca WELT001, DEM001, etc.
      // aunque nunca hayan sido importados anteriormente por Stock.
      const { data: listasActivasStock, error: errorListasActivasStock } = await supabase
        .from("listas_precios")
        .select("id")
        .eq("empresa_id", perfilSupervisor.empresa_id);

      if (errorListasActivasStock) throw errorListasActivasStock;

      const idsListasActivasStock = (listasActivasStock || [])
        .map(l => l.id)
        .filter(Boolean);

      let productosPorCodigoLista = {};

      if (idsListasActivasStock.length > 0) {
        const { data: filasListaStock, error: errorFilasListaStock } = await supabase
          .from("lista_productos")
          .select("producto_id, codigo_lista")
          .in("lista_id", idsListasActivasStock)
          .eq("activo", true);

        if (errorFilasListaStock) throw errorFilasListaStock;

        const idsDesdeLista = [...new Set(
          (filasListaStock || [])
            .map(f => f.producto_id)
            .filter(Boolean)
        )];

        let productosDesdeListaPorId = {};

        if (idsDesdeLista.length > 0) {
          const { data: productosDesdeLista, error: errorProductosDesdeLista } = await supabase
            .from("productos")
            .select("id, codigo_cge, nombre, marca, presentacion")
            .in("id", idsDesdeLista);

          if (errorProductosDesdeLista) throw errorProductosDesdeLista;

          (productosDesdeLista || []).forEach(p => {
            productosDesdeListaPorId[String(p.id)] = p;
          });
        }

        (filasListaStock || []).forEach(f => {
          const codigo = String(f.codigo_lista || "").trim().toUpperCase();
          const producto = productosDesdeListaPorId[String(f.producto_id)];

          if (codigo && producto) {
            productosPorCodigoLista[codigo] = producto;
          }
        });
      }

      // Tercera fuente segura: si el código ya tuvo stock informado en ESTA empresa,
      // reutilizamos su producto_id. Esto evita proponer un producto nuevo cuando
      // falta una fila en stock_equivalencias pero el vínculo ya existe en el historial.
      const { data: stockPrevioEmpresa, error: errorStockPrevioEmpresa } = await supabase
        .from("stock_informado")
        .select("codigo_archivo, producto_id")
        .eq("empresa_id", perfilSupervisor.empresa_id);

      if (errorStockPrevioEmpresa) throw errorStockPrevioEmpresa;

      const productoIdPorCodigoStockPrevio = {};
      (stockPrevioEmpresa || []).forEach(f => {
        const codigo = String(f.codigo_archivo || "").trim().toUpperCase();
        if (codigo && f.producto_id && !productoIdPorCodigoStockPrevio[codigo]) {
          productoIdPorCodigoStockPrevio[codigo] = f.producto_id;
        }
      });

      const idsStockPrevio = [...new Set(Object.values(productoIdPorCodigoStockPrevio).filter(Boolean))];
      let productosStockPrevioPorId = {};

      if (idsStockPrevio.length > 0) {
        const { data: productosStockPrevio, error: errorProductosStockPrevio } = await supabase
          .from("productos")
          .select("id, codigo_cge, nombre, marca, presentacion")
          .in("id", idsStockPrevio);

        if (errorProductosStockPrevio) throw errorProductosStockPrevio;
        (productosStockPrevio || []).forEach(p => {
          productosStockPrevioPorId[String(p.id)] = p;
        });
      }

      const reconocidos = [];
      const noReconocidos = [];

      filas.forEach(fila => {
        const codigoArchivo = columnas.codigo ? String(fila[columnas.codigo] ?? "").trim() : "";
        const descripcionArchivo = columnas.descripcion ? String(fila[columnas.descripcion] ?? "").trim() : "";
        const color = columnas.color ? String(fila[columnas.color] ?? "").trim() : "";
        const talle = columnas.talle ? String(fila[columnas.talle] ?? "").trim() : "";
        const stockOriginal = columnas.stock ? fila[columnas.stock] : "";
        const stockTexto = String(stockOriginal ?? "").trim();
        const stockLimpio = stockTexto
          .replace(/\s/g, "")
          .replace(/\.(?=\d{3}(?:\D|$))/g, "")
          .replace(",", ".");
        const stockNumero = stockTexto === "" ? NaN : Number(stockLimpio);

        const base = {
          fila: fila.__fila,
          codigoArchivo,
          descripcionArchivo,
          color,
          talle,
          stock: Number.isFinite(stockNumero) ? stockNumero : null,
        };

        // La equivalencia ya está aislada por empresa_id y productosPorCodigoLista
        // se construyó exclusivamente desde listas de ESTA empresa.
        // Por eso no dependemos del estado React productosStockCatalogo para validar:
        // ese estado puede todavía estar cargándose cuando el Supervisor elige el Excel.
        const equivalencia = equivalenciaPorCodigo[String(codigoArchivo || "").trim()] ||
          equivalenciaPorCodigo[String(codigoArchivo || "").trim().toUpperCase()] ||
          equivalenciaPorCodigo[String(codigoArchivo || "").trim().toLowerCase()];

        let producto = equivalencia ? productosPorId[String(equivalencia.producto_id)] : null;

        // Segunda vía: código comercial de la lista de precios de la empresa.
        if (!producto && codigoArchivo) {
          producto = productosPorCodigoLista[codigoArchivo.toUpperCase()] || null;
        }

        // Tercera vía: historial real de stock de ESTA empresa.
        // WELT001, por ejemplo, ya tiene producto_id porque ya tuvo stock cargado.
        if (!producto && codigoArchivo) {
          const productoIdPrevio = productoIdPorCodigoStockPrevio[codigoArchivo.toUpperCase()];
          producto = productoIdPrevio
            ? productosStockPrevioPorId[String(productoIdPrevio)] || null
            : null;
        }

        // Si nunca fue importado por Stock, también reconocer el código usado
        // en las listas de precios de ESTA empresa (ej. WELT001).
        if (!producto) {
          const codigoBuscado = codigoArchivo.toUpperCase();
          producto = productosStockCatalogo.find(p =>
            String(p.codigo_lista || "").trim().toUpperCase() === codigoBuscado ||
            String(p.codigo_cge || "").trim().toUpperCase() === codigoBuscado
          ) || null;
        }

        // Si llegamos a un producto por cualquiera de las vías anteriores, ya quedó
        // validado dentro de la empresa. Evitamos rechazarlo por una carga asíncrona
        // todavía incompleta de productosStockCatalogo.
        const productoPermitido = Boolean(producto?.id);

        if (productoPermitido) {
          reconocidos.push({
            ...base,
            producto_id: producto.id,
            codigo_cge: producto.codigo_cge || "",
            producto_nombre: producto.nombre || "",
            marca: producto.marca || "",
            presentacion: producto.presentacion || "",
          });
        } else {
          noReconocidos.push(base);
        }
      });

      setStockReconocidos(reconocidos);
      setStockNoReconocidos(noReconocidos);

      // Los no reconocidos se muestran como PROPUESTAS de producto nuevo.
      // No se crea nada todavía y NO se consume ningún CGE.
      setProductosNuevosPropuestos(
        noReconocidos.map(item => ({
          codigo_archivo: item.codigoArchivo,
          nombre: item.descripcionArchivo,
          color: item.color || "",
          talle: item.talle || "",
          stock: item.stock,
          crear: true,
        }))
      );

      return { reconocidos, noReconocidos };
    } finally {
      setAnalizandoStock(false);
    }
  };

  const cargarArchivoStock = async (event) => {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;

    setCargandoStockArchivo(true);
    setStockMensaje("");
    setStockVistaPrevia([]);
    setStockReconocidos([]);
    setStockNoReconocidos([]);
    setProductosNuevosPropuestos([]);
    setArchivoStockNombre(archivo.name);

    try {
      const buffer = await archivo.arrayBuffer();
      // IMPORTANTE: raw:true toma el valor REAL guardado en la celda.
      // Así ignoramos formatos visuales de Excel (moneda, región, "$", etc.)
      // que pueden hacer que un stock numérico termine leído como texto.
      const libro = XLSX.read(buffer, { type: "array", cellNF: false, cellText: false });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const matriz = XLSX.utils.sheet_to_json(hoja, {
        header: 1,
        defval: "",
        raw: true,
      });

      const filasNoVacias = matriz
        .map((fila, indice) => ({ fila, indice }))
        .filter(x => (x.fila || []).some(celda => String(celda ?? "").trim() !== ""));

      if (filasNoVacias.length === 0) throw new Error("La planilla está vacía.");

      const palabrasClave = ["codigo", "código", "articulo", "artículo", "descripcion", "descripción", "stock", "existencia", "cantidad"];
      let encabezado = filasNoVacias[0];

      for (const candidata of filasNoVacias.slice(0, 20)) {
        const textoFila = (candidata.fila || []).map(normalizarTextoStock);
        const coincidencias = palabrasClave.filter(p => textoFila.some(c => c.includes(normalizarTextoStock(p)))).length;
        if (coincidencias >= 2) {
          encabezado = candidata;
          break;
        }
      }

      const encabezados = (encabezado.fila || []).map((v, i) => String(v ?? "").trim() || `Columna ${i + 1}`);
      const codigo =
        elegirColumnaStock(encabezados, ["codigo producto", "código producto"]) ||
        elegirColumnaStock(encabezados, ["codigo", "cod", "sku", "id"]);
      const descripcion = elegirColumnaStock(encabezados, ["articulo", "producto", "descripcion", "nombre"]);
      const color = elegirColumnaStock(encabezados, ["color", "colour"]);
      const talle = elegirColumnaStock(encabezados, ["talle", "talla", "size"]);
      const stock = elegirColumnaStock(encabezados, ["stock fisico", "stock físico", "stock", "existencia", "existencias", "cantidad", "saldo"]);

      setStockColumnas({ codigo, descripcion, color, talle, stock });
      setStockEncabezadoFila(encabezado.indice + 1);

      const datos = matriz.slice(encabezado.indice + 1)
        .filter(fila => (fila || []).some(celda => String(celda ?? "").trim() !== ""))
        .map((fila, idx) => {
          const obj = {};
          encabezados.forEach((h, colIdx) => { obj[h] = fila?.[colIdx] ?? ""; });
          return { __fila: encabezado.indice + 2 + idx, ...obj };
        });

      const datosConStock = stock
        ? datos.filter(fila => String(fila[stock] ?? "").trim() !== "")
        : datos;

      setStockVistaPrevia(datosConStock);

      if (!codigo || !stock) {
        setStockMensaje("⚠️ La planilla se leyó, pero no pude detectar automáticamente Código y Stock. Todavía NO se modificó el stock.");
      } else {
        const resultado = await analizarProductosStock(datosConStock, { codigo, descripcion, color, talle, stock });
        setStockMensaje(
          `✓ Planilla leída. ${resultado.reconocidos.length} reconocidos · ${resultado.noReconocidos.length} sin reconocer. Todavía NO se modificó el stock.`
        );
      }
    } catch (error) {
      console.error("Error leyendo planilla de stock:", error);
      setStockMensaje("❌ No se pudo leer la planilla: " + (error.message || "Error desconocido"));
    } finally {
      setCargandoStockArchivo(false);
    }
  };


  const confirmarImportacionStock = async () => {
    if (!archivoStockNombre || confirmandoImportacionStock) return;

    const nuevosSeleccionados = productosNuevosPropuestos.filter(p => p.crear);
    const totalAProcesar = stockReconocidos.length + nuevosSeleccionados.length;

    if (totalAProcesar === 0) {
      alert("No hay productos seleccionados para importar.");
      return;
    }

    const invalidos = [
      ...stockReconocidos.map(p => ({ codigo: p.codigoArchivo, stock: p.stock })),
      ...nuevosSeleccionados.map(p => ({ codigo: p.codigo_archivo, stock: p.stock })),
    ].filter(p => p.stock === null || !Number.isFinite(Number(p.stock)) || Number(p.stock) < 0);

    if (invalidos.length > 0) {
      alert(`Hay ${invalidos.length} producto(s) con stock inválido. Corregí la planilla antes de confirmar.`);
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmás la importación de stock?\n\n` +
      `Archivo: ${archivoStockNombre}\n` +
      `Productos ya reconocidos: ${stockReconocidos.length}\n` +
      `Productos nuevos a crear: ${nuevosSeleccionados.length}\n` +
      `Total a procesar: ${totalAProcesar}\n\n` +
      `Los productos nuevos recibirán un CGE y el stock físico quedará actualizado con las cantidades de esta planilla.`
    );
    if (!confirmar) return;

    const productosParaImportar = [
      ...stockReconocidos.map(item => ({
        codigo_archivo: item.codigoArchivo,
        producto_id: item.producto_id || null,
        descripcion: item.descripcionArchivo || item.producto_nombre || "",
        color: item.color || null,
        talle: item.talle || null,
        stock: Number(item.stock),
        crear: false,
      })),
      ...nuevosSeleccionados.map(item => ({
        codigo_archivo: item.codigo_archivo,
        descripcion: item.nombre || "",
        color: item.color || null,
        talle: item.talle || null,
        stock: Number(item.stock),
        crear: true,
      })),
    ];

    try {
      setConfirmandoImportacionStock(true);
      setStockMensaje("⏳ Confirmando importación y guardando stock...");

      const { data, error } = await supabase.rpc("confirmar_importacion_stock", {
        p_nombre_archivo: archivoStockNombre,
        p_productos: productosParaImportar,
      });

      if (error) throw error;
      if (!data?.ok) throw new Error("El sistema no confirmó la importación.");

      setStockMensaje(
        `✅ Importación confirmada. ${Number(data.total_procesado || 0)} productos procesados · ` +
        `${Number(data.productos_creados || 0)} nuevos creados · stock actualizado correctamente.`
      );

      setStockVistaPrevia([]);
      setStockReconocidos([]);
      setStockNoReconocidos([]);
      setProductosNuevosPropuestos([]);
      setStockColumnas({ codigo: "", descripcion: "", color: "", talle: "", stock: "" });
      setStockEncabezadoFila(null);
      setArchivoStockNombre("");

      await cargarCatalogoProductosStock();
      await cargarStockActualEmpresa();

      alert(
        `✅ IMPORTACIÓN COMPLETADA\n\n` +
        `Productos procesados: ${Number(data.total_procesado || 0)}\n` +
        `Productos nuevos creados: ${Number(data.productos_creados || 0)}\n` +
        `Stock actualizado: ${Number(data.stock_actualizado || 0)}`
      );
    } catch (error) {
      console.error("Error confirmando importación de stock:", error);
      setStockMensaje("❌ No se pudo confirmar la importación: " + (error.message || "Error desconocido"));
      alert("❌ No se guardó la importación. " + (error.message || "Error desconocido"));
    } finally {
      setConfirmandoImportacionStock(false);
    }
  };


  useEffect(() => {
    if (perfilSupervisor?.empresa_id) cargarCatalogoProductosStock();
  }, [perfilSupervisor?.empresa_id]);

  const [listasPreciosEmpresa, setListasPreciosEmpresa] = useState([]);
  const [listaPreciosSeleccionadaId, setListaPreciosSeleccionadaId] = useState("");
  const [cargandoListasPrecios, setCargandoListasPrecios] = useState(false);
  const [comparacionListaPrecios, setComparacionListaPrecios] = useState(null);
  const [comparandoListaPrecios, setComparandoListaPrecios] = useState(false);
  const [preConfirmacionListaPrecios, setPreConfirmacionListaPrecios] = useState(false);
  const [confirmacionFinalListaPrecios, setConfirmacionFinalListaPrecios] = useState(false);
  const [decisionAusentesListaPrecios, setDecisionAusentesListaPrecios] = useState({});
  const [actualizandoListaPrecios, setActualizandoListaPrecios] = useState(false);





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
          .select("id, nombre, email, empresa, empresa_id, rol, activo, latitud, longitud, ultima_posicion_at, ultima_conexion, activo_hoy")
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
    // 📦 Disponibilidad operativa: productos pedidos hoy + estado manual del supervisor
  const cargarDisponibilidadArticulos = async () => {
    if (!perfilSupervisor?.empresa_id) return;
    setCargandoDisponibilidad(true);
    try {
      const inicioHoy = new Date();
      inicioHoy.setHours(0, 0, 0, 0);
      const inicioManana = new Date(inicioHoy);
      inicioManana.setDate(inicioManana.getDate() + 1);

      const { data: productos, error: errorProductos } = await supabase
        .from("productos")
        .select("id, codigo_cge, nombre, marca, activo")
        .neq("activo", false)
        .order("nombre", { ascending: true });
      if (errorProductos) throw errorProductos;

      const { data: pedidosHoy, error: errorPedidos } = await supabase
        .from("pedidos")
        .select("id")
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .gte("created_at", inicioHoy.toISOString())
        .lt("created_at", inicioManana.toISOString());
      if (errorPedidos) throw errorPedidos;

      const idsPedidos = (pedidosHoy || []).map(p => p.id).filter(Boolean);
      let cantidades = new Map();
      if (idsPedidos.length > 0) {
        const { data: items, error: errorItems } = await supabase
          .from("pedido_items")
          .select("producto_id, cantidad")
          .in("pedido_id", idsPedidos);
        if (errorItems) throw errorItems;
        (items || []).forEach(it => {
          const k = String(it.producto_id);
          cantidades.set(k, (cantidades.get(k) || 0) + Number(it.cantidad || 0));
        });
      }

      const { data: estados, error: errorEstados } = await supabase
        .from("productos_disponibilidad")
        .select("producto_id, estado, observacion, actualizado_at")
        .eq("empresa_id", perfilSupervisor.empresa_id);
      if (errorEstados) throw errorEstados;
      const estadosPorProducto = new Map((estados || []).map(e => [String(e.producto_id), e]));

      setDisponibilidadArticulos((productos || []).map(p => {
        const e = estadosPorProducto.get(String(p.id));
        return {
          ...p,
          pedidosHoy: cantidades.get(String(p.id)) || 0,
          estado: e?.estado || "disponible",
          observacion: e?.observacion || "",
          actualizado_at: e?.actualizado_at || null,
        };
      }));
    } catch (err) {
      console.error("Error cargando disponibilidad operativa:", err);
      alert("❌ No se pudo cargar Disponibilidad: " + (err.message || "Error desconocido"));
    } finally {
      setCargandoDisponibilidad(false);
    }
  };

  const cambiarEstadoDisponibilidad = async (producto, nuevoEstado) => {
    if (!perfilSupervisor?.empresa_id || !producto?.id) return;
    const anterior = disponibilidadArticulos;
    setDisponibilidadArticulos(prev => prev.map(p =>
      String(p.id) === String(producto.id) ? { ...p, estado: nuevoEstado } : p
    ));
    try {
      const { error } = await supabase
        .from("productos_disponibilidad")
        .upsert({
          empresa_id: perfilSupervisor.empresa_id,
          producto_id: producto.id,
          estado: nuevoEstado,
          actualizado_at: new Date().toISOString(),
          actualizado_por: sesionSupervisor?.user?.id || perfilSupervisor?.id || null,
        }, { onConflict: "empresa_id,producto_id" });
      if (error) throw error;
    } catch (err) {
      setDisponibilidadArticulos(anterior);
      alert("❌ No se pudo cambiar el estado: " + (err.message || "Error desconocido"));
    }
  };

  useEffect(() => {
    if (seccionActiva === "disponibilidad" && perfilSupervisor?.empresa_id) {
      cargarDisponibilidadArticulos();
    }
  }, [seccionActiva, perfilSupervisor?.empresa_id]);

    // 🔄 Mantener actualizada la actividad de los preventistas
useEffect(() => {
  if (!perfilSupervisor?.empresa_id) return;

  const actualizarPerfiles = async () => {
    
    const { data, error } = await supabase
      .from("perfiles")
      .select(
        "id, nombre, email, empresa, empresa_id, rol, activo, latitud, longitud, ultima_posicion_at, ultima_conexion, activo_hoy"
      )
      .eq("empresa_id", perfilSupervisor.empresa_id);

    if (error) {
      console.error("Error actualizando actividad de preventistas:", error);
      return;
    }

    setPerfiles(data || []);
  };

  actualizarPerfiles();

  const timer = setInterval(actualizarPerfiles, 5000);

  return () => clearInterval(timer);
}, [perfilSupervisor?.empresa_id]);

// 🏪 Mantener comercios/capturas sincronizados con Supabase.
// Esto hace que altas, ediciones y eliminaciones hechas por el preventista
// aparezcan en el Supervisor sin tener que refrescar la página.
useEffect(() => {
  if (!perfilSupervisor?.empresa_id) return;

  let cancelado = false;

  const actualizarComercios = async () => {
    const { data, error } = await supabase
      .from("comercios")
      .select("*")
      .eq("empresa_id", perfilSupervisor.empresa_id)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error actualizando comercios/capturas:", error);
      return;
    }

    if (!cancelado) setComercios(data || []);
  };

  // Sincroniza inmediatamente al entrar/cambiar de empresa.
  actualizarComercios();

  // Refuerzo confiable para Safari/iPhone y para eliminaciones hechas desde otro equipo.
  const timerComercios = setInterval(actualizarComercios, 3000);

  // Al volver a la pestaña, sincroniza en el acto sin esperar al próximo intervalo.
  const alVolverALaPantalla = () => {
    if (document.visibilityState === "visible") actualizarComercios();
  };
  document.addEventListener("visibilitychange", alVolverALaPantalla);

  return () => {
    cancelado = true;
    clearInterval(timerComercios);
    document.removeEventListener("visibilitychange", alVolverALaPantalla);
  };
}, [perfilSupervisor?.empresa_id]);

  // 📦 Mantener pedidos activos sincronizados sin refrescar la pantalla
  useEffect(() => {
    if (!perfilSupervisor?.empresa_id) return;

    cargarPedidosSupabase();
    const timerPedidos = setInterval(cargarPedidosSupabase, 10000);
    return () => clearInterval(timerPedidos);
  }, [perfilSupervisor?.empresa_id]);

  // 📍 Cargar visitas reales de hoy y mantenerlas actualizadas
  useEffect(() => {
    if (!perfilSupervisor?.empresa_id) return;

    const cargarVisitasHoy = async () => {
      const inicioHoy = new Date();
      inicioHoy.setHours(0, 0, 0, 0);
      const inicioManana = new Date(inicioHoy);
      inicioManana.setDate(inicioManana.getDate() + 1);

      const { data, error } = await supabase
        .from("visitas")
        .select("*")
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .gte("fecha", inicioHoy.toISOString())
        .lt("fecha", inicioManana.toISOString())
        .order("fecha", { ascending: false });

      if (error) {
        console.error("Error cargando visitas de hoy:", error);
        return;
      }
      setVisitasHoy(data || []);
    };

    cargarVisitasHoy();
    const timer = setInterval(cargarVisitasHoy, 15000);
    return () => clearInterval(timer);
  }, [perfilSupervisor?.empresa_id]);

  // 🧾 NVI de hoy para la cronología del Supervisor.
  // Incluye activas + Historial/Depósito: una venta no deja de existir por cambiar de etapa.
  useEffect(() => {
    if (!perfilSupervisor?.empresa_id) return;

    const cargarNviHoyActividad = async () => {
      const inicioHoy = new Date();
      inicioHoy.setHours(0, 0, 0, 0);
      const inicioManana = new Date(inicioHoy);
      inicioManana.setDate(inicioManana.getDate() + 1);

      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .gte("created_at", inicioHoy.toISOString())
        .lt("created_at", inicioManana.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando NVI de hoy para actividad:", error);
        return;
      }
      setNviHoyActividad(data || []);
    };

    cargarNviHoyActividad();
    const timerNviActividad = setInterval(cargarNviHoyActividad, 10000);
    return () => clearInterval(timerNviActividad);
  }, [perfilSupervisor?.empresa_id]);

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

  // Excepciones operativas del día actual: conserva la ruta habitual,
  // pero identifica las visitas que hoy deben omitirse.
  const fechaHoySupervisor = (() => {
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = String(ahora.getMonth() + 1).padStart(2, "0");
    const d = String(ahora.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();

  const diaHoySupervisor = new Date()
    .toLocaleDateString("es-AR", { weekday: "long" })
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const viendoHoyEnPlanificador =
    seccionActiva === "planificador" &&
    String(diaActivo || "").toUpperCase().trim() === diaHoySupervisor;

  const comerciosOmitidosHoy = viendoHoyEnPlanificador
    ? comerciosFiltradosPorDia.filter(
        (com) => com.omitir_visita_fecha === fechaHoySupervisor
      )
    : [];

  const comerciosEfectivosHoy = viendoHoyEnPlanificador
    ? comerciosFiltradosPorDia.filter(
        (com) =>
          com.no_visitar !== true &&
          com.omitir_visita_fecha !== fechaHoySupervisor
      )
    : comerciosFiltradosPorDia;

  const comerciosVisibles = ordenarPorSecuenciaGuardada(
    (comerciosEfectivosHoy || []).filter(com => {
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

  // En Monitoreo, los números del mapa representan el orden REAL de captura:
  // 1 = primera captura, 2 = segunda, etc.
  // El planificador conserva su orden manual de visitas.
  const listaParaMapa = (seccionActiva === "planificador" && secuenciaPersonalizada.length > 0)
    ? secuenciaPersonalizada
    : [...comerciosVisibles].sort((a, b) => {
        const idA = Number(a.id);
        const idB = Number(b.id);
        if (Number.isFinite(idA) && Number.isFinite(idB)) return idA - idB;
        const fechaA = new Date(a.created_at || a.fecha || 0).getTime();
        const fechaB = new Date(b.created_at || b.fecha || 0).getTime();
        return fechaA - fechaB;
      });

  const coordenadasValidas = listaParaMapa
    .map(c => [c.ubicacion_exacta_latitud || c.latitud, c.ubicacion_exacta_longitud || c.longitud])
    .filter(p => p[0] && p[1] && !isNaN(p[0]) && !isNaN(p[1]));

  const centroMapa = coordenadasValidas[0] || [-34.719, -58.264];

  // Posición GPS actual del preventista seleccionado para los controles del mapa
  const targetMapaNom = String(preventistaSeleccionado?.nombre || preventistaSeleccionado || "").toLowerCase().trim();
  const perfilMapaVivo = (perfiles || []).find(p => {
    const n = String(p.nombre || p.email || "").toLowerCase().trim();
    return targetMapaNom && (n === targetMapaNom || n.includes(targetMapaNom) || targetMapaNom.includes(n));
  });
  const latMapaVivo = parseFloat(perfilMapaVivo?.latitud);
  const lngMapaVivo = parseFloat(perfilMapaVivo?.longitud);
  const puntoPreventistaMapa = latMapaVivo && lngMapaVivo && !isNaN(latMapaVivo) && !isNaN(lngMapaVivo)
    ? [latMapaVivo, lngMapaVivo]
    : null;
  const rutaRecorrida = coordenadasValidas.slice(0, Math.ceil(coordenadasValidas.length * 0.65));
  const rutaRestante = coordenadasValidas.slice(Math.max(0, Math.ceil(coordenadasValidas.length * 0.65) - 1));

  const textoUltimaSenal = (fecha) => {
    if (!fecha) return "Sin señal registrada";
    const minutos = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 60000));
    if (minutos < 1) return "Última señal: ahora";
    if (minutos < 60) return `Última señal: hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas < 24) return `Última señal: hace ${horas} h${resto ? ` ${resto} min` : ""}`;
    const dias = Math.floor(horas / 24);
    return `Última señal: hace ${dias} día${dias === 1 ? "" : "s"}`;
  };

  // Telemetría de flota basada en actividad REAL del preventista
  const hoyStr = new Date().toISOString().slice(0, 10);
  const normalizarNombrePrev = (v) => String(v || "").trim().toLowerCase();
  const telemetriaFlota = listaPreventistas.map((prev, idx) => {
    const nombrePrev = normalizarNombrePrev(prev);
    const perfilPrev = (perfiles || []).find(p => {
      const n = normalizarNombrePrev(p.nombre || p.email);
      return n === nombrePrev || n.includes(nombrePrev) || nombrePrev.includes(n);
    });
    const cPrev = comercios.filter(c => normalizarNombrePrev(c.preventista) === nombrePrev);
    const visitasPrevHoy = (visitasHoy || []).filter(v => {
      const n = normalizarNombrePrev(v.preventista);
      return n === nombrePrev || n.includes(nombrePrev) || nombrePrev.includes(n);
    });

    const nvisPrevHoy = (nviHoyActividad || []).filter(p => {
      const n = normalizarNombrePrev(p.preventista);
      return n === nombrePrev || n.includes(nombrePrev) || nombrePrev.includes(n);
    });
    const vendidoHoy = nvisPrevHoy.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const efectividadHoy = visitasPrevHoy.length > 0
      ? Math.round((nvisPrevHoy.length / visitasPrevHoy.length) * 100)
      : 0;

    // Usar siempre la señal MÁS RECIENTE disponible.
    // Una ultima_conexion antigua nunca debe tapar una posicion GPS nueva.
    const fechasSenal = [perfilPrev?.ultima_posicion_at, perfilPrev?.ultima_conexion]
      .filter(Boolean)
      .map((fecha) => new Date(fecha))
      .filter((fecha) => !Number.isNaN(fecha.getTime()));
    const ultimaSenal = fechasSenal.length
      ? new Date(Math.max(...fechasSenal.map((fecha) => fecha.getTime()))).toISOString()
      : null;
    const minutosDesdeSenal = ultimaSenal ? (Date.now() - new Date(ultimaSenal).getTime()) / 60000 : Infinity;
    // En línea si el celular reportó actividad en los últimos 60 minutos.
    // Las visitas de hoy se muestran aparte, pero no mantienen al preventista "en línea".
    const activoHoy = minutosDesdeSenal <= 2;
    const señalReciente = minutosDesdeSenal <= 10;

    return {
      nombre: prev,
      rutaId: "Ruta #" + (idx + 1 < 10 ? "0" + (idx + 1) : idx + 1),
      zona: "Zona Comercial",
      estado: activoHoy ? "En Ruta (Activo)" : "En Base (Standby)",
      paradasTotales: cPrev.length,
      paradasHoy: visitasPrevHoy.length,
      nviHoy: nvisPrevHoy.length,
      vendidoHoy,
      efectividadHoy,
      activoHoy,
      señalReciente,
      ultimaSenal,
      proxima: cPrev[0]?.nombre || "Sin comercios asignados"
    };
  });

  const visitasPreventistaSeleccionado = (visitasHoy || []).filter(v => {
    const target = normalizarNombrePrev(preventistaSeleccionado?.nombre || preventistaSeleccionado);
    const nombre = normalizarNombrePrev(v.preventista);
    return target && (nombre === target || nombre.includes(target) || target.includes(nombre));
  });

  // 🕐 Actividad de hoy del preventista seleccionado:
  // capturas de nuevos comercios + visitas + NVI, ordenadas por hora.
  const actividadHoyPreventista = (() => {
    const target = normalizarNombrePrev(preventistaSeleccionado?.nombre || preventistaSeleccionado);
    if (!target) return [];

    const coincidePreventista = (valor) => {
      const nombre = normalizarNombrePrev(valor);
      return nombre && (nombre === target || nombre.includes(target) || target.includes(nombre));
    };

    const esHoy = (valorFecha) => {
      if (!valorFecha) return false;
      const f = new Date(valorFecha);
      if (Number.isNaN(f.getTime())) return false;
      const h = new Date();
      return f.getFullYear() === h.getFullYear() &&
        f.getMonth() === h.getMonth() &&
        f.getDate() === h.getDate();
    };

    const capturas = (comercios || [])
      .filter(c => coincidePreventista(c.preventista) && esHoy(c.created_at || c.fecha_registro || c.fecha))
      .map(c => ({
        id: `captura-${c.id}`,
        tipo: "captura",
        fecha: c.created_at || c.fecha_registro || c.fecha,
        titulo: c.nombre || `Comercio #${c.id}`,
        detalle: c.direccion || (c.rubro && String(c.rubro).toLowerCase() !== "general" ? c.rubro : ""),
      }));

    const visitas = (visitasPreventistaSeleccionado || []).map((v, i) => ({
      id: `visita-${v.id || i}`,
      tipo: "visita",
      fecha: v.fecha || v.created_at || null,
      horaTexto: v.hora || "",
      titulo: v.comercio_nombre || v.nombre_comercio || (v.comercio_id ? `Comercio #${v.comercio_id}` : "Visita"),
      detalle: v.resultado || v.tipo || v.observacion || v.observaciones || v.notas || "Visita registrada",
    }));

    const nvis = (nviHoyActividad || [])
      .filter(p => coincidePreventista(p.preventista))
      .map(p => ({
        id: `nvi-${p.id}`,
        tipo: "nvi",
        fecha: p.created_at || p.fecha || null,
        titulo: `NVI #${String(p.numero_pedido || p.id || "").padStart(6, "0")}`,
        detalle: `${p.comercio_nombre || (p.comercio_id ? `Comercio #${p.comercio_id}` : "Comercio")} · $${Number(p.total || 0).toLocaleString("es-AR")}`,
        estado: p.estado || "",
        pedidoCompleto: p,
      }));

    const valorOrden = (item) => {
      if (item.fecha) {
        const t = new Date(item.fecha).getTime();
        if (!Number.isNaN(t)) return t;
      }
      if (item.horaTexto) {
        const m = String(item.horaTexto).match(/(\d{1,2}):(\d{2})/);
        if (m) {
          const h = new Date();
          h.setHours(Number(m[1]), Number(m[2]), 0, 0);
          return h.getTime();
        }
      }
      return 0;
    };

    return [...capturas, ...visitas, ...nvis]
      .sort((a, b) => valorOrden(b) - valorOrden(a));
  })();

  const horaActividad = (item) => {
    if (item.fecha) {
      const f = new Date(item.fecha);
      if (!Number.isNaN(f.getTime())) {
        return f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
      }
    }
    return item.horaTexto || "--:--";
  };

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

  const prepararEdicionCliente = (c) => {
    setEditClienteDatos({
      codigo_cliente: c.codigo_cliente || "",
      razon_social: c.razon_social || "",
      nombre: c.nombre || "",
      direccion: c.direccion || "",
      domicilio_fiscal: c.domicilio_fiscal || "",
      localidad: c.localidad || "",
      partido: c.partido || "",
      provincia: c.provincia || "",
      codigo_postal: c.codigo_postal || "",
      pais: c.pais || "",
      telefono: c.telefono || "",
      whatsapp: c.whatsapp || "",
      contacto: c.contacto || "",
      cuit: c.cuit || "",
      condicion_fiscal: c.condicion_fiscal || "",
      email: c.email || "",
      notas: c.notas || "",
    });
  };

  const guardarFichaCompletaCliente = async () => {
    if (!comercioDetalleModal || !perfilSupervisor?.empresa_id) return;
    const nombre = String(editClienteDatos.nombre || "").trim();
    if (!nombre) {
      alert("⚠️ El nombre comercial no puede quedar vacío.");
      return;
    }
    setGuardandoFicha(true);
    try {
      const pFinal = String(editPrevFicha || "").trim();
      const dFinal = editDiaFicha ? String(editDiaFicha).trim().toUpperCase() : "";
      const cambios = {
        codigo_cliente: String(editClienteDatos.codigo_cliente || "").trim() || null,
        razon_social: String(editClienteDatos.razon_social || "").trim() || null,
        nombre,
        direccion: String(editClienteDatos.direccion || "").trim() || null,
        domicilio_fiscal: String(editClienteDatos.domicilio_fiscal || "").trim() || null,
        localidad: String(editClienteDatos.localidad || "").trim() || null,
        partido: String(editClienteDatos.partido || "").trim() || null,
        provincia: String(editClienteDatos.provincia || "").trim() || null,
        codigo_postal: String(editClienteDatos.codigo_postal || "").trim() || null,
        pais: String(editClienteDatos.pais || "").trim() || null,
        telefono: String(editClienteDatos.telefono || "").trim() || null,
        whatsapp: String(editClienteDatos.whatsapp || "").trim() || null,
        contacto: String(editClienteDatos.contacto || "").trim() || null,
        cuit: String(editClienteDatos.cuit || "").trim() || null,
        condicion_fiscal: String(editClienteDatos.condicion_fiscal || "").trim() || null,
        email: String(editClienteDatos.email || "").trim() || null,
        notas: String(editClienteDatos.notas || "").trim() || null,
        preventista: pFinal || null,
        dia_visita: dFinal || null,
      };
      const { data, error } = await supabase
        .from("comercios")
        .update(cambios)
        .eq("id", comercioDetalleModal.id)
        .eq("empresa_id", perfilSupervisor.empresa_id)
        .select("*")
        .single();
      if (error) throw error;
      setComercios(prev => (prev || []).map(c => c.id === data.id ? data : c));
      setComercioDetalleModal(data);
      setEditPrevFicha(data.preventista || "");
      setEditDiaFicha(data.dia_visita || "");
      prepararEdicionCliente(data);
      setMsgExitoFicha(true);
      setTimeout(() => setMsgExitoFicha(false), 2500);
    } catch (err) {
      console.error("Error guardando ficha del cliente:", err);
      alert("❌ No se pudieron guardar los datos del cliente: " + (err.message || "Verifique conexión"));
    } finally {
      setGuardandoFicha(false);
    }
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

  const guardarAsignacionMasivaClientes = async () => {
    if (!perfilSupervisor?.empresa_id) {
      alert("No se pudo identificar la empresa del Supervisor.");
      return;
    }
    if (!preventistaAsignacion) {
      alert("Elegí un preventista.");
      return;
    }
    if (clientesSeleccionadosAsignacion.length === 0) {
      alert("Seleccioná al menos un cliente.");
      return;
    }

    const confirmar = window.confirm(
      `¿Asignar ${clientesSeleccionadosAsignacion.length} cliente${clientesSeleccionadosAsignacion.length === 1 ? "" : "s"} a ${preventistaAsignacion}?`
    );
    if (!confirmar) return;

    setGuardandoAsignacionMasiva(true);
    try {
      const { error } = await supabase
        .from("comercios")
        .update({ preventista: preventistaAsignacion })
        .in("id", clientesSeleccionadosAsignacion)
        .eq("empresa_id", perfilSupervisor.empresa_id);

      if (error) throw error;

      const ids = new Set(clientesSeleccionadosAsignacion.map(String));
      setComercios(prev => (prev || []).map(c =>
        ids.has(String(c.id)) ? { ...c, preventista: preventistaAsignacion } : c
      ));
      setClientesSeleccionadosAsignacion([]);
      alert(`✅ ${clientesSeleccionadosAsignacion.length} cliente${clientesSeleccionadosAsignacion.length === 1 ? "" : "s"} asignado${clientesSeleccionadosAsignacion.length === 1 ? "" : "s"} a ${preventistaAsignacion}.`);
    } catch (err) {
      console.error("Error en asignación masiva de clientes:", err);
      alert("❌ No se pudo guardar la asignación: " + (err.message || "Verifique conexión"));
    } finally {
      setGuardandoAsignacionMasiva(false);
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
      ? "⚠️ REEMPLAZAR ESTADO DE CUENTA COMPLETO\n\nLos clientes que NO aparecen en la planilla pasarán a saldo $0.\n\n¿Confirmar carga en RutaComercio?"
      : `Se actualizarán ${vistaPreviaCuenta.encontrados.length} clientes incluidos en la planilla.\n\n¿Confirmar carga en RutaComercio?`;
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

  // 📥 Leer padrón de clientes desde Excel/CSV — NO guarda nada en Supabase
  const leerArchivoClientes = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    try {
      setArchivoClientesNombre(archivo.name);
      setVistaPreviaClientes(null);
      setResultadoGeo(null);

      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "", raw: false });
      const filasUtiles = matriz.filter(fila => Array.isArray(fila) && fila.some(celda => String(celda ?? "").trim() !== ""));
      if (!filasUtiles.length) throw new Error("La planilla está vacía.");

      let filas = [];
      if (archivoClientesTieneEncabezados) {
        const encabezados = filasUtiles[0].map(v => String(v ?? "").trim());
        filas = filasUtiles.slice(1).map(fila =>
          Object.fromEntries(encabezados.map((enc, i) => [enc, fila[i] ?? ""]))
        );
      } else {
        // Orden oficial de la plantilla RutaComercio cuando el archivo no trae encabezados.
        filas = filasUtiles.map(fila => ({
          codigo_cliente: fila[0] ?? "",
          razon_social: fila[1] ?? "",
          nombre_comercio: fila[2] ?? "",
          direccion: fila[3] ?? "",
          domicilio_fiscal: fila[4] ?? "",
          localidad: fila[5] ?? "",
          partido: fila[6] ?? "",
          provincia_estado: fila[7] ?? "",
          codigo_postal: fila[8] ?? "",
          pais: fila[9] ?? "",
          telefono: fila[10] ?? "",
          whatsapp: fila[11] ?? "",
          nombre_contacto: fila[12] ?? "",
          cuit: fila[13] ?? "",
          condicion_fiscal: fila[14] ?? "",
          email: fila[15] ?? "",
          email_preventista: fila[16] ?? "",
          latitud: fila[17] ?? "",
          longitud: fila[18] ?? "",
          notas: fila[19] ?? ""
        }));
      }

      const obtenerCampo = (fila, opciones) => {
        const mapa = Object.fromEntries(
          Object.entries(fila).map(([k, v]) => [String(k).trim().toLowerCase(), v])
        );
        for (const op of opciones) {
          if (Object.prototype.hasOwnProperty.call(mapa, op)) return mapa[op];
        }
        return "";
      };

      const vistos = new Set();
      const validos = [];
      const duplicados = [];
      const sinNombre = [];
      const sinDireccion = [];
      let conCoordenadas = 0;
      let pendientesGeocodificar = 0;

      filas.forEach((fila, indice) => {
        const numeroFila = indice + (archivoClientesTieneEncabezados ? 2 : 1);
        const codigo = String(obtenerCampo(fila, ["codigo_cliente", "código_cliente", "codigo cliente", "código cliente", "codigo", "código"]) || "").trim();
        const razonSocial = String(obtenerCampo(fila, ["razon_social", "razón_social", "razon social", "razón social"]) || "").trim();
        const nombre = String(obtenerCampo(fila, ["nombre_comercio", "nombre comercio", "nombre del comercio", "nombre comercial", "comercio", "cliente", "nombre"]) || "").trim();
        const direccion = String(obtenerCampo(fila, ["direccion", "dirección", "domicilio", "direccion comercial", "dirección comercial"]) || "").trim();
        const domicilioFiscal = String(obtenerCampo(fila, ["domicilio_fiscal", "domicilio fiscal", "direccion fiscal", "dirección fiscal"]) || "").trim();
        const localidad = String(obtenerCampo(fila, ["localidad", "ciudad"]) || "").trim();
        const partido = String(obtenerCampo(fila, ["partido", "municipio"]) || "").trim();
        const provincia = String(obtenerCampo(fila, ["provincia_estado", "provincia", "estado", "provincia/estado", "departamento"]) || "").trim();
        const codigoPostal = String(obtenerCampo(fila, ["codigo_postal", "código_postal", "codigo postal", "código postal", "cp"]) || "").trim();
        const pais = String(obtenerCampo(fila, ["pais", "país", "country"]) || "").trim();
        const telefono = String(obtenerCampo(fila, ["telefono", "teléfono", "tel", "telefono fijo", "teléfono fijo"]) || "").trim();
        const whatsapp = String(obtenerCampo(fila, ["whatsapp", "whats_app", "wa", "celular", "movil", "móvil"]) || "").trim();
        const contacto = String(obtenerCampo(fila, ["nombre_contacto", "nombre contacto", "contacto", "persona contacto", "persona de contacto"]) || "").trim();
        const cuit = String(obtenerCampo(fila, ["cuit", "cuil", "cuit/cuil"]) || "").trim();
        const condicionFiscal = String(obtenerCampo(fila, ["condicion_fiscal", "condición_fiscal", "condicion fiscal", "condición fiscal", "iva"]) || "").trim();
        const email = String(obtenerCampo(fila, ["email", "email_cliente", "email cliente", "correo", "correo cliente"]) || "").trim().toLowerCase();
        const emailPreventista = String(obtenerCampo(fila, ["email_preventista", "email preventista", "email del preventista", "correo_preventista", "correo preventista", "preventista_email"]) || "").trim().toLowerCase();
        const notas = String(obtenerCampo(fila, ["notas", "nota", "observaciones", "observacion", "observación"]) || "").trim();
        const latRaw = String(obtenerCampo(fila, ["latitud", "latitude", "lat"]) || "").trim().replace(",", ".");
        const lngRaw = String(obtenerCampo(fila, ["longitud", "longitude", "lng", "lon"]) || "").trim().replace(",", ".");
        const latitud = latRaw === "" ? null : Number(latRaw);
        const longitud = lngRaw === "" ? null : Number(lngRaw);
        const tieneCoordenadas = Number.isFinite(latitud) && Number.isFinite(longitud);

        if (!nombre) {
          sinNombre.push({ fila: numeroFila, codigo, motivo: "Falta nombre_comercio" });
          return;
        }

        // codigo_cliente es opcional. Si no existe, usamos nombre + dirección + localidad
        // solamente para detectar duplicados dentro del mismo archivo.
        const clave = (codigo || `${nombre}|${direccion}|${localidad}`).toUpperCase();
        if (vistos.has(clave)) {
          duplicados.push({ fila: numeroFila, codigo, nombre });
          return;
        }
        vistos.add(clave);

        if (!direccion && !tieneCoordenadas) {
          sinDireccion.push({ fila: numeroFila, codigo, nombre });
          return;
        }

        if (tieneCoordenadas) conCoordenadas += 1;
        else pendientesGeocodificar += 1;

        validos.push({
          fila: numeroFila,
          codigo_cliente: codigo,
          razon_social: razonSocial,
          nombre,
          direccion,
          domicilio_fiscal: domicilioFiscal,
          localidad,
          partido,
          provincia,
          codigo_postal: codigoPostal,
          pais,
          telefono,
          whatsapp,
          contacto,
          cuit,
          condicion_fiscal: condicionFiscal,
          email,
          email_preventista: emailPreventista,
          notas,
          latitud: tieneCoordenadas ? latitud : null,
          longitud: tieneCoordenadas ? longitud : null,
          estadoUbicacion: tieneCoordenadas ? "Con coordenadas" : "Pendiente de geocodificar"
        });
      });

      const validarPreventista = (cliente) => {
        const email = String(cliente.email_preventista || "").trim().toLowerCase();
        if (!email) return { ...cliente, preventista_estado: "sin_email", preventista_perfil: null };

        const perfil = (perfiles || []).find(p => String(p.email || "").trim().toLowerCase() === email);
        if (!perfil) return { ...cliente, preventista_estado: "no_reconocido", preventista_perfil: null };
        if (perfil.rol !== "preventista") return { ...cliente, preventista_estado: "rol_incorrecto", preventista_perfil: perfil };
        if (perfil.empresa_id && perfilSupervisor?.empresa_id && perfil.empresa_id !== perfilSupervisor.empresa_id) return { ...cliente, preventista_estado: "otra_empresa", preventista_perfil: perfil };
        if (perfil.activo === false) return { ...cliente, preventista_estado: "inactivo", preventista_perfil: perfil };

        return { ...cliente, preventista_estado: "ok", preventista_perfil: perfil, preventista_nombre: perfil.nombre || perfil.email };
      };

      const validosConPreventista = validos.map(validarPreventista);
      setVistaPreviaClientes({
        totalFilas: filas.length,
        validos: validosConPreventista,
        duplicados,
        sinNombre,
        sinDireccion,
        conCoordenadas,
        pendientesGeocodificar,
        conPais: validosConPreventista.filter(x => x.pais).length,
        sinPais: validosConPreventista.filter(x => !x.pais).length,
        conPreventista: validosConPreventista.filter(x => x.email_preventista).length,
        sinPreventista: validosConPreventista.filter(x => !x.email_preventista).length,
        preventistasOk: validosConPreventista.filter(x => x.preventista_estado === "ok").length,
        preventistasProblema: validosConPreventista.filter(x => !["ok", "sin_email"].includes(x.preventista_estado)).length,
        preventistasSinEmail: validosConPreventista.filter(x => x.preventista_estado === "sin_email").length
      });
    } catch (error) {
      console.error("Error leyendo padrón de clientes:", error);
      alert("❌ No se pudo leer la planilla: " + (error.message || "Formato inválido"));
      setArchivoClientesNombre("");
      setVistaPreviaClientes(null);
    } finally {
      event.target.value = "";
    }
  };

  // 🌍 Geocodificar TODOS los clientes válidos — todavía NO guarda nada
  const probarGeoapifyPrimerCliente = async () => {
    const clientes = vistaPreviaClientes?.validos || [];
    if (!clientes.length) {
      alert("⚠️ Primero cargá una planilla con al menos un cliente válido.");
      return;
    }

    const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
    if (!apiKey) {
      alert("❌ No encuentro VITE_GEOAPIFY_API_KEY en el archivo .env. Reiniciá Vite después de guardarlo.");
      return;
    }

    setProbandoGeo(true);
    setResultadoGeo(null);

    const resultados = [];

    try {
      for (let i = 0; i < clientes.length; i += 1) {
        const cliente = clientes[i];

        if (cliente.latitud != null && cliente.longitud != null) {
          resultados.push({
            ok: true,
            revisar: false,
            origen: "excel",
            cliente: cliente.nombre,
            direccion: [cliente.direccion, cliente.localidad, cliente.provincia, "Argentina"].filter(Boolean).join(", "),
            latitud: cliente.latitud,
            longitud: cliente.longitud,
            direccionEncontrada: "Coordenadas provistas por la planilla"
          });
          continue;
        }

        const direccionCompleta = [
          cliente.direccion,
          cliente.localidad,
          cliente.provincia,
          cliente.pais || "Argentina"
        ].filter(Boolean).join(", ");

        try {
          const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(direccionCompleta)}&format=json&limit=1&apiKey=${encodeURIComponent(apiKey)}`;
          const respuesta = await fetch(url);

          if (!respuesta.ok) throw new Error(`Geoapify respondió ${respuesta.status}`);

          const data = await respuesta.json();
          const encontrado = data?.results?.[0];

          if (!encontrado) {
            resultados.push({
              ok: false,
              cliente: cliente.nombre,
              direccion: direccionCompleta,
              mensaje: "No encontrado"
            });
          } else {
            const confianza = Number(encontrado.rank?.confidence ?? 0);
            const confianzaCalle = Number(encontrado.rank?.confidence_street_level ?? 0);
            const tipoResultado = encontrado.result_type || "";
            const tiposPrecisos = ["building", "amenity"];
            const revisar = !tiposPrecisos.includes(tipoResultado) || confianza < 0.75;

            resultados.push({
              ok: true,
              revisar,
              origen: "geoapify",
              cliente: cliente.nombre,
              direccion: direccionCompleta,
              latitud: encontrado.lat,
              longitud: encontrado.lon,
              direccionEncontrada: encontrado.formatted || "",
              tipoResultado,
              confianza,
              confianzaCalle
            });
          }
        } catch (errorCliente) {
          resultados.push({
            ok: false,
            cliente: cliente.nombre,
            direccion: direccionCompleta,
            mensaje: errorCliente.message || "Error consultando Geoapify"
          });
        }

        // Pausa pequeña para no disparar consultas todas juntas.
        if (i < clientes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }

      const confiables = resultados.filter(r => r.ok && !r.revisar).length;
      const revisar = resultados.filter(r => r.ok && r.revisar).length;
      const noEncontrados = resultados.filter(r => !r.ok).length;

      setResultadoGeo({
        multiple: true,
        total: resultados.length,
        encontrados: confiables,
        revisar,
        noEncontrados,
        resultados
      });
    } catch (error) {
      console.error("Error general geocodificando clientes:", error);
      alert("❌ Ocurrió un error durante la geocodificación: " + (error.message || "Error desconocido"));
    } finally {
      setProbandoGeo(false);
    }
  };

  // 🗺️ Abrir revisión visual de una ubicación dudosa
  const abrirRevisionMapa = (indiceResultado) => {
    const r = resultadoGeo?.resultados?.[indiceResultado];
    if (!r?.ok) return;
    setRevisionMapa({
      indice: indiceResultado,
      cliente: r.cliente,
      direccion: r.direccion,
      direccionEncontrada: r.direccionEncontrada,
      latitud: Number(r.latitud),
      longitud: Number(r.longitud)
    });
  };

  // 📍 Recibir un punto elegido haciendo clic en el mapa
  function SelectorPuntoRevision() {
    useMapEvents({
      click(e) {
        setRevisionMapa(actual => actual ? {
          ...actual,
          latitud: e.latlng.lat,
          longitud: e.latlng.lng
        } : actual);
      }
    });
    return null;
  }

  // ✅ Confirmar la ubicación vista/corregida en el mapa — todavía solo memoria
  const confirmarRevisionMapa = () => {
    if (!revisionMapa) return;

    setResultadoGeo(actual => {
      if (!actual?.multiple) return actual;
      const resultados = actual.resultados.map((r, i) =>
        i === revisionMapa.indice
          ? {
              ...r,
              revisar: false,
              aceptadoManualmente: true,
              latitud: revisionMapa.latitud,
              longitud: revisionMapa.longitud
            }
          : r
      );

      return {
        ...actual,
        resultados,
        encontrados: resultados.filter(r => r.ok && !r.revisar).length,
        revisar: resultados.filter(r => r.ok && r.revisar).length,
        noEncontrados: resultados.filter(r => !r.ok).length
      };
    });

    setRevisionMapa(null);
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
  const clientesPendientesValidacion = (comercios || []).filter(c =>
    c.creado_por_preventista === true && String(c.estado_alta || "").toLowerCase() === "provisorio"
  );
  const solicitudesPendientes = (solicitudesNoVisitar || []).filter(s => s.estado === "pendiente");
  const solicitudesHistorial = (solicitudesNoVisitar || []).filter(s => s.estado !== "pendiente");

  // 📥 Plantilla oficial RutaComercio para importación de clientes
  const descargarPlantillaClientes = () => {
    try {
      const encabezados = [
        "codigo_cliente", "razon_social", "nombre_comercio", "direccion", "domicilio_fiscal",
        "localidad", "partido", "provincia_estado", "codigo_postal", "pais", "telefono",
        "whatsapp", "nombre_contacto", "cuit", "condicion_fiscal", "email", "email_preventista",
        "latitud", "longitud", "notas"
      ];

      const ejemplo = [{
        codigo_cliente: "",
        razon_social: "Comercial El Sol S.R.L.",
        nombre_comercio: "Almacén El Sol",
        direccion: "Av. Mitre 1234",
        domicilio_fiscal: "Av. Mitre 1234",
        localidad: "Quilmes",
        partido: "Quilmes",
        provincia_estado: "Buenos Aires",
        codigo_postal: "1878",
        pais: "Argentina",
        telefono: "11 1234 5678",
        whatsapp: "11 1234 5678",
        nombre_contacto: "Juan Pérez",
        cuit: "30-12345678-9",
        condicion_fiscal: "Responsable Inscripto",
        email: "cliente@empresa.com",
        email_preventista: "vendedor@empresa.com",
        latitud: "",
        longitud: "",
        notas: "Recibe mercadería de 8 a 13"
      }];

      const hoja = XLSX.utils.json_to_sheet(ejemplo, { header: encabezados });
      hoja["!cols"] = encabezados.map(h => ({ wch: Math.max(14, Math.min(28, h.length + 4)) }));

      const instrucciones = [
        ["Campo", "Obligatorio", "Uso"],
        ["codigo_cliente", "No", "Código propio de la empresa. Puede quedar vacío."],
        ["razon_social", "No", "Razón social legal del cliente."],
        ["nombre_comercio", "Sí", "Nombre comercial con el que se identifica al cliente."],
        ["direccion", "Sí*", "Domicilio comercial. Puede omitirse solo si se informan latitud y longitud."],
        ["domicilio_fiscal", "No", "Domicilio fiscal, si es diferente o se desea conservar."],
        ["localidad", "No", "Localidad o ciudad."],
        ["partido", "No", "Partido o municipio."],
        ["provincia_estado", "No", "Provincia o estado."],
        ["codigo_postal", "No", "Código postal."],
        ["pais", "No", "País. Si se omite para geocodificar, RutaComercio usa Argentina como referencia."],
        ["telefono", "No", "Teléfono del cliente."],
        ["whatsapp", "No", "WhatsApp del cliente, separado del teléfono."],
        ["nombre_contacto", "No", "Persona de contacto."],
        ["cuit", "No", "CUIT/CUIL u otro identificador fiscal."],
        ["condicion_fiscal", "No", "Condición fiscal del cliente."],
        ["email", "No", "Email del cliente."],
        ["email_preventista", "No", "Email de login del preventista asignado."],
        ["latitud", "No", "Coordenada opcional. Si se informa, debe acompañarse de longitud."],
        ["longitud", "No", "Coordenada opcional. Si se informa, debe acompañarse de latitud."],
        ["notas", "No", "Observaciones libres sobre el cliente."]
      ];
      const hojaInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);
      hojaInstrucciones["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 72 }];

      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Clientes");
      XLSX.utils.book_append_sheet(libro, hojaInstrucciones, "Instrucciones");
      XLSX.writeFile(libro, "Plantilla_Clientes_RutaComercio.xlsx");
    } catch (error) {
      console.error("Error descargando plantilla de clientes:", error);
      alert("❌ No se pudo descargar la plantilla de clientes.");
    }
  };

  // 💾 Importación REAL de clientes aprobados por el supervisor
  const confirmarImportacionRealClientes = async () => {
    if (importandoClientes) return;

    if (!perfilSupervisor?.empresa_id) {
      alert("❌ No se pudo identificar la empresa del supervisor.");
      return;
    }

    const clientes = vistaPreviaClientes?.validos || [];
    const geos = resultadoGeo?.multiple ? (resultadoGeo.resultados || []) : [];

    if (!clientes.length || geos.length !== clientes.length) {
      alert("❌ La vista previa o la geolocalización están incompletas. No se cargó ningún cliente.");
      return;
    }

    const pendientes = geos.filter(r => !r?.ok || r?.revisar);
    if (pendientes.length) {
      alert(`⚠️ Todavía hay ${pendientes.length} ubicación(es) sin resolver. No se cargó ningún cliente.`);
      return;
    }

    const confirmacion = window.confirm(
      `⚠️ CARGA DE CLIENTES\n\nSe van a cargar ${clientes.length} cliente(s) en RutaComercio para ${perfilSupervisor.empresa || "esta empresa"}.\n\nEsta acción cargará los clientes definitivamente en RutaComercio.\n\n¿Confirmar carga en RutaComercio?`
    );
    if (!confirmacion) return;

    setImportandoClientes(true);

    const importados = [];
    const omitidosExistentes = [];
    const errores = [];

    const codigoPais = (pais) => {
      const p = String(pais || "").trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const mapa = {
        "argentina": "AR",
        "uruguay": "UY",
        "paraguay": "PY",
        "chile": "CL",
        "brasil": "BR",
        "brazil": "BR",
        "bolivia": "BO",
        "peru": "PE",
        "ecuador": "EC",
        "colombia": "CO",
        "venezuela": "VE",
        "mexico": "MX",
        "espana": "ES",
        "spain": "ES"
      };
      return mapa[p] || (p.length === 2 ? p.toUpperCase() : null);
    };

    try {
      for (let i = 0; i < clientes.length; i += 1) {
        const c = clientes[i];
        const geo = geos[i];

        try {
          const perfilPrev = c.preventista_perfil || (perfiles || []).find(p =>
            String(p.email || "").trim().toLowerCase() === String(c.email_preventista || "").trim().toLowerCase() &&
            String(p.rol || "").trim().toLowerCase() === "preventista" &&
            p.empresa_id === perfilSupervisor.empresa_id
          );

          const codigo = String(c.codigo_cliente || "").trim();

          // Evitar duplicados dentro de la empresa. Si hay código propio, es la referencia principal.
          // Si no hay código, comparamos nombre comercial + dirección.
          let consultaExistente = supabase
            .from("comercios")
            .select("id, nombre, codigo_cliente")
            .eq("empresa_id", perfilSupervisor.empresa_id);

          if (codigo) {
            consultaExistente = consultaExistente.eq("codigo_cliente", codigo);
          } else {
            consultaExistente = consultaExistente
              .eq("nombre", String(c.nombre || "").trim())
              .eq("direccion", String(c.direccion || "").trim());
          }

          const { data: existentes, error: errorExistente } = await consultaExistente.limit(1);
          if (errorExistente) throw errorExistente;
          const existente = (existentes || [])[0] || null;
          if (existente) {
            omitidosExistentes.push({
              nombre: c?.nombre || `Fila ${i + 1}`,
              codigo,
              id: existente.id
            });
            continue;
          }

          const lat = Number(geo.latitud ?? c.latitud);
          const lng = Number(geo.longitud ?? c.longitud);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new Error("Coordenadas inválidas.");
          }

          const nuevo = {
            nombre: String(c.nombre || "").trim(),
            codigo_cliente: codigo || null,
            razon_social: String(c.razon_social || "").trim() || null,
            direccion: String(c.direccion || "").trim(),
            domicilio_fiscal: String(c.domicilio_fiscal || "").trim() || null,
            localidad: String(c.localidad || "").trim() || null,
            partido: String(c.partido || "").trim() || null,
            provincia: String(c.provincia || "").trim() || null,
            codigo_postal: String(c.codigo_postal || "").trim() || null,
            pais: String(c.pais || "").trim() || null,
            telefono: String(c.telefono || "").trim() || null,
            whatsapp: String(c.whatsapp || "").trim() || null,
            contacto: String(c.contacto || "").trim() || null,
            cuit: String(c.cuit || "").trim() || null,
            condicion_fiscal: String(c.condicion_fiscal || "").trim() || null,
            email: String(c.email || "").trim().toLowerCase() || null,
            notas: String(c.notas || "").trim() || null,
            empresa: perfilSupervisor.empresa || "",
            empresa_id: perfilSupervisor.empresa_id,
            preventista: perfilPrev ? (perfilPrev.nombre || perfilPrev.email) : null,
            latitud: lat,
            longitud: lng,
            ubicacion_exacta_latitud: lat,
            ubicacion_exacta_longitud: lng,
            estado_alta: "aprobado",
            creado_por_preventista: false,
            codigo_pais: codigoPais(c.pais)
          };

          const { data: creado, error: errorInsert } = await supabase
            .from("comercios")
            .insert(nuevo)
            .select("*")
            .single();

          if (errorInsert) throw errorInsert;
          importados.push(creado);

        } catch (errorCliente) {
          console.error("Error importando cliente:", c?.nombre, errorCliente);
          errores.push({
            nombre: c?.nombre || `Fila ${i + 1}`,
            codigo: c?.codigo_cliente || "",
            mensaje: errorCliente?.message || "Error desconocido"
          });
        }
      }

      if (importados.length) {
        setComercios(prev => [...importados, ...(prev || [])]);
      }

      const detalleOmitidos = omitidosExistentes.length
        ? "\n\nYa existentes / omitidos:\n" + omitidosExistentes.slice(0, 8)
            .map(e => `• ${e.nombre}${e.codigo ? ` (${e.codigo})` : ""}: ya existe${e.id ? ` (ID ${e.id})` : ""}`)
            .join("\n")
        : "";

      const detalleErrores = errores.length
        ? "\n\nErrores reales:\n" + errores.slice(0, 8)
            .map(e => `• ${e.nombre}${e.codigo ? ` (${e.codigo})` : ""}: ${e.mensaje}`)
            .join("\n")
        : "";

      const sinDuplicados = omitidosExistentes.length
        ? "\n\nℹ️ No se duplicó ningún cliente ya existente."
        : "";

      alert(
        `✅ Carga finalizada\n\nNuevos cargados: ${importados.length}\nYa existentes / omitidos: ${omitidosExistentes.length}\nErrores reales: ${errores.length}${sinDuplicados}${detalleOmitidos}${detalleErrores}`
      );

      if (errores.length === 0) {
        setPreConfirmacionImportacion(false);
        setModalImportacionClientes(false);
        setVistaPreviaClientes(null);
        setResultadoGeo(null);
        setArchivoClientesNombre("");
      }

    } catch (error) {
      console.error("Error general en importación real:", error);
      alert("❌ Ocurrió un error general durante la importación: " + (error.message || "Error desconocido"));
    } finally {
      setImportandoClientes(false);
    }
  };

  const resumenImportacionAPB = (() => {
    if (!vistaPreviaClientes) return null;
    const vp = vistaPreviaClientes;
    const geo = resultadoGeo?.multiple ? (resultadoGeo.resultados || []) : [];
    const geoHecha = geo.length > 0;

    const motivos = [];
    const noValidos = Number(vp.preventistasProblema || 0);
    const sinEmail = Number(vp.preventistasSinEmail || 0);
    const duplicados = vp.duplicados?.length || 0;
    const problemas = (vp.sinNombre?.length || 0) + (vp.sinDireccion?.length || 0);
    const pendientesGeo = geoHecha ? 0 : Number(vp.pendientesGeocodificar || 0);
    const noEncontrados = geoHecha ? geo.filter(r => !r.ok).length : 0;
    const revisar = geoHecha ? geo.filter(r => r.ok && r.revisar).length : 0;

    if (problemas) motivos.push(`${problemas} cliente(s) con datos obligatorios incompletos`);
    if (duplicados) motivos.push(`${duplicados} cliente(s) duplicado(s)`);
    if (noValidos) motivos.push(`${noValidos} email(s) de preventista no reconocido(s)`);
    if (sinEmail) motivos.push(`${sinEmail} cliente(s) sin email de preventista`);
    if (pendientesGeo) motivos.push(`${pendientesGeo} cliente(s) todavía sin geolocalizar`);
    if (noEncontrados) motivos.push(`${noEncontrados} ubicación(es) no encontrada(s)`);
    if (revisar) motivos.push(`${revisar} ubicación(es) pendientes de revisión en mapa`);

    return {
      listo: (vp.validos?.length || 0) > 0 && motivos.length === 0,
      motivos,
      cantidad: vp.validos?.length || 0
    };
  })();

  const cargarListasPreciosEmpresa = async () => {
    const empresaId = perfilSupervisor?.empresa_id || sesionSupervisor?.empresa_id || "";
    const empresaNombre = perfilSupervisor?.empresa || sesionSupervisor?.empresa || "";

    if (!empresaId && !empresaNombre) {
      setListasPreciosEmpresa([]);
      return;
    }

    setCargandoListasPrecios(true);
    try {
      let consulta = supabase
        .from("listas_precios")
        .select("id,nombre,codigo,descripcion,activo,predeterminada,empresa,empresa_id")
        .eq("activo", true);

      if (empresaId) consulta = consulta.eq("empresa_id", empresaId);
      else consulta = consulta.eq("empresa", empresaNombre);

      const { data, error } = await consulta.order("predeterminada", { ascending: false }).order("nombre", { ascending: true });
      if (error) throw error;

      const listas = data || [];
      setListasPreciosEmpresa(listas);

      if (!listaPreciosSeleccionadaId && listas.length) {
        const predeterminada = listas.find(l => l.predeterminada) || listas[0];
        setListaPreciosSeleccionadaId(predeterminada.id);
      }
    } catch (error) {
      console.error("Error cargando listas de precios:", error);
      setListasPreciosEmpresa([]);
    } finally {
      setCargandoListasPrecios(false);
    }
  };

  useEffect(() => {
    if (seccionActiva === "listasPrecios" || seccionActiva === "clientes") {
      cargarListasPreciosEmpresa();
    }
  }, [seccionActiva, perfilSupervisor?.empresa_id, perfilSupervisor?.empresa]);

  const leerArchivoListaPrecios = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    setArchivoListaPreciosNombre(archivo.name);
    setVistaPreviaListaPrecios(null);
    setComparacionListaPrecios(null);

    try {
      const data = await archivo.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

      const normalizarClave = (valor) =>
        String(valor || "")
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");

      const valorCampo = (fila, nombres) => {
        const mapa = {};
        Object.entries(fila || {}).forEach(([k, v]) => {
          mapa[normalizarClave(k)] = v;
        });
        for (const nombre of nombres) {
          const v = mapa[normalizarClave(nombre)];
          if (v !== undefined && String(v).trim() !== "") return v;
        }
        return "";
      };

      const productos = filas.map((fila, i) => {
        const codigo = String(valorCampo(fila, ["codigo", "código", "cod", "codigo producto"]) || "").trim();
        const gtin = String(valorCampo(fila, ["gtin", "ean", "ean13", "codigo barras", "código de barras"]) || "").trim();
        const descripcion = String(valorCampo(fila, ["descripcion", "descripción", "producto", "articulo", "artículo"]) || "").trim();
        const marca = String(valorCampo(fila, ["marca"]) || "").trim();
        const precioRaw = valorCampo(fila, ["precio", "precio venta", "pvp"]);
        const precioTexto = String(precioRaw ?? "").trim().replace(/\s/g, "");
        let precio = Number(precioTexto.replace(/\./g, "").replace(",", "."));
        if (typeof precioRaw === "number") precio = precioRaw;

        const errores = [];
        if (!codigo) errores.push("Falta código");
        if (!descripcion) errores.push("Falta descripción");
        if (!Number.isFinite(precio) || precio < 0) errores.push("Precio inválido");

        return { fila: i + 2, codigo, gtin, descripcion, marca, precio, errores };
      });

      const validos = productos.filter(p => p.errores.length === 0);
      const conProblemas = productos.filter(p => p.errores.length > 0);

      setVistaPreviaListaPrecios({
        total: productos.length,
        validos,
        conProblemas,
        productos
      });
    } catch (error) {
      console.error("Error leyendo lista de precios:", error);
      alert("❌ No se pudo leer el archivo. Revisá que sea un Excel o CSV válido.");
      setArchivoListaPreciosNombre("");
      setVistaPreviaListaPrecios(null);
    } finally {
      event.target.value = "";
    }
  };

  const compararListaPreciosActual = async () => {
    if (!vistaPreviaListaPrecios || vistaPreviaListaPrecios.conProblemas.length > 0) {
      alert("⚠️ Primero necesitás un archivo válido, sin filas con problemas.");
      return;
    }
    // Empresa sin lista previa: todos los artículos válidos pasan como nuevos.
    if (!listaPreciosSeleccionadaId && listasPreciosEmpresa.length === 0) {
      const nombrePrimeraLista = descripcionListaPrecios.trim() ||
        (numeroListaPrecios.trim() ? `Lista ${numeroListaPrecios.trim()}` : "Primera lista de precios");
      setDecisionAusentesListaPrecios({});
      setComparacionListaPrecios({
        esPrimeraLista: true, totalActual: 0, nombreLista: nombrePrimeraLista, codigosActuales: 0,
        coincidenciasCodigo: 0, coincidenciasGtin: 0,
        diagnosticoCodigos: { codigosSupabase: [], codigosExcel: [], muestras: [] },
        sinCambios: [], precioCambiado: [], reactivar: [],
        nuevos: vistaPreviaListaPrecios.validos, ausentes: [], revisar: []
      });
      return;
    }
    if (!listaPreciosSeleccionadaId) {
      alert("⚠️ Elegí la lista actual que querés comparar.");
      return;
    }

    setComparandoListaPrecios(true);
    setComparacionListaPrecios(null);

    try {
      const { data: filasActuales, error: errorLista } = await supabase
        .from("lista_productos")
        .select("id,producto_id,lista_id,codigo_lista,detalle_en_lista,precio,activo")
        .eq("lista_id", listaPreciosSeleccionadaId);

      if (errorLista) throw errorLista;

      const idsProductos = [...new Set((filasActuales || []).map(x => x.producto_id).filter(Boolean))];
      let productosMaestros = [];

      if (idsProductos.length > 0) {
        const { data, error } = await supabase
          .from("productos")
          .select("id,codigo_cge,nombre,marca,presentacion,descripcion,gtin,activo")
          .in("id", idsProductos);

        if (error) throw error;
        productosMaestros = data || [];
      }

      const porId = new Map(productosMaestros.map(p => [p.id, p]));
      const actuales = (filasActuales || []).map(lp => ({
        ...lp,
        producto: porId.get(lp.producto_id) || null
      }));

      const normal = v => String(v ?? "").trim().toLowerCase();
      const normalGtin = v => String(v ?? "").replace(/\D/g, "");
      const precioNum = v => Number(v ?? 0);

      const porCodigo = new Map();
      const porGtin = new Map();

      actuales.forEach(item => {
        const cod = normal(item.codigo_lista);
        if (cod) porCodigo.set(cod, item);

        const gtin = normalGtin(item.producto?.gtin);
        if (gtin) porGtin.set(gtin, item);
      });

      const diagnosticoCodigos = {
        codigosSupabase: [...porCodigo.keys()],
        codigosExcel: vistaPreviaListaPrecios.validos.map(p => normal(p.codigo)),
        muestras: vistaPreviaListaPrecios.validos.slice(0, 10).map(p => {
          const codigoNormalizado = normal(p.codigo);
          return {
            original: String(p.codigo ?? ""),
            normalizado: codigoNormalizado,
            largo: codigoNormalizado.length,
            coincide: porCodigo.has(codigoNormalizado)
          };
        })
      };

      const sinCambios = [];
      const precioCambiado = [];
      const reactivar = [];
      const nuevos = [];
      const revisar = [];
      const idsEncontrados = new Set();

      for (const nuevo of vistaPreviaListaPrecios.validos) {
        const codigo = normal(nuevo.codigo);
        const gtin = normalGtin(nuevo.gtin);

        const porCod = codigo ? porCodigo.get(codigo) : null;
        const porBarra = gtin ? porGtin.get(gtin) : null;

        // Si código y GTIN apuntan a productos distintos, no decidimos solos.
        if (porCod && porBarra && porCod.producto_id !== porBarra.producto_id) {
          revisar.push({
            ...nuevo,
            motivo: "El código y el GTIN coinciden con productos diferentes"
          });
          continue;
        }

        const existente = porCod || porBarra;

        if (existente) idsEncontrados.add(existente.id);

        if (!existente) {
          nuevos.push(nuevo);
          continue;
        }

        const precioAnterior = precioNum(existente.precio);
        const precioNuevo = precioNum(nuevo.precio);
        const base = {
          ...nuevo,
          coincidencia: porCod ? "codigo" : "gtin",
          producto_id: existente.producto_id,
          lista_producto_id: existente.id,
          codigo_cge: existente.producto?.codigo_cge || "",
          precioAnterior,
          precioNuevo
        };

        if (existente.activo === false) {
          reactivar.push(base);
          continue;
        }

        if (Math.abs(precioAnterior - precioNuevo) < 0.000001) {
          sinCambios.push(base);
        } else {
          precioCambiado.push(base);
        }
      }

      const ausentes = actuales
        .filter(item => item.activo !== false && !idsEncontrados.has(item.id))
        .map(item => ({
          id: item.id,
          producto_id: item.producto_id,
          codigo: item.codigo_lista || item.producto?.codigo_cge || "",
          descripcion: item.detalle_en_lista || item.producto?.nombre || item.producto?.descripcion || "Producto sin descripción",
          precioAnterior: precioNum(item.precio),
          gtin: item.producto?.gtin || ""
        }));

      setDecisionAusentesListaPrecios(
        Object.fromEntries(ausentes.map(item => [item.id, "mantener"]))
      );

      const listaSeleccionada = listasPreciosEmpresa.find(
        l => l.id === listaPreciosSeleccionadaId
      );

      setComparacionListaPrecios({
        totalActual: actuales.length,
        nombreLista: listaSeleccionada?.nombre || listaSeleccionada?.codigo || "Lista seleccionada",
        codigosActuales: porCodigo.size,
        coincidenciasCodigo: sinCambios.filter(x => x.coincidencia === "codigo").length +
          precioCambiado.filter(x => x.coincidencia === "codigo").length,
        coincidenciasGtin: sinCambios.filter(x => x.coincidencia === "gtin").length +
          precioCambiado.filter(x => x.coincidencia === "gtin").length,
        diagnosticoCodigos,
        sinCambios,
        precioCambiado,
        reactivar,
        nuevos,
        ausentes,
        revisar
      });
    } catch (error) {
      console.error("Error comparando lista de precios:", error);
      alert("❌ No se pudo comparar la lista actual. No se modificó ningún dato.");
    } finally {
      setComparandoListaPrecios(false);
    }
  };

  const actualizarListaPreciosReal = async () => {
    if (actualizandoListaPrecios) return;
    if (!comparacionListaPrecios) {
      alert("❌ Falta preparar la lista antes de continuar.");
      return;
    }
    if (!listaPreciosSeleccionadaId && !comparacionListaPrecios.esPrimeraLista) {
      alert("❌ Falta la lista seleccionada.");
      return;
    }
    if ((comparacionListaPrecios.revisar || []).length > 0) {
      alert("⚠️ Hay artículos pendientes de revisar. No se actualizó nada.");
      return;
    }

    const cambiosPrecio = (comparacionListaPrecios.precioCambiado || []).map(p => ({
      lista_producto_id: p.lista_producto_id,
      precio: p.precioNuevo
    }));

    const productosNuevos = (comparacionListaPrecios.nuevos || []).map(p => ({
      codigo: String(p.codigo || "").trim(),
      nombre: String(p.descripcion || "").trim(),
      descripcion: String(p.descripcion || "").trim(),
      marca: String(p.marca || "").trim(),
      gtin: String(p.gtin || "").trim(),
      precio: Number(p.precio)
    }));

    const productosQuitar = (comparacionListaPrecios.ausentes || [])
      .filter(p => decisionAusentesListaPrecios[p.id] === "quitar")
      .map(p => ({ lista_producto_id: p.id }));

    const confirmar = window.confirm(
      comparacionListaPrecios.esPrimeraLista
        ? `⚠️ CREAR PRIMERA LISTA\n\nLista: ${comparacionListaPrecios.nombreLista}\nProductos nuevos: ${productosNuevos.length}\n\nRutaComercio creará la primera lista de precios. ¿Confirmar?`
        : `⚠️ ACTUALIZACIÓN REAL DE LISTA\n\nLista: ${comparacionListaPrecios.nombreLista}\nCambios de precio: ${cambiosPrecio.length}\nProductos nuevos: ${productosNuevos.length}\nQuitar de la lista: ${productosQuitar.length}\n\nRutaComercio actualizará esta lista de precios. ¿Confirmar?`
    );
    if (!confirmar) return;

    setActualizandoListaPrecios(true);
    let listaCreada = null;
    try {
      let listaIdDestino = listaPreciosSeleccionadaId;

      if (comparacionListaPrecios.esPrimeraLista) {
        const empresaId = perfilSupervisor?.empresa_id || sesionSupervisor?.empresa_id || "";
        const empresaNombre = perfilSupervisor?.empresa || sesionSupervisor?.empresa || "";
        if (!empresaId) throw new Error("No se pudo identificar la empresa para crear la primera lista.");

        const nombreNuevaLista = descripcionListaPrecios.trim() ||
          (numeroListaPrecios.trim() ? `Lista ${numeroListaPrecios.trim()}` : "Primera lista de precios");
        const codigoNuevaLista = numeroListaPrecios.trim() || `INICIAL-${vigenciaListaPrecios || new Date().toISOString().slice(0, 10)}`;
        const descripcionNuevaLista = [descripcionListaPrecios.trim(), vigenciaListaPrecios ? `Vigente desde ${vigenciaListaPrecios}` : ""].filter(Boolean).join(" · ") || null;

        const { data: nuevaLista, error: errorCrearLista } = await supabase.from("listas_precios").insert({
          nombre: nombreNuevaLista, codigo: codigoNuevaLista, descripcion: descripcionNuevaLista,
          activo: true, predeterminada: true, empresa_id: empresaId, empresa: empresaNombre || null
        }).select("*").single();
        if (errorCrearLista) throw errorCrearLista;
        listaCreada = nuevaLista;
        listaIdDestino = nuevaLista.id;
      }

      const { data, error } = await supabase.rpc("actualizar_lista_precios", {
        p_lista_id: listaIdDestino,
        p_cambios_precio: cambiosPrecio,
        p_productos_nuevos: productosNuevos,
        p_productos_quitar: productosQuitar
      });

      if (error) throw error;
      if (!data?.ok) throw new Error("Supabase no confirmó la actualización.");

      alert(
        `✅ LISTA ACTUALIZADA CORRECTAMENTE\n\n` +
        `Precios actualizados: ${data.precios_actualizados ?? 0}\n` +
        `Productos creados: ${data.productos_creados ?? 0}\n` +
        `Productos quitados: ${data.productos_quitados ?? 0}`
      );

      setConfirmacionFinalListaPrecios(false);
      setPreConfirmacionListaPrecios(false);
      setComparacionListaPrecios(null);
      setDecisionAusentesListaPrecios({});
      setVistaPreviaListaPrecios(null);
      setArchivoListaPreciosNombre("");
      setNumeroListaPrecios("");
      setVigenciaListaPrecios("");
      setDescripcionListaPrecios("");
      if (inputArchivoListaPreciosRef.current) inputArchivoListaPreciosRef.current.value = "";
      await cargarListasPreciosEmpresa();
    } catch (error) {
      if (listaCreada?.id) {
        const empresaId = perfilSupervisor?.empresa_id || sesionSupervisor?.empresa_id || "";
        await supabase.from("listas_precios").delete().eq("id", listaCreada.id).eq("empresa_id", empresaId);
      }
      console.error("Error actualizando lista de precios:", error);
      alert(`❌ NO SE ACTUALIZÓ LA LISTA\n\n${error?.message || "Error desconocido"}\n\nLa operación transaccional fue rechazada.`);
    } finally {
      setActualizandoListaPrecios(false);
    }
  };

  const descargarPlantillaListaPrecios = () => {
    const filas = [
      ["codigo", "gtin", "descripcion", "marca", "precio"],
      ["ART001", "7791234567890", "Shampoo Profesional 1 L", "Marca Ejemplo", 12500],
      ["ART002", "", "Acondicionador Profesional 1 L", "", 11800],
    ];

    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"] = [
      { wch: 16 },
      { wch: 18 },
      { wch: 38 },
      { wch: 22 },
      { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista de precios");
    XLSX.writeFile(wb, "plantilla_lista_precios_rutacomercio.xlsx");
  };


  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* CABECERA PRINCIPAL */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {/* IZQUIERDA: MARCA Y LOGO OFICIAL */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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

      <style>{`
        @media (max-width: 700px) {
          .supervisor-mapa-layout {
            grid-template-columns: minmax(0, 1fr) !important;
            width: 100% !important;
          }
          .supervisor-mapa-layout > div {
            min-width: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

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
        <button
          onClick={() => window.location.href = "/pedidos?seccion=stock"}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "stock" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "stock" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          📥 CARGAR STOCK
        </button>
        <button
          onClick={() => setSeccionActiva("disponibilidad")}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "disponibilidad" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "disponibilidad" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          📦 Disponibilidad
        </button>
        <button
          onClick={() => setSeccionActiva("clientes")}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "clientes" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "clientes" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          🏪 Clientes
        </button>
        <button
          onClick={() => setSeccionActiva("estadoCuenta")}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "estadoCuenta" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "estadoCuenta" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          💳 Estado de Cuenta
        </button>
        <button
          onClick={() => setSeccionActiva("listasPrecios")}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "listasPrecios" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "listasPrecios" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          💲 Listas de Precios
        </button>
        <button
          onClick={() => setSeccionActiva("solicitudes")}
          style={{ padding: "12px 0", background: "none", border: "none", borderBottom: seccionActiva === "solicitudes" ? "2px solid #2563eb" : "2px solid transparent", color: seccionActiva === "solicitudes" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          🚫 Solicitudes{solicitudesPendientes.length > 0 ? ` (${solicitudesPendientes.length})` : ""}
        </button>
      </div>

      <main style={{ padding: "16px 24px", maxWidth: "1500px", margin: "0 auto" }}>
        {preConfirmacionImportacion && vistaPreviaClientes && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.72)", zIndex: 12500, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ width: "min(900px, 96vw)", maxHeight: "88vh", overflow: "auto", background: "#fff", borderRadius: "14px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <div>
                  <h3 style={{ margin: 0 }}>💾 Confirmación final de carga</h3>
                  <div style={{ marginTop: "5px", fontSize: "11px", color: "#64748b" }}>Revisá qué clientes se van a cargar en RutaComercio.</div>
                </div>
                <button type="button" onClick={() => setPreConfirmacionImportacion(false)} style={{ border: "none", borderRadius: "8px", padding: "7px 10px", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ marginTop: "12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "9px", padding: "10px", fontSize: "11px" }}>
                🏢 Empresa: <strong>{perfilSupervisor?.empresa || "Empresa actual"}</strong><br/>
                👥 Clientes preparados: <strong>{vistaPreviaClientes.validos.length}</strong><br/>
                ✅ <strong>Los clientes quedarán activos y listos para usar.</strong>
              </div>

              <div style={{ marginTop: "12px", display: "grid", gap: "7px" }}>
                {vistaPreviaClientes.validos.map((c, i) => {
                  const geo = resultadoGeo?.multiple ? resultadoGeo.resultados?.[i] : null;
                  const perfilPreventista = perfiles.find(p =>
                    String(p.email || "").trim().toLowerCase() === String(c.email_preventista || "").trim().toLowerCase() &&
                    String(p.rol || "").trim().toLowerCase() === "preventista"
                  );
                  const usuario = perfilPreventista?.nombre || "(sin resolver)";
                  return (
                    <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: "9px", padding: "9px", fontSize: "11px" }}>
                      <strong>{i + 1}. {c.nombre}</strong> · código: {c.codigo_cliente || "—"}<br/>
                      📍 {c.direccion}{c.localidad ? `, ${c.localidad}` : ""}{c.provincia ? `, ${c.provincia}` : ""}{c.pais ? `, ${c.pais}` : ""}<br/>
                      👤 {c.email_preventista} → <strong>{usuario}</strong><br/>
                      🗺️ {geo?.latitud ?? c.latitud}, {geo?.longitud ?? c.longitud}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: "12px", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: "9px", padding: "10px", fontSize: "11px", color: "#9a3412" }}>
                ⚠️ Esta es la última revisión. Al tocar IMPORTAR AHORA aparecerá una confirmación final y, si aceptás, los clientes se cargarán en RutaComercio.
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" onClick={() => setPreConfirmacionImportacion(false)} style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", cursor: "pointer", fontWeight: "800" }}>Volver</button>
                <button
                  type="button"
                  onClick={confirmarImportacionRealClientes}
                  disabled={importandoClientes}
                  style={{
                    padding: "10px 14px",
                    border: "none",
                    borderRadius: "8px",
                    background: importandoClientes ? "#cbd5e1" : "#16a34a",
                    color: importandoClientes ? "#64748b" : "#fff",
                    fontWeight: "900",
                    cursor: importandoClientes ? "not-allowed" : "pointer"
                  }}
                >
                  {importandoClientes ? "⏳ CARGANDO..." : "✅ CARGAR CLIENTES"}
                </button>
              </div>
            </div>
          </div>
        )}

        {revisionMapa && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 12000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ width: "min(760px, 96vw)", background: "#fff", borderRadius: "14px", padding: "16px", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px" }}>🗺️ Revisar ubicación</h3>
                  <div style={{ marginTop: "4px", fontWeight: "800" }}>{revisionMapa.cliente}</div>
                  <div style={{ marginTop: "3px", fontSize: "11px", color: "#64748b" }}>Buscamos: {revisionMapa.direccion}</div>
                  <div style={{ marginTop: "2px", fontSize: "11px", color: "#64748b" }}>Geoapify: {revisionMapa.direccionEncontrada}</div>
                </div>
                <button type="button" onClick={() => setRevisionMapa(null)} style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "7px 10px", cursor: "pointer", fontWeight: "900" }}>✕</button>
              </div>

              <div style={{ marginTop: "10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "8px", fontSize: "11px", color: "#1e3a8a" }}>
                📍 El marcador muestra la ubicación propuesta. Aunque figure como confiable, podés revisarla. Si está mal, <strong>hacé clic en el lugar correcto del mapa</strong> y el marcador se moverá.
              </div>

              <div style={{ height: "390px", marginTop: "10px", borderRadius: "10px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                <MapContainer
                  key={`${revisionMapa.cliente}-${revisionMapa.latitud}-${revisionMapa.longitud}`}
                  center={[revisionMapa.latitud, revisionMapa.longitud]}
                  zoom={17}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <SelectorPuntoRevision />
                  <Marker position={[revisionMapa.latitud, revisionMapa.longitud]}>
                    <Popup>{revisionMapa.cliente}</Popup>
                  </Marker>
                </MapContainer>
              </div>

              <div style={{ marginTop: "8px", fontSize: "11px", color: "#475569", textAlign: "center" }}>
                📍 {revisionMapa.latitud.toFixed(6)}, {revisionMapa.longitud.toFixed(6)}
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" onClick={() => setRevisionMapa(null)} style={{ padding: "9px 13px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", cursor: "pointer", fontWeight: "800" }}>Cancelar</button>
                <button type="button" onClick={confirmarRevisionMapa} style={{ padding: "9px 13px", border: "none", borderRadius: "8px", background: "#16a34a", color: "#fff", cursor: "pointer", fontWeight: "900" }}>✅ CONFIRMAR UBICACIÓN</button>
              </div>
              <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b", textAlign: "center" }}>🔒 Sigue siendo una revisión previa: todavía no se cargó ningún cliente en RutaComercio.</div>
            </div>
          </div>
        )}

        {modalImportacionClientes && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}>
            <div style={{ width: "min(820px, 96vw)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>📥 Cargar Clientes a RutaComercio</h3>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    PASO 1 — Lee y revisa el Excel. <strong>No guarda nada todavía.</strong>
                  </div>
                </div>
                <button type="button" onClick={() => setModalImportacionClientes(false)} style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "7px 10px", cursor: "pointer", fontWeight: "800" }}>✕</button>
              </div>

              <div style={{ marginTop: "14px", marginBottom: "12px", padding: "11px", border: "1px solid #bbf7d0", borderRadius: "10px", background: "#f0fdf4" }}>
                <div style={{ textAlign: "center", fontSize: "11px", color: "#166534", marginBottom: "8px", fontWeight: "800" }}>
                  ¿Primera vez? Empezá descargando la plantilla oficial.
                </div>
                <button
                type="button"
                onClick={descargarPlantillaClientes}
                style={{
                  width: "100%",
                  marginBottom: "8px",
                  padding: "10px",
                  border: "1px solid #16a34a",
                  borderRadius: "9px",
                  background: "#f0fdf4",
                  color: "#166534",
                  fontWeight: "900",
                  cursor: "pointer"
                }}
              >
                📥 DESCARGAR PLANTILLA DE CLIENTES
              </button>
              <div style={{ marginBottom: "8px", textAlign: "center", fontSize: "10px", color: "#64748b" }}>
                Incluye una fila de ejemplo y una hoja de instrucciones. Código de cliente, domicilio fiscal, latitud y longitud son opcionales.
              </div>
              </div>

              <div style={{ marginTop: "14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "9px", padding: "10px", fontSize: "12px", color: "#1e3a8a" }}>
                Obligatorio: <strong>nombre_comercio</strong> y una ubicación resoluble (dirección o coordenadas).<br />
                Opcionales: <strong>codigo_cliente, razon_social, domicilio_fiscal, localidad, partido, provincia_estado, codigo_postal, pais, telefono, whatsapp, nombre_contacto, cuit, condicion_fiscal, email, email_preventista, latitud, longitud y notas</strong>.
                <div style={{ marginTop: "6px", fontWeight: "800" }}>🏪 “nombre_comercio” = nombre del negocio/cliente, NO el nombre del preventista.</div>
                <div style={{ marginTop: "3px", fontWeight: "800" }}>📧 “email_preventista” = email de login del preventista. No usar su nombre.</div>
              </div>

              <div style={{ marginTop: "10px" }}>
                <button type="button" onClick={() => setMostrarOpcionesArchivoClientes(v => !v)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#f8fafc", color: "#475569", fontWeight: "800", cursor: "pointer", fontSize: "11px" }}>
                  ⚙️ Opciones para archivos propios {mostrarOpcionesArchivoClientes ? "▲" : "▼"}
                </button>

                {mostrarOpcionesArchivoClientes && (
                  <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
                    <label style={{ border: archivoClientesTieneEncabezados ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "9px", padding: "10px", cursor: "pointer", background: archivoClientesTieneEncabezados ? "#eff6ff" : "#fff" }}>
                      <input type="radio" name="encabezadosClientes" checked={archivoClientesTieneEncabezados} onChange={() => { setArchivoClientesTieneEncabezados(true); setVistaPreviaClientes(null); }} />
                      <strong> Mi archivo tiene títulos de columnas</strong>
                    </label>
                    <label style={{ border: !archivoClientesTieneEncabezados ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "9px", padding: "10px", cursor: "pointer", background: !archivoClientesTieneEncabezados ? "#eff6ff" : "#fff" }}>
                      <input type="radio" name="encabezadosClientes" checked={!archivoClientesTieneEncabezados} onChange={() => { setArchivoClientesTieneEncabezados(false); setVistaPreviaClientes(null); }} />
                      <strong> Mi archivo NO tiene títulos de columnas</strong>
                      <div style={{ marginLeft: "22px", marginTop: "3px", fontSize: "11px", color: "#64748b" }}>RutaComercio usará el orden esperado de columnas.</div>
                    </label>
                  </div>
                )}
              </div>

              {/* 🧭 Guía visual de importación — solo interfaz, no cambia la lógica */}
              {(() => {
                const pasoActual = !vistaPreviaClientes ? 1 : (resumenImportacionAPB?.listo ? 3 : 2);
                const pasos = [
                  { n: 1, texto: "CARGAR ARCHIVO" },
                  { n: 2, texto: "REVISAR" },
                  { n: 3, texto: "IMPORTAR" },
                ];
                return (
                  <div style={{ margin: "12px 0 14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                      {pasos.map((p) => {
                        const activo = p.n === pasoActual;
                        const completado = p.n < pasoActual;
                        return (
                          <div key={p.n} style={{
                            border: activo ? "2px solid #2563eb" : "1px solid #cbd5e1",
                            background: completado ? "#f0fdf4" : activo ? "#eff6ff" : "#f8fafc",
                            borderRadius: "10px", padding: "9px 5px", textAlign: "center",
                            fontWeight: "900", fontSize: "10px",
                            color: completado ? "#166534" : activo ? "#1d4ed8" : "#64748b"
                          }}>
                            <div style={{ fontSize: "16px", marginBottom: "3px" }}>{completado ? "✓" : p.n}</div>
                            {p.texto}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: "7px", textAlign: "center", fontSize: "10px", color: "#64748b" }}>
                      {pasoActual === 1 && "Elegí el archivo de clientes para comenzar."}
                      {pasoActual === 2 && "RutaComercio está revisando los datos antes de importar."}
                      {pasoActual === 3 && "Todo está listo. Revisá el resumen y confirmá la importación."}
                    </div>
                  </div>
                );
              })()}

              <input ref={inputArchivoClientesRef} type="file" accept=".xlsx,.xls" onChange={leerArchivoClientes} style={{ display: "none" }} />
              <button type="button" onClick={() => inputArchivoClientesRef.current?.click()} style={{ marginTop: "14px", width: "100%", padding: "11px", border: "1px dashed #2563eb", borderRadius: "9px", background: "#eff6ff", color: "#1d4ed8", fontWeight: "800", cursor: "pointer" }}>
                1️⃣ ELEGIR ARCHIVO EXCEL
              </button>
              {archivoClientesNombre && <div style={{ fontSize: "11px", color: "#475569", marginTop: "6px" }}>Archivo: <strong>{archivoClientesNombre}</strong></div>}

              {vistaPreviaClientes && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ fontWeight: "800", fontSize: "13px", marginBottom: "8px" }}>Vista previa — todavía no se guardaron cambios</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: "8px" }}>
                                      {(() => {
                    const totalProblemas =
                      (vistaPreviaClientes.sinNombre?.length || 0) +
                      (vistaPreviaClientes.sinDireccion?.length || 0) +
                      (vistaPreviaClientes.duplicados?.length || 0) +
                      Number(vistaPreviaClientes.preventistasProblema || 0) +
                      Number(vistaPreviaClientes.preventistasSinEmail || 0);

                    return (
                      <div style={{
                        marginTop: "10px",
                        marginBottom: "10px",
                        padding: "12px",
                        borderRadius: "10px",
                        border: totalProblemas === 0 ? "1px solid #86efac" : "1px solid #fcd34d",
                        background: totalProblemas === 0 ? "#f0fdf4" : "#fffbeb"
                      }}>
                        <div style={{
                          fontWeight: "900",
                          fontSize: "14px",
                          color: totalProblemas === 0 ? "#166534" : "#92400e"
                        }}>
                          {totalProblemas === 0
                            ? "✅ Archivo reconocido correctamente"
                            : `⚠️ Encontramos ${totalProblemas} dato(s) que necesitan atención`}
                        </div>
                        <div style={{ marginTop: "4px", fontSize: "12px", color: totalProblemas === 0 ? "#166534" : "#92400e" }}>
                          <strong>{vistaPreviaClientes.validos?.length || 0}</strong>{" "}
                          {(vistaPreviaClientes.validos?.length || 0) === 1 ? "cliente encontrado" : "clientes encontrados"}.
                          {totalProblemas === 0
                            ? " RutaComercio verificará direcciones y preventistas antes de cargarlos."
                            : " Revisá los avisos de abajo antes de continuar."}
                        </div>
                      </div>
                    );
                  })()}

<div style={{ background: "#f8fafc", padding: "9px", borderRadius: "8px" }}><small>Filas leídas</small><div style={{ fontWeight: "900" }}>{vistaPreviaClientes.totalFilas}</div></div>
                    <div style={{ background: "#f0fdf4", padding: "9px", borderRadius: "8px" }}><small>Clientes válidos</small><div style={{ fontWeight: "900", color: "#15803d" }}>{vistaPreviaClientes.validos.length}</div></div>
                    <div style={{ background: "#ecfeff", padding: "9px", borderRadius: "8px" }}><small>Con coordenadas</small><div style={{ fontWeight: "900", color: "#0e7490" }}>{vistaPreviaClientes.conCoordenadas}</div></div>
                    <div style={{ background: "#fffbeb", padding: "9px", borderRadius: "8px" }}><small>Pendientes geocodificar</small><div style={{ fontWeight: "900", color: "#b45309" }}>{vistaPreviaClientes.pendientesGeocodificar}</div></div>
                    <div style={{ background: "#fef2f2", padding: "9px", borderRadius: "8px" }}><small>Duplicados</small><div style={{ fontWeight: "900", color: "#dc2626" }}>{vistaPreviaClientes.duplicados.length}</div></div>
                    <div style={{ background: "#fef2f2", padding: "9px", borderRadius: "8px" }}><small>Con problemas</small><div style={{ fontWeight: "900", color: "#dc2626" }}>{vistaPreviaClientes.sinNombre.length + vistaPreviaClientes.sinDireccion.length}</div></div>
                  </div>

                  <div style={{ marginTop: "9px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px" }}>
                    <div style={{ background: "#eef2ff", padding: "9px", borderRadius: "8px", fontSize: "11px" }}>
                      🌎 País informado: <strong>{vistaPreviaClientes.conPais}</strong> · sin informar: <strong>{vistaPreviaClientes.sinPais}</strong>
                    </div>
                    <div style={{ background: "#f5f3ff", padding: "9px", borderRadius: "8px", fontSize: "11px" }}>
                      📧 Email de preventista informado: <strong>{vistaPreviaClientes.conPreventista}</strong> · sin email: <strong>{vistaPreviaClientes.sinPreventista}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: "9px", border: "1px solid #cbd5e1", borderRadius: "9px", overflow: "hidden" }}>
                    <div style={{ background: "#f8fafc", padding: "9px 11px", fontWeight: "900", fontSize: "12px" }}>
                      📧 ASIGNACIÓN DE PREVENTISTAS — validación real
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "#e2e8f0" }}>
                      <div style={{ background: "#f0fdf4", padding: "9px", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#15803d" }}>✅ Reconocidos</div>
                        <strong style={{ color: "#15803d" }}>{vistaPreviaClientes.preventistasOk}</strong>
                      </div>
                      <div style={{ background: "#fef2f2", padding: "9px", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#dc2626" }}>⚠️ No válidos</div>
                        <strong style={{ color: "#dc2626" }}>{vistaPreviaClientes.preventistasProblema}</strong>
                      </div>
                      <div style={{ background: "#f8fafc", padding: "9px", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>➖ Sin email</div>
                        <strong>{vistaPreviaClientes.preventistasSinEmail}</strong>
                      </div>
                    </div>

                    {vistaPreviaClientes.validos.some(x => x.preventista_estado !== "ok") && (
                      <div style={{ padding: "9px 11px", fontSize: "11px", display: "grid", gap: "5px" }}>
                        {vistaPreviaClientes.validos
                          .filter(x => x.preventista_estado !== "ok")
                          .map((x, i) => (
                            <div key={`${x.codigo_cliente}-${i}`} style={{ color: x.preventista_estado === "sin_email" ? "#64748b" : "#b91c1c" }}>
                              {x.preventista_estado === "sin_email" && <>➖ <strong>{x.nombre}</strong>: sin email de preventista</>}
                              {x.preventista_estado === "no_reconocido" && <>❌ <strong>{x.nombre}</strong>: {x.email_preventista} no existe en esta empresa</>}
                              {x.preventista_estado === "rol_incorrecto" && <>❌ <strong>{x.nombre}</strong>: {x.email_preventista} existe, pero no tiene rol preventista</>}
                              {x.preventista_estado === "otra_empresa" && <>❌ <strong>{x.nombre}</strong>: el email pertenece a otra empresa</>}
                              {x.preventista_estado === "inactivo" && <>❌ <strong>{x.nombre}</strong>: {x.email_preventista} está inactivo</>}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {(vistaPreviaClientes.duplicados.length > 0 || vistaPreviaClientes.sinNombre.length > 0 || vistaPreviaClientes.sinDireccion.length > 0) && (
                    <div style={{ marginTop: "10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "9px", fontSize: "11px", maxHeight: "150px", overflowY: "auto" }}>
                      {vistaPreviaClientes.duplicados.map((x, i) => <div key={`dup-${i}`}>❌ Fila {x.fila}: {x.codigo || x.nombre} — duplicado</div>)}
                      {vistaPreviaClientes.sinNombre.map((x, i) => <div key={`nom-${i}`}>❌ Fila {x.fila}: falta nombre</div>)}
                      {vistaPreviaClientes.sinDireccion.map((x, i) => <div key={`dir-${i}`}>⚠️ Fila {x.fila}: {x.nombre} — sin dirección ni coordenadas</div>)}
                    </div>
                  )}

                  <div style={{ marginTop: "12px", background: "#f1f5f9", borderRadius: "8px", padding: "10px", fontSize: "12px", color: "#475569" }}>
                    🔒 Esta primera etapa es solamente de control. <strong>No existe todavía botón de guardar.</strong>
                  </div>

                  <button
                    type="button"
                    disabled={probandoGeo || vistaPreviaClientes.validos.length === 0}
                    onClick={probarGeoapifyPrimerCliente}
                    style={{ marginTop: "12px", width: "100%", padding: "11px", border: "none", borderRadius: "9px", background: probandoGeo ? "#94a3b8" : "#7c3aed", color: "#fff", fontWeight: "900", cursor: probandoGeo ? "wait" : "pointer" }}
                  >
                    {probandoGeo ? "🌍 GEOLOCALIZANDO CLIENTES..." : `2️⃣ GEOLOCALIZAR LOS ${vistaPreviaClientes.validos.length} CLIENTES`}
                  </button>

                  {resultadoGeo?.multiple && (
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "10px" }}>
                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "9px", textAlign: "center" }}>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Procesados</div>
                          <div style={{ fontSize: "20px", fontWeight: "900" }}>{resultadoGeo.total}</div>
                        </div>
                        <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "9px", textAlign: "center" }}>
                          <div style={{ fontSize: "11px", color: "#15803d" }}>✅ Confiables</div>
                          <div style={{ fontSize: "20px", fontWeight: "900", color: "#15803d" }}>{resultadoGeo.encontrados}</div>
                        </div>
                        <div style={{ background: "#fffbeb", borderRadius: "8px", padding: "9px", textAlign: "center" }}>
                          <div style={{ fontSize: "11px", color: "#b45309" }}>⚠️ Revisar</div>
                          <div style={{ fontSize: "20px", fontWeight: "900", color: "#b45309" }}>{resultadoGeo.revisar}</div>
                        </div>
                        <div style={{ background: "#fef2f2", borderRadius: "8px", padding: "9px", textAlign: "center" }}>
                          <div style={{ fontSize: "11px", color: "#dc2626" }}>❌ No encontrados</div>
                          <div style={{ fontSize: "20px", fontWeight: "900", color: "#dc2626" }}>{resultadoGeo.noEncontrados}</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                        {resultadoGeo.resultados.map((r, i) => (
                          <div key={`${r.cliente}-${i}`} style={{ border: `1px solid ${!r.ok ? "#fecaca" : r.revisar ? "#fde68a" : "#86efac"}`, background: !r.ok ? "#fef2f2" : r.revisar ? "#fffbeb" : "#f0fdf4", borderRadius: "9px", padding: "10px", fontSize: "12px" }}>
                            <div style={{ fontWeight: "900", color: !r.ok ? "#dc2626" : r.revisar ? "#b45309" : "#15803d" }}>
                              {!r.ok ? "❌" : r.revisar ? "⚠️ REVISAR" : "✅ CONFIABLE"} · {r.cliente}
                            </div>
                            <div style={{ marginTop: "4px" }}>🔎 {r.direccion}</div>
                            {r.ok ? (
                              <>
                                <div style={{ marginTop: "3px" }}>📍 {r.latitud}, {r.longitud}</div>
                                <div style={{ marginTop: "3px" }}>🗺️ {r.direccionEncontrada}</div>
                                {r.origen === "geoapify" && (
                                  <div style={{ marginTop: "2px", color: "#64748b", fontSize: "11px", lineHeight: "1.1" }}>
                                    Precisión informada: {Math.round((r.confianza || 0) * 100)}% · tipo: {r.tipoResultado || "sin dato"}
                                  </div>
                                )}
                                {r.ok && (
                                  <button
                                    type="button"
                                    onClick={() => abrirRevisionMapa(i)}
                                    style={{ marginTop: "8px", border: "none", borderRadius: "7px", padding: "7px 10px", background: "#2563eb", color: "#fff", fontSize: "11px", fontWeight: "900", cursor: "pointer" }}
                                  >
                                    🗺️ VER / CORREGIR EN MAPA
                                  </button>
                                )}
                                {r.aceptadoManualmente && (
                                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#15803d", fontWeight: "800" }}>
                                    👤 Ubicación revisada y aceptada manualmente
                                  </div>
                                )}
                              </>
                            ) : (
                              <div style={{ marginTop: "3px", color: "#b91c1c" }}>{r.mensaje}</div>
                            )}
                          </div>
                        ))}
                      </div>

                  {resumenImportacionAPB && (
                    <div style={{ marginTop: "12px", border: resumenImportacionAPB.listo ? "1px solid #86efac" : "1px solid #fcd34d", background: resumenImportacionAPB.listo ? "#f0fdf4" : "#fffbeb", borderRadius: "10px", padding: "12px" }}>
                      <div style={{ fontWeight: "900", fontSize: "13px", color: resumenImportacionAPB.listo ? "#166534" : "#92400e" }}>
                        {resumenImportacionAPB.listo ? `✅ TODOS LOS CLIENTES ESTÁN LISTOS — ${resumenImportacionAPB.cantidad} cliente(s) preparados` : "🔒 TODAVÍA HAY COSAS POR RESOLVER"}
                      </div>
                      {!resumenImportacionAPB.listo && (
                        <div style={{ marginTop: "7px", fontSize: "11px", color: "#92400e" }}>
                          {resumenImportacionAPB.motivos.map((m, i) => <div key={i} style={{ marginTop: "3px" }}>• {m}</div>)}
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={!resumenImportacionAPB.listo}
                        onClick={() => setPreConfirmacionImportacion(true)}
                        style={{ width: "100%", marginTop: "10px", border: "none", borderRadius: "8px", padding: "11px", fontWeight: "900", cursor: resumenImportacionAPB.listo ? "pointer" : "not-allowed", background: resumenImportacionAPB.listo ? "#16a34a" : "#cbd5e1", color: resumenImportacionAPB.listo ? "#fff" : "#64748b" }}
                      >
                        3️⃣ CONTINUAR A CARGA
                      </button>
                      <div style={{ marginTop: "7px", textAlign: "center", fontSize: "10px", color: "#64748b" }}>🔎 Vas a revisar exactamente qué se cargará antes de guardar. Todavía no se guardó nada.</div>
                    </div>
                  )}


                      <div style={{ marginTop: "10px", background: "#f1f5f9", borderRadius: "8px", padding: "9px", fontSize: "11px", color: "#475569" }}>
                        🔒 <strong>Todavía no se cargó ningún cliente en RutaComercio.</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
                  <div style={{ fontWeight: "800", fontSize: "13px", marginBottom: "8px" }}>Vista previa — todavía no se guardaron cambios</div>
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
                  ) : seccionActiva === "stock" ? (
            <div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontSize: "17px", fontWeight: "900", color: "#0f172a" }}>📊 Stock físico</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                      El Supervisor carga la planilla de existencias de su empresa. Primero revisá la vista previa. El stock se modifica únicamente cuando confirmás la importación.
                    </div>
                  </div>



                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={descargarPlantillaStock}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "9px",
                      padding: "12px 18px",
                      fontSize: "13px",
                      fontWeight: "900",
                      cursor: "pointer",
                      boxShadow: "0 4px 10px rgba(22,163,74,0.20)"
                    }}
                  >
                    📥 DESCARGAR PLANTILLA DE STOCK
                  </button>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: cargandoStockArchivo ? "#94a3b8" : "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: "9px",
                      padding: "12px 18px",
                      fontSize: "13px",
                      fontWeight: "900",
                      cursor: cargandoStockArchivo ? "wait" : "pointer",
                      boxShadow: "0 4px 10px rgba(37,99,235,0.20)"
                    }}
                  >
                    {cargandoStockArchivo ? "Leyendo planilla..." : "📥 CARGAR EXCEL DE STOCK"}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={cargarArchivoStock}
                      disabled={cargandoStockArchivo}
                      style={{ display: "none" }}
                    />
                  </label>
                  </div>
                </div>

                <div style={{ padding: "10px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1e3a8a", fontSize: "11px", lineHeight: 1.5, marginBottom: "12px" }}>
                  <strong>Importante:</strong> el stock bajo generará alertas, pero RutaComercio nunca bloqueará automáticamente un artículo. El bloqueo seguirá siendo una decisión manual del Supervisor.
                </div>

                {archivoStockNombre && (
                  <div style={{ fontSize: "12px", color: "#334155", marginBottom: "8px" }}>
                    <strong>Archivo:</strong> {archivoStockNombre}
                    {stockEncabezadoFila ? ` · Encabezados detectados en fila ${stockEncabezadoFila}` : ""}
                  </div>
                )}

                {stockMensaje && (
                  <div style={{ padding: "9px 10px", borderRadius: "7px", background: stockMensaje.startsWith("❌") ? "#fef2f2" : "#f0fdf4", border: stockMensaje.startsWith("❌") ? "1px solid #fecaca" : "1px solid #bbf7d0", color: stockMensaje.startsWith("❌") ? "#991b1b" : "#166534", fontSize: "11px", fontWeight: "700", marginBottom: "12px" }}>
                    {stockMensaje}
                  </div>
                )}

                {(() => {
                  // Fuente principal: stock_informado. Cada fila ya viene enriquecida
                  // con el producto real en cargarStockActualEmpresa().
                  const filasConStock = (stockActualEmpresa || []).map((fila) => ({
                    producto: fila.__producto || {
                      id: fila.producto_id,
                      codigo_cge: fila.codigo_archivo || "",
                      nombre: fila.descripcion_archivo || "Artículo",
                    },
                    fila,
                  }));

                  // Después agregamos los productos del catálogo que nunca tuvieron
                  // stock informado, para que sigan figurando como “No informado”.
                  const idsYaMostrados = new Set(
                    filasConStock.map(({ fila }) => String(fila.producto_id || "")).filter(Boolean)
                  );
                  const filasSinInformar = (productosStockCatalogo || [])
                    .filter(producto => !idsYaMostrados.has(String(producto.id)))
                    .map(producto => ({ producto, fila: null }));

                  const filasStock = [...filasConStock, ...filasSinInformar];

                  const q = busquedaStockActual.trim().toLowerCase();
                  const filtradas = filasStock.filter(({ producto, fila }) => {
                    if (!q) return true;
                    return [
                      producto?.codigo_lista,
                      producto?.codigo_cge,
                      fila?.codigo_archivo,
                      producto?.nombre,
                      producto?.descripcion,
                      fila?.descripcion_archivo,
                      producto?.marca,
                      fila?.color,
                      fila?.talle,
                    ].some(v => String(v || "").toLowerCase().includes(q));
                  });

                  const conStock = filasStock.filter(({ fila }) => fila && Number(fila.stock_informado ?? 0) > 0).length;
                  const sinStock = filasStock.filter(({ fila }) => fila && Number(fila.stock_informado ?? 0) <= 0).length;
                  const noInformado = filasStock.filter(({ fila }) => !fila).length;

                  return (
                    <div style={{ marginTop: "16px", border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ padding: "12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: "900", color: "#0f172a" }}>📦 Stock actual de artículos</div>
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Inventario de esta empresa. Se actualiza automáticamente mientras entran pedidos.</div>
                          </div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                            <input value={busquedaStockActual} onChange={e => setBusquedaStockActual(e.target.value)} placeholder="Buscar código, artículo, color o talle..." style={{ width: "280px", maxWidth: "70vw", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "7px", fontSize: "11px" }} />
                            <button type="button" onClick={cargarStockActualEmpresa} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "7px", background: "#fff", fontWeight: "800", cursor: "pointer" }}>↻ Actualizar</button>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "10px" }}>
                          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "8px 10px" }}><div style={{ fontSize: "9px", color: "#166534", fontWeight: "900" }}>CON STOCK</div><div style={{ fontSize: "19px", color: "#15803d", fontWeight: "900" }}>{conStock}</div></div>
                          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 10px" }}><div style={{ fontSize: "9px", color: "#991b1b", fontWeight: "900" }}>SIN STOCK</div><div style={{ fontSize: "19px", color: "#dc2626", fontWeight: "900" }}>{sinStock}</div></div>
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px" }}><div style={{ fontSize: "9px", color: "#475569", fontWeight: "900" }}>NO INFORMADO</div><div style={{ fontSize: "19px", color: "#475569", fontWeight: "900" }}>{noInformado}</div></div>
                        </div>
                      </div>
                      <div style={{ maxHeight: "380px", overflow: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", minWidth: "720px" }}>
                          <thead style={{ position: "sticky", top: 0, background: "#eef2ff", zIndex: 1 }}>
                            <tr>{["Código", "Artículo", "Color", "Talle", "Stock", "Actualizado"].map(h => <th key={h} style={{ textAlign: h === "Stock" ? "right" : "left", padding: "8px", borderBottom: "1px solid #cbd5e1" }}>{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {cargandoStockActual && filtradas.length === 0 ? (
                              <tr><td colSpan="6" style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>Cargando stock...</td></tr>
                            ) : filtradas.length === 0 ? (
                              <tr><td colSpan="6" style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>No hay artículos para mostrar.</td></tr>
                            ) : filtradas.map(({ producto, fila }, idx) => {
                              const cantidad = fila ? Number(fila.stock_informado ?? 0) : null;
                              const fecha = fila?.fecha_actualizacion;
                              const codigo = producto?.codigo_lista || producto?.codigo_cge || fila?.codigo_archivo || "—";
                              const nombre = producto?.nombre || producto?.descripcion || fila?.descripcion_archivo || "Artículo";
                              return (
                                <tr key={`${fila?.id || producto?.id || "fila"}-${idx}`} style={{ background: idx % 2 ? "#fff" : "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                                  <td style={{ padding: "8px", fontWeight: "800", whiteSpace: "nowrap" }}>{codigo}</td>
                                  <td style={{ padding: "8px" }}>{nombre}</td>
                                  <td style={{ padding: "8px" }}>{fila?.color || "—"}</td>
                                  <td style={{ padding: "8px" }}>{fila?.talle || "—"}</td>
                                  <td style={{ padding: "8px", textAlign: "right", fontWeight: "900", color: cantidad === null ? "#94a3b8" : cantidad <= 0 ? "#dc2626" : cantidad <= 5 ? "#d97706" : "#15803d" }}>{cantidad === null ? "No informado" : cantidad.toLocaleString("es-AR")}</td>
                                  <td style={{ padding: "8px", color: "#64748b", whiteSpace: "nowrap" }}>{fecha ? new Date(fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {stockVistaPrevia.length > 0 && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", marginBottom: "12px" }}>
                      {[
                        ["Código", stockColumnas.codigo],
                        ["Artículo / descripción", stockColumnas.descripcion],
                        ["Stock", stockColumnas.stock],
                      ].map(([etiqueta, valor]) => (
                        <div key={etiqueta} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "9px 10px" }}>
                          <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "800" }}>{etiqueta.toUpperCase()}</div>
                          <div style={{ fontSize: "12px", color: valor ? "#0f172a" : "#dc2626", fontWeight: "800", marginTop: "2px" }}>
                            {valor || "No detectada"}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px", marginBottom: "12px" }}>
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "11px" }}>
                        <div style={{ fontSize: "10px", color: "#166534", fontWeight: "900" }}>✅ RECONOCIDOS AUTOMÁTICAMENTE</div>
                        <div style={{ fontSize: "24px", color: "#15803d", fontWeight: "900", marginTop: "2px" }}>{stockReconocidos.length}</div>
                        <div style={{ fontSize: "10px", color: "#166534" }}>Ya tienen equivalencia guardada para esta empresa.</div>
                      </div>
                      <div style={{ background: stockNoReconocidos.length ? "#fff7ed" : "#f8fafc", border: stockNoReconocidos.length ? "1px solid #fed7aa" : "1px solid #e2e8f0", borderRadius: "8px", padding: "11px" }}>
                        <div style={{ fontSize: "10px", color: stockNoReconocidos.length ? "#9a3412" : "#475569", fontWeight: "900" }}>⚠️ SIN RECONOCER</div>
                        <div style={{ fontSize: "24px", color: stockNoReconocidos.length ? "#c2410c" : "#475569", fontWeight: "900", marginTop: "2px" }}>{stockNoReconocidos.length}</div>
                        <div style={{ fontSize: "10px", color: stockNoReconocidos.length ? "#9a3412" : "#64748b" }}>Todavía no tienen equivalencia para esta empresa.</div>
                      </div>
                    </div>

                    {analizandoStock && (
                      <div style={{ marginBottom: "10px", fontSize: "11px", color: "#2563eb", fontWeight: "800" }}>Buscando equivalencias de esta empresa...</div>
                    )}

                    {stockReconocidos.length > 0 && (
                      <div style={{ marginBottom: "12px", overflowX: "auto", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                        <div style={{ padding: "8px 10px", background: "#f0fdf4", color: "#166534", fontSize: "11px", fontWeight: "900" }}>Productos reconocidos</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px", fontSize: "11px" }}>
                          <thead><tr style={{ background: "#f8fafc" }}>
                            <th style={{ textAlign: "left", padding: "8px" }}>Código Excel</th>
                            <th style={{ textAlign: "left", padding: "8px" }}>CGE</th>
                            <th style={{ textAlign: "left", padding: "8px" }}>Producto RutaComercio</th>
                            <th style={{ textAlign: "left", padding: "8px" }}>Color</th>
                            <th style={{ textAlign: "left", padding: "8px" }}>Talle</th>
                            <th style={{ textAlign: "right", padding: "8px" }}>Stock informado</th>
                          </tr></thead>
                          <tbody>
                            {stockReconocidos.slice(0, 30).map((item, idx) => (
                              <tr key={idx} style={{ borderTop: "1px solid #dcfce7" }}>
                                <td style={{ padding: "8px", fontWeight: "800" }}>{item.codigoArchivo || "—"}</td>
                                <td style={{ padding: "8px" }}>{item.codigo_cge || "—"}</td>
                                <td style={{ padding: "8px" }}>{item.producto_nombre || "—"}{item.marca ? ` · ${item.marca}` : ""}</td>
                                <td style={{ padding: "8px", fontWeight: "800" }}>{item.color || "—"}</td>
                                <td style={{ padding: "8px", fontWeight: "800" }}>{item.talle || "—"}</td>
                                <td style={{ padding: "8px", textAlign: "right", fontWeight: "900" }}>{item.stock ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {stockNoReconocidos.length > 0 && (
                      <div style={{ marginBottom: "12px", border: "1px solid #fed7aa", borderRadius: "8px", overflow: "hidden" }}>
                        <div style={{ padding: "9px 10px", background: "#fff7ed", color: "#9a3412", fontSize: "11px", fontWeight: "900" }}>
                          ⚠️ Productos no encontrados en el catálogo de esta empresa
                        </div>
                        <div style={{ padding: "10px", background: "#fff", display: "flex", flexDirection: "column", gap: "7px" }}>
                          {stockNoReconocidos.slice(0, 50).map((item, idx) => (
                            <div key={`${item.codigoArchivo}-${idx}`} style={{ display: "grid", gridTemplateColumns: "minmax(100px, 0.5fr) minmax(220px, 2fr) minmax(80px, 0.5fr)", gap: "8px", alignItems: "center", padding: "9px 10px", border: "1px solid #e2e8f0", borderRadius: "7px", background: "#f8fafc" }}>
                              <div>
                                <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "800" }}>CÓDIGO EXCEL</div>
                                <div style={{ fontSize: "12px", fontWeight: "900" }}>{item.codigoArchivo || "—"}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "800" }}>ARTÍCULO</div>
                                <div style={{ fontSize: "12px", fontWeight: "700" }}>{item.descripcionArchivo || "—"}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "800" }}>STOCK</div>
                                <div style={{ fontSize: "13px", fontWeight: "900", color: item.stock === null ? "#dc2626" : "#0f172a" }}>{item.stock ?? "No válido"}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: "10px", background: "#fffbeb", borderTop: "1px solid #fed7aa" }}>
                          <div style={{ fontSize: "11px", fontWeight: "900", color: "#92400e", marginBottom: "6px" }}>
                            Revisión antes de incorporar productos nuevos
                          </div>
                          <div style={{ fontSize: "10px", color: "#92400e", lineHeight: 1.5, marginBottom: "9px" }}>
                            Estos artículos no existen actualmente en el catálogo de esta empresa. RutaComercio puede prepararlos como productos nuevos, pero todavía no crea nada, no genera CGE y no modifica stock.
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {productosNuevosPropuestos.map((p, idx) => (
                              <label key={`${p.codigo_archivo}-${idx}`} style={{ display: "grid", gridTemplateColumns: "28px 90px minmax(220px,1fr) 80px", gap: "7px", alignItems: "center", padding: "7px 8px", background: "#fff", border: "1px solid #fde68a", borderRadius: "7px" }}>
                                <input
                                  type="checkbox"
                                  checked={p.crear}
                                  onChange={e => setProductosNuevosPropuestos(prev => prev.map((x, i) => i === idx ? { ...x, crear: e.target.checked } : x))}
                                />
                                <span style={{ fontSize: "10px", fontWeight: "900" }}>{p.codigo_archivo || "—"}</span>
                                <span style={{ fontSize: "10px", fontWeight: "700" }}>{p.nombre || "Sin descripción"}</span>
                                <span style={{ fontSize: "10px", textAlign: "right", fontWeight: "900" }}>{p.stock ?? "—"} u.</span>
                              </label>
                            ))}
                          </div>

                          <div style={{ marginTop: "9px", padding: "8px 9px", borderRadius: "7px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: "10px", lineHeight: 1.45 }}>
                            Seleccionados para una futura incorporación: <strong>{productosNuevosPropuestos.filter(p => p.crear).length}</strong>. El Supervisor puede desmarcar cualquier fila que no quiera incorporar. El CGE se generará recién al confirmar la importación.
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: "12px", padding: "10px 12px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #cbd5e1" }}>
                      <div style={{ fontSize: "11px", fontWeight: "900", color: "#0f172a" }}>Estado de esta importación</div>
                      <div style={{ marginTop: "4px", fontSize: "10px", color: "#475569", lineHeight: 1.5 }}>
                        ✅ Reconocidos: <strong>{stockReconocidos.length}</strong> ·
                        🆕 Nuevos propuestos: <strong>{productosNuevosPropuestos.filter(p => p.crear).length}</strong> ·
                        ⛔ Excluidos por el Supervisor: <strong>{productosNuevosPropuestos.filter(p => !p.crear).length}</strong>
                      </div>
                      <div style={{ marginTop: "5px", fontSize: "10px", color: "#b45309", fontWeight: "800" }}>
                        Modo revisión: todavía NO se crean productos, NO se generan CGE y NO se actualiza stock.
                      </div>
                    </div>

                    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "650px", fontSize: "11px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Fila</th>
                            <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Código</th>
                            <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Artículo</th>
                            <th style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockVistaPrevia.slice(0, 30).map((fila, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{fila.__fila}</td>
                              <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", fontWeight: "700" }}>{stockColumnas.codigo ? String(fila[stockColumnas.codigo] ?? "") : "—"}</td>
                              <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>{stockColumnas.descripcion ? String(fila[stockColumnas.descripcion] ?? "") : "—"}</td>
                              <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontWeight: "800" }}>{stockColumnas.stock ? String(fila[stockColumnas.stock] ?? "") : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: "14px", padding: "14px", border: "1px solid #bbf7d0", borderRadius: "9px", background: "#f0fdf4" }}>
                      <div style={{ fontSize: "11px", color: "#166534", fontWeight: "900", marginBottom: "8px" }}>
                        Todo listo para confirmar
                      </div>
                      <div style={{ fontSize: "10px", color: "#166534", lineHeight: 1.5, marginBottom: "10px" }}>
                        Se procesarán <strong>{stockReconocidos.length + productosNuevosPropuestos.filter(p => p.crear).length}</strong> productos. Los nuevos seleccionados recibirán su CGE al confirmar.
                      </div>
                      <button
                        type="button"
                        onClick={confirmarImportacionStock}
                        disabled={confirmandoImportacionStock || (stockReconocidos.length + productosNuevosPropuestos.filter(p => p.crear).length === 0)}
                        style={{ width: "100%", padding: "13px 16px", border: "none", borderRadius: "8px", background: confirmandoImportacionStock ? "#94a3b8" : "#16a34a", color: "#fff", fontSize: "13px", fontWeight: "900", cursor: confirmandoImportacionStock ? "wait" : "pointer", boxShadow: "0 4px 10px rgba(22,163,74,0.20)" }}
                      >
                        {confirmandoImportacionStock ? "⏳ GUARDANDO IMPORTACIÓN..." : "✅ CONFIRMAR IMPORTACIÓN"}
                      </button>
                    </div>

                    <div style={{ marginTop: "10px", fontSize: "10px", color: "#64748b" }}>
                      Vista previa de hasta 30 filas en pantalla. El stock solo se modifica después de confirmar.
                    </div>
                  </>
                )}
              </div>
            </div>
                  ) : seccionActiva === "disponibilidad" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "#0f172a" }}>📦 Disponibilidad operativa</h2>
                <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
                  No reemplaza el stock del depósito. Resume lo pedido hoy y permite advertir o bloquear artículos temporalmente.
                </p>
              </div>
              <button type="button" onClick={cargarDisponibilidadArticulos} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 14px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>
                🔄 Actualizar
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "9px", marginBottom: "14px" }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}><div style={{ fontSize: "10px", color: "#64748b", fontWeight: "800" }}>ARTÍCULOS</div><div style={{ fontSize: "22px", fontWeight: "900" }}>{disponibilidadArticulos.length}</div></div>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "10px", padding: "12px" }}><div style={{ fontSize: "10px", color: "#9a3412", fontWeight: "800" }}>STOCK CRÍTICO</div><div style={{ fontSize: "22px", fontWeight: "900", color: "#c2410c" }}>{disponibilidadArticulos.filter(p => p.estado === "critico").length}</div></div>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px" }}><div style={{ fontSize: "10px", color: "#991b1b", fontWeight: "800" }}>BLOQUEADOS</div><div style={{ fontSize: "22px", fontWeight: "900", color: "#dc2626" }}>{disponibilidadArticulos.filter(p => p.estado === "bloqueado").length}</div></div>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px" }}><div style={{ fontSize: "10px", color: "#1e40af", fontWeight: "800" }}>UNIDADES PEDIDAS HOY</div><div style={{ fontSize: "22px", fontWeight: "900", color: "#2563eb" }}>{disponibilidadArticulos.reduce((a,p) => a + Number(p.pedidosHoy || 0), 0)}</div></div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
              <input value={busquedaDisponibilidad} onChange={e => setBusquedaDisponibilidad(e.target.value)} placeholder="🔍 Buscar artículo, marca o código CGE..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }} />
            </div>

            {cargandoDisponibilidad ? (
              <div style={{ padding: "35px", textAlign: "center", color: "#64748b" }}>⏳ Cargando disponibilidad...</div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                {disponibilidadArticulos
                  .filter(p => {
                    const q = busquedaDisponibilidad.trim().toLowerCase();
                    return !q || [p.nombre, p.marca, p.codigo_cge].some(v => String(v || "").toLowerCase().includes(q));
                  })
                  .sort((a,b) => Number(b.pedidosHoy || 0) - Number(a.pedidosHoy || 0) || String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"))
                  .map(p => (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) 110px minmax(280px, 1.4fr)", gap: "10px", alignItems: "center", padding: "11px 12px", borderBottom: "1px solid #f1f5f9" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "900", color: "#0f172a" }}>{p.nombre || "Artículo"}</div>
                        <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{p.codigo_cge || "Sin CGE"}{p.marca ? ` · ${p.marca}` : ""}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: "900", color: Number(p.pedidosHoy) > 0 ? "#2563eb" : "#94a3b8" }}>{p.pedidosHoy}</div>
                        <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "800" }}>PEDIDAS HOY</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "5px" }}>
                        {[
                          ["disponible", "🟢 Disponible"],
                          ["critico", "🟠 Crítico"],
                          ["bloqueado", "🔴 Bloqueado"],
                        ].map(([estado, etiqueta]) => (
                          <button key={estado} type="button" onClick={() => cambiarEstadoDisponibilidad(p, estado)} style={{ padding: "7px 5px", borderRadius: "7px", border: p.estado === estado ? "2px solid #2563eb" : "1px solid #cbd5e1", background: p.estado === estado ? "#eff6ff" : "#fff", color: "#334155", fontSize: "10px", fontWeight: "800", cursor: "pointer" }}>{etiqueta}</button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
         ) : seccionActiva === "clientes" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "#0f172a" }}>🏪 Clientes</h2>
                <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>Padrón de comercios de la empresa e importación masiva.</p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setMostrarAsignacionClientes(prev => !prev)}
                  style={{ backgroundColor: "#0f766e", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 14px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}
                >
                  👤 ASIGNAR PREVENTISTA
                </button>
                <button
                  type="button"
                  onClick={() => { setModalImportacionClientes(true); setVistaPreviaClientes(null); setArchivoClientesNombre(""); setArchivoClientesTieneEncabezados(true); setResultadoGeo(null); }}
                  style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 14px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}
                >
                  📥 IMPORTAR CLIENTES
                </button>
              </div>
            </div>

            {mostrarAsignacionClientes && (
              <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
                <div style={{ fontSize: "15px", fontWeight: "900", color: "#134e4a", marginBottom: "10px" }}>👤 Asignar / reasignar preventista</div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "10px" }}>
                  <select
                    value={preventistaAsignacion}
                    onChange={(e) => setPreventistaAsignacion(e.target.value)}
                    style={{ minWidth: "220px", padding: "9px", border: "1px solid #94a3b8", borderRadius: "8px", background: "#fff", fontWeight: "700" }}
                  >
                    <option value="">Elegir preventista...</option>
                    {listaPreventistas.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setClientesSeleccionadosAsignacion((comercios || []).map(c => c.id))}
                    style={{ padding: "9px 12px", border: "1px solid #0f766e", borderRadius: "8px", background: "#fff", color: "#0f766e", fontWeight: "800", cursor: "pointer" }}
                  >
                    ☑ Seleccionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientesSeleccionadosAsignacion([])}
                    style={{ padding: "9px 12px", border: "1px solid #94a3b8", borderRadius: "8px", background: "#fff", color: "#475569", fontWeight: "800", cursor: "pointer" }}
                  >
                    Limpiar
                  </button>
                  <strong style={{ fontSize: "12px", color: "#475569" }}>{clientesSeleccionadosAsignacion.length} seleccionado(s)</strong>
                </div>
                <div style={{ maxHeight: "310px", overflowY: "auto", background: "#fff", border: "1px solid #ccfbf1", borderRadius: "8px", padding: "6px", marginBottom: "10px" }}>
                  {(comercios || []).length === 0 ? (
                    <div style={{ padding: "10px", color: "#64748b", fontSize: "12px" }}>No hay clientes cargados.</div>
                  ) : (comercios || []).map((c) => {
                    const marcado = clientesSeleccionadosAsignacion.some(id => String(id) === String(c.id));
                    return (
                      <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "9px", padding: "8px", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => setClientesSeleccionadosAsignacion(prev => marcado ? prev.filter(id => String(id) !== String(c.id)) : [...prev, c.id])}
                        />
                        <span style={{ flex: 1, fontSize: "12px", fontWeight: "800", color: "#0f172a" }}>{c.nombre || "Cliente sin nombre"}</span>
                        <span style={{ fontSize: "11px", color: c.preventista ? "#475569" : "#b45309" }}>{c.preventista || "Sin asignar"}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={guardandoAsignacionMasiva || !preventistaAsignacion || clientesSeleccionadosAsignacion.length === 0}
                  onClick={guardarAsignacionMasivaClientes}
                  style={{ width: "100%", padding: "11px", border: "none", borderRadius: "8px", background: (!preventistaAsignacion || clientesSeleccionadosAsignacion.length === 0) ? "#94a3b8" : "#0f766e", color: "#fff", fontWeight: "900", cursor: (!preventistaAsignacion || clientesSeleccionadosAsignacion.length === 0) ? "not-allowed" : "pointer" }}
                >
                  {guardandoAsignacionMasiva ? "⏳ ASIGNANDO..." : `👤 ASIGNAR ${clientesSeleccionadosAsignacion.length} CLIENTE${clientesSeleccionadosAsignacion.length === 1 ? "" : "S"}`}
                </button>
              </div>
            )}

            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "#92400e", marginBottom: "8px" }}>🟡 Clientes nuevos pendientes de validación ({clientesPendientesValidacion.length})</div>
              {clientesPendientesValidacion.length === 0 ? (
                <div style={{ color: "#64748b", fontSize: "12px" }}>No hay clientes nuevos pendientes.</div>
              ) : clientesPendientesValidacion.map((c) => (
                <div key={c.id} style={{ background: "#fff", border: "1px solid #fde68a", borderRadius: "9px", padding: "11px", marginTop: "8px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "900", color: "#0f172a" }}>🏪 {c.nombre || "Comercio sin nombre"}</div>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>👤 Preventista: <strong>{c.preventista || "Sin informar"}</strong></div>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px" }}>📍 {c.direccion || "Sin dirección cargada"}</div>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px" }}>📞 {c.telefono || c.whatsapp || "Sin teléfono cargado"}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>{c.created_at ? new Date(c.created_at).toLocaleString("es-AR") : ""}</div>
                  <button type="button" onClick={() => validarClienteNuevo(c)} style={{ marginTop: "9px", padding: "8px 13px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "900", cursor: "pointer" }}>✅ VALIDAR CLIENTE</button>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "800" }}>Clientes cargados actualmente</div>
                  <div style={{ fontSize: "28px", fontWeight: "900", marginTop: "3px" }}>{comercios.length}</div>
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                  Abrí un cliente para cambiar preventista o día de visita.
                </div>
              </div>

              {(comercios || []).length === 0 ? (
                <div style={{ padding: "18px", textAlign: "center", color: "#64748b", fontSize: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  No hay clientes cargados todavía.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "8px" }}>
                  {[...(comercios || [])]
                    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"))
                    .map((c) => (
                      <div key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            const yaAbierto = comercioDetalleModal?.id === c.id;
                            if (yaAbierto) {
                              setComercioDetalleModal(null);
                              return;
                            }
                            setComercioFoco(c);
                            setComercioDetalleModal(c);
                            setEditPrevFicha(c.preventista || "");
                            setEditDiaFicha(c.dia_visita ? String(c.dia_visita).trim().toUpperCase() : "");
                            prepararEdicionCliente(c);
                            setMsgExitoFicha(false);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: comercioDetalleModal?.id === c.id ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            background: "#f8fafc",
                            borderRadius: "9px",
                            padding: "11px 12px",
                            cursor: "pointer"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: "13px", fontWeight: "900", color: "#0f172a" }}>🏪 {c.nombre || "Cliente sin nombre"}</div>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                                👤 {c.preventista || "Sin preventista"} · 🗓️ {c.dia_visita || "Sin día asignado"}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>📍 {c.direccion || "Sin dirección"}</div>
                            </div>
                            <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "900", whiteSpace: "nowrap" }}>
                              {comercioDetalleModal?.id === c.id ? "CERRAR EDICIÓN ▲" : "ABRIR / EDITAR ›"}
                            </div>
                          </div>
                        </button>

                        {comercioDetalleModal?.id === c.id && (
                          <div style={{ marginTop: "6px", padding: "14px", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "9px" }}>
                            <div style={{ fontSize: "13px", fontWeight: "900", color: "#1e3a8a", marginBottom: "12px" }}>✏️ Ficha completa del cliente</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
                              {[
                                ["codigo_cliente", "Código de cliente (opcional)"], ["razon_social", "Razón social"], ["nombre", "Nombre comercial *"],
                                ["direccion", "Dirección comercial"], ["domicilio_fiscal", "Domicilio fiscal"], ["localidad", "Localidad"],
                                ["partido", "Partido"], ["provincia", "Provincia / Estado"], ["codigo_postal", "Código postal"], ["pais", "País"],
                                ["telefono", "Teléfono"], ["whatsapp", "WhatsApp"], ["contacto", "Nombre de contacto"], ["cuit", "CUIT"],
                                ["condicion_fiscal", "Condición fiscal"], ["email", "Email del cliente"]
                              ].map(([campo, etiqueta]) => (
                                <div key={campo}>
                                  <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>{etiqueta.toUpperCase()}</label>
                                  <input value={editClienteDatos[campo] || ""} onChange={(e) => setEditClienteDatos(prev => ({ ...prev, [campo]: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", padding: "8px", borderRadius: "7px", border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a" }} />
                                </div>
                              ))}
                              <div>
                                <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>👤 PREVENTISTA</label>
                                <select value={editPrevFicha || ""} onChange={(e) => setEditPrevFicha(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a" }}>
                                  <option value="">Sin preventista</option>
                                  {listaPreventistas.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>🗓️ DÍA DE VISITA</label>
                                <select value={editDiaFicha || ""} onChange={(e) => setEditDiaFicha(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a" }}>
                                  <option value="">Sin día asignado</option>
                                  {["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                              </div>
                            </div>
                            <div style={{ marginTop: "10px" }}>
                              <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>NOTAS</label>
                              <textarea value={editClienteDatos.notas || ""} onChange={(e) => setEditClienteDatos(prev => ({ ...prev, notas: e.target.value }))} rows={3} style={{ width: "100%", boxSizing: "border-box", padding: "8px", borderRadius: "7px", border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", resize: "vertical" }} />
                            </div>
                            <div style={{ marginTop: "10px", padding: "8px 10px", borderRadius: "7px", background: "#fff", border: "1px solid #dbeafe", fontSize: "11px", color: "#475569" }}>
                              📍 Ubicación en mapa: {Number.isFinite(Number(c.latitud)) && Number.isFinite(Number(c.longitud)) ? "registrada" : "sin ubicación registrada"}. Las coordenadas se administran desde el mapa para evitar modificaciones accidentales.
                            </div>
                            <button type="button" onClick={guardarFichaCompletaCliente} disabled={guardandoFicha} style={{ width: "100%", marginTop: "12px", padding: "10px", border: "none", borderRadius: "7px", background: guardandoFicha ? "#94a3b8" : "#2563eb", color: "#fff", fontWeight: "900", cursor: guardandoFicha ? "not-allowed" : "pointer" }}>
                              {guardandoFicha ? "GUARDANDO..." : "💾 GUARDAR FICHA DEL CLIENTE"}
                            </button>
                            {msgExitoFicha && <div style={{ marginTop: "7px", textAlign: "center", color: "#16a34a", fontSize: "11px", fontWeight: "900" }}>✅ Datos del cliente guardados correctamente</div>}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
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
                  <div style={{ fontSize: "12px", marginTop: "2px", color: "#475569", fontSize: "12px", lineHeight: "1.15" }}>👤 Preventista: <strong>{solicitud.preventista || "Sin informar"}</strong></div>
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
                <div key={solicitud.id} style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) minmax(130px,1fr) minmax(180px,2fr) 110px", gap: "8px", alignItems: "center", padding: "9px 4px", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
                  <div><strong>{solicitud.comercio_nombre}</strong></div>
                  <div style={{ color: "#475569" }}>{solicitud.preventista || "Sin informar"}</div>
                  <div style={{ color: "#64748b" }}>{solicitud.motivo || "Sin motivo"}</div>
                  <div style={{ fontWeight: "900", color: solicitud.estado === "aprobada" ? "#16a34a" : "#dc2626" }}>{solicitud.estado === "aprobada" ? "✅ APROBADA" : "❌ RECHAZADA"}</div>
                </div>
              ))}
            </div>
          </div>
        ) : seccionActiva === "listasPrecios" ? (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "#0f172a" }}>💲 Listas de Precios</h2>
              <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
                Administrá y actualizá la lista de precios de tu empresa.
              </p>
            </div>

            <div style={{ maxWidth: "720px", margin: "0 auto 14px" }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px" }}>
                <div style={{ fontSize: "14px", fontWeight: "900", color: "#0f172a" }}>📋 Listas actuales de la empresa</div>
                <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b" }}>
                  Elegí cuál querés actualizar con el nuevo archivo.
                </div>

                {cargandoListasPrecios ? (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>⏳ Cargando listas...</div>
                ) : listasPreciosEmpresa.length === 0 ? (
                  <div style={{ marginTop: "10px", padding: "10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "11px", color: "#92400e" }}>
                    ⚠️ Esta empresa todavía no tiene una lista de precios activa.
                  </div>
                ) : (
                  <div style={{ marginTop: "10px", display: "grid", gap: "7px" }}>
                    {listasPreciosEmpresa.map((lista) => {
                      const seleccionada = listaPreciosSeleccionadaId === lista.id;
                      return (
                        <label key={lista.id} style={{
                          display: "flex", alignItems: "center", gap: "9px", padding: "10px",
                          border: seleccionada ? "2px solid #2563eb" : "1px solid #e2e8f0",
                          borderRadius: "9px", background: seleccionada ? "#eff6ff" : "#fff", cursor: "pointer"
                        }}>
                          <input
                            type="radio"
                            name="listaPrecioActual"
                            checked={seleccionada}
                            onChange={() => setListaPreciosSeleccionadaId(lista.id)}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "12px", fontWeight: "900", color: "#0f172a" }}>
                              {lista.nombre || lista.codigo || "Lista sin nombre"}
                              {lista.predeterminada ? " ⭐ Predeterminada" : ""}
                            </div>
                            <div style={{ marginTop: "2px", fontSize: "10px", color: "#64748b" }}>
                              {lista.codigo ? `Código: ${lista.codigo}` : "Sin código"}
                              {lista.descripcion ? ` · ${lista.descripcion}` : ""}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", maxWidth: "720px", margin: "0 auto" }}>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a" }}>
                💲 Cargar nueva lista de precios
              </div>
              <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
                Identificá la nueva lista antes de cargar el archivo.
              </div>

              <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: "#334155" }}>
                  N.º de lista <span style={{ fontWeight: "500", color: "#94a3b8" }}>(opcional)</span>
                  <input value={numeroListaPrecios} onChange={e => setNumeroListaPrecios(e.target.value)}
                    placeholder="Ej.: 12"
                    style={{ width: "100%", marginTop: "5px", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }} />
                </label>

                <label style={{ fontSize: "12px", fontWeight: "800", color: "#334155" }}>
                  Vigente desde <span style={{ color: "#dc2626" }}>*</span>
                  <input type="date" value={vigenciaListaPrecios} onChange={e => setVigenciaListaPrecios(e.target.value)}
                    style={{ width: "100%", marginTop: "5px", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }} />
                </label>

                <label style={{ fontSize: "12px", fontWeight: "800", color: "#334155" }}>
                  Descripción <span style={{ fontWeight: "500", color: "#94a3b8" }}>(opcional)</span>
                  <input value={descripcionListaPrecios} onChange={e => setDescripcionListaPrecios(e.target.value)}
                    placeholder="Ej.: Lista Octubre 2026"
                    style={{ width: "100%", marginTop: "5px", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }} />
                </label>
              </div>

              <div style={{ marginTop: "16px", padding: "12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", textAlign: "center" }}>
                <div style={{ fontWeight: "900", fontSize: "12px", color: "#1e40af" }}>¿Primera vez?</div>
                <div style={{ marginTop: "3px", fontSize: "12px", color: "#475569" }}>
                  Descargá la plantilla oficial y completala con los productos de tu empresa.
                </div>
                <button
                  type="button"
                  onClick={descargarPlantillaListaPrecios}
                  style={{ marginTop: "10px", width: "100%", padding: "10px 12px", border: "1px solid #16a34a", borderRadius: "8px", background: "#f0fdf4", color: "#166534", fontWeight: "900", cursor: "pointer" }}
                >
                  📥 DESCARGAR PLANTILLA DE LISTA DE PRECIOS
                </button>
                <div style={{ marginTop: "7px", fontSize: "10px", color: "#64748b" }}>
                  Obligatorios: código, descripción y precio · Opcionales: GTIN y marca
                </div>
              </div>

              <input
                ref={inputArchivoListaPreciosRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={leerArchivoListaPrecios}
                style={{ display: "none" }}
              />

              <button
                type="button"
                onClick={() => inputArchivoListaPreciosRef.current?.click()}
                style={{ marginTop: "16px", width: "100%", padding: "12px", border: "none", borderRadius: "9px", background: "#2563eb", color: "#fff", fontWeight: "900", cursor: "pointer" }}
              >
                1️⃣ ELEGIR ARCHIVO EXCEL / CSV
              </button>

              {archivoListaPreciosNombre && (
                <div style={{ marginTop: "8px", fontSize: "11px", color: "#475569" }}>
                  📄 Archivo: <strong>{archivoListaPreciosNombre}</strong>
                </div>
              )}

              {vistaPreviaListaPrecios && (
                <div style={{ marginTop: "14px", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", background: "#f8fafc" }}>
                  <div style={{ fontWeight: "900", color: "#0f172a" }}>2️⃣ REVISAR ARTÍCULOS</div>
                  <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", textAlign: "center" }}>
                    <div style={{ background: "#fff", borderRadius: "8px", padding: "9px" }}>
                      <div style={{ fontSize: "18px", fontWeight: "900" }}>{vistaPreviaListaPrecios.total}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>Encontrados</div>
                    </div>
                    <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "9px" }}>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: "#166534" }}>{vistaPreviaListaPrecios.validos.length}</div>
                      <div style={{ fontSize: "10px", color: "#166534" }}>Correctos</div>
                    </div>
                    <div style={{ background: vistaPreviaListaPrecios.conProblemas.length ? "#fef2f2" : "#f0fdf4", borderRadius: "8px", padding: "9px" }}>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: vistaPreviaListaPrecios.conProblemas.length ? "#b91c1c" : "#166534" }}>{vistaPreviaListaPrecios.conProblemas.length}</div>
                      <div style={{ fontSize: "10px", color: vistaPreviaListaPrecios.conProblemas.length ? "#b91c1c" : "#166534" }}>Con problemas</div>
                    </div>
                  </div>

                  {vistaPreviaListaPrecios.conProblemas.length > 0 && (
                    <div style={{ marginTop: "10px", padding: "10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", fontSize: "11px" }}>
                      <strong>⚠️ Revisar antes de continuar:</strong>
                      {vistaPreviaListaPrecios.conProblemas.slice(0, 8).map((p) => (
                        <div key={p.fila} style={{ marginTop: "4px" }}>
                          Fila {p.fila}: {p.errores.join(" · ")}
                        </div>
                      ))}
                    </div>
                  )}

                  {vistaPreviaListaPrecios.conProblemas.length === 0 && (
                    <div style={{ marginTop: "10px", padding: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "11px", color: "#166534", fontWeight: "800" }}>
                      ✅ Archivo reconocido correctamente. Todavía no se modificó ningún precio.
                    </div>
                  )}

                  {vistaPreviaListaPrecios.conProblemas.length === 0 && (
                    <button
                      type="button"
                      onClick={compararListaPreciosActual}
                      disabled={comparandoListaPrecios || (!listaPreciosSeleccionadaId && listasPreciosEmpresa.length > 0)}
                      style={{
                        marginTop: "10px", width: "100%", padding: "11px",
                        border: "none", borderRadius: "8px",
                        background: comparandoListaPrecios ? "#94a3b8" : "#7c3aed",
                        color: "#fff", fontWeight: "900",
                        cursor: comparandoListaPrecios ? "wait" : "pointer"
                      }}
                    >
                      {comparandoListaPrecios ? "⏳ COMPARANDO..." : (listasPreciosEmpresa.length === 0 ? "🚀 PREPARAR PRIMERA LISTA" : "🔎 COMPARAR CON LA LISTA ACTUAL")}
                    </button>
                  )}

                  {comparacionListaPrecios && (
                    <div style={{ marginTop: "12px", padding: "12px", background: "#fff", border: "1px solid #ddd6fe", borderRadius: "10px" }}>
                      <div style={{ fontWeight: "900", color: "#4c1d95" }}>🔎 Resultado de la comparación</div>
                      <div style={{ marginTop: "4px", fontSize: "10px", color: "#64748b" }}>
                        📋 Comparando contra: <strong>{comparacionListaPrecios.nombreLista}</strong>
                      </div>
                      <div style={{ marginTop: "3px", fontSize: "10px", color: "#64748b" }}>
                        Lista actual: {comparacionListaPrecios.totalActual} artículo(s) ·
                        Códigos actuales detectados: {comparacionListaPrecios.codigosActuales} ·
                        Archivo nuevo: {vistaPreviaListaPrecios.validos.length}
                      </div>
                      <div style={{ marginTop: "3px", fontSize: "10px", color: "#64748b" }}>
                        Coincidencias encontradas: {comparacionListaPrecios.coincidenciasCodigo} por código
                        {comparacionListaPrecios.coincidenciasGtin > 0 ? ` · ${comparacionListaPrecios.coincidenciasGtin} por GTIN` : ""}
                      </div>

                      <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "7px", textAlign: "center" }}>
                        <div style={{ padding: "9px 4px", background: "#f8fafc", borderRadius: "8px" }}>
                          <div style={{ fontSize: "18px", fontWeight: "900" }}>{comparacionListaPrecios.sinCambios.length}</div>
                          <div style={{ fontSize: "9px", color: "#64748b" }}>➖ Sin cambios</div>
                        </div>
                        <div style={{ padding: "9px 4px", background: "#eff6ff", borderRadius: "8px" }}>
                          <div style={{ fontSize: "18px", fontWeight: "900", color: "#1d4ed8" }}>{comparacionListaPrecios.precioCambiado.length}</div>
                          <div style={{ fontSize: "9px", color: "#1d4ed8" }}>💲 Precio nuevo</div>
                        </div>
                        <div style={{ padding: "9px 4px", background: "#f0fdf4", borderRadius: "8px" }}>
                          <div style={{ fontSize: "18px", fontWeight: "900", color: "#166534" }}>{comparacionListaPrecios.nuevos.length}</div>
                          <div style={{ fontSize: "9px", color: "#166534" }}>🆕 Nuevos</div>
                        </div>
                        <div style={{ padding: "9px 4px", background: comparacionListaPrecios.reactivar?.length ? "#ecfdf5" : "#f8fafc", borderRadius: "8px" }}>
                          <div style={{ fontSize: "18px", fontWeight: "900", color: comparacionListaPrecios.reactivar?.length ? "#047857" : "#64748b" }}>{comparacionListaPrecios.reactivar?.length || 0}</div>
                          <div style={{ fontSize: "9px", color: comparacionListaPrecios.reactivar?.length ? "#047857" : "#64748b" }}>♻️ Reactivar</div>
                        </div>
                        <div style={{ padding: "9px 4px", background: comparacionListaPrecios.ausentes?.length ? "#fff7ed" : "#f8fafc", borderRadius: "8px" }}>
                          <div style={{ fontSize: "18px", fontWeight: "900", color: comparacionListaPrecios.ausentes?.length ? "#c2410c" : "#64748b" }}>{comparacionListaPrecios.ausentes?.length || 0}</div>
                          <div style={{ fontSize: "9px", color: comparacionListaPrecios.ausentes?.length ? "#c2410c" : "#64748b" }}>📤 Ya no vienen</div>
                        </div>
                        <div style={{ padding: "9px 4px", background: comparacionListaPrecios.revisar.length ? "#fffbeb" : "#f8fafc", borderRadius: "8px" }}>
                          <div style={{ fontSize: "18px", fontWeight: "900", color: comparacionListaPrecios.revisar.length ? "#b45309" : "#64748b" }}>{comparacionListaPrecios.revisar.length}</div>
                          <div style={{ fontSize: "9px", color: comparacionListaPrecios.revisar.length ? "#b45309" : "#64748b" }}>⚠️ Revisar</div>
                        </div>
                      </div>

                      {(comparacionListaPrecios.reactivar || []).length > 0 && (
                        <div style={{ marginTop: "10px", padding: "10px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "9px", fontSize: "11px", color: "#065f46" }}>
                          <strong>♻️ Productos detectados para reactivar:</strong>
                          {comparacionListaPrecios.reactivar.map((p, i) => (
                            <div key={`${p.lista_producto_id}-${i}`} style={{ marginTop: "4px" }}>
                              {p.codigo} · {p.descripcion} · precio en archivo ${p.precioNuevo}
                            </div>
                          ))}
                          <div style={{ marginTop: "7px", fontWeight: "800" }}>🔒 Micro-prueba: todavía NO se reactiva nada en Supabase.</div>
                        </div>
                      )}

                      {comparacionListaPrecios.precioCambiado.length > 0 && (
                        <div style={{ marginTop: "10px", fontSize: "10px", color: "#334155" }}>
                          <strong>💲 Algunos cambios de precio:</strong>
                          {comparacionListaPrecios.precioCambiado.slice(0, 5).map((p, i) => (
                            <div key={`${p.codigo}-${i}`} style={{ marginTop: "3px" }}>
                              {p.codigo} · {p.descripcion}: ${p.precioAnterior} → ${p.precioNuevo}
                            </div>
                          ))}
                        </div>
                      )}

                      {(comparacionListaPrecios.reactivar || []).length > 0 && (
                      <div style={{ marginTop: "10px", padding: "10px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "9px", fontSize: "11px", color: "#065f46" }}>
                        <strong>♻️ Productos que se reactivarían:</strong>
                        {comparacionListaPrecios.reactivar.map((p, i) => (
                          <div key={`${p.lista_producto_id}-${i}`} style={{ marginTop: "4px" }}>{p.codigo} · {p.descripcion} · ${p.precioNuevo}</div>
                        ))}
                        <div style={{ marginTop: "7px", fontWeight: "800" }}>🔒 En esta micro todavía no se reactiva nada en Supabase.</div>
                      </div>
                    )}

                    {comparacionListaPrecios.nuevos.length > 0 && (
                        <div style={{ marginTop: "10px", fontSize: "10px", color: "#166534" }}>
                          <strong>🆕 Productos que no encontramos en la lista actual:</strong>
                          {comparacionListaPrecios.nuevos.slice(0, 5).map((p, i) => (
                            <div key={`${p.codigo}-${i}`} style={{ marginTop: "3px" }}>
                              {p.codigo} · {p.descripcion}{p.gtin ? ` · GTIN ${p.gtin}` : ""}
                            </div>
                          ))}
                        </div>
                      )}

                      {comparacionListaPrecios.revisar.length > 0 && (
                        <div style={{ marginTop: "10px", padding: "8px", background: "#fffbeb", borderRadius: "7px", fontSize: "10px", color: "#92400e" }}>
                          <strong>⚠️ Necesitan revisión:</strong>
                          {comparacionListaPrecios.revisar.map((p, i) => (
                            <div key={`${p.codigo}-${i}`} style={{ marginTop: "3px" }}>
                              {p.codigo} · {p.descripcion}: {p.motivo}
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: "10px", fontSize: "10px", color: "#64748b", fontWeight: "800" }}>
                        🔒 Comparación solamente informativa. Todavía no se modificó ningún producto ni precio.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={!comparacionListaPrecios || comparacionListaPrecios.revisar.length > 0}
                onClick={() => setPreConfirmacionListaPrecios(true)}
                style={{
                  width: "100%",
                  marginTop: "14px",
                  padding: "11px",
                  borderRadius: "8px",
                  border: "none",
                  background: comparacionListaPrecios && comparacionListaPrecios.revisar.length === 0 ? "#16a34a" : "#f1f5f9",
                  color: comparacionListaPrecios && comparacionListaPrecios.revisar.length === 0 ? "#fff" : "#94a3b8",
                  fontSize: "11px",
                  fontWeight: "900",
                  cursor: comparacionListaPrecios && comparacionListaPrecios.revisar.length === 0 ? "pointer" : "not-allowed"
                }}
              >
                3️⃣ PREPARAR CARGA DE LISTA
              </button>

              <div style={{ marginTop: "10px", fontSize: "11px", color: "#64748b" }}>
                🔒 Este paso abre una confirmación previa. Todavía no modifica productos ni precios.
              </div>

              {preConfirmacionListaPrecios && comparacionListaPrecios && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.72)", zIndex: 13000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                  <div style={{ width: "min(760px, 96vw)", maxHeight: "88vh", overflow: "auto", background: "#fff", borderRadius: "14px", padding: "18px", boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "18px" }}>💾 Confirmación previa de lista de precios</h3>
                        <div style={{ marginTop: "5px", fontSize: "11px", color: "#64748b" }}>Revisá qué haría RutaComercio antes de habilitar el guardado real.</div>
                      </div>
                      <button type="button" onClick={() => setPreConfirmacionListaPrecios(false)} style={{ border: "none", borderRadius: "8px", padding: "7px 10px", cursor: "pointer" }}>✕</button>
                    </div>

                    <div style={{ marginTop: "14px", padding: "11px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "9px", fontSize: "11px", lineHeight: 1.8 }}>
                      📋 Lista actual: <strong>{comparacionListaPrecios.nombreLista}</strong><br/>
                      📄 Archivo: <strong>{archivoListaPreciosNombre || "Archivo seleccionado"}</strong><br/>
                      🗓️ Vigente desde: <strong>{vigenciaListaPrecios || "Sin fecha indicada"}</strong>
                    </div>

                    <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", textAlign: "center" }}>
                      <div style={{ padding: "12px 6px", background: "#f8fafc", borderRadius: "9px" }}><div style={{ fontSize: "20px", fontWeight: "900" }}>{comparacionListaPrecios.sinCambios.length}</div><div style={{ fontSize: "10px", color: "#64748b" }}>➖ Se mantienen</div></div>
                      <div style={{ padding: "12px 6px", background: "#eff6ff", borderRadius: "9px" }}><div style={{ fontSize: "20px", fontWeight: "900", color: "#1d4ed8" }}>{comparacionListaPrecios.precioCambiado.length}</div><div style={{ fontSize: "10px", color: "#1d4ed8" }}>💲 Cambiarían precio</div></div>
                      <div style={{ padding: "12px 6px", background: "#f0fdf4", borderRadius: "9px" }}><div style={{ fontSize: "20px", fontWeight: "900", color: "#166534" }}>{comparacionListaPrecios.nuevos.length}</div><div style={{ fontSize: "10px", color: "#166534" }}>🆕 Se crearían</div></div>
                      <div style={{ padding: "12px 6px", background: "#ecfdf5", borderRadius: "9px" }}><div style={{ fontSize: "20px", fontWeight: "900", color: "#047857" }}>{comparacionListaPrecios.reactivar?.length || 0}</div><div style={{ fontSize: "10px", color: "#047857" }}>♻️ Se reactivarían</div></div>
                      <div style={{ padding: "12px 6px", background: "#fff7ed", borderRadius: "9px" }}><div style={{ fontSize: "20px", fontWeight: "900", color: "#c2410c" }}>{comparacionListaPrecios.ausentes?.length || 0}</div><div style={{ fontSize: "10px", color: "#c2410c" }}>📤 Ya no vienen</div></div>
                    </div>

                    {comparacionListaPrecios.precioCambiado.length > 0 && (
                      <div style={{ marginTop: "12px", padding: "10px", background: "#eff6ff", borderRadius: "9px", fontSize: "11px" }}>
                        <strong>💲 Precios que cambiarían:</strong>
                        {comparacionListaPrecios.precioCambiado.map((p, i) => <div key={`${p.codigo}-${i}`} style={{ marginTop: "4px" }}>{p.codigo} · {p.descripcion}: ${p.precioAnterior} → ${p.precioNuevo}</div>)}
                      </div>
                    )}

                    {comparacionListaPrecios.nuevos.length > 0 && (
                      <div style={{ marginTop: "10px", padding: "10px", background: "#f0fdf4", borderRadius: "9px", fontSize: "11px" }}>
                        <strong>🆕 Productos que se crearían:</strong>
                        {comparacionListaPrecios.nuevos.map((p, i) => <div key={`${p.codigo}-${i}`} style={{ marginTop: "4px" }}>{p.codigo} · {p.descripcion} · ${p.precio}</div>)}
                      </div>
                    )}

                    {(comparacionListaPrecios.ausentes || []).length > 0 && (
                      <div style={{ marginTop: "12px", padding: "10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "9px", fontSize: "11px", color: "#9a3412" }}>
                        <strong>📤 Productos que estaban en la lista actual y ya no vienen en el archivo nuevo:</strong>
                        <div style={{ marginTop: "6px", color: "#7c2d12" }}>Elegí qué hacer con cada uno. Por seguridad, RutaComercio los mantiene activos salvo que el supervisor indique lo contrario.</div>
                        {comparacionListaPrecios.ausentes.map((p) => (
                          <div key={p.id} style={{ marginTop: "8px", padding: "8px", background: "#fff", borderRadius: "8px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                            <div><strong>{p.codigo}</strong> · {p.descripcion} · ${p.precioAnterior}</div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button type="button" onClick={() => setDecisionAusentesListaPrecios(prev => ({ ...prev, [p.id]: "mantener" }))} style={{ padding: "6px 9px", borderRadius: "7px", border: decisionAusentesListaPrecios[p.id] === "mantener" ? "2px solid #16a34a" : "1px solid #cbd5e1", background: decisionAusentesListaPrecios[p.id] === "mantener" ? "#f0fdf4" : "#fff", fontWeight: "800", cursor: "pointer" }}>✓ Mantener</button>
                              <button type="button" onClick={() => setDecisionAusentesListaPrecios(prev => ({ ...prev, [p.id]: "quitar" }))} style={{ padding: "6px 9px", borderRadius: "7px", border: decisionAusentesListaPrecios[p.id] === "quitar" ? "2px solid #dc2626" : "1px solid #cbd5e1", background: decisionAusentesListaPrecios[p.id] === "quitar" ? "#fef2f2" : "#fff", fontWeight: "800", cursor: "pointer" }}>🚫 Quitar de la lista</button>
                            </div>
                          </div>
                        ))}
                        <div style={{ marginTop: "8px", fontWeight: "800" }}>🔒 Quitar de la lista será una baja lógica: el producto y su historial se conservarán. En esta versión de prueba todavía no se guarda ningún cambio.</div>
                      </div>
                    )}

                    <div style={{ marginTop: "12px", padding: "10px", background: "#f8fafc", borderRadius: "9px", textAlign: "center", fontSize: "11px", fontWeight: "800", color: "#64748b" }}>
                      🔒 VISTA PREVIA SOLAMENTE — todavía no se guarda nada.
                    </div>

                    <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => setPreConfirmacionListaPrecios(false)}
                        style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", fontWeight: "800", cursor: "pointer" }}
                      >
                        Volver
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmacionFinalListaPrecios(true)}
                        style={{ padding: "9px 14px", borderRadius: "8px", border: "none", background: "#16a34a", color: "#fff", fontWeight: "900", cursor: "pointer" }}
                      >
                        CONTINUAR A CONFIRMACIÓN FINAL
                      </button>
                    </div>

                    {confirmacionFinalListaPrecios && (
                      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.78)", zIndex: 13100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                        <div style={{ width: "min(720px, 96vw)", maxHeight: "88vh", overflow: "auto", background: "#fff", borderRadius: "14px", padding: "18px", boxShadow: "0 20px 55px rgba(0,0,0,.3)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: "18px" }}>💾 Confirmación final de actualización</h3>
                              <div style={{ marginTop: "5px", fontSize: "11px", color: "#64748b" }}>Última revisión antes de habilitar el guardado real.</div>
                            </div>
                            <button type="button" onClick={() => setConfirmacionFinalListaPrecios(false)} style={{ border: "none", borderRadius: "8px", padding: "7px 10px", cursor: "pointer" }}>✕</button>
                          </div>

                          <div style={{ marginTop: "14px", padding: "11px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "9px", fontSize: "11px", lineHeight: 1.8 }}>
                            📋 Lista: <strong>{comparacionListaPrecios.nombreLista}</strong><br/>
                            📄 Archivo: <strong>{archivoListaPreciosNombre || "Archivo seleccionado"}</strong><br/>
                            🗓️ Vigente desde: <strong>{vigenciaListaPrecios || "Sin fecha indicada"}</strong>
                          </div>

                          <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px", textAlign: "center" }}>
                            <div style={{ padding: "11px 6px", background: "#f8fafc", borderRadius: "9px" }}>
                              <div style={{ fontSize: "20px", fontWeight: "900" }}>{comparacionListaPrecios.sinCambios.length}</div>
                              <div style={{ fontSize: "10px", color: "#64748b" }}>➖ Sin cambios</div>
                            </div>
                            <div style={{ padding: "11px 6px", background: "#eff6ff", borderRadius: "9px" }}>
                              <div style={{ fontSize: "20px", fontWeight: "900", color: "#1d4ed8" }}>{comparacionListaPrecios.precioCambiado.length}</div>
                              <div style={{ fontSize: "10px", color: "#1d4ed8" }}>💲 Actualizar precio</div>
                            </div>
                            <div style={{ padding: "11px 6px", background: "#f0fdf4", borderRadius: "9px" }}>
                              <div style={{ fontSize: "20px", fontWeight: "900", color: "#166534" }}>{comparacionListaPrecios.nuevos.length}</div>
                              <div style={{ fontSize: "10px", color: "#166534" }}>🆕 Crear</div>
                            </div>
                            <div style={{ padding: "11px 6px", background: "#ecfdf5", borderRadius: "9px" }}>
                              <div style={{ fontSize: "20px", fontWeight: "900", color: "#047857" }}>{comparacionListaPrecios.reactivar?.length || 0}</div>
                              <div style={{ fontSize: "10px", color: "#047857" }}>♻️ Reactivar</div>
                            </div>
                            <div style={{ padding: "11px 6px", background: "#fff7ed", borderRadius: "9px" }}>
                              <div style={{ fontSize: "20px", fontWeight: "900", color: "#c2410c" }}>
                                {comparacionListaPrecios.ausentes.filter(p => decisionAusentesListaPrecios[p.id] === "quitar").length}
                              </div>
                              <div style={{ fontSize: "10px", color: "#c2410c" }}>🚫 Quitar de la lista</div>
                            </div>
                          </div>

                          <div style={{ marginTop: "8px", padding: "9px", background: "#f8fafc", borderRadius: "9px", textAlign: "center", fontSize: "11px", color: "#475569" }}>
                            ✓ Ausentes que se mantendrán activos: <strong>{comparacionListaPrecios.ausentes.filter(p => decisionAusentesListaPrecios[p.id] !== "quitar").length}</strong>
                          </div>

                          {(comparacionListaPrecios.reactivar || []).length > 0 && (
                            <div style={{ marginTop: "10px", padding: "10px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "9px", fontSize: "11px", color: "#065f46", textAlign: "center" }}>
                              <strong>♻️ Marcados para reactivar:</strong>
                              {comparacionListaPrecios.reactivar.map((p, i) => (
                                <div key={`${p.lista_producto_id}-${i}`} style={{ marginTop: "4px" }}>{p.codigo} · {p.descripcion} · ${p.precioNuevo}
                                  <div style={{ marginTop: "3px", fontWeight: "800" }}>Inactivo → Activo</div>
                                  <div style={{ marginTop: "2px", fontSize: "10px" }}>Mismo producto · mismo CGE · historial conservado</div>
                                </div>
                              ))}
                              <div style={{ marginTop: "7px", fontWeight: "800" }}>Conservará el mismo producto y su historial.</div>
                            </div>
                          )}

                          {comparacionListaPrecios.ausentes.filter(p => decisionAusentesListaPrecios[p.id] === "quitar").length > 0 && (
                            <div style={{ marginTop: "10px", padding: "10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "9px", fontSize: "11px", color: "#9a3412" }}>
                              <strong>🚫 Marcados para quitar de esta lista:</strong>
                              {comparacionListaPrecios.ausentes.filter(p => decisionAusentesListaPrecios[p.id] === "quitar").map((p, i) => (
                                <div key={`${p.id || p.codigo_lista}-${i}`} style={{ marginTop: "4px" }}>
                                  {p.codigo || "Sin código"} · {p.descripcion || "Producto"}
                                </div>
                              ))}
                              <div style={{ marginTop: "7px", fontWeight: "800" }}>Su producto e historial se conservarán.</div>
                            </div>
                          )}

                          <div style={{ marginTop: "12px", padding: "11px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "9px", fontSize: "11px", color: "#9a3412", fontWeight: "800", textAlign: "center" }}>
                            ⚠️ Al confirmar, RutaComercio guardará los cambios de esta lista de precios de forma segura.
                          </div>

                          <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => setConfirmacionFinalListaPrecios(false)}
                              style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", fontWeight: "800", cursor: "pointer" }}
                            >
                              Volver y corregir
                            </button>
                            <button
                              type="button"
                              onClick={actualizarListaPreciosReal}
                              disabled={actualizandoListaPrecios}
                              style={{ padding: "9px 14px", borderRadius: "8px", border: "none", background: actualizandoListaPrecios ? "#e2e8f0" : "#2563eb", color: actualizandoListaPrecios ? "#94a3b8" : "#fff", fontWeight: "900", cursor: actualizandoListaPrecios ? "not-allowed" : "pointer" }}
                            >
                              {actualizandoListaPrecios
                                ? "⏳ GUARDANDO..."
                                : comparacionListaPrecios?.esPrimeraLista
                                  ? "💾 CREAR PRIMERA LISTA AHORA"
                                  : "💾 ACTUALIZAR LISTA AHORA"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
              <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 2fr) 100px minmax(140px, 1fr) 140px 140px", gap: "8px", padding: "9px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
                <div>Cliente</div><div>Código</div><div>Preventista</div><div style={{ textAlign: "right" }}>Saldo</div><div>Actualizado</div>
              </div>
              {comerciosEstadoCuenta.length === 0 ? (
                <div style={{ padding: "35px 15px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>No hay clientes que coincidan con los filtros.</div>
              ) : comerciosEstadoCuenta.map((c) => {
                const deuda = Number(c.deuda || 0);
                const conSaldo = deuda > 0;
                return (
                  <div key={c.id} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 2fr) 100px minmax(140px, 1fr) 140px 140px", gap: "8px", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "7px" }}>
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
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>👤 {prev.nombre}</div>
                    {(() => {
                      const minutos = prev.ultimaSenal
                        ? (Date.now() - new Date(prev.ultimaSenal).getTime()) / 60000
                        : Infinity;
                      const estadoSenal =
                        minutos <= 2
                           ? { texto: "🟢 Activo", color: "#16a34a" }
                           : minutos <= 10
                             ? { texto: "🟡 Sin señal reciente", color: "#d97706" }
                             : { texto: "⚫ Inactivo", color: "#64748b" };
                      return (
                        <div style={{ fontSize: "10px", color: estadoSenal.color, marginTop: "2px", fontWeight: "700" }}>
                          {estadoSenal.texto}
                        </div>
                      );
                    })()}
                    <div
                      title={prev.ultimaSenal ? `Fecha y hora exactas: ${new Date(prev.ultimaSenal).toLocaleString("es-AR")}` : "Sin señal registrada"}
                      style={{ fontSize: "10px", color: "#64748b", marginTop: "2px", cursor: prev.ultimaSenal ? "help" : "default" }}
                    >
                      {textoUltimaSenal(prev.ultimaSenal)}
                    </div>
                    <div style={{ fontSize: "10px", color: "#334155", marginTop: "4px", fontWeight: "800", lineHeight: 1.5 }}>
                      📍 {prev.paradasHoy} visita{prev.paradasHoy === 1 ? "" : "s"} · 🧾 {prev.nviHoy || 0} NVI · 🎯 {prev.efectividadHoy || 0}%
                      <br />💰 ${Number(prev.vendidoHoy || 0).toLocaleString("es-AR")} vendido hoy
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

        {preventistaSeleccionado && (
          <div style={{ backgroundColor: "#eff6ff", borderRadius: "10px", border: "2px solid #2563eb", padding: "14px 16px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(37,99,235,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "#1d4ed8" }}>
                🕐 ACTIVIDAD DE HOY — {nombrePrevActivo}
              </div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#2563eb" }}>
                {actividadHoyPreventista.length} movimiento{actividadHoyPreventista.length === 1 ? "" : "s"}
              </div>
            </div>

            {actividadHoyPreventista.length === 0 ? (
              <div style={{ fontSize: "11px", color: "#64748b", padding: "8px 0" }}>
                Todavía no hay capturas, visitas ni NVI registradas hoy.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "260px", overflowY: "auto" }}>
                {actividadHoyPreventista.map((item) => {
                  const icono = item.tipo === "nvi" ? "🧾" : item.tipo === "visita" ? "🏪" : "📍";
                  const etiqueta = item.tipo === "nvi" ? "VENTA / NVI" : item.tipo === "visita" ? "VISITA" : "CAPTURA";
                  return (
                    <div key={item.id} style={{background:"#fff",border:"1px solid #dbeafe",borderRadius:"6px",padding:"5px 8px",display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",minWidth:0}}>
                      {item.tipo === "nvi" ? (<>
                        <span>🧾</span>
                        <button type="button" onClick={() => {
                            const numeroNvi = String(item.pedidoCompleto?.numero_pedido || item.pedidoCompleto?.id || "");
                            window.location.href = `/pedidos?nvi=${encodeURIComponent(numeroNvi)}`;
                          }} title="Abrir esta NVI en Pedidos"
                          style={{border:"none",background:"transparent",padding:0,margin:0,color:"#1d4ed8",fontSize:"12px",fontWeight:"900",textDecoration:"underline",cursor:"pointer",whiteSpace:"nowrap"}}>{item.titulo}</button>
                        {item.detalle && <span style={{color:"#334155",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0,flex:1}}>· {item.detalle}</span>}
                      </>) : (<>
                        <span style={{color:"#2563eb",fontWeight:"900",whiteSpace:"nowrap"}}>{item.tipo === "visita" ? "🏪 VISITA" : "📍 CAPTURA"}</span>
                        <span style={{color:"#0f172a",fontWeight:"800",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0}}>· {item.titulo}</span>
                        {item.detalle && <span style={{color:"#475569",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0,flex:1}}>· {item.tipo === "visita" ? "💬 " : ""}{item.detalle}</span>}
                      </>)}
                      <span style={{color:"#475569",whiteSpace:"nowrap",fontWeight:"800",marginLeft:"auto"}}>· 🕐 {horaActividad(item)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
        <div className="supervisor-mapa-layout" style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: "16px", alignItems: "start", width: "100%", minWidth: 0 }}>
          
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

            {viendoHoyEnPlanificador && (
              <div style={{ marginBottom: "10px", padding: "8px 10px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "11px", color: "#334155" }}>
                <div><b>Ruta habitual:</b> {comerciosFiltradosPorDia.length}</div>
                <div><b>Ruta efectiva de hoy:</b> {comerciosEfectivosHoy.length}</div>
                <div><b>Omitidas hoy:</b> {comerciosOmitidosHoy.length}</div>
                {comerciosOmitidosHoy.length > 0 && (
                  <div style={{ marginTop: "6px", color: "#92400e" }}>
                    {comerciosOmitidosHoy.map((com) => (
                      <div key={`omitido-${com.id}`}>⏭️ {com.nombre || ("Comercio #" + com.id)} — OMITIR HOY</div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setAccionMapa({ tipo: "preventista", id: Date.now() })}
                  disabled={!puntoPreventistaMapa}
                  style={{ border: "1px solid #2563eb", background: puntoPreventistaMapa ? "#eff6ff" : "#f1f5f9", color: puntoPreventistaMapa ? "#1d4ed8" : "#94a3b8", borderRadius: "6px", padding: "5px 8px", fontSize: "10px", fontWeight: "800", cursor: puntoPreventistaMapa ? "pointer" : "not-allowed" }}
                >
                  🚗 Centrar en preventista
                </button>
                <button
                  type="button"
                  onClick={() => setAccionMapa({ tipo: "recorrido", id: Date.now() })}
                  disabled={coordenadasValidas.length === 0}
                  style={{ border: "1px solid #64748b", background: coordenadasValidas.length ? "#f8fafc" : "#f1f5f9", color: coordenadasValidas.length ? "#334155" : "#94a3b8", borderRadius: "6px", padding: "5px 8px", fontSize: "10px", fontWeight: "800", cursor: coordenadasValidas.length ? "pointer" : "not-allowed" }}
                >
                  🗺️ Centrar en recorrido
                </button>
              </div>
            </div>

            <div style={{ height: "480px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
              <MapContainer center={centroMapa} zoom={14} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AutoCentradoMapa puntos={coordenadasValidas} puntoActivo={comercioFoco ? [comercioFoco.ubicacion_exacta_latitud || comercioFoco.latitud, comercioFoco.ubicacion_exacta_longitud || comercioFoco.longitud] : null} />
                <ControlCentradoMapa accion={accionMapa} puntoPreventista={puntoPreventistaMapa} puntosRecorrido={coordenadasValidas} />

                {seccionActiva === "planificador" && rutaRecorrida.length > 1 && (
                  <Polyline positions={rutaRecorrida} pathOptions={{ color: "#16a34a", weight: 4, opacity: 0.85 }} />
                )}

                {seccionActiva === "planificador" && rutaRestante.length > 1 && (
                  <Polyline positions={rutaRestante} pathOptions={{ color: "#2563eb", weight: 3, dashArray: "6, 8", opacity: 0.75 }} />
                )}

                {listaParaMapa.map((c, i) => {
                  const lat = c.ubicacion_exacta_latitud || c.latitud;
                  const lng = c.ubicacion_exacta_longitud || c.longitud;
                  if (!lat || !lng) return null;
                  const estadoPin = c.no_visitar === true
                    ? "no_visitar"
                    : seccionActiva === "planificador"
                      ? (i < rutaRecorrida.length
                          ? "visitado"
                          : i === rutaRecorrida.length
                            ? "activo"
                            : "pendiente")
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
                          <p style={{ margin: "4px 0 0 0", fontSize: "10px", color: "#475569", fontWeight: "700" }}>
                            🕒 Capturado: {c.created_at ? new Date(c.created_at).toLocaleString("es-AR") : (c.fecha ? new Date(c.fecha).toLocaleString("es-AR") : "Sin fecha registrada")}
                          </p>
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
        {comercioDetalleModal && seccionActiva !== "clientes" && (
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
                <div style={{ background: "#eef6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px", fontSize: "11px", color: "#1e3a8a", fontWeight: "800" }}>
                  🕒 Fecha y hora de captura: {comercioDetalleModal.created_at ? new Date(comercioDetalleModal.created_at).toLocaleString("es-AR") : (comercioDetalleModal.fecha ? new Date(comercioDetalleModal.fecha).toLocaleString("es-AR") : "Sin fecha registrada")}
                </div>

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
                  {guardandoFicha ? "Guardando..." : "💾 Guardar Reasignación"}
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
          <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
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
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>⏳ Consultando pedidos...</div>
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

