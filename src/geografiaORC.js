// Catálogo geográfico de ORC Oficios
// Consulta los departamentos de Argentina en Georef.

export const provinciasGeograficasORC = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires",
  "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan",
  "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán"
];

const cacheGeograficoORC = new Map();

export async function departamentosGeograficosORC(provincia) {
  if (!provinciasGeograficasORC.includes(provincia)) return [];

  if (cacheGeograficoORC.has(provincia)) {
    return cacheGeograficoORC.get(provincia);
  }

  if (provincia === "Ciudad Autónoma de Buenos Aires") {
    const comunas = Array.from(
      { length: 15 },
      (_, i) => `Comuna ${i + 1}`
    );
    cacheGeograficoORC.set(provincia, comunas);
    return comunas;
  }

  const url =
    `https://apis.datos.gob.ar/georef/api/departamentos?provincia=${
      encodeURIComponent(provincia)
    }&max=1000&campos=id,nombre,provincia`;

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error("No se pudo consultar el catálogo oficial");
  }

  const json = await respuesta.json();

  const lista = [...new Set(
    (json.departamentos || [])
      .map(d => String(d.nombre || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "es"));

  if (!lista.length) {
    throw new Error("No hay departamentos disponibles");
  }

  cacheGeograficoORC.set(provincia, lista);
  return lista;
}

export const normalizarGeografiaORC = valor =>
  String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();

export const zonaGeograficaORC = (departamento, provincia) =>
  `${departamento} (${provincia})`;
