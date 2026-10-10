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

  // La web comercial siempre es pública
  if (ruta === "/web") {
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
        Iniciando RutaComercio...
      </div>
    );
  }

  // Si no hay sesión activa: mostramos el login oficial con logo
  if (!sesion) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "sans-serif" }}>
        <div style={{ width: "100%", maxWidth: "380px", backgroundColor: "#1e293b", borderRadius: "16px", padding: "32px 24px", textAlign: "center", border: "1px solid #334155", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
          <img src="/logo.svg" alt="RutaComercio" style={{ width: "160px", margin: "0 auto 16px auto", display: "block" }} />
          <h2 style={{ color: "#fff", fontSize: "20px", margin: "0 0 6px 0", fontWeight: "bold" }}>Acceso Seguro</h2>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 20px 0" }}>Ingresá tu correo y contraseña</p>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
            {errorLogin && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.2)", border: "1px solid #ef4444", color: "#f87171", padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}>
                {errorLogin}
              </div>
            )}
            <div>
              <label style={{ color: "#cbd5e1", fontSize: "12px", display: "block", marginBottom: "4px" }}>Correo electrónico</label>
              <input type="email" required value={emailLogin} onChange={e => setEmailLogin(e.target.value)} style={{ width: "100%", padding: "10px", backgroundColor: "#0f172a", border: "1px solid #475569", borderRadius: "8px", color: "#fff", boxSizing: "border-box", fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ color: "#cbd5e1", fontSize: "12px", display: "block", marginBottom: "4px" }}>Contraseña</label>
              <input type="password" required value={passwordLogin} onChange={e => setPasswordLogin(e.target.value)} style={{ width: "100%", padding: "10px", backgroundColor: "#0f172a", border: "1px solid #475569", borderRadius: "8px", color: "#fff", boxSizing: "border-box", fontSize: "14px" }} />
            </div>
            <button type="submit" disabled={enviandoLogin} style={{ width: "100%", padding: "12px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginTop: "8px", fontSize: "14px" }}>
              {enviandoLogin ? "Ingresando..." : "Iniciar Sesión"}
            </button>
          </form>
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
      Iniciando RutaComercio...
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
          <img src="/logo.svg" alt="RutaComercio" style={{ width: "150px", margin: "0 auto 14px" }} />
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
          <img src="/logo.svg" alt="RutaComercio" style={{ width: "150px", margin: "0 auto 14px", display: "block" }} />
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
