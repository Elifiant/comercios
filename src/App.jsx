/* v2.4.9-logo-ok */
import TomaPedidos from "./TomaPedidos";
const obtenerDiaActual = () => {
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const d = dias[new Date().getDay()];
  return d;
};

import Supervisor from './Supervisor';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const Marcar = () => null;
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const iconoAuto = L.divIcon({
  className: '',
  html: `
    <div style="
      font-size: 30px;
      line-height: 30px;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.7));
    ">
      🚗
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});
const iconoAzul = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 22px;
      height: 22px;
      background: #2563eb;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const iconoVerde = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 22px;
      height: 22px;
      background: #16a34a;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const iconoAmarillo = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 22px;
      height: 22px;
      background: #facc15;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});
const iconoRojo = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 22px;
      height: 22px;
      background: #dc2626;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});
const iconoNegro = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 22px;
      height: 22px;
      background: #111111;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.7);
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
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


// Función de cálculo de distancia en metros (Haversine)
function calcularMetrosGPS(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const cDist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * cDist);
}


// 🗺️ Auto-centrado suave de Leaflet para Modo Manejo
function AutoCentradoMapa({ puntos, puntoActivo }) {
  const map = typeof useMap === 'function' ? useMap() : null;
  useEffect(() => {
    if (!map) return;
    if (puntoActivo && puntoActivo[0] && puntoActivo[1]) {
      try {
        map.setView([puntoActivo[0], puntoActivo[1]], map.getZoom() || 16, { animate: true });
      } catch(e) {}
    } else if (puntos && puntos.length > 0 && puntos[0] && puntos[0][0]) {
      try {
        map.setView([puntos[0][0], puntos[0][1]], map.getZoom() || 16, { animate: true });
      } catch(e) {}
    }
  }, [puntoActivo, puntos, map]);
  return null;
}


function SeguirAuto({ posicion }) {
  const map = useMap();

  useEffect(() => {
    if (!posicion || !Number.isFinite(Number(posicion[0])) || !Number.isFinite(Number(posicion[1]))) return;
    map.panTo([Number(posicion[0]), Number(posicion[1])], {
      animate: true,
      duration: 0.5,
    });
  }, [posicion, map]);

  return null;
}

export default function App({ sesion: sesionProp, perfil: perfilProp }) {
console.log("🚗 APP SE ESTÁ RENDERIZANDO");
  // 💾 Guardar edición de datos del comercio en Supabase
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const guardarEdicion = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    try {
      if (!comercioSeleccionado?.id) return;
      setGuardandoEdicion(true);

      const actualizacion = {
        nombre: comercioSeleccionado.nombre || ('Comercio #' + comercioSeleccionado.id),
        direccion: comercioSeleccionado.direccion || '',
        rubro: comercioSeleccionado.rubro || 'General',
        cuit: comercioSeleccionado.cuit || '',
        telefono: comercioSeleccionado.telefono || '',
        codigo_pais: comercioSeleccionado.codigo_pais || '+54',
        notas: comercioSeleccionado.notas || '',
        dia_visita: comercioSeleccionado.dia_visita || 'Lunes'
      };

      if (comercioSeleccionado.ubicacion_exacta_latitud) {
        actualizacion.ubicacion_exacta_latitud = comercioSeleccionado.ubicacion_exacta_latitud;
      }
      if (comercioSeleccionado.ubicacion_exacta_longitud) {
        actualizacion.ubicacion_exacta_longitud = comercioSeleccionado.ubicacion_exacta_longitud;
      }

      const { error } = await supabase
        .from('comercios')
        .update(actualizacion)
        .eq('id', comercioSeleccionado.id);

      if (error) throw error;

      const comercioActualizado = { ...comercioSeleccionado, ...actualizacion };
      setComercioSeleccionado(comercioActualizado);
      setComercios(prev => prev.map(c => c.id === comercioSeleccionado.id ? comercioActualizado : c));
      alert('Comercio guardado con éxito');
    } catch (err) {
      console.error('Error al guardar comercio:', err);
      alert('Error al guardar: ' + (err.message || 'Verifique conexión'));
    } finally {
      setGuardandoEdicion(false);
    }
  };



  // Función oficial de cierre de sesión
  const handleCerrarSesion = async () => {
    try {
      if (typeof supabase !== 'undefined' && supabase.auth) {
        await supabase.auth.signOut();
      }
    } catch (err) {}
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    if (typeof setSesion === 'function') setSesion(null);
    if (typeof setPerfil === 'function') setPerfil(null);
    window.location.replace('/');
  }; 

  // 📸 Subida de foto de fachada a Supabase Storage
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const subirFotoFachada = async (e) => {
    try {
      const archivo = e.target.files?.[0];
      if (!archivo || !comercioSeleccionado) return;
      setSubiendoFoto(true);

      const extension = archivo.name.split('.').pop() || 'jpg';
      const rutaArchivo = `comercio_${comercioSeleccionado.id}_${Date.now()}.${extension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('fotos_comercios')
        .upload(rutaArchivo, archivo, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('fotos_comercios')
        .getPublicUrl(rutaArchivo);

      const urlFotoFinal = urlData.publicUrl;

      // Actualizamos en Supabase la columna foto_url
      await supabase
        .from('comercios')
        .update({ foto_url: urlFotoFinal })
        .eq('id', comercioSeleccionado.id);

            // Actualizamos en el estado local
      const comercioActualizadoFoto = { ...comercioSeleccionado, foto_url: urlFotoFinal };
      setComercioSeleccionado(comercioActualizadoFoto);
      setComercios(prev => prev.map(c => c.id === comercioSeleccionado.id ? comercioActualizadoFoto : c));
      alert('Foto guardada correctamente');
    } catch (err) {
      console.error('Error al subir foto:', err);
      alert('Error al subir foto: ' + (err.message || 'Verifique conexión'));
    } finally {
      setSubiendoFoto(false);
    }
  };


  const [sesion, setSesion] = useState(null);

  
  const [comercioCercano, setComercioCercano] = useState(null);
  const [distanciaCercano, setDistanciaCercano] = useState(null);
  const [textoBotonAgregar, setTextoBotonAgregar] = useState("➕ AGREGAR COMERCIO");
  const [posicionActual, setPosicionActual] = useState(null);
  const [visitasMapa, setVisitasMapa] = useState([]);
  // 📍 OBTENER UBICACIÓN UNA VEZ AL ABRIR LA APP
useEffect(() => {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setPosicionActual([
        position.coords.latitude,
        position.coords.longitude,
      ]);
    },
    (error) => {
      console.log("No se pudo obtener la ubicación inicial:", error);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    }
  );
}, []);
  

  // 📡 EMISIÓN DE GPS EN VIVO DEL PREVENTISTA AL PERFIL
  useEffect(() => {
    
    if (Boolean(sesion) && Boolean(sesion.user) && Boolean(posicionActual)) {
      supabase.from("perfiles").update({
        latitud: posicionActual[0],
        longitud: posicionActual[1],
        ultima_posicion_at: new Date().toISOString()
      }).eq("id", sesion.user.id).then(() => {}).catch(() => {});
    }
  }, [posicionActual, sesion]);


  // Jornada activa durante 9 horas seguidas (32400000 ms)
  const NUEVE_HORAS_MS = 9 * 60 * 60 * 1000;
  const iniciarJornadaNueveHoras = () => {
    try {
      const ahora = Date.now();
      localStorage.setItem("jornada_inicio_ts", String(ahora));
      localStorage.setItem("jornada_activa", "true");
      setJornadaActiva(true);
    } catch(e) {}
  };

  const verificarJornadaActiva = () => {
    try {
      const inicio = localStorage.getItem("jornada_inicio_ts");
      if (!inicio) return false;
      const transcurrido = Date.now() - parseInt(inicio, 10);
      if (transcurrido < NUEVE_HORAS_MS) {
        return true;
      } else {
        localStorage.removeItem("jornada_inicio_ts");
        localStorage.removeItem("jornada_activa");
        return false;
      }
    } catch(e) {
      return false;
    }
  };


  const emitirPosicionGPS = async (lat, lng) => {
    try {
      if (!lat || !lng || !sesion?.user?.id) return;
      await supabase.from("perfiles").update({
        latitud: lat,
        longitud: lng,
        ultima_posicion_at: new Date().toISOString(),
        activo_hoy: true
      }).eq("id", sesion.user.id);
    } catch(e) {}
  };


  // Transmisión continua de posición en vivo a Supabase
  const transmitirUbicacionEnVivo = async (lat, lng) => {
    try {
      if (!lat || !lng || !sesion?.user?.id) return;
      await supabase.from("perfiles").update({
        latitud: lat,
        longitud: lng,
        ultima_posicion_at: new Date().toISOString(),
        ultima_conexion: new Date().toISOString(),
        activo_hoy: true
      }).eq("id", sesion.user.id);
    } catch (e) {
      console.warn("Error enviando telemetria:", e.message);
    }
  };


  const emitirActividadEnVivo = async () => {
    try {
      const email = sesion?.user?.email || perfil?.email;
      const prevNombre = perfil?.nombre || "";
      const emp = perfil?.empresa || "";
      if (!email) return;
      
      // Actualiza perfiles
      await supabase.from("perfiles").update({ 
        ultima_conexion: new Date().toISOString(),
        activo_hoy: true,
        latitud: posicionActual?.[0] || null,
        longitud: posicionActual?.[1] || null,
        ultima_posicion_at: new Date().toISOString() 
      }).eq("email", email);

      // Registra en visitas para que el Supervisor lo tome como actividad hoy
      await supabase.from("visitas").insert([{
        preventista: prevNombre,
        empresa: emp,
        fecha: new Date().toISOString().slice(0, 10),
        hora: new Date().toLocaleTimeString(),
        tipo: "actividad_app"
      }]);
    } catch(err) {
      console.warn("Actividad en vivo:", err.message);
    }
  };
  

  const registrarActividadEnVivo = async () => {
    try {
      const emailUsuario = sesion?.user?.email || perfil?.email;
      if (!emailUsuario) return;
      await supabase
        .from("perfiles")
        .update({ 
          ultima_conexion: new Date().toISOString(),
        activo_hoy: true,
        latitud: posicionActual?.[0] || null,
        longitud: posicionActual?.[1] || null,
        ultima_posicion_at: new Date().toISOString() 
        })
        .eq("email", emailUsuario);
    } catch (e) {
      console.warn("Aviso actividad:", e.message);
    }
  };


  // Estados para notas de voz en Ficha de Comercio
  const [grabandoAudio, setGrabandoAudio] = useState(false);
  const [tiempoGrabacion, setTiempoGrabacion] = useState(0);
  const [mediaRecorderObj, setMediaRecorderObj] = useState(null);
  const timerGrabacionRef = useRef(null);
  const audioChunksRef = React.useRef([]);
  const timerAudioRef = React.useRef(null);

  const iniciarGrabacionVoz = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Tu navegador no soporta grabación de voz o faltan permisos de micrófono.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detección del tipo MIME óptimo compatible con iOS y Android
      let mimeType = "";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      const opciones = mimeType ? { mimeType } : {};
      const mr = new MediaRecorder(stream, opciones);
      const pedazos = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          pedazos.push(e.data);
        }
      };

      mr.onstop = () => {
        try {
          const tipoFinal = mimeType || "audio/mp4";
          const blob = new Blob(pedazos, { type: tipoFinal });
          
          // Convertimos a base64 DataURL: 100% compatible con iPhone Safari y sin errores de reproducción
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result;
              const nuevaNota = {
                id: Date.now(),
                fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                audio: base64Audio
              };
              
              let notasActualizadas = [nuevaNota];
              setComercioSeleccionado((prev) => {
                if (!prev) return prev;
                const actual = Array.isArray(prev.notas_audio) ? prev.notas_audio : [];
                notasActualizadas = [nuevaNota, ...actual];
                return { ...prev, notas_audio: notasActualizadas, audio_url: base64Audio };
              });

              // Guardado inmediato y persistente en Supabase
              if (comercioSeleccionado && comercioSeleccionado.id) {
                const { error: errAudio } = await supabase
                  .from('comercios')
                  .update({ 
                    notas_audio: notasActualizadas,
                    audio_url: base64Audio 
                  })
                  .eq('id', comercioSeleccionado.id);

                if (errAudio) {
                  console.error("Error al persistir audio en Supabase:", errAudio);
                } else {
                  console.log("🎉 Nota de voz guardada a fuego en Supabase para el comercio:", comercioSeleccionado.id);
                  // Sincronizamos la lista general en memoria
                  setComercios(prevLista => prevLista.map(item => 
                    item.id === comercioSeleccionado.id 
                      ? { ...item, notas_audio: notasActualizadas, audio_url: base64Audio } 
                      : item
                  ));
                }
              }
            } catch (errPersist) {
              console.error("Error en reader.onloadend:", errPersist);
            }
          };
          reader.readAsDataURL(blob);

          // Apagamos los tracks del micrófono
          stream.getTracks().forEach((track) => track.stop());
        } catch (errBlob) {
          console.error("Error al procesar audio:", errBlob);
        }
      };

      mr.start(250); // Recolecta pedacitos cada 250ms
      setMediaRecorderObj(mr);
      setGrabandoAudio(true);
      setTiempoGrabacion(0);

      // Cronómetro en vivo
      if (timerGrabacionRef.current) clearInterval(timerGrabacionRef.current);
      timerGrabacionRef.current = setInterval(() => {
        setTiempoGrabacion((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error al iniciar micrófono:", err);
      alert("No se pudo acceder al micrófono: " + (err.message || "Permiso denegado"));
    }
  };

  const detenerGrabacionVoz = () => {
    try {
      if (mediaRecorderObj && mediaRecorderObj.state !== "inactive") {
        mediaRecorderObj.stop();
      }
      setGrabandoAudio(false);
    
      if (timerGrabacionRef.current) {
        clearInterval(timerGrabacionRef.current);
        timerGrabacionRef.current = null;
      }
    } catch (err) {
      console.error("Error al detener grabación:", err);
      setGrabandoAudio(false);
    }
  };

  const borrarNotaAudio = (notaId) => {
    setComercioSeleccionado(prev => {
      if (!prev) return prev;
      const notasPrevias = Array.isArray(prev.notas_audio) ? prev.notas_audio : [];
      return { ...prev, notas_audio: notasPrevias.filter(n => n.id !== notaId) };
    });
  };

  



   const [perfil, setPerfil] = useState(null);
  const cargarComercios = async (perfilOverride) => {
    try {
      setCargando(true);
      const pActivo = perfilOverride || perfil || perfilProp;
      const empresaIdFiltro = pActivo?.empresa_id || null;
      const empFiltro = pActivo?.empresa || "DEMO S.A.";
      const nomFiltro = pActivo?.nombre || (sesion?.user?.email ? sesion.user.email.split("@")[0] : "");

      let query = supabase.from("comercios").select("*");
      if (empresaIdFiltro) {
      query = query.eq("empresa_id", empresaIdFiltro);
      } else if (empFiltro) {
      query = query.ilike("empresa", empFiltro.trim());
      }
      if (nomFiltro) {
        query = query.ilike("preventista", nomFiltro.trim());
      }

      const { data, error } = await query.order("id", { ascending: false });
      if (error) throw error;
      setComercios(data || []);
    } catch (err) {
      console.error("Error al cargar comercios:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (sesionProp) setSesion(sesionProp);
    if (perfilProp) {
      setPerfil(perfilProp);
      cargarComercios(perfilProp);
    }
  }, [sesionProp, perfilProp]);


  const cargarPerfil = async (session) => {
    if (!session?.user) {
      setPerfil(null);
      return;
    }
    try {
      let { data } = await supabase.from("perfiles").select("*").eq("id", session.user.id).maybeSingle();
      if (!data && session?.user?.email) {
        const r = await supabase.from("perfiles").select("*").ilike("email", session.user.email).maybeSingle();
        data = r.data;
      }
      if (data) {
        setPerfil(data);
        cargarComercios(data);
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
 const [emailLogin, setEmailLogin] = useState('');
 const [passwordLogin, setPasswordLogin] = useState('');
 const [errorLogin, setErrorLogin] = useState(null);
 const [recordarSesion, setRecordarSesion] = useState(true);
 const [comercios, setComercios] = useState([]);

  const [resultadoVisita, setResultadoVisita] = useState('Tomó Pedido');
  const [observacionVisita, setObservacionVisita] = useState('');
  const [guardandoVisita, setGuardandoVisita] = useState(false);
  const [visitaRegistradaHoy, setVisitaRegistradaHoy] = useState(false);

  const registrarVisitaCheckIn = async (comercio, resultadoDirecto = null) => {
    if (!comercio) return;
    setGuardandoVisita(true);
    try {
      const ahora = new Date().toISOString();
      const prevNombre = (typeof perfil !== 'undefined' && perfil?.nombre) ? perfil.nombre : 'Alex';
      const empNombre = (typeof perfil !== "undefined" && perfil?.empresa) ? perfil.empresa : "";

      if (!jornadaActiva) {
        setJornadaActiva(true); emitirActividadEnVivo(); registrarActividadEnVivo();
        // setHoraInicioJornada(ahora);
        localStorage.setItem('jornada_activa', 'true');
        localStorage.setItem('hora_inicio_jornada', ahora);
      }

      const nuevaVisita = {
        comercio_id: comercio.id,
        comercio_nombre: comercio.nombre || ('Comercio #' + comercio.id),
        preventista: prevNombre,
        empresa: empNombre,
        empresa_id: perfil?.empresa_id || null,
        resultado: resultadoDirecto || resultadoVisita,
        observacion: observacionVisita || 'Visita registrada en campo',
        latitud: posicionActual ? posicionActual[0] : (comercio.latitud || null),
        longitud: posicionActual ? posicionActual[1] : (comercio.longitud || null),
        fecha: ahora
      };

      const { error } = await supabase.from('visitas').insert([nuevaVisita]);

      if (error) throw error;

      setVisitasMapa((prev) => [nuevaVisita, ...(prev || [])]);
      setVisitaRegistradaHoy(true);
      alert('✅ ¡Visita registrada con éxito! (' + (resultadoDirecto || resultadoVisita) + ')');

      // 🧭 Al terminar la visita volvemos a HOY.
      // Como visitasMapa ya se actualizó, PRÓXIMO DESTINO salta solo
      // a la siguiente parada pendiente de la ruta sugerida.
      setObservacionVisita('');
      setComercioSeleccionado(null);
      setVistaComercios("HOY");
    } catch (err) {
      console.error('Error al registrar visita:', err);
      alert('Aviso: Visita guardada localmente');
      setVisitaRegistradaHoy(true);
    } finally {
      setGuardandoVisita(false);
    }
  };
    const marcarNoVisitar = async (comercio) => {
  if (!comercio) return;

  const confirmar = window.confirm(
    `⚫ ¿Marcar "${comercio.nombre || "este comercio"}" como NO VISITAR MÁS?\n\nSeguirá marcado aunque cambie la jornada.`
  );

  if (!confirmar) return;

  try {
    const { error } = await supabase
      .from("comercios")
      .update({ no_visitar: true })
      .eq("id", comercio.id);

    if (error) throw error;

    setComercioSeleccionado({
      ...comercio,
      no_visitar: true,
    });

    setComercios((prev) =>
      prev.map((c) =>
        c.id === comercio.id
          ? { ...c, no_visitar: true }
          : c
      )
    );

    alert("⚫ Comercio marcado como NO VISITAR MÁS");
  } catch (error) {
    console.error("Error marcando comercio como no visitar:", error);
    alert("❌ No se pudo guardar el cambio.");
  }
};
const eliminarCapturaVirgen = async (comercio) => {
  if (!comercio?.id) return;

  try {
    // Una captura deja de ser "virgen" en cuanto tiene una visita o un pedido.
    const [visitasResp, pedidosResp] = await Promise.all([
      supabase
        .from("visitas")
        .select("id", { count: "exact", head: true })
        .eq("comercio_id", comercio.id),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("comercio_id", comercio.id),
    ]);

    if (visitasResp.error) throw visitasResp.error;
    if (pedidosResp.error) throw pedidosResp.error;

    const cantidadVisitas = visitasResp.count || 0;
    const cantidadPedidos = pedidosResp.count || 0;

    if (cantidadVisitas > 0 || cantidadPedidos > 0) {
      alert(
        "⚠️ Este registro ya es un cliente con movimientos.\n\n" +
        "No se puede eliminar como captura. Si no debe visitarse más, usá la solicitud al supervisor."
      );
      return;
    }

    const confirmar = window.confirm(
      `🗑️ ¿Eliminar la captura "${comercio.nombre || "sin nombre"}"?\n\n` +
      "No tiene visitas ni pedidos. Esta acción eliminará solamente esta captura."
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("comercios")
      .delete()
      .eq("id", comercio.id);

    if (error) throw error;

    setComercios((prev) =>
      (prev || []).filter((c) => String(c.id) !== String(comercio.id))
    );
    setEditandoUbicacion(false);
    setPosicionEdicionUbicacion(null);
    setComercioSeleccionado(null);

    alert("✅ Captura eliminada.");
  } catch (error) {
    console.error("Error eliminando captura:", error);
    alert("❌ No se pudo eliminar la captura: " + (error.message || "error desconocido"));
  }
};

const solicitarNoVisitar = async (comercio) => {
  if (!comercio) return;

  const motivo = window.prompt(
    `🚫 ¿Por qué solicitás NO VISITAR MÁS a "${comercio.nombre || "este comercio"}"?`
  );

  if (motivo === null) return;

  if (!motivo.trim()) {
    alert("⚠️ Escribí un motivo para enviar la solicitud.");
    return;
  }

  try {
    const { error } = await supabase
      .from("solicitudes_no_visitar")
      .insert([
        {
          comercio_id: comercio.id,
          comercio_nombre: comercio.nombre || "Comercio",
          preventista: perfil?.nombre || "",
          empresa: perfil?.empresa || "",
          empresa_id: perfil?.empresa_id || null,
          motivo: motivo.trim(),
          estado: "pendiente",
        },
      ]);

    if (error) throw error;

    alert("✅ Solicitud enviada al supervisor.");
  } catch (error) {
    console.error("Error enviando solicitud de no visitar:", error);
    alert("❌ No se pudo enviar la solicitud.");
  }
};
  const [cargando, setCargando] = useState(true);
  const [comercioSeleccionado, setComercioSeleccionado] = useState(null);
  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [posicionEdicionUbicacion, setPosicionEdicionUbicacion] = useState(null);
  const [jornadaActiva, setJornadaActiva] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [vistaComercios, setVistaComercios] = useState("HOY");
  const [destinoMapa, setDestinoMapa] = useState(null);
  const [llegueDestino, setLlegueDestino] = useState(null);
  const [tieneStockDestino, setTieneStockDestino] = useState(null);

  // 📍 Cada comercio empieza su corrección de ubicación desde SU propio punto.
  // Evita que quede visible la posición usada al editar el comercio anterior.
  useEffect(() => {
    setEditandoUbicacion(false);
    setPosicionEdicionUbicacion(null);
  }, [comercioSeleccionado?.id]);

  // Lista filtrada de comercios por búsqueda y orden
  
  // 🔊 Confirmación sonora fuerte al capturar un comercio
  const reproducirAlerta = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.95, ctx.currentTime);
      master.connect(ctx.destination);

      const beep = (frecuencia, inicio, duracion) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(frecuencia, ctx.currentTime + inicio);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
        gain.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + inicio + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + duracion);
        osc.connect(gain);
        gain.connect(master);
        osc.start(ctx.currentTime + inicio);
        osc.stop(ctx.currentTime + inicio + duracion + 0.02);
      };

      beep(1100, 0, 0.16);
      beep(850, 0.22, 0.18);
      setTimeout(() => ctx.close().catch(() => {}), 700);
    } catch (e) {
      console.warn("No se pudo reproducir el sonido de captura:", e);
    }
  };

  // Función para agregar comercio inmediato capturando GPS actual
  const agregarComercioInmediato = () => {
    setTextoBotonAgregar("⏳ Capturando GPS...");
    
    const guardarConCoords = async (lat, lng) => {
      try {
        const idTemp = Date.now();
        const nuevo = {
          nombre: "Comercio #" + String(idTemp).slice(-4),
          latitud: lat,
          longitud: lng,
          ubicacion_exacta_latitud: lat,
          ubicacion_exacta_longitud: lng,
          fecha: new Date().toISOString(),
          notas: "Registrado en Modo Manejo",
          dia_visita: new Intl.DateTimeFormat("es-AR", { weekday: "long" })
            .format(new Date())
            .replace(/^./, (letra) => letra.toUpperCase()),
          empresa: perfil?.empresa || "DEMO S.A.",
          empresa_id: perfil?.empresa_id || null,
          preventista: perfil?.nombre || "demo02"
        };
        
        setComercios(prev => [nuevo, ...prev]);
        setTextoBotonAgregar("✓ ¡REGISTRADO!");
        setRenovarWakeLock((n) => n + 1);
        try { if (typeof reproducirAlerta === "function") reproducirAlerta(); } catch(e){}
        
        await supabase.from("comercios").insert([nuevo]);
        setTimeout(() => setTextoBotonAgregar("➕ AGREGAR COMERCIO"), 1800);
      } catch (err) {
        console.error("Error al registrar en Supabase:", err);
        setTextoBotonAgregar("➕ AGREGAR COMERCIO");
      }
    };

   // Si el GPS en vivo ya tiene una posición, guardar inmediatamente
if (posicionActual && posicionActual[0] && posicionActual[1]) {
  guardarConCoords(posicionActual[0], posicionActual[1]);
  return;
}

// Respaldo: si todavía no llegó una posición del GPS en vivo,
// pedir una ubicación nueva
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      guardarConCoords(
        pos.coords.latitude,
        pos.coords.longitude
      );
    },
    (err) => {
      console.warn("No se pudo obtener ubicación:", err);
      alert("Esperá unos segundos hasta que el GPS encuentre tu ubicación.");
      setTextoBotonAgregar("➕ AGREGAR COMERCIO");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
} else {
  alert("Este dispositivo no tiene geolocalización disponible.");
  setTextoBotonAgregar("➕ AGREGAR COMERCIO");
} 
  };

  // 📊 MÉTRICA REAL DE VISITAS DE HOY
  const normalizarDia = (valor) =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const diaActualNormalizado = normalizarDia(obtenerDiaActual());

  const fechaLocalISO = (fecha = new Date()) => {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const fechaHoyLocal = fechaLocalISO();

  const comerciosProgramadosHoy = (comercios || []).filter((c) =>
    normalizarDia(c.dia_visita) === diaActualNormalizado &&
    c.no_visitar !== true &&
    c.omitir_visita_fecha !== fechaHoyLocal
  );

  const inicioHoyMetricas = new Date();
  inicioHoyMetricas.setHours(0, 0, 0, 0);

  const idsProgramadosHoy = new Set(
    comerciosProgramadosHoy.map((c) => String(c.id))
  );

  const idsVisitadosHoy = new Set(
    (visitasMapa || [])
      .filter((v) =>
        v?.fecha &&
        new Date(v.fecha) >= inicioHoyMetricas &&
        idsProgramadosHoy.has(String(v.comercio_id))
      )
      .map((v) => String(v.comercio_id))
  );

  const visitasRealizadasHoy = idsVisitadosHoy.size;
  const visitasProgramadasHoy = comerciosProgramadosHoy.length;

  // 🧭 PRÓXIMO DESTINO SEGÚN LA HOJA DE RUTA DEL SUPERVISOR
  // El listado general sigue ordenado por cercanía. Esta tarjeta usa orden_visita.
  const rutaSugeridaHoy = [...comerciosProgramadosHoy]
    .filter((c) => Number.isFinite(Number(c.orden_visita)))
    .sort((a, b) => Number(a.orden_visita) - Number(b.orden_visita));

  const proximoDestino = rutaSugeridaHoy.find(
    (c) => !idsVisitadosHoy.has(String(c.id))
  ) || null;

  const indiceProximoDestino = proximoDestino
    ? rutaSugeridaHoy.findIndex((c) => String(c.id) === String(proximoDestino.id))
    : -1;

  const latProximo = proximoDestino
    ? Number(proximoDestino.ubicacion_exacta_latitud || proximoDestino.latitud)
    : null;
  const lngProximo = proximoDestino
    ? Number(proximoDestino.ubicacion_exacta_longitud || proximoDestino.longitud)
    : null;

  const distanciaProximoDestino =
    proximoDestino &&
    posicionActual &&
    Number.isFinite(latProximo) &&
    Number.isFinite(lngProximo)
      ? calcularMetrosGPS(
          posicionActual[0],
          posicionActual[1],
          latProximo,
          lngProximo
        )
      : null;

  const listaFiltrada = (comercios || [])
  .filter(c => {
    if (vistaComercios === "HOY") {
  const diaHoy = obtenerDiaActual().toLowerCase().trim();
  const diaComercio = String(c.dia_visita || "").toLowerCase().trim();

  if (diaComercio !== diaHoy) return false;
}
    if (!busqueda || busqueda.trim() === "") return true;

    const q = busqueda.toLowerCase().trim();

    const nom = String(c.nombre || "").toLowerCase();
    const dir = String(c.direccion || "").toLowerCase();
    const rub = String(c.rubro || "").toLowerCase();
    const idStr = String(c.id || "");

    return (
      nom.includes(q) ||
      dir.includes(q) ||
      rub.includes(q) ||
      idStr.includes(q)
    );
  })
  .map(c => {
    const latComercio =
      Number(c.ubicacion_exacta_latitud) || Number(c.latitud);

    const lngComercio =
      Number(c.ubicacion_exacta_longitud) || Number(c.longitud);

    const distancia =
      posicionActual && latComercio && lngComercio
        ? calcularMetrosGPS(
            posicionActual[0],
            posicionActual[1],
            latComercio,
            lngComercio
          )
        : null;

    return {
      ...c,
      distancia_actual: distancia,
    };
  })
  .sort((a, b) => {
    if (a.distancia_actual === null && b.distancia_actual === null) return 0;
    if (a.distancia_actual === null) return 1;
    if (b.distancia_actual === null) return -1;

    return a.distancia_actual - b.distancia_actual;
  });

  const [tomandoPedido, setTomandoPedido] = useState(false);
  
  const [posicionBotonManejo, setPosicionBotonManejo] = useState(() => {
    try {
      const guardada = localStorage.getItem("rutacomercio_pos_boton_manejo");
      if (guardada) {
        const parsed = JSON.parse(guardada);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
      }
    } catch(e) {}
    return { x: 16, y: typeof window !== "undefined" ? Math.max(120, window.innerHeight - 160) : 500 };
  });
  const [arrastrandoBoton, setArrastrandoBoton] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, moved: false });

  const [modoManejo, setModoManejo] = useState(false);
  const [renovarWakeLock, setRenovarWakeLock] = useState(0);
