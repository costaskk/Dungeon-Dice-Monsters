import React, { useState, useEffect } from "react";
import { GameProvider } from "./game/state";
import { NetProvider } from "./game/net";
import Board from "./components/Board";
import HUD from "./components/HUD";
import CardModal from "./components/CardModal";
import GameModeSelector from "./components/GameModeSelector";
import NetController from "./components/NetController";
import AIController from "./components/AIController";

// Optional: preload a couple of SFX so the first play feels instant
function usePreloadAudio() {
  useEffect(() => {
    const files = ["/sfx/dice.mp3", "/sfx/summon.mp3", "/sfx/attack.mp3"];
    files.forEach((src) => {
      const a = new Audio(src);
      a.load();
    });
  }, []);
}

export default function App() {
  const [choice, setChoice] = useState(null);
  usePreloadAudio();

  // choice: { mode: 'local'|'ai'|'online', profile, online? }

  if (!choice) {
    return (
      <GameProvider>
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 p-3">
          <GameModeSelector onSelect={setChoice} />
        </div>
      </GameProvider>
    );
  }

  return (
    <GameProvider>
      <NetProvider
        mode={choice.mode}
        online={choice.online || null}
        profile={choice.profile || null}
      >
        {/* Controllers have no UI; they just orchestrate */}
        <NetController />
        <AIController enabled={choice.mode === "ai"} />

        <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 p-3">
          <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_360px] gap-3">
            <div className="bg-slate-900/60 rounded-2xl p-2 shadow-lg">
              <Board />
            </div>
            <HUD />
          </div>
        </div>
        <CardModal />
      </NetProvider>
    </GameProvider>
  );
}
