import EventEmitter from '../utils/EventEmitter.js'

export default class Sizes extends EventEmitter {
  constructor() {
    super()
    this.update()
    window.addEventListener('resize', () => {
      this.update()
      this.emit('resize')
    })
  }

  update() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.pixelRatio = Math.min(window.devicePixelRatio, 2)
  }
}
