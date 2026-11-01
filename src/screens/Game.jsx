import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Btn, Key, Avatar, Hearts } from '../components/ui.jsx';
import { fmt } from '../components/Chrome.jsx';
import { sfx, vibrate, startMusic, resumeAudio } from '../sfx.js';
import { World } from '../game/world.js';
import { Sim } from '../game/sim.js';

const ART = `${import.meta.env.BASE_URL}art/`;
const MSG = {
  trap: 'You landed in the spike trap. Only the green pad is safe.',
  pipe: 'You hit a gate. Flap before the pipe, not at it.',
  gates: 'You reached the pad without clearing every gate.',
};

export default function Game({ state, dispatch }) {
  const N = state.moves || 5, cv = useRef(), phoneRef = useRef(), chargeRef = useRef(), heroRef = useRef(), formRef = useRef('ben'), posRef = useRef({ x: 0, y: 0 }), simRef = useRef(), worldRef = useRef(), pausedRef = useRef(false);
  const [ui, setUi] = useState({ status: 'ready', left: N, passed: 0, coins: 0 });
  const [paused, setPaused] = useState(false), [end, setEnd] = useState(null), [fail, setFail] = useState(false), [toast, setToast] = useState(null);
  const gates = N - 1;
  const [form, setFormState] = useState('ben'), [charged, setCharged] = useState(0), [fly, setFly] = useState([]), [flash, setFlash] = useState(null);
  const setForm = f => { formRef.current = f; setFormState(f); };
  const land = id => { setFly(l => l.filter(c => c.id !== id)); setCharged(c => c + 1); sfx.click(); };

  const isMuted = Boolean(state.settings.muted || (!state.settings.sfx && !state.settings.music));
  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (!nextMuted) {
      resumeAudio();
    }
    dispatch({
      type: 'settings',
      patch: {
        muted: nextMuted,
        sfx: !nextMuted,
        music: !nextMuted,
      },
    });
    if (!nextMuted) {
      setTimeout(sfx.click, 30);
    }
  };

  const onEvents = useCallback((evs, sim) => {
    for (const e of evs) {
      if (e.type === 'flap') sfx.flap();
      if (e.type === 'empty') { sfx.empty(); setToast('Out of flaps. Glide to the pad!'); }
      if (e.type === 'gate') sfx.gate();
      if (e.type === 'coin') {
        sfx.coin();
        const ph = phoneRef.current?.getBoundingClientRect(), ch = chargeRef.current?.getBoundingClientRect();
        if (ph && ch) setFly(l => [...l, { id: Math.random(), sx: posRef.current.x, sy: posRef.current.y, tx: ch.left - ph.left + ch.width / 2, ty: ch.top - ph.top + ch.height / 2 }]);
        else setCharged(c => c + 1);
      }
      if (e.type === 'lose') { sfx.crash(); vibrate([40, 30, 80]); }
      if (e.type === 'win') { sfx.win(); vibrate(30); setForm('xlr8'); setFlash({ k: Math.random(), ...posRef.current }); }
      if (e.type === 'start') setToast(null);
    }
    setUi({ status: sim.status, left: sim.flapsLeft, passed: sim.passed, coins: sim.coins });
    if (sim.status === 'won' || sim.status === 'lost') {
      const won = sim.status === 'won', run = { passed: sim.passed, coins: sim.coins, used: sim.flapsUsed, cause: sim.cause };
      dispatch({ type: 'finish', won, used: sim.flapsUsed, score: sim.score, run });
      setTimeout(() => setEnd({ won, cause: sim.cause, score: sim.score, run }), won ? 1500 : 1100);
    }
  }, [dispatch]);

  useEffect(() => {
    const sim = new Sim(N, state.seed); simRef.current = sim; let w;
    try {
      w = new World(cv.current, { pixel: state.settings.pixel, mode: 'game', onBird: b => {
        const el = heroRef.current; if (!el) return; posRef.current = { x: b.x, y: b.y };
        const xl = formRef.current === 'xlr8', h = (xl ? 1.25 : 1.45) * b.ppu, sq = 1 - (1 - b.flap) * .08, st = 1 + (1 - b.flap) * .1;
        el.style.height = `${h}px`; el.style.visibility = 'visible';
        el.style.transform = `translate(${b.x}px,${b.y}px) translate(-50%,-52%) rotate(${xl ? -b.rot * .4 : -b.rot}rad) scale(${sq},${st})`;
      }, onFrame: dt => {
        if (pausedRef.current) return; sim.advance(dt);
        const evs = sim.events.splice(0); if (evs.length) { w.handle(evs); onEvents(evs, sim); }
      } });
      w.setMode('game'); w.loadLevel(sim); w.start(); worldRef.current = w;
      if (new URLSearchParams(location.search).has('debug')) window.__nth = { sim, world: w };
    } catch (err) { console.warn(err); setFail(true); }
    return () => w?.dispose();
  }, [N, state.seed]); // eslint-disable-line

  const flap = useCallback(() => {
    const s = simRef.current; if (!s || pausedRef.current || end) return;
    if (s.status === 'ready') startMusic();
    const evs = []; s.flap(); evs.push(...s.events.splice(0));
    if (evs.length) { worldRef.current?.handle(evs); onEvents(evs, s); }
  }, [onEvents, end]);

  const setPause = v => { pausedRef.current = v; setPaused(v); if (worldRef.current) worldRef.current.paused = v; };
  const retry = () => { const s = simRef.current; s.reset(); worldRef.current.resetRun(); setEnd(null); setToast(null); setPause(false); setForm('ben'); setCharged(0); setFly([]); setFlash(null); setUi({ status: 'ready', left: N, passed: 0, coins: 0 }); };

  useEffect(() => {
    const h = e => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { if (/BUTTON/.test(e.target.tagName) && e.key === ' ') return; e.preventDefault(); if (!e.repeat) flap(); }
      if (e.key === 'p' || e.key === 'Escape') { if (ui.status === 'playing' || paused) setPause(!pausedRef.current); }
      if ((e.key === 'r' || e.key === 'R') && end) retry();
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });
  useEffect(() => { const v = () => { if (document.hidden && simRef.current?.status === 'playing') setPause(true); }; document.addEventListener('visibilitychange', v); return () => document.removeEventListener('visibilitychange', v); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);

  const score = ui.passed * 100 + ui.coins * 50;
  return (
    <div className="game-page">
      <div className="phone" ref={phoneRef} onPointerDown={e => { if (e.target.closest('button,.sheet')) return; flap(); }}>
        <div className="stage"><canvas ref={cv} aria-label="Flappy Bird style game. Press space or tap to flap." role="img" /></div>
        <div className="hero-pos" ref={heroRef} aria-hidden="true"><img key={form} className={`hero-sprite ${form}`} src={`${ART}${form === 'xlr8' ? 'xlr8' : 'ben'}.png`} alt="" draggable="false" /></div>
        {flash && <motion.div key={flash.k} className="xform-flash" style={{ left: flash.x, top: flash.y }} initial={{ opacity: .95, scale: .2 }} animate={{ opacity: 0, scale: 4 }} transition={{ duration: .8 }} />}
        {fly.map(c => <motion.i key={c.id} className="fly-coin" initial={{ x: c.sx, y: c.sy, scale: 1 }} animate={{ x: c.tx, y: c.ty, scale: .45 }} transition={{ duration: .7, ease: 'easeIn' }} onAnimationComplete={() => land(c.id)} />)}
        {fail && <div className="overlay"><div className="card center"><h3>3D is unavailable</h3><p className="muted">Your browser blocked WebGL. Try Chrome or Safari, or turn on hardware acceleration.</p><Btn variant="slate" onClick={() => dispatch({ type: 'reset' })}>Menu</Btn></div></div>}
        <div className="game-hud">
          <div className="hud-row"><div className="player"><Avatar size={34} /><span className="player-name">AGENT</span></div>
            <div className="trophy"><span aria-hidden="true">🏆</span><b>{fmt(score)}</b></div>
            <div ref={chargeRef} className={`charge ${gates > 0 && charged >= gates ? 'full' : ''}`} role="img" aria-label={`Watch charge: ${charged} of ${gates} coins`}>
              <img className="charge-base" src={`${ART}omnitrix.png`} alt="" /><img className="charge-lit" src={`${ART}omnitrix.png`} alt="" style={{ clipPath: `inset(0 ${100 - (gates ? Math.min(1, charged / gates) * 100 : 0)}% 0 0)` }} />
              <b key={charged} className="bump">{charged}/{gates}</b></div></div>
          <div className="flap-row"><span className="flap-label">Flaps</span><Hearts total={N} left={ui.left} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                className="round-btn"
                aria-pressed={isMuted}
                aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
                title={isMuted ? 'Unmute sound (M)' : 'Mute sound (M)'}
                onClick={toggleMute}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button className="round-btn" onClick={() => setPause(true)} aria-label="Pause" disabled={ui.status !== 'playing'}>❚❚</button>
            </div>
          </div>
          <div className="route" aria-label={`${ui.passed} of ${gates} gates cleared`}>{Array.from({ length: gates }, (_, i) => <span key={i} className={`gate-dot ${i < ui.passed ? 'done' : ''}`} />)}<span className="exit-flag">EXIT</span></div>
        </div>
        <AnimatePresence>{ui.status === 'ready' && !end && !fail && (
          <motion.div className="ready-prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="only-keys">press <Key wide>SPACE</Key> to start</p><p className="only-touch">tap anywhere to start</p>
            <p className="rule">{N} flaps. {gates} gate{gates > 1 ? 's' : ''}, then the green pad.</p>
          </motion.div>)}</AnimatePresence>
        <AnimatePresence>{toast && <motion.div className="toast" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>{toast}</motion.div>}</AnimatePresence>
        <AnimatePresence>{paused && !end && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="card center"><h3>Paused</h3>
            <Btn variant="play" className="block" onClick={() => setPause(false)} autoFocus>Resume</Btn>
            <div className="row" style={{ marginTop: 8 }}>
              <Btn variant="slate" onClick={toggleMute}>{isMuted ? 'Unmute 🔇' : 'Mute 🔊'}</Btn>
              <Btn variant="slate" onClick={retry}>Restart</Btn>
              <Btn variant="slate" onClick={() => dispatch({ type: 'reset' })}>Menu</Btn>
            </div></div></motion.div>)}</AnimatePresence>
        <AnimatePresence>{end && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="card center end-card" initial={{ scale: .85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
              <h2 className={end.won ? 'win' : 'lose'}>{end.won ? 'Exit reached' : 'Run over'}</h2>
              <div className="score-big sm">{fmt(end.score)}</div>
              <p className="muted">{end.won ? `Cleared on flap ${end.run.used} of ${N}.` : MSG[end.cause] ?? MSG.trap}</p>
              <Btn variant="play" className="block" onClick={() => dispatch({ type: 'go', screen: 'results' })} autoFocus>Mission report</Btn>
              <div className="row"><Btn variant="slate" onClick={retry}>Retry <Key>R</Key></Btn><Btn variant="slate" onClick={() => dispatch({ type: 'reset' })}>Menu</Btn></div>
            </motion.div></motion.div>)}</AnimatePresence>
      </div>
    </div>
  );
}
