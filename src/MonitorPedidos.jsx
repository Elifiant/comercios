import React, { useState } from 'react';

const PEDIDOS_DEMO = [
  { id: 'PED-1082', hora: '11:42 hs', preventista: 'Ian Torres', cliente: 'Almacén Los Nietos', direccion: 'Av. Calchaquí 1420, Quilmes', bultos: 18, items_count: 6, total: 148500, estado: 'Ingresado', items: [{ cod: 'ACE-094', nombre: 'Aceite Girasol 1.5L (Caja x12)', cant: '4 cjs', punit: 16200, subtotal: 64800 }, { cod: 'HAR-102', nombre: 'Harina 000 1kg (Fardo x10)', cant: '5 fdos', punit: 7500, subtotal: 37500 }, { cod: 'AZU-055', nombre: 'Azúcar Común 1kg', cant: '3 fdos', punit: 8400, subtotal: 25200 }], nota: 'Don Jorge pide entrega antes de las 13 hs. Paga contra entrega en efectivo.' },
  { id: 'PED-1081', hora: '11:15 hs', preventista: 'Alex Gómez', cliente: 'Supermercado El Trébol', direccion: 'Zapiola 890, Bernal', bultos: 42, items_count: 14, total: 312000, estado: 'Despachado', items: [{ cod: 'ARR-020', nombre: 'Arroz Largo Fino', cant: '10 bjs', punit: 12000, subtotal: 120000 }, { cod: 'YER-045', nombre: 'Yerba Mate 1kg', cant: '8 cjs', punit: 24000, subtotal: 192000 }], nota: 'Dejar mercadería en depósito trasero.' },
  { id: 'PED-1080', hora: '10:54 hs', preventista: 'Walter Pérez', cliente: 'Autoservicio Don Mario', direccion: 'Calle 137 N 230, Ezpeleta', bultos: 12, items_count: 4, total: 94200, estado: 'En Preparación', items: [{ cod: 'ACE-094', nombre: 'Aceite Girasol 1.5L', cant: '2 cjs', punit: 16200, subtotal: 32400 }], nota: 'Revisar vencimiento largo.' },
  { id: 'PED-1079', hora: '10:20 hs', preventista: 'Ian Torres', cliente: 'Kiosco Central', direccion: 'Rivadavia 415, Quilmes', bultos: 8, items_count: 3, total: 58600, estado: 'Ingresado', items: [{ cod: 'GAL-012', nombre: 'Galletitas Dulces Surtidas', cant: '4 cjs', punit: 14650, subtotal: 58600 }], nota: 'Cobrar con transferencia bancaria.' }
];

