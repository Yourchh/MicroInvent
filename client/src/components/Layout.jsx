import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Package, FileText, LogOut, Users, TrendingUp, ArrowRight, ChevronDown } from 'lucide-react';
import { Settings as SettingsIcon } from 'lucide-react';
import OfflineAlert from './OfflineAlert';
import OfflineBlocker from './OfflineBlocker';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

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
  const { user, logout, changeBranch } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data;
    },
    enabled: user?.role === 'superadmin'
  });
  
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
  
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const canViewReports = ['admin', 'superadmin', 'manager'].includes(user?.role);

  const handleBranchChange = (branchId, branchName) => {
    changeBranch(branchId, branchName);
    setIsDropdownOpen(false);
  };

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

        {/* Branch Selector para Superadmin */}
        {isSuperAdmin && (
          <div className="mb-6 relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
            >
              <span className="truncate">{user?.branch_name || 'Seleccionar sucursal'}</span>
              <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchChange(branch.id, branch.name)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      user?.branch_id === branch.id
                        ? 'bg-primary text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {branch.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 space-y-2">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/dashboard/inventory" icon={Package} label="Inventario" />
          <NavItem to="/dashboard/movements" icon={TrendingUp} label="Movimientos" />
          <NavItem to="/dashboard/transfers" icon={ArrowRight} label="Transferencias" />
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