import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import EventEmitter from '../utils/EventEmitter.js'

/** Carga el GLB del planeta y los datos de países, informando el progreso. */
export default class Resources extends EventEmitter {
  constructor() {
    super()
    this.manager = new THREE.LoadingManager()
    this.manager.onProgress = (_url, loaded, total) => this.emit('progress', loaded / total)
    this.gltfLoader = new GLTFLoader(this.manager)
  }

  async load() {
    const [earth, countries] = await Promise.all([
      this.gltfLoader.loadAsync('/models/earth.glb', (e) => {
        if (e.total) this.emit('progress', e.loaded / e.total)
      }),
      fetch('/data/world.json').then((r) => r.json()),
    ])
    this.items = { earth, countries }
    this.emit('ready', this.items)
    return this.items
  }
}
