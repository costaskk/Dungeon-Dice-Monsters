// Realtime multiplayer using Firebase (no backend needed)
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  push,
  serverTimestamp,
} from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

/**
 * 🔧 Filled from your Firebase console screenshots
 * Project:  Dungeon Dice Monsters
 * Project ID: dungeon-dice-monsters
 * Web App ID: 1:20922485427:web:a7ab19984e6b277f487ce6
 */
const firebaseConfig = {
  apiKey: "AIzaSyAAaiiSVuM89OcAvJUsJRJ_-xqe3ShaPME",
  authDomain: "dungeon-dice-monsters.firebaseapp.com",
  databaseURL:
    "https://dungeon-dice-monsters-default-rtdb.firebasedatabase.app",
  projectId: "dungeon-dice-monsters",
  storageBucket: "dungeon-dice-monsters.firebasestorage.app",
  messagingSenderId: "20922485427",
  appId: "1:20922485427:web:a7ab19984e6b277f487ce6",
};

let app, db, auth;
export function initFirebaseOnce() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    // Anonymous auth (enabled in console)
    signInAnonymously(auth).catch(() => {});
  }
  return { app, db, auth };
}

export async function createRoom(profile) {
  const { db } = initFirebaseOnce();
  const roomCode = Math.random().toString(36).slice(2, 7).toUpperCase();
  const now = serverTimestamp();
  await set(ref(db, `rooms/${roomCode}`), {
    createdAt: now,
    updatedAt: now,
    status: "lobby", // lobby | playing | finished
    host: profile,
    guest: null,
    turn: 0,
    actions: [], // action queue
  });
  return roomCode;
}

export async function joinRoom(roomCode, profile) {
  const { db } = initFirebaseOnce();
  await update(ref(db, `rooms/${roomCode}`), {
    guest: profile,
    updatedAt: serverTimestamp(),
  });
}

export function onRoom(roomCode, cb) {
  const { db } = initFirebaseOnce();
  return onValue(ref(db, `rooms/${roomCode}`), (snap) =>
    cb(snap.val() || null)
  );
}

export async function pushAction(roomCode, action) {
  const { db } = initFirebaseOnce();
  const listRef = ref(db, `rooms/${roomCode}/actions`);
  const entry = { ...action, ts: Date.now() };
  await push(listRef, entry);
  await update(ref(db, `rooms/${roomCode}`), {
    updatedAt: serverTimestamp(),
  });
}

export async function setRoomStatus(roomCode, status) {
  const { db } = initFirebaseOnce();
  await update(ref(db, `rooms/${roomCode}`), {
    status,
    updatedAt: serverTimestamp(),
  });
}
