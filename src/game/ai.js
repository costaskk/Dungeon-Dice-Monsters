// Very light heuristic AI for DDM (improved)
// Expected "view" shape (as you documented):
//   - turn, phase, rolledDice, players, board
//   - summonableLevel(): returns number or 'WILD'
//   - me, they (derived players for convenience) -- optional
//   - hand: array of monsters in hand
//
// Returns one of:
//   { type:'ROLL' }
//   { type:'ATTACK', from:{x,y}, to:{x,y} }
//   { type:'MOVE',   from:{x,y}, to:{x,y} }
//   { type:'SUMMON_SELECT', card, to?:{x,y} }  // 'to' is a hint, can be ignored
//   { type:'END_TURN' }

export function aiChooseAction(view){
  const { phase, board, turn, players, hand, summonableLevel } = view;
  const me   = players?.[turn] ?? view.me;
  const they = players?.[1 - turn] ?? view.they;

  if (phase === 'roll') {
    return { type:'ROLL' };
  }

  if (phase !== 'action') {
    return { type:'END_TURN' };
  }

  // === 1) ATTACK first if possible (free value before moving)
  const myMon = findMyMonster(board, turn);
  if (myMon && canSpend(me, { attack:1 })) {
    const target = adjacentEnemyOrHeart(myMon, board, 1 - turn);
    if (target) {
      return { type:'ATTACK', from:{x:myMon.x, y:myMon.y}, to:{x:target.x, y:target.y} };
    }
  }

  // === 2) MOVE closer to enemy heart if we can
  if (myMon && canSpend(me, { move:1 })) {
    const step = stepTowardHeartSafe(myMon, turn, board);
    if (step) {
      return { type:'MOVE', from:{x:myMon.x, y:myMon.y}, to: step };
    }
  }

  // === 3) SUMMON the best monster that matches current summon level
  const canLevel = summonableLevel?.();
  if (canLevel) {
    const pick = chooseBestSummon(hand, canLevel);
    if (pick) {
      // Suggest a friendly empty path tile (near own heart if possible)
      const to = findPreferredSummonSpot(board, turn);
      return { type:'SUMMON_SELECT', card: pick, ...(to ? { to } : {}) };
    }
  }

  // === 4) Nothing useful? End turn.
  return { type:'END_TURN' };
}

/* -------------------- helpers -------------------- */

function canSpend(player, cost){
  if (!player?.crests) return false;
  return Object.entries(cost).every(([k,v]) => (player.crests[k]||0) >= v);
}

function findMyMonster(board, myId){
  for(let y=0;y<board.length;y++){
    for(let x=0;x<board[0].length;x++){
      const c = board[y][x];
      if (c.monster && c.monster.owner === myId) return { ...c.monster, x, y };
    }
  }
  return null;
}

function adjacentEnemyOrHeart(mon, board, enemyId){
  const around = [
    {x: mon.x+1, y: mon.y}, {x: mon.x-1, y: mon.y},
    {x: mon.x, y: mon.y+1}, {x: mon.x, y: mon.y-1}
  ];
  for (const p of around) {
    if (!inside(board, p.x, p.y)) continue;
    const c = board[p.y][p.x];
    if ((c.type === 'heart' && c.owner === enemyId) ||
        (c.monster && c.monster.owner !== mon.owner)) {
      return { x:p.x, y:p.y };
    }
  }
  return null;
}

function stepTowardHeartSafe(mon, myId, board){
  const N = board.length;
  const goal = myId === 0 ? { x:N-1, y:N-1 } : { x:0, y:0 };
  const candidates = [
    {x: mon.x+1, y: mon.y}, {x: mon.x-1, y: mon.y},
    {x: mon.x, y: mon.y+1}, {x: mon.x, y: mon.y-1}
  ];
  // Sort by distance to goal
  candidates.sort((a,b)=> manhattan(a,goal)-manhattan(b,goal));
  for (const p of candidates) {
    if (!inside(board, p.x, p.y)) continue;
    const c = board[p.y][p.x];
    // Move only onto a friendly path that is empty
    if (c.type === 'path' && c.owner === myId && !c.monster) return p;
  }
  return null;
}

function findPreferredSummonSpot(board, myId){
  // Use the first friendly empty path tile; prefer nearer to your heart
  const N = board.length;
  const myHeart = myId === 0 ? { x:0, y:0 } : { x:N-1, y:N-1 };
  const spots = [];
  for(let y=0;y<N;y++){
    for(let x=0;x<N;x++){
      const c = board[y][x];
      if (c.type === 'path' && c.owner === myId && !c.monster) {
        spots.push({ x, y, d: manhattan({x,y}, myHeart) });
      }
    }
  }
  if (!spots.length) return null;
  spots.sort((a,b)=> a.d - b.d);
  const { x, y } = spots[0];
  return { x, y };
}

function chooseBestSummon(hand, canLevel){
  if (!hand || !hand.length) return null;
  const filter = (m) => canLevel==='WILD' || (m.stars||m.level)===canLevel;
  return [...hand].filter(filter).sort((a,b)=> (b.atk||0)-(a.atk||0))[0] || null;
}

function inside(board, x,y){ return y>=0 && x>=0 && y<board.length && x<board[0].length; }
function manhattan(a,b){ return Math.abs(a.x-b.x)+Math.abs(a.y-b.y) }