// 📍 GPS EN VIVO PARA MODO MANEJO
useEffect(() => {
  if (!modoManejo) return;

  if (!navigator.geolocation) {
    console.log("Geolocalización no disponible");
    return;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      setPosicionActual([
        position.coords.latitude,
        position.coords.longitude,
      ]);
    },
    (error) => {
      console.error("Error GPS en Modo Manejo:", error);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}, [modoManejo]);
// 📋 CARGAR VISITAS PARA EL MAPA
useEffect(() => {
  if (!sesion?.user) return;

  const cargarVisitasMapa = async () => {
    try {
      const pActivo = perfil || perfilProp || null;

      if (!pActivo) return;

      let query = supabase
        .from("visitas")
        .select("comercio_id, resultado, observacion, fecha, empresa_id, preventista")
        .order("fecha", { ascending: false });

      if (pActivo.empresa_id) {
        query = query.eq("empresa_id", pActivo.empresa_id);
      }

      if (pActivo.nombre) {
        query = query.eq("preventista", pActivo.nombre);
      }

      const { data, error } = await query;

      if (error) throw error;

      setVisitasMapa(data || []);

      console.log("🗺️ VISITAS PARA EL MAPA:", data);
    } catch (error) {
      console.error("Error cargando visitas para el mapa:", error);
    }
  };

  cargarVisitasMapa();
}, [modoManejo, perfil, perfilProp]);
  // 💡 WAKE LOCK INTELIGENTE: mantiene la pantalla despierta 90 segundos
  // al entrar en Modo Manejo. Después deja que el teléfono use su bloqueo normal.
  useEffect(() => {
    if (!modoManejo) return;

    let wl = null;
    let timer = null;
    let cancelado = false;

    const pedirLockTemporal = async () => {
      try {
        if ("wakeLock" in navigator) {
          wl = await navigator.wakeLock.request("screen");

          timer = setTimeout(() => {
            if (wl) {
              wl.release().catch(() => {});
              wl = null;
            }
          }, 90 * 1000);
        }
      } catch (e) {
        console.log("Wake Lock no disponible:", e);
      }
    };

    pedirLockTemporal();

    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
      if (wl) {
        wl.release().catch(() => {});
      }
    };
  }, [modoManejo, renovarWakeLock]);



  if (tieneStockDestino) {
    const proximaFecha = new Date();
    proximaFecha.setDate(proximaFecha.getDate() + 7);
    const proximaFechaISO = fechaLocalISO(proximaFecha);
    const proximaFechaTexto = new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(proximaFecha);

    const finalizarTieneStock = async (saltarProxima) => {
      const comercio = tieneStockDestino;

      if (saltarProxima) {
        const { error } = await supabase
          .from("comercios")
          .update({ omitir_visita_fecha: proximaFechaISO })
          .eq("id", comercio.id)
          .eq("empresa_id", perfil?.empresa_id || comercio.empresa_id);

        if (error) {
          console.error("Error guardando omisión de próxima visita:", error);
          alert("No pude guardar la omisión de la próxima visita.");
          return;
        }

        setComercios((prev) =>
          (prev || []).map((c) =>
            String(c.id) === String(comercio.id)
              ? { ...c, omitir_visita_fecha: proximaFechaISO }
              : c
          )
        );
      }

      setTieneStockDestino(null);
      setResultadoVisita("Tiene stock");
      setObservacionVisita("");
      await registrarVisitaCheckIn(comercio, "Tiene stock");
    };

    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#fff", padding: "18px", boxSizing: "border-box" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "18px" }}>
          <div style={{ fontSize: "13px", color: "#facc15", fontWeight: "900" }}>
            📦 TIENE STOCK
          </div>

          <div style={{ fontSize: "21px", fontWeight: "900", marginTop: "5px" }}>
            {tieneStockDestino.nombre || "Comercio"}
          </div>

          <div style={{ color: "#cbd5e1", fontSize: "14px", margin: "12px 0 18px" }}>
            ¿La próxima visita se hace normalmente o este cliente pidió que no vayas?
          </div>

          <button
            type="button"
            onClick={() => finalizarTieneStock(false)}
            style={{
              width: "100%", minHeight: "50px", marginBottom: "10px",
              border: "1px solid #4ade80", borderRadius: "10px",
              backgroundColor: "#166534", color: "#fff",
              fontSize: "14px", fontWeight: "900", cursor: "pointer",
            }}
          >
            ✓ FINALIZAR VISITA
          </button>

          <button
            type="button"
            onClick={() => finalizarTieneStock(true)}
            style={{
              width: "100%", minHeight: "58px", marginBottom: "10px",
              border: "1px solid #facc15", borderRadius: "10px",
              backgroundColor: "#713f12", color: "#fff",
              fontSize: "14px", fontWeight: "900", cursor: "pointer",
            }}
          >
            ⏭️ SALTAR PRÓXIMA VISITA
            <div style={{ fontSize: "11px", fontWeight: "700", marginTop: "3px", color: "#fde68a" }}>
              No aparecerá el {proximaFechaTexto}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setTieneStockDestino(null);
              setLlegueDestino(tieneStockDestino);
            }}
            style={{
              width: "100%", minHeight: "44px",
              border: "1px solid #64748b", borderRadius: "10px",
              backgroundColor: "#0f172a", color: "#cbd5e1",
              fontWeight: "800", cursor: "pointer",
            }}
          >
            ← VOLVER
          </button>
        </div>
      </div>
    );
  }

  if (llegueDestino) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#fff", padding: "18px", boxSizing: "border-box" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "18px" }}>
          <div style={{ fontSize: "13px", color: "#86efac", fontWeight: "900" }}>
            ✓ RESULTADO DE LA VISITA
          </div>

          <div style={{ fontSize: "21px", fontWeight: "900", marginTop: "5px", marginBottom: "18px" }}>
            {llegueDestino.nombre || "Comercio"}
          </div>

          <div style={{ fontSize: "14px", color: "#cbd5e1", marginBottom: "10px" }}>
            ¿Qué pasó?
          </div>

          {[
            ["💰 VENTA / CARGAR PEDIDO", "#2563eb"],
            ["📦 TIENE STOCK", "#334155"],
            ["🚪 NO ESTABA", "#334155"],
            ["🔒 CERRADO", "#334155"],
            ["❌ NO INTERESADO", "#334155"],
          ].map(([texto, fondo]) => (
            <button
              key={texto}
              type="button"
              onClick={async () => {
                if (texto.startsWith("💰")) {
                  setComercioSeleccionado(llegueDestino);
                  setLlegueDestino(null);
                  setTomandoPedido(true);
                  return;
                }

                if (texto.startsWith("❌")) {
                  const comercioNoInteresado = llegueDestino;
                  const solicitarBaja = window.confirm(
                    `❌ ${comercioNoInteresado.nombre || "Este comercio"} indicó que no está interesado.\n\n` +
                    `Aceptar = solicitar NO VISITAR MÁS al supervisor.\n` +
                    `Cancelar = registrar solamente esta visita.`
                  );

                  if (solicitarBaja) {
                    await solicitarNoVisitar(comercioNoInteresado);
                  }

                  setResultadoVisita("No interesado");
                  setObservacionVisita("");
                  setLlegueDestino(null);
                  await registrarVisitaCheckIn(comercioNoInteresado, "No interesado");
                  return;
                }

                if (texto.startsWith("📦")) {
                  setTieneStockDestino(llegueDestino);
                  setLlegueDestino(null);
                  return;
                }

                const resultado =
                  texto.startsWith("🚪") ? "No estaba" :
                  texto.startsWith("🔒") ? "Cerrado" :
                  "Visitado";

                setResultadoVisita(resultado);
                setObservacionVisita("");
                setLlegueDestino(null);

                await registrarVisitaCheckIn(llegueDestino, resultado);
              }}
              style={{
                width: "100%",
                minHeight: "50px",
                marginBottom: "9px",
                padding: "10px 12px",
                border: texto.startsWith("💰") ? "1px solid #60a5fa" : "1px solid #475569",
                borderRadius: "10px",
                backgroundColor: fondo,
                color: "#fff",
                fontSize: "14px",
                fontWeight: "900",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {texto}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setLlegueDestino(null)}
            style={{
              width: "100%",
              minHeight: "46px",
              marginTop: "5px",
              border: "1px solid #64748b",
              borderRadius: "10px",
              backgroundColor: "#0f172a",
              color: "#cbd5e1",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            ← CANCELAR
          </button>
        </div>
      </div>
    );
  }

  if (destinoMapa) {
    const latDestino = Number(destinoMapa.ubicacion_exacta_latitud || destinoMapa.latitud);
    const lngDestino = Number(destinoMapa.ubicacion_exacta_longitud || destinoMapa.longitud);
    const centroDestino =
      Number.isFinite(latDestino) && Number.isFinite(lngDestino)
        ? [latDestino, lngDestino]
        : posicionActual;

    return (
      <div
        style={{
          height: "100vh",
          backgroundColor: "#111827",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            minHeight: "62px",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            backgroundColor: "#0f172a",
            borderBottom: "1px solid #334155",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "11px", fontWeight: "900", color: "#93c5fd" }}>
              🧭 PRÓXIMO DESTINO
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: "900",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {destinoMapa.nombre || `Comercio #${destinoMapa.id}`}
            </div>
          </div>

          <div style={{ display: "flex", gap: "7px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                if (!Number.isFinite(latDestino) || !Number.isFinite(lngDestino)) {
                  alert("Este comercio no tiene una ubicación válida para navegar.");
                  return;
                }

                const destino = `${latDestino},${lngDestino}`;
                const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=driving`;
                window.open(url, "_blank");
              }}
              style={{
                padding: "9px 11px",
                border: "1px solid #60a5fa",
                borderRadius: "9px",
                backgroundColor: "#2563eb",
                color: "#fff",
                fontWeight: "900",
                cursor: "pointer",
              }}
            >
              🧭 NAVEGAR
            </button>

            <button
              type="button"
              onClick={() => setDestinoMapa(null)}
              style={{
                padding: "9px 11px",
                border: "1px solid #64748b",
                borderRadius: "9px",
                backgroundColor: "#1e293b",
                color: "#fff",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              ← VOLVER
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          {centroDestino ? (
            <MapContainer
              center={centroDestino}
              zoom={17}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {posicionActual && (
                <Marker position={posicionActual} icon={iconoAuto}>
                  <Popup><strong>🚗 Mi ubicación</strong></Popup>
                </Marker>
              )}

              {Number.isFinite(latDestino) && Number.isFinite(lngDestino) && (
                <Marker position={[latDestino, lngDestino]} icon={iconoAzul}>
                  <Popup>
                    <strong>{destinoMapa.nombre || `Comercio #${destinoMapa.id}`}</strong>
                    <br />
                    {destinoMapa.direccion || "Sin dirección cargada"}
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                textAlign: "center",
                color: "#cbd5e1",
              }}
            >
              Este comercio no tiene una ubicación válida para mostrar.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tomandoPedido && comercioSeleccionado) {
  return (
    <TomaPedidos
      comercio={comercioSeleccionado}
      usuario={perfil || perfilProp}
      onVolver={() => setTomandoPedido(false)}
      onPedidoGuardado={async () => {
        setTomandoPedido(false);
        setResultadoVisita("Venta");
        setObservacionVisita("");
        await registrarVisitaCheckIn(comercioSeleccionado, "Venta");
      }}
    />
  );
}
if (modoManejo) {
  const moverBotonFlotante = (clientX, clientY) => {
    const ancho = 220;
    const alto = 92;
    const margen = 12;
    const maxX = Math.max(margen, window.innerWidth - ancho - margen);
    const maxY = Math.max(90, window.innerHeight - alto - 90);

    const x = Math.min(Math.max(margen, clientX - dragRef.current.startX), maxX);
    const y = Math.min(Math.max(90, clientY - dragRef.current.startY), maxY);

    if (
      Math.abs(x - dragRef.current.initialX) > 6 ||
      Math.abs(y - dragRef.current.initialY) > 6
    ) {
      dragRef.current.moved = true;
    }

    setPosicionBotonManejo({ x, y });
  };

  const iniciarArrastreBoton = (clientX, clientY) => {
    dragRef.current = {
      startX: clientX - posicionBotonManejo.x,
      startY: clientY - posicionBotonManejo.y,
      initialX: posicionBotonManejo.x,
      initialY: posicionBotonManejo.y,
      moved: false,
    };
    setArrastrandoBoton(true);
  };

  const terminarArrastreBoton = () => {
    setArrastrandoBoton(false);
    try {
      localStorage.setItem(
        "rutacomercio_pos_boton_manejo",
        JSON.stringify(posicionBotonManejo)
      );
    } catch (e) {}
  };

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: "#111",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          height: "64px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          backgroundColor: "#111827",
          borderBottom: "1px solid #334155",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: "17px", fontWeight: "900" }}>🚗 MODO MANEJO</div>
          <div style={{ fontSize: "11px", color: posicionActual ? "#86efac" : "#facc15" }}>
            {posicionActual ? "● GPS activo" : "● Buscando GPS..."}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModoManejo(false)}
          style={{
            backgroundColor: "#334155",
            color: "#fff",
            border: "1px solid #64748b",
            borderRadius: "9px",
            padding: "9px 11px",
            fontSize: "12px",
            fontWeight: "800",
            cursor: "pointer",
          }}
        >
          ← SALIR
        </button>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {posicionActual ? (
          <MapContainer
            center={posicionActual}
            zoom={17}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <SeguirAuto posicion={posicionActual} />

            <Marker position={posicionActual} icon={iconoAuto}>
              <Popup>
                <strong>🚗 Mi ubicación</strong>
              </Popup>
            </Marker>

            {(comercios || []).map((comercio) => {
              const lat = Number(
                comercio.ubicacion_exacta_latitud || comercio.latitud
              );
              const lng = Number(
                comercio.ubicacion_exacta_longitud || comercio.longitud
              );

              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

              const ahora = new Date();
              const inicioHoy = new Date(
                ahora.getFullYear(),
                ahora.getMonth(),
                ahora.getDate()
              );

              const visitaHoy = (visitasMapa || []).find((visita) => {
                if (String(visita.comercio_id) !== String(comercio.id)) return false;
                return new Date(visita.fecha) >= inicioHoy;
              });

              let iconoComercio = iconoAzul;

              if (comercio.no_visitar === true) {
                iconoComercio = iconoNegro;
              } else if (visitaHoy) {
                const resultado = (visitaHoy.resultado || "").toLowerCase();
                if (resultado.includes("no interesado")) {
                  iconoComercio = iconoRojo;
                } else if (
                  resultado.includes("venta") ||
                  resultado.includes("pedido")
                ) {
                  iconoComercio = iconoVerde;
                } else {
                  iconoComercio = iconoAmarillo;
                }
              }

              return (
                <Marker
                  key={comercio.id}
                  position={[lat, lng]}
                  icon={iconoComercio}
                >
                  <Popup>
                    <strong>{comercio.nombre || "Comercio"}</strong>
                    <br />
                    {comercio.direccion || "Sin dirección cargada"}
                    <br />
                    {visitaHoy ? `Hoy: ${visitaHoy.resultado}` : "Pendiente de visita"}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#cbd5e1",
              fontWeight: "700",
            }}
          >
            📍 Buscando ubicación GPS...
          </div>
        )}

        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            iniciarArrastreBoton(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!arrastrandoBoton) return;
            moverBotonFlotante(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (!arrastrandoBoton) return;
            const fueArrastre = dragRef.current.moved;
            terminarArrastreBoton();
            if (!fueArrastre) agregarComercioInmediato();
          }}
          onPointerCancel={() => {
            if (arrastrandoBoton) terminarArrastreBoton();
          }}
          style={{
            position: "fixed",
            left: `${posicionBotonManejo.x}px`,
            top: `${posicionBotonManejo.y}px`,
            width: "220px",
            minHeight: "92px",
            zIndex: 1000,
            backgroundColor: "#16a34a",
            color: "#fff",
            border: "3px solid rgba(255,255,255,0.9)",
            borderRadius: "18px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            fontSize: "19px",
            fontWeight: "900",
            lineHeight: 1.15,
            cursor: arrastrandoBoton ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            padding: "12px",
          }}
        >
          {textoBotonAgregar === "➕ AGREGAR COMERCIO"
            ? "📍 GUARDAR UBICACIÓN"
            : textoBotonAgregar}
          <div
            style={{
              marginTop: "5px",
              fontSize: "10px",
              fontWeight: "700",
              opacity: 0.85,
            }}
          >
            Tocá para guardar · arrastrá para mover
          </div>
        </button>
      </div>
    </div>
  );
}

if (comercioSeleccionado) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#090d16",
        color: "#fff",
        fontFamily: "sans-serif",
        paddingBottom: "40px",
      }}
    >
      <header
        style={{
          padding: "14px 16px",
          backgroundColor: "#0f172a",
          borderBottom: "1px solid #1e293b",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => {
            setEditandoUbicacion(false);
            setPosicionEdicionUbicacion(null);
            setComercioSeleccionado(null);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontSize: "15px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          ← Volver al listado
        </button>
      </header>

      <div
        style={{
          padding: "16px",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "8px" }}>
          {comercioSeleccionado.nombre || "Comercio"}
        </h2>

        <div
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 12px",
            marginBottom: "14px",
            borderRadius: "9px",
            backgroundColor: Number(comercioSeleccionado.deuda || 0) > 0 ? "#7f1d1d" : "#1e3a8a",
            border: Number(comercioSeleccionado.deuda || 0) > 0 ? "1px solid #ef4444" : "1px solid #60a5fa",
            color: "#fff",
            fontSize: "14px",
            fontWeight: "900",
            textAlign: "center",
          }}
        >
          {Number(comercioSeleccionado.deuda || 0) > 0
            ? `🔴 CON DEUDA $${Number(comercioSeleccionado.deuda || 0).toLocaleString("es-AR")}`
            : "🔵 SIN DEUDA"}
        </div>

      <button
   type="button"
      onClick={() => setTomandoPedido(true)}
   style={{
    width: "100%",
    padding: "14px",
    marginBottom: "16px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  }}
        >
  📦 TOMAR PEDIDO
    </button>
    <div
  style={{
    backgroundColor: "#1e293b",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "16px",
  }}
>
  <div
    style={{
      fontWeight: "bold",
      marginBottom: "10px",
    }}
  >
    📍 Registrar visita
  </div>

  <select
    value={resultadoVisita}
    onChange={(e) => setResultadoVisita(e.target.value)}
    style={{
      width: "100%",
      padding: "10px",
      marginBottom: "10px",
      boxSizing: "border-box",
    }}
  >
    <option value="Visitado">Visitado</option>
    <option value="Venta">Venta realizada</option>
    <option value="No estaba">No estaba</option>
    <option value="Cerrado">Cerrado</option>
    <option value="No interesado">No interesado</option>
  </select>

  <textarea
    value={observacionVisita}
    onChange={(e) => setObservacionVisita(e.target.value)}
    placeholder="Observación de la visita..."
    rows="3"
    style={{
      width: "100%",
      padding: "10px",
      marginBottom: "10px",
      boxSizing: "border-box",
      resize: "vertical",
    }}
  />

  <button
    type="button"
    onClick={() => registrarVisitaCheckIn(comercioSeleccionado)}
    disabled={guardandoVisita}
    style={{
      width: "100%",
      padding: "13px",
      backgroundColor: guardandoVisita ? "#64748b" : "#16a34a",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "15px",
      fontWeight: "bold",
      cursor: guardandoVisita ? "default" : "pointer",
    }}
  >
    {guardandoVisita ? "⏳ REGISTRANDO..." : "✅ REGISTRAR VISITA"}
  </button>
</div>
       
     <div
  style={{
    marginBottom: "16px",
  }}
>
  <button
  type="button"
  onClick={() => {
  if (comercioSeleccionado.no_visitar === true) {
    alert(
      "⚫ Este comercio está marcado como NO VISITAR MÁS.\n\nSolo un supervisor puede reactivarlo."
    );
    return;
  }

  solicitarNoVisitar(comercioSeleccionado);
}}
  style={{
    width: "100%",
    padding: "13px",
    backgroundColor:
      comercioSeleccionado.no_visitar === true
        ? "#111827"
        : "#374151",
    color: "#fff",
    border: "2px solid #000",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
  }}
>
  {comercioSeleccionado.no_visitar === true
    ? "⚫ NO VISITAR MÁS"
    : "🚫 SOLICITAR NO VISITAR MÁS"}
</button>
</div>  
       
        <div
          style={{
            backgroundColor: "#0f172a",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #1e293b",
          }}
        >
          <label>Nombre del comercio</label>

          <input
            type="text"
            value={comercioSeleccionado.nombre || ""}
            onChange={(e) =>
              setComercioSeleccionado({
                ...comercioSeleccionado,
                nombre: e.target.value,
              })
            }
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "6px",
              marginBottom: "15px",
              boxSizing: "border-box",
            }}
          />

          <label>Dirección</label>

          <input
            type="text"
            value={comercioSeleccionado.direccion || ""}
            onChange={(e) =>
              setComercioSeleccionado({
                ...comercioSeleccionado,
                direccion: e.target.value,
              })
            }
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "6px",
              marginBottom: "15px",
              boxSizing: "border-box",
            }}
          />

          <label>Rubro</label>

          <input
            type="text"
            value={comercioSeleccionado.rubro || ""}
            onChange={(e) =>
              setComercioSeleccionado({
                ...comercioSeleccionado,
                rubro: e.target.value,
              })
            }
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "6px",
              marginBottom: "20px",
              boxSizing: "border-box",
            }}
          />

          <label>Día de visita</label>

          <select
            value={comercioSeleccionado.dia_visita || ""}
            onChange={(e) =>
              setComercioSeleccionado({
                ...comercioSeleccionado,
                dia_visita: e.target.value,
              })
            }
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "6px",
              marginBottom: "20px",
              boxSizing: "border-box",
            }}
          >
            <option value="">Sin día asignado</option>
            <option value="Lunes">Lunes</option>
            <option value="Martes">Martes</option>
            <option value="Miércoles">Miércoles</option>
            <option value="Jueves">Jueves</option>
            <option value="Viernes">Viernes</option>
            <option value="Sábado">Sábado</option>
            <option value="Domingo">Domingo</option>
          </select>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
              }}
            >
              Teléfono / WhatsApp
            </label>

            <div style={{ display: "flex", gap: "8px" }}>
              <select
                value={comercioSeleccionado.codigo_pais || "+54"}
