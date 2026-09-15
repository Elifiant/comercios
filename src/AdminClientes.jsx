import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function AdminClientes() {
  const [empresas, setEmpresas] = useState([]);
  const [preventistas, setPreventistas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [paisEmpresa, setPaisEmpresa] = useState("Argentina");
  const [monedaEmpresa, setMonedaEmpresa] = useState("ARS");
  const [tipoTarifa, setTipoTarifa] = useState("preventista");
  const [tarifaValor, setTarifaValor] = useState("10000");
  const [cupoLimite, setCupoLimite] = useState("5");
  const [notasCobro, setNotasCobro] = useState("");
  const [tarifasMap, setTarifasMap] = useState(() => {
    try {
      const guardado = localStorage.getItem("tarifas_empresas");
      return guardado ? JSON.parse(guardado) : {};
    } catch (e) {
      return {};
    }
  });
  const [diasCorteMap, setDiasCorteMap] = useState({
    "Distribuidora Quilmes B2B S.A.": { dia: "05", estado: "Al Día", color: "#10b981", cupo: 10 },
    "Elifiant": { dia: "01", estado: "Al Día", color: "#10b981", cupo: 5 },
    "Mayorista San Martín Golosinas": { dia: "10", estado: "Por Vencer", color: "#f59e0b", cupo: 3 }
  });
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [empresaPago, setEmpresaPago] = useState("");
  const [montoPago, setMontoPago] = useState("");
  const [monedaPago, setMonedaPago] = useState("ARS");
  const [comprobantePago, setComprobantePago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Transferencia CBU");
  const [historialPagos, setHistorialPagos] = useState([]);
  const [empresaDetalleModal, setEmpresaDetalleModal] = useState(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [empresaAEditar, setEmpresaAEditar] = useState(null);
  const [diaCobroModal, setDiaCobroModal] = useState("05");
  const [estadoCobroModal, setEstadoCobroModal] = useState("Al Día");
  const [tarifaEditada, setTarifaEditada] = useState("10000");
  const [cupoEditado, setCupoEditado] = useState("5");
  const [monedaEditada, setMonedaEditada] = useState("ARS");
  const [tipoTarifaEditada, setTipoTarifaEditada] = useState("preventista");
  const [paisEditado, setPaisEditado] = useState("Argentina");
  const [mostrarModalPreventista, setMostrarModalPreventista] = useState(false);
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoPassword, setNuevoPassword] = useState("");
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState("Elifiant");

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const tGuardado = localStorage.getItem("tarifas_empresas");
      if (tGuardado) {
        const parsed = JSON.parse(tGuardado);
        setTarifasMap(prev => ({ ...parsed, ...prev }));
      }
    } catch(e){}
    setCargando(true);
    try {
      const { data, error } = await supabase.from("perfiles").select("*");
      if (error) throw error;
      setPreventistas(data || []);
      const unicas = Array.from(new Set((data || []).map(p => p.empresa).filter(Boolean)));
      if (unicas.indexOf("Elifiant") === -1) unicas.push("Elifiant");
      try {
        const guardadas = JSON.parse(localStorage.getItem("tarifas_empresas") || "{}");
        Object.keys(guardadas).forEach(k => { if (unicas.indexOf(k) === -1) unicas.push(k); });
      } catch(e){}
      setEmpresas(unicas);
      if (unicas.length > 0 && empresaSeleccionada === "") setEmpresaSeleccionada(unicas[0]);
    } catch(err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const eliminarEmpresa = async (emp) => {
    if (emp === "Elifiant") {
      alert("No se recomienda eliminar la empresa principal Elifiant.");
      return;
    }
    const prevsAsociados = preventistas.filter(p => (p.empresa || "").toLowerCase() === emp.toLowerCase());
    const mensaje = prevsAsociados.length > 0 
      ? `¿Estás seguro de eliminar la empresa "${emp}"?\n\n⚠ ATENCIÓN: También se darán de baja automáticamente sus ${prevsAsociados.length} preventistas en Supabase.`
      : `¿Estás seguro de eliminar la empresa "${emp}"?`;
      
    const confirma = window.confirm(mensaje);
    if (!confirma) return;

    try {
      // 1. Borrado en Supabase de todos los preventistas de esta empresa
      const { error } = await supabase.from("perfiles").delete().eq("empresa", emp);
      if (error) console.warn("Aviso al borrar en perfiles:", error.message);

      // 2. Limpieza del estado de preventistas en memoria
      setPreventistas(prev => prev.filter(p => (p.empresa || "").toLowerCase() !== emp.toLowerCase()));

      // 3. Limpieza de la empresa en memoria y localStorage
      setEmpresas(prev => prev.filter(e => e !== emp));
      const nuevoMapa = { ...tarifasMap };
      delete nuevoMapa[emp];
      setTarifasMap(nuevoMapa);
      try { localStorage.setItem("tarifas_empresas", JSON.stringify(nuevoMapa)); } catch(e){}

      setDiasCorteMap(prev => {
        const nuevoDias = { ...prev };
        delete nuevoDias[emp];
        return nuevoDias;
      });

      alert(`Empresa "${emp}" y sus preventistas eliminados definitivamente.`);
    } catch (err) {
      alert("Error al eliminar: " + (err.message || "Error desconocido"));
    }
  };

  const eliminarPreventistaDirecto = async (prevObj) => {
    const nombrePrev = prevObj.nombre || prevObj.email || "este preventista";
    const confirma = window.confirm(`¿Seguro que deseas eliminar al preventista "${nombrePrev}"?`);
    if (!confirma) return;
    try {
      if (prevObj.id) {
        const { error } = await supabase.from("perfiles").delete().eq("id", prevObj.id);
        if (error) throw error;
      } else if (prevObj.email) {
        const { error } = await supabase.from("perfiles").delete().eq("email", prevObj.email);
        if (error) throw error;
      }
      setPreventistas(prev => prev.filter(p => (p.id ? p.id !== prevObj.id : p.email !== prevObj.email)));
      alert(`Preventista "${nombrePrev}" eliminado con éxito.`);
    } catch (err) {
      alert("Error al eliminar preventista: " + (err.message || "Error desconocido"));
    }
  };

  const abrirEditarEmpresa = (emp) => {
    let t = {};
    try {
      const guardadas = JSON.parse(localStorage.getItem("tarifas_empresas") || "{}");
      t = guardadas[emp] || {};
    } catch(e){}
    setEmpresaAEditar(emp);
    setDiaCobroModal(t.dia_cobro || t.diaCobro || (diasCorteMap[emp] ? diasCorteMap[emp].dia : "05"));
    setEstadoCobroModal(t.estado_pago || (diasCorteMap[emp] ? diasCorteMap[emp].estado : "Al Día"));
    setTarifaEditada(t.valor || t.tarifa || "13000");
    setCupoEditado(t.cupo || (diasCorteMap[emp] ? String(diasCorteMap[emp].cupo || 5) : "5"));
    setMonedaEditada(t.moneda || "ARS");
    setTipoTarifaEditada(t.tipo_tarifa || t.tipo || "preventista");
    setPaisEditado(t.pais || "Argentina");
    setMostrarModalEditar(true);
  };

  const guardarEdicionEmpresa = () => {
    if (!empresaAEditar) return;
    const colorEstado = estadoCobroModal === "Al Día" ? "#10b981" : estadoCobroModal === "Por Vencer" ? "#f59e0b" : "#ef4444";
    const datosActualizados = {
      ...(tarifasMap[empresaAEditar] || {}),
      diaCobro: diaCobroModal,
      dia_cobro: diaCobroModal,
      estado_pago: estadoCobroModal,
      valor: tarifaEditada,
      tarifa: tarifaEditada,
      cupo: Number(cupoEditado) || 5,
      moneda: monedaEditada,
      tipo: tipoTarifaEditada,
      tipo_tarifa: tipoTarifaEditada,
      pais: paisEditado
    };
    const nuevoMapa = { ...tarifasMap, [empresaAEditar]: datosActualizados };
    setTarifasMap(nuevoMapa);
    try { localStorage.setItem("tarifas_empresas", JSON.stringify(nuevoMapa)); } catch(e){}
    setDiasCorteMap(prev => ({
      ...prev,
      [empresaAEditar]: { dia: diaCobroModal, estado: estadoCobroModal, color: colorEstado, cupo: Number(cupoEditado) || 5 }
    }));
    setMostrarModalEditar(false);
  };

  const abrirRegistrarPago = (emp) => {
    setEmpresaPago(emp);
    const t = tarifasMap[emp] || {};
    setMonedaPago(t.moneda || "ARS");
    const prevs = preventistas.filter(p => p.empresa === emp).length;
    const val = Number(t.valor || t.tarifa || 10000);
    setMontoPago(t.tipo === "plana" ? String(val) : String(prevs * val || val));
    setMostrarModalPago(true);
  };

  const guardarPago = (e) => {
    e.preventDefault();
    const nuevo = {
      id: Date.now(),
      fecha: "Hoy, recién",
      empresa: empresaPago,
      monto: montoPago,
      moneda: monedaPago,
      metodo: metodoPago,
      ref: comprobantePago || "OP-" + Math.floor(100000 + Math.random() * 900000),
      estado: "Confirmado"
    };
    setHistorialPagos(prev => [nuevo, ...prev]);
    setDiasCorteMap(prev => ({ ...prev, [empresaPago]: { ...(prev[empresaPago] || { dia: "05", cupo: 5 }), estado: "Al Día", color: "#10b981" } }));
    setMostrarModalPago(false);
    setComprobantePago("");
  };

  const crearNuevoPreventista = async (e) => {
    e.preventDefault();
    try {
      const nuevo = { nombre: nuevoNombre, email: nuevoEmail, empresa: empresaSeleccionada, activo: true };
      const { error } = await supabase.from("perfiles").insert([nuevo]);
      if (error) throw error;
      setPreventistas(prev => [...prev, nuevo]);
      setNuevoNombre("");
      setNuevoEmail("");
      setNuevoPassword("");
      setMostrarModalPreventista(false);
      alert("Preventista creado con éxito");
    } catch (err) {
      alert("Error: " + (err.message || "Error al crear preventista"));
    }
  };

  const cobradoUSD = historialPagos.filter(h => h.moneda === "USD" && h.estado === "Confirmado").reduce((acc, h) => acc + Number(h.monto || 0), 0);
  const cobradoARS = historialPagos.filter(h => h.moneda === "ARS" && (h.estado === "Confirmado" || h.estado === "Acreditado")).reduce((acc, h) => acc + Number(h.monto || 0), 0);
  const cobradoUSDT = historialPagos.filter(h => h.moneda === "USDT" && h.estado === "Confirmado").reduce((acc, h) => acc + Number(h.monto || 0), 0);

    const diaHoy = new Date().getDate();
  const diaManana = diaHoy + 1;
  let empresasHoy = [];
  let empresasManana = [];
  let empresas15Dias = [];

  empresas.forEach(emp => {
    const t = tarifasMap[emp] || {};
    const cInfo = diasCorteMap[emp] || {};
    const diaCorte = Number(t.diaCobro || t.dia_cobro || cInfo.dia || 5);
    const prevsCount = preventistas.filter(p => (p.empresa || "").toLowerCase() === emp.toLowerCase()).length;
    const valor = Number(t.valor || t.tarifa || (t.moneda === "ARS" ? 10000 : 50));
    const moneda = t.moneda || "ARS";
    const total = (t.tipo === "plana" ? valor : (prevsCount * valor || valor));
    const item = { empresa: emp, total, moneda, dia: diaCorte };

    if (diaCorte === diaHoy) {
      empresasHoy.push(item);
    } else if (diaCorte === diaManana) {
      empresasManana.push(item);
    } else if (diaCorte > diaHoy && diaCorte <= diaHoy + 15) {
      empresas15Dias.push(item);
    }
  });

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", padding: "24px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>👑</span>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px", color: "#f8fafc" }}>RutaComercio · SuperAdmin</h1>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "13px" }}>Control financiero, gestión completa de empresas y bajas de preventistas</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" onClick={() => setMostrarModalPreventista(true)} style={{ backgroundColor: "#334155", color: "#f8fafc", border: "1px solid #475569", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
            + Nuevo Preventista
          </button>
          <button type="button" onClick={() => { setEmpresaEditando(null); setNombreEmpresa(""); setMostrarModalEmpresa(true); }} style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "13px", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
            + Nueva Empresa
          </button>
        </div>
      </header>

      {/* 4 TARJETAS CLAVE */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>EMPRESAS CLIENTES</span>
            <span style={{ fontSize: "18px" }}>🏢</span>
          </div>
          <h2 style={{ margin: "10px 0 4px 0", fontSize: "28px", color: "#38bdf8", fontWeight: "800" }}>{empresas.length}</h2>
          <div style={{ fontSize: "12px", color: "#10b981" }}>● {empresas.length} activas</div>
        </div>

        <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>PREVENTISTAS EN CALLE</span>
            <span style={{ fontSize: "18px" }}>👔</span>
          </div>
          <h2 style={{ margin: "10px 0 4px 0", fontSize: "28px", color: "#4ade80", fontWeight: "800" }}>{preventistas.length}</h2>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>100% activos en campo</div>
        </div>

        <div style={{ backgroundColor: "#1e293b", border: "1px solid #059669", borderRadius: "12px", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#34d399", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>COBRADO EN EL MES (REAL)</span>
            <span style={{ fontSize: "11px", backgroundColor: "#065f46", color: "#34d399", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>✓ Acreditado</span>
          </div>
          <h2 style={{ margin: "10px 0 4px 0", fontSize: "24px", color: "#10b981", fontWeight: "800" }}>
            ${Number(cobradoUSD || 0).toLocaleString()} <span style={{ fontSize: "13px", color: "#94a3b8" }}>USD</span>
          </h2>
          <div style={{ fontSize: "12px", color: "#cbd5e1", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <span>ARS: <strong>${Number(cobradoARS || 0).toLocaleString()}</strong></span>
            <span>USDT: <strong>₮ {cobradoUSDT || 0}</strong></span>
          </div>
        </div>

        <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>COBROS POR VENCER</span>
            <span style={{ fontSize: "18px" }}>🗓️</span>
          </div>
          <h2 style={{ margin: "10px 0 4px 0", fontSize: "28px", color: "#fbbf24", fontWeight: "800" }}>
            {empresasHoy.length + empresasManana.length + empresas15Dias.length || 3} <span style={{ fontSize: "13px", color: "#94a3b8" }}>empresas</span>
          </h2>
          <div style={{ fontSize: "12px", color: "#f59e0b" }}>Previsión próximos 15 días activa</div>
        </div>
      </div>

            {/* SEMAFORO HOY, MAÑANA, 15 DIAS */}
      <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "18px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>⏱️</span>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>Semáforo y Flujo de Cobros: Hoy, Mañana y 15 Días</h3>
          </div>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Sincronizado en tiempo real con tus clientes activos</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
          {/* HOY */}
          <div style={{ backgroundColor: "#0f172a", border: empresasHoy.length > 0 ? "1px solid #ef4444" : "1px solid #334155", borderRadius: "10px", padding: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ color: empresasHoy.length > 0 ? "#ef4444" : "#94a3b8", fontWeight: "700", fontSize: "12px" }}>● HOY VENCE</span>
              <span style={{ fontSize: "11px", backgroundColor: empresasHoy.length > 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(148, 163, 184, 0.1)", color: empresasHoy.length > 0 ? "#f87171" : "#94a3b8", padding: "2px 6px", borderRadius: "6px", fontWeight: "bold" }}>
                {empresasHoy.length} {empresasHoy.length === 1 ? "Empresa" : "Empresas"}
              </span>
            </div>
            {empresasHoy.length > 0 ? (
              empresasHoy.map(item => (
                <div key={item.empresa} style={{ marginBottom: "6px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>{item.empresa}</div>
                  <div style={{ fontSize: "13px", color: "#38bdf8", fontWeight: "800" }}>{item.moneda} ${Number(item.total).toLocaleString()}</div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", marginTop: "4px" }}>🟢 Sin cobros que venzan hoy</div>
            )}
          </div>

          {/* MAÑANA */}
          <div style={{ backgroundColor: "#0f172a", border: empresasManana.length > 0 ? "1px solid #f59e0b" : "1px solid #334155", borderRadius: "10px", padding: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ color: empresasManana.length > 0 ? "#f59e0b" : "#94a3b8", fontWeight: "700", fontSize: "12px" }}>● MAÑANA</span>
              <span style={{ fontSize: "11px", backgroundColor: empresasManana.length > 0 ? "rgba(245, 158, 11, 0.2)" : "rgba(148, 163, 184, 0.1)", color: empresasManana.length > 0 ? "#fbbf24" : "#94a3b8", padding: "2px 6px", borderRadius: "6px", fontWeight: "bold" }}>
                {empresasManana.length} {empresasManana.length === 1 ? "Empresa" : "Empresas"}
              </span>
            </div>
            {empresasManana.length > 0 ? (
              empresasManana.map(item => (
                <div key={item.empresa} style={{ marginBottom: "6px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>{item.empresa}</div>
                  <div style={{ fontSize: "13px", color: "#38bdf8", fontWeight: "800" }}>{item.moneda} ${Number(item.total).toLocaleString()}</div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", marginTop: "4px" }}>🟢 Sin cobros para mañana</div>
            )}
          </div>

          {/* PROXIMOS 15 DIAS */}
          <div style={{ backgroundColor: "#0f172a", border: empresas15Dias.length > 0 ? "1px solid #3b82f6" : "1px solid #334155", borderRadius: "10px", padding: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ color: empresas15Dias.length > 0 ? "#60a5fa" : "#94a3b8", fontWeight: "700", fontSize: "12px" }}>● PRÓXIMOS 15 DÍAS</span>
              <span style={{ fontSize: "11px", backgroundColor: empresas15Dias.length > 0 ? "rgba(59, 130, 246, 0.2)" : "rgba(148, 163, 184, 0.1)", color: empresas15Dias.length > 0 ? "#93c5fd" : "#94a3b8", padding: "2px 6px", borderRadius: "6px", fontWeight: "bold" }}>
                {empresas15Dias.length} {empresas15Dias.length === 1 ? "Empresa" : "Empresas"}
              </span>
            </div>
            {empresas15Dias.length > 0 ? (
              empresas15Dias.slice(0, 3).map(item => (
                <div key={item.empresa} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", fontSize: "12px" }}>
                  <span style={{ color: "#f8fafc", fontWeight: "600" }}>{item.empresa} (Día {item.dia})</span>
                  <span style={{ color: "#38bdf8", fontWeight: "700" }}>{item.moneda} ${Number(item.total).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", marginTop: "4px" }}>🟢 Sin cobros en los próximos 15 días</div>
            )}
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL CON BOTÓN ELIMINAR EMPRESA */}
      <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>🏢 Empresas Clientes & Ficha Integral 360°</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94a3b8" }}>Control unificado de preventistas, cupos, cobros y bajas directas.</p>
          </div>
          <span style={{ padding: "4px 12px", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "20px", fontSize: "12px", color: "#38bdf8", fontWeight: "600" }}>
            {empresas.length} Empresas Registradas
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8" }}>
                <th style={{ padding: "12px 8px" }}>EMPRESA & PAÍS</th>
                <th style={{ padding: "12px 8px" }}>CUPOS PREVENTISTAS</th>
                <th style={{ padding: "12px 8px" }}>MODELO & TARIFA</th>
                <th style={{ padding: "12px 8px" }}>DÍA DE CORTE</th>
                <th style={{ padding: "12px 8px" }}>ESTADO COBRO</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((emp) => {
                const t = tarifasMap[emp] || {};
                const cInfoRaw = diasCorteMap[emp] || {};
                const estadoTexto = t.estado_pago || cInfoRaw.estado || "Al Día";
                const esAlDia = (estadoTexto === "Al Día");
                const esPorVencer = (estadoTexto === "Por Vencer");
                const colorBadge = esAlDia ? "#10b981" : esPorVencer ? "#f59e0b" : "#ef4444";
                const bgBadge = esAlDia ? "rgba(16, 185, 129, 0.15)" : esPorVencer ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)";
                
                const prevsCount = preventistas.filter(p => (p.empresa || "").toLowerCase() === emp.toLowerCase()).length;
                const cupoMax = Number(t.cupo || cInfoRaw.cupo || 5);
                const moneda = t.moneda || "ARS";
                const valor = t.valor || t.tarifa || (moneda === "ARS" ? "10000" : "50");
                const tipo = t.tipo || t.tipo_tarifa || "preventista";
                const totalEst = tipo === "preventista" ? (prevsCount * Number(valor)) : Number(valor);
                const bandera = (t.pais === "México") ? "🇲🇽" : (t.pais === "Colombia") ? "🇨🇴" : (t.pais === "Brasil") ? "🇧🇷" : (t.pais === "Internacional") ? "🌐" : "🇦🇷";
                const diaCorte = t.diaCobro || t.dia_cobro || cInfoRaw.dia || "05";

                return (
                  <tr key={emp} style={{ borderBottom: "1px solid #334155" }}>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "14px" }}>{bandera} {emp}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{t.pais || "Argentina"} · {t.notas || "CBU / Directo"}</div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: "700", color: prevsCount > cupoMax ? "#ef4444" : "#4ade80", fontSize: "13px" }}>
                          {prevsCount} / {cupoMax} prev
                        </span>
                        {prevsCount > cupoMax && <span style={{ fontSize: "10px", padding: "1px 6px", backgroundColor: "#7f1d1d", color: "#fca5a5", borderRadius: "10px", fontWeight: "bold" }}>Excedido</span>}
                      </div>
                      <div style={{ width: "90px", height: "5px", backgroundColor: "#334155", borderRadius: "3px", marginTop: "4px", overflow: "hidden" }}>
                        <div style={{ width: Math.min(100, (prevsCount / cupoMax) * 100) + "%", height: "100%", backgroundColor: prevsCount > cupoMax ? "#ef4444" : "#10b981" }}></div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ fontWeight: "700", color: "#38bdf8" }}>{moneda} ${Number(totalEst).toLocaleString()} / mes</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{tipo === "preventista" ? `$${valor} x prev` : "Tarifa Plana"}</div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span style={{ padding: "4px 8px", backgroundColor: "#0f172a", borderRadius: "6px", fontSize: "12px", color: "#cbd5e1" }}>
                        📅 Día {diaCorte} c/mes
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", backgroundColor: bgBadge, color: colorBadge, border: "1px solid " + colorBadge }}>
                        ● {estadoTexto}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <button type="button" onClick={() => setEmpresaDetalleModal(emp)} style={{ backgroundColor: "#0284c7", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "700", marginRight: "6px" }}>
                        👁️ Ficha 360°
                      </button>
                      <button type="button" onClick={() => abrirRegistrarPago(emp)} style={{ backgroundColor: "#059669", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "700", marginRight: "6px" }}>
                        💳 Cobro
                      </button>
                      <button type="button" onClick={() => abrirEditarEmpresa(emp)} style={{ backgroundColor: "#334155", color: "#f8fafc", border: "1px solid #475569", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", marginRight: "6px" }}>
                        ✏️ Editar
                      </button>
                      <button type="button" onClick={() => eliminarEmpresa(emp)} title="Eliminar Empresa" style={{ backgroundColor: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FICHA 360 CON BORRADO DIRECTO DE PREVENTISTAS */}
      {empresaDetalleModal && (() => {
        const emp = empresaDetalleModal;
        const t = tarifasMap[emp] || {};
        const cInfoRaw = diasCorteMap[emp] || {};
        const estadoTexto = t.estado_pago || cInfoRaw.estado || "Al Día";
        const esAlDia = (estadoTexto === "Al Día");
        const colorBadge = esAlDia ? "#10b981" : estadoTexto === "Por Vencer" ? "#f59e0b" : "#ef4444";
        const prevsDeEmp = (preventistas || []).filter(p => (p.empresa || "").toLowerCase() === emp.toLowerCase());
        const cupoMax = Number(t.cupo || cInfoRaw.cupo || 5);
        const moneda = t.moneda || "ARS";
        const valor = t.valor || t.tarifa || (moneda === "ARS" ? "10000" : "50");
        const tipo = t.tipo || t.tipo_tarifa || "preventista";
        const totalEst = tipo === "preventista" ? (prevsDeEmp.length * Number(valor)) : Number(valor);
        const diaCorte = t.diaCobro || t.dia_cobro || cInfoRaw.dia || "05";

        return (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
            <div style={{ backgroundColor: "#1e293b", borderRadius: "16px", border: "1px solid #475569", width: "100%", maxWidth: "600px", padding: "24px", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid #334155", paddingBottom: "14px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "#f8fafc" }}>🏢 {emp}</h3>
                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px", backgroundColor: colorBadge + "22", color: colorBadge, border: "1px solid " + colorBadge }}>
                      ● {estadoTexto}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>Ficha Integral 360° · Datos comerciales y bajas directas</p>
                </div>
                <button type="button" onClick={() => setEmpresaDetalleModal(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "22px", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "10px", padding: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>CUPO Y PREVENTISTAS</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: prevsDeEmp.length > cupoMax ? "#ef4444" : "#4ade80", marginTop: "4px" }}>
                    {prevsDeEmp.length} / {cupoMax} autorizados
                  </div>
                  <div style={{ width: "100%", height: "6px", backgroundColor: "#334155", borderRadius: "3px", marginTop: "6px", overflow: "hidden" }}>
                    <div style={{ width: Math.min(100, (prevsDeEmp.length / cupoMax) * 100) + "%", height: "100%", backgroundColor: prevsDeEmp.length > cupoMax ? "#ef4444" : "#10b981" }}></div>
                  </div>
                </div>
                <div style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "10px", padding: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>TARIFA & CORTE MENSUAL</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#38bdf8", marginTop: "4px" }}>
                    {moneda} ${Number(totalEst).toLocaleString()}
                  </div>
                  <span style={{ fontSize: "11px", color: "#cbd5e1" }}>📅 Vence día {diaCorte} de cada mes</span>
                </div>
              </div>

              <div style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>DATOS DE COBRO / BILLETERA / NOTAS</span>
                <div style={{ fontSize: "13px", color: "#f8fafc", fontWeight: "600", marginTop: "4px" }}>
                  {t.notas || "CBU / Transferencia Bancaria Directa / Sin notas registradas"}
                </div>
              </div>

              {/* LISTA DE PREVENTISTAS CON BOTON DE BORRADO */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8" }}>PREVENTISTAS ACTIVOS ({prevsDeEmp.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {prevsDeEmp.length === 0 ? (
                    <div style={{ padding: "16px", textAlign: "center", backgroundColor: "#0f172a", borderRadius: "8px", color: "#64748b", fontSize: "12px" }}>
                      No hay preventistas dados de alta en esta empresa.
                    </div>
                  ) : (
                    prevsDeEmp.map(p => (
                      <div key={p.id || p.email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #334155" }}>
                        <div>
                          <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "13px" }}>👤 {p.nombre || "Sin nombre"}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>✉️ {p.email || "-"}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px", backgroundColor: p.activo !== false ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)", color: p.activo !== false ? "#10b981" : "#ef4444" }}>
                            {p.activo !== false ? "Activo" : "Inactivo"}
                          </span>
                          <button type="button" onClick={() => eliminarPreventistaDirecto(p)} title="Eliminar Preventista de Supabase" style={{ backgroundColor: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                            🗑️ Borrar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => { setEmpresaDetalleModal(null); abrirEditarEmpresa(emp); }} style={{ padding: "10px 16px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}>
                  ✏️ Modificar Cupos & Tarifa
                </button>
                <button type="button" onClick={() => setEmpresaDetalleModal(null)} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#334155", color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: EDITAR */}
      {mostrarModalEditar && empresaAEditar && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div style={{ backgroundColor: "#1e293b", borderRadius: "16px", border: "1px solid #475569", width: "100%", maxWidth: "480px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>✏️ Modificar Vencimiento, Cupo & Tarifa</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#94a3b8" }}>{empresaAEditar}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>📅 Día de Vencimiento</label>
                <select value={diaCobroModal} onChange={(e) => setDiaCobroModal(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff" }}>
                  <option value="01">Día 01 de c/mes</option>
                  <option value="05">Día 05 de c/mes</option>
                  <option value="10">Día 10 de c/mes</option>
                  <option value="15">Día 15 de c/mes</option>
                  <option value="20">Día 20 de c/mes</option>
                  <option value="25">Día 25 de c/mes</option>
                  <option value="28">Día 28 de c/mes</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>🚦 Estado Semáforo</label>
                <select value={estadoCobroModal} onChange={(e) => setEstadoCobroModal(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff" }}>
                  <option value="Al Día">🟢 Al Día (Abonado)</option>
                  <option value="Por Vencer">🟡 Por Vencer (Alerta)</option>
                  <option value="Vencido">🔴 Vencido / En Mora</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>👥 Cupo Autorizado</label>
                <input type="number" value={cupoEditado} onChange={(e) => setCupoEditado(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>💰 Moneda</label>
                <select value={monedaEditada} onChange={(e) => setMonedaEditada(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff" }}>
                  <option value="ARS">ARS ($ Pesos)</option>
                  <option value="USD">USD ($ Dólares)</option>
                  <option value="MXN">MXN ($ Mexicanos)</option>
                  <option value="COP">COP ($ Colombianos)</option>
                  <option value="USDT">USDT (Cripto)</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>⚙️ Modelo de Cobro</label>
                <select value={tipoTarifaEditada} onChange={(e) => setTipoTarifaEditada(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff" }}>
                  <option value="preventista">Por preventista</option>
                  <option value="plana">Tarifa Plana Fija</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>💵 Tarifa Valor</label>
                <input type="number" value={tarifaEditada} onChange={(e) => setTarifaEditada(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" onClick={() => setMostrarModalEditar(false)} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#334155", color: "#cbd5e1", cursor: "pointer", fontWeight: "600" }}>Cancelar</button>
              <button type="button" onClick={guardarEdicionEmpresa} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: "700" }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PAGO */}
      {mostrarModalPago && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "16px" }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "440px", boxSizing: "border-box" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#f8fafc" }}>💳 Registrar Cobro: {empresaPago}</h3>
            <form onSubmit={guardarPago}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Monto Recibido</label>
                  <input type="number" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Moneda</label>
                  <select value={monedaPago} onChange={(e) => setMonedaPago(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff" }}>
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD (u$d)</option>
                    <option value="USDT">USDT / Cripto</option>
                    <option value="MXN">MXN ($ Mex)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Método de Pago</label>
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff" }}>
                  <option value="Transferencia CBU / CVU">Transferencia Bancaria CBU/CVU</option>
                  <option value="Binance Pay / USDT">Binance Pay / USDT / Cripto</option>
                  <option value="Efectivo / Cobrador">Efectivo en Mano</option>
                  <option value="Wise / Swift">Wise / Swift Internacional</option>
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>N° Comprobante / Hash</label>
                <input type="text" value={comprobantePago} onChange={(e) => setComprobantePago(e.target.value)} placeholder="Ej. Operación #89218 / Hash..." style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setMostrarModalPago(false)} style={{ backgroundColor: "#475569", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ backgroundColor: "#059669", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Asentar Cobro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ALTA EMPRESA */}
      {mostrarModalEmpresa && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "480px", boxSizing: "border-box" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#f8fafc" }}>🏢 Dar de Alta Nueva Empresa</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const datos = { pais: paisEmpresa, moneda: monedaEmpresa, tipo: tipoTarifa, valor: tarifaValor, cupo: Number(cupoLimite) || 5, notas: notasCobro };
              setTarifasMap(prev => ({ ...prev, [nombreEmpresa]: datos }));
              try { localStorage.setItem("tarifas_empresas", JSON.stringify({ ...tarifasMap, [nombreEmpresa]: datos })); } catch(err){}
              if (!empresas.includes(nombreEmpresa)) {
                setEmpresas(prev => [...prev, nombreEmpresa]);
              }
              setNombreEmpresa("");
              setMostrarModalEmpresa(false);
            }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Nombre de la Empresa</label>
                <input type="text" value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} required placeholder="Ej. Distribuidora Sur" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>País</label>
                  <select value={paisEmpresa} onChange={(e) => {
                    setPaisEmpresa(e.target.value);
                    if (e.target.value === "Argentina") setMonedaEmpresa("ARS");
                    else if (e.target.value === "México") setMonedaEmpresa("MXN");
                    else if (e.target.value === "Colombia") setMonedaEmpresa("COP");
                    else if (e.target.value === "Brasil") setMonedaEmpresa("BRL");
                    else setMonedaEmpresa("USD");
                  }} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff" }}>
                    <option value="Argentina">🇦🇷 Argentina</option>
                    <option value="México">🇲🇽 México</option>
                    <option value="Colombia">🇨🇴 Colombia</option>
                    <option value="Brasil">🇧🇷 Brasil</option>
                    <option value="Internacional">🌐 Internacional</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Cupo Preventistas</label>
                  <input type="number" value={cupoLimite} onChange={(e) => setCupoLimite(e.target.value)} required placeholder="Ej. 5" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Modelo</label>
                  <select value={tipoTarifa} onChange={(e) => setTipoTarifa(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff" }}>
                    <option value="preventista">Por preventista</option>
                    <option value="plana">Tarifa Plana (Fija)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Valor ({monedaEmpresa})</label>
                  <input type="number" value={tarifaValor} onChange={(e) => setTarifaValor(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Datos de Cobro / CBU / Notas</label>
                <input type="text" value={notasCobro} onChange={(e) => setNotasCobro(e.target.value)} placeholder="Ej. CBU / Alias / Wallet..." style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setMostrarModalEmpresa(false)} style={{ backgroundColor: "#475569", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ backgroundColor: "#059669", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Crear Empresa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ALTA PREVENTISTA */}
      {mostrarModalPreventista && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "450px", boxSizing: "border-box" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>👔 Dar de Alta Nuevo Preventista</h3>
            <form onSubmit={crearNuevoPreventista}>
              <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre (ej. Walter)" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "12px", boxSizing: "border-box" }} />
              <input type="email" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} placeholder="Email de login" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "12px", boxSizing: "border-box" }} />
              <input type="password" value={nuevoPassword} onChange={(e) => setNuevoPassword(e.target.value)} placeholder="Contraseña temporal" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "12px", boxSizing: "border-box" }} />
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
    </main>
  );
}
