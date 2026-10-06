import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

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
    setMostrarNuevoPlan(false);
    setEditandoPlan(null);
    setFormPlan(planVacio);
  };

  const guardarPlan = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const payload = {
      nombre: formPlan.nombre.trim(),
      descripcion: formPlan.descripcion.trim() || null,
      activo: formPlan.activo,
      notas: formPlan.notas.trim() || null,
    };
    const r = editandoPlan
      ? await supabase.from("planes_abono").update(payload).eq("id", editandoPlan.id)
      : await supabase.from("planes_abono").insert(payload);
    setGuardando(false);
    if (r.error) return alert(r.error.message);
    cerrarPlan();
    cargar();
  };

  const abrirModalidad = (plan, modalidad) => {
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
    setGuardando(true);
    const payload = {
      plan_id: planModalidad.id,
      modalidad: formModalidad.modalidad,
      meses: Number(formModalidad.meses) || 1,
      precio: Number(formModalidad.precio) || 0,
      moneda: formModalidad.moneda,
      descuento_porcentaje: formModalidad.descuento === "" ? null : Number(formModalidad.descuento),
      activo: formModalidad.activo,
      notas: formModalidad.notas.trim() || null,
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
              Primero creás el plan. Después cargás sus precios mensual, semestral, anual o una modalidad especial.
            </div>
          </div>
          <button onClick={onClose} style={{ ...boton, background: "#334155" }}>✕ Cerrar</button>
        </div>

        {!mostrarNuevoPlan && !editandoPlan && (
          <button
            onClick={() => { setMostrarNuevoPlan(true); setFormPlan(planVacio); }}
            style={{ ...boton, background: "#2563eb", fontSize: 15, marginBottom: 18 }}
          >
            + CREAR NUEVO PLAN
          </button>
        )}

        {(mostrarNuevoPlan || editandoPlan) && (
          <form onSubmit={guardarPlan} style={{ background: "#1e293b", padding: 16, borderRadius: 10, marginBottom: 18, border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <b style={{ fontSize: 16 }}>{editandoPlan ? "✏️ Editar plan" : "➕ Crear nuevo plan"}</b>
              <button type="button" onClick={cerrarPlan} style={{ ...boton, background: "#475569", padding: "7px 10px" }}>Cancelar</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
              <input required placeholder="Nombre del plan. Ej.: RutaComercio Básico" value={formPlan.nombre} onChange={e => setFormPlan({ ...formPlan, nombre: e.target.value })} style={campo} />
              <input placeholder="Qué incluye. Ej.: Hasta 3 preventistas" value={formPlan.descripcion} onChange={e => setFormPlan({ ...formPlan, descripcion: e.target.value })} style={campo} />
              <input placeholder="Notas internas (opcional)" value={formPlan.notas} onChange={e => setFormPlan({ ...formPlan, notas: e.target.value })} style={campo} />
            </div>
            <button disabled={guardando} style={{ ...boton, background: "#2563eb", marginTop: 12 }}>
              {guardando ? "Guardando..." : editandoPlan ? "Guardar cambios" : "Crear plan"}
            </button>
          </form>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {planes.map(p => {
            const vars = variantes.filter(v => v.plan_id === p.id);
            return (
              <div key={p.id} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div>
                    <b style={{ fontSize: 18 }}>{p.nombre}</b>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{p.descripcion || "Sin descripción"}</div>
                    {p.notas && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Nota: {p.notas}</div>}
                  </div>
                  <button
                    onClick={() => {
                      setMostrarNuevoPlan(false);
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

          {planes.length === 0 && (
            <div style={{ padding: 25, border: "1px dashed #475569", borderRadius: 10, textAlign: "center", color: "#94a3b8" }}>
              Todavía no hay planes. Empezá con <b>+ CREAR NUEVO PLAN</b>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
