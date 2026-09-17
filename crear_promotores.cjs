const fs = require('fs');

const codigo = `import React, { useState } from "react";

export default function AdminPromotores() {
  const [modalidad, setModalidad] = useState("base");
  const [abonoBase, setAbonoBase] = useState(65000);
  const [cantPrev, setCantPrev] = useState(8);
  const [unitarioPrev, setUnitarioPrev] = useState(8000);
  const [addonListas, setAddonListas] = useState(true);
  const [partnerSeleccionado, setPartnerSeleccionado] = useState("Facundo Ventas GBA Sur");
  const [porcentajeComision, setPorcentajeComision] = useState(20);
  const [vigenciaMeses, setVigenciaMeses] = useState(6);

  const [liquidaciones, setLiquidaciones] = useState([
    { id: 1, partner: "Facundo Ventas GBA Sur", empresa: "Distribuidora Mayorista Bernal S.A.", cobro: 127500, addon: 15000, baseComision: 112500, pct: 20, comision: 22500, mesActual: 2, mesesTotal: 6, pagado: false },
    { id: 2, partner: "Lorena Comercial Rosario", empresa: "Fiambres del Sur Bebidas", cobro: 75000, addon: 15000, baseComision: 60000, pct: 20, comision: 12000, mesActual: 3, mesesTotal: 3, pagado: false },
    { id: 3, partner: "Facundo Ventas GBA Sur", empresa: "Avellaneda Alimentos Express", cobro: 160000, addon: 15000, baseComision: 145000, pct: 15, comision: 21750, mesActual: 5, mesesTotal: 6, pagado: false }
  ]);

  const facturacionEmpresa = abonoBase + (cantPrev * unitarioPrev);
  const baseComisionable = addonListas ? facturacionEmpresa : (facturacionEmpresa + 15000);
  const comisionMensual = Math.round((baseComisionable * porcentajeComision) / 100);
  const netoAlex = (facturacionEmpresa + (addonListas ? 15000 : 0)) - comisionMensual;

  const marcarLiquidada = (id) => {
    setLiquidaciones(prev => prev.map(item => item.id === id ? { ...item, pagado: !item.pagado } : item));
  };

  const extenderPlazo = (id, mesesExtra) => {
    setLiquidaciones(prev => prev.map(item => item.id === id ? { ...item, mesesTotal: item.mesesTotal + mesesExtra } : item));
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* HEADER SUPERIOR */}
      <header style={{ backgroundColor: "#1e293b", borderBottom: "1px solid #334155", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "22px" }}>📍</span>
            <span style={{ fontWeight: "800", fontSize: "18px", letterSpacing: "-0.5px" }}>RutaComercio</span>
            <span style={{ backgroundColor: "#2563eb", color: "#fff", fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px" }}>SUPERADMIN</span>
          </div>
          {/* NAVEGACIÓN ENTRE SECCIONES */}
          <nav style={{ display: "flex", gap: "6px", marginLeft: "16px" }}>
            <a href="/admin" style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#94a3b8", textDecoration: "none", backgroundColor: "transparent" }}>
              🏢 Gestión de Empresas & Semáforo
            </a>
            <a href="/promotores" style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", color: "#fff", textDecoration: "none", backgroundColor: "#2563eb", boxShadow: "0 2px 8px rgba(37,99,235,0.4)" }}>
              💼 Promotores, Comisiones & Plazos
            </a>
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/supervisor" style={{ padding: "6px 12px", borderRadius: "6px", backgroundColor: "#334155", color: "#cbd5e1", fontSize: "12px", textDecoration: "none", fontWeight: "600" }}>👔 Vista Supervisor</a>
          <a href="/web" target="_blank" style={{ padding: "6px 12px", borderRadius: "6px", backgroundColor: "#334155", color: "#cbd5e1", fontSize: "12px", textDecoration: "none", fontWeight: "600" }}>🌐 Web Comercial</a>
          <a href="/" style={{ padding: "6px 12px", borderRadius: "6px", backgroundColor: "#ef4444", color: "#fff", fontSize: "12px", textDecoration: "none", fontWeight: "700" }}>✕ Salir</a>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 16px" }}>
        {/* KPI CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "18px" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Facturación Bruta Mensual</div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#fff", margin: "6px 0" }}>$ 1.840.000 <span style={{ fontSize: "13px", color: "#64748b" }}>ARS</span></div>
            <div style={{ fontSize: "12px", color: "#22c55e", fontWeight: "600" }}>↗ +18.4% vs mes anterior</div>
          </div>

          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "18px", borderLeft: "4px solid #10b981" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Add-on Mantenimiento Listas</div>
              <span style={{ backgroundColor: "#065f46", color: "#34d399", fontSize: "10px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px" }}>100% ALEX</span>
            </div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#10b981", margin: "6px 0" }}>$ 390.000 <span style={{ fontSize: "13px", color: "#64748b" }}>ARS</span></div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>26 empresas activas · Excluido de comisiones</div>
          </div>

          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "18px", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Comisiones a Liquidar</div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#f59e0b", margin: "6px 0" }}>$ 285.000 <span style={{ fontSize: "13px", color: "#64748b" }}>ARS</span></div>
            <div style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "600" }}>● 3 acuerdos vigentes (Corte día 30)</div>
          </div>

          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "18px", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Margen Neto Libre Alex</div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#38bdf8", margin: "6px 0" }}>$ 1.555.000 <span style={{ fontSize: "13px", color: "#64748b" }}>ARS</span></div>
            <div style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "600" }}>84.5% Rendimiento post-comisiones</div>
          </div>
        </div>

        {/* SIMULADOR Y LIQUIDACIONES */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
          {/* SIMULADOR DE CONTRATACIÓN */}
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "22px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📝</span> Simulador de Convenio Comercial & Promotor
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Modalidad de Cobro</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={() => setModalidad("base")} style={{ flex: 1, padding: "8px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", border: modalidad === "base" ? "2px solid #2563eb" : "1px solid #334155", backgroundColor: modalidad === "base" ? "#1e3a8a" : "#0f172a", color: "#fff", cursor: "pointer" }}>
                    Base + Preventistas
                  </button>
                  <button type="button" onClick={() => setModalidad("fijo")} style={{ flex: 1, padding: "8px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", border: modalidad === "fijo" ? "2px solid #2563eb" : "1px solid #334155", backgroundColor: modalidad === "fijo" ? "#1e3a8a" : "#0f172a", color: "#fff", cursor: "pointer" }}>
                    Abono Fijo Total
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>Abono Base ($)</label>
                  <input type="number" value={abonoBase} onChange={(e) => setAbonoBase(Number(e.target.value))} style={{ width: "100%", padding: "8px", borderRadius: "6px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>Cant. Prev.</label>
                  <input type="number" value={cantPrev} onChange={(e) => setCantPrev(Number(e.target.value))} style={{ width: "100%", padding: "8px", borderRadius: "6px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>Unitario Prev ($)</label>
                  <input type="number" value={unitarioPrev} onChange={(e) => setUnitarioPrev(Number(e.target.value))} style={{ width: "100%", padding: "8px", borderRadius: "6px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* CANDADO ADD-ON */}
              <div style={{ backgroundColor: "#0f172a", border: "1px solid #10b981", borderRadius: "8px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "12px", color: "#34d399" }}>🛡️ Add-on Mantenimiento de Listas ($15.000 ARS)</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>100% para Alex · Excluido de comisiones</div>
                </div>
                <input type="checkbox" checked={addonListas} onChange={(e) => setAddonListas(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
              </div>

              {/* ASIGNACIÓN DE PARTNER Y PLAZO */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>Promotor / Partner</label>
                  <select value={partnerSeleccionado} onChange={(e) => setPartnerSeleccionado(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}>
                    <option value="Facundo Ventas GBA Sur">Facundo Ventas GBA Sur</option>
                    <option value="Lorena Comercial Rosario">Lorena Comercial Rosario</option>
                    <option value="Esteban M. Canal Dist.">Esteban M. Canal Dist.</option>
                    <option value="Venta Directa Alex">Venta Directa Alex (0%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>% Comisión</label>
                  <input type="number" value={porcentajeComision} onChange={(e) => setPorcentajeComision(Number(e.target.value))} style={{ width: "100%", padding: "8px", borderRadius: "6px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "12px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>Vigencia</label>
                  <select value={vigenciaMeses} onChange={(e) => setVigenciaMeses(Number(e.target.value))} style={{ width: "100%", padding: "8px", borderRadius: "6px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}>
                    <option value={3}>3 Meses</option>
                    <option value={6}>6 Meses</option>
                    <option value={12}>12 Meses</option>
                  </select>
                </div>
              </div>

              {/* RESULTADO SIMULACIÓN */}
              <div style={{ backgroundColor: "#0b1329", border: "1px dashed #38bdf8", borderRadius: "8px", padding: "12px 16px", marginTop: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#94a3b8" }}>Facturación Total Cliente:</span>
                  <strong style={{ color: "#fff" }}>$ {(facturacionEmpresa + (addonListas ? 15000 : 0)).toLocaleString()} ARS</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#f59e0b" }}>Comisión Promotor ({porcentajeComision}% x {vigenciaMeses}m):</span>
                  <strong style={{ color: "#f59e0b" }}>$ {comisionMensual.toLocaleString()} ARS / mes</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderTop: "1px solid #1e293b", paddingTop: "6px", marginTop: "4px" }}>
                  <span style={{ color: "#38bdf8", fontWeight: "700" }}>Neto Libre Alex:</span>
                  <strong style={{ color: "#38bdf8", fontWeight: "800", fontSize: "15px" }}>$ {netoAlex.toLocaleString()} ARS / mes</strong>
                </div>
              </div>
            </div>
          </div>

          {/* LIQUIDACIONES PENDIENTES Y CONTROL DE VIGENCIA */}
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "22px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>💰</span> Liquidaciones & Control de Plazos Restantes
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {liquidaciones.map(item => (
                <div key={item.id} style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "10px", padding: "14px", borderLeft: item.pagado ? "4px solid #22c55e" : (item.mesActual === item.mesesTotal ? "4px solid #ef4444" : "4px solid #f59e0b") }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <span style={{ fontWeight: "700", fontSize: "13px", color: "#fff" }}>{item.partner}</span>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cliente: {item.empresa}</div>
                    </div>
                    <span style={{ backgroundColor: item.mesActual === item.mesesTotal ? "#7f1d1d" : "#1e3a8a", color: item.mesActual === item.mesesTotal ? "#fca5a5" : "#93c5fd", fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "6px" }}>
                      Mes {item.mesActual} de {item.mesesTotal} pactados {item.mesActual === item.mesesTotal ? "¡ÚLTIMO MES!" : ""}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", backgroundColor: "#1e293b", padding: "8px 12px", borderRadius: "6px", marginBottom: "10px" }}>
                    <div>Cobro: <strong>$ {item.cobro.toLocaleString()}</strong></div>
                    <div style={{ color: "#34d399" }}>Add-on Alex: <strong>-$15.000 (0% com.)</strong></div>
                    <div style={{ color: "#f59e0b", fontWeight: "700" }}>A pagar ({item.pct}%): $ {item.comision.toLocaleString()}</div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button type="button" onClick={() => extenderPlazo(item.id, 3)} style={{ padding: "6px 10px", borderRadius: "6px", backgroundColor: "#334155", border: "none", color: "#cbd5e1", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
                      + Extender Plazo (+3m)
                    </button>
                    <button type="button" onClick={() => marcarLiquidada(item.id)} style={{ padding: "6px 12px", borderRadius: "6px", backgroundColor: item.pagado ? "#15803d" : "#f59e0b", border: "none", color: "#fff", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                      {item.pagado ? "✓ Liquidada (Pagada)" : "Marcar como Liquidada"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABLA CONVENIOS AUDITORÍA GLOBAL */}
        <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "20px" }}>
          <h3 style={{ margin: "0 0 14px 0", fontSize: "15px", fontWeight: "700" }}>📋 Empresas en RutaComercio y Convenios de Comisión</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8", textAlign: "left" }}>
                <th style={{ padding: "10px" }}>EMPRESA / REGIÓN</th>
                <th style={{ padding: "10px" }}>MODALIDAD</th>
                <th style={{ padding: "10px" }}>ADD-ON LISTAS</th>
                <th style={{ padding: "10px" }}>PROMOTOR / VIGENCIA</th>
                <th style={{ padding: "10px" }}>FACTURACIÓN</th>
                <th style={{ padding: "10px" }}>COMISIÓN DEVENGADA</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "10px" }}><strong>Distribuidora Mayorista Bernal S.A.</strong><br/><span style={{ color: "#64748b" }}>Quilmes · GBA Sur</span></td>
                <td style={{ padding: "10px" }}>Base ($65k) + 6 Prev. ($8k c/u)</td>
                <td style={{ padding: "10px", color: "#34d399", fontWeight: "700" }}>$15.000 (100% Alex)</td>
                <td style={{ padding: "10px" }}>Facundo Ventas (20%)<br/><span style={{ color: "#38bdf8" }}>Mes 2/6 (4 meses restantes)</span></td>
                <td style={{ padding: "10px", fontWeight: "700" }}>$127.500 ARS</td>
                <td style={{ padding: "10px", color: "#f59e0b", fontWeight: "800" }}>$22.500 ARS</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "10px" }}><strong>Fiambres del Sur Bebidas</strong><br/><span style={{ color: "#64748b" }}>Rosario Centro</span></td>
                <td style={{ padding: "10px" }}>Abono Fijo Total ($75k)</td>
                <td style={{ padding: "10px", color: "#34d399", fontWeight: "700" }}>$15.000 (100% Alex)</td>
                <td style={{ padding: "10px" }}>Lorena Comercial (20%)<br/><span style={{ color: "#ef4444", fontWeight: "700" }}>Mes 3/3 (¡Vence este ciclo!)</span></td>
                <td style={{ padding: "10px", fontWeight: "700" }}>$75.000 ARS</td>
                <td style={{ padding: "10px", color: "#f59e0b", fontWeight: "800" }}>$12.000 ARS</td>
              </tr>
              <tr>
                <td style={{ padding: "10px" }}><strong>Distribuidora Norte S.A.</strong><br/><span style={{ color: "#64748b" }}>Córdoba Capital</span></td>
                <td style={{ padding: "10px" }}>Prueba 15 Días sin cargo</td>
                <td style={{ padding: "10px", color: "#94a3b8" }}>En evaluación</td>
                <td style={{ padding: "10px" }}>Esteban M. (Pacto 20% x 6m)</td>
                <td style={{ padding: "10px" }}>$0 ARS</td>
                <td style={{ padding: "10px", color: "#94a3b8" }}>$0 (Potencial $18k)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
\`;

fs.writeFileSync('src/AdminPromotores.jsx', codigo, 'utf8');
console.log('🎉 ARCHIVO_ADMIN_PROMOTORES_CREADO_CON_EXITO');
