const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Ruta protegida: Ver inventario de una sucursal
// GET /api/inventory/1
router.get('/:branchId', verifyToken, inventoryController.getInventoryByBranch);

module.exports = router;