onChange={(e) =>
  setComercioSeleccionado({
    ...comercioSeleccionado,
    codigo_pais: e.target.value,
  })
}
                style={{
                  width: "105px",
                  padding: "10px",
                  boxSizing: "border-box",
                }}
              >
                <option value="+54">🇦🇷 +54</option>
                <option value="+598">🇺🇾 +598</option>
                <option value="+56">🇨🇱 +56</option>
                <option value="+595">🇵🇾 +595</option>
                <option value="+55">🇧🇷 +55</option>
                <option value="+591">🇧🇴 +591</option>
                <option value="+51">🇵🇪 +51</option>
                <option value="+57">🇨🇴 +57</option>
                <option value="+52">🇲🇽 +52</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+1">🇺🇸 +1</option>
              </select>

              <input
                type="tel"
                value={comercioSeleccionado.telefono || ""}
                onChange={(e) =>
                  setComercioSeleccionado({
                    ...comercioSeleccionado,
                    telefono: e.target.value,
                  })
                }
                placeholder="Ej: 11 2250 1680"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "10px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            {!editandoUbicacion ? (
              <button
                type="button"
                onClick={() => {
                  const lat = Number(
                    comercioSeleccionado.ubicacion_exacta_latitud ||
                    comercioSeleccionado.latitud
                  );
                  const lng = Number(
                    comercioSeleccionado.ubicacion_exacta_longitud ||
                    comercioSeleccionado.longitud
                  );

                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    alert("Este comercio no tiene una ubicación válida para corregir.");
                    return;
                  }

                  setPosicionEdicionUbicacion([lat, lng]);
                  setEditandoUbicacion(true);
                }}
                style={{
                  width: "100%",
                  padding: "13px",
                  backgroundColor: "#0ea5e9",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                📍 CORREGIR UBICACIÓN EXACTA
              </button>
            ) : (
              <div
                style={{
                  backgroundColor: "#111827",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    marginBottom: "8px",
                    color: "#e2e8f0",
                  }}
                >
                  Arrastrá el marcador hasta la ubicación exacta o tocá el mapa.
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "320px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    marginBottom: "10px",
                  }}
                >
                  <MapContainer
                    center={posicionEdicionUbicacion}
                    zoom={18}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MarcadorArrastrable
                      posicion={posicionEdicionUbicacion}
                      setPosicion={setPosicionEdicionUbicacion}
                    />
                  </MapContainer>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoUbicacion(false);
                      setPosicionEdicionUbicacion(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "11px",
                      backgroundColor: "#475569",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    CANCELAR
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!posicionEdicionUbicacion) return;

                      setComercioSeleccionado({
                        ...comercioSeleccionado,
                        ubicacion_exacta_latitud: posicionEdicionUbicacion[0],
                        ubicacion_exacta_longitud: posicionEdicionUbicacion[1],
                      });
                      setEditandoUbicacion(false);
                      setPosicionEdicionUbicacion(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "11px",
                      backgroundColor: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    ✓ USAR ESTA UBICACIÓN
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "11px",
                    color: "#94a3b8",
                  }}
                >
                  Después tocá “💾 Guardar Cambios” para dejarla guardada en Supabase.
                </div>
              </div>
            )}
          </div>

          <button
  type="button"
  onClick={() => {
    const codigo = comercioSeleccionado.codigo_pais || "+54";
    const telefono = comercioSeleccionado.telefono || "";

    const numeroLimpio =
      (codigo + telefono).replace(/\D/g, "");

    if (!telefono.trim()) {
      alert("Este comercio no tiene un teléfono cargado.");
      return;
    }

    window.open(
      "https://wa.me/" + numeroLimpio,
      "_blank"
    );
  }}
  style={{
    width: "100%",
    padding: "13px",
    marginBottom: "12px",
    backgroundColor: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
  }}
