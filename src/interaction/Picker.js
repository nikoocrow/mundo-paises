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
    this.ray = new THREE.Ray()
    this.sphere = new THREE.Sphere()
    this.inverse = new THREE.Matrix4()
    this.hit = new THREE.Vector3()
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
    // Intersección analítica con la esfera (en espacio local de la malla): mucho más barata
    // que recorrer sus ~36 000 triángulos en cada movimiento del puntero
    this.raycaster.setFromCamera(this.pointer, this.experience.camera.instance)
    this.earth.mesh.updateWorldMatrix(true, false)
    this.inverse.copy(this.earth.mesh.matrixWorld).invert()
    this.ray.copy(this.raycaster.ray).applyMatrix4(this.inverse)
    this.sphere.radius = this.earth.radius
    const hit = this.ray.intersectSphere(this.sphere, this.hit)
    if (!hit) return null
    const { lon, lat } = this.earth.localToLonLat(hit)
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
