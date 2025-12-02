-- database/init.sql
CREATE TYPE role_type AS ENUM ('admin', 'manager', 'employee');
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
    branch_id INT REFERENCES branches(id),
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
    quantity INT DEFAULT 0 CHECK (quantity >= 0),
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

-- DATOS INICIALES
INSERT INTO branches (name) VALUES ('Matriz'), ('Sucursal Norte');