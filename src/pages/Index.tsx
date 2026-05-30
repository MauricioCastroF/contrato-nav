import { useState, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ContractDetail } from "@/components/ContractDetail";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getSecopContratoDetail } from "@/lib/secop-api";
import type { SecopContrato } from "@/lib/secop-api";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const { toast } = useToast();
  const [contrato, setContrato] = useState<SecopContrato | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLoadContrato = useCallback(async (idContrato: string) => {
    setIsLoading(true);
    setSidebarOpen(false);
    try {
      const data = await getSecopContratoDetail(idContrato);
      if (!data) {
        toast({ title: "No encontrado", description: "El contrato seleccionado no existe en SECOP.", variant: "destructive" });
        return;
      }
      setContrato(data);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el contrato desde SECOP.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSaved = useCallback(() => {
    // No need to reload from SECOP, tracking is local
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader onToggleSidebar={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-card lg:block overflow-y-auto">
          <FilterSidebar onLoadContrato={handleLoadContrato} loading={isLoading} />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <FilterSidebar onLoadContrato={handleLoadContrato} loading={isLoading} />
          </SheetContent>
        </Sheet>

        <main className="flex flex-1 flex-col overflow-y-auto">
          <ContractDetail contrato={contrato} isLoading={isLoading} onSaved={handleSaved} />
        </main>
      </div>
    </div>
  );
}
