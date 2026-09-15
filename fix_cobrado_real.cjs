const fs = require('fs');

let c = fs.readFileSync('src/AdminClientes.jsx', 'utf8');

// 1. Inyectamos la logica de calculo real sumando el historial de pagos del mes
const regexCalcHistorial = /const totalCobradoMes =[\s\S]*?;\n/;

// Buscamos donde calcular la suma real del mes
const busquedaPunto = "const diaHoy = new Date().getDate();";

const logicaCalculoCobrado = `// Calculo 100% REAL de lo cobrado en el mes actual (cero chamuyo)
  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth();
  const anioActual = fechaActual.getFullYear();

  const cobrosDelMes = (historialPagos || []).filter(p => {
    if (!p.fecha) return false;
    const f = new Date(p.fecha);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const totalesPorMoneda = {};
  cobrosDelMes.forEach(p => {
    const mon = p.moneda || "ARS";
    const monto = Number(p.monto || 0);
    totalesPorMoneda[mon] = (totalesPorMoneda[mon] || 0) + monto;
  });

  const monedasCobradas = Object.keys(totalesPorMoneda);
  const diaHoy = new Date().getDate();`;

if (c.includes(busquedaPunto) && !c.includes("cobrosDelMes")) {
  c = c.replace(busquedaPunto, logicaCalculoCobrado);
}

// 2. Reemplazamos la tarjeta fija por la tarjeta 100% dinamica
const inicioTarjeta = c.indexOf('{/* TARJETA COBRADO EN EL MES */}');
let finTarjeta = -1;

if (inicioTarjeta !== -1) {
  finTarjeta = c.indexOf('</div>', c.indexOf('COBRADO EN EL MES', inicioTarjeta)) + 6;
  // Buscamos el cierre del contenedor de la tarjeta
  const finContenedor = c.indexOf('</div>', finTarjeta);
  
  const tarjetaLimpia = `{/* TARJETA COBRADO EN EL MES */}
        <div style={{ backgroundColor: "#064e3b", borderRadius: "12px", border: "1px solid #059669", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#a7f3d0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              COBRADO EN EL MES (REAL)
            </span>
            <span style={{ fontSize: "11px", backgroundColor: "#047857", color: "#ecfdf5", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
              ✓ Acreditado
            </span>
          </div>
          {monedasCobradas.length > 0 ? (
            <div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>
                {monedasCobradas[0]} ${Number(totalesPorMoneda[monedasCobradas[0]]).toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", color: "#a7f3d0", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {monedasCobradas.slice(1).map(m => (
                  <span key={m} style={{ fontWeight: "600" }}>{m}: ${Number(totalesPorMoneda[m]).toLocaleString()}</span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", marginBottom: "2px" }}>
                $0
              </div>
              <div style={{ fontSize: "12px", color: "#a7f3d0", fontStyle: "italic" }}>
                Sin cobros registrados este mes
              </div>
            </div>
          )}
        </div>`;

  // Reemplazo quirurgico del bloque de la tarjeta
  const bloqueAnterior = c.slice(inicioTarjeta, finContenedor + 6);
  c = c.replace(bloqueAnterior, tarjetaLimpia);
  fs.writeFileSync('src/AdminClientes.jsx', c, 'utf8');
  console.log('🎉 COBRADO_REAL_SIN_CHAMUYO_INSTALADO');
} else {
  // Si no encontro el comentario exacto, buscamos por texto COBRADO EN EL MES
  const posTexto = c.indexOf('COBRADO EN EL MES');
  if (posTexto !== -1) {
    const inicioDiv = c.lastIndexOf('<div', posTexto);
    const finDiv = c.indexOf('</div>\n        </div>', inicioDiv) + 15;
    
    const tarjetaLimpiaDirecta = `<div style={{ backgroundColor: "#064e3b", borderRadius: "12px", border: "1px solid #059669", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#a7f3d0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              COBRADO EN EL MES (REAL)
            </span>
            <span style={{ fontSize: "11px", backgroundColor: "#047857", color: "#ecfdf5", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
              ✓ Acreditado
            </span>
          </div>
          {monedasCobradas.length > 0 ? (
            <div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>
                {monedasCobradas[0]} ${Number(totalesPorMoneda[monedasCobradas[0]]).toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", color: "#a7f3d0", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {monedasCobradas.slice(1).map(m => (
                  <span key={m} style={{ fontWeight: "600" }}>{m}: ${Number(totalesPorMoneda[m]).toLocaleString()}</span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", marginBottom: "2px" }}>
                $0
              </div>
              <div style={{ fontSize: "12px", color: "#a7f3d0", fontStyle: "italic" }}>
                Sin cobros registrados este mes
              </div>
            </div>
          )}
        </div>`;
        
    c = c.slice(0, inicioDiv) + tarjetaLimpiaDirecta + c.slice(finDiv);
    fs.writeFileSync('src/AdminClientes.jsx', c, 'utf8');
    console.log('🎉 COBRADO_REAL_SIN_CHAMUYO_INSTALADO');
  } else {
    console.log('⚠ No se encontro el bloque');
  }
}