export default function MonitorPedidos() {
  const [pedidos, setPedidos] = useState(PEDIDOS_DEMO);
  const [pedidoActivo, setPedidoActivo] = useState(PEDIDOS_DEMO[0]);
  const [alertaFlotante, setAlertaFlotante] = useState(true);
  const [filtro, setFiltro] = useState('Todos');

  const preventistas = ['Todos', 'Ian Torres', 'Alex Gómez', 'Walter Pérez'];
  const filtrados = filtro === 'Todos' ? pedidos : pedidos.filter(p => p.preventista === filtro);
  const totalFacturado = pedidos.reduce((acc, p) => acc + p.total, 0);
  const ticketPromedio = Math.round(totalFacturado / (pedidos.length || 1));

  const cambiarEstado = (id, nuevo) => {
    setPedidos(pedidos.map(p => p.id === id ? { ...p, estado: nuevo } : p));
    if (pedidoActivo && pedidoActivo.id === id) setPedidoActivo({ ...pedidoActivo, estado: nuevo });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8fafc', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <aside style={{ width: '260px', background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', padding: '0 8px' }}>
            <div style={{ width: '36px', height: '36px', background: '#2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>📍</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>RutaComercio</div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>CONTROL COCKPIT</div>
            </div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <a href='/supervisor' style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', color: '#475569', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>🗺️ Monitoreo en Vivo</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', fontSize: '13px', fontWeight: '700' }}>📦 Pedidos y Ventas</div>
            <a href='/' style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', color: '#475569', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>📱 Vista Móvil</a>
            <a href='/web' style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', color: '#475569', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>🌐 Web Comercial</a>
          </nav>
        </div>
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', fontSize: '11px', color: '#64748b' }}>Elifiant • Quilmes Ops</div>
      </aside>

      {/* PRINCIPAL */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>RECEPCIÓN EN DIRECTO</span>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '6px 0 0 0' }}>Monitor de Pedidos y Ventas Diarias</h1>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href='/supervisor' style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', color: '#334155', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>← Volver al Mapa</a>
            <button onClick={() => alert('Lote sincronizado para depósito.')} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>🚀 Despachar Lote</button>
          </div>
        </div>

        {/* METRICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>FACTURACIÓN PREVENTA HOY</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>${totalFacturado.toLocaleString('es-AR')}</div>
            <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px', fontWeight: '600' }}>Meta cumplida al 88.9%</div>
          </div>
          <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>PEDIDOS HOY</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{pedidos.length} comandas</div>
            <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px', fontWeight: '600' }}>Efectividad 90.4%</div>
          </div>
          <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>TICKET PROMEDIO</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>${ticketPromedio.toLocaleString('es-AR')}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Promedio 14 bultos/visita</div>
          </div>
          <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>LÍDER DE VENTAS</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>Ian Torres</div>
            <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px', fontWeight: '700' }}>$148.500 facturados</div>
          </div>
        </div>

        {/* FILTRO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>PREVENTISTA:</span>
          {preventistas.map(p => (
            <button key={p} onClick={() => setFiltro(p)} style={{ border: filtro === p ? '1px solid #2563eb' : '1px solid #cbd5e1', background: filtro === p ? '#2563eb' : '#fff', color: filtro === p ? '#fff' : '#334155', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>{p}</button>
          ))}
        </div>

        {/* TABLA */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>HORA / ID</th>
                <th style={{ padding: '12px 16px' }}>PREVENTISTA</th>
                <th style={{ padding: '12px 16px' }}>COMERCIO</th>
                <th style={{ padding: '12px 16px' }}>BULTOS</th>
                <th style={{ padding: '12px 16px' }}>TOTAL</th>
                <th style={{ padding: '12px 16px' }}>ESTADO</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(ped => (
                <tr key={ped.id} onClick={() => setPedidoActivo(ped)} style={{ borderBottom: '1px solid #f1f5f9', background: pedidoActivo && pedidoActivo.id === ped.id ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '700', color: '#2563eb' }}>#{ped.id}<div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>{ped.hora}</div></td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{ped.preventista}</td>
                  <td style={{ padding: '12px 16px' }}><strong>{ped.cliente}</strong><div style={{ fontSize: '11px', color: '#64748b' }}>{ped.direccion}</div></td>
                  <td style={{ padding: '12px 16px' }}>{ped.bultos} bultos</td>
                  <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>${ped.total.toLocaleString('es-AR')}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: ped.estado === 'Ingresado' ? '#dbeafe' : ped.estado === 'En Preparación' ? '#fef3c7' : '#dcfce7', color: ped.estado === 'Ingresado' ? '#1d4ed8' : ped.estado === 'En Preparación' ? '#b45309' : '#15803d' }}>{ped.estado}</span></td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}><button onClick={(e) => { e.stopPropagation(); setPedidoActivo(ped); }} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Ver Detalle →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ALERTA FLOTANTE */}
        {alertaFlotante && (
          <div style={{ position: 'fixed', bottom: '24px', right: '450px', background: '#1e293b', color: '#fff', padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔔</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '13px' }}>Nuevo Pedido Ingresado</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Ian Torres • Almacén Los Nietos • <strong style={{ color: '#38bdf8' }}>$148.500</strong></div>
            </div>
            <button onClick={() => setAlertaFlotante(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>✕</button>
          </div>
        )}
      </main>

      {/* PANEL DERECHO */}
      {pedidoActivo && (
        <aside style={{ width: '420px', background: '#ffffff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px 24px', overflowY: 'auto' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Pedido #{pedidoActivo.id}</h2>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>{pedidoActivo.hora} • Supabase Conectado</div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>CLIENTE</div>
              <div style={{ fontWeight: '800', color: '#0f172a' }}>{pedidoActivo.cliente}</div>
              <div style={{ fontSize: '12px', color: '#475569' }}>{pedidoActivo.direccion}</div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#334155' }}><strong>Preventista:</strong> {pedidoActivo.preventista}</div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>DESGLOSE DE MERCADERÍA</div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  {pedidoActivo.items.map((it, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px' }}><strong>{it.nombre}</strong></td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{it.cant}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>${it.subtotal.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pedidoActivo.nota && (
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#854d0e', marginBottom: '16px' }}>
                <strong>Nota:</strong> {pedidoActivo.nota}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f172a', paddingTop: '12px' }}>
              <strong>TOTAL:</strong>
              <strong style={{ fontSize: '20px', color: '#2563eb' }}>${pedidoActivo.total.toLocaleString('es-AR')}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
            <button onClick={() => cambiarEstado(pedidoActivo.id, 'Despachado')} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>📦 Despachar a Depósito</button>
            <button onClick={() => { const tel = '5491166646806'; window.open(`https://wa.me/${tel}?text=Hola%20${pedidoActivo.cliente}!%20Confirmamos%20tu%20Pedido%20%23${pedidoActivo.id}%20por%20$${pedidoActivo.total}.`, '_blank'); }} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>💬 WhatsApp al Comercio</button>
          </div>
        </aside>
      )}
    </div>
  );
}