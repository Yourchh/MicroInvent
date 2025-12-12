const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

// Solo el ADMIN puede entrar aquí
router.use(verifyToken, verifyRole('admin'));

// Ruta de peligro: Borrado total
router.delete('/reset-system', adminController.resetDatabase);

module.exports = router;