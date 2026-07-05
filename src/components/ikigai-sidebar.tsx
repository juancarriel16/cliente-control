import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/ikigai-logo.png.asset.json";
import { toast } from "sonner";

const items = [
  { to: "/clientes", label: "Clientes", icon: "fa-users" },
  { to: "/articulos", label: "Artículos", icon: "fa-box" },
  { to: "/reservas", label: "Reservas", icon: "fa-cart-shopping" },
  { to: "/pagos", label: "Pagos", icon: "fa-money-bill-wave" },
  { to: "/reportes", label: "Reportes", icon: "fa-chart-column" },
] as const;

export function IkigaiSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/auth" });
  }

  return (
    <aside className="w-[260px] bg-sidebar border-r border-sidebar-border p-6 flex flex-col shrink-0">
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
    </aside>
  );
}