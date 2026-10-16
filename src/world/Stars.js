import * as THREE from 'three'
import vertexShader from '../shaders/stars/vertex.glsl?raw'
import fragmentShader from '../shaders/stars/fragment.glsl?raw'

/** Campo de estrellas con leve titileo. */
export default class Stars {
  constructor(experience, count = 4000) {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const seeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      sizes[i] = Math.pow(Math.random(), 3) * 2.2 + 0.4
      seeds[i] = Math.random() * 100
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: experience.sizes.pixelRatio },
      },
    })

    this.points = new THREE.Points(geometry, this.material)
    experience.scene.add(this.points)
  }

  update(elapsed) {
    this.material.uniforms.uTime.value = elapsed
    this.points.rotation.y = elapsed * 0.004
  }
}
