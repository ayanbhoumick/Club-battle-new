# The Nth Move — v3 (Flappy Bird × verification puzzle)

**Stack:** React 18 · Vite 5 · Three.js (voxel renderer, no React wrapper) · Framer Motion · WebAudio (no audio files)

## Run
```bash
npm install
npm run dev        # http://localhost:5173  (add ?debug to expose window.__nth for testing)
npm run build      # static site in dist/
npm run verify     # proves every level (N = 2..6, 60 seeds each) is winnable
```

## The game (your plan, implemented)
1. **Read** the research note (rendered in-app, works on phones) and enter the verification-set size (6).
2. **Verify** six image / text / news / audio samples. Each correct label = **one flap**. N = correct answers.
3. **Fly** a Flappy Bird run with exactly **N flaps**: N−1 gates, then the exit pad. The rest of the street is a spike trap,
   so the Nth flap can win or kill you, and you may reach the exit on any flap ≤ N.

Score: 100 per gate, 50 per heart, 500 for the exit, 75 per unused flap.

## Structure
- `src/game/sim.js` – deterministic fixed-step rules + solvable level builder (levels are generated from a planned ideal run)
- `src/game/world.js` – Three.js scene: recycling voxel city, bird, pipes, spikes, exit beam, particles, camera shake
- `src/game/voxel.js`, `textures.js` – voxel mesher and procedural pixel textures (no image assets)
- `src/screens/` – Home (Play / How to / Scores / Options), Research, Quiz, Budget, Game, Results
- `src/data.js` – quiz content; `src/sfx.js` – effects + looping chiptune
- `scripts/verify-levels.mjs`, `dev/harness.html` – bot test and render harness

## Notes
- UI language follows your references: dusk pixel street, pink keycaps, chunky orange Play, slate menu buttons, avatar + trophy HUD.
- All art is original (the Freddy character from the reference was not copied).
- Options → Pixel size trades sharpness for speed on older phones.

## v3.1 UI changes
- Menu background is now an animated pixel chase scene (runner with a glowing wrist-dial escaping alien creatures under saucers). `src/components/Backdrop.jsx`
- The Play button is a wrist-dial watch; tapping it (or SPACE) triggers a full-screen green warp transition into the Research page. `src/components/Watch.jsx`, `Warp` in `src/App.jsx`
- The Research page shows a research paragraph that contains the verification-set size.
- Optional: drop your own artwork at `public/art/background.jpg` and `public/art/watch.png`; they override the drawn versions automatically.

## v3.2 character update
- `public/art/ben.png`, `omnitrix.png`, `xlr8.png` are your supplied images (checkerboard backgrounds removed). Replace any file to restyle.
- Menu: the hero runs from the aliens in the background; the Play button is the watch image and still triggers the warp transition.
- Game: the flappy "bird" is the hero sprite (a crisp DOM sprite that follows the 3D physics body). Hearts are now spinning gold coins; each coin flies to the watch in the top-right HUD and charges it (green fill + n/N counter, pulses when full).
- Win: the hero transforms (flash + pop) into the alien form and dashes off with speed trails; the results screen shows the alien animated on a win.

## v3.3 content update
- Menu background is the supplied city image (`public/art/city.jpg`) with the hero and aliens running in front.
- `src/data.js`: `POOL` holds every question (7 news briefs from article_ACM.docx, 10 text passages from Futuristic_Tech_Arena.docx, AI audio clips, 2 placeholder images). `PASSAGES` holds five research passages that each state a count (4 to 8).
- Each run picks a random passage; that count is the number of questions, drawn at random from `POOL` and spread across media types. Levels with 2 to 8 flaps are verified winnable (`npm run verify`).
- Audio is played from `public/audio/` with a normal player. `clip-0023` and `clip-0024` are held out (`AUDIO_HOLD`) until their labels are confirmed.
- To add items: append to `POOL` (answer `'real'` = human-made, `'ai'` = AI-made).
- Fixed: audio questions crashed the quiz (missing useState import in Samples.jsx); added an error boundary in App.jsx.
