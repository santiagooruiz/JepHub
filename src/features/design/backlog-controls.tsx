"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Library } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateDesignState,
  assignDesigner,
  updateEntregables,
  updateDesignPlanning,
  convertToSpecial,
} from "./actions";
import { BACKLOG_ESTADOS } from "./types";

const selectCls =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const TA =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DesignStateSelect({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <select
      value={estado}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        start(async () => {
          await updateDesignState(id, v);
          router.refresh();
        });
      }}
      className={selectCls}
    >
      {BACKLOG_ESTADOS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function AssignDesigner({
  id,
  designerId,
  users,
}: {
  id: string;
  designerId: string | null;
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <select
      value={designerId ?? ""}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        start(async () => {
          await assignDesigner(id, v);
          router.refresh();
        });
      }}
      className={selectCls}
    >
      <option value="">— Sin asignar —</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}

type Entregables = {
  despiece: string | null;
  armadoGeneral: string | null;
  planosTecnicos: string | null;
  nPedidoOfimatica: string | null;
};

export function EntregablesForm({ id, values }: { id: string; values: Entregables }) {
  const router = useRouter();
  const [f, setF] = React.useState({
    despiece: values.despiece ?? "",
    armadoGeneral: values.armadoGeneral ?? "",
    planosTecnicos: values.planosTecnicos ?? "",
    nPedidoOfimatica: values.nPedidoOfimatica ?? "",
  });
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateEntregables({ id, ...f });
      setMsg(res.ok ? "Guardado" : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <LabeledInput label="Despiece (URL)" value={f.despiece} onChange={(v) => set("despiece", v)} />
      <LabeledInput label="Armado general (URL)" value={f.armadoGeneral} onChange={(v) => set("armadoGeneral", v)} />
      <LabeledInput label="Planos técnicos (URL)" value={f.planosTecnicos} onChange={(v) => set("planosTecnicos", v)} />
      <LabeledInput label="N° pedido (Ofimática)" value={f.nPedidoOfimatica} onChange={(v) => set("nPedidoOfimatica", v)} />
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={pending} onClick={save}>
          Guardar entregables
        </Button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

const PLANNING: { key: string; label: string }[] = [
  { key: "descripcion", label: "Descripción" },
  { key: "datosEntrada", label: "Datos de entrada" },
  { key: "requisitosTecnicos", label: "Requisitos técnicos" },
  { key: "requisitosFuncionales", label: "Requisitos funcionales y desempeño" },
  { key: "posiblesFallos", label: "Posibles aspectos a fallar" },
  { key: "requisitosLegales", label: "Requisitos legales y reglamentarios" },
  { key: "disenosPrevios", label: "Información de diseños previos (referentes)" },
];

export function PlanningForm({
  id,
  values,
  canEdit,
}: {
  id: string;
  values: Record<string, string | null>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [f, setF] = React.useState<Record<string, string>>(
    Object.fromEntries(PLANNING.map((p) => [p.key, values[p.key] ?? ""]))
  );
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateDesignPlanning({ id, ...f });
      setMsg(res.ok ? "Guardado" : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {PLANNING.map((p) => (
        <label key={p.key} className="block space-y-1">
          <span className="text-sm font-medium">{p.label}</span>
          <textarea
            rows={2}
            className={TA}
            disabled={!canEdit}
            value={f[p.key]}
            onChange={(e) => setF((prev) => ({ ...prev, [p.key]: e.target.value }))}
          />
        </label>
      ))}
      {canEdit && (
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={pending} onClick={save}>
            Guardar planificación
          </Button>
          {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        </div>
      )}
    </div>
  );
}

export function ConvertToSpecialButton({
  id,
  disabled,
  specialId,
}: {
  id: string;
  disabled: boolean;
  specialId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  if (specialId) {
    return (
      <Button asChild variant="outline" className="w-full">
        <Link href={`/especiales/${specialId}`}>
          <Library className="size-4" /> Ver en Biblioteca Especiales
        </Link>
      </Button>
    );
  }

  return (
    <div>
      <Button
        className="w-full"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await convertToSpecial(id);
            if (res.ok) router.push(`/especiales/${res.id}`);
            else setError(res.error);
          })
        }
      >
        <Library className="size-4" /> Convertir a Especial
      </Button>
      {disabled && !error && (
        <p className="mt-1 text-xs text-muted-foreground">
          Disponible cuando el estado sea &quot;Finalizados&quot;.
        </p>
      )}
      {error && <p className="mt-1 text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  );
}
