import { useEffect, useState } from "react";
import { Search, Filter, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getSecopYears, getSecopMonths, getSecopSeccionales, getSecopContratos } from "@/lib/secop-api";
import { useToast } from "@/hooks/use-toast";

const MONTH_NAMES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

interface FilterSidebarProps {
  onLoadContrato: (idContrato: string) => void;
  loading?: boolean;
}

export function FilterSidebar({ onLoadContrato, loading }: FilterSidebarProps) {
  const { toast } = useToast();
  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<number[]>([]);
  const [seccionales, setSeccionales] = useState<string[]>([]);
  const [contratos, setContratos] = useState<{ id_contrato: string; proveedor_adjudicado: string }[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedSeccional, setSelectedSeccional] = useState<string>("");
  const [selectedContrato, setSelectedContrato] = useState<string>("");
  const [loadingFilters, setLoadingFilters] = useState(false);

  useEffect(() => {
    getSecopYears().then(setYears).catch(() =>
      toast({ title: "Error", description: "No se pudieron cargar los años desde SECOP", variant: "destructive" })
    );
  }, []);

  useEffect(() => {
    setSelectedMonth("");
    setSelectedSeccional("");
    setSelectedContrato("");
    setMonths([]);
    setSeccionales([]);
    setContratos([]);
    if (selectedYear) {
      setLoadingFilters(true);
      getSecopMonths(Number(selectedYear)).then(setMonths).finally(() => setLoadingFilters(false));
    }
  }, [selectedYear]);

  useEffect(() => {
    setSelectedSeccional("");
    setSelectedContrato("");
    setSeccionales([]);
    setContratos([]);
    if (selectedYear && selectedMonth) {
      setLoadingFilters(true);
      getSecopSeccionales(Number(selectedYear), Number(selectedMonth))
        .then(setSeccionales)
        .finally(() => setLoadingFilters(false));
    }
  }, [selectedMonth]);

  useEffect(() => {
    setSelectedContrato("");
    setContratos([]);
    if (selectedYear && selectedMonth && selectedSeccional) {
      setLoadingFilters(true);
      getSecopContratos(Number(selectedYear), Number(selectedMonth), selectedSeccional)
        .then(setContratos)
        .finally(() => setLoadingFilters(false));
    }
  }, [selectedSeccional]);

  const handleClear = () => {
    setSelectedYear("");
    setSelectedMonth("");
    setSelectedSeccional("");
    setSelectedContrato("");
  };

  const canLoad = !!selectedContrato;

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2 text-secondary">
          <Filter className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Filtros de Búsqueda</h2>
        </div>
        <p className="text-[10px] text-sidebar-foreground/50 mt-1">Datos en tiempo real desde SECOP II</p>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-sidebar-foreground/70">Año</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder="Seleccionar año" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-sidebar-foreground/70">Mes</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!selectedYear}>
            <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={String(m)}>{MONTH_NAMES[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-sidebar-foreground/70">Seccional</Label>
          <Select value={selectedSeccional} onValueChange={setSelectedSeccional} disabled={!selectedMonth}>
            <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder="Seleccionar seccional" />
            </SelectTrigger>
            <SelectContent>
              {seccionales.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-sidebar-foreground/70">ID Contrato</Label>
          <Select value={selectedContrato} onValueChange={setSelectedContrato} disabled={!selectedSeccional}>
            <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder="Seleccionar contrato" />
            </SelectTrigger>
            <SelectContent>
              {contratos.map((c) => (
                <SelectItem key={c.id_contrato} value={c.id_contrato}>
                  <span className="block truncate text-xs">{c.id_contrato}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="mt-2 w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
          disabled={!canLoad || loading}
          onClick={() => onLoadContrato(selectedContrato)}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Cargar Contrato
        </Button>
        <Button variant="ghost" size="sm" className="gap-1 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleClear}>
          <RotateCcw className="h-3 w-3" />
          Limpiar Filtros
        </Button>
      </div>

      {loadingFilters && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin text-secondary" />
        </div>
      )}
    </div>
  );
}
