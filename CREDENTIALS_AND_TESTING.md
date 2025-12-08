# 🔐 CREDENCIALES DE ACCESO PARA PRUEBAS

## Usuarios Disponibles

### 1. SuperAdmin (Acceso Total)
```
Usuario:      superadmin
Contraseña:   123456
Rol:          superadmin
Sucursal:     (Sin sucursal - acceso a todas)
Permisos:     Crear/editar/eliminar sucursales, usuarios, ver todo
```

### 2. Admin Regional
```
Usuario:      admin_norte
Contraseña:   123456
Rol:          admin
Sucursal:     Sucursal Norte (ID: 2)
Permisos:     Gestionar datos de su sucursal, crear movimientos/transferencias
```

---

## 🏢 Sucursales Disponibles

| ID | Nombre | Dirección | Estado |
|---|---|---|---|
| 1 | Sucursal Matriz | - | Protegida (no se puede eliminar) |
| 2 | Sucursal Norte | - | Disponible |

---

## 📋 Plan de Pruebas Recomendado

### Fase 1: Autenticación & Navegación (5 min)
1. Acceder con **superadmin / 123456**
2. Verificar dashboard cargue correctamente
3. Ver selector de sucursal
4. Desconectar y probar con **admin_norte / 123456**

### Fase 2: Gestión de Sucursales (10 min)
1. Con superadmin, crear nueva sucursal "Sucursal Centro"
2. Editar la sucursal (cambiar dirección)
3. Intentar eliminar la Sucursal Matriz (debe mostrar error)
4. Eliminar la nueva sucursal

### Fase 3: Inventario (15 min)
1. Crear productos: 
   - SKU: PROD001, Nombre: "Laptop", Precio: 999.99
   - SKU: PROD002, Nombre: "Mouse", Precio: 29.99
2. Registrar cantidad inicial (50 laptops, 100 mouses)
3. Cambiar de sucursal y ver que el inventario cambia

### Fase 4: Movimientos (15 min)
1. Registrar movimiento IN: +10 unidades de Mouse
2. Registrar movimiento OUT: -5 unidades de Mouse
3. Registrar movimiento ADJUSTMENT
4. Verificar stock actualizado
5. Ver historial con estado "Sincronizado"

### Fase 5: Transferencias (15 min)
1. Crear transferencia: 
   - Desde Matriz a Norte
   - 10 Laptops
2. Cambiar a sucursal Norte
3. Aprobar la transferencia
4. Completar la transferencia
5. Verificar inventario de ambas sucursales

### Fase 6: Modo Offline (20 min)
1. Desactivar WiFi/Internet
2. Crear movimiento offline (debe mostrar "Pendiente")
3. Crear transferencia offline
4. Reactivar Internet
5. Verificar que se sincronizan automáticamente

---

## 🔗 URLs Importantes

- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:3000/api
- **Base de Datos:** psql -U yorch microinvent

---

## ✅ Verificación Rápida de Estado

```bash
# Ver estado de PostgreSQL
brew services list | grep postgres

# Ver usuarios
psql -U yorch microinvent -c "SELECT username, role FROM users;"

# Ver sucursales
psql -U yorch microinvent -c "SELECT id, name FROM branches;"

# Ver productos
psql -U yorch microinvent -c "SELECT sku, name, price FROM products;"

# Ver movimientos
psql -U yorch microinvent -c "SELECT COUNT(*) FROM movements;"

# Ver transferencias
psql -U yorch microinvent -c "SELECT COUNT(*) FROM transfers;"
```

---

**Sistema Listo para Pruebas: ✅**
- PostgreSQL: Corriendo
- Backend: http://localhost:3000
- Frontend: http://localhost:5174
- Base de Datos: Inicializada
- Usuarios: 2 (superadmin, admin_norte)
- Sucursales: 2 (Matriz, Sucursal Norte)
