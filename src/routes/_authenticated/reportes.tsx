import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { money } from "@/lib/format";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/reportes")({
  component: ReportesPage,
});

function ReportesPage() {
  const { data: reservas = [] } = useQuery({
    queryKey: ["rep-reservas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("id, cliente_id, producto, precio, estado, fecha, clientes(nombre)");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ["rep-pagos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagos").select("reserva_id, monto, fecha");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Monthly income from payments (last 6 months)
  const monthlyMap: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = d.toLocaleDateString("es-PE", { month: "short", year: "2-digit" });
    monthlyMap[k] = 0;
  }
  pagos.forEach((p: any) => {
    const d = new Date(p.fecha);
    const k = d.toLocaleDateString("es-PE", { month: "short", year: "2-digit" });
    if (k in monthlyMap) monthlyMap[k] += Number(p.monto);
  });
  const monthlyData = Object.entries(monthlyMap).map(([mes, ingresos]) => ({ mes, ingresos }));

  const totalVentas = reservas.reduce((s: number, r: any) => s + Number(r.precio), 0);
  const totalCobrado = pagos.reduce((s: number, p: any) => s + Number(p.monto), 0);
  const totalPendiente = Math.max(0, totalVentas - totalCobrado);
  const activas = reservas.filter(
    (r: any) => r.estado !== "entregado" && r.estado !== "cancelado",
  ).length;

  // Top clientes por monto
  const porCliente: Record<string, { nombre: string; total: number }> = {};
  reservas.forEach((r: any) => {
    const key = r.cliente_id;
    if (!porCliente[key]) porCliente[key] = { nombre: r.clientes?.nombre ?? "—", total: 0 };
    porCliente[key].total += Number(r.precio);
  });
  const topClientes = Object.values(porCliente).sort((a, b) => b.total - a.total).slice(0, 5);

  // Productos más reservados
  const porProducto: Record<string, { producto: string; cantidad: number; monto: number }> = {};
  reservas.forEach((r: any) => {
    const key = r.producto;
    if (!porProducto[key]) porProducto[key] = { producto: key, cantidad: 0, monto: 0 };
    porProducto[key].cantidad += 1;
    porProducto[key].monto += Number(r.precio);
  });
  const topProductos = Object.values(porProducto).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Resumen de tu negocio." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Ventas totales" value={money(totalVentas)} />
        <Stat label="Cobrado" value={money(totalCobrado)} />
        <Stat label="Pendiente" value={money(totalPendiente)} highlight />
        <Stat label="Reservas activas" value={activas.toString()} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="font-bold text-lg mb-4">Ingresos por mes</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(v: any) => money(Number(v))} />
              <Bar dataKey="ingresos" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4">Top clientes</h3>
          {topClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos aún.</p>
          ) : (
            <ul className="space-y-2">
              {topClientes.map((c) => (
                <li key={c.nombre} className="flex justify-between text-sm">
                  <span>{c.nombre}</span>
                  <span className="font-semibold">{money(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4">Productos más reservados</h3>
          {topProductos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos aún.</p>
          ) : (
            <ul className="space-y-2">
              {topProductos.map((p) => (
                <li key={p.producto} className="flex justify-between text-sm">
                  <span>
                    {p.producto}{" "}
                    <span className="text-muted-foreground">× {p.cantidad}</span>
                  </span>
                  <span className="font-semibold">{money(p.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={"text-2xl font-bold mt-2 " + (highlight ? "text-primary" : "")}>{value}</p>
    </div>
  );
}