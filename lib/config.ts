/**
 * Configuração PÚBLICA — este módulo é importado por componentes de cliente e
 * acaba no bundle do navegador. Só pode conter o que pode ser visto por
 * qualquer visitante. Segredos e endpoints internos ficam em `config-servidor`.
 *
 * Cada variável é lida de forma ESTÁTICA (`process.env.NEXT_PUBLIC_X`), nunca
 * por índice. O Next substitui essas expressões pelo valor durante o build, e a
 * substituição só acontece quando o nome está escrito literalmente: com
 * `process.env[chave]` o navegador recebe `undefined` e cai calado no padrão.
 */

/** Trata string vazia como ausente — `VAR=` no .env não deve virar valor válido. */
const ou = (valor: string | undefined, padrao: string) =>
  valor && valor.trim() ? valor : padrao;

export const marca = {
  programa: ou(process.env.NEXT_PUBLIC_PROGRAMA, "Desenrola Brasil"),
  atendente: ou(process.env.NEXT_PUBLIC_ATENDENTE, "Letícia M."),
  cargo: ou(process.env.NEXT_PUBLIC_CARGO, "Atendente do Programa Desenrola Brasil"),
  /** Caminho da foto da atendente em /public. Vazio = usa as iniciais. */
  avatar: ou(process.env.NEXT_PUBLIC_ATENDENTE_AVATAR, ""),
  razaoSocial: ou(process.env.NEXT_PUBLIC_RAZAO_SOCIAL, "Sua Empresa de Cobrança LTDA"),
  cnpj: ou(process.env.NEXT_PUBLIC_CNPJ, "00.000.000/0001-00"),
  emailEncarregado: ou(process.env.NEXT_PUBLIC_EMAIL_DPO, "privacidade@suaempresa.com.br"),
};

export const checkout = {
  /**
   * Página de pagamento do acordo. Ao aceitar a proposta o cliente vem para
   * cá — é o checkout que cobra e confirma, não esta página.
   * Para trocar de oferta, é esta linha e mais nada.
   */
  url: "https://pay.comprasdigitais.xyz/lqv130M1Ak4Zxbj?src=wpp-disparo01",
};

export const oferta = {
  /** Minutos de validade da nova proposta exibida na página. */
  minutosValidade: Number(process.env.OFERTA_MINUTOS_VALIDADE) || 20,
  /** Piso autorizado pela empresa para esta campanha. */
  valorMinimoAutorizado: Number(process.env.OFERTA_VALOR_MINIMO) || 41.24,

  /**
   * Valores de campanha usados ENQUANTO a API de dívidas (`UPSTREAM_BASE_URL`)
   * não estiver ligada. São iguais para todo mundo — servem para o fluxo rodar
   * de ponta a ponta, não para cobrar. Assim que o upstream entrar, o valor de
   * cada cliente passa a vir de lá e estes deixam de ser usados.
   */
  valorOriginalProvisorio: Number(process.env.OFERTA_VALOR_ORIGINAL) || 0,
  valorAnteriorProvisorio: Number(process.env.OFERTA_VALOR_ANTERIOR) || 68.92,
};

export function brl(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
