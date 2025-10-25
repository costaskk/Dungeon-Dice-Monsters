// Realtime multiplayer using Firebase (no backend needed)
import { initializeApp } from "firebase/app";
import {
  getDatabase, ref, onValue, set, update, push, serverTimestamp, get
} from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

// === Your Firebase config (from your screenshots) ===
// If you rotate keys later, just replace this object.
const firebaseConfig = {
  apiKey: "AIzaSyAAaiSVuM89OcVAuJSJRJ_-xqe3ShaPME",
  authDomain: "dungeon-dice-monsters.firebaseapp.com",
  databaseURL: "https://dungeon-dice-monsters-default-rtdb.firebasedatabase.app",
  projectId: "dungeon-dice-monsters",
  storageBucket: "dungeon-dice-monsters.firebasestorage.app",
  messagingSenderId: "20922485427",
  appId: "1:20922485427:web:a7ab19984ebc277f487ce6",
};

let app, db, auth;
export function initFirebaseOnce() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    // Anonymous sign-in makes DB security rules easy (no UI prompts).
    signInAnonymously(auth).catch(() => {});
  }
  return { app, db, auth };
}

// Utility: generate a readable room code and ensure it’s free
async function createUniqueRoomCode(db) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // avoid confusing chars
  let tries = 0;
  while (tries < 10) {
    const code = Array.from({ length: 5 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("");
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) return code;
    tries++;
  }
  // fallback to a push key if we get extremely unlucky
  const key = push(ref(db, "rooms")).key.toUpperCase().slice(0, 5);
  return key;
}

export async function createRoom(profile = { name: "Host" }) {
  const { db } = initFirebaseOnce();
  const roomCode = await createUniqueRoomCode(db);
  const now = serverTimestamp();

  // Structure keeps room small; actions streamed separately
  await set(ref(db, `rooms/${roomCode}`), {
    createdAt: now,
    updatedAt: now,
    status: "lobby",          // lobby | playing | finished
    host: profile,
    guest: null,
    turnOwner: 0,             // 0 host, 1 guest
    phase: "roll",
    seed: Date.now(),         // both clients derive same RNG sequence
  });

  // Pre-create actions list so rules can depend on it
  await set(ref(db, `rooms/${roomCode}/actions`), { _init: true });

  return roomCode;
}

export async function joinRoom(roomCode, profile = { name: "Guest" }) {
  const { db } = initFirebaseOnce();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error("Room not found");
  const room = snap.val();
  if (room.guest && room.guest.uid && profile.uid && room.guest.uid !== profile.uid) {
    throw new Error("Room already has a guest");
  }
  await update(roomRef, {
    guest: profile,
    updatedAt: serverTimestamp(),
  });
}

export function onRoom(roomCode, cb) {
  const { db } = initFirebaseOnce();
  return onValue(ref(db, `rooms/${roomCode}`), (snap) => cb(snap.val() || null));
}

export async function pushAction(roomCode, action) {
  const { db } = initFirebaseOnce();
  const listRef = ref(db, `rooms/${roomCode}/actions`);
  const entry = { ...action, ts: Date.now() };
  await push(listRef, entry);
  await update(ref(db, `rooms/${roomCode}`), { updatedAt: serverTimestamp() });
}

export async function setRoomStatus(roomCode, status) {
  const { db } = initFirebaseOnce();
  await update(ref(db, `rooms/${roomCode}`), { status, updatedAt: serverTimestamp() });
}
