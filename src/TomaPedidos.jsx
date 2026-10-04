import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function TomaPedidos({ comercio, usuario, onVolver, onPedidoGuardado, pedidoExistente = null }) {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSel, setCategoriaSel] = useState('TODOS');
  const [itemsPedido, setItemsPedido] = useState(pedidoExistente?.items || []);
  const [catalogo, setCatalogo] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState({});
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [medioPago, setMedioPago] = useState(pedidoExistente?.medioPago || 'Efectivo');
  const [diasCuentaCorriente, setDiasCuentaCorriente] = useState(pedidoExistente?.diasCuentaCorriente || '');
  const [observaciones, setObservaciones] = useState(pedidoExistente?.observaciones || '');
  const [enviarWsp, setEnviarWsp] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exitoGuardado, setExitoGuardado] = useState(false);

  // Catálogo real: UNA lista base por empresa, igual para todos los clientes.
  // Ya no depende de asignaciones comercio -> lista.
  useEffect(() => {
    let cancelado = false;

    const cargarCatalogo = async () => {
      const empresaId = usuario?.empresa_id || comercio?.empresa_id || null;

      if (!empresaId) {
        setCatalogo([]);
        setCargandoCatalogo(false);
        return;
      }

      setCargandoCatalogo(true);
      setErrorCatalogo('');

      try {
        // Tomamos la lista activa de la empresa. Si existe una predeterminada,
        // queda primera; si no, usamos la primera lista activa disponible.
        const { data: listas, error: errListas } = await supabase
          .from('listas_precios')
          .select('id, nombre, codigo, predeterminada, activo')
          .eq('empresa_id', empresaId)
          .eq('activo', true)
          .order('predeterminada', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1);

        if (errListas) throw errListas;

        const listaBase = (listas || [])[0];

        if (!listaBase?.id) {
          if (!cancelado) {
            setCatalogo([]);
            setErrorCatalogo('La empresa todavía no tiene una lista de precios activa.');
          }
          return;
        }

        const { data: renglones, error: errRenglones } = await supabase
          .from('lista_productos')
          .select('id, producto_id, lista_id, codigo_lista, detalle_en_lista, precio')
          .eq('lista_id', listaBase.id)
          .eq('activo', true);

        if (errRenglones) throw errRenglones;

        const productoIds = [...new Set((renglones || []).map(r => r.producto_id).filter(Boolean))];

        if (productoIds.length === 0) {
          if (!cancelado) setCatalogo([]);
          return;
        }

        const { data: productos, error: errProductos } = await supabase
          .from('productos')
          .select('id, codigo_cge, nombre, marca, descripcion, activo, usa_color, usa_talle')
          .in('id', productoIds);

        if (errProductos) throw errProductos;

        const productosPorId = new Map((productos || []).map(p => [p.id, p]));

        const normalizados = (renglones || [])
          .map(r => ({ r, producto: productosPorId.get(r.producto_id) }))
          .filter(x => x.producto && x.producto.activo !== false)
          .map(({ r, producto }) => ({
            id: r.id,
            productoId: r.producto_id,
            listaId: r.lista_id,
            codigo: r.codigo_lista || producto.codigo_cge || '',
            marca: producto.marca || '',
            nombre: r.detalle_en_lista || producto.nombre || 'Artículo',
            categoria: producto.descripcion || 'General',
            precio: Number(r.precio || 0),
            usaColor: producto.usa_color === true,
            usaTalle: producto.usa_talle === true,
          }))
          .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));

        if (!cancelado) setCatalogo(normalizados);
      } catch (err) {
        console.error('Error cargando catálogo de la empresa:', err);
        if (!cancelado) {
          setCatalogo([]);
          setErrorCatalogo(err.message || 'No se pudo cargar la lista de precios de la empresa');
        }
      } finally {
        if (!cancelado) setCargandoCatalogo(false);
      }
    };

    cargarCatalogo();
    return () => { cancelado = true; };
  }, [usuario?.empresa_id, comercio?.empresa_id]);

  // Disponibilidad operativa definida por el Supervisor para esta empresa.
  useEffect(() => {
    let cancelado = false;

    const cargarDisponibilidad = async () => {
      const empresaId = usuario?.empresa_id || comercio?.empresa_id || null;
      if (!empresaId) {
        if (!cancelado) setDisponibilidad({});
        return;
      }

      const { data, error } = await supabase
        .from('productos_disponibilidad')
        .select('producto_id, estado, observacion, actualizado_at')
        .eq('empresa_id', empresaId);

      if (error) {
        console.error('Error cargando disponibilidad operativa:', error);
        return;
      }

      const mapa = {};
      (data || []).forEach(row => {
        mapa[String(row.producto_id)] = {
          estado: row.estado || 'disponible',
          observacion: row.observacion || '',
          actualizado_at: row.actualizado_at || null,
        };
      });

      if (!cancelado) setDisponibilidad(mapa);
    };

    cargarDisponibilidad();

    // Refresco periódico: si el Supervisor bloquea o marca crítico un artículo,
    // el preventista recibe el cambio sin tener que salir de la toma de pedido.
    const timer = setInterval(cargarDisponibilidad, 15000);

    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [usuario?.empresa_id, comercio?.empresa_id]);

  const estadoProducto = (productoId) =>
    disponibilidad[String(productoId)]?.estado || 'disponible';

  const observacionProducto = (productoId) =>
    disponibilidad[String(productoId)]?.observacion || '';

  const categoriasDisponibles = ['TODOS', ...Array.from(new Set(catalogo.map(p => p.categoria).filter(Boolean)))];

  const catalogoFiltrado = catalogo.filter(p => {
    const coincideTexto = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.toLowerCase().includes(busqueda.toLowerCase()) || p.marca.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCat = categoriaSel === 'TODOS' || p.categoria === categoriaSel;
    return coincideTexto && coincideCat;
  });

  const agregarAlPedido = (producto) => {
    const estado = estadoProducto(producto.productoId);
    if (estado === 'bloqueado') {
      alert(`🔴 ARTÍCULO MOMENTÁNEAMENTE NO DISPONIBLE\n\n${producto.nombre}\n\nLa venta fue bloqueada por el Supervisor.${observacionProducto(producto.productoId) ? `\n\n${observacionProducto(producto.productoId)}` : ''}`);
      return;
    }

    if (estado === 'critico') {
      const seguir = window.confirm(`🟠 STOCK CRÍTICO\n\n${producto.nombre}\n\nLa disponibilidad es limitada. ¿Querés agregarlo igualmente?${observacionProducto(producto.productoId) ? `\n\n${observacionProducto(producto.productoId)}` : ''}`);
      if (!seguir) return;
    }

    // Cada agregado crea un renglón independiente.
    // Esto permite pedir el mismo código con distintos talles (ej.: WELT001 talle 40 y talle 41).
    setItemsPedido(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productoId: producto.productoId,
      codigo: producto.codigo,
      marca: producto.marca,
      nombre: producto.nombre,
      precioLista: producto.precio,
      usaColor: producto.usaColor === true,
      usaTalle: producto.usaTalle === true,
      bonif: 0,
      ajusteTipo: 'normal',
      ajustePct: 0,
      color: '',
      talle: '',
      cant: 1,
      confirmadoItem: false,
      esNuevo: !!pedidoExistente,
      nota: ''
    }]);
  };

  const modificarCant = (id, delta) => {
    const itemObjetivo = itemsPedido.find(it => it.id === id);
    if (delta > 0 && itemObjetivo) {
      const estado = estadoProducto(itemObjetivo.productoId);
      if (estado === 'bloqueado') {
        alert(`🔴 ARTÍCULO MOMENTÁNEAMENTE NO DISPONIBLE\n\n${itemObjetivo.nombre}\n\nNo se puede aumentar la cantidad porque fue bloqueado por el Supervisor.`);
        return;
      }
      if (estado === 'critico') {
        const seguir = window.confirm(`🟠 STOCK CRÍTICO\n\n${itemObjetivo.nombre}\n\n¿Querés aumentar igualmente la cantidad?`);
        if (!seguir) return;
      }
    }

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

  const actualizarItem = (id, cambios) => {
    setItemsPedido(itemsPedido.map(it => it.id === id ? { ...it, ...cambios } : it));
  };

  // Las variantes dependen del producto, no de la marca ni del código.
  const requiereColor = (item) => item?.usaColor === true;
  const requiereTalle = (item) => item?.usaTalle === true;

  const confirmarItem = (id) => {
    const item = itemsPedido.find(it => it.id === id);
    if (!item) return;

    if (requiereColor(item) && !String(item.color || '').trim()) {
      alert('Ingresá el color antes de confirmar este ítem.');
      return;
    }

    if (requiereTalle(item) && !item.talle) {
      alert('Elegí el talle antes de confirmar este ítem.');
      return;
    }

    actualizarItem(id, { confirmadoItem: true });
    setBusqueda('');
  };

  const editarItem = (id) => {
    actualizarItem(id, { confirmadoItem: false });
  };

  const ajusteFirmado = (it) => {
    if (it.ajusteTipo === 'recargo') return -Math.abs(Number(it.ajustePct || 0));
    if (it.ajusteTipo === 'descuento') return Math.abs(Number(it.ajustePct || 0));
    return Number(it.bonif || 0); // compatibilidad con pedidos anteriores
  };

  // Cálculos totales
  const subtotalBruto = itemsPedido.reduce((acc, it) => acc + (it.precioLista * it.cant), 0);
  const totalDescuentos = itemsPedido.reduce((acc, it) => acc + ((it.precioLista * it.cant) * (ajusteFirmado(it) / 100)), 0);
  const totalFinal = subtotalBruto - totalDescuentos;

  const confirmarPedido = async () => {
    if (itemsPedido.length === 0) {
      alert('Agregá al menos un artículo al pedido');
      return;
    }

    const itemsSinConfirmar = itemsPedido.filter(it => it.confirmadoItem === false);
    if (itemsSinConfirmar.length > 0) {
      alert('Tenés ítems sin confirmar. Tocá “CONFIRMAR ÍTEM” en cada renglón antes de enviar el pedido.');
      return;
    }

    const itemsSinColor = itemsPedido.filter(it => requiereColor(it) && !String(it.color || '').trim());
    if (itemsSinColor.length > 0) {
      alert('Hay artículos que requieren color y todavía no fue elegido. Ingresá el color antes de confirmar el pedido.');
      return;
    }

    const itemsSinTalle = itemsPedido.filter(it => requiereTalle(it) && !it.talle);
    if (itemsSinTalle.length > 0) {
      alert('Hay artículos que requieren talle y todavía no fue elegido. Elegí el talle antes de confirmar el pedido.');
      return;
    }

    const bloqueadosEnPedido = itemsPedido.filter(it => estadoProducto(it.productoId) === 'bloqueado');
    if (bloqueadosEnPedido.length > 0) {
      alert(
        '🔴 NO SE PUEDE CONFIRMAR EL PEDIDO\n\n' +
        'El Supervisor bloqueó momentáneamente:\n\n' +
        bloqueadosEnPedido.map(it => `• ${it.codigo ? it.codigo + ' - ' : ''}${it.nombre}`).join('\n') +
        '\n\nQuitá esos artículos para continuar.'
      );
      return;
    }

    const empresaId = usuario?.empresa_id || comercio?.empresa_id || null;
    if (!empresaId) {
      alert('No se pudo identificar la empresa del pedido.');
      return;
    }

    const itemsSinProducto = itemsPedido.filter(it => !it.productoId);
    if (itemsSinProducto.length > 0) {
      alert('Hay artículos sin vínculo al catálogo real. Volvé a agregarlos al pedido.');
      return;
    }

    setGuardando(true);

    try {
      const pedidoId = pedidoExistente?.id || crypto.randomUUID();
      const ahora = new Date().toISOString();
      const descuentoPorcentaje = subtotalBruto > 0
        ? Number(((totalDescuentos / subtotalBruto) * 100).toFixed(4))
        : 0;

      if (medioPago === 'Cuenta corriente' && (!diasCuentaCorriente || Number(diasCuentaCorriente) <= 0)) {
        alert('Ingresá los días de la cuenta corriente.');
        setGuardando(false);
        return;
      }

      const notasPartes = [];
      if (medioPago) notasPartes.push(`Medio de pago: ${medioPago === 'Cuenta corriente' ? `Cuenta corriente · ${diasCuentaCorriente} días` : medioPago}`);
      if (observaciones?.trim()) notasPartes.push(observaciones.trim());

      const pedidoPayload = {
        ...(pedidoExistente ? {} : { id: pedidoId }),
        fecha: pedidoExistente?.fecha || ahora,
        comercio_id: String(comercio?.id || ''),
        comercio_nombre: comercio?.nombre || `Comercio #${comercio?.id || ''}`,
        preventista: usuario?.nombre || 'Preventista',
        empresa: usuario?.empresa || comercio?.empresa || '',
        empresa_id: empresaId,
        subtotal: subtotalBruto,
        descuento_porcentaje: descuentoPorcentaje,
        total: totalFinal,
        estado: 'Confirmado',
        notas: notasPartes.join(' | ')
      };

      let errorPedido = null;

      if (pedidoExistente?.id) {
        const { error } = await supabase
          .from('pedidos')
          .update(pedidoPayload)
          .eq('id', pedidoExistente.id)
          .eq('empresa_id', empresaId);
        errorPedido = error;
      } else {
        const { error } = await supabase
          .from('pedidos')
          .insert([{ id: pedidoId, ...pedidoPayload }]);
        errorPedido = error;
      }

      if (errorPedido) throw new Error(`No se pudo guardar el pedido: ${errorPedido.message}`);

      const itemsPayload = itemsPedido.map(it => {
        const bruto = Number(it.precioLista || 0) * Number(it.cant || 0);
        const ajuste = ajusteFirmado(it);
        const neto = bruto * (1 - ajuste / 100);
        const detalleAjuste = ajuste < 0 ? `Recargo ${Math.abs(ajuste)}%` : ajuste > 0 ? `Descuento ${ajuste}%` : 'Normal';
        const detalleColor = it.color ? ` · Color ${it.color}` : '';
        const detalleTalle = it.talle ? ` · Talle ${it.talle}` : '';
        const nombreConDetalle = `${it.nombre}${detalleColor}${detalleTalle} · ${detalleAjuste}`;

        return {
          pedido_id: pedidoId,
          producto_id: it.productoId,
          producto_nombre: nombreConDetalle,
          codigo: it.codigo,
          color: String(it.color || '').trim() || null,
          talle: String(it.talle || '').trim() || null,
          cantidad: Number(it.cant || 0),
          precio_unitario: Number((Number(it.precioLista || 0) * (1 - ajuste / 100)).toFixed(2)),
          subtotal: Number(neto.toFixed(2))
        };
      });

      if (pedidoExistente?.id) {
        const { error: errorBorradoItems } = await supabase
          .from('pedido_items')
          .delete()
          .eq('pedido_id', pedidoExistente.id);

        if (errorBorradoItems) {
          throw new Error(`No se pudieron preparar los artículos para actualizar: ${errorBorradoItems.message}`);
        }
      }

      const { error: errorItems } = await supabase
        .from('pedido_items')
        .insert(itemsPayload);

      if (errorItems) {
        // En una venta nueva evitamos dejar una cabecera huérfana.
        // En edición NO borramos la NVI: informamos el error para no perder la cabecera.
        if (!pedidoExistente?.id) {
          await supabase.from('pedidos').delete().eq('id', pedidoId);
        }
        throw new Error(`El pedido no pudo guardar sus artículos: ${errorItems.message}`);
      }

      // 📦 Sincronizar stock físico con la NVI. La función SQL compara lo ya
      // descontado para este pedido contra los renglones actuales, por lo que
      // sirve tanto para una venta nueva como para una edición sin duplicar movimientos.
      const { error: errorStock } = await supabase.rpc('sincronizar_stock_pedido', {
        p_pedido_id: pedidoId
      });
      if (errorStock) {
        throw new Error(`La NVI se guardó, pero no se pudo sincronizar el stock: ${errorStock.message}`);
      }

      // Respaldo local solamente DESPUÉS de que Supabase confirmó cabecera + artículos + stock.
      const respaldoLocal = { id: pedidoId, ...pedidoPayload, items: itemsPedido };
      const historico = JSON.parse(localStorage.getItem('pedidos_guardados') || '[]');
      const historicoActualizado = pedidoExistente?.id
        ? [respaldoLocal, ...historico.filter(p => p.id !== pedidoExistente.id)]
        : [respaldoLocal, ...historico];
      localStorage.setItem('pedidos_guardados', JSON.stringify(historicoActualizado));

      // WhatsApp si está tildado
      if (enviarWsp) {
        const telLimpio = (comercio?.telefono || '').replace(/\D/g, '');
        if (telLimpio) {
          const msj = encodeURIComponent(
            `*📦 PEDIDO - ${comercio?.nombre || 'Comercio'}*\n` +
            `Preventista: ${usuario?.nombre || 'Preventista'}\n` +
            `Medio de Pago: ${medioPago}\n` +
            `--------------------------\n` +
            itemsPedido.map(it => { const a = ajusteFirmado(it); const txt = a < 0 ? `${Math.abs(a)}% RECARGO` : a > 0 ? `${a}% OFF` : 'Neto'; return `• ${it.cant}x ${it.nombre}${it.talle ? ` · Talle ${it.talle}` : ''} (${txt}): $${((it.precioLista * it.cant) * (1 - a / 100)).toLocaleString()}`; }).join('\n') +
            `\n--------------------------\n` +
            `*TOTAL A COBRAR: $${totalFinal.toLocaleString()} ARS*\n` +
            (observaciones ? `Notas: ${observaciones}\n` : '') +
            `_RutaComercio · Comanda Oficial_`
          );
          window.open(`https://wa.me/549${telLimpio}?text=${msj}`, '_blank');
        }
      }

      setExitoGuardado(true);

      setTimeout(async () => {
        if (onPedidoGuardado) {
          await onPedidoGuardado();
        } else if (onVolver) {
          onVolver();
        }
      }, 1200);

    } catch (err) {
      console.error('Error guardando pedido:', err);
      alert('❌ ' + (err.message || 'No se pudo guardar el pedido.'));
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
            {pedidoExistente ? `Editar NVI #${String(pedidoExistente.numero_pedido || '').padStart(6, '0')}` : 'Toma de Pedido'}
          </h1>

        </div>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
          {usuario?.nombre ? usuario.nombre[0] : 'A'}
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '10px 16px 16px' }}>
        {/* Resumen compacto del pedido */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '8px 12px', marginBottom: '8px' }}>
          <div style={{ fontSize: '14px', fontWeight: '900', color: '#1d4ed8' }}>{comercio?.nombre || 'Comercio'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '800' }}>{itemsPedido.length} renglones</span>
            <span style={{ fontSize: '17px', fontWeight: '900', color: '#16a34a' }}>${totalFinal.toLocaleString()}</span>
          </div>
        </div>

        {/* Alerta de Reedición / Anexo Rápido */}
        {pedidoExistente && (
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px', marginBottom: '16px', display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>✏️</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e40af' }}>Editando una venta ya guardada</div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#1e3a8a' }}>
                Los cambios se guardarán sobre esta misma NVI. No se creará una venta nueva.
              </p>
            </div>
          </div>
        )}

        {/* Buscador de artículos por código o nombre */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código (ej: CGE-102) o nombre..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 38px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8', fontSize: '16px' }}>🔍</span>
            {busqueda && (
              <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: '10px', top: '10px', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>
            )}
          </div>

          {/* Categorías */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categoriasDisponibles.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaSel(cat)}
                style={{
                  padding: '5px 12px',
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
          {cargandoCatalogo && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>⏳ Cargando lista de precios de la empresa...</div>
          )}
          {!cargandoCatalogo && errorCatalogo && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626', fontWeight: '700' }}>❌ {errorCatalogo}</div>
          )}
          {!cargandoCatalogo && !errorCatalogo && catalogo.length === 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#d97706', fontWeight: '700' }}>⚠️ La empresa todavía no tiene artículos con precio cargados.</div>
          )}
          {!cargandoCatalogo && catalogo.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>✅ {catalogo.length} artículos disponibles</div>
          )}
        </div>

        {/* Desplegable de sugerencias de búsqueda si escribe */}
        {busqueda.length > 0 && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '8px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', padding: '4px 8px', textTransform: 'uppercase' }}>Artículos Encontrados</div>
            {!cargandoCatalogo && catalogoFiltrado.length === 0 && (
              <div style={{ padding: '12px 8px', fontSize: '13px', color: '#64748b' }}>No se encontraron artículos con esa búsqueda.</div>
            )}
            {catalogoFiltrado.map(prod => {
              const estado = estadoProducto(prod.productoId);
              const bloqueado = estado === 'bloqueado';
              const critico = estado === 'critico';

              return (
                <div key={prod.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', padding: '5px 6px', borderBottom: '1px solid #f1f5f9', backgroundColor: bloqueado ? '#fef2f2' : critico ? '#fffbeb' : '#ffffff' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: '800' }}>{prod.codigo} · {prod.marca}</div>
                    <div style={{ fontSize: '12px', fontWeight: '700' }}>{prod.nombre}</div>
                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '800' }}>${prod.precio.toLocaleString()}</div>

                    {critico && (
                      <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: '900', color: '#b45309' }}>
                        🟠 STOCK CRÍTICO · Consultar disponibilidad
                      </div>
                    )}
                    {bloqueado && (
                      <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: '900', color: '#b91c1c' }}>
                        🔴 MOMENTÁNEAMENTE NO DISPONIBLE
                      </div>
                    )}
                  </div>

                  <button
                    disabled={bloqueado}
                    onClick={() => {
                      if (!bloqueado) {
                        agregarAlPedido(prod);
                        setBusqueda('');
                      }
                    }}
                    style={{
                      backgroundColor: bloqueado ? '#e2e8f0' : critico ? '#fef3c7' : '#eff6ff',
                      color: bloqueado ? '#64748b' : critico ? '#92400e' : '#2563eb',
                      border: bloqueado ? '1px solid #cbd5e1' : critico ? '1px solid #f59e0b' : '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '5px 9px',
                      fontWeight: '800',
                      fontSize: '11px',
                      cursor: bloqueado ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {bloqueado ? '🚫 Bloqueado' : '➕ Agregar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Lista de Renglones Cargados */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800' }}>Renglones del Pedido</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{itemsPedido.length} artículos</span>
          </div>

          {itemsPedido.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '10px 12px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', border: '2px dashed #cbd5e1' }}>
              No hay art. en la venta. Buscá arriba por código o nombre.
            </div>
          ) : (
            itemsPedido.map(item => {
              const ajusteItem = ajusteFirmado(item);
              const subtotalItem = (item.precioLista * item.cant) * (1 - ajusteItem / 100);
              return (
                <div key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: item.esNuevo ? '2px solid #f59e0b' : '1px solid #e2e8f0', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{item.codigo}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>{item.marca}</span>
                        {item.confirmadoItem === false ? (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px' }}>
                            ✏️ COMPLETAR ÍTEM
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>
                            ✓ ÍTEM CONFIRMADO
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '800', margin: '4px 0' }}>{item.nombre}</div>
                      {(item.color || item.talle) && <div style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>{item.color ? `Color ${item.color}` : ''}{item.color && item.talle ? ' · ' : ''}{item.talle ? `Talle ${item.talle}` : ''}</div>}
                      {estadoProducto(item.productoId) === 'critico' && (
                        <div style={{ fontSize: '11px', fontWeight: '900', color: '#b45309', marginTop: '3px' }}>
                          🟠 STOCK CRÍTICO
                        </div>
                      )}
                      {estadoProducto(item.productoId) === 'bloqueado' && (
                        <div style={{ fontSize: '11px', fontWeight: '900', color: '#b91c1c', marginTop: '3px' }}>
                          🔴 BLOQUEADO POR SUPERVISOR · quitar del pedido
                        </div>
                      )}
                    </div>
                    <button onClick={() => eliminarItem(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '16px', cursor: 'pointer', padding: '4px' }}>
                      🗑️
                    </button>
                  </div>

                  {/* Talle, ajuste comercial y cantidad */}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    {(requiereColor(item) || requiereTalle(item)) && (
                      <div style={{ display: 'grid', gridTemplateColumns: requiereColor(item) && requiereTalle(item) ? '1fr 110px' : '1fr', gap: '8px', alignItems: 'end', marginBottom: '8px' }}>
                        {requiereColor(item) && (
                          <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                            Color
                            <select disabled={!pedidoExistente && item.confirmadoItem !== false} value={item.color || ''} onChange={(e) => actualizarItem(item.id, { color: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                              <option value="">Elegir</option>
                              <option value="Negro">Negro</option>
                              <option value="Marrón">Marrón</option>
                              <option value="Blanco">Blanco</option>
                              <option value="Gris Fresno">Gris Fresno</option>
                            </select>
                          </label>
                        )}
                        {requiereTalle(item) && (
                          <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                            Talle
                            <select disabled={!pedidoExistente && item.confirmadoItem !== false} value={item.talle || ''} onChange={(e) => actualizarItem(item.id, { talle: e.target.value })} style={{ width: '100%', marginTop: '3px', padding: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                              <option value="">Elegir</option>
                              {Array.from({ length: 18 }, (_, i) => 33 + i).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </label>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '8px', alignItems: 'end', marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                        Ajuste
                        <select disabled={!pedidoExistente && item.confirmadoItem !== false} value={item.ajusteTipo || 'normal'} onChange={(e) => actualizarItem(item.id, { ajusteTipo: e.target.value, ajustePct: e.target.value === 'normal' ? 0 : Number(item.ajustePct || 0), bonif: 0 })} style={{ width: '100%', marginTop: '4px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <option value="normal">Normal</option>
                          <option value="descuento">Descuento</option>
                          <option value="recargo">Recargo</option>
                        </select>
                      </label>

                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                        %
                        <input type="number" min="0" step="1" disabled={(!pedidoExistente && item.confirmadoItem !== false) || (item.ajusteTipo || 'normal') === 'normal'} value={item.ajustePct || ''} onChange={(e) => actualizarItem(item.id, { ajustePct: Math.max(0, Number(e.target.value || 0)) })} placeholder="0" style={{ width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button disabled={!pedidoExistente && item.confirmadoItem !== false} onClick={() => modificarCant(item.id, -1)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                        <span style={{ fontSize: '15px', fontWeight: '800', minWidth: '24px', textAlign: 'center' }}>{item.cant}</span>
                        <button disabled={!pedidoExistente && item.confirmadoItem !== false} onClick={() => modificarCant(item.id, 1)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #2563eb', background: '#2563eb', color: '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>${subtotalItem.toLocaleString()}</div>
                        {ajusteItem !== 0 && <div style={{ fontSize: '10px', color: ajusteItem < 0 ? '#b45309' : '#15803d', fontWeight: '800' }}>{ajusteItem < 0 ? `+${Math.abs(ajusteItem)}% recargo` : `-${ajusteItem}% descuento`}</div>}
                      </div>
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                      {item.confirmadoItem === false ? (
                        <button
                          type="button"
                          onClick={() => confirmarItem(item.id)}
                          style={{ flex: 1, padding: '10px 12px', borderRadius: '9px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}
                        >
                          ✅ CONFIRMAR ÍTEM
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => editarItem(item.id)}
                          style={{ flex: 1, padding: '9px 12px', borderRadius: '9px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                        >
                          ✏️ Editar ítem
                        </button>
                      )}
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
            {['Efectivo', 'Transferencia QR', 'Cuenta corriente', 'BCH / Crypto'].map(m => (
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

          {medioPago === 'Cuenta corriente' && (
            <div style={{ marginBottom: '12px', padding: '10px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#9a3412' }}>
                Días de cuenta corriente
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={diasCuentaCorriente}
                  onChange={(e) => setDiasCuentaCorriente(e.target.value)}
                  placeholder="Ej.: 7, 15, 30"
                  style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '8px', borderRadius: '7px', border: '1px solid #fdba74' }}
                />
              </label>
            </div>
          )}

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
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            <input type="checkbox" checked={enviarWsp} onChange={(e) => setEnviarWsp(e.target.checked)} />
            <span>💬 Enviar comanda por WhatsApp</span>
          </label>
          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '800' }}>
            {comercio?.telefono || 'Sin teléfono cargado'}
          </span>
        </div>
      </main>

      {/* Barra Fija Inferior con Totales y Botón de Acción */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '12px 16px', boxShadow: '0 -4px 12px rgba(0,0,0,0.06)', zIndex: 40 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Subtotal: <strong>${subtotalBruto.toLocaleString()}</strong> · Ajuste: <strong style={{ color: totalDescuentos < 0 ? '#b45309' : '#ef4444' }}>{totalDescuentos < 0 ? '+' : '-'}${Math.abs(totalDescuentos).toLocaleString()}</strong>
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
              <span>⏳ Guardando...</span>
            ) : exitoGuardado ? (
              <span>✅ Venta guardada</span>
            ) : pedidoExistente ? (
              <>
                <span>💾 Guardar cambios</span>
                <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.9 }}>Actualiza esta misma NVI</span>
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