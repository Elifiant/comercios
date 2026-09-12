const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Inyectar vista completa de Modo Manejo con Mapa Leaflet, GPS en vivo y boton gigante
const modoManejoNuevo = `      {modoManejo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
          {/* Barra superior de control */}
          <div style={{ padding: '12px 16px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#38bdf8' }}>🚗 Modo Manejo Activo</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>GPS en vivo • Radar de cercanía</div>
            </div>
            <button 
              onClick={() => setModoManejo(false)} 
              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Salir
            </button>
          </div>

          {/* Mapa Leaflet interactivo en vivo */}
          <div style={{ flex: 1, position: 'relative', width: '100%' }}>
            {ubicacionActual ? (
              <MapContainer 
                center={ubicacionActual} 
                zoom={17} 
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={ubicacionActual}>
                  <Popup>📍 Estás aquí (Vehículo)</Popup>
                </Marker>
                {comercios.map(c => {
                  const lat = c.ubicacion_exacta_latitud || c.latitud;
                  const lng = c.ubicacion_exacta_longitud || c.longitud;
                  if (!lat || !lng) return null;
                  return (
                    <Marker key={c.id} position={[lat, lng]}>
                      <Popup>
                        <strong>{c.nombre || 'Comercio'}</strong><br/>
                        {c.rubro || 'General'}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '15px' }}>
                📡 Buscando señal GPS...
              </div>
            )}

            {/* Tarjeta flotante de proximidad si hay un comercio cerca */}
            {comercioCercano && (
              <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 1000, background: 'rgba(15, 23, 42, 0.95)', border: '2px solid #38bdf8', padding: '14px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                <div style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚨 Comercio Cercano Detectado</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px', color: '#fff' }}>{comercioCercano.nombre || 'Comercio'}</div>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>Rubro: {comercioCercano.rubro || 'General'}</div>
              </div>
            )}
          </div>

          {/* Boton gigante para registrar comercio en marcha */}
          <div style={{ padding: '16px', background: '#1e293b', borderTop: '1px solid #334155' }}>
            <button 
              onClick={guardarComercioRapido} 
              style={{ width: '100%', minHeight: '85px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '20px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 4px 16px rgba(37,99,235,0.4)', cursor: 'pointer' }}
            >
              <span>➕ REGISTRAR COMERCIO AQUÍ</span>
              <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.85 }}>Captura GPS exacto con un toque</span>
            </button>
          </div>
        </div>
      )}`;

// Reemplazar bloque de modo manejo viejo
code = code.replace(/\{modoManejo && \([\s\S]*?recorriendo ruta[\s\S]*?\)\}/g, modoManejoNuevo);

// 2. Mejorar tarjetas de la lista principal con fotos, rubros, direccion y WhatsApp directo
const tarjetaComercioNueva = `            <div key={c.id} style={{ display: 'flex', gap: '12px', background: '#fff', padding: '12px', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', alignItems: 'center' }}>
              {/* Miniatura de Foto o Icono */}
              <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.foto_url ? (
                  <img src={c.foto_url} alt="Fachada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '24px' }}>🏪</span>
                )}
              </div>

              {/* Datos principales */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.nombre || 'Comercio sin nombre'}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                    {c.rubro || 'General'}
                  </span>
                  {c.direccion && (
                    <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                      📍 {c.direccion}
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones rapidas: WhatsApp y Abrir Ficha */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                {c.telefono && (
                  <button 
                    onClick={() => {
                      const num = c.telefono.replace(/\\D/g, '');
                      window.open('https://wa.me/' + num, '_blank');
                    }}
                    style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    WA
                  </button>
                )}
                <button 
                  onClick={() => setComercioSeleccionado(c)} 
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Ver
                </button>
              </div>
            </div>`;

// Reemplazar el renderizado de la tarjeta en la lista
code = code.replace(/\{listaFiltrada\.map\(c => \([\s\S]*?\}\)\)/, '{listaFiltrada.map(c => (\n' + tarjetaComercioNueva + '\n          ))}');

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('🎉 APP_ACTUALIZADA_CON_FOTOS_Y_MAPA_DE_MANEJO');
