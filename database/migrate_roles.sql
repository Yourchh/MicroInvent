-- Migración para agregar superadmin y actualizar roles
-- Este script actualiza la BD existente sin borrar datos

-- 1. Agregar 'superadmin' al tipo role_type
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'superadmin';

-- 2. Eliminar restricción NOT NULL de branch_id en users (si existe)
ALTER TABLE users ALTER COLUMN branch_id DROP NOT NULL;

-- 3. Crear superadmin (password: super123)
INSERT INTO users (username, password_hash, role, branch_id)
VALUES ('superadmin', '$2b$10$zp26ZtrroI56ZLoUzbuTdO8ovrTmIuCTyPVR/K9BvwTE68pX2MA2e', 'superadmin', NULL)
ON CONFLICT (username) DO NOTHING;

-- 4. Actualizar usuario 'admin' existente para que sea admin de Matriz (branch_id = 1)
UPDATE users 
SET role = 'admin', branch_id = 1
WHERE username = 'admin';

-- 5. Crear admin para Sucursal Norte (password: admin123)
INSERT INTO users (username, password_hash, role, branch_id)
VALUES ('admin_norte', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 2)
ON CONFLICT (username) DO NOTHING;

-- 6. Actualizar employee1 para que esté asignado a Matriz
UPDATE users 
SET role = 'employee', branch_id = 1
WHERE username = 'employee1';

-- Verificar cambios
SELECT u.id, u.username, u.role, u.branch_id, b.name as branch_name
FROM users u
LEFT JOIN branches b ON u.branch_id = b.id
ORDER BY 
    CASE u.role 
        WHEN 'superadmin' THEN 1 
        WHEN 'admin' THEN 2 
        WHEN 'employee' THEN 3 
    END,
    u.id;
