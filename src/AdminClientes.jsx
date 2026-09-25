import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function AdminClientes() {
  const [empresas, setEmpresas] = useState([]);
  const [empresasRegistros, setEmpresasRegistros] = useState([]);
  const [mensajeExitoAsignacion, setMensajeExitoAsignacion] = useState("");
  const [tituloAsignacion, setTituloAsignacion] = useState("➕ Asignar Nuevo Preventista");
  const [preventistas, setPreventistas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
  
  const [modalResetClave, setModalResetClave] = useState(null); // { usuario, nuevoPass: "" }
  const [modalCambiarEmail, setModalCambiarEmail] = useState(null); // { usuario, nuevoEmail: "" }
  const [nuevoRolEmpleado, setNuevoRolEmpleado] = useState("preventista");
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
    setCargando(true);
    try {
      const [perfilesResp, empresasResp, pagosResp] = await Promise.all([
        supabase.from("perfiles").select("*"),
        supabase.from("empresas").select("*").order("nombre"),
        supabase.from("pagos_empresas").select("*").order("fecha", { ascending: false })
      ]);

      if (perfilesResp.error) throw perfilesResp.error;
      if (empresasResp.error) throw empresasResp.error;
      if (pagosResp.error) console.warn("No se pudo cargar pagos:", pagosResp.error.message);

      const perfiles = perfilesResp.data || [];
      const empresasDB = empresasResp.data || [];
      setPreventistas(perfiles);
      setEmpresasRegistros(empresasDB);
      setEmpresas(empresasDB.map(e => e.nombre).filter(Boolean));

      const mapa = {};
      const dias = {};
      empresasDB.forEach(e => {
        mapa[e.nombre] = {
          id: e.id,
          pais: e.pais || "Argentina",
          moneda: e.moneda || "ARS",
          tipo: e.modelo_cobro || "preventista",
          tipo_tarifa: e.modelo_cobro || "preventista",
          valor: e.tarifa_pactada ?? 0,
          tarifa: e.tarifa_pactada ?? 0,
          cupo: e.cupo_preventistas ?? 5,
          diaCobro: String(e.dia_cobro ?? 5).padStart(2, "0"),
          dia_cobro: String(e.dia_cobro ?? 5).padStart(2, "0"),
          metodo_pago: e.metodo_pago || "",
          activo: e.activo !== false,
          abonado_hasta: e.abonado_hasta || null
        };
        dias[e.nombre] = {
          dia: String(e.dia_cobro ?? 5).padStart(2, "0"),
          estado: "Al Día",
          color: "#10b981",
          cupo: e.cupo_preventistas ?? 5
        };
      });
      setTarifasMap(mapa);
      setDiasCorteMap(dias);

      setHistorialPagos((pagosResp.data || []).map(p => ({
        ...p,
        fecha: p.fecha ? new Date(p.fecha).toLocaleString("es-AR") : "",
        ref: p.comprobante || "—",
        estado: "Confirmado"
      })));

      if (empresasDB.length > 0 && !empresasDB.some(e => e.nombre === empresaSeleccionada)) {
        setEmpresaSeleccionada(empresasDB[0].nombre);
      }
    } catch(err) {
      console.error(err);
      alert("No se pudieron cargar los datos del SuperAdmin: " + (err.message || "Error desconocido"));
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

  const guardarEdicionEmpresa = async () => {
    if (!empresaAEditar) return;
    try {
      const empresaDB = empresasRegistros.find(e => e.nombre === empresaAEditar);
      if (!empresaDB?.id) throw new Error("No encontré la empresa en Supabase");

      const cambios = {
        pais: paisEditado,
        moneda: monedaEditada,
        modelo_cobro: tipoTarifaEditada,
        tarifa_pactada: Number(tarifaEditada) || 0,
        cupo_preventistas: Number(cupoEditado) || 5,
        dia_cobro: Number(diaCobroModal) || 5
      };
      const { error } = await supabase.from("empresas").update(cambios).eq("id", empresaDB.id);
      if (error) throw error;
      await cargarDatos();
      setMostrarModalEditar(false);
      alert("✅ Empresa actualizada en Supabase.");
    } catch (err) {
      alert("Error al guardar empresa: " + (err.message || "Error desconocido"));
    }
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

  
  const handleResetClaveDirecto = async (e) => {
    e.preventDefault();
    if (!modalResetClave || !modalResetClave.usuario || !modalResetClave.nuevoPass) return;
    try {
      // Intenta actualizar via Supabase RPC o directo
      alert("⚠️ El cambio de contraseña todavía no está habilitado de forma segura. No se realizó ningún cambio.");
      setModalResetClave(null);
    } catch(err) {
      alert("Error al actualizar contraseña: " + err.message);
    }
  };

  const handleCambiarEmailDirecto = async (e) => {
    e.preventDefault();
    if (!modalCambiarEmail || !modalCambiarEmail.usuario || !modalCambiarEmail.nuevoEmail) return;
    try {
      const { error } = await supabase.from("perfiles").update({ email: modalCambiarEmail.nuevoEmail }).eq("id", modalCambiarEmail.usuario.id);
      if (error) throw error;
      alert("Email actualizado con éxito a: " + modalCambiarEmail.nuevoEmail);
      setModalCambiarEmail(null);
      if (typeof cargarPreventistas === "function") cargarPreventistas();
    } catch(err) {
      alert("Error al actualizar email: " + err.message);
    }
  };
  
  const guardarPago = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("pagos_empresas").insert([{
        empresa: empresaPago,
        monto: Number(montoPago) || 0,
        moneda: monedaPago,
        metodo: metodoPago,
        comprobante: comprobantePago || null,
        fecha: new Date().toISOString()
      }]);
      if (error) throw error;
      await cargarDatos();
      setMostrarModalPago(false);
      setComprobantePago("");
      alert("✅ Pago registrado en Supabase.");
    } catch (err) {
      alert("Error al registrar pago: " + (err.message || "Error desconocido"));
    }
  };

  const crearNuevoPreventista = async (e) => {
    e.preventDefault();
    try {
      if (!nuevoEmail || !nuevoPassword) {
        alert("Por favor completá email y contraseña");
        return;
      }
      // 1. Creamos la cuenta real de login en Supabase Authentication
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: (nuevoEmail || '').trim().toLowerCase(),
        password: nuevoPassword,
        options: {
          data: {
            nombre: nuevoNombre,
            empresa: empresaSeleccionada,
            rol: nuevoRolEmpleado || "preventista"
          }
        }
      });
      if (authErr && !authErr.message.toLowerCase().includes("already registered")) {
        throw authErr;
      }

      const uid = authData?.user?.id || (typeof crypto !== "undefined" ? crypto.randomUUID() : "prev-" + Date.now());

      // 2. Guardamos o vinculamos en la tabla perfiles
      const nuevo = {
        id: uid,
        nombre: nuevoNombre,
        email: (nuevoEmail || '').trim().toLowerCase(),
        empresa: empresaSeleccionada,
        empresa_id: empresasRegistros.find(e => e.nombre === empresaSeleccionada)?.id || null,
        rol: nuevoRolEmpleado || "preventista",
        activo: true
      };

      const { error: perfilErr } = await supabase.from("perfiles").upsert([nuevo]);
      if (perfilErr) console.warn("Aviso en perfiles:", perfilErr.message);

      setPreventistas(prev => [...prev.filter(p => p.email !== nuevo.email), nuevo]);
      setNuevoNombre("");
      setNuevoEmail("");
      setNuevoPassword("");
      setMostrarModalPreventista(false);
      alert(nuevoRolEmpleado === "supervisor" ? "🎉 Supervisor creado con éxito." : "🎉 Preventista creado con éxito. Ya puede ingresar desde la app móvil.");
    } catch (err) {
      alert("Error al dar de alta: " + (err.message || "Verificá los datos"));
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
            {mensajeExitoAsignacion && (
              <div style={{ backgroundColor: "rgba(16, 185, 129, 0.2)", border: "1px solid #10b981", color: "#10b981", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>✓</span> {mensajeExitoAsignacion}
              </div>
            )}

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

      {/* MODAL FICHA 360 CON GESTIÓN DE SUPERVISORES Y PREVENTISTAS */}
      {empresaDetalleModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", maxWidth: "880px", width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            
            {/* Header Ficha 360 */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "18px" }}>
                  {empresaDetalleModal.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>{empresaDetalleModal}</h3>
                  <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700" }}>● Cuenta Activa · Multi-Tenant Aislado</span>
                </div>
              </div>
              <button onClick={() => setEmpresaDetalleModal(null)} style={{ background: "#f1f5f9", border: "none", width: "36px", height: "36px", borderRadius: "50%", cursor: "pointer", fontSize: "18px", color: "#64748b", fontWeight: "bold" }}>✕</button>
            </div>

            <div style={{ padding: "24px" }}>
              
              {/* 1. SECCIÓN SUPERVISORES */}
              <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "16px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                    👔 SUPERVISOR RESPONSABLE
                  </h4>
                  <button onClick={() => { setEmpresaSeleccionada(empresaDetalleModal); setNuevoRolEmpleado("supervisor"); setNuevoNombre(""); setNuevoEmail(""); setNuevoPassword(""); setMostrarModalPreventista(true); }} style={{ backgroundColor: "#0284c7", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                    + Nuevo Supervisor
                  </button>
                </div>

                {preventistas.filter(p => p.empresa === empresaDetalleModal && p.rol === "supervisor").length === 0 ? (
                  <div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "13px", backgroundColor: "#fff", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                    Sin supervisor registrado para esta empresa. Podés crearlo con el botón superior.
                  </div>
                ) : (
                  preventistas.filter(p => p.empresa === empresaDetalleModal && p.rol === "supervisor").map(sup => (
                    <div key={sup.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: "12px 16px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                      <div>
                        <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "14px" }}>👤 {sup.nombre}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>✉️ {sup.email} · Rol: Supervisor</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => setModalResetClave({ usuario: sup, nuevoPass: "" })} style={{ backgroundColor: "#e0f2fe", color: "#0369a1", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>🔑 Reset Clave</button>
                        <button onClick={() => setModalCambiarEmail({ usuario: sup, nuevoEmail: sup.email || "" })} style={{ backgroundColor: "#f1f5f9", color: "#475569", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>✉️ Email</button>
                        <button onClick={() => eliminarPreventista(sup.id)} style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>🗑️ Borrar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 2. SECCIÓN PREVENTISTAS EN CALLE */}
              <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                      🚶 PREVENTISTAS EN CALLE
                    </h4>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {preventistas.filter(p => p.empresa === empresaDetalleModal && p.rol !== "supervisor" && p.rol !== "superadmin").length} activos en zona
                    </span>
                  </div>
                  <button onClick={() => { setEmpresaSeleccionada(empresaDetalleModal); setNuevoRolEmpleado("preventista"); setNuevoNombre(""); setNuevoEmail(""); setNuevoPassword(""); setMostrarModalPreventista(true); }} style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                    + Nuevo Preventista
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {preventistas.filter(p => p.empresa === empresaDetalleModal && p.rol !== "supervisor" && p.rol !== "superadmin").length === 0 ? (
                    <div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "13px", backgroundColor: "#fff", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                      No hay preventistas registrados en esta empresa.
                    </div>
                  ) : (
                    preventistas.filter(p => p.empresa === empresaDetalleModal && p.rol !== "supervisor" && p.rol !== "superadmin").map(prev => (
                      <div key={prev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div>
                          <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "13px" }}>👤 {prev.nombre}</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>✉️ {prev.email}</div>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => setModalResetClave({ usuario: prev, nuevoPass: "" })} style={{ backgroundColor: "#e0f2fe", color: "#0369a1", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>🔑 Clave</button>
                          <button onClick={() => setModalCambiarEmail({ usuario: prev, nuevoEmail: prev.email || "" })} style={{ backgroundColor: "#f1f5f9", color: "#475569", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>✉️ Email</button>
                          <button onClick={() => eliminarPreventista(prev.id)} style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>🗑️ Borrar</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Botón Cerrar Ficha */}
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setEmpresaDetalleModal(null)} style={{ backgroundColor: "#0f172a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>
                  Listo / Cerrar Ficha 360°
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ALTA EMPRESA */}
      {mostrarModalEmpresa && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20000, padding: "16px" }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "480px", boxSizing: "border-box" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#f8fafc" }}>🏢 Dar de Alta Nueva Empresa</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const nombre = nombreEmpresa.trim();
                if (!nombre) return;
                const { error } = await supabase.from("empresas").insert([{
                  nombre,
                  pais: paisEmpresa,
                  moneda: monedaEmpresa,
                  modelo_cobro: tipoTarifa,
                  tarifa_pactada: Number(tarifaValor) || 0,
                  cupo_preventistas: Number(cupoLimite) || 5,
                  metodo_pago: notasCobro || null,
                  activo: true
                }]);
                if (error) throw error;
                setNombreEmpresa("");
                setNotasCobro("");
                setMostrarModalEmpresa(false);
                await cargarDatos();
                alert("✅ Empresa creada en Supabase.");
              } catch (err) {
                alert("Error al crear empresa: " + (err.message || "Error desconocido"));
              }
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
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20000, padding: "16px" }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "450px", boxSizing: "border-box" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>{nuevoRolEmpleado === "supervisor" ? "👔 Dar de Alta Nuevo Supervisor" : "🚶 Dar de Alta Nuevo Preventista"}</h3>
            <form onSubmit={crearNuevoPreventista}>
              <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre (ej. Walter)" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "12px", boxSizing: "border-box" }} />
              <input type="email" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} placeholder="Email de login" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "12px", boxSizing: "border-box" }} />
              <input type="password" value={nuevoPassword} onChange={(e) => setNuevoPassword(e.target.value)} placeholder="Contraseña temporal" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#fff", marginBottom: "12px", boxSizing: "border-box" }} />
              <div style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#0f172a", color: "#cbd5e1", marginBottom: "20px", boxSizing: "border-box", fontSize: "13px" }}>
                Empresa: <strong style={{ color: "#fff" }}>{empresaSeleccionada}</strong>
              </div>
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
