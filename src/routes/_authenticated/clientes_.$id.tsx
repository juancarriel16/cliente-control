import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { money, shortDate, estadoLabel, estadoBadgeClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  component: FichaCliente,
});

function FichaCliente() {
  const { id } = Route.useParams();

  const { data: cliente, isLoading: loadingCliente, error: errorCliente } = useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ["cliente-reservas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("*")
        .eq("cliente_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reservaIds = reservas.map((r: any) => r.id);
  const { data: pagos = [] } = useQuery({
    queryKey: ["cliente-pagos", id, reservaIds.join(",")],
    queryFn: async () => {
      if (reservaIds.length === 0) return [];
      const { data, error } = await supabase
        .from("pagos")
        .select("*")
        .in("reserva_id", reservaIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: reservaIds.length > 0,
  });

  const totalReservas = reservas.length;
  const totalComprado = reservas.reduce((s: number, r: any) => s + Number(r.precio), 0);
  const totalAbonado = pagos.reduce((s: number, p: any) => s + Number(p.monto), 0);
  const pendiente = Math.max(0, totalComprado - totalAbonado);

  if (loadingCliente) {
    return <p className="text-muted-foreground">Cargando cliente…</p>;
  }
  if (errorCliente) {
    return <p className="text-destructive">Error: {(errorCliente as any).message}</p>;
  }
  if (!cliente) {
    return (
      <div>
        <Button variant="outline" asChild className="mb-6">
          <Link to="/clientes">← Volver a clientes</Link>
        </Button>
        <p className="text-muted-foreground">Cliente no encontrado.</p>
      </div>
    );
  }

  return (
    <div>
      <Button variant="outline" asChild className="mb-6">
        <Link to="/clientes">← Volver a clientes</Link>
      </Button>

      <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold break-words">{cliente.nombre}</h1>
        <p className="text-muted-foreground mt-1">
          <i className="fa-solid fa-phone mr-2" />
          {cliente.telefono || "Sin teléfono"}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Cliente desde {shortDate(cliente.created_at)}
        </p>
        {cliente.observaciones && (
          <div className="mt-4 p-4 bg-secondary rounded-lg text-sm">
            <strong>Observaciones:</strong> {cliente.observaciones}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="bg-secondary rounded-xl p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs uppercase text-muted-foreground">Reservas</p>
            <p className="text-xl sm:text-2xl font-bold mt-1">{totalReservas}</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs uppercase text-muted-foreground">Total comprado</p>
            <p className="text-xl sm:text-2xl font-bold mt-1">{money(totalComprado)}</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs uppercase text-muted-foreground">Total abonado</p>
            <p className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600">{money(totalAbonado)}</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs uppercase text-muted-foreground">Pendiente</p>
            <p className="text-xl sm:text-2xl font-bold mt-1 text-primary">{money(pendiente)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">Reservas</h2>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/reservas" search={{ cliente: id }}>
            <i className="fa-solid fa-plus mr-2" /> Nueva Reserva
          </Link>
        </Button>
      </div>

      {reservas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          Este cliente aún no tiene reservas.
        </div>
      ) : (
        <div className="grid gap-3">
          {reservas.map((r: any) => {
            const abonado = pagos
              .filter((p: any) => p.reserva_id === r.id)
              .reduce((s: number, p: any) => s + Number(p.monto), 0);
            const restante = Math.max(0, Number(r.precio) - abonado);
            return (
              <div key={r.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold">{r.producto}</h3>
                    <p className="text-sm text-muted-foreground">
                      {r.origen} · {shortDate(r.fecha)}
                    </p>
                  </div>
                  <span
                    className={
                      "text-xs font-semibold px-3 py-1 rounded-full " + estadoBadgeClass(r.estado)
                    }
                  >
                    {estadoLabel(r.estado)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Precio</p>
                    <p className="font-semibold">{money(r.precio)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Abonado</p>
                    <p className="font-semibold">{money(abonado)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Restante</p>
                    <p className="font-semibold text-primary">{money(restante)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}