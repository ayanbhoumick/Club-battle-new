import { Component, useEffect, useReducer, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { reducer, initial } from './store.js';
import { configure, sfx, resumeAudio } from './sfx.js';
import { TopHud } from './components/Chrome.jsx';
import Backdrop from './components/Backdrop.jsx';
import { Home, How } from './screens/Home.jsx';
import Research from './screens/Research.jsx';
import Quiz from './screens/Quiz.jsx';
import { Budget, Results } from './screens/Report.jsx';
import Game from './screens/Game.jsx';

class Boundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', zIndex: 200, background: '#120c1f' }}>
      <div><h3 style={{ font: '14px var(--f-ui)', color: '#ff5c7a', marginBottom: 12 }}>Something broke</h3>
        <p className="muted small" style={{ marginBottom: 16 }}>{String(this.state.err?.message || this.state.err)}</p>
        <button className="text-btn" onClick={() => { this.setState({ err: null }); this.props.onReset(); }}>Back to menu</button></div></div>;
  }
}
const C0 = 'circle(0% at 50% 60%)', C1 = 'circle(150% at 50% 60%)';
const Warp = ({ onDone }) => (
  <motion.div className="warp" initial={{ clipPath: C0, opacity: 1 }} animate={{ clipPath: [C0, C1, C1], opacity: [1, 1, 0] }}
    transition={{ clipPath: { duration: 1.3, times: [0, .38, 1], ease: 'easeIn' }, opacity: { duration: 1.3, times: [0, .6, 1] } }} onAnimationComplete={onDone}>
    <div className="warp-spin" /><div className="warp-flash" />
  </motion.div>
);
const SCREENS = { home: Home, how: How, research: Research, quiz: Quiz, budget: Budget, game: Game, results: Results };
function Root() {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  const Screen = SCREENS[state.screen], inGame = state.screen === 'game';
  useEffect(() => { configure(state.settings); }, [state.settings]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [state.screen]);

  // Global 'm' / 'M' key shortcut to toggle mute
  useEffect(() => {
    const h = e => {
      if ((e.key === 'm' || e.key === 'M') && !e.repeat && !/INPUT|TEXTAREA/.test(e.target.tagName)) {
        e.preventDefault();
        const isMuted = Boolean(state.settings.muted || (!state.settings.sfx && !state.settings.music));
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
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [state.settings]);

  return (
    <MotionConfig reducedMotion="user">
      {inGame ? <Game key={state.seed + ':' + state.moves} state={state} dispatch={dispatch} /> : <>
        <Backdrop />
        <main className="shell">
          <TopHud state={state} dispatch={dispatch} />
          <AnimatePresence mode="wait">
            <motion.section key={state.screen} className="screen" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
              <Screen state={state} dispatch={dispatch} />
            </motion.section>
          </AnimatePresence>
        </main></>}
      {state.warp && <Warp key="warp" onDone={() => dispatch({ type: 'warpDone' })} />}
    </MotionConfig>
  );
}

export default function App() {
  const [k, setK] = useState(0);
  return <Boundary key={k} onReset={() => setK(n => n + 1)}><Root /></Boundary>;
}
