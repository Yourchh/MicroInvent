const pool = require('../config/db');

const Movement = {
  // Crear movimiento de inventario
  create: async (branchId, productId, userId, type, quantity, reason = null) => {
    const query = `
      INSERT INTO movements (branch_id, product_id, user_id, type, quantity, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [branchId, productId, userId, type, quantity, reason]);
    return rows[0];
  },

  // Obtener movimientos de una sucursal
  getByBranch: async (branchId, limit = 100, offset = 0) => {
    const query = `
      SELECT 
        m.id,
        m.branch_id,
        m.product_id,
        p.sku,
        p.name as product_name,
        m.user_id,
        u.username,
        m.type,
        m.quantity,
        m.reason,
        m.created_at
      FROM movements m
      JOIN products p ON m.product_id = p.id
      JOIN users u ON m.user_id = u.id
      WHERE m.branch_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await pool.query(query, [branchId, limit, offset]);
    return rows;
  },

  // Obtener movimientos por tipo
  getByType: async (branchId, type, limit = 100) => {
    const query = `
      SELECT 
        m.id,
        m.branch_id,
        m.product_id,
        p.sku,
        p.name as product_name,
        m.user_id,
        u.username,
        m.type,
        m.quantity,
        m.reason,
        m.created_at
      FROM movements m
      JOIN products p ON m.product_id = p.id
      JOIN users u ON m.user_id = u.id
      WHERE m.branch_id = $1 AND m.type = $2
      ORDER BY m.created_at DESC
      LIMIT $3
    `;
    const { rows } = await pool.query(query, [branchId, type, limit]);
    return rows;
  },

  // Obtener un movimiento
  findById: async (id) => {
    const query = `
      SELECT 
        m.id,
        m.branch_id,
        m.product_id,
        p.sku,
        p.name as product_name,
        m.user_id,
        u.username,
        m.type,
        m.quantity,
        m.reason,
        m.created_at
      FROM movements m
      JOIN products p ON m.product_id = p.id
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // Obtener resumen de movimientos por tipo (para reportes)
  getSummaryByType: async (branchId, startDate = null, endDate = null) => {
    let query = `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM movements
      WHERE branch_id = $1
    `;
    const params = [branchId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` GROUP BY type ORDER BY type`;

    const { rows } = await pool.query(query, params);
    return rows;
  }
};

module.exports = Movement;
