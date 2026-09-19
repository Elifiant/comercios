import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

const PEDIDOS_DEMO = [];

const LISTA_PREVENTISTAS = ["Walter", "Todos"];
const LISTA_ESTADOS = ["Ingresado", "En Preparación", "En Depósito"];

export default function MonitorPedidos() {
    const [pedidos, setPedidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [preventistasReales, setPreventistasReales] = useState(["Todos", "Walter"]);

  const cargarPedidosReales = async () => {
    try {
      setCargandoPedidos(true);
      // 1. Pedidos en Supabase
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });

      let listaConsolidada = [];
      if (!error && data && data.length > 0) {
        listaConsolidada = data.map(p => ({
          id: p.id || ("PED-" + String(p.created_at || Date.now()).slice(-4)),
          hora: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "En curso",
          preventista: p.preventista || p.vendedor || "Walter",
          ruta: p.ruta || "Ruta de Visita",
          cliente: p.cliente || p.comercio_nombre || ("Comercio #" + (p.comercio_id || "")),
          direccion: p.direccion || "En recorrido",
          condicion: p.condicion || "Consumidor Final",
          bultos: p.bultos || (Array.isArray(p.items) ? p.items.length : 1),
          total: Number(p.total || p.total_pedido || 0),
          estado: p.estado || "Ingresado",
          items: Array.isArray(p.items) ? p.items : (Array.isArray(p.detalle) ? p.detalle : []),
          nota: p.notas || p.nota || "Pedido registrado desde app móvil"
        }));
      }

      // 2. Fallback de localStorage
      const locales = JSON.parse(localStorage.getItem("pedidos_local") || "[]");
      locales.forEach(loc => {
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

      // 3. Extraer preventistas únicos reales sin inventos
      const prevs = ["Todos", ...new Set(listaConsolidada.map(p => p.preventista).filter(Boolean))];
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
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {listaFiltrada.map(p => {
                  const b = getBadgeColor(p.estado);
                  const activo = pedidoActivo && pedidoActivo.id === p.id;
                  return (
                    <div key={p.id} onClick={() => setPedidoActivo(p)} style={{ background: activo ? "#eff6ff" : "#fff", border: activo ? "2px solid #2563eb" : "1px solid #e2e8f0", borderRadius: "8px", padding: "10px", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <div>
                          <span style={{ fontWeight: "800", fontSize: "12px", color: "#2563eb" }}>#{p.id}</span>
                          <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>{p.hora}</span>
                        </div>
                        <span style={{ background: b.bg, color: b.text, border: "1px solid " + b.border, fontSize: "9px", fontWeight: "800", padding: "2px 6px", borderRadius: "10px" }}>
                          {p.estado}
                        </span>
                      </div>
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{p.cliente}</div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>📍 {p.direccion}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "10px", color: "#475569" }}>👤 <strong>{p.preventista}</strong> ({p.bultos} bultos)</span>
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
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>{pedidoActivo.id} - {pedidoActivo.cliente}</div>
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
                    <div style={{ fontSize: "10px", color: "#64748b" }}>{pedidoActivo.bultos} bultos</div>
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "900", color: "#1d4ed8" }}>
                    ${pedidoActivo.total.toLocaleString("es-AR")}
                  </div>
                </div>

                <button onClick={() => alert("Comanda despachada al depósito.")} style={{ width: "100%", background: "#2563eb", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>
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