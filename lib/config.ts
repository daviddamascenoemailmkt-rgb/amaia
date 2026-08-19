/**
 * Configuração da campanha — tudo em um lugar só, direto no código.
 *
 * Protótipo: não depende de .env. Para mudar qualquer coisa da página, é aqui.
 */

export const marca = {
  programa: "Desenrola Brasil",
  atendente: "Letícia M.",
  cargo: "Atendente do Programa Desenrola Brasil",
  /** Caminho da foto da atendente em /public. Vazio = usa as iniciais. */
  avatar: "/leticia.png",
  razaoSocial: "Sua Empresa de Cobrança LTDA",
  cnpj: "00.000.000/0001-00",
  emailEncarregado: "privacidade@suaempresa.com.br",
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
  minutosValidade: 20,
  /** Piso autorizado pela empresa: o servidor nunca cobra menos que isto. */
  valorMinimoAutorizado: 41.24,

  /**
   * Valores usados ENQUANTO a API de dívidas (`upstream.baseUrl`) não estiver
   * ligada. São iguais para todo mundo — servem para o fluxo rodar de ponta a
   * ponta. Quando o upstream entrar, o valor de cada cliente vem de lá.
   * valorOriginal 0 = não exibe o comparativo de desconto na tela.
   */
  valorOriginalProvisorio: 0,
  valorAnteriorProvisorio: 68.92,
};

export function brl(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
