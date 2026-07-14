"use client";

import * as React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { CHART_COLORS } from "./charts";
import type { CalendarEvent } from "./queries";

function colorFor(accion: string): string {
  let h = 0;
  for (let i = 0; i < accion.length; i++) h = (h * 31 + accion.charCodeAt(i)) >>> 0;
  return CHART_COLORS[h % CHART_COLORS.length];
}

// Variables --fc-* para integrar FullCalendar con el sistema de diseño.
const fcVars = {
  "--fc-border-color": "hsl(var(--border))",
  "--fc-today-bg-color": "hsl(var(--primary) / 0.08)",
  "--fc-neutral-bg-color": "hsl(var(--muted))",
  "--fc-page-bg-color": "transparent",
  "--fc-list-event-hover-bg-color": "hsl(var(--accent))",
} as React.CSSProperties;

export function ActivityCalendar({
  events,
  advisors,
  tipos,
}: {
  events: CalendarEvent[];
  advisors: { id: string; name: string }[];
  tipos: string[];
}) {
  const [asesorId, setAsesorId] = React.useState("");
  const [activeTipos, setActiveTipos] = React.useState<Set<string>>(new Set());

  const toggleTipo = (t: string) =>
    setActiveTipos((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const filtered = React.useMemo(
    () =>
      events
        .filter((e) => (asesorId ? e.userId === asesorId : true))
        .filter((e) => (activeTipos.size ? activeTipos.has(e.accion) : true))
        .map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          backgroundColor: colorFor(e.accion),
          borderColor: colorFor(e.accion),
        })),
    [events, asesorId, activeTipos]
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit p-4">
        <h3 className="mb-3 text-sm font-semibold">Selecciona un asesor</h3>
        <SearchableSelect
          value={asesorId}
          onChange={setAsesorId}
          options={advisors.map((a) => ({ value: a.id, label: a.name }))}
          placeholder="Todos los asesores"
          className="mb-4"
          aria-label="Filtrar por asesor"
        />

        <h3 className="mb-2 text-sm font-semibold">Opciones</h3>
        <div className="flex flex-wrap gap-1.5">
          {tipos.map((t) => {
            const active = activeTipos.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleTipo(t)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  active ? "text-white" : "text-muted-foreground hover:bg-accent"
                )}
                style={active ? { backgroundColor: colorFor(t), borderColor: colorFor(t) } : undefined}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: active ? "#fff" : colorFor(t) }}
                />
                {t}
              </button>
            );
          })}
        </div>
        {(asesorId || activeTipos.size > 0) && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => {
              setAsesorId("");
              setActiveTipos(new Set());
            }}
          >
            Limpiar filtros
          </Button>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{filtered.length} evento(s)</p>
      </Card>

      <Card className="p-3 text-sm" style={fcVars}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale="es"
          buttonText={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
          firstDay={1}
          height="auto"
          events={filtered}
          dayMaxEvents={3}
        />
      </Card>
    </div>
  );
}
