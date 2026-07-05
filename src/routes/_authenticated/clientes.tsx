import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  observaciones: string | null;
  created_at: string;
};

function ClientesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, telefono, observaciones, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Cliente[];
    },
  });

  // Fetch reservation/payment summary per client
  const { data: summaries = {} } = useQuery({
    queryKey: ["clientes-summary"],
    queryFn: async () => {
      const [{ data: reservas }, { data: pagos }] = await Promise.all([
        supabase.from("reservas").select("id, cliente_id, precio, estado"),
        supabase.from("pagos").select("reserva_id, monto"),
      ]);
      const pagosByRes: Record<string, number> = {};
      (pagos ?? []).forEach((p: any) => {
        pagosByRes[p.reserva_id] = (pagosByRes[p.reserva_id] ?? 0) + Number(p.monto);
      });
      const map: Record<string, { activas: number; pendiente: number }> = {};
      (reservas ?? []).forEach((r: any) => {
        const abonado = pagosByRes[r.id] ?? 0;
        const restante = Math.max(0, Number(r.precio) - abonado);
        if (!map[r.cliente_id]) map[r.cliente_id] = { activas: 0, pendiente: 0 };
        if (r.estado !== "entregado" && r.estado !== "cancelado") {
          map[r.cliente_id].activas += 1;
        }
        map[r.cliente_id].pendiente += restante;
      });
      return map;
    },
  });

  const filtered = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (c.telefono ?? "").includes(search),
  );

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente eliminado");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["clientes-summary"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Administración de clientes."
        action={
          <Dialog
            open={openForm}
            onOpenChange={(v) => {
              setOpenForm(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="lg" onClick={() => setEditing(null)}>
                <i className="fa-solid fa-plus mr-2" /> Nuevo Cliente
              </Button>
            </DialogTrigger>
            <ClienteForm
              editing={editing}
              onDone={() => {
                setOpenForm(false);
                setEditing(null);
              }}
            />
          </Dialog>
        }
      />

      <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-3 mb-6">
        <i className="fa-solid fa-magnifying-glass text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nombre o teléfono..."
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          {clientes.length === 0
            ? "Aún no tienes clientes. Crea el primero con el botón arriba."
            : "Sin resultados para tu búsqueda."}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const s = summaries[c.id] ?? { activas: 0, pendiente: 0 };
            return (
              <div
                key={c.id}
                className="bg-card border border-border rounded-xl p-5 flex items-center gap-5 flex-wrap"
              >
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-semibold text-lg">{c.nombre}</h3>
                  <p className="text-sm text-muted-foreground">
                    <i className="fa-solid fa-phone mr-2" />
                    {c.telefono || "Sin teléfono"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Activas</p>
                  <p className="font-bold text-lg">{s.activas}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendiente</p>
                  <p className="font-bold text-lg text-primary">{money(s.pendiente)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" asChild>
                    <Link to="/clientes/$id" params={{ id: c.id }}>
                      Ver ficha
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(c);
                      setOpenForm(true);
                    }}
                  >
                    <i className="fa-solid fa-pen" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <i className="fa-solid fa-trash text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminarán también sus reservas y pagos asociados. Esta acción no se
                          puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMut.mutate(c.id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClienteForm({
  editing,
  onDone,
}: {
  editing: Cliente | null;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(editing?.nombre ?? "");
  const [telefono, setTelefono] = useState(editing?.telefono ?? "");
  const [observaciones, setObservaciones] = useState(editing?.observaciones ?? "");

  const saveMut = useMutation({
    mutationFn: async () => {
      const nombreLimpio = nombre.trim();
      if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(nombreLimpio)) {
        throw new Error("El nombre solo debe tener letras y espacios.");
      }
      const telLimpio = telefono.trim();
      if (telLimpio && !/^\+?\d{10,14}$/.test(telLimpio)) {
        throw new Error("Teléfono inválido (10 a 14 dígitos, opcional +).");
      }
      const payload = {
        nombre: nombreLimpio,
        telefono: telLimpio || null,
        observaciones: observaciones.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) throw new Error("No autenticado");
        const { error } = await supabase
          .from("clientes")
          .insert({ ...payload, owner_id: userRes.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cliente actualizado" : "Cliente guardado");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate();
        }}
      >
        <div>
          <Label>Nombre</Label>
          <Input maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input
            maxLength={14}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+51987654321"
          />
        </div>
        <div>
          <Label>Observaciones</Label>
          <Textarea
            rows={4}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
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