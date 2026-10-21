import PortalPagos from "./PortalPagos";
import React, { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import Simplex from "./Simplex";
import Supervisor from "./Supervisor";
import AdminClientes from "./AdminClientes";
import AdminPromotores from "./AdminPromotores";
import WebComercial from "./WebComercial";
import Ayuda from "./Ayuda";
import MonitorPedidos from "./MonitorPedidos";
import Repartos from "./Repartos";
import Repartidor from "./Repartidor";
import { supabase } from "./supabase";

// Navegación para quienes tienen acceso a ambos módulos.
function SupervisorConCambioModulo() {
  return (
    <div>
      <div style={{ position: "fixed", right: 12, bottom: 12, zIndex: 10000 }}>
        <button type="button" onClick={() => window.location.assign("/")}
          style={{ padding: "12px 16px", border: "none", borderRadius: 10, background: "#0f766e", color: "white", fontWeight: 800, boxShadow: "0 3px 12px #0004", cursor: "pointer" }}>
          ⇄ CAMBIAR MÓDULO
        </button>
      </div>
      <Supervisor />
    </div>
  );
}

function EnrutadorSeguro() {
  console.log("🚦 EnrutadorSeguro está renderizando");
  // Compatibilidad: enlaces antiguos siguen funcionando.
  if (window.location.pathname === "/despacho" || window.location.pathname.startsWith("/despacho/")) {
    window.history.replaceState(null, "", "/repartos" + window.location.search + window.location.hash);
  }
  const ruta = window.location.pathname;
  const [sesion, setSesion] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [rolesExtra, setRolesExtra] = useState([]);
  const [cargando, setCargando] = useState(true);
  console.log("🔎 ESTADO:", { cargando, sesion, perfil });
  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [errorLogin, setErrorLogin] = useState(null);
  const [enviandoLogin, setEnviandoLogin] = useState(false);

  // Centro de Ayuda público, sin necesidad de iniciar sesión.
  if (ruta === "/ayuda" || ruta === "/ayuda/") {
    return <Ayuda />;
  }

  // Web comercial pública: /web en ambos dominios y raíz del subdominio www.
  // Las demás rutas conservan sus accesos y permisos originales.
  if (ruta === "/web" || (window.location.hostname === "www.rutacomercios.com" && (ruta === "/" || ruta === ""))) {
    return <WebComercial />;
  }

  const cargarPerfil = async (userId) => {
    try {
      const { data } = await supabase
        .from("perfiles")
        .select("rol, empresa, empresa_id, nombre")
        .eq("id", userId)
        .maybeSingle();
      setPerfil(data || null);

      const { data: rolesData, error: rolesError } = await supabase
        .from("perfiles_roles")
        .select("rol, activo")
        .eq("perfil_id", userId)
        .eq("activo", true);

      if (rolesError) {
        console.error("Error cargando roles adicionales:", rolesError);
        setRolesExtra([]);
      } else {
        setRolesExtra((rolesData || []).map(r => String(r.rol || "").toLowerCase()));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      if (session?.user?.id) {
        cargarPerfil(session.user.id);
      } else {
        setCargando(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
      if (session?.user?.id) {
        cargarPerfil(session.user.id);
      } else {
        setPerfil(null);
        setRolesExtra([]);
        setCargando(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorLogin(null);
    setEnviandoLogin(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailLogin.trim().toLowerCase(),
        password: passwordLogin
      });
      if (error) throw error;
      setSesion(data.session);
      if (data.session?.user?.id) {
        await cargarPerfil(data.session.user.id);
      }
    } catch (err) {
      setErrorLogin(err.message || "Credenciales incorrectas");
    } finally {
      setEnviandoLogin(false);
    }
  };

  if (cargando) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "sans-serif" }}>
        Iniciando RutaComercios...
      </div>
    );
  }

  // Login visual animado. La autenticación y los permisos no se modifican.
  if (!sesion) {
    return (
      <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 10%, #163d7c 0%, #0b2145 42%, #07152e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "system-ui, sans-serif" }}>
        <style>{`
          @keyframes rcLogoEntrada { from { opacity: 0; transform: translateY(-22px) scale(.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes rcTarjetaEntrada { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes rcPulso { 0%,100% { box-shadow: 0 0 0 0 rgba(36,211,114,.22); } 50% { box-shadow: 0 0 0 12px rgba(36,211,114,0); } }
          .rc-login-logo { animation: rcLogoEntrada 1.1s ease-out both; }
          .rc-login-form { animation: rcTarjetaEntrada .9s .35s ease-out both; }
          .rc-login-dot { animation: rcPulso 2.5s 1.1s infinite; }
          @media (prefers-reduced-motion: reduce) { .rc-login-logo, .rc-login-form, .rc-login-dot { animation: none !important; } }
        `}</style>
        <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <div className="rc-login-logo" style={{ margin: "0 auto 18px", maxWidth: "310px" }}>
            <video
              autoPlay
              muted
              playsInline
              poster="/logo-login-rutacomercios.png"
              aria-label="Animación del logo de RutaComercios"
              style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }}
            >
              <source src="/RutaComercios_ANIMACION_MAS_MOVIMIENTO.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="rc-login-form" style={{ background: "rgba(20, 40, 75, .94)", border: "1px solid rgba(143, 183, 240, .24)", borderRadius: "20px", padding: "28px 24px", boxShadow: "0 18px 45px rgba(0,0,0,.35)", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "9px", marginBottom: "8px" }}>
              <span className="rc-login-dot" aria-hidden="true" style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#24d372" }} />
              <h2 style={{ color: "#fff", fontSize: "21px", margin: 0, fontWeight: 750 }}>Acceso seguro</h2>
            </div>
            <p style={{ color: "#b4c6e4", fontSize: "13px", textAlign: "center", margin: "0 0 24px" }}>Ingresá con tu correo y contraseña</p>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {errorLogin && <div role="alert" style={{ background: "rgba(239,68,68,.14)", border: "1px solid #ef4444", color: "#fecaca", padding: "10px 12px", borderRadius: "8px", fontSize: "13px" }}>{errorLogin}</div>}
              <div>
                <label htmlFor="rc-email" style={{ color: "#dce7fa", fontSize: "13px", display: "block", marginBottom: "6px" }}>Correo electrónico</label>
                <input id="rc-email" type="email" autoComplete="username" required value={emailLogin} onChange={e => setEmailLogin(e.target.value)} style={{ width: "100%", padding: "12px", backgroundColor: "#0b1b36", border: "1px solid #4b668e", borderRadius: "10px", color: "#fff", boxSizing: "border-box", fontSize: "15px" }} />
              </div>
              <div>
                <label htmlFor="rc-password" style={{ color: "#dce7fa", fontSize: "13px", display: "block", marginBottom: "6px" }}>Contraseña</label>
                <input id="rc-password" type="password" autoComplete="current-password" required value={passwordLogin} onChange={e => setPasswordLogin(e.target.value)} style={{ width: "100%", padding: "12px", backgroundColor: "#0b1b36", border: "1px solid #4b668e", borderRadius: "10px", color: "#fff", boxSizing: "border-box", fontSize: "15px" }} />
              </div>
              <button type="submit" disabled={enviandoLogin} style={{ width: "100%", padding: "14px", backgroundColor: enviandoLogin ? "#5c80bc" : "#2563eb", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 750, cursor: enviandoLogin ? "wait" : "pointer", marginTop: "6px", fontSize: "15px" }}>
                {enviandoLogin ? "Ingresando..." : "Iniciar Sesión"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Con sesión activa: derivamos según rol y ruta
const rol = (perfil?.rol || "").toLowerCase();
const puedeVentas = rol === "superadmin" || rol === "supervisor" || rol === "supervisorv" || rolesExtra.includes("supervisorv");
const puedeRepartos = rol === "superadmin" || rol === "supervisorr" || rolesExtra.includes("supervisorr") || rolesExtra.includes("despacho");

// Esperar a que Supabase termine de cargar el perfil antes de decidir qué panel mostrar.
// Evita que un Supervisor o SuperAdmin vea por un instante la pantalla de Preventista.
if (!perfil) {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#94a3b8",
      fontFamily: "sans-serif"
    }}>
      Iniciando RutaComercios...
    </div>
  );
}

