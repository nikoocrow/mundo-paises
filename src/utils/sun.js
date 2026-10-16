const RAD = Math.PI / 180

const wrap180 = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180

/**
 * Punto subsolar (donde el Sol está en el cénit) para una fecha dada.
 * Aproximación del Almanaque Náutico (error < 0,1°), suficiente para el terminador.
 */
export function subsolarPoint(date = new Date()) {
  const d = date.getTime() / 86400000 - 10957.5 // días desde J2000.0 (1 ene 2000, 12:00 UTC)

  const g = (357.529 + 0.98560028 * d) * RAD // anomalía media
  const q = 280.459 + 0.98564736 * d // longitud media
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD // longitud eclíptica
  const e = (23.439 - 0.00000036 * d) * RAD // oblicuidad de la eclíptica

  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / RAD // ascensión recta
  const dec = Math.asin(Math.sin(e) * Math.sin(L)) / RAD // declinación
  const gmst = 18.697374558 + 24.06570982441908 * d // tiempo sidéreo de Greenwich (horas)

  return { lon: wrap180(ra - gmst * 15), lat: dec }
}

/** Altura del Sol sobre el horizonte (grados) en un punto, dado el punto subsolar. */
export function sunElevation(lon, lat, sub) {
  const cosZenith =
    Math.sin(lat * RAD) * Math.sin(sub.lat * RAD) +
    Math.cos(lat * RAD) * Math.cos(sub.lat * RAD) * Math.cos((lon - sub.lon) * RAD)
  return Math.asin(Math.max(-1, Math.min(1, cosZenith))) / RAD
}

/** Describe la luz en un punto: día, noche, amanecer o atardecer. */
export function daylightLabel(lon, lat, sub) {
  const elevation = sunElevation(lon, lat, sub)
  if (elevation > 6) return '☀️ De día'
  if (elevation < -6) return '🌙 De noche'
  // Si el Sol está al este del punto, es por la mañana
  return wrap180(sub.lon - lon) > 0 ? '🌅 Amaneciendo' : '🌇 Atardeciendo'
}
