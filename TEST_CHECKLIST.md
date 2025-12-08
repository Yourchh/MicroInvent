# 📋 CHECKLIST DE PRUEBAS DEL SISTEMA MICROINVENT

## Estado de la Base de Datos
- [x] PostgreSQL iniciado
- [x] Base de datos `microinvent` creada
- [x] Tablas creadas correctamente
- [x] Datos iniciales inserados
  - [x] 2 usuarios (superadmin, admin_norte)
  - [x] 2 sucursales (Matriz, Sucursal Norte)
  - [x] 0 productos (sin datos iniciales)

---

## 🔐 PRUEBAS DE AUTENTICACIÓN

### Prueba 1: Login con SuperAdmin
**Esperado:** Acceso exitoso al dashboard con permisos totales
- [ ] Usuario: `superadmin` 
- [ ] Contraseña: verificar en base de datos
- [ ] Token recibido correctamente
- [ ] Redirección al Dashboard
- [ ] Selector de sucursal visible

### Prueba 2: Login con Admin Regional
**Esperado:** Acceso a sucursal específica
- [ ] Usuario: `admin_norte`
- [ ] Acceso a datos de "Sucursal Norte"
- [ ] Sin acceso a configuración global

### Prueba 3: Token Expiration & Refresh
**Esperado:** Sistema maneja correctamente la expiración
- [ ] TempToken válido por 30 minutos
- [ ] FullToken válido por 8 horas
- [ ] Renovación automática de tokens

---

## 🏢 PRUEBAS DE SUCURSALES (ONLINE)

### Prueba 4: Listar Sucursales
**Esperado:** Mostrar todas las sucursales
- [ ] Endpoint: GET `/api/branches`
- [ ] Respuesta: JSON array con sucursales
- [ ] Datos visibles en Settings

### Prueba 5: Crear Nueva Sucursal
**Esperado:** Nueva sucursal agregada
- [ ] Acceso a formulario en Settings
- [ ] Completar: nombre, dirección
- [ ] Confirmación exitosa
- [ ] Sucursal aparece en lista

### Prueba 6: Editar Sucursal
**Esperado:** Cambios guardados
- [ ] Modificar nombre/dirección
- [ ] Guardar cambios
- [ ] Actualización visible

### Prueba 7: Eliminar Sucursal NO Matriz
**Esperado:** Eliminación exitosa
- [ ] Seleccionar sucursal (no la matriz)
- [ ] Confirmar eliminación
- [ ] Desaparece de lista

### Prueba 8: Intentar Eliminar Sucursal Matriz
**Esperado:** Mensaje de error
- [ ] Intentar eliminar Sucursal Matriz (ID=1)
- [ ] Mensaje: "No se puede eliminar la sucursal matriz porque es la sede principal..."
- [ ] Sucursal NO se elimina

---

## 📦 PRUEBAS DE INVENTARIO (ONLINE)

### Prueba 9: Crear Productos
**Esperado:** Productos registrados
- [ ] Ir a Inventario
- [ ] Crear producto: SKU, nombre, precio
- [ ] Verificar en tabla

### Prueba 10: Registrar Cantidad Inicial
**Esperado:** Stock actualizado
- [ ] Registrar cantidad inicial de producto
- [ ] Valor aparece en inventario

### Prueba 11: Ver Inventario por Sucursal
**Esperado:** Stock filtrado
- [ ] Cambiar de sucursal
- [ ] Inventario se actualiza

---

## 🚚 PRUEBAS DE MOVIMIENTOS (ONLINE)

### Prueba 12: Registrar Movimiento IN
**Esperado:** Entrada de inventario registrada
- [ ] Ir a Movimientos
- [ ] Tipo: IN
- [ ] Producto: seleccionar
- [ ] Cantidad: ingresar
- [ ] Razón: "Compra a proveedor"
- [ ] Guardar
- [ ] Stock aumenta

### Prueba 13: Registrar Movimiento OUT
**Esperado:** Salida de inventario registrada
- [ ] Tipo: OUT
- [ ] Cantidad: menor al stock disponible
- [ ] Guardar
- [ ] Stock disminuye

### Prueba 14: Registrar Movimiento ADJUSTMENT
**Esperado:** Ajuste de inventario
- [ ] Tipo: ADJUSTMENT
- [ ] Guardar
- [ ] Stock se ajusta correctamente

### Prueba 15: Ver Historial de Movimientos
**Esperado:** Lista con sincronización
- [ ] Tabla muestra todos los movimientos
- [ ] Estado de sincronización: "Sincronizado" (verde)
- [ ] Filtro por tipo funciona

---

## 🔄 PRUEBAS DE TRANSFERENCIAS (ONLINE)

