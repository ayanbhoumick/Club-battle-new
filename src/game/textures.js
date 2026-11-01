import * as THREE from 'three';

const cache = new Map();
const rnd = (seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
export function canvasTex(w, h, draw, { repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.userData = { redraw: () => { draw(g, w, h); t.needsUpdate = true; } };
  return t;
}
const px = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

// ---------------------------------------------------------------- sky
export const skyTex = () => canvasTex(90, 160, (g, w, h) => {
  const bands = ['#0f0720', '#180a2c', '#22103a', '#321447', '#4a1a52', '#661f56', '#8a2a56', '#b03d4c', '#d4573f', '#ee7a35', '#ffa44a'];
  const horizon = h * 0.82;
  for (let y = 0; y < h; y++) {
    const k = Math.min(bands.length - 1, Math.floor((y / horizon) ** 1.35 * (bands.length - 1)));
    px(g, 0, y, w, 1, bands[k]);
  }
  const R = rnd(11);
  for (let i = 0; i < 60; i++) { const y = R() * h * 0.5; px(g, R() * w, y, 1, 1, R() > .7 ? '#ffd9f0' : '#9a86c8'); }
  // moon
  const mx = 62, my = 34, r = 13;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) px(g, mx + x, my + y, 1, 1, (x + y) % 7 === 0 ? '#ffe7ae' : '#fff1c9');
  [[-4, -3, 4], [3, 2, 3], [-2, 5, 2]].forEach(([dx, dy, rr]) => { for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) if (x * x + y * y <= rr * rr) px(g, mx + dx + x, my + dy + y, 1, 1, '#ecd08e'); });
  // flat cloud bars
  [[6, 58, 26, '#2c1240'], [40, 70, 36, '#3a164a'], [8, 92, 40, '#5a1f55'], [50, 104, 34, '#7a2b52']].forEach(([x, y, ww, c]) => { px(g, x, y, ww, 3, c); px(g, x + 4, y - 2, ww - 10, 2, c); });
});

export const haloTex = () => canvasTex(64, 64, (g, w, h) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

// ---------------------------------------------------------------- buildings
const LIT = ['#ffb347', '#ffd27a', '#ff8a3d', '#ffc766', '#ffb347', '#7ee8d6', '#e0a4ff'];
export const PALETTES = [
  { wall: '#3b4a5a', trim: '#2a3644', dark: '#18222d', brick: '#46586a' },
  { wall: '#5a3a3a', trim: '#3c2528', dark: '#231518', brick: '#6b4747' },
  { wall: '#34495a', trim: '#22323f', dark: '#14202a', brick: '#3f5b70' },
  { wall: '#4d4a63', trim: '#33304a', dark: '#1c1a2d', brick: '#5b5877' },
  { wall: '#44564a', trim: '#2c3a30', dark: '#17211b', brick: '#52685a' },
];
const PPU = 10;
/** facade texture for a w x h (world units) building. Unique per building. */
export function facadeTex(w, h, seed, { pal = PALETTES[0], shop = true, litBias = .38, sign = null } = {}) {
  return canvasTex(Math.ceil(w * PPU), Math.ceil(h * PPU), (g, cw, ch) => {
    const R = rnd(seed * 977 + 13);
    px(g, 0, 0, cw, ch, pal.wall);
    for (let i = 0; i < cw * ch / 18; i++) px(g, R() * cw, R() * ch, 2, 1, pal.brick);
    for (let i = 0; i < cw * ch / 40; i++) px(g, R() * cw, R() * ch, 1, 1, pal.trim);
    px(g, 0, 0, cw, 4, pal.dark); px(g, 0, 4, cw, 2, pal.trim);          // cornice
    px(g, 0, 0, 2, ch, pal.trim); px(g, cw - 2, 0, 2, ch, pal.dark);     // edges
    const baseH = shop ? 34 : 6, top = 14, stepY = 30, stepX = 24;
    const cols = Math.max(1, Math.floor((cw - 8) / stepX));
    const offX = (cw - cols * stepX) / 2 + (stepX - 12) / 2;
    for (let y = top; y + 18 < ch - baseH; y += stepY) {
      px(g, 0, y + 22 + 2, cw, 2, pal.trim);                              // floor ledge
      for (let c = 0; c < cols; c++) {
        const wx = offX + c * stepX, lit = R() < litBias, col = LIT[Math.floor(R() * LIT.length)];
        px(g, wx - 1, y - 1, 14, 20, pal.dark);
        px(g, wx, y, 12, 18, lit ? col : (R() > .5 ? '#1a2a38' : '#223648'));
        if (lit) { px(g, wx, y, 12, 5, 'rgba(255,255,255,.28)'); if (R() > .55) px(g, wx + 5, y, 2, 18, pal.dark); if (R() > .7) px(g, wx + 2, y + 6, 8, 12, 'rgba(180,70,40,.55)'); }
        else { px(g, wx + 1, y + 1, 4, 2, 'rgba(255,255,255,.14)'); }
        px(g, wx - 2, y + 18, 16, 2, pal.trim);                           // sill
      }
    }
    if (shop) {                                                            // shopfront
      const sy = ch - baseH;
      px(g, 0, sy, cw, baseH, pal.dark);
      const awn = ['#ff8a2a', '#f7b6ea', '#7ee8d6', '#ffd27a'][Math.floor(R() * 4)];
      for (let x = 0; x < cw; x += 6) { px(g, x, sy + 2, 3, 8, awn); px(g, x + 3, sy + 2, 3, 8, '#f6ecd9'); }
      const sw = Math.max(1, Math.floor(cw / 34));
      for (let i = 0; i < sw; i++) { const x = 4 + i * ((cw - 8) / sw); px(g, x, sy + 13, (cw - 8) / sw - 4, 17, R() > .3 ? '#ffc766' : '#1d2f3e'); px(g, x, sy + 13, (cw - 8) / sw - 4, 4, 'rgba(255,255,255,.3)'); }
    }
    if (sign) {
      const { text, color = '#ffd27a', bg = '#2a1236', y = 22 } = sign;
      const wide = Math.min(cw - 10, text.length * 8 + 10);
      const sx = (cw - wide) / 2;
      px(g, sx - 2, y - 2, wide + 4, 18, '#101018'); px(g, sx, y, wide, 14, bg);
      g.fillStyle = color; g.font = '8px "Press Start 2P", monospace'; g.textBaseline = 'middle'; g.textAlign = 'center';
      g.shadowColor = color; g.shadowBlur = 3; g.fillText(text, cw / 2, y + 7); g.shadowBlur = 0;
    }
  });
}

export function clockTex() {
  return canvasTex(48, 260, (g, w, h) => {
    px(g, 0, 0, w, h, '#2f3a47');
    for (let y = 0; y < h; y += 8) px(g, 0, y, w, 1, '#262f3b');
    px(g, 0, 0, w, 6, '#1a212b');
    g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(24, 40, 16, 0, 7); g.fill();
    g.strokeStyle = '#3a2a18'; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 40); g.lineTo(24, 28); g.moveTo(24, 40); g.lineTo(32, 40); g.stroke();
    for (let y = 80; y < h - 20; y += 36) px(g, 18, y, 12, 20, '#ffb347');
  });
}

