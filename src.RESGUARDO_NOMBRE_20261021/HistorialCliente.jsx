import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function HistorialCliente({ comercio, onVolver }) {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [pedidoAbierto, setPedidoAbierto] = useState(null);
  const [itemsPorPedido, setItemsPorPedido] = useState({});
  const [cargandoDetalle, setCargandoDetalle] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarHistorial() {
      if (!comercio?.id) {
        setPedidos([]);
        setCargando(false);
        return;
      }

      setCargando(true);
      setError("");

      try {
        const { data, error: errorPedidos } = await supabase
          .from("pedidos")
          .select("id, fecha, comercio_id, comercio_nombre, preventista, subtotal, descuento_porcentaje, total, estado, notas")
          .eq("comercio_id", String(comercio.id))
          .order("fecha", { ascending: false });

        if (errorPedidos) throw errorPedidos;
        if (!cancelado) setPedidos(data || []);
      } catch (err) {
        console.error("Error cargando historial del cliente:", err);
        if (!cancelado) {
          setError(err.message || "No se pudo cargar el historial de compras.");
          setPedidos([]);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarHistorial();
    return () => { cancelado = true; };
  }, [comercio?.id]);

  const abrirDetalle = async (pedido) => {
    if (pedidoAbierto === pedido.id) {
      setPedidoAbierto(null);
      return;
    }

    setPedidoAbierto(pedido.id);
    if (itemsPorPedido[pedido.id]) return;

    setCargandoDetalle(pedido.id);
    try {
      const { data, error: errorItems } = await supabase
        .from("pedido_items")
        .select("pedido_id, producto_id, producto_nombre, codigo, cantidad, precio_unitario, subtotal")
        .eq("pedido_id", pedido.id);

      if (errorItems) throw errorItems;

      setItemsPorPedido((prev) => ({
        ...prev,
        [pedido.id]: data || [],
      }));
    } catch (err) {
      console.error("Error cargando detalle del pedido:", err);
      alert("❌ No se pudo cargar el detalle de esta venta.\n\n" + (err.message || ""));
      setPedidoAbierto(null);
    } finally {
      setCargandoDetalle(null);
    }
  };

  const dinero = (v) =>
    Number(v || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const fecha = (v) => {
    if (!v) return "Sin fecha";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("es-AR");
  };

  const hora = (v) => {
    if (!v) return "";
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  };

  const totalHistorico = pedidos.reduce(
    (acc, p) => acc + Number(p.total || 0),
    0
  );
  const ultimaCompra = pedidos[0] || null;

  const tarjeta = {
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "12px",
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#090d16",
      color: "#fff",
      fontFamily: "system-ui, sans-serif",
      paddingBottom: "40px",
    }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        backgroundColor: "#0f172a",
        borderBottom: "1px solid #1e293b",
        padding: "12px 16px",
      }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <button type="button" onClick={onVolver} style={{
            background: "transparent", border: "none", color: "#94a3b8",
            fontSize: "15px", fontWeight: "800", cursor: "pointer", padding: "4px 0",
          }}>
            ← Volver al comercio
          </button>
        </div>
      </header>

      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            fontSize: "12px", color: "#60a5fa", fontWeight: "900",
            textTransform: "uppercase", marginBottom: "4px",
          }}>
            🧾 HISTORIAL DE COMPRAS
          </div>

          <div style={{
            margin: 0,
            fontSize: "23px",
            fontWeight: "900",
            color: "#ffffff",
            WebkitTextFillColor: "#ffffff",
          }}>
            {comercio?.nombre || `Comercio #${comercio?.id || ""}`}
          </div>
        </div>

        {cargando ? (
          <div style={{ ...tarjeta, padding: "20px", textAlign: "center", color: "#cbd5e1", fontWeight: "800" }}>
            ⏳ Cargando historial...
          </div>
        ) : error ? (
          <div style={{ backgroundColor: "#450a0a", border: "1px solid #dc2626", borderRadius: "12px", padding: "16px", color: "#fecaca", fontWeight: "800" }}>
            ❌ {error}
          </div>
        ) : pedidos.length === 0 ? (
          <div style={{ ...tarjeta, padding: "24px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "34px", marginBottom: "8px" }}>🧾</div>
            <div style={{ fontSize: "17px", fontWeight: "900", marginBottom: "5px" }}>
              Todavía no hay compras registradas
            </div>
            <div style={{ color: "#94a3b8", fontSize: "13px" }}>
              Las próximas ventas de este cliente aparecerán acá.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <div style={{ ...tarjeta, padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "800" }}>COMPRAS</div>
                <div style={{ fontSize: "23px", fontWeight: "900", marginTop: "3px" }}>{pedidos.length}</div>
              </div>

              <div style={{ ...tarjeta, padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "800" }}>TOTAL HISTÓRICO</div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#4ade80", marginTop: "3px" }}>
                  ${dinero(totalHistorico)}
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: "#172554", border: "1px solid #1d4ed8",
              borderRadius: "12px", padding: "11px 12px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: "800" }}>ÚLTIMA COMPRA</div>
              <div style={{ marginTop: "3px", fontSize: "14px", fontWeight: "900" }}>
                {fecha(ultimaCompra?.fecha)}
                {hora(ultimaCompra?.fecha) ? ` · ${hora(ultimaCompra.fecha)}` : ""}
                {" · "}
                <span style={{ color: "#86efac" }}>${dinero(ultimaCompra?.total)}</span>
              </div>
            </div>

            <div style={{ fontSize: "13px", fontWeight: "900", color: "#cbd5e1", marginBottom: "8px" }}>
              VENTAS REGISTRADAS
            </div>

            {pedidos.map((pedido) => {
              const abierto = pedidoAbierto === pedido.id;
              const items = itemsPorPedido[pedido.id] || [];

              return (
                <div key={pedido.id} style={{
                  ...tarjeta,
                  border: abierto ? "1px solid #3b82f6" : "1px solid #1e293b",
                  marginBottom: "9px",
                  overflow: "hidden",
                }}>
                  <button type="button" onClick={() => abrirDetalle(pedido)} style={{
                    width: "100%", background: "transparent", border: "none",
                    color: "#fff", cursor: "pointer", padding: "12px", textAlign: "left",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "900" }}>
                          {fecha(pedido.fecha)}
                          {hora(pedido.fecha) ? ` · ${hora(pedido.fecha)}` : ""}
                        </div>
                        <div style={{ marginTop: "3px", fontSize: "11px", color: "#94a3b8" }}>
                          {pedido.preventista ? `Vendedor: ${pedido.preventista}` : "Venta registrada"}
                          {pedido.estado ? ` · ${pedido.estado}` : ""}
                        </div>
                      </div>

                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "17px", fontWeight: "900", color: "#4ade80" }}>
                          ${dinero(pedido.total)}
                        </div>
                        <div style={{ marginTop: "2px", fontSize: "11px", color: "#60a5fa", fontWeight: "900" }}>
                          {abierto ? "OCULTAR ▲" : "VER DETALLE ▼"}
                        </div>
                      </div>
                    </div>
                  </button>

                  {abierto && (
                    <div style={{ borderTop: "1px solid #1e293b", padding: "12px", backgroundColor: "#111827" }}>
                      {cargandoDetalle === pedido.id ? (
                        <div style={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "800" }}>
                          ⏳ Cargando artículos...
                        </div>
                      ) : items.length === 0 ? (
                        <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                          Esta venta no tiene artículos registrados.
                        </div>
                      ) : (
                        <>
                          {items.map((item, index) => (
                            <div key={`${pedido.id}-${item.producto_id || index}`} style={{
                              padding: "8px 0",
                              borderBottom: index === items.length - 1 ? "none" : "1px solid #1f2937",
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "13px", fontWeight: "900" }}>
                                    {item.producto_nombre || "Artículo"}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                                    {item.codigo ? `${item.codigo} · ` : ""}
                                    {Number(item.cantidad || 0)} x ${dinero(item.precio_unitario)}
                                  </div>
                                </div>
                                <div style={{ fontSize: "13px", fontWeight: "900", whiteSpace: "nowrap" }}>
                                  ${dinero(item.subtotal)}
                                </div>
                              </div>
                            </div>
                          ))}

                          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #334155" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#cbd5e1", marginBottom: "4px" }}>
                              <span>Subtotal</span>
                              <strong>${dinero(pedido.subtotal)}</strong>
                            </div>

                            {Number(pedido.descuento_porcentaje || 0) > 0 && (
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#fca5a5", marginBottom: "4px" }}>
                                <span>Descuento</span>
                                <strong>
                                  {Number(pedido.descuento_porcentaje || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%
                                </strong>
                              </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "900", color: "#4ade80", marginTop: "7px" }}>
                              <span>TOTAL</span>
                              <span>${dinero(pedido.total)}</span>
                            </div>

                            {pedido.notas && (
                              <div style={{ marginTop: "10px", padding: "8px", backgroundColor: "#0f172a", borderRadius: "8px", color: "#cbd5e1", fontSize: "11px" }}>
                                📝 {pedido.notas}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
