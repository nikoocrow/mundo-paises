export default class Loader {
  constructor() {
    this.el = document.getElementById('loader')
    this.pct = document.getElementById('loader-pct')
  }

  setProgress(p) {
    this.pct.textContent = `${Math.round(Math.min(p, 1) * 100)}%`
  }

  hide() {
    this.el.classList.add('is-hidden')
    document.body.classList.add('is-ready')
  }

  error(message) {
    this.el.querySelector('.loader__text').textContent = message
    this.el.classList.add('is-error')
  }
}
