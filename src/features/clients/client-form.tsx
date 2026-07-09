"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { saveClient } from "./actions";

export type ClientOptions = {
  asesores: { codven: string; nombre: string }[];
  priceLists: { codprecio: string; nombre: string }[];
  sectors: { id: string; name: string; subsectors: { id: string; name: string }[] }[];
  channels: string[];
};

export type ClientEditing = {
  id: string;
  personType: "NATURAL" | "JURIDICA";
  estado: string;
  nombres: string | null;
  apellidos: string | null;
  nombreComercial: string | null;
  razonSocial: string | null;
  email: string | null;
  telefono: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  direccion: string | null;
  complementoDireccion: string | null;
  pais: string | null;
  ciudad: string | null;
  observaciones: string | null;
  codprecio: string | null;
  sectorId: string | null;
  subSectorId: string | null;
  canal: string | null;
  codven: string | null;
};

const ESTADOS = ["Prospecto", "Gestión Cotización", "Cliente", "Gestión Perdida"];
const TIPOS_DOC = ["CC", "NIT", "CE", "PAS"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ClientForm({
  options,
  editing,
  isAdmin = false,
  misCodvens = [],
}: {
  options: ClientOptions;
  editing?: ClientEditing;
  /** Los campos Asesor, Lista de precio y Canal solo se muestran al admin. */
  isAdmin?: boolean;
  /** Codvens del asesor logueado (con nombre). Si tiene >1, elige la sede al crear. */
  misCodvens?: { codven: string; nombre: string }[];
}) {
  const router = useRouter();
  const [f, setF] = React.useState<Omit<ClientEditing, "id">>({
    personType: editing?.personType ?? "JURIDICA",
    estado: editing?.estado ?? "Prospecto",
    nombres: editing?.nombres ?? "",
    apellidos: editing?.apellidos ?? "",
    nombreComercial: editing?.nombreComercial ?? "",
    razonSocial: editing?.razonSocial ?? "",
    email: editing?.email ?? "",
    telefono: editing?.telefono ?? "",
    tipoDocumento: editing?.tipoDocumento ?? "",
    numeroDocumento: editing?.numeroDocumento ?? "",
    direccion: editing?.direccion ?? "",
    complementoDireccion: editing?.complementoDireccion ?? "",
    pais: editing?.pais ?? "Colombia",
    ciudad: editing?.ciudad ?? "",
    observaciones: editing?.observaciones ?? "",
    codprecio: editing?.codprecio ?? "",
    sectorId: editing?.sectorId ?? "",
    subSectorId: editing?.subSectorId ?? "",
    canal: editing?.canal ?? "",
    codven: editing?.codven ?? "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function set<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  const subsectors =
    options.sectors.find((s) => s.id === f.sectorId)?.subsectors ?? [];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveClient({ id: editing?.id, ...f });
      if (res.ok) {
        toast.success(editing ? "Cliente modificado" : "Cliente registrado");
        router.push("/clientes");
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Cabecera */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Tipo">
            <select
              value={f.personType}
              onChange={(e) =>
                set("personType", e.target.value as "NATURAL" | "JURIDICA")
              }
              className={selectCls}
            >
              <option value="JURIDICA">Persona Jurídica</option>
              <option value="NATURAL">Persona Natural</option>
            </select>
          </Field>
          {isAdmin ? (
            <Field label="Asignar Asesor">
              <select
                value={f.codven ?? ""}
                onChange={(e) => set("codven", e.target.value)}
                className={selectCls}
              >
                <option value="">Seleccione</option>
                {options.asesores.map((a) => (
                  <option key={a.codven} value={a.codven}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </Field>
          ) : misCodvens.length > 1 ? (
            // Asesor con varias sedes: elige cuál aplica a este cliente.
            <Field label="Sede / Asesor">
              <select
                value={f.codven ?? ""}
                onChange={(e) => set("codven", e.target.value)}
                className={selectCls}
              >
                <option value="">Seleccione</option>
                {misCodvens.map((a) => (
                  <option key={a.codven} value={a.codven}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Estado">
            <select
              value={f.estado}
              onChange={(e) => set("estado", e.target.value)}
              className={selectCls}
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {/* Información básica (condicional) */}
      <Card className="p-4">
        <h3 className="mb-4 font-semibold">Información básica</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {f.personType === "NATURAL" ? (
            <>
              <Field label="Nombres">
                <Input value={f.nombres ?? ""} onChange={(e) => set("nombres", e.target.value)} />
              </Field>
              <Field label="Apellidos">
                <Input value={f.apellidos ?? ""} onChange={(e) => set("apellidos", e.target.value)} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Nombre Comercial">
                <Input value={f.nombreComercial ?? ""} onChange={(e) => set("nombreComercial", e.target.value)} />
              </Field>
              <Field label="Razón Social">
                <Input value={f.razonSocial ?? ""} onChange={(e) => set("razonSocial", e.target.value)} />
              </Field>
            </>
          )}
          <Field label="Email">
            <Input type="email" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={f.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} />
          </Field>
          <Field label="Tipo Documento">
            <select value={f.tipoDocumento ?? ""} onChange={(e) => set("tipoDocumento", e.target.value)} className={selectCls}>
              <option value="">Seleccione</option>
              {TIPOS_DOC.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label={editing ? "Número Documento" : "Número Documento (NIT) *"}>
            <Input
              required={!editing}
              value={f.numeroDocumento ?? ""}
              onChange={(e) => set("numeroDocumento", e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {/* Ubicación */}
      <Card className="p-4">
        <h3 className="mb-4 font-semibold">Datos de ubicación</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Dirección">
            <Input value={f.direccion ?? ""} onChange={(e) => set("direccion", e.target.value)} />
          </Field>
          <Field label="Complemento Dirección">
            <Input value={f.complementoDireccion ?? ""} onChange={(e) => set("complementoDireccion", e.target.value)} />
          </Field>
          <Field label="País">
            <Input value={f.pais ?? ""} onChange={(e) => set("pais", e.target.value)} />
          </Field>
          <Field label="Ciudad">
            <Input value={f.ciudad ?? ""} onChange={(e) => set("ciudad", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observaciones">
              <textarea
                value={f.observaciones ?? ""}
                onChange={(e) => set("observaciones", e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* Información adicional */}
      <Card className="p-4">
        <h3 className="mb-4 font-semibold">Información adicional</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <Field label="Lista de precio">
              <select value={f.codprecio ?? ""} onChange={(e) => set("codprecio", e.target.value)} className={selectCls}>
                <option value="">Seleccione</option>
                {options.priceLists.map((p) => (
                  <option key={p.codprecio} value={p.codprecio}>{p.nombre}</option>
                ))}
              </select>
            </Field>
          )}
          {isAdmin && (
            <Field label="Canal">
              <select value={f.canal ?? ""} onChange={(e) => set("canal", e.target.value)} className={selectCls}>
                <option value="">Seleccione</option>
                {options.channels.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Sector">
            <select
              value={f.sectorId ?? ""}
              onChange={(e) => {
                set("sectorId", e.target.value);
                set("subSectorId", "");
              }}
              className={selectCls}
            >
              <option value="">Seleccione</option>
              {options.sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="SubSector">
            <select
              value={f.subSectorId ?? ""}
              onChange={(e) => set("subSectorId", e.target.value)}
              className={selectCls}
              disabled={!f.sectorId}
            >
              <option value="">Seleccione</option>
              {subsectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Modificar" : "Registrar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/clientes")}>
          Volver
        </Button>
      </div>
    </form>
  );
}
