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
  if (typeof window !== 'undefined' && window.location.pathname.includes('supervisor')) {
    return <Supervisor />;
  }


  useEffect(() => {
    if (!navigator.geolocation) return;
    const wId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosicionActual([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.log("GPS status:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(wId);
  }, []);

   const [sesion, setSesion] = useState(null);
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
 setSesion(session);
 setCargandoAuth(false);
 });
 const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
 setSesion(session);
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
 await supabase.auth.signOut();
 };
 const [textoBotonAgregar, setTextoBotonAgregar] = useState('➕ AGREGAR COMERCIO');
  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [nuevaPosicion, setNuevaPosicion] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [jornadaActiva, setJornadaActiva] = useState(false);
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

  const cargarComercios = async () => {
    setCargando(true);
    const { data, error } = await supabase.from('comercios').select('*').order('id', { ascending: false });
    if (!error && data) setComercios(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarComercios();
  }, []);

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
    const ahora = new Date();
    const h = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs';
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
    setTextoBotonAgregar('⏳ Guardando...');

    const guardarEnSupabase = async (lat, lng, notaExtra) => {
      const cod = Date.now().toString().slice(-4);
      const nuevo = {
        nombre: 'Comercio #' + cod,
        latitud: lat,
        longitud: lng,
        ubicacion_exacta_latitud: lat,
        ubicacion_exacta_longitud: lng,
        fecha: new Date().toISOString(),
        notas: notaExtra || 'Registrado en Modo Manejo',
      };
      const { data, error } = await supabase.from('comercios').insert([nuevo]).select();
      if (!error && data) {
        setComercios((prev) => [data[0], ...prev]);
        try { if (typeof reproducirAlerta === 'function') reproducirAlerta(); } catch(e){}
        setTextoBotonAgregar('✅ ¡GUARDADO! #' + cod);
        setTimeout(() => setTextoBotonAgregar('➕ AGREGAR COMERCIO'), 3000);
      } else {
        setTextoBotonAgregar('⚠️ Error al guardar');
        setTimeout(() => setTextoBotonAgregar('➕ AGREGAR COMERCIO'), 3000);
      }
    };

    if (!navigator.geolocation) {
      // Fallback si no hay soporte de geolocalización
      await guardarEnSupabase(-34.719, -58.265, 'Registro prueba (sin GPS)');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await guardarEnSupabase(pos.coords.latitude, pos.coords.longitude, 'Registrado con GPS móvil');
      },
      async (err) => {
        // Fallback si da timeout o error en Mac: toma la posición actual del estado si existe o la última coordenada
        console.warn('GPS tardó o bloqueado, usando ubicación estimada para prueba:', err.message);
        const latFallback = (typeof posicion !== 'undefined' && posicion && posicion[0]) ? posicion[0] : -34.719;
        const lngFallback = (typeof posicion !== 'undefined' && posicion && posicion[1]) ? posicion[1] : -58.265;
        await guardarEnSupabase(latFallback, lngFallback, 'Registrado (ubicación estimada)');
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('comercios').update({
      nombre: comercioSeleccionado.nombre,
      rubro: comercioSeleccionado.rubro,
      telefono: comercioSeleccionado.telefono,
      direccion: comercioSeleccionado.direccion,
      notas: comercioSeleccionado.notas,
      foto_url: comercioSeleccionado.foto_url,
    }).eq('id', comercioSeleccionado.id);
    if (!error) {
      setComercios(comercios.map((c) => (c.id === comercioSeleccionado.id ? comercioSeleccionado : c)));
      alert('Guardado');
    }
  };

  const eliminarComercio = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este comercio?')) return;
    try {
      const { error } = await supabase.from('comercios').delete().eq('id', id);
      if (error) throw error;
      setComercios(comercios.filter((c) => c.id !== id));
      setComercioSeleccionado(null);
      alert('Comercio eliminado con éxito');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar: ' + (err.message || 'Desconocido'));
    }
  };

  const guardarUbicacionExacta = async () => {
    if (!nuevaPosicion) return;
    const { error } = await supabase.from('comercios').update({
      nombre: comercioSeleccionado.nombre,
      ubicacion_exacta_latitud: nuevaPosicion[0],
      ubicacion_exacta_longitud: nuevaPosicion[1],
    }).eq('id', comercioSeleccionado.id);
    if (!error) {
      const act = { ...comercioSeleccionado, ubicacion_exacta_latitud: nuevaPosicion[0], ubicacion_exacta_longitud: nuevaPosicion[1] };
      setComercioSeleccionado(act);
      setComercios(comercios.map((c) => (c.id === act.id ? act : c)));
      setEditandoUbicacion(false);
      alert('Ubicacion actualizada');
    }
  };

  const manejarSubidaFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !comercioSeleccionado) return;
    try {
      const ext = file.name.split('.').pop();
      const path = 'fachadas/' + comercioSeleccionado.id + '-' + Date.now() + '.' + ext;
      const { error: upErr } = await supabase.storage.from('fotos_comercios').upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('fotos_comercios').getPublicUrl(path);
      await supabase.from('comercios').update({ foto_url: data.publicUrl }).eq('id', comercioSeleccionado.id);
      const mod = { ...comercioSeleccionado, foto_url: data.publicUrl };
      setComercioSeleccionado(mod);
      setComercios(comercios.map((c) => (c.id === mod.id ? mod : c)));
      alert('Foto guardada');
    } catch (err) {
      alert('Error foto: ' + err.message);
    }
  };

    const subirFotoFachada = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !comercioSeleccionado) return;
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = 'fachadas/' + comercioSeleccionado.id + '-' + Date.now() + '.' + ext;
      const { error: upErr } = await supabase.storage.from('fotos_comercios').upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('fotos_comercios').getPublicUrl(path);
      if (data && data.publicUrl) {
        await supabase.from('comercios').update({ foto_url: data.publicUrl }).eq('id', comercioSeleccionado.id);
        const mod = { ...comercioSeleccionado, foto_url: data.publicUrl };
        setComercioSeleccionado(mod);
        setComercios(comercios.map((c) => (c.id === comercioSeleccionado.id ? mod : c)));
        alert('Foto guardada con éxito');
      }
    } catch (err) {
      console.error(err);
      alert('Error al subir foto: ' + (err.message || 'Desconocido'));
    }
  };

  const enviarWhatsApp = () => {
    if (!comercioSeleccionado) return;
    const tel = (comercioSeleccionado.telefono || '').replace(/\D/g, '');
    const texto = encodeURI('Hola ' + (comercioSeleccionado.nombre || '') + ', te envio la lista de precios de RutaComercio.');
    window.open('https://wa.me/' + tel + '?text=' + texto, '_blank');
  };

  const listaFiltrada = comercios.filter((c) => {
    const t = busqueda.toLowerCase();
    return (c.nombre || '').toLowerCase().includes(t) || (c.rubro || '').toLowerCase().includes(t) || (c.direccion || '').toLowerCase().includes(t);
  });

  
      if (cargandoAuth) { return (<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",color:"#fff",fontFamily:"sans-serif"}}>🛡️ Iniciando RutaComercio...</div>); }

 if (sesion === null) { return (<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",padding:"20px",fontFamily:"sans-serif"}}><div style={{background:"#fff",width:"100%",maxWidth:"380px",borderRadius:"16px",padding:"28px 24px",boxShadow:"0 20px 25px rgba(0,0,0,0.5)"}}><div style={{textAlign:"center",marginBottom:"20px"}}><span style={{background:"#eff6ff",color:"#1d4ed8",padding:"4px 12px",borderRadius:"999px",fontSize:"12px",fontWeight:"bold"}}>🛡️ Servidor Seguro RutaComercio</span><h2 style={{margin:"12px 0 4px 0",fontSize:"22px",color:"#0f172a"}}>Bienvenido</h2><p style={{margin:0,fontSize:"13px",color:"#64748b"}}>Acceso exclusivo de preventa</p></div><form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:"12px"}}><div><label style={{display:"block",fontSize:"12px",fontWeight:"bold",color:"#334155",marginBottom:"4px"}}>CORREO</label><input type="email" required value={emailLogin} onChange={(e)=>setEmailLogin(e.target.value)} placeholder="ejemplo@elifiant.com" style={{width:"100%",padding:"12px",borderRadius:"8px",border:"1px solid #cbd5e1",fontSize:"14px",boxSizing:"border-box"}}/></div><div><label style={{display:"block",fontSize:"12px",fontWeight:"bold",color:"#334155",marginBottom:"4px"}}>CONTRASEÑA</label><input type="password" required value={passwordLogin} onChange={(e)=>setPasswordLogin(e.target.value)} placeholder="••••••••" style={{width:"100%",padding:"12px",borderRadius:"8px",border:"1px solid #cbd5e1",fontSize:"14px",boxSizing:"border-box"}}/></div>{errorLogin && (<div style={{padding:"8px",background:"#fef2f2",color:"#b91c1c",borderRadius:"6px",fontSize:"12px",textAlign:"center"}}>{errorLogin}</div>)}<button type="submit" style={{marginTop:"8px",padding:"14px",background:"#2563eb",color:"#fff",border:"none",borderRadius:"10px",fontSize:"15px",fontWeight:"bold",cursor:"pointer"}}>Ingresar a RutaComercio</button></form><div style={{marginTop:"16px",textAlign:"center",fontSize:"11px",color:"#94a3b8"}}>RutaComercio v2.4 · Seguridad Encriptada Multi-Tenant</div></div></div>); }

 if (editandoUbicacion && comercioSeleccionado) {
    const posInicial = [
      Number(comercioSeleccionado.ubicacion_exacta_latitud || comercioSeleccionado.latitud || -34.719),
      Number(comercioSeleccionado.ubicacion_exacta_longitud || comercioSeleccionado.longitud || -58.265)
    ];

    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0b1120', color: '#fff' }}>
        <header style={{ padding: '12px 16px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#f8fafc' }}>Ajustar Ubicación</h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Arrastrá el pin hasta la puerta del local</p>
          </div>
          <button
            onClick={() => setEditandoUbicacion(false)}
            style={{ background: '#334155', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕ Volver
          </button>
        </header>

        <div style={{ flex: 1, position: 'relative', width: '100%' }}>
          <MapContainer center={posInicial} zoom={18} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarcadorArrastrable
              posicion={posInicial}
              setPosicion={(nuevaPos) => {
                actualizarUbicacionComercio(nuevaPos);
              }}
            />
          </MapContainer>
        </div>

        <div style={{ padding: '16px', background: '#0f172a', borderTop: '1px solid #1e293b' }}>
          <button
            type="button"
            onClick={() => {
              setEditandoUbicacion(false);
            }}
            style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ✓ Confirmar y Volver a la Ficha
          </button>
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

if (modoManejo) {
    const centroDefecto = posicionActual || (comercios.length > 0 && comercios[0].latitud ? [comercios[0].latitud, comercios[0].longitud] : [-34.6037, -58.3816]);
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#090d16', color: '#fff', fontFamily: 'sans-serif' }}>
        {/* Cabecera compacta de Modo Manejo */}
        <header style={{ padding: '10px 16px', background: '#131b2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 'bold' }}>🚗 Modo Manejo</span>
            <p style={{ margin: 0, fontSize: '11px', color: '#38bdf8' }}>GPS en vivo • Alerta de cercanía</p>
          </div>
          <button
            onClick={() => setModoManejo(false)}
            style={{ padding: '6px 14px', borderRadius: '8px', background: '#334155', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            ✕ Salir
          </button>
        </header>

        {/* BOTÓN GIGANTE ARRIBA DEL MAPA (fácil de tocar al manejar sin scrollear) */}
        <div style={{ padding: '10px 14px 6px 14px', background: '#090d16' }}>
          <button
            onClick={agregarComercioInmediato}
            style={{
              width: '100%',
              height: '72px',
              borderRadius: '16px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              fontSize: '19px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 6px 20px rgba(37,99,235,0.5)',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '24px' }}>➕</span> AGREGAR COMERCIO AQUÍ
          </button>
        </div>

        {/* Tarjeta de alerta de cercanía */}
        <div style={{ padding: '0 14px 8px 14px', background: '#090d16' }}>
          <div style={{
            padding: '10px 12px',
            background: comercioCercano ? 'rgba(234,179,8,0.18)' : '#131b2e',
            border: comercioCercano ? '1px solid #eab308' : '1px solid #1e293b',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {comercioCercano ? (
              <div style={{ flex: 1, paddingRight: '10px' }}>
                <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#eab308', fontWeight: 'bold' }}>
                  🔔 COMERCIO CERCANO {distanciaCercano ? ' (a ' + distanciaCercano + 'm)' : ''}:
                </p>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', color: '#fff' }}>
                  {comercioCercano.nombre || comercioCercano.direccion || ('Comercio #' + (comercioCercano.id || ''))}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                  {comercioCercano.rubro || 'General'}
                </p>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>🛣️ RECORRIENDO RUTA</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Aviso sonoro automático al aproximarse a comercios</p>
              </div>
            )}

            {comercioCercano && (
              <button
                onClick={() => {
                  setComercioSeleccionado(comercioCercano);
                  setModoManejo(false);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#eab308',
                  color: '#000',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                ✏️ Ver Ficha
              </button>
            )}
          </div>
        </div>

        {/* MAPA INTERACTIVO OCUPANDO TODO EL ESPACIO RESTANTE */}
        <div style={{ flex: 1, width: '100%', position: 'relative', background: '#0f172a' }}>
          <MapContainer center={centroDefecto} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {posicionActual && (
              <Marker position={posicionActual}>
                <Popup>📍 Tu ubicación actual</Popup>
              </Marker>
            )}
            {comercios.map((c) => {
              const lat = c.ubicacion_exacta_latitud || c.latitud;
              const lng = c.ubicacion_exacta_longitud || c.longitud;
              if (!lat || !lng) return null;
              const etiqueta = c.nombre || c.direccion || ('Comercio #' + c.id);
              return (
                <Marker key={c.id} position={[lat, lng]}>
                  <Popup>
                    <strong>{etiqueta}</strong><br/>
                    {c.rubro || 'General'}<br/>
                    <button
                      onClick={() => {
                        setComercioSeleccionado(c);
                        setModoManejo(false);
                      }}
                      style={{ marginTop: '6px', padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                    >
                      Ver Ficha
                    </button>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    );
  }

  

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#0b1329", color: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* CABECERA CON PERFIL DE WALTER */}
      <header style={{ padding: "14px 16px 12px", backgroundColor: "#0f172a", borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "16px", color: "#fff", boxShadow: "0 2px 8px rgba(37,99,235,0.4)" }}>
              W
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontWeight: "700", fontSize: "15px", color: "#fff" }}>Walter</span>
                <span style={{ fontSize: "10px", backgroundColor: "#1e3a8a", color: "#60a5fa", padding: "1px 6px", borderRadius: "10px", fontWeight: "600", textTransform: "uppercase" }}>Elifiant</span>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Preventa Móvil · Campo</div>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            ✕ Salir
          </button>
        </div>

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
                  localStorage.removeItem("jornada_activa");
                  localStorage.removeItem("timestamp_inicio_jornada");
                  localStorage.removeItem("hora_inicio_jornada");
                } else {
                  setJornadaActiva(true);
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
      </header>

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
