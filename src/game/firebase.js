// src/game/firebase.js
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
  get,
  onDisconnect,
} from "firebase/database";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";

/**
 * Firebase config
 * Prefer environment variables in production, but fall back to literals
 * so local dev works even without .env.
 * Set these in Vercel → Project → Settings → Environment Variables:
 *  VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_DATABASE_URL,
 *  VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET,
 *  VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
 */
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAaAiiSvuM89oCvAJuSJRJ-_xqe35haPME",
  authDomain: "dungeon-dice-monsters.firebaseapp.com",
  databaseURL: "https://dungeon-dice-monsters-default-rtdb.firebaseio.com",
  projectId: "dungeon-dice-monsters",
  storageBucket: "dungeon-dice-monsters.firebasestorage.app",
  messagingSenderId: "20922485427",
  appId: "1:20922485427:web:a7ab19984eb6727f487ec6"
};

//const app = initializeApp(firebaseConfig);

let app, db, auth;
let authReadyPromise = null;

export function initFirebaseOnce() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
  }
  return { app, db, auth };
}

/** Ensure we're signed in anonymously BEFORE any DB operations. */
async function ensureAuth() {
  const { auth } = initFirebaseOnce();
  if (auth.currentUser) return auth.currentUser;

  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve, reject) => {
      const off = onAuthStateChanged(auth, (user) => {
        if (user) {
          off();
          resolve(user);
        }
      });
      signInAnonymously(auth).catch((e) => {
        console.error("Anonymous sign-in failed:", e);
        reject(e);
      });
    });
  }
  return authReadyPromise;
}

/** Stable client id tag for actions (helps with debugging). */
function clientId() {
  try {
    const k = "ddm-client-id";
    let id = localStorage.getItem(k);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10).toUpperCase();
      localStorage.setItem(k, id);
    }
    return id;
  } catch {
    return "CLIENT";
  }
}

/** Generate a readable 5-char room code and ensure it’s free. */
async function createUniqueRoomCode(db) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // avoid confusing chars
  for (let tries = 0; tries < 10; tries++) {
    const code = Array.from({ length: 5 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("");
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) return code;
  }
  // Fallback: derive from a push key
  const raw = push(ref(db, "rooms")).key || "";
  const sanitized = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return sanitized.slice(0, 5) || "ROOM1";
}

/** Create a room (host). Returns the room code. */
export async function createRoom(profile = { name: "Host" }) {
  const { db } = initFirebaseOnce();
  const user = await ensureAuth(); // WAIT for auth
  const roomCode = await createUniqueRoomCode(db);
  const now = serverTimestamp();

  await set(ref(db, `rooms/${roomCode}`), {
    createdAt: now,
    updatedAt: now,
    status: "lobby", // lobby | playing | finished
    host: { ...profile, uid: user.uid, clientId: clientId() },
    guest: null,
    turnOwner: 0, // 0 host, 1 guest
    phase: "roll",
    seed: Date.now(), // both clients can derive same RNG sequence if needed
  });

  // Optional but convenient node for actions
  await set(ref(db, `rooms/${roomCode}/actions`), { _init: true });

  return roomCode;
}

/** Join room as guest. */
export async function joinRoom(roomCode, profile = { name: "Guest" }) {
  const { db } = initFirebaseOnce();
  const user = await ensureAuth(); // WAIT for auth

  const roomRef = ref(db, `rooms/${roomCode}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error("Room not found");

  const room = snap.val();
  if (room.guest && room.guest.uid && room.guest.uid !== user.uid) {
    throw new Error("Room already has a guest");
  }

  await update(roomRef, {
    guest: { ...profile, uid: user.uid, clientId: clientId() },
    updatedAt: serverTimestamp(),
  });
}

/** Subscribe to live room state. Returns unsubscribe fn. */
export function onRoom(roomCode, cb) {
  const { db } = initFirebaseOnce();
  return onValue(ref(db, `rooms/${roomCode}`), (snap) =>
    cb(snap.val() || null)
  );
}

/** Push a game action into the room's action log. */
export async function pushAction(roomCode, action) {
  const { db } = initFirebaseOnce();
  await ensureAuth();
  const listRef = ref(db, `rooms/${roomCode}/actions`);
  const entry = { ...action, ts: Date.now(), author: clientId() };
  await push(listRef, entry);
  await update(ref(db, `rooms/${roomCode}`), { updatedAt: serverTimestamp() });
}

/** Update high-level room status. */
export async function setRoomStatus(roomCode, status) {
  const { db } = initFirebaseOnce();
  await ensureAuth();
  await update(ref(db, `rooms/${roomCode}`), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Lightweight presence helper (optional).
 * Marks the current client online under rooms/{code}/presence/{role-uid or role-clientId}
 * and removes it on disconnect.
 */
export async function setPresence(roomCode, role = "host") {
  const { db, auth } = initFirebaseOnce();
  await ensureAuth();
  const uid = auth?.currentUser?.uid;
  const key = `${role}-${uid || clientId()}`;
  const presRef = ref(db, `rooms/${roomCode}/presence/${key}`);

  // mark online
  await update(presRef, {
    online: true,
    at: serverTimestamp(),
    clientId: clientId(),
  });

  // auto-remove on disconnect
  try {
    await onDisconnect(presRef).remove();
  } catch {
    // ignore
  }
}
