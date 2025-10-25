import React, { useEffect, useRef } from 'react'
import { useNet } from '../game/net'
import { useGame } from '../game/state'

/**
 * Listens to Firebase room actions and applies anything created by the opponent.
 * This is intentionally simple and resilient for casual play.
 */
export default function NetController(){
  const { mode, roomState, role } = useNet()
  const {
    tryDimensionAt, placeSummonAt, tryMove, tryAttack,
    castSpell, setTrap, endTurn
  } = useGame()
  const processed = useRef(new Set())

  useEffect(()=>{
    if(mode!=='online') return
    const actionsObj = roomState?.actions || {}
    const entries = Object.entries(actionsObj) // [[key, action], ...]
    entries.sort((a,b)=> (a[1].ts||0) - (b[1].ts||0)) // oldest first

    for(const [key, action] of entries){
      if(processed.current.has(key)) continue
      processed.current.add(key)
      if(action.role === role) continue // we authored it

      // Apply the action locally
      switch(action.type){
        case 'DIMENSION':  tryDimensionAt(action.x, action.y); break
        case 'PLACE_SUMMON': placeSummonAt(action.x, action.y); break
        case 'MOVE': tryMove(action.x, action.y); break
        case 'ATTACK': tryAttack(action.x, action.y); break
        case 'CAST_SPELL': castSpell(); break
        case 'SET_TRAP': setTrap(); break
        case 'END_TURN': endTurn(); break
        default: break
      }
    }
  }, [mode, roomState, role, tryDimensionAt, placeSummonAt, tryMove, tryAttack, castSpell, setTrap, endTurn])

  return null
}
