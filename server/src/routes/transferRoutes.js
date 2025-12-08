const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Crear solicitud de transferencia
router.post('/', transferController.createTransfer);

// Obtener transferencias pendientes
router.get('/pending', transferController.getPendingTransfers);

// Obtener todas las transferencias
router.get('/', transferController.getTransfers);

// Obtener una transferencia específica
router.get('/:id', transferController.getTransfer);

// Aprobar transferencia (sucursal destino)
router.put('/:id/approve', transferController.approveTransfer);

// Completar transferencia (sucursal destino)
router.put('/:id/complete', transferController.completeTransfer);

// Cancelar transferencia (sucursal origen)
router.put('/:id/cancel', transferController.cancelTransfer);

module.exports = router;
