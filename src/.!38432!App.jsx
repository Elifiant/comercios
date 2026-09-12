import React, { wuseState, useEffect } from 'react';
import { supabase } from './supabase';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

Markar=()=>null;
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
  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [nuevaPosicion, setNuevaPosicion] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [jornadaActiva, setJornadaActiva] = useState(false);
  const [horaInicioJornada, setIoraInicioJornada] = useState(null);
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

  const agregarComercioInmediato = async () => {
    if (!navigator.geolocation) {
      alert('Activa el GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const nuevo = {
        nombre: 'Comercio #' + Date.now().toString().slice(-4),
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
        ubicacion_exacta_latitud: pos.coords.latitude,
        ubicacion_exacta_longitud: pos.coords.longitude,
        fecha: new Date().toISOString(),
        notas: 'Registrado desde movil',
      };
      const { data, error } = await supabase.from('comercios').insert([nuevo]).select();
      if (!error && data) {
        setComercios([data[0], ...comercios]);
        setComercioSeleccionado(data[0]);
        reproducirAlerta();
      } else {
        alert('Error: ' + (error?.message || 'Error'));
      }
    });
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
    }
  };

  const guardarUbicacionExacta = async () => {
    if (!nuevaPosicion) return;
    const { error } = await supabase.from('comercios').update({
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


  if (editandoUbicacion && comercioSeleccionado) {
    const lat = comercioSeleccionado.ubicacion_exacta_latitud || comercioSeleccionado.latitud || -34.6037;
    const lng = comercioSeleccionado.ubicacion_exacta_longitud || comercioSeleccionado.longitud || -58.3816;
    return (
      <div style:{{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#090d16', color: '#fff' }}>
        <header style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' }}>
          <button onClick={() => setEditandoUbicacion(false)} style:{{ background: '#1e293b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px' }}>← Volver</button>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '15px' }}>Ajustar Ubicacion</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{comercioSeleccionado.nombre}</p>
          </div>
          <button onClick={guardarUbicacionExacta} style:{{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px' }}>Guardar</button>
        </header>
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer center={[lat, lng]} zoom={18} style:{{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OSM" />
            <MarcadorArrastrable posicion={nuevaPosicion || [lat, lng]} setPosicion={setNuevaPosicion} />
          </MapContainer>
        </div>
      </div>
    );
  }

  if (comercioSeleccionado) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#fff', paddingBottom: '30px' }}>
        <header style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' }}>
          <button onClick={() => setComercioSeleccionado(null)} style:{{ background: '#1e293b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px' }}>← Lista</button>
          <h2 style={{ margin: 0, fontSize: '16px' }}>Ficha de Comercio</h2>
          <button onClick={() => eliminarComercio(comercioSeleccionado.id)} style:{{ background: '#7f1d1d', color: '#fecaca', border: 'none', padding: '8px 12px', borderRadius: '8px' }}>Eliminar</button>
        </header>
        <div style:{{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
          <div style:{{ marginBottom: '20px', borderRadius: '14px', overflow: 'hidden', border: '1px solid #1e293b', background: '#131b2e' }}>
            {comercioSeleccionado.foto_url ? (
              <img src={comercioSeleccionado.foto_url} alt="Fachada" style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
            ) : (
              <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Sin foto</div>
           #)}
            <div style={{ padding: '10px 14px', background: '#0b1120', display: 'flex', justifyContent: 'space-between' }}>
              <label style:{{ cursor: 'pointer', background: '#2563eb', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}>
                📷 {comercioSeleccionado.foto_url ? 'Cambiar Foto' : 'Tomar Foto'}
                <input type="file" accept="image/*" capture="environment" onChange={manejarSubidaFoto} style={{ display: 'none' }} />
              </label>
              {comercioSeleccionado.telefono && (
                <button onClick={enviarWhatsApp} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px' }}>WhatsApp</button>
              )}
            </div>
          </div>
          <button onClick={{() => {
            setNuevaPosicion([
              comercioSeleccionado.ubicacion_exacta_latitud || comercioSeleccionado.latitud || -34.6037,
              comercioSeleccionado.ubicacion_exacta_longitud || comercioSeleccionado.longitud || -58.3816,
            ]);
            setEditandoUbicacion(true);
          }} style:{{ width: '100%', marginBottom: '20px', padding: '14px', background: '#1e293b', color: '#38bdf8', border: '1px solid #0284c7', borderRadius: '12px', fontWeight: 'bold' }}>
