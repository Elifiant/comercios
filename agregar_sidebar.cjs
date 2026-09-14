const fs = require('fs');

const codigo = `import React, { useState } from 'react';

const PEDIDOS_MOCK = [
  {
    id: '#PED-1082', hora: '11:42 hs', reciente: true, preventista: 'Ian Torres', zona: 'Ruta 01 - Quilmes',
    comercio: 'Almacén Los Nietos', direccion: 'Av. Calchaquí 1420, Quilmes', condicion_iva: 'Resp. Inscripto', cuit: '30-71442918-4',
    lista: 'Mayorista A (GBA)', bultos: '18 bultos', items_count: 6, total: 148500, estado: 'Ingresado',
    observaciones: 'Don Jorge pide entrega antes de las 13:00 hs de mañana viernes porque cierra al mediodía. Paga contra entrega en efectivo.',
    items: [
      { prod: 'Aceite Girasol 1.5L (Caja x12)', sku: 'ACE-094', cant: '4 cjs', p_unit: 16200, subtotal: 64800 },
      { prod: 'Harina 000 1kg (Fardo x10)', sku: 'HAR-102', cant: '5 fdos', p_unit: 7500, subtotal: 37500 },
      { prod: 'Azúcar Común 1kg (Fardo x10)', sku: 'AZU-055', cant: '3 fdos', p_unit: 8400, subtotal: 25200 },
      { prod: 'Fideos Guiseros 500g (Caja x20)', sku: 'FID-018', cant: '6 cjs', p_unit: 3500, subtotal: 21000 }
    ]
  },
  {
    id: '#PED-1081', hora: '11:15 hs', reciente: false, preventista: 'Alex Gómez', zona: 'Ruta 03 - Bernal',
    comercio: 'Supermercado El Trébol', direccion: 'Zapiola 890, Bernal Oeste', condicion_iva: 'Monotributo', cuit: '20-28941029-2',
    lista: 'Minorista B', bultos: '12 bultos', items_count: 4, total: 98200, estado: 'Ingresado',
    observaciones: 'Entregar por portón lateral. Cheque a 15 días ya autorizado en cuenta corriente.',
    items: [
      { prod: 'Harina 000 1kg (Fardo x10)', sku: 'HAR-102', cant: '8 fdos', p_unit: 7500, subtotal: 60000 },
      { prod: 'Azúcar Común 1kg (Fardo x10)', sku: 'AZU-055', cant: '4 fdos', p_unit: 8400, subtotal: 38200 }
    ]
  },
  {
    id: '#PED-1080', hora: '10:54 hs', reciente: false, preventista: 'Walter Pérez', zona: 'Ruta 02 - Ezpeleta',
    comercio: 'Autoservicio Don Mario', direccion: 'Calle 137 N° 230, Ezpeleta', condicion_iva: 'Resp. Inscripto', cuit: '30-68912445-8',
    lista: 'Mayorista A (GBA)', bultos: '24 bultos', items_count: 8, total: 215400, estado: 'Despachado',
    observaciones: 'Llamar al encargado de depósito 10 minutos antes de arribar.',
    items: [
      { prod: 'Aceite Girasol 1.5L (Caja x12)', sku: 'ACE-094', cant: '10 cjs', p_unit: 16200, subtotal: 162000 },
      { prod: 'Fideos Guiseros 500g (Caja x20)', sku: 'FID-018', cant: '15 cjs', p_unit: 3500, subtotal: 53400 }
    ]
  }
];

export default function MonitorPedidos() {
  const [pedidos] = useState(PEDIDOS_MOCK);
  const [pedidoSel, setPedidoSel] = useState(PEDIDOS_MOCK[0]);
  const [filtroPreventista, setFiltroPreventista] = useState('TODOS');
  const [seccionActiva, setSeccionActiva] = useState('pedidos');

  const pedidosFiltrados = filtroPreventista === 'TODOS'
    ? pedidos
    : pedidos.filter(p => p.preventista.includes(filtroPreventista));

  const totalVentas = pedidos.reduce((acc, p) => acc + p.total, 0);
  const totalBultos = pedidos.reduce((acc, p) => acc + parseInt(p.bultos), 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* BARRA LATERAL IZQUIERDA OFICIAL */}
      <aside style={{ width: '260px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          {/* LOGO */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
                RC
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb', lineHeight: 1.1 }}>RutaComercio</div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>CONTROL COCKPIT</div>
              </div>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Entorno Operativo</span>
              <span style={{ fontSize: '11px', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>HQ Elifiant</span>
            </div>
          </div>

          {/* MENU DE NAVEGACION */}
          <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <a href="/supervisor" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none', color: '#475569', fontSize: '13px', fontWeight: '600' }}>
              <span style={{ fontSize: '16px' }}>📍</span> Monitoreo en Vivo (Mapa)
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '13px', fontWeight: '700', borderLeft: '3px solid #2563eb' }}>
              <span style={{ fontSize: '16px' }}>📦</span> Pedidos y Ventas Diarias
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <span style={{ fontSize: '16px' }}>🏪</span> Comercios y Fichas
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <span style={{ fontSize: '16px' }}>👔</span> Rutas y Preventistas
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <span style={{ fontSize: '16px' }}>📸</span> Auditoría Forense & Fotos
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <span style={{ fontSize: '16px' }}>📋</span> Listas y Catálogos
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <span style={{ fontSize: '16px' }}>📊</span> Reportes y Exportación
            </div>

            <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none', color: '#64748b', fontSize: '13px', fontWeight: '500', marginTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ fontSize: '16px' }}>⚙️</span> Admin Empresas
            </a>
          </nav>
        </div>

        {/* USUARIO CONECTADO */}
        <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>Supabase Online · 24ms</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>👤</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Alex Jones</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Super Admin · Elifiant</div>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENIDO DERECHO */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* BARRA SUPERIOR DE ACCIONES */}
        <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>RECEPTOR ACTIVO</span>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Monitor de Pedidos y Ventas Diarias</h1>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Ingreso automático en vivo sincronizado vía Supabase</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.print()} style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>🖨️ Imprimir Hoja</button>
            <button onClick={() => alert('Lote de 3 pedidos despachado a depósito')} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>🚚 Despachar Lote a Depósito</button>
          </div>
        </header>

        {/* ALERTA DE NUEVO PEDIDO */}
        <div style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600' }}>
              Nuevo pedido ingresado hace 2 min: <strong>Almacén Los Nietos</strong> (Preventista: <strong>Ian Torres</strong>) · $148.500
            </span>
          </div>
          <span style={{ fontSize: '11px', backgroundColor: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>EN VIVO 5s</span>
        </div>

        {/* CUERPO DEL MONITOR */}
        <main style={{ padding: '24px 28px', overflowY: 'auto' }}>
          {/* TARJETAS KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Facturación Preventa Hoy</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>${totalVentas.toLocaleString('es-AR')}</div>
              <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px', fontWeight: '600' }}>Meta: $3.200.000 (88.9%)</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Pedidos Registrados</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{pedidos.length} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal' }}>/ 42 visitas</span></div>
              <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', fontWeight: '600' }}>90.4% Efectividad</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Bultos a Cargar</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>{totalBultos} bultos</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Listo para armado en depósito</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Líder del Día</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>Ian Torres</div>
              <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', fontWeight: '700' }}>Zona Quilmes Centro</div>
            </div>
          </div>

          {/* BANDEJA Y DETALLE */}
          <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', gap: '20px', alignItems: 'start' }}>
            {/* BANDEJA IZQUIERDA */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Comandas del Día ({pedidosFiltrados.length})</span>
                <select value={filtroPreventista} onChange={e => setFiltroPreventista(e.target.value)} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}>
                  <option value="TODOS">Todos los preventistas</option>
                  <option value="Ian">Ian Torres</option>
                  <option value="Alex">Alex Gómez</option>
                  <option value="Walter">Walter Pérez</option>
                </select>
              </div>

              <div>
                {pedidosFiltrados.map(p => (
                  <div key={p.id} onClick={() => setPedidoSel(p)} style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: pedidoSel.id === p.id ? '#eff6ff' : '#ffffff', borderLeft: pedidoSel.id === p.id ? '4px solid #2563eb' : '4px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb' }}>{p.id} · {p.hora}</span>
                      <span style={{ fontSize: '11px', backgroundColor: p.estado === 'Ingresado' ? '#dcfce7' : '#f1f5f9', color: p.estado === 'Ingresado' ? '#166534' : '#475569', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>{p.estado}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{p.comercio}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 6px' }}>👤 {p.preventista} · {p.zona}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{p.bultos}</span>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>${p.total.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FICHA DETALLADA DERECHA */}
            {pedidoSel && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold' }}>PEDIDO {pedidoSel.id}</div>
                    <h2 style={{ margin: '4px 0', fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{pedidoSel.comercio}</h2>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>📍 {pedidoSel.direccion}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>CUIT: {pedidoSel.cuit} · Condición: {pedidoSel.condicion_iva}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Lista: <strong>{pedidoSel.lista}</strong></div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Preventista: <strong>{pedidoSel.preventista}</strong></div>
                  </div>
                </div>

                {/* OBSERVACIONES */}
                {pedidoSel.observaciones && (
                  <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px' }}>
                    <strong style={{ color: '#854d0e' }}>📝 Observaciones de la Visita ({pedidoSel.preventista}): </strong>
                    <span style={{ color: '#713f12' }}>"{pedidoSel.observaciones}"</span>
                  </div>
                )}

                {/* TABLA DE ARTICULOS */}
                <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px', fontWeight: '700' }}>Desglose de Mercadería</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 12px' }}>Artículo</th>
                      <th style={{ padding: '10px 12px' }}>SKU</th>
                      <th style={{ padding: '10px 12px' }}>Cant.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>P. Unit.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidoSel.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#0f172a' }}>{it.prod}</td>
                        <td style={{ padding: '12px', color: '#64748b' }}>{it.sku}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#2563eb' }}>{it.cant}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>${it.p_unit.toLocaleString('es-AR')}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>${it.subtotal.toLocaleString('es-AR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* TOTAL */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '18px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Carga total de la comanda: </span>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{pedidoSel.bultos}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Total Comanda:</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb' }}>${pedidoSel.total.toLocaleString('es-AR')}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button onClick={() => alert('Comanda enviada por WhatsApp al comercio')} style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>💬 Reenviar WhatsApp a Comercio</button>
                  <button onClick={() => alert('Comanda confirmada y enviada a Depósito')} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>📦 Pasar a Depósito</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/MonitorPedidos.jsx', codigo, 'utf8');
console.log('🎉 MONITOR_CON_SIDEBAR_ACTUALIZADO_CON_EXITO');
