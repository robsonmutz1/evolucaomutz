export function acessoPermitido(rows: ReadonlyArray<{ role: string }> | null): boolean {
  return rows?.some((row) => row.role === 'owner') ?? false;
}