const fs = require('fs');
let c = fs.readFileSync('src/AdminClientes.jsx', 'utf8');
c = c.replace('.order("created_at", { ascending: false })', '');
fs.writeFileSync('src/AdminClientes.jsx', c, 'utf8');
console.log('✅ ADMIN_CONSULTA_SIMPLIFICADA');
