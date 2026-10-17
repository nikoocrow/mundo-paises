import * as THREE from 'three'

const W = 4096
const H = 2048
const PAD = 8 // margen transparente alrededor del país resaltado (cubre el grosor del trazo)

const STYLE = {
  dim: 'rgba(3, 8, 22, 0.42)', // oscurece los océanos para resaltar los países
  base: { fill: 'rgba(90, 180, 255, 0.07)', stroke: 'rgba(150, 215, 255, 0.55)', width: 1.6 },
  hover: { fill: 'rgba(110, 200, 255, 0.32)', stroke: 'rgba(190, 235, 255, 1)', width: 3.5 },
  selected: { fill: 'rgba(255, 170, 70, 0.38)', stroke: 'rgba(255, 200, 120, 1)', width: 4.5 },
}

const project = ([lon, lat]) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H]

function paint(ctx, path, style) {
  ctx.lineJoin = 'round'
  ctx.fillStyle = style.fill
  ctx.fill(path, 'evenodd')
  ctx.strokeStyle = style.stroke
  ctx.lineWidth = style.width
  ctx.stroke(path)
}

/**
 * Capa de países dibujada en un canvas equirectangular (mismo espacio UV que la textura
 * de la Tierra) y aplicada sobre una copia de la malla del planeta.
 * La capa base es fija y se sube a la GPU una sola vez; el hover y el seleccionado van en
 * capas propias recortadas a la caja del país, así cambiar de país solo sube unos pocos píxeles.
 */
export default class CountryLayer {
  constructor(experience, earth, countries) {
    this.countries = countries
    this.byIso = new Map(countries.map((f) => [f.properties.iso2, f]))
    this.paths = new Map(countries.map((f) => [f.properties.iso2, this.buildPath(f.geometry)]))
    this.anisotropy = experience.renderer.instance.capabilities.getMaxAnisotropy()

    this.texture = this.createTexture(this.drawBase())
    this.mesh = this.createMesh(earth, new THREE.MeshBasicMaterial({ map: this.texture }), 1)

    this.hover = this.createHighlight(earth, STYLE.hover, 1.1)
    this.selection = this.createHighlight(earth, STYLE.selected, 1.2)
    this.hovered = null
    this.selected = null
  }

  buildPath(geometry) {
    const path = new Path2D()
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    for (const polygon of polygons) {
      for (const ring of polygon) {
        ring.forEach((coord, i) => {
          const [x, y] = project(coord)
          i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)
        })
        path.closePath()
      }
    }
    return path
  }

  /** Capa fija: velo + todos los países en estilo base. */
  drawBase() {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    // 1. Velo oscuro sobre todo el planeta…
    ctx.fillStyle = STYLE.dim
    ctx.fillRect(0, 0, W, H)

    // 2. …recortado donde hay tierra
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    for (const path of this.paths.values()) ctx.fill(path, 'evenodd')

    // 3. Relleno y fronteras de todos los países
    ctx.globalCompositeOperation = 'source-over'
    for (const path of this.paths.values()) paint(ctx, path, STYLE.base)
    return canvas
  }

  createTexture(canvas) {
    const texture = new THREE.CanvasTexture(canvas)
    texture.flipY = false // igual que las texturas del GLB
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = this.anisotropy
    return texture
  }

  createMesh(earth, material, renderOrder) {
    Object.assign(material, { transparent: true, depthWrite: false, toneMapped: false })
    const mesh = new THREE.Mesh(earth.mesh.geometry, material)
    mesh.scale.setScalar(1.0015)
    mesh.renderOrder = renderOrder
    earth.mesh.add(mesh)
    return mesh
  }

  createHighlight(earth, style, renderOrder) {
    const material = new THREE.MeshBasicMaterial()
    // Fuera de la caja del país no se dibuja nada (evita que los mipmaps del borde tiñan el globo)
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          if (any(lessThan(vMapUv, vec2(0.0))) || any(greaterThan(vMapUv, vec2(1.0)))) discard;
        #endif
        #include <map_fragment>`
      )
    }
    const mesh = this.createMesh(earth, material, renderOrder)
    mesh.visible = false
    return { mesh, style, iso: null }
  }

  /** Dibuja el país `iso` en la capa `layer`, en un canvas del tamaño de su caja. */
  setLayer(layer, iso) {
    if (iso === layer.iso) return
    layer.iso = iso
    const material = layer.mesh.material
    material.map?.dispose()
    material.map = null
    layer.mesh.visible = !!iso
    if (!iso) return

    const [minLon, minLat, maxLon, maxLat] = this.byIso.get(iso).properties.bbox
    // Si la caja cruza el antimeridiano (Rusia, Fiyi…) se usa todo el ancho
    const [x0, x1] = minLon > maxLon ? [0, W] : [project([minLon, 0])[0], project([maxLon, 0])[0]]
    const left = Math.max(0, Math.floor(x0) - PAD)
    const top = Math.max(0, Math.floor(project([0, maxLat])[1]) - PAD)
    const width = Math.min(W, Math.ceil(x1) + PAD) - left
    const height = Math.min(H, Math.ceil(project([0, minLat])[1]) + PAD) - top

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.translate(-left, -top)
    paint(ctx, this.paths.get(iso), layer.style)

    // uv del globo → uv del recorte
    const texture = this.createTexture(canvas)
    texture.repeat.set(W / width, H / height)
    texture.offset.set(-left / width, -top / height)
    material.map = texture
    material.needsUpdate = true
  }

  setHovered(iso) {
    this.hovered = iso
    this.setLayer(this.hover, iso !== this.selected ? iso : null)
  }

  setSelected(iso) {
    this.selected = iso
    this.setLayer(this.selection, iso)
    this.setLayer(this.hover, this.hovered !== iso ? this.hovered : null)
  }
}
