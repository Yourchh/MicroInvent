const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middlewares/authMiddleware');

// Endpoint simple para listar sucursales
router.get('/', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM branches ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;