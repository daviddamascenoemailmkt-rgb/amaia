import { apenasDigitos } from "./cpf";
import { oferta } from "./config";
import { cadastro, modoSimulado, upstream } from "./config-servidor";

/** Contrato de dados que a página consome. A API da empresa é adaptada para cá. */
export type Acordo = {
  acordoId: string;
  nomeCompleto: string;
  cpf: string;
  /** Soma das dívidas originais. 0 = não exibe o comparativo na tela. */
  valorOriginal: number;
  /** Valor do acordo anterior, cujo PIX expirou. */
  valorAnterior: number;
  /** Nova proposta autorizada nesta campanha. */
  valorNovo: number;
  credores: string[];
  ativo: boolean;
  /** Só para flexionar textos. M | F | "" */
  sexo: string;
};

/**
 * Retrato cadastral completo. Vive apenas no servidor: `nomeMae` e `nascimento`
 * chegam à tela mascarados e o valor em claro nunca entra na resposta HTTP.
 */
export type Cadastro = {
  nome: string;
  nomeMae: string;
  /** ISO yyyy-mm-dd. */
  nascimento: string;
  sexo: string;
};

class ErroUpstream extends Error {
  constructor(mensagem: string, readonly status = 502) {
    super(mensagem);
  }
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${upstream.baseUrl}${caminho}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(upstream.token ? { authorization: `Bearer ${upstream.token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!resposta.ok) {
    throw new ErroUpstream(`Upstream respondeu ${resposta.status} em ${caminho}`);
  }
  return (await resposta.json()) as T;
}

/* -------------------------------------------------------------------------- */
/*  Base simulada — CPFs de teste, respondem mesmo sem nenhuma API ligada.     */
/* -------------------------------------------------------------------------- */

const BASE_SIMULADA: Record<string, Omit<Acordo, "cpf">> = {
  "17341074728": {
    acordoId: "X1DIK-LFL--",
    nomeCompleto: "MARCUS VINICIUS DE ALMEIDA MAMPRIM",
    valorOriginal: 4127.5,
    valorAnterior: 68.92,
    valorNovo: 41.24,
    credores: ["Banco Parceiro S.A."],
    ativo: true,
    sexo: "M",
  },
  "11144477735": {
    acordoId: "T9PQZ-MRA--",
    nomeCompleto: "MARIA APARECIDA DOS SANTOS",
    valorOriginal: 2880.0,
    valorAnterior: 74.5,
    valorNovo: 55.9,
    credores: ["Financeira Parceira S.A.", "Varejo Parceiro LTDA"],
    ativo: true,
    sexo: "F",
  },
};

const CADASTRO_SIMULADO: Record<string, Cadastro> = {
  "17341074728": {
    nome: "MARCUS VINICIUS DE ALMEIDA MAMPRIM",
    nomeMae: "MARIA APARECIDA SILVA DE ALMEIDA",
    nascimento: "1998-03-15",
    sexo: "M",
  },
  "11144477735": {
    nome: "MARIA APARECIDA DOS SANTOS",
    nomeMae: "BENEDITA DOS SANTOS",
    nascimento: "1981-11-02",
    sexo: "F",
  },
};

/* -------------------------------------------------------------------------- */
/*  Consulta cadastral (CPF -> nome, nascimento, mãe, sexo)                    */
/* -------------------------------------------------------------------------- */

/**
 * O token desta API nunca é `NEXT_PUBLIC_`: a chamada só sai daqui, do
 * servidor. No navegador ele daria a qualquer visitante uma consulta livre de
 * CPF de qualquer brasileiro, não só dos leads da campanha.
 */
export async function buscarCadastro(cpfBruto: string): Promise<Cadastro | null> {
  const cpf = apenasDigitos(cpfBruto);

  if (!cadastro.url) return CADASTRO_SIMULADO[cpf] ?? null;

  try {
    const url = new URL(cadastro.url);
    if (cadastro.token) url.searchParams.set("token", cadastro.token);
    url.searchParams.set("cpf", cpf);

    const resposta = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!resposta.ok) return null;

    const corpo = (await resposta.json()) as {
      DADOS?: { nome?: string; nome_mae?: string; data_nascimento?: string; sexo?: string };
    };
    const d = corpo?.DADOS;
    if (!d?.nome) return null;

    return {
      nome: d.nome.trim(),
      nomeMae: (d.nome_mae ?? "").trim(),
      nascimento: paraIso(d.data_nascimento ?? ""),
      sexo: (d.sexo ?? "").trim().toUpperCase(),
    };
  } catch (erro) {
    console.error("[cadastro] consulta falhou", erro);
    return null;
  }
}

/** "15/03/1998" -> "1998-03-15". Devolve "" para qualquer coisa fora do formato. */
function paraIso(dataBr: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBr.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

/* -------------------------------------------------------------------------- */
/*  API pública do módulo                                                     */
/* -------------------------------------------------------------------------- */

export async function buscarAcordo(cpfBruto: string): Promise<Acordo | null> {
  const cpf = apenasDigitos(cpfBruto);

  if (modoSimulado) {
    // 1º) CPFs de teste: respondem sempre, mesmo sem nenhuma API configurada.
    const teste = BASE_SIMULADA[cpf];
    if (teste) {
      await new Promise((r) => setTimeout(r, 450)); // latência realista para a UI
      return { ...teste, cpf };
    }

    // 2º) Enquanto a API de dívidas (UPSTREAM_BASE_URL) não estiver ligada, o
    //     nome vem da consulta cadastral e os valores vêm da configuração da
    //     campanha. É o andaime que deixa o fluxo rodar de ponta a ponta —
    //     quando o upstream entrar, o valor de cada cliente passa a vir de lá.
    const cadastroTitular = await buscarCadastro(cpf);
    if (!cadastroTitular?.nome) return null;

    return {
      acordoId: "",
      nomeCompleto: cadastroTitular.nome,
      cpf,
      valorOriginal: oferta.valorOriginalProvisorio,
      valorAnterior: oferta.valorAnteriorProvisorio,
      valorNovo: oferta.valorMinimoAutorizado,
      credores: [],
      ativo: true,
      sexo: cadastroTitular.sexo,
    };
  }

  const dados = await chamar<Partial<Acordo> | null>(`/acordos/${cpf}`);
  if (!dados) return null;

  // O nome do CRM tem prioridade: é o titular que assinou o acordo. A consulta
  // cadastral entra só como rede de segurança para cadastro incompleto.
  const cadastroTitular = await buscarCadastro(cpf);
  const nomeCompleto = String(dados.nomeCompleto ?? "").trim() || cadastroTitular?.nome || "";
  if (!nomeCompleto) return null;

  const valorAnterior = Number(dados.valorAnterior ?? 0);
  return {
    acordoId: String(dados.acordoId ?? ""),
    nomeCompleto,
    cpf,
    valorOriginal: Number(dados.valorOriginal ?? 0),
    valorAnterior,
    // Nunca deixa a proposta cair abaixo do piso autorizado, mesmo que o
    // upstream devolva algo menor por engano de cadastro.
    valorNovo: Math.max(Number(dados.valorNovo ?? valorAnterior), oferta.valorMinimoAutorizado),
    credores: Array.isArray(dados.credores) ? dados.credores.map(String) : [],
    ativo: dados.ativo !== false,
    sexo: cadastroTitular?.sexo ?? "",
  };
}