export function groundTex() {
  return canvasTex(16, 16, (g) => {
    px(g, 0, 0, 16, 16, '#2a3340');
    const R = rnd(5); for (let i = 0; i < 30; i++) px(g, R() * 16, R() * 16, 1, 1, R() > .5 ? '#323d4c' : '#222b36');
    px(g, 0, 0, 16, 1, '#1d2530'); px(g, 0, 8, 16, 1, '#1d2530'); px(g, 0, 0, 1, 8, '#1d2530'); px(g, 8, 8, 1, 8, '#1d2530');
  }, { repeat: true });
}
export function roadTex() {
  return canvasTex(16, 16, (g) => {
    px(g, 0, 0, 16, 16, '#1f252f');
    const R = rnd(9); for (let i = 0; i < 26; i++) px(g, R() * 16, R() * 16, 1, 1, R() > .5 ? '#272e3a' : '#181d26');
  }, { repeat: true });
}

export function pipeTex(base, light, dark) {
  return canvasTex(16, 32, (g, w, h) => {
    px(g, 0, 0, w, h, base);
    px(g, 2, 0, 3, h, light); px(g, 5, 0, 1, h, 'rgba(255,255,255,.35)');
    px(g, w - 4, 0, 4, h, dark); px(g, w - 5, 0, 1, h, 'rgba(0,0,0,.25)');
    px(g, 0, 0, 1, h, dark); px(g, 0, 28, w, 4, dark); px(g, 0, 28, w, 1, light);
    px(g, 3, 8, 2, 2, dark); px(g, 11, 8, 2, 2, dark); px(g, 3, 18, 2, 2, dark); px(g, 11, 18, 2, 2, dark);
  }, { repeat: true });
}

export function padTex() {
  return canvasTex(16, 16, (g) => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) px(g, x * 8, y * 8, 8, 8, (x + y) % 2 ? '#2de2a6' : '#a6ffd9');
  }, { repeat: true });
}

export function signTex(text, { color = '#a6ffd9', bg = '#07241c', w = 96, h = 32, size = 12 } = {}) {
  return canvasTex(w, h, (g) => {
    px(g, 0, 0, w, h, '#06100d'); px(g, 2, 2, w - 4, h - 4, bg);
    g.fillStyle = color; g.font = `${size}px "Press Start 2P", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 4; g.fillText(text, w / 2, h / 2 + 1); g.shadowBlur = 0;
  });
}
