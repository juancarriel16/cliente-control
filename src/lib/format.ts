export function money(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);
}

export function shortDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export const ORIGENES = ["Japon", "USA", "China", "Local"] as const;
export type Origen = (typeof ORIGENES)[number];

export const ESTADOS_RESERVA = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_transito", label: "En tránsito" },
  { value: "recibido", label: "Recibido" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
] as const;
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number]["value"];

export function estadoLabel(value: string) {
  return ESTADOS_RESERVA.find((e) => e.value === value)?.label ?? value;
}

export function estadoBadgeClass(value: string) {
  switch (value) {
    case "pendiente":
      return "bg-amber-100 text-amber-700";
    case "en_transito":
      return "bg-blue-100 text-blue-700";
    case "recibido":
      return "bg-purple-100 text-purple-700";
    case "entregado":
      return "bg-emerald-100 text-emerald-700";
    case "cancelado":
      return "bg-red-100 text-red-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}