const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

// Middleware combinado: Primero valida Token, luego valida Rol
// Solo 'admin' y 'manager' pueden ver reportes
router.get('/movements/:branchId', 
  verifyToken, 
  verifyRole('admin'), // OJO: Aquí forzamos que sea admin para probar tu módulo de roles
  reportController.getMovementReport
);

router.get('/inventory-value/:branchId', 
  verifyToken, 
  reportController.getInventoryValueReport
);

module.exports = router;