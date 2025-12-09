# Flujo de Transferencias - Diagrama Visual

## 1. CREAR TRANSFERENCIA (REQUEST o SEND)

```
┌─ Sucursal A (Origen/Source) ─┐
│                              │
│  createTransfer()            │
│  └─ transfer_type: REQUEST   │
│  └─ dest_branch_id: B        │
│  └─ items: [...]             │
│                              │
│  [Si SEND: valida stock]     │
│                              │
└──────────────────────────────┘
            ↓ POST /transfers
        ┌─────────────────┐
        │ API Server      │
        │ Status: PENDING │
        └─────────────────┘
            ↓
         BASE DE DATOS
     ┌───────────────────┐
     │ transfers table   │
     │ id, status        │
     │ source_branch_id  │
     │ dest_branch_id    │
     │ transfer_type     │
     │ items[]           │
     └───────────────────┘
```

## 2. APROBAR TRANSFERENCIA (Solo Sucursal Destino)

```
┌─ Sucursal B (Destino) ──────┐
│                             │
│ getPending() → ve PENDING   │
│                             │
│ Haz clic "APROBAR"          │
│                             │
│ approveTransfer()           │
│   └─ Valida stock en A      │
│   └─ Si OK, descuenta Stock │
│       de A                  │
│                             │
└─────────────────────────────┘
           ↓ PUT /transfers/:id/approve
    ┌──────────────────────────┐
    │ Server                   │
    │ 1. Valida permisos       │
    │    (dest_branch_id)      │
    │ 2. Valida stock origen   │
    │ 3. Llama Transfer.approve│
    │ 4. Status: IN_TRANSIT    │
    └──────────────────────────┘
              ↓
         CAMBIOS EN BD
    ┌──────────────────────────┐
    │ transfers.status         │
    │  PENDING → IN_TRANSIT    │
    │                          │
    │ inventory (Sucursal A)   │
    │  quantity = qty - N      │ ⬇️ DESCUENTA
    │  version++               │
    └──────────────────────────┘
              ↓
  Stock de A ↙️        Status ➜ IN_TRANSIT
```

## 3a. COMPLETAR TRANSFERENCIA (Sucursal Destino)

```
┌─ Sucursal B (Destino) ──────┐
│                             │
│ Recibió los productos       │
│ Haz clic "RECIBIDO"         │
│                             │
│ completeTransfer()          │
│   └─ Suma stock a B         │
│                             │
└─────────────────────────────┘
        ↓ PUT /transfers/:id/complete
    ┌──────────────────────────┐
    │ Server                   │
    │ 1. Valida permisos       │
    │    (dest_branch_id)      │
    │ 2. Status = IN_TRANSIT   │
    │ 3. Llama Transfer.complete
    │ 4. Status: COMPLETED     │
    └──────────────────────────┘
              ↓
         CAMBIOS EN BD
    ┌──────────────────────────┐
    │ transfers.status         │
    │  IN_TRANSIT → COMPLETED  │
    │                          │
    │ inventory (Sucursal B)   │
    │  quantity = qty + N      │ ⬆️ SUMA
    │  version++               │
    └──────────────────────────┘
                ↓
    ✅ Stock movido exitosamente
    Sucursal A: qty - N
    Sucursal B: qty + N
```

## 3b. RECHAZAR TRANSFERENCIA (Sucursal Destino)

```
┌─ Sucursal B (Destino) ──────┐
│                             │
│ No puede completar          │
│ Haz clic "RECHAZAR"         │
│                             │
│ rejectTransfer()            │
│   └─ Sin cambios de stock   │
│                             │
└─────────────────────────────┘
         ↓ PUT /transfers/:id/reject
    ┌──────────────────────────┐
    │ Server                   │
    │ 1. Valida permisos       │
    │    (dest_branch_id)      │
    │ 2. Status = PENDING      │
    │ 3. Llama Transfer.reject │
    │ 4. Status: REJECTED      │
    └──────────────────────────┘
              ↓
         CAMBIOS EN BD
    ┌──────────────────────────┐
    │ transfers.status         │
    │  PENDING → REJECTED      │
    │                          │
    │ inventory                │
    │  SIN CAMBIOS             │
    └──────────────────────────┘
                ↓
    ✅ Transferencia rechazada
    Stock de ambas sucursales SIN CAMBIOS
```

