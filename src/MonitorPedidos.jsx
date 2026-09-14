import React, { useState, useEffect } from "react";

const PEDIDOS_DEMO = [
  { id: "PED-1082", hora: "11:42 hs", preventista: "Ian Torres", ruta: "Ruta 01 - Quilmes", cliente: "Almacén Los Nietos", direccion: "Av. Calchaquí 1420", condicion: "Resp. Inscripto", lista: "Mayorista A", bultos: 18, total: 148500, estado: "Ingresado", items: [
    { nombre: "Aceite Girasol 1.5L", cant: "4 cjs", p_unit: 16200, subtotal: 64800 },
    { nombre: "Harina 000 1kg", cant: "5 fdos", p_unit: 7500, subtotal: 37500 },
    { nombre: "Azúcar Común 1kg", cant: "3 fdos", p_unit: 8400, subtotal: 25200 },
    { nombre: "Fideos Guiseros 500g", cant: "6 cjs", p_unit: 3500, subtotal: 21000 }
  ], nota: "Entregar antes de las 13:00 hs. Paga contra entrega en efectivo." },
  { id: "PED-1081", hora: "11:15 hs", preventista: "Alex Gómez", ruta: "Ruta 03 - Bernal", cliente: "Supermercado El Trébol", direccion: "Zapiola 890", condicion: "Monotributo", lista: "Mayorista Especial", bultos: 32, total: 294800, estado: "En Preparación", items: [
    { nombre: "Arroz Largo Fino 1kg", cant: "10 fdos", p_unit: 12500, subtotal: 125000 },
    { nombre: "Puré de Tomate 520g", cant: "12 cjs", p_unit: 8900, subtotal: 106800 },
    { nombre: "Galletitas Variadas", cant: "10 cjs", p_unit: 6300, subtotal: 63000 }
  ], nota: "Descargar por portón lateral." },
  { id: "PED-1080", hora: "10:54 hs", preventista: "Walter Pérez", ruta: "Ruta 02 - Ezpeleta", cliente: "Autoservicio Don Mario", direccion: "Calle 137 N° 230", condicion: "Resp. Inscripto", lista: "Mayorista A", bultos: 15, total: 112300, estado: "Ingresado", items: [
    { nombre: "Yerba Mate 1kg", cant: "6 fdos", p_unit: 11200, subtotal: 67200 },
    { nombre: "Café Molido 500g", cant: "4 cjs", p_unit: 11275, subtotal: 45100 }
  ], nota: "Revisar vencimientos de la yerba." },
  { id: "PED-1079", hora: "10:20 hs", preventista: "Ian Torres", ruta: "Ruta 01 - Quilmes", cliente: "Kiosco & Granja Central", direccion: "Rivadavia 415", condicion: "Consumidor Final", lista: "Minorista B", bultos: 9, total: 68400, estado: "En Depósito", items: [
    { nombre: "Golosinas Surtidas", cant: "5 cjs", p_unit: 8200, subtotal: 41000 },
    { nombre: "Chicles Menta x24", cant: "4 cjs", p_unit: 6850, subtotal: 27400 }
  ], nota: "Cobro por transferencia al recibir." }
];

const LISTA_PREVENTISTAS = ["Ian Torres", "Alex Gómez", "Walter Pérez"];
const LISTA_ESTADOS = ["Ingresado", "En Preparación", "En Depósito"];

export default function MonitorPedidos() {
  const [pedidos] = useState(PEDIDOS_DEMO);
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

  const menuItems = [
    { icon: "🗺️", label: "Monitoreo en Vivo (Mapa)", link: "/supervisor", active: false },
    { icon: "🏪", label: "Comercios y Fichas", link: "/supervisor", active: false },
    { icon: "🚚", label: "Rutas y Preventistas", link: "/supervisor", active: false },
    { icon: "📦", label: "Pedidos y Ventas Diarias", link: "/pedidos", active: true },
    { icon: "📊", label: "Reportes y Liquidaciones", link: "/supervisor", active: false }
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: esMovil ? "column" : "row", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>
      {/* SIDEBAR PARA ESCRITORIO (Mac) O MENÚ MÓVIL DESPLEGABLE */}
      {(!esMovil || menuAbierto) && (
        <aside style={{ width: esMovil ? "100%" : "240px", background: "#0f172a", color: "#f8fafc", flexShrink: 0, display: "flex", flexDirection: "column", minHeight: esMovil ? "auto" : "100vh", position: esMovil ? "fixed" : "relative", top: 0, left: 0, right: 0, bottom: esMovil ? 0 : "auto", zIndex: 999 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: "800", fontSize: "16px", color: "#38bdf8", letterSpacing: "0.5px" }}>RutaComercio</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Suite de Supervisión</div>
            </div>
            {esMovil && (
              <button onClick={() => setMenuAbierto(false)} style={{ background: "#334155", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 10px", fontSize: "14px", cursor: "pointer" }}>✕ Cerrar</button>
            )}
          </div>

          <nav style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
            {menuItems.map((it, idx) => (
              <a key={idx} href={it.link} onClick={() => esMovil && setMenuAbierto(false)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: it.active ? "700" : "500", background: it.active ? "#2563eb" : "transparent", color: it.active ? "#ffffff" : "#94a3b8" }}>
                <span>{it.icon}</span>
                <span>{it.label}</span>
              </a>
            ))}
          </nav>

          <div style={{ padding: "14px 16px", borderTop: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a href="/web" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "12px" }}>← Salir a Web</a>
            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "700" }}>● En vivo</span>
          </div>
        </aside>
      )}

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
                {LISTA_PREVENTISTAS.map((p, i) => <option key={i} value={p}>{p}</option>)}
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
  );
}
