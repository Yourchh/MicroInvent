const pool = require('../config/db'); //
const Product = require('../models/productModel'); //

exports.getAllProducts = async (req, res) => {
  try {
    const { branch_id } = req.query;
    
    if (branch_id) {
      // Obtener productos con stock de una sucursal específica
      const query = `
        SELECT 
          p.id, p.sku, p.name, p.price, p.min_stock_alert,
          COALESCE(i.quantity, 0) as quantity,
          COALESCE(i.version, 1) as version
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND i.branch_id = $1
        ORDER BY p.name ASC
      `;
      const { rows } = await pool.query(query, [branch_id]);
      return res.json(rows);
    }

    // Sin branch_id, obtener todos los productos
    const products = await Product.findAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  const client = await pool.connect(); // Usamos un cliente dedicado para la transacción

  try {
    const { sku, name, price, min_stock_alert, initial_stock = 0, min_stock = 0, max_stock = null } = req.body;

    // 1. Iniciar Transacción
    await client.query('BEGIN');

    // 2. Validar existencia (Bloqueante para evitar race conditions)
    const checkQuery = 'SELECT id FROM products WHERE sku = $1';
    const { rows: existing } = await client.query(checkQuery, [sku]);
    
    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'El SKU ya existe' });
    }

    // 3. Crear Producto Global
    const insertProductText = `
      INSERT INTO products (sku, name, price, min_stock_alert)
      VALUES ($1, $2, $3, $4) RETURNING *
    `;
    const { rows: productRows } = await client.query(insertProductText, [sku, name, price, min_stock_alert]);
    const newProduct = productRows[0];

    // 4. Obtener Sucursales Activas
    const { rows: branches } = await client.query('SELECT id FROM branches');

    if (branches.length === 0) {
      // Advertencia si no hay sucursales
      console.warn('⚠️ Se creó un producto pero no existen sucursales para asignarle inventario.');
    }

    // 5. Inicializar Inventario para cada sucursal (stock aislado por sucursal)
    // Si el creador pertenece a una sucursal, solo esa sucursal recibe el stock inicial; las demás quedan en 0
    const creatorBranchId = req.user?.branch_id;
    for (const branch of branches) {
      const qtyForBranch = creatorBranchId && branch.id === creatorBranchId ? initial_stock : 0;
      const insertInventoryText = `
        INSERT INTO inventory (branch_id, product_id, quantity, min_stock, max_stock) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(insertInventoryText, [branch.id, newProduct.id, qtyForBranch, min_stock, max_stock]);
    }

    // 6. Confirmar Transacción
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Producto creado e inventario inicializado correctamente',
      product: newProduct
    });

  } catch (err) {
    // Si algo falla, deshacemos todo
    await client.query('ROLLBACK');
    console.error('Error en createProduct:', err);
    res.status(500).json({ error: 'Error al procesar la creación del producto: ' + err.message });
  } finally {
    client.release(); // Liberar el cliente de vuelta al pool
  }
};

// --- NUEVA FUNCIÓN: ACTUALIZAR ---
exports.updateProduct = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { sku, name, price, min_stock_alert, min_stock, max_stock, quantity, branch_id } = req.body;
    await client.query('BEGIN');

    const query = `
      UPDATE products 
      SET sku = $1, name = $2, price = $3, min_stock_alert = $4
      WHERE id = $5 RETURNING *
    `;
    const { rows } = await client.query(query, [sku, name, price, min_stock_alert, id]);

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Actualizar inventario de la sucursal (si se envía branch_id)
    if (branch_id) {
      const invQuery = `
        UPDATE inventory
        SET quantity = COALESCE($1, quantity),
            min_stock = COALESCE($2, min_stock),
            max_stock = COALESCE($3, max_stock),
            version = version + 1
        WHERE branch_id = $4 AND product_id = $5
      `;
      await client.query(invQuery, [quantity, min_stock, max_stock, branch_id, id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Producto actualizado', product: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// --- NUEVA FUNCIÓN: ELIMINAR ---
exports.deleteProduct = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // 1. Primero borramos el inventario asociado (integridad referencial)
    await client.query('DELETE FROM inventory WHERE product_id = $1', [id]);

    // 2. Luego borramos el producto
    const { rowCount } = await client.query('DELETE FROM products WHERE id = $1', [id]);

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    // Código 23503 es violación de llave foránea (ej. si tiene movimientos históricos)
    if (err.code === '23503') {
      return res.status(400).json({ message: 'No se puede eliminar: El producto tiene historial de movimientos.' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};