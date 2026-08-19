"use client";

import { useState } from "react";
import { apenasDigitos, cpfValido, mascararCpf } from "@/lib/cpf";

export function CampoCpf({
  aoEnviar,
  carregando,
  valorInicial = "",
}: {
  aoEnviar: (cpf: string) => void;
  carregando: boolean;
  valorInicial?: string;
}) {
  const [valor, setValor] = useState(mascararCpf(valorInicial));
  const [tocado, setTocado] = useState(false);

  const digitos = apenasDigitos(valor);
  const completo = digitos.length === 11;
  const valido = completo && cpfValido(digitos);
  const mostrarErro = tocado && completo && !valido;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTocado(true);
        if (valido && !carregando) aoEnviar(digitos);
      }}
      className="bolha-entra rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
    >
      <label htmlFor="cpf" className="block text-sm font-semibold text-tinta">
        Digite seu CPF para confirmar sua identidade
      </label>

      <input
        id="cpf"
        name="cpf"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="go"
        placeholder="000.000.000-00"
        value={valor}
        onChange={(e) => setValor(mascararCpf(e.target.value))}
        onBlur={() => setTocado(true)}
        aria-invalid={mostrarErro}
        aria-describedby={mostrarErro ? "cpf-erro" : "cpf-ajuda"}
        className={[
          "mt-2.5 w-full rounded-xl border-2 bg-white px-4 py-3.5 text-center font-mono text-xl tracking-wider outline-none transition",
          mostrarErro
            ? "border-red-400 focus:border-red-500"
            : "border-black/10 focus:border-gov-500",
        ].join(" ")}
      />

      {mostrarErro ? (
        <p id="cpf-erro" className="mt-2 text-sm font-medium text-red-600">
          Esse CPF não é válido. Confira os números e tente de novo.
        </p>
      ) : (
        <p id="cpf-ajuda" className="mt-2 text-xs text-tinta/55">
          Usamos seu CPF apenas para localizar a proposta enviada a você.
        </p>
      )}

      <button
        type="submit"
        disabled={!valido || carregando}
        className="mt-3 w-full rounded-xl bg-gov-600 px-4 py-3.5 text-[15px] font-bold text-white shadow-sm transition hover:bg-gov-700 disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/40"
      >
        {carregando ? "Consultando…" : "CONSULTAR MINHA PROPOSTA"}
      </button>
    </form>
  );
}
