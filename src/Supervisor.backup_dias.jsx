import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/dist/images/marker-shadow.png',
});

function obtenerIconoColor(colorHex, numero) {
  return L.divIcon({
    className: 'custom-pin-stop',
    html: '<div style="background-color:' + colorHex + '; color:#fff; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.4);">' + (numero || '') + '</div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12]
  });
}

function AutoCentradoMapa({ puntos, puntoActivo }) {
  const map = useMap();
  useEffect(() => {
    if (puntoActivo) {
      const lat = puntoActivo.ubicacion_exacta_latitud || puntoActivo.latitud;
      const lng = puntoActivo.ubicacion_exacta_longitud || puntoActivo.longitud;
      if (lat && lng) map.flyTo([lat, lng], 16, { duration: 1 });
      return;
    }
    if (!puntos || puntos.length === 0) return;
    const validos = puntos
      .map(c => [c.ubicacion_exacta_latitud || c.latitud, c.ubicacion_exacta_longitud || c.longitud])
      .filter(p => p[0] && p[1] && !isNaN(p[0]) && !isNaN(p[1]));
    if (validos.length > 0) {
      map.fitBounds(L.latLngBounds(validos), { padding: [40, 40], maxZoom: 15 });
    }
  }, [puntos, puntoActivo, map]);
  return null;
}

