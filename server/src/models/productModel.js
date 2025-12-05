const pool = require('../config/db');

const Product = {
  findAll: async () => {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY name ASC');
    return rows;
  },
  findBySku: async (sku) => {
    const { rows } = await pool.query('SELECT * FROM products WHERE sku = $1', [sku]);
    return rows[0];
  },
  create: async (sku, name, price, minStock) => {
    const query = `
      INSERT INTO products (sku, name, price, min_stock_alert)
      VALUES ($1, $2, $3, $4) RETURNING *
    `;
    const { rows } = await pool.query(query, [sku, name, price, minStock]);
    return rows[0];
  }
};
module.exports = Product;