const fs = require('fs');

const codigoPromotores = `import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function AdminPromotores() {
  const [partners, setPartners] = useState(() => {
    const saved = localStorage.getItem('rc_partners_data');
    if (saved) {
      try { return JSON.parse(saved); } catch(e){}
    }
    return [
      {
        id: 'PRT-042',
        nombre: 'Gonzalo Beltrán',
        cuit: '20-34981203-9',
        cbuAlias: 'beltran.rutacomercio',
        telefono: '+54 9 11 4455-8899',
        tier: 'Tier Gold (Libre %)',
        saldoFavorAlex: 0,
        clientes: [
          { id: 1, empresa: 'Distribuidora Quilmes SRL (Cliente A)', abono: 100000, porcentaje: 90, estado: 'Listo para pagar' },
          { id: 2, empresa: 'Lácteos Bernal & Sur (Cliente B)', abono: 153333, porcentaje: 15, estado: 'Listo para pagar' },
          { id: 3, empresa: 'Bebidas Ezpeleta Express (Cliente C)', abono: 33333, porcentaje: 15, estado: 'Listo para pagar' }
        ],
        historialPagos: [
          { id: 'PAG-101', fecha: '2024-10-14 16:42', tipo: 'Liquidación Ordinaria', monto: 40000, medio: 'Transf. Bancaria', ref: 'Op. Santander 994021', saldoRemanente: 3000, comprobante: 'Comprobante_Santander.pdf' },
          { id: 'PAG-098', fecha: '2024-09-30 11:20', tipo: 'Liquidación Ordinaria', monto: 38500, medio: 'Mercado Pago', ref: 'MP-88391204', saldoRemanente: 0, comprobante: 'Recibo_MP.jpg' }
        ]
      },
      {
        id: 'PRT-088',
        nombre: 'Mariana Solís (Hermana / Especial)',
        cuit: '27-38192044-4',
        cbuAlias: 'solis.comisiones',
        telefono: '+54 9 11 6677-2233',
        tier: 'Acuerdo Especial Familiar',
        saldoFavorAlex: 15000,
        clientes: [
          { id: 4, empresa: 'Supermercado Los Primos', abono: 120000, porcentaje: 90, estado: 'Listo para pagar' },
          { id: 5, empresa: 'Almacén Mayorista Don Bosco', abono: 80000, porcentaje: 80, estado: 'Listo para pagar' }
        ],
        historialPagos: [
          { id: 'PAG-102', fecha: '2024-10-10 14:15', tipo: '💸 Préstamo / Adelanto', monto: 15000, medio: 'Efectivo en Mano', ref: 'Adelanto personal acordado', saldoRemanente: -15000, comprobante: 'Recibo_Firmado.jpg' }
        ]
      }
    ];
  });

  const [partnerSeleccionadoId, setPartnerSeleccionadoId] = useState('PRT-042');
  const [tipoMovimiento, setTipoMovimiento] = useState('liquidacion'); // 'liquidacion' | 'adelanto'
  const [montoLiquidar, setMontoLiquidar] = useState(40000);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  const [medioPago, setMedioPago] = useState('Transf. Bancaria');
  const [comprobanteRef, setComprobanteRef] = useState('Op. Santander 994021');
  const [notasContables, setNotasContables] = useState('Pago acordado por retención de factura.');
  const [archivoAdjunto, setArchivoAdjunto] = useState(null);
  const [modalEditarPorcentajes, setModalEditarPorcentajes] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  const partnerActivo = partners.find(p => p.id === partnerSeleccionadoId) || partners[0];

  // Cálculo de comisiones acumuladas del partner
  const totalComisionesAcumuladas = (partnerActivo.clientes || []).reduce((acc, c) => {
    return acc + Math.round(c.abono * (c.porcentaje / 100));
  }, 0);

  // Cálculo del saldo pendiente remanente o saldo a favor
  const saldoRemanente = tipoMovimiento === 'liquidacion'
    ? totalComisionesAcumuladas - (Number(montoLiquidar) || 0)
    : -(Number(montoLiquidar) || 0);

  const guardarEnStorage = (nuevos) => {
    setPartners(nuevos);
    localStorage.setItem('rc_partners_data', JSON.stringify(nuevos));
  };

  const handleAsentarPago = (e) => {
    e.preventDefault();
    const monto = Number(montoLiquidar);
    if (!monto || monto <= 0) {
      alert('Ingresá un monto válido');
      return;
    }

    const nuevoAsiento = {
      id: 'PAG-' + Date.now().toString().slice(-4),
      fecha: new Date().toLocaleString(),
      tipo: tipoMovimiento === 'liquidacion' ? 'Liquidación Ordinaria' : '💸 Préstamo / Adelanto',
      monto: monto,
      medio: medioPago,
      ref: comprobanteRef || 'S/Ref',
      saldoRemanente: saldoRemanente,
      comprobante: archivoAdjunto ? archivoAdjunto.name : (comprobanteRef ? 'Comprobante_Adjunto.pdf' : 'Recibo_Manual')
    };

    const actualizados = partners.map(p => {
      if (p.id === partnerActivo.id) {
        return {
          ...p,
          saldoFavorAlex: tipoMovimiento === 'adelanto' ? (p.saldoFavorAlex || 0) + monto : p.saldoFavorAlex,
          historialPagos: [nuevoAsiento, ...(p.historialPagos || [])]
        };
      }
      return p;
    });

    guardarEnStorage(actualizados);
    setMensajeExito(tipoMovimiento === 'liquidacion' ? '¡Liquidación asentada con éxito!' : '¡Adelanto a cuenta registrado correctamente!');
    setTimeout(() => setMensajeExito(null), 3500);
  };

  const actualizarPorcentajeCliente = (clienteId, nuevoPorcentaje) => {
    const actualizados = partners.map(p => {
      if (p.id === partnerActivo.id) {
        return {
          ...p,
          clientes: p.clientes.map(c => c.id === clienteId ? { ...c, porcentaje: Number(nuevoPorcentaje) } : c)
        };
      }
      return p;
    });
    guardarEnStorage(actualizados);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      {/* CABECERA MAESTRA */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="RutaComercio" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>SuperAdmin Finanzas</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Liquidación Quincenal & Mensual</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Cuenta Corriente & Liquidaciones a Partners</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.location.href = '/admin'} style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>← Volver a SuperAdmin</button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '24px' }}>
        
        {/* COLUMNA IZQUIERDA: DATOS DEL PARTNER Y CLIENTES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TARJETA DEL PARTNER SELECCIONADO */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800' }}>
                {partnerActivo.nombre.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>{partnerActivo.nombre}</h2>
                  <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px' }}>{partnerActivo.tier}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  CUIT: <strong>{partnerActivo.cuit}</strong> · CBU/Alias: <strong>{partnerActivo.cbuAlias}</strong>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setModalEditarPorcentajes(true)} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✏️</span> Ajustar % por Cliente
              </button>
            </div>
          </div>

          {/* MÉTRICAS RÁPIDAS DEL PERÍODO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Comisiones Acumuladas</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>${totalComisionesAcumuladas.toLocaleString('es-AR')}</div>
              <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>{partnerActivo.clientes.length} clientes asociados</div>
            </div>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Saldo a Favor de Alex</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: partnerActivo.saldoFavorAlex > 0 ? '#ea580c' : '#64748b', marginTop: '4px' }}>
                ${(partnerActivo.saldoFavorAlex || 0).toLocaleString('es-AR')}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Deducible en próximas ventas</div>
            </div>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Estado de Cuenta</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>Al Día</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Transferencias conciliadas</div>
            </div>
          </div>

          {/* DESGLOSE CLIENTE POR CLIENTE CON % LIBRE */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>Desglose por Clientes que originaron la Comisión</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Cálculo automático según el abono neto y el porcentaje acordado</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: '#64748b' }}>EMPRESA CLIENTE</th>
                    <th style={{ padding: '10px 12px', color: '#64748b' }}>ABONO SAAS</th>
                    <th style={{ padding: '10px 12px', color: '#64748b' }}>% COMISIÓN</th>
                    <th style={{ padding: '10px 12px', color: '#64748b' }}>COMISIÓN NETA</th>
                    <th style={{ padding: '10px 12px', color: '#64748b' }}>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {(partnerActivo.clientes || []).map(c => {
                    const comisionNeta = Math.round(c.abono * (c.porcentaje / 100));
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: '700' }}>{c.empresa}</td>
                        <td style={{ padding: '12px' }}>${c.abono.toLocaleString('es-AR')}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ backgroundColor: c.porcentaje >= 50 ? '#fef3c7' : '#eff6ff', color: c.porcentaje >= 50 ? '#d97706' : '#2563eb', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
                            {c.porcentaje}% {c.porcentaje >= 50 ? '👑 Especial' : ''}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: '800', color: '#16a34a' }}>${comisionNeta.toLocaleString('es-AR')}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                            ✓ {c.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '14px' }}>Suma Total de Comisiones a Liquidar:</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb' }}>${totalComisionesAcumuladas.toLocaleString('es-AR')} ARS</span>
            </div>
          </div>

          {/* HISTORIAL DE PAGOS ASENTADOS */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800' }}>Historial de Liquidaciones & Pagos Asentados</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: '#64748b' }}>FECHA</th>
                    <th style={{ padding: '10px 12px', color: '#64748b' }}>TIPO</th>
                    <th style={{ padding: '10px 12px', color: '#64748b' }}>MONTO</th>
                    <th style={{ padding: '10px 12px', color: '#64748b' }}>MEDIO / REF</th>
                    <th style={{ padding: '10px 12px', color: '#64748b' }}>COMPROBANTE</th>
                  </tr>
                </thead>
                <tbody>
                  {(partnerActivo.historialPagos || []).map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>{h.fecha}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ backgroundColor: h.tipo.includes('Adelanto') ? '#fef3c7' : '#f1f5f9', color: h.tipo.includes('Adelanto') ? '#b45309' : '#334155', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '11px' }}>
                          {h.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: '800', color: h.tipo.includes('Adelanto') ? '#ea580c' : '#16a34a' }}>
                        ${h.monto.toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{h.medio}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{h.ref}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => alert('Comprobante asociado: ' + h.comprobante)} style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                          📎 Ver Captura
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: ASENTAR PAGO O ADELANTO A CUENTA */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>🧾</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Asentar Pago / Movimiento</h3>
          </div>

          {/* SELECTOR DE MODO: LIQUIDACIÓN VS ADELANTO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setTipoMovimiento('liquidacion')}
              style={{
                backgroundColor: tipoMovimiento === 'liquidacion' ? '#ffffff' : 'transparent',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                color: tipoMovimiento === 'liquidacion' ? '#2563eb' : '#64748b',
                boxShadow: tipoMovimiento === 'liquidacion' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              Liquidación Ordinaria
            </button>
            <button
              type="button"
              onClick={() => setTipoMovimiento('adelanto')}
              style={{
                backgroundColor: tipoMovimiento === 'adelanto' ? '#ffffff' : 'transparent',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                color: tipoMovimiento === 'adelanto' ? '#ea580c' : '#64748b',
                boxShadow: tipoMovimiento === 'adelanto' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              💸 Adelanto / Préstamo
            </button>
          </div>

          <form onSubmit={handleAsentarPago} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>PARTNER A LIQUIDAR</label>
              <select
                value={partnerSeleccionadoId}
                onChange={(e) => setPartnerSeleccionadoId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
              >
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.tier})</option>
                ))}
              </select>
            </div>

            {tipoMovimiento === 'liquidacion' ? (
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                  <span>Total Comisiones Acumuladas:</span>
                  <strong style={{ color: '#0f172a' }}>${totalComisionesAcumuladas.toLocaleString('es-AR')}</strong>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#fff7ed', padding: '12px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                <div style={{ fontSize: '12px', color: '#c2410c', fontWeight: '700' }}>
                  ℹ️ Este monto se registra como Saldo a Favor de Alex y se descontará de sus próximas comisiones.
                </div>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>MONTO A LIQUIDAR ($)</label>
                {tipoMovimiento === 'liquidacion' && (
                  <button type="button" onClick={() => setMontoLiquidar(totalComisionesAcumuladas)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: 0 }}>
                    Pagar 100% Total
                  </button>
                )}
              </div>
              <input
                type="number"
                value={montoLiquidar}
                onChange={(e) => setMontoLiquidar(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', fontWeight: '800', color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>

            {/* CÁLCULO DE SALDO PENDIENTE O A FAVOR EN VIVO */}
            <div style={{ backgroundColor: saldoRemanente > 0 ? '#fef2f2' : (saldoRemanente < 0 ? '#fff7ed' : '#f0fdf4'), border: `1px solid ${saldoRemanente > 0 ? '#fecaca' : (saldoRemanente < 0 ? '#fed7aa' : '#bbf7d0')}`, padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: saldoRemanente > 0 ? '#991b1b' : (saldoRemanente < 0 ? '#c2410c' : '#166534') }}>
                  {saldoRemanente > 0 ? 'SALDO REMANENTE ADEUDADO:' : (saldoRemanente < 0 ? 'SALDO A FAVOR DE ALEX:' : 'LIQUIDACIÓN EXACTA')}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>
                  {saldoRemanente > 0 ? 'Pago Parcial' : (saldoRemanente < 0 ? 'Préstamo' : 'Cancelado 100%')}
                </span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: saldoRemanente > 0 ? '#dc2626' : (saldoRemanente < 0 ? '#ea580c' : '#16a34a'), marginTop: '4px' }}>
                ${Math.abs(saldoRemanente).toLocaleString('es-AR')}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {saldoRemanente > 0 ? 'Queda pendiente en la cuenta corriente del partner.' : (saldoRemanente < 0 ? 'Se descontará en el próximo corte quincenal.' : 'Sin saldos pendientes.')}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>FECHA PAGO</label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>MEDIO</label>
                <select
                  value={medioPago}
                  onChange={(e) => setMedioPago(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                >
                  <option value="Transf. Bancaria">Transf. Bancaria</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                  <option value="Cripto USDT (TRC20)">Cripto USDT</option>
                  <option value="Bitcoin Cash (BCH)">Bitcoin Cash (BCH)</option>
                  <option value="Efectivo">Efectivo en Mano</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>COMPROBANTE / HASH / REF</label>
              <input
                type="text"
                value={comprobanteRef}
                onChange={(e) => setComprobanteRef(e.target.value)}
                placeholder="Ej: Op. Santander 994021 o hash de TX"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>SUBIR CAPTURA / COMPROBANTE</label>
              <input
                type="file"
                onChange={(e) => setArchivoAdjunto(e.target.files[0])}
                style={{ width: '100%', fontSize: '11px', color: '#64748b' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>NOTAS CONTABLES</label>
              <textarea
                value={notasContables}
                onChange={(e) => setNotasContables(e.target.value)}
                rows={2}
                placeholder="Observaciones internas de este movimiento..."
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: tipoMovimiento === 'liquidacion' ? '#2563eb' : '#ea580c',
                color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                marginTop: '6px'
              }}
            >
              {tipoMovimiento === 'liquidacion' ? '✓ Confirmar y Asentar Pago' : '💸 Registrar Adelanto / Préstamo'}
            </button>

            {mensajeExito && (
              <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>
                {mensajeExito}
              </div>
            )}
          </form>
        </div>
      </main>

      {/* MODAL CONFIGURADOR DE % LIBRES POR CLIENTE */}
      {modalEditarPorcentajes && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Configurar % de Comisión por Cliente</h3>
              <button onClick={() => setModalEditarPorcentajes(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: 0 }}>
              Definí el porcentaje libremente para cada cliente asociado a <strong>{partnerActivo.nombre}</strong> (del 0% al 100%).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '20px 0' }}>
              {(partnerActivo.clientes || []).map(c => (
                <div key={c.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>
                    <span>{c.empresa}</span>
                    <span style={{ color: '#2563eb' }}>{c.porcentaje}% (${Math.round(c.abono * (c.porcentaje / 100)).toLocaleString('es-AR')})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={c.porcentaje}
                      onChange={(e) => actualizarPorcentajeCliente(c.id, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={c.porcentaje}
                      onChange={(e) => actualizarPorcentajeCliente(c.id, e.target.value)}
                      style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>%</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setModalEditarPorcentajes(false)}
              style={{ width: '100%', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
            >
              Listo, Guardar Porcentajes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
\`;

fs.writeFileSync('src/AdminPromotores.jsx', codigoPromotores, 'utf8');
console.log('🎉 ARCHIVO_ADMIN_PROMOTORES_ACTUALIZADO_CON_EXITO');

// Conectamos la ruta en main.jsx si no estaba
let m = fs.readFileSync('src/main.jsx', 'utf8');
if (!m.includes('AdminPromotores')) {
  m = 'import AdminPromotores from "./AdminPromotores";\\n' + m;
}
if (!m.includes('ruta.startsWith("/promotores")')) {
  m = m.replace('if (ruta.startsWith("/admin"))', 'if (ruta.startsWith("/promotores")) { Componente = AdminPromotores; } else if (ruta.startsWith("/admin"))');
}
fs.writeFileSync('src/main.jsx', m, 'utf8');
console.log('🎉 RUTA_PROMOTORES_CONECTADA_EN_MAIN');
