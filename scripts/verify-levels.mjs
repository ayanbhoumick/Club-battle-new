import {Sim,DT,rng} from '../src/game/sim.js';
function run(moves,seed,jit,R){
  const s=new Sim(moves,seed);const plan=s.level.flapPlan.map(t=>t+(jit?(R()*2-1)*jit:0));
  plan[0]=0;let k=0;s.flap(); k=1;
  let guard=0;
  while(s.status==='playing'&&guard++<200000){
    if(k<plan.length&&s.t>=plan[k]-1e-9){s.flap();k++;}
    s.tick();
  }
  return s;
}
let bad=0;
for(let n=2;n<=8;n++){
  let perfect=0,j60=0,j100=0,total=60;
  for(let seed=1;seed<=total;seed++){
    const R=rng(seed*31+n);
    if(run(n,seed,0,R).status==='won')perfect++;
    if(run(n,seed,.06,R).status==='won')j60++;
    if(run(n,seed,.10,R).status==='won')j100++;
  }
  const L=new Sim(n,1).level;
  console.log(`N=${n} gates=${L.gates.length} length=${L.length.toFixed(1)}u idle=${L.idealTime.toFixed(2)}s | perfect ${perfect}/${total} | ±60ms ${j60}/${total} | ±100ms ${j100}/${total}`);
  if(perfect!==total)bad++;
}
process.exit(bad?1:0);
