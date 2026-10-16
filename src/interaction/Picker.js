import * as THREE from 'three'
import { geoContains } from 'd3-geo'
import EventEmitter from '../utils/EventEmitter.js'

/**
 * Convierte el puntero en un país: raycast contra la Tierra → UV → lon/lat → polígono.
 * Emite 'hover' (feature | null) y 'select' (feature | null).
 */
export default class Picker extends EventEmitter {
  constructor(experience, earth, countries) {
    super()
    this.experience = experience
    this.earth = earth
    this.countries = countries
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.hovered = null
    this.pending = false
    this.down = null

    const canvas = experience.canvas
    canvas.addEventListener('pointermove', (e) => this.onMove(e))
    canvas.addEventListener('pointerleave', () => this.setHovered(null))
    canvas.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY }))
    canvas.addEventListener('pointerup', (e) => this.onUp(e))
  }

  updatePointer(e) {
    const { width, height } = this.experience.sizes
    this.pointer.set((e.clientX / width) * 2 - 1, -(e.clientY / height) * 2 + 1)
    this.clientX = e.clientX
    this.clientY = e.clientY
  }

  onMove(e) {
    this.updatePointer(e)
    this.experience.ui.tooltip.move(e.clientX, e.clientY)
    if (this.pending) return
    this.pending = true
    requestAnimationFrame(() => {
      this.pending = false
      this.setHovered(this.pick())
    })
  }

  onUp(e) {
    if (!this.down) return
    const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y)
    this.down = null
    if (moved > 6) return // fue un arrastre para orbitar, no un clic
    this.updatePointer(e)
    const feature = this.pick()
    if (feature) this.emit('select', feature)
  }

  pick() {
    this.raycaster.setFromCamera(this.pointer, this.experience.camera.instance)
    const hit = this.raycaster.intersectObject(this.earth.mesh, false)[0]
    if (!hit?.uv) return null
    const lon = hit.uv.x * 360 - 180
    const lat = 90 - hit.uv.y * 180
    return this.findCountry(lon, lat)
  }

  findCountry(lon, lat) {
    const point = [lon, lat]
    for (const f of this.countries) {
      const [minLon, minLat, maxLon, maxLat] = f.properties.bbox
      if (lat < minLat - 0.5 || lat > maxLat + 0.5) continue
      const wraps = minLon > maxLon // la caja cruza el antimeridiano (p. ej. Alaska)
      const inLon = wraps ? lon >= minLon - 0.5 || lon <= maxLon + 0.5 : lon >= minLon - 0.5 && lon <= maxLon + 0.5
      if (!inLon) continue
      if (geoContains(f, point)) return f
    }
    return null
  }

  setHovered(feature) {
    if (feature === this.hovered) return
    this.hovered = feature
    this.emit('hover', feature)
  }
}
