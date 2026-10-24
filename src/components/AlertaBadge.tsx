export function AlertaBadge({ alerta }: { alerta: string | null }) {
  if (!alerta) return null;
  const vencido = alerta.startsWith("Prazo");
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${vencido ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}`}>
      {alerta}
    </span>
  );
}
