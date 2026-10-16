export default class Tooltip {
  constructor() {
    this.el = document.getElementById('tooltip')
  }

  show(feature) {
    if (!feature) {
      this.el.classList.remove('is-visible')
      return
    }
    const { flag, name } = feature.properties
    this.el.innerHTML = `<span class="tooltip__flag">${flag}</span>${name}`
    this.el.classList.add('is-visible')
  }

  move(x, y) {
    this.el.style.transform = `translate(${x + 16}px, ${y + 14}px)`
  }
}
