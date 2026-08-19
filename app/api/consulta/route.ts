import { NextResponse } from "next/server";
import {
  apenasDigitos,
  cpfValido,
  mascararNascimento,
  mascararNomeMae,
} from "@/lib/cpf";
import { oferta } from "@/lib/config";
import { lerToken } from "@/lib/link";
import { buscarAcordo, buscarCadastro } from "@/lib/upstream";
import { consumir, ipDaRequisicao } from "@/lib/limite";
import { registrar } from "@/lib/auditoria";

export async function POST(req: Request) {
  const ip = ipDaRequisicao(req);
  const { cpf: cpfBruto, token } = (await req.json().catch(() => ({}))) as {
    cpf?: string;
    token?: string;
  };

  const cpf = apenasDigitos(cpfBruto ?? "");
  if (!cpfValido(cpf)) {
    return NextResponse.json({ erro: "CPF_INVALIDO" }, { status: 400 });
  }

  const payload = lerToken(token);

  // Token enviado mas ilegível = expirado ou adulterado. Não pode cair no
  // caminho aberto, senão bastaria corromper um caractere para escapar do
  // vínculo com o lead.
  if (token && !payload) {
    await registrar({ tipo: "cpf_nao_encontrado", cpf, ip, detalhe: { motivo: "token_invalido" } });
    return NextResponse.json({ erro: "LINK_EXPIRADO" }, { status: 403 });
  }

  // Quem chegou pelo link do WhatsApp já vem vinculado: o CPF só confirma a
  // titularidade. Quem entrou direto no site passa pelo limite estreito, para
  // a rota não virar um consultor público de CPF.
  if (payload) {
    if (payload.c !== cpf) {
      await registrar({ tipo: "cpf_nao_encontrado", cpf, ip, detalhe: { motivo: "divergencia_token" } });
      return NextResponse.json({ erro: "CPF_NAO_CONFERE" }, { status: 403 });
    }
  } else {
    const limite = consumir(`consulta:${ip}`, 5, 10 * 60_000);
    if (!limite.permitido) {
      return NextResponse.json(
        { erro: "MUITAS_TENTATIVAS", esperarSegundos: limite.esperarSegundos },
        { status: 429 },
      );
    }
  }

  try {
    const acordo = await buscarAcordo(cpf);

    if (!acordo || !acordo.ativo) {
      await registrar({ tipo: "cpf_nao_encontrado", cpf, ip });
      return NextResponse.json({ erro: "SEM_ACORDO_ATIVO" }, { status: 404 });
    }

    const valorNovo = Math.max(acordo.valorNovo, oferta.valorMinimoAutorizado);
    const economia = acordo.valorOriginal - valorNovo;
    const percentualDesconto = acordo.valorOriginal
      ? Math.floor((economia / acordo.valorOriginal) * 100)
      : 0;

    // Dados de conferência: vão para a tela já mascarados. O valor em claro
    // não sai do servidor — nem na resposta, nem no log de auditoria.
    const cadastroTitular = await buscarCadastro(cpf);

    await registrar({ tipo: "cpf_consultado", cpf, ip, acordoId: acordo.acordoId });
    await registrar({ tipo: "oferta_exibida", cpf, ip, acordoId: acordo.acordoId, valor: valorNovo });

    return NextResponse.json({
      acordoId: acordo.acordoId,
      nomeCompleto: acordo.nomeCompleto,
      valorOriginal: acordo.valorOriginal,
      valorAnterior: acordo.valorAnterior,
      valorNovo,
      economia,
      percentualDesconto,
      credores: acordo.credores,
      sexo: acordo.sexo || cadastroTitular?.sexo || "",
      nomeMaeMascarado: mascararNomeMae(cadastroTitular?.nomeMae ?? ""),
      nascimentoMascarado: mascararNascimento(cadastroTitular?.nascimento ?? ""),
      expiraEm: new Date(Date.now() + oferta.minutosValidade * 60_000).toISOString(),
    });
  } catch (erro) {
    console.error("[consulta] falha ao buscar acordo", erro);
    return NextResponse.json({ erro: "INDISPONIVEL" }, { status: 503 });
  }
}
