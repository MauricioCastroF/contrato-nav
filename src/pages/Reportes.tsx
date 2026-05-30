import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Target, DollarSign, Activity } from "lucide-react";
import { getSecopYears, getSecopMonths, getSecopSeccionales, getSecopReporteBySeccional, SecopContrato } from "@/lib/secop-api";
import { useToast } from "@/hooks/use-toast";

const MONTH_NAMES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

export default function Reportes() {
  const { toast } = useToast();
  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<number[]>([]);
  const [seccionales, setSeccionales] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedSeccional, setSelectedSeccional] = useState<string>("");

  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<SecopContrato[]>([]);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  
  // Dashboard Metrics
  const totalContratos = reportData.length;
  const totalValor = reportData.reduce((acc, curr) => acc + (parseFloat(curr.valor_del_contrato || "0")), 0);
  const activos = reportData.filter(c => (c.estado_contrato || "").toLowerCase().includes("activo") || (c.estado_contrato || "").toLowerCase() === "en ejecución").length;

  useEffect(() => {
    getSecopYears().then(setYears).catch(() =>
      toast({ title: "Error", description: "No se pudieron cargar los años desde SECOP", variant: "destructive" })
    );
  }, []);

  useEffect(() => {
    setSelectedMonth("");
    setSelectedSeccional("");
    setMonths([]);
    setSeccionales([]);
    if (selectedYear) {
      setIsLoadingFilters(true);
      getSecopMonths(Number(selectedYear)).then(setMonths).finally(() => setIsLoadingFilters(false));
    }
  }, [selectedYear]);

  useEffect(() => {
    setSelectedSeccional("");
    setSeccionales([]);
    if (selectedYear && selectedMonth) {
      setIsLoadingFilters(true);
      getSecopSeccionales(Number(selectedYear), Number(selectedMonth))
        .then(setSeccionales)
        .finally(() => setIsLoadingFilters(false));
    }
  }, [selectedMonth]);

  const handleGenerateReport = async () => {
    if (!selectedYear || !selectedMonth || !selectedSeccional) return;
    setIsGenerating(true);
    setReportData([]);
    setProgress({ loaded: 0, total: 0 });
    try {
      const data = await getSecopReporteBySeccional(
        Number(selectedYear),
        Number(selectedMonth),
        selectedSeccional,
        (loaded, total) => setProgress({ loaded, total })
      );
      setReportData(data);
      if (data.length === 0) {
        toast({ title: "Sin resultados", description: "No hay contratos para los filtros seleccionados." });
      } else {
        toast({ title: "Reporte generado", description: `Se encontraron ${data.length} contratos.` });
      }
    } catch (err) {
      toast({ title: "Error", description: "Fallo al generar el reporte", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (val?: string) => {
    if (!val) return "$ 0";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };
  
  const calculateEjecucion = (valContrato?: string, valPagado?: string) => {
    const vc = parseFloat(valContrato || "0");
    const vp = parseFloat(valPagado || "0");
    if (vc === 0 || isNaN(vc) || isNaN(vp)) return "0%";
    return ((vp / vc) * 100).toFixed(1) + "%";
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
          <div className="flex-1 bg-card border border-border rounded-lg p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <Label className="text-xs font-medium text-foreground/70">Año</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <Label className="text-xs font-medium text-foreground/70">Mes</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!selectedYear || isLoadingFilters}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={String(m)}>{MONTH_NAMES[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs font-medium text-foreground/70">Seccional</Label>
              <Select value={selectedSeccional} onValueChange={setSelectedSeccional} disabled={!selectedMonth || isLoadingFilters}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleccionar seccional" />
                </SelectTrigger>
                <SelectContent>
                  {seccionales.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full md:w-auto"
              disabled={!selectedSeccional || isGenerating || isLoadingFilters}
              onClick={handleGenerateReport}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Generar Reporte
            </Button>
          </div>
        </div>

        {isGenerating && progress.total > 0 && (
          <div className="rounded-lg border border-border bg-card p-3 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Descargando en paralelo…</span>
              <span className="tabular-nums">{progress.loaded.toLocaleString('es-CO')} / {progress.total.toLocaleString('es-CO')}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {reportData.length > 0 && (
          <div className="flex flex-col gap-6 flex-1 overflow-hidden">
            <div className="grid gap-4 md:grid-cols-3 shrink-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contratos Totales</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalContratos}</div>
                  <p className="text-xs text-muted-foreground">En el mes y seccional seleccionada</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalValor.toString())}</div>
                  <p className="text-xs text-muted-foreground">Suma del valor de contratos</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contratos Activos</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activos}</div>
                  <p className="text-xs text-muted-foreground">En estado Activo/En ejecución</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-border shrink-0">
                <h3 className="font-semibold text-sm">Detalle de Contratos (25 Columnas)</h3>
              </div>
              <div className="flex-1 overflow-auto">
                <Table className="whitespace-nowrap">
                  <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur z-10 shadow-sm text-xs">
                    <TableRow>
                      <TableHead>N° CONTRATO</TableHead>
                      <TableHead>FECHA DE SUSCRIPCIÓN</TableHead>
                      <TableHead>FECHA DE INICIO</TableHead>
                      <TableHead>FECHA TERMINACIÓN</TableHead>
                      <TableHead>MODALIDAD DE CONTRATACIÓN</TableHead>
                      <TableHead>TIPO DE CONTRATO</TableHead>
                      <TableHead>RUBRO PRESUPUESTAL</TableHead>
                      <TableHead>CONTRATISTA</TableHead>
                      <TableHead>NIT/ID</TableHead>
                      <TableHead>OBJETO DEL CONTRATO</TableHead>
                      <TableHead>VALOR DEL CONTRATO</TableHead>
                      <TableHead>PAGOS A LA FECHA</TableHead>
                      <TableHead>% AVANCE FISICO</TableHead>
                      <TableHead>% EJECUCIÓN</TableHead>
                      <TableHead>ESTADO DEL CONTRATO</TableHead>
                      <TableHead>LINK SECOP</TableHead>
                      <TableHead>SITUACIONES CRÍTICAS?</TableHead>
                      <TableHead>SITUACIÓN</TableHead>
                      <TableHead>MODIFICACIONES?</TableHead>
                      <TableHead>FECHA MODIFICACIÓN</TableHead>
                      <TableHead>MODIFICACIÓN REALIZADA</TableHead>
                      <TableHead>ADICIONES?</TableHead>
                      <TableHead>FECHA ADICIÓN</TableHead>
                      <TableHead>VALOR ADICIÓN</TableHead>
                      <TableHead>OBSERVACIONES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {reportData.map((c, i) => (
                      <TableRow key={c.id_contrato + i}>
                        <TableCell className="font-medium text-primary">{c.id_contrato}</TableCell>
                        <TableCell>{c.fecha_de_firma?.split("T")[0]}</TableCell>
                        <TableCell>{c.fecha_de_inicio_del_contrato?.split("T")[0]}</TableCell>
                        <TableCell>{c.fecha_de_fin_del_contrato?.split("T")[0]}</TableCell>
                        <TableCell>{c.modalidad_de_contratacion}</TableCell>
                        <TableCell>{c.tipo_de_contrato}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={c.descripcion_del_proceso}>{c.descripcion_del_proceso}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={c.proveedor_adjudicado}>{c.proveedor_adjudicado}</TableCell>
                        <TableCell>{c.documento_proveedor}</TableCell>
                        <TableCell className="max-w-[300px] truncate" title={c.objeto_del_contrato}>{c.objeto_del_contrato}</TableCell>
                        <TableCell>{formatCurrency(c.valor_del_contrato)}</TableCell>
                        <TableCell>{formatCurrency(c.valor_pagado)}</TableCell>
                        <TableCell className="text-muted-foreground italic">0%</TableCell>
                        <TableCell>{calculateEjecucion(c.valor_del_contrato, c.valor_pagado)}</TableCell>
                        <TableCell>{c.estado_contrato}</TableCell>
                        <TableCell>
                          {c.urlproceso && c.urlproceso.url ? (
                            <a href={c.urlproceso.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              Ver SECOP
                            </a>
                          ) : "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground italic">NO</TableCell>
                        <TableCell className="text-muted-foreground italic">-</TableCell>
                        <TableCell className="text-muted-foreground italic">NO</TableCell>
                        <TableCell className="text-muted-foreground italic">-</TableCell>
                        <TableCell className="text-muted-foreground italic">-</TableCell>
                        <TableCell className="text-muted-foreground italic">NO</TableCell>
                        <TableCell className="text-muted-foreground italic">-</TableCell>
                        <TableCell className="text-muted-foreground italic">$ 0</TableCell>
                        <TableCell className="text-muted-foreground italic">-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