### Prueba 16: Crear Transferencia
**Esperado:** Transferencia registrada
- [ ] Ir a Transferencias
- [ ] Origen: sucursal actual
- [ ] Destino: otra sucursal
- [ ] Agregar productos y cantidades
- [ ] Enviar solicitud
- [ ] Estatus: PENDING

### Prueba 17: Aprobar Transferencia (Destino)
**Esperado:** Cambio a IN_TRANSIT
- [ ] Cambiar a sucursal destino
- [ ] Buscar transferencia pendiente
- [ ] Click en "Aprobar"
- [ ] Estado: IN_TRANSIT

### Prueba 18: Completar Transferencia (Destino)
**Esperado:** Recepción y actualización de stock
- [ ] Click en "Completar"
- [ ] Estado: COMPLETED
- [ ] Inventario destino aumenta

### Prueba 19: Cancelar Transferencia (Origen)
**Esperado:** Cancelación solo desde origen
- [ ] Crear nueva transferencia
- [ ] Cancelar desde origen
- [ ] Estado: CANCELLED
- [ ] Stock origen se restaura

---

## 🔌 PRUEBAS OFFLINE

### Prueba 20: Desconectar Internet
**Esperado:** App indica estado offline
- [ ] Desactivar WiFi/conexión
- [ ] Indicador "Offline" visible en header
- [ ] Página sigue funcional con datos cacheados

### Prueba 21: Crear Movimiento Offline
**Esperado:** Movimiento guardado localmente
- [ ] En estado offline
- [ ] Ir a Movimientos
- [ ] Crear nuevo movimiento
- [ ] Estado: "Pendiente de sincronización" (naranja)
- [ ] Guardado en IndexedDB

### Prueba 22: Crear Transferencia Offline
**Esperado:** Transferencia guardada localmente
- [ ] Crear nueva transferencia
- [ ] Estado: "Pendiente" (naranja)

### Prueba 23: Reconectar Internet
**Esperado:** Sincronización automática
- [ ] Reactivar WiFi/conexión
- [ ] Indicador cambia a "Online" (verde)
- [ ] Movimientos/Transferencias syncan automáticamente
- [ ] Estado cambia a "Sincronizado" (verde)

### Prueba 24: Verificar Datos en Servidor
**Esperado:** Todos los datos sincronizados
- [ ] API devuelve movimientos creados offline
- [ ] API devuelve transferencias creadas offline
- [ ] Base de datos tiene todos los registros

---

## 📊 PRUEBAS DE REPORTES

### Prueba 25: Ver Reportes
**Esperado:** Gráficas y estadísticas
- [ ] Ir a Reportes
- [ ] Cargar datos por sucursal
- [ ] Mostrar gráficas

---

## 🔑 PRUEBAS DE PERMISOS

### Prueba 26: SuperAdmin - Acceso Total
**Esperado:** Acceso a todo
- [ ] Crear, editar, eliminar sucursales
- [ ] Crear usuarios
- [ ] Ver datos de todas las sucursales

### Prueba 27: Admin Regional - Acceso Limitado
**Esperado:** Solo datos de su sucursal
- [ ] No puede ver otras sucursales
- [ ] Puede crear movimientos/transferencias
- [ ] Puede aprobar/completar transferencias

### Prueba 28: Employee - Acceso Mínimo
**Esperado:** Solo lectura y movimientos básicos
- [ ] Ver inventario
- [ ] Registrar movimientos
- [ ] No puede crear usuarios

---

## ✅ VERIFICACIÓN FINAL

### Prueba 29: Base de Datos Consistente
**Esperado:** Datos correctos en BD
```sql
-- Verificar
SELECT COUNT(*) FROM users;           -- Debe haber 2+ usuarios
SELECT COUNT(*) FROM branches;        -- Debe haber 2+ sucursales  
SELECT COUNT(*) FROM products;        -- Debe haber 1+ productos
SELECT COUNT(*) FROM inventory;       -- Debe haber inventario
SELECT COUNT(*) FROM movements;       -- Debe haber movimientos
SELECT COUNT(*) FROM transfers;       -- Debe haber transferencias
```

### Prueba 30: Logs del Servidor
**Esperado:** Sin errores críticos
- [ ] Terminal del servidor sin errores
- [ ] Requests exitosos (200, 201, etc.)
- [ ] Sin errores de base de datos

---

## 🎯 RESUMEN

**Total de Pruebas:** 30
**Completadas:** ___/30
**Fallidas:** ___
**Pendientes:** ___

**Estado General:** [ ] TODO OK [ ] PROBLEMAS ENCONTRADOS

**Problemas Encontrados:**
```
(Listar aquí los problemas encontrados)
```

---

**Fecha de Pruebas:** 8 de diciembre de 2025
**Probador:** Usuario
**Versión del Sistema:** develop