// El panel Admin solo puede abrirlo el SuperAdmin
if (ruta.startsWith("/admin")) {
  if (rol === "superadmin") return <AdminClientes />;
  window.location.replace("/");
  return null;
}

// Promotores: acceso exclusivo del SuperAdmin
if (ruta.startsWith("/promotores")) {
  if (rol === "superadmin") return <AdminPromotores />;
  window.location.replace("/");
  return null;
}
  // Ruta explícita del chofer, incluso si también tiene otros roles.
  if (ruta === "/repartos/chofer" || ruta.startsWith("/repartos/chofer/")) {
    if (rol === "repartidor" || rolesExtra.includes("repartidor")) {
      return <Repartidor sesion={sesion} perfil={perfil} />;
    }
    window.location.replace("/");
    return null;
  }

  // El Supervisor de Depósito organiza la preparación y ordena los repartos.
  // Se conserva el rol adicional "despacho" en la base de datos por compatibilidad.
  if (ruta === "/repartos" || ruta === "/repartos/") {
    if (puedeRepartos) {
      return <Repartos sesion={sesion} perfil={perfil} onVolver={puedeVentas && rol !== "superadmin" ? () => window.location.assign("/") : undefined} />;
    }
    if (rol === "repartidor" || rolesExtra.includes("repartidor")) {
      return <Repartidor sesion={sesion} perfil={perfil} />;
    }
    window.location.replace("/");
    return null;
  }

  if (ruta.startsWith("/pedidos")) {
    if (puedeVentas) return <MonitorPedidos />;
    window.location.replace("/");
    return null;
  }
  if (ruta.startsWith("/pagos")) {
    if (!puedeVentas) {
      window.location.replace("/");
      return null;
    }
    if (typeof PortalPagos !== "undefined") return <PortalPagos />;
    window.location.replace("/supervisor");
    return null;
  }

  

  if (rol === "superadmin") {
    if (ruta.startsWith("/supervisor")) return <Supervisor />;
    return <AdminClientes />;
  }

  // Un supervisor con ambas funciones elige su módulo al entrar.
  if (puedeVentas && puedeRepartos && rol !== "superadmin" && (ruta === "/" || ruta === "/ventas")) {
    if (ruta === "/ventas") return <SupervisorConCambioModulo />;
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "sans-serif" }}>
        <div style={{ width: "100%", maxWidth: "430px", background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "26px", color: "#fff", textAlign: "center" }}>
          <img src="/logo.svg" alt="RutaComercios" style={{ width: "150px", margin: "0 auto 14px" }} />
          <h2>Hola, {perfil?.nombre || "supervisor"}</h2>
          <p style={{ color: "#94a3b8" }}>¿Con qué módulo querés trabajar?</p>
          <div style={{ display: "grid", gap: "10px" }}>
            <button onClick={() => window.location.assign("/ventas")} style={{ padding: "17px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>📋 SUPERVISOR DE VENTAS</button>
            <button onClick={() => window.location.assign("/repartos")} style={{ padding: "17px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>🚚 DEPÓSITO Y REPARTOS</button>
          </div>
        </div>
      </div>
    );
  }

  if (puedeVentas && (ruta === "/" || ruta === "/ventas" || ruta.startsWith("/supervisor"))) {
    return puedeRepartos && rol !== "superadmin" ? <SupervisorConCambioModulo /> : <Supervisor />;
  }

  if (puedeRepartos && (ruta === "/" || ruta.startsWith("/supervisor"))) {
    return <Repartos sesion={sesion} perfil={perfil} onVolver={puedeVentas && rol !== "superadmin" ? () => window.location.assign("/") : undefined} />;
  }

  if (rol === "simplex") {
    return <Simplex sesion={sesion} perfil={perfil} />;
  }

  // Un usuario puede conservar su rol principal y sumar la función Repartidor.
  // En la raíz le damos a elegir sin obligarlo a tener dos cuentas.
  if (rol === "preventista" && rolesExtra.includes("repartidor") && ruta === "/") {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "sans-serif" }}>
        <div style={{ width: "100%", maxWidth: "430px", background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "26px", color: "#fff", textAlign: "center" }}>
          <img src="/logo.svg" alt="RutaComercios" style={{ width: "150px", margin: "0 auto 14px", display: "block" }} />
          <h2 style={{ margin: "0 0 6px" }}>Hola, {perfil?.nombre || "usuario"}</h2>
          <p style={{ margin: "0 0 22px", color: "#94a3b8", fontSize: "13px" }}>Elegí con qué función vas a trabajar.</p>
          <div style={{ display: "grid", gap: "10px" }}>
            <button onClick={() => window.location.assign("/ventas")} style={{ minHeight: "58px", border: "none", borderRadius: "10px", background: "#2563eb", color: "#fff", fontWeight: "900", fontSize: "15px", cursor: "pointer" }}>
              🧑‍💼 VENTAS / PREVENTISTA
            </button>
            <button onClick={() => window.location.assign("/repartos")} style={{ minHeight: "58px", border: "none", borderRadius: "10px", background: "#16a34a", color: "#fff", fontWeight: "900", fontSize: "15px", cursor: "pointer" }}>
              🚚 REPARTOS
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Repartidor exclusivo: abrir su módulo, nunca la app de preventistas.
  // Los usuarios con doble rol preventista + repartidor conservan su selector anterior.
  if (rol === "repartidor" || (rol !== "preventista" && rolesExtra.includes("repartidor"))) {
    return <Repartidor sesion={sesion} perfil={perfil} />;
  }

  if (rol === "supervisorr" || rol === "supervisorv") {
    window.location.replace("/");
    return null;
  }
  return <App sesion={sesion} perfil={perfil} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <EnrutadorSeguro />
  </StrictMode>
);
