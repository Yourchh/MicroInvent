const pool = require('../config/db'); //
const Product = require('../models/productModel'); //

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  const client = await pool.connect(); // Usamos un cliente dedicado para la transacción

  try {
    const { sku, name, price, min_stock_alert } = req.body;

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

    // 5. Inicializar Inventario (Stock 0) para cada sucursal
    for (const branch of branches) {
      const insertInventoryText = `
        INSERT INTO inventory (branch_id, product_id, quantity) 
        VALUES ($1, $2, 0)
      `;
      await client.query(insertInventoryText, [branch.id, newProduct.id]);
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