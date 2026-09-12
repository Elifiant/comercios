import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/dist/images/marker-shadow.png',
});

const COLORES_PREVENTISTAS = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

function obtenerIconoColor(colorHex) {
  return L.divIcon({
    className: 'custom-pin-preventista',
    html: `<div style="background-color: ${colorHex}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10]
  });
}

function AutoCentradoMapa({ comercios, comercioActivo }) {
  const map = useMap();

  useEffect(() => {
    if (comercioActivo) {
      const lat = comercioActivo.ubicacion_exacta_latitud || comercioActivo.latitud;
      const lng = comercioActivo.ubicacion_exacta_longitud || comercioActivo.longitud;
      if (lat && lng) {
        map.flyTo([lat, lng], 17, { duration: 1.2 });
      }
      return;
    }

    if (!comercios || comercios.length === 0) return;
    const puntosValidos = comercios
      .map(c => [c.ubicacion_exacta_latitud || c.latitud, c.ubicacion_exacta_longitud || c.longitud])
      .filter(p => p[0] && p[1] && !isNaN(p[0]) && !isNaN(p[1]));

    if (puntosValidos.length > 0) {
      const bounds = L.latLngBounds(puntosValidos);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [comercios, comercioActivo, map]);

  return null;
}

export default function Supervisor() {
  const [comercios, setComercios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('TODAS');
  const [filtroRubro, setFiltroRubro] = useState('TODOS');
  const [filtroPreventista, setFiltroPreventista] = useState('TODOS');
  const [comercioActivo, setComercioActivo] = useState(null);

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

  const empresasEncontradas = Array.from(new Set(comercios.map(c => c.empresa || 'Elifiant')));
  const listaEmpresas = ['TODAS', ...empresasEncontradas];

  const preventistasEncontrados = Array.from(new Set(comercios.map(c => c.preventista || 'Alex')));
  const listaPreventistas = ['TODOS', ...preventistasEncontrados];

  const mapaColores = {};
  preventistasEncontrados.forEach((prev, idx) => {
    mapaColores[prev] = COLORES_PREVENTISTAS[idx % COLORES_PREVENTISTAS.length];
  });

  const exportarCSV = () => {
    if (comercios.length === 0) return;
    const encabezados = ['ID', 'Nombre', 'Empresa', 'Preventista', 'Rubro', 'Direccion', 'Telefono', 'Latitud', 'Longitud', 'Tiene_Foto', 'Fecha'];
    const filas = listaFiltrada.map(c => [
      c.id,
      '"' + (c.nombre || '').replace(/"/g, '""') + '"',
      '"' + (c.empresa || 'Elifiant').replace(/"/g, '""') + '"',
      '"' + (c.preventista || 'Alex').replace(/"/g, '""') + '"',
      '"' + (c.rubro || '').replace(/"/g, '""') + '"',
      '"' + (c.direccion || '').replace(/"/g, '""') + '"',
      '"' + (c.telefono || '').replace(/"/g, '""') + '"',
      c.ubicacion_exacta_latitud || c.latitud || '',
      c.ubicacion_exacta_longitud || c.longitud || '',
      c.foto_url ? 'SI' : 'NO',
      c.fecha || ''
    ]);
    const contenido = [encabezados.join(','), ...filas.map(f => f.join(','))].join('\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comercios_${filtroEmpresa}_${filtroPreventista}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rubrosUnicos = ['TODOS', ...new Set(comercios.map(c => c.rubro).filter(Boolean))];

  const listaFiltrada = comercios.filter(c => {
    const empComercio = c.empresa || 'Elifiant';
    const prevComercio = c.preventista || 'Alex';
    const matchEmpresa = filtroEmpresa === 'TODAS' || empComercio === filtroEmpresa;
    const matchPreventista = filtroPreventista === 'TODOS' || prevComercio === filtroPreventista;
    const matchTexto = (
      (c.nombre || '') + ' ' +
      (c.direccion || '') + ' ' +
      (c.rubro || '') + ' ' +
      empComercio + ' ' +
      prevComercio + ' ' +
      (c.id || '')
    ).toLowerCase().includes(busqueda.toLowerCase());
    const matchRubro = filtroRubro === 'TODOS' || c.rubro === filtroRubro;
    return matchEmpresa && matchPreventista && matchTexto && matchRubro;
  });

  const totalComercios = listaFiltrada.length;
  const conFoto = listaFiltrada.filter(c => c.foto_url).length;
  const conUbicacionExacta = listaFiltrada.filter(c => c.ubicacion_exacta_latitud).length;
  const centroInicial = [-34.6037, -58.3816];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* BARRA SUPERIOR */}
      <header style={{ height: '64px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>🏢</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.5px' }}>RutaComercio Web</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#38bdf8' }}>Panel Multi-Empresa • Gestión de Preventistas</p>
          </div>
        </div>

        {/* SELECTORES DE EMPRESA Y PREVENTISTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {listaEmpresas.length > 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', padding: '4px 10px', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Empresa:</span>
              <select
                value={filtroEmpresa}
                onChange={e => setFiltroEmpresa(e.target.value)}
                style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', fontSize: '12px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
              >
                {listaEmpresas.map(e => (
                  <option key={e} value={e} style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                    {e === 'TODAS' ? '🏢 Todas' : e}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', padding: '4px 10px', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '13px' }}>👔</span>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>Preventista:</span>
            <select
              value={filtroPreventista}
              onChange={e => setFiltroPreventista(e.target.value)}
              style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
            >
              {listaPreventistas.map(p => (
                <option key={p} value={p} style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                  {p === 'TODOS' ? '🌐 Todos' : `👤 ${p}`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={exportarCSV}
            style={{ padding: '8px 14px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📊 Excel (CSV)
          </button>
          <button
            onClick={() => window.location.href = '/'}
            style={{ padding: '8px 12px', backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
          >
            📱 Móvil
          </button>
        </div>
      </header>

      {/* TARJETAS DE MÉTRICAS */}
      <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px 18px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>TOTAL COMERCIOS ({filtroPreventista})</span>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '28px', color: '#fff' }}>{totalComercios}</h2>
        </div>
        <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px 18px' }}>
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>CON FOTO DE FACHADA</span>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '28px', color: '#10b981' }}>{conFoto}</h2>
        </div>
        <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px 18px' }}>
          <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '600' }}>GPS EXACTO RELEVADO</span>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '28px', color: '#38bdf8' }}>{conUbicacionExacta}</h2>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL (MAPA + AUDITORÍA) */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', padding: '0 24px 24px 24px', height: 'calc(100vh - 210px)' }}>
        {/* MAPA */}
        <div style={{ flex: 1.4, borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', position: 'relative' }}>
          <MapContainer center={centroInicial} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
            <AutoCentradoMapa comercios={listaFiltrada} comercioActivo={comercioActivo} />
            {listaFiltrada.map(c => {
              const lat = c.ubicacion_exacta_latitud || c.latitud;
              const lng = c.ubicacion_exacta_longitud || c.longitud;
              if (!lat || !lng) return null;
              const prev = c.preventista || 'Alex';
              const colorPin = mapaColores[prev] || '#2563eb';
              return (
                <Marker key={c.id} position={[lat, lng]} icon={obtenerIconoColor(colorPin)}>
                  <Popup>
                    <div style={{ minWidth: '190px', color: '#0f172a' }}>
                      {c.foto_url && (
                        <img src={c.foto_url} alt='Fachada' style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', marginBottom: '6px' }} />
                      )}
                      <div style={{ display: 'inline-block', backgroundColor: colorPin, color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', marginBottom: '4px' }}>
                        👔 {prev} • 🏢 {c.empresa || 'Elifiant'}
                      </div>
                      <br />
                      <strong style={{ fontSize: '14px' }}>{c.nombre || c.direccion || ('Comercio #' + c.id)}</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>{c.rubro || 'General'}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>{c.direccion || 'Sin dirección'}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* LISTA Y AUDITORÍA LATERAL */}
        <div style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type='text'
              placeholder='🔍 Buscar comercio, dirección, rubro o vendedor...'
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {rubrosUnicos.map(rubro => (
                <button
                  key={rubro}
                  onClick={() => setFiltroRubro(rubro)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: filtroRubro === rubro ? '#2563eb' : '#1e293b',
                    color: filtroRubro === rubro ? '#fff' : '#94a3b8',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {rubro}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {cargando ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Cargando datos desde Supabase...</p>
            ) : listaFiltrada.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No se encontraron comercios para este filtro</p>
            ) : (
              listaFiltrada.map(c => {
                const prev = c.preventista || 'Alex';
                const colorTag = mapaColores[prev] || '#2563eb';
                return (
                  <div
                    key={c.id}
                    onClick={() => setComercioActivo(c)}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: comercioActivo?.id === c.id ? '#1e293b' : '#131b2e',
                      border: comercioActivo?.id === c.id ? '1px solid #38bdf8' : '1px solid #1e293b',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {c.foto_url ? (
                        <img src={c.foto_url} alt='' style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '42px', height: '42px', borderRadius: '6px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏪</div>
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h4 style={{ margin: 0, fontSize: '13px', color: '#fff' }}>{c.nombre || c.direccion || ('Comercio #' + c.id)}</h4>
                          <span style={{ fontSize: '10px', backgroundColor: colorTag + '22', color: colorTag, border: `1px solid ${colorTag}`, padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {prev}
                          </span>
                        </div>
                        <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>{c.rubro || 'General'} {c.direccion ? '• ' + c.direccion : ''}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', gap: '4px' }}>
                      {c.foto_url && <span style={{ fontSize: '12px' }} title='Tiene Foto'>📷</span>}
                      {c.ubicacion_exacta_latitud && <span style={{ fontSize: '12px' }} title='Ubicación verificada'>📍</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}