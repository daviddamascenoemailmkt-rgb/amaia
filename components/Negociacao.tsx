"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { brl, checkout } from "@/lib/config";
import { flexionar, nomeCurto, nomeProprio, ofuscarCpf } from "@/lib/cpf";
import { Bolha, BolhaCliente, Digitando } from "./Bolha";
import { CampoCpf } from "./CampoCpf";
import { Contador } from "./Contador";
import { useConversa } from "./useConversa";

type Proposta = {
  acordoId: string;
  nomeCompleto: string;
  valorOriginal: number;
  valorAnterior: number;
  valorNovo: number;
  economia: number;
  percentualDesconto: number;
  credores: string[];
  sexo: string;
  nomeMaeMascarado: string;
  nascimentoMascarado: string;
  expiraEm: string;
};

type Passo = "identificacao" | "analisando" | "oferta" | "redirecionando" | "expirado";

/** Evita "Banco X S.A.." quando a razão social já termina em ponto. */
const pontuar = (texto: string) => (/[.!?]$/.test(texto) ? texto : `${texto}.`);

const ERROS: Record<string, string> = {
  CPF_NAO_CONFERE:
    "Esse CPF é diferente do titular da proposta. A oferta é pessoal e intransferível — confira o número.",
  SEM_ACORDO_ATIVO:
    "Não localizei nenhuma proposta ativa para esse CPF. Ela pode já ter sido quitada ou o prazo encerrou.",
  LINK_EXPIRADO:
    "O link que você recebeu não é mais válido. Peça um novo pelo WhatsApp que eu reativo sua proposta.",
  MUITAS_TENTATIVAS: "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.",
  INDISPONIVEL: "Nosso sistema está instável no momento. Tente de novo em instantes.",
};

/** Uma fala da sequência: o que renderizar e o peso que define o tempo de digitação. */
type Fala = { chave: string; peso: number; render: () => ReactNode };

