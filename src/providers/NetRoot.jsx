import React, { useEffect } from "react";
import { NetProvider } from "../game/net";
import { initFirebaseOnce } from "../game/firebase";

/**
 * Boots Firebase once on app load and provides the Net context
 * to the rest of the app. Drop this *outside* your GameProvider
 * (or outside your whole app tree) so networking is always available.
 *
 * Usage in App.jsx:
 *   <NetRoot>
 *     <GameProvider> ... </GameProvider>
 *   </NetRoot>
 */
export default function NetRoot({ children }) {
  useEffect(() => {
    // Initialize Firebase SDK instances early
    initFirebaseOnce();
  }, []);

  return <NetProvider>{children}</NetProvider>;
}
