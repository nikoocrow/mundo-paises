uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aSeed;
varying float vAlpha;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float twinkle = 0.65 + 0.35 * sin(uTime * (0.6 + fract(aSeed) * 1.8) + aSeed);
  vAlpha = twinkle;
  gl_PointSize = aSize * uPixelRatio * 1.6;
}
