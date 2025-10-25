import React, { useEffect, useRef } from 'react'
import { useGame } from '../game/state'
import { aiChooseAction } from '../game/ai'

/**
 * Drives the AI when mode==='ai' and it's AI's turn (player 2).
 * Keeps delays for nicer pacing.
 */
export default function AIController({ enabled=false }){
  const {
    board, turn, phase, rolledDice, players,
    roll, tryDimensionAt, placeSummonAt, tryMove, tryAttack, endTurn,
  } = useGame()
  const busy = useRef(false)

  // Convenience view for ai.js
  function summonableLevel(){
    const counts = new Map()
    for(const r of rolledDice){
      if(r?.face?.type==='summon') counts.set(r.face.level,(counts.get(r.face.level)||0)+1)
      if(r?.face?.type==='black') counts.set('WILD',(counts.get('WILD')||0)+1)
    }
    for(const [lvl,c] of counts){ if(lvl==='WILD' && c>=1) return 'WILD'; if(c>=2) return lvl }
    return null
  }

  useEffect(()=>{
    if(!enabled) return
    if(turn!==1) return // AI is Player 2
    if(busy.current) return
    busy.current = true

    const me = players[1]
    const they = players[0]
    const hand = me.hand || []

    const view = { board, turn, phase, rolledDice, me, they, hand, summonableLevel }

    const step = async () => {
      const act = aiChooseAction(view) || { type:'END_TURN' }

      // pacing delays
      const sleep = (ms)=>new Promise(r=>setTimeout(r,ms))
      if(act.type==='ROLL'){ await sleep(350); roll(); busy.current=false; return }
      if(act.type==='SUMMON_SELECT'){
        // select only; actual placement is chosen when you click a path tile.
        // We'll just wait half a second and end turn if nothing else
        await sleep(350)
        busy.current=false; return
      }
      if(act.type==='MOVE'){ await sleep(350); tryMove(act.to.x, act.to.y); busy.current=false; return }
      if(act.type==='ATTACK'){ await sleep(300); tryAttack(act.to.x, act.to.y); busy.current=false; return }
      if(act.type==='END_TURN'){ await sleep(300); endTurn(); busy.current=false; return }
      busy.current=false
    }

    step()
  },[enabled, turn, phase, board, rolledDice, players, roll, tryMove, tryAttack, endTurn])

  return null
}
