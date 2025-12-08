import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Trash2, AlertTriangle, ShieldAlert, CheckCircle, WifiOff, Plus, X, Building2, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [branchError, setBranchError] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cargar sucursales
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: isOnline,
  });

  // Mutación para crear sucursal
  const createBranchMutation = useMutation({
    mutationFn: async () => {
      if (!newBranchName.trim()) {
        throw new Error('El nombre de la sucursal es obligatorio');
      }
      const { data } = await api.post('/branches', {
        name: newBranchName,
        address: newBranchAddress
      });
      return data;
    },
    onSuccess: (newBranch) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setNewBranchName('');
      setNewBranchAddress('');
      setIsBranchModalOpen(false);
      setSuccessMsg(`Sucursal "${newBranch.name}" creada correctamente`);
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err) => {
      setBranchError(err.response?.data?.message || err.message || 'Error desconocido');
    }
  });

  // Mutación para borrar todo
  const resetMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/admin/reset-system');
    },
    onSuccess: () => {
      setIsModalOpen(false);
      setSuccessMsg('El sistema ha sido formateado correctamente.');
      setConfirmText('');
      
      // Opcional: Recargar página después de 2 segundos para limpiar caché local
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error al resetear el sistema');
    }
  });

  const handleDelete = () => {
    if (confirmText !== 'ELIMINAR') return;
    resetMutation.mutate();
  };

  const handleCreateBranch = () => {
    setBranchError('');
    createBranchMutation.mutate();
  };

  // Solo administradores pueden crear sucursales
  if (user?.role !== 'admin') {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h2>
          <p className="text-slate-500">Acceso restringido a administradores</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl">
          <p>No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h2>
        <p className="text-slate-500">Opciones avanzadas de administración</p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={24} />
          <div>
            <p className="font-bold">¡Éxito!</p>
            <p>{successMsg}</p>
          </div>
        </div>
      )}

      {/* Gestión de Sucursales */}
      <div className="border border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center gap-3">
          <Building2 className="text-blue-600" size={24} />
          <h3 className="text-lg font-bold text-blue-700">Gestión de Sucursales</h3>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-medium text-slate-800">Sucursales Registradas</h4>
              <p className="text-slate-500 text-sm">Total: {branches?.length || 0}</p>
            </div>
            <button
              onClick={() => {
                setIsBranchModalOpen(true);
                setBranchError('');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus size={18} /> Nueva Sucursal
            </button>
          </div>

          {branches && branches.length > 0 ? (
            <div className="space-y-2">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <MapPin size={18} className="text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{branch.name}</p>
                    {branch.address && (
                      <p className="text-sm text-slate-500">{branch.address}</p>
                    )}
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    ID: {branch.id}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No hay sucursales registradas</p>
          )}
        </div>
      </div>

      {/* Tarjeta de Zona de Peligro */}
      <div className="border border-red-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
          <ShieldAlert className="text-red-600" size={24} />
          <h3 className="text-lg font-bold text-red-700">Zona de Peligro</h3>
        </div>
        
        <div className="p-6">
          <h4 className="font-medium text-slate-800 mb-2">Restablecer Base de Datos</h4>
          <p className="text-slate-500 text-sm mb-2 max-w-2xl">
            Esta acción eliminará permanentemente:
          </p>
          <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-slate-500 text-sm mb-4">
            <li>Todos los productos del catálogo.</li>
            <li>Todo el historial de inventario y stock actual.</li>
            <li>Todos los registros de movimientos y transferencias.</li>
            <li>Todos los usuarios (excepto tu cuenta de administrador actual).</li>
          </ul>

          {!isOnline && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-start gap-2 mb-4">
              <WifiOff size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">Requiere conexión a internet para eliminar datos del servidor.</p>
            </div>
          )}
          
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={!isOnline}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} /> Eliminar toda la información
          </button>
        </div>
      </div>

      {/* Modal para Crear Sucursal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={24} className="text-blue-600" />
                Nueva Sucursal
              </h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {branchError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm mb-4 flex items-center gap-2">
                <AlertTriangle size={16} />
                {branchError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre de la Sucursal *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Sucursal Sur"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dirección (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Calle Principal 123"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <button
                  onClick={handleCreateBranch}
                  disabled={createBranchMutation.isPending || !newBranchName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
                >
                  {createBranchMutation.isPending ? 'Creando...' : <><Plus size={18} /> Crear Sucursal</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">¿Estás absolutamente seguro?</h3>
              <p className="text-slate-500 mt-2 text-sm">
                Esta acción no se puede deshacer. Se borrará toda la información del negocio.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Escribe <span className="font-bold select-none">ELIMINAR</span> para confirmar:
                </label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                  placeholder="ELIMINAR"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <button 
                  onClick={handleDelete}
                  disabled={confirmText !== 'ELIMINAR' || resetMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
                >
                  {resetMutation.isPending ? 'Borrando...' : 'Confirmar Borrado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}