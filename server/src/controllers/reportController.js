const pool = require('../config/db');

// REPORTE 1: Historial de Movimientos (Filtrado por sucursal)
const getMovementReport = async (req, res) => {
  try {
    const { branchId } = req.params;
    const user = req.user;
    
    // Validar permisos: No-superadmin solo ve su rama
    if (user.role !== 'superadmin' && user.branch_id !== Number(branchId)) {
      return res.status(403).json({ message: 'No tienes permiso para ver reportes de otra sucursal' });
    }
    
    // Traemos datos del movimiento + nombre del producto + nombre del usuario
    const query = `
      SELECT 
        m.id,
        m.type,       -- IN, OUT
        m.quantity,
        m.reason,
        m.created_at,
        p.name as product_name,
        p.sku,
        u.username as performed_by
      FROM movements m
      JOIN products p ON m.product_id = p.id
      JOIN users u ON m.user_id = u.id
      WHERE m.branch_id = $1
      ORDER BY m.created_at DESC
      LIMIT 50
    `;

    const { rows } = await pool.query(query, [branchId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar reporte de movimientos' });
  }
};

// REPORTE 2: Inventario Valorado (Stock actual con precio total)
const getInventoryValueReport = async (req, res) => {
  try {
    const { branchId } = req.params;
    const user = req.user;
    
    // Validar permisos: No-superadmin solo ve su rama
    if (user.role !== 'superadmin' && user.branch_id !== Number(branchId)) {
      return res.status(403).json({ message: 'No tienes permiso para ver reportes de otra sucursal' });
    }

    // Calculamos el valor total (Precio * Cantidad)
    const query = `
      SELECT 
        p.sku,
        p.name,
        i.quantity,
        p.price,
        (i.quantity * p.price) as total_value
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.branch_id = $1
      ORDER BY total_value DESC
    `;

    const { rows } = await pool.query(query, [branchId]);
    
    // Opcional: Calcular el gran total de la sucursal
    const grandTotal = rows.reduce((acc, item) => acc + Number(item.total_value), 0);
    
    res.json({
      summary: {
        total_items: rows.length,
        total_branch_value: grandTotal
      },
      details: rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar reporte de inventario' });
  }
};

module.exports = { getMovementReport, getInventoryValueReport };