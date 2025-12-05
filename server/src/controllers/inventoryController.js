const pool = require('../config/db');

// Obtener el stock actual de una sucursal específica
const getInventoryByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    // Consulta con JOIN para traer nombre del producto y SKU
    // Solo trae productos que tengan registro en esa sucursal
    const query = `
      SELECT 
        i.id,
        i.quantity,
        p.name as product_name,
        p.sku,
        p.price
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.branch_id = $1
      ORDER BY p.name ASC
    `;

    const { rows } = await pool.query(query, [branchId]);
    
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener inventario' });
  }
};

module.exports = { getInventoryByBranch };