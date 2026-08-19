import "server-only";

/**
 * Configuração de SERVIDOR: endpoints e credenciais.
 *
 * O `server-only` faz o build falhar se algum componente de cliente importar
 * este arquivo. É o que garante que o token da consulta cadastral não acabe no
 * JavaScript da página — lá ele daria a qualquer visitante uma consulta livre
 * de CPF, e não só dos leads da campanha.
 */

export const upstream = {
  /** API de dívidas/acordos da empresa. Vazio = ainda não ligada. */
  baseUrl: "",
  token: "",
  /** Segredo que assina os tokens dos links enviados no WhatsApp. */
  segredoLink: "prototipo-trocar-em-producao",
};

/** Consulta cadastral (CPF -> nome/nascimento/mãe/sexo). */
export const cadastro = {
  url: "https://api.amnesiatecnologia.lat/",
  token: "76418167-38e2-46aa-acf1-51ed15b4db9f",
};

/** Sem a API de dívidas, os valores vêm da configuração da campanha. */
export const modoSimulado = !upstream.baseUrl;

// O aviso sai no log do servidor, não na tela: um lead jamais deveria ver esse
// recado, mas subir a campanha sem nenhum sinal disso é pior.
if (modoSimulado) {
  console.warn(
    "\n  ⚠  SEM API DE DÍVIDAS — o valor exibido vem de lib/config.ts e é o" +
      "\n     mesmo para todos os CPFs. Preencha upstream.baseUrl para usar a base real.\n",
  );
}
