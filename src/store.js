const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
import { makeRound } from './data.js';
export const DEFAULT_SETTINGS = { sfx: true, music: true, muted: false, pixel: 3 };

export const initial = () => {
  const savedSettings = get('nth-settings', {});
  const muted = savedSettings.muted ?? (savedSettings.sfx === false && savedSettings.music === false);
  return {
    ...makeRound(), screen: 'home', warp: null, correct: 0, answers: [], moves: 0, seed: 1 + Math.floor(Math.random() * 9999),
    run: null, won: false, movesUsed: 0, score: 0, attempts: 0, attemptsLeft: 0,
    best: get('nth-best', 0), bestScore: get('nth-best-score', 0),
    runs: get('nth-runs', []), settings: { ...DEFAULT_SETTINGS, ...savedSettings, muted },
  };
};

export function reducer(s, a) {
  switch (a.type) {
    case 'go': return { ...s, screen: a.screen };
    case 'warp': return s.warp ? s : { ...s, warp: a.to };
    case 'warpDone': return { ...s, screen: s.warp ?? s.screen, warp: null };
    case 'answer': return { ...s, correct: s.correct + (a.ok ? 1 : 0), answers: [...s.answers, a.ok] };
    case 'budget': return { ...s, moves: s.correct, attempts: s.correct, attemptsLeft: s.correct, screen: 'budget' };
    case 'finish': {
      const best = a.won ? Math.max(s.best, s.correct) : s.best;
      const bestScore = Math.max(s.bestScore, a.score);
      const runs = a.score > 0 ? [...s.runs, { score: a.score, moves: s.correct, won: a.won, at: Date.now() }].sort((x, y) => y.score - x.score).slice(0, 8) : s.runs;
      set('nth-best', best); set('nth-best-score', bestScore); set('nth-runs', runs);
      return { ...s, won: a.won, movesUsed: a.used, score: a.score, run: a.run, best, bestScore, runs };
    }
    case 'settings': { const settings = { ...s.settings, ...a.patch }; set('nth-settings', settings); return { ...s, settings }; }
    case 'clearScores': set('nth-best', 0); set('nth-best-score', 0); set('nth-runs', []); return { ...s, best: 0, bestScore: 0, runs: [] };
    case 'reset': return { ...initial(), best: s.best, bestScore: s.bestScore, runs: s.runs, settings: s.settings, screen: a.screen ?? 'home' };
    default: return s;
  }
}
