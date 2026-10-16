import * as THREE from 'three'

const W = 4096
const H = 2048

const STYLE = {
  dim: 'rgba(3, 8, 22, 0.42)', // oscurece los océanos para resaltar los países
  base: { fill: 'rgba(90, 180, 255, 0.07)', stroke: 'rgba(150, 215, 255, 0.55)', width: 1.6 },
  hover: { fill: 'rgba(110, 200, 255, 0.32)', stroke: 'rgba(190, 235, 255, 1)', width: 3.5 },
  selected: { fill: 'rgba(255, 170, 70, 0.38)', stroke: 'rgba(255, 200, 120, 1)', width: 4.5 },
}

/**
 * Capa de países dibujada en un canvas equirectangular (mismo espacio UV que la textura
 * de la Tierra) y aplicada sobre una copia de la malla del planeta.
 */
export default class CountryLayer {
  constructor(experience, earth, countries) {
    this.countries = countries
    this.hovered = null
    this.selected = null

    this.canvas = document.createElement('canvas')
    this.canvas.width = W
    this.canvas.height = H
    this.ctx = this.canvas.getContext('2d')

    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.flipY = false // igual que las texturas del GLB
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.anisotropy = experience.renderer.instance.capabilities.getMaxAnisotropy()

    this.paths = new Map(countries.map((f) => [f.properties.iso2, this.buildPath(f.geometry)]))

    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    this.mesh = new THREE.Mesh(earth.mesh.geometry, material)
    this.mesh.scale.setScalar(1.0015)
    this.mesh.renderOrder = 1
    earth.mesh.add(this.mesh)

    this.draw()
  }

  project([lon, lat]) {
    return [((lon + 180) / 360) * W, ((90 - lat) / 180) * H]
  }

  buildPath(geometry) {
    const path = new Path2D()
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    for (const polygon of polygons) {
      for (const ring of polygon) {
        ring.forEach((coord, i) => {
          const [x, y] = this.project(coord)
          i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)
        })
        path.closePath()
      }
    }
    return path
  }

  /** Capa fija (velo + todos los países en estilo base); se dibuja una sola vez. */
  drawBase() {
    this.base = document.createElement('canvas')
    this.base.width = W
    this.base.height = H
    const ctx = this.base.getContext('2d')

    // 1. Velo oscuro sobre todo el planeta…
    ctx.fillStyle = STYLE.dim
    ctx.fillRect(0, 0, W, H)

    // 2. …recortado donde hay tierra
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    for (const path of this.paths.values()) ctx.fill(path, 'evenodd')

    // 3. Relleno y fronteras de todos los países
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineJoin = 'round'
    for (const path of this.paths.values()) this.paint(ctx, path, STYLE.base)
  }

  paint(ctx, path, style) {
    ctx.fillStyle = style.fill
    ctx.fill(path, 'evenodd')
    ctx.strokeStyle = style.stroke
    ctx.lineWidth = style.width
    ctx.stroke(path)
  }

  draw() {
    if (!this.base) this.drawBase()
    const ctx = this.ctx
    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(this.base, 0, 0)

    // Países resaltados encima de la capa base (el seleccionado, al final)
    ctx.lineJoin = 'round'
    if (this.hovered && this.hovered !== this.selected) this.paint(ctx, this.paths.get(this.hovered), STYLE.hover)
    if (this.selected) this.paint(ctx, this.paths.get(this.selected), STYLE.selected)
    this.texture.needsUpdate = true
  }

  setHovered(iso) {
    if (iso === this.hovered) return
    this.hovered = iso
    this.draw()
  }

  setSelected(iso) {
    if (iso === this.selected) return
    this.selected = iso
    this.draw()
  }
}
