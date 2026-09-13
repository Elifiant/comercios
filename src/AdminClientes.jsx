import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function AdminClientes() {
  const [empresas, setEmpresas] = useState([]);
  const [preventistas, setPreventistas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
  const [mostrarModalPreventista, setMostrarModalPreventista] = useState(false);
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoPassword, setNuevoPassword] = useState("");
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState("Elifiant");

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase.from("perfiles").select("*");
      if (error) throw error;
      setPreventistas(data || []);
      const unicas = Array.from(new Set((data || []).map(p => p.empresa).filter(Boolean)));
      if (unicas.indexOf("Elifiant") === -1) unicas.push("Elifiant");
      setEmpresas(unicas);
      if (unicas.length > 0 && empresaSeleccionada === "") setEmpresaSeleccionada(unicas[0]);
    } catch(err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const guardarNuevaEmpresa = (e) => {
    e.preventDefault();
    const nom = nombreEmpresa.trim();
    if (nom === "") return;
    if (empresas.indexOf(nom) === -1) {
      setEmpresas([...empresas, nom]);
      setEmpresaSeleccionada(nom);
    }
    setNombreEmpresa("");
    setMostrarModalEmpresa(false);
  };

  const crearNuevoPreventista = async (e) => {
    e.preventDefault();
    if (nuevoEmail.trim() === "" || nuevoPassword.trim() === "" || nuevoNombre.trim() === "") {
      alert("Por favor completa nombre, email y contrasena");
      return;
    }
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: nuevoEmail.trim(),
        password: nuevoPassword.trim()
      });
      if (authError) throw authError;
      const uid = authData.user ? authData.user.id : null;
      if (uid === null) throw new Error("No se pudo obtener el ID");

      const { error: pErr } = await supabase.from("perfiles").insert([{
        id: uid,
        email: nuevoEmail.trim(),
        nombre: nuevoNombre.trim(),
        empresa: empresaSeleccionada || "Elifiant",
        rol: "preventista"
      }]);
      if (pErr) throw pErr;

      alert("Preventista " + nuevoNombre + " creado con exito");
      setNuevoNombre("");
      setNuevoEmail("");
      setNuevoPassword("");
      setMostrarModalPreventista(false);
      cargarDatos();
    } catch(err) {
      alert("Error: " + (err.message || "Verifica los datos"));
    }
  };

  const eliminarPreventista = async (id, nom) => {
    if (window.confirm("Deseas dar de baja a " + nom + "?") === false) return;
    try {
      const { error } = await supabase.from("perfiles").delete().eq("id", id);
      if (error) throw error;
      cargarDatos();
    } catch(err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ backgroundColor: "#1e293b", borderBottom: "1px solid #334155", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ backgroundColor: "#2563eb", padding: "8px 12px", borderRadius: "8px", fontWeight: "bold", fontSize: "18px" }}>🏢</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>RutaComercio Admin</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Panel Super Admin • Empresas y Preventistas</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => window.location.href = "/supervisor"} style={{ backgroundColor: "#334155", color: "#f8fafc", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>📍 Ver Mapa en Vivo</button>
          <button onClick={() => setMostrarModalEmpresa(true)} style={{ backgroundColor: "#059669", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>+ Nueva Empresa</button>
          <button onClick={() => setMostrarModalPreventista(true)} style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>+ Nuevo Preventista</button>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "20px" }}>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>Empresas Clientes</p>
            <h2 style={{ margin: "8px 0 0 0", fontSize: "28px", color: "#38bdf8" }}>{empresas.length}</h2>
          </div>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "20px" }}>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>Preventistas Activos</p>
            <h2 style={{ margin: "8px 0 0 0", fontSize: "28px", color: "#4ade80" }}>{preventistas.length}</h2>
          </div>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "20px" }}>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>Abono Mensual Estimado</p>
            <h2 style={{ margin: "8px 0 0 0", fontSize: "28px", color: "#fbbf24" }}>$ {preventistas.length * 20} USD</h2>
          </div>
        </div>

        <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "16px" }}>Listado de Preventistas en la Calle</h3>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>Total: {preventistas.length}</span>
          </div>

          {cargando ? (
            <p style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>Cargando datos de Supabase...</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#0f172a", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
                    <th style={{ padding: "12px 20px" }}>Nombre</th>
                    <th style={{ padding: "12px 20px" }}>Email de Acceso</th>
                    <th style={{ padding: "12px 20px" }}>Empresa</th>
                    <th style={{ padding: "12px 20px" }}>Rol</th>
                    <th style={{ padding: "12px 20px", textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {preventistas.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "14px 20px", fontWeight: "bold" }}>{p.nombre || "Sin nombre"}</td>
                      <td style={{ padding: "14px 20px", color: "#94a3b8" }}>{p.email}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ backgroundColor: "#334155", padding: "4px 10px", borderRadius: "6px", fontSize: "12px" }}>🏢 {p.empresa || "Elifiant"}</span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ backgroundColor: p.rol === "admin" ? "#7c3aed" : "#2563eb", padding: "4px 10px", borderRadius: "6px", fontSize: "12px" }}>{p.rol || "preventista"}</span>
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <button onClick={() => eliminarPreventista(p.id, p.nombre)} style={{ backgroundColor: "#ef4444", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Dar de Baja</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {mostrarModalEmpresa && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "420px", boxSizing: "border-box" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>🏢 Dar de Alta Nueva Empresa</h3>
            <form onSubmit={guardarNuevaEmpresa}>
              <input type="text" value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} placeholder="Ej. Distribuidora Sur" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "16px", boxSizing: "border-box" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setMostrarModalEmpresa(false)} style={{ backgroundColor: "#475569", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ backgroundColor: "#059669", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalPreventista && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "450px", boxSizing: "border-box" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>👔 Dar de Alta Nuevo Preventista</h3>
            <form onSubmit={crearNuevoPreventista}>
              <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre (ej. Walter)" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "12px", boxSizing: "border-box" }} />
              <input type="email" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} placeholder="Email de login" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "12px", boxSizing: "border-box" }} />
              <input type="password" value={nuevoPassword} onChange={(e) => setNuevoPassword(e.target.value)} placeholder="Contrasena temporal" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "12px", boxSizing: "border-box" }} />
              <select value={empresaSeleccionada} onChange={(e) => setEmpresaSeleccionada(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "20px", boxSizing: "border-box" }}>
                {empresas.map(emp => (<option key={emp} value={emp}>{emp}</option>))}
              </select>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setMostrarModalPreventista(false)} style={{ backgroundColor: "#475569", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Crear y Activar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
