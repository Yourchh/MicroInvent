const pool = require('../config/db');

const getAllBranches = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM branches ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener sucursales' });
  }
};

module.exports = { getAllBranches };