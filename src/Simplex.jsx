import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ícono explícito para que el marcador se vea en Vite.
const iconoClienteSimplex = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// Centra la vista al abrir cada cliente, aunque React reutilice el mapa.
function CentrarMapaClienteSimplex({ centro }) {
  const map = useMap();
  useEffect(() => {
    if (centro && Number.isFinite(centro[0]) && Number.isFinite(centro[1])) {
      map.setView(centro, 16, { animate: false });
    }
  }, [map, centro?.[0], centro?.[1]]);
  return null;
}

// Ajusta el mapa general a los clientes ubicados, sin consultar GPS ni rutas externas.
function AjustarMapaRutaSimplex({ puntos }) {
  const map = useMap();
  const clave = puntos.map(c => `${c.id}:${c.latitud}:${c.longitud}`).join("|");
  useEffect(() => {
    if (!puntos.length) return;
    const bounds = L.latLngBounds(puntos.map(c => [Number(c.latitud), Number(c.longitud)]));
    if (puntos.length === 1) map.setView(bounds.getCenter(), 15, { animate: false });
    else map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15, animate: false });
  }, [map, clave]);
  return null;
}

function SeleccionarPuntoSimplex({ alSeleccionar }) {
  useMapEvents({ click: (e) => alSeleccionar([e.latlng.lat, e.latlng.lng]) });
  return null;
}

import { supabase } from "./supabase";
import TomaPedidos from "./TomaPedidos";
import HistorialCliente from "./HistorialCliente";

