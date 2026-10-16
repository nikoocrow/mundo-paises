varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float strength = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(0.75, 0.85, 1.0), strength * vAlpha);
}
