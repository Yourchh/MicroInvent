import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Users as UsersIcon, Trash2, Edit, Plus, X, Save, User, Shield, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// NUEVOS IMPORTS
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
  const { users, isLoading: isSyncing, isOnline } = useUserSync(); // Reemplaza la query simple

  // Opcional: Cargar Sucursales para el selector (Online only por simplicidad)
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await api.get('/branches')).data,
    enabled: isOnline, // Solo fetch si hay internet
    staleTime: 1000 * 60 * 60, // Caching de 1 hora
  });
  
  // --- HELPERS ---
  const getBranchName = (id) => {
    return branches.find(b => b.id === id)?.name || 'N/A';
  };

  // Implementación mejorada de handleSuccess
  const handleSuccess = async (msg) => {
    closeModal(); // 1. Cierra el modal inmediatamente para el usuario

    // 2. Invalida la query para forzar la actualización/sync
    await queryClient.invalidateQueries(['syncUsers']); 
    
    // 3. Muestra la alerta SOLO si estamos online
    if (isOnline) {
      alert(msg);
    }
  };

  const handleError = (err) => {
    console.error(err);
    setErrorMsg(err.response?.data?.message || err.message || 'Error en la operación');
  };
  // -----------------------------------------------------------

  // 2. Mutación: Guardar (Crear o Editar) - LÓGICA OFFLINE/ONLINE
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const isEdit = !!editingUser;
      const type = isEdit ? 'UPDATE_USER' : 'CREATE_USER';
      
      if (isOnline) {
          // MODO ONLINE: Envío directo
          if (isEdit) {
              await api.put(`/users/${editingUser.id}`, data);
          } else {
              await api.post('/users', data);
          }
      } else {
          // MODO OFFLINE: Guardar local + Cola
          if (!isEdit && !data.password) {
             throw new Error("La contraseña es obligatoria en modo offline para crear.");
          }
          
          const tempId = isEdit ? editingUser.id : `user_temp_${Date.now()}`;
          const finalData = isEdit ? { ...data, id: editingUser.id } : data;
          
          // CORRECCIÓN CLAVE: Devolver explícitamente el resultado de la transacción.
          return db.transaction('rw', db.users, db.mutations, async () => {
            // 1. Actualización Optimista Local
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
                // Editando: Actualizar el registro local existente
                await db.users.update(editingUser.id, localUser);
            } else {
                // Creando: Insertar el registro temporal
                await db.users.add(localUser);
            }

            // 2. Agregar a la cola
            await addToQueue(type, finalData, isEdit ? null : tempId);
          });
      }
    },
    onSuccess: () => handleSuccess(isOnline ? "Usuario guardado." : "Guardado sin conexión. Se subirá al volver internet."),
    onError: handleError
  });

  // 3. Mutación: Eliminar - LÓGICA OFFLINE/ONLINE
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (!confirm('¿Eliminar usuario permanentemente?')) throw new Error("Cancelado");
      
      // 1. Eliminación optimista local
      await db.users.delete(id);

      if (isOnline) {
          await api.delete(`/users/${id}`);
      } else {
          // MODO OFFLINE: Se resuelve inmediatamente para cerrar el modal.
          return db.transaction('rw', db.mutations, async () => {
            // Offline: Agregar a la cola solo si no es un registro temporal
            if (typeof id === 'number') {
                await addToQueue('DELETE_USER', { id });
            } else {
                // Es un ID temporal, solo borrar la acción de CREATE si existía
                const createAction = await db.mutations.where('tempId').equals(id).first();
                if (createAction) await db.mutations.delete(createAction.id);
            }
          });
      }
    },
    onSuccess: () => handleSuccess("Usuario eliminado."), // Usa la función corregida
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
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className={`p-2 rounded-full ${u.temp ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-primary'}`}>
                    <User size={16} />
                  </div>
                  <span className="font-medium text-slate-800">
                    {u.username} {u.id === currentUser.id && '(Tú)'}
                    {u.temp && <span className="ml-2 text-xs font-semibold text-red-500">(Pendiente)</span>}
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
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm">{errorMsg}</div>
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