>
  💬 Abrir WhatsApp
</button>
          <button
            type="button"
            onClick={guardarEdicion}
            disabled={guardandoEdicion}
            style={{
              width: "100%",
              padding: "13px",
              backgroundColor: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {guardandoEdicion ? "Guardando..." : "💾 Guardar Cambios"}
          </button>
          <button
            type="button"
            onClick={() => eliminarCapturaVirgen(comercioSeleccionado)}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "12px",
              backgroundColor: "#7f1d1d",
              color: "#fff",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🗑️ ELIMINAR CAPTURA
          </button>
          <div
            style={{
              marginTop: "6px",
              fontSize: "11px",
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            Solo se elimina si todavía no tiene visitas ni pedidos.
          </div>
        </div>
      </div>
    </div>
  );
}
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a", color: "#fff", fontFamily: "sans-serif" }}>
        <header style={{ padding: "14px 16px", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/logo.svg" alt="RutaComercio" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.3px" }}>RutaComercio</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>👤 {perfil?.nombre || "Preventista"}</span>
                <span>·</span>
                <span style={{ color: "#38bdf8", fontWeight: "600" }}>{perfil?.empresa || "DEMO S.A."}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCerrarSesion}
            style={{ background: "#ef4444", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: "700" }}
          >
            ✕ Salir
          </button>
        </header>
        <button
  type="button"
  onClick={() => setModoManejo(true)}
  style={{
    margin: "12px 16px 0",
    padding: "14px",
    backgroundColor: "#f59e0b",
    color: "#111827",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "800",
    cursor: "pointer",
  }}
>
  🚗 MODO MANEJO
</button>
        {/* FRANJA DE MÉTRICAS DIARIAS DEL PREVENTISTA */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "10px" }}>
          <div style={{ backgroundColor: "#1e293b", padding: "5px 4px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Visitas</div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#38bdf8", marginTop: "2px" }}>
              {`${visitasRealizadasHoy} de ${visitasProgramadasHoy}`}
            </div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "5px 4px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Venta Hoy</div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#4ade80", marginTop: "2px" }}>
              {jornadaActiva ? "$ 148.5K" : "$ 0"}
            </div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "5px 4px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Efectividad</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#facc15", marginTop: "2px" }}>
              {jornadaActiva ? "44%" : "0%"}
            </div>
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
        <div
  style={{
    display: "flex",
    gap: "8px",
    margin: "10px 16px 0",
  }}
