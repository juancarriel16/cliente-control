import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  money,
  shortDate,
  ORIGENES,
  ESTADOS_RESERVA,
  estadoLabel,
  estadoBadgeClass,
} from "@/lib/format";

const searchSchema = z.object({ cliente: z.string().optional() });

export const Route = createFileRoute("/_authenticated/reservas")({
  validateSearch: searchSchema,
  component: ReservasPage,
});

function ReservasPage() {
  const qc = useQueryClient();
  const { cliente: preCliente } = Route.useSearch();
  const [open, setOpen] = useState(!!preCliente);
  const [editing, setEditing] = useState<any>(null);

  const { data: reservas = [] } = useQuery({
    queryKey: ["reservas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("*, clientes(nombre)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ["pagos-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagos").select("reserva_id, monto");
      if (error) throw error;
      return data ?? [];
    },
  });

  const abonadoPor = (rid: string) =>
    pagos.filter((p: any) => p.reserva_id === rid).reduce((s: number, p: any) => s + Number(p.monto), 0);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reserva eliminada");
      qc.invalidateQueries({ queryKey: ["reservas"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Reservas"
        subtitle="Preórdenes y ventas registradas."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="lg" onClick={() => setEditing(null)}>
                <i className="fa-solid fa-plus mr-2" /> Nueva Reserva
              </Button>
            </DialogTrigger>
            <ReservaForm
              editing={editing}
              preCliente={preCliente}
              onDone={() => {
                setOpen(false);
                setEditing(null);
              }}
            />
          </Dialog>
        }
      />

      {reservas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          Aún no hay reservas registradas.
        </div>
      ) : (
        <div className="grid gap-3">
          {reservas.map((r: any) => {
            const abonado = abonadoPor(r.id);
            const restante = Math.max(0, Number(r.precio) - abonado);
            return (
              <div key={r.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg">{r.producto}</h3>
                      <span
                        className={
                          "text-xs font-semibold px-3 py-1 rounded-full " +
                          estadoBadgeClass(r.estado)
                        }
                      >
                        {estadoLabel(r.estado)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      <i className="fa-solid fa-user mr-1" /> {r.clientes?.nombre ?? "—"} ·{" "}
                      {r.origen} · {shortDate(r.fecha)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                    >
                      <i className="fa-solid fa-pen" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("¿Eliminar esta reserva?")) deleteMut.mutate(r.id);
                      }}
                    >
                      <i className="fa-solid fa-trash text-destructive" />
                    </Button>
                  </div>
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

function ReservaForm({
  editing,
  preCliente,
  onDone,
}: {
  editing: any | null;
  preCliente?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [clienteId, setClienteId] = useState<string>(editing?.cliente_id ?? preCliente ?? "");
  const [producto, setProducto] = useState(editing?.producto ?? "");
  const [origen, setOrigen] = useState(editing?.origen ?? "Local");
  const [estado, setEstado] = useState(editing?.estado ?? "pendiente");
  const [precio, setPrecio] = useState<string>(editing?.precio?.toString() ?? "");
  const [notas, setNotas] = useState(editing?.notas ?? "");

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nombre").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Selecciona un cliente");
      if (!producto.trim()) throw new Error("Ingresa el nombre del producto");
      const payload: any = {
        cliente_id: clienteId,
        producto: producto.trim(),
        origen,
        estado,
        precio: Number(precio) || 0,
        notas: notas.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("reservas").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) throw new Error("No autenticado");
        const { error } = await supabase.from("reservas").insert({ ...payload, owner_id: userRes.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Reserva actualizada" : "Reserva creada");
      qc.invalidateQueries({ queryKey: ["reservas"] });
      qc.invalidateQueries({ queryKey: ["clientes-summary"] });
      qc.invalidateQueries({ queryKey: ["cliente-reservas"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar Reserva" : "Nueva Reserva"}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate();
        }}
      >
        <div>
          <Label>Cliente</Label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Producto / Figura</Label>
          <Input value={producto} onChange={(e) => setProducto(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Origen</Label>
            <Select value={origen} onValueChange={setOrigen}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORIGENES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_RESERVA.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Precio (S/.)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMut.isPending}>
            {saveMut.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}