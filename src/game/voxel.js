import * as THREE from 'three';

// Baked per-face shading gives the flat "voxel" look without any lights.
const SHADE = { px: .8, nx: .68, py: 1, ny: .5, pz: .92, nz: .6 };
const FACES = [
  ['px', [1,0,0], [[1,0,1],[1,0,0],[1,1,0],[1,1,1]]],
  ['nx', [-1,0,0], [[0,0,0],[0,0,1],[0,1,1],[0,1,0]]],
  ['py', [0,1,0], [[0,1,1],[1,1,1],[1,1,0],[0,1,0]]],
  ['ny', [0,-1,0], [[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],
  ['pz', [0,0,1], [[0,0,1],[1,0,1],[1,1,1],[0,1,1]]],
  ['nz', [0,0,-1], [[1,0,0],[0,0,0],[0,1,0],[1,1,0]]],
];

/** Tiny vertex-coloured mesh builder (boxes + pixel-art sprites extruded to voxels). */
export class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; }
  quad(corners, normal, color, shade = 1) {
    const base = this.p.length / 3, col = new THREE.Color(color);
    for (const k of corners) {
      this.p.push(k[0], k[1], k[2]); this.n.push(...normal);
      this.c.push(col.r * shade, col.g * shade, col.b * shade);
    }
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  /** box with min-corner (x,y,z) and size (w,h,d) */
  box(x, y, z, w, h, d, color, skip = {}) {
    for (const [key, nrm, cs] of FACES) {
      if (skip[key]) continue;
      this.quad(cs.map(([a, b, c]) => [x + a * w, y + b * h, z + c * d]), nrm, color, SHADE[key]);
    }
    return this;
  }
  /** centre-based box helper */
  cbox(cx, cy, cz, w, h, d, color) { return this.box(cx - w / 2, cy - h / 2, cz - d / 2, w, h, d, color); }
  /**
   * rows: array of strings (top row first); palette: char -> colour.
   * Sprite is centred on x, sits on y=oy, extruded `depth` voxels along z.
   */
  sprite(rows, palette, s, depth = 3, ox = 0, oy = 0, oz = 0) {
    const H = rows.length, W = Math.max(...rows.map(r => r.length));
    const at = (c, r) => (rows[r] && palette[rows[r][c]]) ? palette[rows[r][c]] : null;
    const z0 = oz - (depth * s) / 2;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const col = at(c, r); if (!col) continue;
      const x = ox + (c - W / 2) * s, y = oy + (H - 1 - r) * s;
      this.box(x, y, z0, s, s, depth * s, col, {
        px: !!at(c + 1, r), nx: !!at(c - 1, r), py: !!at(c, r - 1), ny: !!at(c, r + 1),
      });
    }
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i);
    return g;
  }
}
export const vertexMat = () => new THREE.MeshBasicMaterial({ vertexColors: true });
export const glowMat = c => new THREE.MeshBasicMaterial({ color: c, fog: false });