>
  <button
    type="button"
    onClick={() => setVistaComercios("HOY")}
    style={{
      flex: 1,
      padding: "12px",
      border: "none",
      borderRadius: "8px",
      backgroundColor: vistaComercios === "HOY" ? "#2563eb" : "#334155",
      color: "#fff",
      fontSize: "15px",
      fontWeight: "800",
      cursor: "pointer",
    }}
  >
    HOY
  </button>

  <button
    type="button"
    onClick={() => setVistaComercios("TODOS")}
    style={{
      flex: 1,
      padding: "12px",
      border: "none",
      borderRadius: "8px",
      backgroundColor: vistaComercios === "TODOS" ? "#2563eb" : "#334155",
      color: "#fff",
      fontSize: "15px",
      fontWeight: "800",
      cursor: "pointer",
    }}
  >
    TODOS
  </button>
</div>
      {/* PRÓXIMO DESTINO SEGÚN RUTA SUGERIDA */}
      {vistaComercios === "HOY" && (
        <div style={{ padding: "7px 16px 0" }}>
          <div
            style={{
              background: proximoDestino ? "#172554" : "#14532d",
              border: proximoDestino ? "1px solid #2563eb" : "1px solid #22c55e",
              borderRadius: "10px",
              padding: "8px 10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
            }}
          >
            {proximoDestino ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: "900",
                      color: "#93c5fd",
                      letterSpacing: "0.5px",
                    }}
                  >
                    🧭 PRÓXIMO DESTINO · Parada {indiceProximoDestino + 1} de {rutaSugeridaHoy.length}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "900", color: "#f8fafc", flexShrink: 0 }}>
                    {distanciaProximoDestino === null
                      ? "—"
                      : distanciaProximoDestino < 1000
                        ? `🚗 ${distanciaProximoDestino} m`
                        : `🚗 ${(distanciaProximoDestino / 1000).toFixed(1)} km`}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: "900",
                        color: "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {proximoDestino.nombre || `Comercio #${proximoDestino.id}`}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#cbd5e1",
                        marginTop: "1px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      📍 {proximoDestino.direccion || "Sin dirección cargada"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setObservacionVisita("");
                        setResultadoVisita("Visitado");
                        setComercioSeleccionado(proximoDestino);
                      }}
                      style={{
                        padding: "7px 9px",
                        backgroundColor: "#334155",
                        color: "#fff",
                        border: "1px solid #64748b",
                        borderRadius: "7px",
                        fontSize: "10px",
                        fontWeight: "900",
                        cursor: "pointer",
                      }}
                    >
                      ABRIR
                    </button>

                    <button
                      type="button"
                      disabled
                      title={Number(proximoDestino.deuda || 0) > 0 ? "Cliente con saldo pendiente" : "Cliente sin saldo pendiente"}
                      style={{
                        padding: "7px 9px",
                        backgroundColor: Number(proximoDestino.deuda || 0) > 0 ? "#991b1b" : "#1d4ed8",
                        color: "#fff",
                        border: Number(proximoDestino.deuda || 0) > 0 ? "1px solid #ef4444" : "1px solid #60a5fa",
                        borderRadius: "7px",
                        fontSize: "10px",
                        fontWeight: "900",
                        cursor: "default",
                        opacity: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {Number(proximoDestino.deuda || 0) > 0
                        ? "🔴 DEBE"
                        : "🔵 SIN DEUDA"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestinoMapa(proximoDestino)}
                      style={{
                        padding: "7px 9px",
                        backgroundColor: "#2563eb",
                        color: "#fff",
                        border: "1px solid #60a5fa",
                        borderRadius: "7px",
                        fontSize: "10px",
                        fontWeight: "900",
                        cursor: "pointer",
                      }}
                    >
                      🗺️ MAPA
                    </button>

                    <button
                      type="button"
                      onClick={() => setLlegueDestino(proximoDestino)}
                      style={{
                        padding: "7px 9px",
                        backgroundColor: "#166534",
                        color: "#fff",
                        border: "1px solid #4ade80",
                        borderRadius: "7px",
                        fontSize: "10px",
                        fontWeight: "900",
                        cursor: "pointer",
                      }}
                    >
                      ✓ LLEGUÉ
                    </button>
                  </div>
                </div>
              </>
            ) : rutaSugeridaHoy.length > 0 ? (
              <div style={{ fontSize: "13px", fontWeight: "900", color: "#fff" }}>
                ✓ Ruta del día completada
              </div>
            ) : (
              <div style={{ fontSize: "13px", fontWeight: "800", color: "#fff" }}>
                Sin ruta sugerida para hoy
              </div>
            )}
          </div>
        </div>
      )}

      {/* LISTADO DE COMERCIOS */}
      <main style={{ flex: 1, overflowY: "auto", padding: "12px 16px 80px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {vistaComercios === "HOY"
  ? `COMERCIOS DE HOY · ${obtenerDiaActual().toUpperCase()} (${listaFiltrada.length})`
  : `TODOS LOS COMERCIOS (${listaFiltrada.length})`}
          </span>
        </div>

        {cargando ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Cargando comercios...</div>
        ) : listaFiltrada.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: "14px" }}>No se encontraron comercios</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(() => {
              const visitadoHoy = (c) =>
                (visitasMapa || []).some(
                  (v) =>
                    String(v.comercio_id) === String(c.id) &&
                    v?.fecha &&
                    new Date(v.fecha) >= inicioHoyMetricas
                );

              const pendientes = listaFiltrada.filter((c) => !visitadoHoy(c));
              const visitados = listaFiltrada.filter((c) => visitadoHoy(c));

              const renderComercio = (c) => {
              const visitaDeHoy = (visitasMapa || []).find(
                (v) =>
                  String(v.comercio_id) === String(c.id) &&
                  v?.fecha &&
                  new Date(v.fecha) >= inicioHoyMetricas
              );
              const yaVisitadoHoy = Boolean(visitaDeHoy);
              const resultadoHoy = String(visitaDeHoy?.resultado || "Visitado").toUpperCase();

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setObservacionVisita('');
                    setResultadoVisita('Visitado');
                    setComercioSeleccionado(c);
                  }}
                  style={{
                    backgroundColor: yaVisitadoHoy ? "#172033" : "#1e293b",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: yaVisitadoHoy ? "1px solid #475569" : "1px solid #334155",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "transform 0.1s",
                    opacity: yaVisitadoHoy ? 0.72 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    {c.foto_url ? (
                      <img src={c.foto_url} alt="Local" style={{ width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover", border: "1px solid #475569" }} />
                    ) : (
                      <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "#0b1329", border: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                        🏪
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: "#f8fafc" }}>
                        {c.nombre || "Comercio #" + c.id}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                        {c.rubro || "General"} {c.direccion ? "· " + c.direccion : ""}
                      </div>

                      {yaVisitadoHoy && (
                        <div
                          style={{
                            display: "inline-block",
                            marginTop: "5px",
                            padding: "3px 7px",
                            borderRadius: "999px",
                            backgroundColor: "#334155",
                            color: "#e2e8f0",
                            fontSize: "10px",
                            fontWeight: "900",
                            letterSpacing: "0.3px",
                          }}
                        >
                          ✓ {resultadoHoy}
                        </div>
                      )}

                      {c.distancia_actual !== null && (
                        <div
                          style={{
                            fontSize: yaVisitadoHoy ? "17px" : "24px",
                            color: yaVisitadoHoy ? "#94a3b8" : "#60a5fa",
                            marginTop: "6px",
                            fontWeight: "700",
                          }}
                        >
                          📍 {c.distancia_actual < 1000
                            ? `${c.distancia_actual} m`
                            : `${(c.distancia_actual / 1000).toFixed(1)} km`}
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: "18px", color: "#64748b", paddingLeft: "8px" }}>›</span>
                </div>
              );

              };

              return (
                <>
                  {pendientes.map(renderComercio)}

                  {visitados.length > 0 && (
                    <div
                      style={{
                        marginTop: pendientes.length > 0 ? "8px" : "0",
                        padding: "9px 4px 3px",
                        borderTop: "1px solid #334155",
                        fontSize: "11px",
                        fontWeight: "900",
                        color: "#94a3b8",
                        letterSpacing: "0.5px",
                      }}
                    >
                      ✓ VISITADOS HOY ({visitados.length})
                    </div>
                  )}

                  {visitados.map(renderComercio)}
                </>
              );
            })()}
          </div>
        )}
      </main>

      {/* BOTÓN FLOTANTE REGISTRAR COMERCIO - compacto fuera de Modo Manejo */}
      <button
        type="button"
        onClick={agregarComercioInmediato}
        title="Registrar comercio"
        aria-label="Registrar comercio"
        style={{
          position: "fixed",
          right: "18px",
          bottom: "18px",
          width: "56px",
          height: "56px",
          padding: 0,
          backgroundColor: "#2563eb",
          color: "#ffffff",
          border: "2px solid #60a5fa",
          borderRadius: "50%",
          fontSize: "30px",
          lineHeight: 1,
          fontWeight: "700",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(37, 99, 235, 0.5)",
          touchAction: "manipulation",
          zIndex: 1000,
        }}
      >
        +
      </button>
    </div>
  );
}

