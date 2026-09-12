const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Asegurar estado de texto para el botón en el componente App
if (!c.includes('textoBotonAgregar')) {
  c = c.replace(
    /const \[modoManejo, setModoManejo\] = useState\(false\);/,
    "const [modoManejo, setModoManejo] = useState(false);\n  const [textoBotonAgregar, setTextoBotonAgregar] = useState('➕ AGREGAR COMERCIO');"
  );
}

// 2. Reemplazar la función agregarComercioInmediato
const patron = /const agregarComercioInmediato = async \(\) => {[\s\S]*?\n  };/m;

const nuevaFuncion = `const agregarComercioInmediato = async () => {
    if (!navigator.geolocation) {
      alert('Activa el GPS');
      return;
    }
    setTextoBotonAgregar('⏳ Guardando ubicación...');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const cod = Date.now().toString().slice(-4);
      const nuevo = {
        nombre: 'Comercio #' + cod,
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
        ubicacion_exacta_latitud: pos.coords.latitude,
        ubicacion_exacta_longitud: pos.coords.longitude,
        fecha: new Date().toISOString(),
        notas: 'Registrado en Modo Manejo',
      };
      const { data, error } = await supabase.from('comercios').insert([nuevo]).select();
      if (!error && data) {
        setComercios((prev) => [data[0], ...prev]);
        try { if (typeof reproducirAlerta === 'function') reproducirAlerta(); } catch(e){}
        setTextoBotonAgregar('✅ ¡GUARDADO! #' + cod);
        setTimeout(() => setTextoBotonAgregar('➕ AGREGAR COMERCIO'), 3000);
      } else {
        setTextoBotonAgregar('⚠️ Error al guardar');
        setTimeout(() => setTextoBotonAgregar('➕ AGREGAR COMERCIO'), 3000);
      }
    }, (err) => {
      setTextoBotonAgregar('⚠️ Error GPS');
      setTimeout(() => setTextoBotonAgregar('➕ AGREGAR COMERCIO'), 3000);
    }, { enableHighAccuracy: true, timeout: 10000 });
  };`;

if (patron.test(c)) {
  c = c.replace(patron, nuevaFuncion);
}

// 3. Hacer que el botón en el JSX muestre el estado dinámico (textoBotonAgregar)
c = c.replace(
  /<button([^>]*onClick=\{agregarComercioInmediato\}[^>]*)>[\s\S]*?<\/button>/g,
  '<button$1>{textoBotonAgregar || "➕ AGREGAR COMERCIO"}</button>'
);

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('🎉 BOTON_AGREGAR_ACTUALIZADO_CON_EXITO');
