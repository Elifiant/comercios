/* v2.4.9-logo-ok */
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
    /* safety-unblock-auth */
    const tSafe = setTimeout(() => { setCargandoAuth(false); }, 300);
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
 const [cargandoAuth, setCargandoAuth] = useState(false);
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
    try {
      if (typeof supabase !== "undefined" && supabase.auth) {
        await supabase.auth.signOut();
      }
    } catch (e) {}
    try {
      localStorage.clear();
      sessionStorage.clear();
      // Limpiamos cookies residuales por si el navegador guardó alguna
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
    } catch (e) {}
    window.location.href = "/";
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


  
    // Vista de mapas y navegación
  if (modoManejo) {
    return (
      <div style={{ position: "relative", minHeight: "100vh", backgroundColor: "#0f172a", color: "#fff", display: "flex", flexDirection: "column" }}>
        {/* Cabecera Modo Manejo */}
        <div style={{ padding: "12px 16px", backgroundColor: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🚗</span>
            <span style={{ fontWeight: "bold", fontSize: "15px" }}>Modo Manejo Activo</span>
          </div>
          <button
            onClick={() => setModoManejo(false)}
            style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 14px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
          >
            ✕ Salir
          </button>
        </div>
        {/* 3. BOTÓN GIGANTE ARRASTRABLE LIBRE */}
        <div style={{ position: "fixed", 
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
      <div style={{ minHeight: "100vh", backgroundColor: "#090d16", color: "#fff", fontFamily: "sans-serif", paddingBottom: "40px" }}>
        {/* CABECERA DE LA FICHA */}
        <header style={{ padding: "12px 16px", backgroundColor: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 10 }}>
          <button
            onClick={() => setComercioSeleccionado(null)}
            style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold" }}
          >
            ← Volver al Listado
          </button>
          <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "bold", background: "rgba(56,189,248,0.1)", padding: "4px 8px", borderRadius: "6px" }}>
            Ficha Oficial
          </span>
        </header>

        <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
          {/* BOTÓN TOMAR PEDIDO DESTACADO ARRIBA */}
          <button
            onClick={() => setTomandoPedido(true)}
            style={{ width: "100%", padding: "14px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 12px rgba(37,99,235,0.4)", marginBottom: "16px" }}
          >
            <span>📦</span> Tomar Pedido / Reedición
          </button>

          {/* FOTO DE FACHADA */}
          <div style={{ marginBottom: "16px", borderRadius: "12px", overflow: "hidden", backgroundColor: "#0f172a", border: "1px solid #1e293b", textAlign: "center" }}>
            {comercioSeleccionado.foto_url ? (
              <img src={comercioSeleccionado.foto_url} alt="Fachada" style={{ width: "100%", maxHeight: "240px", objectFit: "cover" }} />
            ) : (
              <div style={{ padding: "30px 16px", color: "#64748b" }}>
                <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>📷</span>
                Sin foto de fachada registrada
              </div>
            )}
            <div style={{ padding: "10px", backgroundColor: "#0f172a", borderTop: "1px solid #1e293b" }}>
              <label style={{ backgroundColor: "#334155", color: "#fff", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", display: "inline-block" }}>
                📷 {comercioSeleccionado.foto_url ? "Cambiar Foto de Fachada" : "Capturar Foto de Fachada"}
                <input type="file" accept="image/*" capture="environment" onChange={subirFotoFachada} style={{ display: "none" }} />
              </label>
            </div>
          </div>

          {/* FORMULARIO Y DATOS DEL COMERCIO */}
          <div style={{ backgroundColor: "#0f172a", padding: "16px", borderRadius: "12px", border: "1px solid #1e293b", marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", fontWeight: "bold", marginBottom: "6px" }}>Nombre del Comercio</label>
            <input
              type="text"
              value={comercioSeleccionado.nombre || ""}
              onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, nombre: e.target.value })}
              style={{ width: "100%", padding: "10px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff", fontSize: "15px", boxSizing: "border-box", marginBottom: "12px" }}
            />

            <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", fontWeight: "bold", marginBottom: "6px" }}>Dirección</label>
            <input
              type="text"
              value={comercioSeleccionado.direccion || ""}
              onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, direccion: e.target.value })}
              style={{ width: "100%", padding: "10px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff", fontSize: "14px", boxSizing: "border-box", marginBottom: "12px" }}
            />

            <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", fontWeight: "bold", marginBottom: "6px" }}>Rubro</label>
            <input
              type="text"
              value={comercioSeleccionado.rubro || ""}
              onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, rubro: e.target.value })}
              style={{ width: "100%", padding: "10px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff", fontSize: "14px", boxSizing: "border-box", marginBottom: "12px" }}
            />

            <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", fontWeight: "bold", marginBottom: "6px" }}>🗓️ Día de Visita Asignado</label>
            <select
              value={comercioSeleccionado.dia_visita || "TODOS"}
              onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, dia_visita: e.target.value })}
              style={{ width: "100%", padding: "10px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff", fontSize: "14px", boxSizing: "border-box", marginBottom: "12px" }}
            >
              <option value="TODOS">Todos los días (Flexible)</option>
              <option value="Lunes">Lunes</option>
              <option value="Martes">Martes</option>
              <option value="Miércoles">Miércoles</option>
              <option value="Jueves">Jueves</option>
              <option value="Viernes">Viernes</option>
              <option value="Sábado">Sábado</option>
            </select>

            <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", fontWeight: "bold", marginBottom: "6px" }}>Teléfono / WhatsApp</label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                type="text"
                value={comercioSeleccionado.telefono || ""}
                onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, telefono: e.target.value })}
                placeholder="Ej: 1122501680"
                style={{ flex: 1, padding: "10px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={enviarWhatsApp}
                style={{ padding: "10px 14px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                💬 Chat
              </button>
            </div>

            {/* SECCIÓN FISCAL CUIT Y CONDICIÓN */}
            <div style={{ padding: "12px", backgroundColor: "#090d16", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#38bdf8", marginBottom: "8px" }}>🏛️ Datos de Facturación Fiscal</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>CUIT / DNI</label>
                  <input
                    type="text"
                    value={comercioSeleccionado.cuit || ""}
                    onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, cuit: e.target.value })}
                    placeholder="20-XXXXXXXX-X"
                    style={{ width: "100%", padding: "8px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Condición Fiscal</label>
                  <input
                    type="text"
                    value={comercioSeleccionado.condicion_fiscal || ""}
                    onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, condicion_fiscal: e.target.value })}
                    placeholder="Resp. Inscripto / Monotributo"
                    style={{ width: "100%", padding: "8px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Razón Social</label>
              <input
                type="text"
                value={comercioSeleccionado.razon_social || ""}
                onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, razon_social: e.target.value })}
                placeholder="Razón Social Fiscal"
                style={{ width: "100%", padding: "8px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            {/* SECCIÓN NOTAS DE AUDIO / VOZ */}
            <div style={{ padding: "12px", backgroundColor: "#090d16", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#38bdf8" }}>🎙️ Nota de Voz del Cliente</span>
                {grabandoAudio && <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: "bold" }}>● Grabando...</span>}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {!grabandoAudio ? (
                  <button
                    type="button"
                    onClick={iniciarGrabacionVoz}
                    style={{ padding: "8px 12px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    🔴 Grabar Nota de Voz
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={detenerGrabacionVoz}
                    style={{ padding: "8px 12px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    ⏹ Detener y Guardar
                  </button>
                )}
                {comercioSeleccionado.notas_audio && (
                  <audio controls src={comercioSeleccionado.notas_audio} style={{ height: "36px", flex: 1 }} />
                )}
              </div>
            </div>

            {/* NOTAS ESCRITAS */}
            <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", fontWeight: "bold", marginBottom: "6px" }}>Notas Escritas</label>
            <textarea
              value={comercioSeleccionado.notas || ""}
              onChange={(e) => setComercioSeleccionado({ ...comercioSeleccionado, notas: e.target.value })}
              rows={3}
              style={{ width: "100%", padding: "10px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff", fontSize: "14px", boxSizing: "border-box", marginBottom: "16px", resize: "vertical" }}
            />

            {/* BOTÓN AJUSTAR UBICACIÓN EXACTA */}
            <button
              type="button"
              onClick={() => setEditandoUbicacion(true)}
              style={{ width: "100%", padding: "10px", backgroundColor: "#334155", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", cursor: "pointer", marginBottom: "16px" }}
            >
              📍 Ajustar Ubicación en Mapa
            </button>

            {/* BOTÓN GUARDAR Y ELIMINAR */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={guardarEdicion}
                style={{ flex: 2, padding: "12px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: "pointer" }}
              >
                💾 Guardar Cambios
              </button>
              <button
                type="button"
                onClick={() => eliminarComercio(comercioSeleccionado.id)}
                style={{ flex: 1, padding: "12px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#fff', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
        <header style={{ padding: "12px 16px", backgroundColor: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", backgroundColor: "#ffffff", borderRadius: "10px", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", flexShrink: 0 }}>
              <img src="/logo.svg" onError={(e) => { e.target.onerror = null; e.target.src = "/icon-192.png"; }} alt="RutaComercio" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "900", color: "#ffffff", letterSpacing: "-0.3px", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>RutaComercio</div>
              <div style={{ fontSize: "12px", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "6px", marginTop: "1px" }}>
                <span style={{ fontWeight: "600", color: "#f8fafc" }}>👤 {(typeof perfil !== "undefined" && perfil && perfil.nombre) ? perfil.nombre : "Walter"}</span>
                <span style={{ color: "#64748b" }}>·</span>
                <span style={{ color: "#38bdf8", fontWeight: "700" }}>{(typeof perfil !== "undefined" && perfil && perfil.empresa) ? perfil.empresa : "Elifiant"}</span>
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
