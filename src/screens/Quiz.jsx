import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Btn, Key } from '../components/ui.jsx';
import { Sample } from '../components/Samples.jsx';
import { sfx, vibrate } from '../sfx.js';

const KEY = 'This matches the answer key. Style alone is never proof, so check the source when you can.';
export default function Quiz({ state, dispatch }) {
  const Q = state.questions, [i, setI] = useState(0), [pick, setPick] = useState(null), nextRef = useRef();
  const q = Q[i], done = pick !== null, ok = done && pick === q.answer;
  const isMuted = Boolean(state.settings.muted || (!state.settings.sfx && !state.settings.music));
  const answer = v => {
    if (done) return;
    setPick(v);
    const good = v === q.answer;
    dispatch({ type: 'answer', ok: good });
    good ? sfx.good() : (sfx.bad(), vibrate(70));
    setTimeout(() => nextRef.current?.focus(), 60);
  };
  const next = () => {
    if (i + 1 >= Q.length) dispatch({ type: 'budget' });
    else { setI(i + 1); setPick(null); }
  };
  useEffect(() => {
    const h = e => {
      if (e.key === '1') answer('real');
      if (e.key === '2') answer('ai');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
  const cls = v => 'answer' + (done && v === q.answer ? ' right' : '') + (done && v === pick && v !== q.answer ? ' wrong' : '');
  return (
    <div className="quiz">
      <div className="quiz-meta"><span className="chip">{q.category}</span><span>{i + 1} / {Q.length}</span>
        <span className="pips" aria-label={`Correct guesses: ${state.correct}`}>{Q.map((_, k) => <i key={k} className={state.answers[k] === undefined ? '' : state.answers[k] ? 'ok' : 'bad'} />)}</span></div>
      <AnimatePresence mode="wait">
        <motion.div key={i} className="card sample-card" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: .2 }}>
          <h3>{q.title}</h3><p className="muted">{q.description}</p>
          <Sample q={q} reveal={done} muted={isMuted} />
        </motion.div>
      </AnimatePresence>
      <div className="answers">
        <button className={cls('real')} disabled={done} onClick={() => answer('real')}><span>Human-made</span><Key>1</Key></button>
        <button className={cls('ai')} disabled={done} onClick={() => answer('ai')}><span>AI-made</span><Key>2</Key></button>
      </div>
      <div className={`verdict ${done ? (ok ? 'success' : 'error') : ''}`} aria-live="polite">
        {done ? <><b>{ok ? 'Correct guess! +1 attempt earned' : 'Incorrect guess. No attempt earned'}</b><p>{q.why ?? KEY}</p><ul>{q.clues.map(c => <li key={c}>{c}</li>)}</ul>{q.source && <p className="small"><a href={q.source} target="_blank" rel="noreferrer">Original source</a></p>}</> : <p className="muted">Guess whether each sample is human or AI. Correct guesses earn attempts.</p>}
      </div>
      <Btn ref={nextRef} variant="play" className="block" onClick={next} disabled={!done}>{i === Q.length - 1 ? 'See my attempts' : 'Next sample'}</Btn>
    </div>
  );
}
