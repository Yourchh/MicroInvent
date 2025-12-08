import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
// 1. CAMBIO: Reemplazamos 'Edit' por 'Pencil' en los imports
import { Users as UsersIcon, Trash2, Pencil, Plus, X, Save, User, Shield, Wifi, WifiOff, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useUserSync } from '../hooks/useUserSync'; 
import { db } from '../db'; 
import { addToQueue } from '../services/syncQueue'; 

export default function Users() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');
  
  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); 

  // Estado del Formulario
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'employee',
    branch_id: 1 
  });

  // 1. CARGAR USUARIOS DESDE HOOK OFFLINE-FIRST
  const { users, isLoading: isSyncing, isOnline } = useUserSync(); 

  // Cargar Sucursales
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await api.get('/branches')).data,
    enabled: isOnline, 
    staleTime: 1000 * 60 * 60, 
  });
  
  // --- HELPERS ---
  const getBranchName = (id) => {
    return branches.find(b => b.id === id)?.name || 'N/A';
  };

  const getSyncStatus = (u) => {
    const isTemp = u.temp || (typeof u.id === 'string' && u.id.toString().startsWith('user_temp_'));
    
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

  const handleSuccess = async (msg) => {
    closeModal(); 
    await queryClient.invalidateQueries(['syncUsers']); 
    if (isOnline) {
      alert(msg);
    }
  };

  const handleError = (err) => {
    console.error(err);
    setErrorMsg(err.response?.data?.message || err.message || 'Error en la operación');
  };

  // 2. Mutación: Guardar
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const isEdit = !!editingUser;
      const type = isEdit ? 'UPDATE_USER' : 'CREATE_USER';
      
      if (isOnline) {
          if (isEdit) {
              await api.put(`/users/${editingUser.id}`, data);
          } else {
              await api.post('/users', data);
          }
      } else {
          if (!isEdit && !data.password) {
             throw new Error("La contraseña es obligatoria en modo offline para crear.");
          }
          
          const tempId = isEdit ? editingUser.id : `user_temp_${Date.now()}`;
          const finalData = isEdit ? { ...data, id: editingUser.id } : data;
          
          return db.transaction('rw', db.users, db.mutations, async () => {
            const localUser = {
                ...finalData,
                id: tempId,
                created_at: new Date(),
                username: finalData.username, 
                role: finalData.role,
                branch_id: finalData.branch_id,
                temp: !isEdit 
            };

            if (isEdit) {
                await db.users.update(editingUser.id, localUser);
            } else {
                await db.users.add(localUser);
            }
            await addToQueue(type, finalData, isEdit ? null : tempId);
          });
      }
    },
    onSuccess: () => handleSuccess(isOnline ? "Usuario guardado." : "Guardado sin conexión. Se subirá al volver internet."),
    onError: handleError
  });

  // 3. Mutación: Eliminar
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (!confirm('¿Eliminar usuario permanentemente?')) throw new Error("Cancelado");
      
      await db.users.delete(id);

      if (isOnline) {
          await api.delete(`/users/${id}`);
      } else {
          return db.transaction('rw', db.mutations, async () => {
            if (typeof id === 'number') {
                await addToQueue('DELETE_USER', { id });
            } else {
                const createAction = await db.mutations.where('tempId').equals(id).first();
                if (createAction) await db.mutations.delete(createAction.id);
            }
          });
      }
    },
    onSuccess: () => handleSuccess("Usuario eliminado."),
    onError: (err) => {
        if (err.message !== "Cancelado") alert(err.response?.data?.message || 'Error al eliminar');
        queryClient.invalidateQueries(['syncUsers']); 
    }
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
      password: '', 
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

  if (isSyncing && !users?.length) return <div className="p-8">Cargando...</div>;

  return (
    <div className="space-y-6">
      {/* Indicador de Red */}
      <div className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg z-50 flex items-center gap-2 transition-all ${isOnline ? 'bg-green-100 text-green-600' : 'bg-slate-800 text-white'}`}>
        {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
        {!isOnline && <span className="text-xs font-bold pr-1">Offline</span>}
      </div>
      
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
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Estado</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className={`p-2 rounded-full ${u.temp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-primary'}`}>
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
                <td className="px-6 py-4 text-slate-600">{getBranchName(u.branch_id)}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">
                   {u.created_at ? format(new Date(u.created_at), "dd MMM yyyy", { locale: es }) : 'N/A'}
                </td>
                <td className="px-6 py-4 text-center">
                    {getSyncStatus(u)}
                </td>
                {/* 2. CAMBIO: Botones actualizados con estilo y componente idéntico a Inventory.jsx */}
                <td className="px-6 py-4 text-center flex justify-center gap-2">
                  <button 
                    onClick={() => openEdit(u)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => deleteMutation.mutate(u.id)}
                    disabled={u.id === currentUser.id}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL (Sin cambios funcionales, solo estilo visual) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="text-primary" size={20} />
                {editingUser ? 'Editar Usuario' : 'Crear Usuario'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm flex items-center gap-2">
                    <Shield size={16} /> {errorMsg}
                </div>
              )}
              
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
                  required={!editingUser} 
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

              <div className="pt-4 flex justify-end gap-3">
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