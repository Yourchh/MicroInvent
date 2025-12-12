const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

router.use(verifyToken, verifyRole('admin')); // Todo protegido para admin

router.get('/', userController.getUsers);
router.post('/', userController.createUser);      // <--- Crear
router.put('/:id', userController.updateUser);    // <--- Editar completo
router.delete('/:id', userController.deleteUser); // <--- Eliminar

module.exports = router;