const Branch = require('../models/branchModel');

// OBTENER TODAS LAS SUCURSALES
exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll();
    res.json(branches);
  } catch (err) {
    console.error('❌ Error obteniendo sucursales:', err);
    res.status(500).json({ error: err.message });
  }
};

// OBTENER UNA SUCURSAL POR ID
exports.getBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }
    res.json(branch);
  } catch (err) {
    console.error('❌ Error obteniendo sucursal:', err);
    res.status(500).json({ error: err.message });
  }
};

// CREAR NUEVA SUCURSAL
exports.createBranch = async (req, res) => {
  try {
    console.log('📥 Recibiendo petición CREATE BRANCH:', req.body);
    const { name, address } = req.body;

    // Validar que el usuario es admin o superadmin
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Solo administradores pueden crear sucursales' });
    }

    // Validación básica
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre de la sucursal es obligatorio' });
    }

    // Verificar duplicados
    const existing = await Branch.findByName(name);
    if (existing) {
      return res.status(400).json({ message: 'La sucursal ya existe' });
    }

    const newBranch = await Branch.create(name, address || null);
    console.log('✅ Sucursal creada exitosamente:', newBranch);
    res.status(201).json(newBranch);
  } catch (err) {
    console.error('❌ Error en createBranch:', err);
    res.status(500).json({ error: err.message });
  }
};

// ACTUALIZAR SUCURSAL
exports.updateBranch = async (req, res) => {
  try {
    console.log('📝 Recibiendo petición UPDATE BRANCH:', req.body);
    const { id } = req.params;
    const { name, address } = req.body;

    // Validar que el usuario es admin o superadmin
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Solo administradores pueden editar sucursales' });
    }

    // Validación básica
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre de la sucursal es obligatorio' });
    }

    // Verificar que existe
    const existing = await Branch.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    const updated = await Branch.update(id, name, address || null);
    console.log('✅ Sucursal actualizada:', updated);
    res.json(updated);
  } catch (err) {
    console.error('❌ Error en updateBranch:', err);
    res.status(500).json({ error: err.message });
  }
};

// ELIMINAR SUCURSAL
exports.deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el usuario es admin o superadmin
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Solo administradores pueden eliminar sucursales' });
    }

    // No permitir eliminar la sucursal matriz (id = 1)
    if (parseInt(id) === 1) {
      return res.status(400).json({ 
        message: 'No se puede eliminar la sucursal matriz porque es la sede principal del sistema y contiene usuarios y datos críticos. Esta sucursal es fundamental para el funcionamiento del aplicativo.' 
      });
    }

    const existing = await Branch.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    await Branch.delete(id);
    console.log('✅ Sucursal eliminada:', id);
    res.json({ message: 'Sucursal eliminada', id });
  } catch (err) {
    console.error('❌ Error en deleteBranch:', err);
    res.status(500).json({ error: err.message });
  }
};

// EXPORTAR FUNCIÓN HEREDADA PARA COMPATIBILIDAD
const getAllBranches = async (req, res) => {
  return exports.getBranches(req, res);
};

module.exports = { getAllBranches, ...exports };