import React, { useState } from "react";

export default function WebComercial() {
  const [faqAbierta, setFaqAbierta] = useState(null);

  const toggleFaq = (idx) => {
    setFaqAbierta(faqAbierta === idx ? null : idx);
  };

  const irAlLogin = () => {
    window.location.href = "/login";
  };

  const whatsapp =
    "https://wa.me/5491166646806?text=Hola,%20quiero%20conocer%20RutaComercio";

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
    "RutaComercio está pensado para acompañar operaciones de distintos tamaños: desde pequeños equipos comerciales hasta organizaciones con cientos de vendedores y preventistas.",
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
      q: "¿RutaComercio se usa desde el celular?",
      a:
        "Sí. El preventista trabaja desde su teléfono y el supervisor accede a su panel para seguir la operación.",
    },
    {
      q: "¿Puedo trabajar con varios preventistas?",
      a:
        "Sí. RutaComercio está pensado para empresas que necesitan organizar y supervisar equipos de venta en calle.",
    },
    {
      q: "¿Los pedidos quedan vinculados al comercio?",
      a:
        "Sí. La toma de pedidos forma parte del trabajo asociado a cada comercio y a la operación del preventista.",
    },
    {
      q: "¿Puedo conocer RutaComercio antes de contratar?",
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
              alt="RutaComercio"
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
              RutaComercio
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
          </div>
        </div>
      </header>

      {/* HERO */}
      <main>
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
              padding: "70px 18px 58px",
              boxSizing: "border-box",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "44px",
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

        {/* DOS ROLES */}
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
                DOS VISTAS · UNA SOLA OPERACIÓN
              </div>
              <h2
                style={{
                  margin: "8px 0 10px",
                  fontSize: "clamp(28px, 4vw, 40px)",
                  lineHeight: "1.1",
                  letterSpacing: "-1.2px",
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
                Así funciona RutaComercio
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
                RutaComercio concentra la información operativa que tu equipo
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
        {/* PROXIMAMENTE */}
<section
  style={{
    padding: "65px 18px",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
  }}
>
  <div
    style={{
      maxWidth: "900px",
      margin: "0 auto",
      textAlign: "center",
    }}
  >
    <div
      style={{
        display: "inline-block",
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
        padding: "7px 12px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: "900",
        letterSpacing: "1px",
        marginBottom: "14px",
      }}
    >
      EN DESARROLLO
    </div>

    <h2
      style={{
        margin: "0 0 12px",
        fontSize: "clamp(28px, 4vw, 40px)",
        lineHeight: "1.1",
        letterSpacing: "-1px",
        color: "#0f172a",
      }}
    >
      🚚 Próximamente: nuevos módulos
    </h2>

    <p
      style={{
        maxWidth: "700px",
        margin: "0 auto",
        color: "#64748b",
        fontSize: "15px",
        lineHeight: "1.7",
      }}
    >
      <strong style={{ color: "#0f172a" }}>
        RutaComercio sigue creciendo.
      </strong>{" "}
      Estamos desarrollando nuevas herramientas para ampliar la gestión de tu
      operación, incluyendo un módulo de <strong>Entregas y Repartos</strong>,
      con asignación de entregas, seguimiento de recorridos y estados como
      entregado, no entregado, rechazado o reprogramado.
    </p>

    <div
      style={{
        marginTop: "20px",
        fontSize: "17px",
        fontWeight: "900",
        color: "#2563eb",
      }}
    >
      Y esto es solo el comienzo.
    </div>
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
              CONOCÉ RUTACOMERCIO
            </div>
            <h2
              style={{
                margin: "9px auto 12px",
                maxWidth: "650px",
                fontSize: "clamp(29px, 5vw, 44px)",
                lineHeight: "1.08",
                letterSpacing: "-1.4px",
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
              Contanos cuántos preventistas tenés y cómo trabajan hoy. Te
              mostramos RutaComercio y evaluamos juntos la configuración que
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
              RutaComercio
            </div>
            <div style={{ fontSize: "12px", marginTop: "5px" }}>
              Gestión para equipos de venta en calle.
            </div>
          </div>

          <div style={{ fontSize: "11px", textAlign: "right" }}>
            © 2026 RutaComercio · Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* WHATSAPP */}
      <a
        href={whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label="Consultar RutaComercio por WhatsApp"
        style={{
          position: "fixed",
          right: "16px",
          bottom: "16px",
          zIndex: 120,
          backgroundColor: "#16a34a",
          color: "#ffffff",
          textDecoration: "none",
          borderRadius: "999px",
          padding: "11px 15px",
          fontSize: "12px",
          fontWeight: "900",
          boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
        }}
      >
        💬 Consultar
      </a>
    </div>
  );
}
