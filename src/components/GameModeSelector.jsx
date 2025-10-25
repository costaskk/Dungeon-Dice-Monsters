import React, { useEffect, useState } from 'react'
import { initFirebaseOnce, createRoom, joinRoom, onRoom, pushAction, setRoomStatus } from '../game/firebase'

export default function GameModeSelector({ onSelect }){
  // onSelect({ mode:'local'|'ai'|'online', profile, online?: { roomCode, role:'host'|'guest' } })
  const [name, setName] = useState(localStorage.getItem('ddm_name') || '')
  const [avatar, setAvatar] = useState(localStorage.getItem('ddm_avatar') || '🧙')
  const [roomCode, setRoomCode] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(()=>{ initFirebaseOnce() }, [])

  const profile = { name: name||'Player', avatar, ts: Date.now() }

  function saveProfile(){
    localStorage.setItem('ddm_name', name||'Player')
    localStorage.setItem('ddm_avatar', avatar)
  }

  async function onCreate(){
    saveProfile()
    const code = await createRoom(profile)
    onSelect({ mode:'online', profile, online:{ roomCode: code, role:'host' } })
  }
  async function onJoin(){
    if(!roomCode) return
    saveProfile()
    setJoining(true)
    try{
      await joinRoom(roomCode.toUpperCase(), profile)
      onSelect({ mode:'online', profile, online:{ roomCode: roomCode.toUpperCase(), role:'guest' } })
    }finally{
      setJoining(false)
    }
  }

  return (
    <div className="max-w-md mx-auto my-6 p-4 bg-slate-900/80 rounded-2xl shadow-lg text-slate-100">
      <div className="text-lg font-bold mb-2">Dungeon Dice Monsters</div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {['🧙','🐉','🗡️','🛡️','🧝','👹','👾','🐺'].map(a=>(
          <button key={a} className={`py-2 rounded-lg ${avatar===a?'bg-amber-600 text-slate-900 font-bold':'bg-slate-700'}`} onClick={()=>setAvatar(a)}>{a}</button>
        ))}
      </div>

      <label className="block text-sm mb-1">Player Name</label>
      <input value={name} onChange={e=>setName(e.target.value)} className="w-full mb-3 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" placeholder="Your name" />

      <div className="grid grid-cols-1 gap-2">
        <button onClick={()=>{ saveProfile(); onSelect({ mode:'local', profile }) }} className="rounded-lg bg-slate-700 py-2">Local 2-Player</button>
        <button onClick={()=>{ saveProfile(); onSelect({ mode:'ai', profile }) }} className="rounded-lg bg-indigo-600 py-2 font-semibold">Vs AI</button>
      </div>

      <div className="mt-4 border-t border-slate-700 pt-3">
        <div className="text-sm font-semibold mb-2">Online Match</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCreate} className="rounded-lg bg-emerald-600 py-2 font-semibold">Create Room</button>
          <div className="flex gap-2">
            <input value={roomCode} onChange={e=>setRoomCode(e.target.value)} placeholder="ROOM" className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 uppercase"/>
            <button onClick={onJoin} disabled={joining} className="rounded-lg bg-amber-600 px-3">{joining?'…':'Join'}</button>
          </div>
        </div>
      </div>

      <p className="text-xs opacity-70 mt-3">Tip: share the room code with a friend after creating a room.</p>
    </div>
  )
}
