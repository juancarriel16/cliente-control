import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { money, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pagos")({
  component: PagosPage,
});

function PagosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const openComprobante = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("comprobantes")
      .createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("No se pudo abrir el comprobante");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const { data: pagos = [] } = useQuery({
    queryKey: ["pagos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagos")
        .select("*, reservas(producto, precio, clientes(nombre))")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { data: pago } = await supabase
        .from("pagos")
        .select("comprobante_url")
        .eq("id", id)
        .maybeSingle();
      if (pago?.comprobante_url) {
        await supabase.storage.from("comprobantes").remove([pago.comprobante_url]);
      }
      const { error } = await supabase.from("pagos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pago eliminado");
      qc.invalidateQueries();
    },
  });

  return (
    <div>
      <PageHeader
        title="Pagos"
        subtitle="Registro de abonos por reserva."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <i className="fa-solid fa-plus mr-2" /> Registrar Pago
              </Button>
            </DialogTrigger>
            <PagoForm onDone={() => setOpen(false)} />
          </Dialog>
        }
      />

      {pagos.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          Aún no hay pagos registrados.
        </div>
      ) : (
        <div className="grid gap-3">
          {pagos.map((p: any) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-xl p-5 flex items-center gap-5 flex-wrap"
            >
              <div className="flex-1 min-w-[220px]">
                <h3 className="font-semibold">{p.reservas?.producto ?? "Reserva eliminada"}</h3>
                <p className="text-sm text-muted-foreground">
                  <i className="fa-solid fa-user mr-1" /> {p.reservas?.clientes?.nombre ?? "—"} ·{" "}
                  {shortDate(p.fecha)}
                </p>
                {p.notas && <p className="text-xs text-muted-foreground mt-1">{p.notas}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase">Monto</p>
                <p className="font-bold text-lg text-primary">{money(p.monto)}</p>
              </div>
              {p.comprobante_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openComprobante(p.comprobante_url)}
                  title="Ver comprobante"
                >
                  <i className="fa-solid fa-file-invoice mr-1" /> Comprobante
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("¿Eliminar pago?")) deleteMut.mutate(p.id);
                }}
              >
                <i className="fa-solid fa-trash text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PagoForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [reservaId, setReservaId] = useState<string>("");
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: reservas = [] } = useQuery({
    queryKey: ["reservas-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("id, producto, precio, clientes(nombre)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!reservaId) throw new Error("Selecciona una reserva");
      const m = Number(monto);
      if (!m || m <= 0) throw new Error("Monto inválido");
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("No autenticado");
      let comprobante_url: string | null = null;
      if (file) {
        if (file.size > 10 * 1024 * 1024) throw new Error("Archivo mayor a 10MB");
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${userRes.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("comprobantes")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        comprobante_url = path;
      }
      const { error } = await supabase.from("pagos").insert({
        reserva_id: reservaId,
        monto: m,
        notas: notas.trim() || null,
        comprobante_url,
        owner_id: userRes.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pago registrado");
      qc.invalidateQueries();
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Registrar Pago</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate();
        }}
      >
        <div>
          <Label>Reserva</Label>
          <Select value={reservaId} onValueChange={setReservaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una reserva" />
            </SelectTrigger>
            <SelectContent>
              {reservas.map((r: any) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.clientes?.nombre} — {r.producto} ({money(r.precio)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Monto (S/.)</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
        <div>
          <Label>Comprobante (opcional)</Label>
          <Input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Imagen o PDF, máx 10MB.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMut.isPending}>
            {saveMut.isPending ? "Guardando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}