"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Reads the chart tokens from CSS (validated light/dark palettes in globals.css) and tracks theme changes. */
function useChartTheme() {
  const read = () => {
    if (typeof window === "undefined") return { c1: "#2b5797", c2: "#b07a22", grid: "#ece6db", muted: "#7a7f8a", ink: "#1b2232", surface: "#ffffff", line: "#e8e1d4" };
    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => s.getPropertyValue(n).trim();
    return { c1: v("--chart-1"), c2: v("--chart-2"), grid: v("--chart-grid"), muted: v("--muted"), ink: v("--ink"), surface: v("--surface"), line: v("--line") };
  };
  const [t, setT] = useState(read);
  useEffect(() => {
    const update = () => setT(read());
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);
  return t;
}

export type Series = { key: string; label: string };
type Row = Record<string, string | number>;

const fmtNum = (n: number, money?: boolean) => (money ? `KSh ${n.toLocaleString("en-KE")}` : n.toLocaleString("en-KE"));
const fmtAxis = (n: number, money?: boolean) => {
  const s = n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
  return money ? s : s;
};

function ChartTooltip({ active, payload, label, money }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
          {p.name}: <span className="font-semibold text-ink">{fmtNum(p.value, money)}</span>
        </p>
      ))}
    </div>
  );
}

function DataTable({ data, x, series, money }: { data: Row[]; x: string; series: Series[]; money?: boolean }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-muted hover:text-ink">View as table</summary>
      <div className="mt-2 max-h-60 overflow-auto">
        <table className="table text-xs">
          <thead>
            <tr>
              <th>{x}</th>
              {series.map((s) => (
                <th key={s.key}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}>
                <td>{r[x]}</td>
                {series.map((s) => (
                  <td key={s.key}>{fmtNum(Number(r[s.key] ?? 0), money)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Time series: area for one series, stacked bars for two (e.g. revenue by source). One y-axis only. */
export function TimeChart({ data, x = "label", series, money, height = 260, kind = "area" }: { data: Row[]; x?: string; series: Series[]; money?: boolean; height?: number; kind?: "area" | "bar" }) {
  const t = useChartTheme();
  const colors = [t.c1, t.c2];
  const axis = { stroke: t.muted, fontSize: 11, tickLine: false, axisLine: false } as const;
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {kind === "area" && series.length === 1 ? (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hvArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors[0]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={colors[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={t.grid} />
              <XAxis dataKey={x} {...axis} minTickGap={24} />
              <YAxis {...axis} width={44} tickFormatter={(v) => fmtAxis(v, money)} allowDecimals={false} />
              <Tooltip content={<ChartTooltip money={money} />} cursor={{ stroke: t.muted, strokeDasharray: "3 3" }} />
              <Area type="monotone" dataKey={series[0]!.key} name={series[0]!.label} stroke={colors[0]} strokeWidth={2} fill="url(#hvArea)" activeDot={{ r: 5, strokeWidth: 2, stroke: t.surface }} />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={t.grid} />
              <XAxis dataKey={x} {...axis} minTickGap={16} />
              <YAxis {...axis} width={44} tickFormatter={(v) => fmtAxis(v, money)} allowDecimals={false} />
              <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: t.grid, opacity: 0.5 }} />
              {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: t.ink }} />}
              {series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="a"
                  fill={colors[i]}
                  stroke={t.surface}
                  strokeWidth={series.length > 1 ? 1 : 0}
                  radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <DataTable data={data} x={x} series={series} money={money} />
    </div>
  );
}

/** Ranked horizontal bars (e.g. top locations). Single hue — magnitude, not identity. */
export function RankBars({ data, money }: { data: { label: string; value: number }[]; money?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} className="group">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-ink">{d.label}</span>
            <span className="text-ink-2">{fmtNum(d.value, money)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-alt" title={`${d.label}: ${fmtNum(d.value, money)}`}>
            <div className="h-full rounded-full transition-all group-hover:brightness-110" style={{ width: `${(d.value / max) * 100}%`, background: "var(--chart-1)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
