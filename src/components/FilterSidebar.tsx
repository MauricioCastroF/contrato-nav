import { useEffect, useState } from "react";
import { Search, Filter, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getDistinctYears, getDistinctMonths, getDistinctSeccionales, getContratos } from "@/lib/supabase-queries";
import { useToast } from "@/hooks/use-toast";

const MONTH_NAMES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

interface FilterSidebarProps {
  onLoadContrato: (nContrato: string) => void;
  loading?: boolean;
}

export function FilterSidebar({ onLoadContrato, loading }: FilterSidebarProps) {
  const { toast } = useToast();
  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<number[]>([]);
  const [seccionales, setSeccionales] = useState<string[]>([]);
  const [contratos, setContratos] = useState<{ n_contrato: string; contratista: string | null }[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedSeccional, setSelectedSeccional] = useState<string>("");
  const [selectedContrato, setSelectedContrato] = useState<string>("");
  const [loadingFilters, setLoadingFilters] = useState(false);

  useEffect(() => {
    getDistinctYears().then(setYears).catch(() =>
      toast({ title: "Error", description: "No se pudieron cargar los años", variant: "destructive" })
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
      getDistinctMonths(Number(selectedYear)).then(setMonths).finally(() => setLoadingFilters(false));
    }
  }, [selectedYear]);

  useEffect(() => {
    setSelectedSeccional("");
    setSelectedContrato("");
    setSeccionales([]);
    setContratos([]);
    if (selectedYear && selectedMonth) {
      setLoadingFilters(true);
      getDistinctSeccionales(Number(selectedYear), Number(selectedMonth))
        .then(setSeccionales)
        .finally(() => setLoadingFilters(false));
    }
  }, [selectedMonth]);

  useEffect(() => {
    setSelectedContrato("");
    setContratos([]);
    if (selectedYear && selectedMonth && selectedSeccional) {
      setLoadingFilters(true);
      getContratos(Number(selectedYear), Number(selectedMonth), selectedSeccional)
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
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2 text-primary">
          <Filter className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Filtros de Búsqueda</h2>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Año</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
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
          <Label className="text-xs font-medium text-muted-foreground">Mes</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!selectedYear}>
            <SelectTrigger>
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
          <Label className="text-xs font-medium text-muted-foreground">Seccional</Label>
          <Select value={selectedSeccional} onValueChange={setSelectedSeccional} disabled={!selectedMonth}>
            <SelectTrigger>
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
          <Label className="text-xs font-medium text-muted-foreground">ID Contrato</Label>
          <Select value={selectedContrato} onValueChange={setSelectedContrato} disabled={!selectedSeccional}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar contrato" />
            </SelectTrigger>
            <SelectContent>
              {contratos.map((c) => (
                <SelectItem key={c.n_contrato} value={c.n_contrato}>
                  <span className="block truncate text-xs">{c.n_contrato}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="mt-2 w-full gap-2"
          disabled={!canLoad || loading}
          onClick={() => onLoadContrato(selectedContrato)}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Cargar Contrato
        </Button>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={handleClear}>
          <RotateCcw className="h-3 w-3" />
          Limpiar Filtros
        </Button>
      </div>

      {loadingFilters && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
