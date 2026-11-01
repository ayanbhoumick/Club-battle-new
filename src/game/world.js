import * as THREE from 'three';
import { Geo, vertexMat } from './voxel.js';
import * as T from './textures.js';
import { LEAD, GAP, PIPE_W, PAD_HALF, CEIL, START_Y } from './sim.js';

const VIEW_H = 18.8, FOV = 40, CAM_Y = 6.4, CAM_DIST = (VIEW_H / 2) / Math.tan((FOV / 2) * Math.PI / 180);
const CH = 60, NCH = 3, ROAD_Y = -0.8;
const R = (seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const between = (rnd, a, b) => a + rnd() * (b - a);

// ------------------------------------------------------------------ voxel sprites
const BIRD = [
  '......dd......', '.....dddd.....', '....dppppd....', '.dddddddddddd.',
  '..wwwwwwwwww..', '.wwwwwwwwkhww.', '.wwwwwwwwkkwoo', '.wwwwwwwwwwwoo',
  'pwwwwwwwwwwwo.', 'ppwwwwwwwwww..', '.pwwwwwwwwww..', '..vvvvvvvvvv..', '...vvvvvvvv...', '....o...o.....'];
const BIRD_PAL = { d: '#2a1d3f', p: '#ff7ac8', w: '#fff1dc', v: '#e6cfb4', k: '#1a1226', h: '#ffffff', o: '#ff9a2e' };
const WING = ['.pppp', 'pppPp', '.pPP.', '..P..'];
const WING_PAL = { p: '#ff7ac8', P: '#d84fa0' };
const HEART = ['.kk.kk.', 'kwkkkkk', 'kkkkkkk', '.kkkkk.', '..kkk..', '...k...'];
const HEART_PAL = { k: '#ff3d7f', w: '#ffd1e6' };
const BAT_A = ['b.....b', 'bb.b.bb', '.bbbbb.'], BAT_B = ['.......', '.b.b.b.', 'bbbbbbb', '..b.b..'];
const BAT_PAL = { b: '#120a22' };

const mat = (o) => new THREE.MeshBasicMaterial(o);
const COIN_GEO = new THREE.CylinderGeometry(.42, .42, .14, 20).rotateX(Math.PI / 2), COIN_IN_GEO = new THREE.CylinderGeometry(.28, .28, .16, 20).rotateX(Math.PI / 2);
const COIN_RIM = mat({ color: '#c98a00' }), COIN_FACE = mat({ color: '#ffd24a' }), COIN_FACE2 = mat({ color: '#ffe98a' });

export class World {
  constructor(canvas, { pixel = 3, onFrame = null, onBird = null, mode = 'menu', fonts = true, infinite = false } = {}) {
    this.canvas = canvas; this.onBird = onBird; this.pixel = pixel; this.onFrame = onFrame; this.mode = mode; this.infinite = infinite;
    this.time = 0; this.running = false; this.paused = false; this.shake = 0; this.menuX = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
    this.renderer.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.scene.background = T.skyTex();
    this.scene.fog = new THREE.Fog('#3a1c4a', 24, 82);
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);
    this.camX = 0; this.camY = CAM_Y;
    this.halo = T.haloTex();
    this.signs = [];
    this.buildCity(); this.buildBird(); this.buildBats(); this.buildParticles();
    this.levelGroup = new THREE.Group(); this.scene.add(this.levelGroup);
    this.resize();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas.parentElement || canvas);
    this.vis = () => { this.last = performance.now(); }; document.addEventListener('visibilitychange', this.vis);
    if (fonts && document.fonts) document.fonts.ready.then(() => this.signs.forEach(t => t.userData.redraw()));
  }

  // ---------------------------------------------------------------- sizing
  resize() {
    const host = this.canvas.parentElement || this.canvas;
    const w = Math.max(2, host.clientWidth), h = Math.max(2, host.clientHeight);
    this.aspect = w / h;
    this.renderer.setSize(Math.ceil(w / this.pixel), Math.ceil(h / this.pixel), false);
    this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
    this.camera.aspect = this.aspect;
    // Never show less than ~8.4 units of width so landscape/portrait both play fairly.
    this.camera.fov = FOV; this.camera.updateProjectionMatrix();
    this.halfW = (VIEW_H / 2) * this.aspect;
  }
  setPixel(p) { this.pixel = p; this.resize(); }

  // ---------------------------------------------------------------- city
  buildCity() {
    this.chunks = [];
    const ground = T.groundTex(), road = T.roadTex();
    this.groundTex = ground; this.roadTex = road;
    this.sideMat = {}; T.PALETTES.forEach((p, i) => (this.sideMat[i] = mat({ color: p.trim })));
    this.roofMat = mat({ color: '#1c2430' });
    for (let k = 0; k < NCH; k++) { const g = this.makeChunk(k + 1); g.userData.idx = k; g.position.x = (k - 1) * CH; this.scene.add(g); this.chunks.push(g); }
    // ground strips are infinite-ish and follow the camera
    const sw = new THREE.Mesh(new THREE.BoxGeometry(CH * NCH, 0.8, 5.2), [mat({ color: '#38465a' }), mat({ color: '#38465a' }), mat({ map: ground }), mat({ color: '#10151c' }), mat({ map: ground }), mat({ map: ground })]);
    ground.repeat.set(CH * NCH / 2, 2.6); sw.position.set(0, -0.4, -4.6);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(CH * NCH, 0.8, 0.3), mat({ color: '#4a5c72' })); curb.position.set(0, -0.4, -1.85);
    const rd = new THREE.Mesh(new THREE.PlaneGeometry(CH * NCH, 24), mat({ map: road })); rd.rotation.x = -Math.PI / 2; rd.position.set(0, ROAD_Y, 10);
    road.repeat.set(CH * NCH / 2, 12);
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(CH * NCH, 0.16), mat({ color: '#4b5568' })); dash.rotation.x = -Math.PI / 2; dash.position.set(0, ROAD_Y + 0.01, 4.4);
    this.groundGroup = new THREE.Group(); this.groundGroup.add(sw, curb, rd, dash); this.scene.add(this.groundGroup);
  }

  makeChunk(seed) {
    const rnd = R(seed * 4421 + 7), grp = new THREE.Group(), props = new Geo();
    const halos = [];
    const pushB = (w, h, d, x, z, tex, pal) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [this.sideMat[pal], this.sideMat[pal], this.roofMat, this.roofMat, mat({ map: tex }), mat({ map: tex })]);
      m.position.set(x + w / 2, h / 2, z); grp.add(m); return m;
    };
    // far layer
    let x = -2, n = 0;
    while (x < CH) { const w = between(rnd, 6, 10), h = between(rnd, 14, 30); const pal = Math.floor(rnd() * 5);
      pushB(w, h, 6, x, -38 + rnd() * 3, T.facadeTex(w, h, seed * 50 + n, { pal: T.PALETTES[pal], shop: false, litBias: .2 }), pal); x += w + between(rnd, .2, 2); n++; }
    // clock tower
    const clk = new THREE.Mesh(new THREE.BoxGeometry(5, 36, 5), [this.sideMat[2], this.sideMat[2], this.roofMat, this.roofMat, mat({ map: T.clockTex() }), mat({ map: T.clockTex() })]);
    clk.position.set(CH * 0.62, 18, -30); grp.add(clk);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(3.6, 7, 4), mat({ color: '#1b1230' })); tip.rotation.y = Math.PI / 4; tip.position.set(CH * 0.62, 39.5, -30); grp.add(tip);
    // mid layer (with a neon sign somewhere)
    x = -1; n = 0; const signs = ['HALLOWEEN', 'FACT CHECK', 'NEWS 24', 'TRICK', 'REAL?'];
    while (x < CH) {
      const withSign = n === 2 || n === 5; const w = withSign ? 10 : between(rnd, 6.5, 9), h = between(rnd, 10, 18); const pal = Math.floor(rnd() * 5);
      const sign = withSign ? { text: signs[(seed + n) % signs.length], color: n === 2 ? '#ffd27a' : '#7ee8d6', bg: n === 2 ? '#3a1d0c' : '#08302c' } : null;
      const tex = T.facadeTex(w, h, seed * 90 + n, { pal: T.PALETTES[pal], shop: true, sign }); if (sign) this.signs.push(tex);
      pushB(w, h, 7, x, -17, tex, pal);
      // roof props
      if (rnd() > .5) props.box(x + w * .3, h, -17.5, 1.2, 2 + rnd() * 2, 1.2, '#2a2436');
      if (rnd() > .6) { props.box(x + w * .65, h, -17, .2, 3.4, .2, '#161320'); props.box(x + w * .65 - .5, h + 2.4, -17, 1.2, .15, .15, '#161320'); }
      x += w + between(rnd, .5, 1.8); n++;
    }
    // near row (low houses) + pumpkins on stoops
    x = -3; n = 0;
    while (x < CH) {
      const w = between(rnd, 5, 8), h = between(rnd, 4.2, 7.2); const pal = Math.floor(rnd() * 5);
      pushB(w, h, 4, x, -8.6, T.facadeTex(w, h, seed * 130 + n, { pal: T.PALETTES[pal], shop: false, litBias: .5 }), pal);
      props.box(x + w * .5 - 1.4, h, -8.6 - 2, 2.8, .35, 4.4, '#222b36'); // parapet
      if (rnd() > .35) this.pumpkin(props, x + between(rnd, .8, w - .8), -5.9 - rnd() * .6, .7 + rnd() * .35);
      x += w + between(rnd, .4, 1.6); n++;
    }
    // sidewalk props
    for (let lx = 6; lx < CH; lx += 15) { const head = this.lamp(props, lx + rnd() * 3, -3.4); halos.push(head); }
    for (let i = 0; i < 4; i++) this.bush(props, between(rnd, 0, CH), -3.2 - rnd() * 1.6, .8 + rnd() * .5);
    for (let i = 0; i < 2; i++) this.trash(props, between(rnd, 0, CH), -3.0);
    for (let i = 0; i < 2; i++) this.car(props, between(rnd, 3, CH - 6), -2.9, ['#8f3b2d', '#38615f', '#c0903a', '#5a4a7a'][Math.floor(rnd() * 4)]);
    grp.add(new THREE.Mesh(props.build(), vertexMat()));
    for (const [hx, hy, hz] of halos) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.halo, color: '#ffb866', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .75 }));
      s.scale.set(4.4, 4.4, 1); s.position.set(hx, hy, hz); grp.add(s);
    }
    return grp;
  }
  lamp(g, x, z) {
    g.box(x - .09, 0, z - .09, .18, 4.6, .18, '#1a1d24'); g.box(x - .22, 0, z - .22, .44, .35, .44, '#2a2f3a');
    g.box(x - .09, 4.5, z - .09, 1.0, .16, .16, '#1a1d24');
    g.box(x + .6, 4.12, z - .27, .7, .38, .54, '#ffd27a'); g.box(x + .52, 4.5, z - .3, .86, .12, .6, '#14161c');
    return [x + .95, 4.2, z + .4];
  }
  trash(g, x, z) { g.box(x, 0, z, .6, .85, .6, '#6f7f8a'); g.box(x - .05, .85, z - .05, .7, .14, .7, '#56646e'); g.box(x, .4, z + .6, .6, .06, .02, '#4a5864'); }
  bush(g, x, z, s) { g.box(x, 0, z, 1.6 * s, .9 * s, 1.1 * s, '#2a5236'); g.box(x + .15 * s, .9 * s, z + .1 * s, 1.1 * s, .5 * s, .8 * s, '#3a7447'); g.box(x + .3 * s, 1.2 * s, z + .2 * s, .4 * s, .2 * s, .4 * s, '#d9456b'); }
  pumpkin(g, x, z, s) {
    g.box(x, 0, z, 1.2 * s, 1 * s, 1.1 * s, '#ff8a1e'); g.box(x + .1 * s, .15 * s, z - .05 * s, 1 * s, .7 * s, 1.2 * s, '#ff9d32'); g.box(x + .5 * s, 1 * s, z + .4 * s, .2 * s, .3 * s, .2 * s, '#2f5a2a');
    const f = '#ffe9a0'; g.box(x + .25 * s, .55 * s, z + 1.1 * s, .2 * s, .2 * s, .03, f); g.box(x + .75 * s, .55 * s, z + 1.1 * s, .2 * s, .2 * s, .03, f); g.box(x + .3 * s, .2 * s, z + 1.1 * s, .6 * s, .14 * s, .03, f);
  }
  car(g, x, z, c) {
    g.box(x, .35, z - .6, 3.4, .75, 1.3, c); g.box(x + .7, 1.1, z - .55, 1.9, .6, 1.2, '#1b2530'); g.box(x + .6, 1.1, z - .6, .1, .6, 1.3, c);
    [[.3, 0], [2.4, 0]].forEach(([wx]) => { g.box(x + wx, 0, z + .65, .7, .55, .22, '#0c0e12'); g.box(x + wx, 0, z - .87, .7, .55, .22, '#0c0e12'); });
    g.box(x + 3.35, .6, z - .45, .08, .22, .3, '#ffe9a0'); g.box(x + 3.35, .6, z + .15, .08, .22, .3, '#ffe9a0');
  }

  // ---------------------------------------------------------------- bird
  buildBird() {
    const s = .085;
    this.bird = new THREE.Group();
    this.birdBody = new THREE.Mesh(new Geo().sprite(BIRD, BIRD_PAL, s, 5, 0, -0.62).build(), vertexMat());
    this.bird.add(this.birdBody);
    const wg = new Geo().sprite(WING, WING_PAL, s, 1, 0.38, -0.33).build();
    this.wings = [0, 1].map(i => { const piv = new THREE.Group(); const m = new THREE.Mesh(wg, vertexMat()); m.position.set(-.1, -.1, 0); piv.add(m); piv.position.set(-.5, .05, i ? .27 : -.27); this.bird.add(piv); return piv; });
    this.bird.visible = false; this.scene.add(this.bird);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(.55, 14), mat({ color: '#000', transparent: true, opacity: .4, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2; this.scene.add(this.shadow);
    this.flapT = 1; this.fall = null; this.birdPos = new THREE.Vector3(LEAD, START_Y, 0);
  }
  buildBats() {
    const a = new THREE.Mesh(new Geo().sprite(BAT_A, BAT_PAL, .22, 1).build(), vertexMat()), b = new THREE.Mesh(new Geo().sprite(BAT_B, BAT_PAL, .22, 1).build(), vertexMat());
    this.bats = [];
    for (let i = 0; i < 7; i++) { const g = new THREE.Group(); const A = a.clone(), B = b.clone(); B.visible = false; g.add(A, B); g.scale.setScalar(1.8 + (i % 3) * .6); g.userData = { A, B, off: i * 17.3, sp: 1.2 + (i % 4) * .5, y: 8 + (i * 1.9) % 9, z: -10 - (i % 4) * 5, ph: i }; this.scene.add(g); this.bats.push(g); }
  }
  buildParticles() {
    this.N = 220; this.parts = [];
    this.inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat({ color: '#fff' }), this.N);
    this.inst.frustumCulled = false; this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dummy = new THREE.Object3D(); this.col = new THREE.Color();
    for (let i = 0; i < this.N; i++) { this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); this.inst.setMatrixAt(i, this.dummy.matrix); this.inst.setColorAt(i, this.col.set('#fff')); }
    this.scene.add(this.inst);
  }
  burst(x, y, z, colors, n, { speed = 4, up = 2, life = .7, size = .14, grav = 9 } = {}) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= this.N) this.parts.shift();
      const a = Math.random() * Math.PI * 2, sp = speed * (.3 + Math.random() * .8);
      this.parts.push({ x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .8 + up * Math.random(), vz: (Math.random() - .5) * sp, life: life * (.6 + Math.random() * .6), t: 0, s: size * (.6 + Math.random() * .9), c: colors[i % colors.length], g: grav, spin: Math.random() * 6 });
    }
  }

  // ---------------------------------------------------------------- level
  clearLevel() {
    this.levelGroup.traverse(o => { o.geometry?.dispose?.(); });
    this.levelGroup.clear(); this.gateObjs = []; this.hearts = [];
  }
  loadLevel(sim) {
    this.clearLevel(); this.sim = sim; const L = sim.level, lg = this.levelGroup;
    const pipeBase = T.pipeTex('#ff8a2a', '#ffc27a', '#b3500f');
    const capMat = mat({ color: '#ff9d45' }), capTop = mat({ color: '#ffc27a' }), capBot = mat({ color: '#9a4309' });
    const mkPipe = (cx, y0, y1) => {
      const h = y1 - y0, tex = pipeBase.clone(); tex.needsUpdate = true; tex.repeat.set(1, h / 3);
      const m = mat({ map: tex }), dark = mat({ color: '#b3500f' });
      const p = new THREE.Mesh(new THREE.BoxGeometry(PIPE_W, h, 2.2), [m, m, dark, dark, m, m]); p.position.set(cx, y0 + h / 2, 0); return p;
    };
    // Store pipe materials for reuse when spawning gates dynamically
    this._pipeBase = pipeBase; this._capMat = capMat; this._capTop = capTop; this._capBot = capBot; this._mkPipe = mkPipe;
    // Track which gate indices have 3D objects already built
    this._builtGateIndices = new Set();

    L.gates.forEach(g => this._buildGateMesh(g));

    if (!sim.infinite) {
      // trap: spikes
      const x0 = LEAD - 12, x1 = L.padX - PAD_HALF - .15, x2 = L.padX + PAD_HALF + .15, x3 = L.length + 22;
      const cone = new THREE.ConeGeometry(.3, .82, 4); cone.rotateY(Math.PI / 4);
      const spots = [];
      for (let row = 0; row < 3; row++) {
        const z = -.75 + row * .75, off = row % 2 ? .3 : 0;
        for (let x = x0 + off; x < x3; x += .6) if (x < x1 || x > x2) spots.push([x, z]);
      }
      const spikes = new THREE.InstancedMesh(cone, mat({ color: '#e63a62' }), spots.length); const d = new THREE.Object3D();
      spots.forEach(([x, z], i) => { d.position.set(x, ROAD_Y + .41, z); d.updateMatrix(); spikes.setMatrixAt(i, d.matrix); }); spikes.frustumCulled = false; lg.add(spikes);
      const pit = (a, b) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 2.4), mat({ color: '#5a0f2a' })); p.rotation.x = -Math.PI / 2; p.position.set((a + b) / 2, ROAD_Y + .02, 0); lg.add(p); };
      pit(x0, x1); pit(x2, x3);
      // exit pad + arch + beam
      const pt = T.padTex(); pt.repeat.set(PAD_HALF * 2 / 1.0, 2.4 / 1.0); this.padTex = pt;
      const pad = new THREE.Mesh(new THREE.BoxGeometry(PAD_HALF * 2, -ROAD_Y, 2.6), [mat({ color: '#1d8f6c' }), mat({ color: '#1d8f6c' }), mat({ map: pt }), mat({ color: '#0f4a39' }), mat({ color: '#25b387' }), mat({ color: '#25b387' })]);
      pad.position.set(L.padX, ROAD_Y / 2, 0); lg.add(pad);
      const arch = new Geo(); const ax = PAD_HALF + .35;
      arch.box(-ax - .3, ROAD_Y, -1.6, .6, 6.2 - ROAD_Y, .6, '#2a3a46'); arch.box(ax - .3, ROAD_Y, -1.6, .6, 6.2 - ROAD_Y, .6, '#2a3a46'); arch.box(-ax - .5, 5.8, -1.8, 2 * ax + 1, .8, 1, '#3a4d5b');
      const am = new THREE.Mesh(arch.build(), vertexMat()); am.position.x = L.padX; lg.add(am);
      const st = T.signTex('EXIT', { w: 80, h: 24, size: 12 }); this.signs.push(st);
      const sp = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.08), mat({ map: st, fog: false })); sp.position.set(L.padX, 6.2, -1.28); lg.add(sp);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(PAD_HALF * .8, PAD_HALF * .8, 14, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#7dffd0', transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      beam.position.set(L.padX, 7, 0); lg.add(beam); this.beam = beam;
      const gh = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.halo, color: '#3dffb5', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .4 })); gh.scale.set(9, 5, 1); gh.position.set(L.padX, .6, .5); lg.add(gh);
    }
    this.resetRun();
  }

  /** Build and add the Three.js meshes for a single gate. */
  _buildGateMesh(g) {
    if (this._builtGateIndices.has(g.i)) return;
    this._builtGateIndices.add(g.i);
    const lg = this.levelGroup;
    const mkPipe = this._mkPipe;
    const grp = new THREE.Group();
    const yb = g.cy - g.gap / 2, yt = g.cy + g.gap / 2;
    grp.add(mkPipe(g.x, ROAD_Y, yb));
    grp.add(mkPipe(g.x, yt, CEIL + 14));
    const cb = new THREE.Mesh(new THREE.BoxGeometry(PIPE_W + .5, .7, 2.6), [this._capMat, this._capMat, this._capTop, this._capBot, this._capMat, this._capMat]); cb.position.set(g.x, yb - .35, 0);
    const ct = cb.clone(); ct.position.set(g.x, yt + .35, 0); grp.add(cb, ct);
    lg.add(grp);
    const coin = new THREE.Mesh(COIN_GEO, [COIN_RIM, COIN_FACE, COIN_FACE]); coin.position.set(g.x, g.cy, 0);
    const shine = new THREE.Mesh(COIN_IN_GEO, [COIN_FACE2, COIN_FACE2, COIN_FACE2]); coin.add(shine); lg.add(coin);
    const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.halo, color: '#ffd24a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .6 })); hl.scale.set(2.6, 2.6, 1); coin.add(hl); hl.position.z = .2;
    this.hearts.push(coin);
  }
  resetRun() {
    this.fall = null; this.shake = 0; this.parts.length = 0; this.flapT = 1; this.won = false; this.winT = 0;
    this.hearts?.forEach(h => (h.visible = true)); this.menuMode = false; this.bird.visible = false;
    if (this.sim) { this.camX = this.sim.bx + this.halfW * .42; }
  }
  setMode(m) { this.mode = m; if (m === 'menu') { this.clearLevel(); this.sim = null; this.menuX = 0; } }

  // ---------------------------------------------------------------- events from sim
  handle(evs) {
    for (const e of evs) {
      const p = this.birdPos;
      if (e.type === 'flap') { this.flapT = 0; this.burst(p.x - .5, p.y - .3, 0, ['#fff1dc', '#ffc4e8', '#ffffff'], 7, { speed: 2.2, up: .5, life: .45, size: .13, grav: 3 }); }
      if (e.type === 'coin') {
        // In infinite mode, coin hearts are indexed by gate.i (absolute), but hearts[] only holds
        // gates built so far. Find by x position instead.
        const h = this.hearts[e.i];
        if (h) h.visible = false;
        this.burst(p.x, p.y, 0, ['#ffd24a', '#fff3b0', '#ff8a2a'], 16, { speed: 4.5, up: 3, life: .8, size: .15, grav: 8 });
      }
      if (e.type === 'gate') {
        this.burst(p.x + .4, p.y, 0, ['#ffc27a', '#ffffff'], 6, { speed: 2.5, life: .5, size: .1, grav: 2 });
        // In infinite mode, build mesh for any upcoming gates that don't have one yet
        if (this.sim?.infinite) {
          for (const g of this.sim.level.gates) {
            if (!this._builtGateIndices.has(g.i)) this._buildGateMesh(g);
          }
        }
      }
      if (e.type === 'lose') {
        this.shake = this.reduced ? 0 : .7; this.fall = { y: p.y, vy: e.cause === 'trap' ? 0 : 3.5, rot: 0, trap: e.cause === 'trap' };
        this.burst(p.x, p.y, 0, ['#fff1dc', '#ff7ac8', '#ff9a2e', '#2a1d3f'], 34, { speed: 6, up: 5, life: 1, size: .18, grav: 12 });
      }
      if (e.type === 'win') { this.won = true; this.winT = 0; this.burst(p.x, 1.2, 0, ['#7dffd0', '#ffe27a', '#ff7ac8', '#ffffff', '#ff8a2a'], 70, { speed: 7, up: 9, life: 1.5, size: .16, grav: 10 }); }
    }
  }

  // ---------------------------------------------------------------- frame
  start() { if (this.running) return; this.running = true; this.last = performance.now(); const loop = (t) => { if (!this.running) return; this.raf = requestAnimationFrame(loop); this.frame(t); }; this.raf = requestAnimationFrame(loop); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  frame(t) {
    if (document.hidden) { this.last = t; return; }
    let dt = Math.min(.05, (t - this.last) / 1000);
    if (this.mode === 'menu') { this.skip = !this.skip; if (this.skip && !this.reduced) { return; } dt = Math.min(.1, (t - this.last) / 1000); }
    this.last = t;
    if (!this.paused) { this.onFrame?.(dt); this.update(dt); }
    this.renderer.render(this.scene, this.camera);
  }
  update(dt) {
    this.time += dt; const sim = this.sim, tm = this.time;
    let bx, by, tilt = 0, hover = false;
    if (this.mode === 'game' && sim) {
      bx = sim.bx; by = sim.y; tilt = sim.tilt;
      if (sim.status === 'ready') { by = sim.y + Math.sin(tm * 3.2) * .22; hover = true; }
      if (this.fall) {
        const f = this.fall; if (!f.trap) { f.vy -= 24 * dt; f.y += f.vy * dt; f.rot += dt * 9; if (f.y < .5) { f.y = .5; f.vy *= -.25; f.rot *= .9; } } else f.y = Math.max(.25, f.y);
        by = f.y; tilt = -1; bx += (f.trap ? 0 : -dt * 0);
        this.birdSpin = f.rot;
      }
      if (this.won) { this.winT += dt; by = Math.max(.6, 0.6 + Math.abs(Math.sin(this.winT * 5)) * Math.max(0, 1.4 - this.winT) * 1.2); bx += Math.pow(Math.max(0, this.winT - .55), 2) * 16; }
      if (sim.status === 'playing' || sim.status === 'won') { /* camera follows bird x */ }
    } else {
      this.menuX += dt * 3.2; bx = this.menuX + LEAD; by = 6.1 + Math.sin(tm * 1.6) * .6; tilt = Math.cos(tm * 1.6) * .35; hover = true;
      if (Math.sin(tm * 1.6 + 1.2) > .96) this.flapT = Math.min(this.flapT, .3);
    }
    this.birdPos.set(bx, by, 0);
    this.bird.position.set(bx, by, 0);
    this.bird.rotation.z = this.fall && !this.fall.trap ? this.birdSpin : THREE.MathUtils.clamp(tilt * .7, -.9, .55);
    this.flapT = Math.min(1, this.flapT + dt * 3.4);
    const wingA = hover && this.mode !== 'game' ? Math.sin(tm * 14) * .8 : (this.fall ? .7 : (1 - this.flapT) * 1.1 * Math.sin(this.flapT * 24 + 1.6) - .2 + (hover ? Math.sin(tm * 9) * .5 : 0));
    this.wings.forEach(w => (w.rotation.z = wingA));
    this.shadow.position.set(bx, ROAD_Y + .03, 0); const sc = THREE.MathUtils.clamp(1.15 - (by - ROAD_Y) * .07, .35, 1); this.shadow.scale.setScalar(sc); this.shadow.material.opacity = .42 * sc;

    // camera
    const tx = bx + this.halfW * .4, ty = CAM_Y + THREE.MathUtils.clamp((by - 5.5) * .1, -.5, .5);
    this.camX += (tx - this.camX) * Math.min(1, dt * (this.mode === 'game' ? 14 : 6)); this.camY += (ty - this.camY) * Math.min(1, dt * 4);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const sx = (Math.random() - .5) * this.shake * .7, sy = (Math.random() - .5) * this.shake * .7;
    this.camera.position.set(this.camX - 2.4 + sx, this.camY + .7 + sy, CAM_DIST);
    this.camera.lookAt(this.camX + .4, this.camY, 0);

    if (this.onBird && this.mode === 'game') {
      this.camera.updateMatrixWorld(); const v = this._v || (this._v = new THREE.Vector3()); v.set(bx, by, 0).project(this.camera);
      const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
      this.onBird({ x: (v.x + 1) / 2 * cw, y: (1 - v.y) / 2 * ch, rot: this.bird.rotation.z, ppu: ch / VIEW_H, flap: this.flapT, won: this.won, winT: this.winT, fall: !!this.fall });
    }

    // recycle chunks around the camera; keep ground centred
    const base = Math.floor(this.camX / CH);
    this.chunks.forEach((c, i) => { const idx = base + i - 1; c.position.x = idx * CH; });
    this.groundGroup.position.x = Math.floor(this.camX / 4) * 4;

    // bats
    this.bats.forEach(b => { const u = b.userData; const x = ((u.off + tm * u.sp) % 90) - 45; b.position.set(this.camX + x, u.y + Math.sin(tm * 2 + u.ph) * .8, u.z); const f = Math.floor(tm * 7 + u.ph) % 2; u.A.visible = !f; u.B.visible = !!f; });
    // level anim
    if (this.hearts) this.hearts.forEach((h, i) => {
      const gate = this.sim?.level.gates.find(g => g.i === i) ?? this.sim?.level.gates[i];
      h.rotation.y = tm * 2.4 + i;
      h.position.y = (gate?.cy ?? 0) + Math.sin(tm * 3 + i) * .12;
    });
    if (this.padTex) this.padTex.offset.x = (tm * .5) % 1;
    if (this.beam) this.beam.material.opacity = .08 + Math.sin(tm * 3) * .025 + (this.won ? .06 : 0);

    // particles
    for (let i = this.parts.length - 1; i >= 0; i--) { const p = this.parts[i]; p.t += dt; if (p.t > p.life) { this.parts.splice(i, 1); continue; } p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < ROAD_Y + .05) { p.y = ROAD_Y + .05; p.vy *= -.35; p.vx *= .8; } }
    for (let i = 0; i < this.N; i++) {
      const p = this.parts[i];
      if (!p) { this.dummy.scale.setScalar(0); } else { const k = 1 - p.t / p.life; this.dummy.position.set(p.x, p.y, p.z); this.dummy.rotation.set(p.spin + p.t * 6, p.t * 4, 0); this.dummy.scale.setScalar(p.s * (.4 + k * .6)); this.inst.setColorAt(i, this.col.set(p.c)); }
      this.dummy.updateMatrix(); this.inst.setMatrixAt(i, this.dummy.matrix);
    }
    this.inst.instanceMatrix.needsUpdate = true; if (this.inst.instanceColor) this.inst.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.stop(); this.ro.disconnect(); document.removeEventListener('visibilitychange', this.vis);
    this.scene.traverse(o => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { x.map?.dispose?.(); x.dispose?.(); }); });
    this.renderer.dispose(); this.renderer.forceContextLoss?.();
  }
}