export default function Supervisor() {
  const [comercios, setComercios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('TODAS');
  const [filtroPreventista, setFiltroPreventista] = useState('Walter');
  const [comercioActivo, setComercioActivo] = useState(null);
  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [filtroDia, setFiltroDia] = useState('TODOS');
  const [secuenciaParadas, setSecuenciaParadas] = useState([]);
  const [guardandoRuta, setGuardandoRuta] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('comercios')
        .select('*')
        .order('id', { ascending: false });
      if (!error && data) {
        setComercios(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  const comerciosPreventista = (comercios || []).filter(function(item) {
    if (!filtroPreventista || filtroPreventista === 'TODOS') return true;
    const asignado = item.preventista || item.vendedor || 'Walter';
    return asignado.toLowerCase() === filtroPreventista.toLowerCase();
  });

  const comerciosDia = comerciosPreventista.filter(function(c) {
    if (filtroDia === 'TODOS') return true;
    return (c.dia_visita || '').toUpperCase() === filtroDia.toUpperCase();
  });

  const paradasActuales = secuenciaParadas.length > 0 ? secuenciaParadas : comerciosDia;

  const moverParada = (index, direccion) => {
    const nueva = [...paradasActuales];
    const target = index + direccion;
    if (target < 0 || target >= nueva.length) return;
    const temp = nueva[index];
    nueva[index] = nueva[target];
    nueva[target] = temp;
    setSecuenciaParadas(nueva);
  };

  const fijarComoPartida = (index) => {
    if (index === 0) return;
    const nueva = [...paradasActuales];
    const partida = nueva.splice(index, 1)[0];
    nueva.unshift(partida);
    setSecuenciaParadas(nueva);
  };

  const guardarSecuenciaEnSupabase = async () => {
    setGuardandoRuta(true);
    try {
      const promesas = paradasActuales.map((c, idx) => {
        return supabase.from('comercios').update({ orden_visita: idx + 1 }).eq('id', c.id);
      });
      await Promise.all(promesas);
      alert('✅ Hoja de ruta guardada y sincronizada correctamente');
    } catch (err) {
      alert('Error al sincronizar: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setGuardandoRuta(false);
    }
  };

  const coordenadasRuta = paradasActuales
    .map(c => [c.ubicacion_exacta_latitud || c.latitud, c.ubicacion_exacta_longitud || c.longitud])
    .filter(p => p[0] && p[1] && !isNaN(p[0]) && !isNaN(p[1]));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ height: '56px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🏢</span>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>RutaComercio Web</h1>
          <span style={{ fontSize: '11px', backgroundColor: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>Elifiant</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a href="/pagos" style={{ padding: '6px 12px', backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            💳 Portal de Pagos <span style={{ color: '#38bdf8', fontSize: '11px' }}>12 d. rest.</span>
          </a>
          <button onClick={async () => { await supabase.auth.signOut(); localStorage.clear(); window.location.href = '/'; }} style={{ padding: '6px 12px', backgroundColor: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            ✕ Salir
          </button>
        </div>
      </header>

      <div style={{ padding: '10px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #1e293b', backgroundColor: '#0c1322' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '14px' }}>👔</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>Walter · Preventista</div>
            <div style={{ fontSize: '10px', color: '#10b981' }}>● En Vivo · GPS sync hace 4 min</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '6px', padding: '4px 10px', fontSize: '11px' }}>
            <span style={{ color: '#94a3b8' }}>Paradas: </span>
            <strong style={{ color: '#38bdf8' }}>{paradasActuales.length} asignadas</strong>
          </div>
          <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '6px', padding: '4px 10px', fontSize: '11px' }}>
            <span style={{ color: '#94a3b8' }}>Con Foto: </span>
            <strong style={{ color: '#10b981' }}>{paradasActuales.filter(c => c.foto_url).length}</strong>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {['TODOS', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'].map(d => (
            <button key={d} onClick={() => setFiltroDia(d)} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: filtroDia === d ? '#2563eb' : '#1e293b', color: filtroDia === d ? '#fff' : '#94a3b8' }}>
              {d}
            </button>
          ))}
          <button onClick={() => setMostrarMapa(!mostrarMapa)} style={{ marginLeft: '6px', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #334155', backgroundColor: mostrarMapa ? '#1e293b' : '#0284c7', color: '#fff', cursor: 'pointer' }}>
            {mostrarMapa ? 'Ocultar Mapa' : '🗺️ Ver Mapa (340px)'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '14px 20px', display: 'flex', gap: '16px', flexDirection: 'row' }}>
        <div style={{ flex: 1.1, backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 160px)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>Secuenciador de Hoja de Ruta</h2>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Reordená el recorrido de Walter para hoy</span>
            </div>
            <button onClick={guardarSecuenciaEnSupabase} disabled={guardandoRuta} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              {guardandoRuta ? 'Guardando...' : '💾 Guardar y Sincronizar'}
            </button>
          </div>

          <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b' }}>
            <input type="text" placeholder="🔍 Buscar comercio en la ruta..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '6px 10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {paradasActuales
              .filter(c => (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) || (c.direccion || '').toLowerCase().includes(busqueda.toLowerCase()))
              .map((c, idx) => (
                <div key={c.id} onClick={() => setComercioActivo(c)} style={{ padding: '8px 10px', backgroundColor: comercioActivo?.id === c.id ? '#1e293b' : '#131b2e', border: comercioActivo?.id === c.id ? '1px solid #38bdf8' : '1px solid #1e293b', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: idx === 0 ? '#10b981' : '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{c.nombre || c.direccion || ('Comercio #' + c.id)}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{c.direccion || 'Sin dirección registrada'} {c.dia_visita ? '• ' + c.dia_visita : ''}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={(e) => { e.stopPropagation(); fijarComoPartida(idx); }} title="Fijar como punto de salida" style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer' }}>
                      🏁 Partida
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moverParada(idx, -1); }} disabled={idx === 0} style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>
                      ▲
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moverParada(idx, 1); }} disabled={idx === paradasActuales.length - 1} style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', cursor: idx === paradasActuales.length - 1 ? 'default' : 'pointer', opacity: idx === paradasActuales.length - 1 ? 0.3 : 1 }}>
                      ▼
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {mostrarMapa && (
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ height: '340px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1e293b', position: 'relative' }}>
              <MapContainer center={[-34.6037, -58.3816]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AutoCentradoMapa puntos={paradasActuales} puntoActivo={comercioActivo} />
                {coordenadasRuta.length > 1 && (
                  <Polyline positions={coordenadasRuta} color="#2563eb" weight={3} dashArray="6, 6" />
                )}
                {paradasActuales.map((c, idx) => {
                  const lat = c.ubicacion_exacta_latitud || c.latitud;
                  const lng = c.ubicacion_exacta_longitud || c.longitud;
                  if (!lat || !lng) return null;
                  const colorPin = idx === 0 ? '#10b981' : '#2563eb';
                  return (
                    <Marker key={c.id} position={[lat, lng]} icon={obtenerIconoColor(colorPin, idx + 1)}>
                      <Popup>
                        <div style={{ color: '#0f172a', fontSize: '12px' }}>
                          <strong>#{idx + 1} {c.nombre || c.direccion}</strong>
                          <p style={{ margin: '2px 0 0 0', color: '#64748b' }}>{c.direccion || 'Sin dirección'}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {comercioActivo && (
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {comercioActivo.foto_url ? (
                    <img src={comercioActivo.foto_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '6px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏪</div>
                  )}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13px', color: '#fff' }}>{comercioActivo.nombre || comercioActivo.direccion}</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>{comercioActivo.rubro || 'General'} • {comercioActivo.telefono || 'Sin teléfono'}</p>
                  </div>
                </div>
                {comercioActivo.telefono && (
                  <a href={'https://wa.me/' + comercioActivo.telefono.replace(/\D/g, '')} target="_blank" rel="noreferrer" style={{ padding: '6px 12px', backgroundColor: '#22c55e', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' }}>
                    💬 WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}