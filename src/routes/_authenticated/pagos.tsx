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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
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
              <Button>
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
              className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{p.reservas?.producto ?? "Reserva eliminada"}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">
                  <i className="fa-solid fa-user mr-1" /> {p.reservas?.clientes?.nombre ?? "—"} ·{" "}
                  {shortDate(p.fecha)}
                </p>
                {p.notas && <p className="text-xs text-muted-foreground mt-1">{p.notas}</p>}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5">
                <div className="text-right">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">Monto</p>
                  <p className="font-bold text-base sm:text-lg text-primary">{money(p.monto)}</p>
                </div>
                <div className="flex gap-2">
                  {p.comprobante_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openComprobante(p.comprobante_url)}
                      title="Ver comprobante"
                    >
                      <i className="fa-solid fa-file-invoice sm:mr-1" />
                      <span className="hidden sm:inline">Comprobante</span>
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
              </div>
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
  const [openRes, setOpenRes] = useState(false);
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: reservas = [] } = useQuery({
    queryKey: ["reservas-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("id, producto, precio, origen, clientes(nombre)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reservaSel = reservas.find((r: any) => r.id === reservaId);

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
          <Popover open={openRes} onOpenChange={setOpenRes}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full justify-between font-normal",
                  !reservaSel && "text-muted-foreground",
                )}
              >
                {reservaSel
                  ? `${reservaSel.clientes?.nombre} — ${reservaSel.producto} (${money(reservaSel.precio)})`
                  : "Selecciona una reserva..."}
                <i className="fa-solid fa-chevron-down ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar reserva..." />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  <CommandGroup>
                    {reservas.map((r: any) => (
                      <CommandItem
                        key={r.id}
                        value={`${r.clientes?.nombre ?? ""} ${r.producto ?? ""} ${r.origen ?? ""}`}
                        onSelect={() => {
                          setReservaId(r.id);
                          setOpenRes(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {r.clientes?.nombre} — {r.producto}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {money(r.precio)} · {r.origen ?? "—"}
                          </span>
                        </div>
                        {reservaId === r.id && (
                          <i className="fa-solid fa-check ml-auto text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {reservas.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              No hay reservas. Registra una en la sección Reservas.
            </p>
          )}
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