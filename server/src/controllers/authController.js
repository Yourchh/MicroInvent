const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Branch = require('../models/branchModel');
const Session = require('../models/sessionModel');

exports.register = async (req, res) => {
  try {
    const { username, password, role, branch_id } = req.body;
    
    // Validar duplicados
    const existing = await User.findByUsername(username);
    if (existing) return res.status(400).json({ message: 'Usuario ya existe' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = await User.create(username, hash, role, branch_id);
    res.status(201).json({ message: 'Usuario creado', user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findByUsername(username);
    
    if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) return res.status(400).json({ message: 'Credenciales inválidas' });

    // Generar token temporal sin branch_id (para seleccionar sucursal después)
    const tempToken = jwt.sign({ id: user.id, role: user.role, temp: true }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    res.json({ 
      tempToken, 
      user: { id: user.id, username: user.username, role: user.role },
      requiresBranchSelection: true 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NUEVO: Seleccionar sucursal después del login
exports.selectBranch = async (req, res) => {
  try {
    const { branch_id, adminUsername, adminPassword } = req.body;
    const userId = req.user.id;

    console.log(`📍 Usuario ${userId} intentando seleccionar sucursal ${branch_id}`);

    // Validar que la sucursal existe
    const branch = await Branch.findById(branch_id);
    if (!branch) {
      return res.status(400).json({ message: 'La sucursal no existe' });
    }

    // Validar credenciales del admin
    const admin = await User.findByUsername(adminUsername);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Credenciales de administrador inválidas' });
    }

    const validAdminPass = await bcrypt.compare(adminPassword, admin.password_hash);
    if (!validAdminPass) {
      return res.status(403).json({ message: 'Credenciales de administrador inválidas' });
    }

    console.log(`✅ Admin verificado. Creando sesión para usuario ${userId} en sucursal ${branch_id}`);

    // Generar token definitivo con branch_id
    const token = jwt.sign(
      { id: userId, role: req.user.role, branch_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Crear/actualizar sesión
    const session = await Session.create(userId, branch_id, token);

    // Obtener datos del usuario
    const user = await User.findById(userId);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        branch_id,
        branch_name: branch.name
      },
      session
    });
  } catch (err) {
    console.error('❌ Error en selectBranch:', err);
    res.status(500).json({ error: err.message });
  }
};

// NUEVO: Logout (eliminar sesión)
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const branchId = req.user.branch_id;

    await Session.deleteByUserAndBranch(userId, branchId);
    console.log(`🚪 Sesión cerrada para usuario ${userId} en sucursal ${branchId}`);

    res.json({ message: 'Sesión cerrada' });
  } catch (err) {
    console.error('❌ Error en logout:', err);
    res.status(500).json({ error: err.message });
  }
};