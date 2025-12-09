-- database/init.sql
CREATE TYPE role_type AS ENUM ('superadmin', 'admin', 'employee');
CREATE TYPE transfer_status AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');
CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT');

-- MÓDULOS DE JORGE (Base + Auth + Inventario)
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role role_type DEFAULT 'employee',
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL, -- Nullable: superadmin no tiene sucursal, admin tiene sucursal específica, employee tiene sucursal asignada
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    min_stock_alert INT DEFAULT 5
);

CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branches(id),
    product_id INT REFERENCES products(id),
        quantity NUMERIC DEFAULT 0,
        min_stock NUMERIC DEFAULT 0,
        max_stock NUMERIC,
    version INT DEFAULT 1, -- Optimistic Locking
    UNIQUE(branch_id, product_id)
);

-- MÓDULOS DE ANGEL (Transferencias + Movimientos)
CREATE TABLE movements (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branches(id),
    product_id INT REFERENCES products(id),
    user_id INT REFERENCES users(id),
    type movement_type NOT NULL,
    quantity INT NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    source_branch_id INT REFERENCES branches(id),
    dest_branch_id INT REFERENCES branches(id),
    requester_user_id INT REFERENCES users(id),
    status transfer_status DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INT REFERENCES transfers(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL
);

-- TABLA DE SESIONES (Para validar una sesión activa por sucursal)
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, branch_id) -- Solo una sesión por usuario y sucursal
);

-- DATOS INICIALES
INSERT INTO branches (name) VALUES ('Matriz'), ('Sucursal Norte');