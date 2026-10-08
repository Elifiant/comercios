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
import Despacho from "./Despacho";
import Repartidor from "./Repartidor";
import { supabase } from "./supabase";

function EnrutadorSeguro() {
  console.log("🚦 EnrutadorSeguro está renderizando");
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
  if (ruta.startsWith("/repartos")) {
    const puedeRepartir = rolesExtra.includes("repartidor");

    if (puedeRepartir) {
      return <Repartidor sesion={sesion} perfil={perfil} />;
    }

    window.location.replace("/");
    return null;
  }

  if (ruta.startsWith("/despacho")) {
    const puedeDespacho =
      rol === "superadmin" ||
      rol === "supervisor" ||
      rolesExtra.includes("despacho");

    if (puedeDespacho) {
      return <Despacho sesion={sesion} perfil={perfil} />;
    }

    window.location.replace("/");
    return null;
  }

  if (ruta.startsWith("/pedidos")) return <MonitorPedidos />;
  if (ruta.startsWith("/pagos")) {
    if (typeof PortalPagos !== "undefined") return <PortalPagos />;
    window.location.replace("/supervisor");
    return null;
  }

  

  if (rol === "superadmin") {
    if (ruta.startsWith("/supervisor")) return <Supervisor />;
    return <AdminClientes />;
  }

  if (rol === "supervisor") {
    return <Supervisor />;
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

  return <App sesion={sesion} perfil={perfil} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <EnrutadorSeguro />
  </StrictMode>
);
