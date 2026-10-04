import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import TomaPedidos from "./TomaPedidos";
import HistorialCliente from "./HistorialCliente";

export default function Simplex({ sesion: sesionProp, perfil: perfilProp }) {
  const [comercios, setComercios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [comercioSeleccionado, setComercioSeleccionado] = useState(null);
  const [tomandoPedido, setTomandoPedido] = useState(false);
  const [viendoHistorial, setViendoHistorial] = useState(false);
  const [vista, setVista] = useState("inicio");
  const [ventas, setVentas] = useState([]);
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [busquedaVentas, setBusquedaVentas] = useState("");
  const [nuevaVentaDesdeVentas, setNuevaVentaDesdeVentas] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [itemsVentaDetalle, setItemsVentaDetalle] = useState([]);
  const [cargandoDetalleVenta, setCargandoDetalleVenta] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [listasCliente, setListasCliente] = useState([]);
  const [listaParaAsignar, setListaParaAsignar] = useState("");
  const [cargandoListasCliente, setCargandoListasCliente] = useState(false);
  const [guardandoAsignacionLista, setGuardandoAsignacionLista] = useState(false);
  const [listasPrecios, setListasPrecios] = useState([]);
  const [cargandoListas, setCargandoListas] = useState(false);
  const [archivoListaNombre, setArchivoListaNombre] = useState("");
  const [vistaPreviaLista, setVistaPreviaLista] = useState(null);
  const [nombreLista, setNombreLista] = useState("");
  const [codigoLista, setCodigoLista] = useState("");
  const [guardandoLista, setGuardandoLista] = useState(false);
  const [listaActualizando, setListaActualizando] = useState(null);
  const [archivoActualizacionNombre, setArchivoActualizacionNombre] = useState("");
  const [vistaPreviaActualizacion, setVistaPreviaActualizacion] = useState(null);
  const [guardandoActualizacion, setGuardandoActualizacion] = useState(false);
  const inputActualizarListaRef = useRef(null);
  const inputListaRef = useRef(null);
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
          .select("fecha, total")
          .eq("comercio_id", String(comercioSeleccionado.id))
          .order("fecha", { ascending: false });

        if (perfil?.empresa_id) {
          query = query.eq("empresa_id", perfil.empresa_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (cancelado) return;

        const ventas = data || [];
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
  }, [comercioSeleccionado?.id, perfil?.empresa_id]);

  useEffect(() => {
    let cancelado = false;

    const cargarListasDelCliente = async () => {
      if (!comercioSeleccionado?.id || !perfil?.empresa_id) {
        setListasCliente([]);
        setListaParaAsignar("");
        return;
      }

      setCargandoListasCliente(true);
      try {
        const [asignadasRes, listasRes] = await Promise.all([
          supabase
            .from("comercios_listas")
            .select("id,comercio_id,lista_id,activo,fecha_asignacion,listas_precios(id,nombre,codigo,predeterminada,empresa_id)")
            .eq("comercio_id", comercioSeleccionado.id)
            .eq("activo", true),
          supabase
            .from("listas_precios")
            .select("id,nombre,codigo,predeterminada,empresa_id")
            .eq("empresa_id", perfil.empresa_id)
            .eq("activo", true)
            .order("predeterminada", { ascending:false })
            .order("nombre", { ascending:true })
        ]);

        if (asignadasRes.error) throw asignadasRes.error;
        if (listasRes.error) throw listasRes.error;
        if (cancelado) return;

        const asignadas = (asignadasRes.data || []).filter(
          x => x.listas_precios?.empresa_id === perfil.empresa_id
        );
        const disponibles = listasRes.data || [];

        setListasCliente(asignadas);
        setListasPrecios(disponibles);

        const yaAsignadas = new Set(asignadas.map(x => x.lista_id));
        const sugerida =
          disponibles.find(x => x.predeterminada && !yaAsignadas.has(x.id)) ||
          disponibles.find(x => !yaAsignadas.has(x.id));

        setListaParaAsignar(sugerida?.id || "");
      } catch (error) {
        console.error("Simplex - error cargando listas del cliente:", error);
        if (!cancelado) {
          setListasCliente([]);
          setListaParaAsignar("");
        }
      } finally {
        if (!cancelado) setCargandoListasCliente(false);
      }
    };

    cargarListasDelCliente();
    return () => { cancelado = true; };
  }, [comercioSeleccionado?.id, perfil?.empresa_id]);

  const asignarListaAlCliente = async () => {
    if (!comercioSeleccionado?.id) return;
    if (!listaParaAsignar) return alert("⚠️ Elegí una productos y precios.");

    const lista = listasPrecios.find(x => x.id === listaParaAsignar);
    if (!lista) return alert("⚠️ No pude identificar la lista.");

    if (!window.confirm(
      `💲 ASIGNAR LISTA\n\nCliente: ${comercioSeleccionado.nombre}\nLista: ${lista.nombre}\n\n¿Confirmar?`
    )) return;

    setGuardandoAsignacionLista(true);
    try {
      const { data, error } = await supabase
        .from("comercios_listas")
        .insert({
          comercio_id: comercioSeleccionado.id,
          lista_id: lista.id,
          activo: true
        })
        .select("id,comercio_id,lista_id,activo,fecha_asignacion")
        .single();

      if (error) throw error;

      setListasCliente(prev => [
        ...prev,
        { ...data, listas_precios: lista }
      ]);
      setListaParaAsignar("");
      alert(`✅ LISTA ASIGNADA\n\n${lista.nombre}\n${comercioSeleccionado.nombre}`);
    } catch (error) {
      console.error("Simplex - error asignando lista:", error);
      alert(`❌ No se pudo asignar la lista.\n\n${error?.message || "Error desconocido"}`);
    } finally {
      setGuardandoAsignacionLista(false);
    }
  };

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

  const editarVentaActual = async () => {
    if (!ventaDetalle?.id || cargandoDetalleVenta) return;

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

  const abrirModulo = (modulo) => {
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
      ["codigo","gtin","descripcion","marca","precio"],
      ["ART001","7791234567890","Shampoo Profesional 1 L","Marca Ejemplo",12500],
      ["ART002","","Acondicionador Profesional 1 L","",11800],
    ];
    const ws=XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"]=[{wch:16},{wch:18},{wch:38},{wch:22},{wch:14}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Productos y precios");
    XLSX.writeFile(wb,"plantilla_lista_precios_rutacomercio.xlsx");
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
        const pr=campo(fila,["precio","precio venta","pvp"]);
        let precio=typeof pr==="number"?pr:Number(String(pr??"").trim().replace(/\s/g,"").replace(/\./g,"").replace(",","."));
        const errores=[];
        if(!codigo) errores.push("Falta código");
        if(!descripcion) errores.push("Falta descripción");
        if(!Number.isFinite(precio)||precio<0) errores.push("Precio inválido");
        return {fila:i+2,codigo,gtin,descripcion,marca,precio,errores};
      });
      setVistaPreviaLista({total:productos.length,validos:productos.filter(p=>!p.errores.length),conProblemas:productos.filter(p=>p.errores.length)});
    } catch(error) {
      console.error(error); alert("❌ No pude leer el archivo. Usá la plantilla oficial.");
    } finally { event.target.value=""; }
  };

  const crearListaInicial = async () => {
    if(!perfil?.empresa_id) return alert("⚠️ No pude identificar la empresa.");
    if(!nombreLista.trim()||!codigoLista.trim()) return alert("⚠️ Completá nombre y código de la lista.");
    if(!vistaPreviaLista?.validos?.length) return alert("⚠️ Primero elegí una planilla.");
    if(vistaPreviaLista.conProblemas.length) return alert("⚠️ Corregí las filas con problemas.");
    if(!window.confirm(`⚠️ CREAR LISTA\n\n${nombreLista.trim()}\nProductos: ${vistaPreviaLista.validos.length}\n\n¿Confirmar?`)) return;

    setGuardandoLista(true);
    let listaCreada=null;
    try {
      const {data:lista,error}=await supabase.from("listas_precios").insert({
        nombre:nombreLista.trim(), codigo:codigoLista.trim(), activo:true,
        predeterminada:listasPrecios.length===0, empresa_id:perfil.empresa_id, empresa:perfil.empresa||null
      }).select("*").single();
      if(error) throw error;
      listaCreada=lista;

      const productosNuevos=vistaPreviaLista.validos.map(p=>({
        codigo:p.codigo, gtin:p.gtin||"", nombre:p.descripcion, descripcion:p.descripcion, marca:p.marca||"", precio:Number(p.precio)
      }));
      const {data:res,error:errorRpc}=await supabase.rpc("actualizar_lista_precios",{
        p_lista_id:lista.id,p_cambios_precio:[],p_productos_nuevos:productosNuevos,p_productos_quitar:[]
      });
      if(errorRpc) throw errorRpc;
      if(!res?.ok) throw new Error("Supabase no confirmó la carga de productos.");

      alert(`✅ LISTA CREADA\n\n${nombreLista.trim()}\nProductos: ${res.productos_creados ?? productosNuevos.length}`);
      setNombreLista(""); setCodigoLista(""); setArchivoListaNombre(""); setVistaPreviaLista(null);
      await cargarListasPrecios();
    } catch(error) {
      if(listaCreada?.id) await supabase.from("listas_precios").delete().eq("id",listaCreada.id).eq("empresa_id",perfil.empresa_id);
      console.error(error); alert(`❌ No se pudo crear la lista.\n\n${error?.message||"Error desconocido"}`);
    } finally { setGuardandoLista(false); }
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
      const codigosExcel=new Set(productosExcel.map(p=>p.codigo.trim().toLowerCase()));
      const cambiosPrecio=[], productosNuevos=[];
      for(const p of productosExcel){
        const actual=mapa.get(p.codigo.trim().toLowerCase());
        if(!actual) productosNuevos.push({codigo:p.codigo,gtin:p.gtin||"",nombre:p.descripcion,descripcion:p.descripcion,marca:p.marca||"",precio:Number(p.precio)});
        else if(Number(actual.precio||0)!==Number(p.precio)) cambiosPrecio.push({
          lista_producto_id:actual.id,producto_id:actual.producto_id,codigo:p.codigo,
          precio_anterior:Number(actual.precio||0),precio_nuevo:Number(p.precio),precio:Number(p.precio)
        });
      }
      const productosQuitar=norm.filter(x=>!codigosExcel.has(x.codigoComparacion)).map(x=>({
        lista_producto_id:x.id,producto_id:x.producto_id,codigo:x.codigo_lista||x.productos?.codigo_cge||"",
        nombre:x.productos?.nombre||x.detalle_en_lista||""
      }));
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
    if(!window.confirm(`🔄 ACTUALIZAR PRECIOS\n\n${listaActualizando.nombre}\nCambios de precio: ${c.cambiosPrecio.length}\nProductos nuevos: ${c.productosNuevos.length}\nProductos que ya no vienen: ${c.productosQuitar.length}\n\n¿Confirmar actualización?`)) return;
    setGuardandoActualizacion(true);
    try{
      const {data:res,error}=await supabase.rpc("actualizar_lista_precios",{
        p_lista_id:listaActualizando.id,p_cambios_precio:c.cambiosPrecio,
        p_productos_nuevos:c.productosNuevos,p_productos_quitar:c.productosQuitar
      });
      if(error) throw error;
      if(!res?.ok) throw new Error("Supabase no confirmó la actualización.");
      alert(`✅ LISTA ACTUALIZADA\n\n${listaActualizando.nombre}`);
      setListaActualizando(null); setArchivoActualizacionNombre(""); setVistaPreviaActualizacion(null);
      await cargarListasPrecios();
    }catch(error){
      console.error("Simplex - error actualizando lista:",error);
      alert(`❌ No se pudo actualizar la lista.\n\n${error?.message||"Error desconocido"}`);
    }finally{setGuardandoActualizacion(false);}
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

          // Fuerza recarga del resumen sin registrar una visita:
          const actual = comercioSeleccionado;
          setComercioSeleccionado(null);
          setTimeout(() => setComercioSeleccionado(actual), 0);
        }}
      />
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

    const totalVentas = ventasFiltradas.reduce((acc, p) => acc + Number(p.total || p.total_pedido || 0), 0);

    return (
      <div style={estilos.pagina}>
        <header style={estilos.header}>
          <button type="button" onClick={() => setVista("inicio")} style={estilos.botonVolver}>← Inicio</button>
          <div style={estilos.marcaChica}>RutaComercio Simplex · V1.2</div>
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
              <div style={{ fontSize: "22px", fontWeight: 950 }}>{ventasFiltradas.length}</div>
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
                          {fecha} · {p.estado || "Ingresado"}
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
          <div style={estilos.marcaChica}>RutaComercio Simplex · V1.2</div>
        </header>

        <main style={estilos.contenedorFicha}>
          <h2 style={{marginTop:0, marginBottom:"4px"}}>🧾 NVI #{numero || "—"}</h2>
          <div style={{color:"#94a3b8",fontSize:"12px",marginBottom:"12px"}}>{fecha} · {ventaDetalle.estado || "Ingresado"}</div>

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
            disabled={cargandoDetalleVenta || itemsVentaDetalle.length === 0}
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

          <div style={{...estilos.panelSeccion,marginTop:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:900}}>TOTAL NVI</span>
            <span style={{fontSize:"22px",fontWeight:950}}>${total.toLocaleString("es-AR")}</span>
          </div>
        </main>
      </div>
    );
  }

  if (vista === "productos") {
    return (
      <div style={estilos.pagina}>
        <header style={estilos.header}>
          <button type="button" onClick={()=>setVista("inicio")} style={estilos.botonVolver}>← Inicio</button>
          <div style={estilos.marcaChica}>RutaComercio Simplex · V1.2</div>
        </header>
        <main style={estilos.contenedorFicha}>
          <h2 style={{marginTop:0}}>📦 Productos y precios</h2>
          <div style={estilos.ayudaAlta}>Cargá y actualizá los productos y precios de tu empresa.</div>
          <div style={estilos.panelSeccion}>
            <div style={{fontWeight:900,marginBottom:"8px"}}>Tus productos y precios</div>
            {cargandoListas ? <div>⏳ Cargando...</div> : listasPrecios.length ? listasPrecios.map(l=>(
              <div key={l.id} style={{...estilos.filaLista,alignItems:"stretch",flexDirection:"column"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"}}>
                  <div><strong>{l.nombre}</strong><div style={{fontSize:"11px",color:"#94a3b8"}}>{l.codigo||"Sin código"}</div></div>
                  {l.predeterminada&&<span style={estilos.badge}>Predeterminada</span>}
                </div>
                <button type="button" onClick={()=>iniciarActualizacionLista(l)} style={{...estilos.botonChico,backgroundColor:"#0f766e"}}>🔄 ACTUALIZAR PRECIOS</button>
              </div>
            )):<div style={{color:"#94a3b8",fontSize:"13px"}}>Todavía no tenés productos y precios cargados.</div>}
            <input ref={inputActualizarListaRef} type="file" accept=".xlsx,.xls,.csv" onChange={leerArchivoActualizacion} style={{display:"none"}}/>
            {listaActualizando&&<div style={{...estilos.vistaPrevia,marginTop:"14px"}}>
              <div style={{fontWeight:900}}>🔄 Actualizando: {listaActualizando.nombre}</div>
              {archivoActualizacionNombre&&<div style={{fontSize:"12px",color:"#cbd5e1",marginTop:"6px"}}>📄 {archivoActualizacionNombre}</div>}
              {vistaPreviaActualizacion&&<>
                {vistaPreviaActualizacion.conProblemas?.length>0
                  ? <div style={{marginTop:"10px",color:"#fca5a5",fontSize:"12px"}}>⚠️ {vistaPreviaActualizacion.conProblemas.length} fila(s) con problemas. No se modificó nada.</div>
                  : <>
                    <div style={{...estilos.resumenImportacion,marginTop:"12px"}}>
                      <div><strong>{vistaPreviaActualizacion.cambiosPrecio.length}</strong><span>Precios cambian</span></div>
                      <div><strong>{vistaPreviaActualizacion.productosNuevos.length}</strong><span>Nuevos</span></div>
                      <div><strong>{vistaPreviaActualizacion.productosQuitar.length}</strong><span>Ya no vienen</span></div>
                    </div>
                    <button type="button" onClick={confirmarActualizacionLista} disabled={guardandoActualizacion}
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
            <div style={{fontWeight:900,fontSize:"16px",marginBottom:"12px"}}>➕ Crear lista desde Excel / CSV</div>
            <label style={estilos.label}>Nombre de la lista *</label>
            <input style={estilos.input} value={nombreLista} onChange={e=>setNombreLista(e.target.value)} placeholder="Ej.: Lista General Octubre"/>
            <label style={estilos.label}>Código de la lista *</label>
            <input style={estilos.input} value={codigoLista} onChange={e=>setCodigoLista(e.target.value)} placeholder="Ej.: GENERAL"/>
            <button type="button" onClick={descargarPlantillaListaPrecios} style={{...estilos.botonGrande,backgroundColor:"#166534"}}>📥 DESCARGAR PLANTILLA OFICIAL</button>
            <input ref={inputListaRef} type="file" accept=".xlsx,.xls,.csv" onChange={leerArchivoLista} style={{display:"none"}}/>
            <button type="button" onClick={()=>inputListaRef.current?.click()} style={{...estilos.botonGrande,backgroundColor:"#2563eb"}}>1️⃣ ELEGIR ARCHIVO EXCEL / CSV</button>
            {archivoListaNombre&&<div style={{fontSize:"12px",color:"#cbd5e1",marginBottom:"10px"}}>📄 <strong>{archivoListaNombre}</strong></div>}
            {vistaPreviaLista&&<div style={estilos.vistaPrevia}>
              <div style={{fontWeight:900,marginBottom:"9px"}}>2️⃣ Revisar artículos</div>
              <div style={estilos.resumenImportacion}>
                <div><strong>{vistaPreviaLista.total}</strong><span>Encontrados</span></div>
                <div><strong>{vistaPreviaLista.validos.length}</strong><span>Correctos</span></div>
                <div><strong>{vistaPreviaLista.conProblemas.length}</strong><span>Problemas</span></div>
              </div>
              {vistaPreviaLista.conProblemas.length>0&&<div style={{marginTop:"10px",color:"#fca5a5",fontSize:"12px"}}>⚠️ Corregí las filas con problemas antes de importar.</div>}
              <button type="button" onClick={crearListaInicial} disabled={guardandoLista||vistaPreviaLista.conProblemas.length>0}
                style={{...estilos.botonGrande,marginTop:"12px",backgroundColor:"#16a34a",opacity:(guardandoLista||vistaPreviaLista.conProblemas.length)?0.55:1}}>
                {guardandoLista?"⏳ CARGANDO...":"3️⃣ CREAR LISTA EN RUTACOMERCIO"}
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
          <div style={estilos.marcaChica}>RutaComercio Simplex · V1.2</div>
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
            onClick={() => setComercioSeleccionado(null)}
            style={estilos.botonVolver}
          >
            ← Volver a clientes
          </button>
          <div style={estilos.marcaChica}>RutaComercio Simplex · V1.2</div>
        </header>

        <main style={estilos.contenedorFicha}>
          <h2 style={{ margin: "0 0 6px", color: "#fff" }}>
            🏪 {comercioSeleccionado.nombre || "Cliente"}
          </h2>

          <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "12px" }}>
            {comercioSeleccionado.direccion || "Sin dirección cargada"}
          </div>

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

          <div style={estilos.panelSeccion}>
            <div style={{fontWeight:900,marginBottom:"8px"}}>💲 Listas de precios</div>

            {cargandoListasCliente ? (
              <div style={{color:"#94a3b8",fontSize:"13px"}}>⏳ Cargando listas...</div>
            ) : listasCliente.length > 0 ? (
              <div style={{display:"grid",gap:"7px",marginBottom:"12px"}}>
                {listasCliente.map(a => (
                  <div key={a.id} style={{padding:"9px 10px",border:"1px solid #334155",borderRadius:"8px",backgroundColor:"#0f172a"}}>
                    <strong>{a.listas_precios?.nombre || "Lista"}</strong>
                    <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"3px"}}>
                      {a.listas_precios?.codigo || "Sin código"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{color:"#fbbf24",fontSize:"13px",fontWeight:800,marginBottom:"12px"}}>
                Sin listas asignadas
              </div>
            )}

            {listasPrecios.filter(l => !listasCliente.some(a => a.lista_id === l.id)).length > 0 ? (
              <>
                <select
                  value={listaParaAsignar}
                  onChange={e => setListaParaAsignar(e.target.value)}
                  style={{...estilos.input,marginBottom:"9px"}}
                >
                  <option value="">Elegir lista...</option>
                  {listasPrecios
                    .filter(l => !listasCliente.some(a => a.lista_id === l.id))
                    .map(l => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}{l.predeterminada ? " · Predeterminada" : ""}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={asignarListaAlCliente}
                  disabled={guardandoAsignacionLista || !listaParaAsignar}
                  style={{
                    ...estilos.botonGrande,
                    backgroundColor:"#7c3aed",
                    opacity:(guardandoAsignacionLista || !listaParaAsignar) ? 0.55 : 1
                  }}
                >
                  {guardandoAsignacionLista ? "⏳ ASIGNANDO..." : "💲 ASIGNAR LISTA"}
                </button>
              </>
            ) : listasPrecios.length === 0 ? (
              <div style={{color:"#94a3b8",fontSize:"12px"}}>
                Primero creá una lista desde “Productos y listas”.
              </div>
            ) : (
              <div style={{color:"#86efac",fontSize:"12px",fontWeight:800}}>
                ✅ Todas tus listas disponibles ya están asignadas a este cliente.
              </div>
            )}
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

          <div style={estilos.avisoCalle}>
            <div style={{ fontWeight: 900 }}>🚗 Funciones de calle</div>
            <div style={{ marginTop: "5px", color: "#cbd5e1", lineHeight: 1.4 }}>
              Rutas, visitas y GPS formarán parte de Simplex. En este primer paso
              todavía no los activamos para no tocar el MAIN MAIN del Preventista.
            </div>
          </div>
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
                ["clientes","🏪","Clientes","Alta, búsqueda, pedidos e historial"],
                ["ventas","🧾","Ventas","NVI e historial general"],
                ["productos","📦","Productos y precios","Catálogo y precios"],
                ["stock","📊","Stock","Existencias y alertas"],
                ["ruta","🗺️","Rutas y visitas","Organizá tus días de calle"],
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
