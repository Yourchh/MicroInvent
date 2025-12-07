import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, X, Save, Package, AlertTriangle, Wifi, WifiOff, RefreshCw, MapPin, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useInventorySync } from '../hooks/useInventorySync'; 
import { db } from '../db'; 
import { addToQueue } from '../services/syncQueue'; 

export default function Inventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || 1);

  // 1. QUERY DE SUCURSALES
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const res = await api.get('/branches');
        return Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        console.error("Error cargando sucursales:", e);
        return [];
      }
    }
  });

  // 2. USAR EL HOOK OFFLINE-FIRST
  const { inventory: products, isOnline, isSyncing } = useInventorySync(selectedBranchId);

  // Estados UI
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ sku: '', name: '', price: '', min_stock_alert: 5 });

  const closeModal = () => {
    setIsModalOpen(false);
    setErrorMsg('');
    setEditingProduct(null);
  };

  // --- HELPERS ---
  const handleSuccess = async (msg) => {
    closeModal(); // Cierra el modal inmediatamente

    // Al guardar, invalidamos la query de sync para forzar una recarga del servidor
    // Esto disparará la función processQueue si estamos online.
    await queryClient.invalidateQueries(['syncInventory']); 
    
    // Solo muestra la alerta si hay internet (online)
    if (isOnline) { 
        alert(msg);
    }
  };

  const handleError = (err) => {
    console.error(err);
    setErrorMsg(err.response?.data?.message || err.message || 'Error en la operación');
  };
  // ---------------------------------------------------------------------------------

  // --- MUTACIONES (Híbridas: Online/Offline Queuing) ---
  
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, branch_id: selectedBranchId };

      if (isOnline) {
        // MODO ONLINE: Directo al servidor
        await api.post('/products', payload);
      } else {
        // MODO OFFLINE: Se resuelve inmediatamente para cerrar el modal y mostrar el registro.
        const tempId = `temp_${Date.now()}`; 
        
        // CORRECCIÓN CLAVE: Devolver explícitamente el resultado de la transacción.
        return db.transaction('rw', db.inventory, db.mutations, async () => {
             // 1. Guardar en Inventario Local (Optimista y visible al usuario)
             await db.inventory.add({
                id: tempId, 
                branch_id: selectedBranchId,
                sku: data.sku,
                product_name: data.name, 
                price: data.price,
                quantity: 0, 
                min_stock_alert: data.min_stock_alert
            });

            // 2. Agregar a la cola de subida
            await addToQueue('CREATE', payload, tempId);
        });
      }
    },
    onSuccess: () => handleSuccess(isOnline ? "Producto creado." : "Guardado sin conexión. Se subirá al volver internet."),
    onError: handleError
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const idToUpdate = editingProduct?.product_id || editingProduct?.id;
      
      if (isOnline) {
        // MODO ONLINE: Directo al servidor
        await api.put(`/products/${idToUpdate}`, data);
        
        // Actualización Optimista Local
        if (editingProduct.id) { 
            await db.inventory.update(editingProduct.id, {
                sku: data.sku,
                product_name: data.name,
                price: data.price,
                min_stock_alert: data.min_stock_alert
            });
        }
      } else {
        // MODO OFFLINE: Usamos transacción para atomicidad en la actualización local + cola.
         // CORRECCIÓN CLAVE: Devolver explícitamente el resultado de la transacción.
         return db.transaction('rw', db.inventory, db.mutations, async () => {
            // 1. Actualización Optimista Local
            if (editingProduct.id) { 
                await db.inventory.update(editingProduct.id, {
                    sku: data.sku,
                    product_name: data.name,
                    price: data.price,
                    min_stock_alert: data.min_stock_alert
                });
            }
            // 2. Agregar a la cola de actualización
            await addToQueue('UPDATE', { ...data, id: idToUpdate });
         });
      }
    },
    onSuccess: () => handleSuccess(isOnline ? "Producto actualizado." : "Cambio guardado localmente."),
    onError: handleError
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // 1. Eliminación Optimista Local (El producto desaparece inmediatamente)
      await db.inventory.delete(id); 

      if (isOnline) {
        await api.delete(`/products/${id}`);
      } else {
        // MODO OFFLINE: Lógica de cola
        // Si el ID es temporal (string), eliminamos la acción de CREATE de la cola.
        if (typeof id === 'number') { 
            await addToQueue('DELETE', { id });
        } else {
            // Es temporal, debemos borrar la acción de creación pendiente si existe
            const createAction = await db.mutations.where('tempId').equals(id).first();
            if (createAction) await db.mutations.delete(createAction.id);
        }
      }
    },
    onSuccess: () => {
      // Usar handleSuccess para flujo consistente
      handleSuccess("Producto eliminado.");
    },
    onError: (err) => alert(err.response?.data?.message || "Error al eliminar")
  });

  // Handlers
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setFormData({ sku: '', name: '', price: '', min_stock_alert: 5 });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku || '',
      name: product.product_name || product.name || '',
      price: product.price || '',
      min_stock_alert: product.min_stock_alert || 5
    });
    setIsModalOpen(true);
  };

  const handleDelete = (product) => {
    const prodName = product.product_name || product.name || 'Producto';
    if (window.confirm(`¿Estás seguro de eliminar ${prodName}?`)) {
       const idToDelete = product.product_id || product.id; 
       deleteMutation.mutate(idToDelete);
    }
  };

  // Filtrado Seguro
  const safeProducts = Array.isArray(products) ? products : [];
  const filteredProducts = safeProducts.filter(p => {
    const name = p.product_name || p.name || '';
    const sku = p.sku || '';
    return name.toLowerCase().includes(search.toLowerCase()) || 
           sku.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="relative">
      {/* Indicador de Estado de Red */}
      <div className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg z-50 flex items-center gap-2 transition-all ${isOnline ? 'bg-green-100 text-green-600' : 'bg-slate-800 text-white'}`}>
        {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
        {!isOnline && <span className="text-xs font-bold pr-1">Offline - Datos Locales</span>}
        {isOnline && isSyncing && <RefreshCw size={16} className="animate-spin ml-1" />}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">Inventario</h2>
          <div className="flex items-center gap-2 text-slate-500 mt-1">
             <div className="flex items-center bg-white border border-slate-300 rounded-md px-2 py-1 shadow-sm">
              <MapPin size={16} className="text-primary mr-2" />
              <span className="text-sm font-medium mr-2">Sucursal:</span>
              <select 
                className="bg-transparent font-bold text-slate-700 outline-none text-sm cursor-pointer"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
              >
                <option value={1}>Matriz</option> 
                {Array.isArray(branches) && branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <button 
                onClick={() => queryClient.invalidateQueries(['syncInventory'])} 
                className="hover:text-blue-600 ml-2" 
                title="Forzar Sincronización"
                disabled={!isOnline}
            >
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={openNewModal}>
            <Plus size={18} /> Nuevo
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Producto</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Precio</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {filteredProducts.length > 0 ? filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{p.sku}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg text-primary"><Package size={16} /></div>
                      <span className="text-sm font-medium text-slate-800">{p.product_name || p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">${p.price}</td>
                  <td className="px-6 py-4 text-sm font-bold text-center text-slate-800">{p.quantity}</td>
                  <td className="px-6 py-4 text-center flex justify-center gap-2">
                    <button onClick={() => openEditModal(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(p)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              )) : 
              <tr><td colSpan="5" className="p-8 text-center text-slate-400">
                  {isOnline ? 'No se encontraron productos.' : 'Sin datos locales. Conéctate a internet.'}
              </td></tr>
            }
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="text-primary" size={20} /> 
                {editingProduct ? 'Editar Producto' : 'Registrar Producto'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm flex items-center gap-2"><AlertTriangle size={16} /> {errorMsg}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                  <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none uppercase font-mono text-sm" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio</label>
                  <input type="number" step="0.01" required className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-right" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alerta Stock</label>
                <div className="flex items-center gap-4">
                  <input type="range" min="1" max="50" className="flex-1 accent-primary" value={formData.min_stock_alert} onChange={e => setFormData({...formData, min_stock_alert: parseInt(e.target.value)})} />
                  <span className="font-bold text-slate-700 w-8 text-center">{formData.min_stock_alert}</span>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : <><Save size={18} /> {editingProduct ? 'Actualizar' : 'Registrar'}</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}