import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TagForm } from "@/features/config/tag-form";
import { DeleteButton } from "@/features/config/delete-button";
import { deleteTag } from "@/features/config/actions";

export const dynamic = "force-dynamic";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requirePermission("view", "tags");
  const canManage = user.ability.can("manage", "tags");
  const sp = await searchParams;

  const tags = await db.tag.findMany({
    where: { companyId: user.companyId },
    orderBy: { name: "asc" },
  });
  const editing = sp.edit ? tags.find((t) => t.id === sp.edit) : undefined;

  return (
    <div>
      <Link
        href="/configuracion"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Configuración
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Tags</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {canManage && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">
                {editing ? "Editar tag" : "Registrar tag"}
              </CardTitle>
            </CardHeader>
            <div className="p-4 pt-0">
              <TagForm
                editing={editing ? { id: editing.id, name: editing.name } : undefined}
              />
            </div>
          </Card>
        )}

        <Card className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Registro</th>
                {canManage && <th className="px-3 py-2 text-right font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {tags.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {t.createdAt.toLocaleDateString("es-CO")}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/configuracion/tags?edit=${t.id}`}
                          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <DeleteButton id={t.id} action={deleteTag} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {tags.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 3 : 2} className="px-3 py-8 text-center text-muted-foreground">
                    Sin tags.
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
