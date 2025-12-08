import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, X, Save, Package, AlertTriangle, Wifi, WifiOff, RefreshCw, MapPin, Pencil, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useInventorySync } from '../hooks/useInventorySync'; 
import { db } from '../db'; 
import { addToQueue } from '../services/syncQueue'; 

export default function Inventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || 1);

  // 1. QUERY DE SUCURSALES - Con caché offline
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const res = await api.get('/branches');
        const data = Array.isArray(res.data) ? res.data : [];
        
        // Guardar en IndexedDB para acceso offline
        await db.branches.bulkPut(data);
        console.log('✅ Sucursales cargadas y cacheadas:', data);
        
        return data;
      } catch (e) {
        console.warn("⚠️ Error cargando sucursales online, intentando desde caché:", e.message);
        
        // Si falla online, intentar desde caché offline
        const cached = await db.branches.toArray();
        if (cached.length > 0) {
          console.log('📦 Usando sucursales en caché:', cached);
          return cached;
        }
        
        console.error("Error cargando sucursales:", e);
        return [];
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    gcTime: 1000 * 60 * 60 * 24, // 24 horas en caché
  });

  // 2. USAR EL HOOK OFFLINE-FIRST
  const { inventory: products, isOnline, isSyncing } = useInventorySync(selectedBranchId);

  // Estados UI
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ sku: '', name: '', price: '', min_stock_alert: 5 });
  const [showOfflineAlert, setShowOfflineAlert] = useState(true);

  const closeModal = () => {
    setIsModalOpen(false);
    setErrorMsg('');
    setEditingProduct(null);
  };

  // --- HELPERS ---
  const handleSuccess = async (msg) => {
    closeModal();
    // Invalidar en background sin esperar (no bloquea el cierre del modal)
    queryClient.invalidateQueries({ queryKey: ['syncInventory'] }).catch(console.error);
    if (isOnline) { 
        alert(msg);
    }
  };

  const handleError = (err) => {
    console.error('❌ Error en operación:', err);
    setErrorMsg(err.response?.data?.message || err.message || 'Error en la operación');
  };

  // --- MUTACIONES (Código igual al original...) ---
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, branch_id: selectedBranchId };

      if (isOnline) {
        await api.post('/products', payload);
      } else {
        const tempId = `temp_${Date.now()}`; 
        try {
          // Primero guardar en inventory
          await db.inventory.add({
            id: tempId, 
            branch_id: selectedBranchId,
            sku: data.sku,
            product_name: data.name, 
            price: data.price,
            quantity: 0, 
            min_stock_alert: data.min_stock_alert
          });
          // Luego guardar en mutations (sin transacción anidada)
          await addToQueue('CREATE', payload, tempId);
        } catch (err) {
          console.error('❌ Error en create offline:', err);
          throw err;
        }
      }
    },
    onSuccess: () => handleSuccess(isOnline ? "Producto creado." : "Guardado sin conexión. Se subirá al volver internet."),
    onError: handleError
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const idToUpdate = editingProduct?.product_id || editingProduct?.id;
      
      if (isOnline) {
        await api.put(`/products/${idToUpdate}`, data);
        if (editingProduct.id) { 
          await db.inventory.update(idToUpdate, data);
        }
      } else {
        const isTemp = typeof idToUpdate === 'string' && idToUpdate.startsWith('temp_');

        if (isTemp) {
          const existing = await db.mutations.where('tempId').equals(idToUpdate).first();
          if (existing) {
            await db.mutations.update(existing.id, { payload: { ...existing.payload, ...data } });
          }
          await db.inventory.update(idToUpdate, data);
        } else {
          try {
            await db.inventory.update(idToUpdate, data);
            await addToQueue('UPDATE', data, null);
          } catch (err) {
            console.error('❌ Error en update offline:', err);
            throw err;
          }
        }
      }
    },
    onSuccess: () => handleSuccess("Producto actualizado."),
    onError: handleError
  });

  const deleteMutation = useMutation({
    mutationFn: async (product) => {
      if (!confirm('¿Eliminar producto?')) throw new Error("Cancelado");

      const idToDelete = product?.product_id || product?.id;
      const isTemp = typeof idToDelete === 'string' && idToDelete.startsWith('temp_');

      try {
        await db.inventory.delete(idToDelete);

        if (isOnline) {
          await api.delete(`/products/${idToDelete}`);
        } else {
          if (isTemp) {
            const action = await db.mutations.where('tempId').equals(idToDelete).first();
            if (action) await db.mutations.delete(action.id);
          } else {
            await addToQueue('DELETE', { id: idToDelete }, null);
          }
        }
      } catch (err) {
        console.error('❌ Error en delete offline:', err);
        throw err;
      }
    },
    onSuccess: () => handleSuccess("Producto eliminado."),
    onError: (err) => {
      if (err.message !== "Cancelado") alert(err.response?.data?.message || 'Error al eliminar');
      queryClient.invalidateQueries({ queryKey: ['syncInventory'] }); 
    }
  });

  const openModal = () => {
    setEditingProduct(null);
    setFormData({ sku: '', name: '', price: '', min_stock_alert: 5 });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.product_name,
      price: product.price,
      min_stock_alert: product.min_stock_alert || 5
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredProducts = products?.filter(p =>
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.product_name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getSyncStatus = (product) => {
    const isTemp = typeof product.id === 'string' && product.id.startsWith('temp_');
    
    if (isTemp) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">
                <Clock size={12} /> Pendiente
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
            <CheckCircle2 size={12} /> Sincronizado
        </span>
    );
  };

  if (isSyncing && !products?.length) return <div className="p-8">Cargando inventario...</div>;

  return (
    <div className="space-y-6">
      {/* Indicador de Red */}
      <div className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg z-50 flex items-center gap-2 transition-all ${isOnline ? 'bg-green-100 text-green-600' : 'bg-slate-800 text-white'}`}>
        {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
        {!isOnline && <span className="text-xs font-bold pr-1">Offline</span>}
      </div>

      {/* Alerta de Modo Offline */}
      {!isOnline && showOfflineAlert && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-start gap-3">
          <WifiOff size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Modo Offline Activo</p>
            <p className="text-sm">Los cambios que realices se guardarán localmente y se sincronizarán automáticamente cuando regrese la conexión a internet.</p>
          </div>
          <button
            onClick={() => setShowOfflineAlert(false)}
            className="text-blue-400 hover:text-blue-600 flex-shrink-0 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventario</h2>
          <p className="text-slate-500">Gestión de productos y stock</p>
        </div>
        <Button onClick={openModal}>
          <Plus size={18} /> Nuevo Producto
        </Button>
      </div>

      {/* Filtro de sucursal */}
      <div className="flex gap-4 items-center">
        <label className="text-sm font-medium text-slate-700">Sucursal:</label>
        <select 
          value={selectedBranchId} 
          onChange={(e) => setSelectedBranchId(Number(e.target.value))}
          className="px-3 py-2 border border-slate-300 rounded-lg outline-none"
        >
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm">{errorMsg}</div>
      )}

      {/* Barra de Búsqueda */}
      <div className="relative">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Buscar por SKU o nombre..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>

      {/* Tabla */}
      <div className="bg-surface rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nombre</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Precio</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Stock Mínimo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Estado</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-800 font-mono">{product.sku}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-slate-400" />
                    <span className="text-slate-800">{product.product_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-800 font-medium">${parseFloat(product.price).toFixed(2)}</td>
                <td className="px-6 py-4 text-slate-600">{product.min_stock_alert || 0}</td>
                <td className="px-6 py-4 text-center">
                    {getSyncStatus(product)}
                </td>
                <td className="px-6 py-4 text-center flex justify-center gap-2">
                  <button 
                    onClick={() => openEdit(product)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => deleteMutation.mutate(product)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredProducts?.length && (
          <div className="px-6 py-8 text-center text-slate-500">Sin productos</div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="text-primary" size={20} />
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} /> {errorMsg}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                <input 
                  type="text" required 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.sku}
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                  placeholder="P.ej: SKU-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Producto</label>
                <input 
                  type="text" required 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="P.ej: Laptop Dell"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio</label>
                  <input 
                    type="number" step="0.01" required 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label>
                  <input 
                    type="number" required 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    value={formData.min_stock_alert}
                    onChange={e => setFormData({...formData, min_stock_alert: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button type="submit">
                  <Save size={18} /> {editingProduct ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
