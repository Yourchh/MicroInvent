const Product = require('../models/productModel');
const pool = require('../config/db');

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
    const { sku, name, price, min_stock_alert, branch_id } = req.body; // Recibimos branch_id
    
    const existing = await Product.findBySku(sku);
    if (existing) return res.status(400).json({ message: 'SKU ya existe' });

    // 1. Crear el producto en el catálogo global
    const newProduct = await Product.create(sku, name, price, min_stock_alert);

    // 2. Inicializar inventario en 0 para la sucursal actual (si se envió branch_id)
    if (branch_id) {
      await pool.query(
        'INSERT INTO inventory (branch_id, product_id, quantity) VALUES ($1, $2, 0)',
        [branch_id, newProduct.id]
      );
    }

    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};