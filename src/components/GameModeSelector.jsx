import React, { useEffect, useMemo, useState } from "react";
import {
  initFirebaseOnce,
  createRoom as fbCreateRoom,
  joinRoom as fbJoinRoom,
} from "../game/firebase";

/**
 * Props:
 *   onSelect({ mode: 'local'|'ai'|'online', profile, online?: { roomCode, role:'host'|'guest' } })
 */
export default function GameModeSelector({ onSelect }) {
  const [name, setName] = useState(localStorage.getItem("ddm_name") || "");
  const [avatar, setAvatar] = useState(localStorage.getItem("ddm_avatar") || "🧙");
  const [roomCode, setRoomCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  // Initialize Firebase once (safe if called multiple times)
  useEffect(() => {
    try {
      initFirebaseOnce();
    } catch (_) {
      // non-fatal in UI; errors will surface on create/join
    }
  }, []);

  const profile = useMemo(
    () => ({
      name: (name || "Player").trim().slice(0, 24),
      avatar,
      ts: Date.now(),
    }),
    [name, avatar]
  );

  function saveProfile() {
    localStorage.setItem("ddm_name", profile.name);
    localStorage.setItem("ddm_avatar", avatar);
  }

  async function onCreate() {
    saveProfile();
    setErr("");
    setCreating(true);
    try {
      const code = await fbCreateRoom(profile);
      onSelect({
        mode: "online",
        profile,
        online: { roomCode: code, role: "host" },
      });
    } catch (e) {
      console.error(e);
      setErr(
        (e && e.message) ||
          "Could not create room. Check Firebase config & rules."
      );
    } finally {
      setCreating(false);
    }
  }

  async function onJoin() {
    const code = (roomCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code || code.length < 4) {
      setErr("Enter a valid room code (at least 4 characters).");
      return;
    }
    saveProfile();
    setErr("");
    setJoining(true);
    try {
      await fbJoinRoom(code, profile);
      onSelect({
        mode: "online",
        profile,
        online: { roomCode: code, role: "guest" },
      });
    } catch (e) {
      console.error(e);
      setErr(
        (e && e.message) || "Could not join room. Check the code and try again."
      );
    } finally {
      setJoining(false);
    }
  }

  function handleJoinKey(e) {
    if (e.key === "Enter") onJoin();
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRoomCode(text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
        setErr("");
      }
    } catch {
      // ignore clipboard errors silently
    }
  }

  const canCreate = profile.name.length >= 1;

  return (
    <div className="max-w-md mx-auto my-6 p-4 bg-slate-900/80 rounded-2xl shadow-lg text-slate-100">
      <div className="text-lg font-bold mb-2">Dungeon Dice Monsters</div>

      {/* Avatar picker */}
      <div className="grid grid-cols-8 gap-2 mb-3" role="group" aria-label="Choose avatar">
        {["🧙", "🐉", "🗡️", "🛡️", "🧝", "👹", "👾", "🐺"].map((a) => (
          <button
            key={a}
            type="button"
            className={`py-2 rounded-lg transition ${
              avatar === a
                ? "bg-amber-600 text-slate-900 font-bold"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
            onClick={() => setAvatar(a)}
            aria-pressed={avatar === a}
            title={`Avatar ${a}`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Name */}
      <label className="block text-sm mb-1" htmlFor="ddm-name">
        Player Name
      </label>
      <input
        id="ddm-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:ring-2 focus:ring-amber-400/60"
        placeholder="Your name"
        maxLength={24}
        autoComplete="name"
        aria-required="true"
      />

      {/* Local / AI */}
      <div className="grid grid-cols-1 gap-2 mb-1">
        <button
          type="button"
          onClick={() => {
            saveProfile();
            onSelect({ mode: "local", profile });
          }}
          className="rounded-lg bg-slate-700 py-2 hover:bg-slate-600"
        >
          Local 2-Player
        </button>
        <button
          type="button"
          onClick={() => {
            saveProfile();
            onSelect({ mode: "ai", profile });
          }}
          className="rounded-lg bg-indigo-600 py-2 font-semibold hover:bg-indigo-500"
        >
          Vs AI
        </button>
      </div>

      {/* Online */}
      <div className="mt-4 border-t border-slate-700 pt-3">
        <div className="text-sm font-semibold mb-2">Online Match</div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCreate}
            disabled={creating || !canCreate}
            className="rounded-lg bg-emerald-600 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
            title={canCreate ? "Create a new room" : "Enter your name first"}
            aria-disabled={creating || !canCreate}
          >
            {creating ? "Creating…" : "Create Room"}
          </button>

          <div className="flex gap-2">
            <input
              value={roomCode}
              onChange={(e) =>
                setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              onKeyDown={handleJoinKey}
              placeholder="ROOM"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 uppercase outline-none focus:ring-2 focus:ring-amber-400/60"
              inputMode="text"
              aria-label="Room code"
              maxLength={8}
            />
            <button
              type="button"
              onClick={pasteFromClipboard}
              className="rounded-lg bg-slate-700 px-3 hover:bg-slate-600"
              title="Paste from clipboard"
              aria-label="Paste room code"
            >
              Paste
            </button>
            <button
              type="button"
              onClick={onJoin}
              disabled={joining}
              className="rounded-lg bg-amber-600 px-3 hover:bg-amber-500 disabled:opacity-60"
              title="Join room"
              aria-disabled={joining}
            >
              {joining ? "…" : "Join"}
            </button>
          </div>
        </div>

        {err && (
          <div
            className="mt-2 text-xs text-rose-300 bg-rose-900/30 border border-rose-700 rounded p-2"
            role="alert"
          >
            {err}
          </div>
        )}
      </div>

      <p className="text-xs opacity-70 mt-3">
        Tip: After creating a room, share the code with a friend to join.
      </p>
    </div>
  );
}
