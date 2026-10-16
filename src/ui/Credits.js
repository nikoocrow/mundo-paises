/** Botón «Créditos» (abajo a la izquierda) con una tarjeta emergente animada. */
export default class Credits {
  constructor() {
    this.root = document.getElementById('credits')
    this.button = document.getElementById('credits-button')
    this.card = document.getElementById('credits-card')

    this.button.addEventListener('click', (e) => {
      e.stopPropagation()
      this.setOpen(!this.isOpen)
    })
    // Clic fuera de la tarjeta → cerrar
    document.addEventListener('pointerdown', (e) => {
      if (this.isOpen && !this.root.contains(e.target)) this.setOpen(false)
    })
    // Esc cierra la tarjeta antes que cualquier otra acción (fase de captura)
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape' || !this.isOpen) return
        e.stopImmediatePropagation()
        this.setOpen(false)
        this.button.focus()
      },
      true
    )
  }

  get isOpen() {
    return this.root.classList.contains('is-open')
  }

  setOpen(open) {
    this.root.classList.toggle('is-open', open)
    this.button.setAttribute('aria-expanded', String(open))
    this.card.setAttribute('aria-hidden', String(!open))
    this.card.inert = !open
  }
}
