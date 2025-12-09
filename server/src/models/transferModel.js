const pool = require('../config/db');

const Transfer = {
  // Crear solicitud de transferencia
  create: async (sourceBranchId, destBranchId, requesterUserId, items, transferType = 'REQUEST') => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Crear transferencia
      const transferQuery = `
        INSERT INTO transfers (source_branch_id, dest_branch_id, requester_user_id, transfer_type, status)
        VALUES ($1, $2, $3, $4, 'PENDING')
        RETURNING *
      `;
      const { rows: [transfer] } = await client.query(transferQuery, [sourceBranchId, destBranchId, requesterUserId, transferType]);

      // Insertar items
      const itemsData = [];
      for (const item of items) {
        const itemQuery = `
          INSERT INTO transfer_items (transfer_id, product_id, quantity)
          VALUES ($1, $2, $3)
          RETURNING id, transfer_id, product_id, quantity
        `;
        const { rows: [insertedItem] } = await client.query(itemQuery, [transfer.id, item.product_id, item.quantity]);
        
        // Obtener producto info
        const productQuery = `
          SELECT name, sku FROM products WHERE id = $1
        `;
        const { rows: [product] } = await client.query(productQuery, [item.product_id]);
        
        itemsData.push({
          ...insertedItem,
          product_name: product?.name,
          sku: product?.sku
        });
      }

      await client.query('COMMIT');
      
      // Retornar transfer con items
      return {
        ...transfer,
        items: itemsData
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Obtener transferencias pendientes (solo para la sucursal que debe aprobar)
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
        t.transfer_type,
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
      WHERE t.status = 'PENDING' AND t.dest_branch_id = $1
      GROUP BY t.id, sb.name, db.name, u.username, t.transfer_type
      ORDER BY t.created_at DESC
    `;
    const { rows } = await pool.query(query, [branchId]);
    return rows;
  },

  // Obtener todas las transferencias de una sucursal
  getByBranch: async (branchId, status = null, direction = null) => {
    let query = `
      SELECT 
        t.id,
        t.source_branch_id,
        sb.name as source_branch,
        t.dest_branch_id,
        db.name as dest_branch,
        t.requester_user_id,
        u.username as requester_username,
        t.transfer_type,
        t.status,
        t.created_at,
        COALESCE(json_agg(json_build_object(
          'id', ti.id,
          'product_id', ti.product_id,
          'product_name', p.name,
          'sku', p.sku,
          'quantity', ti.quantity
        )) FILTER (WHERE ti.id IS NOT NULL), '[]') as items
      FROM transfers t
      JOIN branches sb ON t.source_branch_id = sb.id
      JOIN branches db ON t.dest_branch_id = db.id
      JOIN users u ON t.requester_user_id = u.id
      LEFT JOIN transfer_items ti ON t.id = ti.transfer_id
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Filtro de dirección: mostrar todas (enviadas o recibidas)
    query += ` AND (t.source_branch_id = $${paramIndex} OR t.dest_branch_id = $${paramIndex})`;
    params.push(branchId);
    paramIndex++;

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` GROUP BY t.id, sb.name, db.name, u.username, t.transfer_type ORDER BY t.created_at DESC`;

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
        t.transfer_type,
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
      GROUP BY t.id, sb.name, db.name, u.username, t.transfer_type
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

  // Aprobar transferencia (descontar stock de origen)
  approve: async (transferId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener transferencia
      const transfer = await Transfer.findById(transferId);
      if (!transfer) throw new Error('Transferencia no encontrada');
      if (transfer.status !== 'PENDING') throw new Error('Transferencia no está pendiente');

      // Descontar stock de la sucursal origen
      for (const item of transfer.items) {
        const result = await client.query(`
          UPDATE inventory 
          SET quantity = quantity - $1, version = version + 1
          WHERE branch_id = $2 AND product_id = $3 AND quantity >= $1
          RETURNING *
        `, [item.quantity, transfer.source_branch_id, item.product_id]);

        if (result.rowCount === 0) {
          throw new Error(`Stock insuficiente para producto ${item.product_name}`);
        }
      }

      // Actualizar estado a IN_TRANSIT
      const updateQuery = `
        UPDATE transfers
        SET status = 'IN_TRANSIT'
        WHERE id = $1 AND status = 'PENDING'
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

  // Completar transferencia (agregar stock a destino)
  complete: async (transferId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener transferencia
      const transfer = await Transfer.findById(transferId);
      if (!transfer) throw new Error('Transferencia no encontrada');
      if (transfer.status !== 'IN_TRANSIT') throw new Error('Transferencia no está en tránsito');

      // Agregar stock a la sucursal destino
      for (const item of transfer.items) {
        await client.query(`
          INSERT INTO inventory (branch_id, product_id, quantity, min_stock, max_stock, version)
          VALUES ($1, $2, $3, 0, NULL, 1)
          ON CONFLICT (branch_id, product_id) DO UPDATE
          SET quantity = inventory.quantity + $3, version = inventory.version + 1
        `, [transfer.dest_branch_id, item.product_id, item.quantity]);
      }

      // Actualizar estado a COMPLETED
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
  },

  // Rechazar transferencia
  reject: async (transferId) => {
    const query = `
      UPDATE transfers
      SET status = 'REJECTED'
      WHERE id = $1 AND status = 'PENDING'
      RETURNING *
    `;
    const { rows } = await pool.query(query, [transferId]);
    return rows[0];
  }
};

module.exports = Transfer;
