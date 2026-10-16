// Genera public/data/world.json: los países de americas.json (sin tocar) + el resto del mundo.
// Uso: npm i --no-save world-atlas@2 topojson-client countries-list world-countries d3-geo-projection
//      node scripts/build-world.mjs
import fs from 'fs'
import { feature, merge } from 'topojson-client'
import { geoArea, geoBounds, geoCentroid, geoEquirectangular } from 'd3-geo'
import { geoProject } from 'd3-geo-projection'

// Proyección identidad (x = lon, y = -lat) que corta los polígonos en el antimeridiano
const identity = geoEquirectangular().scale(180 / Math.PI).translate([0, 0]).precision(0)
const cutAntimeridian = (geom) => {
  const out = geoProject(geom, identity)
  const flip = (polys) => polys.map((poly) => poly.map((ring) => ring.map(([x, y]) => [x, -y])))
  return out.type === 'Polygon' ? { type: 'Polygon', coordinates: flip([out.coordinates])[0] } : { type: 'MultiPolygon', coordinates: flip(out.coordinates) }
}
const crosses = (polys) => polys.some((poly) => poly.some((ring) => ring.some((c, i) => i && Math.abs(c[0] - ring[i - 1][0]) > 180)))

const PROJECT = new URL('..', import.meta.url).pathname
const topo = JSON.parse(fs.readFileSync(`${PROJECT}node_modules/world-atlas/countries-50m.json`))
const wc = JSON.parse(fs.readFileSync(`${PROJECT}node_modules/world-countries/countries.json`))
const cl = JSON.parse(fs.readFileSync(`${PROJECT}node_modules/countries-list/countries.min.json`))
const americas = JSON.parse(fs.readFileSync(`${PROJECT}public/data/americas.json`))
const amIso = new Set(americas.features.map((f) => f.properties.iso2))

const byNum = new Map(wc.map((c) => [c.ccn3, c]))
const byIso2 = new Map(wc.map((c) => [c.cca2, c]))

// Geometrías sin código numérico → se asignan a un país
const NAMED = {
  Kosovo: 'XK',
  Somaliland: 'SO',
  'N. Cyprus': 'CY',
  'Indian Ocean Ter.': 'AU',
  'Siachen Glacier': 'IN',
}

const regionEs = new Intl.DisplayNames('es', { type: 'region' })
const langEs = new Intl.DisplayNames('es', { type: 'language' })
const curEs = new Intl.DisplayNames('es', { type: 'currency' })

const CONTINENT = { Africa: 'África', Asia: 'Asia', Europe: 'Europa', Oceania: 'Oceanía', Antarctic: 'Antártida' }
const SUBREGION = {
  'Eastern Africa': 'África oriental',
  'Middle Africa': 'África central',
  'Northern Africa': 'África del Norte',
  'Southern Africa': 'África austral',
  'Western Africa': 'África occidental',
  'Central Asia': 'Asia central',
  'Eastern Asia': 'Asia oriental',
  'South-Eastern Asia': 'Sudeste asiático',
  'Southern Asia': 'Asia meridional',
  'Western Asia': 'Asia occidental',
  'Central Europe': 'Europa central',
  'Eastern Europe': 'Europa oriental',
  'Northern Europe': 'Europa del Norte',
  'Southeast Europe': 'Europa sudoriental',
  'Southern Europe': 'Europa meridional',
  'Western Europe': 'Europa occidental',
  'Australia and New Zealand': 'Australia y Nueva Zelanda',
  Melanesia: 'Melanesia',
  Micronesia: 'Micronesia',
  Polynesia: 'Polinesia',
  '': 'Antártida',
}

