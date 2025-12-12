const Transfer = require('../models/transferModel');
const InventoryModel = require('../models/inventoryModel');

// Crear solicitud de transferencia (REQUEST o SEND)
exports.createTransfer = async (req, res) => {
  try {
    const { dest_branch_id, items, transfer_type = 'REQUEST' } = req.body;
    const currentBranchId = req.user.branch_id;
    const requesterUserId = req.user.id;

    console.log('📨 createTransfer - Datos recibidos:', {
      dest_branch_id,
      transfer_type,
      items,
      currentBranchId,
      requesterUserId
    });

    // Validar datos
    if (!dest_branch_id) {
      return res.status(400).json({ message: 'Debe especificar la sucursal destino' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Debe incluir al menos un producto' });
    }

    if (currentBranchId === dest_branch_id) {
      return res.status(400).json({ message: 'No puedes transferir a la misma sucursal' });
    }

    // Determinar source y dest según el tipo de transferencia
    let sourceBranchId, destBranchId;
    
    if (transfer_type === 'REQUEST') {
      // REQUEST: Yo (currentBranch) solicito a otra sucursal (dest_branch_id)
      // → El stock vendrá DE dest_branch_id (source) HACIA mí (dest)
      sourceBranchId = dest_branch_id;  // Quien tiene el stock
      destBranchId = currentBranchId;   // Quien lo recibirá (yo)
    } else {
      // SEND: Yo (currentBranch) envío a otra sucursal (dest_branch_id)
      // → El stock saldrá DE mí (source) HACIA dest_branch_id (dest)
      sourceBranchId = currentBranchId; // Quien envía (yo)
      destBranchId = dest_branch_id;    // Quien recibirá
    }

    // Para SEND: validar que YO tengo stock suficiente
    // Para REQUEST: validar que la OTRA sucursal tiene stock (en approve)
    if (transfer_type === 'SEND') {
      for (const item of items) {
        const inventory = await InventoryModel.findById(currentBranchId, item.product_id);
        if (!inventory || inventory.quantity < item.quantity) {
          return res.status(400).json({ 
            message: `Stock insuficiente del producto ${item.product_id}. Disponible: ${inventory?.quantity || 0}` 
          });
        }
      }
    }

    // Crear transferencia con source/dest correctos
    const transfer = await Transfer.create(
      sourceBranchId,
      destBranchId,
      requesterUserId,
      items,
      transfer_type
    );

    console.log(`✅ Transferencia ${transfer_type} creada: ${transfer.id} | Source: ${sourceBranchId} → Dest: ${destBranchId}`);

    res.status(201).json({
      message: 'Solicitud de transferencia creada',
      transfer
    });
  } catch (err) {
    console.error('❌ Error en createTransfer:', err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener transferencias pendientes (solo para la sucursal que debe aprobar)
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
    const { status } = req.query;
    const isSuperAdmin = req.user.role === 'superadmin';

    let transfers;
    
    if (isSuperAdmin) {
      // Superadmin ve TODAS las transferencias
      transfers = await Transfer.getAll(status || null);
    } else {
      // Admin/User ve solo las de su sucursal
      transfers = await Transfer.getByBranch(branchId, status || null);
    }

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

// Aprobar transferencia
// REQUEST: Aprueba el source (quien tiene el stock)
// SEND: Aprueba el dest (quien recibe el stock)
// Esto descuenta el stock de la sucursal origen
exports.approveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch_id;

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transferencia no encontrada' });
    }

    console.log(`📋 approveTransfer - Transfer #${id}:`, {
      transfer_type: transfer.transfer_type,
      source_branch_id: transfer.source_branch_id,
      dest_branch_id: transfer.dest_branch_id,
      currentBranchId: branchId
    });

    // Validar permisos según el tipo de transferencia
    if (transfer.transfer_type === 'REQUEST') {
      // REQUEST: Solo la sucursal source (quien tiene el stock) puede aprobar
      if (transfer.source_branch_id !== branchId) {
        return res.status(403).json({ message: 'Solo la sucursal que tiene el stock puede aprobar esta solicitud' });
      }
    } else {
      // SEND: Solo la sucursal dest (quien recibe) puede aprobar
      if (transfer.dest_branch_id !== branchId) {
        return res.status(403).json({ message: 'Solo la sucursal destino puede aprobar este envío' });
      }
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

// Rechazar transferencia (solo para sucursal destino)
exports.rejectTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch_id;

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transferencia no encontrada' });
    }

    // Validar permisos según el tipo de transferencia
    if (transfer.transfer_type === 'REQUEST') {
      // REQUEST: Solo la sucursal source (quien tiene el stock) puede rechazar
      if (transfer.source_branch_id !== branchId) {
        return res.status(403).json({ message: 'Solo la sucursal que tiene el stock puede rechazar esta solicitud' });
      }
    } else {
      // SEND: Solo la sucursal dest (quien recibe) puede rechazar
      if (transfer.dest_branch_id !== branchId) {
        return res.status(403).json({ message: 'Solo la sucursal destino puede rechazar este envío' });
      }
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({ message: 'La transferencia no puede ser rechazada en este estado' });
    }

    const rejected = await Transfer.reject(id);

    console.log(`✅ Transferencia ${id} rechazada por sucursal destino`);

    res.json({
      message: 'Transferencia rechazada',
      transfer: rejected
    });
  } catch (err) {
    console.error('❌ Error en rejectTransfer:', err);
    res.status(500).json({ error: err.message });
  }
};

// Completar transferencia (confirmar recepción)
// Esto suma el stock a la sucursal destino
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

// Cancelar transferencia (solo sucursal origen antes de aprobación)
exports.cancelTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch_id;

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transferencia no encontrada' });
    }

    // Validar permisos según el tipo de transferencia
    if (transfer.transfer_type === 'REQUEST') {
      // REQUEST: Solo quien solicitó (dest) puede cancelar
      if (transfer.dest_branch_id !== branchId) {
        return res.status(403).json({ message: 'Solo quien solicitó puede cancelar esta solicitud' });
      }
    } else {
      // SEND: Solo quien envió (source) puede cancelar
      if (transfer.source_branch_id !== branchId) {
        return res.status(403).json({ message: 'Solo quien envió puede cancelar este envío' });
      }
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({ message: 'La transferencia no puede ser cancelada en este estado' });
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
