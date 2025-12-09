const pool = require('../config/db');

// Obtener el stock actual de una sucursal específica
const getInventoryByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    // --- CORRECCIÓN CRÍTICA ---
    // Agregamos 'p.id as product_id' para distinguir
    // entre el ID del inventario y el ID del producto real.
    const query = `
      SELECT 
        i.id as inventory_id,
        i.quantity,
        i.min_stock,
        i.max_stock,
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.price,
        p.min_stock_alert
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