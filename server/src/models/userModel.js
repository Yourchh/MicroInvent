const pool = require('../config/db');

const User = {
  findByUsername: async (username) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0];
  },
  create: async (username, passwordHash, role, branch_Id) => {
    const query = `
      INSERT INTO users (username, password_hash, role, branch_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, role, branch_id
    `;
    const { rows } = await pool.query(query, [username, passwordHash, role, branch_Id]);
    return rows[0];
  }
};
module.exports = User;