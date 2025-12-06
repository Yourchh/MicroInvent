const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

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

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, branch_id: user.branch_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};