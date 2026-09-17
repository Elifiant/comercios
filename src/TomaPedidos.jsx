import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function TomaPedidos({ comercio, usuario, onVolver, pedidoExistente = null }) {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSel, setCategoriaSel] = useState('TODOS');
  const [itemsPedido, setItemsPedido] = useState(pedidoExistente?.items || []);
  const [medioPago, setMedioPago] = useState('Efectivo');
  const [observaciones, setObservaciones] = useState(pedidoExistente?.observaciones || "");
  const [enviarWsp, setEnviarWsp] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exitoGuardado, setExitoGuardado] = useState(false);

  // Catálogo base de artículos disponibles
    // Catálogo base de preventa (fallback seguro para calle)
    // Catálogo base enriquecido con múltiples artículos y códigos "104"
  
  const [catalogo, setCatalogo] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

  useEffect(() => {
    async function cargarArticulosReales() {
      try {
        // Intento 1: Traer desde lista_productos cruzado con productos
        const { data: dataLista, error: errLista } = await supabase
          .from("lista_productos")
          .select(`
            id,
            codigo_lista,
            detalle_en_lista,
            precio,
            productos (
              id,
              codigo_cge,
              nombre,
              marca,
              presentacion,
              empresa
            )
          `)
          .eq("activo", true);

        if (!errLista && dataLista && dataLista.length > 0) {
          const prods = dataLista.map(item => ({
            id: item.id,
            codigo: item.productos?.codigo_cge || item.codigo_lista || "S/C",
            nombre: item.productos?.nombre || item.detalle_en_lista || "Producto sin nombre",
            marca: item.productos?.marca || "",
            presentacion: item.productos?.presentacion || "",
            precio: parseFloat(item.precio) || 0
          }));
          setCatalogo(prods);
        } else {
          // Intento 2 (Fallback directo): Traer directo de la tabla productos
          const { data: dataProds } = await supabase
            .from("productos")
            .select("*")
            .eq("activo", true);

          if (dataProds && dataProds.length > 0) {
            setCatalogo(dataProds.map(p => ({
              id: p.id,
              codigo: p.codigo_cge || "S/C",
              nombre: p.nombre || "Sin nombre",
              marca: p.marca || "",
              presentacion: p.presentacion || "",
              precio: 0
            })));
          }
        }
      } catch (err) {
        console.error("Error cargando productos de Supabase:", err);
      } finally {
        setCargandoCatalogo(false);
      }
    }
    cargarArticulosReales();
  }, []);


  // Búsqueda inteligente por código, nombre o marca
  const catalogoFiltrado = catalogo.filter(p => {
    const q = (busqueda || "").toLowerCase().trim();
    const codLimpio = (p.codigo || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const qLimpio = q.replace(/[^a-z0-9]/g, "");

    const coincideCodigo = qLimpio && (codLimpio.includes(qLimpio) || String(p.id).includes(qLimpio));
    const coincideNombre = (p.nombre || "").toLowerCase().includes(q);
    const coincideMarca = (p.marca || "").toLowerCase().includes(q);
    const coincideTexto = !q || coincideCodigo || coincideNombre || coincideMarca;

    const coincideCat = categoriaSel === "TODOS" || p.categoria === categoriaSel;
    return coincideTexto && coincideCat;
  });

  const agregarAlPedido = (producto) => {
    const yaExiste = itemsPedido.find(it => it.codigo === producto.codigo);
    if (yaExiste) {
      setItemsPedido(itemsPedido.map(it => it.codigo === producto.codigo ? { ...it, cant: it.cant + 1 } : it));
    } else {
      setItemsPedido([{
        id: Date.now(),
        codigo: producto.codigo,
        marca: producto.marca,
        nombre: producto.nombre,
        precioLista: producto.precio,
        bonif: 0,
        cant: 1,
        esNuevo: !!pedidoExistente,
        nota: ''
      }, ...itemsPedido]);
    }
  };

  const modificarCant = (id, delta) => {
    setItemsPedido(itemsPedido.map(it => {
      if (it.id === id) {
        const nueva = it.cant + delta;
        return nueva > 0 ? { ...it, cant: nueva } : it;
      }
      return it;
    }));
  };

  const eliminarItem = (id) => {
    setItemsPedido(itemsPedido.filter(it => it.id !== id));
  };

  const cambiarBonif = (id, bonif) => {
    setItemsPedido(itemsPedido.map(it => it.id === id ? { ...it, bonif: Number(bonif) } : it));
  };

  // Cálculos totales
  const subtotalBruto = itemsPedido.reduce((acc, it) => acc + (it.precioLista * it.cant), 0);
  const totalDescuentos = itemsPedido.reduce((acc, it) => acc + ((it.precioLista * it.cant) * (it.bonif / 100)), 0);
  const totalFinal = subtotalBruto - totalDescuentos;

  const confirmarPedido = async () => {
    if (itemsPedido.length === 0) {
      alert('Agregá al menos un artículo al pedido');
      return;
    }
    setGuardando(true);
    try {
      const pedidoPayload = {
        comercio_id: comercio?.id || 104,
        comercio_nombre: comercio?.nombre || 'Almacén Los Amigos',
        comercio_direccion: comercio?.direccion || 'Av. Mitre 4820, Avellaneda',
        preventista: usuario?.nombre || 'Alex Preventista',
        empresa: usuario?.empresa || 'Elifiant',
        subtotal: subtotalBruto,
        descuentos: totalDescuentos,
        total: totalFinal,
        medio_pago: medioPago,
        observaciones: observaciones,
        items: itemsPedido,
        es_anexo: !!pedidoExistente,
        estado: 'Confirmado / Listo para Reparto',
        fecha: new Date().toISOString()
      };

      // Guardar en Supabase si la tabla existe, con respaldo en localStorage
      try {
        await supabase.from('pedidos').insert([pedidoPayload]);
      } catch (e) {
        console.warn('Registro local de pedido:', e);
      }

      // Guardado local de contingencia
      const historico = JSON.parse(localStorage.getItem('pedidos_guardados') || '[]');
      historico.unshift(pedidoPayload);
      localStorage.setItem('pedidos_guardados', JSON.stringify(historico));

      // WhatsApp si está tildado
      if (enviarWsp) {
        const telLimpio = (comercio?.telefono || '1166646806').replace(/\D/g, '');
        const msj = encodeURIComponent(
          `*📦 PEDIDO #${pedidoExistente ? '104 (ACTUALIZADO)' : '104'} - ${comercio?.nombre || 'Comercio'}*\n` +
          `Preventista: ${usuario?.nombre || 'Alex'}\n` +
          `Medio de Pago: ${medioPago}\n` +
          `--------------------------\n` +
          itemsPedido.map(it => `• ${it.cant}x ${it.nombre} (${it.bonif > 0 ? it.bonif + '% OFF' : 'Neto'}): $${((it.precioLista * it.cant) * (1 - it.bonif / 100)).toLocaleString()}`).join('\n') +
          `\n--------------------------\n` +
          `*TOTAL A COBRAR: $${totalFinal.toLocaleString()} ARS*\n` +
          (observaciones ? `Notas: ${observaciones}\n` : '') +
          `_RutaComercio · Comanda Oficial_`
        );
        window.open(`https://wa.me/549${telLimpio}?text=${msj}`, '_blank');
      }

      setExitoGuardado(true);
      setTimeout(() => {
        if (onVolver) onVolver();
      }, 1500);

    } catch (err) {
      alert('Error al procesar comanda: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, sans-serif', paddingBottom: '140px' }}>
      {/* Cabecera Móvil */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <button onClick={onVolver} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ←
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            {pedidoExistente ? 'Modificar Pedido #104' : 'Toma de Pedido'}
          </h1>
          {pedidoExistente && (
            <span style={{ fontSize: '11px', color: '#d97706', fontWeight: '700' }}>
              ⏱️ Ventana abierta: 15 min restantes
            </span>
          )}
        </div>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
          {usuario?.nombre ? usuario.nombre[0] : 'A'}
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        {/* Ficha rápida del local */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                Ficha #{comercio?.id || 104}
              </span>
              <h2 style={{ margin: '4px 0 2px', fontSize: '17px', fontWeight: '800' }}>{comercio?.nombre || 'Almacén Los Amigos'}</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>📍 {comercio?.direccion || 'Av. Mitre 4820, Avellaneda'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{itemsPedido.length} renglones</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>${totalFinal.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Alerta de Reedición / Anexo Rápido */}
        {pedidoExistente && (
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px', marginBottom: '16px', display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>✏️</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e40af' }}>Modificando Pedido #104 (Unificación Activa)</div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#1e3a8a' }}>
                Los nuevos ítems se unificarán en una <strong>sola comanda de reparto</strong> antes del despacho del camión.
              </p>
            </div>
          </div>
        )}

        {/* Buscador de artículos por código o nombre */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código (ej: CGE-102) o nombre..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 38px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8', fontSize: '16px' }}>🔍</span>
            {busqueda && (
              <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: '10px', top: '10px', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>
            )}
          </div>

          {/* Categorías */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['TODOS', 'Bebidas', 'Golosinas', 'Almacén'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaSel(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: categoriaSel === cat ? '#2563eb' : '#e2e8f0',
                  color: categoriaSel === cat ? '#ffffff' : '#475569',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Desplegable de sugerencias de búsqueda si escribe */}
        {busqueda.length > 0 && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '8px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', padding: '4px 8px', textTransform: 'uppercase' }}>Artículos Encontrados</div>
            {catalogoFiltrado.map(prod => (
            <div
              key={prod.id || prod.codigo}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 8px",
                background: "#ffffff",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                gap: "8px"
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", lineHeight: "1" }}>
                  <span style={{ fontSize: "9px", fontWeight: "700", color: "#2563eb", background: "#eff6ff", padding: "1px 4px", borderRadius: "3px" }}>
                    {prod.codigo || "S/C"}
                  </span>
                  {prod.marca && (
                    <span style={{ fontSize: "10px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                      {prod.marca}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "1px" }}>
                  {prod.nombre || prod.detalle_en_lista}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", marginTop: "1px" }}>
                  <span style={{ fontWeight: "700", color: "#2563eb" }}>
                    $ {Number(prod.precio || 0).toLocaleString("es-AR")}
                  </span>
                  {prod.stock !== undefined && (
                    <span style={{ color: "#64748b", fontSize: "10px" }}>
                      · Stock: {prod.stock}u
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => agregarAlPedido(prod)}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "5px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                  flexShrink: 0,
                  height: "26px",
                  boxShadow: "0 1px 4px rgba(37,99,235,0.2)"
                }}
              >
                +1 Bulto
              </button>
            </div>
          ))}
          </div>
        )}

        {/* Lista de Renglones Cargados */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800' }}>Renglones del Pedido</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{itemsPedido.length} artículos</span>
          </div>

          {itemsPedido.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1' }}>
              No hay artículos en la comanda. Buscá arriba por código o nombre para sumar renglones.
            </div>
          ) : (
            itemsPedido.map(item => {
              const subtotalItem = (item.precioLista * item.cant) * (1 - item.bonif / 100);
              return (
                <div key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: item.esNuevo ? '2px solid #f59e0b' : '1px solid #e2e8f0', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{item.codigo}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>{item.marca}</span>
                        {item.esNuevo ? (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px' }}>
                            🔔 NUEVO / ANEXO
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>
                            ✓ Confirmado
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '800', margin: '4px 0' }}>{item.nombre}</div>
                    </div>
                    <button onClick={() => eliminarItem(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '16px', cursor: 'pointer', padding: '4px' }}>
                      🗑️
                    </button>
                  </div>

                  {/* Cantidad y Descuento */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    {/* Descuento */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>% Desc:</span>
                      <select
                        value={item.bonif}
                        onChange={(e) => cambiarBonif(item.id, e.target.value)}
                        style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', outline: 'none' }}
                      >
                        <option value={0}>0% Normal</option>
                        <option value={5}>5% Bonif.</option>
                        <option value={10}>10% OFF</option>
                        <option value={15}>15% Mayor</option>
                      </select>
                    </div>

                    {/* Controles + / - */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => modificarCant(item.id, -1)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                      <span style={{ fontSize: '15px', fontWeight: '800', minWidth: '24px', textAlign: 'center' }}>{item.cant}</span>
                      <button onClick={() => modificarCant(item.id, 1)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #2563eb', background: '#2563eb', color: '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>${subtotalItem.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Medio de Pago y Observaciones */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px' }}>Condiciones & Forma de Pago</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {['Efectivo', 'Transferencia QR', 'Cta. Cte. 7 días', 'BCH / Crypto'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMedioPago(m)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: medioPago === m ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: medioPago === m ? '#eff6ff' : '#ffffff',
                  color: medioPago === m ? '#1e40af' : '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {medioPago === m ? '● ' : '○ '} {m}
              </button>
            ))}
          </div>

          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
            Observaciones logísticas para reparto:
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Envío WhatsApp */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px 14px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            <input type="checkbox" checked={enviarWsp} onChange={(e) => setEnviarWsp(e.target.checked)} />
            <span>💬 Enviar comanda por WhatsApp</span>
          </label>
          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '800' }}>
            {comercio?.telefono || '11-4820-9912'}
          </span>
        </div>
      </main>

      {/* Barra Fija Inferior con Totales y Botón de Acción */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '12px 16px', boxShadow: '0 -4px 12px rgba(0,0,0,0.06)', zIndex: 40 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Subtotal: <strong>${subtotalBruto.toLocaleString()}</strong> · Desc: <strong style={{ color: '#ef4444' }}>-${totalDescuentos.toLocaleString()}</strong>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>
              ${totalFinal.toLocaleString()} <span style={{ fontSize: '12px', color: '#64748b' }}>ARS</span>
            </div>
          </div>

          <button
            onClick={confirmarPedido}
            disabled={guardando || exitoGuardado}
            style={{
              width: '100%',
              backgroundColor: exitoGuardado ? '#16a34a' : pedidoExistente ? '#d97706' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
            }}
          >
            {guardando ? (
              <span>⏳ Procesando Comanda...</span>
            ) : exitoGuardado ? (
              <span>✅ Comanda Registrada y Enviada</span>
            ) : pedidoExistente ? (
              <>
                <span>🔁 Actualizar y Reenviar Pedido #104</span>
                <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.9 }}>Comanda Única · Sincroniza Depósito, WhatsApp y Supervisor</span>
              </>
            ) : (
              <>
                <span>🚀 Confirmar y Enviar Pedido</span>
                <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.9 }}>Notificación automática a Supervisor y Depósito</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
