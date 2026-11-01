import {World} from '../src/game/world.js';import {Sim,DT} from '../src/game/sim.js';
const q=new URLSearchParams(location.search);const mode=q.get('mode')||'game',N=+q.get('n')||5,until=+q.get('t')||0,fail=q.get('fail');
const w=new World(document.getElementById('c'),{pixel:+q.get('px')||3,mode});window.__w=w;
const sim=new Sim(N,1);
if(mode==='game'){w.setMode('game');w.loadLevel(sim);
  // autopilot following the ideal plan (optionally sabotage)
  let k=0;
  window.__step=(sec)=>{const steps=Math.round(sec/DT);for(let i=0;i<steps;i++){if(sim.status==='ready'&&sim.t===0&&k===0){sim.flap();k=1}
    if(k<sim.level.flapPlan.length&&sim.t>=sim.level.flapPlan[k]-1e-9&&!(fail==='skip'&&k===2)){sim.flap();k++}
    sim.advance(DT);if(sim.events.length){w.handle(sim.events.splice(0));}
    w.update(DT);}};
  window.__step(until);for(let i=0;i<90;i++)w.update(1/60);
}else{ for(let i=0;i<until*60;i++)w.update(1/60);}
w.resize();w.renderer.render(w.scene,w.camera);window.__ready=true;
if(!q.get('static'))w.start();
