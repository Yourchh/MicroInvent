const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET - Obtener todas las sucursales (sin autenticación, para combobox)
router.get('/', branchController.getBranches);

// GET - Obtener todas las sucursales con autenticación (duplicado por compatibilidad)
router.get('/public', verifyToken, branchController.getBranches);

// GET - Obtener sucursal por ID (Protegida)
router.get('/:id', verifyToken, branchController.getBranch);

// POST - Crear sucursal (Protegida, solo admin)
router.post('/', verifyToken, branchController.createBranch);

// PUT - Actualizar sucursal (Protegida, solo admin)
router.put('/:id', verifyToken, branchController.updateBranch);

// DELETE - Eliminar sucursal (Protegida, solo admin)
router.delete('/:id', verifyToken, branchController.deleteBranch);

module.exports = router;