## 4. CANCELAR TRANSFERENCIA (Solo Sucursal Origen, si PENDING)

```
┌─ Sucursal A (Origen) ───────┐
│                             │
│ Cambio de planes            │
│ Status aún PENDING          │
│ Haz clic "CANCELAR"         │
│                             │
│ cancelTransfer()            │
│   └─ Sin cambios de stock   │
│                             │
└─────────────────────────────┘
        ↓ PUT /transfers/:id/cancel
    ┌──────────────────────────┐
    │ Server                   │
    │ 1. Valida permisos       │
    │    (source_branch_id)    │
    │ 2. Status = PENDING      │
    │ 3. Llama Transfer.cancel │
    │ 4. Status: CANCELLED     │
    └──────────────────────────┘
              ↓
         CAMBIOS EN BD
    ┌──────────────────────────┐
    │ transfers.status         │
    │  PENDING → CANCELLED     │
    │                          │
    │ inventory                │
    │  SIN CAMBIOS             │
    └──────────────────────────┘
                ↓
    ✅ Transferencia cancelada
    Stock de ambas sucursales SIN CAMBIOS
```

## Estados y Transiciones

```
                      ┌──────────────┐
                      │   PENDING    │
                      │              │
                      │ (Creado)     │
                      └──────┬───────┘
                             │
                 ┌───────────┼──────────┐
                 │           │          │
                 ↓           ↓          ↓
            APROBADO    RECHAZADO  CANCELADO
          (Solo Dest)   (Solo Dest) (Solo Src)
              ↓
        ┌─────────────┐
        │  IN_TRANSIT │
        │             │
        │ (Stock ↙️)   │
        └──────┬──────┘
               │
          COMPLETADO
         (Stock ⬆️)
              ↓
        ┌─────────────┐
        │  COMPLETED  │
        │             │
        │ (Final)     │
        └─────────────┘
```

## Permisos por Acción

```
┌────────────────────────────────────────────┐
│  ACCIÓN          │  QUIEN PUEDE          │
├────────────────────────────────────────────┤
│  CREAR           │  Cualquier usuario    │
│  APROBAR         │  Sucursal destino     │
│  COMPLETAR       │  Sucursal destino     │
│  RECHAZAR        │  Sucursal destino     │
│  CANCELAR        │  Sucursal origen      │
└────────────────────────────────────────────┘
```

## Visibilidad

```
┌─────────────────────────────────────────────┐
│ Sucursal A (Origen)                        │
├─────────────────────────────────────────────┤
│ • Crea transferencia                       │
│ • Ve en "Todas"                            │
│ • NO ve en "Pendientes" (getPending)       │
│ • Puede CANCELAR si PENDING                │
│ • Ve cambios de estado automáticamente     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Sucursal B (Destino)                       │
├─────────────────────────────────────────────┤
│ • Ve transferencias PENDING para ella      │
│ • Aparecen en "Pendientes" (getPending)    │
│ • También en "Todas"                       │
│ • Puede APROBAR, COMPLETAR, RECHAZAR      │
│ • Ve cambios de estado en tiempo real     │
└─────────────────────────────────────────────┘
```

## Ejemplo Completo: REQUEST de A a B

```
Timeline:
─────────

1. [10:00] Sucursal A crea REQUEST
   POST /transfers {transfer_type: 'REQUEST', dest_branch_id: 2}
   → Status: PENDING
   → Stock A: Sin cambios
   → Stock B: Sin cambios

2. [10:05] Sucursal B ve "Pendientes"
   GET /transfers/pending
   → La transferencia aparece para B
   → A NO la ve en pendientes

3. [10:10] Sucursal B aprueba
   PUT /transfers/123/approve
   → Status: IN_TRANSIT
   → Stock A: DESCUENTA
   → Stock B: Sin cambios (aún)

4. [10:15] Sucursal B recibe productos
   PUT /transfers/123/complete
   → Status: COMPLETED
   → Stock B: SUMA

RESULTADO FINAL:
┌──────────────┬──────────┬──────────┐
│ Sucursal     │ Inicial  │ Final    │
├──────────────┼──────────┼──────────┤
│ A (Origen)   │ 100 pzas │ 80 pzas  │
│ B (Destino)  │ 50 pzas  │ 70 pzas  │
└──────────────┴──────────┴──────────┘
(Transferencia: 20 pzas de A a B)
```

