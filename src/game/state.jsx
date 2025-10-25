import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BOARD_SIZE, MAX_HP, MAX_CREST } from "./constants";
import { PATH_SHAPES, buildDefaultDicePool } from "./dice";
import { MONSTERS } from "./monsters";
import { importYGOFromObject } from "../dataImporters/ygo";
import { mulberry32 } from "./utils";

const GameCtx = createContext(null);
export function useGame() {
  return useContext(GameCtx);
}

const emptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, (_, y) =>
    Array.from({ length: BOARD_SIZE }, (_, x) => ({
      x,
      y,
      type: "empty",
      owner: null,
      monster: null,
    }))
  );

const initialCrests = () => ({
  move: 0,
  attack: 0,
  defense: 0,
  summon: 0,
  magic: 0,
});

export function GameProvider({ children }) {
  const [seed, setSeed] = useState(12345);
  const rng = useMemo(() => mulberry32(seed), [seed]);

  const [board, setBoard] = useState(emptyBoard);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState("roll"); // roll | action | gameover
  const [rolledDice, setRolledDice] = useState([]);
  const [orientation, setOrientation] = useState(0);
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [selectedFrom, setSelectedFrom] = useState(null);

  // === Modal state (improved hover control) ===
  const [modalCard, setModalCard] = useState(null);
  const [modalOwner, setModalOwner] = useState(null);
  const modalHideTimerRef = useRef(null);

  const [rehostImages, setRehostImages] = useState(false);

  const [players, setPlayers] = useState([
    {
      id: 0,
      hp: MAX_HP,
      crests: initialCrests(),
      dice: buildDefaultDicePool(),
      hand: MONSTERS.slice(0, 3),
      spellBuff: 0,
      trapReady: false,
    },
    {
      id: 1,
      hp: MAX_HP,
      crests: initialCrests(),
      dice: buildDefaultDicePool(),
      hand: MONSTERS.slice(3, 6),
      spellBuff: 0,
      trapReady: false,
    },
  ]);

  // === Hearts setup ===
  useEffect(() => {
    setBoard(() => {
      const b = emptyBoard();
      b[0][0].type = "heart";
      b[0][0].owner = 0;
      b[BOARD_SIZE - 1][BOARD_SIZE - 1].type = "heart";
      b[BOARD_SIZE - 1][BOARD_SIZE - 1].owner = 1;
      return b;
    });
  }, []);

  // === Auto-import /yugioh_card_database.json ===
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/yugioh_card_database.json", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        const imported = importYGOFromObject(json);
        if (!imported.length || cancelled) return;
        setPlayers((ps) => [
          {
            ...ps[0],
            hand: imported.slice(0, 3).length
              ? imported.slice(0, 3)
              : ps[0].hand,
          },
          {
            ...ps[1],
            hand: imported.slice(3, 6).length
              ? imported.slice(3, 6)
              : ps[1].hand,
          },
        ]);
      } catch (e) {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // === Persistence ===
  useEffect(() => {
    const saved = localStorage.getItem("ddm-web-save-v5");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSeed(s.seed);
        setBoard(s.board);
        setTurn(s.turn);
        setPhase(s.phase);
        setRolledDice(s.rolledDice);
        setOrientation(s.orientation);
        setPlayers(s.players);
        setRehostImages(!!s.rehostImages);
      } catch (_) {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(
      "ddm-web-save-v5",
      JSON.stringify({
        seed,
        board,
        turn,
        phase,
        rolledDice,
        orientation,
        players,
        rehostImages,
      })
    );
  }, [
    seed,
    board,
    turn,
    phase,
    rolledDice,
    orientation,
    players,
    rehostImages,
  ]);

  // === Helpers ===
  function inside(x, y) {
    return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
  }
  function addCrest(pid, type, amt) {
    setPlayers((ps) =>
      ps.map((p, i) =>
        i === pid
          ? {
              ...p,
              crests: {
                ...p.crests,
                [type]: Math.min(
                  MAX_CREST,
                  (p.crests[type] || 0) + amt
                ),
              },
            }
          : p
      )
    );
  }
  function canSpend(pid, cost) {
    const c = players[pid].crests;
    return Object.keys(cost).every((k) => (c[k] || 0) >= (cost[k] || 0));
  }
  function spend(pid, cost) {
    if (!canSpend(pid, cost)) return false;
    setPlayers((ps) =>
      ps.map((p, i) =>
        i === pid
          ? {
              ...p,
              crests: Object.fromEntries(
                Object.keys(p.crests).map((k) => [
                  k,
                  Math.max(0, (p.crests[k] || 0) - (cost[k] || 0)),
                ])
              ),
            }
          : p
      )
    );
    return true;
  }

  // === Dice logic ===
  function roll() {
    const p = players[turn];
    const pool = p.dice;
    const pick = () => pool[Math.floor(rng() * pool.length)];
    const selected = [pick(), pick(), pick()];
    const results = selected.map((die) => ({
      die,
      face: die.faces[Math.floor(rng() * 6)],
    }));
    setRolledDice(results);
    for (const r of results) {
      if (r.face.type === "crest") addCrest(turn, r.face.crest, r.face.amt);
      if (r.face.type === "magic") addCrest(turn, "magic", r.face.amt || 1);
      if (r.face.type === "trap") addCrest(turn, "defense", r.face.amt || 1);
    }
    setPlayers((ps) =>
      ps.map((p, i) => (i === turn ? { ...p, spellBuff: 0 } : p))
    );
    setPhase("action");
    return results;
  }

  function summonableLevel() {
    const counts = new Map();
    for (const r of rolledDice) {
      if (r.face.type === "summon")
        counts.set(r.face.level, (counts.get(r.face.level) || 0) + 1);
      if (r.face.type === "black")
        counts.set("WILD", (counts.get("WILD") || 0) + 1);
    }
    for (const [lvl, c] of counts) {
      if (lvl === "WILD" && c >= 1) return "WILD";
      if (c >= 2) return lvl;
    }
    return null;
  }

  function placePathFromDie(die, x, y) {
    const pts = (PATH_SHAPES[die.shape] || [[0, 0]]).map(([dx, dy]) => [
      x + dx,
      y + dy,
    ]);
    for (const [ax, ay] of pts) {
      if (!inside(ax, ay)) return false;
      const cell = board[ay][ax];
      if (cell.type !== "empty") return false;
    }
    setBoard((prev) => {
      const b = prev.map((r) => r.map((c) => ({ ...c })));
      for (const [ax, ay] of pts) {
        b[ay][ax].type = "path";
        b[ay][ax].owner = turn;
      }
      return b;
    });
    return true;
  }

  function tryDimensionAt(x, y) {
    const levelOrWild = summonableLevel();
    if (!levelOrWild) return false;
    let r;
    if (levelOrWild === "WILD") {
      r = rolledDice.find(
        (rr) => rr.face.type === "black" || rr.face.type === "summon"
      );
    } else {
      r = rolledDice.find(
        (rr) => rr.face.type === "summon" && rr.face.level === levelOrWild
      );
    }
    if (!r) return false;
    return placePathFromDie(r.die, x, y);
  }

  function selectFrom(x, y) {
    const c = board[y][x];
    if (c.monster && c.monster.owner === turn) setSelectedFrom({ x, y });
  }

  function placeSummonAt(x, y) {
    const cell = board[y][x];
    const mon = selectedMonster;
    if (!mon) return false;
    if (cell.type === "path" && cell.owner === turn && !cell.monster) {
      setBoard((prev) => {
        const b = prev.map((r) => r.map((c) => ({ ...c })));
        const atkBuff = players[turn].spellBuff || 0;
        const hp = Math.max(1, Math.round((mon.def || 500) / 100));
        b[y][x].monster = {
          ...mon,
          owner: turn,
          hp,
          atk: mon.atk + atkBuff * 100,
          __spawnTick: Date.now(), // for animations
        };
        return b;
      });
      setPlayers((ps) =>
        ps.map((p, i) =>
          i === turn
            ? { ...p, hand: p.hand.filter((m) => m.id !== mon.id) }
            : p
        )
      );
      setSelectedMonster(null);
      return true;
    }
    return false;
  }

  function tryMove(tx, ty) {
    const from = selectedFrom;
    if (!from) return;
    const cFrom = board[from.y][from.x];
    const mon = cFrom.monster;
    if (!mon) return;
    if (Math.abs(tx - from.x) + Math.abs(ty - from.y) !== 1) return;
    const dst = board[ty][tx];
    if (dst.type !== "path" || dst.owner !== turn || dst.monster) return;
    if (!spend(turn, { move: 1 })) return;
    setBoard((prev) => {
      const b = prev.map((r) => r.map((c) => ({ ...c })));
      b[from.y][from.x].monster = null;
      b[ty][tx].monster = { ...mon };
      return b;
    });
    setSelectedFrom({ x: tx, y: ty });
  }

  function tryAttack(tx, ty) {
    const from = selectedFrom;
    if (!from) return;
    const cFrom = board[from.y][from.x];
    const mon = cFrom.monster;
    if (!mon) return;
    if (Math.abs(tx - from.x) + Math.abs(ty - from.y) !== 1) return;
    if (!spend(turn, { attack: 1 })) return;
    const target = board[ty][tx];
    if (target.type === "heart" && target.owner !== turn) {
      setPlayers((ps) =>
        ps.map((p, i) =>
          i === target.owner ? { ...p, hp: Math.max(0, p.hp - 1) } : p
        )
      );
      if (target.owner === 0 && players[0].hp - 1 <= 0) setPhase("gameover");
      if (target.owner === 1 && players[1].hp - 1 <= 0) setPhase("gameover");
      return;
    }
    if (target.monster && target.monster.owner !== turn) {
      const defenderId = 1 - turn;
      let trapReduce = 0;
      if (players[defenderId].trapReady) {
        trapReduce = 3;
        setPlayers((ps) =>
          ps.map((p, i) =>
            i === defenderId ? { ...p, trapReady: false } : p
          )
        );
      }
      let defend = false;
      if (players[defenderId].crests.defense > 0) {
        defend = true;
        setPlayers((ps) =>
          ps.map((p, i) =>
            i === defenderId
              ? {
                  ...p,
                  crests: {
                    ...p.crests,
                    defense: p.crests.defense - 1,
                  },
                }
              : p
          )
        );
      }
      const atk = Math.max(1, Math.round(((mon.atk) || 500) / 100));
      const def = defend
        ? Math.max(0, Math.round(((target.monster.def) || 0) / 100))
        : 0;
      const dmg = Math.max(0, atk - def - trapReduce);
      setBoard((prev) => {
        const b = prev.map((r) => r.map((c) => ({ ...c })));
        const newHP =
          (target.monster.hp ??
            Math.round(((target.monster.def) || 500) / 100)) - dmg;
        if (newHP <= 0) b[ty][tx].monster = null;
        else b[ty][tx].monster = { ...target.monster, hp: newHP };
        return b;
      });
    }
  }

  function summon(mon) {
    const lvl = summonableLevel();
    if (!lvl) return;
    if (lvl !== "WILD" && (mon.stars || mon.level) !== lvl) return;
    setSelectedMonster(mon);
  }

  function castSpell() {
    if (!spend(turn, { magic: 1 })) return;
    setPlayers((ps) =>
      ps.map((p, i) =>
        i === turn ? { ...p, spellBuff: (p.spellBuff || 0) + 2 } : p
      )
    );
  }

  function setTrap() {
    if (!spend(turn, { magic: 1 })) return;
    setPlayers((ps) =>
      ps.map((p, i) =>
        i === turn ? { ...p, trapReady: true } : p
      )
    );
  }

  function endTurn() {
    if (phase === "gameover") return;
    setTurn((t) => 1 - t);
    setPhase("roll");
    setRolledDice([]);
    setOrientation(0);
    setSelectedMonster(null);
    setSelectedFrom(null);
  }

  // Summon event from HUD
  useEffect(() => {
    const handler = (e) => {
      summon(e.detail);
    };
    window.addEventListener("ddm-internal-summon", handler);
    return () => window.removeEventListener("ddm-internal-summon", handler);
  }, []);

  // === Robust modal control ===
  function clearModalHideTimer() {
    if (modalHideTimerRef.current) {
      clearTimeout(modalHideTimerRef.current);
      modalHideTimerRef.current = null;
    }
  }
  function showCardModal(card, ownerId) {
    clearModalHideTimer();
    setModalOwner(ownerId);
    setModalCard(card);
  }
  function hideCardModal(ownerId, delay = 120) {
    clearModalHideTimer();
    modalHideTimerRef.current = setTimeout(() => {
      setModalOwner((curOwner) => {
        if (curOwner === ownerId) {
          setModalCard(null);
          return null;
        }
        return curOwner;
      });
      modalHideTimerRef.current = null;
    }, delay);
  }

  const toggleRehost = () => setRehostImages((v) => !v);

  const value = {
    board,
    turn,
    phase,
    rolledDice,
    orientation,
    players,
    rehostImages,
    modalCard,
    modalOwner,
    setOrientation,
    setPlayers,
    setModalCard,
    roll,
    tryDimensionAt,
    summon,
    placeSummonAt,
    selectFrom,
    tryMove,
    tryAttack,
    endTurn,
    castSpell,
    setTrap,
    toggleRehost,
    showCardModal,
    hideCardModal,
    magicBuffered: players[turn]?.spellBuff || 0,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
