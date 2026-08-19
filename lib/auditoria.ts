import { ofuscarCpf } from "./cpf";

/**
 * Trilha de auditoria da negociação. O CDC (art. 42) e a LGPD pedem que a
 * empresa consiga provar o que foi ofertado, quando e para quem — sem guardar
 * CPF em claro no log de aplicação.
 */
export type EventoAuditoria = {
  tipo:
    | "pagina_aberta"
    | "cpf_consultado"
    | "cpf_nao_encontrado"
    | "oferta_exibida"
    | "oferta_aceita"
    | "oferta_recusada";
  cpf?: string;
  acordoId?: string;
  valor?: number;
  ip?: string;
  detalhe?: Record<string, unknown>;
};

export async function registrar(evento: EventoAuditoria) {
  const linha = {
    ts: new Date().toISOString(),
    tipo: evento.tipo,
    cpf: evento.cpf ? ofuscarCpf(evento.cpf) : undefined,
    acordoId: evento.acordoId,
    valor: evento.valor,
    ip: evento.ip,
    ...evento.detalhe,
  };

  // Em produção, encaminhar para o data warehouse / CRM da empresa.
  // Aqui vai para o log estruturado da plataforma, que já coleta e retém.
  console.log(JSON.stringify({ auditoria: linha }));
}
