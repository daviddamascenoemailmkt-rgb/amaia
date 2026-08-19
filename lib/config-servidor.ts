import "server-only";

/**
 * Configuração de SERVIDOR: segredos e endpoints internos.
 *
 * O `server-only` faz o build falhar se algum componente de cliente importar
 * este arquivo — a proteção que faltava quando o token da consulta cadastral
 * viajava no JavaScript da página.
 */

const env = (chave: string, padrao: string) => {
  const v = process.env[chave];
  return v && v.trim() ? v : padrao;
};

export const upstream = {
  /** URL base da API da empresa. Vazio = modo simulado (dados fictícios). */
  baseUrl: env("UPSTREAM_BASE_URL", ""),
  token: env("UPSTREAM_TOKEN", ""),
  /** Segredo que assina os tokens dos links enviados no WhatsApp. */
  segredoLink: env("LINK_SECRET", ""),
};

/** Consulta cadastral (CPF -> nome/nascimento/mãe/sexo). */
export const cadastro = {
  url: env("CADASTRO_API_URL", ""),
  token: env("CADASTRO_API_TOKEN", ""),
};

export const modoSimulado = !upstream.baseUrl;

// Sem segredo em produção, todo token do WhatsApp seria rejeitado em silêncio e
// a campanha inteira cairia no caminho aberto de consulta. Melhor não subir.
if (!upstream.segredoLink && process.env.NODE_ENV === "production") {
  throw new Error("LINK_SECRET não configurado — obrigatório em produção.");
}

// O aviso sai no log do servidor, não na tela: um lead jamais deveria ver esse
// recado, mas subir a campanha com valor de campanha sem nenhum sinal é pior.
if (modoSimulado) {
  console.warn(
    "\n  ⚠  SEM API DE DÍVIDAS (UPSTREAM_BASE_URL vazia) — o valor exibido vem das" +
      "\n     variáveis OFERTA_* e é o mesmo para todos os CPFs.\n",
  );
}
