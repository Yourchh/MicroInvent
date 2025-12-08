import { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, WifiOff } from 'lucide-react';

export default function OfflineBlocker() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasGoneOffline, setHasGoneOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Conexión restaurada');
      setIsOnline(true);
      // No permitir que continúen sin recargar
    };

    const handleOffline = () => {
      console.log('📡 Perdida de conexión - Recargando automáticamente...');
      setIsOnline(false);
      setHasGoneOffline(true);
      // Recargar automáticamente después de 1 segundo
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Bloquear clics cuando está offline
  useEffect(() => {
    if (!isOnline && hasGoneOffline) {
      const blockClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      document.addEventListener('click', blockClick, true);
      document.addEventListener('mousedown', blockClick, true);
      document.addEventListener('keydown', blockClick, true);

      return () => {
        document.removeEventListener('click', blockClick, true);
        document.removeEventListener('mousedown', blockClick, true);
        document.removeEventListener('keydown', blockClick, true);
      };
    }
  }, [isOnline, hasGoneOffline]);

  // Si nunca se ha ido offline, no mostrar nada
  if (!hasGoneOffline) {
    return null;
  }

  // Si está offline, mostrar bloqueo total
  if (!isOnline) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 text-center animate-pulse">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 p-4 rounded-full">
              <WifiOff size={40} className="text-red-600 animate-bounce" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-red-600 mb-2">Sin Conexión a Internet</h2>
          
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-semibold text-sm leading-relaxed">
              Se ha perdido la conexión a internet. La página se recargará automáticamente para pasar al modo offline.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6 text-red-600">
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">Recargando...</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-red-600 h-full animate-pulse" style={{ width: '75%' }}></div>
          </div>

          <p className="text-slate-500 text-xs mt-4">
            Por favor, espera mientras se recarga la página...
          </p>
        </div>
      </div>
    );
  }

  // Si está online pero ha estado offline, mostrar mensaje de restauración
  if (isOnline && hasGoneOffline) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-100 p-4 rounded-full">
              <AlertTriangle size={40} className="text-amber-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-amber-600 mb-2">Conexión Restaurada</h2>
          
          <p className="text-slate-600 mb-6 text-sm">
            Se ha detectado que tu conexión a internet se perdió. Por seguridad, debes recargar la página para sincronizar los datos correctamente.
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              window.location.reload();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
          >
            <RotateCcw size={20} />
            Recargar Página
          </button>

          <p className="text-slate-500 text-xs mt-4">
            Se sincronizarán los cambios pendientes
          </p>
        </div>
      </div>
    );
  }

  return null;
}
