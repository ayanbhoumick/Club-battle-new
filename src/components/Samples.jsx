import { useEffect, useRef, useState } from 'react';

const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const cloud = (g, x, y, c) => { rect(g, x + 3, y, 10, 3, c); rect(g, x, y + 3, 18, 3, c); rect(g, x + 5, y - 2, 6, 2, c); };

function paintLandscape(g, reveal) {
  const bands = ['#2a2160', '#3a2a7a', '#5b3a8f', '#8a4a98', '#c46a8a', '#f0956f', '#ffc07a'];
  bands.forEach((c, i) => rect(g, 0, i * 7, 120, 8, c));
  rect(g, 86, 10, 12, 12, '#fff1c9');
  [[6, 8], [46, 8], [84, 30]].forEach(([x, y]) => cloud(g, x, y + 4, '#ffd6e8'));       // identical clouds
  const peak = (cx, h, w, c) => { for (let i = 0; i < h; i++) rect(g, cx - Math.round((w * (i + 1)) / h / 2), 52 - h + i, Math.round((w * (i + 1)) / h), 1, c); };
  peak(30, 30, 56, '#3c2f66'); peak(78, 38, 64, '#2c2352'); peak(104, 22, 40, '#443470');
  rect(g, 0, 52, 120, 28, '#2c5c7a');
  // "reflection" that does NOT mirror the peaks
  for (let i = 0; i < 20; i++) rect(g, 40 - i, 54 + i, 2 + i * 2, 1, i % 3 ? '#35406b' : '#3a4d7c');
  for (let i = 0; i < 14; i++) rect(g, 90 - i, 54 + i, 2 + i * 2, 1, '#2a456c');
  for (let y = 56; y < 80; y += 4) rect(g, 6 + (y * 7) % 30, y, 14, 1, '#4b8aa8');
  if (reveal) {
    g.strokeStyle = '#ff3d7f'; g.lineWidth = 1;
    [[6, 10], [46, 10], [84, 32]].forEach(([x, y]) => g.strokeRect(x - 1.5, y - 1.5, 21, 12));
    g.strokeRect(12.5, 54.5, 94, 22);
  }
}
function paintMonument(g, reveal) {
  const bands = ['#1d2850', '#2d3a6a', '#4a4a80', '#8a5a8a', '#d98a6a', '#ffb870'];
  bands.forEach((c, i) => rect(g, 0, i * 9, 120, 10, c));
  rect(g, 20, 14, 10, 10, '#fff1c9');
  rect(g, 0, 58, 120, 22, '#26324a'); rect(g, 0, 58, 120, 2, '#3a4a66');
  rect(g, 52, 18, 16, 40, '#d8d2c4'); rect(g, 52, 18, 6, 40, '#b8b2a6'); rect(g, 56, 12, 8, 6, '#e8e2d4'); rect(g, 58, 8, 4, 4, '#f4eee0');
  rect(g, 46, 54, 28, 6, '#c8c2b4'); rect(g, 42, 58, 36, 4, '#a8a294');
  [[8, 40], [92, 36], [104, 44]].forEach(([x, h]) => { rect(g, x + 4, 58 - h * .4, 4, h * .4, '#1a2236'); rect(g, x, 58 - h, 12, h * .7, '#1d3a3a'); });
  rect(g, 4, 70, 40, 6, 'rgba(0,0,0,.45)'); g.fillStyle = '#e8e2d4'; g.font = '5px monospace'; g.fillText('ARCHIVE 1987-0412', 6, 75);
  if (reveal) { g.strokeStyle = '#7dffd0'; g.lineWidth = 1; g.strokeRect(3.5, 69.5, 42, 8); g.strokeRect(50.5, 6.5, 20, 52); }
}
export function PixelImage({ variant, reveal }) {
  const ref = useRef();
  useEffect(() => { const g = ref.current.getContext('2d'); g.imageSmoothingEnabled = false; (variant === 'landscape' ? paintLandscape : paintMonument)(g, reveal); }, [variant, reveal]);
  return <canvas ref={ref} className="sample-canvas" width="120" height="80" role="img" aria-label={variant === 'landscape' ? 'Pixel-art mountain landscape with a lake' : 'Pixel-art monument at dusk with an archive caption'} />;
}

function AudioSample({ src, muted }) {
  const ref = useRef(), [on, setOn] = useState(false), [pct, setPct] = useState(0), [err, setErr] = useState(false);
  useEffect(() => () => ref.current?.pause(), []);
  useEffect(() => {
    if (ref.current) {
      ref.current.muted = Boolean(muted);
      if (muted && !ref.current.paused) {
        ref.current.pause();
      }
    }
  }, [muted]);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      a.muted = false;
      a.play().catch(() => setErr(true));
    } else {
      a.pause();
    }
  };
  return <div className="sample sample-audio">
    <audio ref={ref} src={`${import.meta.env.BASE_URL}${src}`} preload="auto" onPlay={() => setOn(true)} onPause={() => setOn(false)} onEnded={() => { setOn(false); setPct(0); }} onTimeUpdate={e => setPct(e.target.currentTime / (e.target.duration || 1))} onError={() => setErr(true)} />
    <button className="play-orb" onClick={toggle} aria-label={on ? 'Pause clip' : 'Play clip'}>{on ? '❚❚' : '▶'}</button>
    <div className={`wave ${on ? 'on' : ''}`} aria-hidden="true">{Array.from({ length: 22 }, (_, k) => <i key={k} style={{ animationDelay: `${(k * 53) % 400}ms`, height: `${6 + ((k * 37) % 20)}px` }} />)}</div>
    <div className="audio-bar" aria-hidden="true"><i style={{ width: `${pct * 100}%` }} /></div>
    <p className="muted small">{err ? 'Audio could not load. Check public/audio.' : 'Listen to the whole clip. Turn your volume up.'}</p>
  </div>;
}

export function Sample({ q, reveal, muted }) {
  if (q.kind === 'IMAGE') return <figure className="sample sample-image"><PixelImage variant={q.variant} reveal={reveal} />
    <figcaption>{reveal ? 'Highlighted: what to inspect' : 'Zoom with your eyes. Then decide.'}</figcaption></figure>;
  if (q.kind === 'TEXT') return <div className="sample sample-text"><p>{q.body}</p></div>;
  if (q.kind === 'NEWS') return <div className="sample sample-news"><div className="news-flag">NEWS</div><h3>{q.headline}</h3><p className="news-body">{q.body}</p></div>;
  return <AudioSample key={q.src} src={q.src} muted={muted} />;
}
