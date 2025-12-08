import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, FileText, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Movements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [formData, setFormData] = useState({
    product_id: '',
    type: 'IN',
    quantity: '',
    reason: ''
  });

  // Cargar productos
  const { data: products = [] } = useQuery({
    queryKey: ['products', user?.branch_id],
    queryFn: async () => {
      const response = await api.get(`/products?branch_id=${user?.branch_id}`);
      return response.data;
    }
  });

  // Cargar movimientos
  const { data: movementsData = {}, isLoading } = useQuery({
    queryKey: ['movements', user?.branch_id, filterType],
    queryFn: async () => {
      if (filterType) {
        const response = await api.get(`/movements/type/${filterType}`);
        return response.data;
      }
      const response = await api.get('/movements');
      return response.data;
    }
  });

  // Mutación para crear movimiento
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await api.post('/movements', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      setShowModal(false);
      setFormData({ product_id: '', type: 'IN', quantity: '', reason: '' });
      alert('✅ Movimiento registrado exitosamente');
    },
    onError: (err) => {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.product_id || !formData.quantity) {
      alert('Por favor completa todos los campos');
      return;
    }
    createMutation.mutate({
      product_id: Number(formData.product_id),
      type: formData.type,
      quantity: Number(formData.quantity),
      reason: formData.reason || null
    });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'IN': return 'bg-green-100 text-green-700';
      case 'OUT': return 'bg-red-100 text-red-700';
      case 'ADJUSTMENT': return 'bg-blue-100 text-blue-700';
      case 'TRANSFER_IN': return 'bg-purple-100 text-purple-700';
      case 'TRANSFER_OUT': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'IN': 'Entrada/Compra',
      'OUT': 'Salida/Venta',
      'ADJUSTMENT': 'Ajuste',
      'TRANSFER_IN': 'Transferencia Entrada',
      'TRANSFER_OUT': 'Transferencia Salida'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Movimientos de Inventario</h2>
          <p className="text-slate-500">Registro de entradas, salidas y ajustes</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={18} /> Registrar Movimiento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm"
        >
          <option value="">Todos los tipos</option>
          <option value="IN">Entradas</option>
          <option value="OUT">Salidas</option>
          <option value="ADJUSTMENT">Ajustes</option>
        </select>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="p-8 text-center">Cargando movimientos...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Producto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Cantidad</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Motivo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movementsData.movements?.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{mov.product_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(mov.type)}`}>
                      {getTypeLabel(mov.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{mov.quantity}</td>
                  <td className="px-6 py-4 text-slate-600">{mov.username}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{mov.reason || '-'}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {format(new Date(mov.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                Registrar Movimiento
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Producto</label>
                <select 
                  value={formData.product_id}
                  onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                  required
                >
                  <option value="">Selecciona un producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Movimiento</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  <option value="IN">Entrada / Compra</option>
                  <option value="OUT">Salida / Venta</option>
                  <option value="ADJUSTMENT">Ajuste</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo (Opcional)</label>
                <input 
                  type="text" 
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Ej: Compra a proveedor, Rotura, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Registrando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
