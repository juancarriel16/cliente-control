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
import { money, ORIGENES } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/articulos")({
  component: ArticulosPage,
});

function ArticulosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: articulos = [] } = useQuery({
    queryKey: ["articulos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articulos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articulos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artículo eliminado");
      qc.invalidateQueries({ queryKey: ["articulos"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Artículos"
        subtitle="Inventario y precios de las figuras."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)} size="sm">
                <i className="fa-solid fa-plus text-xs mr-2" /> Nuevo Artículo
              </Button>
            </DialogTrigger>
            <ArticuloForm
              editing={editing}
              onDone={() => {
                setOpen(false);
                setEditing(null);
              }}
            />
          </Dialog>
        }
      />

      {articulos.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          Aún no hay artículos registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {articulos.map((a: any) => {
            const total = Number(a.costo) + Number(a.costo_envio);
            const ganancia = Number(a.precio_venta) - total;
            return (
              <div key={a.id} className="bg-card border border-border rounded-xl p-5">
                {a.imagen_url && (
                  <div className="w-full h-40 rounded-lg mb-3 bg-muted/40 flex items-center justify-center overflow-hidden">
                    <img
                      src={a.imagen_url}
                      alt={a.nombre}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <h3 className="font-semibold text-lg">{a.nombre}</h3>
                <p className="text-sm text-muted-foreground">
                  {a.proveedor ?? "Sin proveedor"} · {a.origen ?? "—"}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Costo total</p>
                    <p className="font-semibold">{money(total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Precio venta</p>
                    <p className="font-semibold">{money(a.precio_venta)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ganancia</p>
                    <p className={"font-semibold " + (ganancia >= 0 ? "text-emerald-600" : "text-destructive")}>
                      {money(ganancia)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <p className="font-semibold">{a.stock}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditing(a);
                      setOpen(true);
                    }}
                  >
                    <i className="fa-solid fa-pen text-xs mr-2" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("¿Eliminar artículo?")) deleteMut.mutate(a.id);
                    }}
                  >
                    <i className="fa-solid fa-trash text-xs text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArticuloForm({ editing, onDone }: { editing: any | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [f, setF] = useState({
    nombre: editing?.nombre ?? "",
    imagen_url: editing?.imagen_url ?? "",
    proveedor: editing?.proveedor ?? "",
    origen: editing?.origen ?? "Local",
    costo: editing?.costo?.toString() ?? "0",
    costo_envio: editing?.costo_envio?.toString() ?? "0",
    precio_venta: editing?.precio_venta?.toString() ?? "0",
    stock: editing?.stock?.toString() ?? "0",
    notas: editing?.notas ?? "",
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!f.nombre.trim()) throw new Error("El nombre es obligatorio");
      const payload = {
        nombre: f.nombre.trim(),
        imagen_url: f.imagen_url.trim() || null,
        proveedor: f.proveedor.trim() || null,
        origen: f.origen,
        costo: Number(f.costo) || 0,
        costo_envio: Number(f.costo_envio) || 0,
        precio_venta: Number(f.precio_venta) || 0,
        stock: Number(f.stock) || 0,
        notas: f.notas.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("articulos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) throw new Error("No autenticado");
        const { error } = await supabase
          .from("articulos")
          .insert({ ...payload, owner_id: userRes.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Artículo actualizado" : "Artículo guardado");
      qc.invalidateQueries({ queryKey: ["articulos"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });

  const upd = (k: string, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("No autenticado");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userRes.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("articulos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("articulos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr) throw signErr;
      upd("imagen_url", signed.signedUrl);
      toast.success("Imagen subida");
    } catch (e: any) {
      toast.error(e.message ?? "Error subiendo imagen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar Artículo" : "Nuevo Artículo"}</DialogTitle>
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
          <Input value={f.nombre} onChange={(e) => upd("nombre", e.target.value)} required />
        </div>
        <div>
          <Label>Imagen (opcional)</Label>
          <div className="flex flex-col gap-2">
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <Input
              placeholder="o pega una URL"
              value={f.imagen_url}
              onChange={(e) => upd("imagen_url", e.target.value)}
            />
            {f.imagen_url && (
              <div className="w-full h-32 rounded-lg bg-muted/40 flex items-center justify-center overflow-hidden">
                <img src={f.imagen_url} alt="preview" className="w-full h-full object-contain" />
              </div>
            )}
            {uploading && <p className="text-xs text-muted-foreground">Subiendo imagen...</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Proveedor</Label>
            <Input value={f.proveedor} onChange={(e) => upd("proveedor", e.target.value)} />
          </div>
          <div>
            <Label>Origen</Label>
            <Select value={f.origen} onValueChange={(v) => upd("origen", v)}>
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
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Costo</Label>
            <Input
              type="number"
              step="0.01"
              value={f.costo}
              onChange={(e) => upd("costo", e.target.value)}
            />
          </div>
          <div>
            <Label>Costo envío</Label>
            <Input
              type="number"
              step="0.01"
              value={f.costo_envio}
              onChange={(e) => upd("costo_envio", e.target.value)}
            />
          </div>
          <div>
            <Label>Precio venta</Label>
            <Input
              type="number"
              step="0.01"
              value={f.precio_venta}
              onChange={(e) => upd("precio_venta", e.target.value)}
            />
          </div>
          <div>
            <Label>Stock</Label>
            <Input
              type="number"
              value={f.stock}
              onChange={(e) => upd("stock", e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea rows={3} value={f.notas} onChange={(e) => upd("notas", e.target.value)} />
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