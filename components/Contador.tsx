"use client";

import { useEffect, useState } from "react";

/** Contagem regressiva da validade da proposta. */
export function Contador({ expiraEm, aoExpirar }: { expiraEm: string; aoExpirar?: () => void }) {
  const alvo = new Date(expiraEm).getTime();
  const [restante, setRestante] = useState(() => Math.max(0, alvo - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const novo = Math.max(0, alvo - Date.now());
      setRestante(novo);
      if (novo === 0) {
        clearInterval(id);
        aoExpirar?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [alvo, aoExpirar]);

  const minutos = String(Math.floor(restante / 60_000)).padStart(2, "0");
  const segundos = String(Math.floor((restante % 60_000) / 1000)).padStart(2, "0");
  const urgente = restante < 5 * 60_000;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-sm font-semibold tabular-nums",
        urgente ? "bg-red-50 text-red-600" : "bg-gov-50 text-gov-700",
      ].join(" ")}
      role="timer"
      aria-live="off"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" />
      </svg>
      {minutos}:{segundos}
    </span>
  );
}
