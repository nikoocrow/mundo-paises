/** Emisor de eventos mínimo para comunicar módulos sin acoplarlos. */
export default class EventEmitter {
  constructor() {
    this._listeners = new Map()
  }

  on(name, callback) {
    if (!this._listeners.has(name)) this._listeners.set(name, new Set())
    this._listeners.get(name).add(callback)
    return () => this.off(name, callback)
  }

  off(name, callback) {
    this._listeners.get(name)?.delete(callback)
  }

  emit(name, ...args) {
    this._listeners.get(name)?.forEach((cb) => cb(...args))
  }
}
