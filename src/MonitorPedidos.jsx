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
  const [stockColumnas, setStockColumnas] = useState({ codigo: "", descripcion: "", stock: "" });
  const [stockEncabezadoFila, setStockEncabezadoFila] = useState(null);
  const [stockMensaje, setStockMensaje] = useState("");
  const [cargandoStockArchivo, setCargandoStockArchivo] = useState(false);
  const [stockReconocidos, setStockReconocidos] = useState([]);
  const [stockNoReconocidos, setStockNoReconocidos] = useState([]);
  const [analizandoStock, setAnalizandoStock] = useState(false);
  const [productosStockCatalogo, setProductosStockCatalogo] = useState([]);
  const [productosNuevosPropuestos, setProductosNuevosPropuestos] = useState([]);
  const [confirmandoImportacionStock, setConfirmandoImportacionStock] = useState(false);

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
            .select("pedido_id, producto_id, producto_nombre, codigo, cantidad, precio_unitario, subtotal")
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
            .select("id, direccion, localidad, partido, provincia, pais")
            .in("id", idsComercios);

          if (errorComercios) {
            console.error("Error cargando direcciones de comercios:", errorComercios);
          } else {
            (comerciosData || []).forEach(c => {
              direccionPorComercio[String(c.id)] = [
                c.localidad,
                c.partido,
              ].filter(Boolean).join(", ");
            });
          }
        }

        listaConsolidada = data.map(p => {
          const itemsReales = itemsPorPedido[String(p.id)] || [];
          const direccionReal = direccionPorComercio[String(p.comercio_id)] || "";
          return {
            id: p.id || ("PED-" + String(p.created_at || Date.now()).slice(-4)),
            empresa_id: p.empresa_id || perfil.empresa_id,
            numeroVisible: String(p.numero_pedido || "").padStart(6, "0"),
            fechaCreacion: p.created_at || null,
            fechaCorta: p.created_at ? new Date(p.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "--/--",
            hora: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "En curso",
            preventista: p.preventista || p.vendedor || "Walter",
            ruta: p.ruta || "Ruta de Visita",
            cliente: p.cliente || p.comercio_nombre || ("Comercio #" + (p.comercio_id || "")),
            direccion: direccionReal || p.direccion || "Sin localidad/partido cargado",
            condicion: p.condicion || "Consumidor Final",
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
  const [procesandoDeposito, setProcesandoDeposito] = useState(false);
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
        .select("id")
        .eq("empresa_id", empresaIdActual)
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
        .select("producto_id")
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
      setProductosStockCatalogo(productosEmpresa || []);
    } catch (error) {
      console.error("Error cargando catálogo de stock de la empresa:", error);
      setProductosStockCatalogo([]);
    }
  };

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
        equivalenciaPorCodigo[String(e.codigo_archivo ?? "").trim()] = e;
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
          stock: Number.isFinite(stockNumero) ? stockNumero : null,
        };

        const equivalencia = equivalenciaPorCodigo[codigoArchivo];
        const producto = equivalencia ? productosPorId[String(equivalencia.producto_id)] : null;
        const idsPermitidosEmpresa = new Set(productosStockCatalogo.map(p => String(p.id)));
        const productoPermitido = producto && idsPermitidosEmpresa.has(String(producto.id));

        if (equivalencia && productoPermitido) {
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
      const codigo = elegirColumnaStock(encabezados, ["codigo", "cod", "sku", "id"]);
      const descripcion = elegirColumnaStock(encabezados, ["articulo", "producto", "descripcion", "nombre"]);
      const stock = elegirColumnaStock(encabezados, ["stock", "existencia", "existencias", "cantidad", "saldo"]);

      setStockColumnas({ codigo, descripcion, stock });
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
        const resultado = await analizarProductosStock(datos, { codigo, descripcion, stock });
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
        descripcion: item.descripcionArchivo || item.producto_nombre || "",
        stock: Number(item.stock),
        crear: false,
      })),
      ...nuevosSeleccionados.map(item => ({
        codigo_archivo: item.codigo_archivo,
        descripcion: item.nombre || "",
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
      if (!data?.ok) throw new Error("Supabase no confirmó la importación.");

      setStockMensaje(
        `✅ Importación confirmada. ${Number(data.total_procesado || 0)} productos procesados · ` +
        `${Number(data.productos_creados || 0)} nuevos creados · stock actualizado correctamente.`
      );

      setStockVistaPrevia([]);
      setStockReconocidos([]);
      setStockNoReconocidos([]);
      setProductosNuevosPropuestos([]);
      setStockColumnas({ codigo: "", descripcion: "", stock: "" });
      setStockEncabezadoFila(null);
      setArchivoStockNombre("");

      await cargarCatalogoProductosStock();

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
        <a href="/supervisor" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>📡 Monitoreo en Vivo</a>
        <a href="/supervisor" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>🗓️ Diseñador Hojas de Ruta (Semanal)</a>
        <span style={{ padding: "12px 0", borderBottom: "2px solid #2563eb", color: "#2563eb", fontWeight: "700", fontSize: "13px" }}>📦 Pedidos</span>
        <a href="/supervisor" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>🏪 Clientes</a>
        <a href="/supervisor" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>💳 Estado de Cuenta</a>
        <a href="/supervisor" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>💲 Listas de Precios</a>
        <a href="/supervisor" style={{ padding: "12px 0", borderBottom: "2px solid transparent", color: "#64748b", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>🚫 Solicitudes</a>
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
            {["Activos", "Historial", "Disponibilidad", "StockFisico"].map(v => (
              <button key={v} type="button" onClick={() => { setVistaPedidos(v); setFiltroEstado("Todos"); setPedidoActivo(null); }}
                style={{ padding: "8px 14px", borderRadius: "8px", border: vistaPedidos === v ? "1px solid #2563eb" : "1px solid #cbd5e1", background: vistaPedidos === v ? "#eff6ff" : "#fff", color: vistaPedidos === v ? "#1d4ed8" : "#475569", fontWeight: "800", cursor: "pointer" }}>
                {v === "Activos" ? "🧾 Notas de Venta Activas (NVI)" : v === "Historial" ? "📚 Historial" : v === "Disponibilidad" ? "📦 Stock relativo" : "📊 Stock físico"}
              </button>
            ))}
          </div>

          {vistaPedidos === "StockFisico" ? (
            <div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontSize: "17px", fontWeight: "900", color: "#0f172a" }}>📊 Stock físico</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                      El Supervisor carga la planilla de existencias de su empresa. Esta primera etapa solo muestra una vista previa y no modifica Supabase.
                    </div>
                  </div>

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

                {stockVistaPrevia.length > 0 && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: esMovil ? "1fr" : "repeat(3, minmax(180px, 1fr))", gap: "8px", marginBottom: "12px" }}>
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
                            Seleccionados para una futura incorporación: <strong>{productosNuevosPropuestos.filter(p => p.crear).length}</strong>. El Supervisor puede desmarcar cualquier fila que no quiera incorporar. El CGE se generará en Supabase recién al confirmar en un paso posterior.
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
