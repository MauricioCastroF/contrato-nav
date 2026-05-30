import { Bell, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-primary shadow-md">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        
        {/* Left Side: Logo and Title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-primary-foreground hover:bg-sidebar-accent"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <img src={logo} alt="Consejo Superior de la Judicatura" className="h-10 w-auto rounded object-contain bg-primary-foreground p-0.5" />
          <div className="flex flex-col">
            <h1 className="text-sm font-bold leading-tight text-primary-foreground">
              Sistema de Gestión Contractual
            </h1>
            <p className="text-[10px] text-primary-foreground/70 sm:block">
              Dirección Seccional de Administración Judicial
            </p>
          </div>
        </div>

        {/* Center Navigation */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-2 mx-4">
          <NavLink 
            to="/" 
            className={({isActive}) => `px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary-foreground/20 text-white shadow-sm' : 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-white'}`}
          >
            Inicio
          </NavLink>
          <NavLink 
            to="/reportes" 
            className={({isActive}) => `px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary-foreground/20 text-white shadow-sm' : 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-white'}`}
          >
            Reportes
          </NavLink>
          <NavLink 
            to="/dashboard" 
            className={({isActive}) => `px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary-foreground/20 text-white shadow-sm' : 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-white'}`}
          >
            Dashboard
          </NavLink>
        </nav>

        {/* Right Side: Profile and Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Fallback Menu */}
          <div className="flex md:hidden gap-3 mr-2">
            <NavLink to="/" className={({isActive}) => `text-xs font-semibold ${isActive ? 'text-white' : 'text-primary-foreground/70'}`}>Inicio</NavLink>
            <NavLink to="/reportes" className={({isActive}) => `text-xs font-semibold ${isActive ? 'text-white' : 'text-primary-foreground/70'}`}>Reportes</NavLink>
            <NavLink to="/dashboard" className={({isActive}) => `text-xs font-semibold ${isActive ? 'text-white' : 'text-primary-foreground/70'}`}>Dashboard</NavLink>
          </div>

          <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-sidebar-accent">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-secondary" />
          </Button>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              AR
            </div>
            <span className="text-sm font-medium text-primary-foreground">Dr. Alejandro Rossi</span>
          </div>
        </div>

      </div>
    </header>
  );
}
