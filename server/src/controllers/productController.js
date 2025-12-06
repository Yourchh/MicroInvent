const Product = require('../models/productModel');
const pool = require('../config/db'); // <--- ESTA LÍNEA ES LA CLAVE

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    // Recibimos los datos del frontend
    const { sku, name, price, min_stock_alert, branch_id } = req.body;
    
    // 1. Validar si ya existe el SKU
    const existing = await Product.findBySku(sku);
    if (existing) return res.status(400).json({ message: 'SKU ya existe' });

    // 2. Crear el producto en la tabla 'products'
    const newProduct = await Product.create(sku, name, price, min_stock_alert);

    // 3. Crear el inventario inicial (stock 0) en la tabla 'inventory'
    // Si falla aquí, es donde se crea el "producto fantasma".
    if (branch_id) {
      await pool.query(
        'INSERT INTO inventory (branch_id, product_id, quantity) VALUES ($1, $2, 0)',
        [branch_id, newProduct.id]
      );
    }

    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Error creando producto:", err);
    res.status(500).json({ error: err.message });
  }
};