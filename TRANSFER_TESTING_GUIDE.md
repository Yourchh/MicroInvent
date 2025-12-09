# Testing Guide - Módulo de Transferencias

## Pre-requisitos
- ✅ Servidor corriendo en puerto 3000
- ✅ Cliente en puerto 5173
- ✅ Base de datos PostgreSQL con datos
- ✅ 2 sucursales creadas (mínimo)
- ✅ Usuarios en diferentes sucursales

## Test Case 1: REQUEST - Flujo Completo

### Setup
- Usuario A en Sucursal 1
- Usuario B en Sucursal 2
- Producto X con 100 unidades en Sucursal 1

### Pasos

1. **Usuario A: Crear REQUEST**
   - Ir a Transferencias
   - Clic "Nueva Transferencia"
   - Tipo: "Solicitud de Stock"
   - Destino: Sucursal 2
   - Producto: X, Cantidad: 20
   - Clic "Crear"
   - ✅ Debe mostrar "✅ Solicitud de transferencia creada"

2. **Verificar Status Inicial**
   - Ir a tab "Todas"
   - Buscar transferencia creada
   - Estado debe ser: "Pendiente" (badge amarillo)
   - Usuario A: Ve en "Todas", NOT en "Pendientes"

3. **Usuario B: Ver Pendientes**
   - Cambiar a Usuario B / Sucursal 2
   - Ir a Transferencias
   - Tab "Pendientes"
   - ✅ Debe aparecer la transferencia de A
   - Debe mostrar: "Solicitud | Sucursal 1 → Sucursal 2 | Producto X (20)"

4. **Usuario B: Aprobar**
   - Clic botón "APROBAR" (verde)
   - ✅ Debe mostrar "✅ Transferencia aprobada"
   - Status debe cambiar a: "En Tránsito" (badge azul)

5. **Verificar Stock Descuento en A**
   - Cambiar a Usuario A / Sucursal 1
   - Ir a Inventario
   - Producto X debe mostrar: 80 unidades (100 - 20)
   - ✅ Stock DESCUENTADO en origen

6. **Usuario B: Completar**
   - Cambiar a Usuario B / Sucursal 2
   - Ir a Transferencias
   - La transferencia debe estar en estado "En Tránsito"
   - Clic botón "RECIBIDO" (azul)
   - ✅ Debe mostrar "✅ Transferencia completada"
   - Status debe cambiar a: "Completado" (badge verde)

7. **Verificar Stock Suma en B**
   - Ir a Inventario (Sucursal 2)
   - Producto X debe mostrar: +20 unidades
   - ✅ Stock SUMADO en destino

✅ **Test Case 1 EXITOSO** si:
- Stock de A: 100 → 80 ✅
- Stock de B: (N) → (N+20) ✅
- Estados: PENDING → IN_TRANSIT → COMPLETED ✅

---

## Test Case 2: SEND - Flujo Completo

### Setup
- Usuario A en Sucursal 1
- Usuario B en Sucursal 2
- Producto Y con 50 unidades en Sucursal 1
- Producto Y con 30 unidades en Sucursal 2

### Pasos

1. **Usuario A: Crear SEND**
   - Ir a Transferencias
   - Clic "Nueva Transferencia"
   - Tipo: "Envío de Stock"
   - Destino: Sucursal 2
   - Producto: Y, Cantidad: 15
   - Clic "Crear"
   - ✅ Debe mostrar "✅ Solicitud de transferencia creada"
   - **Nota:** Debe validar que hay 15 disponibles en Sucursal 1

2. **Usuario A: Intenta SEND con Stock Insuficiente**
   - Tipo: "Envío de Stock"
   - Destino: Sucursal 2
   - Producto: Y, Cantidad: 100
   - Clic "Crear"
   - ❌ Debe mostrar error: "Stock insuficiente"

3. **Usuario B: Aprobar SEND**
   - Cambiar a Usuario B
   - Ir a Transferencias → Pendientes
   - Clic "APROBAR"
   - ✅ Stock de A debe descuentarse (50 → 35)

4. **Usuario B: Completar SEND**
   - Clic "RECIBIDO"
   - ✅ Stock de B debe aumentar (30 → 45)

✅ **Test Case 2 EXITOSO** si:
- Validación de stock en SEND ✅
- Stock movido correctamente ✅

---

## Test Case 3: Rechazo de Transferencia

### Setup
- Usuario A crea REQUEST a B
- Usuario B ve en Pendientes

### Pasos

1. **Usuario B: Ver Botones**
   - En Pendientes
   - Debe haber 2 botones:
     - APROBAR (verde)
     - RECHAZAR (naranja) ← **NUEVO**

2. **Usuario B: Rechazar**
   - Clic "RECHAZAR"
   - ✅ Debe mostrar "✅ Transferencia rechazada"
   - Status debe cambiar a: "Rechazado" (badge naranja)

3. **Verificar Stock SIN Cambios**
   - Ir a Inventario de ambas sucursales
   - Stock debe ser igual al inicial
   - ✅ NADA se movió

4. **Filtrar Rechazadas**
   - En Tab "Todas"
   - Filtro: "Rechazadas"
   - ✅ Debe mostrar la transferencia rechazada

✅ **Test Case 3 EXITOSO** si:
- Botón RECHAZAR visible en destino, estado PENDING ✅
- Stock sin cambios ✅
- Filtro funciona ✅

---

## Test Case 4: Cancelación por Origen

### Setup
- Usuario A crea REQUEST a B
- Status: PENDING

