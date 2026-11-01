import { useState } from 'react';
import { motion } from 'framer-motion';
import { Btn } from '../components/ui.jsx';
import { sfx, vibrate } from '../sfx.js';

// The note is rendered natively (iframes cannot display PDFs on most phones). Passages live in src/data.js (PASSAGES).
export default function Research({ state, dispatch }) {
  const R = state.passage;
  const [val, setVal] = useState(''), [fb, setFb] = useState(null), [tries, setTries] = useState(0), [shake, setShake] = useState(0);
  const submit = e => {
    e.preventDefault();
    if (Number(val) === R.count && val !== '') { setFb({ ok: true, t: 'Clue accepted. Verification round unlocked.' }); sfx.good(); setTimeout(() => dispatch({ type: 'go', screen: 'quiz' }), 650); }
    else { setTries(t => t + 1); setShake(s => s + 1); sfx.bad(); vibrate(60); setFb({ ok: false, t: tries >= 1 ? 'Hint: find the sentence that describes the verification round and count the items it lists.' : 'Not quite. Re-read the paragraph and look for how big the verification set is.' }); }
  };
  return (
    <div className="research">
      <article className="paper" aria-label="Research note">
        <div className="paper-bar"><span>{R.tag}</span></div>
        <h2>{R.title}</h2>
        <p className="paper-body">{R.paragraph}</p>
        <p className="muted small">{R.disclaimer}</p>
      </article>
      <motion.form className="card clue" onSubmit={submit} key={shake} animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: .35 }}>
        <h3>How many items are in the verification set?</h3>
        <label htmlFor="clue">Your answer</label>
        <input id="clue" type="number" inputMode="numeric" min="0" max="99" placeholder="Enter a number" value={val} onChange={e => setVal(e.target.value)} />
        <p className={`feedback ${fb ? (fb.ok ? 'success' : 'error') : ''}`} aria-live="polite">{fb?.t}</p>
        <Btn type="submit" variant="play" className="block">Unlock verification</Btn>
        <button type="button" className="text-btn" onClick={() => dispatch({ type: 'go', screen: 'home' })}>Back to menu</button>
      </motion.form>
    </div>
  );
}
