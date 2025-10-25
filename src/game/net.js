import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onRoom, pushAction } from './firebase'
import { useGame } from './state'

const NetCtx = createContext(null)
export function useNet(){ return useContext(NetCtx) }

/**
 * mode: 'local' | 'ai' | 'online'
 * online?: { roomCode, role: 'host' | 'guest' }
 * profile?: { name, avatar }
 */
export function NetProvider({ mode='local', online=null, profile=null, children }){
  const [roomState, setRoomState] = useState(null)
  const isOnline = mode==='online'
  const roomCode = online?.roomCode || null
  const role = online?.role || null

  // subscribe to the room and keep its snapshot
  useEffect(()=>{
    if(!isOnline || !roomCode) return
    const unsub = onRoom(roomCode, data => setRoomState(data))
    return ()=> unsub && unsub()
  },[isOnline, roomCode])

  // Helper: only allow controls for the current online player
  const { turn } = useGame()
  const isOnlineTurnOwner = isOnline ? (turn===0 ? role==='host' : role==='guest') : true

  function broadcast(action){
    if(!isOnline || !roomCode) return
    // action will be consumed by the other client
    pushAction(roomCode, { role, ...action }).catch(()=>{})
  }

  const value = useMemo(()=>({
    mode, online, profile, role, roomCode,
    roomState, isOnlineTurnOwner, broadcast
  }), [mode, online, profile, role, roomCode, roomState, isOnlineTurnOwner])

  return <NetCtx.Provider value={value}>{children}</NetCtx.Provider>
}
