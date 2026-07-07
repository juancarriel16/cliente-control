import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/ikigai-logo.png.asset.json";
import { toast } from "sonner";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const items = [
  { to: "/clientes", label: "Clientes", icon: "fa-users" },
  { to: "/articulos", label: "Artículos", icon: "fa-box" },
  { to: "/reservas", label: "Reservas", icon: "fa-cart-shopping" },
  { to: "/pagos", label: "Pagos", icon: "fa-money-bill-wave" },
  { to: "/reportes", label: "Reportes", icon: "fa-chart-column" },
] as const;

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    onNavigate?.();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex justify-center mb-10">
        <img src={logoAsset.url} alt="IKIGAI TECH ERP" className="w-[170px] h-auto" />
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={
                "flex items-center gap-4 px-4 py-3 rounded-xl text-sm transition-colors " +
                (active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
              }
            >
              <i className={`fa-solid ${item.icon} w-4 text-center`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors"
      >
        <i className="fa-solid fa-arrow-right-from-bracket w-4 text-center" />
        <span>Cerrar sesión</span>
      </button>
    </div>
  );
}

export function IkigaiSidebar() {
  return (
    <aside className="hidden md:flex w-[260px] bg-sidebar border-r border-sidebar-border shrink-0">
      <NavContent />
    </aside>
  );
}

export function IkigaiMobileBar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 bg-sidebar border-b border-sidebar-border px-4 py-3">
      <img src={logoAsset.url} alt="IKIGAI TECH ERP" className="h-8 w-auto" />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Abrir menú"
            className="inline-flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-secondary"
          >
            <i className="fa-solid fa-bars text-xl" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0 bg-sidebar">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <NavContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}