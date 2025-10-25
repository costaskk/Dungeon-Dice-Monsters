// Very light heuristic AI for DDM
export function aiChooseAction(view){
  // view exposes: turn, phase, rolledDice, players, board helpers, summonableLevel()
  const { phase, me, they, rolledDice, summonableLevel, hand } = view;

  if(phase === 'roll'){
    return { type:'ROLL' };
  }

  const canSummonLvl = summonableLevel();
  if(phase === 'action'){
    // 1) Try to summon highest ATK that matches level or wild
    if(canSummonLvl){
      const pick = [...hand]
        .filter(m => canSummonLvl==='WILD' || (m.stars||m.level)===canSummonLvl)
        .sort((a,b)=> (b.atk||0)-(a.atk||0))[0];
      if(pick){
        // let UI send coordinates; AI chooses a friendly path tile near its heart (simple)
        // find first path tile owned by AI that is empty
        const targets = [];
        for(let y=0;y<view.board.length;y++){
          for(let x=0;x<view.board[0].length;x++){
            const c = view.board[y][x];
            if(c.type==='path' && c.owner===view.turn && !c.monster) targets.push({x,y});
          }
        }
        const t = targets[0] || { x: view.turn===0? 1: view.board[0].length-2, y: view.turn===0? 0: view.board.length-1 };
        return { type:'SUMMON_SELECT', card: pick };
      }
    }

    // 2) Move towards enemy heart with first movable monster
    const myMon = findMyMonster(view);
    if(myMon){
      const step = stepTowardHeart(myMon, view.turn, view.board.length);
      if(step) return { type:'MOVE', to: step, from:{x:myMon.x,y:myMon.y} };
    }

    // 3) Attack if adjacent
    if(myMon){
      const target = adjacentEnemy(myMon, view.board);
      if(target) return { type:'ATTACK', to:{x:target.x,y:target.y}, from:{x:myMon.x,y:myMon.y} };
    }

    // 4) End turn
    return { type:'END_TURN' };
  }

  return null;
}

function findMyMonster(view){
  for(let y=0;y<view.board.length;y++){
    for(let x=0;x<view.board[0].length;x++){
      const c = view.board[y][x];
      if(c.monster && c.monster.owner===view.turn) return { ...c.monster, x, y };
    }
  }
  return null;
}

function stepTowardHeart(mon, turn, N){
  const goal = turn===0? {x:N-1,y:N-1}:{x:0,y:0};
  const candidates = [
    {x: mon.x+1, y: mon.y}, {x: mon.x-1, y: mon.y},
    {x: mon.x, y: mon.y+1}, {x: mon.x, y: mon.y-1}
  ];
  candidates.sort((a,b)=> manhattan(a,goal)-manhattan(b,goal));
  return candidates[0];
}

function manhattan(a,b){ return Math.abs(a.x-b.x)+Math.abs(a.y-b.y) }

function adjacentEnemy(mon, board){
  const around = [
    {x: mon.x+1, y: mon.y}, {x: mon.x-1, y: mon.y},
    {x: mon.x, y: mon.y+1}, {x: mon.x, y: mon.y-1}
  ];
  for(const p of around){
    if(p.x<0||p.y<0||p.y>=board.length||p.x>=board[0].length) continue;
    const c = board[p.y][p.x];
    if(c.monster && c.monster.owner!==mon.owner) return { ...c.monster, x:p.x, y:p.y };
  }
  return null;
}