// Capitales cuyo nombre en español difiere del inglés
const CAPITAL = {
  'Abu Dhabi': 'Abu Dabi', Algiers: 'Argel', Athens: 'Atenas', Baghdad: 'Bagdad', Beijing: 'Pekín',
  Beirut: 'Beirut', Belgrade: 'Belgrado', Berlin: 'Berlín', Bern: 'Berna', Brussels: 'Bruselas',
  Bucharest: 'Bucarest', Cairo: 'El Cairo', Copenhagen: 'Copenhague', Damascus: 'Damasco',
  Dhaka: 'Daca', Djibouti: 'Yibuti', Dodoma: 'Dodoma', Dushanbe: 'Dusambé', Freetown: 'Freetown',
  Hanoi: 'Hanói', Helsinki: 'Helsinki', 'Kuwait City': 'Kuwait', Kyiv: 'Kiev', Kiev: 'Kiev',
  Lisbon: 'Lisboa', London: 'Londres', Luxembourg: 'Luxemburgo', Moscow: 'Moscú', 'New Delhi': 'Nueva Delhi',
  Nicosia: 'Nicosia', Paris: 'París', Prague: 'Praga', Pyongyang: 'Pionyang', Rabat: 'Rabat',
  Reykjavik: 'Reikiavik', Riyadh: 'Riad', Rome: 'Roma', Seoul: 'Seúl', Singapore: 'Singapur',
  Stockholm: 'Estocolmo', Tbilisi: 'Tiflis', Tehran: 'Teherán', 'Tel Aviv': 'Tel Aviv', Jerusalem: 'Jerusalén',
  Tokyo: 'Tokio', Tunis: 'Túnez', Vienna: 'Viena', Warsaw: 'Varsovia', Yerevan: 'Ereván',
  'Vatican City': 'Ciudad del Vaticano', 'Monaco': 'Mónaco', 'San Marino': 'San Marino',
  Ankara: 'Ankara', Amman: 'Amán', Ashgabat: 'Asjabad', Astana: 'Astaná', Baku: 'Bakú',
  Bishkek: 'Biskek', Tashkent: 'Taskent', Kabul: 'Kabul', Islamabad: 'Islamabad', Kathmandu: 'Katmandú',
  Thimphu: 'Timbu', 'Sri Jayawardenepura Kotte': 'Sri Jayawardenepura Kotte', Malé: 'Malé',
  Naypyidaw: 'Naipyidó', 'Nay Pyi Taw': 'Naipyidó', Bangkok: 'Bangkok', Vientiane: 'Vientián',
  'Phnom Penh': 'Nom Pen', 'Kuala Lumpur': 'Kuala Lumpur', Jakarta: 'Yakarta', Manila: 'Manila',
  Dili: 'Dili', 'Bandar Seri Begawan': 'Bandar Seri Begawan', Taipei: 'Taipéi', Ulan: 'Ulán Bator',
  'Ulan Bator': 'Ulán Bator', Ulaanbaatar: 'Ulán Bator', Muscat: 'Mascate', Sana: 'Saná', "Sana'a": 'Saná',
  Doha: 'Doha', Manama: 'Manama', 'Ramallah': 'Ramala', Minsk: 'Minsk', Chisinau: 'Chisináu',
  Vilnius: 'Vilna', Riga: 'Riga', Tallinn: 'Tallin', Oslo: 'Oslo', Dublin: 'Dublín', Amsterdam: 'Ámsterdam',
  Andorra: 'Andorra la Vieja', 'Andorra la Vella': 'Andorra la Vieja', Valletta: 'La Valeta', Ljubljana: 'Liubliana',
  Zagreb: 'Zagreb', Sarajevo: 'Sarajevo', Podgorica: 'Podgorica', Tirana: 'Tirana', Skopje: 'Skopie',
  Sofia: 'Sofía', Budapest: 'Budapest', Bratislava: 'Bratislava', Pristina: 'Pristina', Vaduz: 'Vaduz',
  Torshavn: 'Tórshavn', Tórshavn: 'Tórshavn', Mariehamn: 'Mariehamn', 'Saint Helier': 'Saint Helier',
  'St. Peter Port': 'Saint Peter Port', Douglas: 'Douglas', Gibraltar: 'Gibraltar',
  Addis: 'Adís Abeba', 'Addis Ababa': 'Adís Abeba', Asmara: 'Asmara', Mogadishu: 'Mogadiscio',
  Nairobi: 'Nairobi', Kampala: 'Kampala', Kigali: 'Kigali', Gitega: 'Gitega', Bujumbura: 'Buyumbura',
  Khartoum: 'Jartum', Juba: 'Yuba', Tripoli: 'Trípoli', "N'Djamena": 'Yamena', Niamey: 'Niamey',
  Bamako: 'Bamako', Nouakchott: 'Nuakchot', Dakar: 'Dakar', Banjul: 'Banjul', Bissau: 'Bisáu',
  Conakry: 'Conakri', Monrovia: 'Monrovia', Yamoussoukro: 'Yamusukro', Accra: 'Acra', Lomé: 'Lomé',
  'Porto-Novo': 'Porto Novo', Abuja: 'Abuya', Ouagadougou: 'Uagadugú', Yaoundé: 'Yaundé',
  Bangui: 'Bangui', Malabo: 'Malabo', Libreville: 'Libreville', Brazzaville: 'Brazzaville',
  Kinshasa: 'Kinsasa', Luanda: 'Luanda', Lusaka: 'Lusaka', Harare: 'Harare', Lilongwe: 'Lilongüe',
  Maputo: 'Maputo', Antananarivo: 'Antananarivo', 'Port Louis': 'Port Louis', Victoria: 'Victoria',
  Moroni: 'Moroni', Gaborone: 'Gaborone', Windhoek: 'Windhoek', Pretoria: 'Pretoria', Maseru: 'Maseru',
  Mbabane: 'Mbabane', Lobamba: 'Lobamba', 'São Tomé': 'Santo Tomé', Praia: 'Praia', 'El Aaiún': 'El Aaiún',
  'Saint-Denis': 'Saint-Denis', Mamoudzou: 'Mamoudzou', Jamestown: 'Jamestown',
  Canberra: 'Canberra', Wellington: 'Wellington', 'Port Moresby': 'Port Moresby', Honiara: 'Honiara',
  'Port Vila': 'Port Vila', Suva: 'Suva', Nouméa: 'Numea', Noumea: 'Numea', Palikir: 'Palikir',
  Majuro: 'Majuro', 'South Tarawa': 'Tarawa Sur', Tarawa: 'Tarawa', Ngerulmud: 'Melekeok', Yaren: 'Yaren',
  Apia: 'Apia', "Nuku'alofa": 'Nukualofa', Papeetē: 'Papeete', Papeete: 'Papeete', Alofi: 'Alofi',
  Avarua: 'Avarua', Adamstown: 'Adamstown', 'Mata-Utu': 'Mata-Utu', Hagåtña: 'Agaña', Saipan: 'Saipán',
  'Pago Pago': 'Pago Pago', Kingston: 'Kingston', 'King Edward Point': 'Grytviken',
  'Diego Garcia': 'Diego García', 'Port-aux-Français': 'Port-aux-Français',
}

