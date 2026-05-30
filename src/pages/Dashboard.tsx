import { useEffect, useState, useCallback, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from "recharts";
import {
  Loader2, TrendingUp, DollarSign, BarChart2, Activity, RefreshCw,
  MapPin, Calendar, CheckCircle2, AlertTriangle, AlertCircle, ShieldCheck,
  ChevronRight, X, HelpCircle,
} from "lucide-react";
import {
  getSecopDashboardVigentes, getAllSecopSeccionales, aggregateBySeccional,
  aggregateByPeriodo, extractSeccional, calcularRiesgo,
  SecopContratoMin, SeccionalStats, PeriodoStats, RiesgoLevel,
} from "@/lib/secop-api";
import { useToast } from "@/hooks/use-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<number, string> = {
  1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
};

const RIESGO_CONFIG: Record<RiesgoLevel, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  alto:     { label: "Alto Riesgo",  color: "#ef4444", bg: "rgba(239,68,68,0.08)",    border: "#ef4444", icon: AlertCircle   },
  medio:    { label: "Riesgo Medio", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",   border: "#f59e0b", icon: AlertTriangle },
  normal:   { label: "Sin Riesgo",   color: "#10b981", bg: "rgba(16,185,129,0.06)",   border: "#10b981", icon: ShieldCheck   },
  sin_dato: { label: "Sin Dato",     color: "#94a3b8", bg: "rgba(148,163,184,0.06)",  border: "#94a3b8", icon: HelpCircle    },
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatCOP = (val: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1 }).format(val);

const formatCOPFull = (val: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);

