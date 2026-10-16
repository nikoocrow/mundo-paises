import EventEmitter from '../utils/EventEmitter.js'

/** Bucle de animación: emite 'tick' con delta (s) y tiempo transcurrido (s). */
export default class Time extends EventEmitter {
  constructor() {
    super()
    this.start = performance.now()
    this.current = this.start
    this.elapsed = 0
    this.delta = 0.016
    requestAnimationFrame(() => this.tick())
  }

  tick() {
    const now = performance.now()
    this.delta = Math.min((now - this.current) / 1000, 0.1)
    this.current = now
    this.elapsed = (now - this.start) / 1000
    this.emit('tick')
    requestAnimationFrame(() => this.tick())
  }
}
