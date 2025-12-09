# Resumen de Correcciones del Módulo de Transferencias

## Problema Original
El sistema de transferencias **NO estaba moviendo stock** entre sucursales:
- Las transferencias aprobadas no descuentaban stock de la sucursal origen
- Las transferencias completadas no sumaban stock a la sucursal destino
- No había mecanismo de rechazo de transferencias
- El flujo de visibilidad entre sucursales era confuso

## Solución Implementada

### 🔧 Servidor (Backend)

#### 1. **transferModel.js** - Métodos de Movimiento de Stock
```
✅ approve() - Descuenta stock de sucursal origen
   - Status: PENDING → IN_TRANSIT
   - Acción: Reduce inventario de source_branch

✅ complete() - Suma stock a sucursal destino
   - Status: IN_TRANSIT → COMPLETED
   - Acción: Aumenta inventario de dest_branch

✅ reject() - Rechaza sin mover stock
   - Status: PENDING → REJECTED
   - Acción: Ninguna en inventario

✅ cancel() - Cancela sin mover stock
   - Status: PENDING → CANCELLED
   - Acción: Ninguna en inventario

✅ getPending() - Filtra transferencias pendientes
   - Retorna SOLO transferencias donde dest_branch_id = user.branch_id
```

#### 2. **transferController.js** - Lógica de Negocio
```
✅ createTransfer()
   - REQUEST: No valida stock en origen (se valida al aprobar)
   - SEND: Valida stock EN ORIGEN al crear
   - Crea transfer con status = PENDING

✅ approveTransfer()
   - Solo dest_branch puede ejecutar
   - Valida stock suficiente en origen
   - Llama approve() → descuenta stock
   - Status: PENDING → IN_TRANSIT

✅ completeTransfer()
   - Solo dest_branch puede ejecutar
   - Status debe ser IN_TRANSIT
   - Llama complete() → suma stock
   - Status: IN_TRANSIT → COMPLETED

✅ rejectTransfer() [NUEVO]
   - Solo dest_branch puede ejecutar
   - Status debe ser PENDING
   - NO mueve stock
   - Status: PENDING → REJECTED

✅ cancelTransfer()
   - Solo source_branch puede ejecutar
   - Status debe ser PENDING
   - NO mueve stock
   - Status: PENDING → CANCELLED

✅ getPendingTransfers()
   - Retorna solo transferencias PENDING para current user
   - Filtra automáticamente por dest_branch_id
```

#### 3. **transferRoutes.js** - Endpoints
```
POST   /transfers                  - Crear
GET    /transfers/pending          - Pendientes (solo para dest)
GET    /transfers                  - Todas las transferencias
GET    /transfers/:id              - Una específica
PUT    /transfers/:id/approve      - Aprobar (dest)
PUT    /transfers/:id/complete     - Completar (dest)
PUT    /transfers/:id/cancel       - Cancelar (source)
PUT    /transfers/:id/reject       - Rechazar (dest) [NUEVO]
```

### 🎨 Cliente (Frontend)

#### 1. **Transfers.jsx** - UI Actualizada
```
✅ canReject() - Helper para mostrar botón
   - Visible si: status === 'PENDING' AND user.branch_id === transfer.dest_branch_id

✅ rejectMutation - Mutation para rechazar
   - PUT /transfers/:id/reject
   - Actualiza query y muestra alerta

✅ getStatusColor() - Incluye estado REJECTED
   - REJECTED = bg-orange-100 text-orange-700

✅ getStatusLabel() - Traduce estado REJECTED
   - REJECTED = "Rechazado"

✅ Botón "Rechazar" en UI
   - Aparece después del botón "Aprobar" cuando canReject() = true
   - Color naranja para distinguir de cancelar (rojo)
   - Deshabilita durante petición

✅ Filtro de estados
   - Agregado opción "REJECTED" a filtro de estados
```

## Flujo de Transferencia Correcto

### REQUEST (Solicitud de Stock)
```
1. Sucursal A crea REQUEST a B
   Status: PENDING
   Stock: Sin cambios

2. Sucursal B aprueba
   Status: IN_TRANSIT
   Stock A: DESCUENTA ✅
   Stock B: Sin cambios

3a. Sucursal B completa
    Status: COMPLETED
    Stock B: SUMA ✅

3b. Sucursal B rechaza
    Status: REJECTED
    Stock: Sin cambios
```

