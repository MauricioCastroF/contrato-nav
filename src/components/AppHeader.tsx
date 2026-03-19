import { Bell, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <img src={logo} alt="Logo" className="h-9 w-9 rounded-full object-cover" />
          <div>
            <h1 className="text-sm font-bold leading-tight text-foreground">
              Sistema de Gestión Contractual
            </h1>
            <p className="text-xs text-muted-foreground">
              Direcciones Seccionales — Gestión Judicial
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          </Button>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              AR
            </div>
            <span className="text-sm font-medium text-foreground">Dr. Alejandro Rossi</span>
          </div>
        </div>
      </div>
    </header>
  );
}
