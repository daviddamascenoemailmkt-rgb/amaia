"use client";

import { useEffect, useState } from "react";

/**
 * Revela uma lista de falas em ritmo de conversa: mostra "digitando…", espera
 * um tempo proporcional ao tamanho da mensagem, publica a fala e recomeça.
 *
 * O tempo é derivado do comprimento do texto porque delay fixo entrega o truque
 * na primeira mensagem — uma linha curta e um parágrafo levariam o mesmo tempo.
 *
 * @param pesos comprimento (em caracteres) de cada fala, na ordem
 * @param ativo pausa a sequência quando falso, sem perder o que já foi revelado
 */
export function useConversa(pesos: number[], ativo = true) {
  const [reveladas, setReveladas] = useState(0);
  const [digitando, setDigitando] = useState(false);

  const total = pesos.length;

  useEffect(() => {
    if (!ativo || reveladas >= total) {
      setDigitando(false);
      return;
    }

    // Respiro antes de a atendente "começar a escrever".
    const pausa = reveladas === 0 ? 350 : 550;
    const t1 = setTimeout(() => setDigitando(true), pausa);
    const t2 = setTimeout(() => {
      setDigitando(false);
      setReveladas((r) => r + 1);
    }, pausa + duracaoDigitacao(pesos[reveladas] ?? 60));

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // `pesos` é recriado a cada render; o que importa é o índice e o total.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveladas, total, ativo]);

  /** Pula a espera — usado quando o visitante já interagiu e não deve aguardar. */
  const concluir = () => {
    setDigitando(false);
    setReveladas(total);
  };

  return { reveladas, digitando, concluida: reveladas >= total, concluir };
}

/** ~45 caracteres por segundo, com piso e teto para não irritar nem entregar o truque. */
function duracaoDigitacao(caracteres: number): number {
  return Math.min(2400, Math.max(700, 380 + caracteres * 22));
}
