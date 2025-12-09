const Movement = require('../models/movementModel');
const InventoryModel = require('../models/inventoryModel');
const Product = require('../models/productModel');

// Crear movimiento (Compra, Venta, Merma, Ajuste)
exports.createMovement = async (req, res) => {
  try {
    const { product_id, type, quantity, reason } = req.body;
    const userId = req.user.id;
    const branchId = req.user.branch_id;

    // Validar tipo de movimiento
    const validTypes = ['IN', 'OUT', 'ADJUSTMENT'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `Tipo de movimiento inválido. Use: ${validTypes.join(', ')}` });
    }

    // Validar cantidad
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'La cantidad debe ser mayor a 0' });
    }

    // Validar que el producto existe
    const product = await Product.findAll();
    const found = product.find(p => p.id === product_id);
    if (!found) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Procesar según tipo, asegurando que si falla inventario no se registra el movimiento
    let updatedInventory = null;
    let movement = null;

    if (type === 'IN') {
      updatedInventory = await InventoryModel.increment(branchId, product_id, quantity);
      movement = await Movement.create(branchId, product_id, userId, type, quantity, reason || null);
    } else if (type === 'OUT') {
      // Validar stock suficiente para salida
      const current = await InventoryModel.findById(branchId, product_id);
      const currentQty = current?.quantity || 0;
      console.log(`🔍 Validando stock para producto ${product_id}: disponible=${currentQty}, solicitado=${quantity}`);
      if (currentQty < quantity) {
        console.log(`❌ Stock insuficiente detectado`);
        return res.status(400).json({ message: 'Error, El stock actual no puede surtir esa venta/salida' });
      }
      // El decrement también valida, pero si pasa la primera validación debería funcionar
      console.log(`✅ Stock suficiente, procediendo con decrement`);
      updatedInventory = await InventoryModel.decrement(branchId, product_id, quantity);
      movement = await Movement.create(branchId, product_id, userId, type, quantity, reason || null);
    } else if (type === 'ADJUSTMENT') {
      const current = await InventoryModel.findById(branchId, product_id);
      const newQuantity = (current?.quantity || 0) + quantity;
      if (newQuantity < 0) {
        return res.status(400).json({ message: 'Error, El stock actual no puede surtir esa venta/salida' });
      }
      updatedInventory = await InventoryModel.adjust(branchId, product_id, newQuantity);
      movement = await Movement.create(branchId, product_id, userId, type, quantity, reason || null);
    }

    console.log(`✅ Movimiento creado: ${type} de ${quantity} unidades del producto ${product_id}`);

    res.status(201).json({ 
      message: 'Movimiento registrado',
      movement,
      inventory: updatedInventory
    });
  } catch (err) {
    console.error('❌ Error en createMovement:', err);
    // Verificar si es error de stock insuficiente
    if (err.message?.includes('Stock insuficiente') || err.message?.includes('stock actual no puede surtir')) {
      return res.status(400).json({ message: 'Error, El stock actual no puede surtir esa venta/salida' });
    }
    res.status(500).json({ error: err.message });
  }
};

// Obtener movimientos de la sucursal del usuario
exports.getMovements = async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    const { limit = 100, offset = 0 } = req.query;

    const movements = await Movement.getByBranch(branchId, parseInt(limit), parseInt(offset));

    res.json({
      count: movements.length,
      movements
    });
  } catch (err) {
    console.error('❌ Error en getMovements:', err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener movimientos por tipo
exports.getMovementsByType = async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    const { type } = req.params;
    const { limit = 100 } = req.query;

    const validTypes = ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `Tipo inválido. Válidos: ${validTypes.join(', ')}` });
    }

    const movements = await Movement.getByType(branchId, type, parseInt(limit));

    res.json({
      type,
      count: movements.length,
      movements
    });
  } catch (err) {
    console.error('❌ Error en getMovementsByType:', err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener un movimiento específico
exports.getMovement = async (req, res) => {
  try {
    const { id } = req.params;

    const movement = await Movement.findById(id);
    if (!movement) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    // Verificar que pertenece a la sucursal del usuario
    if (movement.branch_id !== req.user.branch_id && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'No tienes permiso para ver este movimiento' });
    }

    res.json(movement);
  } catch (err) {
    console.error('❌ Error en getMovement:', err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener resumen de movimientos (para reportes)
exports.getMovementsSummary = async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    const { start_date, end_date } = req.query;

    const summary = await Movement.getSummaryByType(
      branchId,
      start_date || null,
      end_date || null
    );

    res.json({
      branch_id: branchId,
      period: { start_date, end_date },
      summary
    });
  } catch (err) {
    console.error('❌ Error en getMovementsSummary:', err);
    res.status(500).json({ error: err.message });
  }
};
