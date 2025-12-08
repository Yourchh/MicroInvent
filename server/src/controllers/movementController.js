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

    // Crear movimiento
    const movement = await Movement.create(
      branchId,
      product_id,
      userId,
      type,
      quantity,
      reason || null
    );

    // Actualizar inventario
    if (type === 'IN') {
      // Entrada (Compra)
      await InventoryModel.increment(branchId, product_id, quantity);
    } else if (type === 'OUT') {
      // Salida (Venta)
      await InventoryModel.decrement(branchId, product_id, quantity);
    } else if (type === 'ADJUSTMENT') {
      // Ajuste (puede ser positivo o negativo)
      const current = await InventoryModel.findById(branchId, product_id);
      const newQuantity = (current?.quantity || 0) + quantity;
      await InventoryModel.adjust(branchId, product_id, newQuantity);
    }

    console.log(`✅ Movimiento creado: ${type} de ${quantity} unidades del producto ${product_id}`);

    res.status(201).json({ 
      message: 'Movimiento registrado',
      movement 
    });
  } catch (err) {
    console.error('❌ Error en createMovement:', err);
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
