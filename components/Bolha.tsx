import type { ReactNode } from "react";
import { marca } from "@/lib/config";

export function Avatar({ tamanho = 34 }: { tamanho?: number }) {
  if (marca.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={marca.avatar}
        alt=""
        width={tamanho}
        height={tamanho}
        style={{ width: tamanho, height: tamanho }}
        className="shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }

  const iniciais = marca.atendente
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      aria-hidden
      style={{ width: tamanho, height: tamanho }}
      className="shrink-0 rounded-full bg-gov-600 text-white grid place-items-center text-[11px] font-bold tracking-tight ring-2 ring-white shadow-sm"
    >
      {iniciais}
    </div>
  );
}

export function Bolha({ children, destaque }: { children: ReactNode; destaque?: boolean }) {
  return (
    <div className="bolha-entra flex items-end gap-2">
      <Avatar />
      <div
        className={[
          "max-w-[min(560px,85%)] rounded-2xl rounded-bl-md px-4 py-3 text-[15px] leading-relaxed shadow-sm",
          destaque
            ? "bg-sucesso-50 text-sucesso-600 ring-1 ring-sucesso-500/25"
            : "bg-white text-tinta ring-1 ring-black/5",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

export function Digitando() {
  return (
    <div className="bolha-entra flex items-end gap-2" role="status" aria-label="Digitando">
      <Avatar />
      <div className="rounded-2xl rounded-bl-md bg-white px-4 py-4 shadow-sm ring-1 ring-black/5">
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="ponto-digitando block h-1.5 w-1.5 rounded-full bg-tinta/60"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

export function BolhaCliente({ children }: { children: ReactNode }) {
  return (
    <div className="bolha-entra flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gov-600 px-4 py-2.5 text-[15px] font-medium text-white shadow-sm">
        {children}
      </div>
    </div>
  );
}
