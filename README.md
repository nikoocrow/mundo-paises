# Explora el mundo · Globo 3D

Experiencia en Three.js + Vite: un planeta Tierra (GLB exportado desde Blender) que rota sobre un fondo azul oscuro. Todos los países y territorios del mundo se pueden visitar haciendo clic en el globo o desde la lista lateral.

## Uso

El proyecto usa [Vite](https://vite.dev): **no funciona abriendo `index.html` directamente** (doble clic / `file://`), porque los estilos y el código se cargan a través de Vite. Requiere Node.js 20.19+ o 22.12+.

```bash
npm i          # instala las dependencias
npm run dev    # arranca el servidor de desarrollo
```

Luego abre `http://localhost:5173` (se abre solo en el navegador).

Para producción: `npm run build` genera `dist/` y `npm run preview` lo sirve localmente.

## Estructura

```
public/
  models/earth.glb        ← planeta (Tierra + nubes) exportado desde Blender
  data/world.json         ← 241 países/territorios del mundo (GeoJSON + datos en español)
  data/americas.json      ← fuente de los 54 de América (la usa scripts/build-world.mjs)
scripts/build-world.mjs   ← genera world.json: América + resto del mundo
assets-src/textures/      ← texturas fuente con las que se armó el GLB en Blender
src/
  core/        Experience (orquestador), Camera (vuelos), Renderer, Sizes, Time, Resources
  world/       World, Earth, Atmosphere, CountryLayer (fronteras/resaltado), Marker, Stars
  interaction/ Picker (raycast → UV → lon/lat → país)
  ui/          Loader, Tooltip, CountryPanel, CountryList
  shaders/     atmosphere/, stars/  (GLSL importado con ?raw)
  utils/       EventEmitter, easing
  styles/      main.css
```

## Controles

- Arrastrar: orbitar · Rueda: zoom
- Clic en un país: volar hasta él y ver su ficha
- `Esc` o «Volver al globo»: regresar a la vista general
- Enlace directo: `http://localhost:5173/#CO` abre Colombia

## Créditos de datos

- Texturas de la Tierra: NASA Blue Marble / Black Marble (vía el paquete `three-globe`)
- Fronteras: Natural Earth 1:50m (paquete `world-atlas`)
- Datos de países: paquetes `countries-list` y `world-countries` + nombres en español con `Intl.DisplayNames`

## Regenerar los datos

```bash
npm i --no-save world-atlas@2 topojson-client countries-list world-countries d3-geo-projection
node scripts/build-world.mjs
```
