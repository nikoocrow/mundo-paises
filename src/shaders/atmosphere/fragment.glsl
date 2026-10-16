uniform vec3 uSunDirection;
uniform vec3 uDayColor;
uniform vec3 uTwilightColor;

varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
  vec3 normal = normalize(vWorldNormal);

  // Cara trasera: la normal apunta hacia dentro, el borde es donde la vista es tangente
  float edge = dot(viewDirection, normal);
  float glow = smoothstep(0.0, 0.5, edge);
  glow = pow(glow, 2.4);

  float sun = dot(normal, uSunDirection);
  float day = smoothstep(-0.35, 0.6, sun);
  float twilight = smoothstep(-0.35, 0.05, sun) * (1.0 - smoothstep(0.05, 0.45, sun));

  vec3 color = mix(uDayColor, uTwilightColor, twilight * 0.6);
  float alpha = glow * (0.12 + 0.88 * day);
  gl_FragColor = vec4(color * alpha * 1.4, alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
