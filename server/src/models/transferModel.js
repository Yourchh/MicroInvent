const pool = require('../config/db');

const Transfer = {
  // Crear solicitud de transferencia
  create: async (sourceBranchId, destBranchId, requesterUserId, items) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Crear transferencia
      const transferQuery = `
        INSERT INTO transfers (source_branch_id, dest_branch_id, requester_user_id, status)
        VALUES ($1, $2, $3, 'PENDING')
        RETURNING *
      `;
      const { rows: [transfer] } = await client.query(transferQuery, [sourceBranchId, destBranchId, requesterUserId]);

      // Insertar items
      for (const item of items) {
        const itemQuery = `
          INSERT INTO transfer_items (transfer_id, product_id, quantity)
          VALUES ($1, $2, $3)
        `;
        await client.query(itemQuery, [transfer.id, item.product_id, item.quantity]);
      }

      await client.query('COMMIT');
      return transfer;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Obtener transferencias pendientes
  getPending: async (branchId) => {
    const query = `
      SELECT 
        t.id,
        t.source_branch_id,
        sb.name as source_branch,
        t.dest_branch_id,
        db.name as dest_branch,
        t.requester_user_id,
        u.username as requester,
        t.status,
        t.created_at,
        COALESCE(json_agg(json_build_object(
          'id', ti.id,
          'product_id', ti.product_id,
          'product_name', p.name,
          'sku', p.sku,
          'quantity', ti.quantity
        )), '[]') as items
      FROM transfers t
      JOIN branches sb ON t.source_branch_id = sb.id
      JOIN branches db ON t.dest_branch_id = db.id
      JOIN users u ON t.requester_user_id = u.id
      LEFT JOIN transfer_items ti ON t.id = ti.transfer_id
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE t.status = 'PENDING' AND (t.source_branch_id = $1 OR t.dest_branch_id = $1)
      GROUP BY t.id, sb.name, db.name, u.username
      ORDER BY t.created_at DESC
    `;
    const { rows } = await pool.query(query, [branchId]);
    return rows;
  },

  // Obtener todas las transferencias de una sucursal
  getByBranch: async (branchId, status = null) => {
    let query = `
      SELECT 
        t.id,
        t.source_branch_id,
        sb.name as source_branch,
        t.dest_branch_id,
        db.name as dest_branch,
        t.requester_user_id,
        u.username as requester,
        t.status,
        t.created_at,
        COALESCE(json_agg(json_build_object(
          'id', ti.id,
          'product_id', ti.product_id,
          'product_name', p.name,
          'sku', p.sku,
          'quantity', ti.quantity
        )), '[]') as items
      FROM transfers t
      JOIN branches sb ON t.source_branch_id = sb.id
      JOIN branches db ON t.dest_branch_id = db.id
      JOIN users u ON t.requester_user_id = u.id
      LEFT JOIN transfer_items ti ON t.id = ti.transfer_id
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE t.source_branch_id = $1 OR t.dest_branch_id = $1
    `;
    const params = [branchId];

    if (status) {
      query += ` AND t.status = $2`;
      params.push(status);
    }

    query += ` GROUP BY t.id, sb.name, db.name, u.username ORDER BY t.created_at DESC`;

    const { rows } = await pool.query(query, params);
    return rows;
  },

  // Obtener una transferencia específica
  findById: async (id) => {
    const query = `
      SELECT 
        t.id,
        t.source_branch_id,
        sb.name as source_branch,
        t.dest_branch_id,
        db.name as dest_branch,
        t.requester_user_id,
        u.username as requester,
        t.status,
        t.created_at,
        COALESCE(json_agg(json_build_object(
          'id', ti.id,
          'product_id', ti.product_id,
          'product_name', p.name,
          'sku', p.sku,
          'quantity', ti.quantity
        )), '[]') as items
      FROM transfers t
      JOIN branches sb ON t.source_branch_id = sb.id
      JOIN branches db ON t.dest_branch_id = db.id
      JOIN users u ON t.requester_user_id = u.id
      LEFT JOIN transfer_items ti ON t.id = ti.transfer_id
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE t.id = $1
      GROUP BY t.id, sb.name, db.name, u.username
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // Actualizar estado de transferencia
  updateStatus: async (id, newStatus) => {
    const query = `
      UPDATE transfers
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [newStatus, id]);
    return rows[0];
  },

  // Aprobar transferencia (solo en sucursal destino)
  approve: async (transferId, client = null) => {
    const useClient = client || pool;
    const query = `
      UPDATE transfers
      SET status = 'IN_TRANSIT'
      WHERE id = $1 AND status = 'PENDING'
      RETURNING *
    `;
    const { rows } = await useClient.query(query, [transferId]);
    return rows[0];
  },

  // Completar transferencia (movimiento real del stock)
  complete: async (transferId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener transferencia
      const transfer = await Transfer.findById(transferId);
      if (!transfer) throw new Error('Transferencia no encontrada');
      if (transfer.status !== 'IN_TRANSIT') throw new Error('Transferencia no está en tránsito');

      // Por cada item, descontar de origen y agregar a destino
      for (const item of transfer.items) {
        // Descontar de origen
        await client.query(`
          UPDATE inventory 
          SET quantity = quantity - $1
          WHERE branch_id = $2 AND product_id = $3 AND quantity >= $1
        `, [item.quantity, transfer.source_branch_id, item.product_id]);

        // Agregar a destino
        await client.query(`
          INSERT INTO inventory (branch_id, product_id, quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT (branch_id, product_id) DO UPDATE
          SET quantity = inventory.quantity + $3
        `, [transfer.dest_branch_id, item.product_id, item.quantity]);
      }

      // Actualizar estado
      const updateQuery = `
        UPDATE transfers
        SET status = 'COMPLETED'
        WHERE id = $1
        RETURNING *
      `;
      const { rows } = await client.query(updateQuery, [transferId]);

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Cancelar transferencia
  cancel: async (transferId) => {
    const query = `
      UPDATE transfers
      SET status = 'CANCELLED'
      WHERE id = $1 AND status = 'PENDING'
      RETURNING *
    `;
    const { rows } = await pool.query(query, [transferId]);
    return rows[0];
  }
};

module.exports = Transfer;
