import * as THREE from 'three'
import Stars from './Stars.js'
import Earth from './Earth.js'
import Atmosphere from './Atmosphere.js'
import CountryLayer from './CountryLayer.js'
import Marker from './Marker.js'
import { subsolarPoint } from '../utils/sun.js'

/** Contenedor de todo lo que vive en la escena 3D. */
export default class World {
  constructor(experience) {
    this.experience = experience
    this.scene = experience.scene

    // Dirección del sol en el mundo; se recalcula cada frame según la hora real (UTC)
    this.sunDirection = new THREE.Vector3(-0.9, 0.35, 1).normalize()
    this.subsolar = subsolarPoint()
    this.subsolarUpdatedAt = 0

    this.sun = new THREE.DirectionalLight(0xffffff, 3.2)
    this.sun.position.copy(this.sunDirection).multiplyScalar(10)
    this.scene.add(this.sun)
    this.scene.add(new THREE.AmbientLight(0x3355aa, 0.25))

    this.stars = new Stars(experience)
  }

  build(gltf, countries) {
    this.earth = new Earth(this.experience, gltf, this.sunDirection)
    this.atmosphere = new Atmosphere(this.experience, this.sunDirection)
    this.countries = new CountryLayer(this.experience, this.earth, countries)
    this.marker = new Marker(this.experience, this.earth)
  }

  update() {
    const { delta, elapsed } = this.experience.time
    // El Sol avanza 0,25° por minuto: basta con recalcular el punto subsolar cada segundo
    if (elapsed - this.subsolarUpdatedAt > 1) {
      this.subsolar = subsolarPoint()
      this.subsolarUpdatedAt = elapsed
    }
    this.stars.update(elapsed)
    this.earth?.update(delta, this.subsolar)
    this.sun.position.copy(this.sunDirection).multiplyScalar(10)
    this.marker?.update(elapsed)
  }
}
