import React, { useState } from "react";

export default function WebComercial() {
  const [faqAbierta, setFaqAbierta] = useState(null);
  const [solucionActiva, setSolucionActiva] = useState(0);

  const toggleFaq = (idx) => {
    setFaqAbierta(faqAbierta === idx ? null : idx);
  };

  const irAlLogin = () => {
    window.location.assign("https://rutacomercios.com/login");
  };

  const whatsapp =
    "https://wa.me/5491166646806?text=Hola,%20quiero%20conocer%20RutaComercios";

  const funciones = [
    {
      icono: "📍",
      titulo: "Actividad en calle",
      texto:
        "Visualizá la actividad de tus preventistas y las ubicaciones reportadas durante su jornada.",
    },
    {
      icono: "🧭",
      titulo: "Visitas y recorridos",
      texto:
        "Organizá comercios, días de visita y recorridos para que cada vendedor tenga claro qué sigue.",
    },
    {
      icono: "🛒",
      titulo: "Pedidos desde el celular",
      texto:
        "El preventista consulta artículos, carga cantidades y registra pedidos directamente desde su teléfono.",
    },
    {
      icono: "🏪",
      titulo: "Ficha de cada comercio",
      texto:
        "Centralizá datos, ubicación, notas, historial y la información necesaria para trabajar cada cliente.",
    },
    {
      icono: "💲",
      titulo: "Listas de precios",
      texto:
        "Trabajá con listas asociadas a cada comercio y mantené los precios disponibles para la toma de pedidos.",
    },
    {
      icono: "👀",
      titulo: "Supervisión operativa",
      texto:
        "El supervisor puede seguir visitas, pedidos y actividad del equipo desde un único panel.",
    },
    {
  icono: "📈",
  titulo: "Crece junto con tu equipo",
  texto:
    "RutaComercios está pensado para acompañar operaciones de distintos tamaños: desde pequeños equipos comerciales hasta organizaciones con cientos de vendedores y preventistas.",
},
  ];

  const pasos = [
    {
      numero: "01",
      titulo: "Organizás",
      texto: "Definís comercios, vendedores y recorridos de trabajo.",
    },
    {
      numero: "02",
      titulo: "El preventista visita",
      texto: "Trabaja desde el celular y registra lo que sucede en cada comercio.",
    },
    {
      numero: "03",
      titulo: "Carga el pedido",
      texto: "Consulta productos, cantidades y deja el pedido registrado.",
    },
    {
      numero: "04",
      titulo: "Supervisás",
      texto: "Seguís la operación y tenés información para tomar decisiones.",
    },
  ];

  const faqs = [
    {
      q: "¿RutaComercios se usa desde el celular?",
      a:
        "Sí. El preventista trabaja desde su teléfono y el supervisor accede a su panel para seguir la operación.",
    },
    {
      q: "¿Puedo trabajar con varios preventistas?",
      a:
        "Sí. RutaComercios está pensado para empresas que necesitan organizar y supervisar equipos de venta en calle.",
    },
    {
      q: "¿Los pedidos quedan vinculados al comercio?",
      a:
        "Sí. La toma de pedidos forma parte del trabajo asociado a cada comercio y a la operación del preventista.",
    },
    {
      q: "¿Puedo conocer RutaComercios antes de contratar?",
      a:
        "Sí. Contactanos por WhatsApp y coordinamos una demostración para que puedas ver cómo funciona.",
    },
  ];


  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden",
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* NAV */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          width: "100%",
          boxSizing: "border-box",
          backgroundColor: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            maxWidth: "1120px",
            margin: "0 auto",
            padding: "13px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <img
              src="/logo.svg"
              alt="RutaComercios"
              style={{ height: "34px", width: "auto", display: "block" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span
              style={{
                fontSize: "18px",
                fontWeight: "900",
                letterSpacing: "-0.6px",
              }}
            >
              RutaComercios
            </span>
          </div>

          <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    flexGrow: 1,
  }}
>
            <button
              type="button"
              onClick={irAlLogin}
              style={{
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                borderRadius: "9px",
                padding: "9px 12px",
                fontSize: "12px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              INGRESAR
            </button>
            <a
              href="#contacto"
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                borderRadius: "9px",
                padding: "10px 13px",
                fontSize: "12px",
                fontWeight: "800",
                textDecoration: "none",
              }}
            >
              SOLICITAR DEMO
            </a>
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              aria-label="Escribir al WhatsApp 11.6664.6806"
              style={{
                backgroundColor: "#16a34a",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "900",
                whiteSpace: "nowrap",
                padding: "12px 17px",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(22,163,74,0.2)",
              }}
            >
              💬 WHATSAPP 11.6664.6806
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main>
                 {/* SOLUCIONES: CATÁLOGO INTERACTIVO */}
         <section id="soluciones" className="rc-soluciones" style={{ padding: "38px 18px 48px", background: "linear-gradient(180deg,#f8fbff 0%,#f1f5f9 100%)", boxSizing: "border-box" }}>
           <style>{`
             .rc-catalogo { display: grid; grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.75fr); gap: 18px; align-items: stretch; }
             .rc-opciones { display: flex; flex-direction: column; gap: 10px; }
             .rc-opcion { display: flex; align-items: center; width: 100%; min-height: 76px; padding: 12px 14px; gap: 13px; border-radius: 17px; border: 1px solid #dbe4f0; background: #fff; text-align: left; cursor: pointer; box-shadow: 0 5px 16px rgba(15,23,42,.045); transition: border-color .15s, background .15s, transform .15s; color: #0f172a; font-family: inherit; }
             .rc-opcion:hover { transform: translateX(3px); border-color: #94a3b8; }
             .rc-opcion:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
             .rc-opcion.rc-elegida { border: 2px solid var(--rc-acento); background: var(--rc-fondo); padding: 11px 13px; }
             .rc-opcion-icono { font-size: 28px; width: 37px; flex-shrink: 0; text-align: center; }
             .rc-opcion-texto { flex: 1; min-width: 0; }
             .rc-opcion-titulo { display: block; font-size: 15px; font-weight: 900; line-height: 1.3; }
             .rc-opcion-subtitulo { display: block; font-size: 12px; color: #64748b; line-height: 1.45; margin-top: 4px; }
             .rc-panel { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; padding: clamp(22px,3vw,38px); border-radius: 24px; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 14px 38px rgba(15,23,42,.075); }
             .rc-panel::after { content: ''; position: absolute; width: 320px; height: 320px; border-radius: 50%; right: -130px; top: -160px; background: var(--rc-suave); opacity: .85; pointer-events: none; }
             .rc-panel-cabecera { position: relative; z-index: 1; display: flex; gap: 22px; align-items: center; }
             .rc-panel-cuerpo { flex: 1; min-width: 0; }
             .rc-panel-ilustracion { display: flex; justify-content: center; align-items: center; width: clamp(100px,15vw,175px); height: clamp(100px,15vw,175px); flex-shrink: 0; border-radius: 28px; background: var(--rc-suave); font-size: clamp(65px,9vw,112px); }
             .rc-beneficios { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; margin: 26px 0 22px; position: relative; z-index: 1; }
             .rc-beneficio { display: flex; align-items: center; gap: 9px; padding: 13px 12px; border-radius: 13px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 13px; font-weight: 750; color: #1e293b; }
             .rc-panel-boton { display: block; width: fit-content; min-width: 220px; text-align: center; padding: 15px 24px; border-radius: 12px; background: var(--rc-acento); color: #fff; text-decoration: none; font-size: 14px; font-weight: 900; position: relative; z-index: 1; box-sizing: border-box; }
             .rc-panel-boton:hover { filter: brightness(.94); }
             .rc-panel-boton:focus-visible { outline: 3px solid #0f172a; outline-offset: 3px; }
             @media (max-width: 780px) { .rc-catalogo { grid-template-columns: 1fr; } .rc-opciones { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); } .rc-opcion { min-height: 84px; } .rc-opcion-titulo { font-size: 13px; } .rc-opcion-subtitulo { font-size: 11px; } }
             @media (max-width: 480px) { .rc-opciones { grid-template-columns: 1fr; gap: 8px; } .rc-opcion { min-height: 65px; } .rc-panel-cabecera { align-items: flex-start; gap: 12px; } .rc-panel-ilustracion { width: 72px; height: 72px; border-radius: 18px; font-size: 48px; } .rc-beneficios { grid-template-columns: 1fr; gap: 8px; margin: 18px 0; } .rc-panel-boton { width: 100%; min-width: 0; } }
           `}</style>
           <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
             <div style={{ textAlign: "center", marginBottom: "28px" }}>
               <div style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "1.4px", color: "#2563eb" }}>NUESTRAS SOLUCIONES</div>
               <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", color: "#0f172a", margin: "10px 0" }}>Encontrá la herramienta para tu negocio</h2>
               <p style={{ color: "#64748b", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>Siete soluciones pensadas para distintas formas de trabajar.</p>
             </div>
             {(() => {
               const soluciones = [
                  { icono: "🧰", titulo: "ORC Oficios", publico: "Profesionales, comercios y clientes particulares", encabezado: "Para quienes ofrecen o necesitan servicios", descripcion: "Una plataforma para profesionales de distintos oficios, comercios y personas que buscan soluciones. Organizá presupuestos y trabajos, o explorá servicios sin registro obligatorio.", beneficios: ["Presupuestos y trabajos", "Distintos oficios en una cuenta", "Espacio para comercios", "Consultas sin registro obligatorio"], accion: "CONOCER ORC OFICIOS", enlace: "https://orc.rutacomercios.com", color: "#7c3aed", fondo: "#faf5ff", suave: "#ede9fe" },
                 { icono: "🛵", titulo: "RutaComercios Express", publico: "Deliverys, pizzerías, heladerías y más", encabezado: "Para comercios con entregas rápidas", descripcion: "Coordiná pedidos, asigná repartidores, seguí las entregas y controlá las rendiciones de efectivo desde un solo lugar.", beneficios: ["Gestión de pedidos", "Asignación de repartidores", "Seguimiento de entregas", "Rendiciones de efectivo"], accion: "CONOCER EXPRESS", enlace: "#express", color: "#ea580c", fondo: "#fff7ed", suave: "#ffedd5" },
                 { icono: "🛒", titulo: "RutaComercios Ventas", publico: "Mayoristas con preventistas", encabezado: "Para mayoristas y distribuidoras", descripcion: "Organizá las visitas, los pedidos y los equipos de preventistas. Supervisá la actividad comercial desde un mismo sistema.", beneficios: ["Visitas a comercios", "Toma de pedidos", "Gestión de clientes", "Supervisión comercial"], accion: "CONOCER VENTAS", enlace: "#ventas", color: "#2563eb", fondo: "#eff6ff", suave: "#dbeafe" },
                 { icono: "🚚", titulo: "RutaComercios Repartos", publico: "Entregas y distribución en general", encabezado: "Para empresas que realizan repartos", descripcion: "Organizá entregas y recorridos, asigná repartidores y seguí el avance de cada reparto, con o sin el módulo de Ventas.", beneficios: ["Carga de entregas", "Asignación de repartidores", "Organización de recorridos", "Control de entregas"], accion: "CONOCER REPARTOS", enlace: "#repartos", color: "#0f766e", fondo: "#f0fdfa", suave: "#ccfbf1" },
                 { icono: "📱", titulo: "VentaFácil", publico: "Registrá las ventas de tu local", encabezado: "Para registrar tus ventas en el local", descripcion: "Llevá tus clientes, artículos y ventas desde el celular. Gratis, sin registro y con datos guardados en tu dispositivo.", beneficios: ["Registro de ventas", "Clientes y artículos", "Compartir por WhatsApp", "Gratis y sin registro"], accion: "USAR GRATIS", enlace: "https://ventafacil.rutacomercios.com/", color: "#16a34a", fondo: "#f0fdf4", suave: "#dcfce7" },
                 { icono: "👥", titulo: "VentaFácil Equipo", publico: "Varios vendedores en un mismo local", encabezado: "Para negocios con varios vendedores", descripcion: "Una propuesta para organizar el trabajo de varios vendedores en un mismo comercio. Modalidad en evaluación.", beneficios: ["Trabajo en equipo", "Gestión de ventas", "Pensado para un mismo local", "Consultá la propuesta"], accion: "CONSULTAR", enlace: "#contacto", color: "#d97706", fondo: "#fffbeb", suave: "#fef3c7" },
                 { icono: "🏪", titulo: "Simplex", publico: "Vendedores independientes · todo en uno", encabezado: "Para vendedores independientes", descripcion: "Una solución todo en uno para administrar clientes, artículos, pedidos y tu actividad comercial.", beneficios: ["Clientes", "Artículos", "Pedidos", "Gestión comercial"], accion: "CONSULTAR SIMPLEX", enlace: "#contacto", color: "#7c3aed", fondo: "#faf5ff", suave: "#ede9fe" },
               ];
               const actual = soluciones[solucionActiva];
               return (
                 <div className="rc-catalogo">
                   <div className="rc-opciones" aria-label="Elegir una solución">
                     {soluciones.map((item, idx) => (
                       <button key={item.titulo} type="button" className={`rc-opcion ${solucionActiva === idx ? "rc-elegida" : ""}`}
                         onMouseEnter={() => setSolucionActiva(idx)} onFocus={() => setSolucionActiva(idx)} onClick={() => setSolucionActiva(idx)}
                         aria-pressed={solucionActiva === idx}
                         style={{ "--rc-acento": item.color, "--rc-fondo": item.fondo }}>
                         <span className="rc-opcion-icono" aria-hidden="true">{item.icono}</span>
                         <span className="rc-opcion-texto"><span className="rc-opcion-titulo">{item.titulo}</span><span className="rc-opcion-subtitulo">{item.publico}</span></span>
                         <span aria-hidden="true" style={{ fontSize: 24, fontWeight: 900, color: solucionActiva === idx ? item.color : "#64748b" }}>›</span>
                       </button>
                     ))}
                   </div>
                   <article className="rc-panel" style={{ "--rc-acento": actual.color, "--rc-suave": actual.suave }} aria-live="polite">
                     <div className="rc-panel-cabecera">
                       <div className="rc-panel-cuerpo">
                         <div style={{ color: actual.color, fontWeight: 900, fontSize: 12, letterSpacing: 1.1, marginBottom: 10 }}>SOLUCIÓN PARA TU NEGOCIO</div>
                         <h3 style={{ color: "#0f172a", fontSize: "clamp(24px,3vw,36px)", lineHeight: 1.12, margin: "0 0 12px", letterSpacing: "-0.8px" }}>{actual.titulo}</h3>
                         <p style={{ color: "#0f172a", fontWeight: 850, fontSize: "clamp(15px,2vw,19px)", lineHeight: 1.35, margin: "0 0 12px" }}>{actual.encabezado}</p>
                         <p style={{ color: "#475569", fontSize: 15, lineHeight: 1.7, margin: 0 }}>{actual.descripcion}</p>
                       </div>
                       <div className="rc-panel-ilustracion" aria-hidden="true">{actual.icono}</div>
                     </div>
                     <div className="rc-beneficios">
                       {actual.beneficios.map((beneficio, idx) => <div key={beneficio} className="rc-beneficio"><span aria-hidden="true" style={{ color: actual.color, fontWeight: 900, fontSize: 19 }}>{["✓", "✓", "✓", "✓"][idx]}</span>{beneficio}</div>)}
                     </div>
                     <a className="rc-panel-boton" href={actual.enlace}>{actual.accion} →</a>
                   </article>
                 </div>
               );
             })()}
           </div>
         </section>

        <section
          style={{
            background:
              "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
            borderBottom: "1px solid #eef2f7",
          }}
        >
          <div
            style={{
              maxWidth: "1120px",
              margin: "0 auto",
              padding: "22px 18px 40px",
              boxSizing: "border-box",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <div style={{ flex: "1 1 460px", minWidth: "0" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  backgroundColor: "#dbeafe",
                  color: "#1d4ed8",
                  padding: "7px 11px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: "900",
                  letterSpacing: "0.35px",
                  marginBottom: "18px",
                }}
              >
                ● GESTIÓN PARA EQUIPOS DE VENTA EN CALLE
              </div>

              <h1
                style={{
                  margin: 0,
                  maxWidth: "650px",
                  fontSize: "clamp(38px, 6vw, 64px)",
                  lineHeight: "1.02",
                  letterSpacing: "-2.5px",
                  fontWeight: "950",
                  color: "#0f172a",
                  WebkitTextFillColor: "#0f172a",
                }}
              >
                Tu equipo vende en la calle.
                <span
                  style={{
                    display: "block",
                    color: "#2563eb",
                    marginTop: "7px",
                  }}
                >
                  Vos sabés qué está pasando.
                </span>
              </h1>

              <p
                style={{
                  maxWidth: "610px",
                  margin: "22px 0 0",
                  color: "#475569",
                  fontSize: "17px",
                  lineHeight: "1.65",
                }}
              >
                Organizá visitas, pedidos, clientes y recorridos de tus
                preventistas desde una sola plataforma. Más información para
                supervisar. Menos improvisación en la calle.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "11px",
                  marginTop: "28px",
                }}
              >
                <a
                  href="#contacto"
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    textDecoration: "none",
                    padding: "14px 20px",
                    borderRadius: "11px",
                    fontWeight: "900",
                    fontSize: "14px",
                    boxShadow: "0 8px 22px rgba(37,99,235,0.22)",
                  }}
                >
                  SOLICITAR DEMO
                </a>
                <a
                  href="https://ventafacil.rutacomercios.com"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    textDecoration: "none",
                    padding: "14px 20px",
                    borderRadius: "11px",
                    fontWeight: "900",
                    fontSize: "14px",
                    boxShadow: "0 8px 22px rgba(22,163,74,0.2)",
                  }}
                >
                  📱 INSTALAR VENTAFÁCIL GRATIS
                </a>
                <button
                  type="button"
                  onClick={irAlLogin}
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    padding: "13px 20px",
                    borderRadius: "11px",
                    border: "1px solid #cbd5e1",
                    fontWeight: "900",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  YA SOY CLIENTE · INGRESAR
                </button>
              </div>

              <div
                style={{
                  marginTop: "25px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "14px 22px",
                  color: "#64748b",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                <span>✓ Preventistas</span>
                <span>✓ Supervisores</span>
                <span>✓ Comercios</span>
                <span>✓ Pedidos</span>
              </div>
            </div>

            {/* MOCKUP */}
            <div
              style={{
                flex: "1 1 390px",
                minWidth: "0",
                maxWidth: "500px",
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  backgroundColor: "#0f172a",
                  borderRadius: "22px",
                  padding: "14px",
                  boxShadow: "0 24px 55px rgba(15,23,42,0.22)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#ffffff",
                    padding: "4px 5px 14px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#94a3b8",
                        fontWeight: "800",
                      }}
                    >
                      PANEL DE SUPERVISIÓN
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "900",
                        marginTop: "2px",
                      }}
                    >
                      Actividad del equipo
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#14532d",
                      color: "#86efac",
                      borderRadius: "999px",
                      padding: "6px 9px",
                      fontSize: "10px",
                      fontWeight: "900",
                    }}
                  >
                    ● EN LÍNEA
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "14px",
                    padding: "13px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    {[
                      ["12", "Visitas"],
                      ["7", "Pedidos"],
                      ["3", "En ruta"],
                    ].map(([valor, label]) => (
                      <div
                        key={label}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "11px 7px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "19px",
                            fontWeight: "950",
                            color: "#0f172a",
                          }}
                        >
                          {valor}
                        </div>
                        <div
                          style={{
                            fontSize: "9px",
                            color: "#64748b",
                            fontWeight: "800",
                            marginTop: "2px",
                          }}
                        >
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      height: "175px",
                      borderRadius: "12px",
                      position: "relative",
                      overflow: "hidden",
                      background:
                        "linear-gradient(135deg,#dbeafe 0%,#e2e8f0 48%,#dcfce7 100%)",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "22%",
                        left: "18%",
                        width: "150%",
                        height: "7px",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        transform: "rotate(18deg)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "63%",
                        left: "-10%",
                        width: "140%",
                        height: "8px",
                        backgroundColor: "rgba(255,255,255,0.92)",
                        transform: "rotate(-11deg)",
                      }}
                    />
                    {[
                      ["22%", "35%"],
                      ["48%", "61%"],
                      ["68%", "28%"],
                    ].map(([top, left], idx) => (
                      <div
                        key={idx}
                        style={{
                          position: "absolute",
                          top,
                          left,
                          width: "18px",
                          height: "18px",
                          backgroundColor: idx === 1 ? "#16a34a" : "#2563eb",
                          border: "3px solid #ffffff",
                          borderRadius: "50% 50% 50% 0",
                          transform: "rotate(-45deg)",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      alignItems: "center",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "10px 11px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#64748b",
                          fontWeight: "800",
                        }}
                      >
                        ÚLTIMA ACTIVIDAD
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "900",
                          marginTop: "2px",
                        }}
                      >
                        Visita registrada
                      </div>
                    </div>
                    <span style={{ fontSize: "20px" }}>📍</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VENTAFÁCIL GRATIS */}
        <section
          id="ventafacil"
          style={{ padding: "54px 18px", backgroundColor: "#f0fdf4", boxSizing: "border-box" }}
        >
          <div
            style={{
              maxWidth: "900px", margin: "0 auto", textAlign: "center",
              backgroundColor: "#ffffff", border: "1px solid #bbf7d0",
              borderRadius: "22px", padding: "clamp(26px, 5vw, 48px) 20px",
              boxShadow: "0 12px 32px rgba(22,163,74,0.08)",
            }}
          >
            <div style={{ color: "#15803d", fontWeight: "900", fontSize: "12px", letterSpacing: "1px" }}>
              🎁 UNA HERRAMIENTA GRATUITA DE RUTACOMERCIOS
            </div>
            <h2 style={{ fontSize: "clamp(28px, 5vw, 42px)", margin: "12px 0", color: "#0f172a" }}>
              VentaFácil: tus ventas en el celular
            </h2>
            <p style={{ maxWidth: "660px", margin: "0 auto 22px", color: "#475569", lineHeight: "1.7", fontSize: "15px" }}>
              Registrá clientes, artículos y ventas, compartí por WhatsApp y trabajá incluso sin internet.
              Gratis, sin registro y sin cuotas mensuales.
            </p>
            <a
              href="https://ventafacil.rutacomercios.com"
              style={{
                display: "inline-block", backgroundColor: "#16a34a", color: "#ffffff",
                textDecoration: "none", padding: "16px 24px", borderRadius: "12px",
                fontWeight: "900", fontSize: "15px", boxShadow: "0 8px 20px rgba(22,163,74,0.2)",
              }}
            >
              📱 INSTALAR VENTAFÁCIL GRATIS
            </a>
            <p style={{ margin: "18px auto 0", maxWidth: "650px", color: "#64748b", fontSize: "12px", lineHeight: "1.7" }}>
              En iPhone: abrí el enlace en Safari y elegí Compartir → Agregar a pantalla de inicio.
              En Android: abrilo en Chrome y elegí Instalar aplicación o Agregar a pantalla principal.
            </p>
            <p style={{ margin: "10px auto 0", maxWidth: "650px", color: "#64748b", fontSize: "11px", lineHeight: "1.6" }}>
              Los datos se guardan en tu dispositivo. Hacé copias de seguridad periódicas.
            </p>
          </div>
        </section>

        {/* DOS ROLES */}
        <section id="ventas" style={{ padding: "70px 18px", boxSizing: "border-box" }}>
          <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", maxWidth: "690px", margin: "0 auto 34px" }}>
              <div
                style={{
                  color: "#2563eb",
                  fontSize: "11px",
                  fontWeight: "900",
                  letterSpacing: "1px",
                }}
              >
                DOS VISTAS · UNA SOLA OPERACIÓN
              </div>
              <h2
                style={{
                  margin: "8px 0 10px",
                  fontSize: "clamp(28px, 4vw, 40px)",
                  lineHeight: "1.1",
                  letterSpacing: "-1.2px",
                  color: "#0f172a",
                  WebkitTextFillColor: "#0f172a",
                }}
              >
                El preventista trabaja. El supervisor tiene visibilidad.
              </h2>
              <p style={{ margin: 0, color: "#64748b", lineHeight: "1.6", fontSize: "15px" }}>
                Cada rol ve lo que necesita para hacer su trabajo sin convertir
                la operación diaria en una planilla interminable.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "18px",
              }}
            >
              <div
                style={{
                  borderRadius: "18px",
                  padding: "26px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              >
                <div style={{ fontSize: "34px" }}>📱</div>
                <h3 style={{ fontSize: "23px", margin: "10px 0 8px" }}>
                  Preventista
                </h3>
                <p style={{ color: "#475569", lineHeight: "1.6", margin: 0 }}>
                  Comercios del día, ubicación, visitas, ficha del cliente y
                  toma de pedidos desde el celular.
                </p>
              </div>

              <div
                style={{
                  borderRadius: "18px",
                  padding: "26px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #cbd5e1",
                }}
              >
                <div style={{ fontSize: "34px" }}>🖥️</div>
                <h3 style={{ fontSize: "23px", margin: "10px 0 8px" }}>
                  Supervisor
                </h3>
                <p style={{ color: "#475569", lineHeight: "1.6", margin: 0 }}>
                  Actividad del equipo, comercios, visitas, pedidos y
                  seguimiento operativo desde un panel central.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section
          style={{
            padding: "70px 18px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            boxSizing: "border-box",
          }}
        >
          <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
            <div style={{ maxWidth: "660px", margin: "0 auto 34px", textAlign: "center" }}>
              <div
                style={{
                  color: "#93c5fd",
                  fontSize: "11px",
                  fontWeight: "900",
                  letterSpacing: "1px",
                }}
              >
                DEL PLAN A LA CALLE
              </div>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 40px)",
                  lineHeight: "1.1",
                  letterSpacing: "-1px",
                  margin: "8px 0 10px",
                  WebkitTextFillColor: "white",
                }}
              >
                Así funciona RutaComercios
              </h2>
              <p style={{ color: "#e2e8f0", lineHeight: "1.6", margin: 0 }}>
                Un flujo simple para que la información acompañe el trabajo real
                del equipo.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "12px",
              }}
            >
              {pasos.map((paso) => (
                <div
                  key={paso.numero}
                  style={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      color: "#60a5fa",
                      fontSize: "11px",
                      fontWeight: "900",
                    }}
                  >
                    {paso.numero}
                  </div>
                  <h3 style={{ margin: "9px 0 7px", fontSize: "17px" }}>
                    {paso.titulo}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: "#cbd5e1",
                      lineHeight: "1.55",
                      fontSize: "13px",
                    }}
                  >
                    {paso.texto}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FUNCIONES */}
        <section style={{ padding: "70px 18px", boxSizing: "border-box" }}>
          <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", maxWidth: "690px", margin: "0 auto 34px" }}>
              <div
                style={{
                  color: "#2563eb",
                  fontSize: "11px",
                  fontWeight: "900",
                  letterSpacing: "1px",
                }}
              >
                HERRAMIENTAS PARA EL DÍA A DÍA
              </div>
              <h2
                style={{
  fontSize: "clamp(28px, 4vw, 40px)",
  lineHeight: "1.1",
  letterSpacing: "-1px",
  margin: "8px 0 10px",
  color: "#0f172a",
  
}}
              >
                La calle y la supervisión, conectadas
              </h2>
              <p style={{ color: "#64748b", lineHeight: "1.6", margin: 0 }}>
                RutaComercios concentra la información operativa que tu equipo
                necesita para trabajar y supervisar.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
                gap: "14px",
              }}
            >
              {funciones.map((item) => (
                <div
                  key={item.titulo}
                  style={{
                    padding: "21px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
                  }}
                >
                  <div style={{ fontSize: "25px" }}>{item.icono}</div>
                  <h3 style={{ margin: "10px 0 6px", fontSize: "16px" }}>
                    {item.titulo}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: "#64748b",
                      lineHeight: "1.55",
                      fontSize: "13px",
                    }}
                  >
                    {item.texto}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* REPARTOS: MODALIDAD DISPONIBLE */}
        <section id="repartos" style={{ padding: "65px 18px", backgroundColor: "#f0fdfa", boxSizing: "border-box" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
            <div style={{ color: "#0f766e", fontSize: "12px", fontWeight: 900, letterSpacing: "1px" }}>RUTACOMERCIOS REPARTOS</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", color: "#0f172a", margin: "12px 0" }}>🚚 Tus entregas, organizadas y bajo control</h2>
            <p style={{ maxWidth: "740px", margin: "0 auto 22px", color: "#475569", fontSize: "15px", lineHeight: 1.7 }}>
              Cargá entregas, prepará pedidos, asigná repartidores y seguí el avance de cada recorrido.
              RutaComercios Repartos también puede funcionar de forma independiente, sin contratar el módulo de Ventas.
            </p>
            <a href="#contacto" style={{ display: "inline-block", padding: "14px 22px", backgroundColor: "#0f766e", borderRadius: "11px", textDecoration: "none", color: "white", fontWeight: 900, fontSize: "14px" }}>SOLICITAR DEMO DE REPARTOS</a>
          </div>
        </section>
        {/* EXPRESS: SOLUCIÓN COMERCIAL */}
        <section id="express" style={{ padding: "65px 18px", backgroundColor: "#fff7ed", boxSizing: "border-box" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
            <div style={{ color: "#c2410c", fontSize: "12px", fontWeight: 900, letterSpacing: "1px" }}>RUTACOMERCIOS EXPRESS</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", color: "#0f172a", margin: "12px 0" }}>🛵 Tus entregas rápidas, bajo control</h2>
            <p style={{ maxWidth: "740px", margin: "0 auto 22px", color: "#475569", fontSize: "15px", lineHeight: 1.7 }}>
              Organizá los pedidos, asigná repartidores, seguí el avance de las entregas y controlá las rendiciones de efectivo desde un mismo sistema.
              Una solución pensada para negocios que realizan entregas rápidas y necesitan coordinar su operación diaria.
            </p>
            <a href="#contacto" style={{ display: "inline-block", padding: "14px 22px", backgroundColor: "#ea580c", borderRadius: "11px", textDecoration: "none", color: "white", fontWeight: 900, fontSize: "14px" }}>CONSULTAR POR EXPRESS</a>
          </div>
        </section>
        {/* COMERCIAL */}
        <section
          id="contacto"
          style={{
            padding: "70px 18px",
            backgroundColor: "#eff6ff",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              textAlign: "center",
              backgroundColor: "#ffffff",
              border: "1px solid #bfdbfe",
              borderRadius: "22px",
              padding: "clamp(28px, 6vw, 54px) 20px",
              boxShadow: "0 16px 45px rgba(37,99,235,0.08)",
            }}
          >
            <div
              style={{
                color: "#2563eb",
                fontSize: "11px",
                fontWeight: "900",
                letterSpacing: "1px",
              }}
            >
              CONOCÉ RUTACOMERCIOS
            </div>
            <h2
              style={{
                margin: "9px auto 12px",
                maxWidth: "650px",
                fontSize: "clamp(29px, 5vw, 44px)",
                lineHeight: "1.08",
                letterSpacing: "-1.4px",
                color: "#0f172a",
                  WebkitTextFillColor: "#0f172a",
                }}
            >
              Mirá cómo puede funcionar con tu equipo
            </h2>
            <p
              style={{
                maxWidth: "610px",
                margin: "0 auto",
                color: "#64748b",
                fontSize: "15px",
                lineHeight: "1.65",
              }}
            >
              Contanos qué necesitás: Ventas, Repartos, Express o Simplex. Te
              mostramos las opciones y evaluamos juntos la configuración que
              mejor se adapte a tu operación.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "10px",
                marginTop: "25px",
              }}
            >
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                style={{
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "14px 20px",
                  borderRadius: "11px",
                  fontWeight: "900",
                  fontSize: "14px",
                }}
              >
                💬 HABLAR POR WHATSAPP
              </a>
              <button
                type="button"
                onClick={irAlLogin}
                style={{
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  padding: "13px 20px",
                  borderRadius: "11px",
                  border: "1px solid #cbd5e1",
                  fontWeight: "900",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                ACCESO A CLIENTES
              </button>
            </div>

            <div
              style={{
                marginTop: "18px",
                color: "#64748b",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              Planes adaptables según la cantidad de usuarios y necesidades de
              cada empresa.
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: "65px 18px", boxSizing: "border-box" }}>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <h2
              style={{
                textAlign: "center",
                fontSize: "clamp(26px, 4vw, 36px)",
                margin: "0 0 26px",
                color: "#0f172a",
                  WebkitTextFillColor: "#0f172a",
                }}
            >
              Preguntas frecuentes
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {faqs.map((item, idx) => (
                <div
                  key={item.q}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    style={{
                      width: "100%",
                      border: 0,
                      backgroundColor: "#ffffff",
                      color: "#0f172a",
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontWeight: "850",
                      fontSize: "14px",
                    }}
                  >
                    <span>{item.q}</span>
                    <span style={{ color: "#2563eb" }}>
                      {faqAbierta === idx ? "−" : "+"}
                    </span>
                  </button>

                  {faqAbierta === idx && (
                    <div
                      style={{
                        padding: "0 16px 16px",
                        color: "#64748b",
                        lineHeight: "1.6",
                        fontSize: "13px",
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        style={{
          backgroundColor: "#0f172a",
          color: "#94a3b8",
          padding: "32px 18px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "1050px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <div>
            <div
              style={{
                color: "#ffffff",
                fontWeight: "900",
                fontSize: "18px",
              }}
            >
              RutaComercios
            </div>
            <div style={{ fontSize: "12px", marginTop: "5px" }}>
              Gestión para equipos de venta en calle.
            </div>
          </div>

          <div style={{ fontSize: "11px", textAlign: "right" }}>
            © 2026 RutaComercios · Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* WHATSAPP */}
      <a
        href={whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label="Consultar RutaComercios por WhatsApp"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "18px",
          maxWidth: "calc(100vw - 32px)",
          boxSizing: "border-box",
          textAlign: "center",
          whiteSpace: "nowrap",
          zIndex: 120,
          backgroundColor: "#16a34a",
          color: "#ffffff",
          textDecoration: "none",
          borderRadius: "999px",
          padding: "14px 22px",
          fontSize: "14px",
          fontWeight: "900",
          boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
        }}
      >
        💬 WhatsApp 11.6664.6806
      </a>
    </div>
  );
}
