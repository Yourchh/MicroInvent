const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Rutas protegidas por el Middleware
router.get('/', verifyToken, productController.getAllProducts);
router.post('/', verifyToken, productController.createProduct);

module.exports = router;