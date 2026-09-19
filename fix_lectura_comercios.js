const fs = require('fs');

let sup = fs.readFileSync('src/Supervisor.jsx', 'utf8');

// Comprobamos si ya tiene lectura de comercios
const yaTieneLectura = sup.indexOf('obtenerComerciosSupervisor') !== -1 || sup.indexOf('.from("comercios").select') !== -1;

if (yaTieneLectura === false) {
  const funcionCarga = [
    '',
    '  // Carga automática de comercios desde Supabase para el Supervisor',
    '  useEffect(() => {',
    '    async function obtenerComerciosSupervisor() {',
    '      try {',
    '        setCargando(true);',
    '        const res = await supabase',
    '          .from("comercios")',
    '          .select("*")',
    '          .order("id", { ascending: false });',
    '        if (res.data) {',
    '          setComercios(res.data);',
    '        }',
    '      } catch (err) {',
    '        console.error("Fallo al traer comercios:", err);',
    '      } finally {',
    '        setCargando(false);',
    '      }',
    '    }',
    '    obtenerComerciosSupervisor();',
    '  }, []);',
    ''
  ].join('\n');

  const target = 'export default function Supervisor() {';
  if (sup.indexOf(target) !== -1) {
    sup = sup.replace(target, target + '\n' + funcionCarga);
    fs.writeFileSync('src/Supervisor.jsx', sup, 'utf8');
    console.log('🎉 LECTURA_COMERCIOS_INYECTADA_CON_EXITO');
  } else {
    console.log('⚠ No se encontró la declaración de Supervisor');
  }
} else {
  console.log('✅ Ya tiene la lectura de comercios conectada');
}
