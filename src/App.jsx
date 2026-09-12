import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ícono Pin Rojo para comercios existentes
const pinComercio = L.divIcon({
  className: 'pin-comercio',
  html: `<div style="
    background: #ef4444;
    width: 28px;
    height: 28px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid #ffffff;
    box-shadow: 0 3px 6px rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
  "><div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Ícono Pin Verde para nuevo registro
const pinNuevo = L.divIcon({
  className: 'pin-nuevo',
  html: `<div style="
    background: #16a34a;
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid #ffffff;
    box-shadow: 0 4px 10px rgba(22,163,74,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  "><div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%;"></div></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Ícono Conductor
const pinConductor = L.divIcon({
  className: 'pin-conductor',
  html: `<div style="
    background: #2563eb;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid #ffffff;
    box-shadow: 0 0 16px rgba(37,99,235,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 19px;
  ">🚗</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Haversine en metros
function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Sonido nativo de alerta de proximidad
function reproducirBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.log('Audio no disponible:', e);
  }
}

// Limpiar formato de teléfono para WhatsApp
function formatearNumeroWhatsApp(numero) {
  if (!numero) return '';
  let limpio = String(numero).replace(/\D/g, '');
  if (limpio.startsWith('0')) limpio = limpio.substring(1);
  if (limpio.length === 10) {
    limpio = '549' + limpio;
  }
  return limpio;
}

// Compresión de fotos en el navegador (<150KB)
function comprimirImagen(archivo) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(archivo);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
        canvas.height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
    };
  });
}

function CentrarMapa({ posicion, zoom = 17 }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (posicion) {
      map.setView(posicion, zoom, { animate: true });
    }
  }, [posicion, zoom, map]);
  return null;
}

function ManejadorClicMapa({ posicion, setPosicion }) {
  const map = useMapEvents({
    click(e) {
      setPosicion([e.latlng.lat, e.latlng.lng]);
    },
  });
  useEffect(() => {
    if (posicion) {
      map.setView(posicion, map.getZoom());
    }
  }, [posicion, map]);
  return null;
}

export default function App() {
  const [comercios, setComercios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [soloSinNombre, setSoloSinNombre] = useState(false);

  // Estados de Jornada y Recorrido (Tracking)
  const [jornadaActiva, setJornadaActiva] = useState(() => {
    return localStorage.getItem('rc_jornada_activa') === 'true';
  });
  const [horaInicioJornada, setHoraInicioJornada] = useState(() => {
    return localStorage.getItem('rc_hora_inicio') || null;
  });
  const [recorridoRuta, setRecorridoRuta] = useState(() => {
    try {
      const guardado = localStorage.getItem('rc_recorrido_ruta');
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('00:00:00');
  const [comerciosJornadaCount, setComerciosJornadaCount] = useState(0);

  // Estados de Edición
  const [comercioSeleccionado, setComercioSeleccionado] = useState(null);
  const [posExacta, setPosExacta] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [fotoEdicion, setFotoEdicion] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    whatsapp: '',
    notas: '',
  });

  // Estados de Nuevo Comercio
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [posNuevo, setPosNuevo] = useState(null);
  const [precisionGps, setPrecisionGps] = useState(null);
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [fotoNueva, setFotoNueva] = useState(null);
  const [formNuevo, setFormNuevo] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    whatsapp: '',
    notas: '',
  });

  // Modal WhatsApp
  const [modalWhatsAppAbierto, setModalWhatsAppAbierto] = useState(false);
  const [comercioWhatsApp, setComercioWhatsApp] = useState(null);
  const [tipoPlantilla, setTipoPlantilla] = useState('catalogo');
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [enlaceCatalogo, setEnlaceCatalogo] = useState('https://mi-catalogo.com');

  // Modo Manejo
  const [modoManejo, setModoManejo] = useState(false);
  const [posicionAuto, setPosicionAuto] = useState(null);
  const [comercioCercano, setComercioCercano] = useState(null);
  const [distanciaCercana, setDistanciaCercana] = useState(null);
  const [alertaActiva, setAlertaActiva] = useState(false);
  const [radioAlerta, setRadioAlerta] = useState(70);
  const watchIdRef = useRef(null);
  const watchTrackingIdRef = useRef(null);
  const ultimoComercioSonadoRef = useRef(null);

  const fileInputRefNuevo = useRef(null);
  const fileInputRefEdicion = useRef(null);

  useEffect(() => {
    cargarComercios();
  }, []);

  // Cronómetro de la jornada
  useEffect(() => {
    if (!jornadaActiva || !horaInicioJornada) {
      setTiempoTranscurrido('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const inicio = new Date(horaInicioJornada).getTime();
      const ahora = new Date().getTime();
      const diff = Math.max(0, ahora - inicio);

      const horas = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
      const minutos = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const segundos = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
      setTiempoTranscurrido(`${horas}:${minutos}:${segundos}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [jornadaActiva, horaInicioJornada]);

  // Tracking activo durante jornada
  useEffect(() => {
    if (jornadaActiva) {
      iniciarTrackingGPS();
    } else {
      detenerTrackingGPS();
    }
    return () => detenerTrackingGPS();
  }, [jornadaActiva]);

  const iniciarTrackingGPS = () => {
    if (!navigator.geolocation) return;
    if (watchTrackingIdRef.current !== null) return;

    watchTrackingIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosicionAuto([lat, lng]);

        // Registrar punto en recorrido si se movió más de 15 metros del último
        setRecorridoRuta((prev) => {
          if (prev.length > 0) {
            const ultimo = prev[prev.length - 1];
            const dist = calcularDistanciaMetros(ultimo[0], ultimo[1], lat, lng);
            if (dist < 15) return prev; // evitar acumulación de ruido GPS en reposo
          }
          const nuevoRecorrido = [...prev, [lat, lng]];
          localStorage.setItem('rc_recorrido_ruta', JSON.stringify(nuevoRecorrido));
          return nuevoRecorrido;
        });

        if (modoManejo) {
          evaluarProximidad(lat, lng);
        }
      },
      (err) => console.log('Error tracking GPS:', err),
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
  };

  const detenerTrackingGPS = () => {
    if (watchTrackingIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchTrackingIdRef.current);
      watchTrackingIdRef.current = null;
    }
  };

  // Controles de Jornada
  const toggleJornada = () => {
    if (!jornadaActiva) {
      const ahora = new Date().toISOString();
      setJornadaActiva(true);
      setHoraInicioJornada(ahora);
      setComerciosJornadaCount(0);
      localStorage.setItem('rc_jornada_activa', 'true');
      localStorage.setItem('rc_hora_inicio', ahora);
      alert('🟢 ¡Jornada iniciada! Se ha encendido el GPS y el registro del recorrido.');
    } else {
      const confirmar = window.confirm(
        `¿Deseas finalizar la jornada de hoy?\n\nTiempo total trabajado: ${tiempoTranscurrido}\nPuntos registrados en esta sesión: ${comerciosJornadaCount}`
      );
      if (!confirmar) return;

      setJornadaActiva(false);
      localStorage.setItem('rc_jornada_activa', 'false');
      localStorage.removeItem('rc_hora_inicio');
      detenerTrackingGPS();
      alert(`🏁 Jornada finalizada con éxito.\nTotal de tiempo: ${tiempoTranscurrido}`);
    }
  };

  const reiniciarRecorridoRuta = () => {
    const confirmar = window.confirm('¿Deseas limpiar la línea de recorrido visible en el mapa?');
    if (confirmar) {
      setRecorridoRuta([]);
      localStorage.removeItem('rc_recorrido_ruta');
    }
  };

  const cargarComercios = async () => {
    try {
      setCargando(true);
      const { data, error: err } = await supabase
        .from('comercios')
        .select('*')
        .order('id', { ascending: false });

      if (err) throw err;
      setComercios(data || []);
    } catch (e) {
      console.error('Error al cargar:', e);
    } finally {
      setCargando(false);
    }
  };

  // Captura de fotos
  const capturarFotoNueva = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const foto = await comprimirImagen(file);
      setFotoNueva(foto);
    } catch (err) {
      console.error('Error foto:', err);
    }
  };

  const capturarFotoEdicion = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const foto = await comprimirImagen(file);
      setFotoEdicion(foto);
    } catch (err) {
      console.error('Error foto:', err);
    }
  };

  // Modo Manejo
  const toggleModoManejo = () => {
    if (modoManejo) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setModoManejo(false);
      setAlertaActiva(false);
      setComercioCercano(null);
    } else {
      if (!navigator.geolocation) {
        alert('Geolocalización no disponible');
        return;
      }
      setModoManejo(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosicionAuto([lat, lng]);
          evaluarProximidad(lat, lng);
        },
        (err) => console.error('GPS error:', err),
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    }
  };

  const evaluarProximidad = (autoLat, autoLng) => {
    if (!comercios.length) return;
    let masCercano = null;
    let menorDistancia = Infinity;

    comercios.forEach((c) => {
      const cLat = c.ubicacion_exacta_latitud || c.latitud;
      const cLng = c.ubicacion_exacta_longitud || c.longitud;
      if (!cLat || !cLng) return;

      const d = calcularDistanciaMetros(autoLat, autoLng, cLat, cLng);
      if (d < menorDistancia) {
        menorDistancia = d;
        masCercano = c;
      }
    });

    if (masCercano) {
      setDistanciaCercana(menorDistancia);
      setComercioCercano(masCercano);

      if (menorDistancia <= radioAlerta) {
        setAlertaActiva(true);
        if (ultimoComercioSonadoRef.current !== masCercano.id) {
          reproducirBeep();
          ultimoComercioSonadoRef.current = masCercano.id;
        }
      } else {
        setAlertaActiva(false);
      }
    }
  };

  // Plantillas de WhatsApp
  const generarTextoMensaje = (plantilla, comercio) => {
    const nombre = comercio?.nombre || 'Estimado cliente';
    const contacto = comercio?.contacto ? ` ${comercio.contacto}` : '';

    if (plantilla === 'catalogo') {
      return `¡Hola${contacto}! 👋 Te escribo desde RutaComercio para ${nombre}.\n\nTe comparto nuestro Catálogo Oficial y Lista de Precios:\n🔗 ${enlaceCatalogo}\n\nQuedo a tu disposición por cualquier consulta o pedido. ¡Muchas gracias!`;
    } else if (plantilla === 'ofertas') {
      return `¡Hola${contacto}! 🔥 Tenemos promociones especiales y descuentos exclusivos esta semana para ${nombre}.\n\nPuedes revisar las ofertas aquí:\n🔗 ${enlaceCatalogo}\n\nAvísame si necesitas reposición de stock. ¡Saludos!`;
    } else {
      return `¡Hola${contacto} de ${nombre}! 👋 Estuve visitando la zona hoy. Te dejo mi contacto directo para coordinar tu próximo pedido.\n\n¡Que tengas un excelente día!`;
    }
  };

  const abrirModalWhatsApp = (comercio) => {
    if (!comercio.whatsapp) {
      alert('⚠️ Este comercio no tiene WhatsApp. Puedes agregarlo en "Editar".');
      return;
    }
    setComercioWhatsApp(comercio);
    const textoInicial = generarTextoMensaje('catalogo', comercio);
    setTipoPlantilla('catalogo');
    setMensajePersonalizado(textoInicial);
    setModalWhatsAppAbierto(true);
  };

  const cambiarPlantilla = (nuevaPlantilla) => {
    setTipoPlantilla(nuevaPlantilla);
    setMensajePersonalizado(generarTextoMensaje(nuevaPlantilla, comercioWhatsApp));
  };

  const enviarWhatsAppFinal = () => {
    if (!comercioWhatsApp || !comercioWhatsApp.whatsapp) return;
    const telefonoLimpio = formatearNumeroWhatsApp(comercioWhatsApp.whatsapp);
    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensajePersonalizado)}`;
    window.open(url, '_blank');
    setModalWhatsAppAbierto(false);
  };

  // Registrar Nuevo Comercio
  const iniciarNuevoComercio = () => {
    setMensajeExito('');
    setFotoNueva(null);
    setFormNuevo({
      nombre: '',
      contacto: '',
      telefono: '',
      whatsapp: '',
      notas: '',
    });

    if (posicionAuto) {
      setPosNuevo([posicionAuto[0], posicionAuto[1]]);
      setPrecisionGps(8);
      setModalNuevoAbierto(true);
      return;
    }

    if (!navigator.geolocation) {
      setPosNuevo([-34.719, -58.265]);
      setModalNuevoAbierto(true);
      return;
    }

    setObteniendoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosNuevo([pos.coords.latitude, pos.coords.longitude]);
        setPrecisionGps(Math.round(pos.coords.accuracy || 10));
        setObteniendoGps(false);
        setModalNuevoAbierto(true);
      },
      (err) => {
        console.error('Error GPS:', err);
        setObteniendoGps(false);
        setPosNuevo([-34.719, -58.265]);
        setModalNuevoAbierto(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const guardarNuevoComercio = async () => {
    if (!posNuevo) return;
    try {
      setGuardando(true);
      const ahora = new Date();
      const nuevoId = Date.now();

      const nuevoRegistro = {
        id: nuevoId,
        created_at: ahora.toISOString(),
        fecha_registro: ahora.toLocaleString('es-AR'),
        latitud: posNuevo[0],
        longitud: posNuevo[1],
        precision: precisionGps || 10,
        nombre: formNuevo.nombre.trim(),
        contacto: formNuevo.contacto.trim(),
        telefono: formNuevo.telefono.trim(),
        whatsapp: formNuevo.whatsapp.trim(),
        notas: formNuevo.notas.trim(),
        ubicacion_exacta_latitud: posNuevo[0],
        ubicacion_exacta_longitud: posNuevo[1],
        foto_url: fotoNueva || null,
      };

      const { error: err } = await supabase
        .from('comercios')
        .insert([nuevoRegistro]);

      if (err) throw err;

      setComercios((prev) => [nuevoRegistro, ...prev]);
      if (jornadaActiva) {
        setComerciosJornadaCount((c) => c + 1);
      }

      setMensajeExito('🎉 ¡Comercio guardado exitosamente!');
      setTimeout(() => {
        setModalNuevoAbierto(false);
        setMensajeExito('');
      }, 1000);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setGuardando(false);
    }
  };

  // Abrir y Editar
  const abrirEdicion = (c) => {
    setComercioSeleccionado(c);
    setMensajeExito('');
    setFotoEdicion(c.foto_url || null);
    setForm({
      nombre: c.nombre || '',
      contacto: c.contacto || '',
      telefono: c.telefono || '',
      whatsapp: c.whatsapp || '',
      notas: c.notas || '',
    });
    const lat = c.ubicacion_exacta_latitud || c.latitud || -34.719;
    const lng = c.ubicacion_exacta_longitud || c.longitud || -58.265;
    setPosExacta([lat, lng]);
  };

  const guardarCambios = async () => {
    if (!comercioSeleccionado || !posExacta) return;
    try {
      setGuardando(true);
      const datosActualizados = {
        nombre: form.nombre,
        contacto: form.contacto,
        telefono: form.telefono,
        whatsapp: form.whatsapp,
        notas: form.notas,
        ubicacion_exacta_latitud: posExacta[0],
        ubicacion_exacta_longitud: posExacta[1],
        foto_url: fotoEdicion || comercioSeleccionado.foto_url || null,
      };

      const { error: err } = await supabase
        .from('comercios')
        .update(datosActualizados)
        .eq('id', comercioSeleccionado.id);

      if (err) throw err;

      setComercios((prev) =>
        prev.map((item) =>
          item.id === comercioSeleccionado.id ? { ...item, ...datosActualizados } : item
        )
      );

      setMensajeExito('✅ Cambios guardados');
      setTimeout(() => {
        setComercioSeleccionado(null);
        setMensajeExito('');
      }, 1000);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar Comercio
  const eliminarComercio = async () => {
    if (!comercioSeleccionado) return;
    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar "${comercioSeleccionado.nombre || 'este comercio'}"? Esta acción no se puede deshacer.`
    );
    if (!confirmacion) return;

    try {
      setEliminando(true);
      const { error: err } = await supabase
        .from('comercios')
        .delete()
        .eq('id', comercioSeleccionado.id);

      if (err) throw err;

      setComercios((prev) => prev.filter((item) => item.id !== comercioSeleccionado.id));
      setComercioSeleccionado(null);
      alert('🗑️ Comercio eliminado');
    } catch (e) {
      alert('Error al eliminar: ' + e.message);
    } finally {
      setEliminando(false);
    }
  };

  const comerciosFiltrados = comercios.filter((c) => {
    const tieneNombre = c.nombre && c.nombre.trim().length > 0;
    if (soloSinNombre && tieneNombre) return false;
    const texto = `${c.nombre || ''} ${c.contacto || ''} ${c.telefono || ''} ${c.whatsapp || ''} ${c.notas || ''} ${c.id}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: modoManejo ? '#090d16' : '#f1f5f9',
      color: modoManejo ? '#ffffff' : '#0f172a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '12px',
      paddingBottom: modoManejo ? '120px' : '40px',
      boxSizing: 'border-box',
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>

        {/* BARRA SUPERIOR CON ESTADO DE JORNADA */}
        <div style={{
          backgroundColor: modoManejo ? '#131b2e' : '#ffffff',
          borderRadius: '16px',
          padding: '12px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: modoManejo ? '1px solid #1e293b' : '1px solid #e2e8f0',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                📍 RutaComercio
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: modoManejo ? '#94a3b8' : '#64748b' }}>
                {comercios.length} comercios registrados
              </p>
            </div>

            <button
              onClick={toggleModoManejo}
              style={{
                backgroundColor: modoManejo ? '#ef4444' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: modoManejo ? '0 0 12px rgba(239,68,68,0.6)' : 'none'
              }}
            >
              {modoManejo ? '⏹ Salir' : '🚗 Modo Manejo'}
            </button>
          </div>

          {/* BARRA DE CONTROL DE JORNADA DIARIA */}
          <div style={{
            marginTop: '10px',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: jornadaActiva ? (modoManejo ? '#14532d' : '#ecfdf5') : (modoManejo ? '#1e293b' : '#f8fafc'),
            border: jornadaActiva ? '1px solid #10b981' : '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: jornadaActiva ? '#10b981' : '#94a3b8',
                  boxShadow: jornadaActiva ? '0 0 8px #10b981' : 'none'
                }}></span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: jornadaActiva ? '#059669' : '#64748b' }}>
                  {jornadaActiva ? 'JORNADA ACTIVA' : 'JORNADA EN PAUSA'}
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '900', marginTop: '2px', color: modoManejo ? '#ffffff' : '#0f172a' }}>
                {jornadaActiva ? `⏱ ${tiempoTranscurrido}` : 'Toca para iniciar tu día'}
              </div>
              {jornadaActiva && recorridoRuta.length > 0 && (
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  🛤️ {recorridoRuta.length} puntos GPS guardados hoy
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={toggleJornada}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: jornadaActiva ? '#ef4444' : '#10b981',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                {jornadaActiva ? '🔴 Finalizar' : '🟢 Iniciar'}
              </button>
              {recorridoRuta.length > 0 && (
                <button
                  onClick={reiniciarRecorridoRuta}
                  title="Borrar línea de mapa"
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#e2e8f0',
                    color: '#475569',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  🧹
                </button>
              )}
            </div>
          </div>

          {/* Botón registrar en vista normal */}
          {!modoManejo && (
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={iniciarNuevoComercio}
                disabled={obteniendoGps}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 3px 8px rgba(22,163,74,0.3)'
                }}
              >
                <span>{obteniendoGps ? '📡 Obteniendo GPS...' : '➕ REGISTRAR NUEVO COMERCIO'}</span>
              </button>
            </div>
          )}
        </div>

        {/* VISTA MODO MANEJO */}
        {modoManejo ? (
          <div>
            {/* Alerta de proximidad */}
            <div style={{
              backgroundColor: alertaActiva ? '#b91c1c' : '#1e293b',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '14px',
              marginBottom: '10px',
              border: alertaActiva ? '2px solid #ef4444' : '1px solid #334155',
              boxShadow: alertaActiva ? '0 0 20px rgba(239,68,68,0.7)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              {comercioCercano ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: alertaActiva ? '#fef08a' : '#38bdf8' }}>
                      {alertaActiva ? '🚨 ¡COMERCIO EN TU RADIO!' : '📍 COMERCIO MÁS CERCANO'}
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: '900', backgroundColor: alertaActiva ? '#7f1d1d' : '#0f172a', padding: '3px 10px', borderRadius: '8px' }}>
                      {distanciaCercana} m
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
                    {comercioCercano.foto_url && (
                      <img
                        src={comercioCercano.foto_url}
                        alt="Fachada"
                        style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ffffff' }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>
                        {comercioCercano.nombre || `Punto #${String(comercioCercano.id).slice(-4)}`}
                      </h2>
                      {comercioCercano.contacto && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
                          👤 {comercioCercano.contacto}
                        </p>
                      )}
                      {comercioCercano.notas && (
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📝 {comercioCercano.notas}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                    <button
                      onClick={() => abrirEdicion(comercioCercano)}
                      style={{ flex: 1, padding: '10px', backgroundColor: '#ffffff', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                    >
                      ✏️ Editar
                    </button>
                    {comercioCercano.whatsapp && (
                      <button
                        onClick={() => abrirModalWhatsApp(comercioCercano)}
                        style={{ flex: 1.2, padding: '10px', backgroundColor: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        💬 Catálogo WA
                      </button>
                    )}
                    {comercioCercano.telefono && (
                      <a
                        href={`tel:${comercioCercano.telefono}`}
                        style={{ padding: '10px 12px', backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}
                      >
                        📞
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px', fontSize: '13px' }}>
                  ⏳ Siguiendo ruta GPS en tiempo real...
                </div>
              )}
            </div>

            {/* MAPA MODO MANEJO CON LÍNEA DE RECORRIDO (POLYLINE) */}
            <div style={{ height: '330px', borderRadius: '16px', overflow: 'hidden', border: '2px solid #334155', position: 'relative' }}>
              <MapContainer center={posicionAuto || [-34.719, -58.265]} zoom={17} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {posicionAuto && <CentrarMapa posicion={posicionAuto} />}

                {/* Línea de recorrido GPS acumulada */}
                {recorridoRuta.length > 1 && (
                  <Polyline
                    positions={recorridoRuta}
                    pathOptions={{ color: '#06b6d4', weight: 5, opacity: 0.85, lineJoin: 'round' }}
                  />
                )}

                {posicionAuto && (
                  <>
                    <Marker position={posicionAuto} icon={pinConductor} />
                    <Circle center={posicionAuto} radius={radioAlerta} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.15 }} />
                  </>
                )}
                {comercios.map((c) => {
                  const lat = c.ubicacion_exacta_latitud || c.latitud;
                  const lng = c.ubicacion_exacta_longitud || c.longitud;
                  if (!lat || !lng) return null;
                  return (
                    <Marker key={c.id} position={[lat, lng]} icon={pinComercio} eventHandlers={{ click: () => abrirEdicion(c) }} />
                  );
                })}
              </MapContainer>
            </div>

            {/* BOTÓN EXTRA ALTO FLOTANTE */}
            <div style={{
              position: 'fixed',
              bottom: '16px',
              left: '12px',
              right: '12px',
              maxWidth: '440px',
              margin: '0 auto',
              zIndex: 9000
            }}>
              <button
                onClick={iniciarNuevoComercio}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '20px 16px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: '3px solid #ffffff',
                  borderRadius: '22px',
                  fontSize: '19px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: '0 10px 28px rgba(22,163,74,0.7)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}
              >
                <span style={{ fontSize: '32px', lineHeight: 1 }}>➕</span>
                <span style={{ lineHeight: 1.1 }}>REGISTRAR COMERCIO AQUÍ</span>
              </button>
            </div>
          </div>
        ) : (
          /* MODO LISTA NORMAL */
          <div>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '12px 14px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, contacto, notas..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button
                  onClick={() => setSoloSinNombre(false)}
                  style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', backgroundColor: !soloSinNombre ? '#2563eb' : '#f1f5f9', color: !soloSinNombre ? '#ffffff' : '#64748b' }}
                >
                  Todos ({comercios.length})
                </button>
                <button
                  onClick={() => setSoloSinNombre(true)}
                  style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', backgroundColor: soloSinNombre ? '#f59e0b' : '#f1f5f9', color: soloSinNombre ? '#ffffff' : '#64748b' }}
                >
                  Sin Nombre ({comercios.filter((c) => !c.nombre).length})
                </button>
              </div>
            </div>

            {/* Listado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comerciosFiltrados.map((c) => {
                const tieneNombre = c.nombre && c.nombre.trim().length > 0;
                const tieneUbicacionExacta = !!c.ubicacion_exacta_latitud;
                const tieneFoto = !!c.foto_url;
                const tieneWa = !!c.whatsapp;

                return (
                  <div
                    key={c.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      padding: '12px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div
                      onClick={() => abrirEdicion(c)}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '10px',
                        backgroundColor: tieneFoto ? 'transparent' : '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                        cursor: 'pointer'
                      }}
                    >
                      {tieneFoto ? (
                        <img src={c.foto_url} alt="Fachada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '22px' }}>{tieneNombre ? '🏪' : '📍'}</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }} onClick={() => abrirEdicion(c)}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tieneNombre ? c.nombre : `Punto #${String(c.id).slice(-4)}`}
                      </h3>
                      {c.contacto && (
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          👤 {c.contacto}
                        </p>
                      )}
                      {c.notas && (
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📝 {c.notas}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: tieneUbicacionExacta ? '#dcfce7' : '#fee2e2',
                          color: tieneUbicacionExacta ? '#15803d' : '#b91c1c',
                          fontWeight: '600'
                        }}>
                          {tieneUbicacionExacta ? '🎯 Corregido' : '⚠️ GPS crudo'}
                        </span>
                        {tieneFoto && (
                          <span style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            fontWeight: '600'
                          }}>
                            📸 Foto
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {tieneWa && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalWhatsApp(c);
                          }}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#22c55e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          💬 WA
                        </button>
                      )}
                      <button
                        onClick={() => abrirEdicion(c)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#f1f5f9',
                          color: '#2563eb',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Editar ›
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL WHATSAPP */}
        {modalWhatsAppAbierto && comercioWhatsApp && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '12px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '20px',
              padding: '18px',
              maxWidth: '430px',
              width: '100%',
              maxHeight: '94vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px' }}>💬</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#15803d' }}>
                      Enviar WhatsApp
                    </h2>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {comercioWhatsApp.nombre || 'Comercio'} • {comercioWhatsApp.whatsapp}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setModalWhatsAppAbierto(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#166534', display: 'block', marginBottom: '4px' }}>
                  🔗 LINK DEL CATÁLOGO / LISTA
                </label>
                <input
                  type="text"
                  value={enlaceCatalogo}
                  onChange={(e) => {
                    setEnlaceCatalogo(e.target.value);
                    const nuevo = mensajePersonalizado.replace(/🔗 .*/g, `🔗 ${e.target.value}`);
                    setMensajePersonalizado(nuevo);
                  }}
                  placeholder="https://tucatalogo.com/lista.pdf"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  PLANTILLA:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button
                    onClick={() => cambiarPlantilla('catalogo')}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      backgroundColor: tipoPlantilla === 'catalogo' ? '#22c55e' : '#f1f5f9',
                      color: tipoPlantilla === 'catalogo' ? '#ffffff' : '#334155'
                    }}
                  >
                    📋 Catálogo
                  </button>
                  <button
                    onClick={() => cambiarPlantilla('ofertas')}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      backgroundColor: tipoPlantilla === 'ofertas' ? '#f59e0b' : '#f1f5f9',
                      color: tipoPlantilla === 'ofertas' ? '#ffffff' : '#334155'
                    }}
                  >
                    🔥 Ofertas
                  </button>
                  <button
                    onClick={() => cambiarPlantilla('visita')}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      backgroundColor: tipoPlantilla === 'visita' ? '#3b82f6' : '#f1f5f9',
                      color: tipoPlantilla === 'visita' ? '#ffffff' : '#334155'
                    }}
                  >
                    🤝 Visita
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  MENSAJE LISTO PARA ENVIAR:
                </label>
                <textarea
                  rows={6}
                  value={mensajePersonalizado}
                  onChange={(e) => setMensajePersonalizado(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    lineHeight: '1.4',
                    boxSizing: 'border-box',
                    backgroundColor: '#fafafa'
                  }}
                />
              </div>

              <button
                onClick={enviarWhatsAppFinal}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(34,197,94,0.4)'
                }}
              >
                <span style={{ fontSize: '20px' }}>🚀</span>
                <span>ABRIR EN WHATSAPP Y ENVIAR</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL REGISTRAR NUEVO */}
        {modalNuevoAbierto && posNuevo && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '12px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '20px',
              padding: '18px',
              maxWidth: '430px',
              width: '100%',
              maxHeight: '94vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>
                    📍 Nuevo Comercio
                  </h2>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    GPS Fijado ±{precisionGps || 10}m
                  </span>
                </div>
                <button
                  onClick={() => setModalNuevoAbierto(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* FOTO */}
              <div style={{
                marginBottom: '10px',
                padding: '8px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                textAlign: 'center'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRefNuevo}
                  onChange={capturarFotoNueva}
                  style={{ display: 'none' }}
                />

                {fotoNueva ? (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={fotoNueva}
                      alt="Fachada"
                      style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefNuevo.current?.click()}
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Cambiar Foto
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefNuevo.current?.click()}
                    style={{
                      width: '100%',
                      padding: '11px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    📷 Tomar Foto de la Fachada (Opcional)
                  </button>
                )}
              </div>

              {/* MAPA */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ height: '130px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #16a34a' }}>
                  <MapContainer center={posNuevo} zoom={18} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <ManejadorClicMapa posicion={posNuevo} setPosicion={setPosNuevo} />
                    <Marker
                      position={posNuevo}
                      icon={pinNuevo}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => {
                          const marker = e.target;
                          const pos = marker.getLatLng();
                          setPosNuevo([pos.lat, pos.lng]);
                        },
                      }}
                    />
                  </MapContainer>
                </div>
              </div>

              {/* CAMPOS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    NOMBRE / CARTEL DEL LOCAL
                  </label>
                  <input
                    type="text"
                    value={formNuevo.nombre}
                    onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                    placeholder="Ej. Kiosco El Sol"
                    autoFocus
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    CONTACTO / DUEÑO
                  </label>
                  <input
                    type="text"
                    value={formNuevo.contacto}
                    onChange={(e) => setFormNuevo({ ...formNuevo, contacto: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                      📞 TELÉFONO FIJO
                    </label>
                    <input
                      type="tel"
                      value={formNuevo.telefono}
                      onChange={(e) => setFormNuevo({ ...formNuevo, telefono: e.target.value })}
                      placeholder="Ej. 42241234"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                      💬 WHATSAPP
                    </label>
                    <input
                      type="tel"
                      value={formNuevo.whatsapp}
                      onChange={(e) => setFormNuevo({ ...formNuevo, whatsapp: e.target.value })}
                      placeholder="Ej. 1155667788"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    📝 NOTAS / OBSERVACIONES
                  </label>
                  <textarea
                    rows={2}
                    value={formNuevo.notas}
                    onChange={(e) => setFormNuevo({ ...formNuevo, notas: e.target.value })}
                    placeholder="Observaciones, comentarios..."
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                {mensajeExito && (
                  <div style={{ color: '#16a34a', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
                    {mensajeExito}
                  </div>
                )}

                <button
                  onClick={guardarNuevoComercio}
                  disabled={guardando}
                  style={{
                    marginTop: '6px',
                    width: '100%',
                    padding: '13px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {guardando ? 'Guardando en Supabase...' : '💾 GUARDAR COMERCIO'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL EDITAR COMERCIO */}
        {comercioSeleccionado && posExacta && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '12px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '20px',
              padding: '18px',
              maxWidth: '430px',
              width: '100%',
              maxHeight: '94vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>
                  Editar Punto & Fachada
                </h2>
                <button
                  onClick={() => setComercioSeleccionado(null)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* FOTO */}
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRefEdicion}
                  onChange={capturarFotoEdicion}
                  style={{ display: 'none' }}
                />

                {fotoEdicion ? (
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={fotoEdicion}
                      alt="Fachada"
                      style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefEdicion.current?.click()}
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      📸 Actualizar Foto
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefEdicion.current?.click()}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginBottom: '6px'
                    }}
                  >
                    📷 Tomar Foto de la Fachada
                  </button>
                )}
              </div>

              {/* MAPA */}
              <div style={{ height: '130px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #3b82f6', marginBottom: '10px' }}>
                <MapContainer center={posExacta} zoom={17} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <ManejadorClicMapa posicion={posExacta} setPosicion={setPosExacta} />
                  <Marker
                    position={posExacta}
                    icon={pinComercio}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        setPosExacta([position.lat, position.lng]);
                      },
                    }}
                  />
                </MapContainer>
              </div>

              {/* FORMULARIO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    NOMBRE / CARTEL DEL LOCAL
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Nombre Comercio"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    CONTACTO / DUEÑO
                  </label>
                  <input
                    type="text"
                    value={form.contacto}
                    onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                    placeholder="Contacto"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                      📞 TELÉFONO
                    </label>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      placeholder="Línea / Tel"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                      💬 WHATSAPP
                    </label>
                    <input
                      type="tel"
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      placeholder="WhatsApp"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    📝 NOTAS / OBSERVACIONES
                  </label>
                  <textarea
                    rows={2}
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    placeholder="Observaciones..."
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                {mensajeExito && (
                  <div style={{ color: '#16a34a', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
                    {mensajeExito}
                  </div>
                )}

                <button
                  onClick={guardarCambios}
                  disabled={guardando}
                  style={{
                    marginTop: '4px',
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {guardando ? 'Guardando...' : '💾 Guardar Datos & Foto'}
                </button>

                <button
                  onClick={eliminarComercio}
                  disabled={eliminando}
                  style={{
                    marginTop: '4px',
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {eliminando ? 'Eliminando...' : '🗑️ Eliminar este Comercio'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}