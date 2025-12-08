const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREAR USUARIO
exports.createUser = async (req, res) => {
  try {
    console.log('📥 Recibiendo petición CREATE USER:', req.body);
    const { username, password, role, branch_id } = req.body;
    const creatorUser = req.user; // Usuario que está creando (de authMiddleware)

    // Validación básica
    if (!username || !password || !role) {
      console.log('❌ Validación fallida - Datos:', { username, password: password ? 'EXISTS' : 'MISSING', role, branch_id });
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    // VALIDACIONES DE PERMISOS SEGÚN ROL
    if (creatorUser.role === 'employee') {
      // Empleados NO pueden crear usuarios
      return res.status(403).json({ message: 'Los empleados no tienen permiso para crear usuarios' });
    }

    if (creatorUser.role === 'admin') {
      // Admin solo puede crear empleados de su sucursal
      if (role !== 'employee') {
        return res.status(403).json({ message: 'Como admin, solo puedes crear empleados. Para crear admins contacta al superadmin.' });
      }
      
      if (!branch_id) {
        return res.status(400).json({ message: 'Los empleados deben tener una sucursal asignada' });
      }
      
      if (branch_id !== creatorUser.branch_id) {
        return res.status(403).json({ message: 'Como admin, solo puedes crear empleados de tu sucursal asignada' });
      }
    }

    if (creatorUser.role === 'superadmin') {
      // SuperAdmin puede crear todo pero con validaciones
      if (role === 'admin' && !branch_id) {
        return res.status(400).json({ message: 'Los administradores deben tener una sucursal asignada' });
      }
      
      if (role === 'employee' && !branch_id) {
        return res.status(400).json({ message: 'Los empleados deben tener una sucursal asignada' });
      }

      if (role === 'superadmin' && branch_id) {
        return res.status(400).json({ message: 'Los superadmins no deben tener sucursal asignada' });
      }
    }

    // Validar que branch_id existe
    if (branch_id) {
      const branchExists = await User.branchExists(branch_id);
      if (!branchExists) {
        console.log('❌ Branch no existe:', branch_id);
        return res.status(400).json({ message: `La sucursal con ID ${branch_id} no existe. Por favor, seleccione una sucursal válida.` });
      }
    }

    const existing = await User.findByUsername(username);
    if (existing) {
      console.log('❌ Usuario ya existe:', username);
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = await User.create(username, hash, role, branch_id);
    console.log(`✅ Usuario creado por ${creatorUser.role} ${creatorUser.username}:`, newUser);
    res.status(201).json(newUser);
  } catch (err) {
    console.error('❌ Error en createUser:', err);
    res.status(500).json({ error: err.message });
  }
};

// EDITAR USUARIO COMPLETO
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, branch_id } = req.body;

    // 1. Buscar usuario actual
    const currentUser = await User.findById(id);
    if (!currentUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    // 2. Si envían contraseña nueva, la encriptamos. Si no, mantenemos la actual.
    let passwordHash = currentUser.password_hash;
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    // 3. Actualizar
    const updatedUser = await User.update(id, username, passwordHash, role, branch_id);
    res.json(updatedUser);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }
    await User.delete(id);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};