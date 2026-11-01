import { useEffect } from 'react';
import { Avatar } from './ui.jsx';
import { sfx, resumeAudio } from '../sfx.js';

const PHASE = { research: 1, quiz: 2, budget: 2, game: 3, results: 3 };
export const fmt = n => String(n).padStart(6, '0');

export function TopHud({ state, dispatch }) {
  const p = PHASE[state.screen] ?? 0;
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

  return (
    <header className="hud-top">
      <button className="player" onClick={() => dispatch({ type: 'reset' })} aria-label="Back to main menu">
        <Avatar size={38} /><span className="player-name">AGENT</span>
      </button>
      {p > 0 && (
        <ol className="phases" aria-label="Mission progress">
          {['Read', 'Verify', 'Fly'].map((t, i) => (
            <li key={t} className={i + 1 < p ? 'done' : i + 1 === p ? 'now' : ''} aria-current={i + 1 === p ? 'step' : undefined}>{t}</li>
          ))}
        </ol>
      )}
      <div className="trophy" title="Best score"><span aria-hidden="true">🏆</span><b>{fmt(state.bestScore)}</b></div>
      <button
        className="round-btn"
        aria-pressed={isMuted}
        aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
        title={isMuted ? 'Unmute sound (M)' : 'Mute sound (M)'}
        onClick={toggleMute}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </header>
  );
}

/** Hook: run a handler when SPACE / Enter is pressed (desktop affordance from the reference UI). */
export function useKey(keys, fn, deps = []) {
  useEffect(() => {
    const h = e => { if (keys.includes(e.key) && !e.repeat && !/INPUT|TEXTAREA|BUTTON|A/.test(e.target.tagName)) { e.preventDefault(); fn(e); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, deps); // eslint-disable-line
}
