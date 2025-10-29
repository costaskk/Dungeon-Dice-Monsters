import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as FB from "./firebase"; // uses your fixed firebase.js

// Safe default so destructuring never crashes if provider is missing.
const safeDefault = {
  mode: "offline",         // "offline" | "online"
  online: false,
  role: "solo",            // "host" | "guest" | "solo"
  roomCode: null,
  roomState: null,
  isOnlineTurnOwner: false,
  // no-op fns so calls are safe in offline
  createRoom: async () => null,
  joinRoom: async () => {},
  leaveRoom: () => {},
  sendAction: async () => {},
  setRoomStatus: async () => {},
};

const NetCtx = createContext(safeDefault);
export const useNet = () => useContext(NetCtx);

export function NetProvider({ children }) {
  const [mode, setMode] = useState("offline"); // offline by default
  const [role, setRole] = useState("solo");
  const [roomCode, setRoomCode] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [unsub, setUnsub] = useState(null);

  // ensure Firebase is initialised once
  useEffect(() => {
    FB.initFirebaseOnce();
  }, []);

  // subscribe/unsubscribe to a room
  useEffect(() => {
    if (!roomCode) {
      if (unsub) unsub();
      setRoomState(null);
      return;
    }
    const unsubscribe = FB.onRoom(roomCode, (state) => {
      setRoomState(state);
    });
    setUnsub(() => unsubscribe);
    return () => unsubscribe && unsubscribe();
  }, [roomCode]);

  async function createRoom(profile = { name: "Host" }) {
    const code = await FB.createRoom(profile);
    setRoomCode(code);
    setRole("host");
    setMode("online");
    return code;
  }

  async function joinRoom(code, profile = { name: "Guest" }) {
    await FB.joinRoom(code, profile);
    setRoomCode(code);
    setRole("guest");
    setMode("online");
  }

  function leaveRoom() {
    if (unsub) unsub();
    setRoomCode(null);
    setRoomState(null);
    setRole("solo");
    setMode("offline");
  }

  async function sendAction(action) {
    if (!roomCode) return;
    await FB.pushAction(roomCode, action);
  }

  async function setRoomStatus(status) {
    if (!roomCode) return;
    await FB.setRoomStatus(roomCode, status);
  }

  const isOnlineTurnOwner = useMemo(() => {
    if (!roomState || mode !== "online") return false;
    // 0 = host, 1 = guest (matches firebase.js)
    return (roomState.turnOwner ?? 0) === (role === "host" ? 0 : 1);
  }, [mode, role, roomState]);

  const value = useMemo(
    () => ({
      mode,
      online: mode === "online",
      role,
      roomCode,
      roomState,
      isOnlineTurnOwner,
      createRoom,
      joinRoom,
      leaveRoom,
      sendAction,
      setRoomStatus,
      setMode,      // exposed in case you want to toggle manually
      setRole,      // optional
      setRoomCode,  // optional
    }),
    [mode, role, roomCode, roomState, isOnlineTurnOwner]
  );

  return <NetCtx.Provider value={value}>{children}</NetCtx.Provider>;
}
