import { useState, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ContractDetail } from "@/components/ContractDetail";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getContratoDetail } from "@/lib/supabase-queries";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Contrato = Database["public"]["Tables"]["contratos_seccionales"]["Row"];

export default function Index() {
  const { toast } = useToast();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLoadContrato = useCallback(async (nContrato: string) => {
    setIsLoading(true);
    setSidebarOpen(false);
    try {
      const data = await getContratoDetail(nContrato);
      if (!data) {
        toast({ title: "No encontrado", description: "El contrato seleccionado no existe.", variant: "destructive" });
        return;
      }
      setContrato(data);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el contrato.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSaved = useCallback(() => {
    if (contrato) handleLoadContrato(contrato.n_contrato);
  }, [contrato, handleLoadContrato]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader onToggleSidebar={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-border bg-card lg:block overflow-y-auto">
          <FilterSidebar onLoadContrato={handleLoadContrato} loading={isLoading} />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <FilterSidebar onLoadContrato={handleLoadContrato} loading={isLoading} />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <ContractDetail contrato={contrato} isLoading={isLoading} onSaved={handleSaved} />
        </main>
      </div>
    </div>
  );
}
