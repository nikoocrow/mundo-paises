import * as THREE from 'three'

export default class Renderer {
  constructor(experience) {
    this.experience = experience
    const { canvas, sizes } = experience

    this.instance = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.instance.outputColorSpace = THREE.SRGBColorSpace
    this.instance.toneMapping = THREE.ACESFilmicToneMapping
    this.instance.toneMappingExposure = 1.05
    // Fondo transparente: el azul casi oscuro lo pone el CSS (degradado)
    this.instance.setClearColor(0x000000, 0)
    this.resize()
  }

  resize() {
    const { sizes } = this.experience
    this.instance.setSize(sizes.width, sizes.height)
    this.instance.setPixelRatio(sizes.pixelRatio)
  }

  update() {
    this.instance.render(this.experience.scene, this.experience.camera.instance)
  }
}
