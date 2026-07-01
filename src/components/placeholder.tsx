import { Construction } from "lucide-react";

export function Placeholder({
  title,
  sprint,
}: {
  title: string;
  sprint: string;
}) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
        <Construction className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Módulo en construcción · {sprint}
        </p>
      </div>
    </div>
  );
}
