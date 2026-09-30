import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

const PEDIDOS_DEMO = [];

const LISTA_PREVENTISTAS = ["Walter", "Todos"];
const LISTA_ESTADOS = ["Ingresado", "Pasado a Depósito"];

export default function MonitorPedidos() {
    const [pedidos, setPedidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [preventistasReales, setPreventistasReales] = useState(["Todos"]);
  const [datosCabecera, setDatosCabecera] = useState({ empresa: "", abonado_hasta: null });

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
                c.direccion,
                c.localidad,
                c.partido,
                c.provincia,
                c.pais,
              ].filter(Boolean).join(", ");
            });
          }
        }

        listaConsolidada = data.map(p => {
          const itemsReales = itemsPorPedido[String(p.id)] || [];
          const direccionReal = direccionPorComercio[String(p.comercio_id)] || "";
          return {
            id: p.id || ("PED-" + String(p.created_at || Date.now()).slice(-4)),
            numeroVisible: String(p.numero_pedido || "").padStart(6, "0"),
            hora: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "En curso",
            preventista: p.preventista || p.vendedor || "Walter",
            ruta: p.ruta || "Ruta de Visita",
            cliente: p.cliente || p.comercio_nombre || ("Comercio #" + (p.comercio_id || "")),
            direccion: p.direccion || direccionReal || "Sin dirección cargada",
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
            hora: loc.fecha ? new Date(loc.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "En curso",
            preventista: loc.preventista || "Walter",
            ruta: "Ruta 01",
            cliente: loc.cliente || loc.comercio_nombre || ("Comercio #" + (loc.comercio_id || "")),
            direccion: loc.direccion || "Local",
            condicion: "Consumidor Final",
            bultos: Array.isArray(loc.items) ? loc.items.length : 1,
            total: Number(loc.total || 0),
            estado: "Ingresado",
            items: Array.isArray(loc.items) ? loc.items : [],
            nota: loc.notas || "Guardado en app"
          });
        }
      });

      setPedidos(listaConsolidada);
      if (listaConsolidada.length > 0) {
        setPedidoActivo(listaConsolidada[0]);
      }

      // 4. Preventistas reales de la empresa, tengan pedidos o no
      const prevs = [
        "Todos",
        ...new Set([
          ...(perfilesEmpresa || []).map(p => p.nombre || p.email).filter(Boolean),
          ...listaConsolidada.map(p => p.preventista).filter(Boolean),
        ]),
      ];
      setPreventistasReales(prevs);

    } catch (err) {
      console.warn("Error leyendo pedidos:", err);
    } finally {
      setCargandoPedidos(false);
    }
  };

  useEffect(() => {
    cargarPedidosReales();
  }, []);
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
    const matchEst = filtroEstado === "Todos" || p.estado === filtroEstado;
    return matchVista && matchPrev && matchEst;
  });

  const totalFacturado = listaFiltrada.reduce((acc, p) => acc + p.total, 0);

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

    const lineas = [`PEDIDO #${pedido.numeroVisible}`];

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
          <title>Pedido #${escapar(pedido.numeroVisible)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            .sub { color: #64748b; margin-bottom: 20px; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.55; }
          </style>
        </head>
        <body>
          <h1>RutaComercio · Pedido #${escapar(pedido.numeroVisible)}</h1>
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
    const asunto = `Pedido #${pedido.numeroVisible} - ${pedido.cliente}`;
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
    const confirmar = window.confirm(`¿Confirmás que el pedido #${pedido.numeroVisible} ya fue pasado a depósito?\n\nSeguirá disponible en Historial para consultar, imprimir o reenviar.`);
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
      setPedidoActivo(null);
      setMostrarExportacion(false);
      alert("✓ Pedido pasado a depósito. Ya está disponible en Historial.");
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginBottom: "12px" }}>
            <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>TOTAL FACTURADO</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#2563eb", marginTop: "2px" }}>${totalFacturado.toLocaleString("es-AR")}</div>
            </div>
            <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>PEDIDOS HOY</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#16a34a", marginTop: "2px" }}>{listaFiltrada.length} comandas</div>
            </div>
            <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>TICKET PROMEDIO</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#d97706", marginTop: "2px" }}>
                ${listaFiltrada.length ? Math.round(totalFacturado / listaFiltrada.length).toLocaleString("es-AR") : 0}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            {["Activos", "Historial"].map(v => (
              <button key={v} type="button" onClick={() => { setVistaPedidos(v); setFiltroEstado("Todos"); setPedidoActivo(null); }}
                style={{ padding: "8px 14px", borderRadius: "8px", border: vistaPedidos === v ? "1px solid #2563eb" : "1px solid #cbd5e1", background: vistaPedidos === v ? "#eff6ff" : "#fff", color: vistaPedidos === v ? "#1d4ed8" : "#475569", fontWeight: "800", cursor: "pointer" }}>
                {v === "Activos" ? "📥 Comandas Activas" : "📚 Historial"}
              </button>
            ))}
          </div>

          {/* Barra de Filtros */}
          <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 140px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569" }}>👤 Vendedor:</span>
              <select value={filtroPreventista} onChange={e => setFiltroPreventista(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: "6px", border: "1.5px solid #2563eb", fontSize: "12px", background: "#ffffff", color: "#0f172a", fontWeight: "700", outline: "none" }}>
                <option value="Todos">Todos</option>
                {preventistasReales.map((p, i) => <option key={i} value={p}>{p}</option>)}
              </select>
            </div>
            {vistaPedidos === "Activos" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 130px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569" }}>📋 Estado:</span>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: "6px", border: "1.5px solid #2563eb", fontSize: "12px", background: "#ffffff", color: "#0f172a", fontWeight: "700", outline: "none" }}>
                  <option value="Todos">Todos</option>
                  <option value="Ingresado">Ingresado</option>
                </select>
              </div>
            )}
          </div>

          {/* Grilla de Comandas y Detalle en Columna Móvil */}
          <div style={{ display: "flex", flexDirection: esMovil ? "column" : "row", gap: "12px", alignItems: "start" }}>
            <div style={{ width: esMovil ? "100%" : "55%" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "8px", textTransform: "uppercase" }}>
                {vistaPedidos === "Activos" ? "Comandas Activas" : "Historial"} ({listaFiltrada.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {listaFiltrada.map(p => {
                  const b = getBadgeColor(p.estado);
                  const activo = pedidoActivo && pedidoActivo.id === p.id;
                  return (
                    <div key={p.id} onClick={() => setPedidoActivo(p)} style={{ background: activo ? "#eff6ff" : "#fff", border: activo ? "2px solid #2563eb" : "1px solid #e2e8f0", borderRadius: "8px", padding: "10px", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <div>
                          <span style={{ fontWeight: "800", fontSize: "12px", color: "#2563eb" }}>Pedido #{p.numeroVisible}</span>
                          <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>{p.hora}</span>
                        </div>
                        <span style={{ background: b.bg, color: b.text, border: "1px solid " + b.border, fontSize: "9px", fontWeight: "800", padding: "2px 6px", borderRadius: "10px" }}>
                          {p.estado}
                        </span>
                      </div>
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{p.cliente}</div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>📍 {p.direccion}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "10px", color: "#475569" }}>👤 <strong>{p.preventista}</strong> ({cantidadUnidades(p)} unidades)</span>
                        <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>${p.total.toLocaleString("es-AR")}</span>
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
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>Pedido #{pedidoActivo.numeroVisible} · {pedidoActivo.cliente}</div>
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
        </main>
      </div>
    </div>
  );
}
