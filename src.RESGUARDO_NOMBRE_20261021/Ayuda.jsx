import React, { useState } from 'react';

const secciones = [
  { id: 'acceso', titulo: '1. Ingresar al sistema', contenido: [
    'Ingresá con el correo electrónico y la contraseña asignados a tu cuenta. Presioná «Iniciar Sesión». No compartas tu contraseña.',
    'Al entrar como Supervisor de Repartos Independiente vas a encontrar las herramientas para organizar entregas y recorridos, sin necesidad de utilizar el módulo de Ventas.'
  ] , imagenes: [{ archivo: '01-acceso-seguro.png', descripcion: 'Pantalla de acceso seguro: ingresá tu correo y contraseña.' }] },
  { id: 'panel', titulo: '2. Conocer el panel del Supervisor', contenido: [
    'Las tarjetas permiten consultar entregas pendientes de preparar, preparadas para asignar, asignadas a repartidores, todas las entregas de una fecha y entregas futuras.',
    'También hay apartados para entregas no concretadas, rechazos por regresar a depósito, rechazos informados, rechazos recibidos y el historial de entregas retiradas de pendientes.',
    'Podés elegir la fecha, buscar por destinatario, dirección, remito o factura, actualizar la vista y abrir cada entrega para consultar su detalle.',
    'El botón «+ NUEVA ENTREGA» inicia la carga. «GESTIÓN DE REPARTOS» agrupa las entregas preparadas y permite asignar choferes. «CONTROL DE REPARTIDORES» muestra el seguimiento y «HISTORIAL DE REPARTOS» permite consultar recorridos cerrados.',
    'Las tarjetas de entregas no concretadas y devoluciones representan situaciones distintas. No interpretes una visita fallida como mercadería físicamente recibida.'
  ] , imagenes: [{ archivo: '02-panel-supervisor.png', descripcion: 'Vista general de las tarjetas y herramientas del Supervisor.' }, { archivo: '04-panel-entregas.png', descripcion: 'Las entregas se organizan por estado y fecha.' }] },
  { id: 'crear', titulo: '3. Crear una nueva entrega', contenido: [
    'Presioná «+ NUEVA ENTREGA». Completá los datos obligatorios señalados con un asterisco: destinatario, dirección, localidad, provincia, partido o departamento y cantidad de bultos.',
    'Podés agregar teléfono, referencia del domicilio, fecha programada, número de remito, número de factura y observaciones.',
    'Presioná «GUARDAR ENTREGA». La entrega quedará en estado pendiente y aparecerá entre las pendientes de preparar. En esta modalidad no necesitás crear una NVI ni un pedido de Ventas.',
    'Antes de guardar, verificá especialmente calle, número, localidad, provincia y cantidad de bultos. Una dirección incompleta puede dificultar la ubicación en el mapa.',
    'La entrega queda pendiente de preparación; crearla no equivale a entregarla ni a cargarla en un vehículo.'
  ] , imagenes: [{ archivo: '03-formulario-nueva-entrega.png', descripcion: 'Formulario para cargar una entrega independiente.' }] },
  { id: 'ubicacion', titulo: '4. Ubicar el domicilio en el mapa', contenido: [
    'Usá «GEOLOCALIZAR UNA» para ubicar una entrega o «GEOLOCALIZAR TODAS» para procesar varias entregas sin ubicación.',
    'Si el punto no coincide con la dirección real, abrí la entrega y elegí «CORREGIR UBICACIÓN DEL MAPA» o «ELEGIR PUNTO MANUALMENTE».',
    'En el mapa, acercate con los controles de zoom, señalá el lugar correcto y presioná «GUARDAR PUNTO ELEGIDO». Verificá la ubicación antes de continuar.',
    'Si el sistema no encuentra el domicilio exacto, usá la selección manual. Marcá el punto correcto en el mapa y guardalo antes de organizar el reparto.',
    'Comprobá el punto elegido antes de enviar el recorrido al repartidor.'
  ] , imagenes: [{ archivo: '05-geolocalizacion.png', descripcion: 'Herramientas para ubicar una o varias entregas en el mapa.' }, { archivo: '27-mapa-punto-elegido.png', descripcion: 'Ejemplo de selección manual de ubicación en el mapa.' }] },
  { id: 'preparar', titulo: '5. Preparar la mercadería', contenido: [
    'Abrí una entrega pendiente y presioná «MARCAR PREPARADA» cuando la mercadería esté lista para cargar.',
    'La entrega pasará a «PREPARADAS PARA ASIGNAR». Preparada significa lista para el reparto; no implica que el repartidor ya la haya recibido.',
    'Para trabajar con recorridos numerados, conviene agregar las entregas preparadas desde «GESTIÓN DE REPARTOS», en lugar de asignar cada una por separado.'
  ] , imagenes: [{ archivo: '06-ficha-entrega-pendiente.png', descripcion: 'Ficha de una entrega pendiente: botón MARCAR PREPARADA.' }, { archivo: '07-entrega-preparada.png', descripcion: 'La entrega aparece como PREPARADO.' }] },
  { id: 'reparto', titulo: '6. Crear un reparto numerado', contenido: [
    'Abrí «GESTIÓN DE REPARTOS» y presioná «NUEVO REPARTO». Confirmá la creación. El sistema genera un número propio, por ejemplo REP001-000009.',
    'Al principio el reparto estará en preparación, sin chofer y sin entregas. En «Agregar entrega existente», seleccioná una entrega preparada y presioná «+ AGREGAR ENTREGA». Repetí el procedimiento para sumar las demás.',
    'Elegí el chofer en «Asignar repartidor». El número del reparto se conserva aunque agregues entregas. Asignar un chofer no significa que el vehículo ya salió.',
    'Si generaste un reparto por error y todavía no tiene entregas, podés utilizar «ELIMINAR REPARTO VACÍO».',
    'Ejemplo de trabajo: prepará varias entregas, creá un reparto numerado, agregalas una por una y recién después elegí al repartidor.',
    'El número identifica al reparto completo; cada entrega conserva su propio detalle y resultado.'
  ] , imagenes: [{ archivo: '08-gestion-repartos.png', descripcion: 'Abrí GESTIÓN DE REPARTOS.' }, { archivo: '09-crear-reparto.png', descripcion: 'Botón NUEVO REPARTO.' }, { archivo: '10-reparto-numerado.png', descripcion: 'Reparto numerado inicialmente sin entregas ni repartidor.' }, { archivo: '11-seleccionar-entrega.png', descripcion: 'Elegí una entrega preparada.' }, { archivo: '12-agregar-entrega.png', descripcion: 'Agregá la entrega al reparto.' }, { archivo: '13-asignar-chofer.png', descripcion: 'Elegí el repartidor que realizará el recorrido.' }] },
  { id: 'salida', titulo: '7. Recepción y comienzo del recorrido', contenido: [
    'El repartidor consulta en su celular las entregas asignadas. Primero confirma que recibió la mercadería y luego inicia el recorrido.',
    'El Supervisor puede seguir los cambios de estado desde Gestión de Repartos y Control de Repartidores. La aplicación del repartidor permite organizar el orden de las paradas.',
    'La asignación, la recepción de mercadería y el comienzo del recorrido son momentos diferentes.',
    'No confundas los estados: asignado significa que se eligió un repartidor; recibido significa que el chofer confirmó la mercadería; en reparto significa que inició el recorrido.'
  ] , imagenes: [{ archivo: '14-chofer-recibio.png', descripcion: 'Entrega asignada al repartidor.' }, { archivo: '15-en-reparto.png', descripcion: 'La ficha muestra que el repartidor recibió la mercadería.' }] },
  { id: 'control', titulo: '8. Controlar repartidores y entregas', contenido: [
    'Abrí «CONTROL DE REPARTIDORES» para consultar los repartidores y sus recorridos. Cuando corresponde, «Ver ruta» muestra el mapa y el detalle del reparto activo.',
    'Consultá las entregas para conocer cuáles siguen pendientes, cuáles fueron entregadas y cuáles no pudieron concretarse. La información de ubicación depende de la última posición enviada por el celular.',
    'Las novedades del reparto también pueden aparecer en «AVISOS DE REPARTOS». No es necesario finalizar manualmente cada entrega desde el Supervisor: el repartidor informa el resultado desde su aplicación.',
    'El Supervisor puede consultar el avance sin marcar las entregas en nombre del chofer. Cada resultado debe informarse desde el celular del repartidor.',
    'La ubicación mostrada corresponde a la última posición recibida; no debe interpretarse como ubicación garantizada en tiempo real si el dispositivo perdió señal.'
  ] , imagenes: [{ archivo: '16-control-y-mapa.png', descripcion: 'Entrega identificada como EN REPARTO.' }, { archivo: '17-control-repartidores.png', descripcion: 'Resumen de las entregas y sus estados.' }] },
  { id: 'rechazos', titulo: '9. Entregas no concretadas y rechazos', contenido: [
    'Si una entrega no se concreta, el repartidor informa el resultado y el motivo, por ejemplo comercio cerrado, destinatario ausente o rechazo de mercadería.',
    '«ENTREGAS NO CONCRETADAS AL CLIENTE» conserva el historial de visitas fallidas, incluso si la mercadería ya volvió al depósito.',
    '«RECHAZOS POR REGRESAR A DEPÓSITO» permite identificar mercadería que aún debe regresar. «RECHAZOS INFORMADOS AL DEPÓSITO» indica que se informó la devolución, pero todavía falta confirmar su recepción física.',
    '«RECHAZOS RECIBIDOS EN DEPÓSITO» corresponde a mercadería cuya recepción física ya confirmó el Supervisor. Son situaciones distintas: resultado de la visita y estado de la devolución.',
    'Ejemplo: si el comercio estaba cerrado, la visita se registra como no concretada. Luego corresponde seguir el retorno de la mercadería hasta que Depósito confirme que la recibió.',
    'Una entrega puede figurar en el historial de no concretadas y, al mismo tiempo, como devolución ya recibida: no es una duplicación, sino información de dos etapas distintas.'
  ] , imagenes: [{ archivo: '25-retirar-de-pendientes.png', descripcion: 'Ejemplo de entrega no concretada y devolución todavía sin informar.' }] },
  { id: 'devolucion', titulo: '10. Confirmar devoluciones en depósito', contenido: [
    'El repartidor debe poder consultar las entregas anteriores de su recorrido para informar la mercadería que regresa.',
    'El Supervisor verifica físicamente la mercadería devuelta y registra su recepción. No confundas una devolución informada con una devolución efectivamente recibida.',
    'El historial de la visita no desaparece cuando se confirma el regreso al depósito.',
    'Antes de confirmar, contrastá físicamente los bultos que regresaron con los datos de la entrega. Si todavía no llegaron, no marques la recepción.'
  ] , imagenes: [{ archivo: '22-reprogramar.png', descripcion: 'Entrega identificada como devuelta al depósito.' }] },
  { id: 'reprogramar', titulo: '11. Reprogramar una entrega', contenido: [
    'Abrí una entrega rechazada cuya mercadería ya fue recibida en depósito y seleccioná «REPROGRAMAR ENTREGA».',
    'Indicá la nueva fecha y el motivo de la reprogramación. El sistema conserva la visita fallida y el registro de devolución, y genera una nueva entrega pendiente.',
    'La nueva entrega deberá prepararse y asignarse a un reparto como cualquier otra.',
    'Ejemplo: una entrega que no pudo concretarse hoy puede programarse para otro día. La visita fallida original permanece registrada y se crea una nueva entrega pendiente para la nueva fecha.'
  ] , imagenes: [{ archivo: '24-no-entregado.png', descripcion: 'Nueva entrega pendiente generada después de una reprogramación.' }] },
  { id: 'quitar', titulo: '12. Retirar una entrega de pendientes', contenido: [
    'Cuando corresponda, abrí la entrega y elegí «ELIMINAR DE PENDIENTES». Confirmá la operación e indicá el motivo solicitado.',
    'Retirar una entrega de pendientes no significa confirmar que la mercadería volvió físicamente al depósito. Los antecedentes y la devolución siguen registrados.',
    'Podés consultar estas operaciones en «HISTORIAL DE ENTREGAS QUITADAS DE PENDIENTES».',
    'Usá esta opción para retirar una entrega de la lista operativa de pendientes cuando corresponda, indicando el motivo. No la utilices para simular una entrega exitosa ni para confirmar una devolución.'
  ] },
  { id: 'chat', titulo: '13. Comunicarse mediante RutaChat', contenido: [
    'Abrí «RUTACHAT», seleccioná el repartidor y escribí el mensaje. Presioná «ENVIAR MENSAJE».',
    'La conversación conserva los mensajes y sus horarios, para facilitar la comunicación operativa entre Supervisor y repartidor.',
    'Seleccioná el chofer correcto antes de enviar el mensaje. El chat sirve para coordinar novedades del recorrido, sin reemplazar el registro formal del resultado de cada entrega.'
  ] , imagenes: [{ archivo: '18-avisos.png', descripcion: 'Acceso a RUTACHAT desde el panel.' }] },
  { id: 'historial', titulo: '14. Consultar el historial de repartos', contenido: [
    'Abrí «HISTORIAL DE REPARTOS». Podés filtrar por número de reparto o chofer, fecha y repartidor.',
    'Expandí un reparto para consultar sus datos: inicio, finalización, duración y resultado de cada entrega, junto con los horarios registrados.',
    'El historial permite revisar recorridos anteriores sin confundirlos con los repartos que siguen activos.',
    'Al expandir un reparto finalizado podés revisar los horarios de inicio y fin, la duración y los resultados individuales. Es útil para responder consultas posteriores sobre una entrega.'
  ] , imagenes: [{ archivo: '20-detalle-historial.png', descripcion: 'Historial de repartos con filtros por fecha y repartidor.' }] },
];

