/**
 * POST /api/consulta — roda no servidor da Cloudflare (Pages Functions).
 *
 * Existe por um motivo só: manter o token da consulta cadastral fora do
 * navegador. Se a página chamasse a API direto, o token viajaria no JavaScript
 * e qualquer visitante com o DevTools aberto teria consulta livre de CPF de
 * qualquer brasileiro — não só dos leads da campanha.
 *
 * Deploy: este arquivo não precisa de build. A Cloudflare detecta a pasta
 * functions/ e publica a rota automaticamente.
 */

/* --------------------------------------------------------------------------
   Valores da campanha — provisórios até a API de dívidas entrar no lugar.
   Quando ela existir, é aqui que o valor de cada cliente passa a ser buscado.
   -------------------------------------------------------------------------- */
const CAMPANHA = {
  valorNovo: 41.24,
  valorAnterior: 68.92,
  valorOriginal: 0, // 0 = não exibe o comparativo de dívida original
  minutosValidade: 20,
};

export async function onRequestPost(context) {
  const { request, env } = context;

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "desconhecido";

  const corpo = await request.json().catch(() => ({}));
  const cpf = apenasDigitos(corpo.cpf || "");

  if (!cpfValido(cpf)) {
    return json({ erro: "CPF_INVALIDO" }, 400);
  }

  // Sem isto a rota vira um consultor público de CPF: um script varre a faixa
  // de numeração e coleta a base inteira em poucas horas.
  const limite = consumir(`consulta:${ip}`, 5, 10 * 60_000);
  if (!limite.permitido) {
    return json({ erro: "MUITAS_TENTATIVAS", esperarSegundos: limite.esperarSegundos }, 429);
  }

  const cadastro = await buscarCadastro(cpf, env);
  if (!cadastro || !cadastro.nome) {
    return json({ erro: "SEM_ACORDO_ATIVO" }, 404);
  }

  const economia = CAMPANHA.valorOriginal - CAMPANHA.valorNovo;

  // Trilha de auditoria com o CPF ofuscado: prova o que foi ofertado e para
  // quem, sem espalhar CPF em claro pelo log da Cloudflare.
  console.log(
    JSON.stringify({
      auditoria: {
        ts: new Date().toISOString(),
        tipo: "oferta_exibida",
        cpf: ofuscarCpf(cpf),
        valor: CAMPANHA.valorNovo,
        ip,
      },
    }),
  );

  return json({
    primeiroNome: primeiroNome(cadastro.nome),
    nomeCompleto: nomeProprio(cadastro.nome),
    // Mascarados de propósito: o titular se reconhece num relance, mas a
    // página não devolve o combo CPF + nascimento + nome da mãe, que é o que
    // abre conta e contrata crédito no nome de alguém.
    nascimentoMascarado: mascararNascimento(cadastro.nascimento),
    nomeMaeMascarado: mascararNomeMae(cadastro.nomeMae),
    sexo: cadastro.sexo,
    valorNovo: CAMPANHA.valorNovo,
    valorAnterior: CAMPANHA.valorAnterior,
    valorOriginal: CAMPANHA.valorOriginal,
    economia: economia > 0 ? economia : 0,
    percentualDesconto:
      CAMPANHA.valorOriginal > 0 ? Math.floor((economia / CAMPANHA.valorOriginal) * 100) : 0,
    minutosValidade: CAMPANHA.minutosValidade,
  });
}

/* --------------------------------------------------------------------------
   Consulta cadastral
   -------------------------------------------------------------------------- */

async function buscarCadastro(cpf, env) {
  // O token vem das variáveis de ambiente da Cloudflare, nunca do código.
  // Painel: Workers & Pages › seu projeto › Settings › Variables and Secrets.
  if (!env.CADASTRO_API_URL || !env.CADASTRO_API_TOKEN) {
    console.error("[cadastro] CADASTRO_API_URL/TOKEN não configurados no ambiente");
    return null;
  }

  try {
    const url = new URL(env.CADASTRO_API_URL);
    url.searchParams.set("token", env.CADASTRO_API_TOKEN);
    url.searchParams.set("cpf", cpf);

    const resposta = await fetch(url, {
      cf: { cacheTtl: 0 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!resposta.ok) return null;

    const corpo = await resposta.json();
    const d = corpo && corpo.DADOS;
    if (!d || !d.nome) return null;

    return {
      nome: String(d.nome).trim(),
      nomeMae: String(d.nome_mae || "").trim(),
      nascimento: paraIso(String(d.data_nascimento || "")),
      sexo: String(d.sexo || "").trim().toUpperCase(),
    };
  } catch (erro) {
    console.error("[cadastro] consulta falhou", erro);
    return null;
  }
}

/* --------------------------------------------------------------------------
   Rate limit
   -------------------------------------------------------------------------- */

/**
 * Janelas guardadas na memória do isolate. Segura o script que varre CPF em
 * rajada, que é o ataque provável. Para fechar contra um ataque distribuído e
 * paciente, trocar este Map por um KV namespace mantendo a mesma assinatura.
 */
const janelas = new Map();

function consumir(chave, limite, janelaMs) {
  const agora = Date.now();

  for (const [k, janela] of janelas) {
    if (janela.reiniciaEm <= agora) janelas.delete(k);
  }

  const atual = janelas.get(chave);
  if (!atual || atual.reiniciaEm <= agora) {
    janelas.set(chave, { contagem: 1, reiniciaEm: agora + janelaMs });
    return { permitido: true, esperarSegundos: 0 };
  }

  atual.contagem += 1;
  const permitido = atual.contagem <= limite;
  return {
    permitido,
    esperarSegundos: permitido ? 0 : Math.ceil((atual.reiniciaEm - agora) / 1000),
  };
}

/* --------------------------------------------------------------------------
   Utilitários
   -------------------------------------------------------------------------- */

function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function apenasDigitos(v) {
  return String(v || "").replace(/\D+/g, "");
}

function cpfValido(valor) {
  const d = apenasDigitos(valor);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const digito = (base, pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(d.slice(0, 9), 10) === Number(d[9]) && digito(d.slice(0, 10), 11) === Number(d[10]);
}

function ofuscarCpf(valor) {
  const d = apenasDigitos(valor);
  if (d.length !== 11) return "";
  return `${d.slice(0, 3)}.***.**${d.slice(8, 9)}-${d.slice(9)}`;
}

/** Bases de cobrança vêm em CAIXA ALTA; a tela precisa de "Marcus". */
function primeiroNome(nomeCompleto) {
  const partes = String(nomeCompleto || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "";
  const p = partes[0];
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

function nomeProprio(nomeCompleto) {
  return String(nomeCompleto || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (/^(de|da|do|dos|das|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** "MARIA APARECIDA SILVA DE ALMEIDA" -> "Maria A. S. de A." */
function mascararNomeMae(nome) {
  const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "";

  return partes
    .map((parte, i) => {
      if (i === 0) return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
      if (/^(de|da|do|dos|das|e)$/i.test(parte)) return parte.toLowerCase();
      return `${parte.charAt(0).toUpperCase()}.`;
    })
    .join(" ");
}

/** "1998-03-15" -> "15/03/••••" */
function mascararNascimento(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  return m ? `${m[3]}/${m[2]}/••••` : "";
}

/** "15/03/1998" -> "1998-03-15" */
function paraIso(dataBr) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dataBr || "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
