import React, {
  createContext, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { BOARD_SIZE, MAX_HP, MAX_CREST } from "./constants";
import { PATH_SHAPES, buildDefaultDicePool } from "./dice";
import { MONSTERS } from "./monsters";
import { importYGOFromObject } from "../dataImporters/ygo";
import { mulberry32 } from "./utils";

const GameCtx = createContext(null);
export function useGame(){ return useContext(GameCtx) }

const emptyBoard = () => Array.from({length:BOARD_SIZE}, (_,y)=>
  Array.from({length:BOARD_SIZE}, (_,x)=> ({x,y, type:"empty", owner:null, monster:null}))
);

const initialCrests = () => ({ move:0, attack:0, defense:0, summon:0, magic:0 });

// Fisher–Yates (seeded)
function shuffleSeeded(list, rng){
  const a = list.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(rng()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

export function GameProvider({children}){
  const [seed, setSeed] = useState(Date.now() >>> 0);
  const rng = useMemo(()=>mulberry32(seed),[seed]);

  const [board, setBoard] = useState(emptyBoard);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState("roll");     // roll | action | gameover
  const [rolledDice, setRolledDice] = useState([]);
  const [orientation, setOrientation] = useState(0);
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [selectedFrom, setSelectedFrom] = useState(null);

  // Modal (robust hover)
  const [modalCard, setModalCard] = useState(null);
  const [modalOwner, setModalOwner] = useState(null);
  const modalHideTimerRef = useRef(null);

  const [rehostImages, setRehostImages] = useState(false);

  // Players (hands are assigned by newGame())
  const [players, setPlayers] = useState([
    { id:0, hp:MAX_HP, crests:initialCrests(), dice:buildDefaultDicePool(), hand:[], spellBuff:0, trapReady:false },
    { id:1, hp:MAX_HP, crests:initialCrests(), dice:buildDefaultDicePool(), hand:[], spellBuff:0, trapReady:false },
  ]);

  // Hearts
  useEffect(()=>{
    setBoard(()=>{
      const b = emptyBoard();
      b[0][0].type="heart"; b[0][0].owner=0;
      b[BOARD_SIZE-1][BOARD_SIZE-1].type="heart"; b[BOARD_SIZE-1][BOARD_SIZE-1].owner=1;
      return b;
    });
  },[]);

  // Optional auto-import for real YGO JSON
  const [importedPool, setImportedPool] = useState(null);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const res = await fetch("/yugioh_card_database.json",{cache:"no-store"});
        if(!res.ok) return;
        const json = await res.json();
        const imported = importYGOFromObject(json);
        if(cancelled) return;
        setImportedPool(imported.length ? imported : null);
      }catch(_){}
    })();
    return ()=>{ cancelled=true };
  },[]);

  // === New Game (basic/advanced) ===
  function newGame(opts={}){
    const {
      mode="basic",      // 'basic' (3 monsters) or 'advanced' (10 monsters)
      p1Deck=null,       // array of card objects (from deck builder)
      p2Deck=null,
      freshSeed = Date.now() >>> 0,
    } = opts;

    setSeed(freshSeed);
    const localRng = mulberry32(freshSeed);

    // source pool: user decks > imported pool > demo MONSTERS
    const pool1 = p1Deck?.length ? p1Deck : (importedPool || MONSTERS);
    const pool2 = p2Deck?.length ? p2Deck : (importedPool || MONSTERS);

    const size = mode === "advanced" ? 10 : 3;

    const hand1 = shuffleSeeded(pool1, localRng).slice(0, size).map((m,i)=>({ ...m, __slot:i }));
    const hand2 = shuffleSeeded(pool2, localRng).slice(size, size*2).map((m,i)=>({ ...m, __slot:i }));

    setPlayers([
      { id:0, hp:MAX_HP, crests:initialCrests(), dice:buildDefaultDicePool(), hand:hand1, spellBuff:0, trapReady:false },
      { id:1, hp:MAX_HP, crests:initialCrests(), dice:buildDefaultDicePool(), hand:hand2, spellBuff:0, trapReady:false },
    ]);

    setBoard(()=>{
      const b = emptyBoard();
      b[0][0].type="heart"; b[0][0].owner=0;
      b[BOARD_SIZE-1][BOARD_SIZE-1].type="heart"; b[BOARD_SIZE-1][BOARD_SIZE-1].owner=1;
      return b;
    });

    setTurn(0);
    setPhase("roll");
    setRolledDice([]);
    setOrientation(0);
    setSelectedMonster(null);
    setSelectedFrom(null);
  }

  // Start first game (basic) after pools known
  useEffect(()=>{
    // only start once
    if (players[0].hand.length===0 && players[1].hand.length===0){
      newGame({ mode:"basic" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedPool]);

  // Persistence (keep it simple—don’t persist whole game while we’re iterating rules)
  useEffect(()=>{
    localStorage.setItem("ddm-settings", JSON.stringify({ rehostImages }));
  },[rehostImages]);
  useEffect(()=>{
    try{
      const s = JSON.parse(localStorage.getItem("ddm-settings") || "{}");
      if (typeof s.rehostImages === "boolean") setRehostImages(s.rehostImages);
    }catch(_){}
  },[]);

  // Helpers
  function inside(x,y){ return x>=0 && y>=0 && x<BOARD_SIZE && y<BOARD_SIZE }
  function addCrest(pid, type, amt){
    setPlayers(ps=> ps.map((p,i)=> i===pid
      ? { ...p, crests:{...p.crests, [type]: Math.min(MAX_CREST, (p.crests[type]||0)+amt) } }
      : p
    ));
  }
  function canSpend(pid, cost){
    const c = players[pid].crests;
    return Object.keys(cost).every(k => (c[k]||0) >= (cost[k]||0));
  }
  function spend(pid, cost){
    if(!canSpend(pid,cost)) return false;
    setPlayers(ps=> ps.map((p,i)=> i===pid
      ? { ...p, crests:Object.fromEntries(Object.keys(p.crests).map(k=>[
          k, Math.max(0,(p.crests[k]||0)-(cost[k]||0))
        ])) }
      : p
    ));
    return true;
  }

  // Roll 3 dice
  function roll(){
    const p = players[turn];
    const pool = p.dice;
    const pick = () => pool[Math.floor(rng()*pool.length)];
    const selected = [pick(),pick(),pick()];
    const results = selected.map(die => ({ die, face: die.faces[Math.floor(rng()*6)] }));
    setRolledDice(results);
    for(const r of results){
      // Note: Summon crests are not collected, per rules (we use them immediately in placement step)
      if(r.face.type==="crest")  addCrest(turn, r.face.crest, r.face.amt);
      if(r.face.type==="magic")  addCrest(turn, "magic",   r.face.amt||1);
      if(r.face.type==="trap")   addCrest(turn, "defense", r.face.amt||1);
    }
    // Reset turn buffs
    setPlayers(ps=> ps.map((p,i)=> i===turn? {...p, spellBuff:0} : p));
    setPhase("action");
    return results;
  }

  function summonableLevel(){
    const counts = new Map();
    for(const r of rolledDice){
      if(r.face.type==="summon") counts.set(r.face.level, (counts.get(r.face.level)||0)+1);
      if(r.face.type==="black")  counts.set("WILD", (counts.get("WILD")||0)+1);
    }
    for(const [lvl,c] of counts){
      if(lvl==="WILD" && c>=1) return "WILD";
      if(c>=2) return lvl;
    }
    return null;
  }

  function placePathFromDie(die, x,y){
    const pts = (PATH_SHAPES[die.shape]||[[0,0]]).map(([dx,dy])=>[x+dx,y+dy]);
    for(const [ax,ay] of pts){
      if(!inside(ax,ay)) return false;
      const cell = board[ay][ax];
      if(cell.type!=="empty") return false;
    }
    setBoard(prev=>{
      const b = prev.map(r=>r.map(c=>({...c})));
      for(const [ax,ay] of pts){ b[ay][ax].type="path"; b[ay][ax].owner=turn }
      return b;
    });
    return true;
  }

  function tryDimensionAt(x,y){
    const levelOrWild = summonableLevel(); if(!levelOrWild) return false;
    let r;
    if(levelOrWild==="WILD"){
      r = rolledDice.find(rr => rr.face.type==="black" || rr.face.type==="summon");
    } else {
      r = rolledDice.find(rr => rr.face.type==="summon" && rr.face.level===levelOrWild);
    }
    if(!r) return false;
    return placePathFromDie(r.die, x,y);
  }

  function selectFrom(x,y){
    const c = board[y][x];
    if(c.monster && c.monster.owner===turn) setSelectedFrom({x,y});
  }

  function baseHP(mon){
    // Prefer explicit HP if provided by card data; fallback to DEF/100 like before
    if (typeof mon.hp === "number" && mon.hp > 0) return Math.round(mon.hp/10); // normalize to our 0–?
    return Math.max(1, Math.round((mon.def || 500)/100));
  }

  function placeSummonAt(x,y){
    const cell = board[y][x];
    const mon = selectedMonster;
    if(!mon) return false;
    if(cell.type==="path" && cell.owner===turn && !cell.monster){
      setBoard(prev=>{
        const b = prev.map(r=>r.map(c=>({...c})));
        const atkBuff = players[turn].spellBuff || 0;
        const hp = baseHP(mon);
        b[y][x].monster = { ...mon, owner:turn, hp, atk:(mon.atk||500) + (atkBuff*100), __spawnTick:Date.now() };
        return b;
      });
      setPlayers(ps=> ps.map((p,i)=> i===turn
        ? { ...p, hand: p.hand.filter(m=>m.id!==mon.id) }
        : p
      ));
      setSelectedMonster(null);
      return true;
    }
    return false;
  }

  function tryMove(tx,ty){
    const from = selectedFrom; if(!from) return;
    const cFrom = board[from.y][from.x]; const mon=cFrom.monster; if(!mon) return;
    if(Math.abs(tx-from.x)+Math.abs(ty-from.y)!==1) return;
    const dst = board[ty][tx];
    if(dst.type!=="path" || dst.owner!==turn || dst.monster) return;
    if(!spend(turn,{ move:1 })) return;
    setBoard(prev=>{
      const b = prev.map(r=>r.map(c=>({...c})));
      b[from.y][from.x].monster=null;
      b[ty][tx].monster={...mon};
      return b;
    });
    setSelectedFrom({x:tx,y:ty});
  }

  function tryAttack(tx,ty){
    const from = selectedFrom; if(!from) return;
    const cFrom = board[from.y][from.x]; const mon=cFrom.monster; if(!mon) return;
    if(Math.abs(tx-from.x)+Math.abs(ty-from.y)!==1) return;
    if(!spend(turn,{ attack:1 })) return;
    const target = board[ty][tx];

    // Attacking Monster Lord
    if(target.type==="heart" && target.owner!==turn){
      setPlayers(ps=> ps.map((p,i)=> i===target.owner ? { ...p, hp: Math.max(0, p.hp-1) } : p ));
      if(target.owner===0 && players[0].hp-1<=0) setPhase("gameover");
      if(target.owner===1 && players[1].hp-1<=0) setPhase("gameover");
      return;
    }

    if(target.monster && target.monster.owner!==turn){
      const defenderId = 1-turn;

      // Trap (reduce by 3 once)
      let trapReduce = 0;
      if(players[defenderId].trapReady){
        trapReduce = 3;
        setPlayers(ps=> ps.map((p,i)=> i===defenderId? { ...p, trapReady:false } : p));
      }

      // Regular Defense (spend 1 defense crest to apply DEF)
      let defVal = 0;
      if(players[defenderId].crests.defense>0){
        setPlayers(ps=> ps.map((p,i)=> i===defenderId
          ? { ...p, crests:{...p.crests, defense:p.crests.defense-1} }
          : p
        ));
        defVal = Math.max(0, Math.round(((target.monster.def)||0)/100));
      }

      const atkVal = Math.max(1, Math.round(((mon.atk)||500)/100));
      const dmg = Math.max(0, atkVal - defVal - trapReduce);

      setBoard(prev=>{
        const b = prev.map(r=>r.map(c=>({...c})));
        const currentHP = target.monster.hp ?? baseHP(target.monster);
        const newHP = currentHP - dmg;
        if(newHP<=0) b[ty][tx].monster=null;
        else b[ty][tx].monster={...target.monster, hp:newHP};
        return b;
      });
    }
  }

  // Summon: must match rolled level or Wild
  function summon(mon){
    const lvl = summonableLevel(); if(!lvl) return;
    if(lvl!=="WILD" && (mon.stars||mon.level)!==lvl) return;
    setSelectedMonster(mon);
  }

  // Magic / Trap
  function castSpell(){
    if(!spend(turn,{ magic:1 })) return;
    setPlayers(ps=> ps.map((p,i)=> i===turn? { ...p, spellBuff:(p.spellBuff||0)+2 } : p));
  }
  function setTrap(){
    if(!spend(turn,{ magic:1 })) return;
    setPlayers(ps=> ps.map((p,i)=> i===turn? { ...p, trapReady:true } : p));
  }

  function endTurn(){
    if(phase==="gameover") return;
    setTurn(t=>1-t);
    setPhase("roll"); setRolledDice([]); setOrientation(0);
    setSelectedMonster(null); setSelectedFrom(null);
  }

  // Summon event bridge
  useEffect(()=>{
    const handler = e => { summon(e.detail) };
    window.addEventListener("ddm-internal-summon", handler);
    return ()=> window.removeEventListener("ddm-internal-summon", handler);
  },[]);

  // Modal control
  function clearModalHideTimer(){
    if(modalHideTimerRef.current){ clearTimeout(modalHideTimerRef.current); modalHideTimerRef.current=null; }
  }
  function showCardModal(card, ownerId){
    clearModalHideTimer();
    setModalOwner(ownerId);
    setModalCard(card);
  }
  function hideCardModal(ownerId, delay=120){
    clearModalHideTimer();
    modalHideTimerRef.current = setTimeout(()=>{
      setModalOwner(cur=>{
        if(cur===ownerId){ setModalCard(null); return null; }
        return cur;
      });
      modalHideTimerRef.current=null;
    }, delay);
  }

  const toggleRehost = ()=> setRehostImages(v=>!v);

  const value = {
    // state
    board, turn, phase, rolledDice, orientation, players, rehostImages, modalCard, modalOwner,
    // setters
    setOrientation, setPlayers, setModalCard,
    // actions
    roll, tryDimensionAt, summon, placeSummonAt, selectFrom, tryMove, tryAttack, endTurn,
    castSpell, setTrap, toggleRehost,
    showCardModal, hideCardModal,
    newGame,                                  // <— expose to UI
    magicBuffered: players[turn]?.spellBuff || 0,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
