const GROUPS = ['Norteamérica', 'Centroamérica', 'Caribe', 'Sudamérica', 'Europa', 'Asia', 'África', 'Oceanía', 'Antártida']
const AMERICA = new Set(['Norteamérica', 'Sudamérica'])

// América se divide en sus subregiones; el resto del mundo, por continente
const groupOf = (p) => (AMERICA.has(p.continent) ? p.subregion : p.continent)

// Nombres alternativos habituales que no salen de los datos
const ALIASES = {
  US: ['EEUU', 'EE. UU.', 'USA', 'Estados Unidos de América'],
  GB: ['UK', 'Inglaterra', 'Gran Bretaña', 'Escocia', 'Gales'],
  NL: ['Holanda'],
  MM: ['Birmania'],
  CZ: ['República Checa'],
  SZ: ['Suazilandia'],
  MK: ['Macedonia'],
  CD: ['RDC', 'Congo Kinsasa', 'Zaire'],
  CG: ['Congo Brazzaville'],
  KR: ['Corea'],
  KP: ['Corea'],
  VA: ['Vaticano'],
  AE: ['Emiratos', 'EAU'],
  TL: ['Timor Oriental'],
  CI: ["Cote d'Ivoire"],
  BY: ['Belarús'],
  FK: ['Falklands'],
  BO: ['Estado Plurinacional de Bolivia'],
  VE: ['República Bolivariana de Venezuela'],
}

const englishNames = new Intl.DisplayNames('en', { type: 'region' })

/** Quita tildes y pasa a minúsculas. */
const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Normaliza conservando, para cada carácter normalizado, su posición en el texto original. */
function normalizeWithMap(text) {
  let norm = ''
  const map = []
  for (let i = 0; i < text.length; i++) {
    const n = normalize(text[i])
    for (let k = 0; k < n.length; k++) map.push(i)
    norm += n
  }
  return { norm, map }
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Resalta con <mark> la coincidencia de `q` (normalizada) dentro de `text`. */
function highlight(text, q) {
  if (!q) return escapeHtml(text)
  const { norm, map } = normalizeWithMap(text)
  const at = norm.indexOf(q)
  if (at < 0) return escapeHtml(text)
  const start = map[at]
  const end = map[at + q.length - 1] + 1
  return `${escapeHtml(text.slice(0, start))}<mark>${escapeHtml(text.slice(start, end))}</mark>${escapeHtml(text.slice(end))}`
}

/** Distancia de edición (Levenshtein) con corte temprano si supera `max`. */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, cur[j])
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