export default function Simplex({ sesion: sesionProp, perfil: perfilProp }) {
  const [comercios, setComercios] = useState([]);
  const [mapaClienteAbierto, setMapaClienteAbierto] = useState(false);
  const [paradasRuta, setParadasRuta] = useState([]);
  const [rutaRecuperada, setRutaRecuperada] = useState(false);

  const [puntoCliente, setPuntoCliente] = useState(null);
  const [guardandoPuntoCliente, setGuardandoPuntoCliente] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [comercioSeleccionado, setComercioSeleccionado] = useState(null);
  const [tomandoPedido, setTomandoPedido] = useState(false);
  const [viendoHistorial, setViendoHistorial] = useState(false);
  const [vista, setVista] = useState("dia");
  const [visitasHoy, setVisitasHoy] = useState([]);
  const [visitaActiva, setVisitaActiva] = useState(null);
  const [guardandoVisita, setGuardandoVisita] = useState(false);
  const [motivoSinVenta, setMotivoSinVenta] = useState("No compró");
  const [fechaRevisita, setFechaRevisita] = useState("");
  const [notasVisita, setNotasVisita] = useState("");
  const calendarioRevisitaRef = useRef(null);
  const [mostrarRealizadas, setMostrarRealizadas] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [busquedaVentas, setBusquedaVentas] = useState("");
  const [nuevaVentaDesdeVentas, setNuevaVentaDesdeVentas] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [anulandoVenta, setAnulandoVenta] = useState(false);
  const [revisionVentas, setRevisionVentas] = useState(0);
  const [itemsVentaDetalle, setItemsVentaDetalle] = useState([]);
  const [cargandoDetalleVenta, setCargandoDetalleVenta] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [busquedaPrecio, setBusquedaPrecio] = useState("");
  const [productosPrecio, setProductosPrecio] = useState([]);
  const [desgloseStockAbierto, setDesgloseStockAbierto] = useState({});
  const [cargandoPrecios, setCargandoPrecios] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [listasPrecios, setListasPrecios] = useState([]);
  const [cargandoListas, setCargandoListas] = useState(false);
  const [archivoListaNombre, setArchivoListaNombre] = useState("");
  const [vistaPreviaLista, setVistaPreviaLista] = useState(null);
  const [nombreLista, setNombreLista] = useState("");
  const [codigoLista, setCodigoLista] = useState("");
  const [guardandoLista, setGuardandoLista] = useState(false);
  const [manualAlta, setManualAlta] = useState({codigo:"",descripcion:"",marca:"",gtin:"",precio:"",stock:"0",color:"",talle:""});
  const [variantesManual, setVariantesManual] = useState([]);
  const [modoVarianteExistente, setModoVarianteExistente] = useState(false);
  const [listaActualizando, setListaActualizando] = useState(null);
  const [archivoActualizacionNombre, setArchivoActualizacionNombre] = useState("");
  const [vistaPreviaActualizacion, setVistaPreviaActualizacion] = useState(null);
  const [guardandoActualizacion, setGuardandoActualizacion] = useState(false);
  const inputActualizarListaRef = useRef(null);
  const inputListaRef = useRef(null);
  const inputIngresoStockRef = useRef(null);
  const [vistaPreviaIngresoStock, setVistaPreviaIngresoStock] = useState(null);
  const [guardandoIngresoStock, setGuardandoIngresoStock] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "", direccion: "", localidad: "", partido: "",
    provincia: "", pais: "Argentina", rubro: "General", telefono: "",
  });
  const [resumen, setResumen] = useState({
    cargando: false,
    cantidad: 0,
    total: 0,
    ultimaFecha: null,
    ultimaTotal: 0,
  });

  const perfil = perfilProp || null;
  const sesion = sesionProp || null;

  const claveRuta = perfil?.empresa_id && (sesion?.user?.id || perfil?.id)
    ? `simplex_ruta_manual_v1_${perfil.empresa_id}_${sesion?.user?.id || perfil.id}` : null;

  const fechaLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const cargarVisitasHoy = async () => {
    if (!perfil?.empresa_id) return;
    const comienzo = new Date(); comienzo.setHours(0,0,0,0);
    const fin = new Date(comienzo); fin.setDate(fin.getDate()+1);
    const {data,error} = await supabase.from("visitas").select("id,comercio_id,resultado,observacion,fecha")
      .eq("empresa_id",perfil.empresa_id).gte("fecha",comienzo.toISOString()).lt("fecha",fin.toISOString())
      .order("fecha",{ascending:false});
    if(error) { console.warn("Simplex - visitas:",error); return; }
    setVisitasHoy(data||[]);
  };
  useEffect(() => {
    if (!perfil?.empresa_id) return;
    cargarVisitasHoy();
    const alVolver = () => { if(document.visibilityState === "visible") cargarVisitasHoy(); };
    document.addEventListener("visibilitychange",alVolver);
    return () => document.removeEventListener("visibilitychange",alVolver);
  },[perfil?.empresa_id]);
  const registrarResultadoSimplex = async (resultado,observacion="",revisita="") => {
    if (!visitaActiva?.id || !perfil?.empresa_id || guardandoVisita) return;
    setGuardandoVisita(true);
    try {
      const observacionFinal = [observacion, notasVisita.trim() ? `Notas: ${notasVisita.trim()}` : ""].filter(Boolean).join(" | ");
      const registro = {
        comercio_id: visitaActiva.id,
        comercio_nombre: visitaActiva.nombre || "Cliente",
        preventista: perfil.nombre || sesion?.user?.email || "Vendedor Simplex",
        empresa: perfil.empresa || "Simplex",
        empresa_id: perfil.empresa_id,
        resultado, observacion: observacionFinal || "Visita registrada en Simplex",
        fecha: new Date().toISOString()
      };
      const {error} = await supabase.from("visitas").insert(registro);
      if(error) throw error;
      if(revisita) {
        const {error: errorRevisita} = await supabase.from("comercios")
          .update({revisita_fecha:revisita}).eq("id",visitaActiva.id).eq("empresa_id",perfil.empresa_id);
        if(errorRevisita) alert("La visita quedó registrada, pero no se pudo programar la nueva fecha.");
        else setComercios(prev=>prev.map(c=>String(c.id)===String(visitaActiva.id)?{...c,revisita_fecha:revisita}:c));
      }
      await cargarVisitasHoy();
      setVisitaActiva(null); setComercioSeleccionado(null); setVista("dia");
    } catch(error) {
      console.error("Simplex - resultado de visita:",error);
      alert("❌ No se pudo registrar la visita. Intentá nuevamente.");
    } finally {setGuardandoVisita(false);}
  };
  const iniciarVisitaSimplex = (c) => {
    setVisitaActiva(c); setComercioSeleccionado(c); setMotivoSinVenta("No compró");setFechaRevisita("");setNotasVisita("");
    setVista("visita");
  };
  const [guardandoRuta, setGuardandoRuta] = useState(false);
  const [estadoRuta, setEstadoRuta] = useState("");

  // Primero recupera la ruta local existente; luego busca la versión sincronizada.
  useEffect(() => {
    let cancelado = false;
    const recuperarRuta = async () => {
      setRutaRecuperada(false);
      setEstadoRuta("");
      setParadasRuta([]);
      if (!claveRuta || !perfil?.empresa_id) return;
      let local = [];
      try {
        const guardadas = JSON.parse(localStorage.getItem(claveRuta) || "[]");
        if (Array.isArray(guardadas)) local = guardadas.map(String);
      } catch (error) { console.warn("Simplex - ruta local ilegible", error); }
      if (!cancelado) setParadasRuta(local);
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const usuarioId = authData?.user?.id;
        if (!usuarioId) throw new Error("No hay sesión autenticada.");
        const { data, error } = await supabase.from("simplex_recorridos")
          .select("paradas").eq("empresa_id", perfil.empresa_id)
          .eq("usuario_id", usuarioId).maybeSingle();
        if (error) throw error;
        if (cancelado) return;
        if (data && Array.isArray(data.paradas)) {
          const remota = data.paradas.map(String);
          setParadasRuta(remota);
          localStorage.setItem(claveRuta, JSON.stringify(remota));
          setEstadoRuta("☁️ Recorrido recuperado correctamente.");
        } else {
          setEstadoRuta(local.length
            ? "📱 Recorrido anterior recuperado de este dispositivo. Guardalo para sincronizarlo."
            : "☁️ Sin recorrido guardado todavía. Podés crear uno.");
        }
      } catch (error) {
        console.error("Simplex - error recuperando recorrido de Supabase:", error);
        if (!cancelado) setEstadoRuta("⚠️ No se pudo recuperar el recorrido en línea. Tu recorrido local sigue disponible.");
      } finally {
        if (!cancelado) setRutaRecuperada(true);
      }
    };
    recuperarRuta();
    return () => { cancelado = true; };
  }, [claveRuta, perfil?.empresa_id]);

  const guardarRutaSincronizada = async () => {
    if (!claveRuta || !perfil?.empresa_id) return alert("⚠️ No pude identificar la empresa para guardar la ruta.");
    if (guardandoRuta || !rutaRecuperada) return;
    setGuardandoRuta(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const usuarioId = authData?.user?.id;
      if (!usuarioId) throw new Error("No hay sesión autenticada.");
      const { error } = await supabase.from("simplex_recorridos").upsert({
        empresa_id: perfil.empresa_id,
        usuario_id: usuarioId,
        paradas: paradasRuta.map(String),
        actualizado_en: new Date().toISOString()
      }, { onConflict: "empresa_id,usuario_id" });
      if (error) throw error;
      try { localStorage.setItem(claveRuta, JSON.stringify(paradasRuta)); }
      catch (localError) { console.warn("Simplex - no se pudo actualizar copia local", localError); }
      setEstadoRuta("☁️ Recorrido guardado y disponible en otros dispositivos.");
      alert("✅ Recorrido guardado correctamente. Ya podés abrirlo desde otro dispositivo con la misma cuenta.");
    } catch (error) {
      console.error("Simplex - error guardando recorrido:", error);
      setEstadoRuta("⚠️ No se pudo sincronizar el recorrido.");
      alert(`❌ No se pudo guardar el recorrido en línea.\n\n${error?.message || "Error desconocido"}\n\nTu recorrido sigue visible en pantalla.`);
    } finally { setGuardandoRuta(false); }
  };

  const moverParada = (indice, direccion) => {
    setParadasRuta(actual => {
      const siguiente = [...actual];
      const destino = indice + direccion;
      if (destino < 0 || destino >= siguiente.length) return actual;
      [siguiente[indice], siguiente[destino]] = [siguiente[destino], siguiente[indice]];
      return siguiente;
    });
  };


  useEffect(() => {
    let cancelado = false;

    const cargarComercios = async () => {
      setCargando(true);
      try {
        let query = supabase
          .from("comercios")
          .select("*")
          .eq("no_visitar", false)
          .order("nombre", { ascending: true });

        // Simplex trabaja con la cartera completa de la empresa.
        // RLS sigue siendo la protección principal y reforzamos empresa_id aquí.
        if (perfil?.empresa_id) {
          query = query.eq("empresa_id", perfil.empresa_id);
        } else if (perfil?.empresa) {
          query = query.ilike("empresa", String(perfil.empresa).trim());
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelado) setComercios(data || []);
      } catch (error) {
        console.error("Simplex - error cargando clientes:", error);
        if (!cancelado) setComercios([]);
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    if (perfil) cargarComercios();
    else setCargando(false);

    return () => {
      cancelado = true;
    };
  }, [perfil?.empresa_id, perfil?.empresa]);

  useEffect(() => {
    let cancelado = false;

    const cargarResumen = async () => {
      if (!comercioSeleccionado?.id) {
        setResumen({
          cargando: false,
          cantidad: 0,
          total: 0,
          ultimaFecha: null,
          ultimaTotal: 0,
        });
        return;
      }

      setResumen((prev) => ({ ...prev, cargando: true }));

      try {
        let query = supabase
          .from("pedidos")
          .select("fecha, total, estado")
          .eq("comercio_id", String(comercioSeleccionado.id))
          .order("fecha", { ascending: false });

        if (perfil?.empresa_id) {
          query = query.eq("empresa_id", perfil.empresa_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (cancelado) return;

        const ventas = (data || []).filter(p => String(p.estado || "").trim().toLowerCase() !== "anulada");
        setResumen({
          cargando: false,
          cantidad: ventas.length,
          total: ventas.reduce((acc, p) => acc + Number(p.total || 0), 0),
          ultimaFecha: ventas[0]?.fecha || null,
          ultimaTotal: Number(ventas[0]?.total || 0),
        });
      } catch (error) {
        console.error("Simplex - error cargando resumen:", error);
        if (!cancelado) {
          setResumen({
            cargando: false,
            cantidad: 0,
            total: 0,
            ultimaFecha: null,
            ultimaTotal: 0,
          });
        }
      }
    };

    cargarResumen();

    return () => {
      cancelado = true;
    };
  }, [comercioSeleccionado?.id, perfil?.empresa_id, revisionVentas]);




  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return comercios;

    return comercios.filter((c) => {
      const nombre = String(c.nombre || "").toLowerCase();
      const direccion = String(c.direccion || "").toLowerCase();
      const rubro = String(c.rubro || "").toLowerCase();
      const id = String(c.id || "").toLowerCase();
      const telefono = String(c.telefono || "").toLowerCase();

      return (
        nombre.includes(q) ||
        direccion.includes(q) ||
        rubro.includes(q) ||
        id.includes(q) ||
        telefono.includes(q)
      );
    });
  }, [comercios, busqueda]);

  const cargarListasPrecios = async () => {
    if (!perfil?.empresa_id) return;
    setCargandoListas(true);
    try {
      const { data, error } = await supabase.from("listas_precios")
        .select("id,nombre,codigo,descripcion,activo,predeterminada,empresa,empresa_id")
        .eq("empresa_id", perfil.empresa_id).eq("activo", true)
        .order("predeterminada", { ascending:false }).order("nombre", { ascending:true });
      if (error) throw error;
      setListasPrecios(data || []);
    } catch (error) {
      console.error("Simplex - error cargando listas:", error);
      setListasPrecios([]);
    } finally { setCargandoListas(false); }
  };

  const cargarProductosParaConsulta = async () => {
    if (!perfil?.empresa_id) return;
    setCargandoPrecios(true);
    try {
      const { data: listas, error: errorListas } = await supabase
        .from("listas_precios").select("id,predeterminada")
        .eq("empresa_id", perfil.empresa_id).eq("activo", true)
        .order("predeterminada", { ascending:false });
      if (errorListas) throw errorListas;

      const listaBase = (listas || []).find(l => l.predeterminada) || (listas || [])[0];
      if (!listaBase?.id) { setProductosPrecio([]); return; }

      const { data, error } = await supabase
        .from("lista_productos")
        .select("id,producto_id,codigo_lista,detalle_en_lista,precio,productos(id,codigo_cge,nombre,descripcion,marca,gtin,usa_color,usa_talle)")
        .eq("lista_id", listaBase.id).eq("activo", true);
      if (error) throw error;

      const productosBase = (data || []).map(x => ({
        id:x.producto_id || x.id,
        codigo:x.codigo_lista || x.productos?.codigo_cge || "",
        cge:x.productos?.codigo_cge || "",
        nombre:x.productos?.nombre || x.detalle_en_lista || "Producto",
        descripcion:x.productos?.descripcion || "",
        marca:x.productos?.marca || "",
        gtin:x.productos?.gtin || "",
        precio:Number(x.precio || 0),
        stock:null,
        variantesStock:[],
        usaColor:x.productos?.usa_color === true,
        usaTalle:x.productos?.usa_talle === true
      }));

      const productoIds = [...new Set(productosBase.map(p => p.id).filter(Boolean))];

      const { data: depositoPrincipal, error: errorDeposito } = await supabase
        .from("stock_depositos").select("id")
        .eq("empresa_id", perfil.empresa_id).eq("activo", true)
        .eq("es_principal", true).limit(1).maybeSingle();
      if (errorDeposito) throw errorDeposito;

      if (productoIds.length > 0 && depositoPrincipal?.id) {
        // Fuente operativa: la misma tabla utilizada al descontar/revertir NVI.
        // Nunca usar stock_informado como disponible: contiene importaciones históricas.
        // Se suman variantes del depósito principal, sin confundir "sin dato" con cero.
        const stockPorProducto = new Map();
        const variantesPorProducto = new Map();
        const lote = 150;
        for (let i = 0; i < productoIds.length; i += lote) {
          const { data: stockData, error: errorStock } = await supabase
            .from("stock_por_deposito")
            .select("producto_id,cantidad,color,talle")
            .eq("empresa_id", perfil.empresa_id)
            .eq("deposito_id", depositoPrincipal.id)
            .in("producto_id", productoIds.slice(i, i + lote));
          if (errorStock) throw errorStock;
          (stockData || []).forEach(s => {
            const clave = String(s.producto_id);
            stockPorProducto.set(clave, (stockPorProducto.get(clave) || 0) + Number(s.cantidad || 0));
            if (!variantesPorProducto.has(clave)) variantesPorProducto.set(clave, []);
            variantesPorProducto.get(clave).push({
              color: String(s.color || "").trim(),
              talle: String(s.talle || "").trim(),
              cantidad: Number(s.cantidad || 0)
            });
          });
        }
        productosBase.forEach(p => {
          const clave = String(p.id);
          if (stockPorProducto.has(clave)) p.stock = stockPorProducto.get(clave);
          p.variantesStock = (variantesPorProducto.get(clave) || []).sort((a,b) =>
            a.color.localeCompare(b.color, "es") || a.talle.localeCompare(b.talle, "es", {numeric:true}));
        });
      }

      setProductosPrecio(productosBase);
    } catch(error) {
      console.error("Simplex - error consultando precios:",error);
      setProductosPrecio([]);
      alert(`❌ No pude cargar los precios. ${error?.message || ""}`.trim());
    } finally { setCargandoPrecios(false); }
  };

  // Ajuste manual de prueba: solo se ofrece en SIMPLEX DEMO.
  // El servidor comprueba la pertenencia del artículo y del depósito a la empresa.
  const corregirStockSimplex = async (producto) => {
    if (perfil?.empresa_id !== "27f69558-681d-46ae-a7fb-e23b45550918") {
      alert("La corrección manual se habilitará después de las pruebas de Simplex.");
      return;
    }
    const valor = window.prompt(
      `Cantidad REAL en el depósito principal para ${producto.nombre} (sin color ni talle):`,
      producto.stock == null ? "0" : String(producto.stock)
    );
    if (valor === null) return;
    const texto = valor.trim().replace(",", ".");
    const cantidad = Number(texto);
    if (!texto || !Number.isFinite(cantidad) || cantidad < 0 || !Number.isInteger(cantidad)) {
      alert("Ingresá una cantidad entera igual o mayor a cero.");
      return;
    }
    if (!window.confirm(`¿Establecer ${cantidad} unidades de ${producto.nombre}?\n\nEsto REEMPLAZA el stock actual y queda registrado.`)) return;
    try {
      const { data, error } = await supabase.rpc("simplex_actualizar_stock", {
        p_tipo: "correccion_manual",
        p_productos: [{ producto_id: producto.id, color: "", talle: "", cantidad }],
        p_referencia_importacion: null,
        p_observacion: "Corrección manual desde Simplex"
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("No se confirmó la corrección.");
      await cargarProductosParaConsulta();
      alert("Stock corregido y movimiento registrado.");
    } catch (error) {
      console.error("Simplex - corrección de stock:", error);
      alert(`No se pudo corregir el stock. ${error?.message || ""}`);
    }
  };

  // Ajusta SOLO la fila color/talle seleccionada en el depósito principal.
  const corregirStockVarianteSimplex = async (producto, variante) => {
    const etiqueta = [variante.color && `color ${variante.color}`, variante.talle && `talle ${variante.talle}`].filter(Boolean).join(" · ");
    const respuesta = window.prompt(
      `Cantidad REAL de ${producto.nombre} (${etiqueta}):`,
      String(variante.cantidad)
    );
    if (respuesta === null) return;
    const texto = respuesta.trim();
    const cantidad = Number(texto);
    if (!/^\d+$/.test(texto) || !Number.isSafeInteger(cantidad)) {
      alert("Ingresá una cantidad entera igual o mayor a cero.");
      return;
    }
    if (cantidad === variante.cantidad) return;
    if (!window.confirm(`¿Corregir ${producto.nombre} (${etiqueta}) de ${variante.cantidad} a ${cantidad} unidades?\n\nLos otros talles no se modifican.`)) return;
    try {
      const { data, error } = await supabase.rpc("simplex_corregir_stock_variante", {
        p_producto_id: producto.id,
        p_color: variante.color || "",
        p_talle: variante.talle || "",
        p_cantidad: cantidad
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("No se confirmó la corrección.");
      await cargarProductosParaConsulta();
      alert(`Stock corregido: ${etiqueta} → ${cantidad} unidades.`);
    } catch (error) {
      console.error("Simplex - corrección por variante:", error);
      alert(`No se pudo corregir este talle. ${error?.message || ""}`);
    }
  };

  const cargarVentas = async () => {
    if (!perfil?.empresa_id) return;
    setCargandoVentas(true);
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("empresa_id", perfil.empresa_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVentas(data || []);
    } catch (error) {
      console.error("Simplex - error cargando ventas:", error);
      setVentas([]);
    } finally {
      setCargandoVentas(false);
    }
  };

  const abrirDetalleVenta = async (venta) => {
    if (!venta?.id) return;
    setVentaDetalle(venta);
    setItemsVentaDetalle([]);
    setCargandoDetalleVenta(true);
    setVista("detalleVenta");

    try {
      const { data, error } = await supabase
        .from("pedido_items")
        .select("*")
        .eq("pedido_id", venta.id);

      if (error) throw error;
      setItemsVentaDetalle(data || []);
    } catch (error) {
      console.error("Simplex - error cargando detalle NVI:", error);
      alert("❌ No pude cargar el detalle de esta NVI.");
      setItemsVentaDetalle([]);
    } finally {
      setCargandoDetalleVenta(false);
    }
  };

  const anularVentaActual = async () => {
    if (!ventaDetalle?.id || anulandoVenta || cargandoDetalleVenta) return;
    if (perfil?.empresa_id !== "27f69558-681d-46ae-a7fb-e23b45550918") {
      alert("La anulación está habilitada por ahora únicamente en SIMPLEX DEMO.");
      return;
    }
    if (String(ventaDetalle.estado || "").trim() !== "Confirmado") {
      alert("Solo se pueden anular NVI confirmadas.");
      return;
    }
    const numero = String(ventaDetalle.numero_pedido || "").padStart(6, "0");
    if (!window.confirm(`¿ANULAR DEFINITIVAMENTE LA NVI #${numero}?\n\nLa venta seguirá en el historial como ANULADA y el stock descontado se devolverá a su variante y depósito.\n\nEsta operación no se puede deshacer desde Simplex.`)) return;
    setAnulandoVenta(true);
    try {
      const { data, error } = await supabase.rpc("simplex_anular_venta", {
        p_pedido_id: ventaDetalle.id
      });
      if (error) throw error;
      if (!data?.ok || data.estado !== "Anulada") throw new Error("No se confirmó la anulación.");
      setVentaDetalle(prev => prev ? { ...prev, estado: "Anulada" } : prev);
      setVentas(prev => prev.map(v => v.id === ventaDetalle.id ? { ...v, estado: "Anulada" } : v));
      setRevisionVentas(v => v + 1);
      await cargarVentas();
      alert(`NVI #${numero} ANULADA.\n\nPermanece en el historial y se solicitó la devolución del stock.`);
    } catch (error) {
      console.error("Simplex - error anulando NVI:", error);
      alert(`No se pudo anular la NVI.\n\n${error?.message || "Error desconocido"}\n\nRevisá su estado antes de reintentar.`);
    } finally {
      setAnulandoVenta(false);
    }
  };

  const editarVentaActual = async () => {
    if (!ventaDetalle?.id || cargandoDetalleVenta || String(ventaDetalle.estado || "").trim().toLowerCase() === "anulada") return;

    const comercioId = String(ventaDetalle.comercio_id || '');
    const comercio = comercios.find(c => String(c.id) === comercioId);

    if (!comercio) {
      alert("❌ No pude encontrar el cliente de esta NVI.");
      return;
    }

    const productoIds = [...new Set(itemsVentaDetalle.map(it => it.producto_id).filter(Boolean))];
    let productosPorId = new Map();

    if (productoIds.length > 0) {
      const { data: productos, error } = await supabase
        .from("productos")
        .select("id, marca, usa_color, usa_talle")
        .in("id", productoIds);

      if (error) {
        alert("❌ No pude preparar los artículos para editar.");
        return;
      }
      productosPorId = new Map((productos || []).map(p => [String(p.id), p]));
    }

    const items = itemsVentaDetalle.map((it, idx) => {
      const producto = productosPorId.get(String(it.producto_id)) || {};
      const nombreGuardado = String(it.producto_nombre || "Artículo");
      const ajusteMatch = nombreGuardado.match(/·\s*(Descuento|Recargo)\s+([\d.,]+)%\s*$/i);
      const ajusteTipo = ajusteMatch ? ajusteMatch[1].toLowerCase() : "normal";
      const ajustePct = ajusteMatch ? Number(String(ajusteMatch[2]).replace(",", ".")) : 0;
      const colorMatch = nombreGuardado.match(/·\s*Color\s+([^·]+?)(?=\s*·|$)/i);
      const talleMatch = nombreGuardado.match(/·\s*Talle\s+([^·]+?)(?=\s*·|$)/i);
      const nombreLimpio = nombreGuardado
        .replace(/\s*·\s*Color\s+[^·]+/i, "")
        .replace(/\s*·\s*Talle\s+[^·]+/i, "")
        .replace(/\s*·\s*(Normal|Descuento\s+[\d.,]+%|Recargo\s+[\d.,]+%)\s*$/i, "")
        .trim();

      const precioNeto = Number(it.precio_unitario || 0);
      const divisor = ajusteTipo === "descuento"
        ? (1 - ajustePct / 100)
        : ajusteTipo === "recargo"
          ? (1 + ajustePct / 100)
          : 1;
      const precioLista = divisor > 0 ? precioNeto / divisor : precioNeto;

      return {
        id: it.id || `existente-${idx}`,
        productoId: it.producto_id,
        codigo: it.codigo || "",
        marca: producto.marca || "",
        nombre: nombreLimpio,
        precioLista: Number(precioLista.toFixed(2)),
        usaColor: producto.usa_color === true,
        usaTalle: producto.usa_talle === true,
        ajusteTipo,
        ajustePct,
        bonif: 0,
        color: colorMatch ? colorMatch[1].trim() : "",
        talle: talleMatch ? talleMatch[1].trim() : "",
        cant: Number(it.cantidad || 0),
        confirmadoItem: true,
        esNuevo: false,
        nota: ""
      };
    });

    const notas = String(ventaDetalle.notas || "");
    const medioMatch = notas.match(/Medio de pago:\s*([^|]+)/i);
    let medioPago = "Efectivo";
    let diasCuentaCorriente = "";
    if (medioMatch) {
      const textoMedio = medioMatch[1].trim();
      if (/cuenta corriente/i.test(textoMedio)) {
        medioPago = "Cuenta corriente";
        const dias = textoMedio.match(/(\d+)\s*d[ií]as/i);
        diasCuentaCorriente = dias ? dias[1] : "";
      } else {
        medioPago = textoMedio;
      }
    }
    const observaciones = notas
      .split("|")
      .map(x => x.trim())
      .filter(x => x && !/^Medio de pago:/i.test(x))
      .join(" | ");

    setPedidoEditando({
      ...ventaDetalle,
      items,
      observaciones,
      medioPago,
      diasCuentaCorriente
    });
    setComercioSeleccionado(comercio);
    setNuevaVentaDesdeVentas(true);
    setTomandoPedido(true);
  };

  // En celulares, al entrar a Precios y stock se debe comenzar arriba.
  // No modificar el scroll de las demás pantallas ni los datos del catálogo.
  useEffect(() => {
    if (vista !== "preciosStock" && vista !== "consultarPrecios") return;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [vista]);

  const abrirModulo = (modulo) => {
    if (modulo === "consultarPrecios") {
      setBusquedaPrecio("");
      setVista("consultarPrecios");
      cargarProductosParaConsulta();
      return;
    }
    if (modulo === "dia") return setVista("dia");
    if (modulo === "preciosStock") return setVista("preciosStock");
    if (modulo === "ruta") return setVista("ruta");
    if (modulo === "clientes") return setVista("clientes");
    if (modulo === "ventas") {
      setVista("ventas");
      cargarVentas();
      return;
    }
    if (modulo === "productos") {
      setVista("productos");
      cargarListasPrecios();
      return;
    }
    alert("🚧 Este módulo está previsto para Simplex V1.2. Lo conectamos en los próximos pasos.");
  };

  const descargarPlantillaListaPrecios = () => {
    const filas = [
      ["codigo","gtin","descripcion","marca","precio","stock","color","talle"],
      ["ART001","7791234567890","Shampoo Profesional 1 L","Marca Ejemplo",12500,30,"",""],
      ["ART002","","Botín de seguridad","Marca Ejemplo",11800,15,"Negro","40"],
      ["ART002","","Botín de seguridad","Marca Ejemplo",11800,12,"Negro","41"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"] = [{wch:16},{wch:18},{wch:38},{wch:22},{wch:14},{wch:14},{wch:18},{wch:12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Productos precios stock");
    XLSX.writeFile(wb,"plantilla_simplex_productos_precios_stock.xlsx");
  };

  const leerArchivoLista = async (event) => {
    const archivo=event.target.files?.[0];
    if (!archivo) return;
    setArchivoListaNombre(archivo.name);
    setVistaPreviaLista(null);
    try {
      const data=await archivo.arrayBuffer();
      const workbook=XLSX.read(data,{type:"array"});
      const hoja=workbook.Sheets[workbook.SheetNames[0]];
      const filas=XLSX.utils.sheet_to_json(hoja,{defval:""});
      const nk=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
      const campo=(fila,nombres)=>{
        const mapa={}; Object.entries(fila||{}).forEach(([k,v])=>mapa[nk(k)]=v);
        for(const n of nombres){const v=mapa[nk(n)]; if(v!==undefined&&String(v).trim()!=="") return v;}
        return "";
      };
      const productos=filas.map((fila,i)=>{
        const codigo=String(campo(fila,["codigo","código","cod","codigo producto"])||"").trim();
        const gtin=String(campo(fila,["gtin","ean","ean13","codigo barras","código de barras"])||"").trim();
        const descripcion=String(campo(fila,["descripcion","descripción","producto","articulo","artículo"])||"").trim();
        const marca=String(campo(fila,["marca"])||"").trim();
        const color=String(campo(fila,["color"])||"").trim();
        const talle=String(campo(fila,["talle","talla"])||"").trim();
        const pr=campo(fila,["precio","precio venta","pvp"]);
        const cantidad=campo(fila,["stock","stock inicial","existencia","cantidad"]);
        const numero=v=>typeof v==="number"?v:Number(String(v??"").trim().replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",","."));
        const precio=numero(pr);
        const stock=String(cantidad??"").trim()===""?0:numero(cantidad);
        const errores=[];
        if(!codigo) errores.push("Falta código");
        if(!descripcion) errores.push("Falta descripción");
        if(!Number.isFinite(precio)||precio<0) errores.push("Precio inválido");
        if(!Number.isSafeInteger(stock)||stock<0) errores.push("Stock inicial inválido");
        return {fila:i+2,codigo,gtin,descripcion,marca,precio,stock,color,talle,errores};
      });
      const porCodigo=new Map();
      for(const p of productos){
        const key=p.codigo.toUpperCase();
        if(!key) continue;
        if(!porCodigo.has(key)) porCodigo.set(key,[]);
        porCodigo.get(key).push(p);
      }
      for(const grupo of porCodigo.values()){
        if(grupo.length<2) continue;
        const combinaciones=new Set();
        const base=grupo[0];
        for(const p of grupo){
          if(!p.color&&!p.talle) p.errores.push("Código repetido sin variante (color/talle)");
          if(p.descripcion.toLowerCase()!==base.descripcion.toLowerCase()||p.precio!==base.precio||p.marca.toLowerCase()!==base.marca.toLowerCase())
            p.errores.push("Las variantes del mismo código deben tener igual descripción, marca y precio");
          const variante=`${p.color.toLowerCase()}|${p.talle.toLowerCase()}`;
          if(combinaciones.has(variante)) p.errores.push("Variante repetida para el mismo código");
          combinaciones.add(variante);
        }
      }
      const validos=productos.filter(p=>!p.errores.length);
      const conProblemas=productos.filter(p=>p.errores.length);
      const conStock=validos.filter(p=>p.stock>0);
      const conVariantes=validos.filter(p=>p.color||p.talle);
      setVistaPreviaLista({total:productos.length,validos,conProblemas,conStock,conVariantes,
        codigosUnicos:new Set(validos.map(p=>p.codigo.toUpperCase())).size,
        unidadesIniciales:validos.reduce((n,p)=>n+p.stock,0)});
    } catch(error) {
      console.error(error); alert("❌ No pude leer el archivo. Usá la plantilla oficial.");
    } finally { event.target.value=""; }
  };

  // El alta completa requiere una única transacción del servidor que cree
  // producto + precio + stock del depósito. Nunca escribirlos por separado.
  const confirmarAltaSimplex = async (filas, origen="Excel") => {
    if (!perfil?.empresa_id || guardandoLista) return;
    if (!Array.isArray(filas) || !filas.length) return alert("Primero cargá al menos un artículo.");
    const listaExistente = listasPrecios.find(l=>l.predeterminada) || listasPrecios[0] || null;
    if (!listaExistente && (!nombreLista.trim() || !codigoLista.trim()))
      return alert("Para la primera carga completá el nombre y código de referencia de la lista.");
    const total = filas.reduce((n,p)=>n+Number(p.stock||0),0);
    if (!window.confirm(`ALTA DE PRODUCTOS SIMPLEX\n\nOrigen: ${origen}\nArtículos: ${new Set(filas.map(p=>p.codigo.toUpperCase())).size}\nFilas / variantes: ${filas.length}\nStock inicial: ${total} unidades\n\nSe crearán productos NUEVOS con sus precios y stock inicial.\nSi algo falla, no se guardará ninguna fila.\n\n¿Confirmar?`)) return;
    setGuardandoLista(true);
    try {
      const {data,error} = await supabase.rpc("simplex_alta_productos",{
        p_lista_id: listaExistente?.id || null,
        p_productos: filas.map(p=>({codigo:p.codigo,descripcion:p.descripcion,marca:p.marca||"",gtin:p.gtin||"",precio:Number(p.precio),stock:Number(p.stock),color:p.color||"",talle:p.talle||""})),
        p_nombre_lista:listaExistente ? null : nombreLista.trim(),
        p_codigo_lista:listaExistente ? null : codigoLista.trim()
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("El servidor no confirmó el alta.");
      alert(`ALTA COMPLETADA\n\nProductos creados: ${data.productos_creados}\nVariantes / filas: ${data.variantes_cargadas}\nUnidades iniciales: ${data.unidades_iniciales}`);
      setVistaPreviaLista(null);setArchivoListaNombre("");
      setManualAlta({codigo:"",descripcion:"",marca:"",gtin:"",precio:"",stock:"0",color:"",talle:""});
      setVariantesManual([]);
      await cargarListasPrecios();
    } catch(error) {
      console.error("Simplex - alta de productos:",error);
      alert(`No se pudo completar el alta.\n\n${error?.message||"Error desconocido"}\n\nNo vuelvas a confirmar sin revisar el catálogo.`);
    } finally {setGuardandoLista(false);}
  };

  const crearListaInicial = async () => {
    if (!vistaPreviaLista?.validos?.length) return alert("Primero seleccioná un Excel.");
    if (vistaPreviaLista.conProblemas?.length) return alert("Corregí todas las filas con problemas.");
    await confirmarAltaSimplex(vistaPreviaLista.validos, archivoListaNombre||"Excel");
  };

  const validarFilaManual = (soloVarianteExistente=false) => {
    const p=manualAlta;
    const precio=Number(String(p.precio).replace(",","."));
    const stock=Number(String(p.stock).replace(",","."));
    if (!p.codigo.trim() || (!soloVarianteExistente && (!p.descripcion.trim() || String(p.precio).trim()==="" || !Number.isFinite(precio) || precio<0)) || !Number.isSafeInteger(stock) || stock<0) {
      alert(soloVarianteExistente ? "Completá código y stock entero mayor o igual a cero." : "Completá código, descripción, precio válido y stock entero mayor o igual a cero.");
      return null;
    }
    return {...p,codigo:p.codigo.trim().toUpperCase(),descripcion:p.descripcion.trim(),marca:p.marca.trim(),precio,stock,color:p.color.trim(),talle:p.talle.trim()};
  };

  const agregarVarianteManual = () => {
    const fila=validarFilaManual();
    if (!fila) return;
    if (!fila.color && !fila.talle) return alert("Para agregar variantes, indicá un color o talle.");
    if (variantesManual.length) {
      const base=variantesManual[0];
      if (base.codigo!==fila.codigo || base.descripcion.toLowerCase()!==fila.descripcion.toLowerCase() || base.marca.toLowerCase()!==fila.marca.toLowerCase() || base.precio!==fila.precio)
        return alert("Las variantes deben compartir código, descripción, marca y precio.");
      if (variantesManual.some(v=>v.color.toLowerCase()===fila.color.toLowerCase() && v.talle.toLowerCase()===fila.talle.toLowerCase()))
        return alert("Ese color y talle ya están agregados.");
      if ((!!base.color)!=(!!fila.color) || (!!base.talle)!=(!!fila.talle))
        return alert("Todas las variantes deben usar los mismos campos de color y talle.");
    }
    setVariantesManual(v=>[...v,fila]);
    setManualAlta(v=>({...v,color:"",talle:"",stock:"0"}));
  };

  const crearProductoManual = async () => {
    if (variantesManual.length) {
      if (modoVarianteExistente) return alert("Para un producto existente, usá Agregar variante al producto existente.");
      await confirmarAltaSimplex(variantesManual,"Carga manual con variantes");
      return;
    }
    const fila=validarFilaManual(modoVarianteExistente);
    if (!fila) return;
    if (modoVarianteExistente) {
      if (!fila.color && !fila.talle) return alert("Indicá el color o talle de la nueva variante.");
      if (!window.confirm(`AGREGAR VARIANTE A PRODUCTO EXISTENTE\n\nCódigo: ${fila.codigo}\nColor: ${fila.color||"—"}\nTalle: ${fila.talle||"—"}\nStock inicial de esta variante: ${fila.stock}\n\nNo se modificará el precio ni el stock de otras variantes. ¿Confirmar?`)) return;
      setGuardandoLista(true);
      try {
        const {data,error}=await supabase.rpc("simplex_agregar_variante",{
          p_codigo:fila.codigo,p_color:fila.color,p_talle:fila.talle,p_stock:fila.stock
        });
        if (error) throw error;
        if (!data?.ok) throw new Error("El servidor no confirmó la variante.");
        alert(`VARIANTE AGREGADA\n\n${fila.codigo} · ${fila.color} ${fila.talle}\nStock inicial: ${fila.stock}`);
        setManualAlta({codigo:"",descripcion:"",marca:"",gtin:"",precio:"",stock:"0",color:"",talle:""});
        setModoVarianteExistente(false);
      } catch(error) {
        console.error("Simplex - variante:",error);
        alert(`No se agregó la variante.\n\n${error?.message||"Error desconocido"}`);
      } finally {setGuardandoLista(false);}
      return;
    }
    await confirmarAltaSimplex([fila],"Carga manual");
  };

  const iniciarActualizacionLista = (lista) => {
    setListaActualizando(lista);
    setArchivoActualizacionNombre("");
    setVistaPreviaActualizacion(null);
    setTimeout(() => inputActualizarListaRef.current?.click(), 0);
  };

  const leerArchivoActualizacion = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo || !listaActualizando?.id) return;
    setArchivoActualizacionNombre(archivo.name);
    setVistaPreviaActualizacion(null);
    try {
      const data = await archivo.arrayBuffer();
      const workbook = XLSX.read(data,{type:"array"});
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja,{defval:""});
      const nk=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]/g,"");
      const campo=(fila,nombres)=>{
        const mapa={}; Object.entries(fila||{}).forEach(([k,v])=>mapa[nk(k)]=v);
        for(const n of nombres){const v=mapa[nk(n)]; if(v!==undefined&&String(v).trim()!=="") return v;}
        return "";
      };
      const productosExcel=filas.map((fila,i)=>{
        const codigo=String(campo(fila,["codigo","código","cod","codigo producto"])||"").trim();
        const gtin=String(campo(fila,["gtin","ean","ean13","codigo barras","código de barras"])||"").trim();
        const descripcion=String(campo(fila,["descripcion","descripción","producto","articulo","artículo"])||"").trim();
        const marca=String(campo(fila,["marca"])||"").trim();
        const pr=campo(fila,["precio","precio venta","pvp"]);
        const precio=typeof pr==="number"?pr:Number(String(pr??"").trim().replace(/\\s/g,"").replace(/\\./g,"").replace(",","."));
        const errores=[];
        if(!codigo) errores.push("Falta código");
        if(!descripcion) errores.push("Falta descripción");
        if(!Number.isFinite(precio)||precio<0) errores.push("Precio inválido");
        return {fila:i+2,codigo,gtin,descripcion,marca,precio,errores};
      });
      const conProblemas=productosExcel.filter(p=>p.errores.length);
      if(conProblemas.length){
        setVistaPreviaActualizacion({total:productosExcel.length,conProblemas,cambiosPrecio:[],productosNuevos:[],productosQuitar:[]});
        return;
      }
      const {data:actuales,error}=await supabase.from("lista_productos")
        .select("id,producto_id,codigo_lista,detalle_en_lista,precio,productos(id,codigo_cge,nombre,marca,gtin)")
        .eq("lista_id",listaActualizando.id).eq("activo",true);
      if(error) throw error;
      const norm=(actuales||[]).map(x=>({...x,codigoComparacion:String(x.codigo_lista||x.productos?.codigo_cge||"").trim().toLowerCase()}));
      const mapa=new Map(norm.map(x=>[x.codigoComparacion,x]));
      const cambiosPrecio=[], productosNuevos=[];
      for(const p of productosExcel){
        const actual=mapa.get(p.codigo.trim().toLowerCase());
        if(!actual) productosNuevos.push({codigo:p.codigo,gtin:p.gtin||"",nombre:p.descripcion,descripcion:p.descripcion,marca:p.marca||"",precio:Number(p.precio)});
        else if(Number(actual.precio||0)!==Number(p.precio)) cambiosPrecio.push({
          lista_producto_id:actual.id,producto_id:actual.producto_id,codigo:p.codigo,
          precio_anterior:Number(actual.precio||0),precio_nuevo:Number(p.precio),precio:Number(p.precio)
        });
      }
      // Importación parcial: nunca dar de baja artículos por su ausencia en el Excel.
      const productosQuitar=[];
      setVistaPreviaActualizacion({total:productosExcel.length,conProblemas:[],cambiosPrecio,productosNuevos,productosQuitar});
    }catch(error){
      console.error("Simplex - error comparando lista:",error);
      alert(`❌ No pude comparar la lista.\n\n${error?.message||"Error desconocido"}`);
    }finally{ event.target.value=""; }
  };

  const confirmarActualizacionLista = async () => {
    if(!listaActualizando?.id||!vistaPreviaActualizacion) return;
    const c=vistaPreviaActualizacion;
    if(c.conProblemas?.length) return alert("⚠️ Corregí primero las filas con problemas.");
    if(c.productosNuevos?.length) return alert(`⚠️ Hay ${c.productosNuevos.length} códigos que todavía no existen.\n\nACTUALIZAR PRECIOS no crea artículos. Dales de alta primero y después actualizá sus precios.`);
    if(!window.confirm(`💲 ACTUALIZAR PRECIOS\nCambios de precio: ${c.cambiosPrecio.length}\nCódigos no dados de alta: ${c.productosNuevos.length}\nProductos conservados aunque no figuren en el Excel: sí\n\n¿Confirmar actualización?`)) return;
    setGuardandoActualizacion(true);
    try{
      const {data:res,error}=await supabase.rpc("actualizar_lista_precios",{
        p_lista_id:listaActualizando.id,p_cambios_precio:c.cambiosPrecio,
        p_productos_nuevos:[],p_productos_quitar:[]
      });
      if(error) throw error;
      if(!res?.ok) throw new Error("Supabase no confirmó la actualización.");
      alert(`✅ PRECIOS ACTUALIZADOS\n\nLos artículos ausentes del Excel se conservaron. No se modificó el stock ni se crearon artículos.`);
      setListaActualizando(null); setArchivoActualizacionNombre(""); setVistaPreviaActualizacion(null);
      await cargarListasPrecios();
    }catch(error){
      console.error("Simplex - error actualizando lista:",error);
      alert(`❌ No se pudieron actualizar los productos y precios.\n\n${error?.message||"Error desconocido"}`);
    }finally{setGuardandoActualizacion(false);}
  };

  // Ingreso de mercadería separado de la actualización de precios.
  // Primera etapa: artículos ya existentes en la lista base de SIMPLEX DEMO.
  const leerIngresoStockExcel = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    setVistaPreviaIngresoStock(null);
    try {
      if (perfil?.empresa_id !== "27f69558-681d-46ae-a7fb-e23b45550918") {
        throw new Error("Esta prueba está habilitada solamente para SIMPLEX DEMO.");
      }
      const buffer = await archivo.arrayBuffer();
      const hash = await crypto.subtle.digest("SHA-256", buffer);
      const referencia = "simplex-excel-sha256-" +
        Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
      const libro = XLSX.read(buffer, { type: "array" });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      if (!hoja) throw new Error("El Excel no tiene hojas para leer.");
      const filas = XLSX.utils.sheet_to_json(hoja, { defval: "", raw: false });
      if (!filas.length) throw new Error("El Excel no contiene artículos.");

      const normalizar = v => String(v ?? "").trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const campo = (fila, nombres) => {
        const campos = new Map(Object.entries(fila).map(([k,v]) => [normalizar(k),v]));
        for (const n of nombres) {
          const v = campos.get(normalizar(n));
          if (v !== undefined && String(v).trim() !== "") return v;
        }
        return "";
      };

      const { data: listas, error: errorListas } = await supabase.from("listas_precios")
        .select("id,predeterminada").eq("empresa_id", perfil.empresa_id)
        .eq("activo", true).order("predeterminada", { ascending: false });
      if (errorListas) throw errorListas;
      const lista = (listas || []).find(x => x.predeterminada) || (listas || [])[0];
      if (!lista) throw new Error("Primero cargá una lista de productos.");
      const { data: catalogo, error: errorCatalogo } = await supabase.from("lista_productos")
        .select("producto_id,codigo_lista,productos(id,codigo_cge,usa_color,usa_talle)")
        .eq("lista_id", lista.id).eq("activo", true);
      if (errorCatalogo) throw errorCatalogo;

      const porCodigo = new Map();
      for (const item of catalogo || []) {
        for (const codigo of [item.codigo_lista, item.productos?.codigo_cge]) {
          const clave = String(codigo || "").trim().toLowerCase();
          if (!clave) continue;
          const anterior = porCodigo.get(clave);
          if (anterior && anterior.producto_id !== item.producto_id)
            throw new Error(`El código ${codigo} corresponde a más de un artículo. Revisá el catálogo.`);
          porCodigo.set(clave, item);
        }
      }
      const agrupados = new Map();
      const errores = [];
      filas.forEach((fila, indice) => {
        const codigo = String(campo(fila, ["codigo","código","cod","codigo producto"])).trim();
        const color = String(campo(fila, ["color"])).trim().toLowerCase();
        const talle = String(campo(fila, ["talle","talla"])).trim().toLowerCase();
        const cantidadTexto = String(campo(fila, ["stock","cantidad","unidades"])).trim().replace(",", ".");
        const cantidad = Number(cantidadTexto);
        const articulo = porCodigo.get(codigo.toLowerCase());
        const problemas = [];
        if (!codigo) problemas.push("falta código");
        else if (!articulo) problemas.push(`el código ${codigo} no está en el catálogo`);
        if (!cantidadTexto || !Number.isSafeInteger(cantidad) || cantidad <= 0)
          problemas.push("el stock a ingresar debe ser un entero mayor que cero");
        if (articulo && color && !articulo.productos?.usa_color)
          problemas.push("el artículo no tiene variantes de color habilitadas");
        if (articulo && talle && !articulo.productos?.usa_talle)
          problemas.push("el artículo no tiene variantes de talle habilitadas");
        if (articulo?.productos?.usa_color && !color) problemas.push("falta color");
        if (articulo?.productos?.usa_talle && !talle) problemas.push("falta talle");
        if (problemas.length) {
          errores.push(`Fila ${indice + 2}: ${problemas.join("; ")}`);
          return;
        }
        const clave = [articulo.producto_id, color, talle].join("|");
        const anterior = agrupados.get(clave);
        if (anterior) anterior.cantidad += cantidad;
        else agrupados.set(clave, {
          producto_id: articulo.producto_id, color, talle, cantidad
        });
      });
      const productos = [...agrupados.values()];
      if (!productos.length && !errores.length) errores.push("No hay filas válidas.");
      setVistaPreviaIngresoStock({
        nombre: archivo.name, referencia, productos, errores,
        filas: filas.length,
        unidades: productos.reduce((n,p) => n + p.cantidad, 0)
      });
    } catch (error) {
      console.error("Simplex - leyendo ingreso de mercadería:", error);
      alert(`No se pudo preparar el ingreso.\n\n${error?.message || "Error desconocido"}`);
    } finally {
      event.target.value = "";
    }
  };

  const confirmarIngresoStockExcel = async () => {
    const previa = vistaPreviaIngresoStock;
    if (!previa || previa.errores.length || !previa.productos.length || guardandoIngresoStock) return;
    if (perfil?.empresa_id !== "27f69558-681d-46ae-a7fb-e23b45550918") return;
    if (!window.confirm(
      `INGRESAR MERCADERÍA - SIMPLEX DEMO\n\nArchivo: ${previa.nombre}\n` +
      `Artículos / variantes: ${previa.productos.length}\n` +
      `Unidades a SUMAR: ${previa.unidades}\n\n` +
      "Se sumarán al stock existente. No se modificarán los precios.\n\n¿Confirmar?"
    )) return;
    setGuardandoIngresoStock(true);
    try {
      const { data, error } = await supabase.rpc("simplex_actualizar_stock", {
        p_tipo: "ingreso_excel",
        p_productos: previa.productos,
        p_referencia_importacion: previa.referencia,
        p_observacion: `Ingreso Excel Simplex: ${previa.nombre}`
      });
      if (error) throw error;
      if (!data?.ok || data.articulos_procesados !== previa.productos.length)
        throw new Error("No se confirmó la importación completa.");
      setVistaPreviaIngresoStock(null);
      alert(`Mercadería ingresada correctamente.\n\n${previa.unidades} unidades sumadas.\n${previa.productos.length} artículos / variantes registrados.`);
    } catch (error) {
      console.error("Simplex - ingreso de mercadería:", error);
      alert(`No se pudo ingresar la mercadería.\n\n${error?.message || "Error desconocido"}\n\nNo vuelvas a cargar otro archivo hasta comprobar el stock.`);
    } finally {
      setGuardandoIngresoStock(false);
    }
  };

  const guardarNuevoCliente = async (e) => {
    e.preventDefault();
    if (!nuevoCliente.nombre.trim()) return alert("⚠️ Escribí el nombre del cliente.");
    if (!perfil?.empresa_id) return alert("⚠️ No pude identificar la empresa.");

    setGuardandoCliente(true);
    try {
      const payload = {
        nombre: nuevoCliente.nombre.trim(),
        direccion: nuevoCliente.direccion.trim(),
        localidad: nuevoCliente.localidad.trim(),
        partido: nuevoCliente.partido.trim(),
        provincia: nuevoCliente.provincia.trim(),
        pais: nuevoCliente.pais.trim() || "Argentina",
        rubro: nuevoCliente.rubro.trim() || "General",
        telefono: nuevoCliente.telefono.trim(),
        empresa_id: perfil.empresa_id,
        empresa: perfil.empresa || null,
        no_visitar: false,
      };
      const { data, error } = await supabase.from("comercios").insert(payload).select("*").single();
      if (error) throw error;
      setComercios(prev => [...prev, data].sort((a,b) =>
        String(a.nombre || "").localeCompare(String(b.nombre || ""), "es")
      ));
      setNuevoCliente({
        nombre: "", direccion: "", localidad: "", partido: "",
        provincia: "", pais: "Argentina", rubro: "General", telefono: "",
      });
      setVista("clientes");
      alert("✅ Cliente creado correctamente.");
    } catch (error) {
      console.error("Simplex - error creando cliente:", error);
      alert(`❌ No se pudo crear el cliente. ${error?.message || ""}`.trim());
    } finally {
      setGuardandoCliente(false);
    }
  };

  const abrirMapaCliente = () => {
    const lat = comercioSeleccionado?.latitud;
    const lng = comercioSeleccionado?.longitud;
    setPuntoCliente(lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      ? [Number(lat), Number(lng)] : null);
    setMapaClienteAbierto(true);
  };

  const guardarUbicacionCliente = async () => {
    if (!puntoCliente || !comercioSeleccionado?.id || !perfil?.empresa_id) return;
    setGuardandoPuntoCliente(true);
    try {
      const { data, error } = await supabase.from("comercios")
        .update({ latitud: puntoCliente[0], longitud: puntoCliente[1] })
        .eq("id", comercioSeleccionado.id)
        .eq("empresa_id", perfil.empresa_id)
        .select("id,latitud,longitud").single();
      if (error) throw error;
      setComercioSeleccionado(prev => ({ ...prev, latitud: data.latitud, longitud: data.longitud }));
      setComercios(prev => prev.map(c => String(c.id) === String(data.id)
        ? { ...c, latitud: data.latitud, longitud: data.longitud } : c));
      setMapaClienteAbierto(false);
      alert("✅ Ubicación del cliente guardada.");
    } catch (error) {
      console.error("Simplex - error guardando ubicación:", error);
      alert(`❌ No se pudo guardar la ubicación. ${error?.message || ""}`);
    } finally { setGuardandoPuntoCliente(false); }
  };

  const cerrarSesion = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.replace("/");
  };

  if (viendoHistorial && comercioSeleccionado) {
    return (
      <HistorialCliente
        comercio={comercioSeleccionado}
        onVolver={() => setViendoHistorial(false)}
      />
    );
  }

  if (tomandoPedido && comercioSeleccionado) {
    return (
      <TomaPedidos
        comercio={comercioSeleccionado}
        usuario={perfil}
        pedidoExistente={pedidoEditando}
        onVolver={() => {
          setTomandoPedido(false);
          setPedidoEditando(null);
          if (nuevaVentaDesdeVentas) {
            setNuevaVentaDesdeVentas(false);
            setComercioSeleccionado(null);
            setVista("ventas");
            cargarVentas();
          }
        }}
        onPedidoGuardado={() => {
          setTomandoPedido(false);
          const eraEdicion = !!pedidoEditando;
          setPedidoEditando(null);
          alert(eraEdicion ? "✅ NVI actualizada correctamente." : "🚀 Pedido enviado correctamente.");

          if (nuevaVentaDesdeVentas) {
            setNuevaVentaDesdeVentas(false);
            setComercioSeleccionado(null);
            setVista("ventas");
            cargarVentas();
            return;
          }

          if (visitaActiva && !eraEdicion) {
            registrarResultadoSimplex("Tomó Pedido", "Venta realizada");
            return;
          }
          // Fuerza recarga del resumen sin registrar una visita:
          const actual = comercioSeleccionado;
          setComercioSeleccionado(null);
          setTimeout(() => setComercioSeleccionado(actual), 0);
        }}
      />
    );
  }

  if (vista === "visita" && visitaActiva) {
    return <div style={estilos.pagina}>
      <header style={estilos.header}><button style={estilos.botonVolver} onClick={()=>{setVisitaActiva(null);setComercioSeleccionado(null);setVista("dia");}}>← Mi día</button><span style={estilos.marcaChica}>RutaComercios Simplex</span></header>
      <main style={estilos.contenedorFicha}>
        <h2 style={{color:"#f8fafc"}}>📍 {visitaActiva.nombre}</h2><p style={{color:"#cbd5e1"}}>{visitaActiva.direccion||"Sin dirección"}</p>
        <div style={estilos.panelSeccion}>📍 Llegaste al comercio. Elegí cómo terminó la visita. Hasta entonces seguirá pendiente.</div>
        <div style={estilos.panelSeccion}>
          <label htmlFor="notas-visita-simplex" style={{display:"block",fontWeight:800,marginBottom:9}}>📝 NOTAS / OBSERVACIONES</label>
          <textarea id="notas-visita-simplex" value={notasVisita} onChange={e=>setNotasVisita(e.target.value)}
            placeholder="Ej.: Pidió que vuelva con una muestra, consultar precio, llamar antes..."
            rows={3} style={{...estilos.input,width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",minHeight:90}} />
          <div style={{fontSize:12,color:"#94a3b8",marginTop:7}}>Opcional. Se guarda junto con el resultado de la visita.</div>
        </div>
        <button disabled={guardandoVisita} style={{...estilos.botonGrande,backgroundColor:"#15803d"}} onClick={()=>setTomandoPedido(true)}>🛒 HACER VENTA</button>
        <div style={estilos.panelSeccion}>
          <strong>🚫 SIN VENTA</strong>
          <select value={motivoSinVenta} onChange={e=>setMotivoSinVenta(e.target.value)} style={{...estilos.input,marginTop:10}}>
            {["No compró","Comercio cerrado","Cliente ausente","No interesado","Otro motivo"].map(x=><option key={x}>{x}</option>)}
          </select>
          <button disabled={guardandoVisita} style={{...estilos.botonGrande,backgroundColor:"#b45309"}} onClick={()=>registrarResultadoSimplex("Sin venta",motivoSinVenta)}>{guardandoVisita?"⏳ GUARDANDO...":"CONFIRMAR SIN VENTA"}</button>
        </div>
        <div style={estilos.panelSeccion}>
          <strong>📅 REVISITAR OTRO DÍA</strong>
          <div style={{display:"flex",gap:8,alignItems:"stretch",marginTop:10}}>
            <input ref={calendarioRevisitaRef} aria-label="Fecha para revisitar" type="date" min={fechaLocal()} value={fechaRevisita}
              onChange={e=>setFechaRevisita(e.target.value)} style={{...estilos.input,flex:1,minWidth:0,margin:0,colorScheme:"dark"}}/>
            <button type="button" aria-label="Abrir calendario" onClick={()=>{
              const campo=calendarioRevisitaRef.current;
              if(!campo) return;
              try { if(typeof campo.showPicker === "function") campo.showPicker(); else campo.focus(); }
              catch(e) { campo.focus(); }
            }} style={{padding:"10px 14px",borderRadius:8,border:"1px solid #64748b",backgroundColor:"#334155",color:"#fff",fontSize:22,cursor:"pointer"}}>📅</button>
          </div>
          {fechaRevisita && <div style={{color:"#bfdbfe",fontSize:13,marginTop:8}}>Volver el {fechaRevisita.split("-").reverse().join("/")}</div>}
          <button disabled={guardandoVisita||!fechaRevisita||fechaRevisita<=fechaLocal()} style={{...estilos.botonGrande,backgroundColor:"#2563eb",opacity:!fechaRevisita||fechaRevisita<=fechaLocal()?0.5:1}} onClick={()=>registrarResultadoSimplex("Revisitar",`Revisitar el ${fechaRevisita}`,fechaRevisita)}>GUARDAR REVISITA</button>
        </div>
      </main></div>;
  }
  if (vista === "dia") {
    const ids = new Set(comercios.map(c=>String(c.id)));
    const paradas = paradasRuta.filter(id=>ids.has(String(id))).map(id=>comercios.find(c=>String(c.id)===String(id))).filter(Boolean);
    const visitadas = new Map();
    visitasHoy.forEach(v=>{const id=String(v.comercio_id);if(!visitadas.has(id))visitadas.set(id,v);});
    const pendientes = paradas.filter(c=>!visitadas.has(String(c.id)));
    const realizadas = paradas.filter(c=>visitadas.has(String(c.id)));
    return <div style={estilos.pagina}>
      <header style={estilos.headerPrincipal}><div><strong>🚗 RutaComercios Simplex</strong><div style={{fontSize:12,color:"#94a3b8"}}>Mi día de trabajo</div></div><button onClick={()=>setVista("inicio")} style={{...estilos.botonChico,width:"auto",backgroundColor:"#334155"}}>☰ MENÚ</button></header>
      <main style={estilos.contenedor}>
        <h2 style={{marginTop:0,color:"#f8fafc"}}>📋 Mi día de trabajo</h2>
        <div style={{...estilos.panelSeccion,display:"flex",justifyContent:"space-around",textAlign:"center"}}><div><strong>{paradas.length}</strong><div style={{fontSize:12}}>Programadas</div></div><div><strong>{pendientes.length}</strong><div style={{fontSize:12}}>Pendientes</div></div><div><strong>{realizadas.length}</strong><div style={{fontSize:12}}>Realizadas</div></div></div>
        {!rutaRecuperada ? <div style={estilos.mensaje}>⏳ Recuperando recorrido...</div> : paradas.length===0 ? <div style={estilos.panelSeccion}>Todavía no tenés paradas en tu recorrido.<button onClick={()=>setVista("ruta")} style={{...estilos.botonGrande,backgroundColor:"#2563eb",marginTop:12}}>🗺️ ORGANIZAR MI RECORRIDO</button></div> : null}
        {pendientes.map((c,i)=><div key={c.id} style={estilos.panelSeccion}><div style={{fontWeight:900}}>{i+1}. 🏪 {c.nombre}</div><div style={{fontSize:12,color:"#94a3b8",margin:"5px 0 12px"}}>{c.direccion||"Sin dirección"}</div>{i===0 ? <button onClick={()=>iniciarVisitaSimplex(c)} style={{...estilos.botonGrande,backgroundColor:"#16a34a",marginBottom:0}}>📍 LLEGUÉ</button> : <div style={{fontSize:12,color:"#94a3b8",marginTop:8}}>⏳ Próxima parada: esperá a finalizar la visita anterior.</div>}</div>)}
        {realizadas.length>0 && <div style={estilos.panelSeccion}><button onClick={()=>setMostrarRealizadas(v=>!v)} style={{...estilos.botonGrande,backgroundColor:"#334155",marginBottom:mostrarRealizadas?12:0}}>✅ VISITAS REALIZADAS ({realizadas.length}) {mostrarRealizadas?"▲":"▼"}</button>{mostrarRealizadas&&realizadas.map(c=>{
          const visita=visitadas.get(String(c.id));
          const esRevisita=String(visita?.resultado||"").toLowerCase()==="revisitar";
          const fechaEnNota=String(visita?.observacion||"").match(/Revisitar el (\d{4}-\d{2}-\d{2})/i)?.[1];
          const fechaProgramada=fechaEnNota || c.revisita_fecha;
          const fechaLegible=fechaProgramada ? String(fechaProgramada).slice(0,10).split("-").reverse().join("/") : "";
          const nota=String(visita?.observacion||"").split(" | ").find(x=>x.startsWith("Notas: "))?.slice(7);
          return <div key={c.id} style={{padding:"10px 0",borderBottom:"1px solid #334155"}}>
            <strong>🏪 {c.nombre}</strong>
            {esRevisita && fechaLegible && <div style={{fontSize:13,fontWeight:800,color:"#bfdbfe",marginTop:5}}>📅 Revisitar: {fechaLegible}</div>}
            <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>{visita?.resultado} · Visita: {new Date(visita?.fecha).toLocaleDateString("es-AR")} {new Date(visita?.fecha).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</div>
            {nota && <div style={{fontSize:12,color:"#cbd5e1",marginTop:5,whiteSpace:"pre-wrap"}}>📝 {nota}</div>}
          </div>;
        })}</div>}
        <button onClick={()=>setVista("ruta")} style={{...estilos.botonGrande,backgroundColor:"#1d4ed8"}}>🗺️ ORGANIZAR / MODIFICAR RECORRIDO</button>
      </main></div>;
  }
  if (vista === "ruta") {
    const ubicados = comercios.filter(c => c.latitud != null && c.longitud != null
      && Number.isFinite(Number(c.latitud)) && Number.isFinite(Number(c.longitud))
      && Math.abs(Number(c.latitud)) <= 90 && Math.abs(Number(c.longitud)) <= 180);
    const idsValidos = new Set(comercios.map(c => String(c.id)));
    const paradas = paradasRuta.filter(id => idsValidos.has(String(id)))
      .map(id => comercios.find(c => String(c.id) === String(id))).filter(Boolean);
    const sinUbicar = comercios.filter(c => !ubicados.some(u => String(u.id) === String(c.id)));
    const alternar = id => setParadasRuta(actual => actual.includes(String(id))
      ? actual.filter(x => x !== String(id)) : [...actual, String(id)]);
    return (
      <div style={estilos.pagina}>
        <header style={estilos.header}>
          <button type="button" onClick={() => setVista("dia")} style={estilos.botonVolver}>← Inicio</button>
          <div style={estilos.marcaChica}>RutaComercios Simplex · V1.2</div>
        </header>
        <main style={estilos.contenedorFicha}>
          <h2 style={{marginTop:0}}>🗺️ Rutas y visitas</h2>
          <div style={{fontSize:"12px",color:"#cbd5e1",marginBottom:"12px"}}>
            Elegí los clientes y acomodalos en el orden en que quieras visitarlos.
          </div>
          {ubicados.length > 0 ? (
            <div style={{height:"340px",width:"100%",overflow:"hidden",borderRadius:"12px",marginBottom:"12px"}}>
              <MapContainer center={[-34.72,-58.29]} zoom={11} scrollWheelZoom={false}
                style={{height:"100%",width:"100%"}}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AjustarMapaRutaSimplex puntos={ubicados} />
                {ubicados.map(c => (
                  <Marker key={c.id} position={[Number(c.latitud),Number(c.longitud)]} icon={iconoClienteSimplex}>
                    <Popup><strong>{c.nombre || "Cliente"}</strong><div>{c.direccion || "Sin dirección"}</div>
                      <button type="button" onClick={() => alternar(c.id)}>
                        {paradasRuta.includes(String(c.id)) ? "Quitar del recorrido" : "Agregar al recorrido"}
                      </button>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : <div style={estilos.mensaje}>Todavía no hay clientes ubicados en el mapa.</div>}
          <div style={estilos.panelSeccion}>
            <div style={{fontWeight:900,marginBottom:"10px"}}>🏪 Clientes ubicados ({ubicados.length})</div>
            {ubicados.map(c => (
              <label key={c.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"9px 0",borderBottom:"1px solid #334155",fontSize:"13px"}}>
                <input type="checkbox" checked={paradasRuta.includes(String(c.id))}
                  onChange={() => alternar(c.id)} style={{width:"18px",height:"18px"}} />
                <span>{c.nombre || "Cliente"}</span>
              </label>
            ))}
            {!ubicados.length && <div style={{fontSize:"12px",color:"#94a3b8"}}>Ubicá primero un cliente desde su ficha.</div>}
          </div>
          <div style={estilos.panelSeccion}>
            <div style={{fontWeight:900,marginBottom:"10px"}}>🚗 Mi recorrido ({paradas.length} paradas)</div>
            {paradas.length === 0 ? <div style={{fontSize:"12px",color:"#94a3b8"}}>Seleccioná clientes para armar tu recorrido.</div>
              : paradas.map((c,i) => (
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 0",borderBottom:"1px solid #334155"}}>
                  <span style={{fontWeight:900,minWidth:"22px"}}>{i+1}.</span>
                  <span style={{flex:1,fontSize:"13px"}}>{c.nombre || "Cliente"}</span>
                  <button type="button" aria-label="Subir parada" disabled={i===0}
                    onClick={() => moverParada(i,-1)} style={{padding:"7px",opacity:i===0?0.35:1}}>↑</button>
                  <button type="button" aria-label="Bajar parada" disabled={i===paradas.length-1}
                    onClick={() => moverParada(i,1)} style={{padding:"7px",opacity:i===paradas.length-1?0.35:1}}>↓</button>
                  <button type="button" aria-label="Quitar parada" onClick={() => alternar(c.id)} style={{padding:"7px"}}>✕</button>
                </div>
              ))}
            <button type="button" disabled={!rutaRecuperada || guardandoRuta} onClick={guardarRutaSincronizada}
              style={{...estilos.botonGrande,backgroundColor:"#15803d",marginTop:"12px"}}>{guardandoRuta ? "⏳ GUARDANDO..." : "💾 GUARDAR MI RECORRIDO"}</button>
            <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"8px"}}>
              {estadoRuta || "Tu recorrido se sincroniza entre dispositivos."}
            </div>
          </div>
          {sinUbicar.length > 0 && <div style={estilos.panelSeccion}>
            <div style={{fontWeight:900,marginBottom:"7px"}}>📍 Sin ubicación ({sinUbicar.length})</div>
            {sinUbicar.map(c => <div key={c.id} style={{fontSize:"12px",padding:"5px 0"}}>{c.nombre || "Cliente"}</div>)}
            <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"8px"}}>Podés ubicarlos desde Clientes → ficha → Ubicar cliente en mapa.</div>
          </div>}
        </main>
      </div>
    );
  }

  if (vista === "ventas") {
    const q = busquedaVentas.trim().toLowerCase();
    const ventasFiltradas = ventas.filter((p) => {
      if (!q) return true;
      return [
        p.numero_pedido,
        p.cliente,
        p.comercio_nombre,
        p.preventista,
        p.vendedor,
        p.estado,
      ].some(v => String(v || "").toLowerCase().includes(q));
    });

    const ventasVigentes = ventasFiltradas.filter(p => String(p.estado || "").trim().toLowerCase() !== "anulada");
    const totalVentas = ventasVigentes.reduce((acc, p) => acc + Number(p.total || p.total_pedido || 0), 0);

    return (
      <div style={estilos.pagina}>
        <header style={estilos.header}>
          <button type="button" onClick={() => setVista("dia")} style={estilos.botonVolver}>← Inicio</button>
          <div style={estilos.marcaChica}>RutaComercios Simplex · V1.2</div>
        </header>

        <main style={estilos.contenedorFicha}>
          <h2 style={{ marginTop: 0, marginBottom: "6px" }}>🧾 Ventas</h2>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "14px" }}>
            NVI e historial general de tu empresa.
          </div>

          <button
            type="button"
            onClick={() => {
              setNuevaVentaDesdeVentas(true);
              setComercioSeleccionado(null);
              setBusqueda("");
              setVista("clientes");
            }}
            style={{ ...estilos.botonGrande, backgroundColor: "#16a34a", marginBottom: "10px" }}
          >
            ➕ NUEVA VENTA
          </button>

          <input
            type="text"
            value={busquedaVentas}
            onChange={(e) => setBusquedaVentas(e.target.value)}
            placeholder="🔎 Buscar por NVI, cliente, vendedor o estado..."
            style={estilos.buscador}
          />

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginBottom: "12px"
          }}>
            <div style={estilos.panelSeccion}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>NVI</div>
              <div style={{ fontSize: "22px", fontWeight: 950 }}>{ventasVigentes.length}</div>
            </div>
            <div style={estilos.panelSeccion}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>TOTAL</div>
              <div style={{ fontSize: "22px", fontWeight: 950 }}>
                ${totalVentas.toLocaleString("es-AR")}
              </div>
            </div>
          </div>

          {cargandoVentas ? (
            <div style={estilos.mensaje}>⏳ Cargando ventas...</div>
          ) : ventasFiltradas.length === 0 ? (
            <div style={estilos.mensaje}>Todavía no hay NVI para mostrar.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {ventasFiltradas.map((p) => {
                const numero = String(p.numero_pedido || "").padStart(6, "0");
                const fecha = p.created_at
                  ? new Date(p.created_at).toLocaleString("es-AR", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit"
                    })
                  : "Sin fecha";
                const cliente = p.cliente || p.comercio_nombre || `Comercio #${p.comercio_id || ""}`;
                const total = Number(p.total || p.total_pedido || 0);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => abrirDetalleVenta(p)}
                    style={{
                      ...estilos.panelSeccion,
                      width: "100%",
                      textAlign: "left",
                      color: "inherit",
                      cursor: "pointer",
                      border: "1px solid #334155"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 950 }}>
                          NVI #{numero || "—"} · {cliente}
                        </div>
                        <div style={{ marginTop: "4px", fontSize: "11px", color: "#94a3b8" }}>
                          {fecha} · {String(p.estado || "").toLowerCase() === "anulada" ? "🚫 ANULADA" : (p.estado || "Ingresado")}
                        </div>
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 950, whiteSpace: "nowrap" }}>
                        ${total.toLocaleString("es-AR")}
                      </div>
                    </div>
                    <div style={{ marginTop:"7px", fontSize:"11px", color:"#60a5fa", fontWeight:900 }}>
                      Ver detalle →
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  if (vista === "detalleVenta" && ventaDetalle) {
    const numero = String(ventaDetalle.numero_pedido || "").padStart(6, "0");
    const fecha = ventaDetalle.created_at
      ? new Date(ventaDetalle.created_at).toLocaleString("es-AR", {
          day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
        })
      : "Sin fecha";
    const cliente = ventaDetalle.cliente || ventaDetalle.comercio_nombre || `Comercio #${ventaDetalle.comercio_id || ""}`;
    const total = Number(ventaDetalle.total || ventaDetalle.total_pedido || 0);

    return (
      <div style={estilos.pagina}>
        <header style={estilos.header}>
          <button type="button" onClick={() => setVista("ventas")} style={estilos.botonVolver}>← Ventas</button>
          <div style={estilos.marcaChica}>RutaComercios Simplex · V1.2</div>
        </header>

        <main style={estilos.contenedorFicha}>
          <h2 style={{marginTop:0, marginBottom:"4px"}}>🧾 NVI #{numero || "—"}</h2>
          <div style={{color:String(ventaDetalle.estado || "").toLowerCase() === "anulada" ? "#fca5a5" : "#94a3b8",fontSize:"12px",marginBottom:"12px"}}>{fecha} · {String(ventaDetalle.estado || "").toLowerCase() === "anulada" ? "🚫 ANULADA" : (ventaDetalle.estado || "Ingresado")}</div>

          <div style={estilos.panelSeccion}>
            <div style={{fontSize:"11px",color:"#94a3b8"}}>CLIENTE</div>
            <div style={{fontSize:"16px",fontWeight:950,marginTop:"3px"}}>{cliente}</div>
          </div>

          <div style={{fontWeight:950,margin:"14px 0 8px"}}>Artículos</div>
          {cargandoDetalleVenta ? (
            <div style={estilos.mensaje}>⏳ Cargando detalle...</div>
          ) : itemsVentaDetalle.length === 0 ? (
            <div style={estilos.mensaje}>Esta NVI no tiene renglones para mostrar.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {itemsVentaDetalle.map((it, idx) => {
                const cantidad = Number(it.cantidad || 0);
                const unitario = Number(it.precio_unitario || 0);
                const subtotal = Number(it.subtotal ?? (cantidad * unitario));
                return (
                  <div key={it.id || idx} style={estilos.panelSeccion}>
                    <div style={{fontWeight:900,fontSize:"14px"}}>
                      {it.codigo ? `${it.codigo} · ` : ""}{it.producto_nombre || it.nombre || "Artículo"}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",gap:"10px",marginTop:"7px",fontSize:"12px",color:"#cbd5e1"}}>
                      <span>{cantidad} × ${unitario.toLocaleString("es-AR")}</span>
                      <strong style={{color:"#fff"}}>${subtotal.toLocaleString("es-AR")}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {ventaDetalle.observaciones && (
            <div style={{...estilos.panelSeccion,marginTop:"12px"}}>
              <div style={{fontSize:"11px",color:"#94a3b8"}}>OBSERVACIONES</div>
              <div style={{marginTop:"5px",fontSize:"13px"}}>{ventaDetalle.observaciones}</div>
            </div>
          )}

          <button
            type="button"
            disabled={cargandoDetalleVenta || itemsVentaDetalle.length === 0 || anulandoVenta || String(ventaDetalle.estado || "").toLowerCase() === "anulada"}
            onClick={editarVentaActual}
            style={{
              width:"100%",
              marginTop:"14px",
              marginBottom:"2px",
              padding:"12px",
              borderRadius:"10px",
              border:"1px solid #f59e0b",
              background:"#fffbeb",
              color:"#92400e",
              fontWeight:950,
              cursor:"pointer"
            }}
          >
            ✏️ EDITAR VENTA
          </button>

          {perfil?.empresa_id === "27f69558-681d-46ae-a7fb-e23b45550918" && String(ventaDetalle.estado || "").trim() === "Confirmado" && (
            <button
              type="button"
              disabled={cargandoDetalleVenta || anulandoVenta}
              onClick={anularVentaActual}
              style={{width:"100%",marginTop:"10px",padding:"12px",borderRadius:"10px",border:"1px solid #ef4444",background:"#7f1d1d",color:"#fff",fontWeight:950,cursor:anulandoVenta ? "wait" : "pointer",opacity:anulandoVenta ? 0.6 : 1}}
            >
              {anulandoVenta ? "⏳ ANULANDO VENTA..." : "🗑️ ELIMINAR VENTA"}
            </button>
          )}
          {String(ventaDetalle.estado || "").toLowerCase() === "anulada" && (
            <div style={{marginTop:"12px",color:"#fca5a5",fontWeight:900,textAlign:"center"}}>🚫 VENTA ANULADA · Conservada en el historial</div>
          )}

          <div style={{...estilos.panelSeccion,marginTop:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:900}}>TOTAL NVI</span>
            <span style={{fontSize:"22px",fontWeight:950}}>${total.toLocaleString("es-AR")}</span>
          </div>
        </main>
      </div>
    );
  }

  if (vista === "preciosStock") return <div style={estilos.pagina}><header style={estilos.header}><button style={estilos.botonVolver} onClick={()=>setVista("inicio")}>← Menú</button><span style={estilos.marcaChica}>RutaComercios Simplex</span></header><main style={{...estilos.contenedorFicha,paddingTop:12}}><h2 style={{color:"#f8fafc",margin:"0 0 12px"}}>📦 Precios y stock</h2><button style={{...estilos.botonGrande,backgroundColor:"#0369a1"}} onClick={()=>abrirModulo("consultarPrecios")}>🔎 CONSULTAR PRECIOS Y STOCK</button><button style={{...estilos.botonGrande,backgroundColor:"#475569"}} onClick={()=>abrirModulo("productos")}>📋 PRODUCTOS Y LISTAS DE PRECIOS</button></main></div>;
  if (vista === "consultarPrecios") {
    const q=busquedaPrecio.trim().toLowerCase();
    const resultados=q ? productosPrecio.filter(p =>
      [p.codigo,p.cge,p.nombre,p.descripcion,p.marca,p.gtin]
        .some(v=>String(v||"").toLowerCase().includes(q))
    ) : [];

    return (
      <div style={estilos.pagina}>
        <header style={estilos.header}>
          <button type="button" onClick={()=>setVista("inicio")} style={estilos.botonVolver}>← Inicio</button>
          <div style={estilos.marcaChica}>RutaComercios Simplex · V1.2</div>
        </header>
        <main style={estilos.contenedorFicha}>
          <h2 style={{marginTop:0,marginBottom:"5px"}}>🔎 Consultar precios</h2>
          <div style={{color:"#94a3b8",fontSize:"12px",marginBottom:"12px"}}>
            Buscá un producto sin iniciar una venta.
          </div>
          <input type="text" value={busquedaPrecio}
            onChange={e=>setBusquedaPrecio(e.target.value)}
            placeholder="🔎 Código, producto o marca..."
            style={{...estilos.buscador,border:"2px solid #38bdf8",fontSize:"16px"}}/>
          {cargandoPrecios ? <div style={estilos.mensaje}>⏳ Cargando productos y precios...</div>
          : !q ? <div style={estilos.mensaje}>Escribí algo para consultar el precio.</div>
          : resultados.length===0 ? <div style={estilos.mensaje}>No encontré productos con esa búsqueda.</div>
          : <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {resultados.slice(0,100).map(p=>(
                <div key={p.id} style={estilos.panelSeccion}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:"12px",alignItems:"center"}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:950,fontSize:"14px"}}>{p.nombre}</div>
                      <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"4px"}}>
                        {[p.codigo,p.marca].filter(Boolean).join(" · ")}
                      </div>
                      <div style={{
                        fontSize:"12px",
                        marginTop:"6px",
                        fontWeight:900,
                        color:p.stock === null ? "#94a3b8" : (p.stock === 0 ? "#fca5a5" : "#cbd5e1")
                      }}>
                        Stock: {p.stock === null ? "No informado" : p.stock.toLocaleString("es-AR")}
                      </div>
                      {(p.usaColor || p.usaTalle || p.variantesStock?.some(v => v.color || v.talle)) && (
                        <div style={{marginTop:8}}>
                          <button type="button"
                            onClick={() => setDesgloseStockAbierto(prev => ({...prev, [p.id]: !prev[p.id]}))}
                            aria-expanded={!!desgloseStockAbierto[p.id]}
                            style={{background:"transparent",border:"none",padding:"5px 0",color:"#7dd3fc",fontSize:12,fontWeight:850,cursor:"pointer",textAlign:"left"}}>
                            {desgloseStockAbierto[p.id] ? "▼" : "▶"} Desglose de stock &gt;&gt;&gt;
                          </button>
                          {desgloseStockAbierto[p.id] && (
                            <div style={{marginTop:6,padding:"9px 11px",background:"#0f172a",border:"1px solid #334155",borderRadius:9,fontSize:12}}>
                              {p.variantesStock?.length ? p.variantesStock.map((v,i) => (
                                <div key={`${v.color}-${v.talle}-${i}`} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"5px 0",borderBottom:i===p.variantesStock.length-1?"none":"1px solid #334155"}}>
                                  <span>{[v.color && `Color: ${v.color}`,v.talle && `Talle: ${v.talle}`].filter(Boolean).join(" · ") || "Sin variante"}</span>
                                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                                    <strong>{v.cantidad.toLocaleString("es-AR")} u.</strong>
                                    <button type="button" onClick={() => corregirStockVarianteSimplex(p,v)}
                                      style={{padding:"5px 8px",borderRadius:7,backgroundColor:"#475569",color:"#fff",border:"none",cursor:"pointer",fontSize:11}}>
                                      ✏️ Corregir stock
                                    </button>
                                  </div>
                                </div>
                              )) : <span style={{color:"#94a3b8"}}>Sin existencias registradas por variante.</span>}
                            </div>
                          )}
                        </div>
                      )}
                      {perfil?.empresa_id === "27f69558-681d-46ae-a7fb-e23b45550918" && !p.usaColor && !p.usaTalle && (
                        <button type="button" onClick={() => corregirStockSimplex(p)}
                          style={{marginTop:8,padding:"7px 10px",borderRadius:8,backgroundColor:"#475569",color:"#fff",border:"none",cursor:"pointer"}}>
                          ✏️ Corregir stock
                        </button>
                      )}
                    </div>
                    <div style={{fontSize:"21px",fontWeight:950,whiteSpace:"nowrap",color:"#86efac"}}>
                      ${p.precio.toLocaleString("es-AR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>}
        </main>
      </div>
    );
  }

  if (vista === "productos") {
    return (
      <div style={estilos.pagina}>
        <header style={estilos.header}>
          <button type="button" onClick={()=>setVista("inicio")} style={estilos.botonVolver}>← Inicio</button>
          <div style={estilos.marcaChica}>RutaComercios Simplex · V1.2</div>
        </header>
        <main style={estilos.contenedorFicha}>
          <h2 style={{marginTop:0}}>📦 Gestión de productos</h2>
          <div style={estilos.ayudaAlta}>Alta de artículos, actualización de precios e ingreso de mercadería: cada operación por separado.</div>
          <button type="button" onClick={()=>abrirModulo("consultarPrecios")}
            style={{...estilos.botonGrande,backgroundColor:"#0369a1",marginBottom:"14px",fontSize:"15px"}}>
            🔎 CONSULTAR PRECIOS
          </button>
          {perfil?.empresa_id === "27f69558-681d-46ae-a7fb-e23b45550918" && (
            <div style={estilos.panelSeccion}>
              <div style={{fontWeight:900,marginBottom:8}}>📦 INGRESAR MERCADERÍA</div>
              <div style={{fontSize:12,color:"#cbd5e1",marginBottom:10}}>
                Suma unidades al stock de los artículos existentes.
                No modifica precios ni da de baja productos. Respeta color y talle.
                No permite ingresar dos veces el mismo archivo.
              </div>
              <input ref={inputIngresoStockRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={leerIngresoStockExcel} style={{display:"none"}} />
              <button type="button" onClick={() => inputIngresoStockRef.current?.click()}
                disabled={guardandoIngresoStock}
                style={{...estilos.botonGrande,backgroundColor:"#2563eb"}}>
                📄 SELECCIONAR EXCEL DE MERCADERÍA
              </button>
              {vistaPreviaIngresoStock && (
                <div style={estilos.vistaPrevia}>
                  <strong>Revisar ingreso: {vistaPreviaIngresoStock.nombre}</strong>
                  <div style={{fontSize:13,marginTop:8}}>
                    Filas: {vistaPreviaIngresoStock.filas} · Artículos / variantes: {vistaPreviaIngresoStock.productos.length}
                    <div style={{fontWeight:900,marginTop:6}}>Unidades a sumar: {vistaPreviaIngresoStock.unidades}</div>
                  </div>
                  {vistaPreviaIngresoStock.errores.length > 0 && (
                    <div style={{color:"#fca5a5",fontSize:12,marginTop:8}}>
                      <strong>Corregí estos problemas antes de ingresar:</strong>
                      {vistaPreviaIngresoStock.errores.slice(0,15).map((e,i) =>
                        <div key={i}>{e}</div>)}
                      {vistaPreviaIngresoStock.errores.length > 15 &&
                        <div>Y {vistaPreviaIngresoStock.errores.length - 15} errores más.</div>}
                    </div>
                  )}
                  <button type="button" onClick={confirmarIngresoStockExcel}
                    disabled={guardandoIngresoStock || vistaPreviaIngresoStock.errores.length > 0}
                    style={{...estilos.botonGrande,backgroundColor:"#15803d",
                      opacity:guardandoIngresoStock || vistaPreviaIngresoStock.errores.length ? .5 : 1,
                      marginTop:12}}>
                    {guardandoIngresoStock ? "⏳ GUARDANDO..." : "✅ CONFIRMAR INGRESO DE MERCADERÍA"}
                  </button>
                </div>
              )}
            </div>
          )}
          <div style={estilos.panelSeccion}>
            <div style={{fontWeight:900,marginBottom:"8px"}}>💲 ACTUALIZAR PRECIOS</div>
            <div style={{fontSize:12,color:"#cbd5e1",marginBottom:10}}>Solo cambia precios de artículos existentes. Los códigos nuevos deben darse de alta antes. No modifica stock.</div>
            {cargandoListas ? <div>⏳ Cargando...</div> : listasPrecios.length ? (
              <div style={{...estilos.filaLista,alignItems:"stretch",flexDirection:"column"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"}}>
                  <div>
                    <strong>Precio vigente</strong>
                    <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"3px"}}>
                      Un único precio base para todos los clientes
                    </div>
                  </div>
                  <span style={estilos.badge}>Activo</span>
                </div>
                <button
                  type="button"
                  onClick={()=>iniciarActualizacionLista(listasPrecios.find(l=>l.predeterminada) || listasPrecios[0])}
                  style={{...estilos.botonChico,backgroundColor:"#0f766e"}}
                >
                  💲 ACTUALIZAR PRECIOS
                </button>
              </div>
            ) : <div style={{color:"#94a3b8",fontSize:"13px"}}>Todavía no tenés productos y precios cargados.</div>}
            <input ref={inputActualizarListaRef} type="file" accept=".xlsx,.xls,.csv" onChange={leerArchivoActualizacion} style={{display:"none"}}/>
            {listaActualizando&&<div style={{...estilos.vistaPrevia,marginTop:"14px"}}>
              <div style={{fontWeight:900}}>💲 Actualizando precios</div>
              {archivoActualizacionNombre&&<div style={{fontSize:"12px",color:"#cbd5e1",marginTop:"6px"}}>📄 {archivoActualizacionNombre}</div>}
              {vistaPreviaActualizacion&&<>
                {vistaPreviaActualizacion.conProblemas?.length>0
                  ? <div style={{marginTop:"10px",color:"#fca5a5",fontSize:"12px"}}>⚠️ {vistaPreviaActualizacion.conProblemas.length} fila(s) con problemas. No se modificó nada.</div>
                  : <>
                    <div style={{...estilos.resumenImportacion,marginTop:"12px"}}>
                      <div><strong>{vistaPreviaActualizacion.cambiosPrecio.length}</strong><span>Precios cambian</span></div>
                      <div><strong>{vistaPreviaActualizacion.productosNuevos.length}</strong><span>Códigos no dados de alta</span></div>
                      <div><strong>{vistaPreviaActualizacion.productosQuitar.length}</strong><span>Se quitarán</span></div>
                    </div>
                    {vistaPreviaActualizacion.productosNuevos.length > 0 && <div style={{color:"#fca5a5",fontSize:12,marginTop:10}}>⚠️ Estos códigos todavía no están dados de alta. Actualizar precios no los creará. Usá primero Alta de productos.</div>}
                    <button type="button" onClick={confirmarActualizacionLista} disabled={guardandoActualizacion || vistaPreviaActualizacion.productosNuevos.length > 0}
                      style={{...estilos.botonGrande,backgroundColor:"#16a34a",marginTop:"12px",opacity:guardandoActualizacion?0.55:1}}>
                      {guardandoActualizacion?"⏳ ACTUALIZANDO...":"✅ CONFIRMAR ACTUALIZACIÓN"}
                    </button>
                  </>}
                <button type="button" onClick={()=>{setListaActualizando(null);setArchivoActualizacionNombre("");setVistaPreviaActualizacion(null);}}
                  style={{...estilos.botonChico,backgroundColor:"#475569",marginTop:"8px"}}>Cancelar</button>
              </>}
            </div>}
          </div>
          <div style={estilos.panelSeccion}>
            <div style={{fontWeight:900,fontSize:16,marginBottom:10}}>➕ ALTA DE PRODUCTOS</div>
            <div style={{fontSize:12,color:"#cbd5e1",marginBottom:12}}>Creá artículos nuevos con precio y stock inicial. Se guardan juntos. Si el código ya existe, la operación se rechaza sin modificar el inventario.</div>
            {!listasPrecios.length && <>
              <label style={estilos.label}>Nombre de lista inicial *</label>
              <input style={estilos.input} value={nombreLista} onChange={e=>setNombreLista(e.target.value)} placeholder="Ej.: Precio base"/>
              <label style={estilos.label}>Código de lista inicial *</label>
              <input style={estilos.input} value={codigoLista} onChange={e=>setCodigoLista(e.target.value)} placeholder="Ej.: BASE"/>
            </>}
            <div style={{fontWeight:800,margin:"12px 0 8px"}}>Alta manual</div>
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              <button type="button" onClick={()=>{setModoVarianteExistente(false);setVariantesManual([]);}} style={{...estilos.botonChico,backgroundColor:!modoVarianteExistente?"#2563eb":"#475569"}}>Producto nuevo</button>
              <button type="button" onClick={()=>{setModoVarianteExistente(true);setVariantesManual([]);}} style={{...estilos.botonChico,backgroundColor:modoVarianteExistente?"#2563eb":"#475569"}}>Agregar variante a producto existente</button>
            </div>
            {modoVarianteExistente&&<div style={{fontSize:12,color:"#fbbf24",marginBottom:10}}>Usá el código exacto de un producto ya creado. El precio y la descripción se conservan; solo se agrega el nuevo color/talle con su stock inicial.</div>}

            {(modoVarianteExistente ? [["Código *","codigo"],["Stock inicial *","stock"],["Color (opcional)","color"],["Talle (opcional)","talle"]] : [["Código *","codigo"],["Descripción *","descripcion"],["Marca","marca"],["GTIN (opcional)","gtin"],["Precio *","precio"],["Stock inicial *","stock"],["Color (opcional)","color"],["Talle (opcional)","talle"]]).map(([titulo,campo])=><React.Fragment key={campo}>
              <label style={estilos.label}>{titulo}</label>
              <input style={estilos.input} value={manualAlta[campo]} onChange={e=>setManualAlta(v=>({...v,[campo]:e.target.value}))} placeholder={titulo}/>
            </React.Fragment>)}
            {!modoVarianteExistente&&<>
              <button type="button" onClick={agregarVarianteManual} disabled={guardandoLista} style={{...estilos.botonGrande,backgroundColor:"#334155"}}>➕ AGREGAR TALLE / COLOR A LA LISTA</button>
              {variantesManual.length>0&&<div style={{...estilos.vistaPrevia,marginTop:10}}>
                <strong>Variantes preparadas: {variantesManual.length} · Stock total: {variantesManual.reduce((n,v)=>n+v.stock,0)}</strong>
                {variantesManual.map((v,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:8,fontSize:12}}>
                  <span>{v.codigo} · {v.color||"—"} · {v.talle||"—"} · {v.stock} unidades</span>
                  <button type="button" onClick={()=>setVariantesManual(x=>x.filter((_,j)=>j!==i))} style={{...estilos.botonChico,backgroundColor:"#7f1d1d"}}>Quitar</button>
                </div>)}
                <button type="button" onClick={()=>setVariantesManual([])} style={{...estilos.botonChico,backgroundColor:"#475569",marginTop:8}}>Vaciar lista</button>
              </div>}
            </>}
            <button type="button" onClick={crearProductoManual} disabled={guardandoLista} style={{...estilos.botonGrande,backgroundColor:"#15803d",opacity:guardandoLista?.6:1}}>
              {guardandoLista?"⏳ GUARDANDO...":modoVarianteExistente?"💾 AGREGAR VARIANTE AL PRODUCTO EXISTENTE":variantesManual.length?"💾 DAR DE ALTA PRODUCTO CON VARIANTES":"💾 DAR DE ALTA PRODUCTO"}
            </button>
            <div style={{fontWeight:800,margin:"18px 0 8px"}}>Alta por Excel</div>
            <button type="button" onClick={descargarPlantillaListaPrecios} style={{...estilos.botonGrande,backgroundColor:"#166534"}}>📥 DESCARGAR PLANTILLA OFICIAL</button>
            <input ref={inputListaRef} type="file" accept=".xlsx,.xls,.csv" onChange={leerArchivoLista} style={{display:"none"}}/>
            <button type="button" onClick={()=>inputListaRef.current?.click()} style={{...estilos.botonGrande,backgroundColor:"#2563eb"}}>📄 ELEGIR EXCEL / CSV</button>
            {archivoListaNombre&&<div style={{fontSize:12,marginBottom:8}}>📄 {archivoListaNombre}</div>}
            {vistaPreviaLista&&<div style={estilos.vistaPrevia}>
              <div style={{fontWeight:900}}>Revisar antes de guardar</div>
              <div style={{fontSize:13,marginTop:8}}>Filas: {vistaPreviaLista.total} · Artículos: {vistaPreviaLista.codigosUnicos} · Unidades: {vistaPreviaLista.unidadesIniciales}</div>
              {vistaPreviaLista.conProblemas.slice(0,12).map((p,i)=><div key={i} style={{fontSize:12,color:"#fca5a5",marginTop:5}}>Fila {p.fila}: {p.errores.join("; ")}</div>)}
              <button type="button" onClick={crearListaInicial} disabled={guardandoLista||!!vistaPreviaLista.conProblemas.length||!vistaPreviaLista.validos.length}
                style={{...estilos.botonGrande,backgroundColor:"#15803d",marginTop:12,opacity:guardandoLista||vistaPreviaLista.conProblemas.length?.5:1}}>
                {guardandoLista?"⏳ GUARDANDO...":"✅ CONFIRMAR ALTA POR EXCEL"}
              </button>
            </div>}
          </div>
        </main>
      </div>
    );
  }

  if (vista === "nuevoCliente") {
    const campo = (label, key, placeholder="", type="text") => (
      <>
        <label style={estilos.label}>{label}</label>
        <input
          style={estilos.input}
          type={type}
          value={nuevoCliente[key]}
          placeholder={placeholder}
          onChange={(e) => setNuevoCliente(p => ({ ...p, [key]: e.target.value }))}
        />
      </>
    );

    return (
      <div style={estilos.pagina}>
        <header style={estilos.header}>
          <button type="button" onClick={() => setVista("clientes")} style={estilos.botonVolver}>
            ← Volver a clientes
          </button>
          <div style={estilos.marcaChica}>RutaComercios Simplex · V1.2</div>
        </header>
        <main style={estilos.contenedorFicha}>
          <h2 style={{ marginTop: 0 }}>➕ Nuevo cliente</h2>
          <div style={estilos.ayudaAlta}>
            Alta manual para trabajar desde escritorio. Más adelante también conectaremos
            la captura con ubicación para los días de trabajo en calle.
          </div>
          <form onSubmit={guardarNuevoCliente}>
            {campo("Nombre del cliente *", "nombre", "Ej.: Almacén Don José")}
            {campo("Dirección", "direccion", "Calle y número")}
            {campo("Localidad", "localidad", "Ej.: Quilmes")}
            {campo("Partido / Departamento", "partido", "Ej.: Quilmes")}
            {campo("Provincia / Estado", "provincia", "Ej.: Buenos Aires")}
            {campo("País", "pais")}
            {campo("Rubro", "rubro", "General")}
            {campo("Teléfono / WhatsApp", "telefono", "Ej.: 11 2250 1680", "tel")}
            <button type="submit" disabled={guardandoCliente}
              style={{...estilos.botonGrande, backgroundColor: guardandoCliente ? "#475569" : "#16a34a"}}>
              {guardandoCliente ? "⏳ GUARDANDO..." : "💾 GUARDAR CLIENTE"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  if (comercioSeleccionado) {
    return (
      <div style={estilos.pagina}>
        <header style={estilos.header}>
          <button
            type="button"
            onClick={() => { setMapaClienteAbierto(false); setPuntoCliente(null); setComercioSeleccionado(null); }}
            style={estilos.botonVolver}
          >
            ← Volver a clientes
          </button>
          <div style={estilos.marcaChica}>RutaComercios Simplex · V1.2</div>
        </header>

        <main style={estilos.contenedorFicha}>
          <h2 style={{ margin: "0 0 6px", color: "#fff" }}>
            🏪 {comercioSeleccionado.nombre || "Cliente"}
          </h2>

          <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "12px" }}>
            {comercioSeleccionado.direccion || "Sin dirección cargada"}
          </div>

          <button type="button" onClick={abrirMapaCliente}
            style={{ ...estilos.botonGrande, backgroundColor: "#0369a1", marginBottom: "12px" }}>
            📍 {comercioSeleccionado.latitud != null && comercioSeleccionado.longitud != null
              ? "VER / CORREGIR UBICACIÓN EN MAPA" : "UBICAR CLIENTE EN MAPA"}
          </button>

          {mapaClienteAbierto && (
            <div style={{ ...estilos.panelSeccion, marginBottom: "12px" }}>
              <div style={{ fontWeight: 900, marginBottom: "6px" }}>🗺️ Ubicación manual del cliente</div>
              <div style={{ fontSize: "12px", color: "#cbd5e1", marginBottom: "10px" }}>
                Mové el mapa y tocá el lugar del comercio. También podés arrastrar el marcador para corregirlo.
                No se consulta tu GPS ni se buscan direcciones automáticamente.
              </div>
              <div style={{ height: "330px", width: "100%", overflow: "hidden", borderRadius: "10px" }}>
                <MapContainer
                  key={`${comercioSeleccionado.id}-${Number(comercioSeleccionado.latitud)}-${Number(comercioSeleccionado.longitud)}`}
                  center={puntoCliente || [-34.72, -58.29]}
                  zoom={puntoCliente ? 16 : 11}
                  scrollWheelZoom={false}
                  style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CentrarMapaClienteSimplex centro={comercioSeleccionado.latitud != null && comercioSeleccionado.longitud != null ? [Number(comercioSeleccionado.latitud), Number(comercioSeleccionado.longitud)] : null} />
                  <SeleccionarPuntoSimplex alSeleccionar={setPuntoCliente} />
                  {puntoCliente && (
                    <Marker position={puntoCliente} icon={iconoClienteSimplex} draggable
                      eventHandlers={{ dragend: (e) => {
                        const p = e.target.getLatLng();
                        setPuntoCliente([p.lat, p.lng]);
                      } }} />
                  )}
                </MapContainer>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button type="button" onClick={() => setMapaClienteAbierto(false)}
                  style={{ ...estilos.botonChico, backgroundColor: "#475569", flex: 1 }}>Cancelar</button>
                <button type="button" disabled={!puntoCliente || guardandoPuntoCliente}
                  onClick={guardarUbicacionCliente}
                  style={{ ...estilos.botonChico, backgroundColor: "#15803d", flex: 1,
                    opacity: !puntoCliente || guardandoPuntoCliente ? 0.5 : 1 }}>
                  {guardandoPuntoCliente ? "⏳ Guardando..." : "💾 Guardar ubicación"}
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              ...estilos.estadoCuenta,
              backgroundColor:
                Number(comercioSeleccionado.deuda || 0) > 0 ? "#7f1d1d" : "#1e3a8a",
              borderColor:
                Number(comercioSeleccionado.deuda || 0) > 0 ? "#ef4444" : "#60a5fa",
            }}
          >
            {Number(comercioSeleccionado.deuda || 0) > 0
              ? `🔴 CON DEUDA $${Number(comercioSeleccionado.deuda || 0).toLocaleString("es-AR")}`
              : "🔵 SIN DEUDA"}
          </div>


          <div style={estilos.resumen}>
            {resumen.cargando ? (
              <strong>⏳ Cargando compras...</strong>
            ) : resumen.cantidad > 0 ? (
              <>
                <div style={{ fontWeight: 900, marginBottom: "5px" }}>
                  🛒 Última compra:{" "}
                  {new Date(resumen.ultimaFecha).toLocaleDateString("es-AR")} · $
                  {Number(resumen.ultimaTotal || 0).toLocaleString("es-AR", {
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div style={{ color: "#cbd5e1", fontWeight: 800 }}>
                  📦 Compras: {resumen.cantidad} · 💰 Total histórico: $
                  {Number(resumen.total || 0).toLocaleString("es-AR", {
                    maximumFractionDigits: 2,
                  })}
                </div>
              </>
            ) : (
              <strong style={{ color: "#94a3b8" }}>🛒 Sin compras registradas</strong>
            )}
          </div>

          <button
            type="button"
            onClick={() => setTomandoPedido(true)}
            style={{ ...estilos.botonGrande, backgroundColor: "#2563eb" }}
          >
            📦 TOMAR PEDIDO
          </button>

          <button
            type="button"
            onClick={() => setViendoHistorial(true)}
            style={{ ...estilos.botonGrande, backgroundColor: "#0f766e" }}
          >
            🧾 HISTORIAL DE COMPRAS
          </button>

        </main>
      </div>
    );
  }

  return (
    <div style={estilos.pagina}>
      <header style={estilos.headerPrincipal}>
        <div>
          <div style={{ fontSize: "21px", fontWeight: 950 }}>💻 RutaComercio Simplex</div>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
            👤 {perfil?.nombre || sesion?.user?.email || "Usuario"} ·{" "}
            <span style={{ color: "#38bdf8" }}>{perfil?.empresa || "Empresa"}</span>
          </div>
        </div>
        <button type="button" onClick={cerrarSesion} style={estilos.salir}>✕ Salir</button>
      </header>

      <main style={estilos.contenedor}>
        {vista === "inicio" ? (
          <>
            <div style={estilos.presentacion}>
              <div style={{ fontSize: "19px", fontWeight: 950 }}>Panel Simplex</div>
              <div style={{ marginTop: "5px", color: "#cbd5e1", fontSize: "13px", lineHeight: 1.45 }}>
                Tu operación comercial en un solo lugar: clientes, ventas, productos,
                stock y trabajo en calle.
              </div>
            </div>
            <div style={estilos.modulos}>
              {[
                ["dia","🚗","Mi día de trabajo","Pendientes y visitas realizadas"],
                ["clientes","🏪","Clientes","Alta, búsqueda, pedidos e historial"],
                ["ventas","🧾","Ventas","NVI e historial general"],
                ["preciosStock","📦","Precios y stock","Consulta, catálogo y existencias"],
                ["estadisticas","📈","Estadísticas","Tu actividad y resultados"],
              ].map(([id,icono,titulo,detalle]) => (
                <button key={id} type="button" onClick={() => abrirModulo(id)} style={estilos.modulo}>
                  <span style={estilos.moduloIcono}>{icono}</span>
                  <span style={estilos.moduloTitulo}>{titulo}</span>
                  <span style={estilos.moduloTexto}>{detalle}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={estilos.barraModulo}>
              <button
                type="button"
                onClick={() => {
                  if (nuevaVentaDesdeVentas) {
                    setNuevaVentaDesdeVentas(false);
                    setVista("ventas");
                  } else {
                    setVista("inicio");
                  }
                }}
                style={estilos.botonVolver}
              >
                {nuevaVentaDesdeVentas ? "← Ventas" : "← Inicio"}
              </button>
              <strong>{nuevaVentaDesdeVentas ? "🧾 Elegir cliente para la venta" : "🏪 Clientes"}</strong>
            </div>
            {nuevaVentaDesdeVentas && (
              <div style={{
                backgroundColor:"#eff6ff",
                border:"2px solid #2563eb",
                borderRadius:"14px",
                padding:"12px",
                marginBottom:"10px"
              }}>
                <div style={{fontSize:"12px",fontWeight:900,color:"#1d4ed8",marginBottom:"7px"}}>
                  🔎 ¿A quién le vas a vender?
                </div>
                <input
                  autoFocus
                  type="text"
                  value={busqueda}
                  onChange={(e)=>setBusqueda(e.target.value)}
                  placeholder="Buscar cliente por nombre, dirección o teléfono..."
                  style={{...estilos.buscador, margin:0, backgroundColor:"#fff", border:"2px solid #93c5fd", fontSize:"15px"}}
                />
              </div>
            )}
            {!nuevaVentaDesdeVentas && (
              <input type="text" value={busqueda} onChange={(e)=>setBusqueda(e.target.value)}
                placeholder="🔎 Buscar cliente por nombre, dirección, teléfono o ID..." style={estilos.buscador}/>
            )}
            <button
              type="button"
              onClick={() => setVista("nuevoCliente")}
              style={{
                ...estilos.botonGrande,
                backgroundColor:"#f8fafc",
                color:"#475569",
                border:"1px solid #cbd5e1",
                boxShadow:"none",
                padding:"9px 12px",
                fontSize:"12px",
                marginBottom:"10px"
              }}
            >
              ➕ Nuevo cliente
            </button>
            <div style={estilos.contador}>
              {cargando ? "Cargando clientes..." : `${clientesFiltrados.length} cliente${clientesFiltrados.length === 1 ? "" : "s"}`}
            </div>
            {cargando ? <div style={estilos.mensaje}>⏳ Cargando clientes...</div>
            : clientesFiltrados.length === 0 ? (
              <div style={estilos.mensaje}>
                <div style={{fontWeight:900,color:"#fff",marginBottom:"5px"}}>Todavía no tenés clientes.</div>
                Creá el primero con el botón “Nuevo cliente”.
              </div>
            ) : (
              <div style={estilos.lista}>
                {clientesFiltrados.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setComercioSeleccionado(c);
                      if (nuevaVentaDesdeVentas) setTomandoPedido(true);
                    }}
                    style={estilos.cliente}
                  >
                    <div style={{fontWeight:900,fontSize:"15px",color:"#fff"}}>🏪 {c.nombre || `Comercio #${c.id}`}</div>
                    <div style={{color:"#94a3b8",fontSize:"12px",marginTop:"4px"}}>
                      {c.direccion || "Sin dirección"}{c.rubro ? ` · ${c.rubro}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const estilos = {
  pagina: {
    minHeight: "100vh",
    backgroundColor: "#090d16",
    color: "#fff",
    fontFamily: "sans-serif",
  },
  headerPrincipal: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "13px 16px",
    backgroundColor: "#0f172a",
    borderBottom: "1px solid #1e293b",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "13px 16px",
    backgroundColor: "#0f172a",
    borderBottom: "1px solid #1e293b",
  },
  marcaChica: {
    fontSize: "12px",
    color: "#38bdf8",
    fontWeight: 800,
  },
  salir: {
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "7px 11px",
    borderRadius: "7px",
    fontWeight: 800,
    cursor: "pointer",
  },
  contenedor: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
    padding: "18px 16px 50px",
    boxSizing: "border-box",
  },
  contenedorFicha: {
    width: "100%",
    maxWidth: "650px",
    margin: "0 auto",
    padding: "18px 16px 50px",
    boxSizing: "border-box",
  },
  presentacion: {
    padding: "14px",
    backgroundColor: "#111827",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    marginBottom: "12px",
  },
  buscador: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    backgroundColor: "#0b1329",
    border: "1px solid #334155",
    borderRadius: "9px",
    color: "#fff",
    fontSize: "15px",
    outline: "none",
  },
  contador: {
    margin: "10px 2px",
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  lista: {
    display: "grid",
    gap: "8px",
  },
  cliente: {
    width: "100%",
    textAlign: "left",
    padding: "13px 14px",
    backgroundColor: "#111827",
    border: "1px solid #334155",
    borderRadius: "10px",
    cursor: "pointer",
  },
  mensaje: {
    padding: "20px",
    textAlign: "center",
    color: "#94a3b8",
    backgroundColor: "#111827",
    borderRadius: "10px",
  },
  botonVolver: {
    background: "transparent",
    border: "none",
    color: "#cbd5e1",
    fontWeight: 800,
    cursor: "pointer",
    padding: 0,
  },
  estadoCuenta: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    marginBottom: "12px",
    borderRadius: "9px",
    border: "1px solid",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 900,
    textAlign: "center",
  },
  resumen: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    marginBottom: "14px",
    borderRadius: "9px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    fontSize: "13px",
  },
  botonGrande: {
    width: "100%",
    padding: "14px",
    marginBottom: "12px",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 900,
    cursor: "pointer",
  },
  avisoCalle: {
    marginTop: "8px",
    padding: "13px",
    backgroundColor: "#1e293b",
    border: "1px solid #475569",
    borderRadius: "10px",
    fontSize: "13px",
  },
  modulos: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:"10px" },
  modulo: { minHeight:"125px", padding:"16px", backgroundColor:"#111827", border:"1px solid #334155",
    borderRadius:"12px", color:"#fff", textAlign:"left", cursor:"pointer", display:"flex",
    flexDirection:"column", alignItems:"flex-start" },
  moduloIcono: { fontSize:"25px", marginBottom:"9px" },
  moduloTitulo: { fontSize:"16px", fontWeight:950 },
  moduloTexto: { marginTop:"5px", color:"#94a3b8", fontSize:"12px", lineHeight:1.35 },
  barraModulo: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px",
    paddingBottom:"10px", borderBottom:"1px solid #1e293b" },
  ayudaAlta: { padding:"12px", marginBottom:"16px", borderRadius:"9px", backgroundColor:"#111827",
    border:"1px solid #334155", color:"#cbd5e1", fontSize:"13px", lineHeight:1.4 },
  label: { display:"block", marginBottom:"6px", fontSize:"13px", fontWeight:800, color:"#e2e8f0" },
  input: { width:"100%", boxSizing:"border-box", padding:"11px 12px", marginBottom:"14px",
    backgroundColor:"#0f172a", border:"1px solid #334155", borderRadius:"8px",
    color:"#fff", fontSize:"14px", outline:"none" },
  panelSeccion: { padding:"14px", marginBottom:"14px", backgroundColor:"#111827", border:"1px solid #334155", borderRadius:"12px" },
  filaLista: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px", padding:"10px 0", borderBottom:"1px solid #1e293b" },
  badge: { backgroundColor:"#1e3a8a", color:"#bfdbfe", padding:"4px 7px", borderRadius:"999px", fontSize:"10px", fontWeight:900 },
  botonChico: { width:"100%", padding:"9px 11px", color:"#fff", border:"none", borderRadius:"7px", fontSize:"12px", fontWeight:900, cursor:"pointer" },
  vistaPrevia: { marginTop:"12px", padding:"12px", border:"1px solid #334155", borderRadius:"10px", backgroundColor:"#0f172a" },
  resumenImportacion: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"7px", textAlign:"center" },

};