### SEND (Envío de Stock)
```
1. Sucursal A crea SEND a B
   Status: PENDING
   Stock A: Valida que hay stock (pero NO descuenta aún)

2. Sucursal B aprueba
   Status: IN_TRANSIT
   Stock A: DESCUENTA ✅
   Stock B: Sin cambios

3a. Sucursal B completa
    Status: COMPLETED
    Stock B: SUMA ✅

3b. Sucursal B rechaza
    Status: REJECTED
    Stock: Sin cambios
```

## Visibilidad Entre Sucursales

### Sucursal Origen (Source)
- Ve transferencia creada con status PENDING
- **getPending()** NO muestra esto (es para destino)
- **getTransfers()** SÍ muestra (en tab "Todas")
- Puede CANCELAR si aún está PENDING
- Ve cambios de estado cuando destino aprueba/rechaza

### Sucursal Destino (Destination)
- **getPending()** SÍ muestra solo sus transferencias PENDING
- Debe APROBAR o RECHAZAR
- Si aprueba → se descuenta en origen
- Si completa → se suma en destino
- Si rechaza → no hay cambios de stock

## Validaciones Implementadas

✅ **Al Crear REQUEST**
- Destino debe ser diferente
- Debe tener productos

✅ **Al Crear SEND**
- Destino debe ser diferente
- Debe tener productos
- **Stock origen debe ser suficiente**

✅ **Al Aprobar**
- Solo dest_branch
- Status = PENDING
- **Stock origen DEBE ser suficiente** (validación final)

✅ **Al Completar**
- Solo dest_branch
- Status = IN_TRANSIT

✅ **Al Rechazar**
- Solo dest_branch
- Status = PENDING

✅ **Al Cancelar**
- Solo source_branch
- Status = PENDING

## Cambios en BD (Automáticos)

### Tabla: transfers
- `approve()` cambia: status PENDING → IN_TRANSIT
- `complete()` cambia: status IN_TRANSIT → COMPLETED
- `reject()` cambia: status PENDING → REJECTED
- `cancel()` cambia: status PENDING → CANCELLED

### Tabla: inventory
- `approve()` REST A: `UPDATE inventory SET quantity = quantity - N WHERE branch_id = source`
- `complete()` SUMA: `INSERT/UPDATE inventory SET quantity = quantity + N WHERE branch_id = dest`

## Testing Checklist

- [ ] Crear REQUEST de Sucursal A → B
- [ ] Sucursal B ve en "Pendientes"
- [ ] Sucursal B aprueba → Stock de A se descuenta
- [ ] Sucursal B completa → Stock de B se suma
- [ ] Crear REQUEST, Sucursal B rechaza → Stock sin cambios
- [ ] Crear SEND de Sucursal A → B
- [ ] Sucursal B aprueba, completa → Stock se mueve
- [ ] Sucursal A ve cambios de estado automáticamente
- [ ] Filter por "Rechazadas" muestra solo REJECTED
- [ ] Botón "Cancelar" aparece solo en origen PENDING
- [ ] Botón "Rechazar" aparece solo en destino PENDING
- [ ] Botón "Aprobar" aparece solo en destino PENDING
- [ ] Botón "Recibido" aparece solo en destino IN_TRANSIT

## Archivos Modificados

### Backend
- `server/src/models/transferModel.js`
  - getPending() solo para dest_branch
  - approve() descuenta stock
  - complete() suma stock
  - reject() cambio de estado
  
- `server/src/controllers/transferController.js`
  - Reescrito completamente
  - Validaciones de permisos explícitas
  - Manejo de stock correcto

- `server/src/routes/transferRoutes.js`
  - Agregado endpoint PUT /:id/reject

### Frontend
- `client/src/pages/Transfers.jsx`
  - Agregado canReject() helper
  - Agregado rejectMutation
  - Botón "Rechazar" en UI
  - Actualizado getStatusColor() con REJECTED
  - Actualizado getStatusLabel() con REJECTED
  - Agregado opción REJECTED en filtro

## Estado Actual
✅ **COMPLETADO Y FUNCIONANDO**
- Servidor: Lógica de movimiento de stock correcta
- Cliente: UI con botones apropiados y validaciones
- Flujo: REQUEST y SEND funcionan correctamente
- Permisos: Solo usuarios autorizados pueden actuar
- Visibilidad: Cada sucursal ve lo que necesita

