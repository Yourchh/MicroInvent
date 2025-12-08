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
    const { username, password, userType } = req.body; // userType: 'employee' o 'admin'
    
    console.log(`🔐 Intento de login: ${username} como ${userType}`);
    
    const user = await User.findByUsername(username);
    
    if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) return res.status(400).json({ message: 'Credenciales inválidas' });

    // EMPLEADO: Login directo (ya tiene sucursal asignada)
    if (userType === 'employee') {
      if (user.role !== 'employee') {
        return res.status(403).json({ message: 'Este usuario no es un empleado. Use login de administrador.' });
      }
      
      if (!user.branch_id) {
        return res.status(400).json({ message: 'Empleado sin sucursal asignada. Contacte al administrador.' });
      }

      // Obtener nombre de sucursal
      const branch = await Branch.findById(user.branch_id);

      // Generar token con branch_id
      const token = jwt.sign(
        { id: user.id, role: user.role, branch_id: user.branch_id },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Crear sesión
      await Session.create(user.id, user.branch_id, token);

      console.log(`✅ Empleado ${username} logueado en sucursal ${branch.name}`);

      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          branch_id: user.branch_id,
          branch_name: branch.name
        }
      });
    }

    // ADMIN/SUPERADMIN: Necesita seleccionar sucursal
    if (userType === 'admin') {
      if (user.role === 'employee') {
        return res.status(403).json({ message: 'Este usuario es un empleado. Use login de empleado.' });
      }

      // Generar token temporal para seleccionar sucursal
      const tempToken = jwt.sign(
        { id: user.id, role: user.role, branch_id: user.branch_id, temp: true },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );

      console.log(`🔑 Admin/SuperAdmin ${username} requiere seleccionar sucursal`);

      return res.json({ 
        tempToken, 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          assigned_branch_id: user.branch_id // Para admin, es su sucursal permitida
        },
        requiresBranchSelection: true 
      });
    }

    return res.status(400).json({ message: 'Tipo de usuario no válido. Use "employee" o "admin".' });
  } catch (err) {
    console.error('❌ Error en login:', err);
    res.status(500).json({ error: err.message });
  }
};

// Seleccionar sucursal después del login (solo para admin/superadmin)
exports.selectBranch = async (req, res) => {
  try {
    const { branch_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userAssignedBranch = req.user.branch_id;

    console.log(`📍 Usuario ${userId} (${userRole}) intentando seleccionar sucursal ${branch_id}`);

    // Validar que la sucursal existe
    const branch = await Branch.findById(branch_id);
    if (!branch) {
      return res.status(400).json({ message: 'La sucursal no existe' });
    }

    // Validar permisos según rol
    if (userRole === 'admin') {
      // Admin solo puede seleccionar su sucursal asignada
      if (userAssignedBranch !== branch_id) {
        return res.status(403).json({ 
          message: `Como administrador, solo puedes acceder a tu sucursal asignada.`,
          allowedBranchId: userAssignedBranch
        });
      }
    } else if (userRole !== 'superadmin') {
      // Solo superadmin y admin pueden usar este endpoint
      return res.status(403).json({ message: 'No tienes permisos para seleccionar sucursal' });
    }

    console.log(`✅ Permisos validados. Creando sesión para usuario ${userId} en sucursal ${branch_id}`);

    // Generar token definitivo con branch_id
    const token = jwt.sign(
      { id: userId, role: userRole, branch_id },
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