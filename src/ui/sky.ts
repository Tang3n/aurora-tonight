/**
 * Full-screen "living sky": procedural aurora curtains in a fragment shader.
 * Brightness follows the real score, so a bad night literally looks dark.
 *
 * Rendered at reduced resolution (the curtains are soft anyway) and paused when the tab is hidden.
 */

const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FS = `
precision highp float;
uniform vec2 r; uniform float t; uniform float k;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.03; a *= .5; } return v; }

// One curtain: sharp lower edge (where electrons hit ~100 km), long soft top, vertical rays.
vec3 curtain(vec2 uv, float base, float seed, float spd){
  float x = uv.x * 1.3 + seed;
  float wave = fbm(vec2(x * 1.6, t * .05 * spd + seed)) * .32 - .16 + sin(x * 2.1 + t * .11 * spd) * .05;
  float y = uv.y - base - wave;
  float lower = exp(-pow(max(-y, 0.) * 24., 2.));
  float upper = exp(-max(y, 0.) * 3.2);
  float rays = .45 + .9 * pow(fbm(vec2(x * 22., t * .35 * spd + seed * 3.)), 2.2);
  vec3 green = vec3(.20, 1., .55), cyan = vec3(.15, .75, 1.), violet = vec3(.65, .30, 1.);
  vec3 col = mix(green, cyan, smoothstep(.02, .25, y));
  col = mix(col, violet, smoothstep(.18, .5, y));
  return col * lower * upper * rays;
}

void main(){
  vec2 uv = gl_FragCoord.xy / r; uv.x *= r.x / r.y;
  vec3 sky = mix(vec3(.012, .022, .05), vec3(.005, .008, .02), uv.y);
  vec2 g = gl_FragCoord.xy / 2.;
  float s = h(floor(g)); float tw = .6 + .4 * sin(t * 2. + s * 40.);
  sky += vec3(.8, .9, 1.) * step(.9975, s) * tw * smoothstep(.15, .6, uv.y);
  vec3 a = curtain(uv, .52, 0., 1.) + curtain(uv, .62, 7.3, .7) * .6 + curtain(uv, .44, 3.1, 1.3) * .45;
  sky += a * k;
  sky += vec3(.02, .12, .08) * k * smoothstep(.7, .2, uv.y) * .35;
  gl_FragColor = vec4(pow(sky, vec3(.95)), 1.);
}`;

export interface Sky {
  /** Score 0..100; the sky eases towards it over ~2 s. */
  setScore(score: number): void;
}

export function createSky(canvas: HTMLCanvasElement): Sky {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return { setScore() {} };

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // One oversized triangle covers the screen — no index buffer, no diagonal seam.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(prog, 'r');
  const uT = gl.getUniformLocation(prog, 't');
  const uK = gl.getUniformLocation(prog, 'k');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intensity = (score: number) => 0.12 + (score / 100) * 1.1;
  let k = intensity(0);
  let target = k;
  let running = false;

  const resize = () => {
    const scale = Math.min(devicePixelRatio, 1.5) * 0.6;
    canvas.width = Math.round(innerWidth * scale);
    canvas.height = Math.round(innerHeight * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (reduceMotion) draw(20);
  };

  const draw = (seconds: number) => {
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uT, seconds);
    gl.uniform1f(uK, k);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const start = performance.now();
  let last = start;
  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    k += (target - k) * Math.min(1, dt * 1.5);
    draw((now - start) / 1000);
    requestAnimationFrame(frame);
  };
  const play = () => {
    if (running || reduceMotion) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => (document.hidden ? (running = false) : play()));
  resize();
  play();

  return {
    setScore(score) {
      target = intensity(score);
      if (reduceMotion) {
        k = target;
        draw(20);
      }
    },
  };
}
