const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET - Obtener todas las sucursales (sin autenticación, para login)
router.get('/public', branchController.getBranches);

// GET - Obtener todas las sucursales (Protegida)
router.get('/', verifyToken, branchController.getBranches);

// GET - Obtener sucursal por ID (Protegida)
router.get('/:id', verifyToken, branchController.getBranch);

// POST - Crear sucursal (Protegida, solo admin)
router.post('/', verifyToken, branchController.createBranch);

// PUT - Actualizar sucursal (Protegida, solo admin)
router.put('/:id', verifyToken, branchController.updateBranch);

// DELETE - Eliminar sucursal (Protegida, solo admin)
router.delete('/:id', verifyToken, branchController.deleteBranch);

// Mantener compatibilidad con getAllBranches
router.get('/', verifyToken, branchController.getAllBranches);

module.exports = router;