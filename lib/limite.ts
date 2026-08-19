/**
 * Rate limit por IP.
 *
 * O armazenamento é em memória do processo. Num servidor Node isso cobre bem a
 * campanha inteira; em Cloudflare Workers cada isolate tem a própria memória e
 * vive pouco, então o limite passa a valer por isolate — segura o script que
 * varre CPFs em rajada, mas não um ataque distribuído com paciência. Para
 * fechar isso lá, trocar `janelas` por um KV namespace mantendo a assinatura de
 * `consumir` (veja a nota de Cloudflare no README).
 */

type Janela = { contagem: number; reiniciaEm: number };
const janelas = new Map<string, Janela>();

/** Teto de chaves guardadas, para o Map não virar vazamento de memória. */
const MAXIMO_CHAVES = 10_000;

export function consumir(chave: string, limite: number, janelaMs: number) {
  const agora = Date.now();
  limparExpiradas(agora);

  const atual = janelas.get(chave);

  if (!atual || atual.reiniciaEm <= agora) {
    janelas.set(chave, { contagem: 1, reiniciaEm: agora + janelaMs });
    return { permitido: true, restante: limite - 1, esperarSegundos: 0 };
  }

  atual.contagem += 1;
  const permitido = atual.contagem <= limite;
  return {
    permitido,
    restante: Math.max(0, limite - atual.contagem),
    esperarSegundos: permitido ? 0 : Math.ceil((atual.reiniciaEm - agora) / 1000),
  };
}

/**
 * Limpeza preguiçosa, feita durante a requisição.
 *
 * A versão anterior usava `setInterval` no escopo do módulo. Isso funciona no
 * Node, mas em Workers não há timer vivo fora do ciclo de uma requisição — o
 * runtime recusa temporizadores pendentes quando o isolate encerra.
 */
function limparExpiradas(agora: number) {
  if (janelas.size === 0) return;

  for (const [chave, janela] of janelas) {
    if (janela.reiniciaEm <= agora) janelas.delete(chave);
  }

  // Salvaguarda: se ainda estourar o teto, descarta as entradas mais antigas.
  if (janelas.size > MAXIMO_CHAVES) {
    const ordenadas = [...janelas.entries()].sort((a, b) => a[1].reiniciaEm - b[1].reiniciaEm);
    for (const [chave] of ordenadas.slice(0, janelas.size - MAXIMO_CHAVES)) {
      janelas.delete(chave);
    }
  }
}

export function ipDaRequisicao(req: Request): string {
  // A Cloudflare entrega o IP real do visitante em CF-Connecting-IP e é o único
  // cabeçalho que ela não deixa o cliente forjar.
  const cloudflare = req.headers.get("cf-connecting-ip");
  if (cloudflare) return cloudflare.trim();

  const encaminhado = req.headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();

  return req.headers.get("x-real-ip") ?? "desconhecido";
}
