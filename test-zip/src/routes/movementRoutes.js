const express = require('express');
const router = express.Router();
const movementController = require('../controllers/movementController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Crear movimiento (Compra, Venta, Merma, Ajuste)
router.post('/', movementController.createMovement);

// Obtener movimientos de la sucursal
router.get('/', movementController.getMovements);

// Obtener movimientos por tipo
router.get('/type/:type', movementController.getMovementsByType);

// Obtener resumen de movimientos
router.get('/summary', movementController.getMovementsSummary);

// Obtener un movimiento específico
router.get('/:id', movementController.getMovement);

module.exports = router;
