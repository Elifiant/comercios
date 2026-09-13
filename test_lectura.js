const fs = require('fs');
const c = fs.readFileSync('src/AdminClientes.jsx', 'utf8');
if (!c.includes('empresaFiltro')) {
  console.log('Archivo leido correctamente');
} else {
  console.log('Ya tiene filtro');
}
