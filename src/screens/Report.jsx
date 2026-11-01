import { useEffect, useState } from 'react';
import { animate, motion } from 'framer-motion';
import { Btn } from '../components/ui.jsx';
import { fmt, useKey } from '../components/Chrome.jsx';
import { TIPS } from '../data.js';

export function Budget({ state, dispatch }) {
  const n = state.moves || state.correct || 0, [v, setV] = useState(0), low = n < 1;
  useEffect(() => { const a = animate(0, n, { duration: .9, ease: 'easeOut', onUpdate: x => setV(Math.round(x)) }); return () => a.stop(); }, [n]);
  useKey([' ', 'Enter'], () => (low ? dispatch({ type: 'reset', screen: 'research' }) : dispatch({ type: 'go', screen: 'game' })), [low]);
  return (
    <div className="card page center">
      <h2>Your attempts</h2>
      <motion.div className="big-number" initial={{ scale: .4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>{v}</motion.div>
      <div className="pips big">{state.answers.map((a, i) => <motion.i key={i} className={a ? 'ok' : 'bad'} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .1 * i + .2 }} />)}</div>
      {low ? <p className="warn">You made 0 correct guesses. You need at least 1 correct guess to earn an attempt. Restart and verify again.</p>
        : <><p className="muted">You guessed {n} of {state.answers.length} samples correctly. That earns you exactly {n} attempt{n > 1 ? 's' : ''}.</p>
          <div className="route" aria-label="Route preview">{Array.from({ length: Math.max(0, n - 1) }, (_, i) => <span key={i} className="gate-dot" />)}<span className="exit-flag">EXIT</span></div>
          <p className="small muted">{n > 1 ? `${n - 1} gate${n - 1 > 1 ? 's' : ''}, then the exit pad.` : 'Direct glide to the exit pad.'} You have {n} attempt{n > 1 ? 's' : ''} to reach the pad.</p></>}
      {low ? <Btn variant="play" className="block" onClick={() => dispatch({ type: 'reset', screen: 'research' })}>Restart mission</Btn>
        : <Btn variant="play" className="block" onClick={() => dispatch({ type: 'go', screen: 'game' })} autoFocus>Start the run</Btn>}
    </div>
  );
}

export function Results({ state, dispatch }) {
  const { won, correct, answers, best, score, bestScore, run } = state, total = answers.length || 6;
  const tip = TIPS[score % TIPS.length], newBest = score > 0 && score >= bestScore;
  useKey([' ', 'Enter'], () => dispatch({ type: 'reset', screen: 'research' }), []);
  return (
    <div className="card page center">
      <img className={`result-hero ${won ? 'xlr8' : 'ben'}`} src={`${import.meta.env.BASE_URL}art/${won ? 'xlr8' : 'ben'}.png`} alt={won ? 'The hero transformed' : 'The hero'} />
      <h2 className={won ? 'win' : 'lose'}>{won ? (correct === total ? 'Perfect run' : 'Mission cleared') : 'Mission failed'}</h2>
      <motion.div className="score-big" initial={{ scale: .5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220 }}>{fmt(score)}</motion.div>
      {newBest && <p className="newbest">New best score</p>}
      <dl className="stats">
        <div><dt>Gates</dt><dd>{run?.passed ?? 0}</dd></div><div><dt>Coins</dt><dd>{run?.coins ?? 0}</dd></div>
        <div><dt>Attempts</dt><dd>{run?.attempt ?? 1}/{correct}</dd></div><div><dt>Best clear</dt><dd>{best}</dd></div>
      </dl>
      <p className="muted">{won ? `You verified the samples and landed on the exit in attempt ${run?.attempt ?? 1} of ${correct}.` : (run?.cause === 'pipe' ? 'You clipped a gate. The same route is waiting.' : 'The spike trap ended the run. The same route is waiting.')}</p>
      <p className="tip">Takeaway: {tip}</p>
      <Btn variant="play" className="block" onClick={() => dispatch({ type: 'reset', screen: 'research' })} autoFocus>New mission</Btn>
      <div className="row"><Btn variant="slate" onClick={() => dispatch({ type: 'reset' })}>Menu</Btn></div>
    </div>
  );
}
