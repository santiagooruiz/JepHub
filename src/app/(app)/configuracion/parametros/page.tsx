import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ParameterForm } from "@/features/config/parameter-form";
import { DeleteButton } from "@/features/config/delete-button";
import { deleteParameter } from "@/features/config/actions";

export const dynamic = "force-dynamic";

const COLOR_VARIANT: Record<string, BadgeProps["variant"]> = {
  green: "success",
  red: "destructive",
  amber: "default",
  muted: "muted",
};

type Option = { id?: string; value?: string; color?: string };

function ParamValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {(value as Option[]).map((o, i) => (
          <Badge key={i} variant={COLOR_VARIANT[o.color ?? ""] ?? "secondary"}>
            {o.value ?? JSON.stringify(o)}
          </Badge>
        ))}
      </div>
    );
  }
  return (
    <code className="text-xs text-muted-foreground">
      {JSON.stringify(value)}
    </code>
  );
}

export default async function ParametrosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requirePermission("view", "parameters");
  const canManage = user.ability.can("manage", "parameters");
  const sp = await searchParams;

  const parameters = await db.parameter.findMany({
    where: { companyId: user.companyId },
    orderBy: { key: "asc" },
  });
  const editingRow = sp.edit
    ? parameters.find((p) => p.id === sp.edit)
    : undefined;
  const editing = editingRow
    ? {
        id: editingRow.id,
        key: editingRow.key,
        value: JSON.stringify(editingRow.value, null, 2),
      }
    : undefined;

  return (
    <div>
      <Link
        href="/configuracion"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Configuración
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Parámetros</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Estados y enums del sistema (con icon/color). Editables como JSON.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        {canManage && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">
                {editing ? "Editar parámetro" : "Nuevo parámetro"}
              </CardTitle>
            </CardHeader>
            <div className="p-4 pt-0">
              <ParameterForm editing={editing} />
            </div>
          </Card>
        )}

        <Card className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Clave</th>
                <th className="px-3 py-2 font-medium">Valor</th>
                <th className="px-3 py-2 font-medium">Actualizado</th>
                {canManage && <th className="px-3 py-2 text-right font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {parameters.map((p) => (
                <tr key={p.id} className="border-b align-top last:border-0 hover:bg-muted/20">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-medium">
                    {p.key}
                  </td>
                  <td className="px-3 py-2">
                    <ParamValue value={p.value} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {p.updatedAt.toLocaleDateString("es-CO")}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/configuracion/parametros?edit=${p.id}`}
                          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <DeleteButton id={p.id} action={deleteParameter} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {parameters.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="px-3 py-8 text-center text-muted-foreground">
                    Sin parámetros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
