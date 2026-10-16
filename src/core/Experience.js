import * as THREE from 'three'
import Sizes from './Sizes.js'
import Time from './Time.js'
import Camera, { OVERVIEW_DISTANCE } from './Camera.js'
import Renderer from './Renderer.js'
import Resources from './Resources.js'
import World from '../world/World.js'
import Picker from '../interaction/Picker.js'
import UI from '../ui/UI.js'
import { clamp } from '../utils/easing.js'

/**
 * Orquestador: crea los sistemas, conecta eventos y define las acciones
 * de alto nivel (visitar un país / volver al globo).
 */
export default class Experience {
  constructor(canvas) {
    this.canvas = canvas
    this.sizes = new Sizes()
    this.time = new Time()
    this.scene = new THREE.Scene()
    this.camera = new Camera(this)
    this.renderer = new Renderer(this)
    this.resources = new Resources()
    this.world = new World(this)
    this.ui = new UI(this)

    this.selected = null

    this.sizes.on('resize', () => {
      this.camera.resize()
      this.renderer.resize()
    })
    this.time.on('tick', () => this.update())

    this.resources.on('progress', (p) => this.ui.loader.setProgress(p))
    this.resources.load().then((items) => this.onReady(items)).catch((err) => {
      console.error(err)
      this.ui.loader.error('No se pudo cargar el planeta. ¿Existe public/models/earth.glb?')
    })
  }

  onReady({ earth, countries }) {
    this.countries = countries.features
    this.byIso = new Map(this.countries.map((f) => [f.properties.iso2, f]))

    this.world.build(earth, this.countries)
    this.picker = new Picker(this, this.world.earth, this.countries)

    this.picker.on('hover', (feature) => {
      this.world.countries.setHovered(feature?.properties.iso2 ?? null)
      this.ui.tooltip.show(feature)
      this.canvas.style.cursor = feature ? 'pointer' : 'grab'
    })
    this.picker.on('select', (feature) => {
      if (feature) this.visit(feature.properties.iso2)
    })

    this.ui.onCountriesReady(this.countries)
    this.ui.loader.hide()

    const hash = decodeURIComponent(location.hash.slice(1)).toUpperCase()
    if (this.byIso.has(hash)) setTimeout(() => this.visit(hash), 600)
  }

  /** Vuela hasta un país y muestra su ficha. */
  async visit(iso) {
    const feature = this.byIso.get(iso)
    if (!feature) return
    this.selected = feature
    const { centroid, area } = feature.properties

    this.world.earth.autoRotate = false
    this.world.countries.setSelected(iso)
    this.world.marker.show(centroid[0], centroid[1])
    this.ui.panel.open(feature, this.world.subsolar)
    this.ui.list.setActive(iso)
    history.replaceState(null, '', `#${iso}`)

    // Distancia según el tamaño angular del país (área en estereorradianes)
    const angularRadius = Math.sqrt(area / Math.PI)
    const distance = clamp(1.55 + angularRadius * 4.5, 1.6, 3.4)
    const target = this.world.earth.lonLatToWorld(centroid[0], centroid[1]).normalize()
    // En pantallas anchas la cámara se corre a la derecha: el país queda a la izquierda del panel
    if (this.sizes.width > 900) {
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), target).normalize()
      target.addScaledVector(right, 0.08 * (distance - 1))
    }
    await this.camera.flyTo(target.normalize(), distance)
  }

  /** Vuelve a la vista general y reanuda la rotación. */
  async reset() {
    if (!this.selected) return
    this.selected = null
    this.world.countries.setSelected(null)
    this.world.marker.hide()
    this.ui.panel.close()
    this.ui.list.setActive(null)
    history.replaceState(null, '', location.pathname)

    const dir = this.camera.instance.position.clone().normalize()
    dir.y = clamp(dir.y, -0.2, 0.3)
    await this.camera.flyTo(dir.normalize(), OVERVIEW_DISTANCE, 1.4)
    if (!this.selected) this.world.earth.autoRotate = true
  }

  update() {
    this.camera.update()
    this.world.update()
    this.renderer.update()
  }
}
