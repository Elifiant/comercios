const fs = require('fs');

let app = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Restauramos el botón exacto de ✕ Volver en la cabecera de Ajustar Ubicación
const headerRotoRegex = /<header style=\{\{\s*padding:\s*"14px 16px"[\s\S]*?Ajustar Ubicación Exacta[\s\S]*?<\/div>[\s\S]*?<button[\s\S]*?agregarComercioInmediato\(\);[\s\S]*?<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/;

const headerSano = `<header style={{ padding: "14px 16px", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Ajustar Ubicación Exacta</h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>Arrastrá el pin o tocá el mapa en la puerta del local</p>
          </div>
          <button
            type="button"
            onClick={() => setEditandoUbicacion(false)}
            style={{ background: "#334155", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", cursor: "pointer", fontWeight: "600" }}
          >
            ✕ Volver
          </button>
        </header>`;

if (headerRotoRegex.test(app)) {
  // Restauramos la estructura original de Ajustar Ubicación
  const bloqueUbicacionCompleto = \`        \${headerSano}

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
          <div style={{
            position: "absolute",
            bottom: "20px",
            left: "16px",
            right: "16px",
            zIndex: 1000,
            display: "flex",
            gap: "10px"
          }}>
            <button
              type="button"
              onClick={async () => {
                try {
                  const latG = comercioSeleccionado.ubicacion_exacta_latitud || latInicial;
                  const lngG = comercioSeleccionado.ubicacion_exacta_longitud || lngInicial;
                  await supabase
                    .from("comercios")
                    .update({
                      ubicacion_exacta_latitud: latG,
                      ubicacion_exacta_longitud: lngG,
                      latitud: latG,
                      longitud: lngG
                    })
                    .eq("id", comercioSeleccionado.id);

                  const comAct = {
                    ...comercioSeleccionado,
                    ubicacion_exacta_latitud: latG,
                    ubicacion_exacta_longitud: lngG,
                    latitud: latG,
                    longitud: lngG
                  };
                  setComercioSeleccionado(comAct);
                  setComercios(prev => prev.map(c => c.id === comercioSeleccionado.id ? comAct : c));
                  alert("✅ Ubicación guardada exitosamente");
                  setEditandoUbicacion(false);
                } catch (err) {
                  alert("Error al guardar: " + (err.message || "Verifique conexión"));
                }
              }}
              style={{
                flex: 1,
                padding: "14px",
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              ✓ Guardar Ubicación Exacta
            </button>
          </div>
        </div>
      </div>
    );
  }\`;

  app = app.replace(headerRotoRegex, bloqueUbicacionCompleto);
  console.log("✅ 1. Cabecera y botón Volver de Ajustar Ubicación restablecidos con éxito");
}

// 2. Inyectamos el botón gigante verde exclusivamente adentro del contenedor flotante del Modo Manejo
const botonManejoFlotanteRegex = /<div[\s\S]*?position:\s*"absolute"[\s\S]*?posicionBotonManejo[\s\S]*?>[\s\S]*?<button[\s\S]*?<\/button>\s*<\/div>/;

const botonManejoFlotanteSano = `<div
            style={{
              position: "absolute",
              left: (posicionBotonManejo?.x || 16) + "px",
              top: (posicionBotonManejo?.y || 500) + "px",
              zIndex: 1001,
              touchAction: "none"
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              dragRef.current = {
                startX: touch.clientX,
                startY: touch.clientY,
                initialX: posicionBotonManejo?.x || 16,
                initialY: posicionBotonManejo?.y || 500,
                moved: false
              };
              setArrastrandoBoton(true);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              const dx = touch.clientX - dragRef.current.startX;
              const dy = touch.clientY - dragRef.current.startY;
              if (Math.hypot(dx, dy) > 8) dragRef.current.moved = true;
              const nuevoX = Math.max(10, Math.min(window.innerWidth - 270, dragRef.current.initialX + dx));
              const nuevoY = Math.max(70, Math.min(window.innerHeight - 90, dragRef.current.initialY + dy));
              setPosicionBotonManejo({ x: nuevoX, y: nuevoY });
            }}
            onTouchEnd={() => {
              setArrastrandoBoton(false);
              try { localStorage.setItem("posicion_boton_manejo", JSON.stringify(posicionBotonManejo)); } catch(e){}
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (dragRef.current?.moved) return;
                agregarComercioInmediato();
              }}
              style={{
                minHeight: "78px",
                minWidth: "260px",
                padding: "20px 28px",
                backgroundColor: "#16a34a",
                color: "#ffffff",
                border: "3px solid #ffffff",
                borderRadius: "40px",
                fontSize: "20px",
                fontWeight: "900",
                cursor: "pointer",
                boxShadow: "0 8px 30px rgba(22, 163, 74, 0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                touchAction: "manipulation"
              }}
            >
              <span style={{ fontSize: "24px" }}>➕</span> {textoBotonAgregar || "Guardar Comercio"}
            </button>
          </div>`;

if (botonManejoFlotanteRegex.test(app)) {
  app = app.replace(botonManejoFlotanteRegex, botonManejoFlotanteSano);
  console.log("✅ 2. Botón flotante del Modo Manejo ampliado a tamaño extra grande");
}

fs.writeFileSync('src/App.jsx', app, 'utf8');
console.log("🎉 HEADER_Y_BOTON_REPARADOS_EXITOSAMENTE");
