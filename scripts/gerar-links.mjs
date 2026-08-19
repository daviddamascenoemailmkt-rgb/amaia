#!/usr/bin/env node
/**
 * Gera os links assinados que vão no template do WhatsApp.
 *
 * Uso:
 *   LINK_SECRET=... node scripts/gerar-links.mjs leads.csv https://acordo.suaempresa.com.br
 *
 * Entrada (CSV com cabeçalho): cpf,acordo_id,telefone,nome
 * Saída (CSV): telefone,nome,cpf,link
 */

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const [arquivo, baseUrl] = process.argv.slice(2);
const segredo = process.env.LINK_SECRET;
const diasValidade = Number(process.env.LINK_DIAS_VALIDADE ?? 3);

if (!arquivo || !baseUrl) {
  console.error("Uso: LINK_SECRET=... node scripts/gerar-links.mjs <leads.csv> <base-url>");
  process.exit(1);
}
if (!segredo) {
  console.error("Defina LINK_SECRET com o mesmo valor configurado no site.");
  process.exit(1);
}

const gerarToken = (payload) => {
  const corpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const assinatura = createHmac("sha256", segredo).update(corpo).digest("base64url");
  return `${corpo}.${assinatura}`;
};

const linhas = readFileSync(arquivo, "utf8").trim().split(/\r?\n/);
const cabecalho = linhas[0].split(",").map((c) => c.trim().toLowerCase());
const indice = (nome) => cabecalho.indexOf(nome);

const exp = Math.floor(Date.now() / 1000) + diasValidade * 86_400;
const saida = ["telefone,nome,cpf,link"];
let ignorados = 0;

for (const linha of linhas.slice(1)) {
  const colunas = linha.split(",").map((c) => c.trim());
  const cpf = (colunas[indice("cpf")] ?? "").replace(/\D+/g, "");
  const acordoId = colunas[indice("acordo_id")] ?? "";
  const telefone = colunas[indice("telefone")] ?? "";
  const nome = colunas[indice("nome")] ?? "";

  if (cpf.length !== 11) {
    ignorados++;
    continue;
  }

  const link = `${baseUrl.replace(/\/$/, "")}/?t=${gerarToken({ c: cpf, a: acordoId, exp })}`;
  saida.push([telefone, JSON.stringify(nome), cpf, link].join(","));
}

console.log(saida.join("\n"));
console.error(
  `\n${saida.length - 1} links gerados, ${ignorados} ignorados. Validade: ${diasValidade} dia(s).`,
);
