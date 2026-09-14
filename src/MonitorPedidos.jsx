import React, { useState } from "react";

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
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

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
    <div style={{ minHeight: "100vh", display: "flex", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>
      {/* SIDEBAR PARA ESCRITORIO (Mac) */}
      <aside style={{ width: "240px", background: "#0f172a", color: "#f8fafc", flexShrink: 0, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ padding: "18px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: "800", fontSize: "16px", color: "#38bdf8", letterSpacing: "0.5px" }}>RutaComercio</div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Panel de Supervisión</div>
          </div>
          <span style={{ background: "#d97706", color: "#fff", fontSize: "9px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px" }}>DEMO</span>
        </div>

        <nav style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {menuItems.map((it, idx) => (
            <a key={idx} href={it.link} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: it.active ? "700" : "500", background: it.active ? "#2563eb" : "transparent", color: it.active ? "#ffffff" : "#94a3b8", transition: "all 0.15s" }}>
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </a>
          ))}
        </nav>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="/web" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "12px" }}>← Salir a Web</a>
          <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "700" }}>● En vivo</span>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: "#0f172a" }}>Monitor de Pedidos y Ventas Diarias</h1>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Recepción de comandas en tiempo real</p>
          </div>
          <a href="/supervisor" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "6px 12px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: "700" }}>
            🗺️ Ver en Mapa
          </a>
        </header>

        <main style={{ padding: "16px", maxWidth: "1200px", width: "100%", boxSizing: "border-box" }}>
          {/* Métricas Resumen */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            <div style={{ background: "#fff", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>TOTAL FACTURADO</div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb", marginTop: "4px" }}>${totalFacturado.toLocaleString("es-AR")}</div>
            </div>
            <div style={{ background: "#fff", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>PEDIDOS HOY</div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#16a34a", marginTop: "4px" }}>{listaFiltrada.length} comandas</div>
            </div>
            <div style={{ background: "#fff", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>TICKET PROMEDIO</div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#d97706", marginTop: "4px" }}>
                ${listaFiltrada.length ? Math.round(totalFacturado / listaFiltrada.length).toLocaleString("es-AR") : 0}
              </div>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div style={{ background: "#fff", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "200px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>👤 Vendedor:</span>
              <select value={filtroPreventista} onChange={e => setFiltroPreventista(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #2563eb", fontSize: "13px", background: "#ffffff", color: "#0f172a", fontWeight: "700", outline: "none", cursor: "pointer" }}>
                <option value="Todos">Todos ({pedidos.length})</option>
                {LISTA_PREVENTISTAS.map((p, i) => <option key={i} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "180px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>📋 Estado:</span>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #2563eb", fontSize: "13px", background: "#ffffff", color: "#0f172a", fontWeight: "700", outline: "none", cursor: "pointer" }}>
                <option value="Todos">Todos los estados</option>
                {LISTA_ESTADOS.map((est, i) => <option key={i} value={est}>{est}</option>)}
              </select>
            </div>
            {(filtroPreventista !== "Todos" || filtroEstado !== "Todos") && (
              <button onClick={() => { setFiltroPreventista("Todos"); setFiltroEstado("Todos"); }} style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                ✕ Limpiar Filtros
              </button>
            )}
          </div>

          {/* Grilla de Comandas y Detalle */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", alignItems: "start" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "8px", textTransform: "uppercase" }}>
                Comandas Activas ({listaFiltrada.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {listaFiltrada.map(p => {
                  const b = getBadgeColor(p.estado);
                  const activo = pedidoActivo && pedidoActivo.id === p.id;
                  return (
                    <div key={p.id} onClick={() => setPedidoActivo(p)} style={{ background: activo ? "#eff6ff" : "#fff", border: activo ? "2px solid #2563eb" : "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                        <div>
                          <span style={{ fontWeight: "800", fontSize: "13px", color: "#2563eb" }}>#{p.id}</span>
                          <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>{p.hora}</span>
                        </div>
                        <span style={{ background: b.bg, color: b.text, border: "1px solid " + b.border, fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "12px" }}>
                          {p.estado}
                        </span>
                      </div>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>{p.cliente}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>📍 {p.direccion}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "11px", color: "#475569" }}>👤 <strong>{p.preventista}</strong> ({p.bultos} bultos)</span>
                        <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>${p.total.toLocaleString("es-AR")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {pedidoActivo && (
              <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "16px", position: "sticky", top: "70px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>DETALLE DE COMANDA</div>
                    <div style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>{pedidoActivo.id} - {pedidoActivo.cliente}</div>
                  </div>
                  <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: "800", padding: "4px 8px", borderRadius: "6px" }}>
                    {pedidoActivo.lista}
                  </span>
                </div>

                <div style={{ fontSize: "12px", color: "#475569", marginBottom: "12px", lineHeight: 1.5 }}>
                  <div>📍 <strong>Dirección:</strong> {pedidoActivo.direccion}</div>
                  <div>👤 <strong>Preventista:</strong> {pedidoActivo.preventista} ({pedidoActivo.ruta})</div>
                  <div>📝 <strong>Nota de Entrega:</strong> <em>"{pedidoActivo.nota}"</em></div>
                </div>

                <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>MERCADERÍA SOLICITADA ({pedidoActivo.items.length} ítems)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                  {pedidoActivo.items.map((it, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#f8fafc", borderRadius: "6px", fontSize: "12px" }}>
                      <div>
                        <div style={{ fontWeight: "700", color: "#0f172a" }}>{it.nombre}</div>
                        <div style={{ color: "#64748b", fontSize: "11px" }}>{it.cant} × ${it.p_unit.toLocaleString("es-AR")}</div>
                      </div>
                      <div style={{ fontWeight: "800", color: "#0f172a" }}>${it.subtotal.toLocaleString("es-AR")}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#eff6ff", borderRadius: "8px", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700" }}>TOTAL PEDIDO</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{pedidoActivo.bultos} bultos totales</div>
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#1d4ed8" }}>
                    ${pedidoActivo.total.toLocaleString("es-AR")}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => alert("Comanda despachada al depósito con éxito.")} style={{ flex: 1, background: "#2563eb", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>
                    📦 Pasar a Depósito
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
