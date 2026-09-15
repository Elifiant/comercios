import Supervisor from './Supervisor';
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const Marcar = () => null;
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MarcadorArrastrable({ posicion, setPosicion }) {
  useMapEvents({
    click(e) {
      setPosicion([e.latlng.lat, e.latlng.lng]);
    },
  });
  return posicion ? (
    <Marker
      position={posicion}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const m = e.target;
          setPosicion([m.getLatLng().lat, m.getLatLng().lng]);
        },
      }}
    />
  ) : null;
}

export default function App() {
  



   const [sesion, setSesion] = useState(null);
  const [perfil, setPerfil] = useState(null);

  const cargarPerfil = async (session) => {
    if (!session?.user) {
      setPerfil(null);
      return;
    }
    try {
      const { data } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      if (data) {
        setPerfil(data);
      } else {
        setPerfil({
          nombre: session.user.email?.split("@")[0] || "Usuario",
          empresa: "General"
        });
      }
    } catch (e) {
      console.warn("Error cargando perfil:", e);
    }
  };
 const [cargandoAuth, setCargandoAuth] = useState(true);
 const [emailLogin, setEmailLogin] = useState('');
 const [passwordLogin, setPasswordLogin] = useState('');
 const [errorLogin, setErrorLogin] = useState(null);
 const [recordarSesion, setRecordarSesion] = useState(true);
 const [comercios, setComercios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [comercioSeleccionado, setComercioSeleccionado] = useState(null);
  const [modoManejo, setModoManejo] = useState(false);
   useEffect(() => {
 supabase.auth.getSession().then(({ data: { session } }) => {
 setSesion(session); cargarPerfil(session);
 setCargandoAuth(false);
 });
 const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
 setSesion(session); cargarPerfil(session);
 setCargandoAuth(false);
 });
 return () => subscription.unsubscribe();
 }, []);

 const handleLogin = async (e) => {
 e.preventDefault();
 setErrorLogin(null);
 const { error } = await supabase.auth.signInWithPassword({ email: emailLogin, password: passwordLogin });
 if (error) setErrorLogin('Credenciales incorrectas o usuario no registrado.');
 };

  const handleCerrarSesion = async () => {
 try { await supabase.auth.signOut(); } catch(e) {}
 localStorage.clear();
 sessionStorage.clear();
 setSesion(null);
 };
 const [textoBotonAgregar, setTextoBotonAgregar] = useState('➕ AGREGAR COMERCIO');
  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [nuevaPosicion, setNuevaPosicion] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [jornadaActiva, setJornadaActiva] = useState(() => localStorage.getItem("rutacomercio_jornada_activa") === "true");
  const [horaInicioJornada, setHoraInicioJornada] = useState(() => localStorage.getItem('hora_inicio_jornada') || '');
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('0m');
  // Cronometro de jornada en vivo
  useEffect(() => {
    let timer;
    const actualizar = () => {
      const inicioTimestamp = localStorage.getItem('timestamp_inicio_jornada');
      if (jornadaActiva && inicioTimestamp) {
        const diffMs = Date.now() - parseInt(inicioTimestamp, 10);
        const minsTotal = Math.floor(diffMs / 60000);
        const horas = Math.floor(minsTotal / 60);
        const mins = minsTotal % 60;
        setTiempoTranscurrido(horas > 0 ? `${horas}h ${mins}m` : `${mins}m`);
      }
    };
    if (jornadaActiva) {
      actualizar();
      timer = setInterval(actualizar, 30000); // actualiza cada 30s
    }
    return () => clearInterval(timer);
  }, [jornadaActiva]);
  
  const [comercioCercano, setComercioCercano] = useState(null);
  const [distanciaCercano, setDistanciaCercano] = useState(null);
  const [posicionActual, setPosicionActual] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const wId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosicionActual([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.log("GPS status:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
//     if (typeof window !== 'undefined' && window.location.pathname.includes('supervisor')) {
//     return <Supervisor />;

  return () => navigator.geolocation.clearWatch(wId);
  }, []);

  const cargarComercios = async (perfilActivo) => {
    setCargando(true);
    const p = perfilActivo || perfil;
    let query = supabase.from("comercios").select("*");
    
    if (p && p.empresa) {
      query = query.eq("empresa", p.empresa);
    }
    if (p && p.rol === "preventista" && p.nombre) {
      query = query.eq("preventista", p.nombre);
    }
    
    const { data, error } = await query.order("id", { ascending: false });
    if (!error && data) setComercios(data);
    setCargando(false);
  };

  useEffect(() => {
    if (perfil && perfil.empresa) {
      cargarComercios(perfil);
    }
  }, [perfil]);

  const reproducirAlerta = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (modoManejo && comercios.length > 0) {
          let masCercano = null;
          let menorDistancia = Infinity;
          comercios.forEach((c) => {
            const lat = c.ubicacion_exacta_latitud || c.latitud;
            const lng = c.ubicacion_exacta_longitud || c.longitud;
            if (lat && lng) {
              const d = Math.hypot(coords.lat - lat, coords.lng - lng) * 111320;
              if (d < menorDistancia) {
                menorDistancia = d;
                masCercano = { ...c, distancia: Math.round(d) };
              }
            }
          });
          if (masCercano && masCercano.distancia <= 50) {
            if (!comercioCercano || comercioCercano.id !== masCercano.id) {
              setComercioCercano(masCercano);
              reproducirAlerta();
            }
          } else {
            setComercioCercano(null);
          }
        }
      },
      (err) => console.log(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [modoManejo, comercios, comercioCercano]);

  
  const iniciarJornada = () => {
    const timestampInicio = Date.now().toString();
    localStorage.setItem("rutacomercio_jornada_activa", "true");
    localStorage.setItem("rutacomercio_inicio_jornada", timestampInicio);
    if (typeof setInicioTimestamp === "function") setInicioTimestamp(timestampInicio);
    setJornadaActiva(true);
    setHoraInicioJornada(h);
    setTiempoTranscurrido('0m');
    try {
      localStorage.setItem('jornada_activa', 'true');
      localStorage.setItem('hora_inicio_jornada', h);
      localStorage.setItem('timestamp_inicio_jornada', ahora.getTime().toString());
    } catch(e) {}
  };

  const cerrarJornada = () => {
    const inicioTimestamp = localStorage.getItem('timestamp_inicio_jornada');
    let resumen = '0m';
    if (inicioTimestamp) {
      const diffMs = Date.now() - parseInt(inicioTimestamp, 10);
      const minsTotal = Math.floor(diffMs / 60000);
      const horas = Math.floor(minsTotal / 60);
      const mins = minsTotal % 60;
      resumen = horas > 0 ? (horas + 'h ' + mins + 'm') : (mins + 'm');
    }
    alert('🏁 Jornada cerrada. Tiempo total de trabajo: ' + resumen);
    setJornadaActiva(false);
    setHoraInicioJornada('');
    setTiempoTranscurrido('0m');
    try {
      localStorage.removeItem('jornada_activa');
      localStorage.removeItem('hora_inicio_jornada');
      localStorage.removeItem('timestamp_inicio_jornada');
    } catch(e) {}
  };

   const agregarComercioInmediato = async () => {
    const lat = (posicionActual && posicionActual[0]) ? posicionActual[0] : -34.719;
    const lng = (posicionActual && posicionActual[1]) ? posicionActual[1] : -58.265;
    const cod = Math.floor(1000 + Math.random() * 9000);

    const nuevo = {
      nombre: "Comercio #" + cod,
                  latitud: lat,
      longitud: lng,
      ubicacion_exacta_latitud: lat,
      ubicacion_exacta_longitud: lng,
      fecha: new Date().toISOString(),
      notas: "Registrado con un toque",
      empresa: (typeof perfil !== "undefined" && perfil?.empresa) ? perfil.empresa : "Elifiant",
      preventista: (typeof perfil !== "undefined" && perfil?.nombre) ? perfil.nombre : "Walter"
    };

    try {
      const { data, error } = await supabase.from("comercios").insert([nuevo]).select();
      if (!error && data && data.length > 0) {
        setComercios((prev) => [data[0], ...prev]);
        try { if (typeof reproducirAlerta === "function") reproducirAlerta(); } catch(e){}
        if (typeof setTextoBotonAgregar === "function") {
          setTextoBotonAgregar("✅ ¡GUARDADO! #" + cod);
          setTimeout(() => setTextoBotonAgregar("➕ AGREGAR COMERCIO"), 2500);
        }
      } else {
        console.error("Error Supabase:", error);
      }
    } catch (err) {
      console.error("Excepción:", err);
    }
  };

  const listaFiltrada = (comercios || []).filter((c) => {
    if (!busqueda) return true;
    const txt = (c.nombre || "" + c.id + "" + (c.rubro || "")).toLowerCase();
    return txt.includes(busqueda.toLowerCase());
  });


    
  // 1. Subir Foto de Fachada a Storage
  const subirFotoFachada = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !comercioSeleccionado) return;
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = "foto_" + comercioSeleccionado.id + "_" + Date.now() + "." + ext;
      const { data, error } = await supabase.storage.from("fotos_comercios").upload(fileName, file);
      if (error) throw error;
      const { data: publicData } = supabase.storage.from("fotos_comercios").getPublicUrl(fileName);
      const url = publicData.publicUrl;
      const { error: dbError } = await supabase.from("comercios").update({ foto_url: url }).eq("id", comercioSeleccionado.id);
      if (dbError) throw dbError;
      setComercioSeleccionado(prev => ({ ...prev, foto_url: url }));
      setComercios(prev => prev.map(item => item.id === comercioSeleccionado.id ? { ...item, foto_url: url } : item));
      alert("✅ Foto subida exitosamente");
    } catch (err) {
      console.error("Error subiendo foto:", err);
      alert("Error subiendo foto: " + (err.message || "desconocido"));
    }
  };

  // 2. Guardar Edición en Supabase
  const guardarEdicion = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!comercioSeleccionado) return;
    try {
      const actualizacion = {
        nombre: comercioSeleccionado.nombre || "Comercio sin nombre",
        direccion: comercioSeleccionado.direccion || "",
        rubro: comercioSeleccionado.rubro || "General",
        telefono: comercioSeleccionado.telefono || "",
        notas: comercioSeleccionado.notas || ""
      };
      const { error } = await supabase.from("comercios").update(actualizacion).eq("id", comercioSeleccionado.id);
      if (error) throw error;
      setComercios(prev => prev.map(item => item.id === comercioSeleccionado.id ? { ...item, ...actualizacion } : item));
      alert("✅ Comercio guardado exitosamente");
    } catch (err) {
      console.error("Error al guardar edición:", err);
      alert("Error al guardar: " + (err.message || "desconocido"));
    }
  };

  // 3. Eliminar Comercio
  const eliminarComercio = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este comercio?")) return;
    try {
      const { error } = await supabase.from("comercios").delete().eq("id", id);
      if (error) throw error;
      setComercios(prev => prev.filter(c => c.id !== id));
      setComercioSeleccionado(null);
      alert("🗑️ Comercio eliminado correctamente");
    } catch (err) {
      console.error("Error eliminando comercio:", err);
      alert("Error al eliminar: " + (err.message || "desconocido"));
    }
  };


  
  // Función para contactar al comercio por WhatsApp
  const enviarWhatsApp = (telefono) => {
    if (!telefono) {
      alert("Este comercio no tiene un teléfono registrado.");
      return;
    }
    const numLimpio = String(telefono).replace(/[^0-9]/g, "");
    if (!numLimpio) {
      alert("El número de teléfono registrado no es válido.");
      return;
    }
    const url = "https://wa.me/" + numLimpio + "?text=" + encodeURIComponent("Hola, me comunico de RutaComercio.");
    window.open(url, "_blank");
  };


  
  // Vista del Editor de Ubicación en Mapa con Pin Arrastrable
   if (cargandoAuth) { return ( <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "sans-serif" }}> Iniciando RutaComercio... </div> ); } if (!sesion) { return ( <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "sans-serif", boxSizing: "border-box" }}> <div style={{ width: "100%", maxWidth: "360px", backgroundColor: "#1e293b", padding: "28px 24px", borderRadius: "16px", border: "1px solid #334155", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}> <div style={{ textAlign: "center", marginBottom: "24px" }}> <div style={{ width: "52px", height: "52px", borderRadius: "12px", backgroundColor: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "26px", marginBottom: "12px" }}> 📍 </div> <h2 style={{ margin: 0, color: "#fff", fontSize: "20px", fontWeight: "700" }}>RutaComercio</h2> <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "13px" }}>Ingreso seguro para preventistas</p> </div> <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}> <div> <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "600" }}>Correo electrónico</label> <input type="email" required value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} placeholder="ej: tu_correo@empresa.com" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", fontSize: "14px", boxSizing: "border-box" }} /> </div> <div> <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "600" }}>Contraseña</label> <input type="password" required value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", fontSize: "14px", boxSizing: "border-box" }} /> </div> {errorLogin && ( <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#f87171", fontSize: "12px", textAlign: "center" }}> {errorLogin} </div> )} <button type="submit" style={{ marginTop: "6px", padding: "13px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#fff", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.4)" }} > Iniciar Sesión </button> </form> </div> </div> ); } if (modoManejo) { const latM = (posicionActual && posicionActual[0]) ? posicionActual[0] : -34.719; const lngM = (posicionActual && posicionActual[1]) ? posicionActual[1] : -58.265; return ( <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a", color: "#fff", fontFamily: "sans-serif" }}> <header style={{ padding: "12px 16px", background: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155" }}> <div style={{ display: "flex", alignItems: "center", gap: "8px" }}> <span style={{ fontSize: "20px" }}>🚗</span> <span style={{ fontWeight: "800", fontSize: "15px" }}>Modo Manejo Activo</span> </div> <button onClick={() => setModoManejo(false)} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }} > ✕ Salir </button> </header> {comercioCercano && ( <div style={{ padding: "10px 16px", background: "#16a34a", color: "#fff", textAlign: "center", fontWeight: "700", fontSize: "14px" }}> 🔔 Cerca de: {comercioCercano.nombre || ("Comercio #" + comercioCercano.id)} ({comercioCercano.distancia}m) </div> )} <div style={{ flex: 1, position: "relative" }}> <MapContainer center={[latM, lngM]} zoom={16} style={{ height: "100%", width: "100%" }}> <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /> {posicionActual && <Marker position={posicionActual} />} {comercios.map((com) => { const cLat = com.ubicacion_exacta_latitud || com.latitud; const cLng = com.ubicacion_exacta_longitud || com.longitud; if (!cLat || !cLng) return null; return ( <Marker key={com.id} position={[cLat, cLng]}> <Popup>{com.nombre || "Comercio #" + com.id}</Popup> </Marker> ); })} </MapContainer> </div> <div style={{ position: "fixed", top: "155px", left: "16px", right: "16px", zIndex: 1000, pointerEvents: "auto" }}> <button onClick={agregarComercioInmediato} style={{ width: "100%", minHeight: "75px", padding: "16px", backgroundColor: "#1d4ed8", color: "#ffffff", border: "4px solid #93c5fd", borderRadius: "18px", fontSize: "20px", fontWeight: "900", cursor: "pointer", letterSpacing: "1px", boxShadow: "0 10px 25px rgba(0,0,0,0.65)", textTransform: "uppercase" }} > {textoBotonAgregar} </button> </div> </div> ); } 

 if (editandoUbicacion && comercioSeleccionado) {
    const latInicial = Number(comercioSeleccionado.ubicacion_exacta_latitud || comercioSeleccionado.latitud || -34.719);
    const lngInicial = Number(comercioSeleccionado.ubicacion_exacta_longitud || comercioSeleccionado.longitud || -58.264);

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a", color: "#fff", fontFamily: "sans-serif" }}>
        <header style={{ padding: "14px 16px", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Ajustar Ubicación Exacta</h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>Arrastrá el pin o tocá el mapa en la puerta del local</p>
          </div>
          <button
            onClick={() => setEditandoUbicacion(false)}
            style={{ background: "#334155", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", cursor: "pointer", fontWeight: "600" }}
          >
            ✕ Volver
          </button>
        </header>

        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer center={[latInicial, lngInicial]} zoom={18} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MarcadorArrastrable
              posicion={[latInicial, lngInicial]}
              setPosicion={(nuevaPos) => {
                setComercioSeleccionado((prev) => ({
                  ...prev,
                  ubicacion_exacta_latitud: nuevaPos[0],
                  ubicacion_exacta_longitud: nuevaPos[1],
                  latitud: nuevaPos[0],
                  longitud: nuevaPos[1]
                }));
              }}
            />
          </MapContainer>
        </div>
      </div>
    );
  }

    if (comercioSeleccionado) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#fff', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
        <header style={{ padding: '14px 16px', background: '#131b2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🏪</span>
            <span style={{ fontSize: '15px', fontWeight: 'bold' }}>Ficha de Comercio</span>
          </div>
          <button
            onClick={() => setComercioSeleccionado(null)}
            style={{ padding: '6px 14px', borderRadius: '8px', background: '#334155', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            ✕ Volver
          </button>
        </header>

        <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
          {comercioSeleccionado.foto_url && (
            <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b' }}>
              <img
                src={comercioSeleccionado.foto_url}
                alt="Fachada"
                style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <label style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', borderRadius: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
              📷 {comercioSeleccionado.foto_url ? 'Cambiar Foto' : 'Tomar Foto'}
              <input type="file" accept="image/*" capture="environment" onChange={subirFotoFachada} style={{ display: 'none' }} />
            </label>
            {comercioSeleccionado.telefono && (
              <button
                onClick={enviarWhatsApp}
                style={{ flex: 1, padding: '12px', background: '#16a34a', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                💬 WhatsApp
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setEditandoUbicacion(true)}
            style={{ width: '100%', padding: '12px', marginBottom: '20px', background: '#1e293b', color: '#38bdf8', borderRadius: '10px', border: '1px solid #334155', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            📍 Ajustar Ubicación en Mapa
          </button>

          <form onSubmit={guardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre</label>
              <input
                type="text"
                value={comercioSeleccionado.nombre || ''}
                onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, nombre: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#131b2e', border: '1px solid #334155', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                placeholder="Nombre del comercio"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rubro</label>
              <input
                type="text"
                value={comercioSeleccionado.rubro || ''}
                onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, rubro: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#131b2e', border: '1px solid #334155', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                placeholder="Rubro (Kiosco, Almacén, etc.)"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dirección</label>
              <input
                type="text"
                value={comercioSeleccionado.direccion || ''}
                onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, direccion: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#131b2e', border: '1px solid #334155', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                placeholder="Dirección aproximada"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Teléfono (WhatsApp)</label>
              <input
                type="text"
                value={comercioSeleccionado.telefono || ''}
                onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, telefono: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#131b2e', border: '1px solid #334155', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                placeholder="Ej: 1123456789"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notas</label>
              <textarea
                value={comercioSeleccionado.notas || ''}
                onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, notas: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#131b2e', border: '1px solid #334155', color: '#fff', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px' }}
                placeholder="Comentarios, listas de precios solicitadas, etc."
              />
            </div>

            <button
              type="submit"
              style={{ width: '100%', padding: '14px', marginTop: '12px', background: '#2563eb', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
            >
              💾 Guardar Cambios
            </button>

            <button
              type="button"
              onClick={() => eliminarComercio(comercioSeleccionado.id)}
              style={{ width: '100%', padding: '14px', marginTop: '4px', background: '#dc2626', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
            >
              🗑️ Eliminar Comercio
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#fff", fontFamily: "sans-serif" }}>
      <header style={{ padding: "14px 16px", backgroundColor: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: "0 2px 8px rgba(37,99,235,0.4)" }}>
              📍
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#fff", letterSpacing: "0.5px" }}>RutaComercio</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>👤 {(typeof perfil !== "undefined" && perfil && perfil.nombre) ? perfil.nombre : "Walter"}</span>
                <span>·</span>
                <span style={{ color: "#38bdf8", fontWeight: "600" }}>{(typeof perfil !== "undefined" && perfil && perfil.empresa) ? perfil.empresa : "Elifiant"}</span>
              </div>
            </div>
          </div>
         <button onClick={handleCerrarSesion} style={{ backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            ✕ Salir
          </button> 
        </header>

        {/* TABLERO JORNADA Y MODO MANEJO */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
          {/* Tarjeta Jornada */}
          <div style={{ backgroundColor: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Jornada</span>
              <span style={{ fontSize: "10px", color: jornadaActiva ? "#4ade80" : "#94a3b8", fontWeight: "bold" }}>
                {jornadaActiva ? "● En vivo" : "○ Inactiva"}
              </span>
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>
              {jornadaActiva ? tiempoTranscurrido : "0m"}
            </div>
            <button
              onClick={() => {
                if (jornadaActiva) {
                    setJornadaActiva(false);
                    localStorage.removeItem("rutacomercio_jornada_activa");
                    localStorage.removeItem("rutacomercio_inicio_jornada");
                    if (typeof setInicioTimestamp === "function") setInicioTimestamp(null);
                  } else {
                    const timestampInicio = Date.now().toString();
                    setJornadaActiva(true);
                    localStorage.setItem("rutacomercio_jornada_activa", "true");
                    localStorage.setItem("rutacomercio_inicio_jornada", timestampInicio);
                    if (typeof setInicioTimestamp === "function") setInicioTimestamp(timestampInicio);
                  const ahora = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  localStorage.setItem("jornada_activa", "true");
                  localStorage.setItem("timestamp_inicio_jornada", Date.now().toString());
                  localStorage.setItem("hora_inicio_jornada", ahora);
                  setHoraInicioJornada(ahora);
                }
              }}
              style={{ width: "100%", marginTop: "6px", padding: "6px 0", backgroundColor: jornadaActiva ? "#dc2626" : "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
            >
              {jornadaActiva ? "Finalizar" : "Iniciar"}
            </button>
          </div>

          {/* Tarjeta Modo Manejo */}
          <div style={{ backgroundColor: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Navegación</span>
              <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: "bold" }}>GPS Activo</span>
            </div>
            <button
              onClick={() => setModoManejo(true)}
              style={{ width: "100%", marginTop: "10px", padding: "10px 0", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 4px 12px rgba(37,99,235,0.4)" }}
            >
              🚗 Modo Manejo
            </button>
          </div>
        </div>

        {/* FRANJA DE MÉTRICAS DIARIAS DEL PREVENTISTA */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "10px" }}>
          <div style={{ backgroundColor: "#1e293b", padding: "8px 6px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Visitas</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#38bdf8", marginTop: "2px" }}>
              {jornadaActiva ? "3 / 18" : "0 / 18"}
            </div>
            <div style={{ fontSize: "9px", color: "#64748b" }}>{jornadaActiva ? "En curso" : "Meta del día"}</div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "8px 6px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Venta Hoy</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#4ade80", marginTop: "2px" }}>
              {jornadaActiva ? "$ 148.5K" : "$ 0"}
            </div>
            <div style={{ fontSize: "9px", color: "#64748b" }}>Acumulado</div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "8px 6px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Efectividad</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#facc15", marginTop: "2px" }}>
              {jornadaActiva ? "44%" : "0%"}
            </div>
            <div style={{ fontSize: "9px", color: "#64748b" }}>Ruta diaria</div>
          </div>
        </div>

        {/* BUSCADOR */}
        <div style={{ marginTop: "12px", position: "relative" }}>
          <input
            type="text"
            placeholder="🔍 Buscar comercio por nombre o ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", backgroundColor: "#0b1329", border: "1px solid #334155", borderRadius: "8px", color: "#fff", fontSize: "13px", boxSizing: "border-box", outline: "none" }}
          />
        </div>

      {/* LISTADO DE COMERCIOS */}
      <main style={{ flex: 1, overflowY: "auto", padding: "12px 16px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Comercios Asignados ({listaFiltrada.length})
          </span>
        </div>

        {cargando ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Cargando comercios...</div>
        ) : listaFiltrada.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: "14px" }}>No se encontraron comercios</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {listaFiltrada.map((c) => (
              <div
                key={c.id}
                onClick={() => setComercioSeleccionado(c)}
                style={{ backgroundColor: "#1e293b", padding: "12px 14px", borderRadius: "10px", border: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "transform 0.1s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {c.foto_url ? (
                    <img src={c.foto_url} alt="Local" style={{ width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover", border: "1px solid #475569" }} />
                  ) : (
                    <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "#0b1329", border: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                      🏪
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px", color: "#f8fafc" }}>
                      {c.nombre || "Comercio #" + c.id}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                      {c.rubro || "General"} {c.direccion ? "· " + c.direccion : ""}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "18px", color: "#64748b", paddingLeft: "8px" }}>›</span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* BOTÓN FLOTANTE REGISTRAR COMERCIO */}
      <button
        onClick={agregarComercioInmediato}
        style={{ position: "fixed", bottom: "20px", right: "20px", width: "56px", height: "56px", borderRadius: "28px", backgroundColor: "#2563eb", color: "#fff", border: "none", fontSize: "26px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(37,99,235,0.5)", cursor: "pointer", zIndex: 40 }}
      >
        +
      </button>
    </div>
  );
}
