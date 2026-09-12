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
  const [comercios, setComercios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [comercioSeleccionado, setComercioSeleccionado] = useState(null);
  const [modoManejo, setModoManejo] = useState(false);
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
    if (!window.confirm('Eliminar este comercio?')) return;
    const { error } = await supabase.from('comercios').delete().eq('id', id);
    if (!error) {
      setComercios(comercios.filter((c) => c.id !== id));
      setComercioSeleccionado(null);
      return;
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

  return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#090d16', color: '#fff' }}>
        <header style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid #1e293b', backgroundColor: '#090d16' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>📍 RutaComercio</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{comercios.length} comercios cargados</p>
          </div>
          <button
            onClick={() => setModoManejo(true)}
            style={{ padding: '8px 14px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🚗 Modo Manejo
          </button>
        </div>
        <button
          onClick={() => { if (!jornadaActiva) { iniciarJornada(); } else { cerrarJornada(); } }}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: jornadaActiva ? '#1e293b' : '#10b981', border: '1px solid #334155', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{jornadaActiva ? '⏱️ Jornada: ' + tiempoTranscurrido : '▶ Iniciar Jornada'}</span>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>{jornadaActiva ? 'Tocar para cerrar' : 'Comenzar día'}</span>
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 80px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cargando ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '30px' }}>Cargando comercios...</p>
        ) : listaFiltrada.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', marginTop: '30px' }}>No se encontraron comercios</p>
        ) : (
          listaFiltrada.map((c) => (
            <div
              key={c.id}
              onClick={() => setComercioSeleccionado(c)}
              style={{ padding: '14px', background: '#131b2e', borderRadius: '12px', border: '1px solid #1e293b', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#f8fafc' }}>{c.nombre || 'Comercio sin nombre'}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#38bdf8' }}>{c.rubro || 'General'} {c.direccion ? '• ' + c.direccion : ''}</p>
              </div>
              <span style={{ fontSize: '18px', color: '#64748b' }}>›</span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={agregarComercioInmediato}
        style={{ position: 'fixed', bottom: '24px', right: '20px', width: '56px', height: '56px', borderRadius: '28px', background: '#2563eb', color: '#fff', border: 'none', fontSize: '26px', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >{textoBotonAgregar || "➕ AGREGAR COMERCIO"}</button>
    </div>
  );
}