### Pasos

1. **Usuario A: Intenta cancelar desde origen**
   - Ir a Transferencias
   - Tab "Todas"
   - Buscar su propia transferencia PENDING
   - Debe haber botón "CANCELAR" (rojo)

2. **Usuario A: Cancelar**
   - Clic "CANCELAR"
   - ✅ Debe mostrar "✅ Transferencia cancelada"
   - Status: "Cancelado" (badge rojo)

3. **Usuario A: No puede cancelar si IN_TRANSIT**
   - Crear nuevo REQUEST
   - Usuario B lo aprueba (status: IN_TRANSIT)
   - Usuario A intenta cancelar
   - ❌ Botón "CANCELAR" NO debe aparecer
   - ❌ Si intenta por API: Error 400

4. **Verificar Stock SIN Cambios**
   - Stock debe mantenerse igual
   - ✅ NADA se movió

✅ **Test Case 4 EXITOSO** si:
- Botón CANCELAR solo visible si source_branch Y status=PENDING ✅
- No se puede cancelar después de aprobar ✅
- Stock sin cambios ✅

---

## Test Case 5: Visibilidad Entre Sucursales

### Setup
- Usuario A en Sucursal 1
- Usuario B en Sucursal 2
- Usuario A crea REQUEST

### Pasos

1. **Usuario A: No ve en Pendientes**
   - Tab "Pendientes" → Vacío o sin su transferencia
   - Tab "Todas" → La ve ahí

2. **Usuario B: La ve en Pendientes**
   - Tab "Pendientes" → La ve
   - Puede APROBAR/RECHAZAR

3. **Usuario B: Aprueba**
   - Status → IN_TRANSIT

4. **Usuario A: Ve el cambio**
   - Tab "Todas" → Status actualizado a "En Tránsito"
   - Sin recargar página (sincronización)

5. **Usuario B: Completa**
   - Status → COMPLETED

6. **Usuario A: Ve COMPLETED**
   - Actualización automática

✅ **Test Case 5 EXITOSO** si:
- A: PENDING en "Todas", NOT en "Pendientes" ✅
- B: PENDING en "Pendientes" ✅
- B puede actuar, A ve cambios ✅

---

## Test Case 6: Permisos (Negativo)

### Setup
- Usuario A en Sucursal 1
- Usuario C en Sucursal 3
- Usuario A crea REQUEST a Sucursal 2

### Pasos

1. **Usuario C: No puede actuar**
   - Ir a Transferencias
   - NO debe ver el REQUEST en Pendientes
   - Si intenta actuar por API: Error 403

2. **Usuario A: No puede aprobar su propia transferencia**
   - Cambiar a Sucursal 2 pero Usuario A sigue siendo origen
   - Botón APROBAR NO debe aparecer
   - Si intenta por API: Error 403

3. **Usuario B (Destino): No puede cancelar**
   - Transferencia de A → B
   - Usuario B NO ve botón CANCELAR
   - Si intenta por API: Error 403

✅ **Test Case 6 EXITOSO** si:
- Usuarios no autorizados no pueden actuar ✅
- Permisos correctamente validados en servidor ✅

---

## Bugs a Vigilar

⚠️ **Si Stock No Se Mueve:**
- Verificar que `approve()` en transferModel se ejecuta
- Verificar que `complete()` en transferModel se ejecuta
- Revisar logs del servidor

⚠️ **Si Botones No Aparecen:**
- Verificar que `canApprove()`, `canReject()`, `canCancel()` tienen lógica correcta
- Revisar que `transfer.dest_branch_id` y `transfer.source_branch_id` sean números

⚠️ **Si Stock Duplicado:**
- Verificar que `approve()` NO suma (solo descuenta)
- Verificar que `complete()` NO descuenta (solo suma)

⚠️ **Si Rechazado No Aparece en Filtro:**
- Verificar que `getStatusLabel()` incluye 'REJECTED'
- Verificar que `getStatusColor()` incluye case 'REJECTED'

---

## Checklist Final

- [ ] REQUEST: Crear → Aprobar → Completar ✅ Stock movido
- [ ] REQUEST: Crear → Rechazar ✅ Stock NO movido
- [ ] SEND: Crear valida stock origen
- [ ] SEND: Crear → Aprobar → Completar ✅ Stock movido
- [ ] Cancelar: Solo si PENDING, solo origen
- [ ] Botones aparecen/desaparecen correctamente
- [ ] Filtros funcionan (PENDING, IN_TRANSIT, COMPLETED, CANCELLED, REJECTED)
- [ ] Permisos: Solo users autorizados pueden actuar
- [ ] Visibilidad: Cada sucursal ve lo suyo
- [ ] Estados: Badge color correcto para cada estado
- [ ] BD: Inventario actualizado correctamente

---

## Comandos Útiles para Debug

### Ver transferencias en BD
```sql
SELECT id, status, source_branch_id, dest_branch_id, transfer_type
FROM transfers
ORDER BY created_at DESC LIMIT 10;
```

### Ver inventario por sucursal
```sql
SELECT branch_id, product_id, quantity
FROM inventory
WHERE branch_id = 1 OR branch_id = 2
ORDER BY product_id;
```

### Ver logs del servidor
```bash
# Terminal del servidor, debe mostrar:
✅ Transferencia REQUEST creada: 123 desde sucursal 1
✅ Transferencia 123 aprobada y stock descontado de sucursal origen
✅ Transferencia 123 completada. Stock movido exitosamente
```

