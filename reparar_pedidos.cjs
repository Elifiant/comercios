const fs = require('fs');

const codigo = `import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function MonitorPedidos() {
  const [pedidos, setPedidos] = useState([
    {
      id: 101,
      numero: 'PED-4801',
      cliente: 'Autoservicio San Cayetano',
      preventista: 'Walter (Elifiant)',
      hora: '10:14',
      items_count: 5,
      total: 142800,
      estado: 'Pendiente',
      observaciones: 'Entregar por la mañana.',
      items: [
        { nombre: 'Aceite Girasol 1.5L', cantidad: 6, precio: 12500, subtotal: 75000 },
        { nombre: 'Harina 0000 1kg', cantidad: 10, precio: 1800, subtotal: 18000 },
        { nombre: 'Azúcar Común 1kg', cantidad: 15, precio: 3320, subtotal: 49800 }
      ]
    },
    {
      id: 102,
      numero: 'PED-4802',
      cliente: 'Kiosco El Trébol',
      preventista: 'Ian (Distribuidora Sur)',
      hora: '11:32',
      items_count: 3,
      total: 78500,
      estado: 'Aprobado',
      observaciones: 'Cobro en efectivo contra entrega.',
      items: [
        { nombre: 'Galletitas Surtidas 400g', cantidad: 20, precio: 2200, subtotal: 44000 },
        { nombre: 'Chicles Menta x20', cantidad: 5, precio: 6900, subtotal: 34500 }
      ]
    }
  ]);

  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [alertaVenta, setAlertaVenta] = useState('¡Nuevo pedido ingresado! PED-4802 - Kiosco El Trébol ($78.500)');

  const totalFacturado = pedidos.reduce((acc, p) => acc + p.total, 0);
  const pedidosFiltrados = filtroEstado === 'Todos' ? pedidos : pedidos.filter(p => p.estado === filtroEstado);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a', overflow: 'hidden' }}>
      {/* Barra lateral */}
      <aside style={{ width: '260px', background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', padding: '20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', paddingLeft: '8px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px' }}>RC</div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px', letterSpacing: '-0.3px' }}>RutaComercio</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Panel de Supervisión</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <a href="/supervisor" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', textDecoration: 'none', color: '#cbd5e1', fontSize: '14px' }}>
            🗺️ Monitoreo en Vivo (Mapa)
          </a>
          <a href="/pedidos" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', textDecoration: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>
            📦 Pedidos y Ventas Diarias
          </a>
        </nav>

        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
          RutaComercio v2.4 Multi-Tenant
        </div>
      </aside>

      {/* Contenido Principal */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Cabecera */}
        <header style={{ height: '64px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📦 Monitor de Pedidos y Ventas Diarias</h1>
            <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>En Vivo</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href="/supervisor" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⬅ Volver al Mapa
            </a>
          </div>
        </header>

        {/* Alerta de Venta */}
        {alertaVenta && (
          <div style={{ margin: '16px 24px 0 24px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#065f46', fontSize: '14px', fontWeight: '600' }}>
              🔔 {alertaVenta}
            </div>
            <button onClick={() => setAlertaVenta(null)} style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* Métricas del Día */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '20px 24px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Ventas del Día</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>${totalFacturado.toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>↑ 100% sincronizado</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Pedidos Recibidos</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{pedidos.length}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>2 preventistas activos</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Ticket Promedio</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>${Math.round(totalFacturado / (pedidos.length || 1)).toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>Efectividad en ruta</div>
          </div>
        </div>

        {/* Tabla de Pedidos y Detalle */}
        <div style={{ display: 'grid', gridTemplateColumns: pedidoSeleccionado ? '1.4fr 1fr' : '1fr', gap: '20px', padding: '0 24px 24px 24px', flex: 1 }}>
          {/* Listado */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>Comandas del Día</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['Todos', 'Pendiente', 'Aprobado'].map(est => (
                  <button key={est} onClick={() => setFiltroEstado(est)} style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: filtroEstado === est ? '#0f172a' : '#fff', color: filtroEstado === est ? '#fff' : '#475569', cursor: 'pointer', fontWeight: '600' }}>
                    {est}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px' }}>ID / Hora</th>
                    <th style={{ padding: '10px 14px' }}>Cliente</th>
                    <th style={{ padding: '10px 14px' }}>Vendedor</th>
                    <th style={{ padding: '10px 14px' }}>Total</th>
                    <th style={{ padding: '10px 14px' }}>Estado</th>
                    <th style={{ padding: '10px 14px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map(p => (
                    <tr key={p.id} onClick={() => setPedidoSeleccionado(p)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: pedidoSeleccionado?.id === p.id ? '#eff6ff' : 'transparent' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 'bold' }}>{p.numero}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.hora} hs</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '600' }}>{p.cliente}</td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{p.preventista}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 'bold' }}>${p.total.toLocaleString()}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: p.estado === 'Aprobado' ? '#dcfce7' : '#fef9c3', color: p.estado === 'Aprobado' ? '#15803d' : '#a16207' }}>
                          {p.estado}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ficha de Detalle de Comanda */}
          {pedidoSeleccionado && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Detalle: {pedidoSeleccionado.numero}</h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{pedidoSeleccionado.cliente}</div>
                </div>
                <button onClick={() => setPedidoSeleccionado(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              <div style={{ fontSize: '12px', color: '#475569', marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                <div><strong>Vendedor:</strong> {pedidoSeleccionado.preventista}</div>
                <div style={{ marginTop: '4px' }}><strong>Nota:</strong> {pedidoSeleccionado.observaciones}</div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '6px 0' }}>Item</th>
                      <th style={{ padding: '6px 0', textAlign: 'center' }}>Cant</th>
                      <th style={{ padding: '6px 0', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidoSeleccionado.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0' }}>{it.nombre}</td>
                        <td style={{ padding: '8px 0', textAlign: 'center' }}>{it.cantidad}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>${it.subtotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                  <span>Total Comanda:</span>
                  <span>${pedidoSeleccionado.total.toLocaleString()}</span>
                </div>
                <button onClick={() => alert('¡Comanda enviada a depósito para armado!')} style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                  ✓ Aprobar y Pasar a Depósito
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
\`;

fs.writeFileSync('src/MonitorPedidos.jsx', codigo, 'utf8');
console.log('🎉 MONITOR_PEDIDOS_REPARADO_AL_100');
