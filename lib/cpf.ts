/** Utilitários de CPF: normalização, máscara e validação de dígitos verificadores. */

export function apenasDigitos(valor: string): string {
  return (valor || "").replace(/\D+/g, "");
}

export function mascararCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Formata para exibição pública ocultando o miolo: 173.***.**7-28 */
export function ofuscarCpf(valor: string): string {
  const d = apenasDigitos(valor);
  if (d.length !== 11) return "";
  return `${d.slice(0, 3)}.***.**${d.slice(8, 9)}-${d.slice(9)}`;
}

export function cpfValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const digito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(d.slice(0, 9), 10) === Number(d[9]) && digito(d.slice(0, 10), 11) === Number(d[10]);
}

/** Primeiro nome + último sobrenome, capitalizados. Bases de cobrança vêm em CAIXA ALTA. */
export function nomeCurto(nomeCompleto: string): string {
  const partes = (nomeCompleto || "")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2 || !/^(de|da|do|dos|das|e)$/i.test(p));
  if (partes.length === 0) return "";
  const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return capitalizar(partes[0]);
}

export function nomeProprio(nomeCompleto: string): string {
  return (nomeCompleto || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (/^(de|da|do|dos|das|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/**
 * "MARIA APARECIDA SILVA DE ALMEIDA" -> "Maria A. S. de A."
 *
 * Mostra o bastante para o titular reconhecer a própria mãe num relance — que é
 * o que gera a confiança de "eles realmente têm meu cadastro" — sem devolver o
 * nome inteiro, que é credencial de identidade em banco e consignado.
 */
export function mascararNomeMae(nome: string): string {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";

  const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  return partes
    .map((parte, i) => {
      if (i === 0) return capitalizar(parte);
      if (/^(de|da|do|dos|das|e)$/i.test(parte)) return parte.toLowerCase();
      return `${parte.charAt(0).toUpperCase()}.`;
    })
    .join(" ");
}

/** "1998-03-15" -> "15/03/••••". Dia e mês bastam para o titular se reconhecer. */
export function mascararNascimento(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || "").trim());
  return m ? `${m[3]}/${m[2]}/••••` : "";
}

/** Flexiona por sexo do cadastro; neutro quando o campo vem vazio. */
export function flexionar(sexo: string, masculino: string, feminino: string, neutro: string) {
  const s = (sexo || "").trim().toUpperCase();
  if (s === "M") return masculino;
  if (s === "F") return feminino;
  return neutro;
}
