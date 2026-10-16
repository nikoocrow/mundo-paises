import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { easeInOutCubic, lerp } from '../utils/easing.js'

export const OVERVIEW_DISTANCE = 3.6

export default class Camera {
  constructor(experience) {
    this.experience = experience
    const { sizes, canvas, scene } = experience

    this.instance = new THREE.PerspectiveCamera(38, sizes.width / sizes.height, 0.1, 200)
    // Arranca mirando un poco desde el norte, con América de frente
    this.instance.position.set(0, 0.9, OVERVIEW_DISTANCE).setLength(OVERVIEW_DISTANCE)
    scene.add(this.instance)

    this.controls = new OrbitControls(this.instance, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.enablePan = false
    this.controls.rotateSpeed = 0.45
    this.controls.zoomSpeed = 0.7
    this.controls.minDistance = 1.35
    this.controls.maxDistance = 7

    this.flight = null
  }

  /**
   * Vuela la cámara alrededor del globo hasta mirar en `direction` (vector unitario, mundo)
   * a una distancia `distance` del centro. Interpola sobre la esfera (slerp) con un pequeño "salto".
   */
  flyTo(direction, distance, duration = 1.8) {
    const fromPos = this.instance.position.clone()
    const fromDir = fromPos.clone().normalize()
    const toDir = direction.clone().normalize()
    const angle = fromDir.angleTo(toDir)

    this.flight = {
      t: 0,
      duration: duration * (0.6 + Math.min(angle / Math.PI, 1) * 0.6),
      fromDir,
      fromDist: fromPos.length(),
      toDist: distance,
      hop: Math.min(angle / Math.PI, 1) * 1.2,
      rotation: new THREE.Quaternion().setFromUnitVectors(fromDir, toDir),
    }
    this.controls.enabled = false
    return new Promise((resolve) => (this.flight.resolve = resolve))
  }

  resize() {
    const { sizes } = this.experience
    this.instance.aspect = sizes.width / sizes.height
    this.instance.updateProjectionMatrix()
  }

  update() {
    if (this.flight) {
      const f = this.flight
      f.t = Math.min(f.t + this.experience.time.delta / f.duration, 1)
      const k = easeInOutCubic(f.t)
      const q = new THREE.Quaternion().slerp(f.rotation, k)
      const dir = f.fromDir.clone().applyQuaternion(q)
      const dist = lerp(f.fromDist, f.toDist, k) + Math.sin(Math.PI * k) * f.hop
      this.instance.position.copy(dir.multiplyScalar(dist))
      this.instance.lookAt(0, 0, 0)

      if (f.t >= 1) {
        this.flight = null
        this.controls.enabled = true
        f.resolve?.()
      }
    }
    this.controls.update()
  }
}
