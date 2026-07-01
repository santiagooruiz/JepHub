export type TimelineItem = {
  id: string;
  accion: string;
  observaciones: string | null;
  fechaHora: Date;
  userName: string | null;
  auto: boolean;
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Sin actividad registrada.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l pl-4">
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 size-3 rounded-full bg-primary ring-4 ring-background" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {it.userName ?? "Sistema"}
            </span>
            <span className="text-xs text-muted-foreground">
              {it.fechaHora.toLocaleString("es-CO")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{it.accion}</span>
            {it.observaciones ? ` · ${it.observaciones}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
