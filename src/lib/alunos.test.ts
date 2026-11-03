import { describe, expect, it } from "vitest";
import { alertaConclusao, ultimaMensalidade, valorComDesconto } from "./alunos";

describe("regras do contrato", () => {
  it("calcula desconto percentual", () => {
    expect(valorComDesconto({ valorMensal: 200, descontoTipo: "percentual", desconto: 10 })).toBe(180);
  });
  it("calcula desconto em valor", () => {
    expect(valorComDesconto({ valorMensal: 200, descontoTipo: "valor", desconto: 35 })).toBe(165);
  });
  it("prevê última mensalidade atravessando o ano", () => {
    expect(ultimaMensalidade("2026-03", 12)).toBe("2027-02");
  });
  it("mostra Verificar conclusão no mês da última mensalidade", () => {
    const a = { status: "Ativo" as const, primeiraCobranca: "2026-01", qtdMensalidades: 10 };
    expect(alertaConclusao(a, "2026-10")).toBe("Verificar conclusão");
  });
  it("mostra Prazo vencido depois do mês, se ainda ativo", () => {
    const a = { status: "Ativo" as const, primeiraCobranca: "2026-01", qtdMensalidades: 10 };
    expect(alertaConclusao(a, "2026-11")).toBe("Prazo de conclusão vencido");
  });
  it("não alerta alunos concluídos", () => {
    const a = { status: "Concluído" as const, primeiraCobranca: "2026-01", qtdMensalidades: 10 };
    expect(alertaConclusao(a, "2026-11")).toBeNull();
  });
});

import { proximoCodigo as pc } from "./alunos";
import { test as t2, expect as e2 } from "vitest";
t2("próximo código é o maior + 1", () => { e2(pc(["701167", "700247", "EM2166"])).toBe("701168"); });
