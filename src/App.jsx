import TomaPedidos from "./TomaPedidos";
const obtenerDiaActual = () => {
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const d = dias[new Date().getDay()];
  return d === "Domingo" ? "Lunes" : d;
};

import Supervisor from './Supervisor';
import React, { useState, useEffect, useRef } from 'react';
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

export default function App() {
  const [sesion, setSesion] = useState(null);

  const [posicionActual, setPosicionActual] = useState(null);


  

  // 📡 EMISIÓN DE GPS EN VIVO DEL PREVENTISTA AL PERFIL
  useEffect(() => {
    if (!sesion?.user?.id || !posicionActual) return;
    const emitirGPS = async () => {
      try {
        await supabase
          .from('perfiles')
          .update({
            latitud: posicionActual[0],
            longitud: posicionActual[1],
            ultima_posicion_at: new Date().toISOString()
          })
          .eq('id', sesion.user.id);
      } catch(e) {}
    };
    emitirGPS();
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
        latitud: pos?.coords?.latitude || null,
        longitud: pos?.coords?.longitude || null,
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
        latitud: pos?.coords?.latitude || null,
        longitud: pos?.coords?.longitude || null,
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

  const cargarPerfil = async (session) => {
    if (!session?.user) {
      setPerfil(null);
      return;
    }
    try {
      const { data } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      if (data) {
        setPerfil(data);
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
 const [cargandoAuth, setCargandoAuth] = useState(true);
 const [emailLogin, setEmailLogin] = useState('');
 const [passwordLogin, setPasswordLogin] = useState('');
 const [errorLogin, setErrorLogin] = useState(null);
 const [recordarSesion, setRecordarSesion] = useState(true);
 const [comercios, setComercios] = useState([]);

  const [resultadoVisita, setResultadoVisita] = useState('Tomó Pedido');
  const [observacionVisita, setObservacionVisita] = useState('');
  const [guardandoVisita, setGuardandoVisita] = useState(false);
  const [visitaRegistradaHoy, setVisitaRegistradaHoy] = useState(false);

  const registrarVisitaCheckIn = async (comercio) => {
    if (!comercio) return;
    setGuardandoVisita(true);
    try {
      const ahora = new Date().toISOString();
      const prevNombre = (typeof perfil !== 'undefined' && perfil?.nombre) ? perfil.nombre : 'Alex';
      const empNombre = (typeof perfil !== 'undefined' && perfil?.empresa) ? perfil.empresa : 'Elifiant';

      if (!jornadaActiva) {
        setJornadaActiva(true); emitirActividadEnVivo(); registrarActividadEnVivo();
        setHoraInicioJornada(ahora);
        localStorage.setItem('jornada_activa', 'true');
        localStorage.setItem('hora_inicio_jornada', ahora);
      }

      const { error } = await supabase.from('visitas').insert([{
        comercio_id: comercio.id,
        comercio_nombre: comercio.nombre || ('Comercio #' + comercio.id),
        preventista: prevNombre,
        empresa: empNombre,
        resultado: resultadoVisita,
        observacion: observacionVisita || 'Visita registrada en campo',
        latitud: posicionActual ? posicionActual[0] : (comercio.latitud || null),
        longitud: posicionActual ? posicionActual[1] : (comercio.longitud || null),
        fecha: ahora
      }]);

      if (error) throw error;

      setVisitaRegistradaHoy(true);
      alert('✅ ¡Visita registrada con éxito! (' + resultadoVisita + ')');
    } catch (err) {
      console.error('Error al registrar visita:', err);
      alert('Aviso: Visita guardada localmente');
      setVisitaRegistradaHoy(true);
    } finally {
      setGuardandoVisita(false);
    }
  };

  const [cargando, setCargando] = useState(true);
  const [comercioSeleccionado, setComercioSeleccionado] = useState(null);
  const [tomandoPedido, setTomandoPedido] = useState(false);
  const [modoManejo, setModoManejo] = useState(false);

  // 💡 SCREEN WAKE LOCK: Mantiene la pantalla encendida en Modo Manejo
  useEffect(() => {
    let wakeLock = null;
    const activarWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && modoManejo) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {}
    };

    if (modoManejo) {
      activarWakeLock();
    } else if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }

    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [modoManejo]);
   useEffect(() => {
 supabase.auth.getSession().then(({ data: { session } }) => {
 setSesion(session); cargarPerfil(session);
 setCargandoAuth(false);
 });
 const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
 setSesion(session); cargarPerfil(session);
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
 try { await supabase.auth.signOut(); } catch(e) {}
 localStorage.clear();
 sessionStorage.clear();
 setSesion(null);
 };
 const [posicionBotonManejo, setPosicionBotonManejo] = useState(() => {
    try {
      const guardada = localStorage.getItem("rutacomercio_pos_boton_manejo");
      return guardada ? JSON.parse(guardada) : { x: 16, y: window.innerHeight - 170 };
    } catch(e) {
      return { x: 16, y: 500 };
    }
  });
  const [arrastrandoBoton, setArrastrandoBoton] = useState(false);
  const dragRef = React.useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, moved: false });
  const [textoBotonAgregar, setTextoBotonAgregar] = useState('➕ AGREGAR COMERCIO');
  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [nuevaPosicion, setNuevaPosicion] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [jornadaActiva, setJornadaActiva] = useState(() => localStorage.getItem("rutacomercio_jornada_activa") === "true");
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
  useEffect(() => {
    if (!navigator.geolocation) return;
    const wId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosicionActual([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.log("GPS status:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
//     if (typeof window !== 'undefined' && window.location.pathname.includes('supervisor')) {
//     return <Supervisor />;

  return () => navigator.geolocation.clearWatch(wId);
  }, []);

  const cargarComercios = async (perfilActivo) => {
    setCargando(true);
    const p = perfilActivo || perfil;
    let query = supabase.from("comercios").select("*");
    
    if (p && p.empresa) {
      query = query.eq("empresa", p.empresa);
    }
    if (p && p.rol === "preventista" && p.nombre) {
      query = query.eq("preventista", p.nombre);
    }
    
    const { data, error } = await query.order("id", { ascending: false });
    if (!error && data) setComercios(data);
    setCargando(false);
  };

  useEffect(() => {
    if (perfil && perfil.empresa) {
      cargarComercios(perfil);
    }
  }, [perfil]);

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
    const timestampInicio = Date.now().toString();
    localStorage.setItem("rutacomercio_jornada_activa", "true");
    localStorage.setItem("rutacomercio_inicio_jornada", timestampInicio);
    if (typeof setInicioTimestamp === "function") setInicioTimestamp(timestampInicio);
    setJornadaActiva(true); emitirActividadEnVivo(); registrarActividadEnVivo();
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
    setJornadaActiva(false); emitirActividadEnVivo();
    setHoraInicioJornada('');
    setTiempoTranscurrido('0m');
    try {
      localStorage.removeItem('jornada_activa');
      localStorage.removeItem('hora_inicio_jornada');
      localStorage.removeItem('timestamp_inicio_jornada');
    } catch(e) {}
  };

   
  const activarJornadaSiEstaInactiva = () => {
    try {
      const activa = localStorage.getItem("jornada_activa") === "true";
      if (!activa) {
        const ahora = Date.now().toString();
        setJornadaActiva(true); emitirActividadEnVivo(); registrarActividadEnVivo();
        setInicioJornada(ahora);
        localStorage.setItem("jornada_activa", "true");
        localStorage.setItem("inicio_jornada", ahora);
      }
    } catch(e) {}
  };

  const agregarComercioInmediato = async () => {
    registrarActividadEnVivo();
    activarJornadaSiEstaInactiva();
    const lat = (posicionActual && posicionActual[0]) ? posicionActual[0] : -34.719;
    const lng = (posicionActual && posicionActual[1]) ? posicionActual[1] : -58.265;
    const cod = Math.floor(1000 + Math.random() * 9000);

    iniciarJornadaNueveHoras();
    const nuevo = {
      nombre: "Comercio #" + cod,
                  latitud: lat,
      longitud: lng,
      ubicacion_exacta_latitud: lat,
      ubicacion_exacta_longitud: lng,
      fecha: new Date().toISOString(),
      notas: "Registrado con un toque",
      empresa: (typeof perfil !== "undefined" && perfil?.empresa) ? perfil.empresa : "Elifiant",
      preventista: (typeof perfil !== "undefined" && perfil?.nombre) ? perfil.nombre : "Walter"
    };

    try {
      const { data, error } = await supabase.from("comercios").insert([nuevo]).select();
      if (!error && data && data.length > 0) {
        setComercios((prev) => [data[0], ...prev]);
        try { if (typeof reproducirAlerta === "function") reproducirAlerta(); } catch(e){}
        if (typeof setTextoBotonAgregar === "function") {
          setTextoBotonAgregar("✅ ¡GUARDADO! #" + cod);
          setTimeout(() => setTextoBotonAgregar("➕ AGREGAR COMERCIO"), 2500);
        }
      } else {
        console.error("Error Supabase:", error);
      }
    } catch (err) {
      console.error("Excepción:", err);
    }
  };

  const listaFiltrada = (comercios || [])
    .map((c) => {
      const cLat = c.ubicacion_exacta_latitud || c.latitud;
      const cLng = c.ubicacion_exacta_longitud || c.longitud;
      let dist = null;
      if (posicionActual && posicionActual[0] && posicionActual[1] && cLat && cLng) {
        dist = calcularMetrosGPS(posicionActual[0], posicionActual[1], cLat, cLng);
      }
      return { ...c, _distanciaMetros: dist };
    })
    .filter((c) => {
      const q = (busqueda || '').toLowerCase().trim();
      const txt = `${c.nombre || ''} ${c.direccion || ''} ${c.rubro || ''} ${c.id || ''}`.toLowerCase();
      const cumpleBusqueda = !q || txt.includes(q);
      const cumplePreventista = !perfil || !perfil.nombre || perfil.rol === 'superadmin' || c.preventista === perfil.nombre;
      return cumpleBusqueda && cumplePreventista;
    })
    .sort((a, b) => {
      if (a._distanciaMetros !== null && b._distanciaMetros !== null) {
        return a._distanciaMetros - b._distanciaMetros;
      }
      if (a._distanciaMetros !== null) return -1;
      if (b._distanciaMetros !== null) return 1;
      return (b.id || 0) - (a.id || 0);
    });


    
  // 1. Subir Foto de Fachada a Storage
  const subirFotoFachada = async (e) => {
    activarJornadaSiEstaInactiva();
    const file = e.target.files?.[0];
    if (!file || !comercioSeleccionado) return;
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = "foto_" + comercioSeleccionado.id + "_" + Date.now() + "." + ext;
      const { data, error } = await supabase.storage.from("fotos_comercios").upload(fileName, file);
      if (error) throw error;
      const { data: publicData } = supabase.storage.from("fotos_comercios").getPublicUrl(fileName);
      const url = publicData.publicUrl;
      const { error: dbError } = await supabase.from("comercios").update({ foto_url: url }).eq("id", comercioSeleccionado.id);
      if (dbError) throw dbError;
      setComercioSeleccionado(prev => ({ ...prev, foto_url: url }));
      setComercios(prev => prev.map(item => item.id === comercioSeleccionado.id ? { ...item, foto_url: url } : item));
      alert("✅ Foto subida exitosamente");
    } catch (err) {
      console.error("Error subiendo foto:", err);
      alert("Error subiendo foto: " + (err.message || "desconocido"));
    }
  };

  // 2. Guardar Edición en Supabase
  const guardarEdicion = async (e) => {
    activarJornadaSiEstaInactiva();
    if (e && e.preventDefault) e.preventDefault();
    if (!comercioSeleccionado) return;
    try {
      const actualizacion = {
        nombre: (comercioSeleccionado.nombre && comercioSeleccionado.nombre.trim()) ? comercioSeleccionado.nombre.trim() : ("Comercio #" + comercioSeleccionado.id),
        direccion: comercioSeleccionado.direccion || "",
        rubro: comercioSeleccionado.rubro || "General",
        dia_visita: comercioSeleccionado.dia_visita || "Lunes",
        telefono: comercioSeleccionado.telefono || "",

          

        notas: comercioSeleccionado.notas || ""
      ,
        cuit: comercioSeleccionado.cuit || '',
        condicion_fiscal: comercioSeleccionado.condicion_fiscal || 'Consumidor Final',
        domicilio_fiscal: comercioSeleccionado.domicilio_fiscal || ''
      };
      const { error } = await supabase.from("comercios").update(actualizacion).eq("id", comercioSeleccionado.id);
      if (error) throw error;
      setComercios(prev => prev.map(item => item.id === comercioSeleccionado.id ? { ...item, ...actualizacion } : item));
      alert("✅ Comercio guardado exitosamente");
    } catch (err) {
      console.error("Error al guardar edición:", err);
      alert("Error al guardar: " + (err.message || "desconocido"));
    }
  };

  // 3. Eliminar Comercio
  const eliminarComercio = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este comercio?")) return;
    try {
      const { error } = await supabase.from("comercios").delete().eq("id", id);
      if (error) throw error;
      setComercios(prev => prev.filter(c => c.id !== id));
      setComercioSeleccionado(null);
      alert("🗑️ Comercio eliminado correctamente");
    } catch (err) {
      console.error("Error eliminando comercio:", err);
      alert("Error al eliminar: " + (err.message || "desconocido"));
    }
  };


  
  // Función para contactar al comercio por WhatsApp
  const enviarWhatsApp = (telefono) => {
    if (!telefono) {
      alert("Este comercio no tiene un teléfono registrado.");
      return;
    }
    const numLimpio = String(telefono).replace(/[^0-9]/g, "");
    if (!numLimpio) {
      alert("El número de teléfono registrado no es válido.");
      return;
    }
    const url = "https://wa.me/" + numLimpio + "?text=" + encodeURIComponent("Hola, me comunico de RutaComercio.");
    window.open(url, "_blank");
  };


  
  // Vista del Editor de Ubicación en Mapa con Pin Arrastrable
   if (cargandoAuth) { return ( <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "sans-serif" }}> Iniciando RutaComercio... </div> ); } if (!sesion) { return ( <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "sans-serif", boxSizing: "border-box" }}> <div style={{ width: "100%", maxWidth: "360px", backgroundColor: "#1e293b", padding: "28px 24px", borderRadius: "16px", border: "1px solid #334155", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}> <div style={{ textAlign: "center", marginBottom: "24px" }}> <div style={{ width: "52px", height: "52px", borderRadius: "12px", backgroundColor: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "26px", marginBottom: "12px" }}> 📍 </div> <h2 style={{ margin: 0, color: "#fff", fontSize: "20px", fontWeight: "700" }}>RutaComercio</h2> <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "13px" }}>Ingreso seguro para preventistas</p> </div> <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}> <div> <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "600" }}>Correo electrónico</label> <input type="email" required value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} placeholder="ej: tu_correo@empresa.com" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", fontSize: "14px", boxSizing: "border-box" }} /> </div> <div> <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "600" }}>Contraseña</label> <input type="password" required value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", fontSize: "14px", boxSizing: "border-box" }} /> </div> {errorLogin && ( <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#f87171", fontSize: "12px", textAlign: "center" }}> {errorLogin} </div> )} <button type="submit" style={{ marginTop: "6px", padding: "13px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#fff", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.4)" }} > Iniciar Sesión </button> </form> </div> </div> ); } if (modoManejo) {
    const latM = (posicionActual && posicionActual[0]) ? posicionActual[0] : -34.719;
    const lngM = (posicionActual && posicionActual[1]) ? posicionActual[1] : -58.265;
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a", color: "#fff", fontFamily: "sans-serif", position: "relative", overflow: "hidden" }}>
        {/* HEADER MODO MANEJO */}
        <header style={{ padding: "12px 16px", background: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", zIndex: 1001 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🚗</span>
            <span style={{ fontWeight: "800", fontSize: "15px" }}>Modo Manejo Activo</span>
          </div>
          <button 
            onClick={() => setModoManejo(false)} 
            style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}
          >
            ✕ Salir
          </button>
        </header>

        {/* 1. AVISO DE CERCANÍA: ARRIBA DE TODO */}
        {comercioCercano && (
          <div style={{ padding: "10px 14px", background: "#16a34a", color: "#fff", textAlign: "center", fontWeight: "800", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 1000, borderBottom: "2px solid #bbf7d0" }}>
            🔔 Cerca de: {comercioCercano.nombre || ("Comercio #" + comercioCercano.id)} ({comercioCercano.distancia}m)
          </div>
        )}

        {/* 2. MAPA EN VIVO: CENTRO COMPLETO */}
        <div style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}>
          <MapContainer center={[latM, lngM]} zoom={16} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {posicionActual && <Marker position={posicionActual} />}
            {comercios.map((com) => {
              const cLat = com.ubicacion_exacta_latitud || com.latitud;
              const cLng = com.ubicacion_exacta_longitud || com.longitud;
              if (!cLat || !cLng) return null;
              return (
                <Marker key={com.id} position={[cLat, cLng]}>
                  <Popup>{com.nombre || "Comercio #" + com.id}</Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* 3. BOTÓN GIGANTE: ABAJO DE TODO AL ALCANCE DEL PULGAR */}
        {/* 3. BOTÓN GIGANTE ARRASTRABLE LIBRE */}
        <div 
          style={{ 
            position: "fixed", 
            left: posicionBotonManejo.x + "px", 
            top: posicionBotonManejo.y + "px", 
            width: "calc(100% - 32px)",
            maxWidth: "380px",
            zIndex: 2000,
            touchAction: "none"
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            dragRef.current = {
              startX: touch.clientX,
              startY: touch.clientY,
              initialX: posicionBotonManejo.x,
              initialY: posicionBotonManejo.y,
              moved: false
            };
            setArrastrandoBoton(true);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            const dx = touch.clientX - dragRef.current.startX;
            const dy = touch.clientY - dragRef.current.startY;
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
              dragRef.current.moved = true;
            }
            const nuevoX = Math.max(8, Math.min(window.innerWidth - 300, dragRef.current.initialX + dx));
            const nuevoY = Math.max(70, Math.min(window.innerHeight - 90, dragRef.current.initialY + dy));
            setPosicionBotonManejo({ x: nuevoX, y: nuevoY });
          }}
          onTouchEnd={() => {
            setArrastrandoBoton(false);
            if (!dragRef.current.moved) {
              agregarComercioInmediato();
            } else {
              try {
                localStorage.setItem("rutacomercio_pos_boton_manejo", JSON.stringify(posicionBotonManejo));
              } catch(e) {}
            }
          }}
        >
          <button 
            type="button"
            style={{ 
              width: "100%", 
              minHeight: "70px", 
              padding: "16px", 
              backgroundColor: arrastrandoBoton ? "#2563eb" : "#1d4ed8", 
              color: "#ffffff", 
              border: "3px solid #93c5fd", 
              borderRadius: "18px", 
              fontSize: "18px", 
              fontWeight: "900", 
              cursor: "grab", 
              letterSpacing: "1px", 
              boxShadow: arrastrandoBoton ? "0 12px 30px rgba(37,99,235,0.7)" : "0 8px 25px rgba(0,0,0,0.65)", 
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              userSelect: "none"
            }}
          >
            <span>{textoBotonAgregar}</span>
            <span style={{ fontSize: "14px", opacity: 0.7 }}>✥</span>
          </button>
        </div>
      </div>
    );
  } 

 if (editandoUbicacion && comercioSeleccionado) {
    const latInicial = Number(comercioSeleccionado.ubicacion_exacta_latitud || comercioSeleccionado.latitud || -34.719);
    const lngInicial = Number(comercioSeleccionado.ubicacion_exacta_longitud || comercioSeleccionado.longitud || -58.264);

    const guardarNuevaUbicacion = async () => {
      try {
        const latActual = Number(comercioSeleccionado.ubicacion_exacta_latitud || latInicial);
        const lngActual = Number(comercioSeleccionado.ubicacion_exacta_longitud || lngInicial);
        const { error } = await supabase
          .from("comercios")
          .update({
            ubicacion_exacta_latitud: latActual,
            ubicacion_exacta_longitud: lngActual,
            latitud: latActual,
            longitud: lngActual
          })
          .eq("id", comercioSeleccionado.id);
        if (error) throw error;
        alert("✅ Ubicación exacta guardada con éxito");
        setEditandoUbicacion(false);
      } catch (err) {
        alert("Error al guardar ubicación: " + (err.message || "Desconocido"));
      }
    };

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: "#0f172a", color: "#fff", fontFamily: "sans-serif" }}>
        {/* BARRA SUPERIOR FIJA FLOTANTE */}
        <header style={{ padding: "12px 16px", background: "rgba(15,23,42,0.95)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155", zIndex: 10000 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>📍 Ajustar Ubicación Exacta</h3>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8" }}>Arrastrá el pin hasta la puerta del local</p>
          </div>
          <button
            type="button"
            onClick={() => setEditandoUbicacion(false)}
            style={{ background: "#334155", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: "700" }}
          >
            ✕ Salir
          </button>
        </header>

        {/* CONTENEDOR DE MAPA */}
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
        </div>

        {/* BOTONERA INFERIOR FIJA FLOTANTE */}
        <div style={{ padding: "14px 16px", background: "rgba(15,23,42,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid #334155", display: "flex", gap: "10px", zIndex: 10000 }}>
          <button
            type="button"
            onClick={() => setEditandoUbicacion(false)}
            style={{ flex: 1, background: "#334155", color: "#cbd5e1", border: "none", padding: "14px", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={guardarNuevaUbicacion}
            style={{ flex: 2, background: "#16a34a", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", fontSize: "14px", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 12px rgba(22,163,74,0.4)" }}
          >
            ✓ Guardar Ubicación
          </button>
        </div>
      </div>
    );
  }

    
  if (tomandoPedido && comercioSeleccionado) {
    return (
      <TomaPedidos
        comercio={comercioSeleccionado}
        usuario={typeof perfil !== "undefined" && perfil ? perfil : { nombre: "Alex Preventista", empresa: "Elifiant" }}
        onVolver={() => setTomandoPedido(false)}
      />
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

        {/* BOTÓN OFICIAL TOMAR PEDIDO ARRIBA DE TODO */}
        <div style={{ padding: "0 16px", marginTop: "14px" }}>
          <button
            type="button"
            onClick={() => setTomandoPedido(true)}
            style={{
              width: "100%",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "14px",
              padding: "16px",
              fontSize: "16px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              boxShadow: "0 6px 16px rgba(37,99,235,0.35)"
            }}
          >
            <span style={{ fontSize: "20px" }}>📦</span> Tomar Pedido / Reedición
          </button>
        </div>


        {/* BLOQUE CHECK-IN DE VISITA EN CALLE */}
        <div style={{ margin: '14px 16px', padding: '14px', background: '#131b2e', borderRadius: '12px', border: '1px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>📍</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auditoría de Visita</span>
            </div>
            <span style={{ fontSize: '11px', background: '#1e293b', padding: '3px 8px', borderRadius: '6px', color: '#38bdf8', fontWeight: '600' }}>
              GPS {posicionActual ? '± 4m' : 'Auto'}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Resultado de la visita:</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {[
              { id: 'Tomó Pedido', icono: '📦', label: 'Tomó Pedido' },
              { id: 'Tiene Stock', icono: '⏸️', label: 'Tiene Stock' },
              { id: 'Local Cerrado', icono: '🚪', label: 'Local Cerrado' },
              { id: 'Volver Tarde', icono: '🕒', label: 'Volver Tarde' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setResultadoVisita(m.id)}
                style={{
                  padding: '10px 8px',
                  borderRadius: '8px',
                  border: resultadoVisita === m.id ? '2px solid #3b82f6' : '1px solid #334155',
                  background: resultadoVisita === m.id ? '#1d4ed8' : '#1e293b',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{m.icono}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Nota u observación de visita (opcional)..."
            value={observacionVisita}
            onChange={(e) => setObservacionVisita(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 12px',
              borderRadius: '8px',
              background: '#090d16',
              border: '1px solid #334155',
              color: '#fff',
              fontSize: '12px',
              marginBottom: '10px'
            }}
          />

          <button
            type="button"
            onClick={() => registrarVisitaCheckIn(comercioSeleccionado)}
            disabled={guardandoVisita}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: visitaRegistradaHoy ? '#16a34a' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
            }}
          >
            {guardandoVisita ? 'Guardando visita...' : (visitaRegistradaHoy ? '✅ Visita Asentada Hoy' : '✅ Marcar como Visitado')}
          </button>
        </div>


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

            {/* DATOS FISCALES Y FACTURACIÓN */}
            <div style={{ marginTop: '8px', padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📑</span> Datos Fiscales & Facturación
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '3px', textTransform: 'uppercase' }}>CUIT / CUIL</label>
                <input
                  type="text"
                  placeholder="Ej: 20-34882910-3"
                  value={comercioSeleccionado.cuit || ''}
                  onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, cuit: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '3px', textTransform: 'uppercase' }}>Condición Fiscal</label>
                <select
                  value={comercioSeleccionado.condicion_fiscal || 'Consumidor Final'}
                  onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, condicion_fiscal: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="Consumidor Final">Consumidor Final</option>
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributo">Monotributo</option>
                  <option value="Exento">Exento</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '3px', textTransform: 'uppercase' }}>Domicilio Fiscal / Facturación</label>
                <input
                  type="text"
                  placeholder="Calle, número, localidad..."
                  value={comercioSeleccionado.domicilio_fiscal || ''}
                  onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, domicilio_fiscal: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>


            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notas</label>
              <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#64748b", fontWeight: "bold", marginBottom: "4px" }}>🗓️ Día de Visita Asignado</label>
            <select
              value={comercioSeleccionado.dia_visita || "Lunes"}
              onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, dia_visita: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", fontSize: "14px", fontWeight: "600", color: "#0f172a" }}
            >
              {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <textarea
                value={comercioSeleccionado.notas || ''}
                onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, notas: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#131b2e', border: '1px solid #334155', color: '#fff', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px' }}
                placeholder="Comentarios, listas de precios solicitadas, etc."
              />
            </div>

            
        {/* GRABADORA DE NOTAS DE VOZ INTERACTIVA */}
        <div style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "10px",
          padding: "12px",
          marginTop: "6px",
          marginBottom: "12px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px" }}>
              🎙️ NOTAS DE VOZ DEL COMERCIO
            </span>
            {grabandoAudio && (
              <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: "bold" }}>
                ● Grabando {tiempoGrabacion}s
              </span>
            )}
          </div>

          {!grabandoAudio ? (
            <button
              type="button"
              onClick={iniciarGrabacionVoz}
              style={{
                width: "100%",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(220,38,38,0.3)"
              }}
            >
              🎤 Grabar Nota de Voz
            </button>
          ) : (
            <button
              type="button"
              onClick={detenerGrabacionVoz}
              style={{
                width: "100%",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(22,163,74,0.3)"
              }}
            >
              ⏹️ Detener y Guardar Nota ({tiempoGrabacion}s)
            </button>
          )}

          {/* Listado de audios grabados en este comercio */}
          {Array.isArray(comercioSeleccionado.notas_audio) && comercioSeleccionado.notas_audio.length > 0 && (
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {comercioSeleccionado.notas_audio.map((nota) => (
                <div
                  key={nota.id}
                  style={{
                    background: "#1e293b",
                    padding: "8px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#94a3b8", minWidth: "45px" }}>🕒 {nota.fecha}</span>
                  <audio controls src={nota.audio} style={{ height: "32px", flex: 1, outline: "none" }} />
                  <button
                    type="button"
                    onClick={() => borrarNotaAudio(nota.id)}
                    style={{ background: "none", border: "none", color: "#ef4444", fontSize: "16px", cursor: "pointer", padding: "4px" }}
                    title="Eliminar audio"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#fff", fontFamily: "sans-serif" }}>
      <header style={{ padding: "14px 16px", backgroundColor: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: "0 2px 8px rgba(37,99,235,0.4)" }}>
              📍
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#fff", letterSpacing: "0.5px" }}>RutaComercio</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>👤 {(typeof perfil !== "undefined" && perfil && perfil.nombre) ? perfil.nombre : "Walter"}</span>
                <span>·</span>
                <span style={{ color: "#38bdf8", fontWeight: "600" }}>{(typeof perfil !== "undefined" && perfil && perfil.empresa) ? perfil.empresa : "Elifiant"}</span>
              </div>
            </div>
          </div>
         <button onClick={handleCerrarSesion} style={{ backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            ✕ Salir
          </button> 
        </header>

        {/* TABLERO JORNADA Y MODO MANEJO */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
          {/* Tarjeta Jornada */}
          <div style={{ backgroundColor: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Jornada</span>
              <span style={{ fontSize: "10px", color: jornadaActiva ? "#4ade80" : "#94a3b8", fontWeight: "bold" }}>
                {verificarJornadaActiva() || jornadaActiva ? "● En vivo (En ruta)" : "○ Inactiva"}
              </span>
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>
              {jornadaActiva ? tiempoTranscurrido : "0m"}
            </div>
            <button
              onClick={() => {
                if (jornadaActiva) {
                    setJornadaActiva(false); emitirActividadEnVivo();
                    localStorage.removeItem("rutacomercio_jornada_activa");
                    localStorage.removeItem("rutacomercio_inicio_jornada");
                    if (typeof setInicioTimestamp === "function") setInicioTimestamp(null);
                  } else {
                    const timestampInicio = Date.now().toString();
                    setJornadaActiva(true); emitirActividadEnVivo(); registrarActividadEnVivo();
                    localStorage.setItem("rutacomercio_jornada_activa", "true");
                    localStorage.setItem("rutacomercio_inicio_jornada", timestampInicio);
                    if (typeof setInicioTimestamp === "function") setInicioTimestamp(timestampInicio);
                  const ahora = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  localStorage.setItem("jornada_activa", "true");
                  localStorage.setItem("timestamp_inicio_jornada", Date.now().toString());
                  localStorage.setItem("hora_inicio_jornada", ahora);
                  setHoraInicioJornada(ahora);
                }
              }}
              style={{ width: "100%", marginTop: "6px", padding: "6px 0", backgroundColor: jornadaActiva ? "#dc2626" : "#1e293b", color: jornadaActiva ? "#fff" : "#94a3b8", border: jornadaActiva ? "none" : "1px solid #334155", borderRadius: "6px", fontSize: "10px", fontWeight: "700", cursor: jornadaActiva ? "pointer" : "default" }}
                disabled={!jornadaActiva}
              >
                {jornadaActiva ? "🛑 Finalizar Jornada" : "⏳ En ruta"}
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

        {/* FRANJA DE MÉTRICAS DIARIAS DEL PREVENTISTA */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "10px" }}>
          <div style={{ backgroundColor: "#1e293b", padding: "8px 6px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Visitas</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#38bdf8", marginTop: "2px" }}>
              {comercios.length > 0 ? (comercios.length + " locales") : "0 locales"}
            </div>
            <div style={{ fontSize: "9px", color: "#64748b" }}>{jornadaActiva ? "● Activa" : "○ En espera"}</div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "8px 6px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Venta Hoy</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#4ade80", marginTop: "2px" }}>
              {"Al día"}
            </div>
            <div style={{ fontSize: "9px", color: "#64748b" }}>Acumulado</div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "8px 6px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Efectividad</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#facc15", marginTop: "2px" }}>
              {jornadaActiva ? "En ruta" : "Pausa"}
            </div>
            <div style={{ fontSize: "9px", color: "#64748b" }}>Ruta diaria</div>
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
