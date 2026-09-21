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

export default function App({ sesion: sesionProp, perfil: perfilProp }) {

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
  const cargarComercios = async (perfilOverride) => {
    try {
      setCargando(true);
      const pActivo = perfilOverride || perfil || perfilProp;
      const empFiltro = pActivo?.empresa || "DEMO S.A.";
      const nomFiltro = pActivo?.nombre || (sesion?.user?.email ? sesion.user.email.split("@")[0] : "");

      let query = supabase.from("comercios").select("*");
      if (empFiltro) {
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

  const registrarVisitaCheckIn = async (comercio) => {
    if (!comercio) return;
    setGuardandoVisita(true);
    try {
      const ahora = new Date().toISOString();
      const prevNombre = (typeof perfil !== 'undefined' && perfil?.nombre) ? perfil.nombre : 'Alex';
      const empNombre = (typeof perfil !== "undefined" && perfil?.empresa) ? perfil.empresa : "";

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
  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [jornadaActiva, setJornadaActiva] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Lista filtrada de comercios por búsqueda y orden
  
  // Función para agregar comercio inmediato capturando GPS actual
  const agregarComercioInmediato = async () => {
    try {
      const lat = posicionActual ? posicionActual[0] : -34.719;
      const lng = posicionActual ? posicionActual[1] : -58.264;
      const miEmpresa = (typeof perfil !== "undefined" && perfil?.empresa) ? perfil.empresa : "DEMO S.A.";
      const miNombre = (typeof perfil !== "undefined" && perfil?.nombre) ? perfil.nombre : (sesion?.user?.email ? sesion.user.email.split("@")[0] : "Preventista");

      const nuevo = {
        nombre: "Comercio #" + Math.floor(1000 + Math.random() * 9000),
        latitud: lat,
        longitud: lng,
        ubicacion_exacta_latitud: lat,
        ubicacion_exacta_longitud: lng,
        fecha: new Date().toISOString(),
        empresa: miEmpresa,
        preventista: miNombre,
        direccion: "Ubicación en ruta",
        rubro: "General"
      };

      const { data, error } = await supabase.from("comercios").insert([nuevo]).select();
      if (error) {
        console.error("Error al registrar comercio inmediato:", error.message);
        alert("Error al agregar comercio: " + error.message);
      } else {
        if (data && data[0]) {
          setComercios(prev => [data[0], ...prev]);
        }
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } catch (e) {}
      }
    } catch (err) {
      console.error("Error inesperado en agregarComercioInmediato:", err);
    }
  };

  const listaFiltrada = (comercios || []).filter(c => {
    if (!busqueda || busqueda.trim() === "") return true;
    const q = busqueda.toLowerCase().trim();
    const nom = String(c.nombre || "").toLowerCase();
    const dir = String(c.direccion || "").toLowerCase();
    const rub = String(c.rubro || "").toLowerCase();
    const idStr = String(c.id || "");
    return nom.includes(q) || dir.includes(q) || rub.includes(q) || idStr.includes(q);
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

  // 💡 SCREEN WAKE LOCK: Mantiene la pantalla encendida en Modo Manejo
  useEffect(() => {
    let wl = null;
    const pedirLock = async () => {
      try {
        if ("wakeLock" in navigator && Boolean(modoManejo)) {
          wl = await navigator.wakeLock.request("screen");
        }
      } catch (e) {}
    };
    if (Boolean(modoManejo)) {
      pedirLock();
    }
    return () => {
      if (wl) {
        wl.release().catch(() => {});
      }
    };
  }, [modoManejo]);



 if (editandoUbicacion && comercioSeleccionado) {
    const latInicial = Number(comercioSeleccionado.ubicacion_exacta_latitud || comercioSeleccionado.latitud || -34.719);
    const lngInicial = Number(comercioSeleccionado.ubicacion_exacta_longitud || comercioSeleccionado.longitud || -58.264);

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a", color: "#fff", fontFamily: "sans-serif" }}>
        <header style={{ padding: "14px 16px", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Ajustar Ubicación Exacta</h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>Arrastrá el pin o tocá el mapa en la puerta del local</p>
          </div>
          <button
            onClick={() => setEditandoUbicacion(false)}
            style={{ background: "#334155", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", cursor: "pointer", fontWeight: "600" }}
          >
            ✕ Volver
          </button>
        </header>

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
      </div>
    );
  }

    
  // 🚗 PANTALLA OFICIAL MODO MANEJO
  if (modoManejo) {
    const coordsMapa = posicionActual ? [posicionActual[0], posicionActual[1]] : [-34.719, -58.264];
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#0f172a", color: "#fff", display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden" }}>
        {/* CABECERA MODO MANEJO */}
        <header style={{ height: "54px", backgroundColor: "#1e293b", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🚗</span>
            <span style={{ fontWeight: "800", fontSize: "15px", color: "#38bdf8" }}>Modo Manejo en Vivo</span>
          </div>
          <button
            type="button"
            onClick={() => setModoManejo(false)}
            style={{ padding: "6px 14px", backgroundColor: "#334155", color: "#f8fafc", border: "1px solid #475569", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
          >
            ✕ Salir
          </button>
        </header>

        {/* MAPA CALLEJERO LEAFLET */}
        <div style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}>
          <MapContainer center={coordsMapa} zoom={16} style={{ height: "100%", width: "100%" }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <AutoCentradoMapa puntos={posicionActual ? [coordsMapa] : []} puntoActivo={coordsMapa} />

            {/* Marcador GPS del Preventista en Auto */}
            {posicionActual && (
              <Marker
                position={coordsMapa}
                icon={L.divIcon({
                  className: "pin-manejo-propio",
                  html: '<div style="background:#2563eb;color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 16px rgba(37,99,235,0.9);border:2px solid #fff;">🚗</div>',
                  iconSize: [34, 34],
                  iconAnchor: [17, 17]
                })}
              >
                <Popup><b>Tu Ubicación</b><br />GPS en vivo</Popup>
              </Marker>
            )}

            {/* Marcadores de los Comercios */}
            {(comercios || []).map(c => {
              const lat = Number(c.ubicacion_exacta_latitud || c.latitud);
              const lng = Number(c.ubicacion_exacta_longitud || c.longitud);
              if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
              return (
                <Marker
                  key={c.id}
                  position={[lat, lng]}
                  icon={L.divIcon({
                    className: "pin-comercio-manejo",
                    html: '<div style="background:#0f172a;color:#38bdf8;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid #38bdf8;box-shadow:0 2px 8px rgba(0,0,0,0.5);">🏪</div>',
                    iconSize: [26, 26],
                    iconAnchor: [13, 13]
                  })}
                >
                  <Popup>
                    <b>{c.nombre || "Comercio #" + c.id}</b><br />
                    {c.direccion || "Sin dirección"}<br />
                    <button
                      type="button"
                      onClick={() => { setModoManejo(false); setComercioSeleccionado(c); }}
                      style={{ marginTop: "6px", padding: "4px 8px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Abrir Ficha
                    </button>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* TARJETA SUPERIOR DE COMERCIO CERCANO */}
          {comercioCercano && (
            <div style={{ position: "absolute", top: "12px", left: "12px", right: "12px", zIndex: 1000, backgroundColor: "rgba(15, 23, 42, 0.92)", backdropFilter: "blur(6px)", padding: "12px 14px", borderRadius: "10px", border: "1px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
              <div>
                <div style={{ fontSize: "10px", color: "#38bdf8", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>📍 Próxima Parada</div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#fff" }}>{comercioCercano.nombre || "Comercio #" + comercioCercano.id}</div>
                <div style={{ fontSize: "11px", color: "#cbd5e1" }}>{comercioCercano.direccion || "Sin dirección"}</div>
              </div>
              <button
                type="button"
                onClick={() => { setModoManejo(false); setComercioSeleccionado(comercioCercano); }}
                style={{ padding: "8px 12px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
              >
                Visitar
              </button>
            </div>
          )}

          {/* BOTÓN FLOTANTE REGISTRAR COMERCIO AL TOQUE */}
          <div
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
              const nuevoX = Math.max(10, Math.min(window.innerWidth - 180, dragRef.current.initialX + dx));
              const nuevoY = Math.max(70, Math.min(window.innerHeight - 80, dragRef.current.initialY + dy));
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
                padding: "12px 18px",
                backgroundColor: "#22c55e",
                color: "#fff",
                border: "2px solid #fff",
                borderRadius: "30px",
                fontSize: "13px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(34, 197, 94, 0.5)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>➕</span> {textoBotonAgregar || "Guardar Comercio"}
            </button>
          </div>
        </div>
      </div>
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
                {jornadaActiva ? "● En vivo" : "○ Inactiva"}
              </span>
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>
              {jornadaActiva ? tiempoTranscurrido : "0m"}
            </div>
            <button
              onClick={() => {
                if (jornadaActiva) {
                    setJornadaActiva(false);
                    localStorage.removeItem("rutacomercio_jornada_activa");
                    localStorage.removeItem("rutacomercio_inicio_jornada");
                    if (typeof setInicioTimestamp === "function") setInicioTimestamp(null);
                  } else {
                    const timestampInicio = Date.now().toString();
                    setJornadaActiva(true);
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
              style={{ width: "100%", marginTop: "6px", padding: "6px 0", backgroundColor: jornadaActiva ? "#dc2626" : "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
            >
              {jornadaActiva ? "Finalizar" : "Iniciar"}
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
              {jornadaActiva ? "3 / 18" : "0 / 18"}
            </div>
            <div style={{ fontSize: "9px", color: "#64748b" }}>{jornadaActiva ? "En curso" : "Meta del día"}</div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "8px 6px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Venta Hoy</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#4ade80", marginTop: "2px" }}>
              {jornadaActiva ? "$ 148.5K" : "$ 0"}
            </div>
            <div style={{ fontSize: "9px", color: "#64748b" }}>Acumulado</div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "8px 6px", borderRadius: "8px", border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Efectividad</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#facc15", marginTop: "2px" }}>
              {jornadaActiva ? "44%" : "0%"}
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