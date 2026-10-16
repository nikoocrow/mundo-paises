import * as THREE from 'three'

/** Pin luminoso con anillos pulsantes sobre el país visitado. */
export default class Marker {
  constructor(experience, earth) {
    this.earth = earth
    this.group = new THREE.Group()
    this.group.visible = false
    earth.mesh.add(this.group)

    const r = earth.radius
    const color = new THREE.Color('#ffb347')

    this.rings = [0, 1, 2].map(() => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.006, r * 0.0078, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })
      )
      this.group.add(ring)
      return ring
    })

    const beamHeight = r * 0.07
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.0012, r * 0.0012, beamHeight, 8, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, toneMapped: false })
    )
    beam.rotation.x = Math.PI / 2
    beam.position.z = beamHeight / 2
    this.group.add(beam)

    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.0045, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#fff1d6', toneMapped: false })
    )
    this.head.position.z = beamHeight
    this.group.add(this.head)
  }

  show(lon, lat) {
    const p = this.earth.lonLatToLocal(lon, lat, 0.002)
    this.group.position.copy(p)
    // Orienta el eje Z local del grupo según la normal de la superficie
    this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize())
    this.group.visible = true
    this.shownAt = performance.now()
  }

  hide() {
    this.group.visible = false
  }

  update(elapsed) {
    if (!this.group.visible) return
    const appear = Math.min((performance.now() - this.shownAt) / 600, 1)
    this.group.scale.setScalar(appear)
    this.rings.forEach((ring, i) => {
      const t = (elapsed * 0.6 + i / 3) % 1
      ring.scale.setScalar(1 + t * 4)
      ring.material.opacity = (1 - t) * 0.9
    })
  }
}
