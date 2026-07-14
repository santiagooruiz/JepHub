"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { saveClient, saveErpClient } from "./actions";

export type ClientOptions = {
  asesores: { codven: string; nombre: string }[];
  priceLists: { codprecio: string; nombre: string }[];
  sectors: { id: string; name: string; subsectors: { id: string; name: string }[] }[];
  channels: string[];
  /** Ciudades del ERP; si viene vacío, Ciudad se captura como texto libre. */
  ciudades: string[];
};

export type ClientEditing = {
  id: string;
  personType: "NATURAL" | "JURIDICA";
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

export function ClientForm({
  options,
  editing,
  isAdmin = false,
  misCodvens = [],
  erpNit,
}: {
  options: ClientOptions;
  editing?: ClientEditing;
  /** Los campos Asignar Asesor y Lista de precio solo se muestran al admin. */
  isAdmin?: boolean;
  /** Codvens del asesor logueado (con nombre). Si tiene >1, elige la sede al crear. */
  misCodvens?: { codven: string; nombre: string }[];
  /** Cliente del ERP: guarda vía saveErpClient (escribe en MTPROCLI + ancla local). */
  erpNit?: string;
}) {
  const router = useRouter();
  const [f, setF] = React.useState<Omit<ClientEditing, "id">>({
    personType: editing?.personType ?? "JURIDICA",
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
      const res = erpNit
        ? await saveErpClient({ nit: erpNit, ...f })
        : await saveClient({ id: editing?.id, ...f });
      if (res.ok) {
        toast.success(editing ? "Cliente modificado" : "Cliente registrado");
        router.push(erpNit ? `/clientes/${encodeURIComponent(erpNit)}` : "/clientes");
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
            <SearchableSelect
              value={f.personType}
              onChange={(v) => set("personType", v as "NATURAL" | "JURIDICA")}
              options={[
                { value: "JURIDICA", label: "Persona Jurídica" },
                { value: "NATURAL", label: "Persona Natural" },
              ]}
              clearable={false}
            />
          </Field>
          {isAdmin ? (
            <Field label="Asignar Asesor">
              <SearchableSelect
                value={f.codven ?? ""}
                onChange={(v) => set("codven", v)}
                options={options.asesores.map((a) => ({
                  value: a.codven,
                  label: a.nombre,
                }))}
              />
            </Field>
          ) : misCodvens.length > 1 && !editing ? (
            // Asesor con varias sedes: elige cuál aplica a este cliente al crear.
            <Field label="Sede / Asesor">
              <SearchableSelect
                value={f.codven ?? ""}
                onChange={(v) => set("codven", v)}
                options={misCodvens.map((a) => ({
                  value: a.codven,
                  label: a.nombre,
                }))}
              />
            </Field>
          ) : null}
          <Field label="Canal">
            <SearchableSelect
              value={f.canal ?? ""}
              onChange={(v) => set("canal", v)}
              options={options.channels}
            />
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
            <SearchableSelect
              value={f.tipoDocumento ?? ""}
              onChange={(v) => set("tipoDocumento", v)}
              options={TIPOS_DOC}
            />
          </Field>
          <Field label={editing ? "Número Documento" : "Número Documento (NIT) *"}>
            <Input
              required={!editing}
              // El NIT es la llave con el ERP (PK de MTPROCLI): no se cambia aquí.
              disabled={Boolean(erpNit)}
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
            {options.ciudades.length > 0 ? (
              // Un valor fuera del catálogo (texto libre heredado) se conserva:
              // SearchableSelect lo antepone como opción.
              <SearchableSelect
                value={f.ciudad ?? ""}
                onChange={(v) => set("ciudad", v)}
                options={options.ciudades}
              />
            ) : (
              <Input value={f.ciudad ?? ""} onChange={(e) => set("ciudad", e.target.value)} />
            )}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isAdmin && (
            <Field label="Lista de precio">
              <SearchableSelect
                value={f.codprecio ?? ""}
                onChange={(v) => set("codprecio", v)}
                options={options.priceLists.map((p) => ({
                  value: p.codprecio,
                  label: p.nombre,
                }))}
              />
            </Field>
          )}
          <Field label="Sector">
            <SearchableSelect
              value={f.sectorId ?? ""}
              onChange={(v) => {
                set("sectorId", v);
                set("subSectorId", "");
              }}
              options={options.sectors.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
          <Field label="SubSector">
            <SearchableSelect
              value={f.subSectorId ?? ""}
              onChange={(v) => set("subSectorId", v)}
              options={subsectors.map((s) => ({ value: s.id, label: s.name }))}
              disabled={!f.sectorId}
            />
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
