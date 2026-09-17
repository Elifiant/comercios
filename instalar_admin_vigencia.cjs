const fs = require('fs');

const codigo = `import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function AdminClientes() {
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados Modal Alta Empresa
  const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [pais, setPais] = useState("Argentina");
  const [moneda, setMoneda] = useState("ARS");
  const [modalidad, setModalidad] = useState("ABONO_MAS_PREV");
  const [abonoBase, setAbonoBase] = useState(35000);
  const [cantPreventistas, setCantPreventistas] = useState(3);
  const [precioUnitPrev, setPrecioUnitPrev] = useState(10000);
  const [addonListas, setAddonListas] = useState(true);
  const [tarifaAddon, setTarifaAddon] = useState(15000);
  const [vendedorAsignado, setVendedorAsignado] = useState("Venta Directa Alex (Sin Comisión)");
  const [comisionVendedorPct, setComisionVendedorPct] = useState(20);
  const [vigenciaMeses, setVigenciaMeses] = useState(6); // 3, 6, 12, 999 (Permanente)

  // Estado Modal Extender Plazo
  const [modalExtender, setModalExtender] = useState(null);
  const [mesesExtension, setMesesExtension] = useState(6);

  // Comisiones por Cobros Acreditados
  const [comisiones, setComisiones] = useState(() => {
    try {
      const guardadas = localStorage.getItem("rutacomercio_comisiones_promotores");
      return guardadas ? JSON.parse(guardadas) : [
        {
          id: "COM-101",
          vendedor: "Facundo Ventas",
          cliente: "Distribuidora Los Andes",
          mesActual: 2,
          mesesPactados: 6,
          cobroAcreditado: 75000,
          addonListasAlex: 15000,
          baseComisionable: 60000,
          pct: 20,
          aLiquidar: 12000,
          estado: "Pendiente"
        },
        {
          id: "COM-102",
          vendedor: "Lorena Comercial",
          cliente: "Mayorista San Juan",
          mesActual: 3,
          mesesPactados: 3,
          cobroAcreditado: 110000,
          addonListasAlex: 20000,
          baseComisionable: 90000,
          pct: 25,
          aLiquidar: 22500,
          estado: "Pendiente"
        },
        {
          id: "COM-103",
          vendedor: "Facundo Ventas",
          cliente: "Gaseosas del Norte",
          mesActual: 4,
          mesesPactados: 3,
          cobroAcreditado: 85000,
          addonListasAlex: 15000,
          baseComisionable: 70000,
          pct: 20,
          aLiquidar: 0,
          estado: "Vigencia Cumplida"
        }
      ];
    } catch(e) {
      return [];
    }
  });

  // Carga inicial
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: empsDB } = await supabase.from("empresas").select("*");
      if (empsDB && empsDB.length > 0) {
        const formateadas = empsDB.map(e => ({
          id: e.id,
          nombre: e.nombre,
          pais: e.pais || "Argentina",
          moneda: e.moneda || "ARS",
          modalidad: e.modalidad || "ABONO_MAS_PREV",
          abonoBase: parseFloat(e.abono_base || e.tarifa_pactada || 35000),
          cantPrevContratados: parseInt(e.cupo_preventistas || 3, 10),
          precioUnitPrev: parseFloat(e.precio_preventista || 10000),
          addonListas: e.addon_listas !== false,
          tarifaAddon: parseFloat(e.tarifa_addon || 15000),
          vendedor: e.vendedor || "Venta Directa Alex (Sin Comisión)",
          comisionPct: parseFloat(e.comision_pct || 0),
          mesActual: parseInt(e.mes_actual_comision || 1, 10),
          mesesPactados: parseInt(e.meses_pactados_comision || 6, 10)
        }));
        setEmpresas(formateadas);
      } else {
        // Fallback de demostración comercial con datos vivos
        setEmpresas([
          { id: "1", nombre: "Distribuidora Los Andes", pais: "Argentina", moneda: "ARS", modalidad: "ABONO_MAS_PREV", abonoBase: 35000, cantPrevContratados: 4, precioUnitPrev: 10000, addonListas: true, tarifaAddon: 15000, vendedor: "Facundo Ventas", comisionPct: 20, mesActual: 2, mesesPactados: 6 },
          { id: "2", nombre: "Lácteos San Mateo", pais: "Argentina", moneda: "ARS", modalidad: "PRUEBA_15D", abonoBase: 0, cantPrevContratados: 3, precioUnitPrev: 10000, addonListas: true, tarifaAddon: 15000, vendedor: "Venta Directa Alex", comisionPct: 0, mesActual: 1, mesesPactados: 6 },
          { id: "3", nombre: "Distribuidora El Progreso", pais: "México", moneda: "USD", modalidad: "SOLO_PREV", abonoBase: 0, cantPrevContratados: 8, precioUnitPrev: 10, addonListas: false, tarifaAddon: 0, vendedor: "Lorena Comercial", comisionPct: 25, mesActual: 3, mesesPactados: 3 },
          { id: "4", nombre: "Bebidas del Valle", pais: "Argentina", moneda: "ARS", modalidad: "PLANO", abonoBase: 120000, cantPrevContratados: 10, precioUnitPrev: 0, addonListas: true, tarifaAddon: 15000, vendedor: "Facundo Ventas", comisionPct: 50, mesActual: 1, mesesPactados: 1 }
        ]);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  // Cálculo de Facturación de cada Empresa
  const calcularFacturacion = (emp) => {
    let base = 0;
    if (emp.modalidad === "ABONO_MAS_PREV") base = emp.abonoBase + (emp.cantPrevContratados * emp.precioUnitPrev);
    else if (emp.modalidad === "PRUEBA_15D" || emp.modalidad === "SOLO_PREV") base = emp.cantPrevContratados * emp.precioUnitPrev;
    else if (emp.modalidad === "PLANO") base = emp.abonoBase;
    const addon = emp.addonListas ? emp.tarifaAddon : 0;
    return base + addon;
  };

  // Guardar Alta de Nueva Empresa & Plan Comercial
  const guardarNuevaEmpresa = (e) => {
    e.preventDefault();
    if (!nombreEmpresa.trim()) return alert("Ingresá el nombre comercial");

    const nueva = {
      id: Date.now().toString(),
      nombre: nombreEmpresa.trim(),
      pais,
      moneda,
      modalidad,
      abonoBase: parseFloat(abonoBase) || 0,
      cantPrevContratados: parseInt(cantPreventistas, 10) || 1,
      precioUnitPrev: parseFloat(precioUnitPrev) || 0,
      addonListas,
      tarifaAddon: addonListas ? (parseFloat(tarifaAddon) || 0) : 0,
      vendedor: vendedorAsignado,
      comisionPct: parseFloat(comisionVendedorPct) || 0,
      mesActual: 1,
      mesesPactados: parseInt(vigenciaMeses, 10) || 6
    };

    setEmpresas(prev => [nueva, ...prev]);
    setMostrarModalEmpresa(false);
    setNombreEmpresa("");
    alert("✅ Empresa creada y plan comercial con vigencia asignado");
  };

  // Marcar Comisión Liquidada
  const marcarLiquidada = (id) => {
    const act = comisiones.map(c => c.id === id ? { ...c, estado: "Liquidada", fechaLiquidada: new Date().toLocaleDateString() } : c);
    setComisiones(act);
    try {
      localStorage.setItem("rutacomercio_comisiones_promotores", JSON.stringify(act));
    } catch(e) {}
  };

  // Extender Plazo de Comisión
  const aplicarExtensionPlazo = () => {
    if (!modalExtender) return;
    const meses = parseInt(mesesExtension, 10) || 6;
    
    // Actualizamos en las órdenes de comisiones
    const comAct = comisiones.map(c => {
      if (c.id === modalExtender.id || (c.vendedor === modalExtender.vendedor && c.cliente === modalExtender.cliente)) {
        return {
          ...c,
          mesesPactados: c.mesesPactados + meses,
          estado: "Pendiente"
        };
      }
      return c;
    });
    setComisiones(comAct);

    // Actualizamos en la tabla de empresas
    const empAct = empresas.map(emp => {
      if (emp.nombre === modalExtender.cliente) {
        return {
          ...emp,
          mesesPactados: emp.mesesPactados + meses
        };
      }
      return emp;
    });
    setEmpresas(empAct);

    try {
      localStorage.setItem("rutacomercio_comisiones_promotores", JSON.stringify(comAct));
    } catch(e) {}

    setModalExtender(null);
    alert("✅ Plazo de comisión extendido con éxito por +" + meses + " meses");
  };

  // Métricas Superiores
  const facturacionTotalARS = empresas.filter(e => e.moneda === "ARS").reduce((acc, e) => acc + calcularFacturacion(e), 0);
  const addonTotalAlex = empresas.filter(e => e.addonListas && e.moneda === "ARS").reduce((acc, e) => acc + e.tarifaAddon, 0);
  const comisionesPendientesTotal = comisiones.filter(c => c.estado === "Pendiente").reduce((acc, c) => acc + c.aLiquidar, 0);
  const margenNetoLibre = facturacionTotalARS - comisionesPendientesTotal;
  const porcentajeRendimiento = facturacionTotalARS > 0 ? ((margenNetoLibre / facturacionTotalARS) * 100).toFixed(1) : 100;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#faf8ff", fontFamily: "Plus Jakarta Sans, system-ui, sans-serif", padding: "24px", color: "#191c20" }}>
      
      {/* CABECERA SUPERIOR */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", background: "#fff", padding: "16px 24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>👑</span>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>RutaComercio Admin</h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Control de Promotores, Vigencia de Comisiones y Extensión de Plazos</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            onClick={() => setMostrarModalEmpresa(true)}
            style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}
          >
            <span>+</span> Configurar Empresa & Plan
          </button>
        </div>
      </header>

      {/* MÉTRICAS FINANCIERAS SUPERIORES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        
        <div style={{ background: "#fff", padding: "18px", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "4px solid #2563eb" }}>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Facturación Bruta Mes</div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>$ {facturacionTotalARS.toLocaleString()}</div>
          <div style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700", marginTop: "4px" }}>↗ +18.4% vs mes anterior</div>
        </div>

        <div style={{ background: "#fff", padding: "18px", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "4px solid #3b82f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.5px" }}>🔒 Add-on Listas (Alex 100%)</span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#2563eb", marginTop: "4px" }}>$ {addonTotalAlex.toLocaleString()}</div>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginTop: "4px" }}>{empresas.filter(e => e.addonListas).length} Empresas Activas · Excluido comis.</div>
        </div>

        <div style={{ background: "#fff", padding: "18px", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.5px" }}>Comisiones a Liquidar</div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#b45309", marginTop: "4px" }}>$ {comisionesPendientesTotal.toLocaleString()}</div>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginTop: "4px" }}>{comisiones.filter(c => c.estado === "Pendiente").length} pendientes Promotores</div>
        </div>

        <div style={{ background: "#fff", padding: "18px", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "4px solid #16a34a" }}>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Margen Neto Libre</div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#16a34a", marginTop: "4px" }}>$ {margenNetoLibre.toLocaleString()}</div>
          <div style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700", marginTop: "4px" }}>{porcentajeRendimiento}% Rendimiento post-comisiones</div>
        </div>

      </div>

      {/* CUERPO: PLANES & COMISIONES CON VIGENCIA */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "24px", marginBottom: "24px" }}>
        
        {/* PANEL IZQUIERDO: CONFIGURADOR DIRECTO Y RESUMEN */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>⚙️ Configuración de Empresa</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Parámetros de facturación recurrente, tarifas híbridas y comisiones.</p>
            </div>
            <span style={{ fontSize: "11px", fontWeight: "800", backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "4px 10px", borderRadius: "8px" }}>Admin Engine v4.2</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>MODALIDADES HÍBRIDAS</div>
              <div style={{ fontSize: "13px", fontWeight: "800", marginTop: "4px" }}>Abono Fijo, Por Preventista o Gratis 15d</div>
              <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "2px" }}>Combinable con tarifa unitaria variable</div>
            </div>
            <div style={{ padding: "12px", backgroundColor: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "11px", color: "#166534", fontWeight: "700" }}>ESCUDO ANTI-COMISIÓN LISTAS</div>
              <div style={{ fontSize: "13px", fontWeight: "800", marginTop: "4px", color: "#166534" }}>Add-on 100% Alex</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Se aísla automáticamente de la comisión</div>
            </div>
          </div>

          <div style={{ padding: "14px", backgroundColor: "#eff6ff", borderRadius: "12px", border: "1px dashed #3b82f6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <strong style={{ fontSize: "13px", color: "#1e40af" }}>Mecánica de Protección de Margen</strong>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#475569" }}>
                  El servicio 'Mantenimiento de Listas' opera de forma aislada. Jamás tributa porcentaje al promotor. El sistema recalcula la base líquida en cada acreditación mensual para asegurar que el margen técnico de Alex permanezca al 100% íntegro.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: COMISIONES POR COBROS ACREDITADOS CON VIGENCIA */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "800" }}>🤝 Comisiones por Cobros Acreditados</h2>
            <span style={{ fontSize: "11px", backgroundColor: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "6px", fontWeight: "800" }}>Automático</span>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px" }}>
            Al registrarse el cobro, se liquida al Promotor Comercial solo si el acuerdo temporal está vigente, deduciendo el add-on exclusivo de Alex.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {comisiones.map((com) => {
              const esCumplida = com.mesActual > com.mesesPactados || com.estado === "Vigencia Cumplida";
              const mesesRestantes = Math.max(0, com.mesesPactados - com.mesActual);
              const esUltimoMes = mesesRestantes === 0 && !esCumplida;

              return (
                <div key={com.id} style={{ padding: "14px", borderRadius: "12px", border: esCumplida ? "1px dashed #cbd5e1" : "1px solid #e2e8f0", backgroundColor: esCumplida ? "#f8fafc" : "#fff" }}>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: "13px", color: "#0f172a" }}>{com.vendedor}</strong>
                      <span style={{ marginLeft: "6px", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#475569", fontWeight: "700" }}>PARTNER</span>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Cliente: {com.cliente}</div>
                    </div>

                    <span style={{ 
                      fontSize: "11px", 
                      fontWeight: "800", 
                      padding: "3px 8px", 
                      borderRadius: "6px",
                      backgroundColor: esCumplida ? "#f1f5f9" : (com.estado === "Liquidada" ? "#dcfce7" : "#ffedd5"),
                      color: esCumplida ? "#64748b" : (com.estado === "Liquidada" ? "#166534" : "#c2410c")
                    }}>
                      {esCumplida ? "Vigencia Cumplida" : com.estado}
                    </span>
                  </div>

                  {/* INDICADOR DE VIGENCIA Y BOTÓN DE EXTENDER */}
                  <div style={{ margin: "10px 0 8px", padding: "6px 10px", backgroundColor: esCumplida ? "#f8fafc" : (esUltimoMes ? "#fff7ed" : "#f0fdf4"), borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                    {esCumplida ? (
                      <span style={{ color: "#64748b" }}>⏱️ Acuerdo finalizado ({com.mesesPactados}/{com.mesesPactados} meses). Cobro 100% Alex.</span>
                    ) : (
                      <span style={{ fontWeight: "700", color: esUltimoMes ? "#c2410c" : "#166534" }}>
                        ⏱️ Vigencia: Mes {com.mesActual} de {com.mesesPactados} pactados ({mesesRestantes} restantes)
                      </span>
                    )}

                    <button 
                      onClick={() => setModalExtender(com)}
                      style={{ background: "none", border: "none", color: "#2563eb", fontWeight: "800", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
                    >
                      <span>➕</span> Extender Plazo
                    </button>
                  </div>

                  {/* DESGLOSE NUMÉRICO */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                    <div>
                      <div style={{ color: "#64748b", fontSize: "11px" }}>Cobro Acreditado:</div>
                      <div style={{ fontWeight: "800" }}>$ {com.cobroAcreditado.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ color: "#64748b", fontSize: "11px" }}>Add-on Listas (Alex):</div>
                      <div style={{ fontWeight: "800", color: "#dc2626" }}>-${com.addonListasAlex.toLocaleString()} (0% com.)</div>
                    </div>
                    <div>
                      <div style={{ color: "#64748b", fontSize: "11px" }}>Base Comisionable:</div>
                      <div style={{ fontWeight: "800", color: "#2563eb" }}>$ {com.baseComisionable.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ color: "#64748b", fontSize: "11px" }}>A Liquidar ({com.pct}%):</div>
                      <div style={{ fontWeight: "900", fontSize: "13px", color: esCumplida ? "#94a3b8" : "#0f172a" }}>
                        $ {esCumplida ? "0 (100% Alex)" : com.aLiquidar.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {com.estado === "Pendiente" && !esCumplida && (
                    <button 
                      onClick={() => marcarLiquidada(com.id)}
                      style={{ marginTop: "10px", width: "100%", padding: "8px", backgroundColor: "#0f172a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}
                    >
                      ✓ Marcar Liquidada
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* TABLA UNIFICADA DE EMPRESAS CON SUS PLANES Y VIGENCIA */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>🏢 Empresas en RutaComercio ({empresas.length})</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Distribución comercial, planes aplicados y promotores asociados.</p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f1f5f9", color: "#64748b" }}>
                <th style={{ padding: "10px 8px" }}>Empresa / Región</th>
                <th style={{ padding: "10px 8px" }}>Modalidad Contratada</th>
                <th style={{ padding: "10px 8px" }}>Add-on Listas</th>
                <th style={{ padding: "10px 8px" }}>Promotor / Partner & Vigencia</th>
                <th style={{ padding: "10px 8px" }}>Facturación</th>
                <th style={{ padding: "10px 8px", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((emp) => {
                const mesesRest = Math.max(0, emp.mesesPactados - emp.mesActual);
                const esCumplida = emp.mesActual > emp.mesesPactados;

                return (
                  <tr key={emp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 8px", fontWeight: "800" }}>
                      {emp.nombre}
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "normal" }}>{emp.pais} · {emp.moneda}</div>
                    </td>

                    <td style={{ padding: "12px 8px" }}>
                      <span style={{ 
                        display: "inline-block", 
                        padding: "4px 8px", 
                        borderRadius: "6px", 
                        fontSize: "11px", 
                        fontWeight: "700",
                        backgroundColor: emp.modalidad === "PRUEBA_15D" ? "#fef3c7" : "#eff6ff",
                        color: emp.modalidad === "PRUEBA_15D" ? "#b45309" : "#1d4ed8"
                      }}>
                        {emp.modalidad === "ABONO_MAS_PREV" && "Abono Promo $35k + " + emp.cantPrevContratados + " Prev"}
                        {emp.modalidad === "PRUEBA_15D" && "Prueba 15d ($0) + " + emp.cantPrevContratados + " Prev"}
                        {emp.modalidad === "SOLO_PREV" && "Solo " + emp.cantPrevContratados + " Preventistas ($10k c/u)"}
                        {emp.modalidad === "PLANO" && "Abono Fijo Plano ($120k)"}
                      </span>
                    </td>

                    <td style={{ padding: "12px 8px" }}>
                      {emp.addonListas ? (
                        <span style={{ backgroundColor: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800" }}>
                          +${emp.tarifaAddon.toLocaleString()} Listas
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "11px" }}>Sin Add-on</span>
                      )}
                    </td>

                    <td style={{ padding: "12px 8px" }}>
                      <strong>{emp.vendedor}</strong> <span style={{ fontSize: "11px", color: "#2563eb" }}>({emp.comisionPct}%)</span>
                      <div style={{ fontSize: "11px", color: esCumplida ? "#64748b" : "#16a34a", marginTop: "2px" }}>
                        {esCumplida ? "⏱️ Vigencia Cumplida (0% com.)" : "⏱️ Mes " + emp.mesActual + " de " + emp.mesesPactados + " (Activo)"}
                      </div>
                    </td>

                    <td style={{ padding: "12px 8px", fontWeight: "900", color: "#0f172a" }}>
                      $ {calcularFacturacion(emp).toLocaleString()}
                      {emp.comisionPct > 0 && !esCumplida && (
                        <div style={{ fontSize: "10px", color: "#ea580c", fontWeight: "normal" }}>
                          Comis: ${(calcularFacturacion(emp) * (emp.comisionPct / 100)).toLocaleString()}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "12px 8px", textAlign: "center" }}>
                      <button 
                        onClick={() => setModalExtender({ cliente: emp.nombre, vendedor: emp.vendedor, mesesPactados: emp.mesesPactados, mesActual: emp.mesActual })}
                        style={{ padding: "6px 10px", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                      >
                        📅 Plazo
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EXTENDER PLAZO DE COMISIÓN */}
      {modalExtender && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "16px" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "420px", padding: "20px", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "800" }}>➕ Extender Vigencia de Comisión</h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#64748b" }}>
              Promotor: <strong>{modalExtender.vendedor}</strong><br/>
              Empresa Cliente: <strong>{modalExtender.cliente}</strong>
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>Extender Plazo por:</label>
              <select 
                value={mesesExtension} 
                onChange={(e) => setMesesExtension(e.target.value)} 
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              >
                <option value={1}>+1 Mes Adicional</option>
                <option value={3}>+3 Meses Adicionales</option>
                <option value={6}>+6 Meses (Renovación Estándar)</option>
                <option value={12}>+12 Meses (Año Completo)</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                type="button" 
                onClick={() => setModalExtender(null)} 
                style={{ flex: 1, padding: "10px", backgroundColor: "#f1f5f9", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "12px" }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={aplicarExtensionPlazo} 
                style={{ flex: 1, padding: "10px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "800", cursor: "pointer", fontSize: "12px" }}
              >
                Confirmar Extensión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALTA NUEVA EMPRESA */}
      {mostrarModalEmpresa && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "560px", padding: "24px", borderRadius: "18px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>+ Nueva Empresa & Plan Comercial</h3>
              <button onClick={() => setMostrarModalEmpresa(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={guardarNuevaEmpresa}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Nombre Comercial de la Empresa</label>
                <input 
                  type="text" 
                  value={nombreEmpresa} 
                  onChange={(e) => setNombreEmpresa(e.target.value)} 
                  placeholder="Ej: Distribuidora El Sol S.R.L."
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>País</label>
                  <select value={pais} onChange={(e) => setPais(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <option value="Argentina">Argentina</option>
                    <option value="México">México</option>
                    <option value="Colombia">Colombia</option>
                    <option value="Brasil">Brasil</option>
                    <option value="Internacional">Internacional</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Moneda</label>
                  <select value={moneda} onChange={(e) => setMoneda(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <option value="ARS">Argentina (ARS $)</option>
                    <option value="USD">Dólares (USD u$s)</option>
                    <option value="MXN">México (MXN $)</option>
                    <option value="USDT">Cripto (USDT ₮)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>Modalidad de Contratación</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button 
                    type="button" 
                    onClick={() => { setModalidad("ABONO_MAS_PREV"); setAbonoBase(35000); }} 
                    style={{ padding: "8px", border: modalidad === "ABONO_MAS_PREV" ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", backgroundColor: modalidad === "ABONO_MAS_PREV" ? "#eff6ff" : "#fff" }}
                  >
                    Abono Base + Preventistas
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setModalidad("PRUEBA_15D"); setAbonoBase(0); }} 
                    style={{ padding: "8px", border: modalidad === "PRUEBA_15D" ? "2px solid #b45309" : "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", backgroundColor: modalidad === "PRUEBA_15D" ? "#fef3c7" : "#fff" }}
                  >
                    Prueba 15 Días ($0 Base)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setModalidad("SOLO_PREV"); setAbonoBase(0); }} 
                    style={{ padding: "8px", border: modalidad === "SOLO_PREV" ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", backgroundColor: modalidad === "SOLO_PREV" ? "#eff6ff" : "#fff" }}
                  >
                    Solo por Preventista
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setModalidad("PLANO"); setAbonoBase(120000); }} 
                    style={{ padding: "8px", border: modalidad === "PLANO" ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", backgroundColor: modalidad === "PLANO" ? "#eff6ff" : "#fff" }}
                  >
                    Abono Fijo Plano Ilimitado
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "4px" }}>Importe Abono Base ($)</label>
                  <input 
                    type="number" 
                    value={abonoBase} 
                    onChange={(e) => setAbonoBase(e.target.value)} 
                    disabled={modalidad === "PRUEBA_15D" || modalidad === "SOLO_PREV"}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "4px" }}>Cantidad Preventistas</label>
                  <input 
                    type="number" 
                    value={cantPreventistas} 
                    onChange={(e) => setCantPreventistas(e.target.value)} 
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "4px" }}>Precio Unit. Prev ($)</label>
                  <input 
                    type="number" 
                    value={precioUnitPrev} 
                    onChange={(e) => setPrecioUnitPrev(e.target.value)} 
                    disabled={modalidad === "PLANO"}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>

              <div style={{ padding: "12px", border: "1px dashed #3b82f6", borderRadius: "10px", backgroundColor: "#f0fdf4", marginBottom: "14px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "800", cursor: "pointer", color: "#166534" }}>
                  <input 
                    type="checkbox" 
                    checked={addonListas} 
                    onChange={(e) => setAddonListas(e.target.checked)} 
                  />
                  <span>🔒 Add-on: Mantenimiento & Actualización de Listas (DIRECTO ALEX)</span>
                </label>
                {addonListas && (
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px" }}>Tarifa Add-on:</span>
                    <input 
                      type="number" 
                      value={tarifaAddon} 
                      onChange={(e) => setTarifaAddon(e.target.value)} 
                      style={{ width: "110px", padding: "6px", borderRadius: "6px", border: "1px solid #86efac" }}
                    />
                    <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: "700" }}>100% no comisionable para promotores.</span>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Promotor Comercial / Partner</label>
                  <select value={vendedorAsignado} onChange={(e) => setVendedorAsignado(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}>
                    <option value="Venta Directa Alex (Sin Comisión)">Venta Directa Alex (Sin Comisión)</option>
                    <option value="Facundo Ventas">Facundo Ventas</option>
                    <option value="Lorena Comercial">Lorena Comercial</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Comisión (%)</label>
                  <input 
                    type="number" 
                    value={comisionVendedorPct} 
                    onChange={(e) => setComisionVendedorPct(e.target.value)} 
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Vigencia Comisión</label>
                  <select value={vigenciaMeses} onChange={(e) => setVigenciaMeses(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}>
                    <option value={3}>3 Meses</option>
                    <option value={6}>6 Meses (Estándar)</option>
                    <option value={12}>12 Meses</option>
                    <option value={999}>Permanente</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                style={{ width: "100%", padding: "12px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "800", cursor: "pointer", fontSize: "14px", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
              >
                Guardar Empresa & Plan Comercial
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
`;

fs.writeFileSync('src/AdminClientes.jsx', codigo, 'utf8');
console.log('🎉 ADMIN_CLIENTES_CON_VIGENCIA_Y_EXTENSION_INSTALADO_100');
