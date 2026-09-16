import React, { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { supabase } from "./supabase";
import App from "./App.jsx";
import Supervisor from "./Supervisor.jsx";
import AdminClientes from "./AdminClientes.jsx";
import WebComercial from "./WebComercial.jsx";
import MonitorPedidos from "./MonitorPedidos";
import PortalPagos from "./PortalPagos";

function EnrutadorSeguro() {
 const ruta = window.location.pathname;
 if (ruta.startsWith("/web")) return <WebComercial />;

 const [sesion, setSesion] = useState(null);
 const [perfil, setPerfil] = useState(null);
 const [cargando, setCargando] = useState(true);
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [errorLogin, setErrorLogin] = useState(null);
 const [enviando, setEnviando] = useState(false);

 useEffect(() => {
 supabase.auth.getSession().then(({ data: { session } }) => {
 setSesion(session);
 if (session && session.user) {
 cargarPerfil(session.user.id, session.user.email);
 } else {
 setCargando(false);
 }
 });
 const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
 setSesion(session);
 if (session && session.user) {
 cargarPerfil(session.user.id, session.user.email);
 } else {
 setPerfil(null);
 setCargando(false);
 }
 });
 return () => subscription.unsubscribe();
 }, []);

  const cargarPerfil = async (userId, userEmail) => { try { if (userId) { const { data } = await supabase.from("perfiles").select("*").eq("id", userId).maybeSingle(); if (data) { setPerfil(data); setCargando(false); return; } } if (userEmail) { const { data } = await supabase.from("perfiles").select("*").eq("email", userEmail).maybeSingle(); if (data) { setPerfil(data); setCargando(false); return; } } } catch (e) { console.error(e); } finally { setCargando(false); } };

 const handleLogin = async (e) => {
 e.preventDefault();
 setErrorLogin(null);
 setEnviando(true);
 try {
 const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password.trim() });
 if (error) {
 setErrorLogin("Credenciales incorrectas o usuario no registrado.");
 } else if (data && data.user) {
 await cargarPerfil(data.user.id, data.user.email);
 }
 } catch (err) {
 setErrorLogin(err.message || "Error al conectar.");
 } finally {
 setEnviando(false);
 }
 };

 if (cargando) {
 return (
 <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>
 <div style={{ textAlign: "center" }}>
 <div style={{ fontSize: "36px", marginBottom: "10px" }}>📍</div>
 <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f8fafc" }}>RutaComercio</div>
 <div style={{ fontSize: "13px", marginTop: "6px", color: "#64748b" }}>Verificando credenciales y permisos...</div>
 </div>
 </div>
 );
 }

 if (sesion === null) {
 return (
 <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", fontFamily: "system-ui, sans-serif", padding: "16px" }}>
 <div style={{ width: "100%", maxWidth: "380px", background: "#ffffff", borderRadius: "16px", padding: "32px 28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
 <div style={{ textAlign: "center", marginBottom: "24px" }}>
 <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "#eff6ff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "28px", marginBottom: "12px" }}>📍</div>
 <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>RutaComercio</h1>
 <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>Puerta de Entrada Única</p>
 </div>
 <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
 <div>
 <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>Correo Corporativo</label>
 <input type="email" required placeholder="nombre@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "11px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
 </div>
 <div>
 <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>Contraseña</label>
 <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "11px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
 </div>
 {errorLogin && (
 <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", textAlign: "center" }}>{errorLogin}</div>
 )}
 <button type="submit" disabled={enviando} style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#2563eb", color: "#ffffff", border: "none", fontSize: "15px", fontWeight: "700", cursor: "pointer", marginTop: "6px", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
 {enviando ? "Verificando rol..." : "Iniciar Sesión"}
 </button>
 </form>
 <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
 🔒 Derivación automática por rol · Acceso Blindado
 </div>
 </div>
 </div>
 );
 }

  const emailUser = (sesion?.user?.email || "").toLowerCase(); let rol = (perfil && perfil.rol) ? perfil.rol.toLowerCase() : ""; if (!rol) { if (emailUser.includes("superadmin")) rol = "superadmin"; else if (emailUser.includes("supervisor")) rol = "supervisor"; else rol = "preventista"; }
 if (ruta.startsWith("/admin")) {
 if (rol === "superadmin") return <AdminClientes />;
 if (rol === "supervisor") return <Supervisor />;
 return <App />;
 }
 if (ruta.startsWith("/supervisor")) {
 if (rol === "supervisor" || rol === "superadmin") return <Supervisor />;
 return <App />;
 }
 if (ruta.startsWith("/pagos")) return <PortalPagos />;
 if (ruta.startsWith("/pedidos")) return <MonitorPedidos />;

 if (rol === "superadmin") return <AdminClientes />;
 if (rol === "supervisor") return <Supervisor />;
 return <App />;
}

createRoot(document.getElementById("root")).render(
 <StrictMode>
 <EnrutadorSeguro />
 </StrictMode>
);