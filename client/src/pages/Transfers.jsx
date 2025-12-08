import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Check, X, ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Transfers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    dest_branch_id: '',
    products: [{ product_id: '', quantity: '' }]
  });

  // Cargar sucursales
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.filter(b => b.id !== user?.branch_id); // Excluir sucursal actual
    }
  });

  // Cargar productos
  const { data: products = [] } = useQuery({
    queryKey: ['products', user?.branch_id],
    queryFn: async () => {
      const response = await api.get(`/products?branch_id=${user?.branch_id}`);
      return response.data;
    }
  });

  // Cargar transferencias
  const { data: transfersData = {}, isLoading, refetch } = useQuery({
    queryKey: ['transfers', filterStatus],
    queryFn: async () => {
      if (filterStatus === 'pending') {
        const response = await api.get('/transfers/pending');
        return response.data;
      }
      const response = await api.get('/transfers');
      return response.data;
    }
  });

  // Crear transferencia
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await api.post('/transfers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setShowModal(false);
      setFormData({ dest_branch_id: '', products: [{ product_id: '', quantity: '' }] });
      alert('✅ Solicitud de transferencia creada');
      refetch();
    },
    onError: (err) => {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  });

  // Aprobar transferencia
  const approveMutation = useMutation({
    mutationFn: async (transferId) => {
      return await api.put(`/transfers/${transferId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      alert('✅ Transferencia aprobada');
      refetch();
    },
    onError: (err) => {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  });

  // Completar transferencia
  const completeMutation = useMutation({
    mutationFn: async (transferId) => {
      return await api.put(`/transfers/${transferId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      alert('✅ Transferencia completada');
      refetch();
    },
    onError: (err) => {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  });

  // Cancelar transferencia
  const cancelMutation = useMutation({
    mutationFn: async (transferId) => {
      return await api.put(`/transfers/${transferId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      alert('✅ Transferencia cancelada');
      refetch();
    },
    onError: (err) => {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.dest_branch_id || !formData.products[0].product_id) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    const validProducts = formData.products.filter(p => p.product_id && p.quantity);
    if (validProducts.length === 0) {
      alert('Agrega al menos un producto con cantidad');
      return;
    }

    createMutation.mutate({
      dest_branch_id: Number(formData.dest_branch_id),
      items: validProducts.map(p => ({
        product_id: Number(p.product_id),
        quantity: Number(p.quantity)
      }))
    });
  };

  const addProductRow = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { product_id: '', quantity: '' }]
    });
  };

  const removeProductRow = (index) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index)
    });
  };

  const updateProductRow = (index, field, value) => {
    const newProducts = [...formData.products];
    newProducts[index][field] = value;
    setFormData({ ...formData, products: newProducts });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'IN_TRANSIT': return 'bg-blue-100 text-blue-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'PENDING': 'Pendiente',
      'IN_TRANSIT': 'En Tránsito',
      'COMPLETED': 'Completado',
      'CANCELLED': 'Cancelado'
    };
    return labels[status] || status;
  };

  const canApprove = (transfer) => {
    return transfer.status === 'PENDING' && transfer.dest_branch_id === user?.branch_id;
  };

  const canComplete = (transfer) => {
    return transfer.status === 'IN_TRANSIT' && transfer.dest_branch_id === user?.branch_id;
  };

  const canCancel = (transfer) => {
    return transfer.status === 'PENDING' && transfer.source_branch_id === user?.branch_id;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-primary" size={28} />
            Transferencias Entre Sucursales
          </h2>
          <p className="text-slate-500">Gestión de movimientos de inventario entre sucursales</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nueva Transferencia
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm"
        >
          <option value="">Todas las transferencias</option>
          <option value="pending">Pendientes</option>
        </select>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="p-8 text-center">Cargando transferencias...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Origen → Destino</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Productos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Solicitante</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfersData.transfers?.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">#{transfer.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{transfer.source_branch}</span>
                      <ArrowRight size={16} className="text-slate-400" />
                      <span className="font-medium">{transfer.dest_branch}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {transfer.items?.length || 0} producto(s)
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                      {getStatusLabel(transfer.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{transfer.requester_username}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(new Date(transfer.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {canApprove(transfer) && (
                        <button
                          onClick={() => approveMutation.mutate(transfer.id)}
                          disabled={approveMutation.isPending}
                          className="p-1 hover:bg-green-100 text-green-600 rounded transition-colors"
                          title="Aprobar"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {canComplete(transfer) && (
                        <button
                          onClick={() => completeMutation.mutate(transfer.id)}
                          disabled={completeMutation.isPending}
                          className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                          title="Completar recepción"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {canCancel(transfer) && (
                        <button
                          onClick={() => cancelMutation.mutate(transfer.id)}
                          disabled={cancelMutation.isPending}
                          className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 sticky top-0 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ArrowRight className="text-primary" size={20} />
                Nueva Transferencia
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal Destino</label>
                <select 
                  value={formData.dest_branch_id}
                  onChange={(e) => setFormData({...formData, dest_branch_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                  required
                >
                  <option value="">Selecciona una sucursal destino</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-slate-700">Productos a Transferir</label>
                  <button
                    type="button"
                    onClick={addProductRow}
                    className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                  >
                    + Agregar Producto
                  </button>
                </div>

                {formData.products.map((prod, idx) => (
                  <div key={idx} className="flex gap-3">
                    <select 
                      value={prod.product_id}
                      onChange={(e) => updateProductRow(idx, 'product_id', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm"
                      required
                    >
                      <option value="">Selecciona producto</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>

                    <input 
                      type="number" 
                      min="1"
                      value={prod.quantity}
                      onChange={(e) => updateProductRow(idx, 'quantity', e.target.value)}
                      placeholder="Cantidad"
                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm"
                      required
                    />

                    {formData.products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProductRow(idx)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creando...' : 'Crear Transferencia'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
