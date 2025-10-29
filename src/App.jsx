import React, { useEffect, useState } from "react";
import NetRoot from "./providers/NetRoot";
import { GameProvider, useGame } from "./game/state";
import HUD from "./components/HUD";
import Board from "./components/Board";
import CardModal from "./components/CardModal";
import DeckBuilder from "./components/DeckBuilder";
import HelpModal from "./components/HelpModal";
import GameModeSelector from "./components/GameModeSelector";

// Load pool for deck builder from the imported JSON (if present) or fallback monsters
async function loadPool() {
  try {
    const res = await fetch("/yugioh_card_database.json", { cache: "no-store" });
    if (!res.ok) throw new Error("no json");
    const module = await res.json();
    return module?.data || module || [];
  } catch {
    const { MONSTERS } = await import("./game/monsters");
    return MONSTERS;
  }
}

function TopBar({ onOpenBuilder, onOpenHelp, onReset }) {
  const { newGame } = useGame();
  return (
    <div className="max-w-5xl mx-auto mb-3 flex items-center justify-between">
      <div
        className="text-xl font-bold cursor-pointer select-none hover:text-amber-400 transition"
        title="Return to main menu"
        onClick={onReset}
      >
        Dungeon Dice Monsters
      </div>
      <div className="flex gap-2">
        {/* Help / Rules */}
        <button
          onClick={onOpenHelp}
          className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95"
          title="Open Help / Rules (press ?)"
          aria-label="Open Help and Rules"
        >
          Help / Rules
        </button>

        {/* New Game dropdown */}
        <div className="relative group">
          <button
            className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold"
            aria-haspopup="menu"
            aria-expanded="false"
            title="Start a new game"
          >
            New Game
          </button>
          <div className="absolute right-0 mt-1 hidden group-hover:block bg-slate-800 rounded-lg shadow overflow-hidden z-20">
            <button
              className="block px-4 py-2 w-full text-left hover:bg-slate-700"
              onClick={() => newGame({ mode: "basic" })}
            >
              Basic (3 cards)
            </button>
            <button
              className="block px-4 py-2 w-full text-left hover:bg-slate-700"
              onClick={() => newGame({ mode: "advanced" })}
            >
              Advanced (10 cards)
            </button>
          </div>
        </div>

        {/* Deck Builder */}
        <button
          onClick={onOpenBuilder}
          className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95"
          title="Open Deck Builder"
        >
          Deck Builder
        </button>
      </div>
    </div>
  );
}

/** The main in-game UI once a mode is chosen */
function GameScene({ onExit }) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [builderPool, setBuilderPool] = useState([]);

  useEffect(() => {
    (async () => setBuilderPool(await loadPool()))();
  }, []);

  // Keyboard shortcuts: '?' opens Help, 'ESC' closes modals
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShowHelp(true);
      }
      if (e.key === "Escape") {
        if (showHelp) setShowHelp(false);
        if (showBuilder) setShowBuilder(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHelp, showBuilder]);

  return (
    <>
      <TopBar
        onOpenBuilder={() => setShowBuilder(true)}
        onOpenHelp={() => setShowHelp(true)}
        onReset={onExit}
      />
      <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_360px] gap-3">
        <div className="bg-slate-900/60 rounded-2xl p-2 shadow-lg">
          <Board />
        </div>
        <HUD />
      </div>

      {/* Overlays */}
      <CardModal />
      {showBuilder && (
        <DeckBuilder
          allCards={builderPool}
          onClose={() => setShowBuilder(false)}
        />
      )}
      {showHelp && (
        <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
      )}
    </>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);

  return (
    <NetRoot>
      <GameProvider>
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 p-3">
          {!selected ? (
            <GameModeSelector onSelect={setSelected} />
          ) : (
            <GameScene onExit={() => setSelected(null)} />
          )}
        </div>
      </GameProvider>
    </NetRoot>
  );
}
