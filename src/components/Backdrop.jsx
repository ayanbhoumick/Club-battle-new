import { useState } from 'react';

// Supplied city image (public/art/city.jpg) with the hero (public/art/ben.png) running from alien creatures.
// Optional: drop public/art/background.jpg to overlay your own full-screen background.
const px = (rows, pal) => rows.flatMap((r, y) => [...r].map((c, x) => c === '.' ? null : <rect key={`${x}.${y}`} x={x} y={y} width="1.03" height="1.03" fill={pal[c]} />));


const BLOB_TOP = ['....mmmmmm....', '..mmmmmmmmmm..', '.mmmmmmmmmmmm.', '.mYYmmYYmmYYm.', '.mYemmYemmYem.', '.mmmmmmmmmmmm.', '.mmmmWWWWmmmm.', '..mmmmmmmmmm..'];
const blob = (m, legs) => px([...BLOB_TOP, ...legs], { m, Y: '#ffe27a', e: '#1a0f1f', W: '#ffffff' });
const LEGS_A = ['..m.mm..mm.m..', '.m..m....m..m.', '.m.m......m.m.', 'm..m......m..m'];
const LEGS_B = ['..m.mm..mm.m..', '..m.m....m.m..', '.m..m....m..m.', '.m.m......m.m.'];
const ALIEN1 = [blob('#ff5a3c', LEGS_A), blob('#ff5a3c', LEGS_B)];
const ALIEN2 = [blob('#b84dff', LEGS_B), blob('#b84dff', LEGS_A)];

const Saucer = ({ cls, y, s }) => (
  <g className={`saucer ${cls}`} style={{ '--y': `${y}px` }}><g transform={`scale(${s})`}>
    <polygon className="beam" points="-4,3 4,3 16,80 -16,80" fill="url(#beam)" />
    <ellipse cx="0" cy="0" rx="11" ry="3" fill="#8aa0b8" /><ellipse cx="0" cy="-2" rx="5" ry="3" fill="#7dffd0" opacity=".85" />
    <rect x="-7" y="1" width="2" height="1" fill="#ffe27a" /><rect x="-1" y="1.5" width="2" height="1" fill="#ffe27a" /><rect x="5" y="1" width="2" height="1" fill="#ffe27a" />
  </g></g>
);

export default function Backdrop() {
  const [imgFail, setImgFail] = useState(false);
  return (
    <div className="backdrop" aria-hidden="true">
      <svg className="scene" viewBox="0 0 160 90" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
        <defs>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7dffd0" stopOpacity=".7" /><stop offset="1" stopColor="#7dffd0" stopOpacity="0" /></linearGradient>
        </defs>
        <image href={`${import.meta.env.BASE_URL}art/city.jpg`} x="0" y="0" width="160" height="90" preserveAspectRatio="xMidYMid slice" />
        <Saucer cls="s1" y={16} s={1} /><Saucer cls="s2" y={8} s={.7} />
        <g transform="translate(30 67) scale(1.5)"><g className="chase c2"><g className="fa">{ALIEN2[0]}</g><g className="fb">{ALIEN2[1]}</g></g></g>
        <g transform="translate(60 73)"><g className="chase c1"><g className="fa">{ALIEN1[0]}</g><g className="fb">{ALIEN1[1]}</g></g></g>
        <g transform="translate(88 62.7)"><g className="run"><image href={`${import.meta.env.BASE_URL}art/ben.png`} x="0" y="0" width="8.3" height="22.3" preserveAspectRatio="xMidYMax meet" /><circle className="wrist" cx="6.4" cy="4.6" r="1.4" fill="#7dffd0" /></g></g>
      </svg>
      {!imgFail && <img className="backdrop-img" src={`${import.meta.env.BASE_URL}art/background.jpg`} alt="" onError={() => setImgFail(true)} />}
      <div className="backdrop-dim" />
    </div>
  );
}
