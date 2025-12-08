import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Package, FileText, LogOut, Users } from 'lucide-react';
import { Settings as SettingsIcon } from 'lucide-react';
import OfflineAlert from './OfflineAlert';
import OfflineBlocker from './OfflineBlocker';
import { useState, useEffect } from 'react';

// eslint-disable-next-line no-unused-vars
const NavItem = ({ to, icon: Icon, label }) => {
  const location = useLocation(); // Usamos el hook aquí directamente
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isActive 
          ? 'bg-primary text-white shadow-md' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
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
  
  const isAdmin = user?.role === 'admin';
  const canViewReports = ['admin', 'manager'].includes(user?.role);

  return (
    <div className="min-h-screen flex bg-background">
      {/* OfflineBlocker - Cubre toda la pantalla si se va internet */}
      <OfflineBlocker />

      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-slate-200 fixed h-full p-6 flex flex-col">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
            M
          </div>
          <span className="text-xl font-bold text-slate-800">MicroInvent</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/dashboard/inventory" icon={Package} label="Inventario" />
          {canViewReports && (<NavItem to="/dashboard/reports" icon={FileText} label="Reportes" />)}
          {isAdmin && (
            <>
            <NavItem to="/dashboard/users" icon={Users} label="Usuarios" />
            <NavItem to="/dashboard/settings" icon={SettingsIcon} label="Configuración" /> 
            </>
            )}
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <div className="px-4 mb-4">
            <p className="text-xs text-slate-400 uppercase font-bold">Usuario</p>
            <p className="text-sm font-medium text-slate-700 truncate">{user?.username}</p>
          </div>
          <button 
            onClick={logout} 
            className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium cursor-pointer"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          <OfflineAlert isOnline={isOnline} />
          <Outlet />
        </div>
      </main>
    </div>
  );
}