const pct = (n: number) => `${n.toFixed(1)}%`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="relative h-2 w-full rounded-full bg-secondary overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top right, ${color}, transparent)` }} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="rounded-lg p-1.5" style={{ background: `${color}20` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function RiesgoBadge({ nivel }: { nivel: RiesgoLevel }) {
  const cfg = RIESGO_CONFIG[nivel];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}40` }}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xl text-xs space-y-1">
      <p className="font-semibold mb-1 max-w-[220px] truncate">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{pct(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Seccional Detail Sheet ───────────────────────────────────────────────────

type RiesgoFilter = "all" | RiesgoLevel;

interface SeccionalDetailSheetProps {
  seccional: string | null;
  contratos: SecopContratoMin[];
  onClose: () => void;
}

function SeccionalDetailSheet({ seccional, contratos, onClose }: SeccionalDetailSheetProps) {
  const [riesgoFilter, setRiesgoFilter] = useState<RiesgoFilter>("all");

  const contratosWithRiesgo = useMemo(() =>
    contratos
      .map((c) => ({ ...c, riesgo: calcularRiesgo(c) }))
      .sort((a, b) => {
        const ord: Record<RiesgoLevel, number> = { alto: 0, medio: 1, normal: 2, sin_dato: 3 };
        return ord[a.riesgo.nivel] - ord[b.riesgo.nivel];
      }),
    [contratos]
  );

  const counts = useMemo(() => ({
    all: contratosWithRiesgo.length,
    alto: contratosWithRiesgo.filter((c) => c.riesgo.nivel === "alto").length,
    medio: contratosWithRiesgo.filter((c) => c.riesgo.nivel === "medio").length,
    normal: contratosWithRiesgo.filter((c) => c.riesgo.nivel === "normal").length,
    sin_dato: contratosWithRiesgo.filter((c) => c.riesgo.nivel === "sin_dato").length,
  }), [contratosWithRiesgo]);

  const filtered = useMemo(() =>
    riesgoFilter === "all" ? contratosWithRiesgo : contratosWithRiesgo.filter((c) => c.riesgo.nivel === riesgoFilter),
    [contratosWithRiesgo, riesgoFilter]
  );

  const totalValor = contratos.reduce((s, c) => s + (parseFloat(c.valor_del_contrato || "0") || 0), 0);
  const avgFin = contratosWithRiesgo.length
    ? contratosWithRiesgo.reduce((s, c) => {
        const vc = parseFloat(c.valor_del_contrato || "0") || 0;
        const vp = parseFloat(c.valor_pagado || "0") || 0;
        return s + (vc > 0 ? (vp / vc) * 100 : 0);
      }, 0) / contratosWithRiesgo.length
    : 0;
  const avgFis = contratosWithRiesgo.length
    ? contratosWithRiesgo.reduce((s, c) => {
        const vc = parseFloat(c.valor_del_contrato || "0") || 0;
        const vf = parseFloat(c.valor_facturado || "0") || 0;
        return s + (vc > 0 ? (vf / vc) * 100 : 0);
      }, 0) / contratosWithRiesgo.length
    : 0;

  // Reset filter when seccional changes
  useEffect(() => { setRiesgoFilter("all"); }, [seccional]);

  const filterButtons: { key: RiesgoFilter; label: string; color: string }[] = [
    { key: "all",      label: `Todos (${counts.all})`,              color: "hsl(var(--foreground))" },
    { key: "alto",     label: `Alto Riesgo (${counts.alto})`,       color: "#ef4444" },
    { key: "medio",    label: `Riesgo Medio (${counts.medio})`,     color: "#f59e0b" },
    { key: "normal",   label: `Sin Riesgo (${counts.normal})`,      color: "#10b981" },
    { key: "sin_dato", label: `Sin Dato (${counts.sin_dato})`,      color: "#94a3b8" },
  ];

  return (
    <Sheet open={!!seccional} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[92vw] lg:max-w-[78vw] xl:max-w-[68vw] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Seccional {seccional}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contratos vigentes · Detalle y análisis de riesgo
              </p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 -mr-1 -mt-1" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Mini KPIs */}
          {contratos.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mt-3">
              {[
                { label: "Contratos", value: contratos.length.toString(), color: "#3b82f6" },
                { label: "Valor total", value: formatCOP(totalValor), color: "#10b981" },
                { label: "Av. Financiero", value: pct(avgFin), color: "#f59e0b" },
                { label: "Av. Físico",    value: pct(avgFis), color: "#8b5cf6" },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border border-border/50 bg-background p-2.5">
                  <p className="text-[10px] text-muted-foreground">{k.label}</p>
                  <p className="text-base font-bold mt-0.5" style={{ color: k.color }}>{k.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Risk filter buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {filterButtons.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setRiesgoFilter(key)}
                className="rounded-full px-3 py-1 text-[11px] font-medium border transition-all"
                style={{
                  background: riesgoFilter === key ? `${color}20` : "transparent",
                  borderColor: riesgoFilter === key ? color : "hsl(var(--border))",
                  color: riesgoFilter === key ? color : "hsl(var(--muted-foreground))",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Contract table */}
        <div className="flex-1 overflow-auto">
          {contratos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <BarChart2 className="h-8 w-8 opacity-30" />
              <p className="text-sm">Esta seccional no tiene contratos vigentes.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <p className="text-sm">No hay contratos con ese nivel de riesgo.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-secondary/90 backdrop-blur z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-8">#</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">RIESGO</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">ID CONTRATO</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">PROVEEDOR</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground max-w-[220px]">OBJETO</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">VALOR</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground min-w-[120px]">AV. FIN.</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground min-w-[120px]">AV. FÍS.</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground min-w-[120px]">T. TRANSCURRIDO</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">DÍAS REST.</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">FIN CONTRATO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((c, i) => {
                  const cfg = RIESGO_CONFIG[c.riesgo.nivel];
                  const vc = parseFloat(c.valor_del_contrato || "0") || 0;
                  const vp = parseFloat(c.valor_pagado || "0") || 0;
                  const vf = parseFloat(c.valor_facturado || "0") || 0;
                  const avFin = vc > 0 ? Math.min((vp / vc) * 100, 100) : 0;
                  const avFis = vc > 0 ? Math.min((vf / vc) * 100, 100) : 0;
                  const isRisk = c.riesgo.nivel === "alto" || c.riesgo.nivel === "medio";

                  return (
                    <tr
                      key={c.id_contrato + i}
                      className="transition-colors"
                      style={{
                        background: isRisk ? cfg.bg : undefined,
                        borderLeft: isRisk ? `3px solid ${cfg.border}` : "3px solid transparent",
                      }}
                    >
                      <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5"><RiesgoBadge nivel={c.riesgo.nivel} /></td>
                      <td className="px-3 py-2.5 font-medium text-primary whitespace-nowrap">{c.id_contrato}</td>
                      <td className="px-3 py-2.5 max-w-[160px] truncate" title={c.proveedor_adjudicado}>
                        {c.proveedor_adjudicado || "—"}
                      </td>
                      <td className="px-3 py-2.5 max-w-[220px] truncate text-muted-foreground" title={c.objeto_del_contrato}>
                        {c.objeto_del_contrato || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                        {vc > 0 ? formatCOP(vc) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="relative h-1.5 w-16 rounded-full bg-secondary overflow-hidden shrink-0">
                            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${avFin}%`, background: "#f59e0b" }} />
                          </div>
                          <span className="tabular-nums w-9 text-right font-medium">{pct(avFin)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="relative h-1.5 w-16 rounded-full bg-secondary overflow-hidden shrink-0">
                            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${avFis}%`, background: "#8b5cf6" }} />
                          </div>
                          <span className="tabular-nums w-9 text-right font-medium">{pct(avFis)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="relative h-1.5 w-16 rounded-full bg-secondary overflow-hidden shrink-0">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{ width: `${c.riesgo.tiempoTranscurrido}%`, background: "#64748b" }}
                            />
                          </div>
                          <span className="tabular-nums w-9 text-right text-muted-foreground">
                            {pct(c.riesgo.tiempoTranscurrido)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: c.riesgo.diasRestantes < 30 ? "#ef4444" : "inherit" }}>
                        {c.riesgo.diasRestantes > 0 ? c.riesgo.diasRestantes : "Vencido"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {c.fecha_de_fin_del_contrato?.split("T")[0] ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Risk legend footer */}
        <div className="px-6 py-3 border-t border-border bg-card/50 text-[10px] text-muted-foreground flex flex-wrap gap-4 shrink-0">
          <span className="font-semibold uppercase tracking-wide">Criterio de riesgo:</span>
          <span>🔴 <b>Alto</b>: tiempo transcurrido supera el avance en &gt;40 pp</span>
          <span>🟡 <b>Medio</b>: tiempo transcurrido supera el avance en 20-40 pp</span>
          <span>🟢 <b>Normal</b>: avance acorde al tiempo</span>
          <span>⚪ <b>Sin Dato</b>: valor del contrato no disponible</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { toast } = useToast();
  const [rows, setRows] = useState<SecopContratoMin[]>([]);
  const [allSeccionales, setAllSeccionales] = useState<string[]>([]);
  const [seccionalStats, setSeccionalStats] = useState<SeccionalStats[]>([]);
  const [periodoStats, setPeriodoStats] = useState<PeriodoStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedSeccional, setSelectedSeccional] = useState<string | null>(null);

  // Contracts for selected seccional detail
  const seccionalContratos = useMemo(() =>
    selectedSeccional
      ? rows.filter((r) => extractSeccional(r.nombre_entidad) === selectedSeccional)
      : [],
    [rows, selectedSeccional]
  );

  // Global KPIs
  const totalContratos = rows.length;
  const valorTotal = rows.reduce((s, r) => s + (parseFloat(r.valor_del_contrato || "0") || 0), 0);
  const statsWithContratos = seccionalStats.filter((s) => s.totalContratos > 0);
  const avgFinanciero = statsWithContratos.length
    ? statsWithContratos.reduce((s, r) => s + r.avanceFinancieroPromedio, 0) / statsWithContratos.length : 0;
  const avgFisico = statsWithContratos.length
    ? statsWithContratos.reduce((s, r) => s + r.avanceFisicoPromedio, 0) / statsWithContratos.length : 0;

  // Bar chart: only seccionales with contracts, ordered by count
  const barData = statsWithContratos.map((s) => ({
    name: s.seccional.length > 20 ? s.seccional.slice(0, 19) + "…" : s.seccional,
    fullName: s.seccional,
    "Av. Financiero": parseFloat(s.avanceFinancieroPromedio.toFixed(1)),
    "Av. Físico": parseFloat(s.avanceFisicoPromedio.toFixed(1)),
  }));

  const barHeight = Math.max(barData.length * 48, 200);

  // Line chart
  const lineData = periodoStats.map((p) => ({
    name: `${MONTH_NAMES[p.month]} ${p.year}`,
    Contratos: p.totalContratos,
    "Av. Financiero": parseFloat(p.avanceFinancieroPromedio.toFixed(1)),
    "Av. Físico": parseFloat(p.avanceFisicoPromedio.toFixed(1)),
  }));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setRows([]);
    setSeccionalStats([]);
    setPeriodoStats([]);
    setProgress({ loaded: 0, total: 0 });
    try {
      // Load all seccionales list and active contracts in parallel
      const [seccionalesData, rowsData] = await Promise.all([
        getAllSecopSeccionales(),
        getSecopDashboardVigentes((loaded, total) => setProgress({ loaded, total })),
      ]);
      setAllSeccionales(seccionalesData);
      setRows(rowsData);
      setSeccionalStats(aggregateBySeccional(rowsData, seccionalesData));
      setPeriodoStats(aggregateByPeriodo(rowsData));
      setLastUpdated(new Date());
      toast({ title: "Dashboard actualizado", description: `${rowsData.length} contratos vigentes cargados.` });
    } catch {
      toast({ title: "Error de conexión", description: "No se pudo conectar con SECOP II.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const progressPct = progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      <main className="flex-1 flex flex-col p-4 md:p-6 gap-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard de Avance Contractual</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Contratos vigentes · Rama Judicial Seccional ·{" "}
              {lastUpdated ? `Actualizado ${lastUpdated.toLocaleTimeString("es-CO")}` : "Cargando datos de SECOP II…"}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Cargando…" : "Actualizar"}
          </Button>
        </div>

        {/* Progress */}
        {isLoading && (
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Descargando contratos de SECOP II en paralelo…
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {progress.loaded.toLocaleString("es-CO")} / {progress.total.toLocaleString("es-CO")} registros
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={CheckCircle2} label="Contratos Vigentes"    value={totalContratos.toLocaleString("es-CO")} sub="Con fecha fin ≥ hoy"                color="#3b82f6" />
          <KpiCard icon={DollarSign}  label="Valor Total"            value={formatCOP(valorTotal)}                   sub={formatCOPFull(valorTotal)}           color="#10b981" />
          <KpiCard icon={TrendingUp}  label="Av. Financiero Prom."  value={pct(avgFinanciero)}                      sub="Pagado / Valor contrato"             color="#f59e0b" />
          <KpiCard icon={Activity}    label="Av. Físico Prom."       value={pct(avgFisico)}                          sub="Facturado / Valor contrato"          color="#8b5cf6" />
        </div>

        {rows.length > 0 && (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bar: all seccionales with contracts */}
              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    Avance por Seccional (contratos vigentes)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pr-4">
                  <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
                    <ResponsiveContainer width="100%" height={barHeight}>
                      <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip content={<BarTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
                        <Bar dataKey="Av. Financiero" fill="#f59e0b" radius={[0, 3, 3, 0]} barSize={7} />
                        <Bar dataKey="Av. Físico"     fill="#8b5cf6" radius={[0, 3, 3, 0]} barSize={7} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Line: by period */}
              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Avance Promedio por Período de Firma
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pr-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-45} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <Tooltip content={<BarTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 60 }} iconType="circle" iconSize={8} />
                      <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="Av. Financiero" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="Av. Físico"     stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Seccional table — ALL seccionales */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Resumen por Seccional
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({seccionalStats.length} seccionales · haz clic en una fila para ver detalle)
                    </span>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {statsWithContratos.length} con contratos vigentes · {seccionalStats.length - statsWithContratos.length} sin vigentes
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[540px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/90 backdrop-blur z-10">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">SECCIONAL</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">CONTRATOS</th>
                        <th className="px-4 py-2.5 font-semibold text-muted-foreground min-w-[160px]">AV. FINANCIERO</th>
                        <th className="px-4 py-2.5 font-semibold text-muted-foreground min-w-[160px]">AV. FÍSICO</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">VALOR TOTAL</th>
                        <th className="px-4 py-2.5 font-semibold text-muted-foreground">DETALLE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {seccionalStats.map((s) => {
                        const isEmpty = s.totalContratos === 0;
                        return (
                          <tr
                            key={s.seccional}
                            className={`transition-colors cursor-pointer ${isEmpty ? "opacity-45" : "hover:bg-muted/50"}`}
                            onClick={() => setSelectedSeccional(s.seccional)}
                          >
                            <td className="px-4 py-2.5 font-medium">{s.seccional}</td>
                            <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${isEmpty ? "text-muted-foreground" : ""}`}>
                              {s.totalContratos}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <ProgressBar value={s.avanceFinancieroPromedio} color="#f59e0b" />
                                <span className="tabular-nums w-10 text-right shrink-0 font-medium">
                                  {pct(s.avanceFinancieroPromedio)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <ProgressBar value={s.avanceFisicoPromedio} color="#8b5cf6" />
                                <span className="tabular-nums w-10 text-right shrink-0 font-medium">
                                  {pct(s.avanceFisicoPromedio)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                              {s.valorTotal > 0 ? formatCOP(s.valorTotal) : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center gap-1 text-primary hover:underline">
                                {isEmpty ? "Sin vigentes" : "Ver contratos"}
                                <ChevronRight className="h-3 w-3" />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Period table */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Resumen por Año y Mes (fecha de firma)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[360px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/90 backdrop-blur z-10">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">AÑO</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">MES</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">CONTRATOS</th>
                        <th className="px-4 py-2.5 font-semibold text-muted-foreground min-w-[160px]">AV. FINANCIERO PROM.</th>
                        <th className="px-4 py-2.5 font-semibold text-muted-foreground min-w-[160px]">AV. FÍSICO PROM.</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">VALOR TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {periodoStats.map((p) => (
                        <tr key={`${p.year}-${p.month}`} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-2.5 font-semibold tabular-nums">{p.year}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{MONTH_NAMES[p.month] ?? p.month}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{p.totalContratos}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <ProgressBar value={p.avanceFinancieroPromedio} color="#f59e0b" />
                              <span className="tabular-nums w-10 text-right shrink-0 font-medium">{pct(p.avanceFinancieroPromedio)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <ProgressBar value={p.avanceFisicoPromedio} color="#8b5cf6" />
                              <span className="tabular-nums w-10 text-right shrink-0 font-medium">{pct(p.avanceFisicoPromedio)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatCOP(p.valorTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Seccional Detail Sheet */}
      <SeccionalDetailSheet
        seccional={selectedSeccional}
        contratos={seccionalContratos}
        onClose={() => setSelectedSeccional(null)}
      />
    </div>
  );
}