/** Puntúa qué tan bien `text` (ya normalizado) coincide con la búsqueda `q`. */
function textScore(text, q) {
  if (text === q) return 100
  if (text.startsWith(q)) return 80
  if (text.split(/[\s\-'’().,]+/).some((w) => w.startsWith(q))) return 60
  if (q.length >= 2 && text.includes(q)) return 40
  return 0
}

/** Lista lateral de países agrupados por región, con buscador. */
export default class CountryList {
  constructor(onSelect, onPreview = () => {}) {
    this.onSelect = onSelect
    this.onPreview = onPreview
    this.el = document.getElementById('country-list')
    this.search = document.getElementById('search')
    this.sidebar = document.getElementById('sidebar')
    this.status = document.getElementById('search-status')
    this.entries = []
    this.results = []
    this.cursor = -1
    this.activeIso = null

    this.toggle = document.getElementById('sidebar-toggle')
    this.toggle.addEventListener('click', () => this.setOpen(!this.sidebar.classList.contains('is-open')))
    // En móvil, tocar el globo cierra la lista
    document.querySelector('canvas.webgl').addEventListener('pointerdown', () => {
      if (window.innerWidth < 900) this.setOpen(false)
    })
    this.search.addEventListener('input', () => this.update())
    this.search.addEventListener('keydown', (e) => this.onKey(e))
    this.search.addEventListener('blur', () => this.onPreview(null))
    this.el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-iso]')
      if (btn) this.select(btn.dataset.iso)
    })

    // Atajos globales: «/» o Ctrl/⌘+K enfocan el buscador
    window.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        this.setOpen(true)
        this.search.focus()
        this.search.select()
      }
    })
  }

  render(countries) {
    this.entries = countries.map(({ properties: p }) => {
      const english = englishNames.of(p.iso2)
      return {
        p,
        name: normalize(p.name),
        aliases: [p.native, english, ...(ALIASES[p.iso2] ?? [])].filter((s) => s && s !== p.name),
        capital: normalize(p.capital),
        regions: [p.continent, p.subregion].map(normalize),
        languages: p.languages.map(normalize),
        words: normalize(p.name).split(/[\s\-]+/),
      }
    })
    for (const e of this.entries) e.aliasesNorm = e.aliases.map(normalize)
    this.update()
  }

  /** Puntúa una entrada y devuelve { score, why } o null si no coincide. */
  match(e, q) {
    const candidates = [[textScore(e.name, q), null]]
    e.aliasesNorm.forEach((a, i) => candidates.push([textScore(a, q) * 0.9, e.aliases[i]]))
    const isoHit = q.length >= 2 && (q === e.p.iso2.toLowerCase() || q === e.p.iso3.toLowerCase())
    if (isoHit) candidates.push([70, `Código ${e.p.iso2} · ${e.p.iso3}`])
    candidates.push([textScore(e.capital, q) * 0.5, `Capital: ${e.p.capital}`])
    if (q.length >= 3) {
      if (e.regions.some((r) => r.startsWith(q))) candidates.push([12, e.p.subregion])
      const lang = e.languages.findIndex((l) => l.startsWith(q))
      if (lang >= 0) candidates.push([10, `Idioma: ${e.p.languages[lang]}`])
    }
    const [score, why] = candidates.reduce((a, b) => (b[0] > a[0] ? b : a))
    // Un código ISO exacto desempata a favor del país («es» → España)
    if (score > 0) return { score: score + (isoHit && score > 70 ? 15 : 0), why, approx: false }

    // Tolerancia a errores de tipeo: compara contra el nombre y cada palabra
    if (q.length >= 4) {
      const max = q.length >= 7 ? 2 : 1
      const targets = [e.name, ...e.words, ...e.aliasesNorm]
      const dist = Math.min(...targets.map((t) => editDistance(q, t.slice(0, q.length + 1), max)), ...targets.map((t) => editDistance(q, t.slice(0, q.length), max)))
      if (dist <= max) return { score: 5 - dist, why: null, approx: true }
    }
    return null
  }

  update() {
    const raw = this.search.value.trim()
    const q = normalize(raw)
    this.cursor = -1
    this.onPreview(null)

    if (!q) {
      this.results = []
      this.renderGroups()
      this.status.textContent = ''
      return
    }

    this.results = this.entries
      .map((e) => ({ e, ...this.match(e, q) }))
      .filter((r) => r.score)
      .sort((a, b) => b.score - a.score || a.e.p.name.localeCompare(b.e.p.name, 'es'))

    // Si hay coincidencias reales, las aproximadas sobran
    if (this.results.some((r) => !r.approx)) this.results = this.results.filter((r) => !r.approx)
    this.renderResults(q, raw)
    if (this.results.length) this.moveCursor(0)
  }

  renderGroups() {
    this.el.innerHTML = GROUPS.map((group) => {
      const items = this.entries.filter((e) => groupOf(e.p) === group)
      if (!items.length) return ''
      return `
        <section class="sidebar__group">
          <h3>${group} <small>${items.length}</small></h3>
          ${items.map((e) => this.itemHtml(e.p)).join('')}
        </section>`
    }).join('')
  }

  renderResults(q, raw) {
    const approx = this.results[0]?.approx
    const n = this.results.length
    this.status.textContent = !n
      ? ''
      : approx
        ? '¿Quisiste decir…?'
        : `${n} resultado${n === 1 ? '' : 's'}`

    if (!n) {
      this.el.innerHTML = `
        <div class="sidebar__empty">
          <p>Sin resultados para «${escapeHtml(raw)}»</p>
          <small>Prueba con el nombre, la capital, el código ISO o el idioma.</small>
        </div>`
      return
    }
    this.el.innerHTML = `<div class="sidebar__results" role="listbox">${this.results
      .map(({ e, why, approx }) => this.itemHtml(e.p, approx ? null : q, why))
      .join('')}</div>`
  }

  itemHtml(p, q = null, why = null) {
    const active = p.iso2 === this.activeIso ? ' is-active' : ''
    const detail = why ? `<span class="sidebar__detail">${highlight(why, q)}</span>` : q !== null ? `<span class="sidebar__detail">${escapeHtml(p.subregion)}</span>` : ''
    return `
      <button class="sidebar__item${active}" data-iso="${p.iso2}" role="option">
        <span class="sidebar__flag">${p.flag}</span>
        <span class="sidebar__text">
          <span class="sidebar__name">${highlight(p.name, q)}</span>
          ${detail}
        </span>
      </button>`
  }

  onKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!this.results.length) return
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      this.moveCursor((this.cursor + step + this.results.length) % this.results.length)
    } else if (e.key === 'Enter') {
      const r = this.results[Math.max(this.cursor, 0)]
      if (r) this.select(r.e.p.iso2)
    } else if (e.key === 'Escape') {
      // Con texto, Esc solo limpia el buscador (no vuelve al globo)
      e.stopPropagation()
      if (this.search.value) {
        this.search.value = ''
        this.update()
      } else {
        this.search.blur()
      }
    }
  }

  moveCursor(index) {
    const items = this.el.querySelectorAll('.sidebar__item')
    items[this.cursor]?.classList.remove('is-cursor')
    this.cursor = index
    const item = items[index]
    if (!item) return
    item.classList.add('is-cursor')
    item.scrollIntoView({ block: 'nearest' })
    // Resalta en el globo el resultado elegido con el teclado
    if (document.activeElement === this.search) this.onPreview(item.dataset.iso)
  }

  select(iso) {
    this.onPreview(null)
    this.onSelect(iso)
    if (window.innerWidth < 900) {
      this.setOpen(false)
      this.search.blur()
    }
  }

  setOpen(open) {
    this.sidebar.classList.toggle('is-open', open)
    this.toggle.setAttribute('aria-expanded', String(open))
    this.toggle.textContent = open ? '✕ Cerrar' : '☰ Países'
  }

  setActive(iso) {
    this.activeIso = iso
    this.el.querySelectorAll('.sidebar__item').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.iso === iso)
    })
  }
}