const NAME = {
  CI: 'Costa de Marfil', HK: 'Hong Kong', MO: 'Macao', PS: 'Palestina', AX: 'Islas Åland', MM: 'Myanmar',
}
const CAPITAL_BY_ISO = { SM: 'San Marino', MD: 'Chisináu', HK: 'Hong Kong', MO: 'Macao' }

const flag = (iso) => [...iso].map((c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0))).join('')
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d

// Agrupa geometrías del topojson por ISO2 (fusionando las que comparten país)
const groups = new Map()
for (const g of topo.objects.countries.geometries) {
  const iso = byNum.get(g.id)?.cca2 ?? NAMED[g.properties.name]
  if (!iso) throw new Error(`Sin código: ${g.properties.name}`)
  if (amIso.has(iso)) continue
  if (!groups.has(iso)) groups.set(iso, [])
  groups.get(iso).push(g)
}

const polygonsOf = (geom) => (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates)
const toGeom = (polys) => (polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys })
const roundGeom = (polys) => polys.map((poly) => poly.map((ring) => ring.map(([x, y]) => [round(x, 3), round(y, 3)])))

const geometries = new Map()
for (const [iso, geoms] of groups) {
  const geom = geoms.length > 1 ? merge(topo, geoms) : feature(topo, geoms[0]).geometry
  geometries.set(iso, polygonsOf(geom))
}

