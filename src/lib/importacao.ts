import type { Status } from './alunos';

export function statusDaPlanilha(cor: string | null): Status {
  switch (cor?.toUpperCase()) {
    case 'FF00B0F0': return 'Concluído';
    case 'FFFF0000': return 'Cancelado';
    case null:
    case undefined:
    case '00000000': return 'Ativo';
    default: throw new Error('Cor de status não reconhecida');
  }
}

export function mensalidadeDaPlanilha(valor: number | null): number | null {
  if (valor === null) return null;
  if (!Number.isFinite(valor) || valor < 0) throw new Error('Mensalidade inválida');
  return valor;
}

export function pagaAtualmente(status: Status): boolean {
  return status === 'Ativo';
}