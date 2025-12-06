const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Ruta GET /api/branches (Protegida con token)
router.get('/', verifyToken, branchController.getAllBranches);

module.exports = router;