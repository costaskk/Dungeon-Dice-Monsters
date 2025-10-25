import React, { useEffect, useState } from "react";
import { GameProvider, useGame } from "./game/state";
import HUD from "./components/HUD";
import Board from "./components/Board";
import CardModal from "./components/CardModal";
import DeckBuilder from "./components/DeckBuilder";

// Load pool for deck builder from the imported JSON (if present) or fallback monsters
async function loadPool(){
  try{
    const res = await fetch("/yugioh_card_database.json",{ cache:"no-store" });
    if(!res.ok) throw new Error("no json");
    const module = await res.json();
    return module?.data || module || [];
  }catch(_){
    const { MONSTERS } = await import("./game/monsters");
    return MONSTERS;
  }
}

function TopBar({ onOpenBuilder }){
  const { newGame } = useGame();
  return (
    <div className="max-w-5xl mx-auto mb-3 flex items-center justify-between">
      <div className="text-xl font-bold">Dungeon Dice Monsters</div>
      <div className="flex gap-2">
        <div className="relative group">
          <button className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold">
            New Game
          </button>
          <div className="absolute right-0 mt-1 hidden group-hover:block bg-slate-800 rounded-lg shadow overflow-hidden">
            <button
              className="block px-4 py-2 w-full text-left hover:bg-slate-700"
              onClick={()=>newGame({ mode:"basic" })}
            >Basic (3 cards)</button>
            <button
              className="block px-4 py-2 w-full text-left hover:bg-slate-700"
              onClick={()=>newGame({ mode:"advanced" })}
            >Advanced (10 cards)</button>
          </div>
        </div>
        <button onClick={onOpenBuilder} className="px-3 py-1 rounded-lg bg-slate-700">
          Deck Builder
        </button>
      </div>
    </div>
  );
}

export default function App(){
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderPool, setBuilderPool] = useState([]);
  useEffect(()=>{ (async()=> setBuilderPool(await loadPool()))(); },[]);

  return (
    <GameProvider>
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 p-3">
        <TopBar onOpenBuilder={()=>setShowBuilder(true)} />
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_360px] gap-3">
          <div className="bg-slate-900/60 rounded-2xl p-2 shadow-lg">
            <Board />
          </div>
          <HUD />
        </div>
      </div>
      <CardModal />
      {showBuilder && <DeckBuilder allCards={builderPool} onClose={()=>setShowBuilder(false)} />}
    </GameProvider>
  );
}
