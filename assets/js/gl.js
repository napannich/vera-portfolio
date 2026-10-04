/* Vera Napalkova — WebGL exhibition layer.
   Raw WebGL2. Each [data-gl] element gets a subdivided quad synced to its DOM rect.
   Hover melts texture A into texture B through an ink displacement map.
   Scroll velocity bends the quad and pushes a slight RGB split. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('gl');
  if (!canvas) return;
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) { root.classList.add('no-gl'); return; }
  root.classList.add('has-gl');

  const VERT = `#version 300 es
  precision highp float;
  in vec2 aPos;
  uniform vec2 uQuadPos, uQuadSize, uRes;
  uniform float uVel, uHover;
  out vec2 vUv;
  out float vVel;
  const float PI = 3.141592653589793;
  void main(){
    vUv = aPos;
    vVel = uVel;
    vec2 p = aPos * uQuadSize + uQuadPos;          // px, origin top-left
    // scroll-velocity bend: zero at the edges, peak in the middle
    p.y -= sin(aPos.x * PI) * uVel * 48.0;
    // slight lift toward the cursor on hover
    p.y += sin(aPos.x * PI) * sin(aPos.y * PI) * uHover * 10.0;
    vec2 clip = vec2(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0);
    gl_Position = vec4(clip, 0.0, 1.0);
  }`;

  const FRAG = `#version 300 es
  precision highp float;
  in vec2 vUv;
  in float vVel;
  uniform sampler2D uTexA, uTexB, uDisp, uGrain;
  uniform float uAspectA, uAspectB, uQuadAspect;
  uniform float uProgress, uHover, uTime, uReveal, uOpacity;
  out vec4 outColor;

  vec2 cover(vec2 uv, float texA, float quadA){
    vec2 s = texA > quadA ? vec2(quadA / texA, 1.0) : vec2(1.0, texA / quadA);
    return (uv - 0.5) * s + 0.5;
  }
  mat2 rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

  void main(){
    vec2 uv = vUv;
    // reveal wipe on scroll-in
    float edge = smoothstep(0.0, 0.85, uReveal * 1.9 - uv.y * 0.9);
    if (edge <= 0.001) discard;

    vec3 d = texture(uDisp, uv * 1.15 + vec2(uTime * 0.004, -uTime * 0.003)).rgb;
    vec2 push = vec2(d.r, d.b) - 0.5;

    float p = uProgress;
    vec2 uvA = cover(uv + rot(0.785) * push * 0.42 * p,          uAspectA, uQuadAspect);
    vec2 uvB = cover(uv + rot(-0.6)  * push * 0.42 * (1.0 - p),  uAspectB, uQuadAspect);

    // velocity-driven chromatic split, strongest at the edges
    float ca = clamp(abs(vVel) * 0.012, 0.0, 0.007) + uHover * 0.0022;
    vec3 a = vec3(
      texture(uTexA, uvA + vec2(ca, 0.0)).r,
      texture(uTexA, uvA).g,
      texture(uTexA, uvA - vec2(ca, 0.0)).b);
    vec3 b = vec3(
      texture(uTexB, uvB + vec2(ca, 0.0)).r,
      texture(uTexB, uvB).g,
      texture(uTexB, uvB - vec2(ca, 0.0)).b);

    vec3 col = mix(a, b, p);
    // film grain
    float g = texture(uGrain, uv * vec2(uQuadAspect, 1.0) * 2.4 + fract(uTime * 0.7)).r;
    col += (g - 0.5) * 0.045;
    // subtle vignette so planes sit in the dark
    float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
    col *= 0.9 + 0.1 * vig;

    outColor = vec4(col, edge * uOpacity);
  }`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s), src);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error('GL link failed:', gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  // subdivided grid so the plane can actually bend
  const SEG = 24, verts = [], idx = [];
  for (let y = 0; y <= SEG; y++) for (let x = 0; x <= SEG; x++) verts.push(x / SEG, y / SEG);
  for (let y = 0; y < SEG; y++) for (let x = 0; x < SEG; x++) {
    const i = y * (SEG + 1) + x;
    idx.push(i, i + 1, i + SEG + 1, i + 1, i + SEG + 2, i + SEG + 1);
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

  const U = {};
  ['uQuadPos','uQuadSize','uRes','uVel','uHover','uTexA','uTexB','uDisp','uGrain',
   'uAspectA','uAspectB','uQuadAspect','uProgress','uTime','uReveal','uOpacity']
    .forEach(n => U[n] = gl.getUniformLocation(prog, n));

  const texCache = new Map();
  function loadTex(src) {
    if (texCache.has(src)) return texCache.get(src);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 17, 14, 255]));
    const rec = { tex: t, aspect: 1, ready: false };
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.generateMipmap(gl.TEXTURE_2D);
      rec.aspect = img.naturalWidth / img.naturalHeight;
      rec.ready = true;
      document.dispatchEvent(new CustomEvent('gl:asset'));
    };
    img.src = src;
    texCache.set(src, rec);
    return rec;
  }
  function loadRepeat(src) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    img.src = src;
    return t;
  }
  const dispTex = loadRepeat('assets/gl/disp.webp');
  const grainTex = loadRepeat('assets/gl/grain.webp');

  const items = [...document.querySelectorAll('[data-gl]')].map(el => ({
    el,
    a: loadTex(el.dataset.gl),
    b: loadTex(el.dataset.glB || el.dataset.gl),
    hover: 0, target: 0, reveal: 0, rect: null
  }));
  if (!items.length) return;

  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    measure();
  }
  function measure() { items.forEach(it => it.rect = it.el.getBoundingClientRect()); }
  window.addEventListener('resize', resize);
  window.addEventListener('load', measure);
  document.addEventListener('gl:remeasure', measure);

  items.forEach(it => {
    const on = () => { it.target = 1; document.dispatchEvent(new CustomEvent('ui:tick')); };
    const off = () => { it.target = 0; };
    it.el.addEventListener('pointerenter', on);
    it.el.addEventListener('pointerleave', off);
    it.el.addEventListener('focusin', on);
    it.el.addEventListener('focusout', off);
  });

  let smooth = window.scrollY, vel = 0, t0 = performance.now();
  function frame(now) {
    const dt = Math.min((now - t0) / 1000, 0.05); t0 = now;
    const y = window.scrollY;
    const prev = smooth;
    smooth += (y - smooth) * Math.min(1, dt * 9);
    vel += ((smooth - prev) - vel) * Math.min(1, dt * 7);
    if (Math.abs(vel) < 0.02) vel = 0;
    vel = Math.max(-28, Math.min(28, vel));

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uTime, now / 1000);
    gl.uniform1f(U.uVel, reduce ? 0 : vel);
    gl.uniform1i(U.uTexA, 0); gl.uniform1i(U.uTexB, 1);
    gl.uniform1i(U.uDisp, 2); gl.uniform1i(U.uGrain, 3);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, dispTex);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, grainTex);

    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      it.rect = r;
      if (r.bottom < -200 || r.top > H + 200 || r.width < 2) continue;
      it.hover += (it.target - it.hover) * Math.min(1, dt * (it.target ? 6 : 8));
      const seen = 1 - Math.max(0, Math.min(1, (r.top - H * 0.08) / (H * 0.62)));
      it.reveal += (seen - it.reveal) * Math.min(1, dt * 6);

      gl.uniform2f(U.uQuadPos, r.left, r.top);
      gl.uniform2f(U.uQuadSize, r.width, r.height);
      gl.uniform1f(U.uQuadAspect, r.width / r.height);
      gl.uniform1f(U.uAspectA, it.a.aspect);
      gl.uniform1f(U.uAspectB, it.b.aspect);
      gl.uniform1f(U.uProgress, reduce ? 0 : it.hover);
      gl.uniform1f(U.uHover, it.hover);
      gl.uniform1f(U.uReveal, reduce ? 1 : it.reveal);
      gl.uniform1f(U.uOpacity, it.el.dataset.glOpacity ? +it.el.dataset.glOpacity : 1);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, it.a.tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, it.b.tex);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    }
    requestAnimationFrame(frame);
  }
  resize();
  requestAnimationFrame(frame);
})();
