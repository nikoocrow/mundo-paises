// Optimiza public/models/earth.glb: la textura de nubes (PNG RGBA de 6 MB, con RGB siempre blanco)
// pasa a WebP en escala de grises con solo el canal alfa. Earth.js la usa como alphaMap.
// Parte siempre de la fuente sin pérdida (assets-src), así que se puede ejecutar varias veces.
// Uso: npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 sharp
//      node scripts/optimize-glb.mjs
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions'
import sharp from 'sharp'

const PROJECT = new URL('..', import.meta.url).pathname
const GLB = `${PROJECT}public/models/earth.glb`
const CLOUDS = `${PROJECT}assets-src/textures/earth_clouds.png`

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(GLB)
const root = doc.getRoot()

const material = root.listMaterials().find((m) => /cloud/i.test(m.getName()))
const texture = material?.getBaseColorTexture()
if (!texture) throw new Error('No se encontró la textura de las nubes')

// q95: PSNR ≈ 46 dB frente al alfa original (error máx. 7/255), indistinguible a la vista
const { width, height } = await sharp(CLOUDS).metadata()
const alpha = await sharp(CLOUDS).extractChannel(3).raw().toBuffer()
const webp = await sharp(alpha, { raw: { width, height, channels: 1 } })
  .toColourspace('srgb')
  .webp({ quality: 95, effort: 6 })
  .toBuffer()

doc.createExtension(EXTTextureWebP).setRequired(true)
texture.setImage(new Uint8Array(webp)).setMimeType('image/webp').setURI('')
material.setExtras({ ...material.getExtras(), alphaFromLuminance: true })

await io.write(GLB, doc)
console.log(`Nubes: ${(webp.length / 1024).toFixed(0)} KB · GLB listo`)
