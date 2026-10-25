import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

const PEDIDOS_DEMO = [];

const LISTA_PREVENTISTAS = ["Walter", "Todos"];
const LISTA_ESTADOS = ["Ingresado", "En Preparación", "En Depósito"];

export default function MonitorPedidos() {
    const [pedidos, setPedidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [preventistasReales, setPreventistasReales] = useState(["Todos"]);

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

      if (error) throw error;

      // 4. Traer los renglones reales de pedido_items
      const idsPedidos = (data || []).map(p => p.id).filter(Boolean);
      let itemsPorPedido = {};

      if (idsPedidos.length > 0) {
        const { data: itemsData, error: errorItems } = await supabase
          .from("pedido_items")
          .select("pedido_id, producto_id, producto_nombre, codigo, cantidad, precio_unitario, subtotal")
          .in("pedido_id", idsPedidos);

        if (errorItems) throw errorItems;

        (itemsData || []).forEach(it => {
          if (!itemsPorPedido[it.pedido_id]) itemsPorPedido[it.pedido_id] = [];
          itemsPorPedido[it.pedido_id].push({
            producto_id: it.producto_id,
            codigo: it.codigo || "",
            nombre: it.producto_nombre || it.codigo || "Artículo",
            cant: Number(it.cantidad || 0),
            p_unit: Number(it.precio_unitario || 0),
            subtotal: Number(it.subtotal || 0)
          });
        });
      }

      let listaConsolidada = [];
      if (data && data.length > 0) {
        listaConsolidada = data.map(p => {
          const itemsReales = itemsPorPedido[p.id] || [];
          const unidades = itemsReales.reduce((acc, it) => acc + Number(it.cant || 0), 0);

          return {
            id: p.id || ("PED-" + String(p.created_at || Date.now()).slice(-4)),
            numeroPedido: p.numero_pedido || null,
            hora: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "En curso",
            preventista: p.preventista || p.vendedor || "Walter",
            ruta: p.ruta || "Ruta de Visita",
            cliente: p.cliente || p.comercio_nombre || ("Comercio #" + (p.comercio_id || "")),
            direccion: p.direccion || "En recorrido",
            condicion: p.condicion || "Consumidor Final",
            bultos: unidades,
            total: Number(p.total || p.total_pedido || 0),
            estado: p.estado || "Ingresado",
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

  useEffect(() => {
    const handleResize = () => setEsMovil(window.innerWidth < 800);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const listaFiltrada = pedidos.filter(p => {
    const matchPrev = filtroPreventista === "Todos" || p.preventista === filtroPreventista;
    const matchEst = filtroEstado === "Todos" || p.estado === filtroEstado;
    return matchPrev && matchEst;
  });

  const totalFacturado = listaFiltrada.reduce((acc, p) => acc + p.total, 0);

  const getBadgeColor = (estado) => {
    switch(estado) {
      case "Ingresado": return { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" };
      case "En Preparación": return { bg: "#fef3c7", text: "#b45309", border: "#fde68a" };
      case "En Depósito": return { bg: "#e0e7ff", text: "#4338ca", border: "#c7d2fe" };
      default: return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
    }
  };

  

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: esMovil ? "column" : "row", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>
      {/* SIDEBAR PARA ESCRITORIO (Mac) O MENÚ MÓVIL DESPLEGABLE */}
      
        <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* BARRA SUPERIOR UNIFICADA CON LOS 3 PILARES EXACTOS */}
      <header style={{ backgroundColor: "#0f172a", borderBottom: "1px solid #334155", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>📦</span>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px" }}>RutaComercio · Pedidos en Vivo</h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>Despacho y Gestión de Comandas de Campo</p>
          </div>
        </div>

        {/* NAVEGACIÓN SUPERIOR: SÓLO LOS 3 PILARES QUE IMPORTAN */}
        <nav style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <a href="/supervisor" style={{ padding: "7px 14px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#cbd5e1", textDecoration: "none", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
            <span>📡</span> Monitoreo en Vivo
          </a>
          <a href="/supervisor" style={{ padding: "7px 14px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#cbd5e1", textDecoration: "none", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
            <span>🗓️</span> Diseñador Hojas de Ruta
          </a>
          <span style={{ padding: "7px 14px", borderRadius: "6px", backgroundColor: "#2563eb", color: "#fff", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(37,99,235,0.4)" }}>
            <span>📦</span> Pedidos en Vivo
          </span>
          <a href="/supervisor" style={{ marginLeft: "12px", padding: "7px 14px", borderRadius: "6px", backgroundColor: "#ef4444", color: "#fff", textDecoration: "none", fontSize: "12px", fontWeight: "700" }}>
            ✕ Salir
          </a>
        </nav>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {esMovil && (
              <button onClick={() => setMenuAbierto(true)} style={{ background: "#0f172a", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "16px", cursor: "pointer" }}>
                ☰
              </button>
            )}
            <div>
              <h1 style={{ fontSize: esMovil ? "15px" : "18px", fontWeight: "800", margin: 0, color: "#0f172a" }}>Monitor de Pedidos</h1>
              <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>Ventas en tiempo real</p>
            </div>
          </div>
          <a href="/supervisor" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "6px 12px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: "700" }}>
            🗺️ Mapa
          </a>
        </header>

        <main style={{ padding: "12px", maxWidth: "1200px", width: "100%", boxSizing: "border-box" }}>
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

          {/* Barra de Filtros */}
          <div style={{ background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 140px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569" }}>👤 Vendedor:</span>
              <select value={filtroPreventista} onChange={e => setFiltroPreventista(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: "6px", border: "1.5px solid #2563eb", fontSize: "12px", background: "#ffffff", color: "#0f172a", fontWeight: "700", outline: "none" }}>
                <option value="Todos">Todos ({pedidos.length})</option>
                {preventistasReales.map((p, i) => <option key={i} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 130px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569" }}>📋 Estado:</span>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: "6px", border: "1.5px solid #2563eb", fontSize: "12px", background: "#ffffff", color: "#0f172a", fontWeight: "700", outline: "none" }}>
                <option value="Todos">Todos</option>
                {LISTA_ESTADOS.map((est, i) => <option key={i} value={est}>{est}</option>)}
              </select>
            </div>
          </div>

          {/* Grilla de Comandas y Detalle en Columna Móvil */}
          <div style={{ display: "flex", flexDirection: esMovil ? "column" : "row", gap: "12px", alignItems: "start" }}>
            <div style={{ width: esMovil ? "100%" : "55%" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "8px", textTransform: "uppercase" }}>
                Comandas Activas ({listaFiltrada.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {listaFiltrada.map(p => {
                  const b = getBadgeColor(p.estado);
                  const activo = pedidoActivo && pedidoActivo.id === p.id;
                  return (
                    <div key={p.id} onClick={() => setPedidoActivo(p)} style={{
                        background: activo ? "#dbeafe" : (listaFiltrada.indexOf(p) % 2 === 0 ? "#eef2f7" : "#dde5ee"),
                        border: activo ? "2px solid #2563eb" : "1px solid #b8c4d1",
                        borderRadius: "7px",
                        padding: "5px 8px",
                        cursor: "pointer",
                        boxShadow: activo ? "0 1px 4px rgba(37,99,235,0.12)" : "none"
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1px" }}>
                        <div>
                          <span style={{ fontWeight: "800", fontSize: "12px", color: "#2563eb" }}>
                            {p.numeroPedido ? `Pedido #${String(p.numeroPedido).padStart(6, "0")}` : "Pedido"}
                          </span>
                          <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>{p.hora}</span>
                        </div>
                        <span style={{ background: b.bg, color: b.text, border: "1px solid " + b.border, fontSize: "9px", fontWeight: "800", padding: "2px 6px", borderRadius: "10px" }}>
                          {p.estado}
                        </span>
                      </div>
                      <div style={{ fontWeight: "850", fontSize: "13px", color: "#172033", marginTop: "2px" }}>{p.cliente}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "3px", paddingTop: "3px", borderTop: "1px solid #b8c4d1" }}>
                        <span style={{ fontSize: "10px", color: "#475569" }}>👤 <strong>{p.preventista}</strong> ({p.bultos} unidades)</span>
                        <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>${p.total.toLocaleString("es-AR")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {pedidoActivo && (
              <div style={{ width: esMovil ? "100%" : "45%", background: "#f8fafc", borderRadius: "9px", border: "1px solid #cbd5e1", padding: "10px", position: esMovil ? "static" : "sticky", top: "70px", marginTop: esMovil ? "10px" : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "7px", flexWrap: "wrap" }}>
                       <span style={{ fontSize: "9px", color: "#64748b", fontWeight: "800" }}>DETALLE DEL PEDIDO ·</span>
                       <span style={{ fontSize: "14px", fontWeight: "900", color: "#172033" }}>{pedidoActivo.cliente}</span>
                     </div>
                     <div style={{ fontSize: "10px", color: "#2563eb", fontWeight: "800", marginTop: "2px" }}>
                       {pedidoActivo.numeroPedido ? `Pedido #${String(pedidoActivo.numeroPedido).padStart(6, "0")}` : "Pedido"} · {pedidoActivo.hora}
                     </div>
                  </div>
                  <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "10px", fontWeight: "800", padding: "3px 6px", borderRadius: "4px" }}>
                    {pedidoActivo.lista}
                  </span>
                </div>

                <div style={{ fontSize: "10px", color: "#475569", marginBottom: "8px", lineHeight: 1.35 }}>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    <span>👤 <strong>{pedidoActivo.preventista}</strong></span>
                    <span>💳 {String(pedidoActivo.nota || "").replace(/^Medio de pago:\s*/i, "")}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "8px" }}>
                  {pedidoActivo.items.map((it, idx) => (
                    <div key={idx} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 7px",
                      background: idx % 2 === 0 ? "#e2e8f0" : "#f1f5f9",
                      border: "1px solid #c5cfdb",
                      borderRadius: "5px",
                      fontSize: "9.5px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: 1 }}>
                        <span style={{ fontWeight: "750", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.nombre}</span>
                        <span style={{ color: "#526176", fontSize: "9px", whiteSpace: "nowrap" }}>{it.cant} × ${it.p_unit.toLocaleString("es-AR")}</span>
                      </div>
                      <div style={{ fontWeight: "850", color: "#0f172a", marginLeft: "8px", whiteSpace: "nowrap" }}>${it.subtotal.toLocaleString("es-AR")}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "#e8f0ff", border: "1px solid #c7d7f5", borderRadius: "6px", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#2563eb", fontWeight: "700" }}>TOTAL PEDIDO</div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>{pedidoActivo.bultos} unidades</div>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#1d4ed8" }}>
                    ${pedidoActivo.total.toLocaleString("es-AR")}
                  </div>
                </div>

                <button onClick={() => alert("Comanda despachada al depósito.")} style={{ width: "100%", background: "#2563eb", color: "#fff", border: "none", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}>
                  📦 Pasar a Depósito
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </div>
  );
}