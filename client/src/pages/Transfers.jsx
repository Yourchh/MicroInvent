import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Check, X, ArrowRight, TrendingUp, Clock, CheckCircle2, Wifi, WifiOff, Package, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTransfersSync } from '../hooks/useTransfersSync';

export default function Transfers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDirection, setFilterDirection] = useState(''); // sent, received
  const [expandedTransfer, setExpandedTransfer] = useState(null); // Para detalles expandidos
  const [formData, setFormData] = useState({
    transfer_type: 'REQUEST', // REQUEST o SEND
    dest_branch_id: '',
    products: [{ product_id: '', quantity: '' }]
  });

  // Usar el hook de sincronización
  const { isOnline } = useTransfersSync(user?.branch_id);

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
    queryKey: ['transfers', filterStatus, filterDirection],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterDirection) params.append('direction', filterDirection);
      const response = await api.get(`/transfers?${params.toString()}`);
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
      setFormData({ transfer_type: 'REQUEST', dest_branch_id: '', products: [{ product_id: '', quantity: '' }] });
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
      transfer_type: formData.transfer_type,
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

  const getTransferTypeLabel = (type) => {
    return type === 'REQUEST' ? 'Solicitud de Stock' : 'Envío de Stock';
  };

  const getTransferTypeBadge = (type) => {
    if (type === 'REQUEST') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
          📥 Solicitud
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
        📤 Envío
      </span>
    );
  };

  const getTotalQuantity = (items) => {
    return items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
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
        <div className="flex items-center gap-3">
          {isOnline ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm">
              <Wifi size={16} /> En línea
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 text-orange-700 text-sm">
              <WifiOff size={16} /> Modo offline
            </div>
          )}
          <Button onClick={() => setShowModal(true)}>
            <Plus size={18} /> Nueva Transferencia
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <select
          value={filterDirection}
          onChange={(e) => setFilterDirection(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm"
        >
          <option value="">Todas (Enviadas/Recibidas)</option>
          <option value="sent">Enviadas</option>
          <option value="received">Recibidas</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendientes</option>
          <option value="IN_TRANSIT">En Tránsito</option>
          <option value="COMPLETED">Entregadas</option>
          <option value="CANCELLED">Canceladas</option>
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Origen → Destino</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Productos (Cant.)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Solicitante</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfersData.transfers?.map((transfer) => (
                <>
                  <tr key={transfer.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setExpandedTransfer(expandedTransfer === transfer.id ? null : transfer.id)}>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-primary">#{transfer.id}</td>
                    <td className="px-6 py-4">
                      {getTransferTypeBadge(transfer.transfer_type)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{transfer.source_branch}</span>
                          {transfer.transfer_type === 'REQUEST' && (
                            <span className="text-xs text-slate-500">Envía stock</span>
                          )}
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{transfer.dest_branch}</span>
                          {transfer.transfer_type === 'REQUEST' && (
                            <span className="text-xs text-slate-500">Recibe stock</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-slate-400" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-800">{transfer.items?.length || 0} producto(s)</span>
                          <span className="text-xs text-slate-500">{getTotalQuantity(transfer.items)} unidades totales</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                        {getStatusLabel(transfer.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800">{transfer.requester_username}</span>
                        <span className="text-xs text-slate-500">
                          {transfer.transfer_type === 'REQUEST' ? 'Solicitó' : 'Ofreció enviar'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {format(new Date(transfer.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {canApprove(transfer) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); approveMutation.mutate(transfer.id); }}
                            disabled={approveMutation.isPending}
                            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-medium transition-colors"
                            title="Aprobar transferencia"
                          >
                            <Check size={14} className="inline mr-1" /> Aprobar
                          </button>
                        )}
                        {canComplete(transfer) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); completeMutation.mutate(transfer.id); }}
                            disabled={completeMutation.isPending}
                            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium transition-colors"
                            title="Completar recepción"
                          >
                            <Check size={14} className="inline mr-1" /> Recibido
                          </button>
                        )}
                        {canCancel(transfer) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(transfer.id); }}
                            disabled={cancelMutation.isPending}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium transition-colors"
                            title="Cancelar transferencia"
                          >
                            <X size={14} className="inline mr-1" /> Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedTransfer === transfer.id && (
                    <tr className="bg-slate-50">
                      <td colSpan="8" className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                            <FileText size={16} />
                            Detalles de la Transferencia #{transfer.id}
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <div className="text-xs text-slate-500 mb-1">Tipo de Transferencia</div>
                              <div className="text-sm font-medium">{getTransferTypeLabel(transfer.transfer_type)}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <div className="text-xs text-slate-500 mb-1">Estado Actual</div>
                              <div className="text-sm font-medium">{getStatusLabel(transfer.status)}</div>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                              <span className="text-xs font-bold text-slate-700">PRODUCTOS EN ESTA TRANSFERENCIA</span>
                            </div>
                            <table className="w-full">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">SKU</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Producto</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Cantidad</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {transfer.items?.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 text-sm font-mono text-slate-600">{item.sku}</td>
                                    <td className="px-4 py-2 text-sm font-medium text-slate-800">{item.product_name}</td>
                                    <td className="px-4 py-2 text-sm font-bold text-right text-slate-800">{item.quantity} unidades</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                                <tr>
                                  <td colSpan="2" className="px-4 py-2 text-sm font-bold text-slate-700">TOTAL</td>
                                  <td className="px-4 py-2 text-sm font-bold text-right text-primary">{getTotalQuantity(transfer.items)} unidades</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Petición</label>
                <select 
                  value={formData.transfer_type}
                  onChange={(e) => setFormData({...formData, transfer_type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                  required
                >
                  <option value="REQUEST">Solicitar stock de otra sucursal</option>
                  <option value="SEND">Enviar stock a otra sucursal</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.transfer_type === 'REQUEST' 
                    ? 'Solicitas que otra sucursal te envíe productos' 
                    : 'Ofreces enviar productos a otra sucursal (ej: almacén lleno)'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {formData.transfer_type === 'REQUEST' ? 'Sucursal que enviará' : 'Sucursal que recibirá'}
                </label>
                <select 
                  value={formData.dest_branch_id}
                  onChange={(e) => setFormData({...formData, dest_branch_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                  required
                >
                  <option value="">Selecciona una sucursal</option>
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
