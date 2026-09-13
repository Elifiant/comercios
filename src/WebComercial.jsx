import React, { useState } from "react";

export default function WebComercial() { const [faqAbierta, setFaqAbierta] = useState(null); const [formEnviado, setFormEnviado] = useState(false); const [formData, setFormData] = useState({ nombre: "", empresa: "", telefono: "", preventistas: "1 a 3 vendedores", ciudad: "" });

const handleSubmit = (e) => { e.preventDefault(); setFormEnviado(true); };

return ( <div style={{ minHeight: "100vh", backgroundColor: "#faf8ff", color: "#1e293b", fontFamily: "Plus Jakarta Sans, sans-serif" }}> {/* HEADER */} <header style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e2e8f0", padding: "14px 24px" }}> <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}> <div style={{ display: "flex", alignItems: "center", gap: "10px" }}> <span style={{ fontSize: "22px" }}>📍

</span>
<span style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb", letterSpacing: "-0.5px" }}>RutaComercio
</span>
<span style={{ fontSize: "11px", fontWeight: "700", backgroundColor: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "12px" }}>B2B SaaS
</span>
</div>
<nav style={{ display: "flex", alignItems: "center", gap: "20px" }}> <a href="#funcionalidades" style={{ textDecoration: "none", color: "#475569", fontSize: "14px", fontWeight: "500" }}>Funcionalidades
</a>
<a href="#precios" style={{ textDecoration: "none", color: "#475569", fontSize: "14px", fontWeight: "500" }}>Precios
</a>
<a href="#faq" style={{ textDecoration: "none", color: "#475569", fontSize: "14px", fontWeight: "500" }}>Preguntas
</a>
<a href="/supervisor" style={{ textDecoration: "none", color: "#0f172a", fontSize: "13px", fontWeight: "600", padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}>Acceso Supervisor
</a>
<a href="#demo" style={{ textDecoration: "none", backgroundColor: "#2563eb", color: "#ffffff", fontSize: "13px", fontWeight: "700", padding: "8px 16px", borderRadius: "6px" }}>Solicitar Demo
</a>
</nav>
</div>
</header>
  {/* HERO SECTION */}
  <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 24px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "40px", alignItems: "center" }}>
    <div>
      <span style={{ display: "inline-block", backgroundColor: "#dbeafe", color: "#1d4ed8", fontSize: "12px", fontWeight: "700", padding: "6px 12px", borderRadius: "20px", marginBottom: "16px" }}>
        SAAS B2B PARA DISTRIBUIDORAS Y MAYORISTAS
      </span>
      <h1 style={{ fontSize: "42px", fontWeight: "900", lineHeight: "1.15", color: "#0f172a", marginBottom: "16px" }}>
        Multiplica las visitas y ventas de tu equipo de <span style={{ color: "#2563eb" }}>preventa en la calle</span>
      </h1>
      <p style={{ fontSize: "16px", color: "#475569", lineHeight: "1.6", marginBottom: "28px" }}>
        El software geolocalizado diseñado para preventistas en ruta. Modo Manejo con alerta sonora de cercanía, relevamiento con fotos de fachada, catálogo instantáneo por WhatsApp y panel de auditoría web en tiempo real.
      </p>
      <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "36px" }}>
        <a href="#demo" style={{ textDecoration: "none", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: "700", padding: "14px 24px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
          🚀 Solicitar Demo Gratis (15 Días)
        </a>
        <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "600" }}>145+ Comercios relevados</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#2563eb" }}>+35%</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>Comercios visitados por día</div>
        </div>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#10b981" }}>0%</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>Consumo excesivo 4G</div>
        </div>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>100%</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>Control GPS en vivo</div>
        </div>
      </div>
    </div>

    {/* MOCKUP HERO MAPA */}
    <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "16px", boxShadow: "0 20px 40px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>Telemetría y Navegación GPS en Vivo</span>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#16a34a", backgroundColor: "#dcfce7", padding: "2px 6px", borderRadius: "10px" }}>ONLINE</span>
      </div>
      <div style={{ height: "260px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center" }}>
        <span style={{ fontSize: "40px", marginBottom: "8px" }}>🗺️</span>
        <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "15px" }}>Supervisión Satelital y Modo Manejo</div>
        <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>Aviso sonoro a 150m de cada comercio relevado</div>
        <div style={{ marginTop: "12px", backgroundColor: "#eff6ff", color: "#2563eb", fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "6px" }}>Ruta en Tiempo Real</div>
      </div>
    </div>
  </section>

  {/* 4 PILARES */}
  <section id="funcionalidades" style={{ backgroundColor: "#ffffff", padding: "60px 24px", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
      <span style={{ color: "#2563eb", fontWeight: "700", fontSize: "12px", textTransform: "uppercase" }}>Tecnología de Campo Comprobada</span>
      <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", marginTop: "8px", marginBottom: "40px" }}>Los 4 Pilares Fundamentales de RutaComercio</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", textAlign: "left" }}>
        <div style={{ padding: "20px", borderRadius: "12px", backgroundColor: "#faf8ff", border: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "28px" }}>🚗</span>
          <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: "12px 0 6px 0" }}>Modo Manejo Vehicular</h3>
          <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>Mapa visual de alta visibilidad para soporte de auto o moto. Botón extra grande y alerta sonora al aproximarse a un cliente.</p>
        </div>
        <div style={{ padding: "20px", borderRadius: "12px", backgroundColor: "#faf8ff", border: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "28px" }}>📸</span>
          <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: "12px 0 6px 0" }}>Ficha & Foto de Fachada</h3>
          <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>Relevamiento exhaustivo con foto geolocalizada por satélite, notas de cobro, nombre del dueño y validación de coordenadas.</p>
        </div>
        <div style={{ padding: "20px", borderRadius: "12px", backgroundColor: "#faf8ff", border: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "28px" }}>💬</span>
          <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: "12px 0 6px 0" }}>Catálogo por WhatsApp</h3>
          <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>Envío instantáneo de listas de precios actualizadas y promociones en PDF o links directos al WhatsApp del comerciante.</p>
        </div>
        <div style={{ padding: "20px", borderRadius: "12px", backgroundColor: "#faf8ff", border: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "28px" }}>📊</span>
          <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: "12px 0 6px 0" }}>Panel de Supervisión</h3>
          <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>Seguimiento de la flota en vivo, control de primera y última visita, mapa de calor, efectividad y exportación a Excel.</p>
        </div>
      </div>
    </div>
  </section>

  {/* CASO REAL ELIFIANT */}
  <section style={{ maxWidth: "1000px", margin: "60px auto", padding: "30px", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px", alignItems: "center" }}>
      <div style={{ backgroundColor: "#0f172a", padding: "24px", borderRadius: "12px", color: "#ffffff", textAlign: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: "800", color: "#38bdf8", textTransform: "uppercase" }}>Caso de Éxito Regional</span>
        <div style={{ fontSize: "20px", fontWeight: "900", margin: "8px 0" }}>Distribuidora Elifiant</div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>Distribución mayorista de alimentos y golosinas</div>
      </div>
      <div>
        <span style={{ backgroundColor: "#dcfce7", color: "#16a34a", fontSize: "11px", fontWeight: "800", padding: "3px 8px", borderRadius: "10px" }}>145+ Comercios Relevados en 14 Días</span>
        <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "10px 0" }}>
          "Pasamos de no saber dónde estaban los vendedores a auditar 145 comercios con foto y pedido en tiempo real."
        </h3>
        <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
          Antes de implementar RutaComercio, Elifiant gestionaba sus visitas en cuadernos y planillas manuales. Los preventistas olvidaban visitar clientes lejanos y se perdían horas cotizando productos por chat desordenado.
        </p>
        <div style={{ display: "flex", gap: "24px", marginTop: "16px" }}>
          <div>
            <strong style={{ color: "#2563eb", fontSize: "18px" }}>+42%</strong>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Aumento en ticket promedio</div>
          </div>
          <div>
            <strong style={{ color: "#10b981", fontSize: "18px" }}>100%</strong>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Fachadas con geolocalización</div>
          </div>
          <div>
            <strong style={{ color: "#f59e0b", fontSize: "18px" }}>-2.5 hrs</strong>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Ahorro diario en carga de datos</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  {/* TARIFAS Y BITCOIN CASH */}
  <section id="precios" style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
    <span style={{ color: "#2563eb", fontWeight: "700", fontSize: "12px", textTransform: "uppercase" }}>Tarifas Simples Sin Letra Chica</span>
    <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", margin: "8px 0 12px 0" }}>Comienza hoy y escala según tus preventistas</h2>
    <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "40px" }}>Sin contratos forzosos. Cancela en cualquier momento con un clic.</p>
    
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "36px" }}>
      <div style={{ padding: "30px", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "left" }}>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#2563eb", backgroundColor: "#eff6ff", padding: "4px 8px", borderRadius: "6px" }}>IDEAL PARA COMENZAR</span>
        <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "12px 0" }}>Plan Pyme / Distribuidora Inicial</h3>
        <div style={{ fontSize: "36px", fontWeight: "900", color: "#0f172a" }}>$35.000 <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>ARS / mes</span></div>
        <ul style={{ listStyle: "none", padding: 0, margin: "20px 0", fontSize: "13px", color: "#475569", lineHeight: "2" }}>
          <li>✓ <strong>1 a 3 preventistas móviles</strong> incluidos</li>
          <li>✓ <strong>Panel Web de Supervisor</strong> con mapa en vivo</li>
          <li>✓ <strong>Modo Manejo HUD</strong> con alertas sonoras</li>
          <li>✓ Relevamiento con fotos de fachada en la nube</li>
          <li>✓ Envío ilimitado de listas por WhatsApp</li>
        </ul>
        <a href="#demo" style={{ display: "block", textAlign: "center", textDecoration: "none", backgroundColor: "#eff6ff", color: "#2563eb", fontWeight: "700", padding: "12px", borderRadius: "8px" }}>Comenzar Prueba Gratis (15 Días)</a>
      </div>

      <div style={{ padding: "30px", backgroundColor: "#ffffff", borderRadius: "16px", border: "2px solid #2563eb", textAlign: "left", position: "relative" }}>
        <span style={{ position: "absolute", top: "-12px", right: "20px", backgroundColor: "#2563eb", color: "#ffffff", fontSize: "11px", fontWeight: "800", padding: "4px 10px", borderRadius: "10px" }}>RECOMENDADO</span>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#16a34a", backgroundColor: "#dcfce7", padding: "4px 8px", borderRadius: "6px" }}>CRECIMIENTO DINÁMICO</span>
        <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "12px 0" }}>Plan Escala / Preventista Extra</h3>
        <div style={{ fontSize: "36px", fontWeight: "900", color: "#0f172a" }}>$10.000 <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>ARS / mes por preventista adicional</span></div>
        <ul style={{ listStyle: "none", padding: 0, margin: "20px 0", fontSize: "13px", color: "#475569", lineHeight: "2" }}>
          <li>✓ Todo lo incluido en el Plan Inicial</li>
          <li>✓ <strong>Almacenamiento de fotos sin límite</strong></li>
          <li>✓ Múltiples perfiles de supervisores y jefes de zona</li>
          <li>✓ Soporte prioritario por WhatsApp directo</li>
          <li>✓ Exportaciones avanzadas a Excel y conexión API</li>
        </ul>
        <a href="#demo" style={{ display: "block", textAlign: "center", textDecoration: "none", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: "700", padding: "12px", borderRadius: "8px" }}>Solicitar Prueba con Mi Equipo</a>
      </div>
    </div>

    {/* BANNER OFICIAL BITCOIN CASH */}
    <div style={{ backgroundColor: "#0f172a", borderRadius: "16px", padding: "24px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#ffffff", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#0ac18e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", fontWeight: "900" }}>
          ₿
        </div>
        <div>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff" }}>Aceptamos Bitcoin Cash (BCH)</div>
          <div style={{ fontSize: "13px", color: "#94a3b8" }}>Acreditación instantánea, comisiones mínimas y factura comercial A y B</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{ backgroundColor: "#0ac18e", color: "#0f172a", fontWeight: "800", fontSize: "12px", padding: "6px 12px", borderRadius: "20px", display: "inline-block" }}>
          10% OFF pagando con BCH
        </span>
        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>Transferencia CBU / USDT / BCH</div>
      </div>
    </div>
  </section>

  {/* FAQ */}
  <section id="faq" style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>
    <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", textAlign: "center", marginBottom: "30px" }}>Preguntas Frecuentes de Distribuidores</h2>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {[
        { q: "¿Funciona sin gastar muchos megas de internet móvil?", a: "Totalmente. La aplicación envía coordenadas y datos en paquetes ultraligeros de pocos kilobytes. Solo la subida de fotos consume datos adicionales, optimizadas al mínimo tamaño." },
        { q: "¿Cómo protege los datos de clientes y precios de mi empresa?", a: "Cada distribuidora opera con aislamiento absoluto de base de datos. Ninguna otra empresa puede ver tus precios, tus listas ni tus comercios registrados." },
        { q: "¿Qué pasa si mis vendedores no tienen experiencia técnica?", a: "RutaComercio fue diseñada para ser usada con un solo dedo. El Modo Manejo tiene botones gigantes y avisos sonoros para evitar distracciones al volante." },
        { q: "¿Cómo se instala en los teléfonos celulares?", a: "Funciona como aplicación web progresiva (PWA). Se instala en 1 clic en iPhone o Android desde el navegador, con su propio icono en pantalla." }
      ].map((item, idx) => (
        <div key={idx} style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <button onClick={() => setFaqAbierta(faqAbierta === idx ? null : idx)} style={{ width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontWeight: "700", fontSize: "15px", color: "#0f172a" }}>
            <span>{item.q}</span>
            <span>{faqAbierta === idx ? "▲" : "▼"}</span>
          </button>
          {faqAbierta === idx && (
            <div style={{ padding: "0 20px 16px 20px", fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  </section>

  {/* FORMULARIO DEMO 15 DÍAS */}
  <section id="demo" style={{ maxWidth: "650px", margin: "40px auto 80px auto", padding: "36px", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
    <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", textAlign: "center", marginBottom: "8px" }}>Prueba RutaComercio gratis durante 15 días</h2>
    <p style={{ fontSize: "14px", color: "#64748b", textAlign: "center", marginBottom: "24px" }}>Coordinamos una videollamada de 20 minutos o una visita comercial para configurar tu distribuidora y cargar tu primer catálogo sin costo.</p>
    
    {formEnviado ? (
      <div style={{ backgroundColor: "#dcfce7", color: "#16a34a", padding: "20px", borderRadius: "10px", textAlign: "center", fontWeight: "700" }}>
        ✓ ¡Solicitud recibida! Nos comunicaremos a la brevedad al número proporcionado para coordinar tu demostración de 15 días.
      </div>
    ) : (
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>Nombre y Apellido</label>
          <input type="text" required placeholder="Ej: Gustavo Rodríguez" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>Nombre de la Distribuidora o Empresa</label>
          <input type="text" required placeholder="Ej: Distribuidora Sur Mayorista" value={formData.empresa} onChange={(e) => setFormData({...formData, empresa: e.target.value})} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>Teléfono / WhatsApp</label>
            <input type="text" required placeholder="+54 9 11 ..." value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>Preventistas en la Calle</label>
            <select value={formData.preventistas} onChange={(e) => setFormData({...formData, preventistas: e.target.value})} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", backgroundColor: "#ffffff", boxSizing: "border-box" }}>
              <option>1 a 3 vendedores</option>
              <option>4 a 10 vendedores</option>
              <option>Más de 10 vendedores</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>Ciudad o Región</label>
          <input type="text" placeholder="Ej: Buenos Aires / Córdoba / Rosario" value={formData.ciudad} onChange={(e) => setFormData({...formData, ciudad: e.target.value})} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }} />
        </div>
        <button type="submit" style={{ marginTop: "10px", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: "800", fontSize: "15px", padding: "14px", borderRadius: "8px", border: "none", cursor: "pointer" }}>
          Solicitar Demostración Inmediata (15 Días Gratis)
        </button>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", fontSize: "12px", color: "#64748b" }}>
          <span>✓ Configuración inicial asistida</span>
          <span>✓ Importación de clientes desde Excel</span>
          <span>✓ Sin necesidad de tarjeta de crédito</span>
        </div>
      </form>
    )}
  </section>

  {/* FOOTER */}
  <footer style={{ backgroundColor: "#0f172a", color: "#94a3b8", padding: "40px 24px", fontSize: "13px" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ color: "#ffffff", fontWeight: "800", fontSize: "16px", marginBottom: "4px" }}>📍 RutaComercio</div>
        <div>Plataforma SaaS B2B para preventa en calle y logística de distribución comercial.</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ color: "#ffffff", fontWeight: "700", marginBottom: "4px" }}>Contacto Comercial WhatsApp</div>
        <a href="https://wa.me/5491166646806" target="_blank" rel="noreferrer" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: "700" }}>
          +54 9 11 6664-6806
        </a>
      </div>
    </div>
  </footer>

  {/* BOTÓN FLOTANTE DE WHATSAPP DIRECTO */}
  <a href="https://wa.me/5491166646806" target="_blank" rel="noreferrer" style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 100, backgroundColor: "#25d366", color: "#ffffff", textDecoration: "none", padding: "12px 20px", borderRadius: "30px", fontWeight: "800", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 8px 24px rgba(37,211,102,0.4)" }}>
    <span style={{ fontSize: "18px" }}>💬</span>
    <span>WhatsApp Directo 11-6664-6806</span>
  </a>
</div>
); } 