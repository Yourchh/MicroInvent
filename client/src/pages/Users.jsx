import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Users as UsersIcon, Trash2, Edit, Plus, X, Save, User, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Users() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');
  
  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // Si es null = Creando, Si tiene objeto = Editando

  // Estado del Formulario
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'employee',
    branch_id: 1 // Puedes cambiar esto si tienes más sucursales
  });

  // 1. Cargar Usuarios
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
    retry: 1
  });

  // 2. Mutación: Guardar (Crear o Editar)
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, data);
      } else {
        await api.post('/users', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      closeModal();
    },
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Error al guardar')
  });

  // 3. Mutación: Eliminar
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (!confirm('¿Eliminar usuario permanentemente?')) throw new Error("Cancelado");
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries(['users'])
  });

  // Funciones del Modal
  const openCreate = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'employee', branch_id: 1 });
    setIsModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setFormData({ 
      username: u.username, 
      password: '', // Dejamos vacía para no sobrescribir si no quiere cambiarla
      role: u.role, 
      branch_id: u.branch_id || 1 
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Usuarios</h2>
          <p className="text-slate-500">Gestión de personal y accesos</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} /> Nuevo Usuario
        </Button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm">{errorMsg}</div>
      )}

      {/* Tabla */}
      <div className="bg-surface rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Usuario</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Rol</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Sucursal</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Registro</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full text-primary">
                    <User size={16} />
                  </div>
                  <span className="font-medium text-slate-800">
                    {u.username} {u.id === currentUser.id && '(Tú)'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                    u.role === 'manager' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{u.branch_name || 'N/A'}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">
                   {format(new Date(u.created_at), "dd MMM yyyy", { locale: es })}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => openEdit(u)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => deleteMutation.mutate(u.id)}
                    disabled={u.id === currentUser.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL (Pop-up) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {editingUser ? 'Editar Usuario' : 'Crear Usuario'}
              </h3>
              <button onClick={closeModal}><X size={20} className="text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                <input 
                  type="text" required 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contraseña {editingUser && <span className="text-slate-400 font-normal">(Opcional)</span>}
                </label>
                <input 
                  type="password" 
                  required={!editingUser} // Obligatoria solo si es nuevo
                  placeholder={editingUser ? "••••••••" : ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="employee">Empleado</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal ID</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                    value={formData.branch_id}
                    onChange={e => setFormData({...formData, branch_id: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button type="submit">
                  <Save size={18} /> {editingUser ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}