const pool = require('../config/db');

const Inventory = {
  getByBranch: async (branchId) => {
    const query = `
      SELECT 
        i.id, i.branch_id, i.product_id, i.quantity, i.version,
        i.min_stock, i.max_stock,
        p.sku, p.name, p.price, p.min_stock_alert
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.branch_id = $1
      ORDER BY p.name ASC
    `;
    const { rows } = await pool.query(query, [branchId]);
    return rows;
  },

  findById: async (branchId, productId) => {
    const query = `
      SELECT 
        i.id, i.branch_id, i.product_id, i.quantity, i.version,
        i.min_stock, i.max_stock,
        p.sku, p.name, p.price, p.min_stock_alert
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.branch_id = $1 AND i.product_id = $2
    `;
    const { rows } = await pool.query(query, [branchId, productId]);
    return rows[0];
  },

  // Incrementar cantidad (compras, transferencias de entrada)
  increment: async (branchId, productId, quantity) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Verificar si existe el registro
      const existing = await client.query(
        'SELECT id, quantity, version FROM inventory WHERE branch_id = $1 AND product_id = $2 FOR UPDATE',
        [branchId, productId]
      );

      let result;
      if (existing.rows.length === 0) {
        // Crear nuevo registro
        const query = `
          INSERT INTO inventory (branch_id, product_id, quantity, version, min_stock, max_stock)
          VALUES ($1, $2, $3, 1, 0, NULL)
          RETURNING *
        `;
        result = await client.query(query, [branchId, productId, quantity]);
      } else {
        // Actualizar cantidad
        const currentRow = existing.rows[0];
        const query = `
          UPDATE inventory 
          SET quantity = quantity + $1, version = version + 1
          WHERE branch_id = $2 AND product_id = $3 AND version = $4
          RETURNING *
        `;
        result = await client.query(query, [quantity, branchId, productId, currentRow.version]);
        
        if (result.rowCount === 0) {
          throw new Error('Versión de inventario conflictiva (optimistic locking)');
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Decrementar cantidad (ventas, transferencias de salida)
  decrement: async (branchId, productId, quantity) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Verificar disponibilidad
      const check = await client.query(
        'SELECT quantity, version FROM inventory WHERE branch_id = $1 AND product_id = $2 FOR UPDATE',
        [branchId, productId]
      );

      if (check.rows.length === 0 || check.rows[0].quantity < quantity) {
        throw new Error('Error, El stock actual no puede surtir esa venta/salida');
      }

      const currentRow = check.rows[0];
      const query = `
        UPDATE inventory 
        SET quantity = quantity - $1, version = version + 1
        WHERE branch_id = $2 AND product_id = $3 AND version = $4
        RETURNING *
      `;
      const result = await client.query(query, [quantity, branchId, productId, currentRow.version]);
      
      if (result.rowCount === 0) {
        throw new Error('Versión de inventario conflictiva (optimistic locking)');
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Ajustar cantidad directamente (mermas, correcciones)
  adjust: async (branchId, productId, newQuantity) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (newQuantity < 0) {
        throw new Error('La cantidad no puede ser negativa');
      }

      const existing = await client.query(
        'SELECT id, version FROM inventory WHERE branch_id = $1 AND product_id = $2 FOR UPDATE',
        [branchId, productId]
      );

      let result;
      if (existing.rows.length === 0) {
        const query = `
          INSERT INTO inventory (branch_id, product_id, quantity, version, min_stock, max_stock)
          VALUES ($1, $2, $3, 1, 0, NULL)
          RETURNING *
        `;
        result = await client.query(query, [branchId, productId, newQuantity]);
      } else {
        const currentRow = existing.rows[0];
        const query = `
          UPDATE inventory 
          SET quantity = $1, version = version + 1
          WHERE branch_id = $2 AND product_id = $3 AND version = $4
          RETURNING *
        `;
        result = await client.query(query, [newQuantity, branchId, productId, currentRow.version]);
        
        if (result.rowCount === 0) {
          throw new Error('Versión de inventario conflictiva (optimistic locking)');
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Crear o actualizar (para transferencias)
  createOrUpdate: async (branchId, productId, quantity) => {
    const query = `
          INSERT INTO inventory (branch_id, product_id, quantity, version, min_stock, max_stock)
          VALUES ($1, $2, $3, 1, 0, NULL)
      ON CONFLICT (branch_id, product_id)
      DO UPDATE SET quantity = EXCLUDED.quantity, version = version + 1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [branchId, productId, quantity]);
    return rows[0];
  }
};

module.exports = Inventory;
