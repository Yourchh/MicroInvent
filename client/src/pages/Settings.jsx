import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import { Trash2, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function Settings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
          <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-slate-500 text-sm mb-6">
            <li>Todos los productos del catálogo.</li>
            <li>Todo el historial de inventario y stock actual.</li>
            <li>Todos los registros de movimientos y transferencias.</li>
            <li>Todos los usuarios (excepto tu cuenta de administrador actual).</li>
          </ul>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Trash2 size={18} /> Eliminar toda la información
          </button>
        </div>
      </div>

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