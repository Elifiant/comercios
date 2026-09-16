import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function PortalPagos() {
  const [empresa, setEmpresa] = useState("Elifiant");
  const [moneda, setMoneda] = useState("USD");
  const [tarifa, setTarifa] = useState(160);
  const [preventistasCount, setPreventistasCount] = useState(3);
  const [fechaVencimiento, setFechaVencimiento] = useState("10 de Octubre, 2026");
  const [medioSeleccionado, setMedioSeleccionado] = useState("crypto");
  const [comprobanteEnviado, setComprobanteEnviado] = useState(false);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const { data: perfil } = await supabase
            .from("perfiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();
          if (perfil && perfil.empresa) {
            setEmpresa(perfil.empresa);
          }
        }
      } catch (e) {}
    }
    cargarDatos();
  }, []);

  const totalConDescuentoCrypto = moneda === "USD" ? (tarifa * 0.9).toFixed(2) : Math.round(tarifa * 0.9);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* CABECERA SUPERIOR */}
      <header style={{ backgroundColor: "#1e293b", borderBottom: "1px solid #334155", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <a href="/supervisor" style={{ backgroundColor: "#334155", color: "#f8fafc", textDecoration: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            ← Volver a Supervisión
          </a>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "800", letterSpacing: "-0.5px", color: "#fff" }}>
              💳 Portal de Suscripción & Pagos
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
              Empresa activa: <strong style={{ color: "#38bdf8" }}>{empresa}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700" }}>
            ● Abono al día
          </span>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <main style={{ maxWidth: "1000px", margin: "32px auto", padding: "0 20px" }}>
        {/* RESUMEN DEL PLAN */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "28px" }}>
          <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "12px", border: "1px solid #334155" }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700", letterSpacing: "0.5px" }}>Estado del Servicio</span>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#fff", marginTop: "6px" }}>Plan Comercial Activo</div>
            <div style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "4px" }}>Capacidad: <strong>{preventistasCount} preventistas en calle</strong></div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "12px", border: "1px solid #334155" }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700", letterSpacing: "0.5px" }}>Próxima Renovación</span>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#38bdf8", marginTop: "6px" }}>{fechaVencimiento}</div>
            <div style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "4px" }}>Abono mensual pactado: <strong>${tarifa} {moneda}</strong></div>
          </div>

          <div style={{ backgroundColor: "rgba(37,99,235,0.1)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(59,130,246,0.3)" }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#60a5fa", fontWeight: "700", letterSpacing: "0.5px" }}>Descuento Especial</span>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#60a5fa", marginTop: "6px" }}>10% OFF en Cripto</div>
            <div style={{ fontSize: "13px", color: "#bfdbfe", marginTop: "4px" }}>Pagando con BCH, USDT o USDC: <strong>${totalConDescuentoCrypto} {moneda}</strong></div>
          </div>
        </div>

        {/* SELECCIÓN DE MEDIOS DE PAGO */}
        <div style={{ backgroundColor: "#1e293b", padding: "28px", borderRadius: "16px", border: "1px solid #334155" }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "800", color: "#fff" }}>
            Elegir Medio de Pago
          </h2>
          <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#94a3b8" }}>
            Seleccione su método preferido para abonar el período mensual o coordinar con su representante de cuentas.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "28px" }}>
            <button
              onClick={() => setMedioSeleccionado("crypto")}
              style={{
                backgroundColor: medioSeleccionado === "crypto" ? "#0f172a" : "#1e293b",
                border: medioSeleccionado === "crypto" ? "2px solid #22c55e" : "1px solid #334155",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "left",
                cursor: "pointer",
                color: "#fff"
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🪙</div>
              <div style={{ fontWeight: "700", fontSize: "15px" }}>Criptomonedas</div>
              <div style={{ fontSize: "12px", color: "#4ade80", marginTop: "4px", fontWeight: "600" }}>10% Descuento directo</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>BCH, USDT, USDC · Consultar por otras cryptos</div>
            </button>

            <button
              onClick={() => setMedioSeleccionado("transferencia")}
              style={{
                backgroundColor: medioSeleccionado === "transferencia" ? "#0f172a" : "#1e293b",
                border: medioSeleccionado === "transferencia" ? "2px solid #38bdf8" : "1px solid #334155",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "left",
                cursor: "pointer",
                color: "#fff"
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏛️</div>
              <div style={{ fontWeight: "700", fontSize: "15px" }}>Transferencia Bancaria</div>
              <div style={{ fontSize: "12px", color: "#38bdf8", marginTop: "4px" }}>CBU / Alias oficial</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Acreditación bancaria</div>
            </button>

            <button
              onClick={() => setMedioSeleccionado("mercadopago")}
              style={{
                backgroundColor: medioSeleccionado === "mercadopago" ? "#0f172a" : "#1e293b",
                border: medioSeleccionado === "mercadopago" ? "2px solid #0284c7" : "1px solid #334155",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "left",
                cursor: "pointer",
                color: "#fff"
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>💳</div>
              <div style={{ fontWeight: "700", fontSize: "15px" }}>Mercado Pago</div>
              <div style={{ fontSize: "12px", color: "#38bdf8", marginTop: "4px" }}>Tarjetas & Dinero en cuenta</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Solo Argentina</div>
            </button>
          </div>

          {/* DETALLE SEGÚN MEDIO SELECCIONADO */}
          {medioSeleccionado === "crypto" && (
            <div style={{ backgroundColor: "#0f172a", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  
                  <div style={{ backgroundColor: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", color: "#4ade80", fontSize: "13px", fontWeight: "600" }}>
                    🪙 Aceptamos Bitcoin Cash (BCH), USDT, USDC y otras criptos. ¡Consultar por cualquier otra blockchain o moneda!
                  </div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#4ade80", fontWeight: "700" }}>
                    Pago con Criptomonedas (BCH / USDT / USDC / Otras)
                  </h3>
                  <p style={{ margin: "0 0 14px 0", fontSize: "13px", color: "#94a3b8" }}>
                    Para asegurar que utilices la blockchain correcta sin errores de red ni pérdidas de fondos, la dirección de pago y confirmación en tiempo real se coordina directamente con tu asesor de cuentas.
                  </p>
                  <div style={{ backgroundColor: "#1e293b", padding: "12px 16px", borderRadius: "8px", border: "1px solid #334155", display: "inline-block" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Monto total con bonificación:</div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#4ade80" }}>
                      ${totalConDescuentoCrypto} {moneda} <span style={{ fontSize: "12px", textDecoration: "line-through", color: "#64748b" }}>${tarifa} {moneda}</span>
                    </div>
                  </div>
                </div>

                <div style={{ minWidth: "260px" }}>
                  <a
                    href={`https://wa.me/5491166646806?text=Hola%20Alex,%20te%20escribo%20desde%20${encodeURIComponent(empresa)}%20para%20coordinar%20el%20pago%20en%20Cripto%20(BCH/USDT/USDC/Consultar%20por%20otras%20cryptos)%20de%20nuestro%20abono%20de%20RutaComercio.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      backgroundColor: "#22c55e",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "14px 20px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      fontSize: "14px",
                      boxShadow: "0 4px 14px rgba(34,197,94,0.3)"
                    }}
                  >
                    <span>💬</span> Coordinar con Alex Jones
                  </a>
                  <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "8px" }}>
                    Representante de cuentas asignado · Atención inmediata
                  </div>
                </div>
              </div>
            </div>
          )}

          {medioSeleccionado === "transferencia" && (
            <div style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#38bdf8", fontWeight: "700" }}>
                Datos de Transferencia Bancaria
              </h3>
              <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#94a3b8" }}>
                Realizá la transferencia desde tu homebanking al siguiente Alias / CBU y enviá el comprobante a tu asesor de cuentas.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                <div style={{ backgroundColor: "#1e293b", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>ALIAS:</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>RUTACOMERCIO.OFICIAL</div>
                </div>
                <div style={{ backgroundColor: "#1e293b", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>TITULAR:</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>Alex Jones</div>
                </div>
              </div>
              <a
                href={`https://wa.me/5491166646806?text=Hola%20Alex,%20te%20envío%20el%20comprobante%20de%20transferencia%20de%20${encodeURIComponent(empresa)}.`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#334155",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600"
                }}
              >
                <span>📎</span> Enviar Comprobante a Alex Jones
              </a>
            </div>
          )}

          {medioSeleccionado === "mercadopago" && (
            <div style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#38bdf8", fontWeight: "700" }}>
                Mercado Pago Argentina
              </h3>
              <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#94a3b8" }}>
                Para solicitar el botón de pago con tarjeta o débito en cuenta, coordiná directamente con tu asesor:
              </p>
              <a
                href={`https://wa.me/5491166646806?text=Hola%20Alex,%20solicito%20el%20link%20de%20pago%20por%20Mercado%20Pago%20para%20${encodeURIComponent(empresa)}.`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#0284c7",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "700"
                }}
              >
                <span>💳</span> Solicitar Link de Mercado Pago
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
