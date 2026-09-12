const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. REEMPLAZO DEL BLOQUE MODO MANEJO POR EL MAPA COMPLETO DE LEAFLET
const startMM = code.indexOf('if (modoManejo) {');
const endMM = code.indexOf('\n  return (', startMM);

if (startMM !== -1 && endMM !== -1) {
  const nuevoModoManejo = `if (modoManejo) {
    return (
      <div style={{ height: '100vh', width: '100vw', backgroundColor: '#020617', color: '#fff', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {/* Cabecera flotante */}
        <header style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, padding: '12px 16px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', letterSpacing: '1px', textTransform: 'uppercase' }}>🚗 Modo Manejo Activo</span>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{comercios.length} comercios en radar</div>
          </div>
          <button 
            onClick={() => setModoManejo(false)} 
            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ✕ Salir
          </button>
        </header>

        {/* Alerta flotante de comercio cercano si existe */}
        {comercioCercano && (
          <div style={{ position: 'absolute', top: '70px', left: '16px', right: '16px', zIndex: 1000, background: '#15803d', color: '#fff', padding: '14px 18px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'pulse 1.5s infinite' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>📍 ¡Comercio muy cercano!</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{comercioCercano.nombre || 'Comercio'}</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>A solo {comercioCercano.distancia} metros</div>
            </div>
            <button 
              onClick={() => setComercioSeleccionado(comercioCercano)}
              style={{ background: '#fff', color: '#15803d', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px' }}
            >
              Ver Ficha
            </button>
          </div>
        )}

        {/* Mapa interactivo de Leaflet */}
        <div style={{ flex: 1, width: '100%', height: '100%' }}>
          <MapContainer 
            center={posicionGPS || [-34.6037, -58.3816]} 
            zoom={17} 
            zoomControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* Marcador del auto / usuario */}
            {posicionGPS && (
              <Marker position={posicionGPS}>
                <Popup>Tu ubicación actual</Popup>
              </Marker>
            )}

            {/* Marcadores de los comercios */}
            {comercios.map((c) => {
              const lat = parseFloat(c.ubicacion_exacta_latitud || c.latitud);
              const lng = parseFloat(c.ubicacion_exacta_longitud || c.longitud);
              if (isNaN(lat) || isNaN(lng)) return null;
              return (
                <Marker key={c.id} position={[lat, lng]}>
                  <Popup>
                    <div style={{ color: '#0f172a' }}>
                      <strong>{c.nombre || 'Sin nombre'}</strong><br/>
                      {c.rubro || 'General'}<br/>
                      <button onClick={() => setComercioSeleccionado(c)} style={{ marginTop: '6px', background: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Abrir</button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Botón Gigante de Guardar Comercio */}
        <div style={{ position: 'absolute', bottom: '24px', left: '16px', right: '16px', zIndex: 1000 }}>
          <button 
            onClick={agregarComercioInmediato} 
            style={{ width: '100%', height: '84px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '22px', fontSize: '20px', fontWeight: '900', boxShadow: '0 8px 30px rgba(37,99,235,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '28px' }}>➕</span> GUARDAR COMERCIO AQUÍ
          </button>
        </div>
      </div>
    );
  }`;

  code = code.slice(0, startMM) + nuevoModoManejo + code.slice(endMM);
  console.log('✅ MODO_MANEJO_ACTUALIZADO_CON_MAPA');
}

// 2. REEMPLAZO DE LA LISTA DE COMERCIOS PARA MOSTRAR MINIATURA DE FOTO
const targetItem = 'onClick={() => setComercioSeleccionado(c)}';
const idxItem = code.indexOf(targetItem);

if (idxItem !== -1) {
  // Buscamos el bloque del div de la tarjeta
  const cardStart = code.lastIndexOf('<div', idxItem);
  const cardEnd = code.indexOf('</div>', idxItem + 200);
  
  if (cardStart !== -1 && cardEnd !== -1) {
    const nuevaTarjeta = `<div
              key={c.id}
              onClick={() => setComercioSeleccionado(c)}
              style={{ padding: '12px', background: '#131b2e', borderRadius: '16px', border: '1px solid #1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
            >
              {/* Miniatura de Foto o Icono */}
              <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#1e293b', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.foto_url ? (
                  <img src={c.foto_url} alt="Comercio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '24px' }}>🏪</span>
                )}
              </div>

              {/* Información */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 3px 0', fontSize: '15px', fontWeight: 'bold', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.nombre || 'Comercio sin nombre'}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#38bdf8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.rubro || 'General'} {c.direccion ? '• ' + c.direccion : ''}
                </p>
              </div>

              <span style={{ fontSize: '20px', color: '#475569', paddingRight: '4px' }}>›</span>
            </div>`;

    code = code.slice(0, cardStart) + nuevaTarjeta + code.slice(cardEnd + 6);
    console.log('✅ LISTA_ACTUALIZADA_CON_MINIATURAS');
  }
}

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('🎉 APP_JSX_ACTUALIZADO_CON_EXITO');
