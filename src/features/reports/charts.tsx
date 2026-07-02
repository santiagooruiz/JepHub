"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Treemap,
} from "recharts";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/features/quotes/types";

export const CHART_COLORS = [
  "hsl(189 82% 40%)", // teal (primary)
  "hsl(243 75% 59%)", // indigo
  "hsl(32 95% 44%)", // amber
  "hsl(160 84% 39%)", // emerald
  "hsl(347 77% 50%)", // rose
  "hsl(271 76% 53%)", // violet
  "hsl(199 89% 48%)", // sky
  "hsl(24 95% 53%)", // orange
];

const axisStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const gridStroke = "hsl(var(--border))";

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <div className="px-2 pb-3">{children}</div>
    </Card>
  );
}

type Datum = { name: string; value: number };

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

export function MoneyPie({ data, height = 240 }: { data: Datum[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          label={(p: { name?: string; value?: number }) =>
            total ? `${Math.round(((p.value ?? 0) / total) * 100)}%` : ""
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="hsl(var(--card))" />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CountPie({ data, height = 240 }: { data: Datum[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          outerRadius="80%"
          label={(p: { value?: number }) =>
            total ? `${Math.round(((p.value ?? 0) / total) * 100)}%` : ""
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="hsl(var(--card))" />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MoneyBar({
  data,
  height = 260,
  horizontal = false,
}: {
  data: Datum[];
  height?: number;
  horizontal?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 8 : 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={!horizontal} horizontal={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={axisStyle} tickFormatter={compact} />
            <YAxis type="category" dataKey="name" tick={axisStyle} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={axisStyle} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={axisStyle} tickFormatter={compact} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(Number(v))} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={CHART_COLORS[0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MultiLine({
  data,
  keys,
  height = 280,
}: {
  data: Record<string, number | string>[];
  keys: string[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="semana" tick={axisStyle} />
        <YAxis tick={axisStyle} tickFormatter={compact} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

type TreeContentProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
};

function TreeCell({ x = 0, y = 0, width = 0, height = 0, index = 0, name }: TreeContentProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={CHART_COLORS[index % CHART_COLORS.length]}
        stroke="hsl(var(--card))"
      />
      {width > 60 && height > 24 && (
        <text x={x + 6} y={y + 18} fontSize={11} fill="#fff">
          {name}
        </text>
      )}
    </g>
  );
}

export function EstadoTreemap({ data, height = 260 }: { data: Datum[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap data={data} dataKey="value" nameKey="name" content={<TreeCell />} isAnimationActive={false}>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(Number(v))} />
      </Treemap>
    </ResponsiveContainer>
  );
}
