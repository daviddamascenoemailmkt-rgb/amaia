import { Avatar } from "@/components/Bolha";
import { Negociacao } from "@/components/Negociacao";
import { marca, oferta } from "@/lib/config";
import { mascararCpf } from "@/lib/cpf";
import { lerToken } from "@/lib/link";

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const payload = lerToken(t);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-tela sm:my-0 sm:shadow-xl sm:ring-1 sm:ring-black/5">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="h-1 bg-gov-600" />
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar tamanho={42} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight">{marca.atendente}</p>
            <p className="truncate text-[12px] text-tinta/55">{marca.cargo}</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-sucesso-50 px-2.5 py-1 text-[11px] font-semibold text-sucesso-600">
            <span className="h-1.5 w-1.5 rounded-full bg-sucesso-500" />
            online
          </span>
        </div>
      </header>

      <section className="flex-1 px-3 pt-4 sm:px-4 sm:pt-5">
        <Negociacao
          token={t ?? null}
          cpfPrefixado={payload ? mascararCpf(payload.c) : ""}
          minutosValidade={oferta.minutosValidade}
        />
      </section>

    </main>
  );
}
