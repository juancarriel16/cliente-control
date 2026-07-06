## Plan: Buscador de reservas al registrar pago

### Objetivo
En el formulario **Registrar Pago** (ruta `/pagos`), reemplazar el `<Select>` de reservas por un buscador desplegable con `Popover + Command`, igual al selector de artículos que ya existe en el formulario de reservas. Esto evita tener que hacer scroll en listas largas de reservas.

### Cambios
1. **Frontend: `src/routes/_authenticated/pagos.tsx`**
   - Importar `Popover`, `PopoverContent`, `PopoverTrigger`, `Command`, `CommandEmpty`, `CommandGroup`, `CommandInput`, `CommandItem`, `CommandList` y `cn`.
   - En `PagoForm`, reemplazar el `<Select>` de reserva por un combobox:
     - Campo de búsqueda con placeholder "Buscar reserva...".
     - Lista filtrada por cliente, producto u origen.
     - Cada ítem muestra: `Cliente — Producto (S/ Precio)`.
     - Marcar con check la reserva seleccionada.
   - Mantener `reservaId` en el estado y la validación al guardar.
   - Conservar el resto del formulario (monto, notas, comprobante) y la mutación sin cambios.

### No incluye
- Cambios en base de datos, RLS ni server functions.
- Cambios en la lista de pagos ni en otros formularios.

### Validación
- Abrir el diálogo "Registrar Pago".
- Verificar que el campo Reserva ahora muestra un botón "Selecciona una reserva...".
- Escribir en el campo y confirmar que filtra la lista de reservas.
- Seleccionar una reserva y registrar un pago de prueba.
