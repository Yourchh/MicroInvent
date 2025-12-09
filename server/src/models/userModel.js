const pool = require('../config/db');

const User = {
  findByUsername: async (username) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0];
  },
  
  findById: async (id) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
  },

  findAll: async () => {
    const query = `
      SELECT u.id, u.username, u.role, u.branch_id, b.name as branch_name, u.created_at
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      ORDER BY u.id ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  findByBranch: async (branchId) => {
    const query = `
      SELECT u.id, u.username, u.role, u.branch_id, b.name as branch_name, u.created_at
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.branch_id = $1
      ORDER BY u.id ASC
    `;
    const { rows } = await pool.query(query, [branchId]);
    return rows;
  },

  isSuperAdmin: (user) => {
    return user && user.role === 'superadmin';
  },

  isAdmin: (user) => {
    return user && (user.role === 'admin' || user.role === 'superadmin');
  },

  isEmployee: (user) => {
    return user && user.role === 'employee';
  },

  canManageBranch: (user, branchId) => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    if (user.role === 'admin') return user.branch_id === branchId;
    return false;
  },

  branchExists: async (branchId) => {
    if (!branchId) return true;
    const { rows } = await pool.query('SELECT id FROM branches WHERE id = $1', [branchId]);
    return rows.length > 0;
  },

  create: async (username, passwordHash, role, branch_id) => {
    const query = `
      INSERT INTO users (username, password_hash, role, branch_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, role, branch_id
    `;
    const { rows } = await pool.query(query, [username, passwordHash, role, branch_id]);
    return rows[0];
  },

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

  updateRole: async (id, newRole) => {
    const query = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING id';
    const { rows } = await pool.query(query, [newRole, id]);
    return rows[0];
  },

  delete: async (id) => {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
};

module.exports = User;