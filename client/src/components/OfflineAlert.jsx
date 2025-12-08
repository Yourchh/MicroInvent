import { useState } from 'react';
import { WifiOff, CheckCircle2, X } from 'lucide-react';

export default function OfflineAlert({ isOnline }) {
  const [showAlert, setShowAlert] = useState(true);
  const [isOfflineReloaded] = useState(() => {
    return localStorage.getItem('offlineReloaded') === 'true';
  });

  // Limpiar el modo offline cuando regresa internet
  if (isOnline && isOfflineReloaded) {
    localStorage.removeItem('offlineReloaded');
  }

  // Manejar recarga en modo offline
  const handleOfflineReload = () => {
    localStorage.setItem('offlineReloaded', 'true');
    setTimeout(() => window.location.reload(), 500);
  };

  // No mostrar si está online
  if (isOnline) {
    return null;
  }

  return (
    showAlert && (
      <div className={`${
        isOfflineReloaded
          ? 'bg-slate-100 border-l-4 border-slate-400'
          : 'bg-red-50 border-l-4 border-red-500'
      } p-4 rounded-lg shadow-md transition-colors duration-300`}>
        <div className="flex items-start gap-3">
          {isOfflineReloaded ? (
            <CheckCircle2 className="text-slate-600 flex-shrink-0 mt-0.5" size={20} />
          ) : (
            <WifiOff className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          )}
          <div className="flex-1">
            {isOfflineReloaded ? (
              <>
                <h3 className="font-bold text-slate-800 mb-1">✅ Modo Offline Activado</h3>
                <p className="text-slate-700 text-sm mb-2">
                  La página ha sido recargada. Puede comenzar a trabajar sin problemas.
                </p>
                <p className="text-slate-600 text-xs">
                  Los registros que cree se guardarán localmente y se sincronizarán automáticamente cuando el internet regrese.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-red-800 mb-1">⚠️ Sin Conexión a Internet</h3>
                <p className="text-red-700 text-sm mb-2">
                  Está en modo offline. Para guardar registros sin conexión, debe recargar la página.
                </p>
                <p className="text-red-600 text-xs mb-3">
                  Los registros creados se sincronizarán automáticamente cuando el internet regrese.
                </p>
                <button
                  onClick={handleOfflineReload}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
                >
                  🔄 Recargar Página
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => setShowAlert(false)}
            className={`${
              isOfflineReloaded
                ? 'text-slate-400 hover:text-slate-600'
                : 'text-red-400 hover:text-red-600'
            } flex-shrink-0 transition-colors`}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    )
  );
}
