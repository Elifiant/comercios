import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import * as XLSX from "xlsx";

const PEDIDOS_DEMO = [];

const LISTA_PREVENTISTAS = ["Walter", "Todos"];
const LISTA_ESTADOS = ["Ingresado", "Pasado a Depósito"];

export default function MonitorPedidos() {
    const [pedidos, setPedidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [preventistasReales, setPreventistasReales] = useState(["Todos"]);
  const [datosCabecera, setDatosCabecera] = useState({ empresa: "", abonado_hasta: null });
  const [empresaIdActual, setEmpresaIdActual] = useState(null);
  const [disponibilidadProductos, setDisponibilidadProductos] = useState({});
  const [busquedaDisponibilidad, setBusquedaDisponibilidad] = useState("");
  const [guardandoDisponibilidad, setGuardandoDisponibilidad] = useState(null);
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

  const cargarPedidosReales = async () => {
    try {
      setCargandoPedidos(true);
      // 1. Identificar la empresa del usuario conectado
      const { data: authData } = await supabase.auth.getSession();
      const sesion = authData?.session;
      if (!sesion) throw new Error("No hay sesión activa.");

      const { data: perfil, error: errorPerfil } = await supabase
        .from("perfiles")
        .select("empresa_id")
        .eq("id", sesion.user.id)
        .maybeSingle();

      if (errorPerfil) throw errorPerfil;
      if (!perfil?.empresa_id) throw new Error("El usuario no tiene empresa_id asignado.");
      setEmpresaIdActual(perfil.empresa_id);

      // Datos visuales para repetir la cabecera real del Supervisor
      const { data: empresaCabecera } = await supabase
        .from("empresas")
        .select("nombre, abonado_hasta")
        .eq("id", perfil.empresa_id)
        .maybeSingle();

      setDatosCabecera({
        empresa: empresaCabecera?.nombre || "",
        abonado_hasta: empresaCabecera?.abonado_hasta || null
      });

      // 2. Preventistas de SU empresa, aunque todavía no tengan pedidos
      const { data: perfilesEmpresa, error: errorPerfiles } = await supabase
        .from("perfiles")
        .select("nombre, email, rol")
        .eq("empresa_id", perfil.empresa_id)
        .eq("rol", "preventista");

      if (errorPerfiles) throw errorPerfiles;

      // 3. Pedidos de SU empresa solamente
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("empresa_id", perfil.empresa_id)
        .order("created_at", { ascending: false });

      let listaConsolidada = [];
      if (!error && data && data.length > 0) {
        // Los renglones reales están en pedido_items y se relacionan por pedido_id.
        const idsPedidos = data.map(p => p.id).filter(Boolean);
        let itemsPorPedido = {};

        if (idsPedidos.length > 0) {
          const { data: itemsData, error: errorItems } = await supabase
            .from("pedido_items")
            .select("pedido_id, producto_id, producto_nombre, codigo, color, talle, cantidad, precio_unitario, subtotal")
            .in("pedido_id", idsPedidos);

          if (errorItems) {
            console.error("Error cargando pedido_items:", errorItems);
          } else {
            (itemsData || []).forEach(it => {
              const clave = String(it.pedido_id);
              if (!itemsPorPedido[clave]) itemsPorPedido[clave] = [];
              itemsPorPedido[clave].push({
                producto_id: it.producto_id,
                nombre: it.producto_nombre || it.codigo || "Producto",
                codigo: it.codigo || "",
                color: it.color || "",
                talle: it.talle || "",
                cant: Number(it.cantidad || 0),
                p_unit: Number(it.precio_unitario || 0),
                subtotal: Number(it.subtotal || 0)
              });
            });
          }
        }

        const idsComercios = [...new Set(data.map(p => p.comercio_id).filter(Boolean))];
        let direccionPorComercio = {};

        if (idsComercios.length > 0) {
          const { data: comerciosData, error: errorComercios } = await supabase
            .from("comercios")
            .select("id, direccion, localidad, partido, provincia, pais, razon_social, codigo_cliente, cuit, condicion_fiscal, domicilio_fiscal, codigo_postal, telefono, whatsapp, contacto, email")
            .in("id", idsComercios);

          if (errorComercios) {
            console.error("Error cargando direcciones de comercios:", errorComercios);
          } else {
            (comerciosData || []).forEach(c => {
              direccionPorComercio[String(c.id)] = {
                direccion: [c.direccion, c.localidad, c.provincia].filter(Boolean).join(", "),
                razon_social: c.razon_social || "",
                codigo_cliente: c.codigo_cliente || "",
                cuit: c.cuit || "",
                condicion_fiscal: c.condicion_fiscal || "",
                domicilio_fiscal: c.domicilio_fiscal || "",
                codigo_postal: c.codigo_postal || "",
                telefono: c.telefono || "",
                whatsapp: c.whatsapp || "",
                contacto: c.contacto || "",
                email: c.email || "",
              };
            });
          }
        }

        listaConsolidada = data.map(p => {
          const itemsReales = itemsPorPedido[String(p.id)] || [];
          const comercioReal = direccionPorComercio[String(p.comercio_id)] || {};
          const direccionReal = comercioReal.direccion || "";
          return {
            id: p.id || ("PED-" + String(p.created_at || Date.now()).slice(-4)),
            empresa_id: p.empresa_id || perfil.empresa_id,
            comercio_id: p.comercio_id || null,
            numeroVisible: String(p.numero_pedido || "").padStart(6, "0"),
            fechaCreacion: p.created_at || null,
            fechaCorta: p.created_at ? new Date(p.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "--/--",
            hora: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "En curso",
            preventista: p.preventista || p.vendedor || "Walter",
            ruta: p.ruta || "Ruta de Visita",
            cliente: p.cliente || p.comercio_nombre || ("Comercio #" + (p.comercio_id || "")),
            direccion: direccionReal || p.direccion || "Sin dirección cargada",
            razon_social: comercioReal.razon_social || "",
            codigo_cliente: comercioReal.codigo_cliente || "",
            cuit: comercioReal.cuit || "",
            condicion_fiscal: comercioReal.condicion_fiscal || "",
            domicilio_fiscal: comercioReal.domicilio_fiscal || "",
            codigo_postal: comercioReal.codigo_postal || "",
            telefono_cliente: comercioReal.telefono || "",
            whatsapp_cliente: comercioReal.whatsapp || "",
            contacto_cliente: comercioReal.contacto || "",
            email_cliente: comercioReal.email || "",
            condicion: p.condicion || comercioReal.condicion_fiscal || "Consumidor Final",
            bultos: p.bultos || itemsReales.reduce((acc, it) => acc + Number(it.cant || 0), 0) || 1,
            total: Number(p.total || p.total_pedido || 0),
            estado: p.estado || "Ingresado",
            pasado_deposito_at: p.pasado_deposito_at || null,
            items: itemsReales,
            nota: p.notas || p.nota || "Pedido registrado desde app móvil"
          };
        });
      }

      // 2. Fallback de localStorage
      const locales = JSON.parse(localStorage.getItem("pedidos_local") || "[]");
      locales
        .filter(loc => loc.empresa_id === perfil.empresa_id)
        .forEach(loc => {
        if (!listaConsolidada.some(p => String(p.id) === String(loc.id))) {
          listaConsolidada.push({
            id: loc.id || ("LOC-" + Date.now()),
            empresa_id: loc.empresa_id || perfil.empresa_id,
            fechaCreacion: loc.fecha || loc.created_at || null,
            hora: loc.fecha ? new Date(loc.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "En curso",
            preventista: loc.preventista || "Walter",
            ruta: "Ruta 01",
            cliente: loc.cliente || loc.comercio_nombre || ("Comercio #" + (loc.comercio_id || "")),
            direccion: loc.direccion || "Local",
            condicion: "Consumidor Final",
            bultos: Array.isArray(loc.items) ? loc.items.length : 1,
            total: Number(loc.total || 0),
            estado: loc.estado || "Ingresado",
            pasado_deposito_at: loc.pasado_deposito_at || null,
            items: Array.isArray(loc.items) ? loc.items : [],
            nota: loc.notas || "Guardado en app"
          });
        }
      });

      // 3. Refuerzo multiempresa:
      // empresa_id + numero_pedido identifica la representación visible.
      // Si hubiera dos representaciones dentro de la misma empresa, se prioriza
      // la que ya está Pasado a Depósito / En Depósito.
      const pedidosPorEmpresaYNumero = new Map();

      listaConsolidada.forEach((pedido) => {
        const empresaClave = String(pedido.empresa_id || perfil.empresa_id || "");
        const pedidoClave = String(pedido.numeroVisible || pedido.id);
        const clave = `${empresaClave}::${pedidoClave}`;
        const existente = pedidosPorEmpresaYNumero.get(clave);

        if (!existente) {
          pedidosPorEmpresaYNumero.set(clave, pedido);
          return;
        }

        const nuevoEnDeposito = ["PASADO A DEPOSITO", "EN DEPOSITO"].includes(normalizarEstado(pedido.estado));
        const existenteEnDeposito = ["PASADO A DEPOSITO", "EN DEPOSITO"].includes(normalizarEstado(existente.estado));

        if (nuevoEnDeposito && !existenteEnDeposito) {
          pedidosPorEmpresaYNumero.set(clave, pedido);
        }
      });

      const listaSinDuplicados = Array.from(pedidosPorEmpresaYNumero.values());

      setPedidos(listaSinDuplicados);

      // No dejamos seleccionado automáticamente un pedido que podría no
      // pertenecer a la vista actual.
      setPedidoActivo(null);

      // 4. Preventistas reales de la empresa, tengan pedidos o no
      const prevs = [
        "Todos",
        ...new Set([
          ...(perfilesEmpresa || []).map(p => p.nombre || p.email).filter(Boolean),
          ...listaSinDuplicados.map(p => p.preventista).filter(Boolean),
        ]),
      ];
      setPreventistasReales(prevs);

    } catch (err) {
      console.warn("Error leyendo pedidos:", err);
    } finally {
      setCargandoPedidos(false);
    }
  };

  const cargarDisponibilidadProductos = async (empresaId = empresaIdActual) => {
    if (!empresaId) return;
    try {
      const { data, error } = await supabase
        .from("productos_disponibilidad")
        .select("producto_id, estado, observacion, actualizado_at")
        .eq("empresa_id", empresaId);

      if (error) throw error;

      const mapa = {};
      (data || []).forEach(row => {
        mapa[String(row.producto_id)] = {
          estado: row.estado || "disponible",
          observacion: row.observacion || "",
          actualizado_at: row.actualizado_at || null,
        };
      });
      setDisponibilidadProductos(mapa);
    } catch (err) {
      console.warn("Error leyendo disponibilidad:", err);
    }
  };

  useEffect(() => {
    cargarPedidosReales();
  }, []);

  useEffect(() => {
    if (empresaIdActual) {
      cargarDisponibilidadProductos(empresaIdActual);
      cargarCatalogoProductosStock();
    }
  }, [empresaIdActual]);
  const [filtroPreventista, setFiltroPreventista] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [pedidoActivo, setPedidoActivo] = useState(PEDIDOS_DEMO[0]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [esMovil, setEsMovil] = useState(window.innerWidth < 800);
  const [mostrarExportacion, setMostrarExportacion] = useState(false);
  const [vistaPedidos, setVistaPedidos] = useState("Activos");
  const [busquedaHistorialCliente, setBusquedaHistorialCliente] = useState("");
  const [procesandoDeposito, setProcesandoDeposito] = useState(false);
  const [eliminandoPedido, setEliminandoPedido] = useState(false);
  const [editandoNvi, setEditandoNvi] = useState(false);
  const [itemsEdicion, setItemsEdicion] = useState([]);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [catalogoEdicion, setCatalogoEdicion] = useState([]);
  const [busquedaEdicion, setBusquedaEdicion] = useState("");

  const [opcionesEnvio, setOpcionesEnvio] = useState({
    cliente: true,
    direccion: true,
    articulos: true,
    cantidades: true,
    precioUnitario: false,
    subtotales: false,
    importeTotal: false,
    nota: true,
  });

  useEffect(() => {
    const handleResize = () => setEsMovil(window.innerWidth < 800);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const esPasadoDeposito = (p) => ["PASADO A DEPOSITO", "EN DEPOSITO"].includes(normalizarEstado(p.estado));

  function normalizarEstado(valor) {
    return String(valor || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  const listaFiltrada = pedidos.filter(p => {
    const matchVista = vistaPedidos === "Historial" ? esPasadoDeposito(p) : !esPasadoDeposito(p);
    const matchPrev = filtroPreventista === "Todos" || p.preventista === filtroPreventista;
    return matchVista && matchPrev;
  });

  // 🏪 Historial completo por cliente: incluye NVI activas + enviadas a Depósito.
  const historialClientes = (() => {
    const mapa = new Map();

    pedidos.forEach((p) => {
      const nombre = String(p.cliente || "Cliente sin nombre").trim();
      const clave = nombre.toLowerCase();
      const actual = mapa.get(clave) || {
        cliente: nombre,
        compras: 0,
        total: 0,
        ultimaFecha: null,
        ultimaTotal: 0,
        pedidos: [],
      };

      actual.compras += 1;
      actual.total += Number(p.total || 0);
      actual.pedidos.push(p);

      const fecha = p.fechaCreacion ? new Date(p.fechaCreacion) : null;
      if (fecha && !Number.isNaN(fecha.getTime())) {
        const ultima = actual.ultimaFecha ? new Date(actual.ultimaFecha) : null;
        if (!ultima || fecha > ultima) {
          actual.ultimaFecha = p.fechaCreacion;
          actual.ultimaTotal = Number(p.total || 0);
        }
      }

      mapa.set(clave, actual);
    });

    const q = busquedaHistorialCliente.trim().toLowerCase();
    return Array.from(mapa.values())
      .filter(c => !q || c.cliente.toLowerCase().includes(q))
      .sort((a, b) => {
        const fa = a.ultimaFecha ? new Date(a.ultimaFecha).getTime() : 0;
        const fb = b.ultimaFecha ? new Date(b.ultimaFecha).getTime() : 0;
        return fb - fa;
      });
  })();

  const esDeHoy = (fecha) => {
    if (!fecha) return false;
    const d = new Date(fecha);
    const h = new Date();
    return d.getFullYear() === h.getFullYear() &&
      d.getMonth() === h.getMonth() &&
      d.getDate() === h.getDate();
  };

  const totalVendidoHoyTodos = pedidos
    .filter(p => esDeHoy(p.fechaCreacion))
    .reduce((acc, p) => acc + Number(p.total || 0), 0);

  const totalVendidoHoyVendedor = filtroPreventista === "Todos"
    ? totalVendidoHoyTodos
    : pedidos
        .filter(p => p.preventista === filtroPreventista && esDeHoy(p.fechaCreacion))
        .reduce((acc, p) => acc + Number(p.total || 0), 0);

  const porcentajeVendedorHoy = totalVendidoHoyTodos > 0
    ? ((totalVendidoHoyVendedor / totalVendidoHoyTodos) * 100).toLocaleString("es-AR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    : "0,0";

  // Abrir directamente una sección enviada desde el Supervisor.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seccionSolicitada = params.get("seccion");

    if (seccionSolicitada === "stock") {
      setVistaPedidos("StockFisico");
      setPedidoActivo(null);
    }
  }, []);

  // Abrir directamente una NVI enviada desde el Supervisor.
  useEffect(() => {
    if (!pedidos.length) return;
    const params = new URLSearchParams(window.location.search);
    const nviSolicitada = params.get("nvi");
    if (!nviSolicitada) return;

    const buscada = String(nviSolicitada).replace(/^0+/, "") || "0";
    const encontrada = pedidos.find((p) => {
      const numero = String(p.numeroVisible || "").replace(/^0+/, "") || "0";
      return numero === buscada || String(p.id) === String(nviSolicitada);
    });
    if (!encontrada) return;

    setFiltroPreventista("Todos");
    setFiltroEstado("Todos");
    setVistaPedidos(esPasadoDeposito(encontrada) ? "Historial" : "Activos");
    setPedidoActivo(encontrada);
    setMostrarExportacion(false);
  }, [pedidos]);

  // Si el pedido seleccionado ya no pertenece a la vista actual
  // (por ejemplo, pasó de Activos a Historial), cerrar su detalle.
  useEffect(() => {
    if (!pedidoActivo) return;
    const sigueVisible = listaFiltrada.some(
      p => String(p.id) === String(pedidoActivo.id)
    );
    if (!sigueVisible) {
      setPedidoActivo(null);
      setMostrarExportacion(false);
    }
  }, [pedidos, vistaPedidos, filtroPreventista, filtroEstado, pedidoActivo]);

  // 📊 Resumen comercial por fecha.
  // Se calcula sobre TODAS las NVI cargadas (Activas + Historial).
  // Pasar una NVI a Depósito no modifica lo vendido.
  const inicioDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const mismaFecha = (a, b) =>
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const ahoraMetricas = new Date();
  const hoyMetricas = inicioDia(ahoraMetricas);
  const ayerMetricas = new Date(hoyMetricas);
  ayerMetricas.setDate(ayerMetricas.getDate() - 1);

  const pedidosConFecha = pedidos
    .map(p => ({ ...p, _fechaNvi: p.fechaCreacion ? new Date(p.fechaCreacion) : null }))
    .filter(p => p._fechaNvi && !Number.isNaN(p._fechaNvi.getTime()));

  const nviHoy = pedidosConFecha.filter(p => mismaFecha(p._fechaNvi, hoyMetricas));
  const nviAyer = pedidosConFecha.filter(p => mismaFecha(p._fechaNvi, ayerMetricas));
  const nviMes = pedidosConFecha.filter(p =>
    p._fechaNvi.getFullYear() === ahoraMetricas.getFullYear() &&
    p._fechaNvi.getMonth() === ahoraMetricas.getMonth()
  );

  const sumarVentas = (lista) => lista.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const vendidoHoy = sumarVentas(nviHoy);
  const vendidoAyer = sumarVentas(nviAyer);
  const vendidoMes = sumarVentas(nviMes);

  const fechaCorta = (fecha) =>
    fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  const nombreMesActual = ahoraMetricas
    .toLocaleDateString("es-AR", { month: "long" })
    .toUpperCase();

  const resumenArticulosHoy = (() => {
    const mapa = new Map();
    pedidos.forEach(p => {
      (p.items || []).forEach(it => {
        const productoId = it.productoId ?? it.producto_id ?? null;
        if (!productoId) return;
        const clave = String(productoId);
        const actual = mapa.get(clave) || {
          productoId,
          codigo: it.codigo || "",
          nombre: it.nombre || it.producto_nombre || "Artículo",
          cantidad: 0,
          pedidos: new Set(),
        };
        actual.cantidad += Number(it.cant ?? it.cantidad ?? 0);
        actual.pedidos.add(String(p.id));
        if (!actual.codigo && it.codigo) actual.codigo = it.codigo;
        if ((!actual.nombre || actual.nombre === "Artículo") && it.nombre) actual.nombre = it.nombre;
        mapa.set(clave, actual);
      });
    });
    return Array.from(mapa.values())
      .map(x => ({ ...x, pedidosCount: x.pedidos.size }))
      .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"));
  })();

  const resumenArticulosFiltrado = resumenArticulosHoy.filter(it => {
    const q = busquedaDisponibilidad.trim().toLowerCase();
    if (!q) return true;
    return `${it.codigo} ${it.nombre}`.toLowerCase().includes(q);
  });

  const totalUnidadesHoy = resumenArticulosHoy.reduce((acc, it) => acc + it.cantidad, 0);
  const totalCriticos = resumenArticulosHoy.filter(it => (disponibilidadProductos[String(it.productoId)]?.estado || "disponible") === "critico").length;
  const totalBloqueados = resumenArticulosHoy.filter(it => (disponibilidadProductos[String(it.productoId)]?.estado || "disponible") === "bloqueado").length;

  const cambiarEstadoDisponibilidad = async (item, estado) => {
    if (!empresaIdActual || !item?.productoId) return;
    setGuardandoDisponibilidad(String(item.productoId));
    try {
      if (estado === "disponible") {
        const { error } = await supabase
          .from("productos_disponibilidad")
          .delete()
          .eq("empresa_id", empresaIdActual)
          .eq("producto_id", item.productoId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("productos_disponibilidad")
          .upsert([{
            empresa_id: empresaIdActual,
            producto_id: item.productoId,
            estado,
            actualizado_at: new Date().toISOString(),
          }], { onConflict: "empresa_id,producto_id" });
        if (error) throw error;
      }

      await cargarDisponibilidadProductos(empresaIdActual);
    } catch (err) {
      console.error("Error cambiando disponibilidad:", err);
      alert("❌ No se pudo actualizar la disponibilidad: " + (err.message || "Error desconocido"));
    } finally {
      setGuardandoDisponibilidad(null);
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
    if (!empresaIdActual) return;

    try {
      // 1. Solo las listas pertenecientes a la empresa del Supervisor.
      const { data: listasEmpresa, error: errorListas } = await supabase
        .from("listas_precios")
        .select("id, predeterminada")
        .eq("empresa_id", empresaIdActual)
        .order("predeterminada", { ascending: false })
        .eq("activo", true);

      if (errorListas) throw errorListas;

      const idsListas = (listasEmpresa || []).map(l => l.id).filter(Boolean);
      if (idsListas.length === 0) {
        setProductosStockCatalogo([]);
        return;
      }

      // 2. Solo los producto_id incluidos en esas listas.
      const { data: filasLista, error: errorFilas } = await supabase
        .from("lista_productos")
        .select("producto_id, lista_id, codigo_lista")
        .in("lista_id", idsListas)
        .eq("activo", true);

      if (errorFilas) throw errorFilas;

      const idsProductos = [...new Set((filasLista || []).map(x => x.producto_id).filter(Boolean))];
      if (idsProductos.length === 0) {
        setProductosStockCatalogo([]);
        return;
      }

      // 3. Recién ahora traer esos productos, nunca el catálogo global.
      const { data: productosEmpresa, error: errorProductos } = await supabase
        .from("productos")
        .select("id, codigo_cge, nombre, marca, presentacion, descripcion, activo")
        .in("id", idsProductos)
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (errorProductos) throw errorProductos;

      // Código visible para el cliente: usar el código de SU lista de precios
      // (por ejemplo WELT001), no el CGE interno de RutaComercio.
      // Como idsListas está ordenado con la predeterminada primero, conservamos
      // la primera equivalencia encontrada para cada producto.
      const codigoClientePorProducto = new Map();
      idsListas.forEach(listaId => {
        (filasLista || []).forEach(fila => {
          if (String(fila.lista_id) !== String(listaId)) return;
          const pid = String(fila.producto_id || "");
          if (!pid || codigoClientePorProducto.has(pid)) return;
          const codigoCliente = String(fila.codigo_lista || "").trim();
          if (codigoCliente) codigoClientePorProducto.set(pid, codigoCliente);
        });
      });

      setProductosStockCatalogo((productosEmpresa || []).map(producto => ({
        ...producto,
        codigo_cliente: codigoClientePorProducto.get(String(producto.id)) || "",
      })));
    } catch (error) {
      console.error("Error cargando catálogo de stock de la empresa:", error);
      setProductosStockCatalogo([]);
    }
  };

  const cargarStockActualEmpresa = async () => {
    if (!empresaIdActual) return;
    try {
      setCargandoStockActual(true);
      const { data, error } = await supabase
        .from("stock_informado")
        .select("id,empresa_id,importacion_id,producto_id,codigo_archivo,descripcion_archivo,stock_informado,fecha_actualizacion,color,talle")
        .eq("empresa_id", empresaIdActual)
        .order("fecha_actualizacion", { ascending: false })
        .order("id", { ascending: false });

      if (error) throw error;

      console.log("🧪 EMPRESA STOCK:", empresaIdActual);
      console.log("🧪 STOCK RECIBIDO:", data);

      // La tabla conserva historial de importaciones. Para el inventario actual
      // tomamos solamente el registro más reciente de cada producto + color + talle.
      const ultimos = new Map();
      (data || []).forEach((fila) => {
        const clave = [
          String(fila.producto_id || ""),
          String(fila.color || "").trim().toLowerCase(),
          String(fila.talle || "").trim().toLowerCase(),
        ].join("|");
        if (!ultimos.has(clave)) ultimos.set(clave, fila);
      });

      setStockActualEmpresa([...ultimos.values()]);
    } catch (error) {
      console.error("Error cargando stock actual de la empresa:", error);
      setStockActualEmpresa([]);
    } finally {
      setCargandoStockActual(false);
    }
  };

  useEffect(() => {
    if (!empresaIdActual) return;
    cargarCatalogoProductosStock();
    cargarStockActualEmpresa();

    // Mantiene visible el stock actualizado mientras el Supervisor trabaja.
    const timerStockActual = setInterval(cargarStockActualEmpresa, 5000);
    return () => clearInterval(timerStockActual);
  }, [empresaIdActual]);

  const textoProductoStock = (p) => {
    if (!p) return "";
    const codigo = p.codigo_cge || p.cge || p.codigo || "";
    const nombre = p.nombre || p.descripcion || p.producto || "Producto";
    const marca = p.marca || "";
    const presentacion = p.presentacion || "";
    return [codigo, nombre, marca, presentacion].filter(Boolean).join(" · ");
  };

  const analizarProductosStock = async (filas, columnas) => {
    if (!empresaIdActual) throw new Error("No se pudo identificar la empresa del Supervisor.");

    setAnalizandoStock(true);
    setStockReconocidos([]);
    setStockNoReconocidos([]);

    try {
      const { data: equivalencias, error: errorEquivalencias } = await supabase
        .from("stock_equivalencias")
        .select("codigo_archivo, producto_id, descripcion_archivo")
        .eq("empresa_id", empresaIdActual);

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
        const codigoNormalizado = String(e.codigo_archivo ?? "").trim().toUpperCase();
        if (codigoNormalizado) equivalenciaPorCodigo[codigoNormalizado] = e;
      });

      const reconocidos = [];
      const noReconocidos = [];

      filas.forEach(fila => {
        const codigoArchivo = columnas.codigo ? String(fila[columnas.codigo] ?? "").trim() : "";
        const descripcionArchivo = columnas.descripcion ? String(fila[columnas.descripcion] ?? "").trim() : "";
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
          color: columnas.color ? String(fila[columnas.color] ?? "").trim() : "",
          talle: columnas.talle ? String(fila[columnas.talle] ?? "").trim() : "",
          stock: Number.isFinite(stockNumero) ? stockNumero : null,
        };

        const codigoBuscado = codigoArchivo.toUpperCase();
        const equivalencia = equivalenciaPorCodigo[codigoBuscado];
        let producto = equivalencia ? productosPorId[String(equivalencia.producto_id)] : null;
        const idsPermitidosEmpresa = new Set(productosStockCatalogo.map(p => String(p.id)));

        // Si el código todavía no tiene equivalencia de Stock, reconocer también
        // el código vigente de la lista de precios de ESTA empresa (ej. WELT001)
        // o el CGE interno. No crea productos ni consume CGE.
        if (!producto) {
          producto = productosStockCatalogo.find(p =>
            String(p.codigo_cliente || "").trim().toUpperCase() === codigoBuscado ||
            String(p.codigo_cge || "").trim().toUpperCase() === codigoBuscado
          ) || null;
        }

        const productoPermitido = producto && idsPermitidosEmpresa.has(String(producto.id));

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
          color: item.color || null,
          talle: item.talle || null,
          stock: item.stock,
          crear: true,
        }))
      );

      return { reconocidos, noReconocidos };
    } finally {
      setAnalizandoStock(false);
    }
  };

  const descargarPlantillaStock = () => {
    const datosPlantilla = [
      ["Código", "Descripción", "Color", "Talle", "Stock"],
    ];

    const hoja = XLSX.utils.aoa_to_sheet(datosPlantilla);
    hoja["!cols"] = [
      { wch: 18 },
      { wch: 42 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Stock");
    XLSX.writeFile(libro, "RutaComercio_Plantilla_Stock.xlsx");
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
      const codigo = elegirColumnaStock(encabezados, ["codigo", "cod", "sku", "id"]);
      const descripcion = elegirColumnaStock(encabezados, ["articulo", "producto", "descripcion", "nombre"]);
      const color = elegirColumnaStock(encabezados, ["color", "colour", "tono"]);
      const talle = elegirColumnaStock(encabezados, ["talle", "talla", "size", "medida"]);
      const stock = elegirColumnaStock(encabezados, ["stock", "existencia", "existencias", "cantidad", "saldo"]);

      setStockColumnas({ codigo, descripcion, color, talle, stock });
      setStockEncabezadoFila(encabezado.indice + 1);

      const datos = matriz.slice(encabezado.indice + 1)
        .filter(fila => (fila || []).some(celda => String(celda ?? "").trim() !== ""))
        .slice(0, 100)
        .map((fila, idx) => {
          const obj = {};
          encabezados.forEach((h, colIdx) => { obj[h] = fila?.[colIdx] ?? ""; });
          return { __fila: encabezado.indice + 2 + idx, ...obj };
        });

      setStockVistaPrevia(datos);

      if (!codigo || !stock) {
        setStockMensaje("⚠️ La planilla se leyó, pero no pude detectar automáticamente Código y Stock. Todavía NO se modificó nada.");
      } else {
        const resultado = await analizarProductosStock(datos, { codigo, descripcion, color, talle, stock });
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
        producto_id: item.producto_id,
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

  const getBadgeColor = (estado) => {
    switch(estado) {
      case "Ingresado": return { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" };
      case "En Preparación": return { bg: "#fef3c7", text: "#b45309", border: "#fde68a" };
      case "Pasado a Depósito":
      case "En Depósito": return { bg: "#e0e7ff", text: "#4338ca", border: "#c7d2fe" };
      default: return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
    }
  };

  

  const cantidadUnidades = (pedido) =>
    (pedido?.items || []).reduce((acc, it) => acc + Number(it.cant || 0), 0);

  const armarTextoPedido = (pedido) => {
    if (!pedido) return "";

    const lineas = [`NVI #${pedido.numeroVisible}`];

    if (opcionesEnvio.cliente) lineas.push(`Cliente: ${pedido.cliente}`);
    if (opcionesEnvio.direccion) lineas.push(`Dirección: ${pedido.direccion}`);
    lineas.push(`Preventista: ${pedido.preventista}`);

    if (opcionesEnvio.articulos || opcionesEnvio.cantidades) {
      lineas.push("", "MERCADERÍA:");
      (pedido.items || []).forEach((it) => {
        let linea = opcionesEnvio.articulos
          ? `${it.codigo ? it.codigo + " - " : ""}${it.nombre}`
          : "Artículo";

        if (opcionesEnvio.cantidades) linea += ` | Cantidad: ${it.cant}`;
        if (opcionesEnvio.precioUnitario) linea += ` | P. unitario: $${Number(it.p_unit || 0).toLocaleString("es-AR")}`;
        if (opcionesEnvio.subtotales) linea += ` | Subtotal: $${Number(it.subtotal || 0).toLocaleString("es-AR")}`;
        lineas.push(linea);
      });
    }

    if (opcionesEnvio.importeTotal) {
      lineas.push("", `Importe total del pedido: $${Number(pedido.total || 0).toLocaleString("es-AR")}`);
    }
    if (opcionesEnvio.nota && pedido.nota) lineas.push(`Nota: ${pedido.nota}`);

    return lineas.join("\n");
  };

  const imprimirPedido = (pedido) => {
    const texto = armarTextoPedido(pedido);
    const ventana = window.open("", "_blank");
    if (!ventana) {
      alert("El navegador bloqueó la ventana de impresión.");
      return;
    }

    const escapar = (valor) =>
      String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    ventana.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>NVI #${escapar(pedido.numeroVisible)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            .sub { color: #64748b; margin-bottom: 20px; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.55; }
          </style>
        </head>
        <body>
          <h1>RutaComercio · NVI #${escapar(pedido.numeroVisible)}</h1>
          <div class="sub">${escapar(datosCabecera.empresa || "")}</div>
          <pre>${escapar(texto)}</pre>
          <script>window.onload = () => window.print();<\/script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  const enviarWhatsApp = (pedido) => {
    const telefonoIngresado = window.prompt(
      "Número de WhatsApp del depósito en formato internacional, sin + ni espacios.\nEjemplo Argentina: 5491122501680",
      ""
    );
    if (telefonoIngresado === null) return;

    const telefono = telefonoIngresado.replace(/\D/g, "");
    if (!telefono) {
      alert("Ingresá un número de WhatsApp.");
      return;
    }

    window.location.href =
      `https://wa.me/${telefono}?text=${encodeURIComponent(armarTextoPedido(pedido))}`;
  };

  const copiarParaEmail = async (pedido) => {
    const asunto = `NVI #${pedido.numeroVisible} - ${pedido.cliente}`;
    const contenido = `Asunto: ${asunto}\n\n${armarTextoPedido(pedido)}`;

    try {
      await navigator.clipboard.writeText(contenido);
      alert("Pedido copiado. Abrí tu correo y pegalo en un mensaje nuevo.");
    } catch (e) {
      window.prompt("Copiá este texto para enviarlo por email:", contenido);
    }
  };

  const marcarPasadoDeposito = async (pedido) => {
    if (!pedido?.id) return;
    const confirmar = window.confirm(`¿Confirmás que la NVI #${pedido.numeroVisible} ya fue pasada a depósito?\n\nSeguirá disponible en Historial para consultar, imprimir o reenviar.`);
    if (!confirmar) return;

    try {
      setProcesandoDeposito(true);
      const ahora = new Date().toISOString();
      // Usamos el campo estado que ya existe. No dependemos de columnas nuevas.
      const { error } = await supabase
        .from("pedidos")
        .update({ estado: "Pasado a Depósito" })
        .eq("id", pedido.id);
      if (error) throw error;

      setPedidos(prev => prev.map(p => String(p.id) === String(pedido.id)
        ? { ...p, estado: "Pasado a Depósito", pasado_deposito_at: ahora }
        : p));

      try {
        const pedidosLocales = JSON.parse(localStorage.getItem("pedidos_local") || "[]");
        const actualizados = pedidosLocales.map(loc =>
          String(loc.id) === String(pedido.id)
            ? { ...loc, estado: "Pasado a Depósito", pasado_deposito_at: ahora }
            : loc
        );
        localStorage.setItem("pedidos_local", JSON.stringify(actualizados));
      } catch (errorLocal) {
        console.warn("No se pudo sincronizar el respaldo local del pedido:", errorLocal);
      }

      setPedidoActivo(null);
      setMostrarExportacion(false);
      alert("✓ NVI pasada a depósito. Ya está disponible en Historial.");
    } catch (e) {
      console.error("Error pasando pedido a depósito:", e);
      alert("No se pudo marcar el pedido como pasado a depósito.");
    } finally {
      setProcesandoDeposito(false);
    }
  };

  const desarmarNombreItem = (item) => {
    const original = String(item?.nombre || "");
    const color = (original.match(/· Color ([^·]+)/i)?.[1] || "").trim();
    const talle = (original.match(/· Talle ([^·]+)/i)?.[1] || "").trim();
    const ajusteTxt = (original.match(/· (Normal|Recargo [\d.,]+%|Descuento [\d.,]+%)/i)?.[1] || "Normal").trim();
    const base = original
      .replace(/\s*· Color [^·]+/i, "")
      .replace(/\s*· Talle [^·]+/i, "")
      .replace(/\s*· (Normal|Recargo [\d.,]+%|Descuento [\d.,]+%)/i, "")
      .trim();

    let ajusteTipo = "normal";
    let ajustePct = 0;
    if (/^Recargo/i.test(ajusteTxt)) {
      ajusteTipo = "recargo";
      ajustePct = Number((ajusteTxt.match(/[\d.,]+/)?.[0] || "0").replace(",", "."));
    } else if (/^Descuento/i.test(ajusteTxt)) {
      ajusteTipo = "descuento";
      ajustePct = Number((ajusteTxt.match(/[\d.,]+/)?.[0] || "0").replace(",", "."));
    }

    const neto = Number(item?.p_unit || 0);
    const factor = ajusteTipo === "recargo"
      ? (1 + ajustePct / 100)
      : ajusteTipo === "descuento"
        ? (1 - ajustePct / 100)
        : 1;
    const precioLista = factor > 0 ? neto / factor : neto;

    return {
      ...item,
      nombreBase: base || original,
      color,
      talle,
      ajusteTipo,
      ajustePct,
      precioLista: Number(precioLista || 0)
    };
  };

  const cargarCatalogoParaEdicion = async (pedido) => {
    const empresaId = pedido?.empresa_id || empresaIdActual;
    if (!empresaId) {
      setCatalogoEdicion([]);
      return;
    }

    try {
      // Una sola referencia de precios por empresa.
      // La edición de una NVI ya NO depende de listas asignadas al comercio.
      const { data: listas, error: e1 } = await supabase
        .from("listas_precios")
        .select("id, predeterminada")
        .eq("empresa_id", empresaId)
        .eq("activo", true)
        .order("predeterminada", { ascending: false });

      if (e1) throw e1;

      const listaBase = (listas || []).find(l => l.predeterminada) || (listas || [])[0];
      if (!listaBase?.id) {
        setCatalogoEdicion([]);
        return;
      }

      const { data: renglones, error: e2 } = await supabase
        .from("lista_productos")
        .select("producto_id, codigo_lista, detalle_en_lista, precio")
        .eq("lista_id", listaBase.id)
        .eq("activo", true);

      if (e2) throw e2;

      const productoIds = [...new Set((renglones || []).map(x => x.producto_id).filter(Boolean))];
      if (!productoIds.length) {
        setCatalogoEdicion([]);
        return;
      }

      const { data: productos, error: e3 } = await supabase
        .from("productos")
        .select("id, codigo_cge, nombre, marca, activo")
        .in("id", productoIds);

      if (e3) throw e3;

      const porId = new Map((productos || []).map(p => [String(p.id), p]));
      const normalizados = (renglones || []).map(r => {
        const p = porId.get(String(r.producto_id));
        if (!p || p.activo === false) return null;
        return {
          producto_id: r.producto_id,
          codigo: r.codigo_lista || p.codigo_cge || "",
          nombreBase: r.detalle_en_lista || p.nombre || "Artículo",
          marca: p.marca || "",
          precioLista: Number(r.precio || 0)
        };
      }).filter(Boolean);

      setCatalogoEdicion(normalizados);
    } catch (e) {
      console.error("Error cargando catálogo para editar NVI:", e);
      setCatalogoEdicion([]);
    }
  };

  const iniciarEdicionNvi = async (pedido) => {
    setItemsEdicion((pedido.items || []).map((it, idx) => ({
      ...desarmarNombreItem(it),
      _key: `${it.producto_id || it.codigo || "item"}-${idx}-${Date.now()}`
    })));
    setBusquedaEdicion("");
    setEditandoNvi(true);
    await cargarCatalogoParaEdicion(pedido);
  };

  const actualizarItemEdicion = (key, cambios) => {
    setItemsEdicion(prev => prev.map(it => it._key === key ? { ...it, ...cambios } : it));
  };

  const quitarItemEdicion = (key) => {
    setItemsEdicion(prev => prev.filter(it => it._key !== key));
  };

  const agregarProductoEdicion = (prod) => {
    setItemsEdicion(prev => [{
      _key: `nuevo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      producto_id: prod.producto_id,
      codigo: prod.codigo,
      nombreBase: prod.nombreBase,
      marca: prod.marca,
      cant: 1,
      precioLista: Number(prod.precioLista || 0),
      ajusteTipo: "normal",
      ajustePct: 0,
      color: "",
      talle: ""
    }, ...prev]);
    setBusquedaEdicion("");
  };

  const calcularItemEdicion = (it) => {
    const pct = Math.max(0, Number(it.ajustePct || 0));
    const factor = it.ajusteTipo === "recargo"
      ? 1 + pct / 100
      : it.ajusteTipo === "descuento"
        ? 1 - pct / 100
        : 1;
    const unitario = Number(it.precioLista || 0) * factor;
    return {
      unitario,
      subtotal: unitario * Math.max(1, Number(it.cant || 1))
    };
  };

  const guardarEdicionNvi = async () => {
    if (!pedidoActivo?.id || guardandoEdicion) return;
    if (!itemsEdicion.length) {
      alert("La NVI debe conservar al menos un ítem. Si querés borrar todo el pedido, usá ELIMINAR NVI.");
      return;
    }

    const weltIncompletos = itemsEdicion.filter(it => {
      const esWelt = String(it.codigo || "").toUpperCase().startsWith("WELT") || String(it.marca || "").toUpperCase().includes("WELT");
      return esWelt && (!String(it.color || "").trim() || !String(it.talle || "").trim());
    });
    if (weltIncompletos.length) {
      alert("Hay artículos WELT sin color o talle.");
      return;
    }

    try {
      setGuardandoEdicion(true);

      const payloadItems = itemsEdicion.map(it => {
        const calc = calcularItemEdicion(it);
        const pct = Math.max(0, Number(it.ajustePct || 0));
        const ajusteTxt = it.ajusteTipo === "recargo"
          ? `Recargo ${pct}%`
          : it.ajusteTipo === "descuento"
            ? `Descuento ${pct}%`
            : "Normal";
        const nombre = `${it.nombreBase}${it.color ? ` · Color ${it.color}` : ""}${it.talle ? ` · Talle ${it.talle}` : ""} · ${ajusteTxt}`;

        return {
          pedido_id: pedidoActivo.id,
          producto_id: it.producto_id,
          producto_nombre: nombre,
          codigo: it.codigo || "",
          color: String(it.color || "").trim() || null,
          talle: String(it.talle || "").trim() || null,
          cantidad: Math.max(1, Number(it.cant || 1)),
          precio_unitario: Number(calc.unitario.toFixed(2)),
          subtotal: Number(calc.subtotal.toFixed(2))
        };
      });

      const totalNuevo = payloadItems.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
      const subtotalBruto = itemsEdicion.reduce((acc, it) => acc + Number(it.precioLista || 0) * Math.max(1, Number(it.cant || 1)), 0);
      const descuentoPorcentaje = subtotalBruto > 0
        ? Number((((subtotalBruto - totalNuevo) / subtotalBruto) * 100).toFixed(4))
        : 0;

      const { error: borrarError } = await supabase
        .from("pedido_items")
        .delete()
        .eq("pedido_id", pedidoActivo.id);
      if (borrarError) throw borrarError;

      const { error: insertarError } = await supabase
        .from("pedido_items")
        .insert(payloadItems);
      if (insertarError) throw insertarError;

      const { error: cabeceraError } = await supabase
        .from("pedidos")
        .update({
          subtotal: Number(subtotalBruto.toFixed(2)),
          descuento_porcentaje: descuentoPorcentaje,
          total: Number(totalNuevo.toFixed(2))
        })
        .eq("id", pedidoActivo.id)
        .eq("empresa_id", pedidoActivo.empresa_id || empresaIdActual);
      if (cabeceraError) throw cabeceraError;

      // 📦 Ajustar solamente la diferencia de stock respecto de la versión anterior de la NVI.
      const { error: stockError } = await supabase.rpc("sincronizar_stock_pedido", {
        p_pedido_id: pedidoActivo.id
      });
      if (stockError) throw stockError;

      setEditandoNvi(false);
      setItemsEdicion([]);
      setBusquedaEdicion("");
      setPedidoActivo(null);
      await cargarPedidosReales();
      alert(`✓ NVI #${pedidoActivo.numeroVisible} actualizada correctamente.`);
    } catch (e) {
      console.error("Error editando NVI:", e);
      alert("❌ No se pudo guardar la edición completa. Recargá la pantalla antes de volver a intentar.");
      await cargarPedidosReales();
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarNvi = async (pedido) => {
    if (!pedido?.id || eliminandoPedido) return;

    const confirmar = window.confirm(
      `⚠️ ¿Eliminar definitivamente la NVI #${pedido.numeroVisible} de ${pedido.cliente}?\n\n` +
      `Importe: $${Number(pedido.total || 0).toLocaleString("es-AR")}\n\n` +
      `La NVI y sus renglones se eliminarán. Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      setEliminandoPedido(true);

      // 📦 Antes de borrar la NVI, devolver exactamente el stock que esta NVI
      // había descontado. La función usa el registro de movimientos del pedido,
      // así que no duplica devoluciones.
      const { error: errorStock } = await supabase.rpc("revertir_stock_pedido", {
        p_pedido_id: pedido.id
      });
      if (errorStock) throw errorStock;

      const { error: errorItems } = await supabase
        .from("pedido_items")
        .delete()
        .eq("pedido_id", pedido.id);
      if (errorItems) throw errorItems;

      const { error: errorPedido } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", pedido.id)
        .eq("empresa_id", pedido.empresa_id || empresaIdActual);
      if (errorPedido) throw errorPedido;

      try {
        const pedidosLocales = JSON.parse(localStorage.getItem("pedidos_local") || "[]");
        const restantes = pedidosLocales.filter(loc => String(loc.id) !== String(pedido.id));
        localStorage.setItem("pedidos_local", JSON.stringify(restantes));
      } catch (errorLocal) {
        console.warn("No se pudo limpiar el respaldo local del pedido eliminado:", errorLocal);
      }

      setPedidos(prev => prev.filter(p => String(p.id) !== String(pedido.id)));
      setPedidoActivo(null);
      setMostrarExportacion(false);

      alert(`🗑️ NVI #${pedido.numeroVisible} eliminada correctamente.`);
    } catch (e) {
      console.error("Error eliminando NVI:", e);
      alert("❌ No se pudo eliminar la NVI. No se modificó el stock físico.");
      // Recargamos desde Supabase para no dejar la pantalla mostrando un estado parcial.
      await cargarPedidosReales();
    } finally {
      setEliminandoPedido(false);
    }
  };

  const estadoAbono = (() => {
    const nombreEmpresa = String(datosCabecera?.empresa || "").trim().toUpperCase();
    if (nombreEmpresa === "DEMO S.A." || nombreEmpresa === "DEMO SA") return { texto: "Cuenta DEMO", color: "#2563eb", icono: "🧪" };
    if (!datosCabecera?.abonado_hasta) return { texto: "Vencimiento no informado", color: "#64748b", icono: "🗓️" };
    const partes = String(datosCabecera.abonado_hasta).split("-").map(Number);
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

  const cerrarSesionSupervisor = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = "/";
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo.svg" alt="RutaComercio" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ margin: 0, fontSize: "17px", fontWeight: "800", letterSpacing: "-0.5px", color: "#0f172a" }}>RutaComercio Web</h1>
              <span style={{ backgroundColor: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: "700", padding: "1px 6px", borderRadius: "10px" }}>● En Vivo</span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Panel de Control y Supervisión Territorial</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", color: "#334155" }}>
            <span>{estadoAbono.icono}</span>
            <span>Abono: <strong style={{ color: estadoAbono.color }}>{estadoAbono.texto}</strong></span>
          </div>
          <a href="/pagos" style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", textDecoration: "none" }}><span>💳</span> Pagos & Suscripción</a>
          <button type="button" onClick={cerrarSesionSupervisor} style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}><span>✕</span> Salir</button>
        </div>
      </header>

      <div style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", display: "flex", gap: "20px", overflowX: "auto", whiteSpace: "nowrap" }}>
        <a href="/supervisor?seccion=monitoreo" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>📡 Monitoreo en Vivo</a>
        <a href="/supervisor?seccion=planificador" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>🗓️ Diseñador Hojas de Ruta (Semanal)</a>
        <button type="button" onClick={() => setVistaPedidos("Activos")} style={{ padding: "12px 0", background: "none", border: "none", borderBottom: !["Disponibilidad", "StockFisico"].includes(vistaPedidos) ? "2px solid #2563eb" : "2px solid transparent", color: !["Disponibilidad", "StockFisico"].includes(vistaPedidos) ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>📦 Pedidos</button>
        <button type="button" onClick={() => { setVistaPedidos("StockFisico"); setPedidoActivo(null); }} style={{ padding: "12px 0", background: "none", border: "none", borderBottom: vistaPedidos === "StockFisico" ? "2px solid #2563eb" : "2px solid transparent", color: vistaPedidos === "StockFisico" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>📥 CARGAR STOCK</button>
        <button type="button" onClick={() => { setVistaPedidos("Disponibilidad"); setPedidoActivo(null); }} style={{ padding: "12px 0", background: "none", border: "none", borderBottom: vistaPedidos === "Disponibilidad" ? "2px solid #2563eb" : "2px solid transparent", color: vistaPedidos === "Disponibilidad" ? "#2563eb" : "#64748b", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>📦 Disponibilidad</button>
        <a href="/supervisor?seccion=clientes" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>🏪 Clientes</a>
        <a href="/supervisor?seccion=estadoCuenta" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>💳 Estado de Cuenta</a>
        <a href="/supervisor?seccion=listasPrecios" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>💲 Listas de Precios</a>
        <a href="/supervisor?seccion=solicitudes" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>🚫 Solicitudes</a>
      </div>

      <div style={{ width: "100%" }}>
        <main style={{ padding: "16px 24px", maxWidth: "1500px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {/* Métricas Resumen */}
          {vistaPedidos !== "Disponibilidad" && vistaPedidos !== "StockFisico" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "8px", marginBottom: "12px" }}>
            <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "800" }}>💰 VENDIDO HOY · {fechaCorta(hoyMetricas)}</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#2563eb", marginTop: "2px" }}>${vendidoHoy.toLocaleString("es-AR")}</div>
            </div>
            <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "800" }}>💰 VENDIDO AYER · {fechaCorta(ayerMetricas)}</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#2563eb", marginTop: "2px" }}>${vendidoAyer.toLocaleString("es-AR")}</div>
            </div>
            <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "800" }}>💰 VENDIDO EN {nombreMesActual}</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#2563eb", marginTop: "2px" }}>${vendidoMes.toLocaleString("es-AR")}</div>
            </div>
            <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "800" }}>🧾 NVI HOY · {fechaCorta(hoyMetricas)}</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#16a34a", marginTop: "2px" }}>{nviHoy.length}</div>
            </div>
            <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "800" }}>🧾 NVI AYER · {fechaCorta(ayerMetricas)}</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#16a34a", marginTop: "2px" }}>{nviAyer.length}</div>
            </div>
            <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "800" }}>🧾 NVI EN {nombreMesActual}</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#16a34a", marginTop: "2px" }}>{nviMes.length}</div>
            </div>
          </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
            {["Activos", "Historial", "HistorialClientes", "Disponibilidad", "StockFisico"].map(v => (
              <button key={v} type="button" onClick={() => { setVistaPedidos(v); setFiltroEstado("Todos"); setPedidoActivo(null); }}
                style={{ padding: "8px 14px", borderRadius: "8px", border: vistaPedidos === v ? "1px solid #2563eb" : "1px solid #cbd5e1", background: vistaPedidos === v ? "#eff6ff" : "#fff", color: vistaPedidos === v ? "#1d4ed8" : "#475569", fontWeight: "800", cursor: "pointer" }}>
                {v === "Activos" ? "🧾 Notas de Venta Activas (NVI)" : v === "Historial" ? "🧑‍💼 Historial Vendedores" : v === "HistorialClientes" ? "🏪 Historial Clientes" : v === "Disponibilidad" ? "📦 Stock relativo" : "📊 Stock físico"}
              </button>
            ))}
          </div>

          {vistaPedidos === "HistorialClientes" ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
              <div style={{ fontSize: "18px", fontWeight: "900", marginBottom: "4px" }}>🏪 Historial de ventas por cliente</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                Incluye todas las NVI del cliente, tanto activas como enviadas a Depósito.
              </div>

              <input
                type="text"
                value={busquedaHistorialCliente}
                onChange={(e) => setBusquedaHistorialCliente(e.target.value)}
                placeholder="🔎 Buscar cliente..."
                style={{ width: "100%", maxWidth: "520px", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}
              />

              {historialClientes.length === 0 ? (
                <div style={{ padding: "18px", color: "#64748b", background: "#f8fafc", borderRadius: "8px" }}>
                  No hay clientes con ventas para mostrar.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {historialClientes.map((cliente) => (
                    <div key={cliente.cliente.toLowerCase()} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", background: "#f8fafc" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>🏪 {cliente.cliente}</div>
                          <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                            📦 Compras: <strong>{cliente.compras}</strong> · 💰 Total histórico: <strong>${cliente.total.toLocaleString("es-AR")}</strong>
                          </div>
                          <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px" }}>
                            🛒 Última compra: <strong>{cliente.ultimaFecha ? new Date(cliente.ultimaFecha).toLocaleDateString("es-AR") : "Sin fecha"}</strong>
                            {cliente.ultimaFecha ? ` · $${Number(cliente.ultimaTotal || 0).toLocaleString("es-AR")}` : ""}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: "10px", display: "grid", gap: "6px" }}>
                        {[...cliente.pedidos]
                          .sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0))
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setVistaPedidos(esPasadoDeposito(p) ? "Historial" : "Activos");
                                setFiltroPreventista("Todos");
                                setFiltroEstado("Todos");
                                setPedidoActivo(p);
                              }}
                              style={{ width: "100%", textAlign: "left", padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", cursor: "pointer", color: "#0f172a" }}
                            >
                              <strong>🧾 NVI #{p.numeroVisible}</strong>
                              {" · "}{p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleDateString("es-AR") : "Sin fecha"}
                              {" · "}${Number(p.total || 0).toLocaleString("es-AR")}
                              {" · "}🧑‍💼 {p.preventista || "Sin vendedor"}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : vistaPedidos === "StockFisico" ? (
            <div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontSize: "17px", fontWeight: "900", color: "#0f172a" }}>📊 Stock físico</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                      El Supervisor carga la planilla de existencias de su empresa. Podés revisar los datos antes de confirmar la actualización del stock.
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
                      background: cargandoStockArchivo ? "#94a3b8" : "#2563eb",
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
                  const stockPorProducto = new Map();

                  // Conservamos todas las filas de stock por producto para soportar
                  // artículos simples y también variantes de color/talle.
                  (stockActualEmpresa || []).forEach((fila) => {
                    const pid = String(fila.producto_id || "");
                    if (!pid) return;
                    if (!stockPorProducto.has(pid)) stockPorProducto.set(pid, []);
                    stockPorProducto.get(pid).push(fila);
                  });

                  const filasStock = [];
                  (productosStockCatalogo || []).forEach((producto) => {
                    const filas = stockPorProducto.get(String(producto.id)) || [];
                    if (filas.length > 0) {
                      filas.forEach(fila => filasStock.push({ producto, fila }));
                    } else {
                      filasStock.push({ producto, fila: null });
                    }
                  });

                  const q = busquedaStockActual.trim().toLowerCase();
                  const filtradas = filasStock.filter(({ producto, fila }) => {
                    if (!q) return true;
                    return [
                      producto.codigo_cliente,
                      producto.nombre,
                      producto.descripcion,
                      producto.marca,
                      fila?.color,
                      fila?.talle,
                      fila?.variante_color,
                      fila?.variante_talle,
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
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                              Inventario guardado de esta empresa. Se refresca automáticamente cada 5 segundos.
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                            <input
                              value={busquedaStockActual}
                              onChange={e => setBusquedaStockActual(e.target.value)}
                              placeholder="Buscar código, artículo, color o talle..."
                              style={{ width: "280px", maxWidth: "70vw", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "7px", fontSize: "11px" }}
                            />
                            <button type="button" onClick={cargarStockActualEmpresa} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "7px", background: "#fff", fontWeight: "800", cursor: "pointer" }}>
                              ↻ Actualizar
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: esMovil ? "1fr" : "repeat(3, 1fr)", gap: "8px", marginTop: "10px" }}>
                          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "8px 10px" }}>
                            <div style={{ fontSize: "9px", color: "#166534", fontWeight: "900" }}>CON STOCK</div>
                            <div style={{ fontSize: "19px", color: "#15803d", fontWeight: "900" }}>{conStock}</div>
                          </div>
                          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 10px" }}>
                            <div style={{ fontSize: "9px", color: "#991b1b", fontWeight: "900" }}>SIN STOCK</div>
                            <div style={{ fontSize: "19px", color: "#dc2626", fontWeight: "900" }}>{sinStock}</div>
                          </div>
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px" }}>
                            <div style={{ fontSize: "9px", color: "#475569", fontWeight: "900" }}>NO INFORMADO</div>
                            <div style={{ fontSize: "19px", color: "#475569", fontWeight: "900" }}>{noInformado}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ maxHeight: "380px", overflow: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", minWidth: "720px" }}>
                          <thead style={{ position: "sticky", top: 0, background: "#eef2ff", zIndex: 1 }}>
                            <tr>
                              {["Código", "Artículo", "Color", "Talle", "Stock", "Actualizado"].map(h => (
                                <th key={h} style={{ textAlign: h === "Stock" ? "right" : "left", padding: "8px", borderBottom: "1px solid #cbd5e1" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {cargandoStockActual && filtradas.length === 0 ? (
                              <tr><td colSpan="6" style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>Cargando stock...</td></tr>
                            ) : filtradas.length === 0 ? (
                              <tr><td colSpan="6" style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>No hay artículos para mostrar.</td></tr>
                            ) : filtradas.map(({ producto, fila }, idx) => {
                              const cantidad = fila ? Number(fila.stock_informado ?? 0) : null;
                              const fecha = fila?.fecha_actualizacion;
                              return (
                                <tr key={`${producto.id}-${fila?.id || idx}`} style={{ background: idx % 2 ? "#fff" : "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                                  <td style={{ padding: "8px", fontWeight: "800", whiteSpace: "nowrap" }}>{producto.codigo_cliente || "—"}</td>
                                  <td style={{ padding: "8px" }}>{producto.nombre || producto.descripcion || "Artículo"}</td>
                                  <td style={{ padding: "8px" }}>{fila?.color || fila?.variante_color || "—"}</td>
                                  <td style={{ padding: "8px" }}>{fila?.talle || fila?.variante_talle || "—"}</td>
                                  <td style={{
                                    padding: "8px",
                                    textAlign: "right",
                                    fontWeight: "900",
                                    color: cantidad === null ? "#94a3b8" : cantidad <= 0 ? "#dc2626" : cantidad <= 5 ? "#d97706" : "#15803d"
                                  }}>
                                    {cantidad === null ? "No informado" : cantidad.toLocaleString("es-AR")}
                                  </td>
                                  <td style={{ padding: "8px", color: "#64748b", whiteSpace: "nowrap" }}>
                                    {fecha ? new Date(fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                                  </td>
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
                    <div style={{ display: "grid", gridTemplateColumns: esMovil ? "1fr" : "repeat(3, minmax(180px, 1fr))", gap: "8px", marginBottom: "12px" }}>
                      {[
                        ["Código", stockColumnas.codigo],
                        ["Artículo / descripción", stockColumnas.descripcion],
                        ["Color", stockColumnas.color],
                        ["Talle", stockColumnas.talle],
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

                    <div style={{ display: "grid", gridTemplateColumns: esMovil ? "1fr" : "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
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
                            <th style={{ textAlign: "right", padding: "8px" }}>Stock informado</th>
                          </tr></thead>
                          <tbody>
                            {stockReconocidos.slice(0, 30).map((item, idx) => (
                              <tr key={idx} style={{ borderTop: "1px solid #dcfce7" }}>
                                <td style={{ padding: "8px", fontWeight: "800" }}>{item.codigoArchivo || "—"}</td>
                                <td style={{ padding: "8px" }}>{item.codigo_cge || "—"}</td>
                                <td style={{ padding: "8px" }}>{item.producto_nombre || "—"}{item.marca ? ` · ${item.marca}` : ""}</td>
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
                            <div key={`${item.codigoArchivo}-${idx}`} style={{ display: "grid", gridTemplateColumns: esMovil ? "1fr" : "100px minmax(260px,1fr) 100px", gap: "8px", alignItems: "center", padding: "9px 10px", border: "1px solid #e2e8f0", borderRadius: "7px", background: "#f8fafc" }}>
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
                            Seleccionados para una futura incorporación: <strong>{productosNuevosPropuestos.filter(p => p.crear).length}</strong>. El Supervisor puede desmarcar cualquier fila que no quiera incorporar. El CGE se generará recién al confirmar la incorporación.
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
                            <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Color</th>
                            <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Talle</th>
                            <th style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockVistaPrevia.slice(0, 30).map((fila, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{fila.__fila}</td>
                              <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", fontWeight: "700" }}>{stockColumnas.codigo ? String(fila[stockColumnas.codigo] ?? "") : "—"}</td>
                              <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>{stockColumnas.descripcion ? String(fila[stockColumnas.descripcion] ?? "") : "—"}</td>
                              <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>{stockColumnas.color ? String(fila[stockColumnas.color] ?? "") : "—"}</td>
                              <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>{stockColumnas.talle ? String(fila[stockColumnas.talle] ?? "") : "—"}</td>
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
          ) : vistaPedidos === "Disponibilidad" ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px", marginBottom: "12px" }}>
                <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "800" }}>ARTÍCULOS CON MOVIMIENTO</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#2563eb", marginTop: "3px" }}>{resumenArticulosHoy.length}</div>
                </div>
                <div style={{ background: "#fffbeb", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                  <div style={{ fontSize: "10px", color: "#92400e", fontWeight: "800" }}>STOCK CRÍTICO</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#d97706", marginTop: "3px" }}>{totalCriticos}</div>
                </div>
                <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #fecaca" }}>
                  <div style={{ fontSize: "10px", color: "#991b1b", fontWeight: "800" }}>BLOQUEADOS</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#dc2626", marginTop: "3px" }}>{totalBloqueados}</div>
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>📦 Stock relativo</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      Seguimiento relativo según los pedidos registrados en RutaComercio. No representa stock físico ni cantidad disponible en depósito.
                    </div>
                  </div>
                  <input
                    value={busquedaDisponibilidad}
                    onChange={e => setBusquedaDisponibilidad(e.target.value)}
                    placeholder="Buscar artículo o código..."
                    style={{ minWidth: esMovil ? "100%" : "260px", padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ marginBottom: "10px", padding: "9px 10px", borderRadius: "8px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a", fontSize: "11px", lineHeight: 1.45 }}>
                  <strong>¿Qué significa Stock relativo?</strong> RutaComercio muestra cuánto se pidió de cada artículo durante la jornada y permite al Supervisor comunicar su situación comercial como Disponible, Crítico o Bloqueado. No calcula existencias físicas.
                </div>

                {resumenArticulosFiltrado.length === 0 ? (
                  <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                    Todavía no hay artículos pedidos para mostrar hoy.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    {resumenArticulosFiltrado.map(item => {
                      const estado = disponibilidadProductos[String(item.productoId)]?.estado || "disponible";
                      const guardando = guardandoDisponibilidad === String(item.productoId);
                      return (
                        <div key={String(item.productoId)} style={{ display: "grid", gridTemplateColumns: esMovil ? "1fr" : "minmax(260px, 1.6fr) 110px 100px minmax(300px, 1.3fr)", gap: "8px", alignItems: "center", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: estado === "bloqueado" ? "#fef2f2" : estado === "critico" ? "#fffbeb" : "#fff" }}>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: "900", color: "#0f172a" }}>{item.nombre}</div>
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{item.codigo || "Sin código"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "800" }}>PEDIDO HOY</div>
                            <div style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>{item.cantidad} u.</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "800" }}>NVI</div>
                            <div style={{ fontSize: "13px", fontWeight: "800" }}>{item.pedidosCount}</div>
                          </div>
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                            {[
                              ["disponible", "🟢 Disponible"],
                              ["critico", "🟠 Crítico"],
                              ["bloqueado", "🔴 Bloqueado"],
                            ].map(([valor, etiqueta]) => (
                              <button
                                key={valor}
                                type="button"
                                disabled={guardando}
                                onClick={() => cambiarEstadoDisponibilidad(item, valor)}
                                style={{
                                  padding: "7px 9px",
                                  borderRadius: "7px",
                                  border: estado === valor ? "2px solid #2563eb" : "1px solid #cbd5e1",
                                  background: estado === valor ? "#eff6ff" : "#fff",
                                  color: "#334155",
                                  fontSize: "10px",
                                  fontWeight: "800",
                                  cursor: guardando ? "wait" : "pointer",
                                  opacity: guardando ? 0.6 : 1,
                                }}
                              >
                                {etiqueta}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
          <>
          {/* Barra de Filtros */}
          <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 140px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569" }}>👤 Vendedor:</span>
              <select value={filtroPreventista} onChange={e => setFiltroPreventista(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: "6px", border: "1.5px solid #2563eb", fontSize: "12px", background: "#ffffff", color: "#0f172a", fontWeight: "700", outline: "none" }}>
                <option value="Todos">Todos</option>
                {preventistasReales.map((p, i) => <option key={i} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Grilla de Comandas y Detalle en Columna Móvil */}
          <div style={{ display: "flex", flexDirection: esMovil ? "column" : "row", gap: "12px", alignItems: "start" }}>
            <div style={{ width: esMovil ? "100%" : "55%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "7px 10px", marginBottom: "7px", fontSize: "12px", fontWeight: "900", color: "#0f172a" }}>
                <span>💰 VENDIDO HOY — TOTAL: ${totalVendidoHoyTodos.toLocaleString("es-AR")}</span>
                {filtroPreventista !== "Todos" && (
                  <span style={{ color: "#1d4ed8" }}>👤 {filtroPreventista}: ${totalVendidoHoyVendedor.toLocaleString("es-AR")} ({porcentajeVendedorHoy}% del total)</span>
                )}
              </div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "8px", textTransform: "uppercase" }}>
                {vistaPedidos === "Activos" ? "Notas de Venta Activas (NVI)" : "Historial"} ({listaFiltrada.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {listaFiltrada.map(p => {
                  const b = getBadgeColor(p.estado);
                  const activo = pedidoActivo && pedidoActivo.id === p.id;
                  return (
                    <div key={p.id} onClick={() => setPedidoActivo(p)} style={{ background: activo ? "#eff6ff" : "#fff", border: activo ? "2px solid #2563eb" : "1px solid #dbe3ee", borderRadius: "8px", padding: "7px 10px", cursor: "pointer" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", overflow: "hidden" }}>
                            <span style={{ fontWeight: "900", fontSize: "13px", color: "#2563eb", flexShrink: 0 }}>NVI #{p.numeroVisible}</span>
                            <span style={{ fontWeight: "900", fontSize: "13px", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis" }}>· {p.cliente}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
                            <span style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>${p.total.toLocaleString("es-AR")}</span>
                            <span style={{ background: b.bg, color: b.text, border: "1px solid " + b.border, fontSize: "10px", fontWeight: "900", padding: "2px 6px", borderRadius: "8px" }}>{p.estado}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", fontWeight: "800", color: "#334155", whiteSpace: "nowrap", overflow: "hidden" }}>
                          <span>👤 {p.preventista} · {cantidadUnidades(p)} unid.</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>· 📍 {p.direccion}</span>
                          <span style={{ marginLeft: "auto", flexShrink: 0 }}>· 📅 {p.fechaCorta || (p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "--/--")} · 🕐 {p.hora}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {pedidoActivo && (
              <div style={{ width: esMovil ? "100%" : "45%", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "12px", position: esMovil ? "static" : "sticky", top: "70px", marginTop: esMovil ? "10px" : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>DETALLE SELECCIONADO</div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>NVI #{pedidoActivo.numeroVisible} · {pedidoActivo.cliente}</div>
                  </div>
                  <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "10px", fontWeight: "800", padding: "3px 6px", borderRadius: "4px" }}>
                    {pedidoActivo.lista}
                  </span>
                </div>

                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "10px", lineHeight: 1.4 }}>
                  <div>📍 <strong>Dirección:</strong> {pedidoActivo.direccion}</div>
                  <div>👤 <strong>Preventista:</strong> {pedidoActivo.preventista} ({pedidoActivo.ruta})</div>
                  <div>📝 <strong>Nota:</strong> <em>"{pedidoActivo.nota}"</em></div>
                </div>

                <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>MERCADERÍA ({pedidoActivo.items.length} ítems)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                  {pedidoActivo.items.map((it, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "#f8fafc", borderRadius: "6px", fontSize: "11px" }}>
                      <div>
                        <div style={{ fontWeight: "700", color: "#0f172a" }}>{it.nombre}</div>
                        <div style={{ color: "#64748b", fontSize: "10px" }}>{it.cant} × ${it.p_unit.toLocaleString("es-AR")}</div>
                      </div>
                      <div style={{ fontWeight: "800", color: "#0f172a" }}>${it.subtotal.toLocaleString("es-AR")}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#eff6ff", borderRadius: "6px", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#2563eb", fontWeight: "700" }}>TOTAL PEDIDO</div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>{cantidadUnidades(pedidoActivo)} unidades</div>
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "900", color: "#1d4ed8" }}>
                    ${pedidoActivo.total.toLocaleString("es-AR")}
                  </div>
                </div>

                {!editandoNvi ? (
                  <button
                    type="button"
                    onClick={() => iniciarEdicionNvi(pedidoActivo)}
                    style={{ width: "100%", marginBottom: "8px", background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74", padding: "10px", borderRadius: "6px", fontSize: "12px", fontWeight: "900", cursor: "pointer" }}
                  >
                    ✏️ EDITAR NVI
                  </button>
                ) : (
                  <div style={{ marginBottom: "10px", padding: "10px", border: "2px solid #fdba74", borderRadius: "8px", background: "#fff7ed" }}>
                    <div style={{ fontSize: "12px", fontWeight: "900", color: "#9a3412", marginBottom: "8px" }}>
                      ✏️ Editando NVI #{pedidoActivo.numeroVisible}
                    </div>

                    <input
                      value={busquedaEdicion}
                      onChange={(e) => setBusquedaEdicion(e.target.value)}
                      placeholder="Agregar artículo por código o nombre..."
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px", border: "1px solid #fdba74", borderRadius: "6px", marginBottom: "6px" }}
                    />

                    {busquedaEdicion.trim() && (
                      <div style={{ maxHeight: "150px", overflowY: "auto", background: "#fff", border: "1px solid #fed7aa", borderRadius: "6px", marginBottom: "8px" }}>
                        {catalogoEdicion
                          .filter(p => `${p.codigo} ${p.nombreBase} ${p.marca}`.toLowerCase().includes(busquedaEdicion.toLowerCase()))
                          .slice(0, 12)
                          .map((p, idx) => (
                            <button
                              key={`${p.producto_id}-${idx}`}
                              type="button"
                              onClick={() => agregarProductoEdicion(p)}
                              style={{ width: "100%", textAlign: "left", padding: "7px", border: "none", borderBottom: "1px solid #f1f5f9", background: "#fff", cursor: "pointer", fontSize: "11px" }}
                            >
                              <strong>{p.codigo}</strong> · {p.nombreBase} · ${Number(p.precioLista || 0).toLocaleString("es-AR")}
                            </button>
                          ))}
                      </div>
                    )}

                    {itemsEdicion.map((it) => {
                      const esWelt = String(it.codigo || "").toUpperCase().startsWith("WELT") || String(it.marca || "").toUpperCase().includes("WELT");
                      const calc = calcularItemEdicion(it);
                      return (
                        <div key={it._key} style={{ background: "#fff", border: "1px solid #fed7aa", borderRadius: "7px", padding: "7px", marginBottom: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "center" }}>
                            <div style={{ minWidth: 0, fontSize: "11px", fontWeight: "800" }}>
                              {it.codigo ? `${it.codigo} · ` : ""}{it.nombreBase}
                            </div>
                            <button type="button" onClick={() => quitarItemEdicion(it._key)} style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: "16px" }}>🗑️</button>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: esWelt ? "62px 1fr 64px 78px 52px" : "62px 1fr 78px 52px", gap: "4px", alignItems: "end", marginTop: "6px" }}>
                            <label style={{ fontSize: "9px", color: "#64748b" }}>
                              Cant.
                              <input type="number" min="1" value={it.cant} onChange={(e) => actualizarItemEdicion(it._key, { cant: Math.max(1, Number(e.target.value || 1)) })} style={{ width: "100%", boxSizing: "border-box", padding: "5px 3px" }} />
                            </label>

                            {esWelt && (
                              <label style={{ fontSize: "9px", color: "#64748b" }}>
                                Color
                                <select value={it.color || ""} onChange={(e) => actualizarItemEdicion(it._key, { color: e.target.value })} style={{ width: "100%", boxSizing: "border-box", padding: "5px 2px" }}>
                                  <option value="">Elegir</option>
                                  <option value="Negro">Negro</option>
                                  <option value="Marrón">Marrón</option>
                                  <option value="Blanco">Blanco</option>
                                  <option value="Gris Fresno">Gris Fresno</option>
                                </select>
                              </label>
                            )}

                            {esWelt && (
                              <label style={{ fontSize: "9px", color: "#64748b" }}>
                                Talle
                                <select value={it.talle || ""} onChange={(e) => actualizarItemEdicion(it._key, { talle: e.target.value })} style={{ width: "100%", boxSizing: "border-box", padding: "5px 2px" }}>
                                  <option value="">--</option>
                                  {Array.from({ length: 18 }, (_, i) => 33 + i).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </label>
                            )}

                            <label style={{ fontSize: "9px", color: "#64748b" }}>
                              Ajuste
                              <select value={it.ajusteTipo || "normal"} onChange={(e) => actualizarItemEdicion(it._key, { ajusteTipo: e.target.value, ajustePct: e.target.value === "normal" ? 0 : it.ajustePct })} style={{ width: "100%", boxSizing: "border-box", padding: "5px 2px" }}>
                                <option value="normal">Normal</option>
                                <option value="descuento">Desc.</option>
                                <option value="recargo">Recargo</option>
                              </select>
                            </label>

                            <label style={{ fontSize: "9px", color: "#64748b" }}>
                              %
                              <input type="number" min="0" disabled={(it.ajusteTipo || "normal") === "normal"} value={it.ajustePct || ""} onChange={(e) => actualizarItemEdicion(it._key, { ajustePct: Math.max(0, Number(e.target.value || 0)) })} style={{ width: "100%", boxSizing: "border-box", padding: "5px 2px" }} />
                            </label>
                          </div>

                          <div style={{ marginTop: "5px", textAlign: "right", fontSize: "11px", fontWeight: "900" }}>
                            ${Number(calc.subtotal || 0).toLocaleString("es-AR")}
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "8px" }}>
                      <button type="button" onClick={() => { setEditandoNvi(false); setItemsEdicion([]); setBusquedaEdicion(""); }} disabled={guardandoEdicion} style={{ padding: "9px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", fontWeight: "800", cursor: "pointer" }}>
                        CANCELAR
                      </button>
                      <button type="button" onClick={guardarEdicionNvi} disabled={guardandoEdicion} style={{ padding: "9px", borderRadius: "6px", border: "none", background: "#d97706", color: "#fff", fontWeight: "900", cursor: guardandoEdicion ? "wait" : "pointer" }}>
                        {guardandoEdicion ? "Guardando..." : "💾 GUARDAR CAMBIOS"}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setMostrarExportacion(v => !v)}
                  style={{ width: "100%", background: "#2563eb", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}
                >
                  📤 ENVIAR / EXPORTAR PEDIDO
                </button>

                {mostrarExportacion && (
                  <div style={{ marginTop: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px", background: "#f8fafc" }}>
                    <div style={{ fontSize: "12px", fontWeight: "800", marginBottom: "8px" }}>Datos a incluir</div>

                    <div style={{ display: "grid", gridTemplateColumns: esMovil ? "1fr" : "1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                      {[
                        ["cliente", "Datos del cliente"],
                        ["direccion", "Dirección"],
                        ["articulos", "Código y descripción"],
                        ["cantidades", "Cantidades"],
                        ["precioUnitario", "Precio unitario"],
                        ["subtotales", "Importes por artículo"],
                        ["importeTotal", "Importe total del pedido"],
                        ["nota", "Nota del pedido"],
                      ].map(([clave, etiqueta]) => (
                        <label key={clave} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#334155", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={opcionesEnvio[clave]}
                            onChange={e => setOpcionesEnvio(prev => ({ ...prev, [clave]: e.target.checked }))}
                          />
                          {etiqueta}
                        </label>
                      ))}
                    </div>

                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px" }}>
                      Los importes son opcionales. La cantidad de bultos no se calcula: depósito la definirá cuando prepare físicamente el pedido.
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: esMovil ? "1fr" : "repeat(3, 1fr)", gap: "6px" }}>
                      <button type="button" onClick={() => imprimirPedido(pedidoActivo)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", fontWeight: "800", cursor: "pointer" }}>
                        🖨️ PDF / Imprimir
                      </button>
                      <button type="button" onClick={() => enviarWhatsApp(pedidoActivo)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", fontWeight: "800", cursor: "pointer" }}>
                        💬 WhatsApp
                      </button>
                      <button type="button" onClick={() => copiarParaEmail(pedidoActivo)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", fontWeight: "800", cursor: "pointer" }}>
                        📋 Copiar para email
                      </button>
                    </div>
                  </div>
                )}

                {vistaPedidos === "Activos" ? (
                  <button
                    type="button"
                    onClick={() => marcarPasadoDeposito(pedidoActivo)}
                    disabled={procesandoDeposito}
                    style={{ width: "100%", marginTop: "10px", background: "#16a34a", color: "#fff", border: "none", padding: "11px", borderRadius: "6px", fontSize: "12px", fontWeight: "900", cursor: procesandoDeposito ? "wait" : "pointer" }}
                  >
                    {procesandoDeposito ? "Procesando..." : "✅ PASADO A DEPÓSITO"}
                  </button>
                ) : (
                  <div style={{ marginTop: "10px", padding: "9px 10px", borderRadius: "7px", background: "#eef2ff", color: "#3730a3", fontSize: "11px", fontWeight: "700" }}>
                    📚 Pedido archivado como pasado a depósito. Podés volver a imprimirlo o reenviarlo por cualquiera de las vías disponibles.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => eliminarNvi(pedidoActivo)}
                  disabled={eliminandoPedido || procesandoDeposito}
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    background: "#fff",
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    padding: "10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "900",
                    cursor: (eliminandoPedido || procesandoDeposito) ? "wait" : "pointer"
                  }}
                >
                  {eliminandoPedido ? "Eliminando..." : "🗑️ ELIMINAR NVI"}
                </button>
              </div>
            )}
          </div>
          </>
          )}
        </main>
      </div>
    </div>
  );
}
