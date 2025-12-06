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
    const { username, password, role, branch_id } = req.body;

    // Validación básica
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const existing = await User.findByUsername(username);
    if (existing) return res.status(400).json({ message: 'El usuario ya existe' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = await User.create(username, hash, role, branch_id);
    res.status(201).json(newUser);
  } catch (err) {
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