export default function Ayuda() {
  const [busqueda, setBusqueda] = useState('');
  const filtradas = secciones.filter(s => (s.titulo + ' ' + s.contenido.join(' ')).toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')));
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', color: '#0f172a', fontFamily: 'Arial, Helvetica, sans-serif', padding: '22px 14px', boxSizing: 'border-box', textAlign: 'left' }}>
      <div style={{ maxWidth: 1050, margin: '0 auto' }}>
        <header style={{ background: '#0f172a', color: '#fff', padding: '30px 26px', borderRadius: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, letterSpacing: 1.2, color: '#93c5fd', fontWeight: 800 }}>RUTACOMERCIOS</div>
          <h1 style={{ color: '#fff', margin: '10px 0', fontSize: 'clamp(25px, 5vw, 38px)', lineHeight: 1.2 }}>📘 Centro de Ayuda</h1>
          <p style={{ color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>Guías prácticas para aprender a usar el sistema, paso a paso.</p>
        </header>
        <div style={{ background: '#fff', padding: '22px 24px', borderRadius: 14, marginBottom: 18, border: '1px solid #e2e8f0' }}>
          <h2 style={{ color: '#0f172a', margin: '0 0 6px', fontSize: 24 }}>🚚 Repartos Independiente</h2>
          <p style={{ color: '#475569', margin: '0 0 16px' }}>Manual del Supervisor · Desde la creación de una entrega hasta el cierre y el historial del reparto.</p>
          <label htmlFor="buscar-ayuda" style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 7 }}>Buscar en este manual</label>
          <input id="buscar-ayuda" type="search" placeholder="Ej.: devoluciones, geolocalizar, repartidor…" value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ boxSizing: 'border-box', width: '100%', padding: '13px 14px', borderRadius: 9, border: '1px solid #cbd5e1', fontSize: 15, color: '#0f172a', background: '#fff' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 18, alignItems: 'start' }}>
          <nav aria-label="Índice del manual" style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 20, borderRadius: 14 }}>
            <h3 style={{ margin: '0 0 14px', color: '#0f172a' }}>Índice del manual</h3>
            {filtradas.map(s => <a key={s.id} href={'#' + s.id} style={{ display: 'block', color: '#1d4ed8', textDecoration: 'none', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14, lineHeight: 1.4 }}>{s.titulo}</a>)}
            {filtradas.length === 0 && <p style={{ color: '#64748b' }}>No encontramos temas con esa búsqueda.</p>}
          </nav>
          <main style={{ display: 'grid', gap: 14, gridColumn: 'span 2', minWidth: 0 }}>
            {filtradas.map(s => <section id={s.id} key={s.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '22px 24px', scrollMarginTop: 16 }}>
              <h3 style={{ margin: '0 0 13px', color: '#0f172a', fontSize: 20, lineHeight: 1.35 }}>{s.titulo}</h3>
              {s.contenido.map((p, i) => <p key={i} style={{ color: '#334155', lineHeight: 1.75, fontSize: 15, margin: '0 0 12px' }}>{p}</p>)}
              {(s.imagenes || []).map((img, i) => <figure key={i} style={{ margin: '18px 0 22px', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}><a href={'/ayuda/imagenes/' + img.archivo} target="_blank" rel="noopener noreferrer" title="Abrir imagen en tamaño completo"><img src={'/ayuda/imagenes/' + img.archivo} alt={img.descripcion} loading="lazy" style={{ display: 'block', width: '100%', maxHeight: 650, objectFit: 'contain', borderRadius: 8 }} /></a><figcaption style={{ marginTop: 9, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{img.descripcion} · Hacé clic para ampliar.</figcaption></figure>)}
            </section>)}
          </main>
        </div>
        <footer style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '28px 0 8px' }}>RutaComercios · Centro de Ayuda · Manual en desarrollo</footer>
      </div>
    </div>
  );
}
