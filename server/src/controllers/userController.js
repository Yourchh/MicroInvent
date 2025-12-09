const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

exports.getUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    
    // SuperAdmin ve todos los usuarios
    if (currentUser.role === 'superadmin') {
      const users = await User.findAll();
      return res.json(users);
    }
    
    // Admin ve solo empleados y gerentes de su sucursal (NO otros admins)
    if (currentUser.role === 'admin') {
      const users = await User.findByBranch(currentUser.branch_id);
      // Filtrar: solo employees y managers de su sucursal
      const filtered = users.filter(u => ['employee', 'manager'].includes(u.role));
      return res.json(filtered);
    }
    
    // Gerente ve solo empleados de su sucursal
    if (currentUser.role === 'manager') {
      const users = await User.findByBranch(currentUser.branch_id);
      // Filtrar: solo employees de su sucursal
      const filtered = users.filter(u => u.role === 'employee');
      return res.json(filtered);
    }
    
    // Empleados no tienen acceso
    res.status(403).json({ message: 'No tienes permiso para ver usuarios' });
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
      // Admin puede crear empleados y gerentes de su sucursal
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
      // Gerente solo puede crear empleados de su sucursal
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
      // SuperAdmin puede crear todo pero con validaciones
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
    const editorUser = req.user;

    // 1. Buscar usuario a editar
    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    // 2. Solo SuperAdmin puede editar Admins
    if (targetUser.role === 'admin' && editorUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'Solo el SuperAdmin puede editar administradores' });
    }

    // 3. Nadie puede editar su propio usuario (excepto SuperAdmin)
    if (parseInt(id) === editorUser.id && editorUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'No puedes editar tu propio usuario' });
    }

    // 4. Admin puede editar empleados y gerentes de su sucursal
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

    // 5. Gerente no puede editar nada
    if (editorUser.role === 'manager') {
      return res.status(403).json({ message: 'Los gerentes no tienen permiso para editar usuarios' });
    }

    // 6. Si envían contraseña nueva, la encriptamos. Si no, mantenemos la actual.
    let passwordHash = targetUser.password_hash;
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    // 7. Actualizar (respetando restricciones)
    // SuperAdmin: puede cambiar a cualquier rol
    // Admin: puede cambiar solo entre employee y manager
    // Manager: no puede cambiar nada
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
    
    // No puede eliminarse a sí mismo
    if (parseInt(id) === deleterUser.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }
    
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Solo SuperAdmin puede eliminar Admins
    if (targetUser.role === 'admin' && deleterUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'Solo el SuperAdmin puede eliminar administradores' });
    }

    // Admin puede eliminar empleados y gerentes de su sucursal
    if (deleterUser.role === 'admin') {
      if (targetUser.branch_id !== deleterUser.branch_id) {
        return res.status(403).json({ message: 'Solo puedes eliminar usuarios de tu sucursal' });
      }
      
      if (!['employee', 'manager'].includes(targetUser.role)) {
        return res.status(403).json({ message: 'Solo puedes eliminar empleados y gerentes' });
      }
    }
    
    // Gerente no puede eliminar nada
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
