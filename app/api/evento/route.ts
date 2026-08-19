import { NextResponse } from "next/server";
import { registrar, type EventoAuditoria } from "@/lib/auditoria";
import { consumir, ipDaRequisicao } from "@/lib/limite";

const PERMITIDOS = new Set<EventoAuditoria["tipo"]>([
  "pagina_aberta",
  "oferta_aceita",
  "oferta_recusada",
]);

/** Telemetria de funil disparada pelo navegador. Aceita só eventos sem risco. */
export async function POST(req: Request) {
  const ip = ipDaRequisicao(req);
  if (!consumir(`evento:${ip}`, 40, 60_000).permitido) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const corpo = (await req.json().catch(() => ({}))) as Partial<EventoAuditoria>;
  if (!corpo.tipo || !PERMITIDOS.has(corpo.tipo)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await registrar({ tipo: corpo.tipo, cpf: corpo.cpf, acordoId: corpo.acordoId, ip });
  return NextResponse.json({ ok: true });
}
