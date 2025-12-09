import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Users as UsersIcon, Trash2, Pencil, Plus, X, Save, User, Shield, Wifi, WifiOff, Clock, CheckCircle2, Zap } from 'lucide-react';
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
  const [showOfflineAlert, setShowOfflineAlert] = useState(true);
  
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = currentUser?.role === 'admin';
  
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

  // Cargar Sucursales - SIEMPRE intenta obtenerlas, con caché
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const response = await api.get('/branches');
        const data = response.data;
        
        // Guardar en IndexedDB para acceso offline
        await db.branches.bulkPut(data);
        console.log('✅ Sucursales cargadas y cacheadas:', data);
        
        return data;
      } catch (err) {
        console.warn('⚠️ Error cargando sucursales online, intentando desde caché:', err.message);
        
        // Si falla online, intentar desde caché offline
        const cached = await db.branches.toArray();
        if (cached.length > 0) {
          console.log('📦 Usando sucursales en caché:', cached);
          return cached;
        }
        
        throw err;
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    gcTime: 1000 * 60 * 60 * 24, // 24 horas en caché
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
    // Primero actualizar localmente la IndexedDB si estamos editando
    if (editingUser && isOnline) {
      // Refetch desde el servidor para obtener datos frescos
      try {
        const response = await api.get('/users');
        const updatedUser = response.data.find(u => u.id === editingUser.id);
        if (updatedUser) {
          await db.users.put(updatedUser);
          console.log('✅ Usuario actualizado en IndexedDB:', updatedUser);
        }
      } catch (err) {
        console.error('Error refetcheando usuario:', err);
      }
    }
    
    closeModal();
    
    // Luego refrescar React Query con delay
    setTimeout(async () => {
      await queryClient.invalidateQueries({ queryKey: ['syncUsers'] });
      await queryClient.refetchQueries({ queryKey: ['syncUsers'] });
      if (isOnline) {
        alert(msg);
      }
    }, 1000);
  };

  const handleError = (err) => {
    console.error('❌ Error en operación:', err);
    setErrorMsg(err.response?.data?.message || err.message || 'Error en la operación');
  };

  // Función para limpiar mutaciones inválidas
  const cleanInvalidMutations = async () => {
    try {
      const mutations = await db.mutations.toArray();
      const invalid = mutations.filter(m => m.type === 'CREATE_USER' && !m.payload.password);
      
      if (invalid.length > 0) {
        const ids = invalid.map(m => m.id);
        await db.mutations.bulkDelete(ids);
        console.log('✅ Eliminadas', ids.length, 'mutaciones inválidas');
        alert(`✅ Eliminadas ${ids.length} mutaciones inválidas que causaban errores de sincronización`);
        window.location.reload();
      } else {
        alert('✅ No hay mutaciones inválidas');
      }
    } catch (err) {
      console.error('Error limpiando mutaciones:', err);
      alert('Error al limpiar mutaciones');
    }
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
        
        try {
          const localUser = {
            ...finalData,
            id: tempId,
            created_at: new Date(),
            username: finalData.username, 
            role: finalData.role,
            branch_id: finalData.branch_id,
            temp: !isEdit 
          };

          // Guardar en users primero
          if (isEdit) {
            await db.users.update(editingUser.id, localUser);
          } else {
            await db.users.add(localUser);
          }
          
          // Luego agregar a mutations (sin transacción anidada)
          if (isEdit && typeof editingUser.id === 'string') {
            const existingCreate = await db.mutations.where('tempId').equals(editingUser.id).first();
            if (existingCreate) {
              await db.mutations.update(existingCreate.id, { payload: { ...existingCreate.payload, ...finalData } });
            }
          } else {
            await addToQueue(type, finalData, isEdit ? null : tempId);
          }
        } catch (err) {
          console.error('❌ Error en saveMutation offline:', err);
          throw err;
        }
      }
    },
    onSuccess: () => handleSuccess(isOnline ? "Usuario guardado." : "Guardado sin conexión. Se subirá al volver internet."),
    onError: handleError
  });

  // 3. Mutación: Eliminar
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (!confirm('¿Eliminar usuario permanentemente?')) throw new Error("Cancelado");
      
      try {
        await db.users.delete(id);

        if (isOnline) {
          await api.delete(`/users/${id}`);
        } else {
          if (typeof id === 'number') {
            await addToQueue('DELETE_USER', { id });
          } else {
            const createAction = await db.mutations.where('tempId').equals(id).first();
            if (createAction) await db.mutations.delete(createAction.id);
          }
        }
      } catch (err) {
        console.error('❌ Error en deleteMutation offline:', err);
        throw err;
      }
    },
    onSuccess: () => handleSuccess("Usuario eliminado."),
    onError: (err) => {
      if (err.message !== "Cancelado") alert(err.response?.data?.message || 'Error al eliminar');
      queryClient.refetchQueries({ queryKey: ['syncUsers'], type: 'active' }).catch(console.error);
    }
  });

  // Funciones del Modal
  const openCreate = () => {
    setEditingUser(null);
    // Si es admin, asignar automáticamente su sucursal. Si es superadmin, sucursal es null (no aplica)
    const initialBranchId = isAdmin ? currentUser.branch_id : 1;
    setFormData({ 
      username: '', 
      password: '', 
      role: 'employee', 
      branch_id: initialBranchId 
    });
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
    
    // Para crear: validar según rol del usuario actual
    if (!editingUser) {
      // Creando nuevo usuario
      if (isAdmin) {
        // Admin: rol debe ser employee o manager, sucursal debe ser la suya
        if (!['employee', 'manager'].includes(formData.role)) {
          setErrorMsg('Como admin, solo puedes crear empleados y gerentes');
          return;
        }
        if (formData.branch_id !== currentUser.branch_id) {
          setErrorMsg('La sucursal debe ser la tuya asignada');
          return;
        }
      } else if (isSuperAdmin) {
        // SuperAdmin: validar que admin y employee tengan sucursal, superadmin no tenga
        if (formData.role === 'superadmin' && formData.branch_id) {
          setErrorMsg('Los superadmins no deben tener sucursal asignada');
          return;
        }
        if ((formData.role === 'admin' || formData.role === 'employee' || formData.role === 'manager') && !formData.branch_id) {
          setErrorMsg(`Los ${formData.role}s deben tener una sucursal asignada`);
          return;
        }
      }
    }
    
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

      {/* Alerta de Modo Offline */}
      {!isOnline && showOfflineAlert && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-start gap-3">
          <WifiOff size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Modo Offline Activo</p>
            <p className="text-sm">Los usuarios creados o editados se guardarán localmente y se sincronizarán con el servidor cuando regrese la conexión a internet.</p>
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
          <h2 className="text-2xl font-bold text-slate-800">Usuarios</h2>
          <p className="text-slate-500">Gestión de personal y accesos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={cleanInvalidMutations} variant="outline" title="Limpiar mutaciones inválidas de la cola de sincronización">
            <Zap size={18} /> Limpiar Cola
          </Button>
          <Button onClick={openCreate}>
            <Plus size={18} /> Nuevo Usuario
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm">{errorMsg}</div>
      )}

      {/* Tabla */}
      <div className="bg-surface rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-700 text-sm">Usuario</th>
              <th className="px-6 py-3 font-semibold text-slate-700 text-sm">Rol</th>
              <th className="px-6 py-3 font-semibold text-slate-700 text-sm">Sucursal</th>
              <th className="px-6 py-3 font-semibold text-slate-700 text-sm">Estado Sync</th>
              <th className="px-6 py-3 font-semibold text-slate-700 text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users && users.length > 0 ? (
              users.map((u) => {
                const canEdit = isSuperAdmin || (currentUser.role === 'admin' && ['employee', 'manager'].includes(u.role) && u.branch_id === currentUser.branch_id);
                const canDelete = isSuperAdmin || (currentUser.role === 'admin' && ['employee', 'manager'].includes(u.role) && u.branch_id === currentUser.branch_id);
                
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs font-bold">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        <Shield size={14} /> {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{getBranchName(u.branch_id)}</td>
                    <td className="px-6 py-3">{getSyncStatus(u)}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          disabled={!canEdit}
                          className={`p-2 rounded transition-colors ${canEdit ? 'hover:bg-blue-50 text-blue-600' : 'text-slate-300 cursor-not-allowed'}`}
                          title={canEdit ? 'Editar' : 'Sin permisos'}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(u.id)}
                          disabled={!canDelete}
                          className={`p-2 rounded transition-colors ${canDelete ? 'hover:bg-red-50 text-red-600' : 'text-slate-300 cursor-not-allowed'}`}
                          title={canDelete ? 'Eliminar' : 'Sin permisos'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                  No hay usuarios para mostrar
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Usuario"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña {editingUser && '(dejar en blanco para mantener)'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contraseña"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={editingUser && !isSuperAdmin && !['employee', 'manager'].includes(editingUser.role)} // Admin solo puede cambiar employee/manager
                >
                  {/* SuperAdmin ve todos los roles (crear o editar) */}
                  {isSuperAdmin && (
                    <>
                      <option value="superadmin">SuperAdmin</option>
                      <option value="admin">Admin</option>
                    </>
                  )}
                  <option value="manager">Gerente</option>
                  <option value="employee">Empleado</option>
                </select>
              </div>

              {/* Solo mostrar selector de sucursal si es SUPERADMIN editando, o si es SUPERADMIN creando (no admin creando) */}
              {(isSuperAdmin && !editingUser) || (editingUser && !isAdmin) ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal</label>
                  <select
                    value={formData.branch_id || ''}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={editingUser && isAdmin} // Admin no puede cambiar sucursal
                  >
                    <option value="">Seleccionar sucursal</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : isAdmin && !editingUser ? (
                // Para admin creando: mostrar su sucursal como texto (no selector)
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal Asignada</label>
                  <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-medium">
                    {getBranchName(currentUser.branch_id)}
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} /> {editingUser ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
