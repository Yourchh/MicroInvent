import { useState } from 'react';
import { WifiOff, X } from 'lucide-react';

export default function OfflineAlert({ isOnline }) {
  const [showAlert, setShowAlert] = useState(true);

  // No mostrar si está online
  if (isOnline) {
    return null;
  }

  return (
    showAlert && (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg shadow-md mb-4">
        <div className="flex items-start gap-3">
          <WifiOff className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-bold text-blue-800 mb-1">⚠️ Modo Offline</h3>
            <p className="text-blue-700 text-sm mb-2">
              Está trabajando sin conexión a internet. Los cambios se guardarán localmente.
            </p>
            <p className="text-blue-600 text-xs">
              Se sincronizarán automáticamente cuando el internet regrese.
            </p>
          </div>
          <button
            onClick={() => setShowAlert(false)}
            className="text-blue-400 hover:text-blue-600 flex-shrink-0 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    )
  );
}
