import * as THREE from 'three'
import vertexShader from '../shaders/atmosphere/vertex.glsl?raw'
import fragmentShader from '../shaders/atmosphere/fragment.glsl?raw'

/** Halo atmosférico (fresnel por la cara trasera) que se desvanece en el lado nocturno. */
export default class Atmosphere {
  constructor(experience, sunDirection) {
    const radius = experience.world.earth.radius
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSunDirection: { value: sunDirection },
        uDayColor: { value: new THREE.Color('#5fb0ff') },
        uTwilightColor: { value: new THREE.Color('#ff8a4c') },
      },
    })
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.14, 96, 48), this.material)
    experience.scene.add(this.mesh)
  }
}
