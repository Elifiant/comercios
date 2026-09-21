import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function AdminClientes() {
  const [empresaFicha360, setEmpresaFicha360] = useState(null);
  const [mostrarModal360, setMostrarModal360] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Modales
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [modal360, setModal360] = useState(null);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);

  // Edición comercial (en cero real)
  const [tarifaEditada, setTarifaEditada] = useState(0);
  const [cupoEditado, setCupoEditado] = useState(0);
  const [diaCobroEditado, setDiaCobroEditado] = useState("01");
  const [monedaEditada, setMonedaEditada] = useState("ARS");
  const [paisEditado, setPaisEditado] = useState("Argentina");

  // Registro de cobro
  const [montoPago, setMontoPago] = useState(0);
  const [metodoPago, setMetodoPago] = useState("Transferencia CBU/CVU");

  // Carga única y limpia desde Supabase (cero datos inventados)
  const cargarDatosMaestros = async () => {
    try {
      setCargando(true);
      const [resEmp, resPerf] = await Promise.all([
        supabase.from("empresas").select("*").order("nombre"),
        supabase.from("perfiles").select("*")
      ]);

      if (resEmp.data) setEmpresas(resEmp.data);
      if (resPerf.data) setPerfiles(resPerf.data);
    } catch (err) {
      console.warn("Error carga Supabase:", err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosMaestros();
  }, []);

  // Abrir modal de edición
  const abrirEdicion = (emp) => {
    setEmpresaSeleccionada(emp);
    setTarifaEditada(emp.tarifa_pactada || 0);
    setCupoEditado(emp.cupo_preventistas || 0);
    const diaLimpio = String(emp.dia_cobro || "01").replace(/\D/g, "").slice(0, 2) || "01";
    setDiaCobroEditado(diaLimpio);
    setMonedaEditada(emp.moneda || "ARS");
    setPaisEditado(emp.pais || "Argentina");
    setMostrarModalEditar(true);
  };

  // Guardar edición directamente en Supabase
    // Guardar edición directamente en Supabase con persistencia real
    // Guardar edición directamente en Supabase con persistencia real
    // Guardar edición directamente en Supabase con reporte de error explícito
    // Guardar edición directamente en Supabase con día de cobro numérico entero
  const guardarEdicion = async (e) => {
    e.preventDefault();
    if (!empresaSeleccionada) return;
    const nomEmpresa = typeof empresaSeleccionada === 'object' ? (empresaSeleccionada.nombre || '') : String(empresaSeleccionada);
    const idEmpresa = typeof empresaSeleccionada === 'object' ? empresaSeleccionada.id : null;

    // Extraer únicamente el número entero limpio para dia_cobro (ej: "Día 23 c/mes" -> 23)
    const numeroDiaLimpio = parseInt(String(diaCobroEditado || "05").replace(/\D/g, ""), 10) || 5;

    const payload = {
      tarifa_pactada: Number(tarifaEditada) || 0,
      cupo_preventistas: Number(cupoEditado) || 0,
      dia_cobro: numeroDiaLimpio,
      moneda: monedaEditada || "ARS",
      pais: paisEditado || "Argentina"
    };

    try {
      let res;
      if (idEmpresa) {
        res = await supabase.from("empresas").update(payload).eq("id", idEmpresa);
      } else {
        res = await supabase.from("empresas").update(payload).ilike("nombre", nomEmpresa.trim());
      }

      if (res && res.error) {
        console.error("Fallo update empresas:", res.error);
        alert("Fallo de Supabase: " + res.error.message);
        return;
      }

      // Actualizar estado en pantalla formateado para visualización
      const payloadVisual = {
        ...payload,
        dia_cobro: "Día " + String(numeroDiaLimpio).padStart(2, "0") + " c/mes"
      };

      setEmpresas(prev => prev.map(item => {
        const n = typeof item === 'object' ? item.nombre : item;
        return (n || '').trim().toLowerCase() === nomEmpresa.trim().toLowerCase()
          ? { ...(typeof item === 'object' ? item : { nombre: item }), ...payloadVisual }
          : item;
      }));

      if (typeof setModal360 === 'function') {
        setModal360(prev => prev ? { ...(typeof prev === 'object' ? prev : { nombre: prev }), ...payloadVisual } : null);
      }

      // Guardar respaldo local
      try {
        const guardadas = JSON.parse(localStorage.getItem("rutacomercio_tarifas_v1") || "{}");
        guardadas[nomEmpresa] = { ...payloadVisual };
        localStorage.setItem("rutacomercio_tarifas_v1", JSON.stringify(guardadas));
      } catch(e) {}

      alert("✓ Guardado con éxito en Supabase");
      setMostrarModalEditar(false);
    } catch (err) {
      alert("Error al guardar: " + (err.message || "Error desconocido"));
    }
  };

  // Abrir modal de cobro
  const abrirCobro = (emp) => {
    setEmpresaSeleccionada(emp);
    setMontoPago(emp.tarifa_pactada || 0);
    setMostrarModalPago(true);
  };

  // Asentar cobro real
  const asentarPago = async (e) => {
    e.preventDefault();
    if (!empresaSeleccionada) return;

    try {
      await supabase.from("pagos_empresas").insert([{
        empresa: empresaSeleccionada.nombre,
        monto: Number(montoPago) || 0,
        moneda: empresaSeleccionada.moneda || "ARS",
        metodo: metodoPago,
        estado: "Confirmado",
        fecha: new Date().toISOString()
      }]);

      alert("Cobro asentado con éxito para " + empresaSeleccionada.nombre);
      setMostrarModalPago(false);
      cargarDatosMaestros();
    } catch (err) {
      alert("Error al registrar pago: " + err.message);
    }
  };

  // Eliminar empresa con confirmación
  const eliminarEmpresa = async (emp) => {
    const seguro = window.confirm("¿Seguro que deseas eliminar definitivamente a " + emp.nombre + "?");
    if (!seguro) return;

    try {
      if (emp.id) {
        await supabase.from("empresas").delete().eq("id", emp.id);
      } else {
        await supabase.from("empresas").delete().eq("nombre", emp.nombre);
      }
      setEmpresas(prev => prev.filter(i => i.nombre !== emp.nombre));
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  // Métricas reales calculadas exclusivamente desde la base
  const totalPreventistasCalle = perfiles.filter(p => p.rol === "preventista" || !p.rol).length;

  const totalFacturacionARS = empresas
    .filter(e => !e.moneda || e.moneda === "ARS")
    .reduce((sum, e) => sum + (Number(e.tarifa_pactada) || 0), 0);

  const totalFacturacionUSD = empresas
    .filter(e => e.moneda === "USD" || e.moneda === "USDT")
    .reduce((sum, e) => sum + (Number(e.tarifa_pactada) || 0), 0);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>
      {/* HEADER SUPERADMIN */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo.png" alt="RutaComercio" style={{ height: "36px", objectFit: "contain" }} onError={(e) => { e.target.style.display = 'none'; }} />
          <div>
            <h1 style={{ margin: 0, fontSize: "17px", fontWeight: "800", letterSpacing: "-0.5px" }}>RutaComercio SuperAdmin</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Control Comercial Maestro y Facturación</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a href="/promotores" style={{ textDecoration: "none", backgroundColor: "#f1f5f9", color: "#334155", padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: "700" }}>🤝 Red de Partners</a>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} style={{ backgroundColor: "#ef4444", color: "#ffffff", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>✕ Salir</button>
        </div>
      </header>

      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 20px" }}>
        {/* TARJETAS KPI EN CERO REAL */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Empresas Clientes</span>
            <div style={{ fontSize: "24px", fontWeight: "800", margin: "4px 0", color: "#0f172a" }}>{empresas.length} Clientes</div>
            <span style={{ fontSize: "12px", color: empresas.length > 0 ? "#16a34a" : "#64748b", fontWeight: "700" }}>
              {empresas.length > 0 ? "● En base de datos" : "Sin empresas cargadas"}
            </span>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Preventistas en Calle</span>
            <div style={{ fontSize: "24px", fontWeight: "800", margin: "4px 0", color: "#0f172a" }}>{totalPreventistasCalle} en Operación</div>
            <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "700" }}>Flota activa</span>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Facturación Mensual Estimada</span>
            <div style={{ fontSize: "20px", fontWeight: "800", margin: "4px 0", color: "#0f172a" }}>
              $ {totalFacturacionARS.toLocaleString()} ARS {totalFacturacionUSD > 0 ? "+ $ " + totalFacturacionUSD + " USD" : ""}
            </div>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Suma real de tarifas pactadas</span>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Previsión 15 Días</span>
            <div style={{ fontSize: "24px", fontWeight: "800", margin: "4px 0", color: "#0f172a" }}>
              $ 0 ARS
            </div>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Sin vencimientos próximos</span>
          </div>
        </div>

        {/* TABLA SUPABASE */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "800" }}>Empresas Clientes Registradas ({empresas.length})</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Registros activos en Supabase table: public.empresas</p>
            </div>
            <button onClick={cargarDatosMaestros} style={{ backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>↻ Refrescar Datos</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "12px 16px" }}>Empresa & País</th>
                  <th style={{ padding: "12px 16px" }}>Cupos Preventistas</th>
                  <th style={{ padding: "12px 16px" }}>Modelo & Tarifa</th>
                  <th style={{ padding: "12px 16px" }}>Día de Corte</th>
                  <th style={{ padding: "12px 16px" }}>Partner Asociado</th>
                  <th style={{ padding: "12px 16px" }}>Estado Cobro</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresas.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                      No hay empresas registradas en Supabase.
                    </td>
                  </tr>
                ) : (
                  empresas.map((emp) => {
                    const cantPrev = perfiles.filter(p => (p.empresa || "").toLowerCase().trim() === (emp.nombre || "").toLowerCase().trim()).length;
                    const cupoMax = Number(emp.cupo_preventistas) || 0;
                    const excedida = cupoMax > 0 ? cantPrev > cupoMax : false;
                    const tarifaVal = Number(emp.tarifa_pactada) || 0;

                    return (
                      <tr key={emp.id || emp.nombre} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "14px" }}>{emp.nombre}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{emp.pais || "Argentina"} {emp.cuit ? "· CUIT " + emp.cuit : ""}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: "800" }}>👥 {cantPrev} / {cupoMax}</span>
                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", fontWeight: "800", backgroundColor: excedida ? "#fee2e2" : "#dcfce7", color: excedida ? "#b91c1c" : "#15803d" }}>
                              {excedida ? "Excedida" : (cupoMax === 0 ? "Sin cupo fijado" : "En cupo")}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: "800", color: "#0f172a" }}>$ {tarifaVal.toLocaleString()} {emp.moneda || "ARS"}</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{emp.modelo_cobro || "Plan Pactado"}</div>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#475569", fontWeight: "700" }}>
                          {emp.dia_cobro || "-"}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#475569" }}>
                          {emp.partner_asignado || "Directo (Sin partner)"}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "800", backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                            ● Al Día
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button onClick={() => setModal360(emp)} style={{ backgroundColor: "#3b82f6", border: "1px solid #2563eb", color: "#ffffff", padding: "6px 10px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>👁️ Ficha 360°</button>
                            <button onClick={() => abrirCobro(emp)} style={{ backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 10px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>💳 Cobro</button>
                            <button onClick={() => abrirEdicion(emp)} style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", padding: "6px 10px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>✏️ Editar</button>
                            <button onClick={() => eliminarEmpresa(emp)} style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "6px 8px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL EDICIÓN COMERCIAL */}
        {mostrarModalEditar && empresaSeleccionada && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "16px" }}>
            <div style={{ backgroundColor: "#ffffff", width: "100%", maxWidth: "480px", borderRadius: "10px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>✏️ Modificar: {empresaSeleccionada.nombre}</h3>
                <button onClick={() => setMostrarModalEditar(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
              </div>
              <form onSubmit={guardarEdicion}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Cupo de Preventistas Autorizados</label>
                  <input type="number" min="0" max="200" value={cupoEditado} onChange={(e) => setCupoEditado(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} required />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Tarifa Pactada</label>
                    <input type="number" min="0" value={tarifaEditada} onChange={(e) => setTarifaEditada(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Moneda</label>
                    <select value={monedaEditada} onChange={(e) => setMonedaEditada(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }}>
                      <option value="ARS">ARS ($)</option>
                      <option value="USD">USD ($)</option>
                      <option value="MXN">MXN ($)</option>
                      <option value="USDT">USDT (₮)</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Día de Corte / Cobro (1 al 31)</label>
                  <input type="number" min="1" max="31" value={diaCobroEditado} onChange={(e) => setDiaCobroEditado(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} required />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button type="button" onClick={() => setMostrarModalEditar(false)} style={{ backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", fontWeight: "700", cursor: "pointer" }}>Cancelar</button>
                  <button type="submit" style={{ backgroundColor: "#2563eb", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "700", cursor: "pointer" }}>Guardar en Supabase</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL COBRO */}
        {mostrarModalPago && empresaSeleccionada && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "16px" }}>
            <div style={{ backgroundColor: "#ffffff", width: "100%", maxWidth: "440px", borderRadius: "10px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>💳 Asentar Pago: {empresaSeleccionada.nombre}</h3>
                <button onClick={() => setMostrarModalPago(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
              </div>
              <form onSubmit={asentarPago}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Monto Acreditado</label>
                  <input type="number" min="0" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} required />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Medio de Cobro</label>
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }}>
                    <option value="Transferencia CBU/CVU">Transferencia CBU / CVU</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cripto / USDT">Cripto / USDT</option>
                  </select>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button type="button" onClick={() => setMostrarModalPago(false)} style={{ backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", fontWeight: "700", cursor: "pointer" }}>Cancelar</button>
                  <button type="submit" style={{ backgroundColor: "#16a34a", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "700", cursor: "pointer" }}>Confirmar Acreditación</button>
                </div>
              </form>
            </div>
          </div>
        )}
      
      {/* MODAL FICHA 360° INTEGRAL */}
      {mostrarModal360 && empresaFicha360 && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div style={{ backgroundColor: "#1e293b", borderRadius: "16px", padding: "24px", maxWidth: "650px", width: "100%", border: "1px solid #334155", color: "#fff", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #334155", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#60a5fa" }}>👁️ Ficha Integral 360° • {typeof empresaFicha360 === "object" ? empresaFicha360.nombre : empresaFicha360}</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>Supervisores, preventistas y estado de la cuenta</p>
              </div>
              <button onClick={() => setMostrarModal360(false)} style={{ backgroundColor: "transparent", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer", fontWeight: "bold" }}>✕</button>
            </div>

            {/* SUPERVISOR ASIGNADO */}
            <div style={{ backgroundColor: "#0f172a", borderRadius: "10px", padding: "14px", border: "1px solid #334155", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#38bdf8", marginBottom: "8px" }}>👔 Supervisor a Cargo</div>
              {(() => {
                const nomEmp = typeof empresaFicha360 === "object" ? empresaFicha360.nombre : empresaFicha360;
                const sup = (perfiles || []).find(p => (p.empresa || "").toLowerCase() === String(nomEmp || "").toLowerCase() && (p.rol || "").toLowerCase() === "supervisor");
                if (sup) {
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                      <div>
                        <span style={{ fontWeight: "bold", color: "#fff" }}>{sup.nombre}</span>
                        <span style={{ color: "#94a3b8", marginLeft: "8px" }}>({sup.email})</span>
                      </div>
                      <span style={{ backgroundColor: "#10b981", color: "#fff", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>Activo</span>
                    </div>
                  );
                }
                return <div style={{ fontSize: "13px", color: "#94a3b8" }}>Sin supervisor asignado en esta empresa aún.</div>;
              })()}
            </div>

            {/* PREVENTISTAS ASIGNADOS */}
            <div style={{ backgroundColor: "#0f172a", borderRadius: "10px", padding: "14px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#38bdf8", marginBottom: "8px" }}>👥 Preventistas Activos en Calle</div>
              {(() => {
                const nomEmp = typeof empresaFicha360 === "object" ? empresaFicha360.nombre : empresaFicha360;
                const prevs = (perfiles || []).filter(p => (p.empresa || "").toLowerCase() === String(nomEmp || "").toLowerCase() && (p.rol || "").toLowerCase() === "preventista");
                if (prevs.length > 0) {
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {prevs.map(pr => (
                        <div key={pr.id || pr.email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1e293b", padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}>
                          <div>
                            <span style={{ fontWeight: "bold", color: "#fff" }}>👤 {pr.nombre}</span>
                            <span style={{ color: "#94a3b8", marginLeft: "8px" }}>{pr.email}</span>
                          </div>
                          <span style={{ backgroundColor: "rgba(37,99,235,0.2)", color: "#60a5fa", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>En calle</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return <div style={{ fontSize: "13px", color: "#94a3b8" }}>No hay preventistas registrados bajo esta empresa aún.</div>;
              })()}
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button onClick={() => setMostrarModal360(false)} style={{ backgroundColor: "#334155", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    
      {/* MODAL FICHA 360° DE EMPRESA */}
      {modal360 && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "16px" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                  🏢 Ficha 360° · {typeof modal360 === 'object' ? modal360.nombre : modal360}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                  {typeof modal360 === 'object' && modal360.pais ? modal360.pais : "Argentina"} · Moneda: {typeof modal360 === 'object' && modal360.moneda ? modal360.moneda : "ARS"}
                </p>
              </div>
              <button onClick={() => setModal360(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            {/* CONDICIONES COMERCIALES */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", backgroundColor: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Tarifa Pactada</span>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                  0
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Cupo Máximo</span>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                  {typeof modal360 === 'object' && modal360.cupo_preventistas ? modal360.cupo_preventistas : "Sin límite"}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Día de Corte</span>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                  {typeof modal360 === 'object' && modal360.dia_cobro ? modal360.dia_cobro : "Día 05 c/mes"}
                </div>
              </div>
            </div>

            {/* SUPERVISORES Y PREVENTISTAS ASOCIADOS */}
            <h4 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: "700", color: "#334155" }}>
              👥 Equipo Registrado en Supabase
            </h4>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", marginBottom: "20px" }}>
              {(() => {
                const nomEmp = typeof modal360 === 'object' ? modal360.nombre : modal360;
                const equipo = (perfiles || []).filter(p => (p.empresa || '').trim().toLowerCase() === (nomEmp || '').trim().toLowerCase());
                if (equipo.length === 0) {
                  return <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>No hay preventistas ni supervisores asignados a esta empresa aún.</div>;
                }
                return (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                        <th style={{ padding: "8px 12px" }}>Nombre</th>
                        <th style={{ padding: "8px 12px" }}>Email</th>
                        <th style={{ padding: "8px 12px" }}>Rol</th>
                        <th style={{ padding: "8px 12px" }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipo.map((usr, i) => (
                        <tr key={usr.id || i} style={{ borderTop: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "8px 12px", fontWeight: "600", color: "#0f172a" }}>{usr.nombre || "Sin nombre"}</td>
                          <td style={{ padding: "8px 12px", color: "#64748b" }}>{usr.email || "-"}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ backgroundColor: usr.rol === 'supervisor' ? '#e0f2fe' : '#f0fdf4', color: usr.rol === 'supervisor' ? '#0369a1' : '#15803d', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                              {usr.rol || 'preventista'}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", color: usr.activo !== false ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                            {usr.activo !== false ? '● Activo' : '○ Inactivo'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => { const emp = modal360; setModal360(null); abrirEdicion(emp); }} style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
                ✏️ Modificar Condiciones
              </button>
              <button onClick={() => setModal360(null)} style={{ backgroundColor: "#0f172a", border: "none", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
    </div>
  );
}
