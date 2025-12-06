import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, X, Save, Package, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
// Importamos el hook de sincronización para que funcione Offline y refresque rápido
import { useInventorySync } from '../hooks/useInventorySync';

export default function Inventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // ASEGURAR EL ID DE SUCURSAL
  // Si user.branch_id es undefined, usamos 1 como fallback, pero imprimimos advertencia
  const branchId = user?.branch_id || 1;

  useEffect(() => {
    console.log("🏢 Trabajando en Sucursal ID:", branchId);
    if (!user?.branch_id) console.warn("⚠️ Usuario sin branch_id en el token. Usando ID 1 por defecto.");
  }, [branchId, user]);

  // Estados de UI
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estado del Formulario
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    price: '',
    min_stock_alert: 5
  });

  // 1. OBTENER INVENTARIO (USANDO EL HOOK OFFLINE-FIRST)
  // Esto reemplaza tu useQuery anterior. 'products' se actualiza solo cuando Dexie cambia.
  const { inventory: products, isOnline } = useInventorySync(branchId);

  // 2. MUTACIÓN PARA CREAR PRODUCTO
  const createProductMutation = useMutation({
    mutationFn: async (newProduct) => {
      // Enviamos branch_id explícitamente para que el backend cree el stock inicial
      const payload = { ...newProduct, branch_id: branchId };
      console.log("📤 Enviando producto:", payload);
      await api.post('/products', payload);
    },
    onSuccess: () => {
      // Al tener éxito, invalidamos para que useInventorySync vuelva a descargar datos del servidor
      queryClient.invalidateQueries(['inventory']);
      closeModal();
      setFormData({ sku: '', name: '', price: '', min_stock_alert: 5 });
      
      // Feedback visual inmediato
      alert("Producto creado exitosamente. La lista se actualizará en breve.");
      
      // Truco para forzar actualización visual si la sincronización tarda un poco
      if(isOnline) {
        setTimeout(() => window.location.reload(), 500);
      }
    },
    onError: (err) => {
      console.error("❌ Error creando producto:", err);
      setErrorMsg(err.response?.data?.message || 'Error al crear producto');
    }
  });

  // Manejadores
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.sku || !formData.name || !formData.price) {
      setErrorMsg("Todos los campos son obligatorios");
      return;
    }
    createProductMutation.mutate(formData);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setErrorMsg('');
  };

  // Filtrado local seguro (con ?. para evitar errores si products es null)
  const filteredProducts = products?.filter(p => 
    (p.product_name || p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Indicador de Estado de Red */}
      <div className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg z-50 flex items-center gap-2 transition-colors ${isOnline ? 'bg-green-100 text-green-600' : 'bg-slate-800 text-white'}`}>
        {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
        {!isOnline && <span className="text-xs font-bold pr-1">Offline</span>}
      </div>

      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventario</h2>
          <div className="flex items-center gap-2 text-slate-500">
            <p>Gestión de stock en tiempo real</p>
            {/* Botón de recarga manual por si acaso */}
            <button onClick={() => window.location.reload()} title="Recargar lista" className="hover:text-blue-600">
                <RefreshCw size={14} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          {/* Barra de Búsqueda */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Botón Nuevo Producto */}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> <span className="hidden sm:inline">Nuevo Producto</span>
          </Button>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-surface rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Producto</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Precio</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts?.length > 0 ? (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{product.sku}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg text-primary">
                        <Package size={16} />
                      </div>
                      <span className="text-sm font-medium text-slate-800">
                        {product.product_name || product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">${product.price}</td>
                  <td className="px-6 py-4 text-sm font-bold text-center text-slate-800">{product.quantity}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.quantity > 5 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {product.quantity > 5 ? 'Disponible' : 'Bajo Stock'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  {isOnline 
                    ? 'No hay productos visibles. Intenta recargar o crear uno nuevo.' 
                    : 'Sin conexión. No hay datos locales guardados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE REGISTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            
            {/* Cabecera del Modal */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="text-primary" size={20} /> Registrar Producto
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} /> {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SKU (Código)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. LAP-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none uppercase font-mono text-sm"
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-right"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Laptop Gamer HP..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alerta de Stock Bajo</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    className="flex-1 accent-primary"
                    value={formData.min_stock_alert}
                    onChange={e => setFormData({...formData, min_stock_alert: parseInt(e.target.value)})}
                  />
                  <span className="font-bold text-slate-700 w-8 text-center">{formData.min_stock_alert}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">El sistema avisará cuando queden menos de {formData.min_stock_alert} unidades.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" disabled={createProductMutation.isPending || !isOnline}>
                  {createProductMutation.isPending ? 'Guardando...' : (isOnline ? <><Save size={18} /> Registrar</> : 'Requiere Internet')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}