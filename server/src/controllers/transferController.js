const Transfer = require('../models/transferModel');
const InventoryModel = require('../models/inventoryModel');

// Crear solicitud de transferencia
exports.createTransfer = async (req, res) => {
  try {
    const { dest_branch_id, items, transfer_type = 'REQUEST' } = req.body;
    const sourceBranchId = req.user.branch_id;
    const requesterUserId = req.user.id;

    // Validar datos
    if (!dest_branch_id) {
      return res.status(400).json({ message: 'Debe especificar la sucursal destino' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Debe incluir al menos un producto' });
    }

    if (sourceBranchId === dest_branch_id) {
      return res.status(400).json({ message: 'No puedes transferir a la misma sucursal' });
    }

    // Para SEND: validar que hay stock suficiente en la sucursal origen
    // Para REQUEST: no validamos stock aquí, se valida al aprobar
    if (transfer_type === 'SEND') {
      for (const item of items) {
        const inventory = await InventoryModel.findById(sourceBranchId, item.product_id);
        if (!inventory || inventory.quantity < item.quantity) {
          return res.status(400).json({ 
            message: `Stock insuficiente del producto ${item.product_id}. Disponible: ${inventory?.quantity || 0}` 
          });
        }
      }
    }

    // Crear transferencia
    const transfer = await Transfer.create(
      sourceBranchId,
      dest_branch_id,
      requesterUserId,
      items,
      transfer_type
    );

    console.log(`✅ Transferencia ${transfer_type} creada: ${transfer.id} desde sucursal ${sourceBranchId}`);

    res.status(201).json({
      message: 'Solicitud de transferencia creada',
      transfer
    });
  } catch (err) {
    console.error('❌ Error en createTransfer:', err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener transferencias pendientes
exports.getPendingTransfers = async (req, res) => {
  try {
    const branchId = req.user.branch_id;

    const transfers = await Transfer.getPending(branchId);

    res.json({
      count: transfers.length,
      transfers
    });
  } catch (err) {
    console.error('❌ Error en getPendingTransfers:', err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener todas las transferencias de una sucursal
exports.getTransfers = async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    const { status, direction } = req.query;

    const transfers = await Transfer.getByBranch(branchId, status || null, direction || null);

    res.json({
      count: transfers.length,
      transfers
    });
  } catch (err) {
    console.error('❌ Error en getTransfers:', err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener una transferencia específica
exports.getTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transferencia no encontrada' });
    }

    // Verificar permisos
    if (transfer.source_branch_id !== req.user.branch_id && 
        transfer.dest_branch_id !== req.user.branch_id && 
        req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'No tienes permiso para ver esta transferencia' });
    }

    res.json(transfer);
  } catch (err) {
    console.error('❌ Error en getTransfer:', err);
    res.status(500).json({ error: err.message });
  }
};

// Aprobar transferencia (solo para sucursal destino)
exports.approveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch_id;

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transferencia no encontrada' });
    }

    // Solo la sucursal destino puede aprobar
    if (transfer.dest_branch_id !== branchId) {
      return res.status(403).json({ message: 'Solo la sucursal destino puede aprobar la transferencia' });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({ message: 'La transferencia no puede ser aprobada en este estado' });
    }

    // Validar que la sucursal origen tiene stock suficiente para TODOS los productos
    for (const item of transfer.items) {
      const inventory = await InventoryModel.findById(transfer.source_branch_id, item.product_id);
      if (!inventory || inventory.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Stock insuficiente en sucursal origen. Producto: ${item.product_name}, Disponible: ${inventory?.quantity || 0}, Solicitado: ${item.quantity}` 
        });
      }
    }

    // Aprobar y descontar stock de la sucursal origen
    const approved = await Transfer.approve(id);

    console.log(`✅ Transferencia ${id} aprobada y stock descontado de sucursal origen`);

    res.json({
      message: 'Transferencia aprobada y stock reservado',
      transfer: approved
    });
  } catch (err) {
    console.error('❌ Error en approveTransfer:', err);
    res.status(500).json({ error: err.message });
  }
};

// Completar transferencia (confirmar recepción)
exports.completeTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch_id;

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transferencia no encontrada' });
    }

    // Solo la sucursal destino puede completar
    if (transfer.dest_branch_id !== branchId) {
      return res.status(403).json({ message: 'Solo la sucursal destino puede completar la transferencia' });
    }

    if (transfer.status !== 'IN_TRANSIT') {
      return res.status(400).json({ message: 'La transferencia no está en tránsito' });
    }

    const completed = await Transfer.complete(id);

    console.log(`✅ Transferencia ${id} completada. Stock movido exitosamente`);

    res.json({
      message: 'Transferencia completada',
      transfer: completed
    });
  } catch (err) {
    console.error('❌ Error en completeTransfer:', err);
    res.status(500).json({ error: err.message });
  }
};

// Cancelar transferencia
exports.cancelTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch_id;

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transferencia no encontrada' });
    }

    // Solo la sucursal origen puede cancelar
    if (transfer.source_branch_id !== branchId) {
      return res.status(403).json({ message: 'Solo la sucursal origen puede cancelar la transferencia' });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({ message: 'Solo se pueden cancelar transferencias pendientes' });
    }

    const cancelled = await Transfer.cancel(id);

    console.log(`✅ Transferencia ${id} cancelada`);

    res.json({
      message: 'Transferencia cancelada',
      transfer: cancelled
    });
  } catch (err) {
    console.error('❌ Error en cancelTransfer:', err);
    res.status(500).json({ error: err.message });
  }
};
