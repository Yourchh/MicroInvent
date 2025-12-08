const pool = require('../config/db');

const User = {
  // --- BUSQUEDAS ---
  findByUsername: async (username) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0];
  },
  
  findById: async (id) => { // <--- NUEVO
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
  },

  findAll: async () => {
    // Traemos datos seguros (sin password) y el nombre de la sucursal
    const query = `
      SELECT u.id, u.username, u.role, u.branch_id, b.name as branch_name, u.created_at
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      ORDER BY u.id ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  // --- VALIDACIONES ---
  branchExists: async (branchId) => {
    if (!branchId) return true; // Si no hay branch_id, es válido (puede ser NULL)
    const { rows } = await pool.query('SELECT id FROM branches WHERE id = $1', [branchId]);
    return rows.length > 0;
  },

  // --- CREAR ---
  create: async (username, passwordHash, role, branch_id) => {
    const query = `
      INSERT INTO users (username, password_hash, role, branch_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, role, branch_id
    `;
    const { rows } = await pool.query(query, [username, passwordHash, role, branch_id]);
    return rows[0];
  },

  // --- EDITAR (NUEVO: Permite cambiar todo) ---
  update: async (id, username, passwordHash, role, branch_id) => {
    const query = `
      UPDATE users 
      SET username = $1, password_hash = $2, role = $3, branch_id = $4
      WHERE id = $5
      RETURNING id, username, role, branch_id
    `;
    const { rows } = await pool.query(query, [username, passwordHash, role, branch_id, id]);
    return rows[0];
  },

  // --- MANTENER ESTE POR COMPATIBILIDAD (Opcional) ---
  updateRole: async (id, newRole) => {
    const query = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING id';
    const { rows } = await pool.query(query, [newRole, id]);
    return rows[0];
  },

  // --- ELIMINAR ---
  delete: async (id) => {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
};

module.exports = User;