import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Btn, Key, Avatar, Hearts } from '../components/ui.jsx';
import { fmt } from '../components/Chrome.jsx';
import { sfx, vibrate, startMusic, resumeAudio } from '../sfx.js';
import { World } from '../game/world.js';
import { Sim } from '../game/sim.js';

const ART = `${import.meta.env.BASE_URL}art/`;
const MSG = {
  trap: 'You hit the ground. Tap before you fall too far!',
  pipe: 'You clipped a pipe. Flap before the gate, not at it.',
  gates: 'You reached the pad without clearing every gate.',
};

export default function Game({ state, dispatch }) {
  const totalAttempts = Math.max(1, state.moves || state.correct || 1);
  const N = totalAttempts;

  // ── Refs to fix stale-closure bugs in Three.js callbacks ──────────────────
  const attemptsLeftRef = useRef(totalAttempts);
  const sessionBestRef  = useRef(0);
  const attemptCountRef = useRef(1);

  // ── React state (UI only) ─────────────────────────────────────────────────
  const [attemptsLeft,   setAttemptsLeft]   = useState(totalAttempts);
  const [attemptCount,   setAttemptCount]   = useState(1);
  const [sessionBest,    setSessionBest]    = useState(0);

  // Keep refs in sync with state
  useEffect(() => { attemptsLeftRef.current = attemptsLeft; }, [attemptsLeft]);
  useEffect(() => { attemptCountRef.current = attemptCount; }, [attemptCount]);

  // ── DOM / Three.js refs ───────────────────────────────────────────────────
  const cv        = useRef();
  const phoneRef  = useRef();
  const chargeRef = useRef();
  const heroRef   = useRef();
  const formRef   = useRef('ben');
  const posRef    = useRef({ x: 0, y: 0 });
  const simRef    = useRef();
  const worldRef  = useRef();
  const pausedRef = useRef(false);

  const [ui,      setUi]      = useState({ status: 'ready', left: N, passed: 0, coins: 0, speedMult: 1.0 });
  const [paused,  setPaused]  = useState(false);
  const [end,     setEnd]     = useState(null);
  const [fail,    setFail]    = useState(false);
  const [toast,   setToast]   = useState(null);

  const [form,    setFormState] = useState('ben');
  const [charged, setCharged]   = useState(0);
  const [fly,     setFly]       = useState([]);
  const [flash,   setFlash]     = useState(null);

  const setForm = f => { formRef.current = f; setFormState(f); };
  const land    = id => { setFly(l => l.filter(c => c.id !== id)); setCharged(c => c + 1); sfx.click(); };

  const isMuted   = Boolean(state.settings.muted || (!state.settings.sfx && !state.settings.music));
  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (!nextMuted) resumeAudio();
    dispatch({ type: 'settings', patch: { muted: nextMuted, sfx: !nextMuted, music: !nextMuted } });
    if (!nextMuted) setTimeout(sfx.click, 30);
  };

  // ── Event handler (reads from refs — never stale) ─────────────────────────
  const onEvents = useCallback((evs, sim) => {
    for (const e of evs) {
      if (e.type === 'flap')  sfx.flap();
      if (e.type === 'empty') { sfx.empty(); setToast('Out of flaps. Glide to the pad!'); }
      if (e.type === 'gate')  sfx.gate();
      if (e.type === 'coin') {
        sfx.coin();
        const ph = phoneRef.current?.getBoundingClientRect();
        const ch = chargeRef.current?.getBoundingClientRect();
        if (ph && ch) {
          setFly(l => [...l, {
            id: Math.random(),
            sx: posRef.current.x, sy: posRef.current.y,
            tx: ch.left - ph.left + ch.width / 2,
            ty: ch.top  - ph.top  + ch.height / 2,
          }]);
        } else {
          setCharged(c => c + 1);
        }
      }
      if (e.type === 'lose') { sfx.crash(); vibrate([40, 30, 80]); }
      if (e.type === 'win')  { sfx.win();   vibrate(30); setForm('xlr8'); setFlash({ k: Math.random(), ...posRef.current }); }
      if (e.type === 'start') setToast(null);
    }

    setUi({
      status:    sim.status,
      left:      sim.flapsLeft === Infinity ? '∞' : sim.flapsLeft,
      passed:    sim.passed,
      coins:     sim.coins,
      speedMult: sim.speedMult ?? 1.0,
    });

    if (sim.status === 'won' || sim.status === 'lost') {
      const won = sim.status === 'won';

      if (won) {
        // Non-infinite: the player reached the exit pad
        const run = { passed: sim.passed, coins: sim.coins, used: sim.flapsUsed, cause: sim.cause, attempt: attemptCountRef.current, totalAttempts };
        dispatch({ type: 'finish', won: true, used: sim.flapsUsed, score: sim.score, run });
        setTimeout(() => setEnd({ won: true, cause: sim.cause, score: sim.score, run, attempt: attemptCountRef.current, totalAttempts, canRetry: false }), 1500);
      } else {
        // Read from refs — always current, even inside Three.js animation loop
        const remaining = Math.max(0, attemptsLeftRef.current - 1);
        const runScore  = sim.score;

        // Update session best
        sessionBestRef.current = Math.max(sessionBestRef.current, runScore);
        setSessionBest(sessionBestRef.current);

        // Update refs BEFORE state (state is async; ref is sync)
        attemptsLeftRef.current = remaining;
        setAttemptsLeft(remaining);

        const canRetry = remaining > 0;
        const run = { passed: sim.passed, coins: sim.coins, used: sim.flapsUsed, cause: sim.cause, attempt: attemptCountRef.current, totalAttempts, remaining };

        if (canRetry) {
          // Do NOT dispatch 'finish' yet — just show the retry overlay
          setTimeout(() => setEnd({
            won: false, cause: sim.cause, score: runScore,
            sessionBest: sessionBestRef.current,
            run, attempt: attemptCountRef.current, totalAttempts, remaining, canRetry: true,
          }), 1100);
        } else {
          // All attempts exhausted — dispatch finish with the best score
          dispatch({ type: 'finish', won: false, used: sim.flapsUsed, score: sessionBestRef.current, run });
          setTimeout(() => setEnd({
            won: false, cause: sim.cause, score: sessionBestRef.current,
            sessionBest: sessionBestRef.current,
            run, attempt: attemptCountRef.current, totalAttempts, remaining: 0, canRetry: false,
          }), 1100);
        }
      }
    }
  }, [dispatch, totalAttempts]); // intentionally omit attemptsLeft — use ref instead

  // ── Mount Three.js world (infinite mode) ──────────────────────────────────
  useEffect(() => {
    const sim = new Sim(N, state.seed, /* infinite= */ true);
    simRef.current = sim;
    let w;
    try {
      w = new World(cv.current, {
        pixel: state.settings.pixel,
        mode: 'game',
        infinite: true,
        onBird: b => {
          const el = heroRef.current; if (!el) return;
          posRef.current = { x: b.x, y: b.y };
          const xl = formRef.current === 'xlr8';
          const h = (xl ? 1.25 : 1.45) * b.ppu;
          const sq = 1 - (1 - b.flap) * .08, st = 1 + (1 - b.flap) * .1;
          el.style.height = `${h}px`;
          el.style.visibility = 'visible';
          el.style.transform = `translate(${b.x}px,${b.y}px) translate(-50%,-52%) rotate(${xl ? -b.rot * .4 : -b.rot}rad) scale(${sq},${st})`;
        },
        onFrame: dt => {
          if (pausedRef.current) return;
          sim.advance(dt);
          const evs = sim.events.splice(0);
          if (evs.length) { w.handle(evs); onEvents(evs, sim); }
        },
      });
      w.setMode('game');
      w.loadLevel(sim); // loadLevel is adapted to skip spikes/pad in infinite mode
      w.start();
      worldRef.current = w;
      if (new URLSearchParams(location.search).has('debug')) window.__nth = { sim, world: w };
    } catch (err) { console.warn(err); setFail(true); }
    return () => w?.dispose();
  }, [N, state.seed]); // eslint-disable-line

  // ── Flap ──────────────────────────────────────────────────────────────────
  const flap = useCallback(() => {
    const s = simRef.current; if (!s || pausedRef.current || end) return;
    if (s.status === 'ready') startMusic();
    const evs = []; s.flap(); evs.push(...s.events.splice(0));
    if (evs.length) { worldRef.current?.handle(evs); onEvents(evs, s); }
  }, [onEvents, end]);

  const setPause = v => { pausedRef.current = v; setPaused(v); if (worldRef.current) worldRef.current.paused = v; };

  // ── Retry (respawn) ───────────────────────────────────────────────────────
  const retry = () => {
    if (attemptsLeftRef.current <= 0) return;
    const nextAttempt = attemptCountRef.current + 1;
    attemptCountRef.current = nextAttempt;
    setAttemptCount(nextAttempt);

    const s = simRef.current;
    s.reset();               // resets bird, speed, infinite gates
    worldRef.current.resetRun();
    setEnd(null);
    setToast(null);
    setPause(false);
    setForm('ben');
    setCharged(0);
    setFly([]);
    setFlash(null);
    setUi({ status: 'ready', left: '∞', passed: 0, coins: 0, speedMult: 1.0 });
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = e => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (/BUTTON/.test(e.target.tagName) && e.key === ' ') return;
        e.preventDefault(); if (!e.repeat) flap();
      }
      if (e.key === 'p' || e.key === 'Escape') { if (ui.status === 'playing' || paused) setPause(!pausedRef.current); }
      if ((e.key === 'r' || e.key === 'R') && end && end.canRetry) retry();
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });
  useEffect(() => {
    const v = () => { if (document.hidden && simRef.current?.status === 'playing') setPause(true); };
    document.addEventListener('visibilitychange', v); return () => document.removeEventListener('visibilitychange', v);
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);

  // ── Derived display values ────────────────────────────────────────────────
  const currentScore = ui.passed * 100 + ui.coins * 50;
  const speedLabel   = ui.speedMult !== undefined ? `${Number(ui.speedMult).toFixed(1)}×` : '1.0×';

  return (
    <div className="game-page">
      <div className="phone" ref={phoneRef} onPointerDown={e => { if (e.target.closest('button,.sheet')) return; flap(); }}>
        <div className="stage"><canvas ref={cv} aria-label="Flappy Bird style game. Press space or tap to flap." role="img" /></div>
        <div className="hero-pos" ref={heroRef} aria-hidden="true">
          <img key={form} className={`hero-sprite ${form}`} src={`${ART}${form === 'xlr8' ? 'xlr8' : 'ben'}.png`} alt="" draggable="false" />
        </div>
        {flash && <motion.div key={flash.k} className="xform-flash" style={{ left: flash.x, top: flash.y }} initial={{ opacity: .95, scale: .2 }} animate={{ opacity: 0, scale: 4 }} transition={{ duration: .8 }} />}
        {fly.map(c => <motion.i key={c.id} className="fly-coin" initial={{ x: c.sx, y: c.sy, scale: 1 }} animate={{ x: c.tx, y: c.ty, scale: .45 }} transition={{ duration: .7, ease: 'easeIn' }} onAnimationComplete={() => land(c.id)} />)}
        {fail && <div className="overlay"><div className="card center"><h3>3D is unavailable</h3><p className="muted">Your browser blocked WebGL. Try Chrome or Safari, or turn on hardware acceleration.</p><Btn variant="slate" onClick={() => dispatch({ type: 'reset' })}>Menu</Btn></div></div>}

        {/* ── HUD ── */}
        <div className="game-hud">
          <div className="hud-row">
            <div className="player"><Avatar size={34} /><span className="player-name">AGENT</span></div>
            {/* Score: current | best */}
            <div className="trophy" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <span style={{ fontSize: 8, color: '#aaa', fontFamily: 'var(--f-ui)' }}>
                BEST <b style={{ color: '#ffd24a' }}>{fmt(sessionBest)}</b>
              </span>
              <span><span aria-hidden="true">🏆</span> <b>{fmt(currentScore)}</b></span>
            </div>
            {/* Omnitrix charge (coins collected) — hidden in infinite mode since no gate count */}
            <div ref={chargeRef} className="charge" role="img" aria-label={`Coins collected: ${ui.coins}`}>
              <img className="charge-base" src={`${ART}omnitrix.png`} alt="" />
              <img className="charge-lit"  src={`${ART}omnitrix.png`} alt="" style={{ clipPath: `inset(0 ${Math.max(0, 100 - ui.coins * 10)}% 0 0)` }} />
              <b key={ui.coins} className="bump">{ui.coins}</b>
            </div>
          </div>

          <div className="flap-row">
            <span className="flap-label">Attempts</span>
            <Hearts total={totalAttempts} left={attemptsLeft} />
            {/* Speed multiplier indicator */}
            <span className="flap-label" style={{ marginLeft: 6, color: ui.speedMult >= 2 ? '#ff7a7a' : ui.speedMult >= 1.5 ? '#ffcc44' : '#aaffcc' }}>
              {speedLabel}
            </span>
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

          {/* Gate dots — hidden in infinite mode */}
        </div>

        {/* ── Ready prompt ── */}
        <AnimatePresence>{ui.status === 'ready' && !end && !fail && (
          <motion.div className="ready-prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="only-keys">press <Key wide>SPACE</Key> to start</p>
            <p className="only-touch">tap anywhere to start</p>
            <p className="rule">
              Attempt {attemptCount} of {totalAttempts}. Fly as far as you can — pipes scroll forever!
              {sessionBest > 0 && ` Session best: ${fmt(sessionBest)}.`}
            </p>
          </motion.div>
        )}</AnimatePresence>

        {/* ── Toast ── */}
        <AnimatePresence>{toast && <motion.div className="toast" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>{toast}</motion.div>}</AnimatePresence>

        {/* ── Pause overlay ── */}
        <AnimatePresence>{paused && !end && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card center">
              <h3>Paused</h3>
              <p className="muted small" style={{ marginBottom: 12 }}>
                Attempt {attemptCount} of {totalAttempts} · {attemptsLeft} left · {speedLabel} speed
              </p>
              <Btn variant="play" className="block" onClick={() => setPause(false)} autoFocus>Resume</Btn>
              <div className="row" style={{ marginTop: 8 }}>
                <Btn variant="slate" onClick={toggleMute}>{isMuted ? 'Unmute 🔇' : 'Mute 🔊'}</Btn>
                {attemptsLeft > 1
                  ? <Btn variant="slate" onClick={() => { attemptsLeftRef.current = attemptsLeftRef.current - 1; setAttemptsLeft(a => a - 1); retry(); }}>Restart run</Btn>
                  : null}
                <Btn variant="slate" onClick={() => dispatch({ type: 'reset' })}>Menu</Btn>
              </div>
            </div>
          </motion.div>
        )}</AnimatePresence>

        {/* ── End / Retry overlay ── */}
        <AnimatePresence>{end && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="card center end-card" initial={{ scale: .85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
              <h2 className={end.won ? 'win' : 'lose'}>
                {end.won ? 'Exit reached' : (end.canRetry ? `Attempt ${end.attempt} failed` : 'All attempts used')}
              </h2>

              {/* Score block */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '8px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#aaa', fontFamily: 'var(--f-ui)' }}>THIS RUN</div>
                  <div className="score-big sm">{fmt(end.score)}</div>
                </div>
                {end.sessionBest > 0 && end.sessionBest !== end.score && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#ffd24a', fontFamily: 'var(--f-ui)' }}>BEST</div>
                    <div className="score-big sm" style={{ color: '#ffd24a' }}>{fmt(end.sessionBest)}</div>
                  </div>
                )}
              </div>

              <p className="muted">
                {end.won
                  ? `Cleared on attempt ${end.attempt} of ${end.totalAttempts}.`
                  : (end.canRetry
                      ? `${MSG[end.cause] ?? MSG.trap} ${end.remaining} attempt${end.remaining > 1 ? 's' : ''} left.`
                      : `Run over. You used all ${end.totalAttempts} attempts.`)}
              </p>

              {end.canRetry ? (
                <>
                  <Btn variant="play" className="block" onClick={retry} autoFocus>
                    Retry (Attempt {end.attempt + 1} of {end.totalAttempts}) <Key>R</Key>
                  </Btn>
                  <div className="row" style={{ marginTop: 8 }}>
                    <Btn variant="slate" onClick={() => dispatch({ type: 'go', screen: 'results' })}>Report</Btn>
                    <Btn variant="slate" onClick={() => dispatch({ type: 'reset' })}>Menu</Btn>
                  </div>
                </>
              ) : (
                <>
                  <Btn variant="play" className="block" onClick={() => dispatch({ type: 'go', screen: 'results' })} autoFocus>
                    Mission report
                  </Btn>
                  <div className="row" style={{ marginTop: 8 }}>
                    <Btn variant="slate" onClick={() => dispatch({ type: 'reset', screen: 'research' })}>New mission</Btn>
                    <Btn variant="slate" onClick={() => dispatch({ type: 'reset' })}>Menu</Btn>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}</AnimatePresence>
      </div>
    </div>
  );
}
