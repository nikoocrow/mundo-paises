import * as THREE from 'three'

/**
 * Planeta Tierra cargado desde el GLB exportado en Blender.
 * - Malla "Earth": color diurno, normal, rugosidad (océanos brillantes) y luces nocturnas (emisivo)
 * - Malla "Clouds": capa de nubes semitransparente
 * Las luces nocturnas solo se ven en el lado oscuro gracias a un parche del shader.
 */
export default class Earth {
  constructor(experience, gltf, sunDirection) {
    this.experience = experience
    this.sunDirection = sunDirection
    this.autoRotate = true
    this.rotationSpeed = 0.045 // rad/s

    this.group = new THREE.Group()
    this.group.add(gltf.scene)
    experience.scene.add(this.group)

    gltf.scene.traverse((o) => {
      if (!o.isMesh) return
      if (/cloud/i.test(o.name)) this.clouds = o
      else if (!this.mesh) this.mesh = o
    })
    if (!this.mesh) throw new Error('El GLB no contiene la malla de la Tierra')

    // Radio real de la esfera (el boundingSphere de GLTFLoader sale de la caja y vale r·√3)
    this.radius = new THREE.Vector3().fromBufferAttribute(this.mesh.geometry.attributes.position, 0).length()

    this.fitUvMapping()
    this.setupEarthMaterial()
    this.setupClouds()

    // Arranca con América mirando a la cámara
    const facing = this.lonLatToLocal(-72, 8).normalize()
    this.group.rotation.y = -Math.atan2(facing.x, facing.z)
    this.group.updateMatrixWorld(true)
  }

  /**
   * Deduce cómo se relacionan las UV del GLB con la geometría (longitud y latitud),
   * para convertir coordenadas geográficas en puntos 3D exactos sobre la malla.
   */
  fitUvMapping() {
    const pos = this.mesh.geometry.attributes.position
    const uv = this.mesh.geometry.attributes.uv
    const v = new THREE.Vector3()

    // Latitud: la v de la UV crece hacia el sur (convención glTF) → comprobamos el signo en Y
    let north = 0
    for (let i = 0; i < pos.count; i++) {
      if (uv.getY(i) < 0.1) north += pos.getY(i)
    }
    this.latSign = north > 0 ? 1 : -1

    // Longitud: phi = sign * 2π·u + offset, ajustado con vértices cercanos al ecuador
    const samples = []
    for (let i = 0; i < pos.count && samples.length < 400; i += 7) {
      v.fromBufferAttribute(pos, i)
      const u = uv.getX(i)
      if (Math.abs(v.y) < this.radius * 0.3 && u > 0.05 && u < 0.95) samples.push({ u, phi: Math.atan2(v.z, v.x) })
    }
    const a = samples[0]
    const b = samples.find((s) => Math.abs(s.u - a.u) > 0.08 && Math.abs(s.u - a.u) < 0.4)
    let dphi = b.phi - a.phi
    dphi = Math.atan2(Math.sin(dphi), Math.cos(dphi))
    this.lonSign = Math.sign(dphi / (b.u - a.u))
    this.lonOffset = a.phi - this.lonSign * 2 * Math.PI * a.u
  }

  /** Coordenadas geográficas → punto en el espacio local de la malla. */
  lonLatToLocal(lon, lat, altitude = 0) {
    const u = (lon + 180) / 360
    const phi = this.lonSign * 2 * Math.PI * u + this.lonOffset
    const la = THREE.MathUtils.degToRad(lat)
    const r = this.radius * (1 + altitude)
    return new THREE.Vector3(r * Math.cos(la) * Math.cos(phi), this.latSign * r * Math.sin(la), r * Math.cos(la) * Math.sin(phi))
  }

  lonLatToWorld(lon, lat, altitude = 0) {
    this.mesh.updateWorldMatrix(true, false)
    return this.mesh.localToWorld(this.lonLatToLocal(lon, lat, altitude))
  }

  setupEarthMaterial() {
    const material = this.mesh.material
    material.envMapIntensity = 0
    this.uniforms = {
      uSunView: { value: new THREE.Vector3() },
      uAtmoColor: { value: new THREE.Color('#4d9bff') },
    }
    if (material.emissiveMap) material.emissive.set(1, 1, 1)
    material.emissiveIntensity = 1.6

    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms)
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uSunView;
          uniform vec3 uAtmoColor;`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float sunOrientation = dot(normalize(vNormal), normalize(uSunView));
          float nightMix = smoothstep(0.12, -0.28, sunOrientation);
          totalEmissiveRadiance *= nightMix * vec3(1.0, 0.82, 0.55);`
        )
        .replace(
          '#include <opaque_fragment>',
          `float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 3.0);
          float dayMix = smoothstep(-0.25, 0.45, dot(normalize(vNormal), normalize(uSunView)));
          outgoingLight += uAtmoColor * fresnel * (0.15 + 0.85 * dayMix) * 0.9;
          #include <opaque_fragment>`
        )
    }
    material.needsUpdate = true
  }

  setupClouds() {
    if (!this.clouds) return
    const m = this.clouds.material
    m.transparent = true
    m.depthWrite = false
    m.opacity = 0.9
    m.envMapIntensity = 0
    this.clouds.renderOrder = 2
  }

  update(delta, subsolar) {
    if (this.autoRotate) this.group.rotation.y += delta * this.rotationSpeed
    if (this.clouds) this.clouds.rotation.y += delta * 0.008

    // El Sol queda anclado a la geografía: apunta al punto subsolar aunque el planeta gire
    if (subsolar) this.sunDirection.copy(this.lonLatToWorld(subsolar.lon, subsolar.lat)).normalize()

    const camera = this.experience.camera.instance
    camera.updateMatrixWorld()
    this.uniforms.uSunView.value.copy(this.sunDirection).transformDirection(camera.matrixWorldInverse)
  }
}