export function Negociacao({
  token,
  cpfPrefixado,
  minutosValidade,
}: {
  token: string | null;
  cpfPrefixado: string;
  minutosValidade: number;
}) {
  const [passo, setPasso] = useState<Passo>("identificacao");
  const [cpf, setCpf] = useState("");
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const propostaRef = useRef<HTMLDivElement>(null);

  const telemetria = useCallback(
    (tipo: string, extra?: Record<string, unknown>) => {
      navigator.sendBeacon?.(
        "/api/evento",
        new Blob([JSON.stringify({ tipo, cpf: cpf || undefined, ...extra })], {
          type: "application/json",
        }),
      );
    },
    [cpf],
  );

  useEffect(() => {
    telemetria("pagina_aberta");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------------- */
  /*  Abertura: as três primeiras falas, antes de pedir o CPF               */
  /* ---------------------------------------------------------------------- */

  const abertura: Fala[] = [
    {
      chave: "saudacao",
      peso: 130,
      render: () => (
        <Bolha>
          Olá! Aqui é a <strong>Letícia</strong>. Recebi seu contato porque o{" "}
          <strong>PIX do seu acordo expirou</strong> antes da confirmação do pagamento. 😕
        </Bolha>
      ),
    },
    {
      chave: "boa-noticia",
      peso: 110,
      render: () => (
        <Bolha>
          A boa notícia: consegui <strong>autorização para refazer sua proposta</strong> — e por um
          valor ainda menor que o anterior.
        </Bolha>
      ),
    },
    {
      chave: "pedir-cpf",
      peso: 80,
      render: () => (
        <Bolha>Só preciso confirmar que estou falando com o titular. Pode informar seu CPF?</Bolha>
      ),
    },
  ];

  const conversaAbertura = useConversa(
    abertura.map((f) => f.peso),
    true,
  );

  /* ---------------------------------------------------------------------- */
  /*  Oferta: falas reveladas depois que o CPF é confirmado                 */
  /* ---------------------------------------------------------------------- */

  const primeiroNome = proposta ? nomeCurto(proposta.nomeCompleto) : "";
  const mostrandoOferta =
    passo === "oferta" || passo === "redirecionando" || passo === "expirado";

  const oferta: Fala[] = proposta
    ? [
        {
          chave: "encontrei",
          peso: 105,
          render: () => (
            <Bolha>
              Encontrei, <strong>{primeiroNome}</strong>! Você está{" "}
              {flexionar(proposta.sexo, "cadastrado", "cadastrada", "cadastrado(a)")} no programa e
              seu acordo está aqui comigo. 👇
            </Bolha>
          ),
        },
        { chave: "identidade", peso: 150, render: () => <CartaoIdentidade proposta={proposta} cpf={cpf} /> },
        {
          chave: "expirou",
          peso: 135,
          render: () => (
            <Bolha>
              Seu acordo anterior era de <strong>{brl(proposta.valorAnterior)}</strong>, mas o prazo
              de 10 minutos do PIX passou e ele foi <strong>cancelado automaticamente</strong>.
            </Bolha>
          ),
        },
        {
          chave: "aprovado",
          peso: 120,
          render: () => (
            <Bolha destaque>
              Como você chegou a confirmar o acordo, solicitei uma{" "}
              <strong>condição especial de reativação</strong> e ela foi aprovada. ✅
            </Bolha>
          ),
        },
        {
          chave: "proposta",
          peso: 170,
          render: () => (
            <CartaoProposta
              ref={propostaRef}
              proposta={proposta}
              minutosValidade={minutosValidade}
              redirecionando={passo === "redirecionando"}
              aoAceitar={aceitar}
              aoExpirar={() => setPasso("expirado")}
            />
          ),
        },
      ]
    : [];

  const conversaOferta = useConversa(
    oferta.map((f) => f.peso),
    mostrandoOferta,
  );

  /* ---------------------------------------------------------------------- */
  /*  Rolagem                                                               */
  /* ---------------------------------------------------------------------- */

  const propostaVisivel = conversaOferta.concluida && Boolean(proposta);

  useEffect(() => {
    // Quando a proposta entra, o alvo deixa de ser o fim da conversa: o cartão
    // inteiro — valor e botão — precisa nascer sob os olhos, não abaixo da
    // dobra. O resto do tempo, a rolagem acompanha a última fala.
    if (propostaVisivel && propostaRef.current) {
      const el = propostaRef.current;
      const folga = Math.max(16, (window.innerHeight - el.offsetHeight) * 0.18);
      const topo = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, topo - folga), behavior: "smooth" });
      return;
    }

    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [
    conversaAbertura.reveladas,
    conversaAbertura.digitando,
    conversaOferta.reveladas,
    conversaOferta.digitando,
    propostaVisivel,
    passo,
    erro,
  ]);

  /* ---------------------------------------------------------------------- */

  async function consultar(cpfDigitado: string) {
    setCpf(cpfDigitado);
    setErro(null);
    setPasso("analisando");

    try {
      const resposta = await fetch("/api/consulta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cpf: cpfDigitado, token }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(ERROS[dados?.erro] ?? ERROS.INDISPONIVEL);
        setPasso("identificacao");
        return;
      }

      await new Promise((r) => setTimeout(r, 1200));
      setProposta(dados as Proposta);
      setPasso("oferta");
    } catch {
      setErro(ERROS.INDISPONIVEL);
      setPasso("identificacao");
    }
  }

  /**
   * Aceitar leva ao checkout, que é quem cobra. A telemetria vai por
   * sendBeacon justamente porque ele sobrevive à navegação que vem logo em
   * seguida — um fetch normal seria cancelado no meio.
   */
  function aceitar() {
    setPasso("redirecionando");
    telemetria("oferta_aceita", { acordoId: proposta?.acordoId });
    setTimeout(() => {
      window.location.href = checkout.url;
    }, 600);
  }

  return (
    <div className="space-y-3 pb-2 sm:space-y-3.5">
      {abertura.slice(0, conversaAbertura.reveladas).map((fala) => (
        <div key={fala.chave}>{fala.render()}</div>
      ))}

      {conversaAbertura.digitando && <Digitando />}

      {conversaAbertura.concluida && passo === "identificacao" && (
        <>
          {erro && <Alerta>{erro}</Alerta>}
          <CampoCpf aoEnviar={consultar} carregando={false} valorInicial={cpf || cpfPrefixado} />
        </>
      )}

      {passo !== "identificacao" && cpf && <BolhaCliente>{ofuscarCpf(cpf)}</BolhaCliente>}

      {passo === "analisando" && (
        <>
          <Bolha>Perfeito, consultando sua proposta na base do programa…</Bolha>
          <Digitando />
        </>
      )}

      {mostrandoOferta && (
        <>
          {oferta.slice(0, conversaOferta.reveladas).map((fala) => (
            <div key={fala.chave}>{fala.render()}</div>
          ))}
          {conversaOferta.digitando && <Digitando />}
        </>
      )}

      {passo === "expirado" && (
        <>
          <Bolha>
            O tempo desta condição especial acabou. Posso verificar se ainda consigo reativar para
            você — é só pedir aqui embaixo.
          </Bolha>
          <button
            onClick={() => window.location.reload()}
            className="bolha-entra w-full rounded-2xl bg-gov-600 px-4 py-4 text-[15px] font-bold text-white shadow-lg transition active:scale-[0.99] hover:bg-gov-700 sm:text-base"
          >
            TENTAR REATIVAR MINHA PROPOSTA
          </button>
        </>
      )}

      {/* Vão que permite ao cartão da proposta subir: sendo o último elemento,
          sem isto a página não teria para onde rolar e ele encostaria no
          rodapé da tela. */}
      {propostaVisivel && passo !== "expirado" && <div className="h-[45dvh]" aria-hidden />}

      <div ref={fimRef} className="h-1" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Alerta({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="bolha-entra rounded-2xl bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700 ring-1 ring-red-200"
    >
      {children}
    </div>
  );
}

/**
 * Confere os dados sem publicá-los: o titular se reconhece de imediato, quem
 * estiver testando CPF de terceiro não coleta nada aproveitável.
 */
function CartaoIdentidade({ proposta, cpf }: { proposta: Proposta; cpf: string }) {
  const linhas: [string, string][] = [
    ["Titular", nomeProprio(proposta.nomeCompleto)],
    ["CPF", ofuscarCpf(cpf)],
    ["Nascimento", proposta.nascimentoMascarado],
    ["Nome da mãe", proposta.nomeMaeMascarado],
    ["Acordo", proposta.acordoId],
  ];

  return (
    <div className="bolha-entra rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="mb-3 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-sucesso-600">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Identidade confirmada
      </p>

      <dl className="space-y-2 text-[14px]">
        {linhas
          .filter(([, valor]) => valor)
          .map(([rotulo, valor]) => (
            <div
              key={rotulo}
              className="flex justify-between gap-3 border-b border-black/5 pb-2 last:border-0 last:pb-0"
            >
              <dt className="shrink-0 text-tinta/50">{rotulo}</dt>
              <dd className="text-right font-semibold break-words">{valor}</dd>
            </div>
          ))}
      </dl>

      <p className="mt-3 text-[11px] leading-snug text-tinta/45">
        Exibimos seus dados parcialmente por segurança. Se algum deles não for seu, não prossiga e
        fale com a gente.
      </p>
    </div>
  );
}

function CartaoProposta({
  ref,
  proposta,
  minutosValidade,
  redirecionando,
  aoAceitar,
  aoExpirar,
}: {
  ref: React.Ref<HTMLDivElement>;
  proposta: Proposta;
  minutosValidade: number;
  redirecionando: boolean;
  aoAceitar: () => void;
  aoExpirar: () => void;
}) {
  const temComparativo = proposta.valorOriginal > proposta.valorNovo;

  return (
    <div
      ref={ref}
      className="bolha-entra overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5"
    >
      <div className="border-b border-black/5 px-4 py-4 sm:px-5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-tinta/50">
          Nova proposta{temComparativo ? ` · ${proposta.percentualDesconto}% de desconto` : ""}
        </p>

        <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
          {temComparativo && (
            <>
              <div>
                <p className="text-[13px] text-tinta/50">Você devia</p>
                <p className="text-lg font-semibold text-tinta/40 line-through tabular-nums">
                  {brl(proposta.valorOriginal)}
                </p>
              </div>
              <svg
                className="mb-2 shrink-0 text-tinta/25"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
          <div>
            <p className="text-[13px] font-semibold text-sucesso-600">Paga agora</p>
            <p className="text-[2.1rem] font-extrabold leading-none text-sucesso-600 tabular-nums sm:text-4xl">
              {brl(proposta.valorNovo)}
            </p>
          </div>
        </div>

        <p className="mt-2.5 text-[13px] text-tinta/60">
          {temComparativo ? (
            <>
              Economia de <strong>{brl(proposta.economia)}</strong> · acordo anterior era{" "}
              <span className="line-through">{brl(proposta.valorAnterior)}</span>
            </>
          ) : (
            <>
              Seu acordo anterior era{" "}
              <span className="line-through">{brl(proposta.valorAnterior)}</span>
            </>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 bg-gov-50 px-4 py-3 sm:px-5">
        <p className="text-[13px] font-medium text-gov-900">Vale por {minutosValidade} minutos</p>
        <Contador expiraEm={proposta.expiraEm} aoExpirar={aoExpirar} />
      </div>

      {proposta.credores.length > 0 && (
        <p className="px-4 py-3 text-[12px] text-tinta/55 sm:px-5">
          Quita sua pendência com: {pontuar(proposta.credores.join(", "))}
        </p>
      )}

      {/* O botão fica DENTRO do cartão, colado ao valor: assim ele entra na
          tela junto com o desconto, em vez de ficar abaixo da dobra. */}
      <div className="border-t border-black/5 p-4 sm:px-5">
        <button
          onClick={aoAceitar}
          disabled={redirecionando}
          className={[
            "w-full rounded-2xl px-4 py-4 text-[15px] font-bold leading-tight text-white shadow-lg transition active:scale-[0.99] sm:text-base",
            redirecionando
              ? "bg-sucesso-600 opacity-85"
              : "botao-pulsa bg-sucesso-500 hover:bg-sucesso-600",
          ].join(" ")}
        >
          {redirecionando ? "Abrindo pagamento seguro…" : `ACEITAR E PAGAR ${brl(proposta.valorNovo)}`}
        </button>
        <p className="mt-2.5 text-center text-[12px] text-tinta/50">
          Você será levado ao ambiente de pagamento seguro.
        </p>
      </div>
    </div>
  );
}
