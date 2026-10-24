import type { Aluno } from "./alunos";

// Dados FICTÍCIOS para a primeira etapa. Nenhum dado real.
const nomes = [
  "Ana Beatriz Souza", "Bruno Henrique Lima", "Carla Mendes", "Diego Fernandes", "Eduarda Rocha",
  "Felipe Araújo", "Gabriela Nunes", "Heitor Campos", "Isabela Martins", "João Pedro Alves",
  "Larissa Prado", "Mateus Ribeiro", "Natália Costa", "Otávio Barros", "Paula Teixeira",
  "Rafael Moreira", "Sofia Cardoso", "Thiago Pires", "Valentina Dias", "Yuri Santana",
];
const cursos = ["Informática Básica", "Inglês", "Administração", "Design Gráfico", "Robótica"];
const bairros = ["Centro", "Vila Nova", "Jardim América", "São José", "Boa Vista"];
const horarios = ["08:00–10:00", "10:00–12:00", "14:00–16:00", "19:00–21:00"];

export const alunosIniciais: Aluno[] = nomes.map((nome, i) => {
  const ano = i < 8 ? 2025 : 2026;
  const mes = ((i * 3) % 12) + 1;
  const mm = String(mes).padStart(2, "0");
  const status = i % 9 === 4 ? "Cancelado" : i % 7 === 2 ? "Concluído" : "Ativo";
  return {
    id: `a${i + 1}`,
    codigo: `EM${String(1001 + i)}`,
    nome,
    responsavel: i % 3 === 0 ? `Responsável de ${nome.split(" ")[0]}` : "—",
    bairro: bairros[i % bairros.length],
    cidade: "Cidade Exemplo",
    dataMatricula: `${ano}-${mm}-${String(5 + (i % 20)).padStart(2, "0")}`,
    curso: cursos[i % cursos.length],
    turma: `T${(i % 4) + 1}`,
    horario: horarios[i % horarios.length],
    status,
    dataStatus: status !== "Ativo" ? `2026-${String(((i % 9) + 1)).padStart(2, "0")}-15` : undefined,
    valorMensal: [180, 220, 250, 300, 350][i % 5],
    descontoTipo: i % 2 ? "valor" : "percentual",
    desconto: i % 2 ? 30 : 10,
    diaLimiteDesconto: 5,
    diaVencimento: [5, 10, 15, 20][i % 4],
    qtdMensalidades: [6, 10, 12, 18][i % 4],
    primeiraCobranca: `${ano}-${mm}`,
  };
});

/** Lançamentos fictícios de faturamento e despesas por mês (YYYY-MM). */
export const financeiroMensal: Record<string, { faturamento: number; despesas: number }> = (() => {
  const r: Record<string, { faturamento: number; despesas: number }> = {};
  for (let y = 2025; y <= 2026; y++)
    for (let m = 1; m <= 12; m++) {
      const k = `${y}-${String(m).padStart(2, "0")}`;
      r[k] = { faturamento: 8200 + ((m * 731 + y) % 3100), despesas: 4300 + ((m * 517) % 1900) };
    }
  return r;
})();
