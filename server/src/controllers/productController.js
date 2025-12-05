const Product = require('../models/productModel');

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
    const { sku, name, price, min_stock_alert } = req.body;
    
    const existing = await Product.findBySku(sku);
    if (existing) return res.status(400).json({ message: 'SKU ya existe' });

    const newProduct = await Product.create(sku, name, price, min_stock_alert);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};