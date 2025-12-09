const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

exports.getUsers = async (req, res) => {
  try {
    const currentUser = req.user;

    if (currentUser.role === 'superadmin') {
      const users = await User.findAll();
      return res.json(users);
    }

    if (currentUser.role === 'admin') {
      const users = await User.findByBranch(currentUser.branch_id);
      const filtered = users.filter(u => ['employee', 'manager'].includes(u.role));
      return res.json(filtered);
    }

    if (currentUser.role === 'manager') {
      const users = await User.findByBranch(currentUser.branch_id);
      const filtered = users.filter(u => u.role === 'employee');
      return res.json(filtered);
    }

    res.status(403).json({ message: 'No tienes permiso para ver usuarios' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    console.log('📥 Recibiendo petición CREATE USER:', req.body);
    const { username, password, role, branch_id } = req.body;
    const creatorUser = req.user;

    if (!username || !password || !role) {
      console.log('❌ Validación fallida - Datos:', { username, password: password ? 'EXISTS' : 'MISSING', role, branch_id });
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    if (creatorUser.role === 'employee') {
      return res.status(403).json({ message: 'Los empleados no tienen permiso para crear usuarios' });
    }

    if (creatorUser.role === 'admin') {
      if (!['employee', 'manager'].includes(role)) {
        return res.status(403).json({ message: 'Como admin, solo puedes crear empleados y gerentes. Para crear admins contacta al superadmin.' });
      }
      
      if (!branch_id) {
        return res.status(400).json({ message: 'Los empleados y gerentes deben tener una sucursal asignada' });
      }
      
      if (branch_id !== creatorUser.branch_id) {
        return res.status(403).json({ message: 'Como admin, solo puedes crear empleados y gerentes de tu sucursal asignada' });
      }
    }

    if (creatorUser.role === 'manager') {
      if (role !== 'employee') {
        return res.status(403).json({ message: 'Como gerente, solo puedes crear empleados. Para crear otros tipos de usuarios contacta al admin de tu sucursal.' });
      }
      
      if (!branch_id) {
        return res.status(400).json({ message: 'Los empleados deben tener una sucursal asignada' });
      }
      
      if (branch_id !== creatorUser.branch_id) {
        return res.status(403).json({ message: 'Como gerente, solo puedes crear empleados de tu sucursal asignada' });
      }
    }

    if (creatorUser.role === 'superadmin') {
      if (role === 'admin' && !branch_id) {
        return res.status(400).json({ message: 'Los administradores deben tener una sucursal asignada' });
      }
      
      if ((role === 'employee' || role === 'manager') && !branch_id) {
        return res.status(400).json({ message: 'Los empleados y gerentes deben tener una sucursal asignada' });
      }

      if (role === 'superadmin' && branch_id) {
        return res.status(400).json({ message: 'Los superadmins no deben tener sucursal asignada' });
      }
    }

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

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, branch_id } = req.body;
    const editorUser = req.user;

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (targetUser.role === 'admin' && editorUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'Solo el SuperAdmin puede editar administradores' });
    }

    if (parseInt(id) === editorUser.id && editorUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'No puedes editar tu propio usuario' });
    }

    if (editorUser.role === 'admin') {
      if (targetUser.branch_id !== editorUser.branch_id) {
        return res.status(403).json({ message: 'Solo puedes editar usuarios de tu sucursal' });
      }
      
      // Admin solo puede editar empleados y gerentes
      if (!['employee', 'manager'].includes(targetUser.role)) {
        return res.status(403).json({ message: 'Solo puedes editar empleados y gerentes' });
      }
      
      // Admin SÍ puede cambiar entre employee y manager, pero no a otros roles
      if (role && !['employee', 'manager'].includes(role)) {
        return res.status(403).json({ message: 'Solo puedes cambiar entre empleado y gerente' });
      }
      
      if (branch_id && branch_id !== editorUser.branch_id) {
        return res.status(403).json({ message: 'No puedes mover usuarios a otra sucursal' });
      }
    }

    if (editorUser.role === 'manager') {
      return res.status(403).json({ message: 'Los gerentes no tienen permiso para editar usuarios' });
    }

    let passwordHash = targetUser.password_hash;
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    let finalRole = targetUser.role;
    if (role) {
      if (editorUser.role === 'superadmin') {
        finalRole = role;
      } else if (editorUser.role === 'admin' && ['employee', 'manager'].includes(role)) {
        finalRole = role;
      }
    }
    
    const finalBranchId = editorUser.role === 'superadmin' ? (branch_id !== undefined ? branch_id : targetUser.branch_id) : targetUser.branch_id;
    
    const updatedUser = await User.update(id, username, passwordHash, finalRole, finalBranchId);
    console.log(`✅ Usuario actualizado por ${editorUser.role} ${editorUser.username}:`, updatedUser);
    res.json(updatedUser);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deleterUser = req.user;

    if (parseInt(id) === deleterUser.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }
    
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (targetUser.role === 'admin' && deleterUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'Solo el SuperAdmin puede eliminar administradores' });
    }

    if (deleterUser.role === 'admin') {
      if (targetUser.branch_id !== deleterUser.branch_id) {
        return res.status(403).json({ message: 'Solo puedes eliminar usuarios de tu sucursal' });
      }
      
      if (!['employee', 'manager'].includes(targetUser.role)) {
        return res.status(403).json({ message: 'Solo puedes eliminar empleados y gerentes' });
      }
    }

    if (deleterUser.role === 'manager') {
      return res.status(403).json({ message: 'Los gerentes no tienen permiso para eliminar usuarios' });
    }
    
    await User.delete(id);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;
