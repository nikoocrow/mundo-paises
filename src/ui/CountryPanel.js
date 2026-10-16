import { daylightLabel } from '../utils/sun.js'

/** Ficha lateral con la información del país visitado. */
export default class CountryPanel {
  constructor(onClose) {
    this.el = document.getElementById('panel')
    this.flag = document.getElementById('panel-flag')
    this.name = document.getElementById('panel-name')
    this.native = document.getElementById('panel-native')
    this.region = document.getElementById('panel-region')
    this.facts = document.getElementById('panel-facts')
    document.getElementById('panel-close').addEventListener('click', onClose)
    document.getElementById('panel-x').addEventListener('click', onClose)
  }

  open(feature, subsolar) {
    const p = feature.properties
    this.flag.textContent = p.flag
    this.name.textContent = p.name
    this.native.textContent = p.native !== p.name ? p.native : ''
    this.region.textContent = p.subregion

    const facts = [
      ['Ahora', daylightLabel(p.centroid[0], p.centroid[1], subsolar)],
      ['Capital', p.capital],
      ['Idiomas', p.languages.join(', ') || '—'],
      ['Moneda', p.currency.join(', ') || '—'],
      ['Prefijo telefónico', p.phone.join(', ') || '—'],
      ['Código ISO', `${p.iso2} · ${p.iso3}`],
      ['Coordenadas', `${Math.abs(p.centroid[1]).toFixed(1)}° ${p.centroid[1] >= 0 ? 'N' : 'S'}, ${Math.abs(p.centroid[0]).toFixed(1)}° ${p.centroid[0] >= 0 ? 'E' : 'O'}`],
    ]
    this.facts.innerHTML = facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')

    this.el.classList.remove('is-open')
    void this.el.offsetWidth // reinicia la animación de entrada
    this.el.classList.add('is-open')
    this.el.setAttribute('aria-hidden', 'false')
  }

  close() {
    this.el.classList.remove('is-open')
    this.el.setAttribute('aria-hidden', 'true')
  }
}
