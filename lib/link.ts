import { createHmac, timingSafeEqual } from "node:crypto";
import { upstream } from "./config-servidor";

/**
 * Token assinado que viaja na URL enviada pelo WhatsApp.
 *
 * Por que isso existe: sem ele, /api/consulta vira um oráculo público que
 * devolve o nome completo de qualquer CPF do país. Com ele, o link já carrega
 * o vínculo com o lead e o CPF digitado serve só como confirmação de
 * titularidade — que é o que a LGPD espera de um tratamento mínimo necessário.
 */
export type PayloadLink = {
  /** CPF (somente dígitos) do titular a quem a campanha foi enviada. */
  c: string;
  /** Identificador do acordo/negociação no sistema da empresa. */
  a: string;
  /** Expiração em epoch (segundos). */
  exp: number;
};

const b64url = (buf: Buffer) => buf.toString("base64url");

const SEGREDO_DEV = "dev-secret-trocar-em-producao";

function assinar(dados: string): string {
  const segredo = upstream.segredoLink || SEGREDO_DEV;
  return b64url(createHmac("sha256", segredo).update(dados).digest());
}

export function gerarToken(payload: PayloadLink): string {
  const corpo = b64url(Buffer.from(JSON.stringify(payload)));
  return `${corpo}.${assinar(corpo)}`;
}

export function lerToken(token: string | null | undefined): PayloadLink | null {
  if (!token) return null;
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;

  const esperada = Buffer.from(assinar(corpo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;

  try {
    const payload = JSON.parse(Buffer.from(corpo, "base64url").toString()) as PayloadLink;
    if (!payload?.c || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
