import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "../game/state";
import Sprite from "./Sprite";

export default function CardModal() {
  const { modalCard, setModalCard, modalOwner, hideCardModal, showCardModal } = useGame();
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);

  // Close if pointer leaves entire browser window (with a little guard)
  useEffect(() => {
    if (!modalCard) return;
    const handleLeaveWindow = (e) => {
      // Only close if genuinely outside viewport (ignore devtools edges)
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth) {
        setModalCard(null);
      }
    };
    window.addEventListener("mouseleave", handleLeaveWindow);
    return () => window.removeEventListener("mouseleave", handleLeaveWindow);
  }, [modalCard, setModalCard]);

  if (!modalCard) return null;
  const c = modalCard;

  const idKey = modalOwner ?? (c.id || c.name || "card");
  const handleEnter = () => {
    setIsHovered(true);
    showCardModal(c, idKey);
  };
  const handleLeave = () => {
    setIsHovered(false);
    // slight delay to allow moving between image/text without flicker
    setTimeout(() => {
      if (!isHovered) hideCardModal(idKey, 0);
    }, 120);
  };

  const handleBackdropClick = () => setModalCard(null);
  const stop = (e) => e.stopPropagation();

  const typeStr = (c.type || "").toLowerCase();
  const rarityStr = (c.rarity || "").toLowerCase();
  const frameColor =
    typeStr.includes("trap")
      ? "from-purple-900/90 to-indigo-800/90 border-purple-600"
      : typeStr.includes("spell") || typeStr.includes("magic")
      ? "from-blue-900/90 to-cyan-800/90 border-blue-500"
      : typeStr.includes("fusion") || rarityStr.includes("ultra")
      ? "from-amber-900/90 to-yellow-700/90 border-amber-400"
      : "from-rose-900/90 to-red-800/90 border-rose-500";

  const glow =
    rarityStr.includes("ultra") || rarityStr.includes("rare")
      ? "shadow-[0_0_20px_rgba(255,255,200,0.6)]"
      : "";

  const stars = c.stars ?? c.level ?? 1;
  const summonCondition =
    stars <= 2
      ? "Requires 2 matching dice faces (★1–2)."
      : stars <= 4
      ? "Requires 2 matching dice faces (★3–4) or one Wild (black) die."
      : "Requires 2 matching dice faces (★5–6) or a Wild die. Some ★6 may require 3 summon crests.";

  const bigImg = c.large || c.thumb || null;

  return (
    <AnimatePresence>
      {modalCard && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onPointerEnter={handleEnter}
          onPointerLeave={handleLeave}
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            ref={containerRef}
            className={`pointer-events-auto bg-gradient-to-br ${frameColor} ${glow} rounded-2xl shadow-2xl w-[92%] max-w-2xl p-4 border backdrop-blur-md`}
            onClick={stop}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label={c.name || "Card details"}
          >
            <div className="flex flex-col md:flex-row items-start gap-4">
              {/* Card Image */}
              <div className="flex-shrink-0 relative">
                {bigImg ? (
                  <img
                    src={bigImg}
                    alt={c.name || "Card"}
                    className={`w-48 h-72 object-cover rounded-lg border border-slate-700 shadow-md ${glow}`}
                    draggable={false}
                  />
                ) : (
                  <div className="w-48 h-72 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
                    <Sprite kind={c.sprite || "magus"} size={64} />
                  </div>
                )}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-300 bg-slate-900/70 px-2 py-0.5 rounded-full">
                  ★ {stars}
                </div>
              </div>

              {/* Info Panel */}
              <div className="flex flex-col gap-1 text-slate-100 text-sm leading-tight max-w-[60ch]">
                <div className="text-2xl font-bold text-amber-200 drop-shadow-sm break-words">
                  {c.name || "Unknown Card"}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300 mb-2">
                  {c.rarity && (
                    <span className="px-2 py-0.5 bg-slate-700/50 rounded-md border border-slate-600">
                      Rarity: {c.rarity}
                    </span>
                  )}
                  {c.attr && (
                    <span className="px-2 py-0.5 bg-slate-700/50 rounded-md border border-slate-600">
                      Attribute: {c.attr}
                    </span>
                  )}
                  {c.type && (
                    <span className="px-2 py-0.5 bg-slate-700/50 rounded-md border border-slate-600">
                      Type: {c.type}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
                  <div className="text-rose-300">ATK: {c.atk ?? "?"}</div>
                  <div className="text-cyan-300">DEF: {c.def ?? "?"}</div>
                </div>

                {c.level && (
                  <div className="text-xs mt-1 text-slate-300">Dice Level: {c.level}</div>
                )}
                <div className="mt-1 text-xs italic text-slate-300">
                  Summoning: {summonCondition}
                </div>

                {c.effect?.text && (
                  <div className="mt-3 text-[13px] text-slate-100/90 whitespace-pre-wrap leading-snug break-words bg-slate-800/60 p-2 rounded-md border border-slate-700 shadow-inner">
                    {c.effect.text}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
