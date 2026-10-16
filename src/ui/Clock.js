/** Indicador con la hora (local y UTC) a la que corresponde la iluminación del planeta. */
export default class Clock {
  constructor() {
    this.el = document.getElementById('clock-time')
    this.local = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' })
    this.utc = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    this.update()
    setInterval(() => this.update(), 15000)
  }

  update() {
    const now = new Date()
    this.el.textContent = `${this.local.format(now)} · ${this.utc.format(now)} UTC`
  }
}
