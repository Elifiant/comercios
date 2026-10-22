import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const panel = { background: "#13233a", border: "1px solid #29415f", borderRadius: 14 };
const smallButton = { border: "1px solid #29415f", background: "#152a45", color: "#f8fafc", borderRadius: 12, cursor: "pointer" };

export default function PortalPagos() {
  const [empresa, setEmpresa] = useState(null);
  const [contratos, setContratos] = useState([]);
  const [errorAbono, setErrorAbono] = useState("");
  const [preventistasActivos, setPreventistasActivos] = useState(0);
  const [modal, setModal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [historialPagos, setHistorialPagos] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: perfil, error: perfilError } = await supabase
          .from("perfiles")
          .select("empresa_id, empresa")
          .eq("id", session.user.id)
          .maybeSingle();
        if (perfilError) throw perfilError;

        if (perfil?.empresa_id) {
          const { data: emp, error: empresaError } = await supabase
            .from("empresas")
            .select("id,nombre,moneda,modelo_cobro,tarifa_pactada,cupo_preventistas,dia_cobro,abonado_hasta,activo,metodo_pago")
            .eq("id", perfil.empresa_id)
            .maybeSingle();
          if (empresaError) throw empresaError;
          setEmpresa(emp || null);

          // El contrato vigente es la fuente de verdad del abono.
          const { data: contratosVigentes, error: contratosError } = await supabase
            .from("empresa_abonos")
            .select("id,plan_nombre,modalidad,moneda,precio_acordado,cupo_preventistas,cupo_repartidores,fecha_inicio,proximo_vencimiento,dia_corte")
            .eq("empresa_id", perfil.empresa_id)
            .eq("activo", true);
          if (contratosError) {
            console.error("Error consultando abono vigente:", contratosError);
            setErrorAbono("No se pudo consultar el contrato vigente. Consultá con soporte.");
          } else {
            setContratos(contratosVigentes || []);
          }

          // Cuenta preventistas reales de la empresa. Si RLS limita esta consulta,
          // simplemente dejamos 0 hasta ajustar esa parte.
          const { count } = await supabase
            .from("perfiles")
            .select("id", { count: "exact", head: true })
            .eq("empresa_id", perfil.empresa_id)
            .eq("rol", "preventista");
          if (typeof count === "number") setPreventistasActivos(count);
        } else {
          setEmpresa({ nombre: perfil?.empresa || "Empresa", activo: true });
        }
      } catch (e) {
        console.error("Error cargando PortalPagos:", e);
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  const tipoContrato = (nombre = "") => nombre === "Simplex" ? "Simplex"
    : nombre.startsWith("Repartos · ") ? "Repartos"
    : nombre.startsWith("Ventas + Repartos · ") ? "Ventas + Repartos" : "Ventas";
  const contratoVentas = contratos.find(c => ["Ventas", "Ventas + Repartos"].includes(tipoContrato(c.plan_nombre)));
  const contratoPrincipal = contratoVentas || contratos[0] || null;
  const cupo = errorAbono ? 0 : contratoVentas ? Number(contratoVentas.cupo_preventistas ?? 0) : (contratos.length ? 0 : Number(empresa?.cupo_preventistas ?? 0));
  const disponibles = Math.max(cupo - preventistasActivos, 0);
  const moneda = contratoPrincipal?.moneda || empresa?.moneda || "ARS";
  const tarifa = contratos.length
    ? contratos.reduce((total, c) => total + Number(c.precio_acordado ?? 0), 0)
    : Number(empresa?.tarifa_pactada ?? 0);
  const diaCorte = errorAbono ? null : contratoPrincipal?.dia_corte ?? (contratos.length ? null : empresa?.dia_cobro);
  const vencimiento = errorAbono ? null : contratoPrincipal?.proximo_vencimiento ?? (contratos.length ? null : empresa?.abonado_hasta);
  const planNombre = contratoPrincipal?.plan_nombre || "Plan Comercial";
  const importe = useMemo(() => new Intl.NumberFormat("es-AR", {
    style: "currency", currency: moneda, minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(tarifa), [tarifa, moneda]);

  const diasRestantes = useMemo(() => {
    if (!vencimiento) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hasta = new Date(`${vencimiento}T00:00:00`);
    return Math.ceil((hasta - hoy) / 86400000);
  }, [vencimiento]);

  const estadoAbono = errorAbono ? "No se pudo verificar la vigencia"
    : diasRestantes === null ? "Fecha de vigencia pendiente de registrar"
    : diasRestantes > 1 ? `${diasRestantes} días de abono restantes`
    : diasRestantes === 1 ? "1 día de abono restante"
    : diasRestantes === 0 ? "El abono vence hoy"
    : `Abono vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) === 1 ? "" : "s"}`;

  // Leer únicamente los pagos de la empresa de la sesión actual.
  // Supabase debe tener además una política RLS que impida leer pagos de otras empresas.
  const abrirHistorialPagos = async () => {
    setModal("historial");
    setCargandoHistorial(true);
    setErrorHistorial("");
    setHistorialPagos([]);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Tu sesión expiró. Volvé a ingresar.");
      const { data: perfil, error: perfilError } = await supabase
        .from("perfiles")
        .select("empresa_id")
        .eq("id", user.id)
        .maybeSingle();
      if (perfilError) throw perfilError;
      if (!perfil?.empresa_id) throw new Error("No se pudo identificar tu empresa.");

      const { data, error } = await supabase
        .from("pagos_empresas")
        .select("id,fecha,concepto,tipo_movimiento,monto,moneda,metodo,periodo_desde,periodo_hasta,bonificado,comprobante")
        .eq("empresa_id", perfil.empresa_id)
        .order("fecha", { ascending: false })
        .limit(100);
      if (error) throw error;
      setHistorialPagos(data || []);
    } catch (e) {
      console.error("Error consultando historial de pagos:", e);
      setErrorHistorial("No se pudo consultar el historial. " + (e.message || "Intentá nuevamente."));
    } finally {
      setCargandoHistorial(false);
    }
  };

  const fechaPago = (valor) => valor ? new Date(valor).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "—";
  const fechaPeriodo = (valor) => valor ? valor.split("-").reverse().join("/") : "—";
  const importePago = (p) => new Intl.NumberFormat("es-AR", {
    style: "currency", currency: p.moneda || "ARS", maximumFractionDigits: 2
  }).format(Number(p.monto || 0));

  const abrirWhatsApp = (texto) => {
    window.open(`https://wa.me/5491166646806?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  };

  if (cargando) return <div style={{ minHeight: "100vh", background: "#08182b", color: "white", display: "grid", placeItems: "center", fontFamily: "system-ui" }}>Cargando portal...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#071629,#0b2038)", color: "#f8fafc", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 8 }}>
      <header style={{ borderBottom: "1px solid #29415f", padding: "8px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="/supervisor" style={{ ...smallButton, textDecoration: "none", padding: "12px 18px", fontWeight: 700 }}>← Volver a Supervisión</a>
          <div>
            <div style={{ fontSize: 27, fontWeight: 850 }}>💳 Portal de Suscripción & Pagos</div>
            <div style={{ color: "#cbd5e1", marginTop: 2 }}>Empresa activa: <strong style={{ color: "#38bdf8" }}>{empresa?.nombre || "—"}</strong></div>
          </div>
        </div>
        <div style={{ border: "1px solid #087f5b", background: "rgba(16,185,129,.13)", color: "#55ef9f", borderRadius: 28, padding: "9px 18px", fontWeight: 800 }}>● {empresa?.activo === false ? "Cuenta inactiva" : "Cuenta activa"}</div>
      </header>

      <main style={{ maxWidth: 1460, margin: "8px auto 0", padding: "0 22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 18 }}>
          <section style={{ ...panel, padding: 13 }}>
            <div style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 800 }}>ESTADO DEL SERVICIO</div>
            <div style={{ fontSize: 25, fontWeight: 850, marginTop: 8 }}>{planNombre} · {empresa?.activo === false ? "Inactivo" : "Activo"}</div>
            <div style={{ color: "#dbeafe", marginTop: 10 }}>Servicio {empresa?.activo === false ? "actualmente inactivo." : "funcionando correctamente."}</div>
            <div style={{ marginTop: 12, display: "inline-block", border: diasRestantes !== null && diasRestantes < 0 ? "1px solid #b45309" : "1px solid #087f5b", background: "rgba(16,185,129,.12)", color: errorAbono || diasRestantes === null || diasRestantes < 0 ? "#fbbf24" : "#6ee7b7", borderRadius: 24, padding: "9px 15px", fontWeight: 800 }}>{!errorAbono && diasRestantes !== null && diasRestantes >= 0 ? "✓ " : "⚠ "}{estadoAbono}</div>
          </section>

          <section style={{ ...panel, padding: 13 }}>
            <div style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 800 }}>PRÓXIMO VENCIMIENTO</div>
            <div style={{ fontSize: 25, fontWeight: 850, color: "#38bdf8", marginTop: 8 }}>{vencimiento ? new Date(`${vencimiento}T00:00:00`).toLocaleDateString("es-AR") : "Sin fecha confirmada"}</div>
            <div style={{ color: "#f8fafc", marginTop: 8 }}>Día de corte: <strong>{diaCorte ? `${diaCorte} de cada mes` : "sin definir"}</strong></div>
            <div style={{ marginTop: 10, border: "1px solid #35608c", background: "rgba(30,64,105,.35)", borderRadius: 10, padding: 13, color: "#dbeafe", fontSize: 13 }}>
              {errorAbono || (contratos.length === 0 && !vencimiento) ? "No se pudo confirmar la fecha del contrato. Consultá con soporte." : vencimiento ? `Próximo vencimiento contractual: ${new Date(`${vencimiento}T00:00:00`).toLocaleDateString("es-AR")}. No implica que el pago ya se haya registrado.` : "No hay una fecha de vencimiento registrada."}
            </div>
          </section>

          <section style={{ ...panel, padding: 13 }}>
            <div style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 800 }}>PLAN CONTRATADO</div>
            <div style={{ fontSize: 25, fontWeight: 850, marginTop: 8 }}>{errorAbono ? "Cupo no disponible" : `${cupo} preventistas`}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>+ 1 supervisor</div>
            <div style={{ height: 1, background: "#29415f", margin: "14px 0" }} />
            <div style={{ lineHeight: 1.9 }}>👤 Preventistas activos: <strong>{preventistasActivos}</strong><br/>👥 Cupos disponibles: <strong style={{ color: "#55ef9f" }}>{disponibles}</strong><br/>💲 Importe pactado: <strong style={{ color: "#55ef9f" }}>{errorAbono ? "No disponible" : importe}</strong></div>
            <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 5 }}>Moneda: {moneda}{contratoPrincipal?.modalidad ? ` · ${contratoPrincipal.modalidad}` : ""}</div>
          </section>
        </div>

        <section style={{ ...panel, padding: 11, marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
            <div><div style={{ fontSize: 24, fontWeight: 850 }}>💳 Medios de pago</div><div style={{ color: "#cbd5e1" }}>Elegí una opción para ver los detalles.</div></div>
            <div style={{ color: "#cbd5e1", fontSize: 12 }}>🔒 Cada empresa solo puede ver su propia información.</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 16 }}>
            <button onClick={() => setModal("bch")} style={{ ...smallButton, padding: 12, textAlign: "left", border: "2px solid #22e58b", boxShadow: "0 0 22px rgba(34,229,139,.16)" }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}><img
                  src="/bch-aceptamos.jpg"
                  alt="Aceptamos Bitcoin Cash"
                  style={{
                    width: "210px",
                    maxWidth: "42%",
                    height: "auto",
                    objectFit: "contain",
                    borderRadius: "6px",
                    display: "block"
                  }}
                /><div><div style={{ fontSize: 22, fontWeight: 850 }}>Bitcoin Cash (BCH) / Cripto</div><div style={{ display: "inline-block", color: "#55ef9f", border: "1px solid #16a34a", borderRadius: 20, padding: "3px 10px", marginTop: 5, fontWeight: 800 }}>Medio de pago preferencial</div><div style={{ color: "#cbd5e1", marginTop: 7 }}>BCH · USDT · USDC · otras criptomonedas</div></div></div>
              <div style={{ marginTop: 16, color: "#e2e8f0", lineHeight: 1.7 }}>✓ Rápido y seguro &nbsp; · &nbsp; ✓ Alternativa a medios bancarios &nbsp; · &nbsp; ✓ Consultá condiciones especiales si aplican</div>
            </button>

            <button onClick={() => setModal("otros")} style={{ ...smallButton, padding: 12, textAlign: "left" }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}><div style={{ fontSize: 46 }}>💳</div><div><div style={{ fontSize: 22, fontWeight: 850 }}>Otras formas de pago</div><div style={{ color: "#38bdf8", marginTop: 5 }}>Transferencia, tarjetas, billeteras y más</div></div></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 18, fontSize: 13 }}><div>🏦<br/><b>Transferencia</b><br/>CBU / CVU / Alias</div><div>💳<br/><b>Tarjetas</b><br/>Crédito / Débito</div><div>🤝<br/><b>Mercado Pago</b><br/>Dinero en cuenta</div><div>👛<br/><b>Otras opciones</b><br/>Consultar</div></div>
            </button>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginTop: 16 }}>
          <button onClick={abrirHistorialPagos} style={{ ...smallButton, padding: 9, textAlign: "left", fontSize: 16, fontWeight: 800 }}>📄 &nbsp; Historial de pagos <span style={{ float: "right" }}>›</span></button>
          <button onClick={() => abrirWhatsApp(`Hola, envío un comprobante de pago de ${empresa?.nombre || "mi empresa"}.`)} style={{ ...smallButton, padding: 9, textAlign: "left", fontSize: 16, fontWeight: 800 }}>✉️ &nbsp; Enviar comprobante <span style={{ float: "right" }}>›</span></button>
          <button onClick={() => abrirWhatsApp(`Hola, tengo una consulta sobre la cuenta de ${empresa?.nombre || "mi empresa"}.`)} style={{ ...smallButton, padding: 9, textAlign: "left", fontSize: 16, fontWeight: 800 }}>💬 &nbsp; Consultas / Soporte <span style={{ float: "right" }}>›</span></button>
        </div>
      </main>

      {modal && <Modal onClose={() => setModal(null)}>
        {modal === "bch" && <><h2 style={{ marginTop: 0, color: "#55ef9f" }}>🟢 Bitcoin Cash (BCH) / Cripto</h2><p>BCH es el medio de pago cripto preferencial. También podés consultar por USDT, USDC u otras criptomonedas.</p><p style={{ color: "#cbd5e1" }}>Para evitar errores de red o dirección, los datos vigentes de pago se coordinan al momento de abonar.</p><button onClick={() => abrirWhatsApp(`Hola, soy de ${empresa?.nombre || "mi empresa"} y quiero coordinar el pago del abono con Bitcoin Cash (BCH).`)} style={{ ...smallButton, background: "#16a34a", padding: "12px 18px", fontWeight: 800 }}>Coordinar pago con BCH</button></>}
        {modal === "otros" && <><h2 style={{ marginTop: 0 }}>Otras formas de pago</h2><div style={{ lineHeight: 2 }}><b>🏦 Transferencia:</b> CBU, CVU o Alias.<br/><b>💳 Tarjetas:</b> crédito o débito.<br/><b>📱 Billeteras:</b> Mercado Pago y opciones disponibles.<br/><b>➕ Otros medios:</b> consultar disponibilidad.</div><button onClick={() => abrirWhatsApp(`Hola, soy de ${empresa?.nombre || "mi empresa"} y quiero consultar las formas de pago disponibles.`)} style={{ ...smallButton, marginTop: 16, padding: "11px 16px", fontWeight: 800 }}>Consultar medios de pago</button></>}
        {modal === "historial" && <>
          <h2 style={{ marginTop: 0 }}>📄 Historial de pagos</h2>
          <p style={{ color: "#cbd5e1", fontSize: 13 }}>Movimientos registrados para tu empresa. Se muestran los últimos 100.</p>
          {cargandoHistorial ? <p>Consultando pagos…</p> : errorHistorial ? (
            <p role="alert" style={{ color: "#fca5a5" }}>{errorHistorial}</p>
          ) : historialPagos.length === 0 ? (
            <p style={{ color: "#cbd5e1" }}>Todavía no hay pagos registrados para tu empresa.</p>
          ) : <div style={{ maxHeight: "55vh", overflowY: "auto", display: "grid", gap: 10 }}>
            {historialPagos.map((p, i) => <div key={p.id || i} style={{ background: "#152a45", border: "1px solid #29415f", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <strong>{p.concepto || p.tipo_movimiento || "Movimiento de abono"}</strong>
                <strong style={{ color: "#55ef9f" }}>{p.bonificado ? "Bonificado · " : ""}{importePago(p)}</strong>
              </div>
              <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 6 }}>Fecha: {fechaPago(p.fecha)} · Medio: {p.metodo || "No especificado"}</div>
              {(p.periodo_desde || p.periodo_hasta) && <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>Período: {fechaPeriodo(p.periodo_desde)} al {fechaPeriodo(p.periodo_hasta)}</div>}
              {p.comprobante && <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 4 }}>Referencia: {p.comprobante}</div>}
            </div>)}
          </div>}
          <button type="button" onClick={abrirHistorialPagos} disabled={cargandoHistorial} style={{ ...smallButton, marginTop: 14, padding: "9px 14px" }}>↻ Actualizar historial</button>
        </>}
      </Modal>}
    </div>
  );
}

function Modal({ children, onClose }) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.68)", display: "grid", placeItems: "center", zIndex: 9999, padding: 20 }}><div onClick={e => e.stopPropagation()} style={{ width: "min(620px,94vw)", background: "#102139", border: "1px solid #365477", borderRadius: 16, padding: 24, boxShadow: "0 25px 80px rgba(0,0,0,.45)" }}><button onClick={onClose} style={{ float: "right", border: 0, background: "transparent", color: "white", fontSize: 24, cursor: "pointer" }}>×</button>{children}</div></div>;
}
