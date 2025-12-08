const pool = require('../config/db');

const Branch = {
  // --- BUSQUEDAS ---
  findById: async (id) => {
    const { rows } = await pool.query('SELECT * FROM branches WHERE id = $1', [id]);
    return rows[0];
  },

  findAll: async () => {
    const { rows } = await pool.query('SELECT * FROM branches ORDER BY id ASC');
    return rows;
  },

  findByName: async (name) => {
    const { rows } = await pool.query('SELECT * FROM branches WHERE name = $1', [name]);
    return rows[0];
  },

  // --- CREAR ---
  create: async (name, address = null) => {
    const query = `
      INSERT INTO branches (name, address)
      VALUES ($1, $2)
      RETURNING id, name, address
    `;
    const { rows } = await pool.query(query, [name, address]);
    return rows[0];
  },

  // --- EDITAR ---
  update: async (id, name, address) => {
    const query = `
      UPDATE branches 
      SET name = $1, address = $2
      WHERE id = $3
      RETURNING id, name, address
    `;
    const { rows } = await pool.query(query, [name, address, id]);
    return rows[0];
  },

  // --- ELIMINAR ---
  delete: async (id) => {
    const query = 'DELETE FROM branches WHERE id = $1 RETURNING id';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
};

module.exports = Branch;