// Francia y Países Bajos: los territorios de ultramar en América ya están en americas.json;
// Reunión y Mayotte se separan como territorios propios
const centroidOf = (poly) => geoCentroid({ type: 'Polygon', coordinates: poly })
const split = (iso, test) => {
  const out = []
  geometries.set(iso, geometries.get(iso).filter((p) => (test(centroidOf(p)) ? (out.push(p), false) : true)))
  return out
}
split('FR', ([lon]) => lon < -30)
split('NL', ([lon]) => lon < -30)
geometries.set('RE', split('FR', ([lon, lat]) => Math.abs(lon - 55.5) < 1.5 && Math.abs(lat + 21.1) < 1.5))
geometries.set('YT', split('FR', ([lon, lat]) => Math.abs(lon - 45.1) < 1 && Math.abs(lat + 12.8) < 1))

const features = []
for (const [iso, polys] of geometries) {
  if (!polys.length) throw new Error(`Vacío: ${iso}`)
  const w = byIso2.get(iso)
  const c = cl[iso]
  if (!w || !c) throw new Error(`Faltan datos: ${iso}`)

  const geometry = toGeom(roundGeom(polys))
  const f = { type: 'Feature', geometry }
  // Centro visual: centroide del polígono más grande (evita que islas lejanas lo desplacen)
  const main = polys.reduce((a, b) => (geoArea({ type: 'Polygon', coordinates: b }) > geoArea({ type: 'Polygon', coordinates: a }) ? b : a))
  const [cx, cy] = iso === 'AQ' ? [0, -75] : centroidOf(main)
  const [[x0, y0], [x1, y1]] = geoBounds(f)

  const capitalEn = w.capital?.[0] ?? c.capital
  f.properties = {
    iso2: iso,
    iso3: w.cca3,
    name: NAME[iso] ?? regionEs.of(iso),
    native: c.native,
    flag: flag(iso),
    capital: CAPITAL_BY_ISO[iso] ?? (capitalEn ? CAPITAL[capitalEn] ?? capitalEn : '—'),
    continent: CONTINENT[w.region],
    subregion: SUBREGION[w.subregion],
    languages: c.languages.map((l) => langEs.of(l)),
    currency: c.currency.map((k) => `${curEs.of(k)} (${k})`),
    phone: c.phone.map((p) => `+${p}`),
    centroid: [round(cx), round(cy)],
    bbox: [round(x0), round(y0), round(x1), round(y1)],
    area: geoArea(f),
  }
  // Para dibujar en el canvas equirectangular, ningún anillo puede saltar de -180 a 180
  if (crosses(polys)) {
    const cut = cutAntimeridian(toGeom(polys))
    f.geometry = toGeom(roundGeom(polygonsOf(cut)))
  }
  if (!f.properties.continent || !f.properties.subregion) throw new Error(`Región: ${iso} ${w.region}/${w.subregion}`)
  features.push(f)
}

const all = [...americas.features, ...features].sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'es'))
fs.writeFileSync(`${PROJECT}public/data/world.json`, JSON.stringify({ type: 'FeatureCollection', features: all }))
console.log(`${americas.features.length} de América + ${features.length} del resto = ${all.length}`)
for (const f of features) {
  const p = f.properties
  console.log(p.iso2, p.name, '|', p.capital, '|', p.continent, '/', p.subregion, '|', p.centroid.join(','), '|', p.languages.join(','))
}
