import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const nivelesComerciales = [
  { nombre: "Básico", rango: "1 a 3" },
  { nombre: "Intermedio", rango: "4 a 8" },
  { nombre: "PyME", rango: "9 a 20" },
  { nombre: "Full", rango: "21 en adelante" },
];
const productoDe = (nombre = "") => {
  if (nombre === "Simplex") return "Simplex";
  if (nombre === "Básico" || nombre.startsWith("Ventas · ")) return "Ventas";
  if (nombre.startsWith("Repartos · ")) return "Repartos";
  if (nombre.startsWith("Ventas + Repartos · ")) return "Ventas + Repartos";
  return nombre.includes(" · ") ? nombre.split(" · ")[0] : nombre;
};
const productosIniciales = ["Ventas", "Repartos", "Ventas + Repartos", "Simplex"];
const nivelDe = (p) => p.nombre === "Básico" ? "Básico" : p.nombre.split(" · ")[1] || "Simple";

const planVacio = { nombre: "", descripcion: "", activo: true, notas: "" };
const modalidadVacia = { modalidad: "mensual", meses: 1, precio: "", moneda: "ARS", descuento: "", activo: true, notas: "" };

const configModalidades = {
  mensual: { titulo: "Precio mensual", meses: 1, emoji: "📅" },
  semestral: { titulo: "Precio semestral", meses: 6, emoji: "6️⃣" },
  anual: { titulo: "Precio anual", meses: 12, emoji: "🗓️" },
  personalizado: { titulo: "Otra modalidad", meses: 1, emoji: "⚙️" },
};

