
import { useState, useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import { supabase } from './supabase'
import 'leaflet/dist/leaflet.css'
import './App.css'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function App() {
  console.log('✅ Supabase está disponible:', supabase)
  console.log('🚨 ESTA ES MI VERSION LOCAL')
    console.log('🔑 Supabase auth:', supabase.auth)

    supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    console.log('🟢 HAY UNA SESIÓN ACTIVA')
  } else {
    console.log('🔴 NO HAY SESIÓN')
  }
})
    supabase.auth.getSession().then(({ data }) => console.log('SESION:', data.session))
    supabase.auth.getSession().then(({ data }) => {
  console.log('👤 Sesión actual:', data.session)
})
    console.log(
  '🔐 Tipo de clave:',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_')
    ? 'Publishable Key correcta'
    : 'NO parece Publishable Key'
)
    console.log(
  '🔐 Tipo de clave:',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_')
    ? 'Publishable Key correcta'
    : 'NO parece Publishable Key'
)
    console.log('🌐 URL Supabase:', import.meta.env.VITE_SUPABASE_URL)
  const [registros, setRegistros] = useState(() => {
    const guardados = localStorage.getItem('registrosComercios')
    return guardados ? JSON.parse(guardados) : []
  })

  const [mensaje, setMensaje] = useState('')
  const [modoManejo, setModoManejo] = useState(false)
  const [mostrarMapa, setMostrarMapa] = useState(false)
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null)
  const [corregirUbicacion, setCorregirUbicacion] = useState(false)
   useEffect(() => {
    let wakeLock = null

    const mantenerPantallaEncendida = async () => {
      try {
        if ('wakeLock' in navigator && modoManejo) {
          wakeLock = await navigator.wakeLock.request('screen')
          console.log('📱 Pantalla mantenida encendida')
        }
      } catch (error) {
        console.log('⚠️ No se pudo mantener la pantalla encendida:', error)
      }
    }

    mantenerPantallaEncendida()

    return () => {
      if (wakeLock) {
        wakeLock.release()
        wakeLock = null
        console.log('🔒 Wake Lock liberado')
      }
    }
  }, [modoManejo])

  const guardarUbicacion = () => {
    if (!navigator.geolocation) {
      setMensaje('Tu dispositivo no permite obtener la ubicación.')
      return
    }

    setMensaje('📍 Obteniendo ubicación...')
  const reproducirSonido = () => {
  const AudioContext =
    window.AudioContext || window.webkitAudioContext

  if (!AudioContext) return

    const audioContext = new AudioContext()

    const crearBip = (frecuencia, inicio, duracion) => {
    const oscilador = audioContext.createOscillator()
    const ganancia = audioContext.createGain()

    oscilador.type = 'square'
    oscilador.frequency.value = frecuencia

    ganancia.gain.setValueAtTime(
      3.0,
      audioContext.currentTime + inicio
    )

    ganancia.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + inicio + duracion
    )

    oscilador.connect(ganancia)
    ganancia.connect(audioContext.destination)

    oscilador.start(
      audioContext.currentTime + inicio
    )

    oscilador.stop(
      audioContext.currentTime + inicio + duracion
    )
  }

  crearBip(1100, 0, 0.45)
  crearBip(850, 0.48, 0.45)
}
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        reproducirSonido()
        const nuevoRegistro = {
          id: Date.now(),
          fecha: new Date().toLocaleString('es-AR'),
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          precision: position.coords.accuracy,
          nombre: '',
          contacto: '',
          telefono: '',
          whatsapp: '',
          notas: '',
          ubicacionExactaLatitud: null,
          ubicacionExactaLongitud: null,
        }

        const nuevosRegistros = [nuevoRegistro, ...registros]

        setRegistros(nuevosRegistros)
        console.log('🧪 Intentando INSERT en Supabase...')
         const { data, error } = await supabase
          .from('comercios')
          .insert({
            id: nuevoRegistro.id,
            fecha_registro: nuevoRegistro.fecha,
            latitud: nuevoRegistro.latitud,
            longitud: nuevoRegistro.longitud,
            precision: nuevoRegistro.precision,
            nombre: nuevoRegistro.nombre,
            contacto: nuevoRegistro.contacto,
            telefono: nuevoRegistro.telefono,
            whatsapp: nuevoRegistro.whatsapp,
            notas: nuevoRegistro.notas,
            ubicacion_exacta_latitud:
              nuevoRegistro.ubicacionExactaLatitud,
            ubicacion_exacta_longitud:
              nuevoRegistro.ubicacionExactaLongitud,
          })
          .select()
          .single()

        if (error) {
  console.error('❌ Error guardando en Supabase:', error)
  setMensaje('❌ SUPABASE: ' + error.message)
} else {
  console.log('☁️ Comercio guardado en Supabase')
  setMensaje('☁️ ¡GUARDADO EN SUPABASE!')
}

        localStorage.setItem(
          'registrosComercios',
          JSON.stringify(nuevosRegistros)
        )

        
      },
      () => {
        setMensaje(
          '❌ No pudimos obtener tu ubicación. Revisá los permisos.'
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  const guardarFicha = async (datosActualizados) => {
    const nuevosRegistros = registros.map((registro) =>
      registro.id === datosActualizados.id
        ? datosActualizados
        : registro
    )

    setRegistros(nuevosRegistros)
    const { data, error } = await supabase
      .from('comercios')
      .update({
        nombre: datosActualizados.nombre,
        contacto: datosActualizados.contacto,
        telefono: datosActualizados.telefono,
        whatsapp: datosActualizados.whatsapp,
        notas: datosActualizados.notas,
        ubicacion_exacta_latitud:
          datosActualizados.ubicacionExactaLatitud,
        ubicacion_exacta_longitud:
          datosActualizados.ubicacionExactaLongitud,
      })
      .eq('id', datosActualizados.id)

    localStorage.setItem(
      'registrosComercios',
      JSON.stringify(nuevosRegistros)
    )

    setRegistroSeleccionado(null)
    setCorregirUbicacion(false)
    setMensaje('✅ Ficha guardada correctamente')
  }
  const eliminarComercio = (id) => {
    const confirmar = window.confirm(
      '¿Seguro que querés eliminar este comercio?'
    )

    if (!confirmar) return

    const nuevosRegistros = registros.filter(
      (registro) => registro.id !== id
    )

    setRegistros(nuevosRegistros)

    localStorage.setItem(
      'registrosComercios',
      JSON.stringify(nuevosRegistros)
    )

    setRegistroSeleccionado(null)
    setCorregirUbicacion(false)
    setMensaje('🗑️ Comercio eliminado')
  }

  if (modoManejo) {
    return (
      <div className="modo-manejo">
        <div className="manejo-superior">
          <span>🚗 MODO MANEJO</span>
        </div>

        <button
          className="boton-manejo"
          onClick={guardarUbicacion}
        >
          <span className="icono-manejo">📍</span>

          <span>
            GUARDAR
            <br />
            UBICACIÓN
          </span>
        </button>

        {mensaje && (
          <div className="mensaje-manejo">
            {mensaje}
          </div>
        )}

        <button
          className="salir-manejo"
          onClick={() => {
            setModoManejo(false)
            setMensaje('')
          }}
        >
          📋 VOLVER AL MODO NORMAL
        </button>
      </div>
    )
  }

  if (registroSeleccionado) {
    if (corregirUbicacion) {
      return (
        <EditorUbicacion
          registro={registroSeleccionado}
          onGuardar={(latitud, longitud) => {
            const actualizado = {
              ...registroSeleccionado,
              ubicacionExactaLatitud: latitud,
              ubicacionExactaLongitud: longitud,
            }

            guardarFicha(actualizado)
          }}
          onCancelar={() => setCorregirUbicacion(false)}
        />
      )
    }

    return (
      <FichaComercio
  registro={registroSeleccionado}
  onGuardar={guardarFicha}
  onEliminar={eliminarComercio}
  onVolver={() => setRegistroSeleccionado(null)}
  onCorregirUbicacion={() => setCorregirUbicacion(true)}
/>
    )
  }

  if (mostrarMapa) {
    const primerRegistro = registros[0]

    const centroMapa = primerRegistro
      ? [
          primerRegistro.ubicacionExactaLatitud ??
            primerRegistro.latitud,
          primerRegistro.ubicacionExactaLongitud ??
            primerRegistro.longitud,
        ]
      : [-34.720, -58.260]

    return (
      <div className="pantalla-mapa">
        <div className="cabecera-mapa">
          <h1>🗺️ Comercios</h1>

          <button
            className="volver-mapa"
            onClick={() => setMostrarMapa(false)}
          >
            ← VOLVER
          </button>
        </div>

        {registros.length === 0 ? (
          <div className="mapa-vacio">
            <h2>📍 Todavía no hay registros</h2>

            <p>
              Guardá alguna ubicación y después vas a poder verla
              en el mapa.
            </p>
          </div>
        ) : (
          <MapContainer
            center={centroMapa}
            zoom={15}
            className="mapa"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {registros.map((registro, index) => {
              const lat =
                registro.ubicacionExactaLatitud ??
                registro.latitud

              const lng =
                registro.ubicacionExactaLongitud ??
                registro.longitud

              return (
                <Marker
                  key={registro.id}
                  position={[lat, lng]}
                >
                  <Popup>
                    <strong>
                      {registro.nombre ||
                        `Comercio #${registros.length - index}`}
                    </strong>

                    <br />

                    🕐 {registro.fecha}

                    <br />

                    📍 {lat.toFixed(6)}, {lng.toFixed(6)}

                    <br />

                    <button
                      className="popup-editar"
                      onClick={() =>
                        setRegistroSeleccionado(registro)
                      }
                    >
                      ✏️ EDITAR FICHA
                    </button>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <div className="contenedor">
        <h1>📍 Comercios</h1>

        <p className="subtitulo">
          Registrá un comercio mientras estás recorriendo la zona
        </p>

        <button
          className="activar-manejo"
          onClick={() => {
            setModoManejo(true)
            setMensaje('')
          }}
        >
          🚗 ACTIVAR MODO MANEJO
        </button>

        <button
          className="boton-ubicacion"
          onClick={guardarUbicacion}
        >
          📍 GUARDAR UBICACIÓN
        </button>

        <button
          className="boton-mapa"
          onClick={() => setMostrarMapa(true)}
        >
          🗺️ VER MAPA
        </button>

        {mensaje && (
          <div className="mensaje">
            {mensaje}
          </div>
        )}

        <div className="info">
        <label style={{ color: 'red' }}></label>
          <p>🏪 Nombre del comercio: opcional</p>
          <p>📷 Foto: opcional</p>
          <p>📝 Notas: opcionales</p>
        </div>

        <div className="lista">
          <h2>📋 Registros guardados</h2>

          {registros.length === 0 ? (
            <p>Todavía no hay comercios registrados.</p>
          ) : (
            registros.map((registro, index) => (
              <div
                className="registro"
                key={registro.id}
                onClick={() =>
                  setRegistroSeleccionado(registro)
                }
              >
                <strong>
                  {registro.nombre ||
                    `Comercio #${registros.length - index}`}
                </strong>

                <p>🕐 {registro.fecha}</p>

                <p>
                  📍 {registro.latitud.toFixed(6)},{' '}
                  {registro.longitud.toFixed(6)}
                </p>

                <p className="editar-texto">
                  ✏️ Tocar para editar
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function FichaComercio({
  registro,
  onGuardar,
  onEliminar,
  onVolver,
  onCorregirUbicacion,
}) {
  const [formulario, setFormulario] = useState(registro)

  const cambiarCampo = (campo, valor) => {
    setFormulario({
      ...formulario,
      [campo]: valor,
    })
  }

  return (
    <div className="pantalla-ficha">
  
      <div className="cabecera-ficha">
        <button
          className="volver-ficha"
          onClick={onVolver}
        >
          ← VOLVER
        </button>

        <h1>🏪 Ficha</h1>
      </div>

      <div className="formulario" style={{ color: '#222' }}>
        <div className="ubicacion-info">
          <h2>📍 Ubicación registrada</h2>

          <p>
            {registro.latitud.toFixed(6)},{' '}
            {registro.longitud.toFixed(6)}
          </p>

          <p>
            📏 Precisión aproximada:{' '}
            {Math.round(registro.precision)} metros
          </p>

          <p>🕐 {registro.fecha}</p>
        </div>

        <label>
          
  🏪 Nombre del comercio
          <input
            type="text"
            value={formulario.nombre || ''}
            onChange={(e) =>
              cambiarCampo('nombre', e.target.value)
            }
            placeholder="Ej: Perfumería Juan"
          />
        </label>

        <label>
          👤 Contacto
          <input
            type="text"
            value={formulario.contacto || ''}
            onChange={(e) =>
              cambiarCampo('contacto', e.target.value)
            }
            placeholder="Nombre del contacto"
          />
        </label>

        <label>
          📞 Teléfono
          <input
            type="tel"
            value={formulario.telefono || ''}
            onChange={(e) =>
              cambiarCampo('telefono', e.target.value)
            }
            placeholder="Teléfono"
          />
        </label>

        <label>
          💬 WhatsApp
          <input
            type="tel"
            value={formulario.whatsapp || ''}
            onChange={(e) =>
              cambiarCampo('whatsapp', e.target.value)
            }
            placeholder="Número de WhatsApp"
          />
        </label>

        <label>
          📝 Notas
          <textarea
            value={formulario.notas || ''}
            onChange={(e) =>
              cambiarCampo('notas', e.target.value)
            }
            placeholder="Información adicional..."
            rows="5"
          />
        </label>

        <div className="ubicacion-exacta">
          <h2>📍 Ubicación exacta</h2>

          {formulario.ubicacionExactaLatitud ? (
            <>
              <p>✅ Ubicación exacta corregida.</p>

              <p>
                {formulario.ubicacionExactaLatitud.toFixed(6)},{' '}
                {formulario.ubicacionExactaLongitud.toFixed(6)}
              </p>
            </>
          ) : (
            <p>
              Todavía no fue corregida. Se utiliza la ubicación
              registrada.
            </p>
          )}

          <button
            className="boton-corregir"
            onClick={onCorregirUbicacion}
          >
            📍 CORREGIR UBICACIÓN
          </button>
        </div>

        <button
          className="guardar-ficha"
          onClick={() => onGuardar(formulario)}
        >
          💾 GUARDAR FICHA
        </button>
        <button
  className="eliminar-ficha"
  onClick={() => onEliminar(registro.id)}
>
  🗑️ ELIMINAR COMERCIO
</button>
      </div>
    </div>
  )
}

function EditorUbicacion({
  registro,
  onGuardar,
  onCancelar,
}) {
  const posicionInicial = [
    registro.ubicacionExactaLatitud ??
      registro.latitud,
    registro.ubicacionExactaLongitud ??
      registro.longitud,
  ]

  const [posicion, setPosicion] = useState(posicionInicial)

  function SelectorMapa() {
    useMapEvents({
      click(e) {
        setPosicion([
          e.latlng.lat,
          e.latlng.lng,
        ])
      },
    })

    return null
  }

  return (
    <div className="pantalla-editor-ubicacion">
      <div className="cabecera-ficha">
        <button
          className="volver-ficha"
          onClick={onCancelar}
        >
          ← CANCELAR
        </button>

        <h1>📍 Ubicación</h1>
      </div>

      <div className="instrucciones-ubicacion">
        <h2>Corregí la ubicación</h2>

        <p>
          Tocá sobre el mapa donde realmente está el comercio.
        </p>

        <p>
          El marcador 📍 se moverá al punto elegido.
        </p>
      </div>

      <MapContainer
        center={posicion}
        zoom={17}
        className="mapa-editor"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SelectorMapa />

        <Marker
  position={posicion}
  draggable={true}
  eventHandlers={{
    dragend: (e) => {
      const marker = e.target
      const nuevaPosicion = marker.getLatLng()

      setPosicion([
        nuevaPosicion.lat,
        nuevaPosicion.lng,
      ])
    },
  }}
>
  <Popup>
    📍 Ubicación seleccionada
  </Popup>
</Marker>
      </MapContainer>

      <div className="ubicacion-seleccionada">
        <p>
          📍 {posicion[0].toFixed(6)},{' '}
          {posicion[1].toFixed(6)}
        </p>

        <button
          className="guardar-ubicacion-exacta"
          onClick={() =>
            onGuardar(posicion[0], posicion[1])
          }
        >
          💾 GUARDAR UBICACIÓN EXACTA
        </button>
      </div>
    </div>
  )
}
export default App