export default function PlanesAbonos({ onClose }) {
  const [planes, setPlanes] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [mostrarNuevoPlan, setMostrarNuevoPlan] = useState(false);
  const [editandoPlan, setEditandoPlan] = useState(null);
  const [formPlan, setFormPlan] = useState(planVacio);
  const [planModalidad, setPlanModalidad] = useState(null);
  const [formModalidad, setFormModalidad] = useState(modalidadVacia);
  const [editandoModalidad, setEditandoModalidad] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [productoVisible, setProductoVisible] = useState("Ventas");
  const [creandoNiveles, setCreandoNiveles] = useState(false);
  const [nivelVisible, setNivelVisible] = useState("Básico");
  const [creandoProducto, setCreandoProducto] = useState(false);
  const productos = [...new Set([...productosIniciales, ...planes.map(p => productoDe(p.nombre))])].filter(p => p && p !== "Nuevo plan");

  // Usa las columnas existentes: no cambia ni desactiva contratos actuales.
  const crearNiveles = async () => {
    if (!["Ventas", "Repartos", "Ventas + Repartos"].includes(productoVisible)) return;
    const faltantes = nivelesComerciales.filter(n => !planes.some(p => p.nombre === `${productoVisible} · ${n.nombre}` || (productoVisible === "Ventas" && n.nombre === "Básico" && p.nombre === "Básico")));
    if (!faltantes.length) return alert("Los cuatro niveles ya están creados.");
    if (!window.confirm(`¿Crear ${faltantes.length} nivel(es) de ${productoVisible}? Los precios se cargarán después.`)) return;
    setCreandoNiveles(true);
    try {
      for (const n of faltantes) {
        const { error } = await supabase.from("planes_abono").insert({
          nombre: `${productoVisible} · ${n.nombre}`,
          descripcion: `${n.rango} ${productoVisible === "Ventas" ? "preventistas" : productoVisible === "Repartos" ? "repartidores" : "usuarios por servicio (cupos independientes)"}`,
          activo: true,
          tipo_acceso: "multiusuario",
          cupo_base: Number(n.rango.split(" ")[0]),
          permite_adicionales: true,
        });
        if (error) throw error;
      }
      await cargar();
      alert("Niveles creados. Ahora podés cargar los precios de cada uno.");
    } catch (err) {
      await cargar();
      alert("No se pudieron crear todos los niveles: " + err.message);
    } finally {
      setCreandoNiveles(false);
    }
  };

  const cargar = async () => {
    const [p, v] = await Promise.all([
      supabase.from("planes_abono").select("*").order("nombre"),
      supabase.from("planes_abono_variantes").select("*").order("meses"),
    ]);
    if (p.error) alert("No se pudieron cargar los planes: " + p.error.message);
    else setPlanes(p.data || []);
    if (v.error) alert("No se pudieron cargar las modalidades: " + v.error.message);
    else setVariantes(v.data || []);
  };

  useEffect(() => { cargar(); }, []);

  const cerrarPlan = () => {
    setCreandoProducto(false);
    setMostrarNuevoPlan(false);
    setEditandoPlan(null);
    setFormPlan(planVacio);
  };

  const guardarPlan = async (e) => {
    e.preventDefault();
    if (guardando) return;
    const nombre = formPlan.nombre.trim();
    if (!nombre) return alert("Ingresá un nombre.");
    const esProductoNuevo = creandoProducto && !editandoPlan;
    if (esProductoNuevo && (productos.includes(nombre) || nombre.includes(" · "))) {
      return alert("Ese producto ya existe o tiene un nombre no válido.");
    }
    const nombreRegistro = esProductoNuevo ? `${nombre} · Básico` : nombre;
    if (!editandoPlan && planes.some(p => p.nombre.toLowerCase() === nombreRegistro.toLowerCase())) {
      return alert("Ese abono ya existe.");
    }
    setGuardando(true);
    const payload = {
      nombre: nombreRegistro,
      descripcion: formPlan.descripcion.trim() || null,
      activo: formPlan.activo,
      ...(!editandoPlan ? {
        tipo_acceso: nombreRegistro === "Simplex" ? "simplex" : "multiusuario",
        cupo_base: nombreRegistro === "Simplex" ? 1 : 1,
        permite_adicionales: nombreRegistro !== "Simplex",
      } : {}),
    };
    try {
      const r = editandoPlan
        ? await supabase.from("planes_abono").update(payload).eq("id", editandoPlan.id)
        : await supabase.from("planes_abono").insert(payload);
      if (r.error) throw r.error;
      cerrarPlan();
      setCreandoProducto(false);
      if (esProductoNuevo) { setProductoVisible(nombre); setNivelVisible("Básico"); }
      await cargar();
    } catch (error) {
      alert("No se pudo guardar: " + error.message);
    } finally { setGuardando(false); }
  };

  const abrirModalidad = (plan, modalidad) => {
    const existente = variantes.find(v => v.plan_id === plan.id && v.modalidad === modalidad && v.activo !== false);
    if (existente && modalidad !== "personalizado") {
      editarModalidad(plan, existente);
      return;
    }
    const cfg = configModalidades[modalidad];
    setEditandoModalidad(null);
    setPlanModalidad(plan);
    setFormModalidad({
      ...modalidadVacia,
      modalidad,
      meses: cfg.meses,
    });
  };

  const guardarModalidad = async (e) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    const payload = {
      plan_id: planModalidad.id,
      modalidad: formModalidad.modalidad,
      meses: Number(formModalidad.meses) || 1,
      precio: Number(formModalidad.precio) || 0,
      moneda: formModalidad.moneda,
      descuento_porcentaje: formModalidad.descuento === "" ? null : Number(formModalidad.descuento),
      activo: formModalidad.activo,
      notas: String(formModalidad.notas || "").trim() || null,
    };
    const r = editandoModalidad
      ? await supabase.from("planes_abono_variantes").update(payload).eq("id", editandoModalidad.id)
      : await supabase.from("planes_abono_variantes").insert(payload);
    setGuardando(false);
    if (r.error) return alert(r.error.message);
    setPlanModalidad(null);
    setEditandoModalidad(null);
    setFormModalidad(modalidadVacia);
    cargar();
  };

  const editarModalidad = (plan, v) => {
    setPlanModalidad(plan);
    setEditandoModalidad(v);
    setFormModalidad({
      modalidad: v.modalidad || "personalizado",
      meses: v.meses || 1,
      precio: v.precio ?? "",
      moneda: v.moneda || "ARS",
      descuento: v.descuento_porcentaje ?? "",
      activo: v.activo !== false,
      notas: v.notas || "",
    });
  };

  const alternarModalidad = async (v) => {
    const nuevoEstado = v.activo === false;
    const accion = nuevoEstado ? "reactivar" : "desactivar";
    if (!window.confirm(`¿Querés ${accion} esta modalidad? El historial de las empresas no se borra.`)) return;
    const r = await supabase
      .from("planes_abono_variantes")
      .update({ activo: nuevoEstado })
      .eq("id", v.id);
    if (r.error) return alert(r.error.message);
    cargar();
  };

  const mensualRef = useMemo(() => {
    const m = {};
    for (const p of planes) {
      const x = variantes.find(v => v.plan_id === p.id && v.modalidad === "mensual" && v.activo !== false);
      if (x) m[p.id] = Number(x.precio) || 0;
    }
    return m;
  }, [planes, variantes]);

  const campo = {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#fff",
    boxSizing: "border-box",
  };

  const boton = {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #475569",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(2,6,23,.88)", overflowY: "auto", padding: "24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", background: "#111827", border: "1px solid #334155", borderRadius: 14, padding: 20, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>📋 Planes y Abonos</h2>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 5 }}>
              Catálogo comercial de consulta. Los precios son orientativos y no habilitan servicios ni modifican contratos.
            </div>
          </div>
          <button onClick={onClose} style={{ ...boton, background: "#334155" }}>✕ Cerrar</button>
        </div>

        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>PLANES</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {productos.map(producto => (
            <button key={producto} type="button" onClick={() => { cerrarPlan(); setProductoVisible(producto); setNivelVisible(producto === "Simplex" ? "Simple" : "Básico"); }}
              style={{ ...boton, background: productoVisible === producto ? "#2563eb" : "#334155" }}>
              {producto}
            </button>
          ))}
          <button type="button" onClick={() => { cerrarPlan(); setMostrarNuevoPlan(true); setCreandoProducto(true); setFormPlan({ ...planVacio }); }}
            style={{ ...boton, background: "#2563eb" }}>+ Agregar nuevo plan</button>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>ABONOS — {productoVisible.toUpperCase()}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          {(productoVisible === "Simplex" ? [{ nombre: "Simple", rango: "1 usuario" }] : nivelesComerciales).map(n => (
            <button key={n.nombre} type="button" onClick={() => setNivelVisible(n.nombre)}
              style={{ ...boton, background: nivelVisible === n.nombre ? "#2563eb" : "#334155" }}>
              {n.nombre} ({n.rango})
            </button>
          ))}
          {["Ventas", "Repartos", "Ventas + Repartos"].includes(productoVisible) && (
            <button type="button" disabled={creandoNiveles} onClick={crearNiveles}
              style={{ ...boton, background: "#047857" }}>
              {creandoNiveles ? "Creando..." : `+ Crear abonos de ${productoVisible} que falten`}
            </button>
          )}
        </div>
        {(mostrarNuevoPlan || editandoPlan) && (
          <form onSubmit={guardarPlan} style={{ background: "#1e293b", padding: 16, borderRadius: 10, marginBottom: 18, border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <b style={{ fontSize: 16 }}>{editandoPlan ? "✏️ Editar abono" : creandoProducto ? "➕ Agregar nuevo producto" : "➕ Crear abono"}</b>
              <button type="button" onClick={cerrarPlan} style={{ ...boton, background: "#475569", padding: "7px 10px" }}>Cancelar</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
              <input required placeholder={creandoProducto ? "Nombre del nuevo producto" : "Nombre del abono"} value={formPlan.nombre} onChange={e => setFormPlan({ ...formPlan, nombre: e.target.value })} style={campo} />
              <input placeholder="Descripción y notas comerciales (guardadas en Supabase)" value={formPlan.descripcion} onChange={e => setFormPlan({ ...formPlan, descripcion: e.target.value })} style={campo} />

            </div>
            <button disabled={guardando} style={{ ...boton, background: "#2563eb", marginTop: 12 }}>
              {guardando ? "Guardando..." : editandoPlan ? "Guardar cambios" : "Crear plan"}
            </button>
          </form>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {planes.filter(p => productoDe(p.nombre) === productoVisible && (productoVisible === "Simplex" || nivelDe(p) === nivelVisible)).map(p => {
            const vars = variantes.filter(v => v.plan_id === p.id);
            return (
              <div key={p.id} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div>
                    <b style={{ fontSize: 18 }}>{p.nombre}</b>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{p.descripcion || "Sin descripción"}</div>
                    
                  </div>
                  <button
                    onClick={() => {
                      setMostrarNuevoPlan(false);
                      setCreandoProducto(false);
                      setEditandoPlan(p);
                      setFormPlan({ nombre: p.nombre || "", descripcion: p.descripcion || "", activo: p.activo !== false, notas: p.notas || "" });
                    }}
                    style={{ ...boton, background: "#334155" }}
                  >
                    ✏️ Editar plan
                  </button>
                </div>

                <div style={{ marginTop: 15, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => abrirModalidad(p, "mensual")} style={{ ...boton, background: "#059669" }}>📅 + Precio mensual</button>
                  <button onClick={() => abrirModalidad(p, "semestral")} style={{ ...boton, background: "#059669" }}>6️⃣ + Precio semestral</button>
                  <button onClick={() => abrirModalidad(p, "anual")} style={{ ...boton, background: "#059669" }}>🗓️ + Precio anual</button>
                  <button onClick={() => abrirModalidad(p, "personalizado")} style={{ ...boton, background: "#475569" }}>⚙️ + Otra modalidad</button>
                </div>

                {vars.length === 0 ? (
                  <div style={{ marginTop: 16, padding: 14, border: "1px dashed #475569", borderRadius: 8, color: "#94a3b8", textAlign: "center" }}>
                    Todavía no cargaste precios para este plan.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", marginTop: 14 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr>
                          {["Modalidad", "Período", "Precio total", "Equiv. por mes", "Ahorro vs mensual", "Estado", "Acciones"].map(x =>
                            <th key={x} style={{ textAlign: "left", padding: 8, color: "#94a3b8" }}>{x}</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {vars.map(v => {
                          const eq = (Number(v.precio) || 0) / (Number(v.meses) || 1);
                          const base = mensualRef[p.id];
                          const ahorro = base ? (1 - eq / base) * 100 : null;
                          return (
                            <tr key={v.id} style={{ borderTop: "1px solid #334155" }}>
                              <td style={{ padding: 8, textTransform: "capitalize" }}>{v.modalidad}</td>
                              <td style={{ padding: 8 }}>{v.meses} mes(es)</td>
                              <td style={{ padding: 8 }}>{v.moneda} {Number(v.precio || 0).toLocaleString("es-AR")}</td>
                              <td style={{ padding: 8 }}>{v.moneda} {eq.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</td>
                              <td style={{ padding: 8 }}>{ahorro === null ? "—" : (ahorro > 0 ? ahorro.toFixed(1) + "%" : "0%")}</td>
                              <td style={{ padding: 8 }}>{v.activo !== false ? "🟢 Activa" : "⚪ Inactiva"}</td>
                              <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                                <button
                                  type="button"
                                  onClick={() => editarModalidad(p, v)}
                                  style={{ ...boton, background: "#334155", padding: "6px 9px", marginRight: 6 }}
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => alternarModalidad(v)}
                                  style={{ ...boton, background: v.activo !== false ? "#7f1d1d" : "#166534", padding: "6px 9px" }}
                                >
                                  {v.activo !== false ? "⏸ Desactivar" : "▶ Reactivar"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {planModalidad?.id === p.id && (
                  <form onSubmit={guardarModalidad} style={{ marginTop: 16, padding: 16, borderTop: "1px solid #475569", background: "#172033", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <b>{editandoModalidad ? "✏️ Editar modalidad" : `${configModalidades[formModalidad.modalidad]?.emoji || "⚙️"} ${configModalidades[formModalidad.modalidad]?.titulo || "Modalidad"}`} · {p.nombre}</b>
                      <button type="button" onClick={() => { setPlanModalidad(null); setEditandoModalidad(null); }} style={{ ...boton, background: "#475569", padding: "7px 10px" }}>Cancelar</button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                      {formModalidad.modalidad === "personalizado" && (
                        <>
                          <select value={formModalidad.modalidad} onChange={e => setFormModalidad({ ...formModalidad, modalidad: e.target.value })} style={campo}>
                            <option value="personalizado">Personalizado</option>
                          </select>
                          <input type="number" min="1" value={formModalidad.meses} onChange={e => setFormModalidad({ ...formModalidad, meses: e.target.value })} placeholder="Cantidad de meses" style={campo} />
                        </>
                      )}
                      <input required type="number" min="0" step="0.01" value={formModalidad.precio} onChange={e => setFormModalidad({ ...formModalidad, precio: e.target.value })} placeholder="Precio total" style={campo} />
                      <select value={formModalidad.moneda} onChange={e => setFormModalidad({ ...formModalidad, moneda: e.target.value })} style={campo}>
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                      <input type="number" min="0" max="100" step="0.01" value={formModalidad.descuento} onChange={e => setFormModalidad({ ...formModalidad, descuento: e.target.value })} placeholder="Descuento % (opcional)" style={campo} />
                      <input value={formModalidad.notas} onChange={e => setFormModalidad({ ...formModalidad, notas: e.target.value })} placeholder="Notas (opcional)" style={campo} />
                    </div>

                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 9 }}>
                      Período: <b>{formModalidad.meses} mes(es)</b>. El precio que cargues es el total de ese período.
                    </div>

                    <button disabled={guardando} style={{ ...boton, background: "#059669", marginTop: 12 }}>
                      {guardando ? "Guardando..." : editandoModalidad ? "Guardar cambios" : "Guardar precio"}
                    </button>
                  </form>
                )}
              </div>
            );
          })}

          {planes.filter(p => productoDe(p.nombre) === productoVisible && (productoVisible === "Simplex" || nivelDe(p) === nivelVisible)).length === 0 && !mostrarNuevoPlan && (
            <div style={{ padding: 25, border: "1px dashed #475569", borderRadius: 10, textAlign: "center", color: "#94a3b8" }}>
              Todavía no hay un abono cargado para esta selección.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
